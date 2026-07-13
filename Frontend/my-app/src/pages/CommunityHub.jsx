import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  FiArrowLeft,
  FiAward,
  FiBook,
  FiCheck,
  FiHash,
  FiHeart,
  FiMessageCircle,
  FiMessageSquare,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiSend,
  FiTrash2,
  FiUpload,
  FiUsers,
  FiVideo,
  FiX,
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TABS = [
  { id: 'feed', label: 'Feed', icon: FiMessageSquare },
  { id: 'qa', label: 'Q&A', icon: FiHash },
  { id: 'rooms', label: 'Rooms', icon: FiUsers },
  { id: 'resources', label: 'Resources', icon: FiBook },
  { id: 'live', label: 'Live', icon: FiVideo },
  { id: 'messages', label: 'Messages', icon: FiMessageCircle },
  { id: 'members', label: 'Members', icon: FiAward },
];

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatWhen(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return '';
  }
}

export default function CommunityHub() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'feed';

  const [access, setAccess] = useState({ loading: true, subscribed: false, isTutor: false });
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [composer, setComposer] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [questions, setQuestions] = useState([]);
  const [qForm, setQForm] = useState({ title: '', body: '', topic: '' });
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [resources, setResources] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [members, setMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgDraft, setMsgDraft] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [liveForm, setLiveForm] = useState({ title: '', joinUrl: '', startsAt: '', description: '' });
  const [roomName, setRoomName] = useState('');
  const [resourceForm, setResourceForm] = useState({ title: '', fileUrl: '', kind: 'pdf' });
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerDraft, setAnswerDraft] = useState('');
  const [pollForm, setPollForm] = useState({ question: '', options: 'Yes\nNo' });
  const [guidelines, setGuidelines] = useState('');

  const me = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const setTab = (id) => {
    setSearchParams({ tab: id });
  };

  const checkAccess = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAccess({ loading: false, subscribed: false, isTutor: false });
      return;
    }
    try {
      const { data } = await axios.get(`${API_URL}/api/instructors/${tutorId}/subscription/me`, {
        headers: authHeaders(),
      });
      setAccess({
        loading: false,
        subscribed: Boolean(data.subscribed),
        isTutor: Boolean(data.isTutor),
        subscription: data.subscription,
      });
    } catch {
      setAccess({ loading: false, subscribed: false, isTutor: false });
    }
  }, [tutorId]);

  useEffect(() => {
    checkAccess();
    axios
      .get(`${API_URL}/api/instructors/${tutorId}/community/stats`)
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, [tutorId, checkAccess]);

  const loadFeed = useCallback(async () => {
    if (!access.subscribed && !access.isTutor) return;
    try {
      const params = activeRoom ? { roomId: activeRoom } : {};
      const { data } = await axios.get(`${API_URL}/api/community/${tutorId}/posts`, {
        headers: authHeaders(),
        params,
      });
      setPosts(data.posts || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  }, [tutorId, access.subscribed, access.isTutor, activeRoom]);

  useEffect(() => {
    if (access.loading) return;
    if (!access.subscribed && !access.isTutor) return;
    if (tab === 'feed' || tab === 'rooms') loadFeed();
  }, [access, tab, loadFeed]);

  useEffect(() => {
    if (access.loading || (!access.subscribed && !access.isTutor)) return;
    const load = async () => {
      try {
        if (tab === 'qa') {
          const { data } = await axios.get(`${API_URL}/api/community/${tutorId}/questions`, {
            headers: authHeaders(),
          });
          setQuestions(data.questions || []);
        }
        if (tab === 'rooms') {
          const { data } = await axios.get(`${API_URL}/api/community/${tutorId}/rooms`, {
            headers: authHeaders(),
          });
          setRooms(data.rooms || []);
        }
        if (tab === 'resources') {
          const { data } = await axios.get(`${API_URL}/api/community/${tutorId}/resources`, {
            headers: authHeaders(),
          });
          setResources(data.resources || []);
        }
        if (tab === 'live') {
          const { data } = await axios.get(`${API_URL}/api/community/${tutorId}/live-sessions`, {
            headers: authHeaders(),
          });
          setSessions(data.sessions || []);
        }
        if (tab === 'members') {
          const [lb, mem] = await Promise.all([
            axios.get(`${API_URL}/api/community/${tutorId}/leaderboard`, { headers: authHeaders() }),
            axios.get(`${API_URL}/api/community/${tutorId}/members`, { headers: authHeaders() }),
          ]);
          setLeaderboard(lb.data.leaderboard || []);
          setMembers(mem.data.members || []);
        }
        if (tab === 'messages') {
          const { data } = await axios.get(`${API_URL}/api/community/${tutorId}/conversations`, {
            headers: authHeaders(),
          });
          setConversations(data.conversations || []);
        }
        if (access.isTutor) {
          const { data } = await axios.get(`${API_URL}/api/community/${tutorId}/settings`, {
            headers: authHeaders(),
          });
          setGuidelines(data.communityGuidelines || '');
        }
      } catch (e) {
        setError(e.response?.data?.message || e.message);
      }
    };
    load();
  }, [tab, tutorId, access]);

  const createPost = async (asAnnouncement = false) => {
    if (!composer.trim()) return;
    setPosting(true);
    setError('');
    try {
      await axios.post(
        `${API_URL}/api/community/${tutorId}/posts`,
        {
          body: composer.trim(),
          type: asAnnouncement ? 'announcement' : 'post',
          roomId: activeRoom || undefined,
        },
        { headers: authHeaders() }
      );
      setComposer('');
      await loadFeed();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post) => {
    try {
      if (post.likedByMe) {
        await axios.delete(`${API_URL}/api/community/${tutorId}/posts/${post._id}/like`, {
          headers: authHeaders(),
        });
      } else {
        await axios.post(
          `${API_URL}/api/community/${tutorId}/posts/${post._id}/like`,
          {},
          { headers: authHeaders() }
        );
      }
      await loadFeed();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  const loadComments = async (postId) => {
    const { data } = await axios.get(
      `${API_URL}/api/community/${tutorId}/posts/${postId}/comments`,
      { headers: authHeaders() }
    );
    setExpandedComments((prev) => ({ ...prev, [postId]: data.comments || [] }));
  };

  const submitComment = async (postId) => {
    const body = (commentDrafts[postId] || '').trim();
    if (!body) return;
    await axios.post(
      `${API_URL}/api/community/${tutorId}/posts/${postId}/comments`,
      { body },
      { headers: authHeaders() }
    );
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    await loadComments(postId);
    await loadFeed();
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    await axios.delete(`${API_URL}/api/community/${tutorId}/posts/${postId}`, {
      headers: authHeaders(),
    });
    await loadFeed();
  };

  const pinPost = async (post) => {
    await axios.patch(
      `${API_URL}/api/community/${tutorId}/posts/${post._id}`,
      { pinned: !post.pinned },
      { headers: authHeaders() }
    );
    await loadFeed();
  };

  const runSearch = async (e) => {
    e?.preventDefault();
    if (!searchQ.trim()) return;
    const { data } = await axios.get(`${API_URL}/api/community/${tutorId}/search`, {
      headers: authHeaders(),
      params: { q: searchQ.trim() },
    });
    setSearchResults(data);
  };

  if (access.loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Loading community…
      </div>
    );
  }

  if (!access.subscribed && !access.isTutor) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Community locked</h1>
        <p className="mt-3 text-slate-600">
          Subscribe to {stats?.tutor?.fullName || 'this tutor'}, or enroll in one of their courses,
          to join discussions, Q&amp;A, live sessions, and shared resources.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to={`/instructors/${tutorId}`}
            className="rounded-xl bg-[#1B5EF5] px-5 py-2.5 text-sm font-semibold text-white"
          >
            View profile &amp; subscribe
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 text-slate-900 sm:pt-24">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to={`/instructors/${tutorId}`}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
            >
              <FiArrowLeft className="h-4 w-4" />
              Profile
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">
                {stats?.tutor?.fullName || 'Tutor'} Community
              </h1>
              <p className="text-xs text-slate-500">
                {stats?.memberCount ?? 0} members
                {access.isTutor ? ' · You are the tutor' : ''}
              </p>
            </div>
          </div>
          <form onSubmit={runSearch} className="flex w-full max-w-xs gap-2 sm:w-auto">
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search community…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-3 py-2 text-white"
              aria-label="Search"
            >
              <FiSearch className="h-4 w-4" />
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-[#1B5EF5] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
            <button type="button" className="ml-2 underline" onClick={() => setError('')}>
              dismiss
            </button>
          </div>
        ) : null}

        {searchResults ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Search results</h2>
              <button type="button" onClick={() => setSearchResults(null)}>
                <FiX />
              </button>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {(searchResults.posts || []).map((p) => (
                <div key={p._id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium">Post</p>
                  <p className="text-slate-600">{p.body}</p>
                </div>
              ))}
              {(searchResults.questions || []).map((q) => (
                <div key={q._id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium">Q: {q.title}</p>
                  <p className="text-slate-600">{q.body}</p>
                </div>
              ))}
              {(searchResults.resources || []).map((r) => (
                <div key={r._id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium">Resource: {r.title}</p>
                  <a href={r.fileUrl} className="text-blue-600 underline" target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === 'feed' || tab === 'rooms' ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              {tab === 'rooms' ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveRoom(null)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        !activeRoom ? 'bg-blue-600 text-white' : 'bg-slate-100'
                      }`}
                    >
                      All rooms feed
                    </button>
                    {rooms.map((r) => (
                      <button
                        key={r._id}
                        type="button"
                        onClick={() => setActiveRoom(r._id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          activeRoom === r._id ? 'bg-blue-600 text-white' : 'bg-slate-100'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                  {access.isTutor ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="New room name"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
                        onClick={async () => {
                          if (!roomName.trim()) return;
                          await axios.post(
                            `${API_URL}/api/community/${tutorId}/rooms`,
                            { name: roomName.trim(), kind: 'general' },
                            { headers: authHeaders() }
                          );
                          setRoomName('');
                          const { data } = await axios.get(
                            `${API_URL}/api/community/${tutorId}/rooms`,
                            { headers: authHeaders() }
                          );
                          setRooms(data.rooms || []);
                        }}
                      >
                        <FiPlus />
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  rows={3}
                  placeholder="Share an update, question, or win…"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={posting}
                    onClick={() => createPost(false)}
                    className="rounded-xl bg-[#1B5EF5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Post
                  </button>
                  {access.isTutor ? (
                    <>
                      <button
                        type="button"
                        disabled={posting}
                        onClick={() => createPost(true)}
                        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
                      >
                        Announce
                      </button>
                      <details className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                        <summary className="cursor-pointer font-semibold">Create poll</summary>
                        <input
                          className="mt-2 w-full rounded border px-2 py-1"
                          placeholder="Poll question"
                          value={pollForm.question}
                          onChange={(e) => setPollForm((p) => ({ ...p, question: e.target.value }))}
                        />
                        <textarea
                          className="mt-2 w-full rounded border px-2 py-1"
                          rows={3}
                          placeholder="One option per line"
                          value={pollForm.options}
                          onChange={(e) => setPollForm((p) => ({ ...p, options: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="mt-2 rounded bg-slate-900 px-3 py-1 text-white"
                          onClick={async () => {
                            const options = pollForm.options
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean);
                            await axios.post(
                              `${API_URL}/api/community/${tutorId}/polls`,
                              { question: pollForm.question, options },
                              { headers: authHeaders() }
                            );
                            setPollForm({ question: '', options: 'Yes\nNo' });
                            await loadFeed();
                          }}
                        >
                          Publish poll
                        </button>
                      </details>
                    </>
                  ) : null}
                </div>
              </div>

              {posts.map((post) => (
                <article
                  key={post._id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm ${
                    post.type === 'announcement'
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {post.authorId?.fullName || 'Member'}
                        {post.type === 'announcement' ? (
                          <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] uppercase">
                            Announcement
                          </span>
                        ) : null}
                        {post.pinned ? (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-slate-500">
                            <FiMapPin /> Pinned
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-400">{formatWhen(post.createdAt)}</p>
                    </div>
                    {access.isTutor || String(post.authorId?._id || post.authorId) === String(me._id || me.id) ? (
                      <div className="flex gap-1">
                        {access.isTutor ? (
                          <button type="button" onClick={() => pinPost(post)} className="p-1 text-slate-400">
                            <FiMapPin />
                          </button>
                        ) : null}
                        <button type="button" onClick={() => deletePost(post._id)} className="p-1 text-rose-400">
                          <FiTrash2 />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{post.body}</p>
                  {post.pollId ? (
                    <PollBlock
                      tutorId={tutorId}
                      pollId={post.pollId._id || post.pollId}
                      initial={typeof post.pollId === 'object' ? post.pollId : null}
                    />
                  ) : null}
                  <div className="mt-4 flex gap-4 text-sm text-slate-500">
                    <button
                      type="button"
                      onClick={() => toggleLike(post)}
                      className={`inline-flex items-center gap-1 ${post.likedByMe ? 'text-rose-600' : ''}`}
                    >
                      <FiHeart className={post.likedByMe ? 'fill-current' : ''} />
                      {post.likeCount || 0}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (expandedComments[post._id]) {
                          setExpandedComments((prev) => {
                            const next = { ...prev };
                            delete next[post._id];
                            return next;
                          });
                        } else {
                          loadComments(post._id);
                        }
                      }}
                      className="inline-flex items-center gap-1"
                    >
                      <FiMessageCircle />
                      {post.commentCount || 0}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-rose-600"
                      onClick={async () => {
                        const reason = window.prompt('Why are you reporting this post?');
                        if (!reason) return;
                        await axios.post(
                          `${API_URL}/api/community/${tutorId}/reports`,
                          { entityType: 'post', entityId: post._id, reason },
                          { headers: authHeaders() }
                        );
                        alert('Report submitted');
                      }}
                    >
                      Report
                    </button>
                  </div>
                  {expandedComments[post._id] ? (
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                      {expandedComments[post._id].map((c) => (
                        <div key={c._id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <p className="font-medium">{c.authorId?.fullName}</p>
                          <p className="text-slate-700">{c.body}</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={commentDrafts[post._id] || ''}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post._id]: e.target.value }))
                          }
                          placeholder="Write a comment…"
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => submitComment(post._id)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-white"
                        >
                          <FiSend className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
              {!posts.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No posts yet. Start the conversation.</p>
              ) : null}
            </div>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <h3 className="font-semibold">Community tips</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-600">
                  <li>Be respectful and on-topic</li>
                  <li>Search Q&amp;A before asking</li>
                  <li>Use rooms for course-specific chats</li>
                </ul>
              </div>
              {guidelines ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <h3 className="font-semibold">Guidelines</h3>
                  <p className="mt-2 whitespace-pre-wrap text-slate-600">{guidelines}</p>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}

        {tab === 'qa' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold">Ask a question</h2>
              <input
                className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Title"
                value={qForm.title}
                onChange={(e) => setQForm((f) => ({ ...f, title: e.target.value }))}
              />
              <input
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Topic (optional)"
                value={qForm.topic}
                onChange={(e) => setQForm((f) => ({ ...f, topic: e.target.value }))}
              />
              <textarea
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                rows={4}
                placeholder="Describe your question…"
                value={qForm.body}
                onChange={(e) => setQForm((f) => ({ ...f, body: e.target.value }))}
              />
              <button
                type="button"
                className="mt-3 rounded-xl bg-[#1B5EF5] px-4 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  await axios.post(
                    `${API_URL}/api/community/${tutorId}/questions`,
                    qForm,
                    { headers: authHeaders() }
                  );
                  setQForm({ title: '', body: '', topic: '' });
                  const { data } = await axios.get(
                    `${API_URL}/api/community/${tutorId}/questions`,
                    { headers: authHeaders() }
                  );
                  setQuestions(data.questions || []);
                }}
              >
                Submit question
              </button>
            </div>
            <div className="space-y-3">
              {questions.map((q) => (
                <button
                  key={q._id}
                  type="button"
                  onClick={async () => {
                    const { data } = await axios.get(
                      `${API_URL}/api/community/${tutorId}/questions/${q._id}`,
                      { headers: authHeaders() }
                    );
                    setSelectedQuestion(data.question);
                    setAnswers(data.answers || []);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{q.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        q.status === 'answered'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{q.body}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {q.answerCount || 0} answers · {q.topic || 'General'}
                  </p>
                </button>
              ))}
            </div>
            {selectedQuestion ? (
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{selectedQuestion.title}</h3>
                    <p className="mt-2 text-slate-700">{selectedQuestion.body}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedQuestion(null)}>
                    <FiX />
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {answers.map((a) => (
                    <div
                      key={a._id}
                      className={`rounded-xl border p-3 ${
                        a.isBest ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100'
                      }`}
                    >
                      <p className="text-sm font-semibold">
                        {a.authorId?.fullName}
                        {a.isBest ? (
                          <span className="ml-2 text-xs text-emerald-700">
                            <FiCheck className="inline" /> Best answer
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm">{a.body}</p>
                      {access.isTutor && !a.isBest ? (
                        <button
                          type="button"
                          className="mt-2 text-xs font-semibold text-blue-600"
                          onClick={async () => {
                            await axios.patch(
                              `${API_URL}/api/community/${tutorId}/questions/${selectedQuestion._id}`,
                              { bestAnswerId: a._id },
                              { headers: authHeaders() }
                            );
                            const { data } = await axios.get(
                              `${API_URL}/api/community/${tutorId}/questions/${selectedQuestion._id}`,
                              { headers: authHeaders() }
                            );
                            setSelectedQuestion(data.question);
                            setAnswers(data.answers || []);
                          }}
                        >
                          Mark as best
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <textarea
                    className="flex-1 rounded-xl border px-3 py-2 text-sm"
                    rows={2}
                    value={answerDraft}
                    onChange={(e) => setAnswerDraft(e.target.value)}
                    placeholder="Write an answer…"
                  />
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
                    onClick={async () => {
                      await axios.post(
                        `${API_URL}/api/community/${tutorId}/questions/${selectedQuestion._id}/answers`,
                        { body: answerDraft },
                        { headers: authHeaders() }
                      );
                      setAnswerDraft('');
                      const { data } = await axios.get(
                        `${API_URL}/api/community/${tutorId}/questions/${selectedQuestion._id}`,
                        { headers: authHeaders() }
                      );
                      setSelectedQuestion(data.question);
                      setAnswers(data.answers || []);
                    }}
                  >
                    Reply
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'resources' ? (
          <div className="space-y-4">
            {access.isTutor ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">Upload resource</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input
                    className="rounded-xl border px-3 py-2 text-sm"
                    placeholder="Title"
                    value={resourceForm.title}
                    onChange={(e) => setResourceForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <input
                    className="rounded-xl border px-3 py-2 text-sm"
                    placeholder="File URL (S3)"
                    value={resourceForm.fileUrl}
                    onChange={(e) => setResourceForm((f) => ({ ...f, fileUrl: e.target.value }))}
                  />
                  <select
                    className="rounded-xl border px-3 py-2 text-sm"
                    value={resourceForm.kind}
                    onChange={(e) => setResourceForm((f) => ({ ...f, kind: e.target.value }))}
                  >
                    <option value="pdf">PDF</option>
                    <option value="slides">Slides</option>
                    <option value="worksheet">Worksheet</option>
                    <option value="template">Template</option>
                    <option value="assignment">Assignment</option>
                    <option value="reading">Reading</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
                  onClick={async () => {
                    await axios.post(
                      `${API_URL}/api/community/${tutorId}/resources`,
                      resourceForm,
                      { headers: authHeaders() }
                    );
                    setResourceForm({ title: '', fileUrl: '', kind: 'pdf' });
                    const { data } = await axios.get(
                      `${API_URL}/api/community/${tutorId}/resources`,
                      { headers: authHeaders() }
                    );
                    setResources(data.resources || []);
                  }}
                >
                  <FiUpload /> Upload
                </button>
              </div>
            ) : null}
            <ul className="grid gap-3 sm:grid-cols-2">
              {resources.map((r) => (
                <li key={r._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-xs uppercase text-slate-400">{r.kind}</p>
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-blue-600"
                  >
                    Download / open
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === 'live' ? (
          <div className="space-y-4">
            {access.isTutor ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">Schedule live session</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    className="rounded-xl border px-3 py-2 text-sm"
                    placeholder="Title"
                    value={liveForm.title}
                    onChange={(e) => setLiveForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <input
                    className="rounded-xl border px-3 py-2 text-sm"
                    placeholder="Zoom / Meet / YouTube URL"
                    value={liveForm.joinUrl}
                    onChange={(e) => setLiveForm((f) => ({ ...f, joinUrl: e.target.value }))}
                  />
                  <input
                    type="datetime-local"
                    className="rounded-xl border px-3 py-2 text-sm"
                    value={liveForm.startsAt}
                    onChange={(e) => setLiveForm((f) => ({ ...f, startsAt: e.target.value }))}
                  />
                  <input
                    className="rounded-xl border px-3 py-2 text-sm"
                    placeholder="Description"
                    value={liveForm.description}
                    onChange={(e) => setLiveForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  className="mt-3 rounded-xl bg-[#1B5EF5] px-4 py-2 text-sm font-semibold text-white"
                  onClick={async () => {
                    await axios.post(
                      `${API_URL}/api/community/${tutorId}/live-sessions`,
                      liveForm,
                      { headers: authHeaders() }
                    );
                    setLiveForm({ title: '', joinUrl: '', startsAt: '', description: '' });
                    const { data } = await axios.get(
                      `${API_URL}/api/community/${tutorId}/live-sessions`,
                      { headers: authHeaders() }
                    );
                    setSessions(data.sessions || []);
                  }}
                >
                  Schedule &amp; notify
                </button>
              </div>
            ) : null}
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li
                  key={s._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-sm text-slate-500">{formatWhen(s.startsAt)}</p>
                    {s.description ? <p className="mt-1 text-sm text-slate-600">{s.description}</p> : null}
                  </div>
                  <a
                    href={s.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Join
                  </a>
                </li>
              ))}
              {!sessions.length ? (
                <p className="text-center text-sm text-slate-500">No upcoming live sessions.</p>
              ) : null}
            </ul>
          </div>
        ) : null}

        {tab === 'members' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold">Leaderboard</h2>
              <ol className="mt-3 space-y-2">
                {leaderboard.map((row, i) => (
                  <li key={row.userId} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="mr-2 font-bold text-slate-400">#{i + 1}</span>
                      {row.fullName}
                    </span>
                    <span className="font-semibold text-amber-600">{row.xp} XP</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold">Members</h2>
              <ul className="mt-3 space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <Link
                      to={`/instructors/${tutorId}/community?tab=members&profile=${m.id}`}
                      className="font-medium hover:underline"
                      onClick={async (e) => {
                        e.preventDefault();
                        const { data } = await axios.get(
                          `${API_URL}/api/community/${tutorId}/profile/${m.id}`,
                          { headers: authHeaders() }
                        );
                        alert(
                          `${data.user?.fullName}\nXP: ${data.xp}\nPosts: ${data.activity?.postCount}\nBadges: ${(data.badges || []).map((b) => b.badgeKey).join(', ') || 'none'}`
                        );
                      }}
                    >
                      {m.fullName}
                    </Link>
                    <span className="text-xs uppercase text-slate-400">{m.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {tab === 'messages' ? (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Conversations</h2>
                <button
                  type="button"
                  className="text-xs font-semibold text-blue-600"
                  onClick={async () => {
                    const target = access.isTutor
                      ? window.prompt('Student user ID to message')
                      : tutorId;
                    if (!target) return;
                    const { data } = await axios.post(
                      `${API_URL}/api/community/${tutorId}/conversations`,
                      { participantIds: [target] },
                      { headers: authHeaders() }
                    );
                    setConversations((prev) => {
                      const exists = prev.find((c) => c._id === data.conversation._id);
                      return exists ? prev : [data.conversation, ...prev];
                    });
                    setActiveConvo(data.conversation);
                  }}
                >
                  New
                </button>
              </div>
              <ul className="space-y-1">
                {conversations.map((c) => (
                  <li key={c._id}>
                    <button
                      type="button"
                      onClick={async () => {
                        setActiveConvo(c);
                        const { data } = await axios.get(
                          `${API_URL}/api/community/${tutorId}/conversations/${c._id}/messages`,
                          { headers: authHeaders() }
                        );
                        setMessages(data.messages || []);
                      }}
                      className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                        activeConvo?._id === c._id ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {c.title ||
                        (c.participantIds || [])
                          .filter((p) => String(p._id) !== String(me._id || me.id))
                          .map((p) => p.fullName)
                          .join(', ') ||
                        'Chat'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex min-h-[360px] flex-col rounded-2xl border border-slate-200 bg-white">
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      String(m.senderId?._id || m.senderId) === String(me._id || me.id)
                        ? 'ml-auto bg-blue-600 text-white'
                        : 'bg-slate-100'
                    }`}
                  >
                    <p className="text-[10px] opacity-70">{m.senderId?.fullName}</p>
                    <p>{m.body}</p>
                  </div>
                ))}
                {!activeConvo ? (
                  <p className="text-center text-sm text-slate-400">Select or start a conversation</p>
                ) : null}
              </div>
              {activeConvo ? (
                <div className="flex gap-2 border-t p-3">
                  <input
                    className="flex-1 rounded-xl border px-3 py-2 text-sm"
                    value={msgDraft}
                    onChange={(e) => setMsgDraft(e.target.value)}
                    placeholder="Type a message…"
                  />
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-3 py-2 text-white"
                    onClick={async () => {
                      const { data } = await axios.post(
                        `${API_URL}/api/community/${tutorId}/conversations/${activeConvo._id}/messages`,
                        { body: msgDraft },
                        { headers: authHeaders() }
                      );
                      setMessages((prev) => [...prev, data.message]);
                      setMsgDraft('');
                    }}
                  >
                    <FiSend />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function PollBlock({ tutorId, pollId, initial }) {
  const [poll, setPoll] = useState(initial);
  const [myVote, setMyVote] = useState(null);

  useEffect(() => {
    if (initial && initial.options) {
      setPoll(initial);
    }
    axios
      .get(`${API_URL}/api/community/${tutorId}/polls/${pollId}`, { headers: authHeaders() })
      .then(({ data }) => {
        setPoll(data.poll);
        setMyVote(data.myVote);
      })
      .catch(() => {});
  }, [tutorId, pollId, initial]);

  if (!poll?.options) return null;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold">{poll.question}</p>
      {poll.options.map((opt, idx) => (
        <button
          key={idx}
          type="button"
          disabled={myVote != null || poll.closed}
          onClick={async () => {
            const { data } = await axios.post(
              `${API_URL}/api/community/${tutorId}/polls/${pollId}/vote`,
              { optionIndex: idx },
              { headers: authHeaders() }
            );
            setPoll(data.poll);
            setMyVote(idx);
          }}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
            myVote === idx ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
          }`}
        >
          <span>{opt.text}</span>
          <span className="text-xs text-slate-500">{opt.voteCount || 0}</span>
        </button>
      ))}
    </div>
  );
}
