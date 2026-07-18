import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  FiBook,
  FiBookOpen,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiUsers,
  FiX,
  FiZap,
  FiChevronRight,
  FiMonitor,
} from 'react-icons/fi';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [showCommunityLink, setShowCommunityLink] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  /** Navbar is scroll-only on marketing pages, always visible in app flows. */
  const alwaysVisible =
    pathname === '/membership' ||
    pathname.startsWith('/creator') ||
    pathname.startsWith('/store') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/community') ||
    pathname.includes('/community');

  const navSolid = scrolled || alwaysVisible;
  const creatorDestination =
    user?.role === 'tutor' && user?.creatorStatus === 'approved'
      ? '/creator/dashboard'
      : '/creator/onboarding';
  const creatorLabel =
    user?.role === 'tutor' && user?.creatorStatus === 'approved'
      ? 'Creator studio'
      : 'Become a creator';
  const isApprovedTutor = user?.role === 'tutor' && user?.creatorStatus === 'approved';

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const checkAuthStatus = () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      console.log('Checking auth status:', { token: !!token, userData: !!userData });
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setIsLoggedIn(true);
          setUser(parsedUser);
          console.log('User authenticated:', parsedUser.fullName);
        } catch (error) {
          console.error('Error parsing user data:', error);
          setIsLoggedIn(false);
          setUser(null);
          setShowCommunityLink(false);
          // Clear invalid data
          localStorage.removeItem('user');
        }
      } else {
        console.log('User not authenticated');
        setIsLoggedIn(false);
        setUser(null);
        setShowCommunityLink(false);
      }
    };
    
    // Check auth status immediately when component mounts
    checkAuthStatus();
    
    // Listen for custom auth change events from login/register components
    const handleAuthChange = () => {
      checkAuthStatus();
    };
    
    // Storage event handler for multi-tab support
    const handleStorageChange = (e) => {
      if (e.key === 'authToken' || e.key === 'user') {
        checkAuthStatus();
      }
    };
    
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!isLoggedIn || !token) {
      setShowCommunityLink(false);
      return undefined;
    }

    if (isApprovedTutor) {
      setShowCommunityLink(true);
      return undefined;
    }

    let cancelled = false;
    axios
      .get(`${API_URL}/api/me/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        if (!cancelled) {
          setShowCommunityLink(Boolean(data.subscriptions?.length));
        }
      })
      .catch(() => {
        if (!cancelled) setShowCommunityLink(false);
      });

    return () => {
      cancelled = true;
    };
  }, [API_URL, isApprovedTutor, isLoggedIn, pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setShowCommunityLink(false);
    
    // Dispatch custom event to ensure all components update
    window.dispatchEvent(new Event('auth-change'));
    
    // Redirect to home page instead of login
    navigate('/');
  };

  const linkActive = (to) => {
    if (to === '/community') return pathname === '/community' || pathname.includes('/community');
    if (to === '/membership') return pathname === '/membership' || pathname.startsWith('/membership');
    if (to === '/creator/onboarding') return pathname.startsWith('/creator');
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  const navLinkClass = (to) => {
    const active = linkActive(to);
    if (navSolid) {
      return `relative px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition ${
        active ? 'text-slate-950' : 'text-slate-500 hover:text-slate-900'
      }`;
    }
    return `relative px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition ${
      active ? 'text-white' : 'text-white/75 hover:text-white'
    }`;
  };

  const desktopLinks = [
    { to: '/courses', label: 'Courses', Icon: FiGrid },
    { to: '/store', label: 'Books', Icon: FiBookOpen },
    ...(showCommunityLink ? [{ to: '/community', label: 'Community', Icon: FiUsers }] : []),
    { to: '/creator/onboarding', label: 'Creator programs', Icon: FiZap },
  ];

  const closeMobile = () => setIsMobileMenuOpen(false);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        navSolid
          ? 'border-b border-slate-200/70 bg-white/80 text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent text-white'
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.25rem] w-full items-center justify-between gap-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 transition opacity-95 hover:opacity-100"
            aria-label="QuickX Learn home"
          >
            <img
              src="/logo.jpg"
              alt="QuickX Learn"
              className={`h-8 w-auto rounded-lg object-contain sm:h-9 ${
                navSolid ? '' : 'ring-1 ring-white/30'
              }`}
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden items-center gap-1 md:flex">
            {desktopLinks.map((item) => (
              <Link key={item.to} to={item.to} className={navLinkClass(item.to)}>
                {item.label}
                {linkActive(item.to) ? (
                  <span
                    className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full ${
                      navSolid ? 'bg-[#1B5EF5]' : 'bg-white'
                    }`}
                  />
                ) : null}
              </Link>
            ))}

            <div
              className={`mx-2 h-5 w-px ${navSolid ? 'bg-slate-200' : 'bg-white/25'}`}
              aria-hidden
            />

            {isLoggedIn ? (
              <div
                className={`flex items-center gap-1.5 ${
                  navSolid ? 'text-slate-700' : 'text-white'
                }`}
              >
                <NotificationBell />
                <Link
                  to="/membership"
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
                    navSolid
                      ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <FiBook className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
                <div className="relative group">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13px] font-medium transition ${
                      navSolid
                        ? 'bg-slate-100/80 text-slate-800 hover:bg-slate-100'
                        : 'bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B5EF5] text-[11px] font-semibold text-white">
                      {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <span className="pr-1">{user?.fullName?.split(' ')[0] || 'User'}</span>
                  </button>
                  <div className="invisible absolute right-0 z-20 mt-2 w-52 translate-y-1 rounded-2xl border border-slate-200/80 bg-white py-1.5 opacity-0 shadow-[0_12px_40px_rgba(15,23,42,0.12)] transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="border-b border-slate-100 px-3.5 py-2.5">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user?.fullName || 'Member'}
                      </p>
                      <p className="truncate text-xs text-slate-400">{user?.email || 'QuickX account'}</p>
                    </div>
                    <Link
                      to="/membership"
                      className="block px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to={creatorDestination}
                      className="block px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {creatorLabel}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full px-3.5 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={`rounded-xl px-3.5 py-2 text-[13px] font-medium transition ${
                    navSolid
                      ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold transition ${
                    navSolid
                      ? 'bg-[#0B1F44] text-white hover:bg-[#1B5EF5]'
                      : 'bg-white text-[#0B1F44] hover:bg-white/90'
                  }`}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-1 md:hidden">
            {isLoggedIn ? (
              <div className={navSolid ? 'text-slate-800' : 'text-white'}>
                <NotificationBell />
              </div>
            ) : null}
            <button
              type="button"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className={`inline-flex items-center justify-center rounded-xl p-2.5 transition focus:outline-none focus:ring-2 focus:ring-[#1B5EF5]/30 ${
                navSolid
                  ? 'text-slate-800 hover:bg-slate-100'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {isMobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — full-screen sheet */}
      <div
        className={`fixed inset-0 z-[9999] md:hidden ${
          isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div
          className={`absolute inset-0 bg-[#0B1F44]/45 backdrop-blur-[2px] transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMobile}
        />

        <aside
          className={`absolute inset-0 flex w-full flex-col bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Header */}
          <div className="flex h-[4.25rem] shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <Link to="/" onClick={closeMobile} className="flex items-center gap-2.5">
              <img src="/logo.jpg" alt="QuickX Learn" className="h-8 w-auto rounded-lg object-contain" />
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMobile}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 transition hover:bg-slate-100"
              tabIndex={isMobileMenuOpen ? 0 : -1}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Nav links */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Explore
            </p>
            <nav className="space-y-1">
              {desktopLinks.map(({ to, label, Icon }) => {
                const active = linkActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={closeMobile}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-3.5 transition ${
                      active
                        ? 'bg-[#1B5EF5]/8 text-[#0B1F44]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                        active
                          ? 'bg-[#1B5EF5] text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/80'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-[15px] font-semibold tracking-tight">{label}</span>
                    <FiChevronRight
                      className={`h-4 w-4 shrink-0 ${
                        active ? 'text-[#1B5EF5]' : 'text-slate-300 group-hover:text-slate-400'
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            {isLoggedIn ? (
              <div className="mt-6">
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Account
                </p>
                <div className="space-y-1">
                  <Link
                    to="/membership"
                    onClick={closeMobile}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-3.5 transition ${
                      linkActive('/membership')
                        ? 'bg-[#1B5EF5]/8 text-[#0B1F44]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        linkActive('/membership')
                          ? 'bg-[#1B5EF5] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FiMonitor className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-[15px] font-semibold tracking-tight">Dashboard</span>
                    <FiChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                  <Link
                    to={creatorDestination}
                    onClick={closeMobile}
                    className="group flex items-center gap-3 rounded-2xl px-3 py-3.5 text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <FiZap className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-[15px] font-semibold tracking-tight">
                      {creatorLabel}
                    </span>
                    <FiChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {isLoggedIn ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-slate-200/80">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1B5EF5] text-sm font-bold text-white">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0B1F44]">
                      {user?.fullName || 'Member'}
                    </p>
                    <p className="truncate text-xs text-slate-400">{user?.email || ''}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <FiLogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-center text-sm font-semibold text-[#0B1F44] transition hover:border-slate-300"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobile}
                  className="rounded-2xl bg-[#1B5EF5] px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-[#1552D6]"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </nav>
  );
};

export default Navbar;
