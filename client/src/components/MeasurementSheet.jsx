import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';

const MUSCLES = [
  { id: 'chest',      label: 'Chest' },
  { id: 'shoulders',  label: 'Shoulders' },
  { id: 'biceps',     label: 'Biceps' },
  { id: 'triceps',    label: 'Triceps' },
  { id: 'forearms',   label: 'Forearms' },
  { id: 'waist',      label: 'Waist' },
  { id: 'hips',       label: 'Hips' },
  { id: 'quads',      label: 'Quads' },
  { id: 'calves',     label: 'Calves' },
];

// Convert inches → cm for storage, cm → inches for display
const inToCm = (val) => parseFloat((val * 2.54).toFixed(2));
const cmToIn = (val) => parseFloat((val / 2.54).toFixed(2));

export default function MeasurementSheet({ onClose, onSaved }) {
  const { t } = useTranslation();
  const [muscle, setMuscle]   = useState(MUSCLES[0].id);
  const [value, setValue]     = useState('');
  const [unit, setUnit]       = useState('in');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const handleSave = async () => {
    const raw = parseFloat(value);
    if (!raw || raw <= 0) {
      setError('Enter a valid measurement.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const valueCm = unit === 'in' ? inToCm(raw) : raw;
      await api.post('/api/measurements', { muscle, valueCm, unit });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save. Try again.');
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 bg-surface-card rounded-t-[24px] p-6"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-surface-elevated rounded-full mx-auto mb-6" />

          <h2 className="text-lg font-display font-bold text-text-primary mb-4">
            Log Measurement
          </h2>

          {/* Muscle picker */}
          <div className="flex flex-wrap gap-2 mb-4">
            {MUSCLES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMuscle(m.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  muscle === m.id
                    ? 'bg-brand text-white'
                    : 'bg-surface-elevated text-text-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Value + unit */}
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              inputMode="decimal"
              placeholder={unit === 'in' ? 'e.g. 14.5' : 'e.g. 36.8'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={(e) => e.target.select()}
              style={{ fontSize: '16px' }}
              className="flex-1 bg-surface-elevated text-text-primary rounded-card px-4 py-3 text-sm outline-none"
            />
            <div className="flex rounded-card overflow-hidden border border-surface-elevated">
              {['in', 'cm'].map((u) => (
                <button
                  key={u}
                  onClick={() => {
                    if (u === unit) return;
                    const raw = parseFloat(value);
                    if (raw > 0) {
                      setValue(String(u === 'cm' ? inToCm(raw) : cmToIn(raw)));
                    }
                    setUnit(u);
                  }}
                  className={`px-4 py-3 text-sm font-semibold transition-colors ${
                    unit === u
                      ? 'bg-brand text-white'
                      : 'bg-surface-elevated text-text-muted'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-card bg-brand text-white font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Measurement'}
          </motion.button>

          <button
            onClick={onClose}
            className="w-full mt-3 py-3 text-sm text-text-muted"
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
