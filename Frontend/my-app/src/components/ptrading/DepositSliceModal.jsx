import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiX,
  FiPieChart,
  FiTrendingUp,
  FiShield,
  FiAlertCircle,
  FiCheckCircle,
  FiCreditCard,
  FiArrowRight,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function DepositSliceModal({
  pie,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    if (isOpen && token) {
      fetchWalletBalance();
      // Set default initial amount to minDeposit
      if (pie?.minDeposit) {
        setAmount(String(pie.minDeposit));
      }
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, pie]);

  const fetchWalletBalance = async () => {
    try {
      setLoadingBalance(true);
      const res = await axios.get(`${API_URL}/api/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success || res.data?.balance !== undefined) {
        setWalletBalance(res.data.balance || res.data.wallet?.balance || 0);
      }
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
      // Fallback: check stored user object
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setWalletBalance(u.walletBalance || 0);
      } catch {
        setWalletBalance(0);
      }
    } finally {
      setLoadingBalance(false);
    }
  };

  if (!isOpen || !pie) return null;

  const numAmount = parseFloat(amount) || 0;
  const remaining = Math.max(0, pie.targetAmount - pie.raisedAmount);
  const projectedTotalRaised = pie.raisedAmount + numAmount;
  const estimatedSlicePct =
    projectedTotalRaised > 0 ? ((numAmount / projectedTotalRaised) * 100).toFixed(2) : 0;

  // Potential payout math:
  // Win: grossProfit = numAmount * (targetRoiPercent / 100)
  // netProfit = grossProfit * (1 - ownerFeePercent / 100)
  // estimatedWinPayout = numAmount + netProfit
  const targetRoi = pie.targetRoiPercent || 20;
  const ownerFee = pie.ownerFeePercent || 15;
  const netRoiMultiplier = (targetRoi / 100) * (1 - ownerFee / 100);
  const estimatedWinPayout = numAmount + numAmount * netRoiMultiplier;

  // Loss: maxLoss = numAmount * (maxLossPercent / 100)
  // estimatedLossPayout = numAmount - maxLoss
  const maxLoss = pie.maxLossPercent || 10;
  const estimatedLossPayout = Math.max(0, numAmount * (1 - maxLoss / 100));

  const isInsufficient = numAmount > walletBalance;
  const isBelowMin = numAmount < (pie.minDeposit || 10);
  const isAboveMax = pie.maxDeposit && numAmount > pie.maxDeposit;
  const isAboveRemaining = remaining > 0 && numAmount > remaining;

  const handlePreset = (val) => {
    setAmount(String(val));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isInsufficient) {
      setError(`Insufficient wallet balance. Please top up your wallet with GH₵${(numAmount - walletBalance).toFixed(2)}.`);
      return;
    }
    if (isBelowMin) {
      setError(`Minimum deposit is GH₵${pie.minDeposit}.`);
      return;
    }
    if (isAboveMax) {
      setError(`Maximum deposit is GH₵${pie.maxDeposit}.`);
      return;
    }
    if (isAboveRemaining) {
      setError(`Only GH₵${remaining.toFixed(2)} remains to fully fund this Pie.`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await axios.post(
        `${API_URL}/api/ptrading/${pie._id}/deposit`,
        { amount: numAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Slice successfully acquired!');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data.pie);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.response?.data?.message || 'Deposit failed. Please try again.');
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
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <FiPieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Earn a Slice of {pie.title}</h3>
              <p className="text-xs text-blue-200">
                Partner Pool • {pie.pair} ({pie.market?.toUpperCase()})
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
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Wallet Balance Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <FiCreditCard className="w-5 h-5 text-slate-500" />
              <div>
                <span className="text-xs text-slate-500 font-medium block">QuickX Wallet Balance</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {loadingBalance ? 'Checking...' : `GH₵${walletBalance.toFixed(2)}`}
                </span>
              </div>
            </div>
            {walletBalance < (pie.minDeposit || 10) && (
              <Link
                to="/membership"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1"
              >
                Top Up Wallet <FiArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Deposit Amount (GH₵)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                GH₵
              </span>
              <input
                type="number"
                min={pie.minDeposit || 10}
                max={Math.min(remaining || 999999, pie.maxDeposit || 999999)}
                step="5"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder={`Min: ${pie.minDeposit || 10}`}
                className="w-full pl-16 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {[50, 100, 200, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${
                    numAmount === preset
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  GH₵{preset}
                </button>
              ))}
              {walletBalance > 0 && walletBalance >= (pie.minDeposit || 10) && (
                <button
                  type="button"
                  onClick={() =>
                    handlePreset(
                      Math.min(
                        walletBalance,
                        remaining > 0 ? remaining : walletBalance,
                        pie.maxDeposit || walletBalance
                      )
                    )
                  }
                  className="text-xs px-3 py-1.5 rounded-xl font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                >
                  Max Available
                </button>
              )}
            </div>
          </div>

          {/* Real-time Slice Preview Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-blue-200/50">
              <span className="font-semibold text-slate-600">Your Slice Percentage:</span>
              <span className="font-black text-blue-700 text-sm">
                {estimatedSlicePct}% of Pie
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/60">
                <div className="flex items-center gap-1 text-emerald-700 font-bold mb-1">
                  <FiTrendingUp className="w-3.5 h-3.5" />
                  <span>If Win (+{targetRoi}%)</span>
                </div>
                <span className="text-sm font-black text-emerald-800 block">
                  GH₵{estimatedWinPayout.toFixed(2)}
                </span>
                <span className="text-[10px] text-emerald-600">
                  +GH₵{(estimatedWinPayout - numAmount).toFixed(2)} profit (after {ownerFee}% trader fee)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/60">
                <div className="flex items-center gap-1 text-rose-700 font-bold mb-1">
                  <FiShield className="w-3.5 h-3.5" />
                  <span>Stop Loss ({maxLoss}%)</span>
                </div>
                <span className="text-sm font-black text-rose-800 block">
                  GH₵{estimatedLossPayout.toFixed(2)}
                </span>
                <span className="text-[10px] text-rose-600">
                  Protected: Max loss -GH₵{(numAmount - estimatedLossPayout).toFixed(2)}
                </span>
              </div>
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
        </div>

        {/* Footer */}
        <div className="p-6 pt-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || isInsufficient || isBelowMin || numAmount <= 0}
            className={`flex-1 py-3.5 px-6 rounded-2xl text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition flex items-center justify-center gap-2 ${
              submitting || isInsufficient || isBelowMin || numAmount <= 0
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 active:scale-[0.98]'
            }`}
          >
            {submitting ? (
              'Processing Deposit...'
            ) : isInsufficient ? (
              'Top Up Wallet to Continue'
            ) : (
              <>
                <FiPieChart className="w-4 h-4" />
                Deposit GH₵{numAmount > 0 ? numAmount.toFixed(2) : '0.00'} & Get Slice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
