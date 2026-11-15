import { useState } from 'react';
import { FiActivity, FiPlus } from 'react-icons/fi';
import { adminApi, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { timeAgo } from '../../lib/format';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton, Textarea } from '../../ui/primitives';
import { Modal, Tabs } from '../../ui/overlays';
import { DirectionPill, Pips, STATUS_META } from '../signals/SignalCard';
import { SignalStats } from '../signals/TrackRecord';

const EMPTY = { pair: '', direction: 'buy', orderType: 'market', entry: '', stopLoss: '', tp1: '', tp2: '', tp3: '', timeframe: '', note: '', chartImage: '' };

function NewSignalModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { tp1, tp2, tp3, ...rest } = form;
      await adminApi.post('/api/signals/admin', { ...rest, takeProfits: [tp1, tp2, tp3].filter((v) => v !== '') });
      setForm(EMPTY);
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not post the signal.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Post a signal" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Pair" htmlFor="s-pair" className="col-span-2 sm:col-span-1">
            <Input id="s-pair" value={form.pair} onChange={(e) => setForm((f) => ({ ...f, pair: e.target.value.toUpperCase() }))} placeholder="XAUUSD" required />
          </Field>
          <Field label="Direction" htmlFor="s-dir">
            <Select id="s-dir" value={form.direction} onChange={set('direction')}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </Select>
          </Field>
          <Field label="Order type" htmlFor="s-type">
            <Select id="s-type" value={form.orderType} onChange={set('orderType')}>
              <option value="market">Market</option>
              <option value="buy limit">Buy limit</option>
              <option value="sell limit">Sell limit</option>
              <option value="buy stop">Buy stop</option>
              <option value="sell stop">Sell stop</option>
            </Select>
          </Field>
          <Field label="Timeframe" htmlFor="s-tf">
            <Input id="s-tf" value={form.timeframe} onChange={set('timeframe')} placeholder="H1" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Entry" htmlFor="s-entry">
            <Input id="s-entry" type="number" step="any" min="0" value={form.entry} onChange={set('entry')} required />
          </Field>
          <Field label="Stop loss" htmlFor="s-sl">
            <Input id="s-sl" type="number" step="any" min="0" value={form.stopLoss} onChange={set('stopLoss')} required />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Target 1" htmlFor="s-tp1">
            <Input id="s-tp1" type="number" step="any" min="0" value={form.tp1} onChange={set('tp1')} required />
          </Field>
          <Field label="Target 2" htmlFor="s-tp2">
            <Input id="s-tp2" type="number" step="any" min="0" value={form.tp2} onChange={set('tp2')} />
          </Field>
          <Field label="Target 3" htmlFor="s-tp3">
            <Input id="s-tp3" type="number" step="any" min="0" value={form.tp3} onChange={set('tp3')} />
          </Field>
        </div>
        <Field label="Note" htmlFor="s-note" hint="Reasoning, risk advice, anything members should know.">
          <Textarea id="s-note" rows={3} value={form.note} onChange={set('note')} />
        </Field>
        <Field label="Chart image link" htmlFor="s-chart" hint="Optional. Paste a link to a chart screenshot.">
          <Input id="s-chart" type="url" value={form.chartImage} onChange={set('chartImage')} placeholder="https://" />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Post and notify members
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Post an update, or close the signal with a result. */
function ManageModal({ signal, onClose, onSaved }) {
  const [update, setUpdate] = useState('');
  const [status, setStatus] = useState(signal?.status || 'active');
  const [pips, setPips] = useState(signal?.resultPips ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.patch(`/api/signals/admin/${signal.id}`, {
        ...(update.trim() ? { update: update.trim() } : {}),
        status,
        resultPips: pips === '' ? null : Number(pips),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the ${signal.pair} signal? Members will no longer see it.`)) return;
    setBusy(true);
    try {
      await adminApi.delete(`/api/signals/admin/${signal.id}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`${signal.pair} · ${signal.direction.toUpperCase()}`}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Update for members" htmlFor="m-update" hint="Optional. Sent as a notification, e.g. “TP1 hit, move stop to entry”.">
          <Textarea id="m-update" rows={2} value={update} onChange={(e) => setUpdate(e.target.value)} maxLength={500} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status" htmlFor="m-status">
            <Select id="m-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Result (pips)" htmlFor="m-pips" hint="Negative for a loss.">
            <Input id="m-pips" type="number" step="any" value={pips} onChange={(e) => setPips(e.target.value)} />
          </Field>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
            Delete
          </Button>
          <Button type="submit" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminSignals() {
  const { data, loading, error, reload } = useApi('/api/signals/admin', { client: adminApi });
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(null);
  const [tab, setTab] = useState('active');

  const signals = data?.signals || [];
  const live = signals.filter((s) => s.status === 'active');
  const shown = tab === 'active' ? live : signals.filter((s) => s.status !== 'active');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Signals"
        description="Post trade ideas. Members with Signals access are notified straight away."
        actions={
          <Button onClick={() => setCreating(true)}>
            <FiPlus className="h-4 w-4" />
            New signal
          </Button>
        }
      />
      {error ? <Alert>{error.message}</Alert> : null}
      {data ? <SignalStats stats={data.stats} openCount={live.length} /> : null}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'active', label: 'Live', count: live.length },
          { value: 'closed', label: 'Closed', count: signals.length - live.length },
        ]}
      />

      {loading && !data ? <Skeleton className="h-40" /> : null}
      {data && !shown.length ? (
        <EmptyState icon={FiActivity} title={tab === 'active' ? 'No live signals' : 'No closed signals yet'} />
      ) : null}
      {shown.length ? (
        <Card className="divide-y divide-line overflow-hidden">
          {shown.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <span className="tabular font-semibold text-fg">{s.pair}</span>
                <DirectionPill direction={s.direction} />
                <span className="tabular text-sm text-fg-muted">
                  @ {s.entry} · SL {s.stopLoss} · TP {s.takeProfits.join(' / ')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Pips value={s.resultPips} />
                <Badge tone={STATUS_META[s.status]?.tone}>{STATUS_META[s.status]?.label}</Badge>
                <span className="hidden text-xs text-fg-subtle sm:inline">{timeAgo(s.createdAt)}</span>
                <Button size="sm" variant="secondary" onClick={() => setManaging(s)}>
                  Manage
                </Button>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      <NewSignalModal open={creating} onClose={() => setCreating(false)} onSaved={reload} />
      {managing ? <ManageModal signal={managing} onClose={() => setManaging(null)} onSaved={reload} /> : null}
    </div>
  );
}
