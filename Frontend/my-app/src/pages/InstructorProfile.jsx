import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { publicAssetUrl } from '../utils/publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL;

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80';

const TYPE_LABEL = {
  forex: 'Forex',
  crypto: 'Crypto',
  webdev: 'Web dev',
};

function buildSubscriptionPlans(subscriptionPricing) {
  const month1 = Number(subscriptionPricing?.month1 ?? 49);
  const month2 = Number(subscriptionPricing?.month2 ?? 89);
  const year1 = Number(subscriptionPricing?.year1 ?? 399);
  return [
    {
      id: '1m',
      label: '1 mo',
      title: '1 month',
      price: Number.isFinite(month1) ? month1 : 49,
      compareAt: null,
      periodNote: 'Monthly',
      badge: null,
    },
    {
      id: '2m',
      label: '2 mo',
      title: '2 months',
      price: Number.isFinite(month2) ? month2 : 89,
      compareAt: null,
      periodNote: '2-month bundle',
      badge: null,
    },
    {
      id: '1y',
      label: '1 yr',
      title: '1 year',
      price: Number.isFinite(year1) ? year1 : 399,
      compareAt: null,
      periodNote: 'Annual',
      badge: 'Best value',
    },
  ];
}

const SUBSCRIPTION_BENEFITS = [
  {
    label: 'Easy access to all current and future uploaded courses',
    icon: 'star-card',
  },
  {
    label: 'Download course and watch offline',
    icon: 'download',
  },
  {
    label: 'Direct one on one with instructor',
    icon: 'bolt',
  },
  {
    label: 'Join in structured fun and community for updates and signals',
    icon: 'chat',
  },
];

function normalizeOutcome(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  return s.replace(/\s+/g, ' ');
}

function collectLearningOutcomes(courses, limit = 12) {
  const seen = new Set();
  const out = [];
  (courses || []).forEach((c) => {
    const items = Array.isArray(c?.learningOutcomes) ? c.learningOutcomes : [];
    items.forEach((it) => {
      const n = normalizeOutcome(it);
      if (!n) return;
      const key = n.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(n);
    });
  });
  return out.slice(0, Math.max(0, limit));
}

function subscriptionSavingsPercent(price, compareAt) {
  const p = Number(price) || 0;
  const c = Number(compareAt) || 0;
  if (c <= p || c <= 0) return 0;
  return Math.round((1 - p / c) * 100);
}

function formatGhs(amount) {
  const n = Number(amount) || 0;
  return `GH₵${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function SubscriptionBenefitIcon({ name }) {
  const cls = 'h-[18px] w-[18px] text-zinc-800';
  switch (name) {
    case 'star-card':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586 4.586a2 2 0 002.828 0L16 16m-2-2l1.586-1.586a2 2 0 000-2.828l-6.364-6.364a2 2 0 00-2.828 0L4.586 8.586a2 2 0 000 2.828L8 14" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4l1.5 3 3.5.5-2.5 2.5.5 3.5L12 12l-3 2.5.5-3.5L7 8l3.5-.5L12 4z" />
        </svg>
      );
    case 'home-star':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          <path
            fill="currentColor"
            stroke="none"
            d="M12 7.2l.85 1.72L14.8 9.5l-1.4 1.36.33 1.97L12 12.35l-1.73.48.33-1.97-1.4-1.36 1.95-.58L12 7.2z"
          />
        </svg>
      );
    case 'note':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'bolt':
      return (
        <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      );
    case 'download':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      );
    case 'globe':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
          <path
            fill="currentColor"
            stroke="none"
            d="M12 8.5l.65 1.35 1.45.2-1.05 1.02.25 1.45L12 11.9l-1.3.67.25-1.45-1.05-1.02 1.45-.2L12 8.5z"
          />
        </svg>
      );
    case 'chat':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
  }
}

/** TikTok profile grid: 3 columns, 1px gutters; full width on mobile, capped on large screens */
const TIKTOK_PROFILE_GRID =
  'grid w-full max-w-none lg:max-w-2xl grid-cols-3 gap-px bg-zinc-300/90 dark:bg-zinc-700/80';

/** Offsets parent `px-4 sm:px-6 lg:px-10` so preview strip is edge-to-edge on the screen */
const PREVIEW_STRIP_BLEED =
  '-mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-10 lg:w-[calc(100%+5rem)]';

/** Preview tiles: tall phone on small screens; shorter + capped on desktop */
const PREVIEW_TILE_ASPECT =
  'aspect-[9/16] lg:aspect-[4/5] xl:aspect-square';

function formatCompact(n) {
  const x = Number(n) || 0;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(1)}K`;
  return x.toLocaleString('en-US');
}

function slugHandle(fullName, id) {
  const base = String(fullName || 'creator')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
  const suffix = String(id || '').slice(-4);
  return (base || 'creator') + suffix;
}

function thumbUrl(thumbnail) {
  if (!thumbnail) return FALLBACK_THUMB;
  const raw = thumbnail.startsWith('http') ? thumbnail : `${API_URL}${thumbnail}`;
  return publicAssetUrl(raw) || FALLBACK_THUMB;
}

/** True if path looks like a video file (not a poster image). */
function looksLikeVideoAsset(url) {
  if (!url || typeof url !== 'string') return false;
  const path = url.split('?')[0].toLowerCase();
  return /\.(mp4|webm|ogg|mov|m4v|mkv|avi)$/i.test(path);
}

/**
 * Grid tiles must use a still image only — never the promo trailer URL.
 * Some courses store a video path in `thumbnail` or duplicate `promoVideo`; those would load heavy video in <img>.
 */
function courseGridPosterUrl(course) {
  if (!course) return FALLBACK_THUMB;
  const thumb = course.thumbnail;
  const promo = course.promoVideo;
  if (thumb && promo && String(thumb).trim() === String(promo).trim()) {
    return FALLBACK_THUMB;
  }
  if (thumb && looksLikeVideoAsset(thumb)) {
    return FALLBACK_THUMB;
  }
  return thumbUrl(thumb);
}

/** Resolved playable URL for a preview lesson (matches course detail preview logic). */
function resolvePreviewLessonVideoSrc(raw) {
  if (!raw || !String(raw).trim()) return null;
  const v = String(raw).trim();
  if (v.startsWith('http')) return publicAssetUrl(v) || v;
  const path = v.startsWith('/') ? v : `/${v}`;
  const full = `${API_URL}${path}`;
  return publicAssetUrl(full) || full;
}

/** Desktop showcase for a single free-preview lesson — opens video when available, else course page. */
function SinglePreviewLessonDesktopShowcase({ preview, onOpenPreview }) {
  const thumb = courseGridPosterUrl({
    thumbnail: preview.courseThumbnail,
    promoVideo: preview.coursePromoVideo,
  });
  const views = Number(preview.totalStudents) || 0;
  const typeLabel = TYPE_LABEL[preview.courseType];
  const videoSrc = resolvePreviewLessonVideoSrc(preview.previewVideoUrl);
  const showcaseClass =
    'group relative hidden overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-zinc-200/80 transition hover:ring-blue-300/50 lg:grid lg:min-h-[220px] lg:grid-cols-[1.15fr_1fr] lg:gap-0 lg:shadow-lg lg:shadow-zinc-900/5';

  const inner = (
    <>
      <div className="relative aspect-[16/10] max-h-[280px] overflow-hidden lg:aspect-auto lg:max-h-none lg:min-h-[220px]">
        <img
          src={thumb}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_THUMB;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/40" />
        <span className="absolute left-3 top-3 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Preview
        </span>
      </div>
      <div className="flex flex-col justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 lg:min-h-[220px] lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/90">Free preview lesson</p>
        <h3 className="mt-2 text-xl font-bold leading-tight tracking-tight text-white lg:text-2xl">
          {preview.lessonTitle}
        </h3>
        <p className="mt-2 text-sm font-medium text-zinc-400">{preview.courseTitle}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <svg className="h-4 w-4 text-white/90" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
            {formatCompact(views)} learners
          </span>
          {typeLabel ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">{typeLabel}</span>
          ) : null}
        </div>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition group-hover:text-white">
          {videoSrc && onOpenPreview ? 'Tap to watch preview' : 'Watch on course page'}
          <span aria-hidden className="transition group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </>
  );

  if (videoSrc && typeof onOpenPreview === 'function') {
    return (
      <button
        type="button"
        className={`${showcaseClass} w-full cursor-pointer border-0 p-0 text-left`}
        onClick={() =>
          onOpenPreview({
            src: videoSrc,
            title: preview.lessonTitle || 'Preview',
            courseTitle: preview.courseTitle || '',
            courseId: preview.courseId,
          })
        }
      >
        {inner}
      </button>
    );
  }

  return (
    <Link to={`/courses/${preview.courseId}`} className={showcaseClass}>
      {inner}
    </Link>
  );
}

/** Wide desktop preview when the creator only has one video — avoids a tiny tile in empty space */
function SingleCourseDesktopShowcase({ course }) {
  const thumb = courseGridPosterUrl(course);
  const views = Number(course.totalStudents) || 0;
  const typeLabel = TYPE_LABEL[course.courseType];

  return (
    <Link
      to={`/courses/${course._id}`}
      className="group relative hidden overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-zinc-200/80 transition hover:ring-blue-300/50 lg:grid lg:min-h-[220px] lg:grid-cols-[1.15fr_1fr] lg:gap-0 lg:shadow-lg lg:shadow-zinc-900/5"
    >
      <div className="relative aspect-[16/10] max-h-[280px] overflow-hidden lg:aspect-auto lg:max-h-none lg:min-h-[220px]">
        <img
          src={thumb}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_THUMB;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/40" />
        <span className="absolute left-3 top-3 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Pinned
        </span>
      </div>
      <div className="flex flex-col justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 lg:min-h-[220px] lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/90">Featured course</p>
        <h3 className="mt-2 text-xl font-bold leading-tight tracking-tight text-white lg:text-2xl">
          {course.title}
        </h3>
        {(course.shortDescription || course.subtitle) && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-400">
            {course.shortDescription || course.subtitle}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <svg className="h-4 w-4 text-white/90" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
            {formatCompact(views)} learners
          </span>
          {typeLabel ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">{typeLabel}</span>
          ) : null}
        </div>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition group-hover:text-white">
          View course
          <span aria-hidden className="transition group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

/** One tile per free-preview lesson (curriculum), not per course */
function PreviewLessonTile({ preview, onOpenPreview }) {
  const thumb = courseGridPosterUrl({
    thumbnail: preview.courseThumbnail,
    promoVideo: preview.coursePromoVideo,
  });
  const views = Number(preview.totalStudents) || 0;
  const caption = (preview.lessonTitle || 'Lesson').trim();
  const videoSrc = resolvePreviewLessonVideoSrc(preview.previewVideoUrl);
  const tileClass = `group relative block w-full min-w-0 overflow-hidden bg-zinc-900 ${PREVIEW_TILE_ASPECT}`;

  const tileBody = (
    <>
      <img
        src={thumb}
        alt=""
        className="h-full w-full object-cover transition duration-300 group-active:scale-[0.98] sm:group-hover:scale-[1.03]"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_THUMB;
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/65" />
      <span className="absolute left-1 top-1 z-10 rounded-[3px] bg-blue-600 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-sm">
        Preview
      </span>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pb-1 pt-10">
        <p className="mb-0.5 line-clamp-1 text-left text-[10px] font-medium leading-tight text-white/80 sm:text-[11px]">
          {preview.courseTitle}
        </p>
        <p className="mb-1 line-clamp-2 text-left text-[11px] font-extrabold leading-snug tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-xs">
          {caption}
        </p>
        <div className="flex items-center gap-1 text-white">
          <svg
            className="h-3.5 w-3.5 shrink-0 drop-shadow-md"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-[11px] font-semibold tabular-nums tracking-tight drop-shadow-md sm:text-xs">
            {formatCompact(views)}
          </span>
        </div>
      </div>
    </>
  );

  if (videoSrc && typeof onOpenPreview === 'function') {
    return (
      <button
        type="button"
        className={`${tileClass} cursor-pointer border-0 p-0`}
        onClick={() =>
          onOpenPreview({
            src: videoSrc,
            title: caption,
            courseTitle: preview.courseTitle || '',
            courseId: preview.courseId,
          })
        }
        aria-label={`Play preview: ${caption}`}
      >
        {tileBody}
      </button>
    );
  }

  return (
    <Link to={`/courses/${preview.courseId}`} className={tileClass}>
      {tileBody}
    </Link>
  );
}

/** Single cell — TikTok profile grid: 9:16, pinned tag, caption, play + views bottom-left */
function TikTokVideoTile({ course, pinned }) {
  const thumb = courseGridPosterUrl(course);
  const views = Number(course.totalStudents) || 0;
  const caption = (course.title || 'Course').trim();

  return (
    <Link
      to={`/courses/${course._id}`}
      className={`group relative block w-full min-w-0 overflow-hidden bg-zinc-900 ${PREVIEW_TILE_ASPECT}`}
    >
      <img
        src={thumb}
        alt=""
        className="h-full w-full object-cover transition duration-300 group-active:scale-[0.98] sm:group-hover:scale-[1.03]"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_THUMB;
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/65" />

      {pinned ? (
        <span className="absolute left-1 top-1 z-10 rounded-[3px] bg-blue-600 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-sm">
          Pinned
        </span>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pb-1 pt-10">
        <p className="mb-1 line-clamp-2 text-left text-[11px] font-extrabold leading-snug tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-xs">
          {caption}
        </p>
        <div className="flex items-center gap-1 text-white">
          <svg
            className="h-3.5 w-3.5 shrink-0 drop-shadow-md"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-[11px] font-semibold tabular-nums tracking-tight drop-shadow-md sm:text-xs">
            {formatCompact(views)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function AvatarRing({ avatarSrc, displayName, size = 'lg' }) {
  const sizes =
    size === 'xl'
      ? 'h-36 w-36 sm:h-40 sm:w-40'
      : 'h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36';
  return (
    <div
      className="rounded-full p-[3px] shadow-lg shadow-blue-500/20"
      style={{
        background: 'linear-gradient(135deg, #38bdf8, #3b82f6, #1d4ed8)',
      }}
    >
      <div className="rounded-full bg-white p-[2px] shadow-inner">
        {avatarSrc ? (
          <img src={avatarSrc} alt="" className={`${sizes} rounded-full object-cover`} />
        ) : (
          <div
            className={`flex ${sizes} items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-sky-100 text-3xl font-bold text-blue-800`}
          >
            {displayName.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Public instructor profile — TikTok-style preview grid and creator header.
 */
export default function InstructorProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [subscriptionDrawerOpen, setSubscriptionDrawerOpen] = useState(false);
  const [selectedSubscriptionPlanId, setSelectedSubscriptionPlanId] = useState('1m');
  const [profileVideoPreview, setProfileVideoPreview] = useState(null);
  const [videoDropdownOpen, setVideoDropdownOpen] = useState(false);
  const [videoSidebarOpen, setVideoSidebarOpen] = useState(false);
  const [videoSidebarRender, setVideoSidebarRender] = useState(false);
  const [videoSidebarEntered, setVideoSidebarEntered] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  );

  useEffect(() => {
    if (subscriptionDrawerOpen) setSelectedSubscriptionPlanId('1m');
  }, [subscriptionDrawerOpen]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    axios
      .get(`${API_URL}/api/users/public/${userId}/instructor`)
      .then(({ data: payload }) => {
        if (!cancelled) setData(payload);
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.message || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!subscriptionDrawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setSubscriptionDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [subscriptionDrawerOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!videoSidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setVideoSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [videoSidebarOpen]);

  useEffect(() => {
    if (videoSidebarOpen) return;
    if (!videoSidebarRender) return;
    setVideoSidebarEntered(false);
    const t = setTimeout(() => setVideoSidebarRender(false), 260);
    return () => clearTimeout(t);
  }, [videoSidebarOpen, videoSidebarRender]);

  useEffect(() => {
    if (!profileVideoPreview) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setProfileVideoPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [profileVideoPreview]);

  const goToSubscriptionCheckout = useCallback(
    (plan) => {
      if (!plan?.id) return;
      const token = localStorage.getItem('authToken');
      const from = `/instructors/${userId}`;
      if (!token) {
        navigate('/login', { state: { from } });
        return;
      }
      const u = data?.user;
      const display = u?.fullName || 'Instructor';
      let image = null;
      if (u) {
        const a = u.avatar || u.profilePicture;
        if (a) {
          const raw = a.startsWith('http') ? a : `${API_URL}${a}`;
          image = publicAssetUrl(raw) || raw;
        }
      }
      navigate('/checkout', {
        state: {
          item: {
            type: 'creator_subscription',
            id: userId,
            instructorId: userId,
            planId: plan.id,
            title: `Subscribe to ${display}`,
            description: `${plan.title} — ${plan.periodNote}`,
            price: plan.price,
            instructorName: display,
            ...(image ? { image, thumbnail: image } : {}),
          },
          returnPath: from,
          returnTabState: null,
        },
      });
    },
    [navigate, userId, data]
  );

  const handleChooseSubscriptionPlan = useCallback(
    (planId) => {
      const plans = buildSubscriptionPlans(data?.tutorProfile?.subscriptionPricing);
      const plan = plans.find((p) => p.id === planId) ?? plans[0];
      setSubscriptionDrawerOpen(false);
      goToSubscriptionCheckout(plan);
    },
    [data?.tutorProfile?.subscriptionPricing, goToSubscriptionCheckout]
  );

  const openProfileVideoPreview = useCallback((payload) => {
    setProfileVideoPreview(payload);
  }, []);

  const filteredCourses = useMemo(() => {
    if (!data?.courses) return [];
    return data.courses;
  }, [data]);

  const learningOutcomes = useMemo(() => collectLearningOutcomes(data?.courses, 12), [data?.courses]);

  /** When the API returns preview lessons, grid = one tile per curriculum preview (not per course). */
  const filteredPreviewLessons = useMemo(() => {
    if (!data?.previewLessons?.length) return [];
    return data.previewLessons;
  }, [data]);

  const usePreviewLessonGrid = Boolean(data?.previewLessons?.length);

  const videoDropdownItems = useMemo(() => {
    if (Array.isArray(data?.videoContent) && data.videoContent.length > 0) {
      return data.videoContent.map((v) => ({
        key: v.key,
        title: v.lessonTitle || 'Lesson',
        subtitle: v.courseTitle || '',
        href: v.courseId ? `/school/course/${v.courseId}` : null,
        isLocked: Boolean(v.isLocked),
        isPreview: Boolean(v.isPreview),
        duration: v.duration || '',
      }));
    }
    if (usePreviewLessonGrid) {
      return (filteredPreviewLessons || []).map((p) => ({
        key: p.key,
        title: p.lessonTitle || 'Preview lesson',
        subtitle: p.courseTitle || '',
        href: p.courseId ? `/school/course/${p.courseId}` : null,
        isLocked: false,
        isPreview: true,
        duration: '',
      }));
    }
    return (filteredCourses || []).map((c) => ({
      key: c._id,
      title: c.title || 'Course',
      subtitle: c.courseType ? TYPE_LABEL[c.courseType] || c.courseType : '',
      href: c._id ? `/school/course/${c._id}` : null,
      isLocked: false,
      isPreview: false,
      duration: '',
    }));
  }, [data?.videoContent, filteredCourses, filteredPreviewLessons, usePreviewLessonGrid]);

  /** Must run before any conditional return (Rules of Hooks). */
  const videoGrid = useMemo(() => {
    if (usePreviewLessonGrid) {
      if (filteredPreviewLessons.length === 0) return null;
      if (filteredPreviewLessons.length === 1) {
        const p = filteredPreviewLessons[0];
        return (
          <>
            <div className="flex justify-center px-2 lg:hidden">
              <div className="w-full max-w-[220px]">
                <PreviewLessonTile preview={p} onOpenPreview={openProfileVideoPreview} />
              </div>
            </div>
            <SinglePreviewLessonDesktopShowcase preview={p} onOpenPreview={openProfileVideoPreview} />
          </>
        );
      }
      return (
        <div className={TIKTOK_PROFILE_GRID}>
          {filteredPreviewLessons.map((p) => (
            <PreviewLessonTile key={p.key} preview={p} onOpenPreview={openProfileVideoPreview} />
          ))}
        </div>
      );
    }

    if (filteredCourses.length === 0) return null;
    if (filteredCourses.length === 1) {
      const c = filteredCourses[0];
      return (
        <>
          <div className="flex justify-center px-2 lg:hidden">
            <div className="w-full max-w-[220px]">
              <TikTokVideoTile course={c} pinned />
            </div>
          </div>
          <SingleCourseDesktopShowcase course={c} />
        </>
      );
    }
    return (
      <div className={TIKTOK_PROFILE_GRID}>
        {filteredCourses.map((c, index) => (
          <TikTokVideoTile key={c._id} course={c} pinned={index === 0} />
        ))}
      </div>
    );
  }, [usePreviewLessonGrid, filteredPreviewLessons, filteredCourses, openProfileVideoPreview]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: data?.user?.fullName || 'Instructor',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setToast('Link copied');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setToast('Link copied');
      } catch {
        /* ignore */
      }
    }
  }, [data?.user?.fullName]);

  const avatarSrc = useMemo(() => {
    if (!data?.user) return null;
    const a = data.user.avatar || data.user.profilePicture;
    if (!a) return null;
    const raw = a.startsWith('http') ? a : `${API_URL}${a}`;
    return publicAssetUrl(raw) || raw;
  }, [data]);

  const displayName = data?.user?.fullName || 'Instructor';
  const selectedSubscriptionPlan = useMemo(
    () => {
      const plans = buildSubscriptionPlans(data?.tutorProfile?.subscriptionPricing);
      return plans.find((p) => p.id === selectedSubscriptionPlanId) ?? plans[0];
    },
    [data?.tutorProfile?.subscriptionPricing, selectedSubscriptionPlanId]
  );
  const subscriptionCtaSavingsPct = subscriptionSavingsPercent(
    selectedSubscriptionPlan.price,
    selectedSubscriptionPlan.compareAt
  );
  const handle = data?.user ? `@${slugHandle(data.user.fullName, userId)}` : '';
  const headline =
    data?.tutorProfile?.headline || data?.user?.creatorHeadline || '';
  const bio = data?.tutorProfile?.bio || data?.user?.creatorBio || '';
  const website =
    data?.tutorProfile?.socialLinks?.website || data?.user?.socialLinks?.website || '';

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-10">
          <div className="h-12 max-w-md animate-pulse rounded-2xl bg-zinc-100" />
          <div className="mt-10 flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-12">
            <div className="h-40 w-40 animate-pulse rounded-full bg-zinc-200/80" />
            <div className="flex-1 space-y-4">
              <div className="h-10 w-2/3 animate-pulse rounded-lg bg-zinc-200/80" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200/80" />
              <div className="h-24 max-w-xl animate-pulse rounded-2xl bg-zinc-100" />
            </div>
          </div>
          <div className={`mt-12 ${PREVIEW_STRIP_BLEED}`}>
            <div className={TIKTOK_PROFILE_GRID}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`animate-pulse bg-zinc-200/80 ${PREVIEW_TILE_ASPECT}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-zinc-900">
        <p className="text-center text-red-600">{error || 'Could not load instructor.'}</p>
        <Link to="/courses" className="mt-4 font-semibold text-blue-600 hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  const stats = data.stats || { courses: 0, videos: 0, learners: 0, avgRating: 0 };

  const videoGridCount = usePreviewLessonGrid
    ? filteredPreviewLessons.length
    : filteredCourses.length;
  const videoGridEmpty = videoGridCount === 0;

  const statItems = [
    {
      label: 'Video',
      value:
        stats.videos != null
          ? formatCompact(stats.videos)
          : formatCompact(usePreviewLessonGrid ? filteredPreviewLessons.length : filteredCourses.length),
    },
    { label: 'Learners', value: formatCompact(stats.learners) },
    {
      label: 'Rating',
      value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—',
    },
    {
      label: 'Video content',
      value: '',
    },
  ];

  const actionButtons = (
    <div className="flex w-full flex-col items-center gap-2 sm:items-start lg:items-end">
      <button
        type="button"
        onClick={() => setSubscriptionDrawerOpen(true)}
        className="group relative inline-flex min-h-[3rem] min-w-[11rem] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-7 text-sm font-bold tracking-tight text-white shadow-[0_8px_30px_-6px_rgba(37,99,235,0.55)] ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(37,99,235,0.65)] hover:brightness-[1.03] active:translate-y-0 active:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <span
          className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition group-hover:opacity-100"
          aria-hidden
        />
        <span
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 shadow-inner ring-1 ring-white/30 backdrop-blur-[2px]"
          aria-hidden
        >
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </span>
        <span className="relative">Subscribe</span>
      </button>
      <button
        type="button"
        onClick={() => setSubscriptionDrawerOpen(true)}
        className="text-sm font-semibold text-blue-700 underline-offset-4 transition hover:text-blue-800 hover:underline"
      >
        Compare plans
      </button>
    </div>
  );

  const bioBlock = (
    <div className="mt-6 max-w-2xl">
      <p className="text-base font-semibold tracking-tight text-zinc-900">{headline}</p>
      {bio ? <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">{bio}</p> : null}
      {website ? (
        <a
          href={website.startsWith('http') ? website : `https://${website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-200/60 transition hover:bg-blue-100"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          {website.replace(/^https?:\/\//, '')}
        </a>
      ) : null}
    </div>
  );

  const librarySection = (
    <div className="px-0 pt-2 pb-0 sm:py-4">
      {/* Same horizontal strip as preview grid so “Videos” lines up with first tile (esp. desktop) */}
      <div className={PREVIEW_STRIP_BLEED}>
        {/* TikTok-style content tab: videos active */}
        <div className="flex border-b border-zinc-100">
          <div className="relative flex flex-1 justify-start pb-3 pl-2">
            <span className="inline-flex items-center gap-2 text-[15px] font-bold text-zinc-900">
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
              </svg>
              Videos
            </span>
            <span className="absolute bottom-0 left-2 h-[3px] w-14 rounded-full bg-zinc-900" />
          </div>
          <div className="hidden flex-1 justify-center pb-3 opacity-40 sm:flex sm:justify-start sm:px-6">
            <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-zinc-500">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
              </svg>
              Playlists
            </span>
          </div>
        </div>

        <div className="mt-3">
          {videoGridEmpty ? (
            <div className="py-16 text-center">
              <p className="text-sm text-zinc-500">Nothing here yet.</p>
              <Link to="/courses" className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline">
                Explore all courses
              </Link>
            </div>
          ) : (
            videoGrid
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-700 transition hover:bg-zinc-100"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-blue-600">QuickX</span>
            <p className="text-sm font-semibold text-zinc-900">Creator</p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-600 transition hover:bg-zinc-100"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-600 transition hover:bg-zinc-100"
              aria-label="Share profile"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-0 pt-6 sm:px-6 sm:pb-24 lg:px-10 lg:pb-16 lg:pt-10">
        <section className="px-0 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start lg:gap-10">
              <AvatarRing avatarSrc={avatarSrc} displayName={displayName} size="xl" />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">Instructor</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                  {displayName}
                </h1>
                <p className="mt-2 font-mono text-sm text-zinc-500">{handle}</p>
                <div className="relative mt-6 grid w-full max-w-md grid-cols-4 divide-x divide-zinc-200 sm:max-w-lg">
                  {statItems.map((s) => {
                    const isVideoContent = s.label === 'Video content';
                    return (
                      <div key={s.label} className="flex min-w-0 flex-col items-center px-2 py-1 text-center sm:px-4">
                        {/* Fixed-height top row so values + icon align across columns */}
                        <div className="flex min-h-[34px] items-center justify-center">
                          {isVideoContent ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (isMobile) {
                                  setVideoDropdownOpen(false);
                                  setVideoSidebarRender(true);
                                  setVideoSidebarEntered(false);
                                  window.requestAnimationFrame(() => setVideoSidebarEntered(true));
                                  setVideoSidebarOpen(true);
                                  return;
                                }
                                setVideoDropdownOpen((v) => !v);
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
                              aria-expanded={videoDropdownOpen}
                              aria-controls="video-dropdown-panel-stats"
                              aria-label="Toggle video content"
                            >
                              <svg
                                className={`h-4 w-4 transition-transform ${videoDropdownOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                aria-hidden
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-lg font-bold leading-none tabular-nums text-zinc-900 sm:text-xl">
                              {s.value}
                            </span>
                          )}
                        </div>
                        <span className="mt-1 text-[11px] font-medium leading-tight text-zinc-500 sm:text-xs">
                          {s.label}
                        </span>
                      </div>
                    );
                  })}

                  {videoDropdownOpen && !isMobile ? (
                    <div
                      id="video-dropdown-panel-stats"
                      className="absolute left-0 top-full z-20 mt-3 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                        <p className="text-sm font-semibold text-zinc-900">Video content</p>
                        <button
                          type="button"
                          onClick={() => setVideoDropdownOpen(false)}
                          className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                        >
                          Close
                        </button>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {videoDropdownItems.length === 0 ? (
                          <p className="px-4 py-4 text-sm text-zinc-500">No videos yet.</p>
                        ) : (
                          videoDropdownItems.slice(0, 50).map((item) => (
                            <div key={item.key} className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-zinc-900">{item.title}</p>
                                  {item.isLocked ? (
                                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                                      Locked
                                    </span>
                                  ) : item.isPreview ? (
                                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                      Preview
                                    </span>
                                  ) : null}
                                </div>
                                {item.subtitle ? (
                                  <p className="mt-0.5 truncate text-xs text-zinc-500">{item.subtitle}</p>
                                ) : null}
                                {item.duration ? (
                                  <p className="mt-0.5 text-[11px] text-zinc-400">{item.duration}</p>
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mt-6 hidden sm:block">{bioBlock}</div>
              </div>
            </div>
            <div className="w-full max-w-md lg:max-w-xs lg:shrink-0">{actionButtons}</div>
          </div>
          <div className="mt-6 sm:hidden">{bioBlock}</div>
        </section>

        <div className="mt-8 lg:mt-10">{librarySection}</div>
      </main>

      

      {subscriptionDrawerOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[1px]"
            aria-label="Close subscription options"
            onClick={() => setSubscriptionDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-drawer-title"
            className="relative z-[101] flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl sm:mb-0 sm:max-h-[min(92vh,720px)] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="subscription-drawer-title" className="sr-only">
              Subscription benefits — {displayName}
            </h2>
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <span className="h-1.5 w-12 rounded-full bg-zinc-200" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 pt-1">
              <button
                type="button"
                onClick={() => setSubscriptionDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100"
                aria-label="Back"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100"
                aria-label="Share profile"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-2 ring-white">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white">
                      {displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="min-w-0 text-[15px] font-bold leading-snug text-zinc-900">
                  {displayName}&apos;s community
                </p>
              </div>
              <p className="mt-5 text-base font-bold text-zinc-900">Subscription benefits</p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {buildSubscriptionPlans(data?.tutorProfile?.subscriptionPricing).map((plan) => {
                  const active = plan.id === selectedSubscriptionPlanId;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedSubscriptionPlanId(plan.id)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {plan.label}
                    </button>
                  );
                })}
              </div>
              <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50/90 to-indigo-100/80 p-4 shadow-inner ring-1 ring-blue-200/60">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.12]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 30%, #0ea5e9 0, transparent 45%),
                      radial-gradient(circle at 80% 70%, #2563eb 0, transparent 40%),
                      radial-gradient(circle at 50% 50%, #4f46e5 0, transparent 55%)`,
                  }}
                  aria-hidden
                />
                <div className="relative flex gap-3">
                  <div className="min-w-0 flex-1">
                    {selectedSubscriptionPlan.badge ? (
                      <span className="inline-flex rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                        {selectedSubscriptionPlan.badge}
                      </span>
                    ) : null}
                    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${selectedSubscriptionPlan.badge ? 'mt-3' : ''}`}>
                      <span className="text-3xl font-extrabold tabular-nums tracking-tight text-zinc-900">
                        {formatGhs(selectedSubscriptionPlan.price)}
                      </span>
                      {selectedSubscriptionPlan.compareAt != null ? (
                        <span className="text-base font-medium text-zinc-400 line-through">
                          {formatGhs(selectedSubscriptionPlan.compareAt)}
                        </span>
                      ) : null}
                      <span className="text-sm font-medium text-zinc-600">{selectedSubscriptionPlan.periodNote}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-600">
                      {SUBSCRIPTION_BENEFITS.length} perks · subscriber access
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-center" aria-hidden>
                    <div className="relative flex h-20 w-20 items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-[3px] border-blue-300/80" />
                      <div className="absolute inset-2 rounded-full border border-blue-200/60" />
                      <svg className="relative h-12 w-12 text-blue-600 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              {learningOutcomes.length > 0 ? (
                <>
                  <p className="mt-6 text-sm font-bold tracking-tight text-zinc-900">What you&apos;ll learn</p>
                  <ul className="mt-3 space-y-3 pb-1">
                    {learningOutcomes.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[15px] leading-snug text-zinc-800">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200/70">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="pt-0.5">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 border-t border-zinc-100" />
                </>
              ) : null}

              <ul className="mt-5 space-y-4 pb-2">
                {SUBSCRIPTION_BENEFITS.map((b) => (
                  <li key={b.label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                      <SubscriptionBenefitIcon name={b.icon} />
                    </span>
                    <span className="pt-1.5 text-[15px] leading-snug text-zinc-800">{b.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-zinc-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                onClick={() => handleChooseSubscriptionPlan(selectedSubscriptionPlanId)}
                className="w-full rounded-2xl bg-blue-600 py-4 text-center text-[17px] font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.99]"
              >
                {subscriptionCtaSavingsPct > 0
                  ? `Subscribe (${subscriptionCtaSavingsPct}% off)`
                  : 'Subscribe'}
              </button>
              <p className="mt-2 text-center text-[11px] text-zinc-500">Pricing in Ghana cedis (GHS).</p>
            </div>
          </div>
        </div>
      ) : null}

      {profileVideoPreview ? (
        <div
          className="fixed inset-0 z-[105] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-preview-video-title"
          onClick={() => setProfileVideoPreview(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-lg bg-black shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
              <div className="min-w-0">
                <p id="profile-preview-video-title" className="text-sm font-semibold text-zinc-900">
                  {profileVideoPreview.title}
                </p>
                {profileVideoPreview.courseTitle ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{profileVideoPreview.courseTitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setProfileVideoPreview(null)}
                className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <video
              key={profileVideoPreview.src}
              src={profileVideoPreview.src}
              controls
              playsInline
              className="aspect-video w-full bg-black object-contain"
            />
            <div className="border-t border-zinc-100 bg-white px-4 py-3 text-center">
              <button
                type="button"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                onClick={() => {
                  setProfileVideoPreview(null);
                  setSubscriptionDrawerOpen(true);
                }}
              >
                View full course
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {videoSidebarRender ? (
        <div className="fixed inset-0 z-[110] sm:hidden" role="presentation">
          <button
            type="button"
            className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200 ${
              videoSidebarEntered ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Close video content"
            onClick={() => setVideoSidebarOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Video content"
            className={`absolute inset-0 overflow-hidden bg-white shadow-2xl ring-1 ring-black/10 transition-transform duration-200 ease-out ${
              videoSidebarEntered ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900">Video content</p>
              </div>
              <button
                type="button"
                onClick={() => setVideoSidebarOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-[calc(100%-64px)] overflow-y-auto">
              {videoDropdownItems.length === 0 ? (
                <p className="px-4 py-6 text-sm text-zinc-500">No videos yet.</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {videoDropdownItems.map((item) => (
                    <div key={item.key} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-900">{item.title}</p>
                          {item.isLocked ? (
                            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                              Subscribe
                            </span>
                          ) : item.isPreview ? (
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                              Preview
                            </span>
                          ) : null}
                        </div>
                        {item.subtitle ? (
                          <p className="mt-0.5 truncate text-xs text-zinc-500">{item.subtitle}</p>
                        ) : null}
                        {item.duration ? <p className="mt-0.5 text-[11px] text-zinc-400">{item.duration}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
