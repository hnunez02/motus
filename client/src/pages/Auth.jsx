import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase.js';

export default function Auth() {
  const navigate = useNavigate();
  const [mode,     setMode]     = useState('signin'); // 'signin' | 'signup'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        navigate('/', { replace: true });
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        // Supabase may require email confirmation before a session is issued
        if (data.user && !data.session) {
          setSuccess('Check your email to confirm your account, then sign in.');
          setMode('signin');
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setSuccess(null);
  };

  return (
    <div
      className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-brand/15 border border-brand/25 flex items-center justify-center mb-4">
          <span style={{ fontSize: 40 }}>🦉</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-text-primary">Motus</h1>
        <p className="text-sm text-text-muted mt-1">Your AI fitness coach</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-surface-card rounded-[20px] p-6 space-y-4">
        <h2 className="text-lg font-display font-bold text-text-primary">
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h2>

        {/* Email */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">Email</label>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{ fontSize: '16px' }}
            className="w-full bg-surface-elevated text-text-primary rounded-card px-4 py-3 outline-none border border-surface-elevated focus:border-brand"
          />
        </div>

        {/* Password */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">Password</label>
          <input
            type="password"
            placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{ fontSize: '16px' }}
            className="w-full bg-surface-elevated text-text-primary rounded-card px-4 py-3 outline-none border border-surface-elevated focus:border-brand"
          />
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-400 font-medium"
            >
              {error}
            </motion.p>
          )}
          {success && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-brand font-medium"
            >
              {success}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Primary action */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 rounded-card bg-brand text-white font-semibold text-sm disabled:opacity-50"
        >
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </motion.button>
      </div>

      {/* Mode toggle */}
      <p className="text-sm text-text-muted mt-6">
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button onClick={switchMode} className="text-brand font-semibold">
          {mode === 'signin' ? 'Create one' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
