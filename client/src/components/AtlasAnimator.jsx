/**
 * AtlasAnimator — 5-emotion state machine for the Atlas owl coach.
 *
 * Uses framer-motion (already installed) for all animations.
 * All animations run on the compositor thread via CSS transforms.
 *
 * Checklist:
 * // [ ] Animation runs at 60fps on iPhone 12 (test with browser DevTools Performance)
 * // [ ] Reduced motion: all animations skip to end state instantly
 * // [ ] No animation starts before the component is mounted (isMounted ref guard)
 * // [ ] Atlas never shows two emotions simultaneously (state machine mutex via single `emotion` prop)
 */

import { useEffect, useRef } from 'react';
import {
  motion,
  useAnimation,
  useReducedMotion,
} from 'framer-motion';

// TODO: replace with Atlas owl Lottie JSON from designer
// (Lottie not used — this is a Capacitor/web build using framer-motion SVG animations)

// ── Colour tokens ─────────────────────────────────────────────────────────────
const OWL = {
  body:    '#E8593C',
  dark:    '#B03A22',
  amber:   '#F2A623',
  offwhite:'#F5F5F5',
  black:   '#0F0F0F',
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** The static owl SVG — wings animate separately in celebration */
function OwlSVG({ wingSpread = 0 }) {
  const leftWingRotate  = -15 - wingSpread * 25;
  const rightWingRotate =  15 + wingSpread * 25;
  const leftWingY  = wingSpread * -6;
  const rightWingY = wingSpread * -6;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Atlas owl avatar"
      style={{ overflow: 'visible' }}
    >
      {/* Wings — spread outward in celebration */}
      <ellipse
        cx="12" cy="32" rx="5" ry="8"
        fill={OWL.dark}
        transform={`rotate(${leftWingRotate} 12 32) translate(0 ${leftWingY})`}
        style={{ transition: 'transform 300ms ease' }}
      />
      <ellipse
        cx="36" cy="32" rx="5" ry="8"
        fill={OWL.dark}
        transform={`rotate(${rightWingRotate} 36 32) translate(0 ${rightWingY})`}
        style={{ transition: 'transform 300ms ease' }}
      />

      {/* Body */}
      <ellipse cx="24" cy="30" rx="14" ry="13" fill={OWL.body} />
      {/* Head */}
      <ellipse cx="24" cy="18" rx="12" ry="11" fill={OWL.body} />
      {/* Belly */}
      <ellipse cx="24" cy="31" rx="8" ry="9" fill={OWL.amber} opacity="0.85" />
      {/* Ear tufts */}
      <polygon points="13,10 10,4 16,8" fill={OWL.dark} />
      <polygon points="35,10 38,4 32,8" fill={OWL.dark} />
      {/* Eye whites */}
      <circle cx="19" cy="18" r="5" fill={OWL.offwhite} />
      <circle cx="29" cy="18" r="5" fill={OWL.offwhite} />
      {/* Pupils */}
      <circle cx="19" cy="18" r="2.5" fill={OWL.black} />
      <circle cx="29" cy="18" r="2.5" fill={OWL.black} />
      {/* Beak */}
      <polygon points="24,21 21,25 27,25" fill={OWL.amber} />
      {/* Feet */}
      <line x1="20" y1="43" x2="17" y2="47" stroke={OWL.amber} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="43" x2="20" y2="47" stroke={OWL.amber} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="43" x2="23" y2="47" stroke={OWL.amber} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="43" x2="25" y2="47" stroke={OWL.amber} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="43" x2="28" y2="47" stroke={OWL.amber} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="43" x2="31" y2="47" stroke={OWL.amber} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Emotion animation configs ─────────────────────────────────────────────────

const IDLE_ANIM = {
  y: [0, -4, 0, -4, 0],
  transition: {
    duration: 2.5,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

const THINKING_ANIM = {
  rotate: [-5, 5, -5],
  transition: {
    duration: 1.8,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

const ENCOURAGING_SEQUENCE = async (controls, prefersReduced) => {
  if (prefersReduced) {
    await controls.set({ rotate: 0, x: 0, y: 0 });
    return;
  }
  await controls.start({
    rotate: -8,
    x: 6,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 20, duration: 0.3 },
  });
  await new Promise((r) => setTimeout(r, 2000));
  await controls.start({
    rotate: 0,
    x: 0,
    transition: { type: 'spring', stiffness: 200, damping: 18 },
  });
};

const WARNING_SEQUENCE = async (controls, prefersReduced) => {
  if (prefersReduced) {
    await controls.set({ x: 0, rotate: 0, y: 0 });
    return;
  }
  await controls.start({
    x: [0, 8, -8, 5, -5, 0],
    transition: { duration: 0.5, ease: 'easeInOut' },
  });
  await controls.start({ x: 0 });
};

const CELEBRATION_SEQUENCE = async (controls, prefersReduced) => {
  if (prefersReduced) {
    await controls.set({ scale: 1, x: 0, rotate: 0, y: 0 });
    return;
  }
  await controls.start({
    scale: [1, 1.25, 0.95, 1.1, 1],
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 12,
      duration: 0.6,
    },
  });
};

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @param {{ emotion: 'idle'|'encouraging'|'warning'|'celebration'|'thinking', size?: number }} props
 */
export default function AtlasAnimator({ emotion = 'idle', size = 72 }) {
  const controls     = useAnimation();
  const prefersReduced = useReducedMotion();
  const isMounted    = useRef(false);
  const activeEmotion = useRef(null);

  // Entry animation — slide up from below on mount
  useEffect(() => {
    isMounted.current = true;
    if (prefersReduced) {
      controls.set({ y: 0, opacity: 1 });
    } else {
      controls.start({
        y: 0,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 180,
          damping: 20,
          duration: 0.5,
        },
      });
    }
    return () => { isMounted.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Emotion state machine
  useEffect(() => {
    if (!isMounted.current) return;
    if (activeEmotion.current === emotion) return; // mutex: skip if same state
    activeEmotion.current = emotion;

    const run = async () => {
      switch (emotion) {
        case 'idle':
          controls.start({
            ...IDLE_ANIM,
            rotate: 0,
            x: 0,
            scale: 1,
          });
          break;

        case 'thinking':
          controls.start({
            ...THINKING_ANIM,
            x: 0,
            scale: 1,
          });
          break;

        case 'encouraging':
          await ENCOURAGING_SEQUENCE(controls, prefersReduced);
          if (isMounted.current && activeEmotion.current === 'encouraging') {
            activeEmotion.current = 'idle';
            controls.start({ ...IDLE_ANIM, rotate: 0, x: 0, scale: 1 });
          }
          break;

        case 'warning':
          await WARNING_SEQUENCE(controls, prefersReduced);
          if (isMounted.current && activeEmotion.current === 'warning') {
            activeEmotion.current = 'idle';
            controls.start({ ...IDLE_ANIM, rotate: 0, x: 0, scale: 1 });
          }
          break;

        case 'celebration':
          await CELEBRATION_SEQUENCE(controls, prefersReduced);
          if (isMounted.current && activeEmotion.current === 'celebration') {
            controls.start({ ...IDLE_ANIM, rotate: 0, x: 0 });
          }
          break;

        default:
          controls.start({ ...IDLE_ANIM, rotate: 0, x: 0, scale: 1 });
      }
    };

    run();
  }, [emotion, controls, prefersReduced]);

  const wingsOut = emotion === 'celebration' ? 1 : 0;

  return (
    <motion.div
      animate={controls}
      initial={{ y: 80, opacity: 0 }}
      style={{
        display: 'inline-block',
        width: '100%',
        height: '100%',
        transformOrigin: 'bottom center',
        willChange: 'transform, opacity',
      }}
    >
      <OwlSVG wingSpread={wingsOut} />
    </motion.div>
  );
}

// ── useAtlasEmotion hook ──────────────────────────────────────────────────────

/**
 * Derives Atlas's emotion from workout state.
 *
 * @param {number} rpe  - Last logged RPE (0 = no set yet / workout complete trigger)
 * @param {boolean} isGenerating - Whether Atlas is streaming an AI response
 * @returns {'idle'|'encouraging'|'warning'|'celebration'|'thinking'}
 */
export function useAtlasEmotion(rpe = 0, isGenerating = false) {
  if (isGenerating)  return 'thinking';
  if (rpe >= 8)      return 'warning';
  if (rpe >= 6)      return 'encouraging';
  if (rpe === 0)     return 'idle';           // 0 used as default; see workout complete trigger below
  return 'idle';
}

/**
 * Returns 'celebration' when workout is finished.
 * Usage: const emotion = workoutComplete ? 'celebration' : useAtlasEmotion(rpe, generating)
 */
export { useAtlasEmotion as default_emotion };
