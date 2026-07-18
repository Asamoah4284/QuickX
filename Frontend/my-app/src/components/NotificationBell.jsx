import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiBell, FiHeart, FiMessageCircle, FiAtSign, FiInbox } from 'react-icons/fi';

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
  if (key.includes('like')) return 'bg-rose-50 text-rose-600';
  if (key.includes('comment') || key.includes('reply')) return 'bg-sky-50 text-[#1B5EF5]';
  if (key.includes('mention')) return 'bg-violet-50 text-violet-600';
  return 'bg-slate-100 text-slate-600';
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

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (!token) return null;

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
    if (n.tutorId) {
      window.location.href = `/instructors/${n.tutorId}/community`;
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
        className="relative rounded-xl p-2 text-current opacity-80 transition hover:bg-black/5 hover:opacity-100"
      >
        <FiBell className="h-[18px] w-[18px]" />
        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)] [animation:notifPanelIn_0.2s_ease-out]">
          <style>{`
            @keyframes notifPanelIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold tracking-tight text-[#0B1F44]">Notifications</p>
              <p className="text-[11px] text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={markingAll}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#1B5EF5] transition hover:bg-[#1B5EF5]/8 disabled:opacity-50"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <ul className="max-h-[22rem] overflow-y-auto">
            {items.map((n) => {
              const Icon = notificationIcon(n.type, n.title);
              const accent = notificationAccent(n.type, n.title);
              const unread = !n.readAt;
              return (
                <li key={n._id} className="border-b border-slate-50 last:border-0">
                  <button
                    type="button"
                    className={`flex w-full gap-3 px-4 py-3 text-left transition ${
                      unread ? 'bg-[#F5F8FF]' : 'bg-white'
                    } hover:bg-slate-50`}
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
                          className={`text-[13px] font-semibold leading-snug text-[#0B1F44] ${
                            unread ? '' : 'font-medium'
                          }`}
                        >
                          {n.title || n.type}
                        </span>
                        {unread ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1B5EF5]" />
                        ) : null}
                      </span>
                      {n.body ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-500">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="mt-1.5 block text-[11px] font-medium text-slate-400">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}

            {!items.length ? (
              <li className="flex flex-col items-center px-4 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <FiInbox className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-semibold text-[#0B1F44]">No notifications yet</p>
                <p className="mt-1 max-w-[14rem] text-xs leading-relaxed text-slate-400">
                  Likes, comments, and mentions will show up here.
                </p>
              </li>
            ) : null}
          </ul>

          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <Link
              to="/membership"
              className="block text-center text-xs font-semibold text-slate-500 transition hover:text-[#1B5EF5]"
              onClick={() => setOpen(false)}
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
