import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

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

/** Udemy-style public course / purchase page */
export default function CoursePublicDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchaseMode, setPurchaseMode] = useState('course');

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

    navigate('/checkout', {
      state: {
        item: {
          type: 'course',
          id: course._id,
          title: course.title,
          price: course.price,
          description: course.shortDescription || course.description,
        },
        returnPath: '/courses',
        returnTabState: null,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] bg-[#1c1d1f] pt-28 flex justify-center">
        <p className="text-gray-400">Loading…</p>
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

  const thumb = course.thumbnail?.startsWith('http')
    ? course.thumbnail
    : course.thumbnail
      ? `${API_URL}${course.thumbnail}`
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

      {/* Overlapping layout: main + floating sidebar */}
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 -mt-12 grid gap-8 sm:-mt-16 lg:-mt-20 lg:grid-cols-[1fr_380px] lg:gap-10">
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
              <h2 className="text-xl font-bold text-gray-900">Curriculum</h2>
              <div className="mt-5 space-y-4">
                {(course.modules || []).map((module, index) => (
                  <div key={`${module.title}-${index}`} className="rounded-lg border border-gray-200 p-4">
                    <p className="font-semibold text-gray-900">{module.title}</p>
                    <div className="mt-3 space-y-2">
                      {(module.sections || []).map((section) => (
                        <div key={section._id || section.title} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          {section.title}{' '}
                          <span className="text-gray-400">
                            ({(section.lessons || []).length} lessons)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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

          {/* Floating purchase card — Udemy sidebar */}
          <aside className="lg:-mt-[200px] xl:-mt-[220px]">
            <div className="sticky top-24 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,.12)]">
              <div className="relative aspect-video bg-black">
                {thumb ? (
                  <img src={thumb} alt="" className="h-full w-full object-cover opacity-90" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-900 text-gray-500">No preview image</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-blue-600 shadow-lg">
                    <svg className="ml-1 h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>
                <p className="absolute bottom-3 left-4 text-sm font-bold text-white drop-shadow-md">
                  Preview this course
                </p>
              </div>

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

    </div>
  );
}
