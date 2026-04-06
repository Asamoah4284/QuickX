import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiArchive,
  FiCopy,
  FiEdit3,
  FiEye,
  FiMoreHorizontal,
  FiSend,
  FiTrash2,
  FiToggleLeft,
} from 'react-icons/fi';
import StatusBadge from '../../components/creator/StatusBadge';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL;

const filterOptions = ['all', 'published', 'draft', 'under_review', 'rejected', 'archived'];

function courseThumbnailUrl(course) {
  const t = course?.thumbnail;
  if (!t) return null;
  const resolved =
    typeof t === 'string' && (t.startsWith('http://') || t.startsWith('https://'))
      ? t
      : `${API_URL}${String(t).startsWith('/') ? t : `/${t}`}`;
  return publicAssetUrl(resolved);
}

function CourseThumb({ url }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-medium text-slate-400">
        No image
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function CreatorCourses({ statusFilter = 'all' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState(statusFilter);
  const [message, setMessage] = useState('');

  const pageTitle = useMemo(() => {
    if (location.pathname.endsWith('/drafts')) return 'Drafts';
    return 'My Courses';
  }, [location.pathname]);

  const loadCourses = () => {
    setLoading(true);
    axios
      .get(`${API_URL}/api/instructor/courses`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: activeFilter },
      })
      .then(({ data }) => {
        setCourses(data);
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || requestError.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCourses();
  }, [activeFilter]);

  const runAction = async (courseId, action, body = {}) => {
    try {
      setMessage('');
      const method = action === 'delete' ? 'delete' : 'post';
      const url =
        action === 'delete'
          ? `${API_URL}/api/instructor/courses/${courseId}`
          : `${API_URL}/api/instructor/courses/${courseId}/${action}`;

      await axios({
        method,
        url,
        data: body,
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage(`Course ${action.replace('-', ' ')} successful.`);
      loadCourses();
    } catch (actionError) {
      setError(actionError.response?.data?.message || actionError.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-creator">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{pageTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage drafts, live courses, moderation states, pricing, and revisions from one place.
            </p>
          </div>
          <Link
            to="/creator/dashboard/courses/new"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Create course
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setActiveFilter(option)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                activeFilter === option
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.replace('_', ' ')}
            </button>
          ))}
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-creator">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading courses…</div>
        ) : courses.length === 0 ? (
          <div className="m-6 rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            No courses found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 pl-5">Course</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Students</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="hidden lg:table-cell px-3 py-3 text-right">Rating</th>
                  <th className="hidden md:table-cell px-3 py-3 text-right">Revenue</th>
                  <th className="px-3 py-3 whitespace-nowrap">Updated</th>
                  <th className="px-4 py-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((course) => {
                  const thumb = courseThumbnailUrl(course);
                  const students = course.totalEnrollments ?? course.totalStudents ?? 0;
                  const priceLabel =
                    course.pricingType === 'free' || Number(course.price) === 0
                      ? 'Free'
                      : `GH₵${Number(course.price).toLocaleString()}`;
                  const revenue = Number(course.totalRevenue || 0).toFixed(2);
                  const rating = course.averageRating ?? 0;

                  return (
                    <tr
                      key={course._id}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      <td className="py-4 pl-5 pr-2">
                        <div className="flex max-w-md items-start gap-3">
                          <div className="relative h-14 w-[5.5rem] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            <CourseThumb url={thumb} />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <p className="line-clamp-2 font-semibold leading-snug text-slate-900">
                              {course.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {course.category || course.courseType || 'Course'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 align-middle">
                        <StatusBadge status={course.listingStatus} />
                      </td>
                      <td className="px-3 py-4 text-right tabular-nums text-slate-700">{students}</td>
                      <td className="px-3 py-4 text-right font-medium tabular-nums text-slate-800">
                        {priceLabel}
                      </td>
                      <td className="hidden lg:table-cell px-3 py-4 text-right tabular-nums text-slate-600">
                        {rating}
                      </td>
                      <td className="hidden md:table-cell px-3 py-4 text-right tabular-nums text-slate-600">
                        GH₵{revenue}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-slate-600">
                        {new Date(course.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-4 pr-5 pl-2">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/creator/dashboard/courses/${course._id}/edit`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <FiEdit3 className="h-3.5 w-3.5" aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/courses/${course._id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                          >
                            <FiEye className="h-3.5 w-3.5" aria-hidden />
                            Preview
                          </button>

                          <details className="group relative">
                            <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                              <FiMoreHorizontal className="h-4 w-4" aria-hidden />
                              <span className="sr-only">More actions</span>
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => runAction(course._id, 'duplicate')}
                              >
                                <FiCopy className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                Duplicate
                              </button>
                              {['draft', 'rejected', 'published'].includes(course.listingStatus) ? (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => runAction(course._id, 'submit')}
                                >
                                  <FiSend className="h-4 w-4 shrink-0" aria-hidden />
                                  Submit for review
                                </button>
                              ) : null}
                              {course.listingStatus === 'published' ? (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-50"
                                  onClick={() => runAction(course._id, 'unpublish')}
                                >
                                  <FiToggleLeft className="h-4 w-4 shrink-0" aria-hidden />
                                  Unpublish
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => runAction(course._id, 'archive')}
                              >
                                <FiArchive className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                Archive
                              </button>
                              <div className="my-1 border-t border-slate-100" />
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      'Delete this course permanently? This cannot be undone.'
                                    )
                                  ) {
                                    runAction(course._id, 'delete');
                                  }
                                }}
                              >
                                <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
                                Delete
                              </button>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
