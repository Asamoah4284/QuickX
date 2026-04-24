import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreatorReviews() {
  const token = localStorage.getItem('authToken');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/instructor/courses/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => setReviews(data))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6">
      <h2 className="text-2xl font-semibold text-slate-950">Reviews</h2>
      <p className="mt-1 text-sm text-slate-500">Monitor learner sentiment and course quality feedback.</p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">No reviews yet.</div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{review.studentId?.fullName || 'Student'}</p>
                  <p className="text-sm text-slate-500">{review.courseId?.title || 'Course'}</p>
                </div>
                <p className="text-sm font-semibold text-amber-600">{review.rating}/5</p>
              </div>
              <p className="mt-3 text-sm text-slate-600">{review.comment || 'No written review provided.'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
