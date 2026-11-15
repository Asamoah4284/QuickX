import { useEffect, useState } from 'react';
import { FiSearch, FiUsers } from 'react-icons/fi';
import { adminApi, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { FEATURES, FEATURE_LIST } from '../../lib/features';
import { daysLeft, formatDate } from '../../lib/format';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton } from '../../ui/primitives';
import { Modal } from '../../ui/overlays';
import { CountUp } from '../../ui/motion';

const PAGE_SIZE = 25;

function AccessModal({ member, onClose, onChanged }) {
  const [feature, setFeature] = useState('courses');
  const [days, setDays] = useState('30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const grant = (e) => {
    e.preventDefault();
    run(() => adminApi.post(`/api/admin/members/${member.id}/entitlements`, { feature, days: Number(days) }));
  };
  const revoke = (f) => {
    if (!window.confirm(`Remove ${FEATURES[f].label} access from ${member.fullName}?`)) return;
    run(() => adminApi.delete(`/api/admin/members/${member.id}/entitlements/${f}`));
  };

  return (
    <Modal open onClose={onClose} title={member.fullName}>
      <p className="text-sm text-fg-muted">{member.email}</p>

      <h3 className="mt-5 text-sm font-semibold text-fg">Current access</h3>
      {member.entitlements.length ? (
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
          {member.entitlements.map((e) => (
            <li key={e.feature} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="text-fg">
                {FEATURES[e.feature]?.label}
                <span className="ml-2 text-fg-subtle">until {formatDate(e.endsAt)}</span>
              </span>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => revoke(e.feature)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-fg-subtle">No active access.</p>
      )}

      <form onSubmit={grant} className="mt-6 space-y-4">
        <h3 className="text-sm font-semibold text-fg">Give access</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Feature" htmlFor="grant-feature">
            <Select id="grant-feature" value={feature} onChange={(e) => setFeature(e.target.value)}>
              {FEATURE_LIST.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Days" htmlFor="grant-days" hint="Added on top of any time left.">
            <Input id="grant-days" type="number" min="1" max="3650" value={days} onChange={(e) => setDays(e.target.value)} required />
          </Field>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" loading={busy}>
          Give access
        </Button>
      </form>
    </Modal>
  );
}

export default function AdminMembers() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [feature, setFeature] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  // Wait for typing to pause before searching.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const summary = useApi('/api/admin/members/summary', { client: adminApi });
  const { data, loading, error, reload } = useApi('/api/admin/members', {
    client: adminApi,
    params: { page, limit: PAGE_SIZE, ...(query ? { search: query } : {}), ...(feature ? { feature } : {}) },
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const refresh = () => {
    reload();
    summary.reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="See who has access to what, and give or remove access by hand." />

      {summary.data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Card className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Paying members</p>
            <p className="tabular mt-1.5 text-2xl font-bold text-fg">
              <CountUp value={summary.data.activeMembers} />
            </p>
          </Card>
          {FEATURE_LIST.map((f) => (
            <Card key={f.key} className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{f.label}</p>
              <p className="tabular mt-1.5 text-2xl font-bold text-fg">
                <CountUp value={summary.data.byFeature[f.key] || 0} />
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or phone" className="pl-10" aria-label="Search members" />
        </div>
        <Select
          value={feature}
          onChange={(e) => {
            setFeature(e.target.value);
            setPage(1);
          }}
          className="sm:w-56"
          aria-label="Filter by access"
        >
          <option value="">Everyone</option>
          {FEATURE_LIST.map((f) => (
            <option key={f.key} value={f.key}>
              Has {f.label}
            </option>
          ))}
        </Select>
      </div>

      {error ? <Alert>{error.message}</Alert> : null}
      {loading && !data ? <Skeleton className="h-64" /> : null}
      {data && !data.members.length ? <EmptyState icon={FiUsers} title="No members found" description="Try a different search or filter." /> : null}

      {data?.members.length ? (
        <Card className="divide-y divide-line overflow-hidden">
          {data.members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={m.profilePicture} name={m.fullName} size={36} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{m.fullName}</p>
                  <p className="truncate text-sm text-fg-subtle">{m.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {m.entitlements.map((e) => (
                  <Badge key={e.feature} tone={daysLeft(e.endsAt) <= 5 ? 'warn' : 'up'}>
                    {FEATURES[e.feature]?.label} · {daysLeft(e.endsAt)}d
                  </Badge>
                ))}
                <Button size="sm" variant="secondary" onClick={() => setSelected(m)}>
                  Manage
                </Button>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="tabular text-sm text-fg-muted">
            {page} / {pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}

      {selected ? <AccessModal member={selected} onClose={() => setSelected(null)} onChanged={refresh} /> : null}
    </div>
  );
}
