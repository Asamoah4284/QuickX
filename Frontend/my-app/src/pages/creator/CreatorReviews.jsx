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
    <div className="rounded-3xl border border-line bg-ink-850 p-6">
      <h2 className="text-2xl font-semibold text-fg">Reviews</h2>
      <p className="mt-1 text-sm text-fg-subtle">Monitor learner sentiment and course quality feedback.</p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-fg-subtle">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-sm text-fg-subtle">No reviews yet.</div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-fg">{review.studentId?.fullName || 'Student'}</p>
                  <p className="text-sm text-fg-subtle">{review.courseId?.title || 'Course'}</p>
                </div>
                <p className="text-sm font-semibold text-warn">{review.rating}/5</p>
              </div>
              <p className="mt-3 text-sm text-fg-muted">{review.comment || 'No written review provided.'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
