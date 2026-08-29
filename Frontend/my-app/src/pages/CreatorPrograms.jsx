import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiCheckCircle, FiChevronRight, FiZap } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL;

const TYPE_META = {
  forex: { label: 'Forex', color: 'bg-blue-100 text-blue-800' },
  crypto: { label: 'Crypto', color: 'bg-amber-100 text-amber-800' },
  webdev: { label: 'Web Dev', color: 'bg-emerald-100 text-emerald-800' },
};

function formatPrice(amount, currency = 'GHS') {
  const value = Number(amount || 0);
  if (currency === 'GHS') return `GH₵${value.toFixed(2)}`;
  return `${currency} ${value.toFixed(2)}`;
}

export default function CreatorPrograms() {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const isApprovedCreator = user?.role === 'tutor' && user?.creatorStatus === 'approved';

  const [programs, setPrograms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const requests = [axios.get(`${API_URL}/api/programs`, { headers })];
      if (token) {
        requests.push(
          axios
            .get(`${API_URL}/api/programs/user/me`, { headers })
            .catch(() => ({ data: [] }))
        );
      }
      const [programsRes, enrollmentsRes] = await Promise.all(requests);
      setPrograms(Array.isArray(programsRes.data) ? programsRes.data : []);
      setEnrollments(
        token && enrollmentsRes
          ? Array.isArray(enrollmentsRes.data)
            ? enrollmentsRes.data
            : []
          : []
      );
    } catch (loadError) {
      setError(loadError.response?.data?.message || loadError.message);
      setPrograms([]);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const enrolledIds = new Set(
    enrollments.map((entry) => String(entry.programId?._id || entry.programId || ''))
  );

  const joinProgram = (program) => {
    if (!token) {
      navigate('/login', { state: { from: '/programs' } });
      return;
    }
    if (!isApprovedCreator) {
      navigate('/creator/onboarding');
      return;
    }
    navigate('/checkout', {
      state: {
        item: {
          type: 'program',
          id: program._id,
          title: program.name,
          price: program.price,
          description: program.description,
        },
        returnPath: '/programs',
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-500">Loading creator programs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-[32px] bg-[#1B5EF5] p-8 text-white ring-1 ring-white/10">
          <p className="text-sm font-medium text-blue-100">Creator programs</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Choose your creator track</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
            Enroll in a forex, crypto, or web development track to publish courses in that category on
            QuickX Learn.
          </p>
          {isApprovedCreator ? (
            <Link
              to="/creator/dashboard"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Open creator studio
              <FiChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/creator/onboarding"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Apply as a creator first
              <FiChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {enrollments.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Your enrollments</h2>
            <div className="mt-3 space-y-3">
              {enrollments.map((entry) => {
                const program = entry.programId;
                const meta = TYPE_META[program?.courseType] || { label: program?.courseType || 'Track', color: 'bg-slate-100 text-slate-700' };
                return (
                  <div
                    key={entry._id}
                    className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                  >
                    <FiCheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-950">{program?.name || 'Creator program'}</p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        Active · {meta.label} track
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.color}`}>
                      Enrolled
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : token && isApprovedCreator ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            You&apos;re an approved creator but haven&apos;t joined a track yet. Pick a program below to unlock
            publishing in that category.
          </div>
        ) : null}

        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Available programs</h2>
          {programs.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No creator programs are published yet. Check back soon.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {programs.map((program) => {
                const joined = enrolledIds.has(String(program._id));
                const meta = TYPE_META[program.courseType] || { label: program.courseType || 'Track', color: 'bg-slate-100 text-slate-700' };
                return (
                  <div
                    key={program._id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1B5EF5]/10 text-[#1B5EF5]">
                      <FiZap className="h-5 w-5" />
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{program.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {program.description || `${meta.label} creator track on QuickX Learn.`}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#1B5EF5]">
                        {formatPrice(program.price, program.currency)}
                      </p>
                    </div>
                    {joined ? (
                      <span className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                        Enrolled
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => joinProgram(program)}
                        className="rounded-2xl bg-[#1B5EF5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1552D6]"
                      >
                        {isApprovedCreator ? 'Join track' : 'Apply & join'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
