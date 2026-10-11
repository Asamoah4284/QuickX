import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiPieChart,
  FiTrendingUp,
  FiShield,
  FiDollarSign,
  FiAward,
  FiFilter,
  FiSearch,
  FiPlus,
  FiClock,
  FiUsers,
  FiChevronRight,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity,
  FiArrowUpRight,
  FiZap,
} from 'react-icons/fi';
import PieChartDonut from '../components/ptrading/PieChartDonut';
import DepositSliceModal from '../components/ptrading/DepositSliceModal';
import CreatePieModal from '../components/ptrading/CreatePieModal';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Pies' },
  { value: 'funding', label: 'Funding Open', dot: 'bg-amber-400' },
  { value: 'trading', label: 'In Live Trade', dot: 'bg-blue-400' },
  { value: 'settled', label: 'Settled & Paid', dot: 'bg-emerald-400' },
];

const MARKET_FILTERS = [
  { value: 'all', label: 'All Markets' },
  { value: 'crypto', label: 'Crypto ₿' },
  { value: 'forex', label: 'Forex 💱' },
  { value: 'commodities', label: 'Commodities 🪙' },
  { value: 'stocks', label: 'Indices & Stocks 📈' },
];

export default function PTrading() {
  const [pies, setPies] = useState([]);
  const [stats, setStats] = useState({
    totalPools: 0,
    totalCapitalRaised: 0,
    totalDistributed: 0,
    winRate: 100,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'targetRoi' | 'mostFunded'

  // Modals
  const [selectedPieForDeposit, setSelectedPieForDeposit] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // User state
  const [mySlices, setMySlices] = useState([]);
  const [loadingMySlices, setLoadingMySlices] = useState(false);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'mySlices'

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');
  const isLoggedIn = Boolean(token);

  useEffect(() => {
    fetchPies();
  }, [statusFilter, marketFilter]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchMySlices();
    }
  }, [isLoggedIn]);

  const fetchPies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (marketFilter !== 'all') params.append('market', marketFilter);

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/api/ptrading?${params.toString()}`, { headers });

      if (res.data?.success) {
        setPies(res.data.pies || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trading pies:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySlices = async () => {
    try {
      setLoadingMySlices(true);
      const res = await axios.get(`${API_URL}/api/ptrading/my-slices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setMySlices(res.data.deposits || []);
      }
    } catch (err) {
      console.error('Failed to load user slices:', err);
    } finally {
      setLoadingMySlices(false);
    }
  };

  // Sort and Filter Pies
  const processedPies = [...pies]
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title?.toLowerCase().includes(q) ||
        p.pair?.toLowerCase().includes(q) ||
        p.ownerId?.fullName?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'targetRoi') return (b.targetRoiPercent || 0) - (a.targetRoiPercent || 0);
      if (sortBy === 'mostFunded') return (b.raisedAmount || 0) - (a.raisedAmount || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  // Calculate portfolio totals
  const portfolioTotalDeposited = mySlices.reduce((acc, s) => acc + (s.amount || 0), 0);
  const portfolioTotalPayout = mySlices.reduce((acc, s) => acc + (s.payoutAmount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 pt-24 selection:bg-blue-600 selection:text-white">
      {/* Background ambient light effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-blue-600/15 blur-[160px]" />
        <div className="absolute top-1/3 -right-20 h-[600px] w-[600px] rounded-full bg-indigo-600/15 blur-[180px]" />
        <div className="absolute bottom-10 left-1/3 h-[500px] w-[500px] rounded-full bg-emerald-600/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Hero Section */}
        <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl shadow-blue-950/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-5">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider shadow-sm">
                <FiPieChart className="w-4 h-4" />
                <span>PTrading • Partner Trading Feature</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Pool Together. <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                  Earn Your Slice of the Pie.
                </span>
              </h1>

              <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
                Back verified traders and community mentors with pooled capital. When the trade hits
                profit targets, earnings are distributed straight to your QuickX wallet based on
                your slice percentage!
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    if (!isLoggedIn) {
                      navigate('/login');
                      return;
                    }
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-600/30 transition flex items-center gap-2 active:scale-95"
                >
                  <FiPlus className="w-4 h-4" /> Launch a Trading Pie
                </button>

                {isLoggedIn && (
                  <button
                    onClick={() => setActiveTab(activeTab === 'explore' ? 'mySlices' : 'explore')}
                    className={`px-5 py-4 rounded-2xl border text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                      activeTab === 'mySlices'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <FiPieChart className="w-4 h-4" /> My Slices ({mySlices.length})
                  </button>
                )}
              </div>
            </div>

            {/* Platform Stats Display */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Total Pooled
                </span>
                <span className="text-xl sm:text-2xl font-black text-white block truncate">
                  GH₵{(stats.totalCapitalRaised || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                  <FiTrendingUp className="w-3 h-3" /> Community Capital
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Win Rate
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 block">
                  {stats.winRate || 100}%
                </span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                  Verified Settled
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Total Distributed
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-400 block truncate">
                  GH₵{(stats.totalDistributed || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                  Direct Wallet Payouts
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Trading Pies
                </span>
                <span className="text-xl sm:text-2xl font-black text-indigo-400 block">
                  {stats.totalPools || pies.length}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                  Active Pools
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Portfolio Drawer ("My Slices") */}
        {isLoggedIn && activeTab === 'mySlices' && (
          <div className="p-6 sm:p-8 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 space-y-6 animate-fade-in backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <FiPieChart className="text-blue-500" /> Your Pie Slices & Backed Pools
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Monitor your pooled capital, active slice stakes, and settlement earnings
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-500 font-semibold mr-2">Total Pooled:</span>
                  <span className="font-black text-white">
                    GH₵{portfolioTotalDeposited.toFixed(2)}
                  </span>
                </div>
                {portfolioTotalPayout > 0 && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
                    <span className="text-emerald-400 font-semibold mr-2">Total Payouts:</span>
                    <span className="font-black text-emerald-300">
                      GH₵{portfolioTotalPayout.toFixed(2)}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setActiveTab('explore')}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                >
                  Close Portfolio
                </button>
              </div>
            </div>

            {loadingMySlices ? (
              <div className="py-12 text-center text-slate-500 text-sm">Loading your slices…</div>
            ) : mySlices.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-slate-400 text-sm">
                  You don't own any Pie slices yet. Browse the open pools below to back a trade!
                </p>
                <button
                  onClick={() => setActiveTab('explore')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Explore Open Pools
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {mySlices.map((deposit) => {
                  const p = deposit.pieId;
                  if (!p) return null;
                  return (
                    <div
                      key={deposit._id}
                      className="p-5 rounded-3xl bg-slate-950 border border-slate-800/90 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-black uppercase">
                            {p.pair}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              p.status === 'funding'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : p.status === 'trading'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : deposit.payoutAmount >= deposit.amount
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {p.status === 'settled'
                              ? deposit.payoutAmount >= deposit.amount
                                ? 'WON 🏆'
                                : 'LOSS 🔻'
                              : p.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-white text-sm line-clamp-1">{p.title}</h4>
                          <span className="text-[11px] text-slate-400">
                            by {p.ownerId?.fullName || 'Trader'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-slate-900 border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">
                              Your Deposit
                            </span>
                            <span className="font-black text-white text-sm">
                              GH₵{deposit.amount.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">
                              Slice Share
                            </span>
                            <span className="font-black text-blue-400 text-sm">
                              {deposit.slicePercentage.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {p.status === 'settled' && (
                          <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40">
                            <span className="text-slate-400 font-medium">Payout Received:</span>
                            <span className="font-black text-emerald-400 text-base">
                              GH₵{(deposit.payoutAmount || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <Link
                        to={`/ptrading/${p._id}`}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        View Pie Details <FiChevronRight />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Filter, Search & Sorting Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-xl">
          {/* Status Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 ${
                  statusFilter === f.value
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Market Select */}
            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MARKET_FILTERS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Sort: Newest</option>
              <option value="targetRoi">Sort: Highest ROI %</option>
              <option value="mostFunded">Sort: Most Funded</option>
            </select>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pool, pair, trader..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Pies Grid */}
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="inline-block w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-xs font-semibold">Loading Trading Pies…</p>
          </div>
        ) : processedPies.length === 0 ? (
          <div className="py-24 text-center space-y-4 p-8 rounded-[2.5rem] bg-slate-900/40 border border-slate-800/60">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
              <FiPieChart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No Trading Pies found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No pools match the current filters. Launch a new Trading Pie or switch filter settings.
            </p>
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  navigate('/login');
                  return;
                }
                setShowCreateModal(true);
              }}
              className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <FiPlus /> Launch New Pie
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedPies.map((pie) => {
              const fillPct =
                pie.targetAmount > 0
                  ? Math.min(100, (pie.raisedAmount / pie.targetAmount) * 100)
                  : 0;

              return (
                <div
                  key={pie._id}
                  className="rounded-[2rem] bg-slate-900/70 border border-slate-800/90 hover:border-blue-500/50 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-blue-950/30 group backdrop-blur-xl"
                >
                  {/* Card Header & Content */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider">
                          {pie.pair}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {pie.market}
                        </span>
                      </div>

                      {/* Status Pill */}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
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
                        {pie.status === 'settled'
                          ? pie.outcome === 'win'
                            ? `WIN (+${pie.finalPnlPercent}%) 🏆`
                            : `LOSS (${pie.finalPnlPercent}%) 🔻`
                          : pie.status === 'trading'
                          ? 'IN TRADE ⚡'
                          : 'FUNDING OPEN'}
                      </span>
                    </div>

                    {/* Title & Trader Info */}
                    <div>
                      <Link
                        to={`/ptrading/${pie._id}`}
                        className="text-base font-black text-white group-hover:text-blue-400 transition line-clamp-1"
                      >
                        {pie.title}
                      </Link>

                      <div className="flex items-center gap-2 mt-2">
                        <img
                          src={pie.ownerId?.profilePicture || '/logo.jpg'}
                          alt={pie.ownerId?.fullName}
                          className="w-5 h-5 rounded-full object-cover border border-slate-700"
                        />
                        <span className="text-xs text-slate-400 font-semibold truncate">
                          {pie.ownerId?.fullName || 'Community Leader'}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Donut Preview in Center */}
                    <div className="py-2 flex items-center justify-center">
                      <PieChartDonut
                        deposits={[]}
                        targetAmount={pie.targetAmount}
                        raisedAmount={pie.raisedAmount}
                        size={155}
                        interactive={false}
                        showLegend={false}
                      />
                    </div>

                    {/* Funding Progress Bar with Shimmer */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">
                          GH₵{pie.raisedAmount.toLocaleString()}{' '}
                          <span className="text-slate-600 font-normal">
                            / GH₵{pie.targetAmount.toLocaleString()}
                          </span>
                        </span>
                        <span className="text-blue-400 font-black">{fillPct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Conditions 3-Pill Grid */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-bold uppercase">
                          Target ROI
                        </span>
                        <span className="text-xs font-black text-emerald-400">
                          +{pie.targetRoiPercent}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-bold uppercase">
                          Stop Loss
                        </span>
                        <span className="text-xs font-black text-rose-400">
                          -{pie.maxLossPercent}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-bold uppercase">
                          Trader Fee
                        </span>
                        <span className="text-xs font-black text-indigo-400">
                          {pie.ownerFeePercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Bar */}
                  <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2">
                    <Link
                      to={`/ptrading/${pie._id}`}
                      className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black text-center transition"
                    >
                      View Pool
                    </Link>

                    {pie.status === 'funding' && (
                      <button
                        onClick={() => {
                          if (!isLoggedIn) {
                            navigate('/login');
                            return;
                          }
                          setSelectedPieForDeposit(pie);
                        }}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider text-center shadow-lg shadow-blue-600/20 transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <FiPieChart className="w-3.5 h-3.5" /> Buy Slice
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <DepositSliceModal
        pie={selectedPieForDeposit}
        isOpen={Boolean(selectedPieForDeposit)}
        onClose={() => setSelectedPieForDeposit(null)}
        onSuccess={() => {
          fetchPies();
          if (isLoggedIn) fetchMySlices();
        }}
      />

      <CreatePieModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchPies()}
      />
    </div>
  );
}
