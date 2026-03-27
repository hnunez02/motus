// Horizontal bar chart showing weekly sets per muscle vs MEV / MRV landmarks

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

const MUSCLE_LABEL = {
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

function barColor(sets, mev, mrv) {
  if (sets === 0)       return '#3A3A3A';   // none — dark grey
  if (sets < mev)       return '#E8593C';   // below MEV — brand orange/red
  if (sets <= mrv)      return '#22C55E';   // in range — green
  return '#F2A623';                         // above MRV — amber
}

export default function MuscleVolumeCard({ weeklyVolume }) {
  const muscles = Object.keys(VOLUME_LANDMARKS);

  return (
    <div className="bg-surface-card rounded-card p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-text-primary">Weekly Volume</h3>
        <div className="flex gap-3 text-[10px] text-text-muted font-mono">
          <span><span style={{ color: '#E8593C' }}>●</span> &lt;MEV</span>
          <span><span style={{ color: '#22C55E' }}>●</span> In range</span>
          <span><span style={{ color: '#F2A623' }}>●</span> &gt;MRV</span>
        </div>
      </div>

      <div className="space-y-2 mt-3">
        {muscles.map((muscle) => {
          const sets = weeklyVolume?.[muscle] ?? 0;
          const { mev, mrv } = VOLUME_LANDMARKS[muscle];
          const pct  = Math.min((sets / mrv) * 100, 100);
          const color = barColor(sets, mev, mrv);

          return (
            <div key={muscle} className="flex items-center gap-2">
              <span className="w-14 text-[11px] text-text-muted font-mono text-right shrink-0">
                {MUSCLE_LABEL[muscle]}
              </span>
              <div className="flex-1 bg-surface-elevated rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span
                className="w-5 text-[11px] font-mono text-right shrink-0"
                style={{ color }}
              >
                {sets}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-text-muted mt-3 font-mono">
        MEV / MRV per Israetel et al.
      </p>
    </div>
  );
}
