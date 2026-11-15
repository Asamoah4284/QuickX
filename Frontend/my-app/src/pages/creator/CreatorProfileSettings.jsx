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
    <div className="rounded-3xl border border-line bg-ink-850 p-6">
      <h2 className="text-2xl font-semibold text-fg">Profile settings</h2>
      <p className="mt-1 text-sm text-fg-subtle">Update the details learners see on your creator-facing course pages.</p>

      {loading ? (
        <p className="mt-6 text-sm text-fg-subtle">Loading profile settings...</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm text-fg-subtle">Name</p>
            <p className="mt-2 font-semibold text-fg">{profile?.user?.fullName}</p>
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm text-fg-subtle">Headline</p>
            <p className="mt-2 font-semibold text-fg">{profile?.tutorProfile?.headline || 'No headline yet'}</p>
          </div>
          <div className="rounded-2xl border border-line p-4 md:col-span-2">
            <p className="text-sm text-fg-subtle">Bio</p>
            <p className="mt-2 text-fg-muted">{profile?.tutorProfile?.bio || 'No bio yet'}</p>
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm text-fg-subtle">Creator status</p>
            <p className="mt-2 font-semibold text-fg">{profile?.user?.creatorStatus}</p>
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm text-fg-subtle">Teaching categories</p>
            <p className="mt-2 font-semibold text-fg">
              {(profile?.tutorProfile?.teachingCategories || []).join(', ') || 'No categories selected'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
