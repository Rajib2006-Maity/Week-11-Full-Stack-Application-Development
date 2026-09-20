import React, { useState } from 'react';

export default function CommentForm({ onSubmit, placeholder = 'Add a comment...', submitLabel = 'Comment', onCancel }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const ok = await onSubmit(content.trim());
    setSubmitting(false);
    if (ok) setContent('');
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        required
      />
      <div className="comment-form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
          {submitting ? 'Posting...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
