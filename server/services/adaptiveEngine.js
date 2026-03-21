/**
 * Adaptive Engine — RPE delta analysis and fatigue score management
 */

const VOLUME_LANDMARKS = {
  chest:      { mev: 10, mav: 18 },
  back:       { mev: 10, mav: 20 },
  shoulders:  { mev: 8,  mav: 16 },
  quads:      { mev: 8,  mav: 18 },
  hamstrings: { mev: 6,  mav: 14 },
  glutes:     { mev: 4,  mav: 14 },
  biceps:     { mev: 6,  mav: 14 },
  triceps:    { mev: 6,  mav: 14 },
  calves:     { mev: 8,  mav: 16 },
};

/**
 * Calculate RPE delta for a single set.
 * Positive = harder than planned, negative = easier.
 */
export function calculateRpeDelta(loggedRpe, targetRpe) {
  return parseFloat((loggedRpe - targetRpe).toFixed(2));
}

/**
 * Update cumulative fatigue score using exponential moving average.
 * EMA: newFatigue = (0.85 * current) + (0.15 * avgDelta)
 * Clamped to 0-10.
 */
export function updateFatigueScore(currentFatigue, sessionRpeDeltas) {
  if (!sessionRpeDeltas || sessionRpeDeltas.length === 0) {
    return parseFloat(currentFatigue.toFixed(2));
  }

  const avgDelta = sessionRpeDeltas.reduce((sum, d) => sum + d, 0) / sessionRpeDeltas.length;
  const rawScore = (0.85 * currentFatigue) + (0.15 * avgDelta);
  const clamped = Math.min(10, Math.max(0, rawScore));
  return parseFloat(clamped.toFixed(2));
}

/**
 * Determine if a deload is warranted.
 */
export function checkDeloadTrigger(fatigueScore, currentWeek, totalWeeks) {
  if (fatigueScore > 9) {
    return {
      shouldDeload: true,
      reason: `Fatigue score (${fatigueScore}) exceeds critical threshold of 9. Full rest day recommended.`,
    };
  }

  if (fatigueScore > 7.5) {
    return {
      shouldDeload: true,
      reason: `Fatigue score (${fatigueScore}) exceeds 7.5. Reduce volume 40%, maintain intensity, no new PRs.`,
    };
  }

  if (currentWeek >= totalWeeks) {
    return {
      shouldDeload: true,
      reason: `Week ${currentWeek} of ${totalWeeks} — scheduled deload week at end of mesocycle.`,
    };
  }

  return { shouldDeload: false, reason: null };
}

/**
 * Recommend weekly set volume for a muscle group based on fatigue and training age.
 * Interpolates between MEV and MAV based on fatigue score.
 */
export function getVolumeRecommendation(muscleGroup, fatigueScore, trainingAge) {
  const landmarks = VOLUME_LANDMARKS[muscleGroup];

  if (!landmarks) {
    return {
      sets: 10,
      rationale: `No volume landmarks found for "${muscleGroup}". Defaulting to 10 sets/week.`,
    };
  }

  const { mev, mav } = landmarks;

  // Beginners get lower volume regardless (MEV side)
  const ageFactor = trainingAge < 1 ? 0 : trainingAge < 2 ? 0.25 : 1;

  let sets;
  let rationale;

  if (fatigueScore > 6) {
    sets = mev;
    rationale = `High fatigue (${fatigueScore}/10) — prescribing MEV of ${mev} sets/week for ${muscleGroup} to allow recovery.`;
  } else if (fatigueScore < 3) {
    sets = Math.round(mav * ageFactor + mev * (1 - ageFactor));
    rationale = `Low fatigue (${fatigueScore}/10) — prescribing near-MAV of ${sets} sets/week for ${muscleGroup} to maximize adaptation.`;
  } else {
    // Linear interpolation between MEV and MAV
    const t = 1 - (fatigueScore - 3) / (6 - 3); // 0 at fatigue=6, 1 at fatigue=3
    const interpolated = mev + t * (mav - mev);
    sets = Math.round(interpolated * ageFactor + mev * (1 - ageFactor));
    rationale = `Moderate fatigue (${fatigueScore}/10) — interpolating to ${sets} sets/week for ${muscleGroup} between MEV (${mev}) and MAV (${mav}).`;
  }

  return { sets: Math.max(mev, sets), rationale };
}
