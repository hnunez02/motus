import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { t } = useTranslation();

  const TABS = [
    { to: '/today',    label: t('nav.today'),    icon: '🏋️' },
    { to: '/log',      label: t('nav.log'),      icon: '📋' },
    { to: '/coach',    label: t('nav.coach'),    icon: '🦉' },
    { to: '/progress', label: t('nav.progress'), icon: '📈' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-surface-elevated flex"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-1.5 text-xs transition-colors ${
              isActive ? 'text-brand' : 'text-text-muted'
            }`
          }
        >
          <span className="text-base mb-0.5">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
