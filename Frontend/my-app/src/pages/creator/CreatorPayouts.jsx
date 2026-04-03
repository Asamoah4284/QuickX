import { useEffect, useState } from 'react';
import axios from 'axios';
import StatusBadge from '../../components/creator/StatusBadge';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreatorPayouts() {
  const token = localStorage.getItem('authToken');
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/instructor/courses/payouts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => setPayouts(data))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-creator">
      <h2 className="text-2xl font-semibold text-slate-950">Payouts</h2>
      <p className="mt-1 text-sm text-slate-500">Track requests, processing states, and completed creator payouts.</p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading payouts...</p>
        ) : payouts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">No payouts requested yet.</div>
        ) : (
          payouts.map((payout) => (
            <div key={payout._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="font-semibold text-slate-950">GH₵{Number(payout.amount || 0).toFixed(2)}</p>
                <p className="text-sm text-slate-500">Requested {new Date(payout.requestedAt || payout.createdAt).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={payout.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
