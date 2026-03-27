import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import api from '../../lib/api.js';

export default function OnboardingGate() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'needed' | 'complete'

  useEffect(() => {
    api.get('/api/auth/me')
      .then((res) => {
        const user = res.data?.user;
        // Consider onboarding complete if trainingAge has been set
        // (it's the first required step)
        const complete = user && user.daysPerWeek !== null && user.daysPerWeek !== undefined;
        setStatus(complete ? 'complete' : 'needed');
      })
      .catch(() => {
        // If the request fails (not logged in, network error),
        // let the app handle it — don't block
        setStatus('complete');
      });
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

  if (status === 'needed') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
