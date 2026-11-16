import { useEffect, useMemo, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    axios
      .get(`${API_URL}/api/instructor/courses/dashboard`, { headers })
      .then((dashboardRes) => {
        setData(dashboardRes.data);
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
      <div className="rounded-2xl border border-line bg-ink-850 px-4 py-5 text-sm text-fg-subtle">
        Loading creator overview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-down/30 bg-down/10 px-4 py-5 text-sm text-down">{error}</div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <OverviewCard label="Total courses" value={stats.totalCourses || 0} hint="All creator-owned courses" />
        <OverviewCard label="Students enrolled" value={stats.totalStudents || 0} hint="Unique learners across your catalog" />
        <OverviewCard
          label="Total revenue"
          value={`GH₵${Number(stats.totalRevenue || 0).toFixed(2)}`}
          hint="Course sales tracked so far"
        />
        <OverviewCard label="Average rating" value={stats.averageRating || 0} hint="Average of all course reviews" />
        <OverviewCard label="Completion rate" value={`${stats.completionRate || 0}%`} hint="Average learner progress" />
      </div>

      <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
        <section className="rounded-2xl border border-line bg-ink-850 p-4 sm:p-5 xl:col-span-2">
          <h2 className="text-base font-semibold text-fg">Revenue &amp; enrollments</h2>
          <p className="mt-0.5 text-xs text-fg-subtle">Course revenue and new students over the last 6 months.</p>
          <div className="mt-3 h-[220px] w-full sm:h-[240px]">
            <Line data={trendChartData} options={trendChartOptions} />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-ink-850 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-fg">Courses by status</h2>
          <p className="mt-0.5 text-xs text-fg-subtle">How your catalog is distributed across listing states.</p>
          {totalStatusCount === 0 ? (
            <div className="mt-4 flex h-[180px] items-center justify-center rounded-xl border border-dashed border-line bg-ink-900 text-xs text-fg-subtle">
              No courses yet. Create one to see this chart.
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
