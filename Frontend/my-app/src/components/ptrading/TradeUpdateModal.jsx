import React, { useState } from 'react';
import axios from 'axios';
import {
  FiX,
  FiActivity,
  FiTrendingUp,
  FiShield,
  FiTarget,
  FiLink,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';

export default function TradeUpdateModal({
  pie,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    imageUrl: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');

  if (!isOpen || !pie) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Please provide a title for this trade update.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await axios.post(
        `${API_URL}/api/ptrading/${pie._id}/trade-updates`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setSuccessMsg('Trade update posted to pool journal!');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data.pie);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Update error:', err);
      setError(err.response?.data?.message || 'Failed to post update.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Glow ambient */}
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 border border-indigo-400/30 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <FiActivity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Post Trade Journal Update</h3>
              <p className="text-xs text-slate-400">
                Keep slice holders informed on live market execution
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
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Update Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Position Filled at $64,250 | SL moved to breakeven"
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <FiTrendingUp className="w-3 h-3 text-blue-400" /> Entry
              </label>
              <input
                type="text"
                name="entryPrice"
                value={formData.entryPrice}
                onChange={handleChange}
                placeholder="e.g. 64,200"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <FiShield className="w-3 h-3 text-rose-400" /> Stop Loss
              </label>
              <input
                type="text"
                name="stopLoss"
                value={formData.stopLoss}
                onChange={handleChange}
                placeholder="e.g. 63,100"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <FiTarget className="w-3 h-3 text-emerald-400" /> Take Profit
              </label>
              <input
                type="text"
                name="takeProfit"
                value={formData.takeProfit}
                onChange={handleChange}
                placeholder="e.g. 68,500"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <FiFileText className="w-3.5 h-3.5" /> Commentary / Analysis
            </label>
            <textarea
              name="notes"
              rows="3"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Explain price action, risk adjustments, or market conditions..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <FiLink className="w-3.5 h-3.5" /> Chart / Screenshot URL (Optional)
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://tradingview.com/x/... or image link"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-xl transition flex items-center justify-center gap-2 ${
                submitting
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-600/30 active:scale-[0.98]'
              }`}
            >
              {submitting ? 'Posting Update…' : 'Publish Update to Journal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
