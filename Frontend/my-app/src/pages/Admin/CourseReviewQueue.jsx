import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import StatusBadge from '../../components/creator/StatusBadge';

const API_URL = import.meta.env.VITE_API_URL;

export default function CourseReviewQueue() {
  const adminToken = localStorage.getItem('adminToken');
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState('');

  const loadQueue = () => {
    axios
      .get(`${API_URL}/api/admin/courses/review-queue/list`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      .then(({ data }) => setCourses(data));
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const reviewCourse = async (courseId, action) => {
    await axios.patch(
      `${API_URL}/api/admin/courses/${courseId}/listing-review`,
      { action },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    setMessage(`Course ${action}d successfully.`);
    loadQueue();
  };

  return (
    <>
      <AdminSectionHeader
        title="Course review queue"
        description="Review creator-submitted courses, approve quality landing pages, and reject listings that need fixes."
      />
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-gray-900 shadow-sm">
        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{course.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {course.createdBy?.fullName || 'Creator'} · {course.category || course.courseType}
                  </p>
                </div>
                <StatusBadge status={course.listingStatus} />
              </div>

              <p className="mt-4 text-sm text-slate-600">{course.shortDescription || course.description}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => reviewCourse(course._id, 'approve')} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
                  Approve
                </button>
                <button type="button" onClick={() => reviewCourse(course._id, 'reject')} className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white">
                  Reject
                </button>
              </div>
            </div>
          ))}

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
              No creator courses are waiting for review.
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
