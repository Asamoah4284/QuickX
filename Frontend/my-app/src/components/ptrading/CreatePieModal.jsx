import React, { useState } from 'react';
import axios from 'axios';
import {
  FiX,
  FiPieChart,
  FiTrendingUp,
  FiShield,
  FiPercent,
  FiCalendar,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';

const MARKETS = [
  { value: 'crypto', label: 'Crypto', pairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'] },
  { value: 'forex', label: 'Forex', pairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'] },
  { value: 'commodities', label: 'Commodities', pairs: ['XAU/USD (Gold)', 'XAG/USD (Silver)', 'USOIL (Crude)'] },
  { value: 'stocks', label: 'Stocks & Indices', pairs: ['US30 (Dow)', 'NAS100 (Nasdaq)', 'SPX500', 'GER40'] },
];

export default function CreatePieModal({
  isOpen,
  onClose,
  onSuccess,
  defaultTutorId = null,
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    market: 'crypto',
    pair: 'BTC/USDT',
    targetAmount: 1000,
    minDeposit: 20,
    maxDeposit: 1000,
    targetRoiPercent: 25,
    maxLossPercent: 10,
    ownerFeePercent: 15,
    riskLevel: 'Moderate',
    fundingDeadlineDays: 2,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');

  if (!isOpen) return null;

  const currentMarket = MARKETS.find((m) => m.value === formData.market) || MARKETS[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // If market changed, pick first pair of that market
      if (name === 'market') {
        const m = MARKETS.find((mk) => mk.value === value);
        if (m && m.pairs.length > 0) {
          updated.pair = m.pairs[0];
        }
      }
      return updated;
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Please provide a title for this Trading Pie.');
      return;
    }
    if (!formData.pair.trim()) {
      setError('Please select or specify a trading pair.');
      return;
    }
    if (!formData.targetAmount || Number(formData.targetAmount) <= 0) {
      setError('Please specify a positive target pool amount.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Compute deadline date
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (parseInt(formData.fundingDeadlineDays) || 2));

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        market: formData.market,
        pair: formData.pair.trim(),
        targetAmount: Number(formData.targetAmount),
        minDeposit: Number(formData.minDeposit) || 10,
        maxDeposit: Number(formData.maxDeposit) || Number(formData.targetAmount),
        targetRoiPercent: Number(formData.targetRoiPercent) || 20,
        maxLossPercent: Number(formData.maxLossPercent) || 10,
        ownerFeePercent: Number(formData.ownerFeePercent) || 15,
        riskLevel: formData.riskLevel,
        fundingDeadline: deadline.toISOString(),
        tutorId: defaultTutorId || undefined,
      };

      const res = await axios.post(`${API_URL}/api/ptrading`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setSuccessMsg('Trading Pie successfully published for community funding!');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data.pie);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Create Pie error:', err);
      setError(err.response?.data?.message || 'Failed to create Trading Pie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <FiPieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Launch a New Trading Pie</h3>
              <p className="text-xs text-blue-200">
                Create a Partner pool for your community to buy slices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Pie Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. BTC Bullish Halving Breakout Pool"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Trading Strategy & Notes
            </label>
            <textarea
              name="description"
              rows="2"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your trade thesis, technical setup, and execution plan..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          {/* Market & Pair */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Market
              </label>
              <select
                name="market"
                value={formData.market}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              >
                {MARKETS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Asset Pair
              </label>
              <select
                name="pair"
                value={formData.pair}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              >
                {currentMarket.pairs.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Amount & Min Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Target Pool Amount (GH₵) *
              </label>
              <input
                type="number"
                name="targetAmount"
                min="50"
                step="50"
                value={formData.targetAmount}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Min Deposit / Slice (GH₵)
              </label>
              <input
                type="number"
                name="minDeposit"
                min="5"
                step="5"
                value={formData.minDeposit}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Conditions: Target ROI %, Max Loss %, Owner Fee % */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Trading Conditions & Safeguards
            </span>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 mb-1 flex items-center gap-1">
                  <FiTrendingUp className="w-3 h-3" /> Target ROI
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="targetRoiPercent"
                    min="1"
                    max="1000"
                    value={formData.targetRoiPercent}
                    onChange={handleChange}
                    className="w-full px-2.5 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-700 mb-1 flex items-center gap-1">
                  <FiShield className="w-3 h-3" /> Stop Loss
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="maxLossPercent"
                    min="1"
                    max="100"
                    value={formData.maxLossPercent}
                    onChange={handleChange}
                    className="w-full px-2.5 py-2 bg-white border border-rose-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 text-xs"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-700 mb-1 flex items-center gap-1">
                  <FiPercent className="w-3 h-3" /> Performance Fee
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="ownerFeePercent"
                    min="0"
                    max="50"
                    value={formData.ownerFeePercent}
                    onChange={handleChange}
                    className="w-full px-2.5 py-2 bg-white border border-indigo-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              * If the trade wins, you receive {formData.ownerFeePercent}% performance fee from the profits. If the trade loses, you receive 0% and capital is safeguarded at max {formData.maxLossPercent}% loss.
            </p>
          </div>

          {/* Funding Window & Risk Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
                <FiCalendar className="w-3.5 h-3.5" /> Funding Window
              </label>
              <select
                name="fundingDeadlineDays"
                value={formData.fundingDeadlineDays}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="1">24 Hours</option>
                <option value="2">48 Hours (2 Days)</option>
                <option value="3">3 Days</option>
                <option value="7">7 Days (1 Week)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Risk Classification
              </label>
              <select
                name="riskLevel"
                value={formData.riskLevel}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Low">Low Risk</option>
                <option value="Moderate">Moderate Risk</option>
                <option value="High">High Risk / Degen</option>
              </select>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
              <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <FiCheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 px-6 rounded-2xl text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition flex items-center justify-center gap-2 ${
                submitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 active:scale-[0.98]'
              }`}
            >
              {submitting ? 'Publishing Pie...' : '🚀 Launch Pie & Open Funding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
