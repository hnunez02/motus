import { Health } from '@flomentumsolutions/capacitor-health-extended';

// Correct permission strings for @flomentumsolutions/capacitor-health-extended
const READ_PERMISSIONS = [
  'READ_HEART_RATE',
  'READ_HRV',
  'READ_STEPS',
  'READ_ACTIVE_CALORIES',
  'READ_WEIGHT',
  'READ_MINDFULNESS', // used for sleep
];

export async function requestHealthKitPermissions() {
  try {
    await Health.requestHealthPermissions({ permissions: READ_PERMISSIONS });
    return true;
  } catch (err) {
    console.log('requestHealthPermissions failed:', err.message);
    return false;
  }
}

export async function readHealthKitData() {
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

  const result = {
    restingHeartRate: null,
    hrv: null,
    sleepHours: null,
    activeCalories: null,
    bodyWeightKg: null,
    stepCount: null,
  };

  const safeQuery = async (dataType, startDate, endDate, limit = 20) => {
    try {
      const res = await Health.queryHealth({
        dataType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit,
      });
      return res?.data || [];
    } catch { return []; }
  };

  const avg = (items) => {
    const vals = items.map(d => d.value).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const sum = (items) => {
    const vals = items.map(d => d.value).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };

  const rhrData = await safeQuery('RESTING_HEART_RATE', sevenDaysAgo, now);
  result.restingHeartRate = avg(rhrData) ? Math.round(avg(rhrData)) : null;

  const hrvData = await safeQuery('HEART_RATE_VARIABILITY', threeDaysAgo, now);
  result.hrv = avg(hrvData) ? Math.round(avg(hrvData)) : null;

  const calData = await safeQuery('ACTIVE_CALORIES', yesterday, now, 100);
  result.activeCalories = sum(calData) ? Math.round(sum(calData)) : null;

  const stepsData = await safeQuery('STEPS', yesterday, now, 100);
  result.stepCount = sum(stepsData) ? Math.round(sum(stepsData)) : null;

  const weightData = await safeQuery('WEIGHT', sevenDaysAgo, now, 1);
  result.bodyWeightKg = weightData[0]?.value ?? null;

  // Sleep — sum asleep stages
  const sleepData = await safeQuery('SLEEP', yesterday, now, 20);
  const asleepMins = sleepData
    .filter(d => ['asleep', 'deep', 'rem', 'core'].includes(d.sleepState))
    .reduce((sum, d) => {
      const ms = new Date(d.endDate) - new Date(d.startDate);
      return sum + ms / 60000;
    }, 0);
  result.sleepHours = asleepMins > 0 ? Math.round((asleepMins / 60) * 10) / 10 : null;

  return result;
}

export function buildHealthKitContext(data) {
  if (!data) return null;
  const lines = [];

  if (data.restingHeartRate) {
    const status = data.restingHeartRate > 65
      ? 'elevated — may indicate incomplete recovery'
      : 'normal';
    lines.push(`Resting HR (7-day avg): ${data.restingHeartRate} bpm — ${status}`);
  }
  if (data.hrv) {
    const status = data.hrv < 30
      ? 'low — reduce session intensity 10-15%'
      : data.hrv > 60
      ? 'high — athlete is ready for a hard session'
      : 'normal';
    lines.push(`HRV (3-day avg): ${data.hrv} ms — ${status}`);
  }
  if (data.sleepHours !== null) {
    const status = data.sleepHours < 6
      ? 'poor — reduce target RPE by 1 point and cut volume 20%'
      : data.sleepHours < 7
      ? 'suboptimal — keep intensity moderate'
      : 'good';
    lines.push(`Sleep last night: ${data.sleepHours} hrs — ${status}`);
  }
  if (data.activeCalories) {
    lines.push(`Active calories yesterday: ${data.activeCalories} kcal`);
  }
  if (data.stepCount) {
    const activity = data.stepCount > 10000 ? 'high'
      : data.stepCount > 5000 ? 'moderate' : 'low';
    lines.push(`Steps yesterday: ${data.stepCount.toLocaleString()} — ${activity} daily activity`);
  }
  if (data.bodyWeightKg) {
    lines.push(`Current weight: ${Math.round(data.bodyWeightKg * 2.205)} lbs`);
  }

  return lines.length > 0
    ? `APPLE HEALTH DATA (use to adapt session intensity):\n${lines.join('\n')}`
    : null;
}
