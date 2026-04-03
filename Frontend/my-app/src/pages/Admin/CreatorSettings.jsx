import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreatorSettings() {
  const adminToken = localStorage.getItem('adminToken');
  const [settings, setSettings] = useState({
    commissionRate: 15,
    courseAutoApproval: false,
    creatorAutoApproval: false,
  });
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '' });
  const [message, setMessage] = useState('');

  const loadPage = async () => {
    const [settingsResponse, categoriesResponse] = await Promise.all([
      axios.get(`${API_URL}/api/admin/platform/settings`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
      axios.get(`${API_URL}/api/admin/platform/categories`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    ]);

    setSettings(settingsResponse.data);
    setCategories(categoriesResponse.data);
  };

  useEffect(() => {
    loadPage();
  }, []);

  const saveSettings = async () => {
    const { data } = await axios.put(`${API_URL}/api/admin/platform/settings`, settings, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    setSettings(data);
    setMessage('Platform settings saved.');
  };

  const saveCategory = async () => {
    await axios.post(`${API_URL}/api/admin/platform/categories`, newCategory, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    setNewCategory({ name: '', slug: '', description: '' });
    setMessage('Category created.');
    loadPage();
  };

  return (
    <>
      <AdminSectionHeader
        title="Creator platform settings"
        description="Control commissions, creator auto-approval, course auto-approval, and the category system used by the creator workflow."
      />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-gray-900 shadow-sm">
          <h2 className="text-xl font-semibold">Revenue and approval controls</h2>
          {message ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          ) : null}
          <div className="mt-5 space-y-4">
            <label className="block text-sm text-slate-600">
              Commission rate (%)
              <input
                type="number"
                min="0"
                max="100"
                value={settings.commissionRate}
                onChange={(event) => setSettings((current) => ({ ...current, commissionRate: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-gray-900 shadow-sm"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.courseAutoApproval}
                onChange={(event) => setSettings((current) => ({ ...current, courseAutoApproval: event.target.checked }))}
              />
              Allow approved creators to publish courses without admin review
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.creatorAutoApproval}
                onChange={(event) => setSettings((current) => ({ ...current, creatorAutoApproval: event.target.checked }))}
              />
              Auto-approve creator applications
            </label>

            <button
              type="button"
              onClick={saveSettings}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save settings
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-gray-900 shadow-sm">
          <h2 className="text-xl font-semibold">Course categories</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <input
              value={newCategory.name}
              onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
              placeholder="Name"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
            />
            <input
              value={newCategory.slug}
              onChange={(event) => setNewCategory((current) => ({ ...current, slug: event.target.value }))}
              placeholder="Slug"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
            />
            <input
              value={newCategory.description}
              onChange={(event) => setNewCategory((current) => ({ ...current, description: event.target.value }))}
              placeholder="Description"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={saveCategory}
            className="mt-4 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Add category
          </button>

          <div className="mt-6 space-y-3">
            {categories.map((category) => (
              <div key={category._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-gray-900">{category.name}</p>
                <p className="mt-1 text-sm text-slate-500">{category.slug}</p>
                <p className="mt-2 text-sm text-slate-600">{category.description || 'No description provided'}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
