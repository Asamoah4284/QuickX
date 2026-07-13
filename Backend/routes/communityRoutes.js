const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const {
  requireTutorSubscriber,
  requireCommunityModerator,
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
const { UserBadge, BadgeDefinition } = require('../models/Badge');
const TutorProfile = require('../models/TutorProfile');
const User = require('../models/User');
const { createNotification, notifyMany } = require('../services/notificationService');
const { awardXp, getUserXp, getLeaderboard } = require('../services/gamificationService');
const { listSubscribersForTutor } = require('../services/tutorSubscriptionService');

const authorSelect = 'fullName profilePicture role';

async function assertNotBlocked(tutorId, userId) {
  const block = await CommunityBlock.findOne({ tutorId, userId, blocked: true });
  return !block;
}

async function getSubscriberIds(tutorId) {
  const rows = await listSubscribersForTutor(tutorId);
  return rows.map((r) => r.studentId?._id || r.studentId).filter(Boolean);
}

// All community routes under /:tutorId require auth + subscription
router.use('/:tutorId', auth, requireTutorSubscriber);

router.use('/:tutorId', async (req, res, next) => {
  const ok = await assertNotBlocked(req.params.tutorId, req.user._id);
  if (!ok && !req.isCommunityTutor && !req.isCommunityAdmin) {
    return res.status(403).json({ message: 'You are blocked from this community' });
  }
  next();
});

// ── Feed / posts ─────────────────────────────────────────────────────────────
router.get('/:tutorId/posts', async (req, res) => {
  try {
    const { roomId, type } = req.query;
    const filter = {
      tutorId: req.params.tutorId,
      deletedAt: null,
    };
    if (roomId) filter.roomId = roomId;
    else if (req.query.feed !== 'all') filter.roomId = null;
    if (type) filter.type = type;

    const posts = await CommunityPost.find(filter)
      .populate('authorId', authorSelect)
      .populate('pollId')
      .sort({ pinned: -1, featured: -1, createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 40, 100));

    const postIds = posts.map((p) => p._id);
    const liked = await CommunityLike.find({
      userId: req.user._id,
      postId: { $in: postIds },
    }).select('postId');
    const likedSet = new Set(liked.map((l) => String(l.postId)));

    res.json({
      posts: posts.map((p) => ({
        ...p.toObject(),
        likedByMe: likedSet.has(String(p._id)),
      })),
    });
  } catch (err) {
    console.error('list posts:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/posts', async (req, res) => {
  try {
    const { body, media, type, roomId, pollId } = req.body;
    const isAnnouncement = type === 'announcement';
    if (isAnnouncement && !req.isCommunityTutor && !req.isCommunityAdmin) {
      return res.status(403).json({ message: 'Only the tutor can post announcements' });
    }
    if (!String(body || '').trim() && !(media && media.length) && !pollId) {
      return res.status(400).json({ message: 'Post body or media is required' });
    }

    const post = await CommunityPost.create({
      tutorId: req.params.tutorId,
      authorId: req.user._id,
      type: isAnnouncement ? 'announcement' : 'post',
      body: String(body || '').trim(),
      media: Array.isArray(media) ? media : [],
      roomId: roomId || null,
      pollId: pollId || null,
    });

    await awardXp({
      userId: req.user._id,
      tutorId: req.params.tutorId,
      type: 'post_created',
    });

    if (isAnnouncement) {
      const ids = await getSubscriberIds(req.params.tutorId);
      await notifyMany(ids, {
        type: 'announcement',
        actorId: req.user._id,
        tutorId: req.params.tutorId,
        entityType: 'post',
        entityId: post._id,
        title: 'New announcement',
        body: String(body || '').slice(0, 120),
      });
    }

    const populated = await CommunityPost.findById(post._id).populate('authorId', authorSelect);
    res.status(201).json({ post: populated });
  } catch (err) {
    console.error('create post:', err);
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:tutorId/posts/:postId', async (req, res) => {
  try {
    const post = await CommunityPost.findOne({
      _id: req.params.postId,
      tutorId: req.params.tutorId,
      deletedAt: null,
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isAuthor = String(post.authorId) === String(req.user._id);
    const isMod = req.isCommunityTutor || req.isCommunityAdmin;
    if (!isAuthor && !isMod) return res.status(403).json({ message: 'Access denied' });

    if (req.body.body !== undefined && (isAuthor || isMod)) {
      post.body = String(req.body.body).trim();
    }
    if (isMod) {
      if (req.body.pinned !== undefined) post.pinned = Boolean(req.body.pinned);
      if (req.body.featured !== undefined) post.featured = Boolean(req.body.featured);
      if (req.body.type === 'announcement' || req.body.type === 'post') post.type = req.body.type;
    }
    await post.save();
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:tutorId/posts/:postId', async (req, res) => {
  try {
    const post = await CommunityPost.findOne({
      _id: req.params.postId,
      tutorId: req.params.tutorId,
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const isAuthor = String(post.authorId) === String(req.user._id);
    if (!isAuthor && !req.isCommunityTutor && !req.isCommunityAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    post.deletedAt = new Date();
    await post.save();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Likes ────────────────────────────────────────────────────────────────────
router.post('/:tutorId/posts/:postId/like', async (req, res) => {
  try {
    const post = await CommunityPost.findOne({
      _id: req.params.postId,
      tutorId: req.params.tutorId,
      deletedAt: null,
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    try {
      await CommunityLike.create({ userId: req.user._id, postId: post._id });
      post.likeCount = (post.likeCount || 0) + 1;
      await post.save();
      await awardXp({
        userId: post.authorId,
        tutorId: req.params.tutorId,
        type: 'like_received',
      });
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
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
    res.json({ liked: true, likeCount: post.likeCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:tutorId/posts/:postId/like', async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const removed = await CommunityLike.findOneAndDelete({
      userId: req.user._id,
      postId: post._id,
    });
    if (removed) {
      post.likeCount = Math.max(0, (post.likeCount || 0) - 1);
      await post.save();
    }
    res.json({ liked: false, likeCount: post.likeCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Comments ─────────────────────────────────────────────────────────────────
router.get('/:tutorId/posts/:postId/comments', async (req, res) => {
  try {
    const comments = await CommunityComment.find({
      postId: req.params.postId,
      deletedAt: null,
    })
      .populate('authorId', authorSelect)
      .sort({ createdAt: 1 });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/posts/:postId/comments', async (req, res) => {
  try {
    const post = await CommunityPost.findOne({
      _id: req.params.postId,
      tutorId: req.params.tutorId,
      deletedAt: null,
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ message: 'Comment body required' });

    const mentions = Array.isArray(req.body.mentions) ? req.body.mentions : [];
    const comment = await CommunityComment.create({
      postId: post._id,
      authorId: req.user._id,
      parentId: req.body.parentId || null,
      body,
      mentions,
    });

    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();

    await awardXp({
      userId: req.user._id,
      tutorId: req.params.tutorId,
      type: 'comment_created',
    });

    await createNotification({
      userId: post.authorId,
      type: 'comment_reply',
      actorId: req.user._id,
      tutorId: req.params.tutorId,
      entityType: 'comment',
      entityId: comment._id,
      title: 'New comment',
      body: body.slice(0, 120),
    });

    for (const mid of mentions) {
      await createNotification({
        userId: mid,
        type: 'mention',
        actorId: req.user._id,
        tutorId: req.params.tutorId,
        entityType: 'comment',
        entityId: comment._id,
        title: 'You were mentioned',
        body: body.slice(0, 120),
      });
    }

    const populated = await CommunityComment.findById(comment._id).populate(
      'authorId',
      authorSelect
    );
    res.status(201).json({ comment: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:tutorId/comments/:commentId', async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const isAuthor = String(comment.authorId) === String(req.user._id);
    if (!isAuthor && !req.isCommunityTutor && !req.isCommunityAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    comment.deletedAt = new Date();
    await comment.save();
    await CommunityPost.findByIdAndUpdate(comment.postId, {
      $inc: { commentCount: -1 },
    });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Mentionable members ──────────────────────────────────────────────────────
router.get('/:tutorId/members', async (req, res) => {
  try {
    const rows = await listSubscribersForTutor(req.params.tutorId);
    const tutor = await User.findById(req.params.tutorId).select(authorSelect);
    const members = [];
    if (tutor) {
      members.push({
        id: tutor._id,
        fullName: tutor.fullName,
        profilePicture: tutor.profilePicture,
        role: 'tutor',
      });
    }
    for (const r of rows) {
      if (!r.studentId) continue;
      members.push({
        id: r.studentId._id,
        fullName: r.studentId.fullName,
        profilePicture: r.studentId.profilePicture,
        role: 'student',
      });
    }
    const q = String(req.query.q || '').toLowerCase();
    const filtered = q
      ? members.filter((m) => String(m.fullName || '').toLowerCase().includes(q))
      : members;
    res.json({ members: filtered.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Q&A ──────────────────────────────────────────────────────────────────────
router.get('/:tutorId/questions', async (req, res) => {
  try {
    const filter = { tutorId: req.params.tutorId, deletedAt: null };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.courseId) filter.courseId = req.query.courseId;
    if (req.query.topic) filter.topic = new RegExp(String(req.query.topic), 'i');
    if (req.query.q) filter.$text = { $search: String(req.query.q) };

    const questions = await CommunityQuestion.find(filter)
      .populate('authorId', authorSelect)
      .populate('courseId', 'title')
      .sort({ pinned: -1, createdAt: -1 })
      .limit(50);
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/questions', async (req, res) => {
  try {
    const { title, body, topic, courseId, attachments } = req.body;
    if (!String(title || '').trim() || !String(body || '').trim()) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    const question = await CommunityQuestion.create({
      tutorId: req.params.tutorId,
      authorId: req.user._id,
      title: String(title).trim(),
      body: String(body).trim(),
      topic: String(topic || '').trim(),
      courseId: courseId || null,
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    await createNotification({
      userId: req.params.tutorId,
      type: 'question_asked',
      actorId: req.user._id,
      tutorId: req.params.tutorId,
      entityType: 'question',
      entityId: question._id,
      title: 'New question',
      body: question.title,
    });

    const populated = await CommunityQuestion.findById(question._id)
      .populate('authorId', authorSelect)
      .populate('courseId', 'title');
    res.status(201).json({ question: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:tutorId/questions/:questionId', async (req, res) => {
  try {
    const question = await CommunityQuestion.findOne({
      _id: req.params.questionId,
      tutorId: req.params.tutorId,
      deletedAt: null,
    })
      .populate('authorId', authorSelect)
      .populate('courseId', 'title');
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const answers = await CommunityAnswer.find({
      questionId: question._id,
      deletedAt: null,
    })
      .populate('authorId', authorSelect)
      .sort({ isBest: -1, createdAt: 1 });

    res.json({ question, answers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/questions/:questionId/answers', async (req, res) => {
  try {
    const question = await CommunityQuestion.findOne({
      _id: req.params.questionId,
      tutorId: req.params.tutorId,
      deletedAt: null,
    });
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ message: 'Answer body required' });

    const answer = await CommunityAnswer.create({
      questionId: question._id,
      authorId: req.user._id,
      body,
    });

    question.answerCount = (question.answerCount || 0) + 1;
    question.status = 'answered';
    await question.save();

    await awardXp({
      userId: req.user._id,
      tutorId: req.params.tutorId,
      type: 'answer_created',
    });

    await createNotification({
      userId: question.authorId,
      type: 'question_answered',
      actorId: req.user._id,
      tutorId: req.params.tutorId,
      entityType: 'answer',
      entityId: answer._id,
      title: 'Your question was answered',
      body: body.slice(0, 120),
    });

    const populated = await CommunityAnswer.findById(answer._id).populate(
      'authorId',
      authorSelect
    );
    res.status(201).json({ answer: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch(
  '/:tutorId/questions/:questionId',
  requireCommunityModerator,
  async (req, res) => {
    try {
      const question = await CommunityQuestion.findOne({
        _id: req.params.questionId,
        tutorId: req.params.tutorId,
      });
      if (!question) return res.status(404).json({ message: 'Question not found' });

      if (req.body.pinned !== undefined) question.pinned = Boolean(req.body.pinned);
      if (req.body.status === 'open' || req.body.status === 'answered') {
        question.status = req.body.status;
      }
      if (req.body.bestAnswerId) {
        await CommunityAnswer.updateMany(
          { questionId: question._id },
          { $set: { isBest: false } }
        );
        const ans = await CommunityAnswer.findOneAndUpdate(
          { _id: req.body.bestAnswerId, questionId: question._id },
          { $set: { isBest: true } },
          { new: true }
        );
        if (ans) {
          question.bestAnswerId = ans._id;
          question.status = 'answered';
          await awardXp({
            userId: ans.authorId,
            tutorId: req.params.tutorId,
            type: 'best_answer',
          });
        }
      }
      await question.save();
      res.json({ question });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.delete('/:tutorId/questions/:questionId', async (req, res) => {
  try {
    const question = await CommunityQuestion.findOne({
      _id: req.params.questionId,
      tutorId: req.params.tutorId,
    });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    const isAuthor = String(question.authorId) === String(req.user._id);
    if (!isAuthor && !req.isCommunityTutor && !req.isCommunityAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    question.deletedAt = new Date();
    await question.save();
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Rooms ────────────────────────────────────────────────────────────────────
router.get('/:tutorId/rooms', async (req, res) => {
  try {
    const rooms = await DiscussionRoom.find({
      tutorId: req.params.tutorId,
      archived: false,
    }).sort({ createdAt: 1 });
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/rooms', requireCommunityModerator, async (req, res) => {
  try {
    const { name, description, kind, courseId } = req.body;
    if (!String(name || '').trim()) {
      return res.status(400).json({ message: 'Room name required' });
    }
    const room = await DiscussionRoom.create({
      tutorId: req.params.tutorId,
      name: String(name).trim(),
      description: String(description || '').trim(),
      kind: kind || 'general',
      courseId: courseId || null,
    });
    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:tutorId/rooms/:roomId', requireCommunityModerator, async (req, res) => {
  try {
    const room = await DiscussionRoom.findOne({
      _id: req.params.roomId,
      tutorId: req.params.tutorId,
    });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (req.body.name) room.name = String(req.body.name).trim();
    if (req.body.description !== undefined) room.description = String(req.body.description).trim();
    if (req.body.archived !== undefined) room.archived = Boolean(req.body.archived);
    await room.save();
    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Resources ────────────────────────────────────────────────────────────────
router.get('/:tutorId/resources', async (req, res) => {
  try {
    const filter = {
      tutorId: req.params.tutorId,
      deletedAt: null,
      assignmentOf: null,
    };
    if (req.query.kind) filter.kind = req.query.kind;
    const resources = await CommunityResource.find(filter)
      .populate('uploadedBy', authorSelect)
      .sort({ createdAt: -1 });
    res.json({ resources });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/resources', async (req, res) => {
  try {
    const { title, description, fileUrl, fileType, kind, courseId, assignmentOf } = req.body;
    if (!String(title || '').trim() || !String(fileUrl || '').trim()) {
      return res.status(400).json({ message: 'Title and fileUrl required' });
    }

    const isAssignment = Boolean(assignmentOf);
    if (!isAssignment && !req.isCommunityTutor && !req.isCommunityAdmin) {
      return res.status(403).json({ message: 'Only the tutor can upload shared resources' });
    }

    const resource = await CommunityResource.create({
      tutorId: req.params.tutorId,
      uploadedBy: req.user._id,
      title: String(title).trim(),
      description: String(description || '').trim(),
      fileUrl: String(fileUrl).trim(),
      fileType: fileType || 'pdf',
      kind: kind || 'other',
      courseId: courseId || null,
      assignmentOf: assignmentOf || null,
    });

    if (!isAssignment) {
      await awardXp({
        userId: req.user._id,
        tutorId: req.params.tutorId,
        type: 'resource_upload',
      });
      const ids = await getSubscriberIds(req.params.tutorId);
      await notifyMany(ids, {
        type: 'resource_upload',
        actorId: req.user._id,
        tutorId: req.params.tutorId,
        entityType: 'resource',
        entityId: resource._id,
        title: 'New resource',
        body: resource.title,
      });
    }

    res.status(201).json({ resource });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:tutorId/resources/:resourceId', async (req, res) => {
  try {
    const resource = await CommunityResource.findOne({
      _id: req.params.resourceId,
      tutorId: req.params.tutorId,
    });
    if (!resource) return res.status(404).json({ message: 'Not found' });
    const isOwner = String(resource.uploadedBy) === String(req.user._id);
    if (!isOwner && !req.isCommunityTutor && !req.isCommunityAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    resource.deletedAt = new Date();
    await resource.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Polls ────────────────────────────────────────────────────────────────────
router.post('/:tutorId/polls', requireCommunityModerator, async (req, res) => {
  try {
    const { question, options } = req.body;
    const opts = (options || []).map((o) => ({
      text: String(typeof o === 'string' ? o : o.text || '').trim(),
      voteCount: 0,
    })).filter((o) => o.text);
    if (!String(question || '').trim() || opts.length < 2) {
      return res.status(400).json({ message: 'Question and at least 2 options required' });
    }

    const poll = await CommunityPoll.create({
      tutorId: req.params.tutorId,
      createdBy: req.user._id,
      question: String(question).trim(),
      options: opts,
    });

    const post = await CommunityPost.create({
      tutorId: req.params.tutorId,
      authorId: req.user._id,
      type: 'post',
      body: poll.question,
      pollId: poll._id,
    });
    poll.postId = post._id;
    await poll.save();

    const ids = await getSubscriberIds(req.params.tutorId);
    await notifyMany(ids, {
      type: 'poll_created',
      actorId: req.user._id,
      tutorId: req.params.tutorId,
      entityType: 'poll',
      entityId: poll._id,
      title: 'New poll',
      body: poll.question,
    });

    res.status(201).json({ poll, post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/polls/:pollId/vote', async (req, res) => {
  try {
    const poll = await CommunityPoll.findOne({
      _id: req.params.pollId,
      tutorId: req.params.tutorId,
    });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.closed) return res.status(400).json({ message: 'Poll is closed' });

    const optionIndex = Number(req.body.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: 'Invalid option' });
    }

    try {
      await CommunityPollVote.create({
        pollId: poll._id,
        userId: req.user._id,
        optionIndex,
      });
      poll.options[optionIndex].voteCount += 1;
      await poll.save();
      await awardXp({
        userId: req.user._id,
        tutorId: req.params.tutorId,
        type: 'poll_vote',
      });
    } catch (e) {
      if (e.code === 11000) {
        return res.status(400).json({ message: 'You already voted' });
      }
      throw e;
    }

    res.json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:tutorId/polls/:pollId', async (req, res) => {
  try {
    const poll = await CommunityPoll.findOne({
      _id: req.params.pollId,
      tutorId: req.params.tutorId,
    });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    const myVote = await CommunityPollVote.findOne({
      pollId: poll._id,
      userId: req.user._id,
    });
    res.json({ poll, myVote: myVote ? myVote.optionIndex : null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:tutorId/polls/:pollId', requireCommunityModerator, async (req, res) => {
  try {
    const poll = await CommunityPoll.findOne({
      _id: req.params.pollId,
      tutorId: req.params.tutorId,
    });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (req.body.closed !== undefined) poll.closed = Boolean(req.body.closed);
    await poll.save();
    res.json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Live sessions ────────────────────────────────────────────────────────────
router.get('/:tutorId/live-sessions', async (req, res) => {
  try {
    const sessions = await LiveSession.find({
      tutorId: req.params.tutorId,
      cancelled: false,
    })
      .sort({ startsAt: 1 })
      .limit(50);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/live-sessions', requireCommunityModerator, async (req, res) => {
  try {
    const { title, description, startsAt, endsAt, joinUrl, courseId, notify } = req.body;
    if (!String(title || '').trim() || !startsAt || !String(joinUrl || '').trim()) {
      return res.status(400).json({ message: 'title, startsAt, and joinUrl are required' });
    }
    const session = await LiveSession.create({
      tutorId: req.params.tutorId,
      title: String(title).trim(),
      description: String(description || '').trim(),
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      joinUrl: String(joinUrl).trim(),
      courseId: courseId || null,
    });

    if (notify !== false) {
      const ids = await getSubscriberIds(req.params.tutorId);
      await notifyMany(ids, {
        type: 'live_reminder',
        actorId: req.user._id,
        tutorId: req.params.tutorId,
        entityType: 'live_session',
        entityId: session._id,
        title: 'Live session scheduled',
        body: `${session.title} — ${new Date(session.startsAt).toLocaleString()}`,
      });
    }

    res.status(201).json({ session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:tutorId/live-sessions/:sessionId', requireCommunityModerator, async (req, res) => {
  try {
    const session = await LiveSession.findOne({
      _id: req.params.sessionId,
      tutorId: req.params.tutorId,
    });
    if (!session) return res.status(404).json({ message: 'Not found' });
    ['title', 'description', 'joinUrl'].forEach((k) => {
      if (req.body[k] !== undefined) session[k] = String(req.body[k]).trim();
    });
    if (req.body.startsAt) session.startsAt = new Date(req.body.startsAt);
    if (req.body.endsAt) session.endsAt = new Date(req.body.endsAt);
    if (req.body.cancelled !== undefined) session.cancelled = Boolean(req.body.cancelled);
    await session.save();
    res.json({ session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Gamification / profile ───────────────────────────────────────────────────
router.get('/:tutorId/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard(req.params.tutorId, 25);
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:tutorId/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      'fullName profilePicture creatorBio creatorHeadline role'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    const xp = await getUserXp(req.params.userId, req.params.tutorId);
    const badges = await UserBadge.find({
      userId: req.params.userId,
      tutorId: req.params.tutorId,
    });
    const defs = await BadgeDefinition.find({
      key: { $in: badges.map((b) => b.badgeKey) },
    });
    const postCount = await CommunityPost.countDocuments({
      tutorId: req.params.tutorId,
      authorId: req.params.userId,
      deletedAt: null,
    });
    res.json({
      user,
      xp,
      badges: badges.map((b) => ({
        ...b.toObject(),
        definition: defs.find((d) => d.key === b.badgeKey) || null,
      })),
      activity: { postCount },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Moderation ───────────────────────────────────────────────────────────────
router.post('/:tutorId/reports', async (req, res) => {
  try {
    const { entityType, entityId, reason } = req.body;
    if (!entityType || !entityId || !String(reason || '').trim()) {
      return res.status(400).json({ message: 'entityType, entityId, and reason required' });
    }
    const report = await CommunityReport.create({
      tutorId: req.params.tutorId,
      reporterId: req.user._id,
      entityType,
      entityId,
      reason: String(reason).trim(),
    });
    await createNotification({
      userId: req.params.tutorId,
      type: 'moderation',
      actorId: req.user._id,
      tutorId: req.params.tutorId,
      entityType: 'report',
      entityId: report._id,
      title: 'Content reported',
      body: reason.slice(0, 120),
    });
    res.status(201).json({ report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:tutorId/reports', requireCommunityModerator, async (req, res) => {
  try {
    const reports = await CommunityReport.find({
      tutorId: req.params.tutorId,
      status: req.query.status || 'open',
    })
      .populate('reporterId', authorSelect)
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:tutorId/reports/:reportId', requireCommunityModerator, async (req, res) => {
  try {
    const report = await CommunityReport.findOne({
      _id: req.params.reportId,
      tutorId: req.params.tutorId,
    });
    if (!report) return res.status(404).json({ message: 'Not found' });
    if (['open', 'resolved', 'dismissed'].includes(req.body.status)) {
      report.status = req.body.status;
    }
    await report.save();
    res.json({ report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/blocks', requireCommunityModerator, async (req, res) => {
  try {
    const { userId, reason, muted, blocked } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    if (String(userId) === String(req.params.tutorId)) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }
    const row = await CommunityBlock.findOneAndUpdate(
      { tutorId: req.params.tutorId, userId },
      {
        $set: {
          reason: String(reason || '').trim(),
          muted: muted !== undefined ? Boolean(muted) : false,
          blocked: blocked !== undefined ? Boolean(blocked) : true,
        },
      },
      { upsert: true, new: true }
    );
    res.json({ block: row });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:tutorId/blocks', requireCommunityModerator, async (req, res) => {
  try {
    const blocks = await CommunityBlock.find({ tutorId: req.params.tutorId })
      .populate('userId', authorSelect)
      .sort({ createdAt: -1 });
    res.json({ blocks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:tutorId/blocks/:userId', requireCommunityModerator, async (req, res) => {
  try {
    await CommunityBlock.deleteOne({
      tutorId: req.params.tutorId,
      userId: req.params.userId,
    });
    res.json({ message: 'Unblocked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Direct messages ──────────────────────────────────────────────────────────
router.get('/:tutorId/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      tutorId: req.params.tutorId,
      participantIds: req.user._id,
    })
      .populate('participantIds', authorSelect)
      .sort({ lastMessageAt: -1 });
    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/conversations', async (req, res) => {
  try {
    const { participantIds, title, isGroup } = req.body;
    const others = (participantIds || []).map(String).filter((id) => id !== String(req.user._id));
    if (!others.length) {
      return res.status(400).json({ message: 'At least one participant required' });
    }

    const isTutor = req.isCommunityTutor || req.isCommunityAdmin;
    const profile = await TutorProfile.findOne({ userId: req.params.tutorId }).select(
      'allowPeerMessaging'
    );
    const allowPeer = Boolean(profile?.allowPeerMessaging);

    if (!isTutor && !allowPeer) {
      // Students may only message the tutor
      if (others.length !== 1 || others[0] !== String(req.params.tutorId)) {
        return res.status(403).json({
          message: 'Peer messaging is disabled. You can only message the tutor.',
        });
      }
    }

    const all = [...new Set([String(req.user._id), ...others, String(req.params.tutorId)])];

    if (!isGroup && all.length === 2) {
      const existing = await Conversation.findOne({
        tutorId: req.params.tutorId,
        isGroup: false,
        participantIds: { $all: all, $size: 2 },
      }).populate('participantIds', authorSelect);
      if (existing) return res.json({ conversation: existing });
    }

    const conversation = await Conversation.create({
      tutorId: req.params.tutorId,
      participantIds: all,
      isGroup: Boolean(isGroup),
      title: String(title || '').trim(),
    });
    const populated = await Conversation.findById(conversation._id).populate(
      'participantIds',
      authorSelect
    );
    res.status(201).json({ conversation: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:tutorId/conversations/:conversationId/messages', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      tutorId: req.params.tutorId,
      participantIds: req.user._id,
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const messages = await Message.find({ conversationId: conversation._id })
      .populate('senderId', authorSelect)
      .sort({ createdAt: 1 })
      .limit(200);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:tutorId/conversations/:conversationId/messages', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      tutorId: req.params.tutorId,
      participantIds: req.user._id,
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ message: 'Message body required' });

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      body,
      readBy: [req.user._id],
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const recipients = conversation.participantIds.filter(
      (id) => String(id) !== String(req.user._id)
    );
    await notifyMany(recipients, {
      type: 'direct_message',
      actorId: req.user._id,
      tutorId: req.params.tutorId,
      entityType: 'conversation',
      entityId: conversation._id,
      title: 'New message',
      body: body.slice(0, 120),
    });

    const populated = await Message.findById(message._id).populate('senderId', authorSelect);
    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Search ───────────────────────────────────────────────────────────────────
router.get('/:tutorId/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ posts: [], questions: [], comments: [], resources: [] });

    const tutorId = req.params.tutorId;
    const text = { $text: { $search: q } };

    const [posts, questions, comments, resources] = await Promise.all([
      CommunityPost.find({ tutorId, deletedAt: null, ...text })
        .populate('authorId', authorSelect)
        .limit(20),
      CommunityQuestion.find({ tutorId, deletedAt: null, ...text })
        .populate('authorId', authorSelect)
        .limit(20),
      CommunityComment.find({ deletedAt: null, ...text })
        .populate('authorId', authorSelect)
        .limit(20),
      CommunityResource.find({ tutorId, deletedAt: null, assignmentOf: null, ...text })
        .limit(20),
    ]);

    // Filter comments to this tutor's posts
    const postIds = new Set(
      (
        await CommunityPost.find({ tutorId }).select('_id')
      ).map((p) => String(p._id))
    );
    const filteredComments = comments.filter((c) => postIds.has(String(c.postId)));

    res.json({
      posts,
      questions,
      comments: filteredComments,
      resources,
    });
  } catch (err) {
    // Fallback regex if text index missing
    try {
      const q = String(req.query.q || '').trim();
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const tutorId = req.params.tutorId;
      const [posts, questions, resources] = await Promise.all([
        CommunityPost.find({ tutorId, deletedAt: null, body: rx }).limit(20),
        CommunityQuestion.find({
          tutorId,
          deletedAt: null,
          $or: [{ title: rx }, { body: rx }, { topic: rx }],
        }).limit(20),
        CommunityResource.find({
          tutorId,
          deletedAt: null,
          assignmentOf: null,
          $or: [{ title: rx }, { description: rx }],
        }).limit(20),
      ]);
      res.json({ posts, questions, comments: [], resources });
    } catch (e2) {
      res.status(500).json({ message: err.message });
    }
  }
});

// ── Tutor settings for community ─────────────────────────────────────────────
router.get('/:tutorId/settings', requireCommunityModerator, async (req, res) => {
  try {
    let profile = await TutorProfile.findOne({ userId: req.params.tutorId });
    res.json({
      allowPeerMessaging: Boolean(profile?.allowPeerMessaging),
      communityGuidelines: profile?.communityGuidelines || '',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:tutorId/settings', requireCommunityModerator, async (req, res) => {
  try {
    const updates = {};
    if (req.body.allowPeerMessaging !== undefined) {
      updates.allowPeerMessaging = Boolean(req.body.allowPeerMessaging);
    }
    if (req.body.communityGuidelines !== undefined) {
      updates.communityGuidelines = String(req.body.communityGuidelines);
    }
    const profile = await TutorProfile.findOneAndUpdate(
      { userId: req.params.tutorId },
      { $set: updates },
      { new: true, upsert: true }
    );
    res.json({
      allowPeerMessaging: Boolean(profile.allowPeerMessaging),
      communityGuidelines: profile.communityGuidelines || '',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
