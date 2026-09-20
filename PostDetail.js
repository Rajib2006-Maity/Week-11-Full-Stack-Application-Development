import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CommentForm from '../components/CommentForm';
import CommentList from '../components/CommentList';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function PostDetail() {
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [likeState, setLikeState] = useState({ likeCount: 0, likedByMe: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const postRes = await api.get(`/posts/${slug}`);
      setPost(postRes.data.post);
      setLikeState({
        likeCount: postRes.data.post.likes?.length ?? 0,
        likedByMe: postRes.data.likedByMe
      });
      // comments are fetched by slug too since the backend accepts id OR slug
      const commentsForPost = await api.get(`/posts/${postRes.data.post._id}/comments`);
      setComments(commentsForPost.data.comments);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Post not found.' : 'Could not load this post.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLike = async () => {
    if (!isAuthenticated) return navigate('/login');
    const { data } = await api.post(`/posts/${post._id}/like`);
    setLikeState(data);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    await api.delete(`/posts/${post._id}`);
    navigate('/');
  };

  const handleComment = async (content, parentComment = null) => {
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { content, parentComment });
      // Refetch so nesting stays correct regardless of where the reply landed.
      const refreshed = await api.get(`/posts/${post._id}/comments`);
      setComments(refreshed.data.comments);
      return !!data.comment;
    } catch (err) {
      return false;
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment and its replies?')) return;
    await api.delete(`/posts/${post._id}/comments/${commentId}`);
    const refreshed = await api.get(`/posts/${post._id}/comments`);
    setComments(refreshed.data.comments);
  };

  if (loading) return <p className="text-muted">Loading...</p>;
  if (error) return <p className="form-error">{error}</p>;
  if (!post) return null;

  const isOwner = user && post.author && user.id === post.author._id;
  const cleanHtml = DOMPurify.sanitize(post.content);

  return (
    <article className="post-detail">
      {post.coverImage && <img className="post-detail-cover" src={post.coverImage} alt="" />}

      <h1>{post.title}</h1>
      <div className="post-detail-meta">
        <span className="meta-item">
          by <Link to={`/profile/${post.author?._id}`}>{post.author?.username}</Link>
        </span>
        <span className="meta-item">{formatDate(post.createdAt)}</span>
        <span className="meta-item">{post.views} views</span>
      </div>

      {post.tags?.length > 0 && (
        <div className="post-card-tags">
          {post.tags.map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="post-detail-owner-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/posts/${post.slug}/edit`)}>
            Edit
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
            Delete
          </button>
        </div>
      )}

      {/* eslint-disable-next-line react/no-danger */}
      <div className="post-detail-content" dangerouslySetInnerHTML={{ __html: cleanHtml }} />

      <div className="post-detail-actions">
        <button type="button" className={`btn btn-like ${likeState.likedByMe ? 'liked' : ''}`} onClick={handleLike}>
          {likeState.likedByMe ? '♥' : '♡'} {likeState.likeCount}
        </button>
      </div>

      <section className="comments-section">
        <h2>Comments ({comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0)})</h2>
        {isAuthenticated ? (
          <CommentForm onSubmit={(content) => handleComment(content, null)} />
        ) : (
          <p className="text-muted">
            <Link to="/login">Log in</Link> to join the conversation.
          </p>
        )}
        <CommentList comments={comments} onReply={handleComment} onDelete={handleDeleteComment} />
      </section>
    </article>
  );
}
