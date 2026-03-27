import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api.js';

export default function Settings({ onClose }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRerunOnboarding = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    try {
      // Clear the onboarding completion flags so OnboardingGate redirects
      await api.patch('/api/auth/profile', {
        trainingAge: null,
        daysPerWeek: null,
      });
      onClose();
      navigate('/onboarding');
    } catch (err) {
      console.error('Failed to reset onboarding:', err);
      setLoading(false);
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
          {/* Handle */}
          <div className="w-10 h-1 bg-surface-elevated rounded-full mx-auto mb-6" />

          <h2 className="text-lg font-display font-bold text-text-primary mb-6">
            Settings
          </h2>

          {/* Settings options */}
          <div className="space-y-2">

            {/* Re-run onboarding */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleRerunOnboarding}
              disabled={loading}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-card text-left transition-colors ${
                confirming
                  ? 'bg-brand/10 border border-brand/30'
                  : 'bg-surface-elevated'
              }`}
            >
              <span className="text-xl">⚙️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">
                  {confirming ? 'Tap again to confirm' : 'Update my profile'}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {confirming
                    ? 'This will restart the onboarding flow'
                    : 'Re-run setup to update goals, health data & preferences'}
                </p>
              </div>
              {loading && (
                <span className="text-xs text-text-muted animate-pulse">...</span>
              )}
            </motion.button>

            {/* Apple Health — future */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-card bg-surface-elevated opacity-40">
              <span className="text-xl">❤️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">Apple Health</p>
                <p className="text-xs text-text-muted mt-0.5">Manage via onboarding</p>
              </div>
            </div>

          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 text-sm text-text-muted"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
