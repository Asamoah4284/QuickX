import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreatorStudents() {
  const token = localStorage.getItem('authToken');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/instructor/courses/students`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => setStudents(data))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-creator">
      <h2 className="text-2xl font-semibold text-slate-950">Students</h2>
      <p className="mt-1 text-sm text-slate-500">See who is enrolled in your courses and how far they have progressed.</p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading student data...</p>
        ) : students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">No enrolled students yet.</div>
        ) : (
          students.map((item) => (
            <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="font-semibold text-slate-950">{item.studentId?.fullName || 'Student'}</p>
                <p className="mt-1 text-sm text-slate-500">{item.courseId?.title || 'Course'}</p>
              </div>
              <p className="text-sm font-medium text-slate-600">{item.progressPercent || 0}% complete</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
