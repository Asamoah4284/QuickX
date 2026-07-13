import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiBell } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((o) => !o);
          load();
        }}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      >
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              className="text-xs font-semibold text-blue-600"
              onClick={async () => {
                await axios.patch(
                  `${API_URL}/api/notifications/read-all`,
                  {},
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                load();
              }}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <li key={n._id}>
                <button
                  type="button"
                  className={`w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${
                    !n.readAt ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={async () => {
                    await axios.patch(
                      `${API_URL}/api/notifications/${n._id}/read`,
                      {},
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (n.tutorId) {
                      window.location.href = `/instructors/${n.tutorId}/community`;
                    }
                    load();
                  }}
                >
                  <p className="font-medium text-slate-900">{n.title || n.type}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">{n.body}</p>
                </button>
              </li>
            ))}
            {!items.length ? (
              <li className="px-3 py-6 text-center text-xs text-slate-400">No notifications yet</li>
            ) : null}
          </ul>
          <div className="border-t px-3 py-2 text-center">
            <Link to="/membership" className="text-xs font-semibold text-slate-500" onClick={() => setOpen(false)}>
              Account
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
