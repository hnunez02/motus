import { RPE_DESCRIPTIONS } from '../../lib/constants.js';

export default function RPESlider({ value = 7, onChange }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-semibold text-text-primary">RPE</span>
        <span className="text-sm font-bold text-brand">{value}</span>
      </div>
      <input
        type="range"
        min={6}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand"
      />
      <div className="flex justify-between text-xs text-text-muted mt-1">
        <span>6</span>
        <span>7</span>
        <span>8</span>
        <span>9</span>
        <span>10</span>
      </div>
      <p className="text-xs text-text-secondary mt-2 italic">
        {RPE_DESCRIPTIONS[Math.round(value)] || ''}
      </p>
    </div>
  );
}
