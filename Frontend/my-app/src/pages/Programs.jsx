import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Creator program enrollments — separate SKU from single-course purchases.
 */
export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/programs`);
        if (!cancelled) {
          setPrograms(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleEnroll = (program) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { state: { from: '/programs' } });
      return;
    }
    navigate('/checkout', {
      state: {
        item: {
          type: 'program',
          id: program._id,
          title: program.name,
          price: program.price,
          description: program.description
        },
        returnPath: '/programs',
        returnTabState: null
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Creator programs</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Enroll in a program to publish your own courses in that track. Pricing is separate from buying individual courses to learn.
          </p>
        </header>

        {loading && (
          <p className="text-center text-slate-500">Loading programs…</p>
        )}
        {error && (
          <p className="text-center text-red-600">{error}</p>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <article
              key={p._id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm flex flex-col"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {p.courseType}
              </span>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{p.name}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 flex-1">{p.description || 'Publish and monetize your courses on QuickX Learn.'}</p>
              <p className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
                {p.currency === 'GHS' ? 'GH₵' : p.currency}{p.price}
                <span className="text-sm font-normal text-slate-500 ml-1">
                  {p.billingPeriod === 'subscription' ? '/yr' : ' one-time'}
                </span>
              </p>
              <button
                type="button"
                onClick={() => handleEnroll(p)}
                className="mt-6 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-sm font-medium transition-colors"
              >
                Enroll now
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
