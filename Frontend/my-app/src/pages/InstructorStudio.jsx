import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const emptyForm = {
  title: '',
  description: '',
  shortDescription: '',
  price: 0,
  level: 'beginner',
  courseType: 'forex',
  category: ''
};

export default function InstructorStudio() {
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);

  const token = localStorage.getItem('authToken');

  const load = async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [cRes, pRes] = await Promise.all([
      axios.get(`${API_URL}/api/instructor/courses`, { headers }),
      axios.get(`${API_URL}/api/users/me/programs`, { headers }).catch(() => ({ data: [] }))
    ]);
    setCourses(cRes.data || []);
    setPrograms(Array.isArray(pRes.data) ? pRes.data : []);
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    load()
      .catch((e) => setMessage(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await axios.post(
        `${API_URL}/api/instructor/courses`,
        {
          ...form,
          modules: []
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForm(emptyForm);
      setMessage('Draft created.');
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async (id) => {
    setMessage('');
    try {
      await axios.post(
        `${API_URL}/api/instructor/courses/${id}/submit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Submitted for admin review.');
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Instructor studio</h1>
        <p className="text-slate-600 dark:text-slate-300 mt-1">
          Create drafts, then submit for review. You need an active creator program enrollment for each track.
        </p>

        <section className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">Your program enrollments</h2>
          {programs.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">
              None yet.{' '}
              <Link to="/programs" className="text-blue-600 hover:underline">Browse creator programs</Link>.
            </p>
          ) : (
            <ul className="mt-2 text-sm text-slate-700 dark:text-slate-200 space-y-1">
              {programs.map((e) => (
                <li key={e._id}>
                  {e.programId?.name || 'Program'} — <span className="text-slate-500">{e.programId?.courseType}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={handleCreate} className="mt-8 space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="font-semibold text-lg text-slate-900 dark:text-white">New course draft</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
            <input name="title" value={form.title} onChange={handleChange} required className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white px-3 py-2 text-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Short description</label>
            <input name="shortDescription" value={form.shortDescription} onChange={handleChange} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full description</label>
            <textarea name="description" value={form.description} onChange={handleChange} required rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Price (GHS)</label>
              <input type="number" name="price" min={0} value={form.price} onChange={handleChange} className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Level</label>
              <select name="level" value={form.level} onChange={handleChange} className="mt-1 w-full rounded-md border px-3 py-2">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Track</label>
              <select name="courseType" value={form.courseType} onChange={handleChange} className="mt-1 w-full rounded-md border px-3 py-2">
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
                <option value="webdev">Web development</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Category (optional)</label>
            <input name="category" value={form.category} onChange={handleChange} placeholder="e.g. Strategy" className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>
          {message && <p className="text-sm text-blue-600 dark:text-blue-400">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create draft'}
          </button>
        </form>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your courses</h2>
          {loading ? (
            <p className="text-slate-500 mt-2">Loading…</p>
          ) : courses.length === 0 ? (
            <p className="text-slate-500 mt-2">No drafts yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {courses.map((c) => (
                <li
                  key={c._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{c.title}</p>
                    <p className="text-xs text-slate-500">
                      Status: {c.listingStatus} · {c.courseType}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/school/course/${c._id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Open
                    </Link>
                    {(c.listingStatus === 'draft' || c.listingStatus === 'rejected') && (
                      <button
                        type="button"
                        onClick={() => handleSubmitForReview(c._id)}
                        className="text-sm rounded-md bg-slate-800 text-white px-3 py-1"
                      >
                        Submit for review
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
