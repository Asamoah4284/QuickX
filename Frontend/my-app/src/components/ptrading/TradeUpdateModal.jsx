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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <FiActivity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Post Trade Journal Update</h3>
              <p className="text-xs text-indigo-200">
                Keep slice holders informed on live market execution
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
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Update Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Position Filled at $64,250 | SL moved to breakeven"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <FiTrendingUp className="w-3 h-3 text-blue-600" /> Entry
              </label>
              <input
                type="text"
                name="entryPrice"
                value={formData.entryPrice}
                onChange={handleChange}
                placeholder="e.g. 64,200"
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <FiShield className="w-3 h-3 text-rose-600" /> Stop Loss
              </label>
              <input
                type="text"
                name="stopLoss"
                value={formData.stopLoss}
                onChange={handleChange}
                placeholder="e.g. 63,100"
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <FiTarget className="w-3 h-3 text-emerald-600" /> Take Profit
              </label>
              <input
                type="text"
                name="takeProfit"
                value={formData.takeProfit}
                onChange={handleChange}
                placeholder="e.g. 68,500"
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
              <FiFileText className="w-3 h-3" /> Commentary / Analysis
            </label>
            <textarea
              name="notes"
              rows="3"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Explain current price action, risk adjustments, or market conditions..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
              <FiLink className="w-3 h-3" /> Chart / Screenshot URL (Optional)
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://tradingview.com/x/... or image link"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 px-6 rounded-2xl text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition flex items-center justify-center gap-2 ${
                submitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/25 active:scale-[0.98]'
              }`}
            >
              {submitting ? 'Posting Update...' : 'Publish Update to Journal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
