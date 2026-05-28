import { NavLink } from 'react-router-dom';
import { Disc, Calendar, History } from 'lucide-react';

const TABS = [
  { to: '/', label: '오늘', Icon: Disc, end: true },
  { to: '/calendar', label: '캘린더', Icon: Calendar, end: false },
  { to: '/lookback', label: '돌아보기', Icon: History, end: false },
] as const;

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="기본 탐색">
      <div className="tabbar__inner">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `tab ${isActive ? 'tab--active' : ''}`}
          >
            <Icon className="tab__icon" size={19} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
