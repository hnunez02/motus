import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import api from '../lib/api.js';
import { useColorblindMode } from '../hooks/useColorblindMode.js';

export default function Settings({ onClose }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { mode, setMode } = useColorblindMode();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRerunOnboarding = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    try {
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
            {t('settings.title')}
          </h2>

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
                  {confirming ? t('settings.tapToConfirm') : t('settings.updateProfile')}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {confirming ? t('settings.tapToConfirmDesc') : t('settings.updateProfileDesc')}
                </p>
              </div>
              {loading && (
                <span className="text-xs text-text-muted animate-pulse">...</span>
              )}
            </motion.button>

            {/* Language info */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-card bg-surface-elevated">
              <span className="text-xl">🌐</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">{t('settings.language')}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {i18n.language?.startsWith('es') ? '🇲🇽 Español' : '🇺🇸 English'} · {t('settings.languageDesc')}
                </p>
              </div>
            </div>

            {/* Apple Health */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-card bg-surface-elevated opacity-40">
              <span className="text-xl">❤️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">{t('settings.appleHealth')}</p>
                <p className="text-xs text-text-muted mt-0.5">{t('settings.appleHealthDesc')}</p>
              </div>
            </div>

          </div>

          {/* Colorblind mode */}
          <div className="mt-4">
            <p className="text-xs text-text-muted uppercase tracking-widest font-mono mb-2 px-1">
              {t('settings.colorblind')}
            </p>
            <div className="space-y-2">
              {[
                { id: 'none',         label: t('settings.colorblindModes.none') },
                { id: 'protanopia',   label: t('settings.colorblindModes.protanopia') },
                { id: 'deuteranopia', label: t('settings.colorblindModes.deuteranopia') },
                { id: 'tritanopia',   label: t('settings.colorblindModes.tritanopia') },
              ].map((opt) => (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode(opt.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-card border text-left text-sm transition-colors ${
                    mode === opt.id
                      ? 'bg-brand text-white border-brand'
                      : 'bg-surface-elevated text-text-primary border-surface-elevated'
                  }`}
                >
                  <span>{opt.label}</span>
                  {mode === opt.id && <span>✓</span>}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 text-sm text-text-muted"
          >
            {t('settings.close')}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
