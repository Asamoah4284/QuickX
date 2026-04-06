import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { publicAssetUrl } from '../utils/publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL;

const TYPE_LABEL = {
  forex: 'Forex',
  crypto: 'Cryptocurrency',
  webdev: 'Web development',
};

function formatUpdated(d) {
  if (!d) return 'Recently';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function StarRow({ rating }) {
  const r = Math.min(5, Math.max(0, Number(rating) || 0));
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i <= Math.round(r) ? 'text-amber-400' : 'text-gray-500'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function CheckItem({ children }) {
  return (
    <li className="flex gap-3 text-sm text-gray-800">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-blue-600">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

function parseLessonDurationSeconds(d) {
  if (d == null || d === '') return 0;
  const s = String(d).trim();
  const minMatch = s.match(/^(\d+)\s*min(?:utes)?$/i);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;
  const parts = s.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatTotalSeconds(sec) {
  const total = Math.max(0, Math.round(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return '0 min';
}

function computeCourseContentStats(course) {
  let sections = 0;
  let lectures = 0;
  let seconds = 0;
  (course?.modules || []).forEach((mod) => {
    (mod.sections || []).forEach((sec) => {
      sections += 1;
      const lessons = sec.lessons || [];
      lectures += lessons.length;
      lessons.forEach((les) => {
        seconds += parseLessonDurationSeconds(les.duration);
      });
    });
  });
  return { sections, lectures, totalSeconds: seconds };
}

function flattenCourseSections(course) {
  const out = [];
  (course?.modules || []).forEach((mod, mi) => {
    (mod.sections || []).forEach((sec, si) => {
      out.push({
        key: sec._id ? String(sec._id) : `m${mi}-s${si}-${sec.title || ''}`,
        section: sec
      });
    });
  });
  return out;
}

function lessonPreviewVideoSrc(lesson) {
  const v = lesson?.videoUrl;
  if (!v || !String(v).trim()) return null;
  return publicAssetUrl(v.startsWith('http') ? v : `${API_URL}${v}`);
}

function sectionMetaLine(lessons) {
  const list = lessons || [];
  const n = list.length;
  const sec = list.reduce((t, l) => t + parseLessonDurationSeconds(l.duration), 0);
  return `${n} lecture${n === 1 ? '' : 's'} · ${formatTotalSeconds(sec)}`;
}

/** Udemy-style public course / purchase page */
export default function CoursePublicDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchaseMode, setPurchaseMode] = useState('course');
  const [isLgScreen, setIsLgScreen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );
  const [previewLesson, setPreviewLesson] = useState(null);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const curriculumRef = useRef(null);

  const contentStats = useMemo(
    () => (course ? computeCourseContentStats(course) : { sections: 0, lectures: 0, totalSeconds: 0 }),
    [course]
  );
  const flatSections = useMemo(() => (course ? flattenCourseSections(course) : []), [course]);

  useEffect(() => {
    if (!previewLesson) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setPreviewLesson(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewLesson]);

  useLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsLgScreen(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  /** Udemy-style: after scrolling past the hero overlap, collapse the promo block so the sticky card stays compact */
  useEffect(() => {
    if (!isLgScreen) {
      setSidebarCompact(false);
      return undefined;
    }
    const onScroll = () => {
      setSidebarCompact(window.scrollY > 120);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isLgScreen]);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_URL}/api/courses/${courseId}/preview`)
      .then(({ data }) => {
        if (!cancelled) {
          setCourse(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.message || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [courseId]);

  const buy = async () => {
    if (!course) return;
    if (purchaseMode === 'membership') {
      navigate('/membership');
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { state: { from: `/courses/${courseId}` } });
      return;
    }

    if (Number(course.price) === 0) {
      try {
        await axios.post(
          `${API_URL}/api/courses/${course._id}/enroll`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage('Enrollment successful. Redirecting…');
        navigate(`/school/course/${course._id}`);
        return;
      } catch (enrollError) {
        setError(enrollError.response?.data?.message || enrollError.message);
        return;
      }
    }

    const checkoutImageUrl = course.thumbnail
      ? publicAssetUrl(
          String(course.thumbnail).startsWith('http')
            ? String(course.thumbnail)
            : `${API_URL}${String(course.thumbnail)}`
        )
      : null;

    navigate('/checkout', {
      state: {
        item: {
          type: 'course',
          id: course._id,
          title: course.title,
          price: course.price,
          description: course.shortDescription || course.description,
          thumbnail: course.thumbnail,
          ...(checkoutImageUrl ? { image: checkoutImageUrl } : {}),
        },
        returnPath: '/courses',
        returnTabState: null,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white" aria-busy="true">
        <span className="sr-only">Loading course</span>
        {/* Dark hero skeleton */}
        <div className="bg-[#1c1d1f] text-white">
          <div className="mx-auto max-w-[1180px] px-4 pt-20 pb-14 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="h-3 w-14 animate-pulse rounded bg-white/15 sm:h-3.5 sm:w-16" />
              <div className="h-3 w-2 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-12 animate-pulse rounded bg-white/15" />
              <div className="h-3 w-2 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-40 max-w-[60%] animate-pulse rounded bg-white/10" />
            </div>
            <div className="max-w-4xl space-y-4">
              <div className="h-9 max-w-xl animate-pulse rounded-md bg-white/15 md:h-11 md:max-w-2xl" />
              <div className="h-4 max-w-2xl animate-pulse rounded bg-white/10" />
              <div className="h-4 max-w-xl animate-pulse rounded bg-white/10" />
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="h-4 w-44 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-6 rounded-md border border-white/10 bg-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-white/15" />
                  <div className="space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-white/15" />
                    <div className="h-2.5 w-36 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
                <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <div className="relative z-10 -mt-12 grid gap-8 sm:-mt-16 lg:-mt-20 lg:grid-cols-[1fr_380px] lg:gap-10">
            <div className="min-w-0 space-y-10 pt-2 lg:pt-0">
              {/* Mobile: video area before “What you’ll learn” */}
              {!isLgScreen ? (
                <div className="-mx-4 mb-2 bg-black sm:mx-0">
                  <div className="aspect-video animate-pulse bg-gradient-to-br from-gray-800 to-gray-900" />
                  <div className="h-9 bg-[#f7f9fa]" />
                </div>
              ) : null}

              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,.08)] sm:p-8">
                <div className="h-8 w-52 animate-pulse rounded bg-gray-200" />
                <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <li key={i} className="flex gap-3">
                      <div className="mt-0.5 h-5 w-5 shrink-0 animate-pulse rounded-full bg-gray-200" />
                      <div className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
                    </li>
                  ))}
                </ul>
              </section>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="h-40 animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="h-6 w-32 rounded bg-gray-200" />
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-4/5 rounded bg-gray-100" />
                  </div>
                </div>
                <div className="h-40 animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="h-6 w-28 rounded bg-gray-200" />
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-3/4 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:-mt-[200px] xl:-mt-[220px]">
              <div className="sticky top-24 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,.12)]">
                {isLgScreen ? (
                  <>
                    <div className="aspect-video animate-pulse bg-gradient-to-br from-gray-200 to-gray-300" />
                    <div className="h-9 border-b border-gray-100 bg-gray-50" />
                  </>
                ) : null}
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="h-28 animate-pulse rounded-lg border-2 border-gray-100 bg-gray-50" />
                  <div className="h-24 animate-pulse rounded-lg border border-gray-100 bg-gray-50" />
                  <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
                  <div className="h-4 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }
  if (error || !course) {
    return (
      <div className="min-h-[50vh] bg-[#1c1d1f] pt-28 px-4 text-center">
        <p className="text-red-400">{error || 'Course not found'}</p>
        <Link to="/courses" className="mt-4 inline-block text-blue-300 hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  const thumb = publicAssetUrl(
    course.thumbnail?.startsWith('http')
      ? course.thumbnail
      : course.thumbnail
        ? `${API_URL}${course.thumbnail}`
        : null
  );

  const promoVideoSrc = course.promoVideo
    ? publicAssetUrl(
        course.promoVideo.startsWith('http')
          ? course.promoVideo
          : `${API_URL}${course.promoVideo}`
      )
    : null;
  const instructorName =
    typeof course.instructor === 'object' && course.instructor?.fullName
      ? course.instructor.fullName
      : course.instructor || 'Instructor';
  const reviewCount = (course.reviews || []).length;
  const rating = Number(course.averageRating) || 0;
  const students = Number(course.totalStudents) || 0;
  const typeName = TYPE_LABEL[course.courseType] || course.courseType || 'Courses';
  const showBestseller = students >= 15 || rating >= 4.5;
  const currentPrice = Number(course.price) || 0;
  const compareAt =
    course.discountPrice != null && Number(course.discountPrice) > currentPrice
      ? Number(course.discountPrice)
      : null;
  const outcomes = course.learningOutcomes?.length
    ? course.learningOutcomes
    : [course.shortDescription || course.description || 'Practical lessons you can apply right away.'].filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      {/* Dark hero — Udemy-style */}
      <div className="bg-[#1c1d1f] text-white">
        <div className="mx-auto max-w-[1180px] px-4 pt-20 pb-14 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
         

          <nav className="mb-4 flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-blue-300 sm:text-sm">
            <span>Learning</span>
            <span className="text-gray-500">›</span>
            <span>{typeName}</span>
            <span className="text-gray-500">›</span>
            <span className="line-clamp-1 text-gray-400">{course.title}</span>
          </nav>

          <div className="max-w-4xl">
            {showBestseller ? (
              <span className="mb-3 inline-block rounded-sm bg-teal-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-teal-900">
                Bestseller
              </span>
            ) : null}
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-[2.75rem]">
              {course.title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-gray-300">
              {course.subtitle || course.shortDescription || course.description?.slice(0, 220)}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
              <span>
                Created by{' '}
                <span className="font-semibold text-blue-300 underline decoration-blue-500/50">
                  {instructorName}
                </span>
              </span>
              <span className="hidden sm:inline">·</span>
              <span>Last updated {formatUpdated(course.updatedAt)}</span>
              <span className="hidden sm:inline">·</span>
              <span>{course.language || 'English'}</span>
            </div>

            {/* Stats strip — Personal-plan style banner */}
            <div className="mt-6 flex flex-wrap items-center gap-6 rounded-md border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 border-white/10 sm:border-r sm:pr-6">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-600">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">QuickX learning</p>
                  <p className="text-[11px] text-gray-400">Expert-led courses &amp; updates</p>
                </div>
              </div>
              {rating > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-bold text-amber-400">{rating.toFixed(1)}</span>
                  <StarRow rating={rating} />
                  <span className="text-sm text-gray-400">
                    ({reviewCount} reviews · {students.toLocaleString()} learners)
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">{students.toLocaleString()} learners enrolled</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlapping layout: main + floating sidebar (sidebar column stretches full row height so sticky works) */}
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 -mt-12 grid gap-8 sm:-mt-16 lg:-mt-20 lg:grid-cols-[1fr_380px] lg:items-stretch lg:gap-10">
          {/* Main column */}
          <div className="min-w-0 space-y-10 pt-2 lg:pt-0">
            {message ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}
            {error && purchaseMode === 'course' ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            {/* Mobile: preview video / image before "What you'll learn" (sidebar preview only on lg+) */}
            {!isLgScreen && (promoVideoSrc || thumb) ? (
              <div className="-mx-4 mb-8 bg-black sm:mx-0">
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  {promoVideoSrc ? (
                    <video
                      key={`m-${courseId}-${promoVideoSrc}`}
                      src={promoVideoSrc}
                      controls
                      autoPlay
                      muted
                      playsInline
                      poster={thumb || undefined}
                      className="block h-full w-full bg-black object-cover object-center outline-none ring-0"
                    />
                  ) : (
                    <>
                      <img src={thumb} alt="" className="h-full w-full object-cover opacity-90" />
                      <div
                        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/35"
                        aria-hidden
                      >
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-blue-600 shadow-lg opacity-80">
                          <svg className="ml-1 h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                        <p className="absolute bottom-3 left-4 text-left text-sm font-bold text-white drop-shadow-md">
                          Preview this course
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {promoVideoSrc ? (
                  <p className="bg-[#f7f9fa] px-3 py-2 text-center text-[11px] text-gray-500">
                    Starts muted so autoplay is allowed — use the player controls for sound.
                  </p>
                ) : null}
              </div>
            ) : null}

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,.08)] sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900">What you&apos;ll learn</h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
                {outcomes.slice(0, 12).map((outcome, i) => (
                  <CheckItem key={i}>{outcome}</CheckItem>
                ))}
              </ul>
            </section>

            <div className="grid gap-8 md:grid-cols-2">
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900">Requirements</h2>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {(course.requirements || []).length ? (
                    course.requirements.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-gray-400">•</span>
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">No prerequisites listed.</li>
                  )}
                </ul>
              </section>
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900">Description</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {course.description}
                </p>
              </section>
            </div>

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Course content</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {contentStats.sections} section{contentStats.sections === 1 ? '' : 's'} ·{' '}
                    {contentStats.lectures} lecture{contentStats.lectures === 1 ? '' : 's'} ·{' '}
                    {formatTotalSeconds(contentStats.totalSeconds)} total length
                  </p>
                </div>
                {flatSections.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      curriculumRef.current?.querySelectorAll('details').forEach((el) => {
                        el.open = true;
                      });
                    }}
                    className="text-sm font-semibold text-violet-700 hover:text-violet-800 hover:underline"
                  >
                    Expand all sections
                  </button>
                ) : null}
              </div>

              <div ref={curriculumRef} className="mt-5 space-y-2 border border-gray-200">
                {flatSections.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No curriculum published yet.</p>
                ) : (
                  flatSections.map(({ key, section }, idx) => {
                    const lessons = section.lessons || [];
                    return (
                      <details key={key} className="group border-b border-gray-200 last:border-b-0" open={idx === 0}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <svg
                              className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:-rotate-180"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            <span className="min-w-0">{section.title}</span>
                          </span>
                          <span className="shrink-0 text-xs font-normal text-gray-500">{sectionMetaLine(lessons)}</span>
                        </summary>
                        <div className="divide-y divide-gray-100 bg-white">
                          {lessons.map((lesson, li) => {
                            const lt = lesson.type || lesson.lessonType || 'video';
                            const isVideo = lt === 'video';
                            const canPreview = lesson.isPreview === true || lesson.free === true;
                            const previewSrc = canPreview ? lessonPreviewVideoSrc(lesson) : null;
                            return (
                              <div
                                key={lesson._id || `${key}-l${li}`}
                                className="flex items-center gap-3 px-4 py-2.5 pr-3"
                              >
                                {isVideo ? (
                                  <svg
                                    className="h-4 w-4 shrink-0 text-gray-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                ) : (
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-gray-400" aria-hidden>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </span>
                                )}
                                <span className="min-w-0 flex-1 text-sm text-gray-800">{lesson.title}</span>
                                {previewSrc ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewLesson({ title: lesson.title, src: previewSrc })}
                                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-800"
                                  >
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-700" aria-hidden>
                                      <svg className="ml-0.5 h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                    </span>
                                    Preview
                                  </button>
                                ) : null}
                                {lesson.duration ? (
                                  <span className="w-12 shrink-0 text-right text-xs tabular-nums text-gray-500">
                                    {lesson.duration}
                                  </span>
                                ) : (
                                  <span className="w-12 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
              <div className="mt-5 space-y-4">
                {(course.reviews || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No reviews yet.</p>
                ) : (
                  course.reviews.map((review) => (
                    <div key={review._id} className="rounded-lg border border-gray-100 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{review.studentId?.fullName || 'Student'}</p>
                        <p className="text-sm font-semibold text-amber-600">{review.rating}/5</p>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{review.comment || '—'}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Floating purchase card — Udemy sidebar: sticky + compact promo when scrolling */}
          <aside className="lg:-mt-[200px] xl:-mt-[220px]">
            <div
              className={`z-30 flex flex-col rounded-lg border border-gray-200 bg-white transition-shadow duration-300 lg:sticky lg:top-[4.75rem] ${
                sidebarCompact && isLgScreen
                  ? 'shadow-[0_4px_20px_rgba(0,0,0,.14)]'
                  : 'shadow-[0_2px_8px_rgba(0,0,0,.12)]'
              }`}
            >
              {isLgScreen && (promoVideoSrc || thumb) ? (
                <div
                  className={`grid shrink-0 transition-[grid-template-rows] duration-300 ease-in-out ${
                    sidebarCompact && isLgScreen ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                  }`}
                  aria-hidden={sidebarCompact && isLgScreen}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div>
                      <div className="relative aspect-video w-full overflow-hidden bg-black">
                        {promoVideoSrc ? (
                          <video
                            key={`d-${courseId}-${promoVideoSrc}`}
                            src={promoVideoSrc}
                            controls
                            autoPlay
                            muted
                            playsInline
                            poster={thumb || undefined}
                            className="block h-full w-full bg-black object-cover object-center outline-none ring-0"
                          />
                        ) : (
                          <>
                            {thumb ? (
                              <img src={thumb} alt="" className="h-full w-full object-cover opacity-90" />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-gray-900 text-gray-500">
                                No preview image
                              </div>
                            )}
                            <div
                              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/35"
                              aria-hidden
                            >
                              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-blue-600 shadow-lg opacity-80">
                                <svg className="ml-1 h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                              <p className="absolute bottom-3 left-4 text-left text-sm font-bold text-white drop-shadow-md">
                                Preview this course
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      {promoVideoSrc ? (
                        <p className="bg-[#f7f9fa] px-3 py-2 text-center text-[11px] text-gray-500">
                          Starts muted so autoplay is allowed — use the player controls for sound.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4 p-4 sm:p-5">
                <label className="flex cursor-pointer gap-3 rounded border-2 border-gray-900 p-4 transition hover:bg-gray-50">
                  <input
                    type="radio"
                    name="purchase"
                    checked={purchaseMode === 'course'}
                    onChange={() => setPurchaseMode('course')}
                    className="mt-1 h-4 w-4 accent-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">Start subscription</p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      {currentPrice === 0 ? (
                        <span className="text-3xl font-bold text-gray-900">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-gray-900">GH₵{currentPrice.toFixed(2)}</span>
                          {compareAt != null ? (
                            <span className="text-lg text-gray-400 line-through">GH₵{compareAt.toFixed(2)}</span>
                          ) : null}
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-600">Full lifetime access · Certificate info below</p>
                  </div>
                </label>

                <label className="flex cursor-pointer gap-3 rounded border border-gray-200 p-4 transition hover:bg-gray-50">
                  <input
                    type="radio"
                    name="purchase"
                    checked={purchaseMode === 'membership'}
                    onChange={() => setPurchaseMode('membership')}
                    className="mt-1 h-4 w-4 accent-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">Membership</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Explore plans that bundle courses and perks on QuickX.
                    </p>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={buy}
                  className="w-full rounded bg-blue-600 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  {purchaseMode === 'membership'
                    ? 'View membership plans'
                    : currentPrice === 0
                      ? 'Enroll for free'
                      : 'Start subscription'}
                </button>

                <Link
                  to={`/school/course/${course._id}`}
                  className="block text-center text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Continue learning
                </Link>

                <div className="space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-600">
                  <p>Certificate: {course.certificateEnabled ? 'Included' : 'Not included'}</p>
                  <p className="line-clamp-2">
                    Audience: {(course.targetAudience || []).join(', ') || 'All learners'}
                  </p>
                </div>
              </div>
            </div>

            <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Meet your instructor</h2>
              <div className="mt-4 flex items-start gap-4">
                {course.instructor?.avatar || course.instructor?.profilePicture ? (
                  <img
                    src={course.instructor.avatar || course.instructor.profilePicture}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-800">
                    {instructorName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-900">{instructorName}</p>
                  <p className="text-sm text-gray-500">{course.tutorProfile?.headline || 'QuickX creator'}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {course.tutorProfile?.bio || 'This instructor builds practical, real-world lessons on QuickX.'}
              </p>
            </section>

            {(course.relatedCourses || []).length > 0 ? (
              <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Related courses</h2>
                <div className="mt-4 space-y-3">
                  {course.relatedCourses.map((related) => (
                    <Link
                      key={related._id}
                      to={`/courses/${related._id}`}
                      className="block rounded-lg border border-gray-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <p className="font-semibold text-gray-900">{related.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {Number(related.price || 0) === 0 ? 'Free' : `GH₵${related.price}`} ·{' '}
                        {related.totalLessons || 0} lessons
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>

      {previewLesson ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-lesson-title"
          onClick={() => setPreviewLesson(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-lg bg-black shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
              <p id="preview-lesson-title" className="min-w-0 text-sm font-semibold text-gray-900">
                {previewLesson.title}
              </p>
              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <video
              key={previewLesson.src}
              src={previewLesson.src}
              controls
              playsInline
              className="aspect-video w-full bg-black object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
