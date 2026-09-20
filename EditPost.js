import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostForm from '../components/PostForm';

export default function EditPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/posts/${slug}`);
        if (user && data.post.author._id !== user.id) {
          setError('You can only edit your own posts.');
        } else {
          setPost(data.post);
        }
      } catch (err) {
        setError('Post not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, user]);

  const handleSubmit = async (values) => {
    try {
      const { data } = await api.put(`/posts/${post._id}`, values);
      navigate(`/posts/${data.post.slug}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  if (loading) return <p className="text-muted">Loading...</p>;
  if (error) return <p className="form-error">{error}</p>;

  return (
    <div className="editor-page">
      <h1>Edit post</h1>
      <PostForm initialValues={post} onSubmit={handleSubmit} submitLabel="Save changes" />
    </div>
  );
}
