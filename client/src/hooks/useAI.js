import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import api from '../lib/api.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── offline cache helpers ──────────────────────────────────────────────
const CACHE_KEY = 'motus_recent_workouts';

function saveWorkoutToCache(plan) {
  try {
    const { fromCache: _ignored, ...cleanPlan } = plan;
    const existing = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    const updated = [cleanPlan, ...existing].slice(0, 5);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch {}
}

function getWorkoutFromCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    return saved[0] || null;
  } catch {}
  return null;
}

// ── hardcoded fallback plan ────────────────────────────────────────────
const FALLBACK_WORKOUT = {
  sessionTitle: 'Full Body — Dumbbell & Bodyweight',
  rationale: 'Offline fallback — balanced full-body session requiring only dumbbells or bodyweight.',
  fatigueNote: null,
  nextSessionNote: 'Get back online for a personalized plan next time.',
  exercises: [
    {
      name: 'Push-Up',
      sets: 4, reps: '10-15', rpe: 7, restSeconds: 90,
      formCue: 'Keep core tight, lower chest all the way to the floor.',
      whyThisExercise: 'Builds chest, shoulders, and triceps with zero equipment.',
      exerciseExplanation: 'Great compound push pattern for all levels. Elevate feet to increase difficulty.',
      substituteWith: ['Incline Push-Up', 'Dumbbell Bench Press'],
      videoUrl: null,
    },
    {
      name: 'Dumbbell Row',
      sets: 4, reps: '10-12', rpe: 7, restSeconds: 90,
      formCue: 'Pull elbow to hip, avoid shrugging the shoulder.',
      whyThisExercise: 'Targets lats and mid-back to balance all the pushing.',
      exerciseExplanation: 'Single-arm rows build unilateral strength and fix left-right imbalances.',
      substituteWith: ['Bent-Over Row', 'Inverted Row'],
      videoUrl: null,
    },
    {
      name: 'Goblet Squat',
      sets: 4, reps: '12-15', rpe: 7, restSeconds: 90,
      formCue: 'Elbows inside knees at the bottom, chest tall throughout.',
      whyThisExercise: 'Compound quad and glute driver with built-in upper-back bracing.',
      exerciseExplanation: 'The goblet position self-corrects squat depth and torso angle.',
      substituteWith: ['Bodyweight Squat', 'Dumbbell Lunge'],
      videoUrl: null,
    },
    {
      name: 'Dumbbell Shoulder Press',
      sets: 3, reps: '10-12', rpe: 7, restSeconds: 90,
      formCue: 'Press straight up overhead, avoid excessive lower-back arch.',
      whyThisExercise: 'Develops anterior and lateral deltoids for shoulder width.',
      exerciseExplanation: 'Overhead pressing builds shoulder stability and size directly.',
      substituteWith: ['Pike Push-Up', 'Arnold Press'],
      videoUrl: null,
    },
    {
      name: 'Romanian Deadlift',
      sets: 3, reps: '10-12', rpe: 7, restSeconds: 90,
      formCue: 'Hinge at the hips with soft knees until you feel hamstring stretch.',
      whyThisExercise: 'Loads hamstrings and glutes through their full range of motion.',
      exerciseExplanation: 'Hip hinge pattern is essential for posterior chain development.',
      substituteWith: ['Good Morning', 'Glute Bridge'],
      videoUrl: null,
    },
    {
      name: 'Plank',
      sets: 3, reps: '30-45s', rpe: 6, restSeconds: 60,
      formCue: 'Neutral spine, squeeze glutes, breathe steadily.',
      whyThisExercise: 'Core anti-extension builds spinal stability for every other lift.',
      exerciseExplanation: 'Static holds develop the deep core muscles that protect the spine under load.',
      substituteWith: ['Dead Bug', 'Ab Wheel Rollout'],
      videoUrl: null,
    },
  ],
};

/**
 * Hook for streaming AI chat responses and generating workout sessions.
 */
export function useAI() {
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const generateSession = useMutation({
    mutationFn: async (params) => {
      try {
        const { data } = await api.post('/api/ai/generate-session', params);
        saveWorkoutToCache(data);
        return data;
      } catch (err) {
        // Detect offline / server-unavailable conditions
        const isOffline =
          !navigator.onLine ||
          err?.response?.status === 503 ||
          err?.response?.data?.offline === true ||
          err?.code === 'ERR_NETWORK' ||
          err?.message === 'Network Error';

        if (isOffline) {
          const cached = getWorkoutFromCache();
          return { ...(cached ?? FALLBACK_WORKOUT), fromCache: true };
        }
        throw err;
      }
    },
  });

  const sendMessage = useCallback(async (message, conversationHistory = []) => {
    setIsStreaming(true);
    setStreamedText('');

    try {
      const { supabase } = await import('../lib/supabase.js');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (Capacitor.isNativePlatform()) {
        // Non-streaming on native — CapacitorHttp buffers the full SSE response
        const response = await CapacitorHttp.post({
          url: `${BASE_URL}/api/ai/chat`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          data: { message, conversationHistory },
        });

        // Parse concatenated SSE lines from the buffered response body
        const body = typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);

        let fullText = '';
        const lines = body.split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.done) break;
            if (parsed.chunk) fullText += parsed.chunk;
          } catch {
            // ignore malformed lines
          }
        }

        setStreamedText(fullText);
        return fullText;
      }

      // ── Web: existing SSE streaming via fetch ─────────────────────
      const response = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, conversationHistory }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.done) break;
            if (parsed.chunk) {
              fullText += parsed.chunk;
              setStreamedText(fullText);
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }

      return fullText;
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return {
    generateSession,
    sendMessage,
    streamedText,
    isStreaming,
  };
}
