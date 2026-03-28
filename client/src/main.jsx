import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import './i18n/index.js';
import { useColorblindMode } from './hooks/useColorblindMode.js';
import { flushQueue, getQueue } from './lib/offlineQueue.js';
import api from './lib/api.js';

import AppShell from './components/layout/AppShell.jsx';
import OnboardingGate from './components/layout/OnboardingGate.jsx';
import Auth from './pages/Auth.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Today from './pages/Today.jsx';
import Log from './pages/Log.jsx';
import Coach from './pages/Coach.jsx';
import Progress from './pages/Progress.jsx';

function ColorblindProvider({ children }) {
  useColorblindMode(); // applies filter from localStorage on mount
  return children;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

// Flush queued offline sets when connection is restored
window.addEventListener('online', async () => {
  const queue = getQueue();
  if (queue.length > 0) {
    console.log(`[Motus] Back online — syncing ${queue.length} queued sets`);
    await flushQueue((url, data) => api.post(url, data));
    queryClient.invalidateQueries({ queryKey: ['workout-history'] });
  }
});

// Clear stale workout sessions older than 4 hours
const _lastSession = sessionStorage.getItem('motus_session_time');
const _now = Date.now();
if (!_lastSession || _now - parseInt(_lastSession) > 4 * 60 * 60 * 1000) {
  sessionStorage.removeItem('motus_active_workout');
  sessionStorage.removeItem('motus_workout_progress');
}
sessionStorage.setItem('motus_session_time', _now.toString());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ColorblindProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<OnboardingGate />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/today" replace />} />
              <Route path="/today" element={<Today />} />
              <Route path="/log" element={<Log />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/progress" element={<Progress />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      </ColorblindProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
