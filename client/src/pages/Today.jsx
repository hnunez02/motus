import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import api from '../lib/api.js';
import { useAI } from '../hooks/useAI.js';
import ChatBubble from '../components/chat/ChatBubble.jsx';
import WorkoutCard from '../components/chat/WorkoutCard.jsx';
import AtlasAvatar from '../components/ui/AtlasAvatar.jsx';
import AtlasAnimator from '../components/AtlasAnimator.jsx';
import MuscleMap, { SLUG_LABEL } from '../components/MuscleMap.jsx';
import { MUSCLE_GROUPS } from '../lib/constants.js';

// Extended label lookup: covers both MUSCLE_GROUPS ids and pkg-mapped ids
const MUSCLE_LABEL = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps',
  back: 'Back', biceps: 'Biceps', rear_delt: 'Rear Delts',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', core: 'Core',
  // pkg-mapped ids
  front_delts: 'Front Delts', rear_delts: 'Rear Delts', lats: 'Lats',
  traps: 'Traps', hip_flexors: 'Hip Flexors', lower_back: 'Lower Back',
  abs: 'Abs', obliques: 'Obliques', forearm: 'Forearms',
};

// ── message factory helpers ────────────────────────────────────────────
let _msgId = 0;
const atlasBubble = (content) => ({ id: ++_msgId, role: 'atlas', content });
const userBubble  = (content) => ({ id: ++_msgId, role: 'user',  content });

// ── static option sets ────────────────────────────────────────────────
const SPLIT_OPTIONS = [
  { id: 'push',      label: 'Push'      },
  { id: 'pull',      label: 'Pull'      },
  { id: 'legs',      label: 'Legs'      },
  { id: 'upper',     label: 'Upper'     },
  { id: 'full_body', label: 'Full Body' },
];

const GOAL_OPTIONS = [
  { id: 'strength',    label: 'Strength (heavy, low reps)'       },
  { id: 'hypertrophy', label: 'Hypertrophy (moderate, volume)'   },
  { id: 'endurance',   label: 'Pump / Endurance (light, high reps)' },
];

const CARDIO_OPTIONS = [
  { id: 'zone2', label: 'Zone 2'    },
  { id: 'hiit',  label: 'HIIT'     },
  { id: 'liss',  label: 'LISS'     },
  { id: 'tempo', label: 'Tempo Run' },
];

const LIFT_DURATIONS   = ['45 min', '60 min', '75 min', '90 min'];
const CARDIO_DURATIONS = ['20 min', '30 min', '45 min', '60 min'];

// ── initial context ────────────────────────────────────────────────────
const INIT_CTX = {
  step:         'init',  // init | fatigue_override | environment | modality | split | cardio_type | muscle_groups | goal | duration | generating | done
  environment:  null,    // 'gym' | 'home'
  modality:     null,
  split:        null,
  muscleGroups: [],
  goal:         null,
  cardioType:   null,
  duration:     null,
  forcedDeload: false,
  generatedPlan: null,
};

// ─────────────────────────────────────────────────────────────────────
export default function Today() {
  const { generateSession } = useAI();
  const scrollRef = useRef(null);
  const prefersReduced = useReducedMotion();

  const [messages,      setMessages]      = useState([]);
  const [ctx,           setCtx]           = useState(INIT_CTX);
  const [atlasEmotion,  setAtlasEmotion]  = useState('idle');
  const atlasTimerRef = useRef(null);

  // Track whether generation has been fired to prevent double-run in StrictMode
  const generationFiredRef = useRef(false);

  // ── debug mount log ───────────────────────────────────────────────
  useEffect(() => {
    fetch('https://motus-production.up.railway.app/api/health')
      .then(r => r.json())
      .then(d => console.log('Raw fetch health check:', d))
      .catch(e => console.error('Raw fetch health check failed:', e.message));
    console.log('Today mounted, fetching fatigue...');
    console.log('API baseURL:', import.meta.env.VITE_API_URL);
  }, []);

  // ── fetch fatigue on mount ────────────────────────────────────────
  const { data: fatigueData } = useQuery({
    queryKey: ['fatigue'],
    queryFn: () =>
      api.get('/api/log/fatigue').then((r) => {
        console.log('Fatigue response:', r.data);
        return r.data;
      }).catch((error) => {
        console.error('Fatigue fetch error:', error.message, error.response?.status);
        throw error;
      }),
  });

  // ── boot conversation once fatigue resolves ───────────────────────
  useEffect(() => {
    if (fatigueData === undefined) return;
    if (ctx.step !== 'init') return;

    const score = fatigueData?.fatigueScore ?? 0;

    if (score > 7.5) {
      setMessages([
        atlasBubble(
          "Hey athlete! Your body has been working hard lately. I'm recommending a lighter session today based on your recent RPE data. Want to see what I have in mind, or push through?"
        ),
      ]);
      setCtx((c) => ({ ...c, step: 'fatigue_override' }));
    } else {
      setMessages([atlasBubble('Where are you training today?')]);
      setCtx((c) => ({ ...c, step: 'environment' }));
    }
  }, [fatigueData, ctx.step]);

  // ── auto-scroll on every new message ─────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timer = setTimeout(
      () => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }),
      60
    );
    return () => clearTimeout(timer);
  }, [messages, ctx.step]);

  // ── helpers ───────────────────────────────────────────────────────
  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Push an Atlas message after a short "typing" delay
  const atlasReply = useCallback(
    (content, delay = 360) =>
      new Promise((resolve) => {
        setTimeout(() => {
          const msg = atlasBubble(content);
          setMessages((prev) => [...prev, msg]);
          resolve(msg);
        }, delay);
      }),
    []
  );

  // ── step handlers ─────────────────────────────────────────────────
  const handleFatigueChoice = useCallback(
    async (label) => {
      addMessage(userBubble(label));
      const forcedDeload = label === 'Show me the lighter session';
      setCtx((c) => ({ ...c, forcedDeload }));
      await atlasReply('Where are you training today?');
      setCtx((c) => ({ ...c, step: 'environment' }));
    },
    [addMessage, atlasReply]
  );

  const handleEnvironment = useCallback(
    async (label, id) => {
      addMessage(userBubble(label));
      setCtx((c) => ({ ...c, environment: id }));
      await atlasReply('What do we work on today?');
      setCtx((c) => ({ ...c, step: 'modality' }));
    },
    [addMessage, atlasReply]
  );

  const handleModality = useCallback(
    async (label, id) => {
      addMessage(userBubble(label));
      if (id === 'lift') {
        await atlasReply('Push, pull, or legs?');
        setCtx((c) => ({ ...c, modality: 'lift', step: 'split' }));
      } else {
        await atlasReply('What type of cardio?');
        setCtx((c) => ({ ...c, modality: 'cardio', step: 'cardio_type' }));
      }
    },
    [addMessage, atlasReply]
  );

  const handleSplit = useCallback(
    async (label, id) => {
      addMessage(userBubble(label));
      await atlasReply('Which muscles are the focus?');
      setCtx((c) => ({ ...c, split: id, step: 'muscle_groups' }));
    },
    [addMessage, atlasReply]
  );

  const handleCardioType = useCallback(
    async (label, id) => {
      addMessage(userBubble(label));
      await atlasReply('How long do you have?');
      setCtx((c) => ({ ...c, cardioType: id, step: 'duration' }));
    },
    [addMessage, atlasReply]
  );

  // Receives full slug array from MuscleMap's internal state on every toggle
  const handleMuscleSelect = useCallback((slugArray) => {
    setCtx((c) => ({ ...c, muscleGroups: slugArray }));
    clearTimeout(atlasTimerRef.current);
    setAtlasEmotion('encouraging');
    atlasTimerRef.current = setTimeout(() => setAtlasEmotion('idle'), 1500);
  }, []);

  const handleMuscleGroupsConfirm = useCallback(async () => {
    // ctx.muscleGroups now holds pkg slugs from MuscleMap's internal state
    const labels = ctx.muscleGroups
      .map((slug) => SLUG_LABEL[slug] || MUSCLE_LABEL[slug] || slug)
      .join(', ');
    addMessage(userBubble(labels));
    await atlasReply("What's the goal for today?");
    setCtx((c) => ({ ...c, step: 'goal' }));
  }, [ctx.muscleGroups, addMessage, atlasReply]);

  const handleGoal = useCallback(
    async (label, id) => {
      addMessage(userBubble(label));
      await atlasReply('How long do you have?');
      setCtx((c) => ({ ...c, goal: id, step: 'duration' }));
    },
    [addMessage, atlasReply]
  );

  const handleDuration = useCallback(
    async (label) => {
      addMessage(userBubble(label));
      const minutes = parseInt(label);
      // Advance to generating — effect below will fire the API call
      setCtx((c) => ({ ...c, duration: minutes, step: 'generating' }));
    },
    [addMessage]
  );

  const handleWorkoutComplete = useCallback(() => {
    // Reset back to chat flow for a new session
    generationFiredRef.current = false;
    setCtx(INIT_CTX);
    setMessages([atlasBubble('Great work, athlete! Want to plan another session?')]);
  }, []);

  // ── generation effect ─────────────────────────────────────────────
  // Reads ctx via a ref to avoid stale closure while still reacting to step change
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    if (ctx.step !== 'generating') return;
    if (generationFiredRef.current) return;
    generationFiredRef.current = true;

    const run = async () => {
      const c = ctxRef.current;
      try {
        const result = await generateSession.mutateAsync({
          modality:     c.modality,
          split:        c.split,
          muscleGroups: c.muscleGroups,
          goal:         c.goal || c.cardioType,
          cardioType:   c.cardioType,
          duration:     c.duration,
          environment:  c.environment,
        });

        if (
          !result?.exercises ||
          !Array.isArray(result.exercises) ||
          result.exercises.length === 0
        ) {
          await atlasReply("I had trouble building that session. Let's try again.");
          generationFiredRef.current = false;
          setCtx((c) => ({ ...c, step: 'modality' }));
          return;
        }

        setCtx((prev) => ({ ...prev, generatedPlan: result, step: 'done' }));
      } catch (err) {
        console.error('Session generation failed:', err);
        setMessages((prev) => [
          ...prev,
          atlasBubble(
            "I ran into a snag building that session — check your connection and try again, athlete."
          ),
        ]);
        setCtx((prev) => ({ ...prev, step: 'done' }));
      }
    };

    run();
  }, [ctx.step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── filtered muscles for selected split ──────────────────────────
  const filteredMuscles = useMemo(() => {
    if (!ctx.split || ctx.split === 'full_body') return MUSCLE_GROUPS;
    return MUSCLE_GROUPS.filter(
      (m) => m.split === ctx.split || m.split === 'any'
    );
  }, [ctx.split]);

  // ── active input zone (chips / grid / generating) ─────────────────
  const renderInput = () => {
    switch (ctx.step) {
      case 'fatigue_override':
        return (
          <ChipRow
            chips={['Show me the lighter session', "I feel good, let's go"]}
            onSelect={(label) => handleFatigueChoice(label)}
          />
        );

      case 'environment':
        return (
          <div className="flex flex-col gap-3 px-1 pt-1 pb-2">
            {[
              { id: 'gym',  label: '🏋️ Gym',  sub: 'Full equipment' },
              { id: 'home', label: '🏠 Home', sub: 'Dumbbells, bands, bodyweight' },
            ].map((opt) => (
              <motion.button
                key={opt.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleEnvironment(opt.label, opt.id)}
                className="w-full px-4 py-4 rounded-card bg-surface-elevated border border-surface-elevated text-left transition-colors hover:border-brand"
              >
                <div className="text-base font-semibold text-text-primary">{opt.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{opt.sub}</div>
              </motion.button>
            ))}
          </div>
        );

      case 'modality':
        return (
          <ChipRow
            chips={[
              { id: 'lift',   label: '💪 Lift'   },
              { id: 'cardio', label: '🏃 Cardio' },
            ]}
            onSelect={handleModality}
          />
        );

      case 'split':
        return <ChipRow chips={SPLIT_OPTIONS} onSelect={handleSplit} />;

      case 'cardio_type':
        return <ChipRow chips={CARDIO_OPTIONS} onSelect={handleCardioType} />;

      case 'muscle_groups':
        return (
          <MuscleMapSelector
            selected={ctx.muscleGroups}
            onMuscleSelect={handleMuscleSelect}
            onConfirm={handleMuscleGroupsConfirm}
            prefersReduced={prefersReduced}
          />
        );

      case 'goal':
        return <ChipRow chips={GOAL_OPTIONS} onSelect={handleGoal} />;

      case 'duration':
        return (
          <ChipRow
            chips={(ctx.modality === 'cardio' ? CARDIO_DURATIONS : LIFT_DURATIONS).map(
              (d) => ({ id: d, label: d })
            )}
            onSelect={(label) => handleDuration(label)}
          />
        );

      case 'generating':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 80,
            gap: 16,
          }}>
            <div style={{ width: 120, height: 120 }}>
              <AtlasAnimator emotion="thinking" />
            </div>
            <p className="text-text-secondary text-sm font-mono animate-pulse">
              Atlas is building your session... 🦉
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // Full-screen workout player once a plan has been generated
  if (ctx.step === 'done' && ctx.generatedPlan) {
    return (
      <WorkoutCard
        session={ctx.generatedPlan}
        onComplete={handleWorkoutComplete}
      />
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-surface">
      {/* ── header ────────────────────────────────────────────────── */}
      <div className="flex-none px-4 pb-3 flex items-center gap-3 border-b border-surface-elevated" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
        <div style={{ width: 32, height: 32, flexShrink: 0 }}>
          <AtlasAnimator emotion={atlasEmotion} />
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-mono leading-none mb-0.5">
            Atlas
          </p>
          <h1 className="text-base font-display font-bold text-text-primary leading-tight">
            Today's Session
          </h1>
        </div>
      </div>

      {/* ── message feed ───────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-4 pb-2"
        style={{ overscrollBehavior: 'contain' }}
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <p className="text-text-muted text-sm animate-pulse">Loading...</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.role === 'atlas' ? -24 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <ChatBubble role={msg.role} content={msg.content} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── active chip / grid / generating zone ─────────────────── */}
        <AnimatePresence mode="wait">
          {ctx.step !== 'done' && (
            <motion.div
              key={ctx.step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="mt-1 mb-4"
            >
              {renderInput()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom padding so last card isn't hidden behind nav */}
        <div className="h-4" />
      </div>
    </div>
  );
}

// ── ChipRow ────────────────────────────────────────────────────────────
function ChipRow({ chips, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 px-1 pt-1 pb-2">
      {chips.map((chip) => {
        const label = typeof chip === 'string' ? chip : chip.label;
        const id    = typeof chip === 'string' ? chip : chip.id;
        return (
          <motion.button
            key={id}
            whileTap={{ scale: 0.93 }}
            onClick={() => onSelect(label, id)}
            className="px-4 py-2 rounded-chip bg-surface-elevated border border-surface-elevated
                       text-text-primary text-sm font-medium
                       hover:border-brand hover:text-brand
                       active:bg-brand active:text-white active:border-brand
                       transition-colors duration-100"
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── MuscleMapSelector ──────────────────────────────────────────────────
// Checklist:
// [ ] Flow 1: Tapping muscle highlights it teal, chip appears below, deselect works both ways
// [ ] Flow 1: "Build my workout" button disabled with 0 muscles selected, enabled with 1+
// [ ] Flow 1: Selected muscles passed correctly to Atlas API prompt
// [ ] Both flows: reduced motion guard applied
// Checklist:
// [ ] Flow 1: Tapping muscle (SVG or button) highlights it teal; deselect works both ways
// [ ] Flow 1: "Build my workout" button disabled with 0 muscles selected, enabled with 1+
// [ ] Flow 1: Selected muscles passed correctly to Atlas API prompt
// [ ] Both flows: reduced motion guard applied
function MuscleMapSelector({ selected, onMuscleSelect, onConfirm, prefersReduced }) {
  return (
    <div className="space-y-3 px-1 pb-2">
      {/* Hint */}
      <p className="text-[11px] text-text-muted text-center font-mono">
        Tap muscles to select
      </p>

      {/* MuscleMap owns selection state internally; it renders the button grid + chips */}
      <MuscleMap
        mode="selection"
        onMuscleSelect={onMuscleSelect}
      />

      {/* Build my workout — sticky so it's always reachable */}
      <div style={{ position: 'sticky', bottom: 0, background: '#111', paddingTop: 12, paddingBottom: 8, zIndex: 10 }}>
        <motion.button
          animate={{ opacity: selected.length > 0 ? 1 : 0.35 }}
          transition={{ duration: 0.2 }}
          disabled={selected.length === 0}
          whileTap={selected.length > 0 && !prefersReduced ? { scale: 0.97 } : undefined}
          onClick={selected.length > 0 ? onConfirm : undefined}
          className="w-full py-3.5 rounded-card bg-brand text-white font-semibold text-sm
                     disabled:cursor-not-allowed"
        >
          Build my workout →
        </motion.button>
      </div>
    </div>
  );
}

// ── MuscleSelectInput ──────────────────────────────────────────────────
// Kept for fallback / split-based flows — not used in the muscle_groups step anymore.
function MuscleSelectInput({ muscles, selected, onToggle, onConfirm }) {
  return (
    <div className="space-y-3 px-1 pb-2">
      <div className="grid grid-cols-3 gap-2">
        {muscles.map((mg) => {
          const isSelected = selected.includes(mg.id);
          return (
            <motion.button
              key={mg.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => onToggle(mg.id)}
              className={`py-2 px-2 rounded-chip text-sm font-medium transition-all border ${
                isSelected
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface-elevated text-text-secondary border-surface-elevated hover:border-brand/50'
              }`}
            >
              {mg.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            className="w-full py-3 rounded-card bg-brand text-white font-semibold text-sm"
          >
            Continue with {selected.length} muscle{selected.length !== 1 ? 's' : ''} →
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
