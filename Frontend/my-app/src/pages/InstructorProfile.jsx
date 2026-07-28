import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { publicAssetUrl } from '../utils/publicAssetUrl';
import { savePendingCheckout } from '../utils/pendingCheckout';
import { buildSubscriptionPlans } from '../utils/creatorSubscriptionPlans';

const API_URL = import.meta.env.VITE_API_URL;

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80';

const TYPE_LABEL = {
  forex: 'Forex',
  crypto: 'Crypto',
  webdev: 'Web dev',
};

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

/** Compact fixed-size tiles; columns grow past 3 on wider screens; left-aligned */
const TIKTOK_PROFILE_GRID =
  'mr-auto grid w-full max-w-7xl grid-cols-3 gap-px bg-zinc-300/90 dark:bg-zinc-700/80 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';

/** Offsets parent `px-4 sm:px-6 lg:px-10` so preview strip is edge-to-edge on the screen */
const PREVIEW_STRIP_BLEED =
  '-mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-10 lg:w-[calc(100%+5rem)]';

/** Preview tiles: compact on mobile (was tall 9:16); square on large screens */
const PREVIEW_TILE_ASPECT = 'aspect-[4/5] sm:aspect-[3/4] lg:aspect-square';

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
 * Still image for poster/fallback only.
 * Some courses store a video path in `thumbnail` or duplicate `promoVideo`.
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
  if (v.startsWith('http') || v.startsWith('blob:')) return publicAssetUrl(v) || v;
  const path = v.startsWith('/') ? v : `/${v}`;
  const full = `${API_URL}${path}`;
  return publicAssetUrl(full) || full;
}

function resolveCourseThumbVideoSrc(course) {
  if (!course) return null;
  if (course.promoVideo) return resolvePreviewLessonVideoSrc(course.promoVideo);
  if (looksLikeVideoAsset(course.thumbnail)) return resolvePreviewLessonVideoSrc(course.thumbnail);
  return null;
}

function resolvePreviewTileVideoSrc(preview) {
  if (!preview) return null;
  return (
    resolvePreviewLessonVideoSrc(preview.previewVideoUrl) ||
    resolvePreviewLessonVideoSrc(preview.coursePromoVideo) ||
    null
  );
}

/** Prefer live video frame — never cover with marketing poster art. */
function MediaThumb({ videoSrc, posterSrc, className }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoSrc) return undefined;
    el.muted = true;
    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    tryPlay();
    el.addEventListener('loadeddata', tryPlay);
    el.addEventListener('canplay', tryPlay);
    return () => {
      el.removeEventListener('loadeddata', tryPlay);
      el.removeEventListener('canplay', tryPlay);
    };
  }, [videoSrc]);

  if (videoSrc) {
    const srcWithFrame = videoSrc.includes('#') ? videoSrc : `${videoSrc}#t=0.1`;
    return (
      <video
        ref={videoRef}
        key={videoSrc}
        src={srcWithFrame}
        muted
        playsInline
        loop
        autoPlay
        preload="metadata"
        className={className}
      />
    );
  }

  return (
    <img
      src={posterSrc || FALLBACK_THUMB}
      alt=""
      className={className}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = FALLBACK_THUMB;
      }}
    />
  );
}

/** Desktop showcase for a single free-preview lesson — opens video when available, else course page. */
function SinglePreviewLessonDesktopShowcase({ preview, onOpenPreview }) {
  const thumb = courseGridPosterUrl({
    thumbnail: preview.courseThumbnail,
    promoVideo: preview.coursePromoVideo,
  });
  const views = Number(preview.totalStudents) || 0;
  const typeLabel = TYPE_LABEL[preview.courseType];
  const videoSrc = resolvePreviewTileVideoSrc(preview);
  const showcaseClass =
    'group relative hidden overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-zinc-200/80 transition hover:ring-blue-300/50 lg:grid lg:min-h-[220px] lg:grid-cols-[1.15fr_1fr] lg:gap-0 lg:shadow-lg lg:shadow-zinc-900/5';

  const inner = (
    <>
      <div className="relative aspect-[16/10] max-h-[280px] overflow-hidden lg:aspect-auto lg:max-h-none lg:min-h-[220px]">
        <MediaThumb
          videoSrc={videoSrc}
          posterSrc={thumb}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
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

/** One tile per curriculum lesson — preview plays; locked shows a padlock; subscribers open the course */
function PreviewLessonTile({ preview, onOpenPreview, onLockedClick, subscriberAccess }) {
  const originallyLocked = Boolean(preview.isLocked) || preview.isPreview === false;
  const locked = originallyLocked && !subscriberAccess;
  const thumb = courseGridPosterUrl({
    thumbnail: preview.courseThumbnail,
    promoVideo: locked ? '' : preview.coursePromoVideo,
  });
  const views = Number(preview.totalStudents) || 0;
  const caption = (preview.lessonTitle || 'Lesson').trim();
  const videoSrc = locked ? null : resolvePreviewTileVideoSrc(preview);
  const tileClass = `group relative block w-full min-w-0 overflow-hidden bg-zinc-900 ${PREVIEW_TILE_ASPECT}`;

  const tileBody = (
    <>
      <MediaThumb
        videoSrc={subscriberAccess ? null : videoSrc}
        posterSrc={thumb}
        className={`pointer-events-none h-full w-full object-cover transition duration-300 group-active:scale-[0.98] sm:group-hover:scale-[1.03] ${
          locked ? 'scale-105 blur-[2px] brightness-75' : ''
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/65" />
      {locked ? (
        <span className="absolute left-1 top-1 z-10 inline-flex items-center gap-0.5 rounded-[3px] bg-zinc-950/80 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-sm ring-1 ring-white/20">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 5a3 3 0 116 0v3H9V6zm3 8a1.75 1.75 0 110 3.5A1.75 1.75 0 0112 14z" />
          </svg>
          Locked
        </span>
      ) : subscriberAccess ? (
        <span className="absolute left-1 top-1 z-10 rounded-[3px] bg-emerald-600 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-sm">
          Watch
        </span>
      ) : (
      <span className="absolute left-1 top-1 z-10 rounded-[3px] bg-blue-600 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-sm">
        Preview
      </span>
      )}
      {locked ? (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/25 backdrop-blur-[2px] sm:h-14 sm:w-14">
            <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 5a3 3 0 116 0v3H9V6zm3 8a1.75 1.75 0 110 3.5A1.75 1.75 0 0112 14z" />
            </svg>
          </span>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pb-1 pt-8">
        <p className="mb-0.5 line-clamp-1 text-left text-[10px] font-medium leading-tight text-white/80 sm:text-[11px]">
          {preview.courseTitle}
        </p>
        <p className="mb-1 line-clamp-2 text-left text-[11px] font-extrabold leading-snug tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-xs">
          {caption}
        </p>
        <div className="flex items-center gap-1 text-white">
          {locked ? (
            <svg className="h-3.5 w-3.5 shrink-0 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 5a3 3 0 116 0v3H9V6zm3 8a1.75 1.75 0 110 3.5A1.75 1.75 0 0112 14z" />
            </svg>
          ) : (
          <svg
            className="h-3.5 w-3.5 shrink-0 drop-shadow-md"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          )}
          <span className="text-[11px] font-semibold tabular-nums tracking-tight drop-shadow-md sm:text-xs">
            {locked ? 'Subscribe' : subscriberAccess ? 'Open course' : formatCompact(views)}
          </span>
        </div>
      </div>
    </>
  );

  if (subscriberAccess && preview.courseId) {
    return (
      <Link to={`/school/course/${preview.courseId}`} className={tileClass} aria-label={`Watch: ${caption}`}>
        {tileBody}
      </Link>
    );
  }

  if (locked) {
    return (
      <button
        type="button"
        className={`${tileClass} cursor-pointer border-0 p-0`}
        onClick={() => {
          if (typeof onLockedClick === 'function') onLockedClick(preview);
        }}
        aria-label={`Locked lesson: ${caption}. Subscribe to unlock`}
      >
        {tileBody}
      </button>
    );
  }

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

/** Single cell — compact grid tile with video thumb when available */
function TikTokVideoTile({ course, pinned }) {
  const thumb = courseGridPosterUrl(course);
  const videoSrc = resolveCourseThumbVideoSrc(course);
  const views = Number(course.totalStudents) || 0;
  const caption = (course.title || 'Course').trim();

  return (
    <Link
      to={`/courses/${course._id}`}
      className={`group relative block w-full min-w-0 overflow-hidden bg-zinc-900 ${PREVIEW_TILE_ASPECT}`}
    >
      <MediaThumb
        videoSrc={videoSrc}
        posterSrc={thumb}
        className="h-full w-full object-cover transition duration-300 group-active:scale-[0.98] sm:group-hover:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/65" />

      {pinned ? (
        <span className="absolute left-1 top-1 z-10 rounded-[3px] bg-blue-600 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-sm">
          Pinned
        </span>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pb-1 pt-8">
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

function AvatarRing({ avatarSrc, displayName, size = 'lg', className = '' }) {
  const sizes =
    size === 'xl'
      ? 'h-24 w-24 sm:h-36 sm:w-36 lg:h-40 lg:w-40'
      : 'h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36';
  return (
    <div
      className={`rounded-full p-[3px] shadow-lg shadow-blue-500/20 ${className}`}
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
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionDrawerOpen, setSubscriptionDrawerOpen] = useState(false);
  const [selectedSubscriptionPlanId, setSelectedSubscriptionPlanId] = useState('basic');
  const [communityAccess, setCommunityAccess] = useState({
    subscribed: false,
    isTutor: false,
    canAccessCommunity: false,
  });
  const [profileVideoPreview, setProfileVideoPreview] = useState(null);
  const profilePreviewVideoRef = useRef(null);
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

  const loadCommunityAccess = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token || !userId) return undefined;
    let cancelled = false;
    axios
      .get(`${API_URL}/api/instructors/${userId}/subscription/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data: payload }) => {
        if (!cancelled) {
          setCommunityAccess({
            subscribed: Boolean(payload.subscribed),
            isTutor: Boolean(payload.isTutor),
            canAccessCommunity: Boolean(payload.isTutor || payload.canAccessCommunity),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCommunityAccess({ subscribed: false, isTutor: false, canAccessCommunity: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => loadCommunityAccess(), [loadCommunityAccess, location.key]);

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

  // Preview plays with sound. Unmuted autoplay may be blocked on mobile — user tap Play still has audio.
  useEffect(() => {
    if (!profileVideoPreview) return undefined;
    const el = profilePreviewVideoRef.current;
    if (!el) return undefined;
    el.muted = false;
    el.defaultMuted = false;
    el.volume = 1;
    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    tryPlay();
    el.addEventListener('loadeddata', tryPlay);
    return () => el.removeEventListener('loadeddata', tryPlay);
  }, [profileVideoPreview]);

  const goToSubscriptionCheckout = useCallback(
    (plan) => {
      if (!plan?.id) return;
      const token = localStorage.getItem('authToken');
      const from = `/instructors/${userId}`;
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
      const checkoutState = {
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
      };
      if (!token) {
        savePendingCheckout(checkoutState);
        navigate('/register', {
          state: { from: '/checkout', checkout: checkoutState },
        });
        return;
      }
      navigate('/checkout', { state: checkoutState });
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

  /** Prefer full curriculum grid (preview + locked); fall back to preview-only list. */
  const profileLessons = useMemo(() => {
    if (Array.isArray(data?.profileLessons) && data.profileLessons.length > 0) {
      return data.profileLessons;
    }
    if (Array.isArray(data?.previewLessons) && data.previewLessons.length > 0) {
      return data.previewLessons.map((p) => ({ ...p, isPreview: true, isLocked: false }));
    }
    return [];
  }, [data]);

  const usePreviewLessonGrid = profileLessons.length > 0;

  const canWatchAsSubscriber = Boolean(communityAccess.subscribed || communityAccess.isTutor);

  const openLockedLesson = useCallback(() => {
    setSubscriptionDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (loading) return undefined;
    const shouldScroll =
      location.hash === '#videos' ||
      Boolean(location.state?.scrollToVideos) ||
      Boolean(location.state?.subscriptionSuccess);
    if (!shouldScroll) return undefined;

    const t = window.setTimeout(() => {
      document.getElementById('instructor-videos')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 180);

    if (location.state?.scrollToVideos || location.state?.subscriptionSuccess) {
      navigate(`${location.pathname}#videos`, { replace: true, state: {} });
    }

    return () => window.clearTimeout(t);
  }, [loading, location.hash, location.state, location.pathname, navigate]);

  const videoDropdownItems = useMemo(() => {
    if (Array.isArray(data?.videoContent) && data.videoContent.length > 0) {
      return data.videoContent.map((v) => ({
        key: v.key,
        title: v.lessonTitle || 'Lesson',
        subtitle: v.courseTitle || '',
        href: v.courseId ? `/school/course/${v.courseId}` : null,
        isLocked: canWatchAsSubscriber ? false : Boolean(v.isLocked),
        isPreview: Boolean(v.isPreview),
        duration: v.duration || '',
      }));
    }
    if (usePreviewLessonGrid) {
      return profileLessons.map((p) => ({
        key: p.key,
        title: p.lessonTitle || 'Lesson',
        subtitle: p.courseTitle || '',
        href: p.courseId ? `/school/course/${p.courseId}` : null,
        isLocked: canWatchAsSubscriber ? false : Boolean(p.isLocked) || p.isPreview === false,
        isPreview: Boolean(p.isPreview),
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
  }, [
    data?.videoContent,
    filteredCourses,
    profileLessons,
    usePreviewLessonGrid,
    canWatchAsSubscriber,
  ]);

  /** Must run before any conditional return (Rules of Hooks). */
  const videoGrid = useMemo(() => {
    if (usePreviewLessonGrid) {
      if (profileLessons.length === 0) return null;
      if (profileLessons.length === 1) {
        const p = profileLessons[0];
        const locked = !canWatchAsSubscriber && (Boolean(p.isLocked) || p.isPreview === false);
        return (
          <>
            <div className="flex justify-center px-2 lg:hidden">
              <div className="w-full max-w-[220px]">
                <PreviewLessonTile
                  preview={p}
                  onOpenPreview={openProfileVideoPreview}
                  onLockedClick={openLockedLesson}
                  subscriberAccess={canWatchAsSubscriber}
                />
              </div>
            </div>
            {!locked ? (
              canWatchAsSubscriber ? (
                <div className="hidden lg:block">
                  <div className="mx-auto max-w-sm">
                    <PreviewLessonTile
                      preview={p}
                      onOpenPreview={openProfileVideoPreview}
                      onLockedClick={openLockedLesson}
                      subscriberAccess={canWatchAsSubscriber}
                    />
                  </div>
                </div>
              ) : (
            <SinglePreviewLessonDesktopShowcase preview={p} onOpenPreview={openProfileVideoPreview} />
              )
            ) : (
              <div className="hidden lg:block">
                <div className="mx-auto max-w-sm">
                  <PreviewLessonTile
                    preview={p}
                    onOpenPreview={openProfileVideoPreview}
                    onLockedClick={openLockedLesson}
                    subscriberAccess={canWatchAsSubscriber}
                  />
                </div>
              </div>
            )}
          </>
        );
      }
      return (
        <div className={TIKTOK_PROFILE_GRID}>
          {profileLessons.map((p) => (
            <PreviewLessonTile
              key={p.key}
              preview={p}
              onOpenPreview={openProfileVideoPreview}
              onLockedClick={openLockedLesson}
              subscriberAccess={canWatchAsSubscriber}
            />
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
  }, [
    usePreviewLessonGrid,
    profileLessons,
    filteredCourses,
    openProfileVideoPreview,
    openLockedLesson,
    canWatchAsSubscriber,
  ]);

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
  const hasBioContent = Boolean((headline || '').trim() || (bio || '').trim() || (website || '').trim());

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
    ? profileLessons.length
    : filteredCourses.length;
  const videoGridEmpty = videoGridCount === 0;

  const statItems = [
    {
      label: 'Video',
      value:
        stats.videos != null
          ? formatCompact(stats.videos)
          : formatCompact(usePreviewLessonGrid ? profileLessons.length : filteredCourses.length),
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
      {communityAccess.canAccessCommunity || communityAccess.isTutor ? (
        <Link
          to={`/instructors/${userId}/community`}
          className="inline-flex min-h-[2.75rem] min-w-[10.5rem] items-center justify-center rounded-full bg-emerald-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 sm:min-h-[3rem] sm:min-w-[11rem]"
        >
          {communityAccess.isTutor ? 'Open my community' : 'Join community'}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => setSubscriptionDrawerOpen(true)}
        className="group relative inline-flex min-h-[2.75rem] min-w-[10.5rem] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-6 text-sm font-bold tracking-tight text-white shadow-[0_8px_30px_-6px_rgba(37,99,235,0.55)] ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(37,99,235,0.65)] hover:brightness-[1.03] active:translate-y-0 active:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:min-h-[3rem] sm:min-w-[11rem] sm:px-7"
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
    <div id="instructor-videos" className="scroll-mt-24 px-0 pt-0 pb-0 sm:scroll-mt-28">
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

        <div className="mt-2 sm:mt-3">
          {videoGridEmpty ? (
            <div className="py-10 text-center">
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
    <div className="bg-white pt-20 text-zinc-900 sm:pt-24">
      <main className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6 sm:pt-4 lg:px-10 lg:pt-6">
        <section className="px-0 pt-2 pb-0 sm:pt-4 sm:pb-0 lg:pt-6">
          <div className="flex flex-col gap-4 sm:gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6 lg:gap-10">
              <AvatarRing
                avatarSrc={avatarSrc}
                displayName={displayName}
                size="xl"
                className="-mt-2 sm:mt-0"
              />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">Instructor</p>
                <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-900 sm:mt-2 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                  {displayName}
                </h1>
                <p className="mt-1.5 font-mono text-sm text-zinc-500 sm:mt-2">{handle}</p>
                <div className="relative mt-3 grid w-full max-w-md grid-cols-4 divide-x divide-zinc-200 sm:mt-6 sm:max-w-lg">
                  {statItems.map((s) => {
                    const isVideoContent = s.label === 'Video content';
                    return (
                      <div key={s.label} className="flex min-w-0 flex-col items-center px-2 py-0.5 text-center sm:px-4 sm:py-1">
                        {/* Fixed-height top row so values + icon align across columns */}
                        <div className="flex min-h-[30px] items-center justify-center sm:min-h-[34px]">
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
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 sm:h-9 sm:w-9"
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
                            <span className="text-[15px] font-bold leading-none tabular-nums text-zinc-900 sm:text-xl">
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
                {hasBioContent ? <div className="mt-6 hidden sm:block">{bioBlock}</div> : null}
              </div>
            </div>
            <div className="w-full max-w-md lg:max-w-xs lg:shrink-0">{actionButtons}</div>
          </div>
          {hasBioContent ? <div className="mt-2 sm:hidden">{bioBlock}</div> : null}
        </section>

        <div className="mt-0 sm:mt-4 lg:mt-6">{librarySection}</div>
      </main>

      

      {subscriptionDrawerOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-end sm:p-4"
          role="presentation"
        >
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
            className="relative z-[101] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl sm:mb-0 sm:h-auto sm:max-h-[min(92vh,720px)] sm:max-w-lg sm:rounded-2xl sm:border sm:border-zinc-200"
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
                onClick={() => setSubscriptionDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                <p className="min-w-0 text-sm font-bold leading-snug text-zinc-900 sm:text-[15px]">
                  {displayName}&apos;s community
                </p>
              </div>
              <p className="mt-4 text-sm font-bold text-zinc-900 sm:mt-5 sm:text-base">Subscription benefits</p>
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
              <div className="mt-3">
                <p className="text-left text-xs font-medium text-zinc-500">We accept</p>
                <div className="mt-2 flex flex-wrap items-center justify-start gap-2.5">
                  <img
                    src="/images/payments/momo.png"
                    alt="MoMo from MTN"
                    title="MTN Mobile Money"
                    className="h-12 w-auto rounded-md object-contain sm:h-14"
                  />
                  <img
                    src="/images/payments/telecel-cash.png"
                    alt="Telecel Cash"
                    title="Telecel Cash"
                    className="h-12 w-auto rounded-md object-contain sm:h-14"
                  />
                  <img
                    src="/images/payments/airteltigo.png"
                    alt="AirtelTigo"
                    title="AirtelTigo Money"
                    className="h-12 w-auto rounded-md bg-white object-contain sm:h-14"
                  />
                </div>
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
                      {(selectedSubscriptionPlan.benefitLabels || []).length} perks ·{' '}
                      {selectedSubscriptionPlan.label} access
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
                  <p className="mt-5 text-[13px] font-bold tracking-tight text-zinc-900 sm:mt-6 sm:text-sm">
                    What you&apos;ll learn
                  </p>
                  <ul className="mt-3 space-y-3 pb-1">
                    {learningOutcomes.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-[13px] leading-snug text-zinc-800 sm:text-[15px]"
                      >
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
                {(selectedSubscriptionPlan.benefitLabels || []).map((label) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                      <SubscriptionBenefitIcon name="check" />
                    </span>
                    <span className="pt-1.5 text-[13px] leading-snug text-zinc-800 sm:text-[15px]">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-zinc-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                onClick={() => handleChooseSubscriptionPlan(selectedSubscriptionPlanId)}
                className="w-full rounded-2xl bg-blue-600 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.99] sm:py-4 sm:text-[17px]"
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
          className="fixed inset-0 z-[105] flex items-center justify-center bg-black/85 sm:bg-black/70 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-preview-video-title"
          onClick={() => setProfileVideoPreview(null)}
        >
          <div
            className="relative flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-zinc-950 shadow-2xl ring-1 ring-white/10 sm:h-auto sm:max-h-[90vh] sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 bg-zinc-950 px-3 py-3 sm:bg-white sm:px-4">
              <div className="min-w-0">
                <p
                  id="profile-preview-video-title"
                  className="truncate text-sm font-semibold text-white sm:text-zinc-900"
                >
                  {profileVideoPreview.title}
                </p>
                {profileVideoPreview.courseTitle ? (
                  <p className="mt-0.5 truncate text-[11px] text-white/75 sm:text-xs sm:text-zinc-500">
                    {profileVideoPreview.courseTitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setProfileVideoPreview(null)}
                className="shrink-0 rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25 sm:rounded sm:bg-transparent sm:p-1 sm:text-zinc-500 sm:hover:bg-zinc-100 sm:hover:text-zinc-800"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <video
              ref={profilePreviewVideoRef}
              key={profileVideoPreview.src}
              src={profileVideoPreview.src}
              controls
              playsInline
              autoPlay
              className="min-h-0 w-full flex-1 bg-black object-contain sm:max-h-[min(70vh,28rem)] sm:flex-none sm:aspect-video"
            />

            <div className="shrink-0 border-t border-white/10 bg-zinc-950 px-4 py-3 text-center sm:border-zinc-100 sm:bg-white">
              <button
                type="button"
                className="text-sm font-semibold text-blue-400 hover:text-blue-300 hover:underline sm:text-blue-600 sm:hover:text-blue-700"
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
