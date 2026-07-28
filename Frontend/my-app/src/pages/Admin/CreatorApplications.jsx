import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import StatusBadge from '../../components/creator/StatusBadge';

const API_URL = import.meta.env.VITE_API_URL;

function PricingEditor({ application, onSaved }) {
  const adminToken = localStorage.getItem('adminToken');
  const sp = application.subscriptionPricing || {};
  const [pricing, setPricing] = useState({
    basic: Number(sp.basic ?? sp.month1 ?? 49),
    premium: Number(sp.premium ?? sp.premiumPlus ?? sp.month3 ?? 99),
    diamond: Number(sp.diamond ?? sp.year1 ?? 599),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const next = application.subscriptionPricing || {};
    setPricing({
      basic: Number(next.basic ?? next.month1 ?? 49),
      premium: Number(next.premium ?? next.premiumPlus ?? next.month3 ?? 99),
      diamond: Number(next.diamond ?? next.year1 ?? 599),
    });
  }, [application._id, application.subscriptionPricing]);

  const save = async () => {
    try {
      setSaving(true);
      setError('');
      await axios.patch(
        `${API_URL}/api/admin/tutors/applications/${application._id}/subscription-pricing`,
        {
          subscriptionPricing: {
            basic: pricing.basic,
            premium: pricing.premium,
            diamond: pricing.diamond,
          },
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      onSaved?.('Subscription prices updated.');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">Subscription plan prices (GHS)</p>
      <p className="mt-1 text-xs text-slate-500">
        Basic, Premium, and Diamond — feature tiers students can buy.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[
          { key: 'basic', label: 'Basic (1 mo · videos)' },
          { key: 'premium', label: 'Premium (1 mo · full access)' },
          { key: 'diamond', label: 'Diamond (1 yr · mentorship)' },
        ].map((field) => (
          <label key={field.key} className="text-xs text-slate-600">
            {field.label}
            <input
              type="number"
              min="0"
              value={pricing[field.key]}
              onChange={(e) => setPricing((c) => ({ ...c, [field.key]: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save prices'}
      </button>
    </div>
  );
}

export default function CreatorApplications() {
  const adminToken = localStorage.getItem('adminToken');
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadApplications = () => {
    setLoadError('');
    axios
      .get(`${API_URL}/api/admin/tutors/applications`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        params: { status: filter },
      })
      .then(({ data }) => setApplications(Array.isArray(data) ? data : []))
      .catch((err) => {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to load applications';
        setLoadError(msg);
        setApplications([]);
      });
  };

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const reviewApplication = async (id, action) => {
    await axios.patch(
      `${API_URL}/api/admin/tutors/applications/${id}/review`,
      { action },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    setMessage(`Application ${action}d successfully.`);
    loadApplications();
  };

  return (
    <>
      <AdminSectionHeader
        title="Tutor applications"
        description="Review creator onboarding submissions, set subscription access prices, and approve instructors before they go live."
      />
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-gray-900 shadow-sm">
        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {['all', 'draft', 'pending', 'approved', 'rejected', 'suspended'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors border ${
                filter === status
                  ? 'border-slate-900 bg-white text-slate-900 shadow-sm'
                  : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {loadError ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {loadError}
          </div>
        ) : null}

        <div className="space-y-4">
          {applications.map((application) => (
            <div
              key={application._id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{application.user?.fullName}</p>
                  <p className="mt-1 text-sm text-slate-500">{application.user?.email}</p>
                  <p className="mt-3 text-sm text-slate-600">
                    {application.headline || 'No headline submitted yet.'}
                  </p>
                </div>
                <StatusBadge status={application.applicationStatus} />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Experience</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {application.experienceYears || 0} years
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Teaching categories</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {(application.teachingCategories || []).join(', ') || 'Not selected'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Languages</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {(application.languages || []).join(', ') || 'Not provided'}
                  </p>
                </div>
              </div>

              <PricingEditor
                application={application}
                onSaved={(msg) => {
                  setMessage(msg);
                  loadApplications();
                }}
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => reviewApplication(application._id, 'approve')}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => reviewApplication(application._id, 'reject')}
                  className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => reviewApplication(application._id, 'suspend')}
                  className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Suspend
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
