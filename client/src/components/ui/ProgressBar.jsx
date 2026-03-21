import { motion } from 'framer-motion';

export default function ProgressBar({ value = 0, max = 100, label, color = 'bg-brand' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-text-secondary">{label}</span>
          <span className="text-xs text-text-muted">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
