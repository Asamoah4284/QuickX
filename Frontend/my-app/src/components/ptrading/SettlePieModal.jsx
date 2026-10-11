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
    // Loss
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <FiAward className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Settle {pie.title}</h3>
              <p className="text-xs text-amber-200">
                Execute automatic wallet payouts to all slice holders
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

        {/* Body */}
        <form onSubmit={handleSettle} className="p-6 overflow-y-auto space-y-4">
          {/* Outcome Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
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
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                    ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FiTrendingDown className="w-4 h-4" /> LOSS (Stop Loss Hit)
              </button>
            </div>
          </div>

          {/* Final ROI Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {outcome === 'win' ? 'Actual Return / Profit ROI %' : 'Actual Loss % (Stopped Out)'}
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
                className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-base font-black focus:outline-none focus:bg-white transition ${
                  outcome === 'win'
                    ? 'border-emerald-300 text-emerald-800 focus:ring-2 focus:ring-emerald-500'
                    : 'border-rose-300 text-rose-800 focus:ring-2 focus:ring-rose-500'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                %
              </span>
            </div>
          </div>

          {/* Math Simulation Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block pb-1 border-b border-slate-200">
              Settlement Distribution Preview
            </span>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">Total Pool Raised:</span>
              <span className="font-bold text-slate-900">GH₵{totalPool.toLocaleString()}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">
                {outcome === 'win' ? 'Gross Trade Profit:' : 'Total Trade Loss:'}
              </span>
              <span
                className={`font-black ${
                  outcome === 'win' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {outcome === 'win' ? '+' : '-'}GH₵{Math.abs(grossPnlAmount).toFixed(2)}
              </span>
            </div>

            {outcome === 'win' && (
              <div className="flex justify-between py-1 text-indigo-700 font-semibold bg-indigo-50/60 px-2 rounded-lg">
                <span>Your Trader Performance Fee ({feePct}%):</span>
                <span>+GH₵{ownerFeeAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-t border-slate-200 font-extrabold text-sm">
              <span className="text-slate-900">Total Returned to Members:</span>
              <span className="text-blue-700">GH₵{totalDistributed.toFixed(2)}</span>
            </div>
          </div>

          {/* Proof Screenshot URL */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
              <FiLink className="w-3 h-3" /> Trade Proof / Screenshot URL (Optional)
            </label>
            <input
              type="url"
              value={proofImageUrl}
              onChange={(e) => setProofImageUrl(e.target.value)}
              placeholder="https://imgur.com/... or TradingView link"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Settlement Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
              <FiFileText className="w-3 h-3" /> Settlement Notes & Trade Summary
            </label>
            <textarea
              rows="2"
              value={settlementNotes}
              onChange={(e) => setSettlementNotes(e.target.value)}
              placeholder="Explain how the trade played out for your community members..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
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

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 px-6 rounded-2xl text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition flex items-center justify-center gap-2 ${
                submitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : outcome === 'win'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25 active:scale-[0.98]'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-500/25 active:scale-[0.98]'
              }`}
            >
              {submitting
                ? 'Distributing Wallet Payouts...'
                : `Confirm Settlement & Distribute GH₵${totalDistributed.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
