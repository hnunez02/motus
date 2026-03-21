export default function ChipSelector({ options = [], selected = [], onToggle, multi = true }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            className={`px-3 py-1.5 rounded-chip text-sm font-medium transition-all ${
              isSelected
                ? 'bg-brand text-white'
                : 'bg-surface-elevated text-text-secondary hover:bg-surface-card'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
