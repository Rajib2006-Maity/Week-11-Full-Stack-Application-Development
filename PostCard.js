import React from 'react';
import { Link } from 'react-router-dom';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function PostCard({ post }) {
  return (
    <article className="post-card">
      {post.coverImage && (
        <Link to={`/posts/${post.slug}`}>
          <img className="post-card-image" src={post.coverImage} alt="" />
        </Link>
      )}
      <div className="post-card-body">
        <h2 className="post-card-title">
          <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="post-card-excerpt">{post.excerpt}</p>
        <div className="post-card-meta">
          <span className="meta-item">by {post.author?.username || 'Unknown'}</span>
          <span className="meta-item">{formatDate(post.createdAt)}</span>
          <span className="meta-item">{post.likeCount ?? post.likes?.length ?? 0} likes</span>
        </div>
        {post.tags?.length > 0 && (
          <div className="post-card-tags">
            {post.tags.map((tag) => (
              <span key={tag} className="tag-pill">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
