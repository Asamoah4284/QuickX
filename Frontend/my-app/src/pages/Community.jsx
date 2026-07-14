import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiUsers } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Index of communities the current user can access (as subscriber or as tutor).
 */
export default function Community() {
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const list = [];
        const seen = new Set();

        if (user.role === 'tutor' && (user._id || user.id)) {
          const tid = String(user._id || user.id);
          seen.add(tid);
          list.push({
            tutorId: tid,
            fullName: user.fullName || 'My community',
            isTutor: true,
          });
        }

        const { data } = await axios.get(`${API_URL}/api/me/subscriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        for (const s of data.subscriptions || []) {
          const tid = String(s.tutor?.id || '');
          if (!tid || seen.has(tid)) continue;
          seen.add(tid);
          list.push({
            tutorId: tid,
            fullName: s.tutor?.fullName || 'Tutor',
            isTutor: false,
            endsAt: s.endsAt,
            accessType: s.accessType || 'subscription',
          });
        }

        if (!cancelled) setCommunities(list);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-28 sm:px-6 sm:pt-32">
      <h1 className="text-3xl font-black tracking-tight text-slate-950">Communities</h1>
      <p className="mt-2 text-slate-600">
        Private learning spaces for each tutor you subscribe to — feed, Q&amp;A, rooms, live sessions,
        and resources.
      </p>

      {loading ? <p className="mt-8 text-sm text-slate-500">Loading…</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <ul className="mt-8 space-y-3">
        {communities.map((c) => (
          <li key={c.tutorId}>
            <Link
              to={`/instructors/${c.tutorId}/community`}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <FiUsers />
              </span>
              <div>
                <p className="font-semibold text-slate-900">{c.fullName}</p>
                <p className="text-xs text-slate-500">
                  {c.isTutor
                    ? 'Your tutor community'
                    : c.endsAt
                      ? `Subscriber until ${new Date(c.endsAt).toLocaleDateString()}`
                      : 'Subscriber access'}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {!loading && !communities.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No communities yet. Subscribe to a tutor from their profile, then return here.
        </div>
      ) : null}
    </div>
  );
}
