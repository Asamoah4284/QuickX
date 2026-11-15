import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiBookOpen,
  FiBook,
  FiEdit3,
  FiFileText,
  FiUsers,
  FiStar,
  FiArrowLeft,
  FiSettings,
  FiMessageSquare,
} from 'react-icons/fi';

const items = [
  { to: '/creator/dashboard', label: 'Overview', icon: FiBarChart2, end: true },
  { to: '/creator/dashboard/courses', label: 'My Courses', icon: FiBookOpen },
  { to: '/creator/dashboard/courses/new', label: 'Create New Course', icon: FiEdit3 },
  { to: '/creator/dashboard/books', label: 'My Books', icon: FiBook },
  { to: '/creator/dashboard/drafts', label: 'Drafts', icon: FiFileText },
  { to: '/creator/dashboard/students', label: 'Students', icon: FiUsers },
  { to: '/creator/dashboard/community', label: 'Community', icon: FiMessageSquare },
  { to: '/creator/dashboard/reviews', label: 'Reviews', icon: FiStar },
  { to: '/creator/dashboard/settings', label: 'Mentor profile', icon: FiSettings },
];

export default function CreatorSidebar({ onNavigate }) {
  return (
    <aside className="w-full rounded-2xl border border-line bg-ink-850 p-3 lg:w-64 lg:p-4">
      <div className="mb-4 rounded-xl border border-line bg-ink-900 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">Studio</p>
        <h2 className="mt-1.5 text-base font-semibold leading-snug text-fg">Your courses and books</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
          Everything you publish here goes live for members straight away.
        </p>
        <NavLink
          to="/admin"
          onClick={onNavigate}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200"
        >
          <FiArrowLeft className="h-3.5 w-3.5" /> Back to admin
        </NavLink>
      </div>

      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? 'bg-brand-600/12 text-brand-400'
                    : 'text-fg-muted hover:bg-ink-900 hover:text-fg'
                }`
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
