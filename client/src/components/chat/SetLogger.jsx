import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../lib/api.js';
import { RPE_DESCRIPTIONS } from '../../lib/constants.js';

export default function SetLogger({
  exerciseName,
  exerciseId,
  plannedSetId,
  setNumber,
  totalSets,
  targetRpe,
  lastWeight,
  defaultWeight = 135,
  defaultReps   = 8,
  onLog,
  onInputChange,
}) {
  const [weight,    setWeight]    = useState(String(lastWeight ?? defaultWeight));
  const [reps,      setReps]      = useState(String(defaultReps));
  const [rpe,       setRpe]       = useState(targetRpe || 7);
  const [isLogging, setIsLogging] = useState(false);

  // Fire once on mount so WorkoutCard gets initial values immediately
  useEffect(() => {
    onInputChange?.(parseFloat(weight) || 0, parseInt(reps) || 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const adjustWeight = (delta) => {
    const current   = parseFloat(weight) || 0;
    const newWeight = Math.max(0, current + delta);
    setWeight(String(newWeight));
    onInputChange?.(newWeight, parseFloat(reps) || 0);
  };

  const adjustReps = (delta) => {
    const current = parseInt(reps) || 0;
    const newReps = Math.max(0, current + delta);
    setReps(String(newReps));
    onInputChange?.(parseFloat(weight) || 0, newReps);
  };

  const handleLog = async () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!w || !r) return;

    setIsLogging(true);
    try {
      const { data } = await api.post('/api/log/set', {
        plannedSetId:  plannedSetId  || null,
        exerciseId:    exerciseId    || null,
        exerciseName:  exerciseName  || null,
        actualWeight:  w,
        actualReps:    r,
        loggedRpe:     rpe,
      });

      onLog({
        weight:          w,
        reps:            r,
        rpe,
        rpeDelta:        data.rpeDelta        ?? null,
        newFatigueScore: data.newFatigueScore ?? null,
        message:         data.message        ?? null,
      });
    } catch (err) {
      console.error('Log set failed:', err);
      // Advance session even if server is unavailable
      onLog({ weight: w, reps: r, rpe, rpeDelta: null, newFatigueScore: null, message: null });
    } finally {
      setIsLogging(false);
    }
  };

  const canLog = parseFloat(weight) > 0 && parseInt(reps) > 0 && !isLogging;

  return (
    <div className="bg-surface-card rounded-card p-4 space-y-5">

      {/* Weight */}
      <div>
        <label className="text-xs text-text-muted block mb-2">Weight (lbs)</label>
        <div className="flex items-center gap-2">
          <StepBtn onClick={() => adjustWeight(-2.5)}>−</StepBtn>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              onInputChange?.(parseFloat(e.target.value) || 0, parseInt(reps) || 0);
            }}
            placeholder="135"
            className="flex-1 min-w-0 bg-surface-elevated text-text-primary text-2xl font-bold
                       text-center py-3 rounded-card border border-surface-elevated
                       focus:border-brand focus:outline-none tabular-nums"
          />
          <StepBtn onClick={() => adjustWeight(2.5)}>+</StepBtn>
        </div>
      </div>

      {/* Reps */}
      <div>
        <label className="text-xs text-text-muted block mb-2">Reps</label>
        <div className="flex items-center gap-2">
          <StepBtn onClick={() => adjustReps(-1)}>−</StepBtn>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => {
              setReps(e.target.value);
              onInputChange?.(parseFloat(weight) || 0, parseInt(e.target.value) || 0);
            }}
            placeholder="8"
            className="flex-1 min-w-0 bg-surface-elevated text-text-primary text-2xl font-bold
                       text-center py-3 rounded-card border border-surface-elevated
                       focus:border-brand focus:outline-none tabular-nums"
          />
          <StepBtn onClick={() => adjustReps(1)}>+</StepBtn>
        </div>
      </div>

      {/* RPE slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-text-muted">RPE</label>
          <div className="flex items-center gap-2">
            {targetRpe && (
              <span className="text-xs text-text-muted">target {targetRpe}</span>
            )}
            <span className="text-base font-bold text-brand tabular-nums">{rpe}</span>
          </div>
        </div>
        <input
          type="range"
          min={6}
          max={10}
          step={0.5}
          value={rpe}
          onChange={(e) => setRpe(parseFloat(e.target.value))}
          className="w-full accent-brand"
        />
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>6</span>
          <span>7</span>
          <span>8</span>
          <span>9</span>
          <span>10</span>
        </div>
        <p className="text-xs text-text-secondary mt-2 italic min-h-4">
          {RPE_DESCRIPTIONS[Math.round(rpe)] || ''}
        </p>
      </div>

      {/* Log Set button */}
      <motion.button
        whileTap={canLog ? { scale: 0.97 } : undefined}
        disabled={!canLog}
        onClick={handleLog}
        className="w-full py-4 rounded-card bg-brand text-white font-semibold text-base
                   disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {isLogging ? 'Logging...' : `Log Set ${setNumber} of ${totalSets}`}
      </motion.button>
    </div>
  );
}

// ── StepBtn ────────────────────────────────────────────────────────────
function StepBtn({ onClick, children }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      className="w-12 h-12 flex-shrink-0 rounded-card bg-surface-elevated text-text-primary
                 text-xl font-bold flex items-center justify-center
                 hover:bg-brand hover:text-white transition-colors"
    >
      {children}
    </motion.button>
  );
}
