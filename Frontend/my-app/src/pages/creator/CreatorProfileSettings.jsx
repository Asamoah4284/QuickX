import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreatorProfileSettings() {
  const token = localStorage.getItem('authToken');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/users/creator/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => setProfile(data))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-creator">
      <h2 className="text-2xl font-semibold text-slate-950">Profile settings</h2>
      <p className="mt-1 text-sm text-slate-500">Update the details learners see on your creator-facing course pages.</p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading profile settings...</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Name</p>
            <p className="mt-2 font-semibold text-slate-950">{profile?.user?.fullName}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Headline</p>
            <p className="mt-2 font-semibold text-slate-950">{profile?.tutorProfile?.headline || 'No headline yet'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2">
            <p className="text-sm text-slate-500">Bio</p>
            <p className="mt-2 text-slate-700">{profile?.tutorProfile?.bio || 'No bio yet'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Creator status</p>
            <p className="mt-2 font-semibold text-slate-950">{profile?.user?.creatorStatus}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Teaching categories</p>
            <p className="mt-2 font-semibold text-slate-950">
              {(profile?.tutorProfile?.teachingCategories || []).join(', ') || 'No categories selected'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
