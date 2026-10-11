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
  FiSliders,
  FiInfo,
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

  const numAmount = Math.max(0, parseFloat(amount) || 0);
  const remaining = Math.max(0, pie.targetAmount - pie.raisedAmount);
  const maxDepositLimit = Math.min(
    remaining > 0 ? remaining : 999999,
    pie.maxDeposit || 999999,
    walletBalance > 0 ? walletBalance : 999999
  );

  const projectedTotalRaised = pie.raisedAmount + numAmount;
  const estimatedSlicePct =
    projectedTotalRaised > 0 ? ((numAmount / projectedTotalRaised) * 100).toFixed(2) : '0.00';

  // Return Math
  const targetRoi = pie.targetRoiPercent || 20;
  const ownerFee = pie.ownerFeePercent || 15;
  const grossProfit = numAmount * (targetRoi / 100);
  const ownerFeeAmount = grossProfit * (ownerFee / 100);
  const netProfit = grossProfit - ownerFeeAmount;
  const estimatedWinPayout = numAmount + netProfit;

  const maxLoss = pie.maxLossPercent || 10;
  const maxLossAmount = numAmount * (maxLoss / 100);
  const estimatedLossPayout = Math.max(0, numAmount - maxLossAmount);

  const isInsufficient = numAmount > walletBalance;
  const isBelowMin = numAmount < (pie.minDeposit || 10);
  const isAboveMax = pie.maxDeposit && numAmount > pie.maxDeposit;
  const isAboveRemaining = remaining > 0 && numAmount > remaining;

  const handlePreset = (val) => {
    setAmount(String(val));
    setError('');
  };

  const handlePercentagePreset = (pct) => {
    if (walletBalance <= 0) return;
    const calcVal = Math.floor((walletBalance * pct) / 100);
    const safeVal = Math.min(calcVal, remaining > 0 ? remaining : calcVal);
    setAmount(String(Math.max(safeVal, pie.minDeposit || 10)));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isInsufficient) {
      setError(`Insufficient wallet balance. You need GH₵${(numAmount - walletBalance).toFixed(2)} more.`);
      return;
    }
    if (isBelowMin) {
      setError(`Minimum deposit for this Pie is GH₵${pie.minDeposit}.`);
      return;
    }
    if (isAboveMax) {
      setError(`Maximum deposit is GH₵${pie.maxDeposit}.`);
      return;
    }
    if (isAboveRemaining) {
      setError(`Only GH₵${remaining.toFixed(2)} remaining to complete funding.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Glow ambient accent */}
        <div className="absolute top-0 left-1/4 w-72 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <FiPieChart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                  {pie.pair}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  {pie.market}
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-0.5 truncate max-w-xs sm:max-w-md">
                Claim a Slice • {pie.title}
              </h3>
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Wallet Balance Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/70 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                <FiCreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                  QuickX Wallet Balance
                </span>
                <span className="text-base font-black text-white">
                  {loadingBalance ? 'Checking…' : `GH₵${walletBalance.toFixed(2)}`}
                </span>
              </div>
            </div>

            {walletBalance < (pie.minDeposit || 10) ? (
              <Link
                to="/membership"
                className="text-xs font-extrabold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3.5 py-2 rounded-xl border border-blue-500/30 flex items-center gap-1.5 transition"
              >
                Top Up Wallet <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                Ready to Invest
              </span>
            )}
          </div>

          {/* Amount Input with Large Typo Display */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <label className="uppercase tracking-wider">How much would you like to pool?</label>
              <span className="text-slate-500 text-[11px]">
                Min: GH₵{pie.minDeposit || 10} • Remaining: GH₵{remaining.toLocaleString()}
              </span>
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xl">
                GH₵
              </div>
              <input
                type="number"
                min={pie.minDeposit || 10}
                max={maxDepositLimit}
                step="5"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder={`Min: ${pie.minDeposit || 10}`}
                className="w-full pl-16 pr-24 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                GHS
              </span>
            </div>

            {/* Slider */}
            {walletBalance > 0 && (
              <div className="pt-2 px-1">
                <input
                  type="range"
                  min={pie.minDeposit || 10}
                  max={Math.max(pie.minDeposit || 10, maxDepositLimit)}
                  step="5"
                  value={Math.min(numAmount, maxDepositLimit)}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>
            )}

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[50, 100, 250, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`text-xs px-3.5 py-2 rounded-xl font-bold transition border ${
                    numAmount === preset
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  GH₵{preset}
                </button>
              ))}

              {walletBalance > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePercentagePreset(25)}
                    className="text-xs px-3 py-2 rounded-xl font-bold bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePercentagePreset(50)}
                    className="text-xs px-3 py-2 rounded-xl font-bold bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset(maxDepositLimit)}
                    className="text-xs px-3.5 py-2 rounded-xl font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition"
                  >
                    Max (GH₵{maxDepositLimit.toFixed(0)})
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Interactive Slice & Scenario Simulator */}
          <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800/90 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FiSliders className="text-blue-500" /> Live Simulation
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Your Slice:</span>
                <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                  {estimatedSlicePct}%
                </span>
              </div>
            </div>

            {/* Side-by-side Outcome Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WIN */}
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <FiTrendingUp className="w-4 h-4" /> Win Target (+{targetRoi}%)
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-black">
                    WIN
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-300 tracking-tight">
                  GH₵{estimatedWinPayout.toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-400/80 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Net Profit:</span>
                    <strong className="text-emerald-300">+GH₵{netProfit.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-[10px] opacity-75">
                    <span>Trader Fee ({ownerFee}%):</span>
                    <span>-GH₵{ownerFeeAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* LOSS */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between text-rose-400 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <FiShield className="w-4 h-4" /> Stop-Loss Floor (-{maxLoss}%)
                  </span>
                  <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded font-black">
                    PROTECTED
                  </span>
                </div>
                <div className="text-2xl font-black text-rose-300 tracking-tight">
                  GH₵{estimatedLossPayout.toFixed(2)}
                </div>
                <div className="text-[11px] text-rose-400/80 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Max Loss Limit:</span>
                    <strong className="text-rose-300">-GH₵{maxLossAmount.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-[10px] opacity-75">
                    <span>Capital Refund:</span>
                    <span>{100 - maxLoss}% safe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
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
        </div>

        {/* Footer */}
        <div className="p-6 pt-3 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || isInsufficient || isBelowMin || numAmount <= 0}
            className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-xl transition flex items-center justify-center gap-2 ${
              submitting || isInsufficient || isBelowMin || numAmount <= 0
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30 active:scale-[0.98]'
            }`}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Claiming Slice…
              </span>
            ) : isInsufficient ? (
              'Top Up Wallet to Continue'
            ) : (
              <>
                <FiPieChart className="w-4 h-4" />
                Deposit GH₵{numAmount.toFixed(2)} • Claim {estimatedSlicePct}% Slice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
