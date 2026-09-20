import React, { useState } from 'react';
import RichTextEditor from './RichTextEditor';

export default function PostForm({ initialValues, onSubmit, submitLabel }) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [content, setContent] = useState(initialValues?.content || '');
  const [tags, setTags] = useState((initialValues?.tags || []).join(', '));
  const [coverImage, setCoverImage] = useState(initialValues?.coverImage || '');
  const [published, setPublished] = useState(initialValues?.published ?? true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || content === '<br>') {
      setError('Title and content are both required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit({ title, content, tags, coverImage, published });
    setSubmitting(false);
    if (!result?.success) setError(result?.error || 'Something went wrong.');
  };

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <label htmlFor="title">Title</label>
      <input
        id="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Give your post a title"
        required
      />

      <label htmlFor="coverImage">Cover image URL (optional)</label>
      <input
        id="coverImage"
        value={coverImage}
        onChange={(e) => setCoverImage(e.target.value)}
        placeholder="https://..."
      />

      <label htmlFor="tags">Tags (comma separated)</label>
      <input
        id="tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="react, nodejs, mongodb"
      />

      <label>Content</label>
      <RichTextEditor value={content} onChange={setContent} placeholder="Write your post..." />

      <label className="checkbox-label">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Published (uncheck to save as a draft)
      </label>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
