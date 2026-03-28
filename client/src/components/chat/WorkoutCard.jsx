import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import SetLogger from './SetLogger.jsx';
import AtlasAvatar from '../ui/AtlasAvatar.jsx';
import AtlasAnimator, { useAtlasEmotion } from '../AtlasAnimator.jsx';
import FeedbackRing from '../FeedbackRing.jsx';
import WorkoutComplete from '../WorkoutComplete.jsx';
import ExerciseMusclePreview from '../ExerciseMusclePreview.jsx';
import { useMuscleIntensity } from '../MuscleMap.jsx';
import { getMusclesForExercise } from '../../utils/exerciseMuscles.js';
import YouTubeModal from '../YouTubeModal.jsx';

// ── session key for workout progress persistence ───────────────────────
const WC_SESSION_KEY = 'motus_workout_progress';

// ── helpers ────────────────────────────────────────────────────────────
function fmt(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── WorkoutCard ────────────────────────────────────────────────────────
export default function WorkoutCard({ session, onComplete, onQuit, offlineMode = false }) {
  const { t } = useTranslation();
  const safeExercises = Array.isArray(session?.exercises) ? session.exercises : [];
  const exercises = safeExercises;

  const [currentExIdx,   setCurrentExIdx]   = useState(() => {
    try {
      const saved = sessionStorage.getItem(WC_SESSION_KEY);
      if (saved) return JSON.parse(saved).currentExIdx ?? 0;
    } catch {}
    return 0;
  });
  const [currentSetIdx,  setCurrentSetIdx]  = useState(() => {
    try {
      const saved = sessionStorage.getItem(WC_SESSION_KEY);
      if (saved) return JSON.parse(saved).currentSetIdx ?? 0;
    } catch {}
    return 0;
  });
  const [phase,          setPhase]          = useState('active'); // 'active' | 'resting' | 'complete'
  const [loggedSets,     setLoggedSets]     = useState(() => {
    try {
      const saved = sessionStorage.getItem(WC_SESSION_KEY);
      if (saved) return JSON.parse(saved).loggedSets ?? [];
    } catch {}
    return [];
  });
  const [restSecsLeft,   setRestSecsLeft]   = useState(0);
  const [restStarted,    setRestStarted]    = useState(false);
  const [pending,        setPending]        = useState(null);  // { exIdx, setIdx }
  const [whyOpenIdx,     setWhyOpenIdx]     = useState(null);
  const [swapOpenIdx,    setSwapOpenIdx]    = useState(null);
  const [swapped,        setSwapped]        = useState(() => {
    try {
      const saved = sessionStorage.getItem(WC_SESSION_KEY);
      if (saved) return JSON.parse(saved).swapped ?? {};
    } catch {}
    return {};
  });    // exIdx → name
  const [showVideo,      setShowVideo]      = useState(false);
  const [liveSecs,       setLiveSecs]       = useState(0);
  const [sessionStart]                      = useState(() => Date.now());

  // ── Animation state ────────────────────────────────────────────────
  const [lastSetRPE,    setLastSetRPE]    = useState(0);
  const [setJustLogged, setSetJustLogged] = useState(false);
  const [scanEmotion,   setScanEmotion]   = useState('thinking'); // brief scan on first load
  const scanTimerRef = useRef(null);

  // ── Live input tracking (for muscle preview intensity) ──────────────
  const [liveWeight, setLiveWeight] = useState(0);
  const [liveReps,   setLiveReps]   = useState(0);

  // Atlas "scanning" effect: thinking → encouraging when exercise changes
  useEffect(() => {
    clearTimeout(scanTimerRef.current);
    setScanEmotion('thinking');
    scanTimerRef.current = setTimeout(() => {
      setScanEmotion('encouraging');
      scanTimerRef.current = setTimeout(() => setScanEmotion(null), 1500);
    }, 400);
    return () => clearTimeout(scanTimerRef.current);
  }, [currentExIdx]);

  // Derive Atlas emotion — scan overrides RPE-based state; celebration wins always
  const baseEmotion  = useAtlasEmotion(lastSetRPE, false);
  const atlasEmotion = phase === 'complete'
    ? 'celebration'
    : scanEmotion ?? baseEmotion;

  // Compute muscle intensity from logged sets
  const { muscleIntensity } = useMuscleIntensity(loggedSets);

  // ── debug mount log ────────────────────────────────────────────────
  useEffect(() => {
    console.log('WorkoutCard session:', JSON.stringify(session));
    console.log('Exercises count:', safeExercises.length);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── persist workout progress to survive tab switches ───────────────
  useEffect(() => {
    try {
      sessionStorage.setItem(WC_SESSION_KEY, JSON.stringify({
        currentExIdx,
        currentSetIdx,
        loggedSets,
        swapped,
      }));
    } catch {}
  }, [currentExIdx, currentSetIdx, loggedSets, swapped]);

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
        rpeDelta:     (setData.rpe || 0) - (ex?.rpe || 0),
      },
    ];
    setLoggedSets(newLoggedSets);

    // Trigger feedback ring + update Atlas emotion
    setLastSetRPE(setData.rpe || 0);
    setSetJustLogged(true);
    setTimeout(() => setSetJustLogged(false), 100); // reset so next set re-triggers

    const totalSets   = ex?.sets || 3;
    const lastSetOfEx = currentSetIdx + 1 >= totalSets;
    const lastEx      = currentExIdx  + 1 >= exercises.length;

    if (lastSetOfEx && lastEx) {
      setPhase('complete');
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

  // Reset video modal when exercise changes
  useEffect(() => {
    setShowVideo(false);
  }, [currentExIdx]);

  // Reset live inputs when exercise changes (must be after currentEx declaration)
  useEffect(() => {
    const defaultW = 135;
    const defaultR = parseInt(String(currentEx?.reps ?? '').split('-')[0]) || 8;
    setLiveWeight(defaultW);
    setLiveReps(defaultR);
  }, [currentEx?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  const effectiveName = swapped[currentExIdx] || currentEx?.name;
  const totalExSets  = currentEx?.sets || 3;
  const pendingName  = pending
    ? swapped[pending.exIdx] || exercises[pending.exIdx]?.name
    : null;

  // ── COMPLETION SCREEN ──────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <WorkoutComplete
        loggedSets={loggedSets}
        exercises={exercises}
        sessionTitle={session.sessionTitle}
        sessionStart={sessionStart}
        muscleIntensity={muscleIntensity}
        onDone={() => {
          sessionStorage.removeItem(WC_SESSION_KEY);
          onComplete();
        }}
      />
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
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
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
      <div
        className="px-4 pb-4 border-b border-surface-elevated"
        style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-2">
          {/* Timer */}
          <p className="text-[10px] font-mono text-text-muted tabular-nums w-10">
            {fmt(liveSecs)}
          </p>

          {/* Exercise counter — centered */}
          <span className="text-xs text-text-muted">
            {currentExIdx + 1} / {exercises.length} exercises
          </span>

          {/* Quit button */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onQuit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated border border-white/10 text-text-muted text-xs font-medium active:bg-white/10"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Quit
          </motion.button>
        </div>

        {/* Atlas left, exercise name right */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 16px 0' }}>
          <div style={{ width: 48, height: 48, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
            <AtlasAnimator emotion={atlasEmotion} />
            <FeedbackRing triggered={setJustLogged} rpe={lastSetRPE} size={72} />
          </div>
          <div style={{ minWidth: 0, paddingTop: 4 }}>
            <h2 className="text-xl font-bold text-white leading-tight">{effectiveName}</h2>
            <p className="text-sm text-text-muted mt-0.5">{session.sessionTitle}</p>
          </div>
        </div>

        {/* Offline banner */}
        {offlineMode && (
          <div className="mt-3 bg-amber-500/15 border border-amber-500/30 rounded-card px-3 py-1.5">
            <p className="text-xs text-amber-400 font-medium">⚡ Offline mode — showing your last workout</p>
          </div>
        )}
      </div>

      <div className="px-4 pt-5">
        {/* Form cue */}
        {currentEx?.formCue && (
          <div className="bg-brand/10 border border-brand/20 rounded-card px-3 py-2.5 mb-5">
            <p className="text-xs text-brand leading-relaxed">💡 {currentEx.formCue}</p>
          </div>
        )}

        {currentEx?.videoUrl && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowVideo(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 rounded-card border border-brand/40 text-brand text-sm font-medium bg-brand/5 active:bg-brand/15"
          >
            <span>{t('workout.watchFormDemo')}</span>
          </motion.button>
        )}

        {/* Muscle preview — re-animates on each exercise change via key */}
        {(() => {
          const { primary, secondary } = getMusclesForExercise(effectiveName);
          return primary.length > 0 ? (
            <ExerciseMusclePreview
              key={effectiveName}
              exerciseName={effectiveName}
              primaryMuscles={primary}
              secondaryMuscles={secondary}
              currentWeight={liveWeight}
              currentReps={liveReps}
              targetReps={parseInt(String(currentEx?.reps ?? '').split('-').at(-1)) || undefined}
            />
          ) : null;
        })()}

        {/* Set progress header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
            {t('workout.logSet', { current: currentSetIdx + 1, total: totalExSets })}
          </span>
          <span className="text-xs text-brand font-semibold">
            {t('workout.rpeTarget', { rpe: currentEx?.rpe })}
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

        <p className="text-sm text-text-muted mb-5">
          {currentEx?.sets} sets · {currentEx?.reps} reps · Rest {currentEx?.restSeconds}s
        </p>

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
          defaultWeight={liveWeight || 135}
          defaultReps={parseInt(String(currentEx?.reps ?? '').split('-')[0]) || 8}
          onLog={handleSetLogged}
          onInputChange={(w, r) => {
            setLiveWeight(w);
            setLiveReps(r);
          }}
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
                {t('workout.whyThisExercise')}
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
            {t('workout.swapExercise')}
          </button>
        )}

        {/* Upcoming exercises */}
        {exercises.length > currentExIdx + 1 && (
          <div className="mt-8">
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-3">
              {t('workout.upNext')}
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

      {/* YouTube form demo modal */}
      {showVideo && (
        <YouTubeModal
          videoId={currentEx?.videoUrl}
          exerciseName={effectiveName}
          onClose={() => setShowVideo(false)}
        />
      )}

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
                {t('workout.swapSheet.title')}
              </h3>
              <p className="text-xs text-text-muted mb-4">
                {t('workout.swapSheet.current', { name: swapped[swapOpenIdx] || exercises[swapOpenIdx]?.name })}
              </p>

              <div className="space-y-2">
                {[
                  exercises[swapOpenIdx]?.name,
                  ...(exercises[swapOpenIdx]?.substituteWith || []),
                ]
                  .filter(Boolean)
                  .filter((name) => name !== (swapped[swapOpenIdx] || exercises[swapOpenIdx]?.name))
                  .map((name, i) => (
                  <motion.button
                    key={name}
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
                {t('workout.swapSheet.cancel')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

