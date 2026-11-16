import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiCalendar, FiClock } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatDate } from '../../lib/format';
import { Alert, Badge, Button, Card, Container, EmptyState, Field, Input, PageHeader, Skeleton, Textarea } from '../../ui/primitives';
import { Reveal } from '../../ui/motion';
import FeatureGate from '../billing/FeatureGate';

const WHATSAPP_URL =
  'https://wa.me/233559037872?text=' + encodeURIComponent('Hello Maxwell, I am a mentorship member on QuickX.');

const STATUS = {
  upcoming: { label: 'Upcoming', tone: 'brand' },
  completed: { label: 'Completed', tone: 'up' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

function tomorrow() {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().slice(0, 10);
}

function BookingForm({ onBooked }) {
  const [form, setForm] = useState({ date: tomorrow(), time: '18:00', topic: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/bookings', form);
      setForm((f) => ({ ...f, topic: '' }));
      onBooked();
    } catch (err) {
      setError(errorMessage(err, 'Could not request that session.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 sm:p-7">
      <h2 className="text-lg font-semibold text-fg">Request a 1-on-1 session</h2>
      <p className="mt-1 text-sm text-fg-muted">Pick a time that suits you. Maxwell will confirm or suggest another slot.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" htmlFor="session-date">
            <Input id="session-date" type="date" min={tomorrow()} value={form.date} onChange={set('date')} required />
          </Field>
          <Field label="Time" htmlFor="session-time">
            <Input id="session-time" type="time" value={form.time} onChange={set('time')} required />
          </Field>
        </div>
        <Field label="What do you want to work on?" htmlFor="session-topic" hint="Optional, but it helps Maxwell prepare.">
          <Textarea
            id="session-topic"
            value={form.topic}
            onChange={set('topic')}
            maxLength={500}
            placeholder="e.g. Reviewing my last five trades and my risk management"
          />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" loading={busy} className="w-full sm:w-auto">
          Request session
        </Button>
      </form>
    </Card>
  );
}

function Sessions() {
  const { data, loading, error, reload } = useApi('/api/bookings');
  const [cancelling, setCancelling] = useState('');
  const [actionError, setActionError] = useState('');

  const cancel = async (id) => {
    setCancelling(id);
    setActionError('');
    try {
      await api.patch(`/api/bookings/${id}/cancel`);
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setCancelling('');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-6">
        <Reveal>
          <BookingForm onBooked={reload} />
        </Reveal>
        <Reveal delay={0.06}>
          <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-fg">Message Maxwell directly</h2>
              <p className="mt-1 text-sm text-fg-muted">Quick questions between sessions.</p>
            </div>
            <Button href={WHATSAPP_URL} target="_blank" rel="noreferrer" variant="secondary">
              <FaWhatsapp className="h-4 w-4 text-up" />
              WhatsApp
            </Button>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <h2 className="mb-4 text-lg font-semibold text-fg">Your sessions</h2>
        {actionError ? <Alert className="mb-4">{actionError}</Alert> : null}
        {error ? <Alert>{error.message}</Alert> : null}
        {loading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : null}
        {data && !data.bookings.length ? (
          <EmptyState icon={FiCalendar} title="No sessions yet" description="Request your first session to get started." />
        ) : null}
        <ul className="space-y-3">
          {(data?.bookings || []).map((b) => (
            <li key={b.id}>
              <Card className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-fg">
                    <span className="flex items-center gap-1.5">
                      <FiCalendar className="h-4 w-4 text-fg-subtle" />
                      {formatDate(b.date)}
                    </span>
                    <span className="tabular flex items-center gap-1.5">
                      <FiClock className="h-4 w-4 text-fg-subtle" />
                      {b.time}
                    </span>
                  </p>
                  {b.topic ? <p className="mt-1 truncate text-sm text-fg-muted">{b.topic}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={STATUS[b.status]?.tone}>{STATUS[b.status]?.label || b.status}</Badge>
                  {b.status === 'upcoming' ? (
                    <Button variant="ghost" size="sm" loading={cancelling === b.id} onClick={() => cancel(b.id)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}

export default function Mentorship() {
  return (
    <>
      <Helmet>
        <title>Mentorship | QuickX</title>
      </Helmet>
      <FeatureGate feature="mentorship">
        <Container className="py-10 sm:py-14">
          <PageHeader
            eyebrow="Mentorship"
            title="Work 1-on-1 with Maxwell"
            description="Book sessions, get your trades reviewed and build a plan that fits you."
            className="mb-8"
          />
          <Sessions />
        </Container>
      </FeatureGate>
    </>
  );
}
