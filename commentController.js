const Comment = require('../models/Comment');
const Post = require('../models/Post');

/**
 * Returns all comments for a post as a nested tree. We fetch the flat list
 * (fast, one query) and build the parent -> children tree in memory, which is
 * simpler and cheaper than recursive queries for typical blog comment volumes.
 */
async function listComments(req, res, next) {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId })
      .populate('author', 'username avatar')
      .sort({ createdAt: 1 })
      .lean();

    const byId = new Map(comments.map((c) => [c._id.toString(), { ...c, replies: [] }]));
    const roots = [];

    for (const comment of byId.values()) {
      if (comment.parentComment) {
        const parent = byId.get(comment.parentComment.toString());
        if (parent) parent.replies.push(comment);
        else roots.push(comment); // orphaned parent (deleted) -> show at top level
      } else {
        roots.push(comment);
      }
    }

    res.json({ comments: roots, total: comments.length });
  } catch (err) {
    next(err);
  }
}

async function createComment(req, res, next) {
  try {
    const { postId } = req.params;
    const { content, parentComment } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required.' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || !parent.post.equals(post._id)) {
        return res.status(400).json({ error: 'Invalid parent comment.' });
      }
    }

    const comment = await Comment.create({
      content: content.trim(),
      author: req.user._id,
      post: postId,
      parentComment: parentComment || null
    });

    await comment.populate('author', 'username avatar');
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

async function deleteComment(req, res, next) {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    if (!comment.author.equals(req.user._id)) {
      return res.status(403).json({ error: 'You can only delete your own comments.' });
    }

    // Delete the comment and every reply beneath it (simple depth-first cleanup).
    const toDelete = [comment._id];
    for (let i = 0; i < toDelete.length; i += 1) {
      const children = await Comment.find({ parentComment: toDelete[i] }).select('_id');
      toDelete.push(...children.map((c) => c._id));
    }
    await Comment.deleteMany({ _id: { $in: toDelete } });

    res.json({ message: 'Comment deleted.', deletedCount: toDelete.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { listComments, createComment, deleteComment };
