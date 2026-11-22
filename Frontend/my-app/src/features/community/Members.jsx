import { useEffect, useState } from 'react';
import { FiAward, FiMessageCircle, FiSearch, FiUsers } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { cx, formatDate } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Input, Skeleton } from '../../ui/primitives';
import { Modal } from '../../ui/overlays';
import { BASE, useCommunity } from './shared';

const MEDALS = ['text-warn', 'text-fg-muted', 'text-[#c98a5a]'];

/** A member's community profile: points, badges, and actions. */
export function ProfileModal({ userId, onClose }) {
  const { me, about, startChat } = useCommunity();
  const { data, loading, error } = useApi(`${BASE}/profile/${userId}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const isMe = userId === me.id;
  const canMessage =
    !isMe &&
    !me.muted &&
    (me.isModerator || (data?.user.isOwner ? me.canMessageMentor !== false : about.allowPeerMessaging));

  const moderate = async (payload, confirmText) => {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setActionError('');
    try {
      await api.post(`${BASE}/blocks`, { userId, ...payload });
      onClose();
    } catch (err) {
      setActionError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Member" size="sm">
      {loading ? <Skeleton className="h-48" /> : null}
      {error ? <Alert>{error.message}</Alert> : null}
      {data ? (
        <div className="text-center">
          <Avatar src={publicAssetUrl(data.user.profilePicture)} name={data.user.fullName} size={84} className="mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-fg">{data.user.fullName}</h3>
          {data.user.isOwner ? (
            <Badge tone="brand" className="mt-2">
              Mentor
            </Badge>
          ) : null}
          {data.user.headline ? <p className="mt-2 text-sm text-fg-muted">{data.user.headline}</p> : null}

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { label: 'Points', value: data.xp },
              { label: 'Posts', value: data.activity.postCount },
              { label: 'Answers', value: data.activity.answerCount },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-line bg-ink-900 px-2 py-3">
                <p className="tabular text-xl font-bold text-fg">{s.value}</p>
                <p className="text-xs text-fg-subtle">{s.label}</p>
              </div>
            ))}
          </div>

          {data.badges.length ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {data.badges.map((b) => (
                <Badge key={b.key} tone="warn">
                  <FiAward className="h-3 w-3" />
                  {b.name || b.key}
                </Badge>
              ))}
            </div>
          ) : null}
          <p className="mt-4 text-xs text-fg-subtle">Joined QuickX {formatDate(data.user.joinedAt)}</p>

          {actionError ? <Alert className="mt-4 text-left">{actionError}</Alert> : null}
          <div className="mt-5 flex flex-col gap-2">
            {canMessage ? (
              <Button
                onClick={() => {
                  onClose();
                  startChat(userId);
                }}
              >
                <FiMessageCircle className="h-4 w-4" />
                Message
              </Button>
            ) : null}
            {me.isModerator && !isMe && !data.user.isOwner ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => moderate({ muted: true, blocked: false }, `Mute ${data.user.fullName}? They can read but not post or message.`)}
                >
                  Mute
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() => moderate({ blocked: true }, `Block ${data.user.fullName} from the community?`)}
                >
                  Block
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export default function Members() {
  const { openProfile } = useCommunity();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const board = useApi(`${BASE}/leaderboard`);
  const members = useApi(`${BASE}/members`, { params: query ? { q: query } : {} });
  const leaders = board.data?.leaderboard || [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg">
          <FiAward className="h-5 w-5 text-warn" />
          Leaderboard
        </h2>
        {board.loading ? <Skeleton className="h-64" /> : null}
        {board.error ? <Alert>{board.error.message}</Alert> : null}
        {board.data && !leaders.length ? (
          <EmptyState icon={FiAward} title="No points yet" description="Post, answer questions and vote in polls to earn points." />
        ) : null}
        {leaders.length ? (
          <Card className="divide-y divide-line overflow-hidden">
            {leaders.map((row, i) => (
              <button
                key={String(row.userId)}
                type="button"
                onClick={() => openProfile(String(row.userId))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-fg/[0.03]"
              >
                <span className={cx('tabular w-6 text-center text-sm font-bold', MEDALS[i] || 'text-fg-subtle')}>{i + 1}</span>
                <Avatar src={publicAssetUrl(row.profilePicture)} name={row.fullName} size={36} />
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{row.fullName}</span>
                <span className="tabular text-sm font-semibold text-brand-300">{row.xp} pts</span>
              </button>
            ))}
          </Card>
        ) : null}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg">
          <FiUsers className="h-5 w-5 text-brand-400" />
          Members
          {members.data ? <span className="tabular text-sm font-normal text-fg-subtle">{members.data.total}</span> : null}
        </h2>
        <div className="relative mb-4">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a member" className="pl-10" aria-label="Find a member" />
        </div>
        {members.loading && !members.data ? <Skeleton className="h-64" /> : null}
        {members.error ? <Alert>{members.error.message}</Alert> : null}
        {members.data && !members.data.members.length ? <EmptyState icon={FiUsers} title="No members found" /> : null}
        {members.data?.members.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {members.data.members.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => openProfile(m.id)}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="rise-in flex items-center gap-3 rounded-2xl border border-line bg-ink-850 p-3 text-left transition hover:border-line-strong"
              >
                <Avatar src={publicAssetUrl(m.profilePicture)} name={m.fullName} size={40} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{m.fullName}</span>
                  {m.role === 'tutor' ? <span className="text-xs font-semibold text-brand-400">Mentor</span> : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
