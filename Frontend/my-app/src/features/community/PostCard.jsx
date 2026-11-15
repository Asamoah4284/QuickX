import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCornerDownRight, FiHeart, FiMessageCircle, FiMoreHorizontal, FiSend } from 'react-icons/fi';
import { BsPinAngleFill } from 'react-icons/bs';
import { api, errorMessage } from '../../lib/api';
import { cx, timeAgo } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { resolveMentions } from '../../utils/communityMentions';
import { Alert, Badge, Button, Card, Spinner, Textarea } from '../../ui/primitives';
import { ActionMenu, Author, BASE, RichText, useCommunity } from './shared';

function Poll({ poll, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = poll.options.reduce((n, o) => n + (o.voteCount || 0), 0);
  const voted = poll.myVote != null;
  const showResults = voted || poll.closed;

  const vote = async (optionIndex) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`${BASE}/polls/${poll._id}/vote`, { optionIndex });
      onChange(data.poll);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      {poll.options.map((option, i) => {
        const pct = total ? Math.round(((option.voteCount || 0) / total) * 100) : 0;
        const mine = poll.myVote === i;
        return (
          <button
            key={option._id || i}
            type="button"
            disabled={showResults || busy}
            onClick={() => vote(i)}
            className={cx(
              'relative block w-full overflow-hidden rounded-xl border px-4 py-3 text-left text-sm transition',
              mine ? 'border-brand-400/60' : 'border-line',
              !showResults && 'hover:border-line-strong hover:bg-white/[0.04]'
            )}
          >
            {showResults ? (
              <motion.span
                className={cx('absolute inset-y-0 left-0', mine ? 'bg-brand-500/25' : 'bg-white/[0.06]')}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}
            <span className="relative flex items-center justify-between gap-4">
              <span className="text-fg">{option.text}</span>
              {showResults ? <span className="tabular text-fg-muted">{pct}%</span> : null}
            </span>
          </button>
        );
      })}
      <p className="text-xs text-fg-subtle">
        {total} {total === 1 ? 'vote' : 'votes'}
        {poll.closed ? ' · Poll closed' : ''}
      </p>
      {error ? <p className="text-sm text-down">{error}</p> : null}
    </div>
  );
}

function MediaGrid({ media }) {
  const images = media.filter((m) => m.type === 'image');
  const others = media.filter((m) => m.type !== 'image');
  return (
    <>
      {images.length ? (
        <div className={cx('mt-4 grid gap-2', images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
          {images.map((m) => (
            <a key={m.url} href={publicAssetUrl(m.url)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line">
              <img src={publicAssetUrl(m.url)} alt={m.name || ''} loading="lazy" className={cx('w-full object-cover', images.length > 1 ? 'aspect-square' : 'max-h-[28rem]')} />
            </a>
          ))}
        </div>
      ) : null}
      {others.map((m) =>
        m.type === 'video' ? (
          <video key={m.url} src={publicAssetUrl(m.url)} controls playsInline preload="metadata" className="mt-4 w-full rounded-xl border border-line bg-black" />
        ) : (
          <a
            key={m.url}
            href={publicAssetUrl(m.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block truncate rounded-xl border border-line bg-ink-900 px-4 py-3 text-sm text-brand-400 hover:underline"
          >
            {m.name || m.url}
          </a>
        )
      )}
    </>
  );
}

function Comments({ post, onCountChange }) {
  const { me, members } = useCommunity();
  const [comments, setComments] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`${BASE}/posts/${post._id}/comments`)
      .then(({ data }) => !cancelled && setComments(data.comments))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [post._id]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`${BASE}/posts/${post._id}/comments`, {
        body,
        parentId: replyTo?._id || undefined,
        mentions: resolveMentions(body, members),
      });
      setComments((list) => [...(list || []), data.comment]);
      onCountChange(1);
      setText('');
      setReplyTo(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const { data } = await api.delete(`${BASE}/comments/${comment._id}`);
      setComments((list) => list.filter((c) => c._id !== comment._id && c.parentId !== comment._id));
      onCountChange(-(data.removed || 1));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const top = (comments || []).filter((c) => !c.parentId);
  const repliesOf = (id) => (comments || []).filter((c) => c.parentId === id);

  const renderComment = (c, nested = false) => {
    const mine = String(c.authorId?._id) === me.id;
    return (
      <li key={c._id} className={cx(nested && 'ml-11')}>
        <div className="flex items-start justify-between gap-2">
          <Author user={c.authorId} when={timeAgo(c.createdAt)} size={32} />
          <ActionMenu
            icon={FiMoreHorizontal}
            items={[mine || me.isModerator ? { label: 'Delete', danger: true, onClick: () => remove(c) } : null]}
          />
        </div>
        <div className="ml-11 mt-1">
          <RichText text={c.body} className="text-sm" />
          {!me.muted ? (
            <button
              type="button"
              onClick={() => {
                setReplyTo(c);
                setText(`@${String(c.authorId?.fullName || '').split(/\s+/)[0]} `);
              }}
              className="mt-1 text-xs font-semibold text-fg-subtle hover:text-fg"
            >
              Reply
            </button>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <div className="mt-4 border-t border-line pt-4">
      {error ? <Alert className="mb-3">{error}</Alert> : null}
      {comments === null && !error ? (
        <div className="flex justify-center py-4 text-fg-subtle">
          <Spinner />
        </div>
      ) : null}
      {comments && !comments.length ? <p className="pb-3 text-sm text-fg-subtle">No comments yet. Start the conversation.</p> : null}
      <ul className="space-y-4">
        {top.map((c) => (
          <li key={c._id}>
            <ul className="space-y-3">
              {renderComment(c)}
              {repliesOf(c._id).map((r) => renderComment(r, true))}
            </ul>
          </li>
        ))}
      </ul>

      {me.muted ? (
        <p className="mt-4 text-sm text-fg-subtle">You are muted and cannot comment right now.</p>
      ) : (
        <form onSubmit={send} className="mt-4">
          {replyTo ? (
            <p className="mb-2 flex items-center gap-2 text-xs text-fg-subtle">
              <FiCornerDownRight className="h-3.5 w-3.5" />
              Replying to {replyTo.authorId?.fullName}
              <button type="button" onClick={() => setReplyTo(null)} className="font-semibold text-fg-muted hover:text-fg">
                Cancel
              </button>
            </p>
          ) : null}
          <div className="flex items-end gap-2">
            <Textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment"
              maxLength={2000}
              className="min-h-11 resize-none"
              aria-label="Write a comment"
            />
            <Button type="submit" size="sm" className="h-11 w-11 shrink-0 px-0" loading={sending} disabled={!text.trim()} aria-label="Send comment">
              {sending ? null : <FiSend className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function PostCard({ post, onChange, onRemove }) {
  const { me } = useCommunity();
  const [showComments, setShowComments] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState('');
  const mine = String(post.authorId?._id) === me.id;

  const toggleLike = async () => {
    if (liking) return;
    setLiking(true);
    // Update the heart straight away; put it back if the server says no.
    const before = { likedByMe: post.likedByMe, likeCount: post.likeCount };
    onChange({ ...post, likedByMe: !post.likedByMe, likeCount: Math.max(0, post.likeCount + (post.likedByMe ? -1 : 1)) });
    try {
      const { data } = post.likedByMe
        ? await api.delete(`${BASE}/posts/${post._id}/like`)
        : await api.post(`${BASE}/posts/${post._id}/like`);
      onChange({ ...post, likedByMe: data.liked, likeCount: data.likeCount });
    } catch (err) {
      onChange({ ...post, ...before });
      setError(errorMessage(err));
    } finally {
      setLiking(false);
    }
  };

  const act = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = () =>
    window.confirm('Delete this post?') &&
    act(async () => {
      await api.delete(`${BASE}/posts/${post._id}`);
      onRemove(post._id);
    });

  const patch = (changes) =>
    act(async () => {
      await api.patch(`${BASE}/posts/${post._id}`, changes);
      onChange({ ...post, ...changes });
    });

  const report = () => {
    const reason = window.prompt('What is wrong with this post?');
    if (!reason?.trim()) return;
    act(async () => {
      await api.post(`${BASE}/reports`, { entityType: 'post', entityId: post._id, reason: reason.trim() });
      window.alert('Thanks. The mentor will take a look.');
    });
  };

  const closePoll = () =>
    act(async () => {
      const { data } = await api.patch(`${BASE}/polls/${post.poll._id}`, { closed: !post.poll.closed });
      onChange({ ...post, poll: { ...post.poll, closed: data.poll.closed } });
    });

  return (
    <Card className={cx('p-5 sm:p-6', post.type === 'announcement' && 'border-brand-400/40')}>
      <div className="flex items-start justify-between gap-3">
        <Author
          user={post.authorId}
          when={timeAgo(post.createdAt)}
          extra={
            <>
              {post.type === 'announcement' ? <Badge tone="warn">Announcement</Badge> : null}
              {post.pinned ? (
                <Badge>
                  <BsPinAngleFill className="h-3 w-3" />
                  Pinned
                </Badge>
              ) : null}
            </>
          }
        />
        <ActionMenu
          icon={FiMoreHorizontal}
          items={[
            me.isModerator ? { label: post.pinned ? 'Unpin' : 'Pin to top', onClick: () => patch({ pinned: !post.pinned }) } : null,
            me.isModerator && post.poll ? { label: post.poll.closed ? 'Reopen poll' : 'Close poll', onClick: closePoll } : null,
            !mine ? { label: 'Report', onClick: report } : null,
            mine || me.isModerator ? { label: 'Delete', danger: true, onClick: remove } : null,
          ]}
        />
      </div>

      {post.body ? <RichText text={post.body} className="mt-4" /> : null}
      {post.media?.length ? <MediaGrid media={post.media} /> : null}
      {post.poll ? <Poll poll={post.poll} onChange={(poll) => onChange({ ...post, poll })} /> : null}
      {error ? <Alert className="mt-3">{error}</Alert> : null}

      <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={post.likedByMe}
          className={cx(
            'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]',
            post.likedByMe ? 'text-down' : 'text-fg-muted hover:text-fg'
          )}
        >
          <motion.span key={String(post.likedByMe)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
            <FiHeart className={cx('h-4 w-4', post.likedByMe && 'fill-current')} />
          </motion.span>
          <span className="tabular">{post.likeCount || 0}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-white/[0.06] hover:text-fg"
        >
          <FiMessageCircle className="h-4 w-4" />
          <span className="tabular">{post.commentCount || 0}</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showComments ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <Comments post={post} onCountChange={(delta) => onChange({ ...post, commentCount: Math.max(0, (post.commentCount || 0) + delta) })} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
