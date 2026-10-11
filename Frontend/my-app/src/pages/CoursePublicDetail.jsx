import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { publicAssetUrl } from '../utils/publicAssetUrl';
import { savePendingCheckout } from '../utils/pendingCheckout';
import { buildSubscriptionPlans } from '../utils/creatorSubscriptionPlans';

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
          className={`h-4 w-4 ${i <= Math.round(r) ? 'text-amber-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function CheckItem({ title, subtitle }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <div className="flex flex-col">
        <span className="text-[15px] font-semibold text-gray-900 leading-snug">{title}</span>
        {subtitle && <span className="text-[14px] text-gray-500 mt-0.5 leading-snug">{subtitle}</span>}
      </div>
    </li>
  );
}

export default function CoursePublicDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchaseMode, setPurchaseMode] = useState('course');
  const [activeTab, setActiveTab] = useState('learn');

  const [subscriptionDrawerOpen, setSubscriptionDrawerOpen] = useState(false);
  const [selectedSubscriptionPlanId, setSelectedSubscriptionPlanId] = useState('premium');

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_URL}/api/courses/${courseId}/preview`)
      .then(({ data }) => {
        if (!cancelled) {
          setCourse(data);
          // If the course is free, default to membership mode.
          if (Number(data.price) === 0) {
            setPurchaseMode('membership');
          }
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

  const instructorName =
    typeof course?.instructor === 'object' && course.instructor?.fullName
      ? course.instructor.fullName
      : course?.instructor || 'Instructor';

  const plans = useMemo(() => {
    if (!course?.tutorProfile?.subscriptionPricing) return [];
    return buildSubscriptionPlans(course.tutorProfile.subscriptionPricing);
  }, [course?.tutorProfile?.subscriptionPricing]);

  const goToSubscriptionCheckout = (plan) => {
    if (!plan?.id) return;
    const token = localStorage.getItem('authToken');
    const instructorId = course.instructor?._id || course.createdBy;
    const checkoutState = {
      item: {
        type: 'creator_subscription',
        id: instructorId,
        instructorId: instructorId,
        planId: plan.id,
        title: `${instructorName}'s ${plan.label} Subscription`,
        price: plan.price,
        description: `${plan.title}`,
        image: course.instructor?.avatar || course.instructor?.profilePicture,
      },
      returnPath: `/courses/${courseId}`,
      returnTabState: null,
    };

    if (!token) {
      savePendingCheckout(checkoutState);
      navigate('/register', { state: { from: '/checkout', checkout: checkoutState } });
      return;
    }
    navigate('/checkout', { state: checkoutState });
  };

  const buy = async () => {
    if (!course) return;
    if (purchaseMode === 'membership') {
      if (plans.length > 0) {
        setSubscriptionDrawerOpen(true);
      } else {
        const instructorId = course.instructor?._id || course.createdBy;
        if (instructorId) {
          navigate(`/instructors/${instructorId}?subscribe=true`);
        } else {
          navigate('/membership');
        }
      }
      return;
    }
    const token = localStorage.getItem('authToken');

    const checkoutImageUrl = course.thumbnail
      ? publicAssetUrl(
          String(course.thumbnail).startsWith('http')
            ? String(course.thumbnail)
            : `${API_URL}${String(course.thumbnail)}`
        )
      : null;

    const checkoutState = {
      item: {
        type: 'course',
        id: course._id,
        title: course.title,
        price: course.price,
        description: course.shortDescription || course.description,
        thumbnail: course.thumbnail,
        ...(checkoutImageUrl ? { image: checkoutImageUrl } : {}),
      },
      returnPath: `/courses/${courseId}`,
      returnTabState: null,
    };

    if (!token) {
      savePendingCheckout(checkoutState);
      navigate('/register', {
        state: { from: '/checkout', checkout: checkoutState },
      });
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

    navigate('/checkout', { state: checkoutState });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pt-32 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }
  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pt-32 px-4 text-center">
        <p className="text-red-500 font-medium">{error || 'Course not found'}</p>
        <Link to="/courses" className="mt-4 inline-block text-indigo-600 font-semibold hover:underline">
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
  const reviewCount = (course.reviews || []).length;
  const rating = Number(course.averageRating) || 0;
  const students = Number(course.totalStudents) || 0;
  const typeName = TYPE_LABEL[course.courseType] || course.courseType || 'Courses';
  const currentPrice = Number(course.price) || 0;
  const outcomes = course.learningOutcomes?.length
    ? course.learningOutcomes
    : [course.shortDescription || course.description || 'Practical lessons you can apply right away.'].filter(Boolean);

  const selectedPlan = plans.find((p) => p.id === selectedSubscriptionPlanId) || plans[1] || plans[0];

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-24">
      {/* Sleek Hero Section */}
      <div className="bg-white border-b border-gray-100 pb-16 pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-12 lg:items-start relative">
          
          <div className="flex-1 lg:max-w-3xl">
            <nav className="mb-6 flex flex-wrap gap-2 text-[13px] font-medium text-gray-500 tracking-wide">
              <span className="uppercase text-indigo-600">Learning</span>
              <span>/</span>
              <span className="uppercase">{typeName}</span>
            </nav>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-[1.15]">
              {course.title}
            </h1>
            
            <p className="mt-5 text-[17px] sm:text-lg text-gray-600 leading-relaxed max-w-2xl">
              {course.subtitle || course.shortDescription || course.description?.slice(0, 200)}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                {course.instructor?.avatar || course.instructor?.profilePicture ? (
                  <img
                    src={course.instructor.avatar || course.instructor.profilePicture}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                    {instructorName.charAt(0)}
                  </div>
                )}
                <span>
                  By <Link to={`/instructors/${course.instructor?._id || course.createdBy}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition">{instructorName}</Link>
                </span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block"></div>
              <span>Updated {formatUpdated(course.updatedAt)}</span>
              <div className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block"></div>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
                {course.language || 'English'}
              </span>
            </div>

            <div className="mt-8 flex items-center gap-4">
              {rating > 0 ? (
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                  <span className="font-bold text-amber-600">{rating.toFixed(1)}</span>
                  <StarRow rating={rating} />
                  <span className="text-[13px] font-medium text-amber-700/80 ml-1">
                    {reviewCount} reviews
                  </span>
                </div>
              ) : null}
              <div className="text-[13px] font-medium text-gray-500 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                {students.toLocaleString()} learners
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex flex-col lg:flex-row gap-12 relative">
          
          {/* Main Content Area */}
          <div className="flex-1 lg:max-w-3xl">
            {message && (
              <div className="mb-8 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                {message}
              </div>
            )}
            {error && purchaseMode === 'course' && (
              <div className="mb-8 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                {error}
              </div>
            )}

            {/* Clean Tabs */}
            <div className="flex items-center gap-2 mb-8 bg-gray-100/60 p-1 rounded-full w-fit">
              <button
                onClick={() => setActiveTab('learn')}
                className={`px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all duration-200 ${
                  activeTab === 'learn' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('curriculum')}
                className={`px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all duration-200 ${
                  activeTab === 'curriculum' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Curriculum
              </button>
            </div>

            {activeTab === 'learn' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">What you'll learn</h2>
                  <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    {outcomes.slice(0, 12).map((outcome, i) => {
                      let text = String(outcome).replace(/^[•\-\t\s]+/, '');
                      const match = text.match(/^(.*?)(?:[:—\-]|\s-\s)(.*)$/);
                      let title = text;
                      let subtitle = null;
                      if (match) {
                        title = match[1].trim();
                        subtitle = match[2].trim();
                      }
                      return <CheckItem key={i} title={title} subtitle={subtitle} />;
                    })}
                  </ul>
                </section>

                <div className="grid sm:grid-cols-2 gap-12 border-t border-gray-100 pt-10">
                  <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
                    <div className="prose prose-sm text-gray-600 prose-p:leading-relaxed">
                      <p className="whitespace-pre-wrap">{course.description}</p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
                    <ul className="space-y-3">
                      {(course.requirements || []).length ? (
                        course.requirements.map((item) => (
                          <li key={item} className="flex gap-3 text-[15px] text-gray-600">
                            <span className="text-indigo-300 mt-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                            </span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[15px] text-gray-500 italic">No prerequisites listed. Beginners welcome.</li>
                      )}
                    </ul>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'curriculum' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Course Curriculum</h2>
                <div className="space-y-4">
                  {(course.modules || []).map((module, index) => (
                    <div key={`${module.title}-${index}`} className="group rounded-2xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-md hover:shadow-gray-200/50">
                      <div className="flex items-center justify-between">
                        <p className="text-[16px] font-bold text-gray-900">{module.title}</p>
                        <span className="text-[13px] font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Module {index + 1}</span>
                      </div>
                      <div className="mt-4 space-y-2.5 pl-1 border-l-2 border-gray-100 ml-2">
                        {(module.sections || []).map((section) => (
                          <div key={section._id || section.title} className="relative flex items-center justify-between pl-4 text-[14px] text-gray-700">
                            <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-200 group-hover:bg-indigo-300 transition-colors"></div>
                            <span className="font-medium">{section.title}</span>
                            <span className="text-[13px] text-gray-400 tabular-nums">
                              {(section.lessons || []).length} lessons
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Floating Premium Sidebar */}
          <aside className="lg:w-[380px] shrink-0 lg:-mt-32 z-10">
            <div className="sticky top-24 rounded-3xl bg-white border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden">
              <div className="relative aspect-video bg-gray-900 overflow-hidden group">
                {thumb ? (
                  <img src={thumb} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90" />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500">No preview image</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 group-hover:bg-gray-900/40 transition-colors cursor-pointer">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-indigo-600 shadow-xl transform transition-transform group-hover:scale-110">
                    <svg className="ml-1 h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              </div>

              <div className="p-7 space-y-6">
                
                <div className={`grid ${currentPrice > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  {currentPrice > 0 && (
                    <button
                      type="button"
                      onClick={() => setPurchaseMode('course')}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        purchaseMode === 'course' ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      {purchaseMode === 'course' && (
                        <div className="absolute top-3 right-3 text-indigo-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                        </div>
                      )}
                      <span className={`block text-[13px] font-bold mb-1 ${purchaseMode === 'course' ? 'text-indigo-600' : 'text-gray-500'}`}>One-time</span>
                      <span className="block text-xl font-bold text-gray-900">
                        {currentPrice === 0 ? 'Free' : `GH₵${currentPrice.toFixed(0)}`}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPurchaseMode('membership')}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                      purchaseMode === 'membership' ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    {purchaseMode === 'membership' && (
                      <div className="absolute top-3 right-3 text-indigo-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                      </div>
                    )}
                    <span className={`block text-[13px] font-bold mb-1 ${purchaseMode === 'membership' ? 'text-indigo-600' : 'text-gray-500'}`}>Subscribe</span>
                    <span className="block text-xl font-bold text-gray-900">Plans</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={buy}
                    className="w-full rounded-2xl bg-gray-900 py-4 text-[15px] font-bold text-white shadow-xl shadow-gray-900/20 transition-transform active:scale-[0.98] hover:bg-gray-800"
                  >
                    {purchaseMode === 'membership'
                      ? 'Explore Plans'
                      : 'Start Learning Now'}
                  </button>
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-[14px] text-gray-600 mt-4">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    <span>Full lifetime access</span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px] text-gray-600">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>{course.certificateEnabled ? 'Certificate of completion' : 'No certificate included'}</span>
                  </div>
                </div>

              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* Subscription Drawer Modal */}
      {subscriptionDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSubscriptionDrawerOpen(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Subscribe to {instructorName}</h2>
              <p className="text-gray-500 mt-2">Get access to this course and many other perks.</p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedSubscriptionPlanId(plan.id)}
                  className={`cursor-pointer border-2 rounded-2xl p-5 transition-all ${
                    selectedSubscriptionPlanId === plan.id
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-1 ring-indigo-600'
                      : 'border-gray-100 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-[13px] font-bold text-indigo-600 uppercase tracking-wide mb-2">{plan.label}</div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">GH₵{plan.price.toFixed(0)}</div>
                  <div className="text-[13px] text-gray-500 mb-4">{plan.periodNote}</div>
                  <ul className="space-y-2">
                    {(plan.benefitLabels || []).map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-gray-700">
                        <svg className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                        <span className="leading-tight">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <button
              onClick={() => goToSubscriptionCheckout(selectedPlan)}
              className="w-full rounded-2xl bg-indigo-600 py-4 text-[15px] font-bold text-white shadow-xl shadow-indigo-600/20 transition-transform active:scale-[0.98] hover:bg-indigo-700"
            >
              Continue with {selectedPlan?.label} Plan
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
