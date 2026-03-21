import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api.js';
import AtlasAvatar from '../components/ui/AtlasAvatar.jsx';

// ── step data ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    title: "Let's get to know you",
    subtitle: 'How long have you been lifting consistently?',
  },
  {
    title: "What's your main goal?",
    subtitle: 'Pick all that apply.',
  },
  {
    title: 'What equipment do you have?',
    subtitle: 'Select everything available to you.',
  },
  {
    title: 'Any injury history?',
    subtitle: "We'll route around these in your programming.",
  },
  {
    title: 'How many days can you train?',
    subtitle: 'Per week, on average.',
  },
];

const TOTAL_STEPS = STEPS.length;

const TRAINING_AGE_OPTIONS = [
  { label: 'Just starting',      value: 0    },
  { label: '6 months – 1 year',  value: 0.75 },
  { label: '1–3 years',          value: 2    },
  { label: '3–5 years',          value: 4    },
  { label: '5+ years',           value: 7    },
];

const GOAL_OPTIONS = [
  { label: 'Build muscle',         value: 'hypertrophy' },
  { label: 'Get stronger',         value: 'strength'    },
  { label: 'Lose fat',             value: 'fat_loss'    },
  { label: 'Improve endurance',    value: 'endurance'   },
  { label: 'Athletic performance', value: 'athletic'    },
];

const EQUIPMENT_OPTIONS = [
  { label: 'Barbell + Plates', value: 'barbell'      },
  { label: 'Dumbbells',        value: 'dumbbells'    },
  { label: 'Cable Machine',    value: 'cable'        },
  { label: 'Smith Machine',    value: 'smith_machine'},
  { label: 'Resistance Bands', value: 'bands'        },
  { label: 'Pull-Up Bar',      value: 'pullup_bar'   },
  { label: 'Full Gym Access',  value: 'full_gym'     },
  { label: 'Home Gym Only',    value: 'home_gym'     },
];

const INJURY_OPTIONS = [
  { label: 'Lower back',     value: 'lower_back'     },
  { label: 'Left knee',      value: 'left_knee'      },
  { label: 'Right knee',     value: 'right_knee'     },
  { label: 'Left shoulder',  value: 'left_shoulder'  },
  { label: 'Right shoulder', value: 'right_shoulder' },
  { label: 'Hip flexor',     value: 'hip_flexor'     },
  { label: 'Wrist',          value: 'wrist'          },
  { label: 'None',           value: 'none'           },
];

const DAYS_OPTIONS = [
  { label: '2 days / week', value: 2 },
  { label: '3 days / week', value: 3 },
  { label: '4 days / week', value: 4 },
  { label: '5 days / week', value: 5 },
  { label: '6 days / week', value: 6 },
];

// ── animation variants ─────────────────────────────────────────────────────

const slide = {
  enter:  (dir) => ({ x: dir > 0 ? 56 : -56, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir > 0 ? -56 : 56, opacity: 0 }),
};

// ── chip primitives ────────────────────────────────────────────────────────

function Chip({ label, selected, onToggle }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={`px-4 py-2.5 rounded-chip text-sm font-medium border transition-colors ${
        selected
          ? 'bg-brand text-white border-brand'
          : 'bg-surface-elevated text-text-secondary border-surface-elevated'
      }`}
    >
      {label}
    </motion.button>
  );
}

function MultiChips({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          selected={selected.includes(opt.value)}
          onToggle={() => onToggle(opt.value)}
        />
      ))}
    </div>
  );
}

function SingleChips({ options, selected, onSelect }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <motion.button
          key={opt.value}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(opt.value)}
          className={`w-full px-4 py-3.5 rounded-card text-sm font-medium border text-left transition-colors ${
            selected === opt.value
              ? 'bg-brand text-white border-brand'
              : 'bg-surface-elevated text-text-secondary border-surface-elevated'
          }`}
        >
          {opt.label}
        </motion.button>
      ))}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();

  const [step,      setStep]      = useState(1);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState(null);

  const [profile, setProfile] = useState({
    trainingAge:  null,   // number
    goals:        [],     // string[]
    equipment:    [],     // string[]
    injuryFlags:  [],     // string[]
    injuryNote:   '',     // string (optional free text)
    daysPerWeek:  null,   // number
  });

  // ── navigation ───────────────────────────────────────────────────────────

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  // ── toggle helpers ────────────────────────────────────────────────────────

  const toggleMulti = (key, value) => {
    setProfile((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  // "None" clears all others; selecting anything clears "None"
  const toggleInjury = (value) => {
    if (value === 'none') {
      setProfile((prev) => ({
        ...prev,
        injuryFlags: prev.injuryFlags.includes('none') ? [] : ['none'],
      }));
    } else {
      setProfile((prev) => ({
        ...prev,
        injuryFlags: [
          ...prev.injuryFlags.filter((v) => v !== 'none'),
          ...(prev.injuryFlags.includes(value)
            ? prev.injuryFlags.filter((v) => v !== value && v !== 'none')
            : [...prev.injuryFlags.filter((v) => v !== 'none'), value]),
        ].filter((v, i, arr) => arr.indexOf(v) === i), // dedupe
      }));
    }
  };

  // ── can proceed ───────────────────────────────────────────────────────────

  const canProceed = (() => {
    switch (step) {
      case 1: return profile.trainingAge !== null;
      case 2: return profile.goals.length > 0;
      case 3: return profile.equipment.length > 0;
      case 4: return true;                          // injuries are optional
      case 5: return profile.daysPerWeek !== null;
      default: return false;
    }
  })();

  // ── completion ────────────────────────────────────────────────────────────

  const handleComplete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const injuryFlags = [
        ...profile.injuryFlags.filter((v) => v !== 'none'),
        ...(profile.injuryNote.trim() ? [profile.injuryNote.trim()] : []),
      ];

      // 1. Save profile
      await api.patch('/api/auth/profile', {
        trainingAge:  profile.trainingAge,
        goals:        profile.goals,
        equipment:    profile.equipment,
        injuryFlags,
        daysPerWeek:  profile.daysPerWeek,
      });

      // 2. Create first mesocycle (primary goal drives the block)
      await api.post('/api/program/mesocycle', {
        goal:        profile.goals[0] ?? 'hypertrophy',
        weeksTotal:  6,
        daysPerWeek: profile.daysPerWeek,
      });

      navigate('/today');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Something went wrong — please try again.');
      setSubmitting(false);
    }
  };

  // ── step content ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <SingleChips
            options={TRAINING_AGE_OPTIONS}
            selected={profile.trainingAge}
            onSelect={(v) => setProfile((p) => ({ ...p, trainingAge: v }))}
          />
        );

      case 2:
        return (
          <MultiChips
            options={GOAL_OPTIONS}
            selected={profile.goals}
            onToggle={(v) => toggleMulti('goals', v)}
          />
        );

      case 3:
        return (
          <MultiChips
            options={EQUIPMENT_OPTIONS}
            selected={profile.equipment}
            onToggle={(v) => toggleMulti('equipment', v)}
          />
        );

      case 4:
        return (
          <div className="space-y-4">
            <MultiChips
              options={INJURY_OPTIONS}
              selected={profile.injuryFlags}
              onToggle={toggleInjury}
            />
            <input
              type="text"
              value={profile.injuryNote}
              onChange={(e) =>
                setProfile((p) => ({ ...p, injuryNote: e.target.value }))
              }
              placeholder="Anything else? (optional)"
              className="w-full bg-surface-elevated text-text-primary placeholder:text-text-muted px-4 py-3 rounded-card border border-surface-elevated focus:outline-none focus:border-brand text-sm"
            />
          </div>
        );

      case 5:
        return (
          <SingleChips
            options={DAYS_OPTIONS}
            selected={profile.daysPerWeek}
            onSelect={(v) => setProfile((p) => ({ ...p, daysPerWeek: v }))}
          />
        );

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col px-6 pt-12 pb-8">

      {/* Progress bar */}
      <div className="w-full h-1 bg-surface-elevated rounded-full mb-2 overflow-hidden">
        <motion.div
          className="h-full bg-brand rounded-full"
          animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />
      </div>

      {/* Step counter */}
      <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-8">
        Step {step} of {TOTAL_STEPS}
      </p>

      {/* Atlas header */}
      <div className="flex items-center gap-3 mb-6">
        <AtlasAvatar mood="neutral" size="sm" />
        <span className="text-xs text-text-muted font-mono">Atlas</span>
      </div>

      {/* Animated step content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <h2 className="text-2xl font-display font-bold text-text-primary mb-1">
              {STEPS[step - 1].title}
            </h2>
            <p className="text-sm text-text-muted mb-6">
              {STEPS[step - 1].subtitle}
            </p>
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 mb-3 text-center">{error}</p>
      )}

      {/* Navigation */}
      <div className={`flex gap-3 mt-6 ${step > 1 ? '' : 'flex-col'}`}>
        {step > 1 && (
          <button
            onClick={goBack}
            disabled={submitting}
            className="flex-1 py-3 rounded-card border border-surface-elevated text-text-secondary text-sm font-medium disabled:opacity-40"
          >
            ← Back
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={step === TOTAL_STEPS ? handleComplete : goNext}
          disabled={!canProceed || submitting}
          className="flex-1 py-4 rounded-card bg-brand text-white font-semibold text-base disabled:opacity-40 transition-opacity"
        >
          {submitting
            ? 'Building your program…'
            : step === TOTAL_STEPS
              ? "Let's go 🦉"
              : 'Continue →'}
        </motion.button>
      </div>

    </div>
  );
}
