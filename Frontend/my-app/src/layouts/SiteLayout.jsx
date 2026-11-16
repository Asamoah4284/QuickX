import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useMatches, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMenu,
  FiX,
  FiHome,
  FiLogOut,
  FiBookOpen,
  FiTag,
  FiEdit3,
  FiPieChart,
  FiCalendar,
  FiInfo,
  FiChevronDown,
} from 'react-icons/fi';
import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../lib/auth';
import { FEATURE_LIST } from '../lib/features';
import { cx } from '../lib/format';
import { Avatar, Button, Container, PageLoader } from '../ui/primitives';
import { Sheet } from '../ui/overlays';
import { PageTransition } from '../ui/motion';
import NotificationBell from '../components/NotificationBell';
import InstallAppBanner from '../components/InstallAppBanner';
import { clearServerPushSubscription, ensurePushSubscription } from '../utils/webPush';

const WHATSAPP_URL = 'https://wa.me/233559037872?text=' + encodeURIComponent('Hello! I would like to get in touch with you.');

const TELEGRAM_URL = 'https://t.me/quickxtrading';

const FEATURE_LINKS = FEATURE_LIST.map((f) => ({ to: f.path, label: f.label, icon: f.icon }));
const byPath = (path) => FEATURE_LINKS.find((l) => l.to === path);
const PIE_LINK = { to: '/pie', label: 'Pie trading', icon: FiPieChart };
const BOOKS_LINK = { to: '/store', label: 'Books', icon: FiBookOpen };
const EVENTS_LINK = { to: '/events', label: 'Events', icon: FiCalendar };
const PRICING_LINK = { to: '/pricing', label: 'Pricing', icon: FiTag };
const ABOUT_LINK = { to: '/about', label: 'About', icon: FiInfo };

/** Shown in the top bar on desktop. Kept short so the bar never feels crowded. */
const TOP_LINKS = [byPath('/courses'), byPath('/signals'), byPath('/community'), PIE_LINK, PRICING_LINK].filter(Boolean);

/** Tucked under "More" on desktop. */
const MORE_LINKS = [byPath('/mentorship'), BOOKS_LINK, EVENTS_LINK, ABOUT_LINK].filter(Boolean);

/** Everything, for the phone menu and the footer. */
const PRIMARY_LINKS = [...FEATURE_LINKS, PIE_LINK, BOOKS_LINK, EVENTS_LINK, PRICING_LINK];

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  const active = MORE_LINKS.some((l) => pathname.startsWith(l.to));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cx(
          'flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
          active || open ? 'text-fg' : 'text-fg-muted hover:text-fg'
        )}
      >
        More
        <FiChevronDown className={cx('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="surface absolute right-0 top-full mt-2 w-56 origin-top-right rounded-2xl p-1.5 shadow-xl"
          >
            {MORE_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                role="menuitem"
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isActive ? 'bg-brand-500/15 text-fg' : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg'
                  )
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="QuickX home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-extrabold text-white shadow-glow">
        Q
      </span>
      <span className="text-lg font-bold tracking-tight text-fg">
        Quick<span className="text-brand-400">X</span>
      </span>
    </Link>
  );
}

function TopNav({ onOpenMenu }) {
  const { isSignedIn, user, isOwner } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-50 h-16 border-b transition-colors duration-300',
        scrolled ? 'glass border-line' : 'border-transparent bg-ink-950/60 backdrop-blur-md'
      )}
    >
      <Container className="flex h-full items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {TOP_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cx(
                  'relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-fg' : 'text-fg-muted hover:text-fg'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    // The highlight glides from one link to the next.
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.08]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <span className="relative">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <MoreMenu />
        </nav>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <>
              {isOwner ? (
                <Button to="/creator/dashboard" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <FiEdit3 className="h-4 w-4" />
                  Studio
                </Button>
              ) : null}
              <NotificationBell />
              <Link
                to="/account"
                className="hidden rounded-full ring-2 ring-transparent transition hover:ring-brand-400 lg:block"
                aria-label="Your account"
              >
                <Avatar src={user?.profilePicture} name={user?.fullName} size={36} />
              </Link>
            </>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </Button>
              <Button to="/register" size="sm">
                Get started
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-full p-2.5 text-fg-muted transition hover:bg-white/[0.06] hover:text-fg lg:hidden"
            aria-label="Open menu"
          >
            <FiMenu className="h-5 w-5" />
          </button>
        </div>
      </Container>
    </header>
  );
}

function MobileMenu({ open, onClose }) {
  const { isSignedIn, user, isOwner, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    clearServerPushSubscription()
      .catch(() => {})
      .finally(() => {
        signOut();
        onClose();
        navigate('/');
      });
  };

  const itemClass = ({ isActive }) =>
    cx(
      'flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors',
      isActive ? 'bg-brand-500/15 text-fg' : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg'
    );

  return (
    <Sheet open={open} onClose={onClose} label="Menu">
      <div className="flex h-16 items-center justify-between border-b border-line px-5">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2.5 text-fg-muted hover:bg-white/[0.06] hover:text-fg"
          aria-label="Close menu"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Mobile">
        {isSignedIn ? (
          <NavLink to="/account" className={itemClass} onClick={onClose}>
            <Avatar src={user?.profilePicture} name={user?.fullName} size={28} />
            <span className="truncate">{user?.fullName || 'My account'}</span>
          </NavLink>
        ) : null}
        {[...PRIMARY_LINKS, ABOUT_LINK].map((link) => (
          <NavLink key={link.to} to={link.to} className={itemClass} onClick={onClose}>
            <link.icon className="h-5 w-5" />
            {link.label}
          </NavLink>
        ))}
        {isOwner ? (
          <NavLink to="/creator/dashboard" className={itemClass} onClick={onClose}>
            <FiEdit3 className="h-5 w-5" />
            Studio
          </NavLink>
        ) : null}
      </nav>

      <div className="space-y-3 border-t border-line p-4">
        {isSignedIn ? (
          <Button variant="secondary" className="w-full" onClick={handleSignOut}>
            <FiLogOut className="h-4 w-4" />
            Log out
          </Button>
        ) : (
          <>
            <Button to="/register" className="w-full" onClick={onClose}>
              Get started
            </Button>
            <Button to="/login" variant="secondary" className="w-full" onClick={onClose}>
              Log in
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** Thumb-reach navigation for signed-in members on phones. */
function BottomTabs() {
  const tabs = [
    { to: '/account', label: 'Home', icon: FiHome },
    ...FEATURE_LIST.slice(0, 3).map((f) => ({ to: f.path, label: f.label, icon: f.icon })),
    { to: '/pricing', label: 'Plans', icon: FiTag },
  ];
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Quick navigation"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                cx(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-brand-400' : 'text-fg-subtle hover:text-fg'
                )
              }
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-ink-900">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-fg-muted">
            Forex education, live signals and mentorship from Maxwell Donkor. Learn the method, follow the trades,
            and grow with a community of traders.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-300 hover:underline"
            >
              <FaTelegramPlane className="h-4 w-4" />
              Join us on Telegram
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-up hover:underline"
            >
              <FaWhatsapp className="h-4 w-4" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-fg">Explore</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {PRIMARY_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-fg-muted transition hover:text-fg">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-fg">Account</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link to="/account" className="text-fg-muted transition hover:text-fg">
                My account
              </Link>
            </li>
            <li>
              <Link to="/login" className="text-fg-muted transition hover:text-fg">
                Log in
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-fg-muted transition hover:text-fg">
                About
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} QuickX. All rights reserved.</p>
          <p>Trading carries risk. Signals and lessons are education, not financial advice.</p>
        </Container>
      </div>
    </footer>
  );
}

/**
 * Shell for every member-facing page.
 * Route `handle` options:
 *   legacy: true: page from the older design; gets extra styles so its forms and tables match
 *   bare: true: hide the footer and bottom tabs (focused screens such as the lesson player)
 */
export default function SiteLayout() {
  const { pathname, search, hash } = useLocation();
  const matches = useMatches();
  const handle = Object.assign({}, ...matches.map((m) => m.handle || {}));
  const { isSignedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, search, hash]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Re-register this device for push notifications after sign-in.
  useEffect(() => {
    if (!isSignedIn) return undefined;
    const t = window.setTimeout(() => ensurePushSubscription(), 800);
    return () => window.clearTimeout(t);
  }, [isSignedIn]);

  const showTabs = isSignedIn && !handle.bare;

  return (
    <>
      <Helmet>
        <title>QuickX | Forex courses, live signals and mentorship</title>
        <meta
          name="description"
          content="Learn forex with Maxwell Donkor: video courses, live trading signals, a members community and 1-on-1 mentorship."
        />
      </Helmet>
      <ScrollRestoration getKey={(location) => location.pathname} />
      <div className="flex min-h-dvh flex-col">
        <TopNav onOpenMenu={() => setMenuOpen(true)} />
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className={cx('flex-1', handle.legacy ? 'qx-legacy' : 'pt-16', showTabs && 'pb-20 lg:pb-0')}>
          <Suspense fallback={<PageLoader />}>
            <PageTransition key={pathname}>
              <Outlet />
            </PageTransition>
          </Suspense>
        </main>

        {!handle.bare ? <Footer /> : null}
        {showTabs ? <BottomTabs /> : null}
        <InstallAppBanner />
      </div>
      <Analytics />
    </>
  );
}

