import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import { setCurrencySettings } from '../../utils/currencyStore';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreatorSettings() {
  const adminToken =
    localStorage.getItem('adminToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token');
  const [settings, setSettings] = useState({
    commissionRate: 15,
    courseAutoApproval: false,
    creatorAutoApproval: false,
    defaultCurrency: localStorage.getItem('quickx_currency') || 'USD',
    exchangeRateUsdToGhs: localStorage.getItem('quickx_exchange_rate') || '15.5',
  });
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '' });
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadPage = async () => {
    try {
      const [settingsResponse, categoriesResponse] = await Promise.all([
        axios.get(`${API_URL}/api/admin/platform/settings`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        axios.get(`${API_URL}/api/admin/platform/categories`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);

      const backendSettings = settingsResponse.data || {};
      const savedCurrency = localStorage.getItem('quickx_currency');
      const savedRate = localStorage.getItem('quickx_exchange_rate');

      setSettings((prev) => ({
        ...prev,
        ...backendSettings,
        defaultCurrency: backendSettings.defaultCurrency || savedCurrency || prev.defaultCurrency || 'USD',
        exchangeRateUsdToGhs: backendSettings.exchangeRateUsdToGhs != null
          ? String(backendSettings.exchangeRateUsdToGhs)
          : (savedRate || prev.exchangeRateUsdToGhs || '15.5'),
      }));
      setCategories(categoriesResponse.data || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const handleCurrencyChange = (curr) => {
    setSettings((current) => ({ ...current, defaultCurrency: curr }));
    const parsedRate = parseFloat(settings.exchangeRateUsdToGhs);
    const safeRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 15.5;
    setCurrencySettings({
      currency: curr,
      exchangeRateUsdToGhs: safeRate,
    });
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const parsedRate = parseFloat(settings.exchangeRateUsdToGhs);
      const safeRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 15.5;
      const safeCurrency = settings.defaultCurrency === 'GHS' ? 'GHS' : 'USD';

      const payload = {
        commissionRate: Number(settings.commissionRate) || 0,
        courseAutoApproval: Boolean(settings.courseAutoApproval),
        creatorAutoApproval: Boolean(settings.creatorAutoApproval),
        defaultCurrency: safeCurrency,
        exchangeRateUsdToGhs: safeRate,
      };

      const { data } = await axios.put(`${API_URL}/api/admin/platform/settings`, payload, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      setSettings((prev) => ({
        ...prev,
        ...(data || {}),
        defaultCurrency: data?.defaultCurrency || payload.defaultCurrency,
        exchangeRateUsdToGhs: data?.exchangeRateUsdToGhs != null
          ? String(data.exchangeRateUsdToGhs)
          : String(payload.exchangeRateUsdToGhs),
      }));

      setCurrencySettings({
        currency: data?.defaultCurrency || payload.defaultCurrency,
        exchangeRateUsdToGhs: data?.exchangeRateUsdToGhs != null
          ? data.exchangeRateUsdToGhs
          : payload.exchangeRateUsdToGhs,
      });

      setMessage('Platform settings saved successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
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

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                Platform Currency &amp; Pricing
              </h3>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Default Display Currency
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('USD')}
                    className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-sm font-semibold transition ${
                      (settings.defaultCurrency || 'USD') === 'USD'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base font-bold">$</span>
                    USD (United States Dollar)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('GHS')}
                    className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-sm font-semibold transition ${
                      settings.defaultCurrency === 'GHS'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base font-bold">GH₵</span>
                    GHS (Ghana Cedi)
                  </button>
                </div>

                <label className="block text-sm text-slate-600 mt-3">
                  Conversion Rate (1 USD to GHS)
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={settings.exchangeRateUsdToGhs ?? ''}
                    onChange={(event) => {
                      const val = event.target.value;
                      setSettings((current) => ({
                        ...current,
                        exchangeRateUsdToGhs: val,
                      }));
                    }}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. 15.50"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400">Quick presets:</span>
                  {[14.5, 15.0, 15.5, 16.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSettings((current) => ({ ...current, exchangeRateUsdToGhs: String(rate) }))}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
                    >
                      {rate.toFixed(1)}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 leading-relaxed">
                  <p className="font-semibold text-blue-950 mb-1">How this works:</p>
                  {(settings.defaultCurrency || 'USD') === 'USD' ? (
                    <span>
                      Storefront, books, and course prices display in <strong>USD ($)</strong>. At checkout, Paystack converts the charge to <strong>GH₵{(10 * (parseFloat(settings.exchangeRateUsdToGhs) || 15.5)).toFixed(2)}</strong> for a $10.00 purchase so mobile money and local cards work smoothly.
                    </span>
                  ) : (
                    <span>
                      Prices across the platform and checkout display and charge directly in <strong>Ghana Cedis (GH₵)</strong>.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={saveSettings}
              className="w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {isSaving ? 'Saving settings...' : 'Save settings'}
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
