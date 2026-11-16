import { useEffect, useState } from 'react';
import { FiCalendar, FiPlus, FiVideo } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Skeleton, Textarea } from '../../ui/primitives';
import { Modal, Tabs } from '../../ui/overlays';
import { BASE, useCommunity } from './shared';

function when(date) {
  return new Date(date).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** "in 2h 5m", "Live now", or "" once it is over. Re-renders every 30 seconds. */
function useCountdown(startsAt, endsAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 2 * 60 * 60 * 1000;
  if (now >= start && now <= end) return { live: true, label: 'Live now' };
  if (now > end) return { live: false, label: '' };
  const mins = Math.round((start - now) / 60000);
  if (mins < 60) return { live: false, soon: true, label: `in ${mins}m` };
  if (mins < 24 * 60) return { live: false, soon: mins < 180, label: `in ${Math.floor(mins / 60)}h ${mins % 60}m` };
  return { live: false, label: `in ${Math.floor(mins / (24 * 60))}d` };
}

function ScheduleModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', startsAt: '', endsAt: '', joinUrl: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`${BASE}/live-sessions`, {
        ...form,
        // datetime-local has no timezone; send exact instants.
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      });
      onSaved();
      setForm({ title: '', description: '', startsAt: '', endsAt: '', joinUrl: '' });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule a live session">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" htmlFor="live-title">
          <Input id="live-title" value={form.title} onChange={set('title')} maxLength={200} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts" htmlFor="live-start">
            <Input id="live-start" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} required />
          </Field>
          <Field label="Ends" htmlFor="live-end" hint="Optional">
            <Input id="live-end" type="datetime-local" value={form.endsAt} onChange={set('endsAt')} min={form.startsAt} />
          </Field>
        </div>
        <Field label="Join link" htmlFor="live-url" hint="Zoom, Google Meet, YouTube Live…">
          <Input id="live-url" type="url" value={form.joinUrl} onChange={set('joinUrl')} placeholder="https://" required />
        </Field>
        <Field label="What will you cover?" htmlFor="live-desc">
          <Textarea id="live-desc" rows={3} value={form.description} onChange={set('description')} maxLength={1000} />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Schedule and notify members
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SessionCard({ session, past, onCancel }) {
  const { me } = useCommunity();
  const countdown = useCountdown(session.startsAt, session.endsAt);
  return (
    <Card className={`p-5 ${countdown.live ? 'border-up/40' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {countdown.live ? (
              <Badge tone="up">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-up" />
                Live now
              </Badge>
            ) : countdown.label && !past ? (
              <Badge tone={countdown.soon ? 'warn' : 'neutral'}>{countdown.label}</Badge>
            ) : null}
            <span className="tabular flex items-center gap-1.5 text-sm text-fg-muted">
              <FiCalendar className="h-4 w-4" />
              {when(session.startsAt)}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-fg">{session.title}</h3>
          {session.description ? <p className="mt-1 whitespace-pre-line text-sm text-fg-muted">{session.description}</p> : null}
        </div>
        {!past ? (
          <div className="flex shrink-0 items-center gap-2">
            {me.isModerator ? (
              <Button variant="ghost" size="sm" onClick={() => onCancel(session)}>
                Cancel
              </Button>
            ) : null}
            <Button href={session.joinUrl} target="_blank" rel="noopener noreferrer" variant={countdown.live || countdown.soon ? 'primary' : 'secondary'}>
              <FiVideo className="h-4 w-4" />
              Join
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default function Live() {
  const { me } = useCommunity();
  const [tab, setTab] = useState('upcoming');
  const { data, loading, error, reload } = useApi(`${BASE}/live-sessions`, { params: tab === 'past' ? { past: 1 } : {} });
  const [scheduling, setScheduling] = useState(false);
  const [actionError, setActionError] = useState('');

  const cancel = async (session) => {
    if (!window.confirm(`Cancel "${session.title}"? Members will be notified.`)) return;
    try {
      await api.patch(`${BASE}/live-sessions/${session._id}`, { cancelled: true });
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const sessions = data?.sessions || [];

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
        />
        {me.isModerator ? (
          <Button onClick={() => setScheduling(true)}>
            <FiPlus className="h-4 w-4" />
            Schedule session
          </Button>
        ) : null}
      </div>
      {error ? <Alert>{error.message}</Alert> : null}
      {actionError ? <Alert>{actionError}</Alert> : null}
      {loading && !data ? <Skeleton className="h-40" /> : null}
      {data && !sessions.length ? (
        <EmptyState
          icon={FiVideo}
          title={tab === 'upcoming' ? 'No live sessions scheduled' : 'No past sessions'}
          description={tab === 'upcoming' ? 'You will be notified when the next one is announced.' : undefined}
        />
      ) : null}
      {sessions.map((session, i) => (
        <div key={session._id} className="rise-in" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <SessionCard session={session} past={tab === 'past'} onCancel={cancel} />
        </div>
      ))}
      <ScheduleModal open={scheduling} onClose={() => setScheduling(false)} onSaved={reload} />
    </div>
  );
}
