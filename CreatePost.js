import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PostForm from '../components/PostForm';

export default function CreatePost() {
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    try {
      const { data } = await api.post('/posts', values);
      navigate(`/posts/${data.post.slug}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  return (
    <div className="editor-page">
      <h1>Write a new post</h1>
      <PostForm onSubmit={handleSubmit} submitLabel="Publish" />
    </div>
  );
}
