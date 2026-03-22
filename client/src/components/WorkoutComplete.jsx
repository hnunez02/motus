/**
 * WorkoutComplete — celebration screen shown when the user finishes a workout.
 *
 * Features:
 * 1. canvas-confetti fired from top-center (120 particles, 3s)
 * 2. AtlasAnimator in 'celebration' state
 * 3. Summary card slides up from bottom (spring stiffness 160, damping 18)
 * 4. Atlas returns to 'idle' after 3s
 *
 * Only `transform` and `opacity` are animated — no layout reflow.
 *
 * Checklist:
 * // [ ] Confetti fires once on mount, auto-clears after 3s
 * // [ ] Reduced motion: confetti suppressed, card appears instantly
 * // [ ] Atlas shows 'celebration' → 'idle' after 3s
 * // [ ] Share button is UI-only (no function wired yet)
 */

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import AtlasAnimator from './AtlasAnimator.jsx';

// ── Intensity dot colours (matches MuscleMap scale) ───────────────────────────
function intensityDot(intensity) {
  if (!intensity || intensity <= 0)   return '#3A3A3A';
  if (intensity <= 0.3)               return '#9FE1CB';
  if (intensity <= 0.55)              return '#5DCAA5';
  if (intensity <= 0.7)               return '#EF9F27';
  if (intensity <= 0.85)              return '#D85A30';
  return '#A32D2D';
}

// ── StatCell ─────────────────────────────────────────────────────────────────
function StatCell({ label, value, unit }) {
  return (
    <div style={{
      backgroundColor: '#1C1C1C',
      borderRadius: 12,
      padding: '10px 8px',
      textAlign: 'center',
      flex: 1,
    }}>
      <p style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: 'monospace' }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#E8593C', margin: 0 }}>{value}</p>
      <p style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{unit}</p>
    </div>
  );
}

// ── WorkoutComplete ───────────────────────────────────────────────────────────

/**
 * @param {{
 *   loggedSets: Array<{ weight: number, reps: number, rpe: number, rpeDelta?: number, muscleGroups?: string[] }>,
 *   exercises: Array<{ name: string, rpe?: number }>,
 *   sessionTitle: string,
 *   sessionStart: number,
 *   atlasMessage?: string,
 *   muscleIntensity?: Record<string, number>,
 *   onDone: () => void,
 * }} props
 */
export default function WorkoutComplete({
  loggedSets = [],
  exercises  = [],
  sessionTitle = 'Session Complete',
  sessionStart,
  atlasMessage,
  muscleIntensity = {},
  onDone,
}) {
  const prefersReduced = useReducedMotion();
  const [atlasEmotion, setAtlasEmotion] = useState('celebration');
  const confettiFired  = useRef(false);

  // Derived stats
  const totalVolume   = loggedSets.reduce((s, l) => s + (l.weight || 0) * (l.reps || 0), 0);
  const durationMin   = sessionStart
    ? Math.max(1, Math.round((Date.now() - sessionStart) / 60000))
    : 0;
  const avgRpe = loggedSets.length
    ? (loggedSets.reduce((s, l) => s + (l.rpe || 0), 0) / loggedSets.length).toFixed(1)
    : '—';
  const totalSets = loggedSets.length;

  // Muscles trained (unique, with intensity colour)
  const musclesTrained = Object.keys(muscleIntensity).filter((k) => muscleIntensity[k] > 0);

  // Atlas note
  const avgDelta = loggedSets.length
    ? loggedSets.reduce((s, l) => s + (l.rpeDelta || 0), 0) / loggedSets.length
    : 0;
  const defaultNote = avgDelta > 1
    ? "Pushed beyond the plan today — the grit is there. I'll dial back intensity 5% next session so we recover and come back stronger. 🦉"
    : avgDelta < -1
      ? "Plenty in reserve — great energy. I'll bump load 5% next session to keep the adaptation curve climbing. 🦉"
      : "Right on the RPE target. The program is perfectly dialed. Small volume bump next week to keep progress rolling. 🦉";
  const message = atlasMessage || defaultNote;

  // Fire confetti once on mount
  useEffect(() => {
    if (confettiFired.current || prefersReduced) return;
    confettiFired.current = true;

    confetti({
      particleCount: 120,
      spread: 80,
      startVelocity: 45,
      origin: { x: 0.5, y: 0 },
      colors: ['#5DCAA5', '#EF9F27', '#D85A30', '#9FE1CB'],
      disableForReducedMotion: true,
    });

    // Return Atlas to idle after 3s
    const timer = setTimeout(() => setAtlasEmotion('idle'), 3000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Card entry spring
  const cardVariants = {
    hidden: { y: 300, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 160,
        damping: 18,
      },
    },
  };

  return (
    <div
      className="flex flex-col items-center min-h-[100dvh] bg-surface px-5 pb-10 overflow-y-auto"
      style={{
        paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Atlas */}
      <div style={{ width: 96, height: 96, marginBottom: 16 }}>
        <AtlasAnimator emotion={atlasEmotion} />
      </div>

      <h1 className="text-3xl font-display font-bold text-text-primary mt-2 mb-1 text-center">
        Session Complete!
      </h1>
      <p className="text-text-secondary text-sm mb-6 text-center">{sessionTitle}</p>

      {/* Summary card slides up */}
      <motion.div
        className="w-full"
        variants={prefersReduced ? undefined : cardVariants}
        initial={prefersReduced ? undefined : 'hidden'}
        animate={prefersReduced ? undefined : 'visible'}
      >
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <StatCell
            label="Sets"
            value={totalSets}
            unit="logged"
          />
          <StatCell
            label="Volume"
            value={totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
            unit="lbs"
          />
          <StatCell label="Duration" value={durationMin} unit="min" />
          <StatCell label="Avg RPE"  value={avgRpe}       unit="effort" />
        </div>

        {/* Muscles trained */}
        {musclesTrained.length > 0 && (
          <div
            style={{
              backgroundColor: '#1C1C1C',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'monospace' }}>
              Muscles Trained
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {musclesTrained.map((m) => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: intensityDot(muscleIntensity[m]),
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: '#ccc', textTransform: 'capitalize' }}>
                    {m.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atlas note */}
        <div
          style={{
            backgroundColor: '#1C1C1C',
            borderRadius: 12,
            padding: '16px 14px 12px',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, flexShrink: 0 }}>
              <AtlasAnimator emotion="idle" />
            </div>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
              Atlas says
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.55 }}>{message}</p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            whileTap={prefersReduced ? {} : { scale: 0.97 }}
            onClick={() => {
              // Share — UI only, no function wired yet
              if (navigator.share) {
                navigator.share({
                  title: 'Motus Workout',
                  text: `Just crushed ${totalSets} sets, ${totalVolume} lbs in ${durationMin} min with Atlas 🦉`,
                }).catch(() => {});
              }
            }}
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: 14,
              backgroundColor: '#242424',
              color: '#ccc',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Share
          </motion.button>

          <motion.button
            whileTap={prefersReduced ? {} : { scale: 0.97 }}
            onClick={onDone}
            style={{
              flex: 2,
              padding: '14px 0',
              borderRadius: 14,
              backgroundColor: '#E8593C',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Done
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
