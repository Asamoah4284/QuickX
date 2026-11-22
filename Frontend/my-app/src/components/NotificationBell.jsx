import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiBell, FiHeart, FiMessageCircle, FiAtSign, FiInbox } from 'react-icons/fi';
import {
  getNotificationPermission,
  isIosDevice,
  isStandaloneDisplay,
  pushSupported,
  subscribeUserToPush,
} from '../utils/webPush';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function notificationIcon(type = '', title = '') {
  const key = `${type} ${title}`.toLowerCase();
  if (key.includes('like')) return FiHeart;
  if (key.includes('comment') || key.includes('reply')) return FiMessageCircle;
  if (key.includes('mention')) return FiAtSign;
  return FiBell;
}

function notificationAccent(type = '', title = '') {
  const key = `${type} ${title}`.toLowerCase();
  if (key.includes('like')) return 'bg-down/10 text-down';
  if (key.includes('comment') || key.includes('reply')) return 'bg-brand-500/10 text-brand-400';
  if (key.includes('mention')) return 'bg-brand-500/10 text-brand-300';
  return 'bg-ink-800 text-fg-muted';
}

function timeAgo(date) {
  if (!date) return '';
  const ms = Date.now() - new Date(date).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const ref = useRef(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 20 },
      });
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      /* ignore when logged out / offline */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setPermission(getNotificationPermission());
        load();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [load]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (!token) return null;

  const showPushCta =
    pushSupported() &&
    permission !== 'granted' &&
    permission !== 'unsupported';

  const enablePush = async () => {
    setPushBusy(true);
    setPushError('');
    try {
      await subscribeUserToPush();
      setPermission(getNotificationPermission());
    } catch (err) {
      setPushError(err?.message || 'Could not enable notifications');
      setPermission(getNotificationPermission());
    } finally {
      setPushBusy(false);
    }
  };

  const markAllRead = async () => {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    try {
      await axios.patch(
        `${API_URL}/api/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await load();
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = async (n) => {
    try {
      if (!n.readAt) {
        await axios.patch(
          `${API_URL}/api/notifications/${n._id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch {
      /* continue navigation */
    }
    setOpen(false);
    const target = n.url || (n.tutorId ? '/community' : '');
    if (target) {
      window.location.href = target;
    } else {
      load();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          load();
        }}
        className="relative rounded-xl p-2 text-current opacity-80 transition hover:bg-fg/5 hover:opacity-100"
      >
        <FiBell className="h-[18px] w-[18px]" />
        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-ink-850">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-1/2 top-[4.25rem] z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:w-[min(22rem,calc(100vw-1.5rem))] sm:translate-x-0">
          <div className="origin-top overflow-hidden rounded-2xl border border-line bg-ink-850 shadow-[0_16px_48px_rgba(15,23,42,0.14)] [animation:notifPanelIn_0.2s_ease-out] sm:origin-top-right">
          <style>{`
            @keyframes notifPanelIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-bold tracking-tight text-fg">Notifications</p>
              <p className="text-[11px] text-fg-subtle">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={markingAll}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-400 transition hover:bg-brand-600/8 disabled:opacity-50"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {showPushCta ? (
            <div className="border-b border-line bg-ink-900 px-4 py-3">
              <p className="text-xs font-semibold text-fg">Enable lock-screen notifications</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-subtle">
                The bell only shows inside the app. Turn this on to get phone alerts when QuickX is closed.
              </p>
              {isIosDevice() && !isStandaloneDisplay() ? (
                <p className="mt-2 text-[11px] leading-relaxed text-warn">
                  On iPhone: open QuickX from your <strong>Home Screen</strong> icon (not Safari), then tap Turn on.
                </p>
              ) : permission === 'denied' ? (
                <p className="mt-2 text-[11px] leading-relaxed text-down">
                  Notifications are blocked. Enable them in your phone Settings for QuickX / this browser.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={enablePush}
                  className="mt-2 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {pushBusy ? 'Enabling…' : 'Turn on notifications'}
                </button>
              )}
              {pushError ? <p className="mt-1.5 text-[11px] text-down">{pushError}</p> : null}
            </div>
          ) : null}

          <ul className="max-h-[22rem] overflow-y-auto">
            {items.map((n) => {
              const Icon = notificationIcon(n.type, n.title);
              const accent = notificationAccent(n.type, n.title);
              const unread = !n.readAt;
              return (
                <li key={n._id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    className={`flex w-full gap-3 px-4 py-3 text-left transition ${
                      unread ? 'bg-ink-900' : 'bg-ink-850'
                    } hover:bg-ink-900`}
                    onClick={() => openNotification(n)}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span
                          className={`text-[13px] font-semibold leading-snug text-fg ${
                            unread ? '' : 'font-medium'
                          }`}
                        >
                          {n.title || n.type}
                        </span>
                        {unread ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                        ) : null}
                      </span>
                      {n.body ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-fg-subtle">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="mt-1.5 block text-[11px] font-medium text-fg-subtle">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}

            {!items.length ? (
              <li className="flex flex-col items-center px-4 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-fg-muted">
                  <FiInbox className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-semibold text-fg">No notifications yet</p>
                <p className="mt-1 max-w-[14rem] text-xs leading-relaxed text-fg-subtle">
                  Likes, comments, and mentions will show up here.
                </p>
              </li>
            ) : null}
          </ul>

          <div className="border-t border-line bg-ink-900/80 px-4 py-2.5">
            <Link
              to="/membership"
              className="block text-center text-xs font-semibold text-fg-subtle transition hover:text-brand-400"
              onClick={() => setOpen(false)}
            >
              Go to dashboard
            </Link>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
