import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import api from '../lib/api.js';
import Settings from './Settings.jsx';

// ── Volume landmarks (Israetel et al.) ────────────────────────────────────

const VOLUME_LANDMARKS = {
  chest:      { mev: 8,  mrv: 22 },
  back:       { mev: 10, mrv: 25 },
  shoulders:  { mev: 6,  mrv: 20 },
  triceps:    { mev: 4,  mrv: 18 },
  biceps:     { mev: 6,  mrv: 20 },
  rear_delt:  { mev: 6,  mrv: 20 },
  quads:      { mev: 8,  mrv: 25 },
  hamstrings: { mev: 6,  mrv: 20 },
  glutes:     { mev: 4,  mrv: 20 },
  calves:     { mev: 8,  mrv: 24 },
  core:       { mev: 4,  mrv: 16 },
};

const MUSCLE_SHORT = {
  chest:      'Chest',
  back:       'Back',
  shoulders:  'Delts',
  triceps:    'Tris',
  biceps:     'Bis',
  rear_delt:  'R.Delt',
  quads:      'Quads',
  hamstrings: 'Hams',
  glutes:     'Glutes',
  calves:     'Calves',
  core:       'Core',
};

// ── Shared chart style constants ──────────────────────────────────────────

const GRID_COLOR   = '#242424';
const MUTED_COLOR  = '#5A5A5A';
const BRAND        = '#E8593C';
const AMBER        = '#F2A623';
const RED          = '#EF4444';
const GREEN        = '#22C55E';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1A1A1A',
    border: `1px solid ${GRID_COLOR}`,
    borderRadius: 12,
    fontSize: 11,
    color: '#F5F5F5',
  },
  itemStyle: { color: '#A0A0A0' },
  cursor: { fill: '#242424' },
};

const AXIS_TICK = { fill: MUTED_COLOR, fontSize: 10 };

// ── Helpers ───────────────────────────────────────────────────────────────

function epley(weight, reps) {
  if (!weight || !reps) return null;
  return Math.round(weight * (1 + reps / 30));
}

function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildVolumeData(weeklyVolume) {
  return Object.keys(VOLUME_LANDMARKS).map((id) => ({
    muscle: MUSCLE_SHORT[id] ?? id,
    sets:   weeklyVolume[id] ?? 0,
    mev:    VOLUME_LANDMARKS[id].mev,
    mrv:    VOLUME_LANDMARKS[id].mrv,
  }));
}

function buildStrengthData(sets, exerciseId) {
  if (!exerciseId) return [];
  if (!Array.isArray(sets)) return [];
  const byDay = {};
  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue;
    const e1rm = epley(s.actualWeight, s.actualReps);
    if (!e1rm) continue;
    const day = s.loggedAt.slice(0, 10);
    if (!byDay[day] || e1rm > byDay[day]) byDay[day] = e1rm;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, e1rm]) => ({ date: fmtDate(date), e1rm }));
}

function buildFatigueTrend(sets) {
  const safeSets = Array.isArray(sets) ? sets : [];
  // Group rpeDelta values by day
  const byDay = {};
  for (const s of safeSets) {
    const day = s.loggedAt.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    if (s.rpeDelta !== null) byDay[day].push(s.rpeDelta);
  }

  // Replay EMA over last 28 days: same formula as adaptiveEngine
  let fatigue = 0;
  const result = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    const deltas = byDay[day] ?? [];
    if (deltas.length > 0) {
      const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      fatigue = Math.max(0, Math.min(10, 0.85 * fatigue + 0.15 * avg));
    }
    result.push({ date: day.slice(5).replace('-', '/'), value: +fatigue.toFixed(2) });
  }
  return result;
}

function buildConsistency(sets) {
  const safeSets = Array.isArray(sets) ? sets : [];
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun

  // Workout days this month (by day-of-month number)
  const workoutDays = new Set(
    safeSets
      .filter((s) => {
        const d = new Date(s.loggedAt);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((s) => new Date(s.loggedAt).getDate())
  );

  // Current streak (going backwards from today or yesterday)
  const allDays = new Set(safeSets.map((s) => s.loggedAt.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  // If today has no workout yet, start counting from yesterday
  if (!allDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (allDays.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { daysInMonth, firstWeekday, today, workoutDays, streak };
}

// ── Chart card wrapper ─────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-surface-card rounded-card p-4">
      <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-text-muted mt-0.5 mb-4">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ── 1. Volume chart ────────────────────────────────────────────────────────

function VolumeChart({ weeklyVolume }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const data = buildVolumeData(weeklyVolume);
  const hasData = data.some((d) => d.sets > 0);

  return (
    <ChartCard
      title="Weekly Volume"
      subtitle="Aim to stay between the amber MEV (Minimum Effective Volume) and red MRV (Maximum Recoverable Volume) lines"
    >
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 30 }}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis
            dataKey="muscle"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_COLOR }}
            tickLine={false}
            angle={-40}
            textAnchor="end"
            interval={0}
            height={50}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, name) => {
              if (name === 'sets') return [v + ' sets', 'This week'];
              if (name === 'mev')  return [v + ' sets', 'MEV'];
              if (name === 'mrv')  return [v + ' sets', 'MRV'];
              return [v, name];
            }}
          />
          <Bar dataKey="sets" fill={BRAND} radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Line
            dataKey="mev"
            stroke={AMBER}
            strokeDasharray="4 2"
            strokeWidth={1.5}
            dot={{ r: 2, fill: AMBER }}
            activeDot={false}
          />
          <Line
            dataKey="mrv"
            stroke={RED}
            strokeDasharray="4 2"
            strokeWidth={1.5}
            dot={{ r: 2, fill: RED }}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Why? accordion */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => setWhyOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(242,166,35,0.1)',
            border: '1px solid rgba(242,166,35,0.3)',
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 11,
            color: '#F2A623',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          <span>{whyOpen ? '▾' : '▸'}</span>
          Why stay between the lines?
        </button>

        {whyOpen && (
          <div style={{
            marginTop: 8,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            borderLeft: '2px solid #F2A623',
          }}>
            <p style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6, marginBottom: 8 }}>
              <strong style={{ color: '#F2A623' }}>MEV (Minimum Effective Volume)</strong> is the
              least amount of weekly sets needed to actually stimulate muscle growth. Training
              below it means you're working out without a growth signal — maintenance at best.
            </p>
            <p style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6, marginBottom: 8 }}>
              <strong style={{ color: '#EF4444' }}>MRV (Maximum Recoverable Volume)</strong> is
              the most sets you can do before recovery breaks down. Exceeding it leads to
              accumulated fatigue, stalled progress, and higher injury risk — more isn't better
              past this point.
            </p>
            <p style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6 }}>
              The sweet spot between MEV and MRV is your <strong style={{ color: '#E8593C' }}>MAV
              (Maximum Adaptive Volume)</strong> — where growth is fastest and recovery is still
              manageable. Atlas programs you in this window and adjusts week by week based on
              your RPE feedback.
            </p>
          </div>
        )}
      </div>

      {!hasData && (
        <p className="text-xs text-text-muted text-center -mt-2">
          Log some sets to see your volume
        </p>
      )}
      <div className="flex items-center gap-4 mt-2 justify-end">
        <span className="flex items-center gap-1 text-[10px] text-text-muted">
          <span className="w-4 h-0.5 bg-amber-400 inline-block" /> MEV
        </span>
        <span className="flex items-center gap-1 text-[10px] text-text-muted">
          <span className="w-4 h-0.5 bg-red-500 inline-block" /> MRV
        </span>
      </div>
    </ChartCard>
  );
}

// ── 2. Strength chart ──────────────────────────────────────────────────────

function StrengthChart({ sets, exercises }) {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!selectedId && exercises.length > 0) {
      setSelectedId(exercises[0].id);
    }
  }, [exercises, selectedId]);

  const data = buildStrengthData(sets, selectedId);

  return (
    <ChartCard title="Estimated 1RM" subtitle="Epley formula: weight × (1 + reps/30)">
      {exercises.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-8">
          No exercises logged yet
        </p>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-surface-elevated text-text-secondary text-xs px-3 py-2 rounded-card border border-surface-elevated focus:outline-none focus:border-brand mb-4"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>

          {data.length < 2 ? (
            <p className="text-xs text-text-muted text-center py-6">
              Log at least 2 sessions to see a trend
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis
                  dataKey="date"
                  tick={AXIS_TICK}
                  axisLine={{ stroke: GRID_COLOR }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => v + ' lb'}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v) => [v + ' lbs', 'Est. 1RM']}
                />
                <Line
                  type="monotone"
                  dataKey="e1rm"
                  stroke={BRAND}
                  strokeWidth={2}
                  dot={{ r: 3, fill: BRAND, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </ChartCard>
  );
}

// ── 3. Fatigue trend chart ─────────────────────────────────────────────────

function FatigueChart({ sets, fatigueScore }) {
  const data = buildFatigueTrend(sets);

  return (
    <ChartCard title="Fatigue Trend" subtitle="Last 28 days — deload if red zone">
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={RED}   stopOpacity={0.5} />
              <stop offset="35%"  stopColor={AMBER}  stopOpacity={0.3} />
              <stop offset="70%"  stopColor={GREEN}  stopOpacity={0.2} />
              <stop offset="100%" stopColor={GREEN}  stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_COLOR }}
            tickLine={false}
            interval={6}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            domain={[0, 10]}
            ticks={[0, 2.5, 5, 7.5, 10]}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => [v.toFixed(1) + ' / 10', 'Fatigue']}
          />
          <ReferenceLine y={5}   stroke={AMBER} strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={7.5} stroke={RED}   strokeDasharray="3 3" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={BRAND}
            strokeWidth={2}
            fill="url(#fatigueGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Current score + zone labels */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-3 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 0–5 Fresh (well recovered)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 5–7.5 Tired (accumulating fatigue)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> 7.5+ Deload (need recovery week)
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-brand font-semibold">
            {fatigueScore.toFixed(1)}/10
          </span>
          <p className="text-[10px] text-text-muted">
            Fatigue Score (0 = fresh, 10 = overreached)
          </p>
        </div>
      </div>
    </ChartCard>
  );
}

// ── 4. Session consistency ─────────────────────────────────────────────────

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function ConsistencyCard({ sets }) {
  const { daysInMonth, firstWeekday, today, workoutDays, streak } =
    buildConsistency(sets);

  const now   = new Date();
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <ChartCard
      title={`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`}
      subtitle={null}
    >
      {/* Streak */}
      <div className="flex items-baseline gap-2 mb-5">
        <span className="text-4xl font-display font-bold text-brand">
          {streak}
        </span>
        <span className="text-sm text-text-secondary">
          day streak
        </span>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] text-text-muted font-mono"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const isToday    = day === today;
          const isWorkout  = workoutDays.has(day);
          const isFuture   = day > today;
          return (
            <div
              key={i}
              className={`aspect-square rounded-sm flex items-center justify-center text-[10px] ${
                isToday
                  ? 'bg-brand text-white font-bold ring-1 ring-brand ring-offset-1 ring-offset-surface-card'
                  : isWorkout
                    ? 'bg-brand/30 text-brand font-medium'
                    : isFuture
                      ? 'bg-transparent text-surface-elevated'
                      : 'bg-surface-elevated text-text-muted'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-muted mt-3">
        {workoutDays.size} session{workoutDays.size !== 1 ? 's' : ''} this month
      </p>
    </ChartCard>
  );
}

// ── Progress page ──────────────────────────────────────────────────────────

export default function Progress() {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.get('/api/progress/summary').then((r) => r.data),
    staleTime: 0,
  });

  useEffect(() => {
    refetch();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-surface overflow-y-auto pb-24">
      <div className="px-4 pb-4 flex items-start justify-between" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Progress
          </h1>
          {data?.deload?.shouldDeload && (
            <p className="text-xs text-orange-400 mt-1">{data.deload.reason}</p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full bg-surface-elevated text-text-muted mt-1"
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </motion.button>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-4">
          {[200, 180, 160, 220].map((h, i) => (
            <div
              key={i}
              className="bg-surface-card rounded-card animate-pulse"
              style={{ height: h }}
            />
          ))}
        </div>
      ) : data ? (
        <div className="px-4 space-y-4">
          {(() => {
            const safeWeeklyVolume =
              data?.weeklyVolume && typeof data.weeklyVolume === 'object'
                ? data.weeklyVolume
                : {};
            const safeSets      = Array.isArray(data?.sets)      ? data.sets      : [];
            const safeExercises = Array.isArray(data?.exercises)  ? data.exercises : [];
            return (
              <>
                <VolumeChart  weeklyVolume={safeWeeklyVolume} />
                <StrengthChart sets={safeSets} exercises={safeExercises} />
                <FatigueChart  sets={safeSets} fatigueScore={data?.fatigueScore ?? 0} />
                <ConsistencyCard sets={safeSets} />
              </>
            );
          })()}
        </div>
      ) : (
        <p className="text-text-muted text-sm px-4">Could not load progress data.</p>
      )}

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
