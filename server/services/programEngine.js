/**
 * Program Engine — deterministic periodization logic
 */

/**
 * Generate a mesocycle structure based on user profile.
 * Returns week-by-week plan skeleton (no exercises yet).
 */
export function generateMesocycleSkeleton({ goal, daysPerWeek, weeksTotal = 6 }) {
  const splits = getSplitsForDays(daysPerWeek, goal);
  const weeks = [];

  for (let week = 1; week <= weeksTotal; week++) {
    const isDeload = week === weeksTotal;
    const days = splits.map((dayLabel) => ({
      weekNum: week,
      dayLabel,
      modality: 'lift',
      isDeload,
      volumeMultiplier: isDeload ? 0.6 : getProgressionMultiplier(week, weeksTotal),
    }));
    weeks.push({ week, days });
  }

  return { goal, weeksTotal, weeks };
}

/**
 * Return volume multiplier for progressive overload week-over-week.
 * Week 1 = 1.0 (baseline), each week adds ~5%.
 */
function getProgressionMultiplier(currentWeek, totalWeeks) {
  const progressWeeks = totalWeeks - 1; // last week is deload
  if (currentWeek >= totalWeeks) return 0.6; // deload
  return parseFloat((1.0 + ((currentWeek - 1) / progressWeeks) * 0.25).toFixed(2));
}

/**
 * Map daysPerWeek to a split structure.
 */
function getSplitsForDays(daysPerWeek) {
  const splits = {
    3: ['Full Body A', 'Full Body B', 'Full Body C'],
    4: ['Push A', 'Pull A', 'Legs A', 'Upper B'],
    5: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B'],
    6: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'],
  };

  return splits[daysPerWeek] || splits[4];
}

/**
 * Calculate target RPE range for a given goal and week.
 * Intensity increases progressively until deload.
 */
export function getTargetRpe(goal, currentWeek, totalWeeks) {
  const baseRpe = {
    strength: 8,
    hypertrophy: 7,
    endurance: 6,
  }[goal] || 7;

  const isDeload = currentWeek >= totalWeeks;
  if (isDeload) return baseRpe - 1.5;

  const weeklyIncrement = 0.15;
  const targetRpe = baseRpe + (currentWeek - 1) * weeklyIncrement;
  return parseFloat(Math.min(9.5, targetRpe).toFixed(1));
}

/**
 * Get rep range for a given goal.
 */
export function getRepRange(goal) {
  return {
    strength: { min: 1, max: 5, label: '1-5' },
    hypertrophy: { min: 6, max: 12, label: '6-12' },
    endurance: { min: 12, max: 20, label: '12-20' },
  }[goal] || { min: 6, max: 12, label: '6-12' };
}

/**
 * Calculate rest period in seconds based on goal and RPE.
 */
export function getRestSeconds(goal, targetRpe) {
  if (goal === 'strength') return targetRpe >= 9 ? 300 : 240;
  if (goal === 'hypertrophy') return targetRpe >= 8 ? 180 : 120;
  return 90;
}
