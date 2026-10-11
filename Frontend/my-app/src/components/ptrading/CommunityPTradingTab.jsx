import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FiPieChart,
  FiTrendingUp,
  FiShield,
  FiPlus,
  FiUsers,
  FiChevronRight,
  FiClock,
  FiAward,
} from 'react-icons/fi';
import PieChartDonut from './PieChartDonut';
import DepositSliceModal from './DepositSliceModal';
import CreatePieModal from './CreatePieModal';

export default function CommunityPTradingTab({ tutorId, isTutor }) {
  const [pies, setPies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPieForDeposit, setSelectedPieForDeposit] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    if (tutorId) {
      fetchCommunityPies();
    }
  }, [tutorId]);

  const fetchCommunityPies = async () => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/api/ptrading?tutorId=${tutorId}`, { headers });
      if (res.data?.success) {
        setPies(res.data.pies || []);
      }
    } catch (err) {
      console.error('Error fetching community trading pies:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-[2rem] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-black uppercase tracking-wider">
            <FiPieChart className="w-3.5 h-3.5" />
            <span>Community Partner Trading (Pie)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Back Your Mentor's Live Trades
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
            Deposit capital into verified community pools to earn your slice of the trading profits.
            Profits and refunds flow automatically into your QuickX wallet.
          </p>
        </div>

        {isTutor && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition flex items-center gap-2 active:scale-95"
          >
            <FiPlus className="w-4 h-4" /> Launch Community Pie
          </button>
        )}
      </div>

      {/* Pools List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs font-medium space-y-3">
          <div className="inline-block w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p>Loading community pools...</p>
        </div>
      ) : pies.length === 0 ? (
        <div className="p-10 rounded-[2rem] border border-slate-200 bg-white text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FiPieChart className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900">No active community pies yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isTutor
              ? 'As the mentor, launch a trading pool for your community to back your live market execution!'
              : 'Your mentor has not launched an active trading pool yet. Check back soon!'}
          </p>
          {isTutor && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase inline-flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <FiPlus /> Launch Community Pie
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pies.map((pie) => {
            const fillPct =
              pie.targetAmount > 0
                ? Math.min(100, (pie.raisedAmount / pie.targetAmount) * 100)
                : 0;

            return (
              <div
                key={pie._id}
                className="rounded-[2rem] border border-slate-200/90 bg-white p-6 flex flex-col justify-between hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-black uppercase">
                      {pie.pair}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        pie.status === 'funding'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : pie.status === 'trading'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : pie.outcome === 'win'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {pie.status === 'settled'
                        ? pie.outcome === 'win'
                          ? 'WON 🏆'
                          : 'LOSS 🔻'
                        : pie.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-base line-clamp-1 group-hover:text-blue-600 transition">
                      {pie.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {pie.description}
                    </p>
                  </div>

                  {/* Donut Visualizer */}
                  <div className="py-2 flex items-center justify-center">
                    <PieChartDonut
                      deposits={[]}
                      targetAmount={pie.targetAmount}
                      raisedAmount={pie.raisedAmount}
                      size={140}
                      interactive={false}
                      showLegend={false}
                      theme="light"
                    />
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">
                        GH₵{pie.raisedAmount.toLocaleString()} / GH₵{pie.targetAmount.toLocaleString()}
                      </span>
                      <span className="text-blue-600 font-black">{fillPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Conditions */}
                  <div className="grid grid-cols-3 gap-1.5 p-3 rounded-2xl bg-slate-50 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Target
                      </span>
                      <span className="font-black text-emerald-600">+{pie.targetRoiPercent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Max Loss
                      </span>
                      <span className="font-black text-rose-600">-{pie.maxLossPercent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Trader Fee
                      </span>
                      <span className="font-black text-indigo-600">{pie.ownerFeePercent}%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    to={`/ptrading/${pie._id}`}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black text-center transition"
                  >
                    View Details
                  </Link>

                  {pie.status === 'funding' && (
                    <button
                      onClick={() => setSelectedPieForDeposit(pie)}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider text-center shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1 active:scale-95"
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

      {/* Modals */}
      <DepositSliceModal
        pie={selectedPieForDeposit}
        isOpen={Boolean(selectedPieForDeposit)}
        onClose={() => setSelectedPieForDeposit(null)}
        onSuccess={() => fetchCommunityPies()}
      />

      <CreatePieModal
        isOpen={showCreateModal}
        defaultTutorId={tutorId}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchCommunityPies()}
      />
    </div>
  );
}
