import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

/** Public course detail using preview API (no purchase required to view). */
export default function CoursePublicDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const buy = () => {
    if (!course) return;
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { state: { from: `/courses/${courseId}` } });
      return;
    }
    navigate('/checkout', {
      state: {
        item: {
          type: 'course',
          id: course._id,
          title: course.title,
          price: course.price,
          description: course.shortDescription || course.description
        },
        returnPath: '/courses',
        returnTabState: null
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (error || !course) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <p className="text-red-600">{error || 'Course not found'}</p>
        <Link to="/courses" className="text-blue-600 mt-4 inline-block">Back to courses</Link>
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <Link to="/courses" className="text-sm text-blue-600 hover:underline">← All courses</Link>
        {thumb && (
          <img src={thumb} alt="" className="mt-4 w-full rounded-xl object-cover max-h-64" />
        )}
        <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white">{course.title}</h1>
        <p className="text-slate-500 mt-1">{instructorName} · {course.courseType} · {course.level}</p>
        <p className="mt-4 text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{course.description}</p>
        <div className="mt-8 flex flex-wrap gap-4 items-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {Number(course.price) === 0 ? 'Free' : `GH₵${course.price}`}
          </span>
          <button
            type="button"
            onClick={buy}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 font-medium"
          >
            {Number(course.price) === 0 ? 'Get access' : 'Buy now'}
          </button>
          <Link
            to={`/school/course/${course._id}`}
            className="text-sm text-slate-600 underline"
          >
            Open in school player (after purchase)
          </Link>
        </div>
      </div>
    </div>
  );
}
