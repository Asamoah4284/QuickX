import { useState } from 'react';
import { FiFlag, FiShield } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { timeAgo } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Field, Skeleton, Textarea } from '../../ui/primitives';
import { Tabs } from '../../ui/overlays';
import { BASE, useCommunity } from './shared';

const ENTITY_LABEL = { post: 'Post', comment: 'Comment', question: 'Question', answer: 'Answer', message: 'Message', resource: 'Resource' };

/** Where to send a delete request for each kind of reported content. */
function deleteUrl(report) {
  const id = report.entityId;
  switch (report.entityType) {
    case 'post':
      return `${BASE}/posts/${id}`;
    case 'comment':
      return `${BASE}/comments/${id}`;
    case 'question':
      return `${BASE}/questions/${id}`;
    case 'answer':
      return report.entity?.questionId ? `${BASE}/questions/${report.entity.questionId}/answers/${id}` : null;
    case 'resource':
      return `${BASE}/resources/${id}`;
    default:
      return null;
  }
}

function Reports() {
  const [status, setStatus] = useState('open');
  const { data, loading, error, reload } = useApi(`${BASE}/reports`, { params: { status } });
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');

  const run = async (report, fn) => {
    setBusy(report._id);
    setActionError('');
    try {
      await fn();
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const setReportStatus = (report, next) => run(report, () => api.patch(`${BASE}/reports/${report._id}`, { status: next }));

  const removeContent = (report) => {
    const url = deleteUrl(report);
    if (!url || !window.confirm('Remove this content from the community?')) return;
    run(report, async () => {
      await api.delete(url);
      await api.patch(`${BASE}/reports/${report._id}`, { status: 'resolved' });
    });
  };

  const muteAuthor = (report) => {
    const author = report.entity?.author;
    if (!author || !window.confirm(`Mute ${author.fullName}? They can read but not post.`)) return;
    run(report, () => api.post(`${BASE}/blocks`, { userId: author.id, muted: true, blocked: false, reason: report.reason }));
  };

  const reports = data?.reports || [];

  return (
    <div className="space-y-4">
      <Tabs
        value={status}
        onChange={setStatus}
        tabs={[
          { value: 'open', label: 'Open' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'dismissed', label: 'Dismissed' },
        ]}
      />
      {error ? <Alert>{error.message}</Alert> : null}
      {actionError ? <Alert>{actionError}</Alert> : null}
      {loading && !data ? <Skeleton className="h-40" /> : null}
      {data && !reports.length ? <EmptyState icon={FiFlag} title={status === 'open' ? 'Nothing to review' : 'None'} /> : null}
      {reports.map((r) => (
        <Card key={r._id} className="p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <Badge tone="warn">{ENTITY_LABEL[r.entityType]}</Badge>
            <span>
              Reported by <strong className="text-fg">{r.reporterId?.fullName || 'a member'}</strong> · {timeAgo(r.createdAt)}
            </span>
          </div>
          <p className="mt-3 text-sm text-fg">
            <span className="text-fg-subtle">Reason: </span>
            {r.reason}
          </p>
          <div className="mt-3 rounded-xl border border-line bg-ink-900 px-4 py-3 text-sm">
            {r.entity ? (
              <>
                <p className="text-xs text-fg-subtle">
                  {r.entity.author?.fullName || 'Unknown author'}
                  {r.entity.deleted ? ' · already removed' : ''}
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-fg-muted">{r.entity.text || '(no text)'}</p>
              </>
            ) : (
              <p className="text-fg-subtle">This content no longer exists.</p>
            )}
          </div>
          {status === 'open' ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {r.entity && !r.entity.deleted && deleteUrl(r) ? (
                <Button size="sm" variant="danger" disabled={busy === r._id} onClick={() => removeContent(r)}>
                  Remove content
                </Button>
              ) : null}
              {r.entity?.author ? (
                <Button size="sm" variant="secondary" disabled={busy === r._id} onClick={() => muteAuthor(r)}>
                  Mute author
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" disabled={busy === r._id} onClick={() => setReportStatus(r, 'resolved')}>
                Mark resolved
              </Button>
              <Button size="sm" variant="ghost" disabled={busy === r._id} onClick={() => setReportStatus(r, 'dismissed')}>
                Dismiss
              </Button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function Restricted() {
  const { data, loading, error, reload } = useApi(`${BASE}/blocks`);
  const [actionError, setActionError] = useState('');

  const lift = async (block) => {
    try {
      await api.delete(`${BASE}/blocks/${block.userId._id}`);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const blocks = (data?.blocks || []).filter((b) => b.userId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Muted members can read but not post or message. Blocked members cannot open the community. To restrict someone, open their profile from a post or the Members tab.
      </p>
      {error ? <Alert>{error.message}</Alert> : null}
      {actionError ? <Alert>{actionError}</Alert> : null}
      {loading && !data ? <Skeleton className="h-32" /> : null}
      {data && !blocks.length ? <EmptyState icon={FiShield} title="Nobody is muted or blocked" /> : null}
      {blocks.length ? (
        <Card className="divide-y divide-line overflow-hidden">
          {blocks.map((b) => (
            <div key={b._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={publicAssetUrl(b.userId.profilePicture)} name={b.userId.fullName} size={36} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{b.userId.fullName}</p>
                  {b.reason ? <p className="truncate text-sm text-fg-subtle">{b.reason}</p> : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={b.blocked ? 'down' : 'warn'}>{b.blocked ? 'Blocked' : 'Muted'}</Badge>
                <Button size="sm" variant="secondary" onClick={() => lift(b)}>
                  Lift
                </Button>
              </div>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}

function Settings() {
  const { about, reloadAbout } = useCommunity();
  const [guidelines, setGuidelines] = useState(about.guidelines);
  const [allowPeer, setAllowPeer] = useState(about.allowPeerMessaging);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.patch(`${BASE}/settings`, { communityGuidelines: guidelines, allowPeerMessaging: allowPeer });
      await reloadAbout();
      setMessage({ tone: 'up', text: 'Saved.' });
    } catch (err) {
      setMessage({ tone: 'down', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={save} className="space-y-5">
        <Field label="Community guidelines" htmlFor="guidelines" hint="Shown to every member. Keep it short: what is welcome, and what is not.">
          <Textarea id="guidelines" rows={8} value={guidelines} onChange={(e) => setGuidelines(e.target.value)} maxLength={5000} />
        </Field>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={allowPeer} onChange={(e) => setAllowPeer(e.target.checked)} className="mt-1 h-4 w-4 accent-brand-500" />
          <span>
            <span className="block text-sm font-medium text-fg">Let members message each other</span>
            <span className="block text-sm text-fg-subtle">When off, members can only message you.</span>
          </span>
        </label>
        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
        <Button type="submit" loading={busy}>
          Save
        </Button>
      </form>
    </Card>
  );
}

export default function Manage() {
  const [section, setSection] = useState('reports');
  return (
    <div className="max-w-3xl space-y-5">
      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { value: 'reports', label: 'Reports' },
          { value: 'restricted', label: 'Muted and blocked' },
          { value: 'settings', label: 'Settings' },
        ]}
      />
      {section === 'reports' ? <Reports /> : null}
      {section === 'restricted' ? <Restricted /> : null}
      {section === 'settings' ? <Settings /> : null}
    </div>
  );
}
