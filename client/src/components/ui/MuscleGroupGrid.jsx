import { MUSCLE_GROUPS } from '../../lib/constants.js';

export default function MuscleGroupGrid({ selected = [], onToggle }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MUSCLE_GROUPS.map((mg) => {
        const isSelected = selected.includes(mg.id);
        return (
          <button
            key={mg.id}
            onClick={() => onToggle(mg.id)}
            className={`py-2 px-3 rounded-chip text-sm font-medium transition-all ${
              isSelected
                ? 'bg-brand text-white'
                : 'bg-surface-elevated text-text-secondary hover:bg-surface-card'
            }`}
          >
            {mg.label}
          </button>
        );
      })}
    </div>
  );
}
