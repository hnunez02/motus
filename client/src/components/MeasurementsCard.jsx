import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../lib/api.js';
import MeasurementSheet from './MeasurementSheet.jsx';

const MUSCLE_DISPLAY = {
  chest:     'Chest',
  shoulders: 'Shoulders',
  biceps:    'Biceps',
  triceps:   'Triceps',
  forearms:  'Forearms',
  waist:     'Waist',
  hips:      'Hips',
  quads:     'Quads',
  calves:    'Calves',
};

const cmToIn = (val) => (val / 2.54).toFixed(1);

function TrendBadge({ history }) {
  if (history.length < 2) return null;
  const latest = history[history.length - 1].valueCm;
  const prev   = history[history.length - 2].valueCm;
  const diff   = latest - prev;
  if (Math.abs(diff) < 0.05) return null;

  const up    = diff > 0;
  const label = `${up ? '+' : ''}${cmToIn(diff)}"`;
  return (
    <span className={`text-[10px] font-mono ml-1.5 ${up ? 'text-green-400' : 'text-red-400'}`}>
      {label}
    </span>
  );
}

export default function MeasurementsCard() {
  const queryClient = useQueryClient();
  const [showSheet, setShowSheet] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['measurements'],
    queryFn: () => api.get('/api/measurements').then((r) => r.data.measurements),
  });

  const muscles = data ? Object.keys(data) : [];

  return (
    <>
      <div className="bg-surface-card rounded-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Body Measurements</h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSheet(true)}
            className="text-xs font-semibold text-brand px-3 py-1 rounded-full bg-brand/10"
          >
            + Log
          </motion.button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface-elevated rounded-card animate-pulse" />
            ))}
          </div>
        ) : muscles.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">
            No measurements yet. Tap + Log to start tracking.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {muscles.map((muscle) => {
              const history = data[muscle];
              const latest  = history[history.length - 1];
              const display = latest.unit === 'cm'
                ? `${latest.valueCm.toFixed(1)} cm`
                : `${cmToIn(latest.valueCm)}"`;

              return (
                <div
                  key={muscle}
                  className="bg-surface-elevated rounded-card px-3 py-2.5"
                >
                  <p className="text-[10px] text-text-muted uppercase tracking-widest font-mono truncate">
                    {MUSCLE_DISPLAY[muscle] ?? muscle}
                  </p>
                  <div className="flex items-baseline mt-0.5">
                    <span className="text-sm font-bold text-text-primary">{display}</span>
                    <TrendBadge history={history} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSheet && (
        <MeasurementSheet
          onClose={() => setShowSheet(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['measurements'] })}
        />
      )}
    </>
  );
}
