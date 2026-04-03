import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreatorEarnings() {
  const token = localStorage.getItem('authToken');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/instructor/courses/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-creator">
          <p className="text-sm text-slate-500">Gross revenue</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">GH₵{Number(data?.totalRevenue || 0).toFixed(2)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-creator">
          <p className="text-sm text-slate-500">Net earnings</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">GH₵{Number(data?.totalEarnings || 0).toFixed(2)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-creator">
          <p className="text-sm text-slate-500">Available balance</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">GH₵{Number(data?.availableBalance || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-creator">
        <h2 className="text-2xl font-semibold text-slate-950">Transactions</h2>
        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Loading earnings...</p>
          ) : (data?.transactions || []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">No creator transactions yet.</div>
          ) : (
            data.transactions.map((transaction) => (
              <div key={transaction._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-950">Reference {transaction.paymentReference || 'N/A'}</p>
                  <p className="text-sm text-slate-500">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="text-sm font-semibold text-slate-950">GH₵{Number(transaction.tutorEarning || 0).toFixed(2)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
