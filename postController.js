const sanitizeHtml = require('sanitize-html');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

const sanitizeOptions = {
  allowedTags: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'ul', 'ol', 'li',
    'a', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3'
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] }
};

async function listPosts(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const { search, tag, author } = req.query;

    const filter = { published: true };
    if (search) filter.$text = { $search: search };
    if (tag) filter.tags = tag;
    if (author) filter.author = author;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author', 'username avatar')
        .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Post.countDocuments(filter)
    ]);

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
}

async function getPost(req, res, next) {
  try {
    const { idOrSlug } = req.params;
    const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: idOrSlug }
      : { slug: idOrSlug };

    const post = await Post.findOne(query).populate('author', 'username avatar bio');
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    post.views += 1;
    await post.save();

    const commentCount = await Comment.countDocuments({ post: post._id });

    res.json({
      post,
      commentCount,
      likedByMe: req.user ? post.likes.some((id) => id.equals(req.user._id)) : false
    });
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    const { title, content, tags, coverImage, published } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required.' });
    }

    const post = await Post.create({
      title,
      content: sanitizeHtml(content, sanitizeOptions),
      tags: Array.isArray(tags) ? tags : (tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      coverImage,
      published: published !== undefined ? published : true,
      author: req.user._id
    });

    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}

async function updatePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    if (!post.author.equals(req.user._id)) {
      return res.status(403).json({ error: 'You can only edit your own posts.' });
    }

    const { title, content, tags, coverImage, published } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = sanitizeHtml(content, sanitizeOptions);
    if (tags !== undefined) {
      post.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (published !== undefined) post.published = published;

    await post.save();
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

async function deletePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    if (!post.author.equals(req.user._id)) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }

    await Promise.all([post.deleteOne(), Comment.deleteMany({ post: post._id })]);
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
}

async function toggleLike(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const alreadyLiked = post.likes.some((id) => id.equals(req.user._id));
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => !id.equals(req.user._id));
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();

    res.json({ likeCount: post.likes.length, likedByMe: !alreadyLiked });
  } catch (err) {
    next(err);
  }
}

async function myPosts(req, res, next) {
  try {
    const posts = await Post.find({ author: req.user._id }).sort({ createdAt: -1 });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPosts, getPost, createPost, updatePost, deletePost, toggleLike, myPosts };
