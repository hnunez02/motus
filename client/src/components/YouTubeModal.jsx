import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export default function YouTubeModal({ videoId, exerciseName, onClose }) {
  if (!videoId) return null;

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const youtubeAppUrl = `youtube://www.youtube.com/watch?v=${videoId}`;

  const handleWatch = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Try to open in YouTube app first
        await Browser.open({ url: youtubeAppUrl });
      } catch {
        // Fall back to YouTube in Safari if app not installed
        await Browser.open({ url: watchUrl });
      }
    } else {
      window.open(watchUrl, '_blank');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <p className="text-white font-semibold text-sm">{exerciseName}</p>
            <p className="text-white/50 text-xs mt-0.5">Form Demo</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 text-sm font-medium px-3 py-1.5 rounded-full border border-white/20 active:bg-white/10"
          >
            ✕ Close
          </button>
        </div>

        {/* Launch card */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          {/* YouTube icon */}
          <div className="w-20 h-20 rounded-2xl bg-[#FF0000] flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>

          <div className="text-center space-y-2">
            <p className="text-white font-semibold text-lg">{exerciseName}</p>
            <p className="text-white/50 text-sm">Form demonstration</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleWatch}
            className="w-full py-4 rounded-card bg-[#FF0000] text-white font-semibold text-base"
          >
            Watch on YouTube →
          </motion.button>

          <p className="text-white/25 text-xs text-center">
            Opens in the YouTube app
          </p>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t border-white/10 text-center"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-white/30 text-xs">
            Form demonstration via YouTube · For educational purposes
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
