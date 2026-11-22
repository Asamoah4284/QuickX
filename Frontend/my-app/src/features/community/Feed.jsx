import { useCallback, useEffect, useState } from 'react';
import { FiBarChart2, FiLock, FiMessageSquare, FiPlus, FiX } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { cx } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { resolveMentions } from '../../utils/communityMentions';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton, Textarea } from '../../ui/primitives';
import { FEATURES } from '../../lib/features';
import PlanLock from '../billing/PlanLock';
import { Modal } from '../../ui/overlays';
import { Stagger, StaggerItem } from '../../ui/motion';
import PostCard from './PostCard';
import { BASE, ImagePicker, MediaThumbs, useCommunity } from './shared';

/** Who a room is for. Matches DiscussionRoom.requires on the server. */
const ROOM_ACCESS = [
  { value: '', label: 'Everyone in the community' },
  { value: 'signals', label: 'Signals members only' },
  { value: 'courses', label: 'Courses members only' },
  { value: 'mentorship', label: 'Mentorship members only' },
];

function RoomAccessSelect({ id, value, onChange }) {
  return (
    <Select id={id} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {ROOM_ACCESS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

function PollModal({ open, onClose, onCreated }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`${BASE}/polls`, { question, options: options.filter((o) => o.trim()) });
      onCreated(data.post);
      setQuestion('');
      setOptions(['', '']);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a poll">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Question" htmlFor="poll-q">
          <Input id="poll-q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} required />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium text-fg">Options</p>
          {options.map((option, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={option}
                onChange={(e) => setOptions((list) => list.map((o, j) => (j === i ? e.target.value : o)))}
                placeholder={`Option ${i + 1}`}
                maxLength={120}
                aria-label={`Option ${i + 1}`}
              />
              {options.length > 2 ? (
                <button type="button" onClick={() => setOptions((list) => list.filter((_, j) => j !== i))} className="rounded-full p-2 text-fg-subtle hover:text-fg" aria-label="Remove option">
                  <FiX className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
          {options.length < 8 ? (
            <Button variant="ghost" size="sm" onClick={() => setOptions((list) => [...list, ''])}>
              <FiPlus className="h-4 w-4" />
              Add option
            </Button>
          ) : null}
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Post poll
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Composer({ roomId, onPosted }) {
  const { user } = useAuth();
  const { me, members } = useCommunity();
  const [body, setBody] = useState('');
  const [media, setMedia] = useState([]);
  const [announcement, setAnnouncement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pollOpen, setPollOpen] = useState(false);

  if (me.muted) {
    return <Alert tone="warn">You are muted in this community. You can read posts but not write.</Alert>;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim() && !media.length) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`${BASE}/posts`, {
        body,
        media,
        roomId: roomId || undefined,
        type: announcement ? 'announcement' : 'post',
        mentions: resolveMentions(body, members),
      });
      onPosted(data.post);
      setBody('');
      setMedia([]);
      setAnnouncement(false);
    } catch (err) {
      setError(errorMessage(err, 'Could not post. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={submit}>
        <div className="flex gap-3">
          <Avatar src={publicAssetUrl(user?.profilePicture)} name={user?.fullName} size={40} className="shrink-0" />
          <Textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={me.isModerator ? 'Share an update with your members' : 'Share a trade, a win or a question'}
            maxLength={5000}
            className="resize-none border-transparent bg-transparent px-0 focus:border-transparent focus:ring-0"
            aria-label="Write a post"
          />
        </div>
        <MediaThumbs media={media} onRemove={(i) => setMedia((list) => list.filter((_, j) => j !== i))} />
        {error ? <Alert className="mt-3">{error}</Alert> : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-1">
            <ImagePicker count={media.length} onUploaded={(m) => setMedia((list) => [...list, m])} onError={setError} />
            {me.isModerator && !roomId ? (
              <>
                <button
                  type="button"
                  onClick={() => setPollOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-fg/[0.06] hover:text-fg"
                >
                  <FiBarChart2 className="h-4 w-4" />
                  Poll
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-fg-muted">
                  <input type="checkbox" checked={announcement} onChange={(e) => setAnnouncement(e.target.checked)} className="h-4 w-4 accent-brand-500" />
                  Announcement
                </label>
              </>
            ) : null}
          </div>
          <Button type="submit" size="sm" loading={busy} disabled={!body.trim() && !media.length}>
            Post
          </Button>
        </div>
      </form>
      <PollModal open={pollOpen} onClose={() => setPollOpen(false)} onCreated={onPosted} />
    </Card>
  );
}

function RoomModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requires, setRequires] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`${BASE}/rooms`, { name, description, requires: requires || null });
      onCreated(data.room);
      setName('');
      setDescription('');
      setRequires('');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New room" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" htmlFor="room-name" hint="e.g. Gold traders, Beginners, Trade reviews">
          <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </Field>
        <Field label="What is it for?" htmlFor="room-desc">
          <Input id="room-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
        </Field>
        <Field label="Who can see this room?" htmlFor="room-access" hint="Members without that plan see the room locked, with a button to get the plan.">
          <RoomAccessSelect id="room-access" value={requires} onChange={setRequires} />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" loading={busy} className="w-full">
          Create room
        </Button>
      </form>
    </Modal>
  );
}

export default function Feed() {
  const { me } = useCommunity();
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [posts, setPosts] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [roomModal, setRoomModal] = useState(false);

  useEffect(() => {
    api
      .get(`${BASE}/rooms`)
      .then(({ data }) => setRooms(data.rooms))
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (before) => {
      const { data } = await api.get(`${BASE}/posts`, {
        params: { ...(roomId ? { roomId } : {}), ...(before ? { before } : {}) },
      });
      return data;
    },
    [roomId]
  );

  const locked = Boolean(rooms.find((r) => r._id === roomId)?.locked);

  useEffect(() => {
    let cancelled = false;
    setPosts(null);
    setError('');
    if (locked) return undefined;
    load()
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts);
        setCursor(data.nextCursor);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [load, locked]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await load(cursor);
      setPosts((list) => [...list, ...data.posts.filter((p) => !list.some((x) => x._id === p._id))]);
      setCursor(data.nextCursor);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const archiveRoom = async () => {
    const room = rooms.find((r) => r._id === roomId);
    if (!room || !window.confirm(`Archive the "${room.name}" room? Its posts are kept but hidden.`)) return;
    try {
      await api.patch(`${BASE}/rooms/${roomId}`, { archived: true });
      setRooms((list) => list.filter((r) => r._id !== roomId));
      setRoomId('');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const changeAccess = async (value) => {
    try {
      const { data } = await api.patch(`${BASE}/rooms/${roomId}`, { requires: value || null });
      setRooms((list) => list.map((r) => (r._id === roomId ? { ...r, requires: data.room.requires || null } : r)));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const chip = (active) =>
    cx(
      'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
      active ? 'border-brand-400/60 bg-brand-500/15 text-fg' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
    );
  const activeRoom = rooms.find((r) => r._id === roomId);

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button type="button" className={chip(!roomId)} onClick={() => setRoomId('')}>
          Main feed
        </button>
        {rooms.map((room) => (
          <button
            key={room._id}
            type="button"
            className={cx(chip(roomId === room._id), 'inline-flex items-center gap-1.5')}
            onClick={() => setRoomId(room._id)}
          >
            {room.locked ? <FiLock className="h-3.5 w-3.5 text-fg-subtle" aria-label="Locked" /> : null}
            {room.name}
            {room.postCount ? <span className="tabular ml-2 text-xs text-fg-subtle">{room.postCount}</span> : null}
          </button>
        ))}
        {me.isModerator ? (
          <button type="button" className={cx(chip(false), 'inline-flex items-center gap-1.5')} onClick={() => setRoomModal(true)}>
            <FiPlus className="h-4 w-4" />
            Room
          </button>
        ) : null}
      </div>

      {activeRoom ? (
        <div className="space-y-3 text-sm text-fg-muted">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="min-w-0 flex-1">{activeRoom.description || `Posts in ${activeRoom.name}.`}</p>
            {activeRoom.requires && !me.isModerator ? (
              <Badge tone="brand">{FEATURES[activeRoom.requires]?.label} members</Badge>
            ) : null}
          </div>
          {me.isModerator ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-64">
                <RoomAccessSelect id="room-access-edit" value={activeRoom.requires} onChange={changeAccess} />
              </div>
              <button type="button" onClick={archiveRoom} className="font-semibold text-fg-subtle hover:text-down">
                Archive room
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {locked ? (
        <PlanLock
          feature={activeRoom.requires}
          title={`The ${activeRoom.name} is for ${FEATURES[activeRoom.requires]?.label} members`}
          text="Get the plan to read and post here. Everything else in the community stays free."
        />
      ) : null}

      {locked ? null : <Composer roomId={roomId} onPosted={(post) => setPosts((list) => [post, ...(list || [])])} />}

      {error ? <Alert>{error}</Alert> : null}
      {!locked && posts === null && !error ? (
        <div className="space-y-5">
          <Skeleton className="h-44" />
          <Skeleton className="h-64" />
        </div>
      ) : null}
      {!locked && posts && !posts.length ? (
        <EmptyState icon={FiMessageSquare} title="Nothing here yet" description="Be the first to post." />
      ) : null}

      {!locked && posts?.length ? (
        <Stagger key={roomId || 'main'} className="space-y-5">
          {posts.map((post) => (
            <StaggerItem key={post._id}>
              <PostCard
                post={post}
                onChange={(next) => setPosts((list) => list.map((p) => (p._id === next._id ? next : p)))}
                onRemove={(id) => setPosts((list) => list.filter((p) => p._id !== id))}
              />
            </StaggerItem>
          ))}
        </Stagger>
      ) : null}

      {!locked && cursor ? (
        <div className="flex justify-center">
          <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
            Load older posts
          </Button>
        </div>
      ) : null}

      <RoomModal open={roomModal} onClose={() => setRoomModal(false)} onCreated={(room) => setRooms((list) => [...list, { ...room, postCount: 0 }])} />
    </div>
  );
}
