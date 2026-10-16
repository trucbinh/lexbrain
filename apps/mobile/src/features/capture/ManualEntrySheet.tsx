import { normalizeSelection } from '@lexbrain/core';
import { useEffect, useState } from 'react';

interface Props {
  onTranslate: (text: string) => void;
  onClose: () => void;
}

export function ManualEntrySheet({ onTranslate, onClose }: Props) {
  const [text, setText] = useState('');
  const normalized = normalizeSelection(text);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="capture-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="sheet manual-entry-sheet" role="dialog" aria-modal="true" aria-label="Add a word or phrase">
        <header className="sheet-head">
          <h2 className="sheet-brand">Add a word or phrase</h2>
          <button type="button" className="link-btn sheet-close" onClick={onClose}>
            Close
          </button>
        </header>

        <label className="field">
          <span className="field-label">Text to translate</span>
          <textarea
            className="input"
            rows={4}
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && normalized) {
                onTranslate(normalized);
              }
            }}
          />
        </label>

        <div className="sheet-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!normalized}
            onClick={() => onTranslate(normalized)}
          >
            Translate
          </button>
        </div>
      </section>
    </div>
  );
}
