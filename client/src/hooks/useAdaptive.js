import { useMemo } from 'react';

/**
 * RPE delta and fatigue helpers for use in the client.
 */
export function useAdaptive(loggedSets = [], fatigueScore = 0) {
  const rpeDelta = useMemo(() => {
    const withDeltas = loggedSets.filter((s) => s.rpeDelta !== null && s.rpeDelta !== undefined);
    if (withDeltas.length === 0) return 0;
    const avg = withDeltas.reduce((sum, s) => sum + s.rpeDelta, 0) / withDeltas.length;
    return parseFloat(avg.toFixed(2));
  }, [loggedSets]);

  const fatigueLabel = useMemo(() => {
    if (fatigueScore >= 9) return 'Critical';
    if (fatigueScore >= 7.5) return 'High';
    if (fatigueScore >= 5) return 'Moderate';
    if (fatigueScore >= 2.5) return 'Low';
    return 'Fresh';
  }, [fatigueScore]);

  const fatigueColor = useMemo(() => {
    if (fatigueScore >= 9) return 'text-red-500';
    if (fatigueScore >= 7.5) return 'text-orange-500';
    if (fatigueScore >= 5) return 'text-yellow-500';
    return 'text-green-500';
  }, [fatigueScore]);

  const shouldWarnFatigue = fatigueScore >= 7.5;
  const shouldBlockSession = fatigueScore >= 9;

  const sessionRpeTrend = useMemo(() => {
    if (loggedSets.length < 3) return 'insufficient_data';
    const recent3 = loggedSets.slice(-3);
    const avgDelta = recent3.reduce((sum, s) => sum + (s.rpeDelta || 0), 0) / 3;
    if (avgDelta > 1.5) return 'overtaxed';
    if (avgDelta < -1) return 'undertaxed';
    return 'optimal';
  }, [loggedSets]);

  return {
    rpeDelta,
    fatigueLabel,
    fatigueColor,
    shouldWarnFatigue,
    shouldBlockSession,
    sessionRpeTrend,
  };
}
