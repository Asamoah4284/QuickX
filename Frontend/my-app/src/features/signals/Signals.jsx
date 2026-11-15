import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiActivity, FiBell } from 'react-icons/fi';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { Alert, Button, Container, EmptyState, PageHeader, Skeleton } from '../../ui/primitives';
import { Tabs } from '../../ui/overlays';
import { Stagger, StaggerItem } from '../../ui/motion';
import FeatureGate from '../billing/FeatureGate';
import SignalCard from './SignalCard';
import TrackRecord, { SignalStats } from './TrackRecord';
import { getNotificationPermission, pushSupported, subscribeUserToPush } from '../../utils/webPush';

const REFRESH_MS = 60 * 1000;
const PAGE_SIZE = 20;

function EnablePush() {
  const [state, setState] = useState(() => (pushSupported() ? getNotificationPermission() : 'unsupported'));
  if (state !== 'default') return null;
  const enable = async () => {
    try {
      await subscribeUserToPush();
    } finally {
      setState(getNotificationPermission());
    }
  };
  return (
    <Alert tone="brand" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2">
        <FiBell className="h-4 w-4 shrink-0" />
        Turn on notifications to get every signal the moment it is posted.
      </span>
      <Button size="sm" onClick={enable}>
        Turn on
      </Button>
    </Alert>
  );
}

function SignalsFeed() {
  const [tab, setTab] = useState('live');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi('/api/signals', { params: { page, limit: PAGE_SIZE } });

  // Keep the feed fresh while the page is open and visible.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [reload]);

  if (error) return <Alert>{error.message}</Alert>;
  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const list = tab === 'live' ? data.open : data.history;
  const pages = Math.max(1, Math.ceil(data.historyTotal / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <EnablePush />
      <SignalStats stats={data.stats} openCount={data.open.length} />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'live', label: 'Live', count: data.open.length },
          { value: 'history', label: 'History', count: data.historyTotal },
        ]}
      />

      {list.length ? (
        <Stagger key={`${tab}-${page}`} className="grid gap-4 lg:grid-cols-2">
          {list.map((signal) => (
            <StaggerItem key={signal.id}>
              <SignalCard signal={signal} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState
          icon={FiActivity}
          title={tab === 'live' ? 'No live signals right now' : 'No closed signals yet'}
          description={
            tab === 'live'
              ? 'You will get a notification as soon as the next one is posted.'
              : 'Finished signals and their results will show up here.'
          }
        />
      )}

      {tab === 'history' && pages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span className="tabular text-sm text-fg-muted">
            {page} / {pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function Signals() {
  const { isSignedIn, has } = useAuth();
  const allowed = isSignedIn && has('signals');
  const { data: record } = useApi(allowed ? null : '/api/signals/public');

  return (
    <>
      <Helmet>
        <title>Signals — QuickX</title>
      </Helmet>
      <FeatureGate
        feature="signals"
        preview={
          record && record.stats.total > 0 ? (
            <div className="mx-auto mb-10 max-w-3xl">
              <h2 className="mb-4 text-lg font-semibold text-fg">Recent results</h2>
              <TrackRecord data={record} />
            </div>
          ) : null
        }
      >
        <Container className="py-10 sm:py-14">
          <PageHeader
            eyebrow="Signals"
            title="Live trade ideas"
            description="Entry, stop loss and targets for each setup. Manage your own risk on every trade."
            className="mb-8"
          />
          <SignalsFeed />
        </Container>
      </FeatureGate>
    </>
  );
}
