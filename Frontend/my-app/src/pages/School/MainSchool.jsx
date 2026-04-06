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

function formatCount(n) {
  const x = Number(n) || 0;
  return x.toLocaleString('en-US');
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

function getCourseBadges(course, popularitySorted) {
  const badges = [];
  const created = course.createdAt ? new Date(course.createdAt) : null;
  if (created && Date.now() - created.getTime() < 45 * 86400000) {
    badges.push({
      key: 'hot',
      label: 'Hot & new',
      className: 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/80'
    });
  }
  const pos = popularitySorted.findIndex((c) => String(c._id) === String(course._id));
  const students = Number(course.totalStudents) || 0;
  if (pos >= 0 && pos < 3 && popularitySorted.length >= 2) {
    badges.push({
      key: 'bestseller',
      label: 'Bestseller',
      className: 'bg-cyan-50 text-cyan-900 ring-1 ring-cyan-200/80'
    });
  } else if (students >= 25) {
    badges.push({
      key: 'bestseller',
      label: 'Bestseller',
      className: 'bg-cyan-50 text-cyan-900 ring-1 ring-cyan-200/80'
    });
  }
  if (course.certificateEnabled && badges.length < 2) {
    badges.push({
      key: 'premium',
      label: 'Premium',
      className: 'bg-purple-50 text-purple-900 ring-1 ring-purple-200/80',
      icon: 'shield'
    });
  }
  return badges.slice(0, 2);
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

function PriceLine({ course }) {
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
  const [advertisements, setAdvertisements] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState(null);
  const [courseTab, setCourseTab] = useState('popular');
  const carouselRef = useRef(null);
  const [scrollState, setScrollState] = useState({ left: false, right: true });

  const popularitySorted = useMemo(() => {
    const copy = [...allCourses];
    copy.sort((a, b) => (Number(b.totalStudents) || 0) - (Number(a.totalStudents) || 0));
    return copy;
  }, [allCourses]);

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
    fetchAdvertisements();
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

  useEffect(() => {
    if (advertisements.length > 1) {
      const timer = setInterval(() => {
        setCurrentAdIndex((prevIndex) =>
          prevIndex === advertisements.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000);

      return () => clearInterval(timer);
    }
  }, [advertisements]);

  const scrollCarousel = (dir) => {
    const el = carouselRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.85, 300 * 2.5);
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const fetchAdvertisements = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/advertisements`);
      setAdvertisements(response.data.filter(ad => ad.isActive));
    } catch (error) {
      console.error('Error fetching advertisements:', error);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="bg-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className="max-w-6xl mx-auto px-6 py-32 relative z-10">
          <div className="grid grid-cols-12 gap-8 items-center">
            <div className="col-span-12 lg:col-span-7 text-center lg:text-left">
              <h1 className="text-6xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg"
                  style={{ lineHeight: '1.1', letterSpacing: '-0.02em' }}>

                <span className="text-blue-400">Quick</span><span className="text-yellow-400">XLearn</span>
              </h1>
              <p className="text-2xl text-blue-100 mb-12 font-light leading-relaxed">
              Welcome to QuicKxLearning Center, Lighting up minds through learning to build the skillset and mindset for financial freedom
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <a href="#courses" className="px-10 py-3 rounded-full bg-blue-500 text-white font-semibold shadow-lg hover:bg-blue-600 transition-all duration-200 border-2 border-blue-500"
                >
                 View courses
                </a>
                <a href="#courses" className="px-10 py-3 rounded-full border-2 border-white text-white font-semibold bg-white/10 hover:bg-white/20 shadow-lg transition-all duration-200">
                  Explore now
                </a>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <figure className="w-full h-full flex items-center justify-center">
                <img
                  src="./images/school-pic.png"
                  alt="a school picture"
                  className="w-full h-auto object-contain"
                />
              </figure>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      {/* Advertisement Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiA4YzAgMi0yIDQtNCA0cy00LTItNC00IDItNCA0LTQgNCAyIDQgNHoiIGZpbGw9IiNlZWUiLz48L2c+PC9zdmc+')] opacity-10"></div>
        <div className="max-w-6xl mx-auto px-4 py-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {advertisements.length > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
                  <div className="relative">
                    <div className="absolute top-0 right-0">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">Featured</span>
                    </div>
                    <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg overflow-hidden relative group">
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors duration-300"></div>
                      <img
                        src={advertisements[currentAdIndex].imageUrl}
                        alt={advertisements[currentAdIndex].title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Premium Placement</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-xs font-medium text-blue-600">Sponsored</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {advertisements.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setCurrentAdIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              currentAdIndex === index ? 'bg-blue-600 w-4' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-4 shadow-xl h-full">
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="aspect-[4/3] bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden relative group">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-3">
                          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white shadow-md flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <h4 className="text-base font-semibold text-gray-800">Quick Ad</h4>
                          <p className="text-xs text-gray-600">Your quick message here</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Sponsored Content</span>
                    <button type="button" className="text-xs text-blue-600 hover:text-blue-700">View Details</button>
                  </div>
                </div>
              </div>
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
                  const rating = Number(c.averageRating) || 0;
                  const showRating = rating > 0;
                  const students = Number(c.totalStudents) || 0;
                  const badges = getCourseBadges(c, popularitySorted);

                  return (
                    <article
                      key={`${courseTab}-${c._id}`}
                      className="w-[min(100%,22rem)] min-w-[17rem] sm:min-w-[18.5rem] md:min-w-[20rem] max-w-[22rem] shrink-0 snap-start flex flex-col rounded-sm border border-transparent bg-white transition hover:opacity-[0.98]"
                    >
                      <Link
                        to={`/courses/${c._id}`}
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
                        <h3 className="line-clamp-2 min-h-[2.875rem] text-sm sm:text-base font-bold leading-snug text-gray-900">
                          <Link to={`/courses/${c._id}`} className="hover:text-indigo-700">
                            {c.title}
                          </Link>
                        </h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-gray-600 line-clamp-1">{instructorName}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
                          {showRating ? (
                            <>
                              <span className="font-bold text-amber-700">{rating.toFixed(1)}</span>
                              <StarRating rating={rating} />
                              <span className="text-gray-500" title="Enrolled learners">
                                ({formatCount(students)})
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-600">{formatCount(students)} learners</span>
                          )}
                        </div>

                        <div className="mt-2.5">
                          <PriceLine course={c} />
                        </div>

                        {badges.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {badges.map((b) => (
                              <span
                                key={b.key}
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide ${b.className}`}
                              >
                                {b.icon === 'shield' && (
                                  <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {b.label}
                              </span>
                            ))}
                          </div>
                        )}
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
