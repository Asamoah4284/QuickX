import React, { useState } from 'react';
import axios from 'axios';
import {
  FiX,
  FiAward,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiLink,
} from 'react-icons/fi';

export default function SettlePieModal({
  pie,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [outcome, setOutcome] = useState('win'); // 'win' | 'loss'
  const [finalPnlPercent, setFinalPnlPercent] = useState(pie?.targetRoiPercent || 20);
  const [settlementNotes, setSettlementNotes] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');

  if (!isOpen || !pie) return null;

  const totalPool = pie.raisedAmount || 0;
  const pnlPct = parseFloat(finalPnlPercent) || 0;
  const feePct = pie.ownerFeePercent || 15;

  let grossPnlAmount = 0;
  let ownerFeeAmount = 0;
  let netPnlAmount = 0;
  let totalDistributed = 0;

  if (outcome === 'win') {
    grossPnlAmount = totalPool * (pnlPct / 100);
    ownerFeeAmount = grossPnlAmount * (feePct / 100);
    netPnlAmount = grossPnlAmount - ownerFeeAmount;
    totalDistributed = totalPool + netPnlAmount;
  } else {
    const lossAmount = totalPool * (Math.abs(pnlPct) / 100);
    totalDistributed = Math.max(0, totalPool - lossAmount);
    grossPnlAmount = -lossAmount;
    ownerFeeAmount = 0;
    netPnlAmount = -lossAmount;
  }

  const handleSettle = async (e) => {
    e.preventDefault();
    if (outcome === 'win' && pnlPct <= 0) {
      setError('A winning trade must have a positive ROI percentage.');
      return;
    }
    if (outcome === 'loss' && pnlPct <= 0) {
      setError('Please enter the loss percentage (e.g. 8 for an 8% loss).');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const signedPnl = outcome === 'win' ? Math.abs(pnlPct) : -Math.abs(pnlPct);

      const res = await axios.post(
        `${API_URL}/api/ptrading/${pie._id}/settle`,
        {
          outcome,
          finalPnlPercent: signedPnl,
          settlementNotes: settlementNotes.trim(),
          proofImageUrl: proofImageUrl.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Pool settled and funds distributed to member wallets!');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data.pie);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Settlement error:', err);
      setError(err.response?.data?.message || 'Settlement failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Glow ambient */}
        <div className="absolute top-0 left-1/4 w-72 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 border border-amber-400/30 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <FiAward className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Settle {pie.title}</h3>
              <p className="text-xs text-slate-400">
                Execute automatic wallet payouts to all slice holders
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

        {/* Body */}
        <form onSubmit={handleSettle} className="p-6 overflow-y-auto space-y-4">
          {/* Outcome Toggle */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              Trade Outcome
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOutcome('win');
                  setFinalPnlPercent(pie.targetRoiPercent || 20);
                }}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition border ${
                  outcome === 'win'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FiTrendingUp className="w-4 h-4" /> WIN (Profits Made)
              </button>

              <button
                type="button"
                onClick={() => {
                  setOutcome('loss');
                  setFinalPnlPercent(pie.maxLossPercent || 10);
                }}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition border ${
                  outcome === 'loss'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FiTrendingDown className="w-4 h-4" /> LOSS (Stopped Out)
              </button>
            </div>
          </div>

          {/* Final ROI Input */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
              {outcome === 'win' ? 'Actual Profit ROI %' : 'Actual Loss %'}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={outcome === 'win' ? 1000 : 100}
                value={finalPnlPercent}
                onChange={(e) => setFinalPnlPercent(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-slate-950 border rounded-2xl text-xl font-black focus:outline-none transition shadow-inner ${
                  outcome === 'win'
                    ? 'border-emerald-500/40 text-emerald-300 focus:ring-2 focus:ring-emerald-500'
                    : 'border-rose-500/40 text-rose-300 focus:ring-2 focus:ring-rose-500'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                %
              </span>
            </div>
          </div>

          {/* Settlement Mathematical Preview */}
          <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block pb-1 border-b border-slate-800">
              Settlement Distribution Preview
            </span>

            <div className="flex justify-between py-0.5">
              <span className="text-slate-400">Total Pool Capital:</span>
              <span className="font-bold text-white">GH₵{totalPool.toLocaleString()}</span>
            </div>

            <div className="flex justify-between py-0.5">
              <span className="text-slate-400">
                {outcome === 'win' ? 'Gross Trade Profit:' : 'Total Trade Loss:'}
              </span>
              <span
                className={`font-black ${
                  outcome === 'win' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {outcome === 'win' ? '+' : '-'}GH₵{Math.abs(grossPnlAmount).toFixed(2)}
              </span>
            </div>

            {outcome === 'win' && (
              <div className="flex justify-between py-1.5 text-indigo-300 font-bold bg-indigo-950/40 px-3 rounded-xl border border-indigo-500/30">
                <span>Your Performance Fee ({feePct}%):</span>
                <span>+GH₵{ownerFeeAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-t border-slate-800 font-black text-sm">
              <span className="text-slate-200">Total Distributed to Members:</span>
              <span className="text-blue-400">GH₵{totalDistributed.toFixed(2)}</span>
            </div>
          </div>

          {/* Proof Screenshot URL */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <FiLink className="w-3.5 h-3.5" /> Trade Proof / Screenshot URL (Optional)
            </label>
            <input
              type="url"
              value={proofImageUrl}
              onChange={(e) => setProofImageUrl(e.target.value)}
              placeholder="https://imgur.com/... or TradingView link"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Settlement Notes */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <FiFileText className="w-3.5 h-3.5" /> Settlement Notes & Summary
            </label>
            <textarea
              rows="2"
              value={settlementNotes}
              onChange={(e) => setSettlementNotes(e.target.value)}
              placeholder="Explain how the trade played out for your slice holders..."
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

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-xl transition flex items-center justify-center gap-2 ${
                submitting
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : outcome === 'win'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 active:scale-[0.98]'
                  : 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-600/30 active:scale-[0.98]'
              }`}
            >
              {submitting
                ? 'Distributing Wallet Payouts…'
                : `Confirm Settlement & Distribute GH₵${totalDistributed.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
