import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiBook,
  FiBookOpen,
  FiPieChart,
  FiCreditCard,
  FiStar,
  FiCalendar,
  FiDollarSign,
  FiExternalLink,
  FiHome,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiTag,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { cx } from '../lib/format';
import { PageLoader } from '../ui/primitives';

const NAV = [
  { to: '/admin/dashboard', label: 'Overview', icon: FiHome },
  { to: '/admin/signals', label: 'Signals', icon: FiActivity },
  { to: '/admin/pie', label: 'Pie trading', icon: FiPieChart },
  { to: '/admin/members', label: 'Members', icon: FiUsers },
  { to: '/admin/sessions', label: 'Sessions', icon: FiCalendar },
  { to: '/admin/events', label: 'Events', icon: FiStar },
  { to: '/admin/courses', label: 'Courses', icon: FiBook },
  { to: '/admin/books', label: 'Books', icon: FiBookOpen },
  { to: '/admin/pricing', label: 'Pricing', icon: FiDollarSign },
  { to: '/admin/coupons', label: 'Coupons', icon: FiTag },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: FiCreditCard },
  { to: '/admin/settings', label: 'Settings', icon: FiSettings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const matches = useMatches();
  const isLegacy = matches.some((m) => m.handle?.legacy);
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-line px-5">
        <Link to="/admin/dashboard" className="text-lg font-bold text-fg">
          Quick<span className="text-brand-400">X</span> <span className="text-sm font-medium text-fg-subtle">Admin</span>
        </Link>
        <button type="button" className="rounded-full p-2 text-fg-muted lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <FiX className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-600 text-white' : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg'
              )
            }
          >
            <item.icon className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line p-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-fg-muted hover:bg-white/[0.05] hover:text-fg">
          <FiExternalLink className="h-4 w-4" />
          View site
        </a>
        <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-fg-muted hover:bg-white/[0.05] hover:text-fg">
          <FiLogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-ink-900 lg:sticky lg:top-0 lg:block lg:h-dvh">{sidebar}</aside>

      <div className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line px-4 lg:hidden">
        <span className="font-bold text-fg">
          Quick<span className="text-brand-400">X</span> Admin
        </span>
        <button type="button" onClick={() => setOpen(true)} className="rounded-full p-2 text-fg-muted" aria-label="Open menu">
          <FiMenu className="h-5 w-5" />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-ink-900">{sidebar}</aside>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<PageLoader />}>
          {isLegacy ? (
            <div className="qx-legacy rounded-2xl p-4 sm:p-6">
              <Outlet />
            </div>
          ) : (
            <Outlet />
          )}
        </Suspense>
      </main>
    </div>
  );
}
