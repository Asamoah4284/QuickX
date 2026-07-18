import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FiAlertTriangle,
  FiCheck,
  FiExternalLink,
  FiMessageSquare,
  FiSlash,
  FiUsers,
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return { Authorization: `Bearer ${token}` };
}

export default function CreatorCommunity() {
  const [tutorId, setTutorId] = useState('');
  const [tab, setTab] = useState('overview');
  const [subscribers, setSubscribers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [reports, setReports] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [settings, setSettings] = useState({ allowPeerMessaging: false, communityGuidelines: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setTutorId(user._id || user.id || '');
    } catch {
      setTutorId('');
    }
  }, []);

  const load = useCallback(async () => {
    if (!tutorId) return;
    setError('');
    try {
      const [subs, feed, qs, reps, blks, sett] = await Promise.all([
        axios.get(`${API_URL}/api/instructor/subscribers`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/community/${tutorId}/posts`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/community/${tutorId}/questions`, {
          headers: authHeaders(),
          params: { status: 'open' },
        }),
        axios.get(`${API_URL}/api/community/${tutorId}/reports`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/community/${tutorId}/blocks`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/community/${tutorId}/settings`, { headers: authHeaders() }),
      ]);
      setSubscribers(subs.data.subscribers || []);
      setPosts(feed.data.posts || []);
      setQuestions(qs.data.questions || []);
      setReports(reps.data.reports || []);
      setBlocks(blks.data.blocks || []);
      setSettings(sett.data || settings);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  }, [tutorId]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'posts', label: 'Posts' },
    { id: 'qa', label: 'Unanswered Q&A' },
    { id: 'reports', label: 'Reports' },
    { id: 'blocks', label: 'Blocked' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Community
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your subscriber feed, Q&amp;A, moderation, and community settings.
            </p>
          </div>
          {tutorId ? (
            <Link
              to={`/instructors/${tutorId}/community`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B5EF5] px-4 py-2 text-sm font-semibold text-white"
            >
              Open community <FiExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === t.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {tab === 'overview' ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={FiUsers} label="Active subscribers" value={subscribers.length} />
          <StatCard icon={FiMessageSquare} label="Recent posts" value={posts.length} />
          <StatCard icon={FiAlertTriangle} label="Open questions" value={questions.length} />
        </div>
      ) : null}

      {tab === 'posts' ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          {posts.map((p) => (
            <div key={p._id} className="flex items-start justify-between gap-3 border-b border-slate-100 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {p.authorId?.fullName}{' '}
                  {p.type === 'announcement' ? (
                    <span className="text-xs text-amber-700">· announcement</span>
                  ) : null}
                  {p.pinned ? <span className="text-xs text-slate-400"> · pinned</span> : null}
                  {p.featured ? <span className="text-xs text-amber-600"> · featured</span> : null}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.body}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-blue-600"
                  onClick={async () => {
                    await axios.patch(
                      `${API_URL}/api/community/${tutorId}/posts/${p._id}`,
                      { pinned: !p.pinned },
                      { headers: authHeaders() }
                    );
                    load();
                  }}
                >
                  {p.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-amber-600"
                  onClick={async () => {
                    await axios.patch(
                      `${API_URL}/api/community/${tutorId}/posts/${p._id}`,
                      { featured: !p.featured },
                      { headers: authHeaders() }
                    );
                    load();
                  }}
                >
                  {p.featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-600"
                  onClick={async () => {
                    if (!window.confirm('Delete post?')) return;
                    await axios.delete(`${API_URL}/api/community/${tutorId}/posts/${p._id}`, {
                      headers: authHeaders(),
                    });
                    load();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!posts.length ? <p className="text-sm text-slate-500">No posts yet.</p> : null}
        </div>
      ) : null}

      {tab === 'qa' ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          {questions.map((q) => (
            <div key={q._id} className="border-b border-slate-100 py-3">
              <p className="font-semibold">{q.title}</p>
              <p className="mt-1 text-sm text-slate-600">{q.body}</p>
              <div className="mt-2 flex gap-3 text-xs">
                <Link
                  to={`/instructors/${tutorId}/community?tab=qa`}
                  className="font-semibold text-blue-600"
                >
                  Answer in community
                </Link>
                <button
                  type="button"
                  className="font-semibold text-slate-500"
                  onClick={async () => {
                    await axios.patch(
                      `${API_URL}/api/community/${tutorId}/questions/${q._id}`,
                      { pinned: true },
                      { headers: authHeaders() }
                    );
                    setMessage('Question pinned');
                    load();
                  }}
                >
                  Pin
                </button>
              </div>
            </div>
          ))}
          {!questions.length ? (
            <p className="inline-flex items-center gap-2 text-sm text-emerald-700">
              <FiCheck /> No unanswered questions
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === 'reports' ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          {reports.map((r) => (
            <div key={r._id} className="flex items-start justify-between gap-3 border-b py-3">
              <div>
                <p className="text-sm font-semibold">
                  {r.entityType} · by {r.reporterId?.fullName}
                </p>
                <p className="text-sm text-slate-600">{r.reason}</p>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <button
                  type="button"
                  className="text-emerald-600"
                  onClick={async () => {
                    await axios.patch(
                      `${API_URL}/api/community/${tutorId}/reports/${r._id}`,
                      { status: 'resolved' },
                      { headers: authHeaders() }
                    );
                    load();
                  }}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="text-slate-500"
                  onClick={async () => {
                    await axios.patch(
                      `${API_URL}/api/community/${tutorId}/reports/${r._id}`,
                      { status: 'dismissed' },
                      { headers: authHeaders() }
                    );
                    load();
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
          {!reports.length ? <p className="text-sm text-slate-500">No open reports.</p> : null}
        </div>
      ) : null}

      {tab === 'blocks' ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const action = String(fd.get('action') || 'block');
              await axios.post(
                `${API_URL}/api/community/${tutorId}/blocks`,
                {
                  userId: fd.get('userId'),
                  reason: fd.get('reason'),
                  blocked: action === 'block',
                  muted: action === 'mute',
                },
                { headers: authHeaders() }
              );
              e.currentTarget.reset();
              setMessage(action === 'mute' ? 'User muted' : 'User blocked');
              load();
            }}
          >
            <input
              name="userId"
              required
              placeholder="User ID"
              className="rounded-xl border px-3 py-2 text-sm"
            />
            <input
              name="reason"
              placeholder="Reason"
              className="rounded-xl border px-3 py-2 text-sm"
            />
            <select name="action" className="rounded-xl border px-3 py-2 text-sm" defaultValue="block">
              <option value="block">Block (no access)</option>
              <option value="mute">Mute (can view, can&apos;t post)</option>
            </select>
            <button type="submit" className="rounded-xl bg-rose-600 px-3 py-2 text-sm text-white">
              <FiSlash className="inline" /> Apply
            </button>
          </form>
          {blocks.map((b) => (
            <div key={b._id} className="flex items-center justify-between border-b py-2 text-sm">
              <span>
                {b.userId?.fullName || b.userId}
                {b.blocked ? ' · blocked' : ''}
                {b.muted ? ' · muted' : ''}
                {b.reason ? ` — ${b.reason}` : ''}
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600"
                onClick={async () => {
                  await axios.delete(
                    `${API_URL}/api/community/${tutorId}/blocks/${b.userId?._id || b.userId}`,
                    { headers: authHeaders() }
                  );
                  load();
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(settings.allowPeerMessaging)}
              onChange={(e) =>
                setSettings((s) => ({ ...s, allowPeerMessaging: e.target.checked }))
              }
            />
            Allow students to message each other
          </label>
          <div>
            <label className="text-sm font-medium">Community guidelines</label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              rows={5}
              value={settings.communityGuidelines || ''}
              onChange={(e) =>
                setSettings((s) => ({ ...s, communityGuidelines: e.target.value }))
              }
            />
          </div>
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={async () => {
              await axios.patch(
                `${API_URL}/api/community/${tutorId}/settings`,
                settings,
                { headers: authHeaders() }
              );
              setMessage('Settings saved');
            }}
          >
            Save settings
          </button>
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold">Subscribers</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {subscribers.map((s) => (
                <li key={s.id}>
                  {s.student?.fullName || 'Student'} · plan {s.planId} · ends{' '}
                  {s.endsAt ? new Date(s.endsAt).toLocaleDateString() : '—'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}
