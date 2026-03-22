/**
 * ExerciseMusclePreview — compact read-only muscle diagram for a single exercise.
 *
 * Shows anterior and/or posterior view depending on where the primary muscles live.
 * No onClick — display only.
 *
 * Coloring (react-body-highlighter frequency-based):
 *   frequency 2 → highlightedColors[1] = '#D85A30' coral  — primary muscles
 *   frequency 1 → highlightedColors[0] = '#EF9F27' amber  — secondary muscles
 *
 * Checklist:
 * // [ ] Flow 2: Shows correct primary/secondary colors for known exercises
 * // [ ] Flow 2: Falls back gracefully (no preview rendered) when no muscles mapped
 * // [ ] Flow 2: Animates in fresh each time exercise changes (key prop in parent)
 * // [ ] Flow 2: Does not interfere with set logging UI below it
 * // [ ] Both flows: reduced motion guard applied
 */

import { useMemo, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Model from 'react-body-highlighter';

const BODY_COLOR = '#1E1E1E';

function getPrimaryColor(ratio) {
  if (ratio < 0.7) return '#5DCAA5';
  if (ratio < 1.0) return '#EF9F27';
  if (ratio < 1.3) return '#D85A30';
  if (ratio < 1.6) return '#C04020';
  return '#A32D2D';
}

const ANTERIOR_SLUGS = new Set([
  'chest', 'biceps', 'abs', 'obliques', 'quadriceps',
  'adductor', 'forearm', 'front-deltoids', 'neck', 'head',
]);
const POSTERIOR_SLUGS = new Set([
  'trapezius', 'upper-back', 'lower-back', 'hamstring', 'gluteal',
  'calves', 'triceps', 'back-deltoids', 'abductor',
]);

// Human-readable labels for muscle slugs
const SLUG_LABELS = {
  'chest':          'Chest',
  'biceps':         'Biceps',
  'abs':            'Abs',
  'obliques':       'Obliques',
  'quadriceps':     'Quads',
  'adductor':       'Hip Flexors',
  'forearm':        'Forearms',
  'front-deltoids': 'Front Delts',
  'neck':           'Neck',
  'head':           'Head',
  'trapezius':      'Traps',
  'upper-back':     'Lats / Upper Back',
  'lower-back':     'Lower Back',
  'hamstring':      'Hamstrings',
  'gluteal':        'Glutes',
  'calves':         'Calves',
  'triceps':        'Triceps',
  'back-deltoids':  'Rear Delts',
  'abductor':       'Abductors',
};

function slugLabel(s) {
  return SLUG_LABELS[s] ?? s;
}

/**
 * Build a data array for react-body-highlighter.
 * Primary muscles get frequency 2, secondary get frequency 1.
 */
function buildData(primaryMuscles, secondaryMuscles, slugFilter) {
  const seen   = new Set();
  const result = [];

  for (const slug of primaryMuscles) {
    if (!slugFilter.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    result.push({ name: slug, muscles: [slug], frequency: 2 });
  }
  for (const slug of secondaryMuscles) {
    if (!slugFilter.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    result.push({ name: slug, muscles: [slug], frequency: 1 });
  }
  return result;
}

// ── ModelPanel ────────────────────────────────────────────────────────────────
function ModelPanel({ type, data, colors }) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const paths = wrapperRef.current.querySelectorAll('svg path, svg polygon');
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

  if (data.length === 0) return null;
  return (
    <div className="body-map-wrapper" ref={wrapperRef} style={{ display: 'inline-block' }}>
      <Model
        type={type}
        data={data}
        highlightedColors={colors}
        bodyColor={BODY_COLOR}
        border="#444444"
        svgStyle={{ height: '160px', width: 'auto' }}
      />
    </div>
  );
}

// ── MuscleRow ─────────────────────────────────────────────────────────────────
function MuscleRow({ color, muscles, label }) {
  if (muscles.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        backgroundColor: color, flexShrink: 0,
      }} />
      <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>
        {label}:
      </span>
      <span style={{ fontSize: 11, color: '#ccc' }}>
        {muscles.map(slugLabel).join(', ')}
      </span>
    </div>
  );
}

// ── ExerciseMusclePreview ──────────────────────────────────────────────────────

/**
 * @param {{
 *   exerciseName: string,
 *   primaryMuscles: string[],
 *   secondaryMuscles: string[],
 *   currentWeight?: number,
 *   currentReps?: number,
 *   targetWeight?: number,
 *   targetReps?: number,
 * }} props
 */
export default function ExerciseMusclePreview({
  exerciseName,
  primaryMuscles = [],
  secondaryMuscles = [],
  currentWeight = 135,
  currentReps = 8,
  targetWeight,
  targetReps,
}) {
  const prefersReduced = useReducedMotion();

  // Compute load intensity relative to target
  const effectiveTargetWeight = targetWeight ?? currentWeight;
  const effectiveTargetReps   = targetReps   ?? currentReps;
  const currentLoad = currentWeight * currentReps;
  const targetLoad  = effectiveTargetWeight * effectiveTargetReps;
  const loadRatio   = targetLoad > 0 ? currentLoad / targetLoad : 1;

  const primaryColor   = getPrimaryColor(loadRatio);
  const secondaryColor = getPrimaryColor(Math.max(loadRatio - 0.4, 0));
  const previewColors  = [secondaryColor, primaryColor];

  const frontData = useMemo(
    () => buildData(primaryMuscles, secondaryMuscles, ANTERIOR_SLUGS),
    [primaryMuscles, secondaryMuscles],
  );
  const backData = useMemo(
    () => buildData(primaryMuscles, secondaryMuscles, POSTERIOR_SLUGS),
    [primaryMuscles, secondaryMuscles],
  );

  const hasFront = frontData.length > 0;
  const hasBack  = backData.length  > 0;

  // Nothing to show — unknown exercise
  if (!hasFront && !hasBack) return null;

  const showBoth = hasFront && hasBack;

  return (
    <motion.div
      initial={prefersReduced ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        backgroundColor: '#161616',
        borderRadius: 14,
        padding: '10px 12px',
        marginBottom: 14,
      }}
    >
      {/* SVG views */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: showBoth ? 8 : 0,
        marginBottom: 8,
      }}>
        {hasFront && <ModelPanel type="anterior" data={frontData} colors={previewColors} />}
        {hasBack  && <ModelPanel type="posterior" data={backData} colors={previewColors} />}
      </div>

      {/* Muscle label rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <MuscleRow
          color={primaryColor}
          label="Primary"
          muscles={primaryMuscles.filter((s) => hasFront ? ANTERIOR_SLUGS.has(s) || POSTERIOR_SLUGS.has(s) : true)}
        />
        <MuscleRow
          color={secondaryColor}
          label="Secondary"
          muscles={secondaryMuscles.filter((s) => hasFront ? ANTERIOR_SLUGS.has(s) || POSTERIOR_SLUGS.has(s) : true)}
        />
      </div>
    </motion.div>
  );
}
