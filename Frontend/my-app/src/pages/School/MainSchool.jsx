import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Features from '../../components/Features';
import axios from 'axios';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL;

const TABS = [
  { id: 'popular', label: 'Most popular' },
  { id: 'new', label: 'New' },
  { id: 'trending', label: 'Trending' }
];

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';

function courseThumbUrl(c) {
  if (!c.thumbnail) {
    return FALLBACK_THUMB;
  }
  const raw = c.thumbnail.startsWith('http') ? c.thumbnail : `${API_URL}${c.thumbnail}`;
  return publicAssetUrl(raw) || FALLBACK_THUMB;
}

function StarRating({ rating }) {
  const r = Math.min(5, Math.max(0, Number(rating) || 0));
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${i <= Math.round(r) ? 'text-amber-500' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function sortCourses(list, tab) {
  const copy = [...list];
  if (tab === 'popular') {
    copy.sort((a, b) => (Number(b.totalStudents) || 0) - (Number(a.totalStudents) || 0));
  } else if (tab === 'new') {
    copy.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else {
    copy.sort((a, b) => {
      const score = (c) => {
        const rating = Number(c.averageRating) || 0;
        const n = Number(c.totalStudents) || 0;
        return rating * Math.log1p(n + 1);
      };
      return score(b) - score(a);
    });
  }
  return copy;
}

function subscriptionFromPrice(subscriptionPricing) {
  if (!subscriptionPricing || typeof subscriptionPricing !== 'object') return null;
  const basic = Number(subscriptionPricing.basic ?? subscriptionPricing.month1);
  if (Number.isFinite(basic) && basic > 0) return basic;
  const premium = Number(subscriptionPricing.premium);
  if (Number.isFinite(premium) && premium > 0) return premium;
  const month1 = Number(subscriptionPricing.month1);
  if (Number.isFinite(month1) && month1 > 0) return month1;
  const month3 = Number(subscriptionPricing.month3 ?? subscriptionPricing.month2);
  if (Number.isFinite(month3) && month3 > 0) return month3;
  const year1 = Number(subscriptionPricing.year1 ?? subscriptionPricing.diamond);
  if (Number.isFinite(year1) && year1 > 0) return year1;
  return null;
}

function PriceLine({ course }) {
  const fromSub = subscriptionFromPrice(course.subscriptionPricing);
  if (fromSub != null) {
    return (
      <span className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-base sm:text-lg font-extrabold text-gray-900">
          From GH₵{fromSub.toFixed(2)}
        </span>
        <span className="text-xs font-semibold text-gray-500">/mo</span>
      </span>
    );
  }

  const free = Number(course.price) === 0;
  const current = Number(course.price);
  const compare = course.discountPrice != null ? Number(course.discountPrice) : null;
  const showStrike = compare != null && !Number.isNaN(compare) && compare > current && current > 0;

  if (free) {
    return <span className="text-base sm:text-lg font-extrabold text-gray-900">Free</span>;
  }
  return (
    <span className="flex flex-wrap items-baseline gap-2">
      <span className="text-base sm:text-lg font-extrabold text-gray-900">GH₵{current.toFixed(2)}</span>
      {showStrike && (
        <span className="text-sm text-gray-400 line-through">GH₵{compare.toFixed(2)}</span>
      )}
    </span>
  );
}

const MainSchool = () => {
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState(null);
  const [courseTab, setCourseTab] = useState('popular');
  const carouselRef = useRef(null);
  const [scrollState, setScrollState] = useState({ left: false, right: true });

  const displayedCourses = useMemo(
    () => sortCourses(allCourses, courseTab).slice(0, 24),
    [allCourses, courseTab]
  );

  const updateScrollButtons = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollState({
      left: scrollLeft > 12,
      right: scrollLeft < scrollWidth - clientWidth - 12
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCoursesLoading(true);
    setCoursesError(null);
    axios
      .get(`${API_URL}/api/courses`)
      .then(({ data }) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setAllCourses(list.slice(0, 80));
        }
      })
      .catch((e) => {
        if (!cancelled) setCoursesError(e.response?.data?.message || e.message);
      })
      .finally(() => {
        if (!cancelled) setCoursesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return undefined;
    updateScrollButtons();
    const onScroll = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => updateScrollButtons());
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [displayedCourses, updateScrollButtons]);

  useEffect(() => {
    const el = carouselRef.current;
    if (el) el.scrollLeft = 0;
  }, [courseTab]);

  const scrollCarousel = (dir) => {
    const el = carouselRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.85, 300 * 2.5);
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  function getInstructorPathId(course) {
    if (
      course?.instructorModel === 'User' &&
      typeof course?.instructor === 'object' &&
      course?.instructor?._id
    ) {
      return String(course.instructor._id);
    }
    if (course?.createdBy) return String(course.createdBy);
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero — deep blue (matches Navbar bg-blue-950) */}
      <div className="relative overflow-hidden bg-[#1B5EF5]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:60px_60px]"
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-24 top-12 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl" aria-hidden />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/90">
              QuickX Learning Center
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              Learn practical skills with clear outcomes.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-blue-100/90 sm:text-base md:text-lg">
              Browse structured courses, follow guided paths, and track progress without the noise. Built for learners who
              want clarity, consistency, and real results.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#courses"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-blue-950 transition hover:bg-blue-50"
              >
                View courses
              </a>
              <a
                href="#courses"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Explore now
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Courses — Udemy-style */}
      <section id="courses" className="bg-white border-y border-gray-200/90">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-center text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
            Courses to get you started
          </h2>
          <p className="mt-4 text-center text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Explore courses from experienced, real-world experts.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-8 md:gap-12 border-b border-gray-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCourseTab(t.id)}
                className={`relative pb-3 text-base md:text-lg font-bold transition-colors ${
                  courseTab === t.id
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.label}
                {courseTab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {coursesLoading && (
            <p className="mt-10 text-center text-gray-500">Loading courses…</p>
          )}
          {coursesError && (
            <p className="mt-10 text-center text-red-600">{coursesError}</p>
          )}
          {!coursesLoading && !coursesError && displayedCourses.length === 0 && (
            <p className="mt-10 text-center text-gray-500">No courses are available yet. Check back soon.</p>
          )}

          {!coursesLoading && displayedCourses.length > 0 && (
            <div className="relative mt-6 -mx-1">
              {scrollState.left && (
                <button
                  type="button"
                  aria-label="Scroll left"
                  onClick={() => scrollCarousel(-1)}
                  className="absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md transition hover:bg-gray-50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {scrollState.right && (
                <button
                  type="button"
                  aria-label="Scroll right"
                  onClick={() => scrollCarousel(1)}
                  className="absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md transition hover:bg-gray-50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              <div
                ref={carouselRef}
                className="flex gap-4 md:gap-5 overflow-x-auto scroll-smooth pb-2 pt-1 [scrollbar-width:none] md:px-12 [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
              >
                {displayedCourses.map((c) => {
                  const thumb = courseThumbUrl(c);
                  const instructorName =
                    typeof c.instructor === 'object' && c.instructor?.fullName
                      ? c.instructor.fullName
                      : 'Instructor';
                  const instructorPathId = getInstructorPathId(c);
                  const courseClickHref = instructorPathId ? `/instructors/${instructorPathId}` : `/courses/${c._id}`;
                  const rating = Number(c.averageRating) || 0;
                  const showRating = rating > 0;

                  return (
                    <article
                      key={`${courseTab}-${c._id}`}
                      className="w-[min(100%,22rem)] min-w-[17rem] sm:min-w-[18.5rem] md:min-w-[20rem] max-w-[22rem] shrink-0 snap-start flex flex-col rounded-sm border border-transparent bg-white transition hover:opacity-[0.98]"
                    >
                      <Link
                        to={courseClickHref}
                        className="block aspect-[16/10] overflow-hidden bg-slate-200 ring-1 ring-gray-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_THUMB;
                          }}
                        />
                      </Link>
                      <div className="flex flex-1 flex-col pt-3 pr-1 pl-0.5">
                        <h3 className="line-clamp-2 text-sm sm:text-base font-bold leading-snug text-gray-900">
                          <Link to={courseClickHref} className="hover:text-indigo-700">
                            {c.title}
                          </Link>
                        </h3>
                        <p className="mt-0.5 text-xs sm:text-sm text-gray-600 line-clamp-1">
                          {c.instructorModel === 'User' &&
                          typeof c.instructor === 'object' &&
                          c.instructor?._id ? (
                            <Link
                              to={`/instructors/${c.instructor._id}`}
                              className="hover:text-indigo-700 hover:underline"
                            >
                              {instructorName}
                            </Link>
                          ) : (
                            instructorName
                          )}
                        </p>

                        {showRating ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
                            <span className="font-bold text-amber-700">{rating.toFixed(1)}</span>
                            <StarRating rating={rating} />
                          </div>
                        ) : null}

                        <div className="mt-2.5">
                          <PriceLine course={c} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <Features/>

    </div>
  );
};

export default MainSchool;
