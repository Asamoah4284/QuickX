import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiExternalLink, FiPieChart, FiPlus } from 'react-icons/fi';
import { adminApi, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { cedis, formatDate } from '../../lib/format';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton, Textarea } from '../../ui/primitives';
import { Modal, Tabs } from '../../ui/overlays';
import { OUTCOME, PIE_STATUS, percentFunded } from '../pie/shared';

const NEW_PIE = {
  title: '',
  pair: '',
  market: 'forex',
  description: '',
  targetAmount: '',
  minDeposit: '50',
  maxDeposit: '',
  targetRoiPercent: '10',
  maxLossPercent: '5',
  ownerFeePercent: '20',
  riskLevel: 'Moderate',
  fundingDeadline: '',
};

function useAction(onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      onDone?.(res?.data?.message);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function CreatePieModal({ onClose, onDone }) {
  const [form, setForm] = useState(NEW_PIE);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const { busy, error, run } = useAction(onDone);

  const submit = (e) => {
    e.preventDefault();
    run(() =>
      adminApi.post('/api/ptrading', {
        ...form,
        maxDeposit: form.maxDeposit || form.targetAmount,
        fundingDeadline: form.fundingDeadline || null,
      })
    ).then((ok) => ok && onClose());
  };

  return (
    <Modal open onClose={onClose} title="Open a new Pie" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Title" htmlFor="p-title">
            <Input id="p-title" value={form.title} onChange={set('title')} placeholder="Gold breakout, week 12" required />
          </Field>
          <Field label="Pair" htmlFor="p-pair">
            <Input id="p-pair" value={form.pair} onChange={(e) => setForm((f) => ({ ...f, pair: e.target.value.toUpperCase() }))} placeholder="XAUUSD" required />
          </Field>
          <Field label="Market" htmlFor="p-market">
            <Select id="p-market" value={form.market} onChange={set('market')}>
              <option value="forex">Forex</option>
              <option value="commodities">Commodities</option>
              <option value="indices">Indices</option>
            </Select>
          </Field>
        </div>
        <Field label="Plan for members" htmlFor="p-desc" hint="What you will trade, why, and how you manage risk. Plain words.">
          <Textarea id="p-desc" rows={3} value={form.description} onChange={set('description')} />
        </Field>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Target size (GH₵)" htmlFor="p-target">
            <Input id="p-target" type="number" min="10" step="1" value={form.targetAmount} onChange={set('targetAmount')} required />
          </Field>
          <Field label="Smallest slice (GH₵)" htmlFor="p-min">
            <Input id="p-min" type="number" min="1" step="1" value={form.minDeposit} onChange={set('minDeposit')} required />
          </Field>
          <Field label="Largest slice (GH₵)" htmlFor="p-max" hint="Blank means up to the target.">
            <Input id="p-max" type="number" min="1" step="1" value={form.maxDeposit} onChange={set('maxDeposit')} />
          </Field>
          <Field label="Target return (%)" htmlFor="p-roi">
            <Input id="p-roi" type="number" min="1" max="100" step="0.1" value={form.targetRoiPercent} onChange={set('targetRoiPercent')} required />
          </Field>
          <Field label="Max loss (%)" htmlFor="p-loss">
            <Input id="p-loss" type="number" min="1" max="100" step="0.1" value={form.maxLossPercent} onChange={set('maxLossPercent')} required />
          </Field>
          <Field label="Your fee on profit (%)" htmlFor="p-fee">
            <Input id="p-fee" type="number" min="0" max="50" step="1" value={form.ownerFeePercent} onChange={set('ownerFeePercent')} required />
          </Field>
          <Field label="Risk level" htmlFor="p-risk">
            <Select id="p-risk" value={form.riskLevel} onChange={set('riskLevel')}>
              {['Low', 'Moderate', 'High', 'Aggressive'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="Joining closes" htmlFor="p-deadline" hint="Optional.">
            <Input id="p-deadline" type="datetime-local" value={form.fundingDeadline} onChange={set('fundingDeadline')} />
          </Field>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Open Pie
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UpdateModal({ pie, onClose, onDone }) {
  const [form, setForm] = useState({ title: '', notes: '', entryPrice: '', stopLoss: '', takeProfit: '', imageUrl: '' });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const { busy, error, run } = useAction(onDone);
  const submit = (e) => {
    e.preventDefault();
    run(() => adminApi.post(`/api/ptrading/${pie._id}/trade-updates`, form)).then((ok) => ok && onClose());
  };
  return (
    <Modal open onClose={onClose} title={`Update: ${pie.title}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Headline" htmlFor="u-title">
          <Input id="u-title" value={form.title} onChange={set('title')} placeholder="Entered long on the retest" required />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Entry" htmlFor="u-entry">
            <Input id="u-entry" value={form.entryPrice} onChange={set('entryPrice')} />
          </Field>
          <Field label="Stop" htmlFor="u-sl">
            <Input id="u-sl" value={form.stopLoss} onChange={set('stopLoss')} />
          </Field>
          <Field label="Target" htmlFor="u-tp">
            <Input id="u-tp" value={form.takeProfit} onChange={set('takeProfit')} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="u-notes">
          <Textarea id="u-notes" rows={3} value={form.notes} onChange={set('notes')} />
        </Field>
        <Field label="Screenshot link" htmlFor="u-img" hint="Optional, must start with https://">
          <Input id="u-img" type="url" value={form.imageUrl} onChange={set('imageUrl')} />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Post update
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SettleModal({ pie, onClose, onDone }) {
  const [outcome, setOutcome] = useState('win');
  const [pnl, setPnl] = useState('');
  const [proof, setProof] = useState('');
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState(false);
  const { busy, error, run } = useAction(onDone);

  const n = outcome === 'even' ? 0 : Math.abs(Number(pnl) || 0) * (outcome === 'loss' ? -1 : 1);
  const pool = Number(pie.raisedAmount) || 0;
  const gross = (pool * n) / 100;
  const fee = gross > 0 ? (gross * (pie.ownerFeePercent || 0)) / 100 : 0;
  const back = Math.max(0, pool + gross - fee);

  const submit = (e) => {
    e.preventDefault();
    run(() =>
      adminApi.post(`/api/ptrading/${pie._id}/settle`, {
        outcome,
        finalPnlPercent: n,
        settlementProof: proof,
        settlementNotes: notes,
      })
    ).then((ok) => ok && onClose());
  };

  return (
    <Modal open onClose={onClose} title={`Settle: ${pie.title}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Result" htmlFor="s-outcome">
            <Select id="s-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="win">Profit</option>
              <option value="loss">Loss</option>
              <option value="even">Break-even</option>
            </Select>
          </Field>
          {outcome !== 'even' ? (
            <Field label={outcome === 'win' ? 'Profit (%)' : 'Loss (%)'} htmlFor="s-pnl" hint="On the whole Pie.">
              <Input id="s-pnl" type="number" min="0.01" max="100" step="0.01" value={pnl} onChange={(e) => setPnl(e.target.value)} required />
            </Field>
          ) : null}
        </div>
        <Field label="Proof link" htmlFor="s-proof" hint="Link to the broker statement or screenshot. Members can see it.">
          <Input id="s-proof" type="url" value={proof} onChange={(e) => setProof(e.target.value)} placeholder="https://" required />
        </Field>
        <Field label="Note for members" htmlFor="s-notes">
          <Textarea id="s-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-ink-900 p-4 text-sm">
          <div>
            <dt className="text-xs text-fg-subtle">Pool</dt>
            <dd className="tabular font-semibold text-fg">{cedis(pool)}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-subtle">Your fee</dt>
            <dd className="tabular font-semibold text-fg">{cedis(fee)}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-subtle">Back to members</dt>
            <dd className="tabular font-semibold text-fg">{cedis(back)}</dd>
          </div>
        </dl>
        <label className="flex gap-3 text-sm text-fg-muted">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
          I have checked the numbers against the broker statement. This pays wallets now and cannot be undone.
        </label>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!confirm}>
            Settle and pay out
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PieRow({ pie, onAction, onOpen }) {
  const status = PIE_STATUS[pie.status] || PIE_STATUS.funding;
  const outcome = pie.outcome ? OUTCOME[pie.outcome] : null;
  const { busy, error, run } = useAction(onAction);

  const start = () => {
    if (!window.confirm(`Start trading "${pie.title}"? Members will not be able to join after this.`)) return;
    run(() => adminApi.post(`/api/ptrading/${pie._id}/start-trading`));
  };
  const cancel = () => {
    const reason = window.prompt('Why are you cancelling? Everyone gets a full refund.');
    if (reason == null) return;
    run(() => adminApi.post(`/api/ptrading/${pie._id}/cancel`, { reason }));
  };

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/pie/${pie._id}`} target="_blank" className="font-semibold text-fg hover:underline">
              {pie.title}
            </Link>
            <FiExternalLink className="h-3.5 w-3.5 text-fg-subtle" />
            <Badge tone={outcome ? outcome.tone : status.tone}>
              {outcome ? `${outcome.label} ${pie.finalPnlPercent}%` : status.label}
            </Badge>
          </div>
          <p className="tabular mt-1 text-sm text-fg-muted">
            {pie.pair} · {cedis(pie.raisedAmount)} of {cedis(pie.targetAmount)} ({percentFunded(pie)}%) · {pie.participantCount || 0} members
            {pie.fundingDeadline ? ` · closes ${formatDate(pie.fundingDeadline)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pie.status === 'funding' ? (
            <>
              <Button size="sm" onClick={start} disabled={busy || !pie.raisedAmount}>
                Start trading
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onOpen('update', pie)}>
                Post update
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel} disabled={busy}>
                Cancel and refund
              </Button>
            </>
          ) : null}
          {pie.status === 'trading' ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => onOpen('update', pie)}>
                Post update
              </Button>
              <Button size="sm" onClick={() => onOpen('settle', pie)}>
                Settle
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}

export default function AdminPie() {
  const [tab, setTab] = useState('active');
  const { data, loading, error, reload } = useApi('/api/ptrading', { client: adminApi, params: { status: 'all', limit: 100 } });
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');

  const done = (message) => {
    if (message) setNotice(message);
    reload();
  };

  const pies = data?.pies || [];
  const active = pies.filter((p) => ['funding', 'trading', 'settling', 'cancelling'].includes(p.status));
  const shown = tab === 'active' ? active : pies.filter((p) => !active.includes(p));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pie trading"
        description="Open a Pie, start it when it is funded, post updates while you trade, then settle it with proof. Only admins can settle or cancel."
        actions={
          <Button onClick={() => setModal({ type: 'create' })}>
            <FiPlus className="h-4 w-4" />
            Open a Pie
          </Button>
        }
      />
      {notice ? <Alert tone="up">{notice}</Alert> : null}
      {error ? <Alert>{error.message}</Alert> : null}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'active', label: 'Running', count: active.length },
          { value: 'done', label: 'Finished', count: pies.length - active.length },
        ]}
      />

      {loading && !data ? <Skeleton className="h-40" /> : null}
      {data && !shown.length ? <EmptyState icon={FiPieChart} title={tab === 'active' ? 'No Pie is running' : 'Nothing finished yet'} /> : null}
      {shown.length ? (
        <Card className="divide-y divide-line overflow-hidden">
          {shown.map((pie) => (
            <PieRow key={pie._id} pie={pie} onAction={done} onOpen={(type, p) => setModal({ type, pie: p })} />
          ))}
        </Card>
      ) : null}

      {modal?.type === 'create' ? <CreatePieModal onClose={() => setModal(null)} onDone={done} /> : null}
      {modal?.type === 'update' ? <UpdateModal pie={modal.pie} onClose={() => setModal(null)} onDone={done} /> : null}
      {modal?.type === 'settle' ? <SettleModal pie={modal.pie} onClose={() => setModal(null)} onDone={done} /> : null}
    </div>
  );
}
