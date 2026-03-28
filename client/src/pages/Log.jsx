import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';

// Group flat set array into workout sessions by calendar day
function groupByDay(sets) {
  const map = {};
  for (const s of sets) {
    const d = new Date(s.loggedAt);
    const key = d.toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric',
    });
    if (!map[key]) map[key] = { label: key, date: d, sets: [] };
    map[key].sets.push(s);
  }
  return Object.values(map).sort((a, b) => b.date - a.date);
}

function exerciseName(s) {
  return (
    s.plannedSet?.exercise?.name ||
    s.exercise?.name ||
    null
  );
}

// ── WorkoutDayCard ────────────────────────────────────────────────────────────
function WorkoutDayCard({ label, sets }) {
  const totalVolume = sets.reduce((acc, s) => acc + (s.actualWeight || 0) * (s.actualReps || 0), 0);
  const avgRpe = sets.length
    ? (sets.reduce((acc, s) => acc + (s.loggedRpe || 0), 0) / sets.length).toFixed(1)
    : '—';

  // Unique exercises in logged order
  const exercises = [];
  const seen = new Set();
  for (const s of sets) {
    const name = exerciseName(s);
    if (name && !seen.has(name)) { seen.add(name); exercises.push(name); }
  }

  return (
    <div style={{
      backgroundColor: '#1C1C1C',
      borderRadius: 16,
      padding: '14px 16px',
      marginBottom: 12,
    }}>
      {/* Date label */}
      <p style={{ fontSize: 11, color: '#888', fontFamily: 'monospace',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </p>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <Stat label="Sets"   value={sets.length} />
        <Stat label="Volume" value={totalVolume >= 1000
          ? `${(totalVolume / 1000).toFixed(1)}k`
          : totalVolume} unit="lbs" />
        <Stat label="Avg RPE" value={avgRpe} />
      </div>

      {/* Exercise list */}
      {exercises.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {exercises.map((name) => {
            const exSets = sets.filter((s) => exerciseName(s) === name);
            return (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, color: '#E0E0E0' }}>{name}</span>
                <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>
                  {exSets.length} set{exSets.length !== 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <p style={{ fontSize: 9, color: '#888', textTransform: 'uppercase',
                  letterSpacing: '0.08em', fontFamily: 'monospace', marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#E8593C', lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 10, color: '#888', marginLeft: 2 }}>{unit}</span>}
      </p>
    </div>
  );
}

// ── Log ───────────────────────────────────────────────────────────────────────
export default function Log() {
  const location = useLocation();
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workout-history'],
    queryFn: () => api.get('/api/log/history?days=60').then((r) => r.data),
  });

  // Refetch whenever this tab becomes active
  useEffect(() => {
    refetch();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const workouts = groupByDay(data?.sets || []);

  return (
    <div style={{ padding: '0 16px 80px' }}>
      <div style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))', paddingBottom: 4 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F5F5F5', marginBottom: 4 }}>
          {t('log.title')}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>{t('log.subtitle')}</p>
      </div>

      {isLoading && (
        <p style={{ color: '#888', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
          Loading...
        </p>
      )}

      {isError && (
        <p style={{ color: '#D85A30', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
          Couldn't load workout history. Check your connection.
        </p>
      )}

      {!isLoading && !isError && workouts.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🦉</p>
          <p style={{ color: '#888', fontSize: 14 }}>
            {t('log.empty')}
          </p>
        </div>
      )}

      {workouts.map((w) => (
        <WorkoutDayCard key={w.label} label={w.label} sets={w.sets} />
      ))}
    </div>
  );
}
