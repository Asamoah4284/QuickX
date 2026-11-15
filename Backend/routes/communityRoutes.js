/**
 * The members community: feed, rooms, Q&A, resources, polls, live sessions,
 * direct messages and moderation.
 *
 * There is one community, owned by the mentor. URLs are /api/community/:tutorId/…
 * where :tutorId must be the owner's id, or the alias "main".
 * Everything requires sign-in plus the Community feature (owner and admins pass).
 */
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const {
  requireTutorSubscriber,
  requireCommunityModerator,
  requireCommunityAccess,
} = require('../middleware/requireTutorSubscriber');
const CommunityPost = require('../models/CommunityPost');
const CommunityComment = require('../models/CommunityComment');
const CommunityLike = require('../models/CommunityLike');
const CommunityQuestion = require('../models/CommunityQuestion');
const CommunityAnswer = require('../models/CommunityAnswer');
const DiscussionRoom = require('../models/DiscussionRoom');
const CommunityResource = require('../models/CommunityResource');
const CommunityPoll = require('../models/CommunityPoll');
const CommunityPollVote = require('../models/CommunityPollVote');
const LiveSession = require('../models/LiveSession');
const CommunityBlock = require('../models/CommunityBlock');
const CommunityReport = require('../models/CommunityReport');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const GamificationEvent = require('../models/GamificationEvent');
const { UserBadge, BadgeDefinition } = require('../models/Badge');
const TutorProfile = require('../models/TutorProfile');
const User = require('../models/User');
const Entitlement = require('../models/Entitlement');
const { createNotification, notifyMany } = require('../services/notificationService');
const { awardXp, getUserXp, getLeaderboard } = require('../services/gamificationService');
const { listUserIdsWithFeature, hasFeature } = require('../services/entitlementService');
const { getOwnerId } = require('../services/ownerService');
const { FEATURES } = require('../constants/features');

const AUTHOR = 'fullName profilePicture role';
const LIMITS = { post: 5000, comment: 2000, title: 200, question: 5000, answer: 5000, message: 4000, reason: 500 };
const MEDIA_TYPES = ['image', 'video', 'document', 'link'];
const MEMBER_MEDIA_TYPES = ['image'];
const RESOURCE_KINDS = ['pdf', 'slides', 'worksheet', 'template', 'assignment', 'reading', 'other'];
const ROOM_KINDS = ['course', 'lesson', 'project', 'general', 'accountability'];
const REPORTABLE = {
  post: CommunityPost,
  comment: CommunityComment,
  question: CommunityQuestion,
  answer: CommunityAnswer,
  message: Message,
  resource: CommunityResource,
};

// ── Small helpers ────────────────────────────────────────────────────────────

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
const clip = (v, max) => String(v ?? '').trim().slice(0, max);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isMod = (req) => Boolean(req.isCommunityTutor || req.isCommunityAdmin);

/** Only http(s) links are stored — never javascript:, data: and friends. */
function safeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 2000) return '';
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? raw : '';
  } catch {
    return '';
  }
}

function cleanMedia(list, allowedTypes) {
  if (!Array.isArray(list)) return { media: [], rejected: false };
  const media = [];
  let rejected = false;
  for (const item of list.slice(0, 10)) {
    const type = MEDIA_TYPES.includes(item?.type) ? item.type : 'image';
    const url = safeUrl(item?.url);
    if (!url) continue;
    if (!allowedTypes.includes(type)) {
      rejected = true;
      continue;
    }
    media.push({ url, type, name: clip(item?.name, 200) });
  }
  return { media, rejected };
}

function cleanIds(list, max = 10) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(String).filter(isId))].slice(0, max);
}

function fail(res, err, label) {
  if (err?.status) return res.status(err.status).json({ message: err.message });
  if (err?.name === 'ValidationError' || err?.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid request' });
  }
  console.error(`community ${label}:`, err);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Notifications must never slow down or fail the request that triggered them. */
function later(label, fn) {
  Promise.resolve()
    .then(fn)
    .catch((err) => console.error(`community notify (${label}):`, err.message));
}

async function communityMemberIds() {
  return listUserIdsWithFeature(FEATURES.COMMUNITY);
}

/** True for the owner and anyone who currently holds the Community feature. */
async function isCommunityMember(userId, tutorId) {
  if (String(userId) === String(tutorId)) return true;
  return hasFeature(userId, FEATURES.COMMUNITY);
}

// ── Scope every request to the one community ────────────────────────────────

router.use(async (req, res, next) => {
  try {
    const ownerId = await getOwnerId();
    if (!ownerId) return res.status(503).json({ message: 'The community is not set up yet.' });
    const match = req.url.match(/^\/([^/?]+)/);
    if (!match) return res.status(404).json({ message: 'Not found' });
    if (match[1] === 'main') {
      req.url = `/${ownerId}${req.url.slice(match[0].length)}`;
    } else if (match[1] !== String(ownerId)) {
      return res.status(404).json({ message: 'Community not found' });
    }
    next();
  } catch (err) {
    fail(res, err, 'scope');
  }
});

router.use('/:tutorId', auth, requireTutorSubscriber, requireCommunityAccess);

/** Blocked members are shut out; muted members can read but not post. */
router.use('/:tutorId', async (req, res, next) => {
  try {
    req.communityMuted = false;
    if (isMod(req)) return next();
    const row = await CommunityBlock.findOne({ tutorId: req.params.tutorId, userId: req.user._id }).lean();
    if (row?.blocked) return res.status(403).json({ message: 'You are blocked from this community', code: 'BLOCKED' });
    req.communityMuted = Boolean(row?.muted);
    next();
  } catch (err) {
    fail(res, err, 'block check');
  }
});

function requireCanContribute(req, res, next) {
  if (req.communityMuted) {
    return res.status(403).json({ message: 'You are muted in this community and cannot post right now', code: 'MUTED' });
  }
  next();
}

// ── About (who am I here, guidelines, counts) ───────────────────────────────

router.get('/:tutorId/about', async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const [owner, profile, memberCount] = await Promise.all([
      User.findById(tutorId).select('fullName profilePicture creatorHeadline').lean(),
      TutorProfile.findOne({ userId: tutorId }).select('allowPeerMessaging communityGuidelines').lean(),
      Entitlement.countDocuments({ feature: FEATURES.COMMUNITY, endsAt: { $gt: new Date() } }),
    ]);
    res.json({
      owner: owner
        ? { id: String(owner._id), fullName: owner.fullName, profilePicture: owner.profilePicture || '', headline: owner.creatorHeadline || '' }
        : null,
      memberCount,
      guidelines: profile?.communityGuidelines || '',
      allowPeerMessaging: Boolean(profile?.allowPeerMessaging),
      me: {
        id: String(req.user._id),
        isModerator: isMod(req),
        isOwner: Boolean(req.isCommunityTutor),
        muted: req.communityMuted,
      },
    });
  } catch (err) {
    fail(res, err, 'about');
  }
});

// ── Feed ─────────────────────────────────────────────────────────────────────

async function decoratePosts(posts, userId) {
  const postIds = posts.map((p) => p._id);
  const pollIds = posts.map((p) => p.pollId?._id).filter(Boolean);
  const [liked, votes] = await Promise.all([
    CommunityLike.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
    pollIds.length ? CommunityPollVote.find({ userId, pollId: { $in: pollIds } }).select('pollId optionIndex').lean() : [],
  ]);
  const likedSet = new Set(liked.map((l) => String(l.postId)));
  const voteByPoll = new Map(votes.map((v) => [String(v.pollId), v.optionIndex]));
  return posts.map((p) => {
    const obj = p.toObject();
    return {
      ...obj,
      likedByMe: likedSet.has(String(p._id)),
      poll: obj.pollId ? { ...obj.pollId, myVote: voteByPoll.get(String(obj.pollId._id)) ?? null } : null,
      pollId: obj.pollId ? obj.pollId._id : null,
    };
  });
}

/**
 * ?roomId=…   posts in a room (omit for the main feed)
 * ?type=announcement
 * ?before=ISO date   older posts (use `nextCursor` from the previous page)
 */
router.get('/:tutorId/posts', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const filter = { tutorId: req.params.tutorId, deletedAt: null };
    if (req.query.roomId) {
      if (!isId(req.query.roomId)) return res.status(400).json({ message: 'Invalid room' });
      filter.roomId = req.query.roomId;
    } else {
      filter.roomId = null;
    }
    if (['post', 'announcement'].includes(req.query.type)) filter.type = req.query.type;

    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const firstPage = !before || Number.isNaN(before.getTime());
    let sort = { pinned: -1, createdAt: -1 };
    if (!firstPage) {
      // Pinned posts are shown at the top of page one only.
      filter.createdAt = { $lt: before };
      filter.pinned = { $ne: true };
      sort = { createdAt: -1 };
    }

    const posts = await CommunityPost.find(filter)
      .populate('authorId', AUTHOR)
      .populate('pollId')
      .sort(sort)
      .limit(limit);

    const unpinned = posts.filter((p) => !p.pinned);
    const oldest = unpinned.length ? unpinned[unpinned.length - 1].createdAt : null;
    res.json({
      posts: await decoratePosts(posts, req.user._id),
      nextCursor: posts.length === limit && oldest ? oldest.toISOString() : null,
    });
  } catch (err) {
    fail(res, err, 'list posts');
  }
});

router.post('/:tutorId/posts', requireCanContribute, async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const mod = isMod(req);
    const isAnnouncement = req.body.type === 'announcement';
    if (isAnnouncement && !mod) {
      return res.status(403).json({ message: 'Only the mentor can post announcements' });
    }

    const body = clip(req.body.body, LIMITS.post);
    const { media, rejected } = cleanMedia(req.body.media, mod ? MEDIA_TYPES : MEMBER_MEDIA_TYPES);
    if (rejected) {
      return res.status(403).json({ message: 'Only the mentor can post videos, files and links' });
    }
    if (!body && !media.length) {
      return res.status(400).json({ message: 'Write something or add an image' });
    }

    let roomId = null;
    if (req.body.roomId) {
      if (!isId(req.body.roomId)) return res.status(400).json({ message: 'Invalid room' });
      const room = await DiscussionRoom.exists({ _id: req.body.roomId, tutorId, archived: false });
      if (!room) return res.status(404).json({ message: 'Room not found' });
      roomId = req.body.roomId;
    }

    const mentions = cleanIds(req.body.mentions).filter((id) => id !== String(req.user._id));
    const post = await CommunityPost.create({
      tutorId,
      authorId: req.user._id,
      type: isAnnouncement ? 'announcement' : 'post',
      body,
      media,
      mentions,
      roomId,
    });

    later('post', async () => {
      await awardXp({ userId: req.user._id, tutorId, type: 'post_created' });
      const snippet = body.slice(0, 120) || 'New post in the community';
      if (mod && !roomId) {
        await notifyMany(await communityMemberIds(), {
          type: isAnnouncement ? 'announcement' : 'new_post',
          actorId: req.user._id,
          tutorId,
          entityType: 'post',
          entityId: post._id,
          title: isAnnouncement ? 'New announcement' : 'New community post',
          body: snippet,
        });
      }
      await notifyMany(mentions, {
        type: 'mention',
        actorId: req.user._id,
        tutorId,
        entityType: 'post',
        entityId: post._id,
        title: `${req.user.fullName || 'Someone'} mentioned you`,
        body: snippet,
      });
    });

    const populated = await CommunityPost.findById(post._id).populate('authorId', AUTHOR);
    res.status(201).json({ post: { ...populated.toObject(), likedByMe: false, poll: null } });
  } catch (err) {
    fail(res, err, 'create post');
  }
});

async function findPost(req) {
  if (!isId(req.params.postId)) throw httpError(404, 'Post not found');
  const post = await CommunityPost.findOne({ _id: req.params.postId, tutorId: req.params.tutorId, deletedAt: null });
  if (!post) throw httpError(404, 'Post not found');
  return post;
}

router.patch('/:tutorId/posts/:postId', async (req, res) => {
  try {
    const post = await findPost(req);
    const isAuthor = String(post.authorId) === String(req.user._id);
    const mod = isMod(req);
    if (!isAuthor && !mod) return res.status(403).json({ message: 'Access denied' });

    if (req.body.body !== undefined && isAuthor) {
      if (req.communityMuted) return res.status(403).json({ message: 'You are muted in this community' });
      const body = clip(req.body.body, LIMITS.post);
      if (!body && !post.media.length) return res.status(400).json({ message: 'A post cannot be empty' });
      post.body = body;
    }
    if (mod) {
      if (req.body.pinned !== undefined) post.pinned = Boolean(req.body.pinned);
      if (req.body.featured !== undefined) post.featured = Boolean(req.body.featured);
      if (['announcement', 'post'].includes(req.body.type)) post.type = req.body.type;
    }
    await post.save();
    res.json({ post });
  } catch (err) {
    fail(res, err, 'edit post');
  }
});

router.delete('/:tutorId/posts/:postId', async (req, res) => {
  try {
    const post = await findPost(req);
    const isAuthor = String(post.authorId) === String(req.user._id);
    if (!isAuthor && !isMod(req)) return res.status(403).json({ message: 'Access denied' });
    post.deletedAt = new Date();
    await post.save();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    fail(res, err, 'delete post');
  }
});

// ── Likes ────────────────────────────────────────────────────────────────────

router.post('/:tutorId/posts/:postId/like', async (req, res) => {
  try {
    const post = await findPost(req);
    let created = true;
    try {
      await CommunityLike.create({ userId: req.user._id, postId: post._id });
    } catch (e) {
      if (e.code !== 11000) throw e;
      created = false;
    }
    const updated = created
      ? await CommunityPost.findByIdAndUpdate(post._id, { $inc: { likeCount: 1 } }, { new: true }).select('likeCount')
      : post;

    if (created && String(post.authorId) !== String(req.user._id)) {
      later('like', async () => {
        // Liking, unliking and liking again must not farm XP or spam the author.
        const meta = { postId: String(post._id), by: String(req.user._id) };
        const seen = await GamificationEvent.exists({ type: 'like_received', 'meta.postId': meta.postId, 'meta.by': meta.by });
        if (seen) return;
        await awardXp({ userId: post.authorId, tutorId: req.params.tutorId, type: 'like_received', meta });
        await createNotification({
          userId: post.authorId,
          type: 'post_like',
          actorId: req.user._id,
          tutorId: req.params.tutorId,
          entityType: 'post',
          entityId: post._id,
          title: 'New like',
          body: `${req.user.fullName || 'Someone'} liked your post`,
        });
      });
    }
    res.json({ liked: true, likeCount: Math.max(0, updated.likeCount || 0) });
  } catch (err) {
    fail(res, err, 'like');
  }
});

router.delete('/:tutorId/posts/:postId/like', async (req, res) => {
  try {
    const post = await findPost(req);
    const removed = await CommunityLike.findOneAndDelete({ userId: req.user._id, postId: post._id });
    const updated = removed
      ? await CommunityPost.findOneAndUpdate(
          { _id: post._id, likeCount: { $gt: 0 } },
          { $inc: { likeCount: -1 } },
          { new: true }
        ).select('likeCount')
      : post;
    res.json({ liked: false, likeCount: Math.max(0, (updated || post).likeCount || 0) });
  } catch (err) {
    fail(res, err, 'unlike');
  }
});

// ── Comments ─────────────────────────────────────────────────────────────────

router.get('/:tutorId/posts/:postId/comments', async (req, res) => {
  try {
    const post = await findPost(req);
    const comments = await CommunityComment.find({ postId: post._id, deletedAt: null })
      .populate('authorId', AUTHOR)
      .sort({ createdAt: 1 })
      .limit(500);
    res.json({ comments });
  } catch (err) {
    fail(res, err, 'list comments');
  }
});

router.post('/:tutorId/posts/:postId/comments', requireCanContribute, async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const post = await findPost(req);
    const body = clip(req.body.body, LIMITS.comment);
    if (!body) return res.status(400).json({ message: 'Write a comment first' });

    let parent = null;
    if (req.body.parentId) {
      if (!isId(req.body.parentId)) return res.status(400).json({ message: 'Invalid reply target' });
      parent = await CommunityComment.findOne({ _id: req.body.parentId, postId: post._id, deletedAt: null });
      if (!parent) return res.status(404).json({ message: 'The comment you are replying to was removed' });
    }

    const mentions = cleanIds(req.body.mentions).filter((id) => id !== String(req.user._id));
    const comment = await CommunityComment.create({
      postId: post._id,
      authorId: req.user._id,
      // Replies are kept one level deep so threads stay readable.
      parentId: parent ? parent.parentId || parent._id : null,
      body,
      mentions,
    });
    await CommunityPost.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });

    later('comment', async () => {
      await awardXp({ userId: req.user._id, tutorId, type: 'comment_created' });
      const base = { actorId: req.user._id, tutorId, entityType: 'comment', entityId: comment._id, body: body.slice(0, 120) };
      const notified = new Set();
      const send = async (userId, type, title) => {
        const key = String(userId);
        if (notified.has(key) || key === String(req.user._id)) return;
        notified.add(key);
        await createNotification({ ...base, userId, type, title });
      };
      for (const id of mentions) await send(id, 'mention', `${req.user.fullName || 'Someone'} mentioned you`);
      if (parent) await send(parent.authorId, 'comment_reply', 'New reply to your comment');
      await send(post.authorId, 'comment_reply', 'New comment on your post');
    });

    const populated = await CommunityComment.findById(comment._id).populate('authorId', AUTHOR);
    res.status(201).json({ comment: populated });
  } catch (err) {
    fail(res, err, 'create comment');
  }
});

router.delete('/:tutorId/comments/:commentId', async (req, res) => {
  try {
    if (!isId(req.params.commentId)) return res.status(404).json({ message: 'Comment not found' });
    const comment = await CommunityComment.findOne({ _id: req.params.commentId, deletedAt: null });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const post = await CommunityPost.findOne({ _id: comment.postId, tutorId: req.params.tutorId }).select('_id');
    if (!post) return res.status(404).json({ message: 'Comment not found' });

    const isAuthor = String(comment.authorId) === String(req.user._id);
    if (!isAuthor && !isMod(req)) return res.status(403).json({ message: 'Access denied' });

    // Remove the comment and its replies; only count ones that were still visible.
    const now = new Date();
    const result = await CommunityComment.updateMany(
      { deletedAt: null, $or: [{ _id: comment._id }, { parentId: comment._id }] },
      { $set: { deletedAt: now } }
    );
    if (result.modifiedCount) {
      await CommunityPost.updateOne({ _id: post._id }, [
        { $set: { commentCount: { $max: [0, { $subtract: ['$commentCount', result.modifiedCount] }] } } },
      ]);
    }
    res.json({ message: 'Comment deleted', removed: result.modifiedCount });
  } catch (err) {
    fail(res, err, 'delete comment');
  }
});

// ── Members ──────────────────────────────────────────────────────────────────

router.get('/:tutorId/members', async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const q = clip(req.query.q, 60);
    const ids = (await communityMemberIds()).map(String).filter((id) => id !== String(tutorId));
    const filter = { _id: { $in: ids } };
    if (q) filter.fullName = new RegExp(escapeRegex(q), 'i');

    const [owner, users] = await Promise.all([
      User.findById(tutorId).select(AUTHOR).lean(),
      User.find(filter).select(AUTHOR).sort({ fullName: 1 }).limit(100).lean(),
    ]);
    const members = [];
    if (owner && (!q || new RegExp(escapeRegex(q), 'i').test(owner.fullName || ''))) {
      members.push({ id: String(owner._id), fullName: owner.fullName, profilePicture: owner.profilePicture || '', role: 'tutor' });
    }
    for (const u of users) {
      members.push({ id: String(u._id), fullName: u.fullName, profilePicture: u.profilePicture || '', role: 'student' });
    }
    res.json({ members, total: ids.length + (owner ? 1 : 0) });
  } catch (err) {
    fail(res, err, 'members');
  }
});

// ── Q&A ──────────────────────────────────────────────────────────────────────

async function findQuestion(req) {
  if (!isId(req.params.questionId)) throw httpError(404, 'Question not found');
  const question = await CommunityQuestion.findOne({
    _id: req.params.questionId,
    tutorId: req.params.tutorId,
    deletedAt: null,
  });
  if (!question) throw httpError(404, 'Question not found');
  return question;
}

router.get('/:tutorId/questions', async (req, res) => {
  try {
    const filter = { tutorId: req.params.tutorId, deletedAt: null };
    if (['open', 'answered'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.mine === '1') filter.authorId = req.user._id;
    const q = clip(req.query.q, 80);
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { body: rx }, { topic: rx }];
    }
    const questions = await CommunityQuestion.find(filter)
      .populate('authorId', AUTHOR)
      .sort({ pinned: -1, createdAt: -1 })
      .limit(60);
    res.json({ questions });
  } catch (err) {
    fail(res, err, 'list questions');
  }
});

router.post('/:tutorId/questions', requireCanContribute, async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const title = clip(req.body.title, LIMITS.title);
    const body = clip(req.body.body, LIMITS.question);
    if (!title || !body) return res.status(400).json({ message: 'Add a title and describe your question' });

    const { media } = cleanMedia(req.body.attachments, MEMBER_MEDIA_TYPES);
    const question = await CommunityQuestion.create({
      tutorId,
      authorId: req.user._id,
      title,
      body,
      topic: clip(req.body.topic, 60),
      attachments: media,
    });

    later('question', () =>
      createNotification({
        userId: tutorId,
        type: 'question_asked',
        actorId: req.user._id,
        tutorId,
        entityType: 'question',
        entityId: question._id,
        title: 'New question',
        body: title,
      })
    );

    const populated = await CommunityQuestion.findById(question._id).populate('authorId', AUTHOR);
    res.status(201).json({ question: populated });
  } catch (err) {
    fail(res, err, 'create question');
  }
});

router.get('/:tutorId/questions/:questionId', async (req, res) => {
  try {
    const question = await findQuestion(req);
    await question.populate('authorId', AUTHOR);
    const answers = await CommunityAnswer.find({ questionId: question._id, deletedAt: null })
      .populate('authorId', AUTHOR)
      .sort({ isBest: -1, createdAt: 1 });
    res.json({ question, answers });
  } catch (err) {
    fail(res, err, 'get question');
  }
});

router.post('/:tutorId/questions/:questionId/answers', requireCanContribute, async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const question = await findQuestion(req);
    const body = clip(req.body.body, LIMITS.answer);
    if (!body) return res.status(400).json({ message: 'Write an answer first' });

    const answer = await CommunityAnswer.create({ questionId: question._id, authorId: req.user._id, body });
    // A reply from another member keeps the question open; the mentor answering settles it.
    await CommunityQuestion.updateOne(
      { _id: question._id },
      { $inc: { answerCount: 1 }, ...(isMod(req) ? { $set: { status: 'answered' } } : {}) }
    );

    later('answer', async () => {
      await awardXp({ userId: req.user._id, tutorId, type: 'answer_created' });
      await createNotification({
        userId: question.authorId,
        type: 'question_answered',
        actorId: req.user._id,
        tutorId,
        entityType: 'question',
        entityId: question._id,
        title: isMod(req) ? 'The mentor answered your question' : 'New reply to your question',
        body: body.slice(0, 120),
      });
    });

    const populated = await CommunityAnswer.findById(answer._id).populate('authorId', AUTHOR);
    res.status(201).json({ answer: populated });
  } catch (err) {
    fail(res, err, 'create answer');
  }
});

/** The person who asked can pick the best answer; the mentor can also pin and reopen. */
router.patch('/:tutorId/questions/:questionId', async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const question = await findQuestion(req);
    const mod = isMod(req);
    const isAuthor = String(question.authorId) === String(req.user._id);
    if (!mod && !isAuthor) return res.status(403).json({ message: 'Access denied' });

    if (mod && req.body.pinned !== undefined) question.pinned = Boolean(req.body.pinned);
    if (['open', 'answered'].includes(req.body.status)) question.status = req.body.status;

    if (req.body.bestAnswerId) {
      if (!isId(req.body.bestAnswerId)) return res.status(400).json({ message: 'Invalid answer' });
      const best = await CommunityAnswer.findOne({ _id: req.body.bestAnswerId, questionId: question._id, deletedAt: null });
      if (!best) return res.status(404).json({ message: 'Answer not found' });
      const changed = String(question.bestAnswerId || '') !== String(best._id);
      await CommunityAnswer.updateMany({ questionId: question._id }, { $set: { isBest: false } });
      await CommunityAnswer.updateOne({ _id: best._id }, { $set: { isBest: true } });
      question.bestAnswerId = best._id;
      question.status = 'answered';
      if (changed && String(best.authorId) !== String(req.user._id)) {
        later('best answer', () => awardXp({ userId: best.authorId, tutorId, type: 'best_answer', meta: { questionId: String(question._id) } }));
      }
    }
    await question.save();
    res.json({ question });
  } catch (err) {
    fail(res, err, 'update question');
  }
});

router.delete('/:tutorId/questions/:questionId', async (req, res) => {
  try {
    const question = await findQuestion(req);
    const isAuthor = String(question.authorId) === String(req.user._id);
    if (!isAuthor && !isMod(req)) return res.status(403).json({ message: 'Access denied' });
    question.deletedAt = new Date();
    await question.save();
    res.json({ message: 'Question deleted' });
  } catch (err) {
    fail(res, err, 'delete question');
  }
});

router.delete('/:tutorId/questions/:questionId/answers/:answerId', async (req, res) => {
  try {
    const question = await findQuestion(req);
    if (!isId(req.params.answerId)) return res.status(404).json({ message: 'Answer not found' });
    const answer = await CommunityAnswer.findOne({ _id: req.params.answerId, questionId: question._id, deletedAt: null });
    if (!answer) return res.status(404).json({ message: 'Answer not found' });
    const isAuthor = String(answer.authorId) === String(req.user._id);
    if (!isAuthor && !isMod(req)) return res.status(403).json({ message: 'Access denied' });

    answer.deletedAt = new Date();
    answer.isBest = false;
    await answer.save();
    const update = [{ $set: { answerCount: { $max: [0, { $subtract: ['$answerCount', 1] }] } } }];
    if (String(question.bestAnswerId || '') === String(answer._id)) update.push({ $set: { bestAnswerId: null } });
    await CommunityQuestion.updateOne({ _id: question._id }, update);
    res.json({ message: 'Answer deleted' });
  } catch (err) {
    fail(res, err, 'delete answer');
  }
});

// ── Rooms ────────────────────────────────────────────────────────────────────

router.get('/:tutorId/rooms', async (req, res) => {
  try {
    const filter = { tutorId: req.params.tutorId };
    if (!(isMod(req) && req.query.archived === '1')) filter.archived = false;
    const rooms = await DiscussionRoom.find(filter).sort({ createdAt: 1 }).lean();
    const counts = await CommunityPost.aggregate([
      { $match: { roomId: { $in: rooms.map((r) => r._id) }, deletedAt: null } },
      { $group: { _id: '$roomId', count: { $sum: 1 }, lastPostAt: { $max: '$createdAt' } } },
    ]);
    const byRoom = new Map(counts.map((c) => [String(c._id), c]));
    res.json({
      rooms: rooms.map((r) => ({
        ...r,
        postCount: byRoom.get(String(r._id))?.count || 0,
        lastPostAt: byRoom.get(String(r._id))?.lastPostAt || null,
      })),
    });
  } catch (err) {
    fail(res, err, 'list rooms');
  }
});

router.post('/:tutorId/rooms', requireCommunityModerator, async (req, res) => {
  try {
    const name = clip(req.body.name, 60);
    if (!name) return res.status(400).json({ message: 'Give the room a name' });
    const room = await DiscussionRoom.create({
      tutorId: req.params.tutorId,
      name,
      description: clip(req.body.description, 300),
      kind: ROOM_KINDS.includes(req.body.kind) ? req.body.kind : 'general',
    });
    res.status(201).json({ room });
  } catch (err) {
    fail(res, err, 'create room');
  }
});

router.patch('/:tutorId/rooms/:roomId', requireCommunityModerator, async (req, res) => {
  try {
    if (!isId(req.params.roomId)) return res.status(404).json({ message: 'Room not found' });
    const room = await DiscussionRoom.findOne({ _id: req.params.roomId, tutorId: req.params.tutorId });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (req.body.name !== undefined) {
      const name = clip(req.body.name, 60);
      if (!name) return res.status(400).json({ message: 'Give the room a name' });
      room.name = name;
    }
    if (req.body.description !== undefined) room.description = clip(req.body.description, 300);
    if (req.body.archived !== undefined) room.archived = Boolean(req.body.archived);
    await room.save();
    res.json({ room });
  } catch (err) {
    fail(res, err, 'update room');
  }
});

// ── Resources ────────────────────────────────────────────────────────────────

router.get('/:tutorId/resources', async (req, res) => {
  try {
    const filter = { tutorId: req.params.tutorId, deletedAt: null, assignmentOf: null };
    if (RESOURCE_KINDS.includes(req.query.kind)) filter.kind = req.query.kind;
    const resources = await CommunityResource.find(filter).populate('uploadedBy', AUTHOR).sort({ createdAt: -1 }).limit(200).lean();

    // Tell each member which assignments they have already handed in.
    const assignmentIds = resources.filter((r) => r.kind === 'assignment').map((r) => r._id);
    const mine = assignmentIds.length
      ? await CommunityResource.find({ assignmentOf: { $in: assignmentIds }, uploadedBy: req.user._id, deletedAt: null })
          .select('assignmentOf fileUrl createdAt')
          .lean()
      : [];
    const mineBy = new Map(mine.map((s) => [String(s.assignmentOf), s]));
    res.json({
      resources: resources.map((r) => ({
        ...r,
        mySubmission: mineBy.has(String(r._id))
          ? { id: String(mineBy.get(String(r._id))._id), fileUrl: mineBy.get(String(r._id)).fileUrl, submittedAt: mineBy.get(String(r._id)).createdAt }
          : null,
      })),
    });
  } catch (err) {
    fail(res, err, 'list resources');
  }
});

router.post('/:tutorId/resources', requireCanContribute, async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const title = clip(req.body.title, LIMITS.title);
    const fileUrl = safeUrl(req.body.fileUrl);
    if (!title || !fileUrl) return res.status(400).json({ message: 'Add a title and a file or link' });

    let assignment = null;
    if (req.body.assignmentOf) {
      if (!isId(req.body.assignmentOf)) return res.status(400).json({ message: 'Invalid assignment' });
      assignment = await CommunityResource.findOne({
        _id: req.body.assignmentOf,
        tutorId,
        kind: 'assignment',
        assignmentOf: null,
        deletedAt: null,
      });
      if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    } else if (!isMod(req)) {
      return res.status(403).json({ message: 'Only the mentor can share resources' });
    }

    if (assignment) {
      // One submission per member per assignment: handing in again replaces it.
      await CommunityResource.updateMany(
        { assignmentOf: assignment._id, uploadedBy: req.user._id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );
    }

    const resource = await CommunityResource.create({
      tutorId,
      uploadedBy: req.user._id,
      title,
      description: clip(req.body.description, 1000),
      fileUrl,
      fileType: clip(req.body.fileType, 20) || 'file',
      kind: assignment ? 'assignment' : RESOURCE_KINDS.includes(req.body.kind) ? req.body.kind : 'other',
      assignmentOf: assignment ? assignment._id : null,
    });

    later('resource', async () => {
      if (assignment) {
        await createNotification({
          userId: tutorId,
          type: 'resource_upload',
          actorId: req.user._id,
          tutorId,
          entityType: 'resource',
          entityId: assignment._id,
          title: 'Assignment handed in',
          body: `${req.user.fullName || 'A member'} · ${assignment.title}`,
        });
        return;
      }
      await notifyMany(await communityMemberIds(), {
        type: 'resource_upload',
        actorId: req.user._id,
        tutorId,
        entityType: 'resource',
        entityId: resource._id,
        title: resource.kind === 'assignment' ? 'New assignment' : 'New resource',
        body: resource.title,
      });
    });

    res.status(201).json({ resource });
  } catch (err) {
    fail(res, err, 'create resource');
  }
});

/** Mentor: who handed in an assignment. */
router.get('/:tutorId/resources/:resourceId/submissions', requireCommunityModerator, async (req, res) => {
  try {
    if (!isId(req.params.resourceId)) return res.status(404).json({ message: 'Not found' });
    const submissions = await CommunityResource.find({
      tutorId: req.params.tutorId,
      assignmentOf: req.params.resourceId,
      deletedAt: null,
    })
      .populate('uploadedBy', AUTHOR)
      .sort({ createdAt: -1 });
    res.json({ submissions });
  } catch (err) {
    fail(res, err, 'submissions');
  }
});

router.delete('/:tutorId/resources/:resourceId', async (req, res) => {
  try {
    if (!isId(req.params.resourceId)) return res.status(404).json({ message: 'Not found' });
    const resource = await CommunityResource.findOne({ _id: req.params.resourceId, tutorId: req.params.tutorId, deletedAt: null });
    if (!resource) return res.status(404).json({ message: 'Not found' });
    const isUploader = String(resource.uploadedBy) === String(req.user._id);
    if (!isUploader && !isMod(req)) return res.status(403).json({ message: 'Access denied' });
    resource.deletedAt = new Date();
    await resource.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    fail(res, err, 'delete resource');
  }
});

// ── Polls ────────────────────────────────────────────────────────────────────

router.post('/:tutorId/polls', requireCommunityModerator, async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const question = clip(req.body.question, 300);
    const seen = new Set();
    const options = (Array.isArray(req.body.options) ? req.body.options : [])
      .map((o) => clip(typeof o === 'string' ? o : o?.text, 120))
      .filter((text) => text && !seen.has(text.toLowerCase()) && seen.add(text.toLowerCase()))
      .slice(0, 8)
      .map((text) => ({ text, voteCount: 0 }));
    if (!question || options.length < 2) {
      return res.status(400).json({ message: 'Add a question and at least two different options' });
    }

    const poll = await CommunityPoll.create({ tutorId, createdBy: req.user._id, question, options });
    const post = await CommunityPost.create({ tutorId, authorId: req.user._id, type: 'post', body: question, pollId: poll._id });
    poll.postId = post._id;
    await poll.save();

    later('poll', async () =>
      notifyMany(await communityMemberIds(), {
        type: 'poll_created',
        actorId: req.user._id,
        tutorId,
        entityType: 'poll',
        entityId: poll._id,
        title: 'New poll',
        body: question,
      })
    );

    const populated = await CommunityPost.findById(post._id).populate('authorId', AUTHOR);
    res.status(201).json({
      post: { ...populated.toObject(), likedByMe: false, poll: { ...poll.toObject(), myVote: null } },
    });
  } catch (err) {
    fail(res, err, 'create poll');
  }
});

router.post('/:tutorId/polls/:pollId/vote', async (req, res) => {
  try {
    if (!isId(req.params.pollId)) return res.status(404).json({ message: 'Poll not found' });
    const poll = await CommunityPoll.findOne({ _id: req.params.pollId, tutorId: req.params.tutorId });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.closed) return res.status(400).json({ message: 'This poll is closed' });

    const optionIndex = Number(req.body.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: 'Pick one of the options' });
    }

    try {
      await CommunityPollVote.create({ pollId: poll._id, userId: req.user._id, optionIndex });
    } catch (e) {
      if (e.code === 11000) return res.status(400).json({ message: 'You have already voted' });
      throw e;
    }
    const updated = await CommunityPoll.findByIdAndUpdate(
      poll._id,
      { $inc: { [`options.${optionIndex}.voteCount`]: 1 } },
      { new: true }
    );
    later('vote', () => awardXp({ userId: req.user._id, tutorId: req.params.tutorId, type: 'poll_vote' }));
    res.json({ poll: { ...updated.toObject(), myVote: optionIndex } });
  } catch (err) {
    fail(res, err, 'vote');
  }
});

router.patch('/:tutorId/polls/:pollId', requireCommunityModerator, async (req, res) => {
  try {
    if (!isId(req.params.pollId)) return res.status(404).json({ message: 'Poll not found' });
    const poll = await CommunityPoll.findOneAndUpdate(
      { _id: req.params.pollId, tutorId: req.params.tutorId },
      { $set: { closed: Boolean(req.body.closed) } },
      { new: true }
    );
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    res.json({ poll });
  } catch (err) {
    fail(res, err, 'close poll');
  }
});

// ── Live sessions ────────────────────────────────────────────────────────────

/** Upcoming by default (including ones that started in the last 3 hours); ?past=1 for earlier ones. */
router.get('/:tutorId/live-sessions', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const past = req.query.past === '1';
    const sessions = await LiveSession.find({
      tutorId: req.params.tutorId,
      cancelled: false,
      startsAt: past ? { $lt: cutoff } : { $gte: cutoff },
    })
      .sort({ startsAt: past ? -1 : 1 })
      .limit(50);
    res.json({ sessions });
  } catch (err) {
    fail(res, err, 'list live sessions');
  }
});

function readSessionDates(body, existing) {
  const startsAt = body.startsAt ? new Date(body.startsAt) : existing?.startsAt;
  if (!startsAt || Number.isNaN(startsAt.getTime())) throw httpError(400, 'Choose a start date and time');
  let endsAt = body.endsAt === undefined ? existing?.endsAt || null : body.endsAt ? new Date(body.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) throw httpError(400, 'Invalid end time');
  if (endsAt && endsAt <= startsAt) throw httpError(400, 'The end time must be after the start time');
  return { startsAt, endsAt };
}

router.post('/:tutorId/live-sessions', requireCommunityModerator, async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const title = clip(req.body.title, LIMITS.title);
    const joinUrl = safeUrl(req.body.joinUrl);
    if (!title) return res.status(400).json({ message: 'Give the session a title' });
    if (!joinUrl) return res.status(400).json({ message: 'Add a valid join link (https://…)' });
    const { startsAt, endsAt } = readSessionDates(req.body);
    if (startsAt.getTime() < Date.now() - 60 * 1000) {
      return res.status(400).json({ message: 'The start time is in the past' });
    }

    const session = await LiveSession.create({
      tutorId,
      title,
      description: clip(req.body.description, 1000),
      startsAt,
      endsAt,
      joinUrl,
    });

    if (req.body.notify !== false) {
      later('live session', async () =>
        notifyMany(await communityMemberIds(), {
          type: 'live_reminder',
          actorId: req.user._id,
          tutorId,
          entityType: 'live_session',
          entityId: session._id,
          title: 'Live session scheduled',
          body: `${session.title} — ${startsAt.toUTCString()}`,
        })
      );
    }
    res.status(201).json({ session });
  } catch (err) {
    fail(res, err, 'create live session');
  }
});

router.patch('/:tutorId/live-sessions/:sessionId', requireCommunityModerator, async (req, res) => {
  try {
    if (!isId(req.params.sessionId)) return res.status(404).json({ message: 'Not found' });
    const session = await LiveSession.findOne({ _id: req.params.sessionId, tutorId: req.params.tutorId });
    if (!session) return res.status(404).json({ message: 'Not found' });

    if (req.body.title !== undefined) {
      const title = clip(req.body.title, LIMITS.title);
      if (!title) return res.status(400).json({ message: 'Give the session a title' });
      session.title = title;
    }
    if (req.body.description !== undefined) session.description = clip(req.body.description, 1000);
    if (req.body.joinUrl !== undefined) {
      const joinUrl = safeUrl(req.body.joinUrl);
      if (!joinUrl) return res.status(400).json({ message: 'Add a valid join link (https://…)' });
      session.joinUrl = joinUrl;
    }
    if (req.body.startsAt !== undefined || req.body.endsAt !== undefined) {
      Object.assign(session, readSessionDates(req.body, session));
    }
    const wasCancelled = session.cancelled;
    if (req.body.cancelled !== undefined) session.cancelled = Boolean(req.body.cancelled);
    await session.save();

    if (session.cancelled && !wasCancelled) {
      later('live cancel', async () =>
        notifyMany(await communityMemberIds(), {
          type: 'live_reminder',
          actorId: req.user._id,
          tutorId: req.params.tutorId,
          entityType: 'live_session',
          entityId: session._id,
          title: 'Live session cancelled',
          body: session.title,
        })
      );
    }
    res.json({ session });
  } catch (err) {
    fail(res, err, 'update live session');
  }
});

// ── Leaderboard and member profiles ──────────────────────────────────────────

router.get('/:tutorId/leaderboard', async (req, res) => {
  try {
    res.json({ leaderboard: await getLeaderboard(req.params.tutorId, 25) });
  } catch (err) {
    fail(res, err, 'leaderboard');
  }
});

router.get('/:tutorId/profile/:userId', async (req, res) => {
  try {
    const { tutorId, userId } = req.params;
    if (!isId(userId)) return res.status(404).json({ message: 'Member not found' });
    // Only people in this community have a profile here.
    if (!(await isCommunityMember(userId, tutorId))) return res.status(404).json({ message: 'Member not found' });
    const user = await User.findById(userId).select('fullName profilePicture creatorHeadline role createdAt').lean();
    if (!user) return res.status(404).json({ message: 'Member not found' });

    const [xp, badges, postCount, answerCount] = await Promise.all([
      getUserXp(userId, tutorId),
      UserBadge.find({ userId, tutorId }).lean(),
      CommunityPost.countDocuments({ tutorId, authorId: userId, deletedAt: null }),
      CommunityAnswer.countDocuments({ authorId: userId, deletedAt: null }),
    ]);
    const defs = await BadgeDefinition.find({ key: { $in: badges.map((b) => b.badgeKey) } }).lean();
    res.json({
      user: { id: String(user._id), fullName: user.fullName, profilePicture: user.profilePicture || '', headline: user.creatorHeadline || '', isOwner: String(user._id) === String(tutorId), joinedAt: user.createdAt },
      xp,
      badges: badges.map((b) => ({ key: b.badgeKey, earnedAt: b.earnedAt, ...(defs.find((d) => d.key === b.badgeKey) || {}) })),
      activity: { postCount, answerCount },
    });
  } catch (err) {
    fail(res, err, 'profile');
  }
});

// ── Reports and blocks (moderation) ─────────────────────────────────────────

router.post('/:tutorId/reports', async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const { entityType, entityId } = req.body;
    const reason = clip(req.body.reason, LIMITS.reason);
    const Model = REPORTABLE[entityType];
    if (!Model || !isId(entityId) || !reason) {
      return res.status(400).json({ message: 'Tell us what is wrong with this content' });
    }
    if (!(await Model.exists({ _id: entityId }))) return res.status(404).json({ message: 'That content no longer exists' });

    const existing = await CommunityReport.findOne({ tutorId, reporterId: req.user._id, entityType, entityId, status: 'open' });
    if (existing) return res.json({ report: existing, alreadyReported: true });

    const report = await CommunityReport.create({ tutorId, reporterId: req.user._id, entityType, entityId, reason });
    later('report', () =>
      createNotification({
        userId: tutorId,
        type: 'moderation',
        actorId: req.user._id,
        tutorId,
        entityType: 'report',
        entityId: report._id,
        title: 'Content reported',
        body: reason.slice(0, 120),
      })
    );
    res.status(201).json({ report });
  } catch (err) {
    fail(res, err, 'report');
  }
});

/** Reports with a preview of what was reported and who wrote it. */
router.get('/:tutorId/reports', requireCommunityModerator, async (req, res) => {
  try {
    const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
    const reports = await CommunityReport.find({ tutorId: req.params.tutorId, status })
      .populate('reporterId', AUTHOR)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const AUTHOR_FIELD = { post: 'authorId', comment: 'authorId', question: 'authorId', answer: 'authorId', message: 'senderId', resource: 'uploadedBy' };
    const out = [];
    for (const report of reports) {
      const field = AUTHOR_FIELD[report.entityType];
      const entity = await REPORTABLE[report.entityType].findById(report.entityId).populate(field, AUTHOR).lean();
      out.push({
        ...report,
        entity: entity
          ? {
              text: clip(entity.body || entity.title || entity.description || '', 400),
              author: entity[field] ? { id: String(entity[field]._id), fullName: entity[field].fullName } : null,
              deleted: Boolean(entity.deletedAt),
              postId: report.entityType === 'comment' ? entity.postId : null,
              questionId: report.entityType === 'answer' ? entity.questionId : null,
            }
          : null,
      });
    }
    res.json({ reports: out });
  } catch (err) {
    fail(res, err, 'list reports');
  }
});

router.patch('/:tutorId/reports/:reportId', requireCommunityModerator, async (req, res) => {
  try {
    if (!isId(req.params.reportId)) return res.status(404).json({ message: 'Not found' });
    if (!['open', 'resolved', 'dismissed'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
    const report = await CommunityReport.findOneAndUpdate(
      { _id: req.params.reportId, tutorId: req.params.tutorId },
      { $set: { status: req.body.status } },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Not found' });
    res.json({ report });
  } catch (err) {
    fail(res, err, 'update report');
  }
});

/** Mute (read-only) or block (no access) a member. */
router.post('/:tutorId/blocks', requireCommunityModerator, async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const { userId } = req.body;
    if (!isId(userId)) return res.status(400).json({ message: 'Choose a member' });
    if (String(userId) === String(tutorId)) return res.status(400).json({ message: 'The mentor cannot be blocked' });
    if (!(await User.exists({ _id: userId }))) return res.status(404).json({ message: 'Member not found' });

    const blocked = req.body.blocked !== undefined ? Boolean(req.body.blocked) : !req.body.muted;
    const muted = Boolean(req.body.muted);
    if (!blocked && !muted) {
      await CommunityBlock.deleteOne({ tutorId, userId });
      return res.json({ block: null });
    }
    const block = await CommunityBlock.findOneAndUpdate(
      { tutorId, userId },
      { $set: { reason: clip(req.body.reason, LIMITS.reason), muted, blocked } },
      { upsert: true, new: true }
    );
    res.json({ block });
  } catch (err) {
    fail(res, err, 'block');
  }
});

router.get('/:tutorId/blocks', requireCommunityModerator, async (req, res) => {
  try {
    const blocks = await CommunityBlock.find({ tutorId: req.params.tutorId }).populate('userId', AUTHOR).sort({ createdAt: -1 });
    res.json({ blocks });
  } catch (err) {
    fail(res, err, 'list blocks');
  }
});

router.delete('/:tutorId/blocks/:userId', requireCommunityModerator, async (req, res) => {
  try {
    if (!isId(req.params.userId)) return res.status(404).json({ message: 'Not found' });
    await CommunityBlock.deleteOne({ tutorId: req.params.tutorId, userId: req.params.userId });
    res.json({ message: 'Unblocked' });
  } catch (err) {
    fail(res, err, 'unblock');
  }
});

// ── Direct messages ──────────────────────────────────────────────────────────

router.get('/:tutorId/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({ tutorId: req.params.tutorId, participantIds: req.user._id })
      .populate('participantIds', AUTHOR)
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();
    const ids = conversations.map((c) => c._id);
    const [unread, last] = await Promise.all([
      Message.aggregate([
        { $match: { conversationId: { $in: ids }, senderId: { $ne: req.user._id }, readBy: { $ne: req.user._id } } },
        { $group: { _id: '$conversationId', count: { $sum: 1 } } },
      ]),
      Message.aggregate([
        { $match: { conversationId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$conversationId', body: { $first: '$body' }, senderId: { $first: '$senderId' }, at: { $first: '$createdAt' } } },
      ]),
    ]);
    const unreadBy = new Map(unread.map((u) => [String(u._id), u.count]));
    const lastBy = new Map(last.map((l) => [String(l._id), l]));
    res.json({
      conversations: conversations.map((c) => {
        const lastMessage = lastBy.get(String(c._id));
        return {
          ...c,
          unreadCount: unreadBy.get(String(c._id)) || 0,
          lastMessage: lastMessage ? { body: clip(lastMessage.body, 120), senderId: lastMessage.senderId, at: lastMessage.at } : null,
        };
      }),
      unreadTotal: unread.reduce((n, u) => n + u.count, 0),
    });
  } catch (err) {
    fail(res, err, 'list conversations');
  }
});

/** Start (or reopen) a 1-to-1 chat. Members can message the mentor; member-to-member only if the mentor allows it. */
router.post('/:tutorId/conversations', requireCanContribute, async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const me = String(req.user._id);
    const other = cleanIds([req.body.participantId, ...(Array.isArray(req.body.participantIds) ? req.body.participantIds : [])]).find((id) => id !== me);
    if (!other) return res.status(400).json({ message: 'Choose who to message' });

    if (!isMod(req) && other !== String(tutorId)) {
      const profile = await TutorProfile.findOne({ userId: tutorId }).select('allowPeerMessaging').lean();
      if (!profile?.allowPeerMessaging) {
        return res.status(403).json({ message: 'You can only message the mentor in this community.' });
      }
    }
    if (!(await isCommunityMember(other, tutorId))) {
      return res.status(404).json({ message: 'That person is not in the community' });
    }
    const blocked = await CommunityBlock.exists({ tutorId, userId: other, blocked: true });
    if (blocked) return res.status(403).json({ message: 'That member cannot receive messages' });

    const pair = [me, other];
    let conversation = await Conversation.findOne({ tutorId, isGroup: false, participantIds: { $all: pair, $size: 2 } });
    let created = false;
    if (!conversation) {
      conversation = await Conversation.create({ tutorId, participantIds: pair, isGroup: false });
      created = true;
    }
    await conversation.populate('participantIds', AUTHOR);
    res.status(created ? 201 : 200).json({ conversation });
  } catch (err) {
    fail(res, err, 'create conversation');
  }
});

async function findConversation(req) {
  if (!isId(req.params.conversationId)) throw httpError(404, 'Conversation not found');
  const conversation = await Conversation.findOne({
    _id: req.params.conversationId,
    tutorId: req.params.tutorId,
    participantIds: req.user._id,
  });
  if (!conversation) throw httpError(404, 'Conversation not found');
  return conversation;
}

/** Latest messages (oldest first). ?before=ISO date for earlier ones. Opening a chat marks it read. */
router.get('/:tutorId/conversations/:conversationId/messages', async (req, res) => {
  try {
    const conversation = await findConversation(req);
    const limit = 50;
    const filter = { conversationId: conversation._id };
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    if (before && !Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };

    const page = await Message.find(filter).populate('senderId', AUTHOR).sort({ createdAt: -1 }).limit(limit);
    await Message.updateMany(
      { conversationId: conversation._id, senderId: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({
      messages: page.reverse(),
      nextCursor: page.length === limit ? page[0].createdAt.toISOString() : null,
    });
  } catch (err) {
    fail(res, err, 'list messages');
  }
});

router.post('/:tutorId/conversations/:conversationId/messages', requireCanContribute, async (req, res) => {
  try {
    const conversation = await findConversation(req);
    const body = clip(req.body.body, LIMITS.message);
    if (!body) return res.status(400).json({ message: 'Write a message first' });

    const message = await Message.create({ conversationId: conversation._id, senderId: req.user._id, body, readBy: [req.user._id] });
    await Conversation.updateOne({ _id: conversation._id }, { $set: { lastMessageAt: message.createdAt } });

    const recipients = conversation.participantIds.filter((id) => String(id) !== String(req.user._id));
    later('message', () =>
      notifyMany(recipients, {
        type: 'direct_message',
        actorId: req.user._id,
        tutorId: req.params.tutorId,
        entityType: 'conversation',
        entityId: conversation._id,
        title: `Message from ${req.user.fullName || 'a member'}`,
        body: body.slice(0, 120),
      })
    );

    await message.populate('senderId', AUTHOR);
    res.status(201).json({ message });
  } catch (err) {
    fail(res, err, 'send message');
  }
});

// ── Search ───────────────────────────────────────────────────────────────────

router.get('/:tutorId/search', async (req, res) => {
  try {
    const q = clip(req.query.q, 80);
    if (q.length < 2) return res.json({ posts: [], questions: [], resources: [] });
    const tutorId = req.params.tutorId;
    const rx = new RegExp(escapeRegex(q), 'i');

    const [posts, questions, resources] = await Promise.all([
      CommunityPost.find({ tutorId, deletedAt: null, body: rx }).populate('authorId', AUTHOR).sort({ createdAt: -1 }).limit(20),
      CommunityQuestion.find({ tutorId, deletedAt: null, $or: [{ title: rx }, { body: rx }, { topic: rx }] })
        .populate('authorId', AUTHOR)
        .sort({ createdAt: -1 })
        .limit(20),
      CommunityResource.find({ tutorId, deletedAt: null, assignmentOf: null, $or: [{ title: rx }, { description: rx }] })
        .sort({ createdAt: -1 })
        .limit(20),
    ]);
    res.json({ posts, questions, resources });
  } catch (err) {
    fail(res, err, 'search');
  }
});

// ── Settings (mentor) ────────────────────────────────────────────────────────

router.patch('/:tutorId/settings', requireCommunityModerator, async (req, res) => {
  try {
    const updates = {};
    if (req.body.allowPeerMessaging !== undefined) updates.allowPeerMessaging = Boolean(req.body.allowPeerMessaging);
    if (req.body.communityGuidelines !== undefined) updates.communityGuidelines = clip(req.body.communityGuidelines, 5000);
    const profile = await TutorProfile.findOneAndUpdate(
      { userId: req.params.tutorId },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({
      allowPeerMessaging: Boolean(profile.allowPeerMessaging),
      guidelines: profile.communityGuidelines || '',
    });
  } catch (err) {
    fail(res, err, 'settings');
  }
});

module.exports = router;
module.exports.safeUrl = safeUrl;
module.exports.cleanMedia = cleanMedia;
