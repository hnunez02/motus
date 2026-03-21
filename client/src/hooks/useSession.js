import { useState, useCallback } from 'react';

/**
 * Workout session state machine.
 * States: idle → warmup → active → rest → complete
 */
export function useSession() {
  const [state, setState] = useState('idle');
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [loggedSets, setLoggedSets] = useState([]);
  const [restTimer, setRestTimer] = useState(null);
  const [plan, setPlan] = useState(null);

  const startSession = useCallback((workoutPlan) => {
    setPlan(workoutPlan);
    setState('warmup');
    setCurrentExerciseIdx(0);
    setCurrentSetIdx(0);
    setLoggedSets([]);
  }, []);

  const beginActive = useCallback(() => {
    setState('active');
  }, []);

  const logSet = useCallback((setData) => {
    setLoggedSets((prev) => [...prev, { ...setData, loggedAt: new Date() }]);
  }, []);

  const startRest = useCallback((seconds) => {
    setState('rest');
    setRestTimer(seconds);
  }, []);

  const nextSet = useCallback(() => {
    setState('active');
    setRestTimer(null);

    const exercises = plan?.exercises || [];
    const currentEx = exercises[currentExerciseIdx];
    const totalSets = currentEx?.sets || 3;

    if (currentSetIdx + 1 < totalSets) {
      setCurrentSetIdx((i) => i + 1);
    } else if (currentExerciseIdx + 1 < exercises.length) {
      setCurrentExerciseIdx((i) => i + 1);
      setCurrentSetIdx(0);
    } else {
      setState('complete');
    }
  }, [plan, currentExerciseIdx, currentSetIdx]);

  const completeSession = useCallback(() => {
    setState('complete');
  }, []);

  const resetSession = useCallback(() => {
    setState('idle');
    setCurrentExerciseIdx(0);
    setCurrentSetIdx(0);
    setLoggedSets([]);
    setRestTimer(null);
    setPlan(null);
  }, []);

  return {
    state,
    plan,
    currentExerciseIdx,
    currentSetIdx,
    loggedSets,
    restTimer,
    startSession,
    beginActive,
    logSet,
    startRest,
    nextSet,
    completeSession,
    resetSession,
  };
}
