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

export default function Courses() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [courseType, setCourseType] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (courseType) params.set('courseType', courseType);
    if (level) params.set('level', level);
    if (category.trim()) params.set('category', category.trim());
    if (sort) params.set('sort', sort);

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
  }, [search, courseType, level, category, sort]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Courses</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Browse published courses. Filters match the catalog API.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0 space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 h-fit">
            <div>
              <label className="block text-xs font-medium text-slate-500">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title…"
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white px-2 py-1.5 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Track</label>
              <select
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="">All</option>
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
                <option value="webdev">Web development</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="">All</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Exact tag or category"
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white px-2 py-1.5 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>
          </aside>

          <div className="flex-1">
            {loading && <p className="text-slate-500">Loading…</p>}
            {error && <p className="text-red-600">{error}</p>}
            {!loading && !error && list.length === 0 && (
              <p className="text-slate-500">No courses match your filters.</p>
            )}
            <div className="grid gap-6 sm:grid-cols-2">
              {list.map((c) => {
                const thumb = publicAssetUrl(
                  c.thumbnail?.startsWith('http')
                    ? c.thumbnail
                    : c.thumbnail
                      ? `${API_URL}${c.thumbnail}`
                      : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80'
                );
                const instructorName =
                  typeof c.instructor === 'object' && c.instructor?.fullName
                    ? c.instructor.fullName
                    : 'Instructor';
                const instructorPathId = getInstructorPathId(c);
                const courseClickHref = instructorPathId ? `/instructors/${instructorPathId}` : `/courses/${c._id}`;
                return (
                  <article
                    key={c._id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm flex flex-col"
                  >
                    <Link to={courseClickHref} className="block aspect-video bg-slate-200">
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    </Link>
                    <div className="p-4 flex-1 flex flex-col">
                      <span className="text-xs uppercase text-blue-600 dark:text-blue-400">{c.courseType}</span>
                      <h2 className="mt-1 font-semibold text-slate-900 dark:text-white line-clamp-2">{c.title}</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        {c.instructorModel === 'User' &&
                        typeof c.instructor === 'object' &&
                        c.instructor?._id ? (
                          <Link
                            to={`/instructors/${c.instructor._id}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                          >
                            {instructorName}
                          </Link>
                        ) : (
                          instructorName
                        )}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                        {c.shortDescription || c.description}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {(() => {
                            const basic = Number(
                              c.subscriptionPricing?.basic ?? c.subscriptionPricing?.month1
                            );
                            if (Number.isFinite(basic) && basic > 0) {
                              return `From GH₵${basic.toFixed(2)}/mo`;
                            }
                            return Number(c.price) === 0 ? 'Free' : `GH₵${c.price}`;
                          })()}
                        </span>
                        <Link
                          to={courseClickHref}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          View instructor
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
