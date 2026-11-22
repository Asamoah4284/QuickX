import PlanLock from '../billing/PlanLock';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiMessageCircle, FiSend } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { cx, timeAgo } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { Alert, Avatar, Button, Card, EmptyState, Skeleton, Spinner, Textarea } from '../../ui/primitives';
import { BASE, useCommunity } from './shared';

const POLL_MS = 15000;

function otherPerson(conversation, myId) {
  return conversation.participantIds.find((p) => String(p._id) !== myId) || conversation.participantIds[0];
}

function Thread({ conversation, onBack, onActivity }) {
  const { me } = useCommunity();
  const [messages, setMessages] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const other = otherPerson(conversation, me.id);
  const url = `${BASE}/conversations/${conversation._id}/messages`;

  const refresh = useCallback(async () => {
    const { data } = await api.get(url);
    setMessages((prev) => {
      if (!prev) return data.messages;
      // Keep older pages already loaded; add anything new.
      const known = new Set(prev.map((m) => m._id));
      const fresh = data.messages.filter((m) => !known.has(m._id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    setCursor((prev) => (prev === null ? data.nextCursor : prev));
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    setCursor(null);
    stickToBottom.current = true;
    refresh()
      .then(() => !cancelled && onActivity())
      .catch((err) => !cancelled && setError(errorMessage(err)));
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh().catch(() => {});
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    const el = scrollRef.current;
    const heightBefore = el.scrollHeight;
    try {
      const { data } = await api.get(url, { params: { before: cursor } });
      stickToBottom.current = false;
      setMessages((prev) => [...data.messages, ...prev]);
      setCursor(data.nextCursor);
      // Keep the view anchored on the message the reader was looking at.
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - heightBefore;
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(url, { body });
      stickToBottom.current = true;
      setMessages((prev) => [...(prev || []), data.message]);
      setText('');
      onActivity();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="flex h-[70dvh] min-h-[26rem] flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button type="button" onClick={onBack} className="rounded-full p-2 text-fg-muted hover:bg-white/[0.06] hover:text-fg lg:hidden" aria-label="Back to conversations">
          <FiArrowLeft className="h-5 w-5" />
        </button>
        <Avatar src={publicAssetUrl(other?.profilePicture)} name={other?.fullName} size={36} />
        <p className="truncate font-semibold text-fg">{other?.fullName || 'Member'}</p>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages === null && !error ? (
          <div className="flex h-full items-center justify-center text-fg-subtle">
            <Spinner />
          </div>
        ) : null}
        {cursor ? (
          <div className="flex justify-center pb-2">
            <Button variant="ghost" size="sm" onClick={loadOlder}>
              Load earlier messages
            </Button>
          </div>
        ) : null}
        {messages && !messages.length ? <p className="pt-10 text-center text-sm text-fg-subtle">Say hello to start the conversation.</p> : null}
        {(messages || []).map((m) => {
          const mine = String(m.senderId?._id || m.senderId) === me.id;
          return (
            <div key={m._id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[80%] rounded-2xl px-4 py-2.5', mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-ink-700 text-fg')}>
                <p className="whitespace-pre-line break-words text-sm">{m.body}</p>
                <p className={cx('mt-1 text-[11px]', mine ? 'text-white/70' : 'text-fg-subtle')}>{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error ? <Alert className="mx-4 mb-2">{error}</Alert> : null}
      {me.muted ? (
        <p className="border-t border-line px-4 py-3 text-sm text-fg-subtle">You are muted and cannot send messages right now.</p>
      ) : (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
          <Textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) send(e);
            }}
            placeholder="Write a message"
            maxLength={4000}
            className="max-h-32 min-h-11 resize-none"
            aria-label="Write a message"
          />
          <Button type="submit" className="h-11 w-11 shrink-0 px-0" loading={sending} disabled={!text.trim()} aria-label="Send message">
            {sending ? null : <FiSend className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </Card>
  );
}

/** `openWith` is a conversation to open straight away (set when "Message" is tapped on a profile). */
export default function Messages({ openWith, onUnreadChange }) {
  const { me, about, startChat } = useCommunity();
  const [conversations, setConversations] = useState(null);
  const [active, setActive] = useState(openWith || null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get(`${BASE}/conversations`);
    setConversations(data.conversations);
    onUnreadChange?.(data.unreadTotal);
  }, [onUnreadChange]);

  useEffect(() => {
    load().catch((err) => setError(errorMessage(err)));
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') load().catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (openWith) setActive(openWith);
  }, [openWith]);

  const list = conversations || [];
  const hasMentorChat = list.some((c) => c.participantIds.some((p) => String(p._id) === about.owner?.id));

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      <div className={cx(active && 'hidden lg:block')}>
        {error ? <Alert className="mb-3">{error}</Alert> : null}
        {!me.isModerator && about.owner && !hasMentorChat && !me.muted && me.canMessageMentor ? (
          <Button className="mb-3 w-full" onClick={() => startChat(about.owner.id)}>
            <FiMessageCircle className="h-4 w-4" />
            Message {about.owner.fullName.split(/\s+/)[0]}
          </Button>
        ) : null}
        {!me.isModerator && about.owner && !hasMentorChat && me.canMessageMentor === false ? (
          <PlanLock
            className="mb-3"
            feature="mentorship"
            title={`Message ${about.owner.fullName.split(/\s+/)[0]} directly`}
            text="Private messages with Maxwell come with Mentorship. Questions for everyone are free in Q&A."
          />
        ) : null}
        {conversations === null && !error ? <Skeleton className="h-48" /> : null}
        {conversations && !list.length ? (
          <EmptyState
            icon={FiMessageCircle}
            title="No messages yet"
            description={me.isModerator ? 'Open a member’s profile to message them.' : 'Your conversations will appear here.'}
          />
        ) : null}
        {list.length ? (
          <Card className="divide-y divide-line overflow-hidden">
            {list.map((c) => {
              const other = otherPerson(c, me.id);
              const isActive = active?._id === c._id;
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => setActive(c)}
                  className={cx('flex w-full items-center gap-3 px-4 py-3 text-left transition', isActive ? 'bg-brand-500/15' : 'hover:bg-white/[0.03]')}
                >
                  <Avatar src={publicAssetUrl(other?.profilePicture)} name={other?.fullName} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cx('truncate text-fg', c.unreadCount ? 'font-bold' : 'font-medium')}>{other?.fullName || 'Member'}</span>
                      {c.lastMessage ? <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(c.lastMessage.at)}</span> : null}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={cx('truncate text-sm', c.unreadCount ? 'text-fg' : 'text-fg-subtle')}>
                        {c.lastMessage ? `${String(c.lastMessage.senderId) === me.id ? 'You: ' : ''}${c.lastMessage.body}` : 'No messages yet'}
                      </span>
                      {c.unreadCount ? (
                        <span className="tabular flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </Card>
        ) : null}
      </div>

      <div className={cx(!active && 'hidden lg:block')}>
        {active ? (
          <Thread key={active._id} conversation={active} onBack={() => setActive(null)} onActivity={() => load().catch(() => {})} />
        ) : (
          <EmptyState icon={FiMessageCircle} title="Pick a conversation" description="Choose someone on the left to read and reply." className="h-full justify-center" />
        )}
      </div>
    </div>
  );
}
