import { useRef, useState } from 'react';
import { FiDownload, FiFileText, FiMoreHorizontal, FiPlus, FiUpload } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatDate, timeAgo } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton, Spinner, Textarea } from '../../ui/primitives';
import { Modal } from '../../ui/overlays';
import { ActionMenu, BASE, uploadDocument, useCommunity } from './shared';

const KINDS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'slides', label: 'Slides' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'template', label: 'Template' },
  { value: 'reading', label: 'Reading' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'other', label: 'Other' },
];
const kindLabel = (kind) => KINDS.find((k) => k.value === kind)?.label || 'Resource';

function AddModal({ open, onClose, onAdded }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState({ title: '', description: '', kind: 'pdf', fileUrl: '' });
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setProgress(0);
    try {
      const url = await uploadDocument(file, setProgress);
      setForm((f) => ({ ...f, fileUrl: url, title: f.title || file.name.replace(/\.[^.]+$/, '') }));
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setProgress(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`${BASE}/resources`, form);
      onAdded();
      setForm({ title: '', description: '', kind: 'pdf', fileUrl: '' });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share a resource">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <Field label="Title" htmlFor="res-title">
            <Input id="res-title" value={form.title} onChange={set('title')} maxLength={200} required />
          </Field>
          <Field label="Type" htmlFor="res-kind">
            <Select id="res-kind" value={form.kind} onChange={set('kind')}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description" htmlFor="res-desc" hint={form.kind === 'assignment' ? 'Explain what members should hand in.' : undefined}>
          <Textarea id="res-desc" rows={3} value={form.description} onChange={set('description')} maxLength={1000} />
        </Field>
        <Field label="File or link" htmlFor="res-url" hint="Upload a file, or paste a link (https://…).">
          <div className="flex gap-2">
            <Input id="res-url" type="url" value={form.fileUrl} onChange={set('fileUrl')} placeholder="https://" required />
            <input ref={fileRef} type="file" hidden onChange={pick} />
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={progress !== null}>
              {progress !== null ? <Spinner className="h-4 w-4" /> : <FiUpload className="h-4 w-4" />}
              {progress !== null ? `${progress}%` : 'Upload'}
            </Button>
          </div>
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={progress !== null}>
            Share
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SubmissionsModal({ resource, onClose }) {
  const { data, loading, error } = useApi(`${BASE}/resources/${resource._id}/submissions`);
  return (
    <Modal open onClose={onClose} title={`Handed in: ${resource.title}`}>
      {loading ? <Skeleton className="h-24" /> : null}
      {error ? <Alert>{error.message}</Alert> : null}
      {data && !data.submissions.length ? <p className="text-sm text-fg-muted">Nobody has handed this in yet.</p> : null}
      <ul className="divide-y divide-line">
        {(data?.submissions || []).map((s) => (
          <li key={s._id} className="flex items-center justify-between gap-4 py-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-fg">{s.uploadedBy?.fullName || 'Member'}</span>
              <span className="text-xs text-fg-subtle">{timeAgo(s.createdAt)}</span>
            </span>
            <Button href={publicAssetUrl(s.fileUrl)} target="_blank" rel="noopener noreferrer" size="sm" variant="secondary">
              Open
            </Button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function HandIn({ resource, onDone }) {
  const fileRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setProgress(0);
    try {
      const fileUrl = await uploadDocument(file, setProgress);
      await api.post(`${BASE}/resources`, { title: file.name, fileUrl, assignmentOf: resource._id });
      onDone();
    } catch (err) {
      setError(err.response ? errorMessage(err) : err.message || 'Upload failed.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <input ref={fileRef} type="file" hidden onChange={pick} />
      <Button size="sm" variant={resource.mySubmission ? 'secondary' : 'primary'} onClick={() => fileRef.current?.click()} disabled={progress !== null}>
        {progress !== null ? <Spinner className="h-4 w-4" /> : <FiUpload className="h-4 w-4" />}
        {progress !== null ? `${progress}%` : resource.mySubmission ? 'Replace my work' : 'Hand in'}
      </Button>
      {resource.mySubmission ? <span className="text-xs text-up">Handed in {formatDate(resource.mySubmission.submittedAt)}</span> : null}
      {error ? <span className="text-xs text-down">{error}</span> : null}
    </div>
  );
}

export default function Resources() {
  const { me } = useCommunity();
  const { data, loading, error, reload } = useApi(`${BASE}/resources`);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [actionError, setActionError] = useState('');

  const remove = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"?`)) return;
    try {
      await api.delete(`${BASE}/resources/${resource._id}`);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const resources = data?.resources || [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {me.isModerator ? (
        <div className="flex justify-end">
          <Button onClick={() => setAdding(true)}>
            <FiPlus className="h-4 w-4" />
            Share a resource
          </Button>
        </div>
      ) : null}
      {error ? <Alert>{error.message}</Alert> : null}
      {actionError ? <Alert>{actionError}</Alert> : null}
      {loading && !data ? <Skeleton className="h-56" /> : null}
      {data && !resources.length ? (
        <EmptyState icon={FiFileText} title="No resources yet" description="Guides, templates and assignments from the mentor will appear here." />
      ) : null}

      {resources.map((r) => (
        <Card key={r._id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.kind === 'assignment' ? 'warn' : 'brand'}>{kindLabel(r.kind)}</Badge>
                <span className="text-xs text-fg-subtle">{timeAgo(r.createdAt)}</span>
              </div>
              <h3 className="mt-2 font-semibold text-fg">{r.title}</h3>
              {r.description ? <p className="mt-1 whitespace-pre-line text-sm text-fg-muted">{r.description}</p> : null}
            </div>
            {me.isModerator ? (
              <ActionMenu
                icon={FiMoreHorizontal}
                items={[
                  r.kind === 'assignment' ? { label: 'See who handed in', onClick: () => setViewing(r) } : null,
                  { label: 'Delete', danger: true, onClick: () => remove(r) },
                ]}
              />
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <Button href={publicAssetUrl(r.fileUrl)} target="_blank" rel="noopener noreferrer" size="sm" variant="secondary">
              <FiDownload className="h-4 w-4" />
              Open
            </Button>
            {r.kind === 'assignment' && !me.isModerator && !me.muted ? <HandIn resource={r} onDone={reload} /> : null}
          </div>
        </Card>
      ))}

      <AddModal open={adding} onClose={() => setAdding(false)} onAdded={reload} />
      {viewing ? <SubmissionsModal resource={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
