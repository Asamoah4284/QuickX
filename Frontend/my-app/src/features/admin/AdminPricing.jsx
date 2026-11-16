import { useState } from 'react';
import { adminApi, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { FEATURES } from '../../lib/features';
import { durationLabel, money } from '../../lib/format';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, Skeleton, Textarea } from '../../ui/primitives';
import { setCurrencySettings } from '../../utils/currencyStore';
import MoneyInput, { useMoneyUnit } from '../../ui/MoneyInput';

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
    <Card className="p-5">
      <form onSubmit={save} className="space-y-4">
        <div>
          <h2 className="font-semibold text-fg">Display currency</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Choose the currency prices are shown in. With US dollars on, you also type prices in dollars everywhere in admin, and
            each one is saved in cedis at the rate below. Members always pay in cedis. If you change the rate later, saved cedi
            prices stay the same and the dollar amounts shown will shift a little.
          </p>
        </div>
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
    </Card>
  );
}

function ProductEditor({ product, onSaved }) {
  const [form, setForm] = useState({
    name: product.name,
    tagline: product.tagline,
    price: String(product.price),
    durationDays: String(product.durationDays),
    badge: product.badge,
    highlights: product.highlights.join('\n'),
    isActive: product.isActive,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const unit = useMoneyUnit();

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
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
      setMessage({ tone: 'up', text: 'Saved. The new price applies to the next purchase.' });
      onSaved();
    } catch (err) {
      setMessage({ tone: 'down', text: errorMessage(err, 'Could not save.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={save} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {product.grants.map((g) => (
              <Badge key={g} tone="brand">
                {FEATURES[g]?.label || g}
              </Badge>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 accent-brand-500"
            />
            On sale
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor={`${product.key}-name`}>
            <Input id={`${product.key}-name`} value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Badge" htmlFor={`${product.key}-badge`} hint="Optional, e.g. “Best value”.">
            <Input id={`${product.key}-badge`} value={form.badge} onChange={set('badge')} />
          </Field>
          <Field label={`Price (${unit})`} htmlFor={`${product.key}-price`}>
            <MoneyInput id={`${product.key}-price`} value={form.price} onChange={set('price')} required />
          </Field>
          <Field label="Access length (days)" htmlFor={`${product.key}-days`} hint={durationLabel(form.durationDays)}>
            <Input id={`${product.key}-days`} type="number" min="1" max="3650" step="1" value={form.durationDays} onChange={set('durationDays')} required />
          </Field>
        </div>
        <Field label="Tagline" htmlFor={`${product.key}-tagline`}>
          <Input id={`${product.key}-tagline`} value={form.tagline} onChange={set('tagline')} />
        </Field>
        <Field label="What's included" htmlFor={`${product.key}-hl`} hint="One point per line.">
          <Textarea id={`${product.key}-hl`} rows={4} value={form.highlights} onChange={set('highlights')} />
        </Field>
        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
        <div className="flex items-center justify-between gap-3">
          <span className="tabular text-sm text-fg-subtle">
            Members see {money(form.price)} / {durationLabel(form.durationDays)}
          </span>
          <Button type="submit" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function AdminPricing() {
  const { data, loading, error, reload } = useApi('/api/admin/products', { client: adminApi });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing"
        description="Set the price and access length for each feature and for the All-Access bundle. Changes do not affect time members have already bought."
      />
      <DisplayCurrency />
      {error ? <Alert>{error.message}</Alert> : null}
      {loading && !data ? <Skeleton className="h-96" /> : null}
      <div className="grid gap-6 xl:grid-cols-2">
        {(data?.products || []).map((product) => (
          <ProductEditor key={product.key} product={product} onSaved={reload} />
        ))}
      </div>
    </div>
  );
}
