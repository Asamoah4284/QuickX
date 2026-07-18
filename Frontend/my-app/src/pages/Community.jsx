import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiArrowUpRight } from 'react-icons/fi';
import { publicAssetUrl } from '../utils/publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function initialsFor(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  );
}

function resolveAvatar(src) {
  if (!src) return null;
  const raw = src.startsWith('http') ? src : `${API_URL}${src}`;
  return publicAssetUrl(raw) || raw;
}

function formatAccessLine(community) {
  if (community.isTutor) return 'You host this space';
  if (!community.endsAt) return 'Active membership';
  const end = new Date(community.endsAt);
  if (Number.isNaN(end.getTime())) return 'Active membership';
  const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
  if (days <= 7) {
    return days === 0 ? 'Ends today' : `Ends in ${days} day${days === 1 ? '' : 's'}`;
  }
  return `Through ${end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function CommunityRow({ community, index }) {
  const avatar = resolveAvatar(community.profilePicture);
  const access = formatAccessLine(community);
  const urgent =
    !community.isTutor &&
    community.endsAt &&
    Math.ceil((new Date(community.endsAt).getTime() - Date.now()) / 86400000) <= 7;

  return (
    <Link
      to={`/instructors/${community.tutorId}/community`}
      className="community-row group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-200/80 px-1 py-5 transition-colors duration-300 sm:gap-6 sm:px-3 sm:py-6"
      style={{ animationDelay: `${80 + index * 70}ms` }}
    >
      <div className="relative">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-14 w-14 rounded-[1.15rem] object-cover ring-1 ring-slate-900/5 transition duration-500 group-hover:scale-[1.03] sm:h-16 sm:w-16"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-[#0B1F44] text-sm font-semibold tracking-wide text-white ring-1 ring-slate-900/5 transition duration-500 group-hover:scale-[1.03] sm:h-16 sm:w-16 sm:text-base">
            {initialsFor(community.fullName)}
          </div>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-[3px] ring-[#F4F7FB] ${
            urgent ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          aria-hidden
        />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="community-display truncate text-lg font-semibold leading-none tracking-[-0.01em] text-slate-950 sm:text-xl">
            {community.fullName}
          </h2>
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
            {community.isTutor ? 'Host' : 'Member'}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{access}</p>
      </div>

      <div className="flex items-center gap-3 self-center">
        <span className="hidden text-sm font-medium text-slate-400 transition-colors duration-300 group-hover:text-[#1B5EF5] sm:inline">
          Enter
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition-all duration-300 group-hover:border-[#1B5EF5] group-hover:bg-[#1B5EF5] group-hover:text-white">
          <FiArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>

      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[#1B5EF5] transition-transform duration-500 group-hover:scale-x-100"
        aria-hidden
      />
    </Link>
  );
}

function RowSkeleton() {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-200/80 px-1 py-5 sm:gap-6 sm:px-3 sm:py-6">
      <div className="h-14 w-14 animate-pulse rounded-[1.15rem] bg-slate-200/80 sm:h-16 sm:w-16" />
      <div className="space-y-2.5">
        <div className="h-5 w-48 max-w-full animate-pulse rounded bg-slate-200/80" />
        <div className="h-3.5 w-28 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

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
            profilePicture: user.avatar || user.profilePicture || null,
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
            profilePicture: s.tutor?.profilePicture || null,
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

  const countLabel =
    communities.length === 1 ? '1 private space' : `${communities.length} private spaces`;

  return (
    <div className="community-page relative min-h-screen overflow-hidden">
      <style>{`
        .community-page {
          --community-display: "Montserrat", ui-sans-serif, system-ui, sans-serif;
          --community-blue: #1B5EF5;
          background:
            radial-gradient(1200px 600px at 12% -10%, rgba(27, 94, 245, 0.10), transparent 55%),
            radial-gradient(900px 500px at 92% 8%, rgba(14, 165, 233, 0.08), transparent 50%),
            linear-gradient(180deg, #F7F9FC 0%, #EEF3F9 48%, #F7F9FC 100%);
          color: #0f172a;
        }
        .community-page::before {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          opacity: 0.35;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E");
          mix-blend-mode: soft-light;
        }
        @keyframes communityFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .community-display {
          font-family: var(--community-display);
        }
        .community-hero-copy,
        .community-row,
        .community-empty {
          animation: communityFadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .community-hero-copy,
          .community-row,
          .community-empty {
            animation: none;
          }
        }
      `}</style>

      <div className="relative mx-auto max-w-4xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32 lg:pt-36">
        {/* Hero — one composition */}
        <header className="community-hero-copy max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1B5EF5]">
            QuickX Communities
          </p>
          <h1 className="community-display mt-4 text-[clamp(2.5rem,7vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-slate-950">
            Spaces that
            <br />
            stay with you.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
            Private rooms with the tutors you follow — conversation, live sessions, and resources in
            one place.
          </p>
          {!loading && communities.length > 0 ? (
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              {countLabel}
            </p>
          ) : null}
        </header>

        {error ? (
          <div className="mt-10 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* List surface */}
        <section className="mt-12 sm:mt-16">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/70 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Your access
              </p>
              <Link
                to="/courses"
                className="text-xs font-semibold text-[#1B5EF5] transition hover:text-[#1548c4]"
              >
                Find tutors
              </Link>
            </div>

            <div className="px-4 sm:px-3">
              {loading ? (
                <>
                  <RowSkeleton />
                  <RowSkeleton />
                </>
              ) : communities.length ? (
                communities.map((c, i) => (
                  <CommunityRow key={c.tutorId} community={c} index={i} />
                ))
              ) : (
                <div className="community-empty px-2 py-16 text-center sm:px-6">
                  <p className="community-display text-2xl font-semibold tracking-[-0.01em] text-slate-950 sm:text-3xl">
                    Nothing here yet.
                  </p>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
                    Subscribe to a tutor and their community unlocks here — feed, Q&amp;A, rooms, and
                    live sessions.
                  </p>
                  <Link
                    to="/courses"
                    className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#0B1F44] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1B5EF5]"
                  >
                    Browse courses
                    <FiArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
