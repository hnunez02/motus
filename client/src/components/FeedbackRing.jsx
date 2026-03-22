/**
 * FeedbackRing — pulsing ring that appears after each set is logged.
 *
 * Animates: scale 1.0 → 1.4, opacity 0.7 → 0 over 600ms ease-out.
 * Only `transform` and `opacity` are animated (no layout reflow).
 *
 * Checklist:
 * // [ ] Animation runs at 60fps on iPhone 12
 * // [ ] Reduced motion: ring skips animation (opacity stays 0)
 * // [ ] No animation starts before mount (isMounted ref guard)
 * // [ ] Runs once per trigger flip, then resets
 */

import { useEffect, useRef } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';

function rpeToColor(rpe) {
  if (rpe >= 8) return '#D85A30'; // coral — near limit
  if (rpe >= 6) return '#EF9F27'; // amber — high effort
  return '#5DCAA5';               // teal  — comfortable
}

/**
 * @param {{
 *   triggered: boolean,
 *   rpe: number,
 *   size?: number,
 * }} props
 *
 * Position this absolutely behind Atlas (zIndex -1) centered on it.
 */
export default function FeedbackRing({ triggered, rpe = 0, size = 96 }) {
  const controls      = useAnimation();
  const prefersReduced = useReducedMotion();
  const isMounted     = useRef(false);
  const prevTriggered = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    // Only fire when triggered flips false → true
    if (!triggered || prevTriggered.current) {
      prevTriggered.current = triggered;
      return;
    }
    prevTriggered.current = triggered;

    if (!isMounted.current) return;

    if (prefersReduced) {
      controls.set({ scale: 1, opacity: 0 });
      return;
    }

    controls.set({ scale: 1, opacity: 0.7 });
    controls.start({
      scale:   1.4,
      opacity: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    });
  }, [triggered, controls, prefersReduced]);

  const color  = rpeToColor(rpe);
  const half   = size / 2;

  return (
    <motion.div
      animate={controls}
      initial={{ scale: 1, opacity: 0 }}
      style={{
        position:     'absolute',
        top:          '50%',
        left:         '50%',
        width:        size,
        height:       size,
        marginTop:    -half,
        marginLeft:   -half,
        borderRadius: '50%',
        border:       `3px solid ${color}`,
        backgroundColor: 'transparent',
        zIndex:       -1,
        pointerEvents: 'none',
        willChange:   'transform, opacity',
      }}
      aria-hidden="true"
    />
  );
}
