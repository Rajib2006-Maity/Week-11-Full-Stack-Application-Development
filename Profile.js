import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

function OwnProfile() {
  const { user, updateProfile, changePassword, error } = useAuth();
  const [form, setForm] = useState({ username: user?.username || '', bio: user?.bio || '', avatar: user?.avatar || '' });
  const [savedMessage, setSavedMessage] = useState(null);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwMessage, setPwMessage] = useState(null);
  const [myPosts, setMyPosts] = useState([]);

  useEffect(() => {
    api.get('/posts/mine').then(({ data }) => setMyPosts(data.posts)).catch(() => {});
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavedMessage(null);
    const result = await updateProfile(form);
    setSavedMessage(result.success ? 'Profile updated.' : result.error);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwMessage(null);
    const result = await changePassword(pwForm.currentPassword, pwForm.newPassword);
    if (result.success) {
      setPwMessage('Password changed. Please log in again.');
      setPwForm({ currentPassword: '', newPassword: '' });
    } else {
      setPwMessage(result.error);
    }
  };

  return (
    <div className="profile-page">
      <h1>Your profile</h1>

      <section className="settings-card">
        <h2>Profile settings</h2>
        <form onSubmit={handleProfileSubmit} className="post-form">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />

          <label htmlFor="avatar">Avatar URL</label>
          <input
            id="avatar"
            value={form.avatar}
            onChange={(e) => setForm({ ...form, avatar: e.target.value })}
            placeholder="https://..."
          />

          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            rows={3}
            maxLength={300}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />

          {savedMessage && <p className={error ? 'form-error' : 'form-success'}>{savedMessage}</p>}
          <button type="submit" className="btn btn-primary btn-sm">Save changes</button>
        </form>
      </section>

      <section className="settings-card">
        <h2>Change password</h2>
        <form onSubmit={handlePasswordSubmit} className="post-form">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            required
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
          />

          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={6}
            value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
          />

          {pwMessage && <p className={pwMessage.includes('changed') ? 'form-success' : 'form-error'}>{pwMessage}</p>}
          <button type="submit" className="btn btn-secondary btn-sm">Update password</button>
        </form>
      </section>

      <section>
        <h2>Your posts ({myPosts.length})</h2>
        <div className="post-grid">
          {myPosts.map((post) => (
            <PostCard key={post._id} post={{ ...post, author: user }} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PublicProfile({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/users/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('User not found.'));
  }, [id]);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="text-muted">Loading...</p>;

  return (
    <div className="profile-page">
      <h1>{data.user.username}</h1>
      {data.user.bio && <p className="text-muted">{data.user.bio}</p>}

      <section>
        <h2>Posts ({data.posts.length})</h2>
        <div className="post-grid">
          {data.posts.map((post) => (
            <PostCard key={post._id} post={{ ...post, author: data.user }} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();

  if (!id || id === user?.id) return <OwnProfile />;
  return <PublicProfile id={id} />;
}
