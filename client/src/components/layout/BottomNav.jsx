import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/today',    label: 'Today',    icon: '🏋️' },
  { to: '/log',      label: 'Log',      icon: '📋' },
  { to: '/coach',    label: 'Coach',    icon: '🦉' },
  { to: '/progress', label: 'Progress', icon: '📈' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-surface-elevated flex">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 text-xs transition-colors ${
              isActive ? 'text-brand' : 'text-text-muted'
            }`
          }
        >
          <span className="text-xl mb-1">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
