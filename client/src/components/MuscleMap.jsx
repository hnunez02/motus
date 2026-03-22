/**
 * MuscleMap — anatomical front + back body heat map.
 *
 * mode='display'   — intensity-driven heat map (default, read-only)
 * mode='selection' — internal Set state drives highlighting; button grid + chips included
 *
 * KEY DESIGN DECISION (selection mode):
 *   State is owned internally as Set<pkgSlug>. The same selectionData array is
 *   passed to BOTH Model instances — each model only colours polygons it knows
 *   about and ignores the rest, so there is no need to split front/back data.
 *
 *   onMuscleSelect(slugArray: string[]) fires on every toggle with the full
 *   current selection so the parent can mirror it (e.g. to enable a confirm btn).
 *
 * Checklist:
 * // [ ] Muscle map colors update within 1 frame of new set being logged (display mode)
 * // [ ] Reduced motion: colour changes still render (colour ≠ motion)
 * // [ ] No JS animation loops — react-body-highlighter drives fills via props
 * // [ ] Tap pulse: whileTap scale 1 → 1.04 on each model panel
 * // [ ] SVG tap + button grid share identical internal state (no duplicate state)
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Model from 'react-body-highlighter';

// ── Colour scale — display mode (index = frequency - 1) ─────────────────────
const COLORS          = ['#9FE1CB', '#5DCAA5', '#EF9F27', '#D85A30', '#A32D2D'];
const SELECTION_COLORS = ['#5DCAA5'];

// ── Legend (display mode only) ────────────────────────────────────────────────
const LEGEND = [
  { color: '#9FE1CB', label: 'Warm-up' },
  { color: '#5DCAA5', label: 'Working' },
  { color: '#EF9F27', label: 'High effort' },
  { color: '#D85A30', label: 'Near limit' },
  { color: '#A32D2D', label: 'Max out' },
];

// ── Muscle button grid definitions (selection mode) ───────────────────────────
// slug = react-body-highlighter native slug (no conversion needed)
const MUSCLE_BUTTONS = [
  { label: 'Chest',       slug: 'chest',          emoji: '🫁' },
  { label: 'Front Delts', slug: 'front-deltoids', emoji: '💪' },
  { label: 'Biceps',      slug: 'biceps',         emoji: '💪' },
  { label: 'Abs',         slug: 'abs',            emoji: '🔲' },
  { label: 'Quads',       slug: 'quadriceps',     emoji: '🦵' },
  { label: 'Hip Flexors', slug: 'adductor',       emoji: '🦵' },
  { label: 'Traps',       slug: 'trapezius',      emoji: '🏔️' },
  { label: 'Rear Delts',  slug: 'back-deltoids',  emoji: '💪' },
  { label: 'Lats',        slug: 'upper-back',     emoji: '🔼' },
  { label: 'Triceps',     slug: 'triceps',        emoji: '💪' },
  { label: 'Glutes',      slug: 'gluteal',        emoji: '🍑' },
  { label: 'Hamstrings',  slug: 'hamstring',      emoji: '🦵' },
  { label: 'Calves',      slug: 'calves',         emoji: '🦵' },
];

// Exported so consumers (e.g. Today.jsx) can display human labels for pkg slugs
export const SLUG_LABEL = Object.fromEntries(MUSCLE_BUTTONS.map(b => [b.slug, b.label]));

// ── Slug mappings (display mode) ──────────────────────────────────────────────
const OUR_TO_PKG = {
  chest:       'chest',
  biceps:      'biceps',
  abs:         'abs',
  core:        'abs',
  quads:       'quadriceps',
  hip_flexors: 'adductor',
  front_delts: 'front-deltoids',
  shoulders:   'front-deltoids',
  triceps:     'triceps',
  rear_delts:  'back-deltoids',
  lats:        'upper-back',
  back:        'upper-back',
  traps:       'trapezius',
  glutes:      'gluteal',
  hamstrings:  'hamstring',
  calves:      'calves',
  lower_back:  'lower-back',
};

const PKG_TO_OUR = {
  'front-deltoids': 'front_delts',
  'back-deltoids':  'rear_delts',
  'upper-back':     'lats',
  'lower-back':     'lower_back',
  gluteal:          'glutes',
  hamstring:        'hamstrings',
  quadriceps:       'quads',
  trapezius:        'traps',
  adductor:         'hip_flexors',
};

function toOurId(slug) { return PKG_TO_OUR[slug] ?? slug; }

const ANTERIOR_SLUGS = new Set([
  'chest', 'biceps', 'abs', 'obliques', 'quadriceps',
  'adductor', 'forearm', 'front-deltoids', 'neck', 'head',
]);
const POSTERIOR_SLUGS = new Set([
  'trapezius', 'upper-back', 'lower-back', 'hamstring', 'gluteal',
  'calves', 'triceps', 'back-deltoids', 'abductor',
]);

// ── Display mode helpers ──────────────────────────────────────────────────────
function intensityToFrequency(v) {
  if (!v || v <= 0) return 0;
  if (v <= 0.30)    return 1;
  if (v <= 0.55)    return 2;
  if (v <= 0.70)    return 3;
  if (v <= 0.85)    return 4;
  return 5;
}

function intensityToData(muscleIntensity, slugFilter) {
  const seen = new Set();
  const result = [];
  for (const [ourId, intensity] of Object.entries(muscleIntensity)) {
    const slug = OUR_TO_PKG[ourId];
    if (!slug || !slugFilter.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    const freq = intensityToFrequency(intensity);
    if (freq === 0) continue;
    result.push({ name: ourId, muscles: [slug], frequency: freq });
  }
  return result;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ColorLegend() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
      {LEGEND.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: '#888', fontFamily: 'monospace' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const LABEL_STYLE = {
  textAlign: 'center', fontSize: 11, color: '#666', marginBottom: 2,
  fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em',
};

// ── MuscleMap ─────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   mode?: 'display' | 'selection',
 *   muscleIntensity?: Record<string, number>,
 *   onMuscleSelect?: (slugsOrId: string | string[]) => void,
 * }} props
 *
 * display mode: onMuscleSelect(ourId: string) — single ID on tap
 * selection mode: onMuscleSelect(slugArray: string[]) — full selection on every toggle
 */
function useFillOverride(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const paths = ref.current.querySelectorAll('svg path, svg polygon');
    paths.forEach((p) => {
      const computed = window.getComputedStyle(p).fill;
      const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [r, g, b] = [+match[1], +match[2], +match[3]];
        const isNeutral = Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
        const isDark    = r < 80;
        if (isNeutral && isDark) p.style.fill = '#606060';
      }
    });
  });
}

export default function MuscleMap({ mode = 'display', muscleIntensity = {}, onMuscleSelect }) {
  const prefersReduced = useReducedMotion();
  const isSelection    = mode === 'selection';

  const frontRef = useRef(null);
  const backRef  = useRef(null);
  useFillOverride(frontRef);
  useFillOverride(backRef);

  // ── Selection mode: single source of truth ──────────────────────────────────
  const [selectedSet, setSelectedSet] = useState(new Set());

  const handleMuscleClick = useCallback(({ muscle }) => {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(muscle)) {
        next.delete(muscle);
      } else {
        next.add(muscle);
      }
      // Fire with full array so parent can mirror for e.g. disabled-state
      onMuscleSelect?.(Array.from(next));
      return next;
    });
  }, [onMuscleSelect]);

  // Single dataset — both models use it; each only highlights its own polygons
  const selectionData = useMemo(
    () => Array.from(selectedSet).map(slug => ({ name: slug, muscles: [slug] })),
    [selectedSet],
  );

  // ── Display mode data ────────────────────────────────────────────────────────
  const frontDisplayData = useMemo(
    () => intensityToData(muscleIntensity, ANTERIOR_SLUGS),
    [muscleIntensity],
  );
  const backDisplayData = useMemo(
    () => intensityToData(muscleIntensity, POSTERIOR_SLUGS),
    [muscleIntensity],
  );

  const handleDisplayClick = useCallback(({ muscle }) => {
    onMuscleSelect?.(toOurId(muscle));
  }, [onMuscleSelect]);

  // Wire up correct data + handler per mode
  const frontData = isSelection ? selectionData : frontDisplayData;
  const backData  = isSelection ? selectionData  : backDisplayData;
  const colors    = isSelection ? SELECTION_COLORS : COLORS;
  const onClick   = isSelection ? handleMuscleClick : handleDisplayClick;
  const tapProp   = prefersReduced ? {} : { whileTap: { scale: 1.04 } };

  return (
    <div>
      {/* ── Bodies ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'flex-start' }}>
        {/* Front */}
        <div style={{ flex: 1 }}>
          <p style={LABEL_STYLE}>Front</p>
          <motion.div
            {...tapProp}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{ willChange: 'transform' }}
          >
            <div style={{ maxHeight: 200, overflow: 'hidden' }}>
              <div className="body-map-wrapper" ref={frontRef}>
                <Model
                  type="anterior"
                  data={frontData}
                  highlightedColors={colors}
                  bodyColor="#2A2A2A"
                  border="#444444"
                  onClick={onClick}
                  svgStyle={{ width: '100%', height: '200px' }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Back */}
        <div style={{ flex: 1 }}>
          <p style={LABEL_STYLE}>Back</p>
          <motion.div
            {...tapProp}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{ willChange: 'transform' }}
          >
            <div style={{ maxHeight: 200, overflow: 'hidden' }}>
              <div className="body-map-wrapper" ref={backRef}>
                <Model
                  type="posterior"
                  data={backData}
                  highlightedColors={colors}
                  bodyColor="#2A2A2A"
                  border="#444444"
                  onClick={onClick}
                  svgStyle={{ width: '100%', height: '200px' }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Selection-mode extras ───────────────────────────────────────────── */}
      {isSelection && (
        <>
          {/* Section label */}
          <p style={{
            fontSize: 11, color: '#555', textAlign: 'center',
            margin: '10px 0 8px', fontFamily: 'monospace',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Or select by muscle group
          </p>

          {/* Button grid — 3-col wrap */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {MUSCLE_BUTTONS.map(({ label, slug, emoji }) => {
              const isSelected = selectedSet.has(slug);
              return (
                <motion.button
                  key={slug}
                  animate={{ scale: isSelected ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => handleMuscleClick({ muscle: slug })}
                  style={{
                    background:   isSelected ? 'rgba(93,202,165,0.2)'       : 'rgba(255,255,255,0.06)',
                    border:       `1px solid ${isSelected ? '#5DCAA5' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 20,
                    padding:      '6px 10px',
                    fontSize:     12,
                    color:        isSelected ? '#5DCAA5' : 'rgba(255,255,255,0.7)',
                    fontWeight:   isSelected ? 500 : 400,
                    display:      'flex',
                    alignItems:   'center',
                    gap:          4,
                    cursor:       'pointer',
                  }}
                >
                  <span aria-hidden="true">{emoji}</span>
                  {label}
                </motion.button>
              );
            })}
          </div>

          {/* Chips for selected muscles */}
          {selectedSet.size > 0 && (
            <div style={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              display: 'flex',
              gap: 6,
              marginTop: 10,
              paddingBottom: 2,
            }}>
              <AnimatePresence initial={false}>
                {Array.from(selectedSet).map(slug => (
                  <motion.div
                    key={slug}
                    initial={prefersReduced ? undefined : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    style={{ flexShrink: 0 }}
                  >
                    <button
                      onClick={() => handleMuscleClick({ muscle: slug })}
                      style={{
                        background:   'rgba(93,202,165,0.15)',
                        border:       '1px solid #5DCAA5',
                        borderRadius: 12,
                        padding:      '4px 10px',
                        fontSize:     11,
                        color:        '#5DCAA5',
                        display:      'inline-flex',
                        alignItems:   'center',
                        gap:          4,
                        cursor:       'pointer',
                        whiteSpace:   'nowrap',
                      }}
                    >
                      {SLUG_LABEL[slug] ?? slug}
                      <span style={{ opacity: 0.7, fontSize: 10 }}>×</span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Legend — display mode only */}
      {!isSelection && <ColorLegend />}
    </div>
  );
}

// ── useMuscleIntensity hook ───────────────────────────────────────────────────

/**
 * Computes per-muscle intensity (0–1) from logged sets.
 * Intensity = sets × avgRpe / 10, normalized to 0–1 across active muscles.
 *
 * @param {Array<{ rpe: number, muscleGroup?: string, muscleGroups?: string[] }>} workoutSets
 * @returns {{ muscleIntensity: Record<string, number> }}
 */
export function useMuscleIntensity(workoutSets = []) {
  const raw = {};

  for (const s of workoutSets) {
    const muscles = s.muscleGroups || (s.muscleGroup ? [s.muscleGroup] : []);
    const rpe     = s.rpe || 0;
    for (const m of muscles) {
      if (!raw[m]) raw[m] = { totalSets: 0, totalRpe: 0 };
      raw[m].totalSets += 1;
      raw[m].totalRpe  += rpe;
    }
  }

  const scores = {};
  for (const [id, { totalSets, totalRpe }] of Object.entries(raw)) {
    const avgRpe = totalSets > 0 ? totalRpe / totalSets : 0;
    scores[id] = totalSets * avgRpe / 10;
  }

  const max = Math.max(...Object.values(scores), 0.001);
  const muscleIntensity = {};
  for (const [id, score] of Object.entries(scores)) {
    muscleIntensity[id] = Math.min(score / max, 1);
  }

  return { muscleIntensity };
}
