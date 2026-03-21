import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';

export default function AppShell() {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-text-primary">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
