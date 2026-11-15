import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiEdit3, FiActivity, FiCalendar, FiDollarSign, FiUsers } from 'react-icons/fi';
import { adminApi, errorMessage, session } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { FEATURES } from '../../lib/features';
import { Alert, Button, Card, PageHeader, Skeleton } from '../../ui/primitives';

function Stat({ label, value, hint, loading }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="tabular mt-2 text-3xl font-semibold text-fg">{value}</p>
      )}
      {hint ? <p className="mt-1 text-xs text-fg-muted">{hint}</p> : null}
    </Card>
  );
}

function Shortcut({ to, icon: Icon, title, body }) {
  return (
    <Link to={to} className="group block">
      <Card interactive className="flex h-full items-start gap-3 p-4">
        <span className="rounded-lg bg-brand-500/10 p-2 text-brand-300">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-semibold text-fg">
            {title}
            <FiArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </span>
          <span className="mt-0.5 block text-xs text-fg-muted">{body}</span>
        </span>
      </Card>
    </Link>
  );
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const summary = useApi('/api/admin/members/summary', { client: adminApi });
  const signals = useApi('/api/signals/admin', { client: adminApi });
  const sessions = useApi('/api/bookings/admin', { client: adminApi });
  const withdrawals = useApi('/api/admin/withdrawals?status=pending', { client: adminApi });
  const [opening, setOpening] = useState(false);
  const [studioError, setStudioError] = useState('');

  const openStudio = async () => {
    setOpening(true);
    setStudioError('');
    try {
      const { data } = await adminApi.post('/api/admin/owner-session');
      session.set(data.token, data.user);
      navigate('/creator/dashboard');
    } catch (err) {
      setStudioError(errorMessage(err, 'Could not open the Studio.'));
    } finally {
      setOpening(false);
    }
  };

  const byFeature = summary.data?.byFeature || {};
  const stats = signals.data?.stats;
  const liveSignals = (signals.data?.signals || []).filter((s) => s.status === 'active').length;
  const upcoming = (sessions.data?.bookings || []).filter((b) => b.status === 'upcoming').length;
  const pendingList = Array.isArray(withdrawals.data)
    ? withdrawals.data
    : withdrawals.data?.requests || withdrawals.data?.withdrawals || [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Members, signals and sessions at a glance."
        actions={
          <Button onClick={openStudio} disabled={opening}>
            <FiEdit3 className="h-4 w-4" />
            {opening ? 'Opening…' : 'Open Studio'}
          </Button>
        }
      />
      {studioError ? <Alert>{studioError}</Alert> : null}
      {summary.error ? <Alert>{summary.error.message}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Active members"
          value={summary.data?.activeMembers ?? 0}
          hint={`of ${summary.data?.totalUsers ?? 0} registered users`}
          loading={summary.loading}
        />
        <Stat
          label="Win rate (90 days)"
          value={stats?.winRate == null ? '—' : `${stats.winRate}%`}
          hint={stats ? `${stats.wins} wins · ${stats.losses} losses` : null}
          loading={signals.loading}
        />
        <Stat
          label="Pips (90 days)"
          value={stats ? `${stats.totalPips > 0 ? '+' : ''}${stats.totalPips}` : '—'}
          hint={`${liveSignals} signal${liveSignals === 1 ? '' : 's'} live now`}
          loading={signals.loading}
        />
        <Stat
          label="Upcoming sessions"
          value={upcoming}
          hint={pendingList.length ? `${pendingList.length} withdrawal request(s) waiting` : 'No withdrawals waiting'}
          loading={sessions.loading}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-fg">Active access by feature</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(FEATURES).map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.key} className="flex items-center gap-3 p-4">
                <span className="rounded-lg bg-ink-800 p-2 text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-xs text-fg-muted">{f.label}</span>
                  {summary.loading ? (
                    <Skeleton className="mt-1 h-5 w-10" />
                  ) : (
                    <span className="tabular block text-lg font-semibold text-fg">{byFeature[f.key] ?? 0}</span>
                  )}
                </span>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-fg">Shortcuts</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Shortcut to="/admin/signals" icon={FiActivity} title="Post a signal" body="Members get a push notification." />
          <Shortcut to="/admin/members" icon={FiUsers} title="Find a member" body="See or grant someone's access." />
          <Shortcut to="/admin/sessions" icon={FiCalendar} title="Mentorship sessions" body="Confirm or close bookings." />
          <Shortcut to="/admin/pricing" icon={FiDollarSign} title="Edit prices" body="Change plan prices and durations." />
        </div>
      </section>
    </div>
  );
}
