import { motion } from 'framer-motion';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}) {
  const base =
    'font-semibold rounded-card transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand/50';

  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-dark active:scale-95',
    secondary: 'bg-surface-elevated text-text-primary hover:bg-surface-card',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg w-full',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}
