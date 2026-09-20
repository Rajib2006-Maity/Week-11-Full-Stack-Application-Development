import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CommentForm from './CommentForm';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];
  for (const [label, secondsInUnit] of units) {
    const count = Math.floor(seconds / secondsInUnit);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

function Comment({ comment, onReply, onDelete, depth = 0 }) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const isOwner = user && comment.author && user.id === comment.author._id;

  return (
    <div className="comment" style={{ marginLeft: Math.min(depth, 4) * 24 }}>
      <div className="comment-header">
        <span className="comment-author">{comment.author?.username || '[deleted]'}</span>
        <span className="comment-time">{timeAgo(comment.createdAt)}</span>
      </div>
      <p className="comment-content">{comment.content}</p>
      <div className="comment-actions">
        {user && (
          <button type="button" className="btn-link btn-sm" onClick={() => setReplying((r) => !r)}>
            Reply
          </button>
        )}
        {isOwner && (
          <button type="button" className="btn-link btn-sm text-danger" onClick={() => onDelete(comment._id)}>
            Delete
          </button>
        )}
      </div>

      {replying && (
        <CommentForm
          placeholder="Write a reply..."
          submitLabel="Reply"
          onCancel={() => setReplying(false)}
          onSubmit={async (content) => {
            const ok = await onReply(content, comment._id);
            if (ok) setReplying(false);
            return ok;
          }}
        />
      )}

      {comment.replies?.map((reply) => (
        <Comment key={reply._id} comment={reply} onReply={onReply} onDelete={onDelete} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function CommentList({ comments, onReply, onDelete }) {
  if (!comments?.length) {
    return <p className="text-muted">No comments yet. Be the first to say something!</p>;
  }

  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <Comment key={comment._id} comment={comment} onReply={onReply} onDelete={onDelete} />
      ))}
    </div>
  );
}
