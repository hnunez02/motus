import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import SetLogger from './SetLogger.jsx';
import AtlasAvatar from '../ui/AtlasAvatar.jsx';

// ── helpers ────────────────────────────────────────────────────────────
function fmt(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fireConfetti() {
  confetti({
    particleCount: 160,
    spread: 72,
    origin: { y: 0.6 },
    colors: ['#E8593C', '#F2A623', '#F5F5F5', '#B03A22'],
  });
}

// ── WorkoutCard ────────────────────────────────────────────────────────
export default function WorkoutCard({ session, onComplete }) {
  const exercises = session?.exercises || [];

  const [currentExIdx,   setCurrentExIdx]   = useState(0);
  const [currentSetIdx,  setCurrentSetIdx]  = useState(0);
  const [phase,          setPhase]          = useState('active'); // 'active' | 'resting' | 'complete'
  const [loggedSets,     setLoggedSets]     = useState([]);
  const [restSecsLeft,   setRestSecsLeft]   = useState(0);
  const [restStarted,    setRestStarted]    = useState(false);
  const [pending,        setPending]        = useState(null);  // { exIdx, setIdx }
  const [whyOpenIdx,     setWhyOpenIdx]     = useState(null);
  const [swapOpenIdx,    setSwapOpenIdx]    = useState(null);
  const [swapped,        setSwapped]        = useState({});    // exIdx → name
  const [liveSecs,       setLiveSecs]       = useState(0);
  const [sessionStart]                      = useState(() => Date.now());

  // ── live session duration ──────────────────────────────────────────
  useEffect(() => {
    if (phase === 'complete') return;
    const id = setInterval(
      () => setLiveSecs(Math.floor((Date.now() - sessionStart) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, [phase, sessionStart]);

  // ── rest countdown (timeout chain) ────────────────────────────────
  useEffect(() => {
    if (phase !== 'resting' || !restStarted || restSecsLeft <= 0) return;
    const id = setTimeout(
      () => setRestSecsLeft((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearTimeout(id);
  }, [phase, restStarted, restSecsLeft]);

  // ── auto-advance when rest hits 0 ─────────────────────────────────
  useEffect(() => {
    if (phase === 'resting' && restStarted && restSecsLeft === 0 && pending) {
      advance(pending);
    }
  }, [phase, restStarted, restSecsLeft, pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(({ exIdx, setIdx }) => {
    setCurrentExIdx(exIdx);
    setCurrentSetIdx(setIdx);
    setPending(null);
    setRestStarted(false);
    setPhase('active');
  }, []);

  const skipRest = useCallback(() => {
    if (pending) advance(pending);
  }, [pending, advance]);

  // ── set logged callback ────────────────────────────────────────────
  const handleSetLogged = useCallback((setData) => {
    const ex = exercises[currentExIdx];
    const newLoggedSets = [
      ...loggedSets,
      {
        ...setData,
        exerciseIdx:  currentExIdx,
        setIdx:       currentSetIdx,
        exerciseName: swapped[currentExIdx] || ex?.name,
        targetRpe:    ex?.rpe,
      },
    ];
    setLoggedSets(newLoggedSets);

    const totalSets   = ex?.sets || 3;
    const lastSetOfEx = currentSetIdx + 1 >= totalSets;
    const lastEx      = currentExIdx  + 1 >= exercises.length;

    if (lastSetOfEx && lastEx) {
      setPhase('complete');
      fireConfetti();
    } else {
      const nextExIdx  = lastSetOfEx ? currentExIdx + 1 : currentExIdx;
      const nextSetIdx = lastSetOfEx ? 0              : currentSetIdx + 1;
      setPending({ exIdx: nextExIdx, setIdx: nextSetIdx });
      setRestSecsLeft(ex?.restSeconds || 120);
      setRestStarted(false);
      setPhase('resting');
    }
  }, [exercises, currentExIdx, currentSetIdx, loggedSets, swapped]);

  // ── derived ────────────────────────────────────────────────────────
  const currentEx    = exercises[currentExIdx];
  const effectiveName = swapped[currentExIdx] || currentEx?.name;
  const totalExSets  = currentEx?.sets || 3;
  const pendingName  = pending
    ? swapped[pending.exIdx] || exercises[pending.exIdx]?.name
    : null;

  // ── COMPLETION SCREEN ──────────────────────────────────────────────
  if (phase === 'complete') {
    const totalVolume  = loggedSets.reduce((s, l) => s + l.weight * l.reps, 0);
    const durationMin  = Math.round((Date.now() - sessionStart) / 60000);
    const avgRpe       = loggedSets.length
      ? (loggedSets.reduce((s, l) => s + l.rpe, 0) / loggedSets.length).toFixed(1)
      : '—';
    const targetRpeAvg = exercises.length
      ? (exercises.reduce((s, e) => s + (e.rpe || 0), 0) / exercises.length).toFixed(1)
      : '—';
    const avgDelta = loggedSets.length
      ? loggedSets.reduce((s, l) => s + (l.rpeDelta || 0), 0) / loggedSets.length
      : 0;

    const adjustNote = avgDelta > 1
      ? "Today ran harder than planned — nicely ground out. I'll pull load back ~5% next session and rebuild through progressive overload. Recovery is where growth happens."
      : avgDelta < -1
        ? "You had plenty in reserve — excellent! I'll push load up ~5% next session to keep the stimulus near your MAV. The adaptation is already in motion."
        : "RPE tracking was right on target. The program is perfectly calibrated. I'll add a small volume bump next week to keep the adaptation curve climbing. 🦉";

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[100dvh] bg-surface px-6 text-center"
      >
        <AtlasAvatar mood="celebrating" size="lg" />

        <h1 className="text-3xl font-display font-bold text-text-primary mt-6 mb-1">
          Session Complete!
        </h1>
        <p className="text-text-secondary text-sm mb-8">{session.sessionTitle}</p>

        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          <StatCard
            label="Volume (Total Weight)"
            value={totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
            unit="lbs"
          />
          <StatCard label="Duration"           value={durationMin} unit="min" />
          <StatCard label="Avg RPE (Effort)"   value={avgRpe}      unit={`/ ${targetRpeAvg}`} />
        </div>

        <div className="w-full bg-surface-card rounded-card p-4 mb-8 text-left">
          <div className="flex items-center gap-2 mb-2">
            <AtlasAvatar mood="neutral" size="sm" />
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
              What Atlas adjusted
            </span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{adjustNote}</p>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onComplete}
          className="w-full py-4 rounded-card bg-brand text-white font-semibold text-base"
        >
          Back to Home
        </motion.button>
      </motion.div>
    );
  }

  // ── REST TIMER SCREEN ──────────────────────────────────────────────
  if (phase === 'resting') {
    return (
      <motion.div
        key="rest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[100dvh] bg-surface px-6"
      >
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-8">Rest</p>

        <motion.div
          key={restSecsLeft}
          initial={{ scale: 0.95, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-8xl font-mono font-bold text-text-primary tabular-nums mb-3"
        >
          {fmt(restSecsLeft)}
        </motion.div>

        <p className="text-sm text-text-muted mb-12 h-5">
          {restStarted && pendingName ? `Up next: ${pendingName}` : 'Tap to start rest timer'}
        </p>

        <div className="flex gap-3 w-full max-w-xs">
          {!restStarted ? (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setRestStarted(true)}
              className="flex-1 py-4 rounded-card bg-brand text-white font-semibold"
            >
              ▶ Start Timer
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setRestSecsLeft(0)}
              className="flex-1 py-4 rounded-card bg-surface-card text-text-secondary font-semibold"
            >
              Stop
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={skipRest}
            className="flex-1 py-4 rounded-card bg-surface-elevated text-text-secondary font-semibold"
          >
            Skip →
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ── ACTIVE SET SCREEN ──────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-surface overflow-y-auto pb-10">

      {/* Header */}
      <div className="px-4 pt-10 pb-4 border-b border-surface-elevated flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-text-muted tabular-nums">{fmt(liveSecs)}</p>
          <h2 className="text-lg font-display font-bold text-text-primary leading-tight">
            {session.sessionTitle}
          </h2>
        </div>
        <span className="text-xs text-text-muted">
          {currentExIdx + 1} / {exercises.length} exercises
        </span>
      </div>

      <div className="px-4 pt-5">
        {/* Set progress header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
            Set {currentSetIdx + 1} of {totalExSets}
          </span>
          <span className="text-xs text-brand font-semibold">
            RPE target {currentEx?.rpe} (Rate of Perceived Exertion)
          </span>
        </div>

        {/* Set progress dots */}
        <div className="flex gap-1.5 mb-5">
          {Array.from({ length: totalExSets }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full flex-1 transition-colors duration-200 ${
                i < currentSetIdx
                  ? 'bg-brand'
                  : i === currentSetIdx
                    ? 'bg-brand/50'
                    : 'bg-surface-elevated'
              }`}
            />
          ))}
        </div>

        {/* Exercise name */}
        <h2 className="text-2xl font-display font-bold text-text-primary leading-tight mb-1">
          {effectiveName}
        </h2>
        <p className="text-sm text-text-muted mb-5">
          {currentEx?.sets} sets · {currentEx?.reps} reps · Rest {currentEx?.restSeconds}s
        </p>

        {/* Form cue */}
        {currentEx?.formCue && (
          <div className="bg-brand/10 border border-brand/20 rounded-card px-3 py-2.5 mb-5">
            <p className="text-xs text-brand leading-relaxed">💡 {currentEx.formCue}</p>
          </div>
        )}

        {/* SetLogger */}
        <SetLogger
          key={`${currentExIdx}-${currentSetIdx}`}
          exerciseName={effectiveName}
          exerciseId={currentEx?.exerciseId}
          plannedSetId={null}
          setNumber={currentSetIdx + 1}
          totalSets={totalExSets}
          targetRpe={currentEx?.rpe}
          lastWeight={
            loggedSets.filter((s) => s.exerciseIdx === currentExIdx).at(-1)?.weight
          }
          onLog={handleSetLogged}
        />

        {/* Why this exercise? accordion */}
        {currentEx?.whyThisExercise && (
          <div className="mt-5 border-t border-surface-elevated pt-4">
            <button
              onClick={() =>
                setWhyOpenIdx((prev) => (prev === currentExIdx ? null : currentExIdx))
              }
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm text-text-secondary font-medium">
                Why this exercise?
              </span>
              <span className="text-text-muted text-xs ml-2">
                {whyOpenIdx === currentExIdx ? '▲' : '▼'}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {whyOpenIdx === currentExIdx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-wide">The science</span>
                      <p className="text-sm text-brand mt-0.5 leading-relaxed">
                        {currentEx.whyThisExercise}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-wide">What this means for you</span>
                      <p className="text-sm text-text-primary mt-0.5 leading-relaxed">
                        {currentEx.exerciseExplanation || 'Generate a new workout to see the full explanation.'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Swap exercise */}
        {currentEx?.substituteWith?.length > 0 && (
          <button
            onClick={() => setSwapOpenIdx(currentExIdx)}
            className="mt-3 text-xs text-text-muted underline underline-offset-2"
          >
            Swap exercise →
          </button>
        )}

        {/* Upcoming exercises */}
        {exercises.length > currentExIdx + 1 && (
          <div className="mt-8">
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-3">
              Up Next
            </p>
            <div className="space-y-2">
              {exercises.slice(currentExIdx + 1).map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-surface-elevated/50 last:border-0 opacity-50"
                >
                  <span className="text-xs font-mono text-text-muted w-4 flex-shrink-0">
                    {currentExIdx + 2 + i}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-text-secondary truncate">
                      {swapped[currentExIdx + 1 + i] || ex.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {ex.sets} × {ex.reps} @ RPE {ex.rpe}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Swap exercise bottom sheet */}
      <AnimatePresence>
        {swapOpenIdx !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setSwapOpenIdx(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 bg-surface-card rounded-t-[24px] p-6 pb-10 z-50"
            >
              <div className="w-10 h-1 bg-surface-elevated rounded-full mx-auto mb-6" />
              <h3 className="font-display font-bold text-text-primary mb-1">
                Swap Exercise
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Current: {swapped[swapOpenIdx] || exercises[swapOpenIdx]?.name}
              </p>

              <div className="space-y-2">
                {(exercises[swapOpenIdx]?.substituteWith || []).map((name, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSwapped((prev) => ({ ...prev, [swapOpenIdx]: name }));
                      setSwapOpenIdx(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-card bg-surface-elevated
                               text-text-primary text-sm font-medium
                               hover:bg-brand hover:text-white transition-colors"
                  >
                    {name}
                  </motion.button>
                ))}
              </div>

              <button
                onClick={() => setSwapOpenIdx(null)}
                className="w-full mt-4 py-3 text-sm text-text-muted"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────
function StatCard({ label, value, unit }) {
  return (
    <div className="bg-surface-card rounded-card p-3 text-center">
      <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-brand">{value}</p>
      <p className="text-[10px] text-text-muted">{unit}</p>
    </div>
  );
}
