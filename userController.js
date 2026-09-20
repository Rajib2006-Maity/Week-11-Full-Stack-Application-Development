const User = require('../models/User');
const Post = require('../models/Post');

async function getPublicProfile(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const posts = await Post.find({ author: user._id, published: true }).sort({ createdAt: -1 });

    res.json({ user: user.toPublicJSON(), posts });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicProfile };
