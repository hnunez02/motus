import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import api from '../../lib/api.js';

export default function OnboardingGate() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'unauthenticated' | 'needed' | 'complete'

  useEffect(() => {
    // Timeout after 5s so airplane mode never hangs the app on the loading screen
    const timeout = setTimeout(() => setStatus('complete'), 5000);

    api.get('/api/auth/me')
      .then((res) => {
        clearTimeout(timeout);
        const user = res.data?.user;
        const complete = user && user.daysPerWeek !== null && user.daysPerWeek !== undefined;
        setStatus(complete ? 'complete' : 'needed');
      })
      .catch((err) => {
        clearTimeout(timeout);
        if (err?.response?.status === 401) {
          setStatus('unauthenticated');
        } else {
          // Network error — let the app load and handle it downstream
          setStatus('complete');
        }
      });

    return () => clearTimeout(timeout);
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: '#555', fontSize: 14, fontFamily: 'monospace' }}>
          Loading...
        </p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/auth" replace />;
  }

  if (status === 'needed') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
