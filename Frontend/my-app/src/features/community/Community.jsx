import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiBookOpen, FiSearch, FiUsers, FiX } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { timeAgo } from '../../lib/format';
import { Alert, Button, Card, Container, Input, PageHeader, PageLoader, Skeleton } from '../../ui/primitives';
import { Modal, Tabs } from '../../ui/overlays';
import FeatureGate from '../billing/FeatureGate';
import Feed from './Feed';
import Questions from './Questions';
import Resources from './Resources';
import Live from './Live';
import Members, { ProfileModal } from './Members';
import Messages from './Messages';
import Manage from './Manage';
import { BASE, CommunityContext, RichText } from './shared';

const TAB_KEYS = ['feed', 'questions', 'resources', 'live', 'members', 'messages', 'manage'];

function SearchModal({ onClose, onOpenTab }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(text.trim()), 350);
    return () => window.clearTimeout(t);
  }, [text]);
  const { data, loading } = useApi(query.length >= 2 ? `${BASE}/search` : null, { params: { q: query } });
  const empty = data && !data.posts.length && !data.questions.length && !data.resources.length;

  const Section = ({ title, items, render, tab }) =>
    items.length ? (
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{title}</h3>
          <button type="button" className="text-xs font-semibold text-brand-400 hover:underline" onClick={() => onOpenTab(tab)}>
            Open {title.toLowerCase()}
          </button>
        </div>
        <ul className="space-y-2">{items.map(render)}</ul>
      </section>
    ) : null;

  return (
    <Modal open onClose={onClose} title="Search the community" size="lg">
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Search posts, questions and resources" className="pl-10" aria-label="Search" />
      </div>
      <div className="mt-5 space-y-6">
        {loading ? <Skeleton className="h-24" /> : null}
        {empty ? <p className="text-sm text-fg-muted">Nothing found for “{query}”.</p> : null}
        {data ? (
          <>
            <Section
              title="Posts"
              tab="feed"
              items={data.posts}
              render={(p) => (
                <li key={p._id} className="rounded-xl border border-line bg-ink-900 px-4 py-3">
                  <p className="text-xs text-fg-subtle">
                    {p.authorId?.fullName} · {timeAgo(p.createdAt)}
                  </p>
                  <RichText text={p.body.slice(0, 280)} className="mt-1 text-sm" />
                </li>
              )}
            />
            <Section
              title="Questions"
              tab="questions"
              items={data.questions}
              render={(q) => (
                <li key={q._id} className="rounded-xl border border-line bg-ink-900 px-4 py-3">
                  <p className="font-semibold text-fg">{q.title}</p>
                  <p className="text-xs text-fg-subtle">
                    {q.authorId?.fullName} · {timeAgo(q.createdAt)}
                  </p>
                </li>
              )}
            />
            <Section
              title="Resources"
              tab="resources"
              items={data.resources}
              render={(r) => (
                <li key={r._id} className="rounded-xl border border-line bg-ink-900 px-4 py-3">
                  <p className="font-semibold text-fg">{r.title}</p>
                  {r.description ? <p className="text-sm text-fg-muted">{r.description.slice(0, 160)}</p> : null}
                </li>
              )}
            />
          </>
        ) : null}
      </div>
    </Modal>
  );
}

function CommunityHome() {
  const about = useApi(`${BASE}/about`);
  const [params, setParams] = useSearchParams();
  const tab = TAB_KEYS.includes(params.get('tab')) ? params.get('tab') : 'feed';
  const setTab = useCallback((next) => setParams(next === 'feed' ? {} : { tab: next }, { replace: true }), [setParams]);

  const [members, setMembers] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [openChat, setOpenChat] = useState(null);
  const [unread, setUnread] = useState(0);
  const [searching, setSearching] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [chatError, setChatError] = useState('');

  // Member names power @mentions; unread count powers the Messages badge.
  useEffect(() => {
    api
      .get(`${BASE}/members`)
      .then(({ data }) => setMembers(data.members))
      .catch(() => {});
    const loadUnread = () =>
      api
        .get(`${BASE}/conversations`)
        .then(({ data }) => setUnread(data.unreadTotal))
        .catch(() => {});
    loadUnread();
    const id = window.setInterval(() => document.visibilityState === 'visible' && loadUnread(), 60000);
    return () => window.clearInterval(id);
  }, []);

  const startChat = useCallback(
    async (userId) => {
      setChatError('');
      try {
        const { data } = await api.post(`${BASE}/conversations`, { participantId: userId });
        setOpenChat(data.conversation);
        setTab('messages');
      } catch (err) {
        setChatError(errorMessage(err));
      }
    },
    [setTab]
  );

  const context = useMemo(
    () =>
      about.data
        ? {
            about: about.data,
            me: about.data.me,
            members,
            openProfile: setProfileId,
            startChat,
            reloadAbout: about.reload,
          }
        : null,
    [about.data, about.reload, members, startChat]
  );

  if (about.loading && !about.data) return <PageLoader label="Opening the community" />;
  if (about.error) {
    return (
      <Container className="py-16">
        <Alert className="mx-auto max-w-xl">
          {about.error.code === 'BLOCKED' ? 'You no longer have access to the community. Contact the mentor if you think this is a mistake.' : about.error.message}
        </Alert>
      </Container>
    );
  }

  const { me, memberCount, guidelines } = about.data;
  const tabs = [
    { value: 'feed', label: 'Feed' },
    { value: 'questions', label: 'Q&A' },
    { value: 'resources', label: 'Resources' },
    { value: 'live', label: 'Live' },
    { value: 'members', label: 'Members' },
    { value: 'messages', label: 'Messages', count: unread || undefined },
    ...(me.isModerator ? [{ value: 'manage', label: 'Manage' }] : []),
  ];

  return (
    <CommunityContext.Provider value={context}>
      <Container className="py-8 sm:py-12">
        <PageHeader
          eyebrow="Community"
          title="Trade together"
          description={
            <span className="flex items-center gap-2">
              <FiUsers className="h-4 w-4" />
              <span className="tabular">{memberCount}</span> {memberCount === 1 ? 'member' : 'members'}
            </span>
          }
          actions={
            <>
              {guidelines ? (
                <Button variant="secondary" size="sm" onClick={() => setShowGuidelines(true)}>
                  <FiBookOpen className="h-4 w-4" />
                  Guidelines
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={() => setSearching(true)}>
                <FiSearch className="h-4 w-4" />
                Search
              </Button>
            </>
          }
        />

        <div className="mt-6">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
        </div>

        {chatError ? (
          <Alert className="mt-5 flex items-center justify-between gap-3">
            {chatError}
            <button type="button" onClick={() => setChatError('')} aria-label="Dismiss">
              <FiX className="h-4 w-4" />
            </button>
          </Alert>
        ) : null}

        <div className="mt-6">
          {tab === 'feed' ? <Feed /> : null}
          {tab === 'questions' ? <Questions /> : null}
          {tab === 'resources' ? <Resources /> : null}
          {tab === 'live' ? <Live /> : null}
          {tab === 'members' ? <Members /> : null}
          {tab === 'messages' ? <Messages openWith={openChat} onUnreadChange={setUnread} /> : null}
          {tab === 'manage' && me.isModerator ? <Manage /> : null}
        </div>
      </Container>

      {profileId ? <ProfileModal userId={profileId} onClose={() => setProfileId(null)} /> : null}
      {searching ? (
        <SearchModal
          onClose={() => setSearching(false)}
          onOpenTab={(next) => {
            setSearching(false);
            setTab(next);
          }}
        />
      ) : null}
      <Modal open={showGuidelines} onClose={() => setShowGuidelines(false)} title="Community guidelines">
        <Card className="border-0 bg-transparent p-0 shadow-none">
          <RichText text={guidelines} className="text-sm text-fg-muted" />
        </Card>
      </Modal>
    </CommunityContext.Provider>
  );
}

export default function Community() {
  return (
    <>
      <Helmet>
        <title>Community — QuickX</title>
      </Helmet>
      <FeatureGate feature="community">
        <CommunityHome />
      </FeatureGate>
    </>
  );
}
