import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  FiBookOpen,
  FiFolder,
  FiHelpCircle,
  FiMessageCircle,
  FiMessageSquare,
  FiSearch,
  FiSettings,
  FiUsers,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { cx, timeAgo } from '../../lib/format';
import { Alert, Button, Card, Container, Input, PageHeader, PageLoader, Skeleton } from '../../ui/primitives';
import { Modal, Tabs } from '../../ui/overlays';
import { useAuth } from '../../lib/auth';
import { Reveal } from '../../ui/motion';
import Feed from './Feed';
import Questions from './Questions';
import Resources from './Resources';
import Live from './Live';
import Members, { ProfileModal } from './Members';
import Messages from './Messages';
import Manage from './Manage';
import { BASE, CommunityContext, RichText } from './shared';

const SECTIONS = [
  { value: 'feed', label: 'Feed', icon: FiMessageSquare, help: 'Share trades, charts and wins. Pick a room to see one topic.' },
  { value: 'questions', label: 'Q&A', icon: FiHelpCircle, help: 'Ask a question. Maxwell or another member will answer it.' },
  { value: 'resources', label: 'Resources', icon: FiFolder, help: 'Useful files, links and videos shared by Maxwell.' },
  { value: 'live', label: 'Live', icon: FiVideo, help: 'Upcoming live sessions and recordings of past ones.' },
  { value: 'members', label: 'Members', icon: FiUsers, help: 'See who is here and start a private chat.' },
  { value: 'messages', label: 'Messages', icon: FiMessageCircle, help: 'Your private chats with other members.' },
  { value: 'manage', label: 'Manage', icon: FiSettings, help: 'Reports, members and community settings.', moderator: true },
];
const TAB_KEYS = SECTIONS.map((section) => section.value);

/** Desktop side menu. */
function SectionNav({ sections, value, onChange }) {
  return (
    <nav aria-label="Community sections" className="sticky top-24 space-y-1">
      {sections.map((section) => {
        const active = section.value === value;
        const Icon = section.icon;
        return (
          <button
            key={section.value}
            type="button"
            onClick={() => onChange(section.value)}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
              active ? 'text-fg' : 'text-fg-muted hover:bg-white/[0.04] hover:text-fg'
            )}
          >
            {active ? (
              <motion.span
                layoutId="community-nav"
                className="absolute inset-0 rounded-xl border border-brand-400/30 bg-brand-500/10"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <Icon className={cx('relative h-4 w-4 shrink-0', active ? 'text-brand-300' : '')} />
            <span className="relative flex-1">{section.label}</span>
            {section.count ? (
              <span className="tabular relative rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{section.count}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

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
  const reduce = useReducedMotion();

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
  const sections = SECTIONS.filter((section) => !section.moderator || me.isModerator).map((section) =>
    section.value === 'messages' ? { ...section, count: unread || undefined } : section
  );
  const current = sections.find((section) => section.value === tab) || sections[0];

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

        <div className="mt-6 lg:hidden">
          <Tabs tabs={sections} value={tab} onChange={setTab} />
        </div>

        {chatError ? (
          <Alert className="mt-5 flex items-center justify-between gap-3">
            {chatError}
            <button type="button" onClick={() => setChatError('')} aria-label="Dismiss">
              <FiX className="h-4 w-4" />
            </button>
          </Alert>
        ) : null}

        <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
          <aside className="hidden lg:block">
            <SectionNav sections={sections} value={tab} onChange={setTab} />
          </aside>
          <div className="min-w-0">
            <p className="mb-5 max-w-3xl text-sm text-fg-muted">{current.help}</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab === 'feed' ? <Feed /> : null}
                {tab === 'questions' ? <Questions /> : null}
                {tab === 'resources' ? <Resources /> : null}
                {tab === 'live' ? <Live /> : null}
                {tab === 'members' ? <Members /> : null}
                {tab === 'messages' ? <Messages openWith={openChat} onUnreadChange={setUnread} /> : null}
                {tab === 'manage' && me.isModerator ? <Manage /> : null}
              </motion.div>
            </AnimatePresence>
          </div>
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

/** The community is free; visitors only need an account. */
function JoinFree() {
  const location = useLocation();
  return (
    <Container className="py-12 sm:py-16">
      <Reveal>
        <Card className="relative mx-auto max-w-2xl overflow-hidden p-8 sm:p-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
            <FiUsers className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold text-up">Free for every member</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Join the QuickX community</h1>
          <p className="mt-3 text-base text-fg-muted">
            Share your trades, ask questions, get answers from Maxwell and other traders, and join live sessions. Signals,
            Courses and Mentorship members also get their own rooms.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/register" state={{ from: location }} size="lg">
              Create a free account
            </Button>
            <Button to="/login" state={{ from: location }} variant="secondary" size="lg">
              Log in
            </Button>
          </div>
        </Card>
      </Reveal>
    </Container>
  );
}

export default function Community() {
  const { isSignedIn } = useAuth();
  return (
    <>
      <Helmet>
        <title>Community | QuickX</title>
      </Helmet>
      {isSignedIn ? <CommunityHome /> : <JoinFree />}
    </>
  );
}
