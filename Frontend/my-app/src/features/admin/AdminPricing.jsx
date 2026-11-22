import { useEffect, useState } from 'react';
import { FiCheckCircle, FiChevronDown, FiEdit2, FiTag } from 'react-icons/fi';
import { adminApi, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { FEATURES } from '../../lib/features';
import { cx, durationLabel, money } from '../../lib/format';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, Skeleton, Textarea } from '../../ui/primitives';
import { Modal } from '../../ui/overlays';
import { setCurrencySettings } from '../../utils/currencyStore';
import MoneyInput, { useMoneyUnit } from '../../ui/MoneyInput';
import PriceCard from '../billing/PriceCard';

const LENGTHS = [
  { days: 7, label: '1 week' },
  { days: 30, label: '1 month' },
  { days: 90, label: '3 months' },
  { days: 365, label: '1 year' },
];

function HowItWorks() {
  const steps = [
    ['Pick a plan', 'Press Edit next to the plan you want to change.'],
    ['Set the price and length', 'Type the new price and how long the access lasts. The preview shows what members will see.'],
    ['Press Save', 'New buyers pay the new price straight away. People who already paid keep the time they bought.'],
  ];
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-semibold text-fg">How to change a price</h2>
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

/** Every plan in one list: what it costs, how long it lasts, whether it is on sale. */
function PlanTable({ products, onEdit }) {
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line">
        {products.map((p) => (
          <li key={p.key} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
            <div className="min-w-0 flex-1 basis-48">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-fg">{p.name}</span>
                {p.badge ? <Badge tone="brand">{p.badge}</Badge> : null}
                {!p.isActive ? <Badge>Not on sale</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-fg-subtle">
                {p.grants.length > 1 ? `Includes ${p.grants.map((g) => FEATURES[g]?.label || g).join(', ')}` : p.tagline || ' '}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular text-lg font-bold text-fg">{money(p.price)}</p>
              <p className="text-xs text-fg-subtle">for {durationLabel(p.durationDays)}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => onEdit(p)}>
              <FiEdit2 className="h-4 w-4" />
              Edit
            </Button>
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

function PlanEditor({ product, onClose, onSaved }) {
  const [form, setForm] = useState(() => formFor(product));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unit = useMoneyUnit();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(formFor(product));

  // Warn before the tab closes with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const close = () => {
    if (dirty && !window.confirm('Close without saving your changes?')) return;
    onClose();
  };

  const preview = {
    ...product,
    name: form.name || product.name,
    tagline: form.tagline,
    badge: form.badge,
    price: Number(form.price) || 0,
    durationDays: Number(form.durationDays) || 1,
    highlights: form.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
  };

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
      onSaved(`${preview.name} is now ${money(preview.price)} for ${durationLabel(preview.durationDays)}.`);
    } catch (err) {
      setError(errorMessage(err, 'Could not save.'));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={close} title={`Edit ${product.name}`} size="xl">
      <form onSubmit={save} className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Price (${unit})`} htmlFor="plan-price" hint="What a member pays.">
              <MoneyInput id="plan-price" value={form.price} onChange={set('price')} required />
            </Field>
            <Field label="Access length (days)" htmlFor="plan-days" hint={`= ${durationLabel(form.durationDays)}`}>
              <Input id="plan-days" type="number" min="1" max="3650" step="1" value={form.durationDays} onChange={set('durationDays')} required />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.days}
                type="button"
                onClick={() => setForm((f) => ({ ...f, durationDays: String(l.days) }))}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                  Number(form.durationDays) === l.days ? 'border-brand-400/60 bg-brand-500/15 text-fg' : 'border-line text-fg-muted hover:text-fg'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-brand-500"
            />
            <span>
              <span className="block text-sm font-semibold text-fg">On sale</span>
              <span className="block text-sm text-fg-muted">Untick to hide this plan from the pricing page. Members who have it keep it.</span>
            </span>
          </label>

          <details className="group rounded-xl border border-line p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-fg">
              Name, wording and badge
              <FiChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="plan-name">
                  <Input id="plan-name" value={form.name} onChange={set('name')} required />
                </Field>
                <Field label="Badge" htmlFor="plan-badge" hint="Optional, for example “Best value”.">
                  <Input id="plan-badge" value={form.badge} onChange={set('badge')} />
                </Field>
              </div>
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
            <Button type="submit" loading={busy} disabled={!dirty}>
              Save {money(preview.price)} / {durationLabel(preview.durationDays)}
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">What members see</p>
          <div className="pointer-events-none" aria-hidden>
            <PriceCard product={preview} featured={product.grants.length > 1} />
          </div>
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
          <Input id="cur-rate" type="number" min="0.01" max="999" step="0.01" value={value.exchangeRateUsdToGhs} onChange={(e) => setForm({ ...value, exchangeRateUsdToGhs: e.target.value })} required />
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
  const [saved, setSaved] = useState('');
  const products = data?.products || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Pricing" description="What each plan costs and how long it lasts. The community is free, so it has no price." />
      <HowItWorks />

      {saved ? (
        <Alert tone="up" className="flex items-center gap-2">
          <FiCheckCircle className="h-4 w-4 shrink-0" />
          {saved}
        </Alert>
      ) : null}
      {error ? <Alert>{error.message}</Alert> : null}
      {loading && !data ? <Skeleton className="h-72" /> : null}
      {products.length ? (
        <PlanTable
          products={products}
          onEdit={(p) => {
            setSaved('');
            setEditing(p);
          }}
        />
      ) : null}

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
        <PlanEditor
          key={editing.key}
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setSaved(text);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
