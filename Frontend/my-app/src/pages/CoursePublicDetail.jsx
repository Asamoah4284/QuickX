import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { publicAssetUrl } from '../utils/publicAssetUrl';
import { savePendingCheckout } from '../utils/pendingCheckout';

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

  /**
   * This route should not be a standalone page.
   * Any visit to `/courses/:courseId` redirects to the instructor profile.
   */
  useEffect(() => {
    if (loading) return;
    if (!course) return;

    const instructorUserId =
      course.instructorModel === 'User' &&
      typeof course.instructor === 'object' &&
      course.instructor?._id
        ? String(course.instructor._id)
        : null;
    const instructorPathId = instructorUserId || (course.createdBy ? String(course.createdBy) : null);

    if (instructorPathId) {
      navigate(`/instructors/${instructorPathId}`, {
        replace: true,
        state: { openSubscribe: true, sourceCourseId: String(courseId || '') },
      });
      return;
    }

    navigate('/courses', { replace: true });
  }, [course, courseId, loading, navigate]);

  const buy = async () => {
    if (!course) return;
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
      <div className="min-h-screen bg-white pt-24" aria-busy="true">
        <p className="text-center text-sm text-gray-500">Redirecting…</p>
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

  // Redirect effect above will navigate away; render nothing.
  return null;
}
