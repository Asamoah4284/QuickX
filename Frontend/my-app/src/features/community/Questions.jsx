import { useEffect, useState } from 'react';
import { FiArrowLeft, FiCheckCircle, FiHelpCircle, FiMoreHorizontal, FiPlus, FiSearch } from 'react-icons/fi';
import { BsPinAngleFill } from 'react-icons/bs';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { cx, timeAgo } from '../../lib/format';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Skeleton, Textarea } from '../../ui/primitives';
import { Modal, Tabs } from '../../ui/overlays';
import { ActionMenu, Author, BASE, RichText, useCommunity } from './shared';

function AskModal({ open, onClose, onAsked }) {
  const [form, setForm] = useState({ title: '', body: '', topic: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`${BASE}/questions`, form);
      onAsked(data.question);
      setForm({ title: '', body: '', topic: '' });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ask a question">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Your question" htmlFor="q-title" hint="One clear sentence works best.">
          <Input id="q-title" value={form.title} onChange={set('title')} maxLength={200} required />
        </Field>
        <Field label="Details" htmlFor="q-body" hint="What have you tried? Include the pair and timeframe if it is about a trade.">
          <Textarea id="q-body" rows={5} value={form.body} onChange={set('body')} maxLength={5000} required />
        </Field>
        <Field label="Topic" htmlFor="q-topic" hint="Optional, e.g. Risk management">
          <Input id="q-topic" value={form.topic} onChange={set('topic')} maxLength={60} />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Ask
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function QuestionDetail({ questionId, onBack, onChanged }) {
  const { me } = useCommunity();
  const { data, loading, error, reload } = useApi(`${BASE}/questions/${questionId}`);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const act = async (fn) => {
    setActionError('');
    try {
      await fn();
      await reload();
      onChanged();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setBusy(true);
    await act(async () => {
      await api.post(`${BASE}/questions/${questionId}/answers`, { body: answer });
      setAnswer('');
    });
    setBusy(false);
  };

  if (loading && !data) return <Skeleton className="h-72" />;
  if (error) {
    return (
      <div className="space-y-4">
        <Alert>{error.message}</Alert>
        <Button variant="secondary" onClick={onBack}>
          Back to questions
        </Button>
      </div>
    );
  }

  const { question, answers } = data;
  const mine = String(question.authorId?._id) === me.id;
  const canPickBest = mine || me.isModerator;

  return (
    <div className="max-w-3xl space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
        <FiArrowLeft className="h-4 w-4" />
        All questions
      </button>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <Author user={question.authorId} when={timeAgo(question.createdAt)} />
          <ActionMenu
            icon={FiMoreHorizontal}
            items={[
              me.isModerator ? { label: question.pinned ? 'Unpin' : 'Pin', onClick: () => act(() => api.patch(`${BASE}/questions/${questionId}`, { pinned: !question.pinned })) } : null,
              canPickBest
                ? {
                    label: question.status === 'answered' ? 'Mark as open' : 'Mark as answered',
                    onClick: () => act(() => api.patch(`${BASE}/questions/${questionId}`, { status: question.status === 'answered' ? 'open' : 'answered' })),
                  }
                : null,
              mine || me.isModerator
                ? {
                    label: 'Delete',
                    danger: true,
                    onClick: () =>
                      window.confirm('Delete this question?') &&
                      api
                        .delete(`${BASE}/questions/${questionId}`)
                        .then(() => {
                          onChanged();
                          onBack();
                        })
                        .catch((err) => setActionError(errorMessage(err))),
                  }
                : null,
            ]}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={question.status === 'answered' ? 'up' : 'warn'}>{question.status === 'answered' ? 'Answered' : 'Open'}</Badge>
          {question.topic ? <Badge>{question.topic}</Badge> : null}
        </div>
        <h2 className="mt-3 text-xl font-bold text-fg">{question.title}</h2>
        <RichText text={question.body} className="mt-3" />
      </Card>

      {actionError ? <Alert>{actionError}</Alert> : null}

      <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">
        {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
      </h3>
      {answers.map((a) => {
        const answerMine = String(a.authorId?._id) === me.id;
        return (
          <Card key={a._id} className={cx('p-5', a.isBest && 'border-up/40')}>
            <div className="flex items-start justify-between gap-3">
              <Author
                user={a.authorId}
                when={timeAgo(a.createdAt)}
                size={36}
                extra={
                  a.isBest ? (
                    <Badge tone="up">
                      <FiCheckCircle className="h-3 w-3" />
                      Best answer
                    </Badge>
                  ) : null
                }
              />
              <ActionMenu
                icon={FiMoreHorizontal}
                items={[
                  canPickBest && !a.isBest ? { label: 'Mark as best answer', onClick: () => act(() => api.patch(`${BASE}/questions/${questionId}`, { bestAnswerId: a._id })) } : null,
                  answerMine || me.isModerator
                    ? { label: 'Delete', danger: true, onClick: () => window.confirm('Delete this answer?') && act(() => api.delete(`${BASE}/questions/${questionId}/answers/${a._id}`)) }
                    : null,
                ]}
              />
            </div>
            <RichText text={a.body} className="mt-3" />
          </Card>
        );
      })}

      {me.muted ? (
        <Alert tone="warn">You are muted and cannot answer right now.</Alert>
      ) : (
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-3">
            <Textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write an answer" maxLength={5000} aria-label="Write an answer" />
            <div className="flex justify-end">
              <Button type="submit" loading={busy} disabled={!answer.trim()}>
                Post answer
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

export default function Questions() {
  const { me } = useCommunity();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useApi(`${BASE}/questions`, {
    params: {
      ...(status === 'mine' ? { mine: 1 } : status !== 'all' ? { status } : {}),
      ...(query ? { q: query } : {}),
    },
  });

  if (selected) {
    return <QuestionDetail questionId={selected} onBack={() => setSelected(null)} onChanged={reload} />;
  }

  const questions = data?.questions || [];

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'answered', label: 'Answered' },
            { value: 'mine', label: 'Mine' },
          ]}
        />
        {!me.muted ? (
          <Button onClick={() => setAsking(true)}>
            <FiPlus className="h-4 w-4" />
            Ask a question
          </Button>
        ) : null}
      </div>
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions" className="pl-10" aria-label="Search questions" />
      </div>

      {error ? <Alert>{error.message}</Alert> : null}
      {loading && !data ? <Skeleton className="h-56" /> : null}
      {data && !questions.length ? (
        <EmptyState icon={FiHelpCircle} title="No questions here" description="Ask the first one. No question is too basic." />
      ) : null}

      {questions.length ? (
        <Card className="divide-y divide-line overflow-hidden">
          {questions.map((q, i) => (
            <button key={q._id} type="button" onClick={() => setSelected(q._id)} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} className="rise-in block w-full px-5 py-4 text-left transition hover:bg-fg/[0.03]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-fg">
                    {q.pinned ? <BsPinAngleFill className="h-3.5 w-3.5 shrink-0 text-brand-400" /> : null}
                    <span className="truncate">{q.title}</span>
                  </p>
                  <p className="mt-1 text-sm text-fg-subtle">
                    {q.authorId?.fullName || 'Former member'} · {timeAgo(q.createdAt)}
                    {q.topic ? ` · ${q.topic}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={q.status === 'answered' ? 'up' : 'warn'}>{q.status === 'answered' ? 'Answered' : 'Open'}</Badge>
                  <span className="tabular text-xs text-fg-subtle">
                    {q.answerCount || 0} {q.answerCount === 1 ? 'reply' : 'replies'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </Card>
      ) : null}

      <AskModal
        open={asking}
        onClose={() => setAsking(false)}
        onAsked={(question) => {
          reload();
          setSelected(question._id);
        }}
      />
    </div>
  );
}
