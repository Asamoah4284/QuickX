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
  FiImage,
  FiLink,
  FiMessageCircle,
  FiMessageSquare,
  FiMapPin,
  FiPaperclip,
  FiPlus,
  FiSearch,
  FiSend,
  FiStar,
  FiTrash2,
  FiUpload,
  FiUsers,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import { uploadFileToS3 } from '../utils/uploadToS3';
import { mentionHint, resolveMentions } from '../utils/communityMentions';
import { publicAssetUrl } from '../utils/publicAssetUrl';

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

const HUB_STYLES = `
  .hub-shell {
    background: #ffffff;
  }
  .hub-tabs {
    scrollbar-width: none;
  }
  .hub-tabs::-webkit-scrollbar {
    display: none;
  }
`;

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
  const [composerMedia, setComposerMedia] = useState([]);
  const [linkDraft, setLinkDraft] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyTo, setReplyTo] = useState({});
  const [mentionMembers, setMentionMembers] = useState([]);
  const [tutorCourses, setTutorCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [qForm, setQForm] = useState({ title: '', body: '', topic: '', courseId: '' });
  const [qAttachments, setQAttachments] = useState([]);
  const [uploadingQAttach, setUploadingQAttach] = useState(false);
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
    axios
      .get(`${API_URL}/api/users/public/${tutorId}/instructor`)
      .then(({ data }) => setTutorCourses(Array.isArray(data.courses) ? data.courses : []))
      .catch(() => setTutorCourses([]));
  }, [tutorId, checkAccess]);

  useEffect(() => {
    if (access.loading || (!access.subscribed && !access.isTutor)) return;
    axios
      .get(`${API_URL}/api/community/${tutorId}/members`, { headers: authHeaders() })
      .then(({ data }) => setMentionMembers(data.members || []))
      .catch(() => setMentionMembers([]));
  }, [tutorId, access.loading, access.subscribed, access.isTutor]);

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

  const addComposerFile = async (file, mediaType) => {
    const token = localStorage.getItem('authToken');
    if (!file || !token) return;
    if (
      (mediaType === 'video' || mediaType === 'document') &&
      !access.isTutor
    ) {
      setError('Only the tutor can post videos and files');
      return;
    }
    setUploadingMedia(true);
    setError('');
    try {
      const uploadType = mediaType === 'video' ? 'video' : mediaType === 'document' ? 'file' : 'image';
      const url = await uploadFileToS3({ file, token, type: uploadType });
      if (!url) throw new Error('Upload failed');
      setComposerMedia((prev) => [
        ...prev,
        { url, type: mediaType, name: file.name || 'attachment' },
      ]);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Upload failed');
    } finally {
      setUploadingMedia(false);
    }
  };

  const addComposerLink = () => {
    if (!access.isTutor) {
      setError('Only the tutor can post links');
      return;
    }
    const url = linkDraft.trim();
    if (!url) return;
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    let valid = false;
    try {
      const parsed = new URL(normalized);
      valid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      valid = false;
    }
    if (!valid) {
      setError('Enter a valid link (https://…)');
      return;
    }
    setComposerMedia((prev) => [
      ...prev,
      { url: normalized, type: 'link', name: normalized },
    ]);
    setLinkDraft('');
    setShowLinkInput(false);
  };

  const createPost = async (asAnnouncement = false) => {
    if (!composer.trim() && !composerMedia.length) return;
    setPosting(true);
    setError('');
    try {
      const mentions = resolveMentions(composer, mentionMembers);
      await axios.post(
        `${API_URL}/api/community/${tutorId}/posts`,
        {
          body: composer.trim(),
          media: composerMedia,
          mentions,
          type: asAnnouncement ? 'announcement' : 'post',
          roomId: activeRoom || undefined,
        },
        { headers: authHeaders() }
      );
      setComposer('');
      setComposerMedia([]);
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
    const mentions = resolveMentions(body, mentionMembers);
    const parentId = replyTo[postId] || undefined;
    await axios.post(
      `${API_URL}/api/community/${tutorId}/posts/${postId}/comments`,
      { body, mentions, parentId },
      { headers: authHeaders() }
    );
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    setReplyTo((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
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

  const featurePost = async (post) => {
    await axios.patch(
      `${API_URL}/api/community/${tutorId}/posts/${post._id}`,
      { featured: !post.featured },
      { headers: authHeaders() }
    );
    await loadFeed();
  };

  const muteMember = async (userId) => {
    if (!userId) return;
    await axios.post(
      `${API_URL}/api/community/${tutorId}/blocks`,
      { userId, muted: true, blocked: false, reason: 'Muted by tutor' },
      { headers: authHeaders() }
    );
    setError('');
    alert('Member muted — they can view but not post.');
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

  const tutorName = stats?.tutor?.fullName || 'Tutor';
  const memberCount = stats?.memberCount ?? 0;

  if (access.loading) {
    return (
      <div className="hub-shell flex min-h-screen items-center justify-center px-4 pt-20">
        <style>{HUB_STYLES}</style>
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-slate-200/80" />
          <p className="mt-4 text-sm font-medium text-slate-500">Opening community…</p>
        </div>
      </div>
    );
  }

  if (!access.subscribed && !access.isTutor) {
    return (
      <div className="hub-shell min-h-screen px-4 pb-16 pt-28 sm:pt-32">
        <style>{HUB_STYLES}</style>
        <div className="mx-auto max-w-md text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1B5EF5]">
            Members only
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-slate-950">
            Community locked
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Subscribe to {tutorName} to unlock discussions, Q&amp;A, live sessions, and shared
            resources.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to={`/instructors/${tutorId}`}
              className="rounded-2xl bg-[#0B1F44] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1B5EF5]"
            >
              View profile &amp; subscribe
            </Link>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hub-shell min-h-screen pt-20 text-slate-900 sm:pt-24">
      <style>{HUB_STYLES}</style>

      <header className="border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                to={`/instructors/${tutorId}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-800"
              >
                <FiArrowLeft className="h-3.5 w-3.5" />
                Back to profile
              </Link>
              <h1 className="mt-2 truncate text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl">
                {tutorName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{memberCount}</span>
                {memberCount === 1 ? ' member' : ' members'}
                {access.isTutor ? (
                  <span className="text-slate-400"> · Hosting as tutor</span>
                ) : (
                  <span className="text-slate-400"> · Private community</span>
                )}
              </p>
            </div>

            <form
              onSubmit={runSearch}
              className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-1.5 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:w-72"
            >
              <FiSearch className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search posts, Q&A, resources…"
                className="w-full border-0 bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#0B1F44] px-2.5 py-2 text-white transition hover:bg-[#1B5EF5]"
                aria-label="Search"
              >
                <FiSearch className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          <nav className="hub-tabs -mb-px flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'border-[#1B5EF5] text-[#1B5EF5]'
                      : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {error ? (
          <div className="mb-5 rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-800">
            {error}
            <button type="button" className="ml-2 font-medium underline" onClick={() => setError('')}>
              dismiss
            </button>
          </div>
        ) : null}

        {searchResults ? (
          <div className="mb-6 rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                Search results
              </h2>
              <button
                type="button"
                onClick={() => setSearchResults(null)}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-8">
            <div className="space-y-4">
              {tab === 'rooms' ? (
                <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Rooms
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveRoom(null)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        !activeRoom
                          ? 'bg-[#0B1F44] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All rooms
                    </button>
                    {rooms.map((r) => (
                      <button
                        key={r._id}
                        type="button"
                        onClick={() => setActiveRoom(r._id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          activeRoom === r._id
                            ? 'bg-[#0B1F44] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1B5EF5]"
                      />
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl bg-[#0B1F44] px-3 py-2 text-sm text-white transition hover:bg-[#1B5EF5]"
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

              <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  New post
                </p>
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  rows={3}
                  placeholder="Share an update, question, or win… Use @Name to mention someone"
                  className="mt-3 w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
                />
                {mentionMembers.length ? (
                  <p className="mt-1 text-[11px] text-slate-400">{mentionHint(mentionMembers)}</p>
                ) : null}

                {composerMedia.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {composerMedia.map((m, idx) => (
                      <li
                        key={`${m.url}-${idx}`}
                        className="flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
                      >
                        {m.type === 'image' ? (
                          <img
                            src={publicAssetUrl(m.url) || m.url}
                            alt=""
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="font-medium uppercase text-slate-500">{m.type}</span>
                        )}
                        <span className="truncate">{m.name || m.url}</span>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-rose-600"
                          onClick={() =>
                            setComposerMedia((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {access.isTutor && showLinkInput ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={linkDraft}
                      onChange={(e) => setLinkDraft(e.target.value)}
                      placeholder="https://…"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1B5EF5]"
                    />
                    <button
                      type="button"
                      onClick={addComposerLink}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
                    >
                      Add
                    </button>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    <FiImage className="h-3.5 w-3.5" />
                    Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingMedia}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) addComposerFile(f, 'image');
                      }}
                    />
                  </label>
                  {access.isTutor ? (
                    <>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                        <FiVideo className="h-3.5 w-3.5" />
                        Video
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          disabled={uploadingMedia}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) addComposerFile(f, 'video');
                          }}
                        />
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                        <FiPaperclip className="h-3.5 w-3.5" />
                        File
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                          className="hidden"
                          disabled={uploadingMedia}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) addComposerFile(f, 'document');
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowLinkInput((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <FiLink className="h-3.5 w-3.5" />
                        Link
                      </button>
                    </>
                  ) : null}
                  {uploadingMedia ? (
                    <span className="text-xs text-slate-400">Uploading…</span>
                  ) : null}

                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={posting || uploadingMedia || (!composer.trim() && !composerMedia.length)}
                      onClick={() => createPost(false)}
                      className="rounded-xl bg-[#1B5EF5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1548c4] disabled:opacity-50"
                    >
                      Post
                    </button>
                    {access.isTutor ? (
                      <>
                        <button
                          type="button"
                          disabled={posting || uploadingMedia}
                          onClick={() => createPost(true)}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-50"
                        >
                          Announce
                        </button>
                        <details className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                          <summary className="cursor-pointer font-semibold text-slate-700">
                            Create poll
                          </summary>
                          <input
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#1B5EF5]"
                            placeholder="Poll question"
                            value={pollForm.question}
                            onChange={(e) => setPollForm((p) => ({ ...p, question: e.target.value }))}
                          />
                          <textarea
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#1B5EF5]"
                            rows={3}
                            placeholder="One option per line"
                            value={pollForm.options}
                            onChange={(e) => setPollForm((p) => ({ ...p, options: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="mt-2 rounded-xl bg-[#0B1F44] px-3 py-1.5 text-white transition hover:bg-[#1B5EF5]"
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
              </div>

              {posts.map((post) => (
                <article
                  key={post._id}
                  className={`rounded-[1.35rem] border bg-white/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-5 ${
                    post.type === 'announcement'
                      ? 'border-amber-200/80 bg-amber-50/50'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {post.authorId?.fullName || 'Member'}
                        {post.type === 'announcement' ? (
                          <span className="ml-2 rounded-md bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                            Announcement
                          </span>
                        ) : null}
                        {post.pinned ? (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            <FiMapPin /> Pinned
                          </span>
                        ) : null}
                        {post.featured ? (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600">
                            <FiStar /> Featured
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatWhen(post.createdAt)}</p>
                    </div>
                    {access.isTutor || String(post.authorId?._id || post.authorId) === String(me._id || me.id) ? (
                      <div className="flex gap-1">
                        {access.isTutor ? (
                          <>
                            <button
                              type="button"
                              title={post.pinned ? 'Unpin' : 'Pin'}
                              onClick={() => pinPost(post)}
                              className={`p-1 ${post.pinned ? 'text-[#1B5EF5]' : 'text-slate-400'}`}
                            >
                              <FiMapPin />
                            </button>
                            <button
                              type="button"
                              title={post.featured ? 'Unfeature' : 'Feature'}
                              onClick={() => featurePost(post)}
                              className={`p-1 ${post.featured ? 'text-amber-500' : 'text-slate-400'}`}
                            >
                              <FiStar />
                            </button>
                            {String(post.authorId?._id || post.authorId) !== String(me._id || me.id) ? (
                              <button
                                type="button"
                                title="Mute author"
                                onClick={() => muteMember(post.authorId?._id || post.authorId)}
                                className="p-1 text-xs font-semibold text-slate-400 hover:text-slate-700"
                              >
                                Mute
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        <button type="button" onClick={() => deletePost(post._id)} className="p-1 text-rose-400">
                          <FiTrash2 />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {post.body ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{post.body}</p>
                  ) : null}
                  {Array.isArray(post.media) && post.media.length ? (
                    <div className="mt-3 space-y-2">
                      {post.media.map((m, idx) => {
                        const src = publicAssetUrl(m.url) || m.url;
                        if (m.type === 'image') {
                          return (
                            <a key={idx} href={src} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={src}
                                alt={m.name || 'Post image'}
                                className="max-h-80 w-full rounded-xl object-cover"
                              />
                            </a>
                          );
                        }
                        if (m.type === 'video') {
                          return (
                            <video
                              key={idx}
                              src={src}
                              controls
                              playsInline
                              preload="metadata"
                              className="max-h-80 w-full rounded-xl bg-black"
                            />
                          );
                        }
                        return (
                          <a
                            key={idx}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-[#1B5EF5] hover:bg-slate-100"
                          >
                            {m.type === 'link' ? <FiLink /> : <FiPaperclip />}
                            {m.name || src}
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
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
                      {(() => {
                        const list = expandedComments[post._id] || [];
                        const roots = list.filter((c) => !c.parentId);
                        const childrenOf = (id) =>
                          list.filter((c) => String(c.parentId) === String(id));
                        const renderComment = (c, depth = 0) => (
                          <div
                            key={c._id}
                            className={`rounded-lg bg-slate-50 px-3 py-2 text-sm ${
                              depth ? 'ml-5 border-l-2 border-slate-200' : ''
                            }`}
                          >
                            <p className="font-medium text-slate-900">
                              {c.authorId?.fullName || 'Member'}
                            </p>
                            <p className="mt-0.5 text-slate-700">{c.body}</p>
                            <button
                              type="button"
                              className="mt-1 text-[11px] font-semibold text-[#1B5EF5]"
                              onClick={() => {
                                setReplyTo((prev) => ({ ...prev, [post._id]: c._id }));
                                const first = String(c.authorId?.fullName || '').split(/\s+/)[0];
                                setCommentDrafts((prev) => ({
                                  ...prev,
                                  [post._id]: first ? `@${first} ` : '',
                                }));
                              }}
                            >
                              Reply
                            </button>
                            {childrenOf(c._id).map((child) => renderComment(child, depth + 1))}
                          </div>
                        );
                        return roots.length
                          ? roots.map((c) => renderComment(c))
                          : list.map((c) => renderComment(c));
                      })()}
                      {replyTo[post._id] ? (
                        <p className="text-[11px] text-slate-500">
                          Replying to a comment…{' '}
                          <button
                            type="button"
                            className="font-semibold text-[#1B5EF5]"
                            onClick={() =>
                              setReplyTo((prev) => {
                                const next = { ...prev };
                                delete next[post._id];
                                return next;
                              })
                            }
                          >
                            Cancel
                          </button>
                        </p>
                      ) : null}
                      <div className="flex gap-2">
                        <input
                          value={commentDrafts[post._id] || ''}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post._id]: e.target.value }))
                          }
                          placeholder="Write a comment… @Name to mention"
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
                <div className="rounded-[1.35rem] border border-dashed border-slate-300/80 bg-white/50 px-6 py-14 text-center">
                  <p className="text-lg font-semibold tracking-[-0.01em] text-slate-900">
                    No posts yet
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                    Be the first to share an update, ask a question, or celebrate a win with the
                    community.
                  </p>
                </div>
              ) : null}
            </div>
            <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  How this space works
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1B5EF5]" />
                    Keep posts respectful and on-topic.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1B5EF5]" />
                    Search Q&amp;A before asking something new.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1B5EF5]" />
                    Use rooms for course-specific chats.
                  </li>
                </ul>
              </div>
              {guidelines ? (
                <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Guidelines
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {guidelines}
                  </p>
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
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Topic (optional)"
                  value={qForm.topic}
                  onChange={(e) => setQForm((f) => ({ ...f, topic: e.target.value }))}
                />
                <select
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={qForm.courseId}
                  onChange={(e) => setQForm((f) => ({ ...f, courseId: e.target.value }))}
                >
                  <option value="">All courses</option>
                  {tutorCourses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                rows={4}
                placeholder="Describe your question…"
                value={qForm.body}
                onChange={(e) => setQForm((f) => ({ ...f, body: e.target.value }))}
              />
              {qAttachments.length ? (
                <ul className="mt-2 space-y-1">
                  {qAttachments.map((a, idx) => (
                    <li
                      key={`${a.url}-${idx}`}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-xs"
                    >
                      <span className="truncate">{a.name || a.url}</span>
                      <button
                        type="button"
                        onClick={() => setQAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500"
                      >
                        <FiX />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  <FiPaperclip />
                  Attach file
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadingQAttach}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      const token = localStorage.getItem('authToken');
                      if (!file || !token) return;
                      setUploadingQAttach(true);
                      try {
                        const isImage = (file.type || '').startsWith('image/');
                        const url = await uploadFileToS3({
                          file,
                          token,
                          type: isImage ? 'image' : 'file',
                        });
                        setQAttachments((prev) => [
                          ...prev,
                          {
                            url,
                            type: isImage ? 'image' : 'file',
                            name: file.name,
                          },
                        ]);
                      } catch (err) {
                        setError(err.message || 'Attachment upload failed');
                      } finally {
                        setUploadingQAttach(false);
                      }
                    }}
                  />
                </label>
                {uploadingQAttach ? (
                  <span className="text-xs text-slate-400">Uploading…</span>
                ) : null}
                <button
                  type="button"
                  className="ml-auto rounded-xl bg-[#1B5EF5] px-4 py-2 text-sm font-semibold text-white"
                  onClick={async () => {
                    await axios.post(
                      `${API_URL}/api/community/${tutorId}/questions`,
                      {
                        title: qForm.title,
                        body: qForm.body,
                        topic: qForm.topic,
                        courseId: qForm.courseId || undefined,
                        attachments: qAttachments,
                      },
                      { headers: authHeaders() }
                    );
                    setQForm({ title: '', body: '', topic: '', courseId: '' });
                    setQAttachments([]);
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
                    {q.courseId?.title ? ` · ${q.courseId.title}` : ''}
                    {q.attachments?.length ? ` · ${q.attachments.length} file(s)` : ''}
                  </p>
                </button>
              ))}
            </div>
            {selectedQuestion ? (
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{selectedQuestion.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedQuestion.topic || 'General'}
                      {selectedQuestion.courseId?.title
                        ? ` · ${selectedQuestion.courseId.title}`
                        : ''}
                    </p>
                    <p className="mt-2 text-slate-700">{selectedQuestion.body}</p>
                    {selectedQuestion.attachments?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedQuestion.attachments.map((a, idx) => (
                          <a
                            key={idx}
                            href={publicAssetUrl(a.url) || a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-[#1B5EF5]"
                          >
                            <FiPaperclip /> {a.name || 'Attachment'}
                          </a>
                        ))}
                      </div>
                    ) : null}
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
