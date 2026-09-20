import React, { useRef, useEffect, useCallback } from 'react';

/**
 * A small, dependency-free rich text editor built on contentEditable +
 * document.execCommand. It's not as fully featured as something like
 * Quill/TipTap, but it covers the common formatting a blog post needs and
 * keeps the bundle light. The HTML it produces is sanitized again on the
 * server before it's ever stored (see backend sanitize-html usage).
 */
export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);

  useEffect(() => {
    // Only sync from outside when the content actually differs (e.g. when
    // loading a post to edit), so we don't fight the user's cursor while typing.
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = useCallback((command, arg = null) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleLink = () => {
    const url = window.prompt('Link URL (include https://)');
    if (url) exec('createLink', url);
  };

  return (
    <div className="rich-text-editor">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" onClick={() => exec('bold')} title="Bold"><b>B</b></button>
        <button type="button" onClick={() => exec('italic')} title="Italic"><i>I</i></button>
        <button type="button" onClick={() => exec('underline')} title="Underline"><u>U</u></button>
        <button type="button" onClick={() => exec('formatBlock', 'h2')} title="Heading">H2</button>
        <button type="button" onClick={() => exec('insertUnorderedList')} title="Bulleted list">• List</button>
        <button type="button" onClick={() => exec('insertOrderedList')} title="Numbered list">1. List</button>
        <button type="button" onClick={() => exec('formatBlock', 'blockquote')} title="Quote">&ldquo;&rdquo;</button>
        <button type="button" onClick={handleLink} title="Insert link">Link</button>
        <button type="button" onClick={() => exec('removeFormat')} title="Clear formatting">Clear</button>
      </div>
      <div
        ref={editorRef}
        className="rte-content"
        contentEditable
        data-placeholder={placeholder}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        suppressContentEditableWarning
      />
    </div>
  );
}
