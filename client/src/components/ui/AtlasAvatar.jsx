import { motion } from 'framer-motion';

const SIZE_MAP = { sm: 32, md: 48, lg: 72 };

export default function AtlasAvatar({ mood = 'neutral', size = 'md' }) {
  const px = SIZE_MAP[size] || SIZE_MAP.md;

  const eyeVariants = {
    neutral: { x: 0, y: 0 },
    thinking: {
      x: [0, -2, 2, -2, 0],
      y: [0, 0, 0, 0, 0],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    celebrating: { x: 0, y: 0 },
    concerned: { x: 1, y: 1 },
  };

  const bodyVariants = {
    neutral: {},
    thinking: {},
    celebrating: {
      y: [0, -4, 0, -4, 0],
      transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
    },
    concerned: {
      rotate: -8,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      variants={bodyVariants}
      animate={mood}
      style={{ width: px, height: px, display: 'inline-block' }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Atlas owl avatar — ${mood}`}
      >
        {/* Body */}
        <ellipse cx="24" cy="30" rx="14" ry="13" fill="#E8593C" />
        {/* Head */}
        <ellipse cx="24" cy="18" rx="12" ry="11" fill="#E8593C" />
        {/* Belly */}
        <ellipse cx="24" cy="31" rx="8" ry="9" fill="#F2A623" opacity="0.85" />
        {/* Left ear tuft */}
        <polygon points="13,10 10,4 16,8" fill="#B03A22" />
        {/* Right ear tuft */}
        <polygon points="35,10 38,4 32,8" fill="#B03A22" />
        {/* Left eye bg */}
        <circle cx="19" cy="18" r="5" fill="#F5F5F5" />
        {/* Right eye bg */}
        <circle cx="29" cy="18" r="5" fill="#F5F5F5" />
        {/* Left pupil */}
        <motion.circle
          cx="19"
          cy="18"
          r="2.5"
          fill="#0F0F0F"
          variants={eyeVariants}
          animate={mood}
        />
        {/* Right pupil */}
        <motion.circle
          cx="29"
          cy="18"
          r="2.5"
          fill="#0F0F0F"
          variants={eyeVariants}
          animate={mood}
        />
        {/* Beak */}
        <polygon points="24,21 21,25 27,25" fill="#F2A623" />
        {/* Wings */}
        <ellipse cx="12" cy="32" rx="5" ry="8" fill="#B03A22" transform="rotate(-15 12 32)" />
        <ellipse cx="36" cy="32" rx="5" ry="8" fill="#B03A22" transform="rotate(15 36 32)" />
        {/* Feet */}
        <line x1="20" y1="43" x2="17" y2="47" stroke="#F2A623" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="43" x2="20" y2="47" stroke="#F2A623" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="43" x2="23" y2="47" stroke="#F2A623" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="43" x2="25" y2="47" stroke="#F2A623" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="43" x2="28" y2="47" stroke="#F2A623" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="43" x2="31" y2="47" stroke="#F2A623" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}
