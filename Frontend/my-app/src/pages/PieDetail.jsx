import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiPieChart,
  FiTrendingUp,
  FiShield,
  FiDollarSign,
  FiAward,
  FiClock,
  FiUsers,
  FiArrowLeft,
  FiPlay,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiExternalLink,
  FiActivity,
  FiPercent,
  FiTarget,
  FiSliders,
  FiShare2,
} from 'react-icons/fi';
import PieChartDonut from '../components/ptrading/PieChartDonut';
import DepositSliceModal from '../components/ptrading/DepositSliceModal';
import SettlePieModal from '../components/ptrading/SettlePieModal';
import TradeUpdateModal from '../components/ptrading/TradeUpdateModal';

export default function PieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pie, setPie] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [userDeposit, setUserDeposit] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Quick simulator
  const [simAmount, setSimAmount] = useState(100);

  // Owner action loading
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');
  const isLoggedIn = Boolean(token);

  useEffect(() => {
    fetchPieDetails();
  }, [id]);

  const fetchPieDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/api/ptrading/${id}`, { headers });

      if (res.data?.success) {
        setPie(res.data.pie);
        setDeposits(res.data.deposits || []);
        setUserDeposit(res.data.userDeposit || null);
        setIsOwner(res.data.isOwner || false);
        if (res.data.pie?.minDeposit) {
          setSimAmount(res.data.pie.minDeposit * 2);
        }
      }
    } catch (err) {
      console.error('Error fetching pie:', err);
      setError(err.response?.data?.message || 'Failed to load Trading Pie details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrading = async () => {
    if (!window.confirm('Commence market execution? Deposits will be closed and trading will begin.')) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await axios.post(
        `${API_URL}/api/ptrading/${id}/start-trading`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        fetchPieDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start trading.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPie = async () => {
    const reason = window.prompt(
      'Are you sure you want to cancel this Pie? All participants will be 100% refunded to their wallets. Enter cancellation reason:'
    );
    if (!reason) return;

    try {
      setActionLoading(true);
      const res = await axios.post(
        `${API_URL}/api/ptrading/${id}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        alert(res.data.message);
        fetchPieDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center pt-24 space-y-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading Trading Pie…</p>
      </div>
    );
  }

  if (error || !pie) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center pt-24 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <FiAlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Trading Pie Not Found</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          {error || 'This Pie does not exist or has been removed.'}
        </p>
        <Link
          to="/ptrading"
          className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2"
        >
          <FiArrowLeft /> Back to Trading Pies
        </Link>
      </div>
    );
  }

  const fillPct =
    pie.targetAmount > 0
      ? Math.min(100, (pie.raisedAmount / pie.targetAmount) * 100)
      : 0;

  // Simulator math
  const simNum = Math.max(0, simAmount);
  const simTotal = pie.raisedAmount + simNum;
  const simSlicePct = simTotal > 0 ? ((simNum / simTotal) * 100).toFixed(2) : 0;
  const simWinPayout =
    simNum * (1 + (pie.targetRoiPercent / 100) * (1 - pie.ownerFeePercent / 100));
  const simLossPayout = simNum * (1 - pie.maxLossPercent / 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 pt-24 selection:bg-blue-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/3 h-[600px] w-[600px] rounded-full bg-blue-600/15 blur-[160px]" />
        <div className="absolute bottom-10 right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-600/15 blur-[170px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation & Breadcrumbs */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <Link
            to="/ptrading"
            className="inline-flex items-center gap-2 hover:text-white transition bg-slate-900/60 px-3.5 py-2 rounded-xl border border-slate-800"
          >
            <FiArrowLeft className="w-4 h-4" /> Back to PTrading Pools
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:text-white transition flex items-center gap-1.5 text-slate-300"
            >
              <FiShare2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Link Copied! ✓' : 'Share Pool'}</span>
            </button>
            <span className="uppercase tracking-widest text-[10px] text-slate-500 hidden sm:inline">
              Pool ID: {pie._id.slice(-6)}
            </span>
          </div>
        </div>

        {/* Hero Pool Header */}
        <div className="p-6 sm:p-10 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 backdrop-blur-2xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-black uppercase tracking-wider">
                {pie.pair}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {pie.market} • {pie.riskLevel} Risk
              </span>
            </div>

            {/* Status Pill */}
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border self-start sm:self-auto ${
                pie.status === 'funding'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : pie.status === 'trading'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse'
                  : pie.status === 'settled'
                  ? pie.outcome === 'win'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              {pie.status === 'settled'
                ? pie.outcome === 'win'
                  ? `SETTLED: WON (+${pie.finalPnlPercent}%) 🏆`
                  : `SETTLED: LOSS (${pie.finalPnlPercent}%) 🔻`
                : pie.status === 'trading'
                ? 'IN LIVE MARKET TRADE ⚡'
                : 'FUNDING WINDOW OPEN'}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {pie.title}
            </h1>
            {pie.description && (
              <p className="mt-2 text-slate-400 text-sm sm:text-base leading-relaxed max-w-3xl">
                {pie.description}
              </p>
            )}
          </div>

          {/* Trader Profile Strip */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src={pie.ownerId?.profilePicture || '/logo.jpg'}
                alt={pie.ownerId?.fullName}
                className="w-11 h-11 rounded-2xl object-cover border border-slate-700 shadow-md"
              />
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">
                  Pool Leader / Trader
                </span>
                <span className="text-sm font-black text-white">
                  {pie.ownerId?.fullName || 'QuickX Trader'}
                </span>
              </div>
            </div>

            {pie.status === 'funding' && (
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    navigate('/login');
                    return;
                  }
                  setShowDepositModal(true);
                }}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-600/30 transition flex items-center gap-2 active:scale-95"
              >
                <FiPieChart className="w-4 h-4" /> Claim Your Slice
              </button>
            )}
          </div>
        </div>

        {/* Main Grid: Left Donut + Right Conditions & Slices */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Interactive Donut & Slice Distribution */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-8 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 backdrop-blur-2xl flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FiPieChart className="text-blue-500" /> Interactive Pie
                </h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Hover to inspect slices
                </span>
              </div>

              <PieChartDonut
                deposits={deposits}
                targetAmount={pie.targetAmount}
                raisedAmount={pie.raisedAmount}
                size={300}
                interactive={true}
                showLegend={true}
              />
            </div>

            {/* User Personal Slice Card (if deposited) */}
            {userDeposit && (
              <div className="p-6 sm:p-7 rounded-[2.5rem] bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-slate-900/80 border border-blue-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-wider">
                    <FiPieChart className="w-4 h-4" />
                    <span>Your Slice In This Pie</span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 font-black text-xs border border-blue-500/30">
                    {userDeposit.slicePercentage.toFixed(2)}% Slice
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block font-semibold uppercase">
                      Your Deposit
                    </span>
                    <span className="text-lg font-black text-white">
                      GH₵{userDeposit.amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px] block font-semibold uppercase">
                      {pie.status === 'settled' ? 'Final Payout' : 'Potential Win'}
                    </span>
                    <span
                      className={`text-lg font-black ${
                        pie.status === 'settled'
                          ? userDeposit.payoutAmount >= userDeposit.amount
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      GH₵
                      {pie.status === 'settled'
                        ? (userDeposit.payoutAmount || 0).toFixed(2)
                        : (
                            userDeposit.amount *
                            (1 + (pie.targetRoiPercent / 100) * (1 - pie.ownerFeePercent / 100))
                          ).toFixed(2)}
                    </span>
                  </div>
                </div>

                {pie.status === 'settled' && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Net Profit / Loss:</span>
                    <span
                      className={`font-black text-sm ${
                        (userDeposit.pnlAmount || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {(userDeposit.pnlAmount || 0) >= 0 ? '+' : ''}GH₵
                      {(userDeposit.pnlAmount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Conditions, Actions, Journal & Participants */}
          <div className="lg:col-span-7 space-y-6">
            {/* Owner Management Controls (if owner) */}
            {isOwner && (
              <div className="p-6 sm:p-7 rounded-[2.5rem] bg-indigo-950/40 border border-indigo-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                    <FiShield className="w-4 h-4" /> Owner Management Desk
                  </span>
                  <span className="text-[11px] text-indigo-200 font-bold">You lead this Pool</span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {pie.status === 'funding' && (
                    <>
                      <button
                        onClick={handleStartTrading}
                        disabled={actionLoading || pie.raisedAmount <= 0}
                        className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
                      >
                        <FiPlay className="w-3.5 h-3.5" /> Start Trading Phase
                      </button>

                      <button
                        onClick={handleCancelPie}
                        disabled={actionLoading}
                        className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-rose-950 hover:text-rose-300 border border-slate-800 text-slate-300 text-xs font-bold transition"
                      >
                        Cancel Pool (Refund 100%)
                      </button>
                    </>
                  )}

                  {pie.status === 'trading' && (
                    <>
                      <button
                        onClick={() => setShowUpdateModal(true)}
                        className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                      >
                        <FiActivity className="w-3.5 h-3.5" /> Post Trade Update
                      </button>

                      <button
                        onClick={() => setShowSettleModal(true)}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                      >
                        <FiAward className="w-3.5 h-3.5" /> Settle Pie & Distribute Payouts
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Pool Conditions & Funding Bar */}
            <div className="p-6 sm:p-8 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 backdrop-blur-2xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Pool Conditions & Funding Rules
                </h3>

                <span className="text-xs font-extrabold text-blue-400">
                  {fillPct.toFixed(1)}% Funded
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>GH₵{pie.raisedAmount.toLocaleString()} Raised</span>
                  <span>Target: GH₵{pie.targetAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Conditions 4-Box Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">
                    Target ROI
                  </span>
                  <span className="text-lg font-black text-emerald-400">
                    +{pie.targetRoiPercent}%
                  </span>
                  <span className="text-[10px] text-slate-500 block font-semibold">
                    Expected Profit
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">
                    Max Loss
                  </span>
                  <span className="text-lg font-black text-rose-400">-{pie.maxLossPercent}%</span>
                  <span className="text-[10px] text-slate-500 block font-semibold">
                    Stop Loss Floor
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">
                    Trader Fee
                  </span>
                  <span className="text-lg font-black text-indigo-400">
                    {pie.ownerFeePercent}%
                  </span>
                  <span className="text-[10px] text-slate-500 block font-semibold">
                    Profit Cut
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">
                    Min Deposit
                  </span>
                  <span className="text-lg font-black text-white">GH₵{pie.minDeposit || 10}</span>
                  <span className="text-[10px] text-slate-500 block font-semibold">Per Slice</span>
                </div>
              </div>

              {/* Settlement Notes Display (if settled) */}
              {pie.status === 'settled' && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                    Settlement Notes & Results
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {pie.settlementNotes || 'Trade settled successfully.'}
                  </p>
                  {pie.proofImageUrl && (
                    <a
                      href={pie.proofImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-bold pt-1"
                    >
                      <FiExternalLink /> View Verified Trade Proof Screenshot
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Return Simulator Widget (when funding) */}
            {pie.status === 'funding' && (
              <div className="p-6 sm:p-7 rounded-[2.5rem] bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <FiSliders className="text-blue-500" /> Interactive Slice Calculator
                  </span>
                  <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                    ~{simSlicePct}% Slice
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Simulated Deposit:</span>
                    <span className="text-white font-black text-sm">GH₵{simNum}</span>
                  </div>
                  <input
                    type="range"
                    min={pie.minDeposit || 10}
                    max={Math.max(500, pie.targetAmount - pie.raisedAmount)}
                    step="10"
                    value={simAmount}
                    onChange={(e) => setSimAmount(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-400 font-bold block uppercase">
                      If Target Reached (+{pie.targetRoiPercent}%)
                    </span>
                    <span className="text-base font-black text-emerald-300">
                      GH₵{simWinPayout.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30">
                    <span className="text-[10px] text-rose-400 font-bold block uppercase">
                      Stop-Loss Floor (-{pie.maxLossPercent}%)
                    </span>
                    <span className="text-base font-black text-rose-300">
                      GH₵{simLossPayout.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Trade Journal & Live Execution Timeline */}
            <div className="p-6 sm:p-8 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 backdrop-blur-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FiActivity className="text-blue-500" /> Live Trade Journal (
                  {pie.tradeUpdates?.length || 0})
                </h3>

                {isOwner && pie.status === 'trading' && (
                  <button
                    onClick={() => setShowUpdateModal(true)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <FiPlus /> New Entry
                  </button>
                )}
              </div>

              {!pie.tradeUpdates || pie.tradeUpdates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {pie.status === 'funding'
                    ? 'Trade journal entries will appear here once the owner commences trading.'
                    : 'No journal updates posted yet.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {pie.tradeUpdates.map((update, index) => (
                    <div
                      key={update._id || index}
                      className="p-5 rounded-3xl bg-slate-950 border border-slate-800/80 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-sm">{update.title}</h4>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {new Date(update.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {update.entryPrice && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 font-bold text-[11px] border border-blue-500/20">
                            Entry: {update.entryPrice}
                          </span>
                        )}
                        {update.stopLoss && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 font-bold text-[11px] border border-rose-500/20">
                            SL: {update.stopLoss}
                          </span>
                        )}
                        {update.takeProfit && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
                            TP: {update.takeProfit}
                          </span>
                        )}
                      </div>

                      {update.notes && (
                        <p className="text-xs text-slate-300 leading-relaxed">{update.notes}</p>
                      )}

                      {update.imageUrl && (
                        <a
                          href={update.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline pt-1 font-semibold"
                        >
                          <FiExternalLink /> View Attached Chart
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Participants Leaderboard Table */}
            <div className="p-6 sm:p-8 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 backdrop-blur-2xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FiUsers className="text-blue-500" /> Slice Holders ({deposits.length})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Participant</th>
                      <th className="py-3 px-3">Deposited</th>
                      <th className="py-3 px-3">Slice %</th>
                      {pie.status === 'settled' && <th className="py-3 px-3">Payout</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {deposits.map((dep, index) => (
                      <tr key={dep._id || index} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-3 flex items-center gap-2.5">
                          <img
                            src={dep.userId?.profilePicture || '/logo.jpg'}
                            alt={dep.userId?.fullName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-700"
                          />
                          <span className="text-white font-bold">
                            {dep.userId?.fullName || `Participant #${index + 1}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-300 font-bold">
                          GH₵{dep.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-blue-400 font-black">
                          {dep.slicePercentage.toFixed(2)}%
                        </td>
                        {pie.status === 'settled' && (
                          <td
                            className={`py-3.5 px-3 font-black ${
                              dep.payoutAmount >= dep.amount ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            GH₵{(dep.payoutAmount || 0).toFixed(2)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DepositSliceModal
        pie={pie}
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onSuccess={() => fetchPieDetails()}
      />

      <SettlePieModal
        pie={pie}
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        onSuccess={() => fetchPieDetails()}
      />

      <TradeUpdateModal
        pie={pie}
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onSuccess={() => fetchPieDetails()}
      />
    </div>
  );
}
