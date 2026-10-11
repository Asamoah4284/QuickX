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
  FiZap,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Glow ambient */}
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 border border-indigo-400/30 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <FiPieChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Launch a Trading Pie</h3>
              <p className="text-xs text-slate-400">
                Open a partner pool for members to back your trades
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Pie Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. BTC Bullish Halving Breakout Pool"
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-inner"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Trading Strategy & Thesis
            </label>
            <textarea
              name="description"
              rows="2"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your market setup, technical indicators, and execution gameplan..."
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-inner"
            />
          </div>

          {/* Market & Pair */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Market
              </label>
              <select
                name="market"
                value={formData.market}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MARKETS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Asset Pair
              </label>
              <select
                name="pair"
                value={formData.pair}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
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
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-base font-black text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Min Slice / Deposit (GH₵)
              </label>
              <input
                type="number"
                name="minDeposit"
                min="5"
                step="5"
                value={formData.minDeposit}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-base font-black text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
          </div>

          {/* Conditions Safeguards Grid */}
          <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
              Trading Conditions & Risk Safeguards
            </span>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
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
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-500/40 rounded-xl font-black text-emerald-300 focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-bold">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-400 mb-1 flex items-center gap-1">
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
                    className="w-full px-3 py-2 bg-slate-900 border border-rose-500/40 rounded-xl font-black text-rose-300 focus:ring-2 focus:ring-rose-500 text-xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-bold">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-400 mb-1 flex items-center gap-1">
                  <FiPercent className="w-3 h-3" /> Trader Fee
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="ownerFeePercent"
                    min="0"
                    max="50"
                    value={formData.ownerFeePercent}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-xl font-black text-indigo-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-bold">
                    %
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              * If the trade wins, you receive {formData.ownerFeePercent}% performance fee from the profits. If stopped out, you receive 0% and capital is safeguarded at max {formData.maxLossPercent}% loss floor.
            </p>
          </div>

          {/* Funding Window & Risk Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <FiCalendar className="w-3.5 h-3.5" /> Funding Window
              </label>
              <select
                name="fundingDeadlineDays"
                value={formData.fundingDeadlineDays}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">24 Hours</option>
                <option value="2">48 Hours (2 Days)</option>
                <option value="3">3 Days</option>
                <option value="7">7 Days (1 Week)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Risk Classification
              </label>
              <select
                name="riskLevel"
                value={formData.riskLevel}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Low Risk</option>
                <option value="Moderate">Moderate Risk</option>
                <option value="High">High Risk / Degen</option>
              </select>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold">
              <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              <FiCheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-xl transition flex items-center justify-center gap-2 ${
                submitting
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30 active:scale-[0.98]'
              }`}
            >
              {submitting ? 'Publishing Pie…' : '🚀 Launch Pie & Open Funding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
