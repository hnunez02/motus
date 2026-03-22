import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import api from '../lib/api.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hook for streaming AI chat responses and generating workout sessions.
 */
export function useAI() {
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const generateSession = useMutation({
    mutationFn: async (params) => {
      const { data } = await api.post('/api/ai/generate-session', params);
      return data;
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
