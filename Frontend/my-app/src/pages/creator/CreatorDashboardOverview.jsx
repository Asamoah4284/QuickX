import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import OverviewCard from '../../components/creator/OverviewCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_URL = import.meta.env.VITE_API_URL;

const trendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'top',
      labels: { usePointStyle: true, boxWidth: 6, font: { size: 10 }, padding: 8 },
    },
    tooltip: {
      callbacks: {
        label(ctx) {
          const v = ctx.parsed.y;
          if (ctx.datasetIndex === 0) return ` Revenue: GH₵${Number(v).toFixed(2)}`;
          return ` Enrollments: ${v}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(148, 163, 184, 0.2)' },
      ticks: { maxRotation: 45, minRotation: 0, font: { size: 10 } },
    },
    y: {
      type: 'linear',
      position: 'left',
      title: { display: true, text: 'Revenue (GH₵)', color: '#64748b', font: { size: 10 } },
      grid: { color: 'rgba(148, 163, 184, 0.2)' },
      ticks: { callback: (v) => `₵${v}` },
    },
    y1: {
      type: 'linear',
      position: 'right',
      title: { display: true, text: 'Enrollments', color: '#64748b', font: { size: 10 } },
      grid: { drawOnChartArea: false },
      ticks: { maxTicksLimit: 8 },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { boxWidth: 8, font: { size: 10 }, padding: 10 },
    },
  },
  cutout: '58%',
};

export default function CreatorDashboardOverview() {
  const token = localStorage.getItem('authToken');
  const [data, setData] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API_URL}/api/instructor/courses/dashboard`, { headers }),
      axios
        .get(`${API_URL}/api/programs/user/me`, { headers })
        .catch(() => ({ data: [] })),
    ])
      .then(([dashboardRes, enrollmentsRes]) => {
        setData(dashboardRes.data);
        setEnrollments(Array.isArray(enrollmentsRes.data) ? enrollmentsRes.data : []);
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || requestError.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const trendChartData = useMemo(() => {
    const labels = data?.charts?.labels || [];
    const revenue = data?.charts?.revenue || [];
    const enrollments = data?.charts?.enrollments || [];
    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: revenue,
          borderColor: 'rgb(15 23 42)',
          backgroundColor: 'rgba(15, 23, 42, 0.08)',
          fill: true,
          tension: 0.35,
          yAxisID: 'y',
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'Enrollments',
          data: enrollments,
          borderColor: 'rgb(5 150 105)',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          fill: true,
          tension: 0.35,
          yAxisID: 'y1',
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [data]);

  const statusChartData = useMemo(() => {
    const rows = data?.charts?.courseStatus || [];
    const colors = ['#64748b', '#f59e0b', '#3b82f6', '#10b981', '#f43f5e', '#94a3b8'];
    return {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          data: rows.map((r) => r.count),
          backgroundColor: rows.map((_, i) => colors[i % colors.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [data]);

  const totalStatusCount = useMemo(() => {
    const rows = data?.charts?.courseStatus || [];
    return rows.reduce((sum, r) => sum + (r.count || 0), 0);
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-5 text-sm text-slate-500">
        Loading creator overview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-5 text-sm text-rose-700">{error}</div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Creator program tracks</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Active enrollments unlock publishing in each category.
            </p>
          </div>
          <Link
            to="/programs"
            className="text-xs font-semibold text-blue-700 hover:text-blue-800"
          >
            Manage programs
          </Link>
        </div>
        {enrollments.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No active program enrollments yet.{' '}
            <Link to="/programs" className="font-medium text-blue-700 hover:underline">
              Join a creator track
            </Link>{' '}
            to publish courses in forex, crypto, or web development.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((entry) => {
              const program = entry.programId;
              return (
                <li
                  key={entry._id}
                  className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3"
                >
                  <p className="font-semibold text-slate-950">{program?.name || 'Creator program'}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Active · {program?.courseType || 'creator track'}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <OverviewCard label="Total courses" value={stats.totalCourses || 0} hint="All creator-owned courses" />
        <OverviewCard label="Students enrolled" value={stats.totalStudents || 0} hint="Unique learners across your catalog" />
        <OverviewCard
          label="Total revenue"
          value={`GH₵${Number(stats.totalRevenue || 0).toFixed(2)}`}
          hint="Net tutor earnings tracked so far"
        />
        <OverviewCard label="Average rating" value={stats.averageRating || 0} hint="Average of all course reviews" />
        <OverviewCard label="Completion rate" value={`${stats.completionRate || 0}%`} hint="Average learner progress" />
        <OverviewCard label="Pending reviews" value={stats.pendingReviews || 0} hint="Courses waiting for moderation" />
      </div>

      <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 xl:col-span-2">
          <h2 className="text-base font-semibold text-slate-950">Revenue &amp; enrollments</h2>
          <p className="mt-0.5 text-xs text-slate-500">Last 6 months — completed payouts to you and new student enrollments.</p>
          <div className="mt-3 h-[220px] w-full sm:h-[240px]">
            <Line data={trendChartData} options={trendChartOptions} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-950">Courses by status</h2>
          <p className="mt-0.5 text-xs text-slate-500">How your catalog is distributed across listing states.</p>
          {totalStatusCount === 0 ? (
            <div className="mt-4 flex h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
              No courses yet — create a course to see this chart.
            </div>
          ) : (
            <div className="mt-3 h-[200px] w-full sm:h-[220px]">
              <Doughnut data={statusChartData} options={doughnutOptions} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
