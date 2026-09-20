import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import PostCard from '../components/PostCard';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async (page = 1, searchTerm = '') => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/posts', { params: { page, search: searchTerm || undefined } });
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (err) {
      setError('Could not load posts. Is the API running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, '');
  }, [fetchPosts]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPosts(1, search);
  };

  return (
    <div className="home-page">
      <section className="hero">
        <h1>Ideas worth writing down.</h1>
        <p>Read what the community is publishing, or start your own post.</p>
      </section>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search posts by title, content or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">Search</button>
      </form>

      {loading && <p className="text-muted">Loading posts...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && posts.length === 0 && (
        <p className="text-muted">No posts yet. Be the first to publish one!</p>
      )}

      <div className="post-grid">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchPosts(pagination.page - 1, search)}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchPosts(pagination.page + 1, search)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
