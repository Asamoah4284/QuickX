import { useState } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { adminApi, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatDate } from '../../lib/format';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '../../ui/primitives';
import { Tabs } from '../../ui/overlays';

const STATUS = {
  upcoming: { label: 'Upcoming', tone: 'brand' },
  completed: { label: 'Completed', tone: 'up' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export default function AdminSessions() {
  const { data, loading, error, reload } = useApi('/api/bookings/admin', { client: adminApi });
  const [tab, setTab] = useState('upcoming');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');

  const setStatus = async (id, status) => {
    setBusy(id);
    setActionError('');
    try {
      await adminApi.patch(`/api/bookings/admin/${id}`, { status });
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const all = data?.bookings || [];
  const shown = all.filter((b) => (tab === 'upcoming' ? b.status === 'upcoming' : b.status !== 'upcoming'));

  return (
    <div className="space-y-6">
      <PageHeader title="Mentorship sessions" description="1-on-1 sessions requested by members with Mentorship access." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'upcoming', label: 'Upcoming', count: all.filter((b) => b.status === 'upcoming').length },
          { value: 'past', label: 'Past' },
        ]}
      />
      {error ? <Alert>{error.message}</Alert> : null}
      {actionError ? <Alert>{actionError}</Alert> : null}
      {loading && !data ? <Skeleton className="h-40" /> : null}
      {data && !shown.length ? <EmptyState icon={FiCalendar} title="Nothing here yet" /> : null}
      {shown.length ? (
        <Card className="divide-y divide-line overflow-hidden">
          {shown.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-fg">
                  {b.member?.fullName || 'Member'} · <span className="tabular">{formatDate(b.date)} {b.time}</span>
                </p>
                <p className="text-sm text-fg-subtle">
                  {[b.member?.email, b.member?.phone].filter(Boolean).join(' · ')}
                </p>
                {b.topic ? <p className="mt-1 text-sm text-fg-muted">{b.topic}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS[b.status]?.tone}>{STATUS[b.status]?.label}</Badge>
                {b.status === 'upcoming' ? (
                  <>
                    <Button size="sm" loading={busy === b.id} onClick={() => setStatus(b.id, 'completed')}>
                      Mark done
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy === b.id} onClick={() => setStatus(b.id, 'cancelled')}>
                      Cancel
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
