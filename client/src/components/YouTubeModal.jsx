import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function YouTubeModal({ videoId, exerciseName, onClose }) {
  const [loadError, setLoadError] = useState(false);

  if (!videoId) return null;

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1&autoplay=1`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

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

        {/* Video */}
        <div className="flex-1 flex items-center justify-center bg-black">
          {!loadError ? (
            <iframe
              src={embedUrl}
              className="w-full"
              style={{ aspectRatio: '16/9' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={() => setLoadError(true)}
              title={`${exerciseName} form demonstration`}
            />
          ) : (
            <div className="text-center px-8 space-y-4">
              <p className="text-white/50 text-sm">Video unavailable in-app</p>
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-brand text-white px-6 py-3 rounded-card text-sm font-semibold"
              >
                Watch on YouTube →
              </a>
            </div>
          )}
        </div>

        {/* Footer attribution */}
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
