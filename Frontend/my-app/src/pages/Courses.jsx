import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { publicAssetUrl } from '../utils/publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL;

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

const FALLBACK_THUMB = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80';

const CATEGORIES = ['All Categories', 'Forex', 'Crypto', 'Web Dev'];
const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];
const SORTS = ['Newest', 'Oldest', 'Price Low to High', 'Price High to Low'];

export default function Courses() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [courseType, setCourseType] = useState('All Categories');
  const [level, setLevel] = useState('All Levels');
  const [sort, setSort] = useState('Newest');

  // Debounce search input to prevent rapid API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (courseType && courseType !== 'All Categories') {
      const typeMap = { 'Forex': 'forex', 'Crypto': 'crypto', 'Web Dev': 'webdev' };
      params.set('courseType', typeMap[courseType] || courseType.toLowerCase());
    }
    if (level && level !== 'All Levels') params.set('level', level.toLowerCase());
    if (sort && sort !== 'Newest') {
       if (sort === 'Price Low to High') params.set('sort', 'price_asc');
       else if (sort === 'Price High to Low') params.set('sort', 'price_desc');
       else if (sort === 'Oldest') params.set('sort', 'oldest');
    }

    const q = params.toString();
    setLoading(true);
    axios
      .get(`${API_URL}/api/courses${q ? `?${q}` : ''}`)
      .then(({ data }) => {
        if (!cancelled) {
          setList(Array.isArray(data) ? data : []);
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
  }, [debouncedSearch, courseType, level, sort]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Sleek Header and Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Explore Courses</h1>
            <p className="mt-2 text-gray-500 text-[15px]">Find the perfect course to level up your skills.</p>
          </div>
          <div className="relative w-full md:w-96 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses, instructors..."
              className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow shadow-sm"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          <div className="flex bg-white rounded-full p-1 border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCourseType(cat)}
                className={`px-5 py-2 rounded-full text-[14px] font-semibold whitespace-nowrap transition-all duration-200 ${
                  courseType === cat ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-full text-[14px] font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] cursor-pointer transition-shadow"
          >
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-full text-[14px] font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] cursor-pointer ml-auto transition-shadow"
          >
            {SORTS.map(s => <option key={s} value={s}>Sort: {s}</option>)}
          </select>
        </div>

        {/* Content Area */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm h-72">
                <div className="bg-gray-200 h-40 w-full"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : !error && list.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-4 text-[15px] font-semibold text-gray-900">No courses found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((c) => {
              const thumb = publicAssetUrl(
                c.thumbnail?.startsWith('http')
                  ? c.thumbnail
                  : c.thumbnail
                    ? `${API_URL}${c.thumbnail}`
                    : FALLBACK_THUMB
              );
              const instructorName =
                typeof c.instructor === 'object' && c.instructor?.fullName
                  ? c.instructor.fullName
                  : 'Instructor';
              const instructorPathId = getInstructorPathId(c);
              
              // Exactly as the user requested:
              const courseClickHref = instructorPathId ? `/instructors/${instructorPathId}` : `/courses/${c._id}`;

              return (
                <article
                  key={c._id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1"
                >
                  <Link to={courseClickHref} className="block aspect-[16/10] overflow-hidden bg-gray-100 relative">
                    <img
                      src={thumb}
                      alt={c.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_THUMB;
                      }}
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 shadow-sm backdrop-blur">
                        {c.courseType}
                      </span>
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 text-[16px] font-bold leading-snug text-gray-900 mb-2">
                      <Link to={courseClickHref} className="hover:text-indigo-600 transition-colors">
                        {c.title}
                      </Link>
                    </h3>
                    
                    <p className="text-[13px] text-gray-500 mb-4 line-clamp-2">
                      {c.shortDescription || c.description}
                    </p>

                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {c.instructorModel === 'User' && typeof c.instructor === 'object' && c.instructor?._id ? (
                          <Link to={`/instructors/${c.instructor._id}`} className="flex items-center gap-2 group/inst">
                            {c.instructor.avatar || c.instructor.profilePicture ? (
                              <img src={publicAssetUrl(c.instructor.avatar || c.instructor.profilePicture)} alt="" className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-sm transition group-hover/inst:ring-indigo-100" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold uppercase">{instructorName.charAt(0)}</div>
                            )}
                            <span className="text-[13px] font-medium text-gray-600 group-hover/inst:text-indigo-600 transition-colors line-clamp-1">{instructorName}</span>
                          </Link>
                        ) : (
                          <span className="text-[13px] font-medium text-gray-600 line-clamp-1">{instructorName}</span>
                        )}
                      </div>

                      <div className="text-[15px] font-bold text-gray-900">
                        {(() => {
                          const basic = Number(c.subscriptionPricing?.basic ?? c.subscriptionPricing?.month1);
                          if (Number.isFinite(basic) && basic > 0) {
                            return `From GH₵${basic.toFixed(0)}/mo`;
                          }
                          return Number(c.price) === 0 ? 'Free' : `GH₵${c.price}`;
                        })()}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
