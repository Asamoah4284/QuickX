import { useEffect, useState } from 'react';
import { FiCheckCircle, FiChevronDown, FiEdit2, FiPlus, FiTag, FiTrash2 } from 'react-icons/fi';
import { adminApi, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { FEATURES } from '../../lib/features';
import { cx, durationLabel, money } from '../../lib/format';
import { groupPlans, monthlyPrice } from '../../lib/plans';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, Skeleton, Textarea } from '../../ui/primitives';
import { Modal } from '../../ui/overlays';
import { setCurrencySettings } from '../../utils/currencyStore';
import MoneyInput, { useMoneyUnit } from '../../ui/MoneyInput';
import PriceCard from '../billing/PriceCard';

/** Quick picks for the length. A month is counted as 30 days. */
const LENGTHS = [
  { days: 7, label: '1 week' },
  { days: 30, label: '1 month' },
  { days: 60, label: '2 months' },
  { days: 90, label: '3 months' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
];

const perMonthText = (p) => {
  const m = monthlyPrice(p);
  return m ? `${money(Math.round(m * 100) / 100)} a month` : '';
};

function HowItWorks() {
  const steps = [
    ['Pick a plan', 'Each plan, like Signals, can be sold for several lengths: 1 month, 2 months, 3 months and so on.'],
    ['Set the price and length', 'Press Edit to change a length, or Add a length for a new one. The preview shows what members will see.'],
    ['Press Save', 'New buyers pay the new price straight away. People who already paid keep the time they bought.'],
  ];
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-semibold text-fg">How to change prices</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-3">
            <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {i + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold text-fg">{title}</span>
              <span className="mt-0.5 block text-sm text-fg-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function LengthPresets({ value, onPick, taken }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LENGTHS.filter((l) => !taken?.has(l.days)).map((l) => (
        <button
          key={l.days}
          type="button"
          onClick={() => onPick(String(l.days))}
          className={cx(
            'rounded-full border px-3 py-1.5 text-sm font-medium transition',
            Number(value) === l.days ? 'border-brand-400/60 bg-brand-500/15 text-fg' : 'border-line text-fg-muted hover:text-fg'
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/** One plan (e.g. Signals) with every length it is sold for. */
function PlanCard({ plan, onEdit, onAdd, onRemove }) {
  const { first, lengths } = plan;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="text-lg font-semibold text-fg">{first.name}</h3>
          <p className="mt-0.5 text-sm text-fg-subtle">
            {plan.bundle ? `Includes ${first.grants.map((g) => FEATURES[g]?.label || g).join(', ')}` : first.tagline}
          </p>
        </div>
        <Button size="sm" onClick={() => onAdd(plan)}>
          <FiPlus className="h-4 w-4" />
          Add a length
        </Button>
      </div>
      <ul className="divide-y divide-line">
        {lengths.map((p) => (
          <li key={p.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <div className="min-w-0 flex-1 basis-40">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-fg">{durationLabel(p.durationDays)}</span>
                {p.badge ? <Badge tone="brand">{p.badge}</Badge> : null}
                {!p.isActive ? <Badge>Not on sale</Badge> : null}
              </div>
              <p className="text-xs text-fg-subtle">{p.durationDays} days</p>
            </div>
            <div className="text-right">
              <p className="tabular text-lg font-bold text-fg">{money(p.price)}</p>
              <p className="min-h-4 text-xs text-fg-subtle">{perMonthText(p)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => onEdit(p, plan)}>
                <FiEdit2 className="h-4 w-4" />
                Edit
              </Button>
              {lengths.length > 1 ? (
                <Button variant="ghost" size="sm" onClick={() => onRemove(p)} aria-label={`Remove ${durationLabel(p.durationDays)}`}>
                  <FiTrash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function formFor(product) {
  return {
    name: product.name,
    tagline: product.tagline,
    price: String(product.price),
    durationDays: String(product.durationDays),
    badge: product.badge,
    highlights: product.highlights.join('\n'),
    isActive: product.isActive,
  };
}

/** Warn before the tab closes with unsaved changes. */
function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}

/** Edit one length. The name and wording are shared by every length of the plan. */
function PlanEditor({ product, plan, onClose, onSaved }) {
  const [form, setForm] = useState(() => formFor(product));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unit = useMoneyUnit();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(formFor(product));
  useUnsavedWarning(dirty);
  const shared = plan.lengths.length > 1;
  const otherDays = new Set(plan.lengths.filter((p) => p.key !== product.key).map((p) => p.durationDays));
  const clash = otherDays.has(Number(form.durationDays));

  const close = () => {
    if (dirty && !window.confirm('Close without saving your changes?')) return;
    onClose();
  };

  const edited = {
    ...product,
    name: form.name || product.name,
    tagline: form.tagline,
    badge: form.badge,
    price: Number(form.price) || 0,
    durationDays: Number(form.durationDays) || 1,
    highlights: form.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
  };
  // The preview shows the whole plan with this length changed, as members will see it.
  const previewLengths = plan.lengths
    .map((p) => (p.key === product.key ? edited : { ...p, name: edited.name, tagline: edited.tagline, highlights: edited.highlights }))
    .filter((p) => p.isActive || p.key === product.key)
    .sort((a, b) => a.durationDays - b.durationDays);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.put(`/api/admin/products/${product.key}`, {
        name: form.name,
        tagline: form.tagline,
        badge: form.badge,
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        highlights: form.highlights.split('\n'),
        isActive: form.isActive,
      });
      onSaved(`${edited.name} for ${durationLabel(edited.durationDays)} is now ${money(edited.price)}.`);
    } catch (err) {
      setError(errorMessage(err, 'Could not save.'));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={close} title={`Edit ${product.name}, ${durationLabel(product.durationDays)}`} size="xl">
      <form onSubmit={save} className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Price (${unit})`} htmlFor="plan-price" hint="What a member pays for this length.">
              <MoneyInput id="plan-price" value={form.price} onChange={set('price')} required />
            </Field>
            <Field
              label="Length (days)"
              htmlFor="plan-days"
              hint={clash ? 'This plan already has that length.' : `= ${durationLabel(form.durationDays)}`}
            >
              <Input id="plan-days" type="number" min="1" max="3650" step="1" value={form.durationDays} onChange={set('durationDays')} required />
            </Field>
          </div>
          <LengthPresets value={form.durationDays} onPick={(days) => setForm((f) => ({ ...f, durationDays: days }))} taken={otherDays} />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-brand-500"
            />
            <span>
              <span className="block text-sm font-semibold text-fg">On sale</span>
              <span className="block text-sm text-fg-muted">Untick to hide this length from the pricing page. Members who have it keep it.</span>
            </span>
          </label>

          <Field label="Badge" htmlFor="plan-badge" hint="Optional, only on this length. For example “Best value”.">
            <Input id="plan-badge" value={form.badge} onChange={set('badge')} />
          </Field>

          <details className="group rounded-xl border border-line p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-fg">
              {shared ? 'Name and wording (all lengths)' : 'Name and wording'}
              <FiChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-4">
              {shared ? (
                <p className="text-sm text-fg-muted">
                  These are the same on every length of {product.name}. Changing them here changes all {plan.lengths.length}.
                </p>
              ) : null}
              <Field label="Name" htmlFor="plan-name">
                <Input id="plan-name" value={form.name} onChange={set('name')} required />
              </Field>
              <Field label="Short description" htmlFor="plan-tagline">
                <Input id="plan-tagline" value={form.tagline} onChange={set('tagline')} />
              </Field>
              <Field label="What's included" htmlFor="plan-hl" hint="One point per line.">
                <Textarea id="plan-hl" rows={4} value={form.highlights} onChange={set('highlights')} />
              </Field>
            </div>
          </details>

          {error ? <Alert>{error}</Alert> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={!dirty || clash}>
              Save {money(edited.price)} / {durationLabel(edited.durationDays)}
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">What members see</p>
          <div aria-hidden className="[&_a]:pointer-events-none">
            <PriceCard key={`${product.key}-${edited.durationDays}`} lengths={previewLengths} featured={plan.bundle} initialKey={product.key} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Add another length to a plan, e.g. Signals for 3 months. */
function AddLength({ plan, onClose, onSaved }) {
  const taken = new Set(plan.lengths.map((p) => p.durationDays));
  const longest = plan.lengths[plan.lengths.length - 1].durationDays;
  const suggestion = LENGTHS.find((l) => !taken.has(l.days) && l.days > longest) || LENGTHS.find((l) => !taken.has(l.days));
  const [days, setDays] = useState(String(suggestion?.days || ''));
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unit = useMoneyUnit();
  const clash = taken.has(Number(days));
  const base = plan.first;
  const atCurrentRate = Number(days) > 0 ? Math.round((base.price / base.durationDays) * Number(days)) : 0;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.post(`/api/admin/products/${base.key}/lengths`, { durationDays: Number(days), price: Number(price) });
      onSaved(`${base.name} can now be bought for ${durationLabel(days)} at ${money(Number(price))}.`);
    } catch (err) {
      setError(errorMessage(err, 'Could not add this length.'));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Add a length to ${base.name}`} size="md">
      <form onSubmit={save} className="space-y-5">
        <p className="text-sm text-fg-muted">
          Sold now for {plan.lengths.map((p) => `${durationLabel(p.durationDays)} (${money(p.price)})`).join(', ')}.
        </p>
        <Field label="Length (days)" htmlFor="add-days" hint={clash ? 'This plan already has that length.' : `= ${durationLabel(days)}`}>
          <Input id="add-days" type="number" min="1" max="3650" step="1" value={days} onChange={(e) => setDays(e.target.value)} required />
        </Field>
        <LengthPresets value={days} onPick={setDays} taken={taken} />
        <Field
          label={`Price (${unit})`}
          htmlFor="add-price"
          hint={atCurrentRate ? `At the ${durationLabel(base.durationDays)} rate this would be ${money(atCurrentRate)}. Longer lengths usually get a discount.` : ''}
        >
          <MoneyInput id="add-price" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={clash || !days || price === ''}>
            Add {durationLabel(days)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DisplayCurrency() {
  const { data, reload } = useApi('/api/admin/settings', { client: adminApi });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const value = form || (data ? { defaultCurrency: data.defaultCurrency, exchangeRateUsdToGhs: String(data.exchangeRateUsdToGhs) } : null);
  if (!value) return null;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminApi.put('/api/admin/settings', { ...value, exchangeRateUsdToGhs: Number(value.exchangeRateUsdToGhs) });
      setCurrencySettings({ currency: res.data.defaultCurrency, exchangeRateUsdToGhs: res.data.exchangeRateUsdToGhs });
      setMessage({ tone: 'up', text: 'Saved.' });
      setForm(null);
      reload();
    } catch (err) {
      setMessage({ tone: 'down', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-fg-muted">
        Members always pay in cedis. You can show prices in US dollars instead; they are worked out from the rate below.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Show prices in" htmlFor="cur-default">
          <Select id="cur-default" value={value.defaultCurrency} onChange={(e) => setForm({ ...value, defaultCurrency: e.target.value })}>
            <option value="GHS">Cedis (GH₵)</option>
            <option value="USD">US dollars ($)</option>
          </Select>
        </Field>
        <Field label="GH₵ per 1 US dollar" htmlFor="cur-rate">
          <Input
            id="cur-rate"
            type="number"
            min="0.01"
            max="999"
            step="0.01"
            value={value.exchangeRateUsdToGhs}
            onChange={(e) => setForm({ ...value, exchangeRateUsdToGhs: e.target.value })}
            required
          />
        </Field>
      </div>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <div className="flex justify-end">
        <Button type="submit" loading={busy} disabled={!form}>
          Save
        </Button>
      </div>
    </form>
  );
}

export default function AdminPricing() {
  const { data, loading, error, reload } = useApi('/api/admin/products', { client: adminApi });
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null);
  const [saved, setSaved] = useState('');
  const [problem, setProblem] = useState('');
  const plans = groupPlans(data?.products || []);

  const done = (text) => {
    setEditing(null);
    setAdding(null);
    setProblem('');
    setSaved(text);
    reload();
  };

  const remove = async (p) => {
    if (!window.confirm(`Stop selling ${p.name} for ${durationLabel(p.durationDays)}? Members who bought it keep their time.`)) return;
    setSaved('');
    setProblem('');
    try {
      await adminApi.delete(`/api/admin/products/${p.key}`);
      done(`${p.name} for ${durationLabel(p.durationDays)} was removed.`);
    } catch (err) {
      setProblem(errorMessage(err, 'Could not remove it.'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pricing" description="What each plan costs and the lengths it is sold for. The community is free, so it has no price." />
      <HowItWorks />

      {saved ? (
        <Alert tone="up" className="flex items-center gap-2">
          <FiCheckCircle className="h-4 w-4 shrink-0" />
          {saved}
        </Alert>
      ) : null}
      {problem ? <Alert>{problem}</Alert> : null}
      {error ? <Alert>{error.message}</Alert> : null}
      {loading && !data ? <Skeleton className="h-72" /> : null}
      {plans.map((plan) => (
        <PlanCard
          key={plan.group}
          plan={plan}
          onEdit={(p, pl) => {
            setSaved('');
            setEditing({ product: p, plan: pl });
          }}
          onAdd={(pl) => {
            setSaved('');
            setAdding(pl);
          }}
          onRemove={remove}
        />
      ))}

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <FiTag className="h-5 w-5 text-brand-300" />
          <div>
            <p className="font-semibold text-fg">Discount codes</p>
            <p className="text-sm text-fg-muted">Give a percentage off any plan with a code.</p>
          </div>
        </div>
        <Button to="/admin/coupons" variant="secondary" size="sm">
          Manage codes
        </Button>
      </Card>

      <Card className="p-5">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-fg">Advanced: show prices in US dollars</summary>
          <div className="mt-4">
            <DisplayCurrency />
          </div>
        </details>
      </Card>

      {editing ? (
        <PlanEditor key={editing.product.key} product={editing.product} plan={editing.plan} onClose={() => setEditing(null)} onSaved={done} />
      ) : null}
      {adding ? <AddLength key={adding.group} plan={adding} onClose={() => setAdding(null)} onSaved={done} /> : null}
    </div>
  );
}
