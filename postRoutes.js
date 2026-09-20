const express = require('express');
const { requireAuth, attachUserIfPresent } = require('../middleware/auth');
const {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  myPosts
} = require('../controllers/postController');
const { listComments, createComment, deleteComment } = require('../controllers/commentController');

const router = express.Router();

router.get('/', listPosts);
router.get('/mine', requireAuth, myPosts);
router.get('/:idOrSlug', attachUserIfPresent, getPost);

router.post('/', requireAuth, createPost);
router.put('/:id', requireAuth, updatePost);
router.delete('/:id', requireAuth, deletePost);
router.post('/:id/like', requireAuth, toggleLike);

// Nested comment routes: /api/posts/:postId/comments
router.get('/:postId/comments', listComments);
router.post('/:postId/comments', requireAuth, createComment);
router.delete('/:postId/comments/:commentId', requireAuth, deleteComment);

module.exports = router;
