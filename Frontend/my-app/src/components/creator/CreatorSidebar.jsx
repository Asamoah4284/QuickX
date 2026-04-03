import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiBookOpen,
  FiEdit3,
  FiFileText,
  FiUsers,
  FiStar,
  FiDollarSign,
  FiCreditCard,
  FiSettings,
} from 'react-icons/fi';

const items = [
  { to: '/creator/dashboard', label: 'Overview', icon: FiBarChart2, end: true },
  { to: '/creator/dashboard/courses', label: 'My Courses', icon: FiBookOpen },
  { to: '/creator/dashboard/courses/new', label: 'Create New Course', icon: FiEdit3 },
  { to: '/creator/dashboard/drafts', label: 'Drafts', icon: FiFileText },
  { to: '/creator/dashboard/students', label: 'Students', icon: FiUsers },
  { to: '/creator/dashboard/reviews', label: 'Reviews', icon: FiStar },
  { to: '/creator/dashboard/earnings', label: 'Earnings', icon: FiDollarSign },
  { to: '/creator/dashboard/payouts', label: 'Payouts', icon: FiCreditCard },
  { to: '/creator/dashboard/settings', label: 'Profile Settings', icon: FiSettings },
];

export default function CreatorSidebar({ onNavigate }) {
  return (
    <aside className="w-full lg:w-64 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-creator-lg">
      <div className="mb-4 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-4 text-white shadow-creator">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100/90">Quick X Creator</p>
        <h2 className="mt-1.5 text-base font-semibold leading-snug">Build and grow your course business</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-blue-100/85">
          Publish premium learning experiences without any creator subscription.
        </p>
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
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
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
