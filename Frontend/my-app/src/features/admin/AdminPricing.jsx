import { useState } from 'react';
import { adminApi, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { FEATURES } from '../../lib/features';
import { durationLabel, money } from '../../lib/format';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Skeleton, Textarea } from '../../ui/primitives';

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
          <Field label="Price (GH₵)" htmlFor={`${product.key}-price`}>
            <Input id={`${product.key}-price`} type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required />
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
