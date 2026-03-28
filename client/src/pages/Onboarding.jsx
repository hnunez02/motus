import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import { requestHealthKitPermissions } from '../hooks/useHealthKit.js';
import AtlasAvatar from '../components/ui/AtlasAvatar.jsx';

// ── step data (translated inside component) ────────────────────────────────

const TOTAL_STEPS = 9;

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
  const { t } = useTranslation();

  const STEPS = Array.from({ length: 9 }, (_, i) => ({
    title:    t(`onboarding.steps.${i + 1}.title`),
    subtitle: t(`onboarding.steps.${i + 1}.subtitle`),
  }));

  const TRAINING_AGE_OPTIONS = [
    { label: t('onboarding.trainingAge.justStarting'), value: 0    },
    { label: t('onboarding.trainingAge.sixMonths'),    value: 0.75 },
    { label: t('onboarding.trainingAge.oneToThree'),   value: 2    },
    { label: t('onboarding.trainingAge.threeToFive'),  value: 4    },
    { label: t('onboarding.trainingAge.fivePlus'),     value: 7    },
  ];

  const GOAL_OPTIONS = [
    { label: t('onboarding.goals.muscle'),    value: 'hypertrophy' },
    { label: t('onboarding.goals.strength'),  value: 'strength'    },
    { label: t('onboarding.goals.fatLoss'),   value: 'fat_loss'    },
    { label: t('onboarding.goals.endurance'), value: 'endurance'   },
    { label: t('onboarding.goals.athletic'),  value: 'athletic'    },
  ];

  const BIOLOGICAL_SEX_OPTIONS = [
    { label: t('onboarding.sex.male'),           value: 'male'              },
    { label: t('onboarding.sex.female'),          value: 'female'            },
    { label: t('onboarding.sex.preferNotToSay'), value: 'prefer_not_to_say' },
  ];

  const ACTIVITY_LEVEL_OPTIONS = [
    { label: t('onboarding.activityLevel.sedentary.label'),  subtitle: t('onboarding.activityLevel.sedentary.subtitle'),  value: 'sedentary'   },
    { label: t('onboarding.activityLevel.light.label'),      subtitle: t('onboarding.activityLevel.light.subtitle'),      value: 'light'       },
    { label: t('onboarding.activityLevel.active.label'),     subtitle: t('onboarding.activityLevel.active.subtitle'),     value: 'active'      },
    { label: t('onboarding.activityLevel.veryActive.label'), subtitle: t('onboarding.activityLevel.veryActive.subtitle'), value: 'very_active' },
  ];

  const EQUIPMENT_OPTIONS = [
    { label: t('onboarding.equipment.barbell'),   value: 'barbell'       },
    { label: t('onboarding.equipment.dumbbells'), value: 'dumbbells'     },
    { label: t('onboarding.equipment.cable'),     value: 'cable'         },
    { label: t('onboarding.equipment.smith'),     value: 'smith_machine' },
    { label: t('onboarding.equipment.bands'),     value: 'bands'         },
    { label: t('onboarding.equipment.pullupBar'), value: 'pullup_bar'    },
    { label: t('onboarding.equipment.fullGym'),   value: 'full_gym'      },
    { label: t('onboarding.equipment.homeGym'),   value: 'home_gym'      },
  ];

  const INJURY_OPTIONS = [
    { label: t('onboarding.injuries.lowerBack'),     value: 'lower_back'     },
    { label: t('onboarding.injuries.leftKnee'),      value: 'left_knee'      },
    { label: t('onboarding.injuries.rightKnee'),     value: 'right_knee'     },
    { label: t('onboarding.injuries.leftShoulder'),  value: 'left_shoulder'  },
    { label: t('onboarding.injuries.rightShoulder'), value: 'right_shoulder' },
    { label: t('onboarding.injuries.hipFlexor'),     value: 'hip_flexor'     },
    { label: t('onboarding.injuries.wrist'),         value: 'wrist'          },
    { label: t('onboarding.injuries.none'),          value: 'none'           },
  ];

  const DAYS_OPTIONS = [
    { label: t('onboarding.days.two'),   value: 2 },
    { label: t('onboarding.days.three'), value: 3 },
    { label: t('onboarding.days.four'),  value: 4 },
    { label: t('onboarding.days.five'),  value: 5 },
    { label: t('onboarding.days.six'),   value: 6 },
  ];

  const [step,       setStep]      = useState(1);
  const [direction,  setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]     = useState(null);

  const [profile, setProfile] = useState({
    trainingAge:        null,   // number
    goals:              [],     // string[]
    biologicalSex:      null,   // string
    heightCm:           null,   // number
    weightKg:           null,   // number
    activityLevel:      null,   // string
    equipment:          [],     // string[]
    injuryFlags:        [],     // string[]
    injuryNote:         '',     // string
    daysPerWeek:        null,   // number
    healthKitConnected: false,  // boolean
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
        ].filter((v, i, arr) => arr.indexOf(v) === i),
      }));
    }
  };

  // ── can proceed ───────────────────────────────────────────────────────────

  const canProceed = (() => {
    switch (step) {
      case 1: return profile.trainingAge !== null;
      case 2: return profile.goals.length > 0;
      case 3: return profile.biologicalSex !== null;
      case 4: return profile.heightCm !== null && profile.weightKg !== null;
      case 5: return profile.activityLevel !== null;
      case 6: return profile.equipment.length > 0;
      case 7: return true;                          // injuries optional
      case 8: return profile.daysPerWeek !== null;
      case 9: return true;                          // HealthKit always skippable
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

      await api.patch('/api/auth/profile', {
        trainingAge:        profile.trainingAge,
        goals:              profile.goals,
        equipment:          profile.equipment,
        injuryFlags,
        daysPerWeek:        profile.daysPerWeek,
        biologicalSex:      profile.biologicalSex,
        heightCm:           profile.heightCm,
        weightKg:           profile.weightKg,
        activityLevel:      profile.activityLevel,
        healthKitConnected: profile.healthKitConnected,
      });

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
          <SingleChips
            options={BIOLOGICAL_SEX_OPTIONS}
            selected={profile.biologicalSex}
            onSelect={(v) => setProfile((p) => ({ ...p, biologicalSex: v }))}
          />
        );

      case 4: {
        const cmToFtIn = (cm) => {
          if (!cm) return { ft: '', inches: '' };
          const totalIn = cm / 2.54;
          const ftVal = Math.floor(totalIn / 12);
          const inVal = Math.round(totalIn % 12);
          return {
            ft:     ftVal > 0 ? String(ftVal) : '',
            inches: inVal > 0 ? String(inVal) : '',
          };
        };
        const kgToLbs = (kg) => kg ? Math.round(kg * 2.205) : '';
        const ftInToCm = (ft, inches) => ((parseInt(ft) || 0) * 12 + (parseInt(inches) || 0)) * 2.54;
        const lbsToKg = (lbs) => (parseFloat(lbs) || 0) / 2.205;

        const { ft, inches } = cmToFtIn(profile.heightCm);
        const lbs = kgToLbs(profile.weightKg);

        return (
          <div className="space-y-6">
            {/* Height */}
            <div>
              <p className="text-sm text-text-muted mb-3">{t('onboarding.height')}</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 bg-surface-elevated rounded-card px-4 py-3 border border-surface-elevated focus-within:border-brand">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="5"
                      value={ft ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const newCm = ftInToCm(e.target.value, inches);
                        setProfile((p) => ({ ...p, heightCm: newCm > 0 ? newCm : null }));
                      }}
                      style={{ fontSize: '16px' }}
                      className="flex-1 bg-transparent text-text-primary text-lg font-semibold w-12 focus:outline-none"
                    />
                    <span className="text-text-muted text-sm">ft</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 bg-surface-elevated rounded-card px-4 py-3 border border-surface-elevated focus-within:border-brand">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="10"
                      value={inches ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const newCm = ftInToCm(ft, e.target.value);
                        setProfile((p) => ({ ...p, heightCm: newCm > 0 ? newCm : null }));
                      }}
                      style={{ fontSize: '16px' }}
                      className="flex-1 bg-transparent text-text-primary text-lg font-semibold w-12 focus:outline-none"
                    />
                    <span className="text-text-muted text-sm">in</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weight */}
            <div>
              <p className="text-sm text-text-muted mb-3">{t('onboarding.weight')}</p>
              <div className="flex items-center gap-2 bg-surface-elevated rounded-card px-4 py-3 border border-surface-elevated focus-within:border-brand">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="165"
                  value={lbs ?? ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const kg = lbsToKg(e.target.value);
                    setProfile((p) => ({ ...p, weightKg: kg > 0 ? kg : null }));
                  }}
                  style={{ fontSize: '16px' }}
                  className="flex-1 bg-transparent text-text-primary text-lg font-semibold focus:outline-none"
                />
                <span className="text-text-muted text-sm">lbs</span>
              </div>
            </div>
          </div>
        );
      }

      case 5:
        return (
          <div className="flex flex-col gap-3">
            {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                whileTap={{ scale: 0.98 }}
                onClick={() => setProfile((p) => ({ ...p, activityLevel: opt.value }))}
                className={`w-full px-4 py-3.5 rounded-card border text-left transition-colors ${
                  profile.activityLevel === opt.value
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface-elevated text-text-primary border-surface-elevated'
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className={`text-xs mt-0.5 ${profile.activityLevel === opt.value ? 'text-white/70' : 'text-text-muted'}`}>
                  {opt.subtitle}
                </div>
              </motion.button>
            ))}
          </div>
        );

      case 6:
        return (
          <MultiChips
            options={EQUIPMENT_OPTIONS}
            selected={profile.equipment}
            onToggle={(v) => toggleMulti('equipment', v)}
          />
        );

      case 7:
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
              placeholder={t('onboarding.injuries.other')}
              className="w-full bg-surface-elevated text-text-primary placeholder:text-text-muted px-4 py-3 rounded-card border border-surface-elevated focus:outline-none focus:border-brand text-sm"
            />
          </div>
        );

      case 8:
        return (
          <SingleChips
            options={DAYS_OPTIONS}
            selected={profile.daysPerWeek}
            onSelect={(v) => setProfile((p) => ({ ...p, daysPerWeek: v }))}
          />
        );

      case 9:
        return (
          <div className="space-y-4">
            <div className="bg-surface-elevated rounded-card p-4 space-y-3">
              {[
                { icon: '❤️', label: t('onboarding.healthKit.restingHR'),  desc: t('onboarding.healthKit.restingHRDesc') },
                { icon: '📊', label: t('onboarding.healthKit.hrv'),        desc: t('onboarding.healthKit.hrvDesc')       },
                { icon: '😴', label: t('onboarding.healthKit.sleep'),      desc: t('onboarding.healthKit.sleepDesc')     },
                { icon: '🏃', label: t('onboarding.healthKit.energy'),     desc: t('onboarding.healthKit.energyDesc')    },
                { icon: '⚖️', label: t('onboarding.healthKit.weight'),     desc: t('onboarding.healthKit.weightDesc')    },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xl w-7 flex-shrink-0">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{label}</p>
                    <p className="text-xs text-text-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-text-muted text-center px-2">
              {t('onboarding.healthKit.disclaimer')}
            </p>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                // Show a brief loading state
                setProfile((p) => ({ ...p, healthKitConnected: false }));
                try {
                  const granted = await requestHealthKitPermissions();
                  setProfile((p) => ({ ...p, healthKitConnected: granted }));
                  if (!granted) {
                    // Guide user to Settings if permission was denied
                    console.log('HealthKit permission not granted — user may need to enable in iOS Settings > Privacy > Health');
                  }
                } catch (e) {
                  console.log('Connect button error:', e.message);
                  setProfile((p) => ({ ...p, healthKitConnected: false }));
                }
              }}
              className={`w-full py-4 rounded-card font-semibold text-base transition-colors ${
                profile.healthKitConnected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-brand text-white'
              }`}
            >
              {profile.healthKitConnected ? t('onboarding.healthKit.connected') : t('onboarding.healthKit.connect')}
            </motion.button>
          </div>
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
        {t('onboarding.stepCounter', { step, total: TOTAL_STEPS })}
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
            {t('onboarding.buttons.back')}
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={step === TOTAL_STEPS ? handleComplete : goNext}
          disabled={!canProceed || submitting}
          className="flex-1 py-4 rounded-card bg-brand text-white font-semibold text-base disabled:opacity-40 transition-opacity"
        >
          {submitting
            ? t('onboarding.buttons.building')
            : step === TOTAL_STEPS
              ? (profile.healthKitConnected ? t('onboarding.buttons.letsGo') : t('onboarding.buttons.skip'))
              : t('onboarding.buttons.continue')}
        </motion.button>
      </div>

    </div>
  );
}
