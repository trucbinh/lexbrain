import {
  deleteCard,
  languageName,
  listCards,
  markMastered,
  restoreCard,
  type Card,
  type CardKind,
  type CardStatus,
} from '@lexbrain/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';

function Row({ card }: { card: Card }) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const askDelete = () => {
    if (confirming) {
      void deleteCard(card.id);
      return;
    }
    setConfirming(true);
    timer.current = window.setTimeout(() => setConfirming(false), 3500);
  };

  return (
    <li className={`row ${card.status === 'mastered' ? 'row-mastered' : ''}`}>
      <div className="row-text">
        <p className="row-source">{card.sourceText}</p>
        <p className="row-target">{card.translatedText}</p>
        <p className="row-meta">
          <span>
            {languageName(card.sourceLang)} to {languageName(card.targetLang)}
          </span>
          <span className="chip">{card.kind}</span>
        </p>
      </div>
      <div className="row-actions">
        {card.status === 'learning' ? (
          <button type="button" className="link-btn" onClick={() => void markMastered(card.id)}>
            Mark mastered
          </button>
        ) : (
          <button type="button" className="link-btn" onClick={() => void restoreCard(card.id)}>
            Learn again
          </button>
        )}
        <button type="button" className={`link-btn ${confirming ? 'danger' : ''}`} onClick={askDelete}>
          {confirming ? 'Tap again to delete' : 'Delete'}
        </button>
      </div>
    </li>
  );
}

export function LibraryScreen() {
  const [status, setStatus] = useState<CardStatus | 'all'>('learning');
  const [kind, setKind] = useState<CardKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const cards = useLiveQuery(() => listCards({ status, kind, search }), [status, kind, search]);

  return (
    <div className="library">
      <div className="library-tools">
        <input
          type="search"
          className="input"
          placeholder="Search words and translations"
          aria-label="Search saved words"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="segmented" role="group" aria-label="Show">
          {(
            [
              ['learning', 'Learning'],
              ['mastered', 'Mastered'],
              ['all', 'All'],
            ] as const
          ).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>
              {label}
            </button>
          ))}
        </div>
        <select
          className="input"
          aria-label="Filter by type"
          value={kind}
          onChange={(e) => setKind(e.target.value as CardKind | 'all')}
        >
          <option value="all">Words, sentences and paragraphs</option>
          <option value="word">Words only</option>
          <option value="sentence">Sentences only</option>
          <option value="paragraph">Paragraphs only</option>
        </select>
      </div>

      {cards && cards.length === 0 ? (
        <div className="empty">
          <h2>{search ? 'No matches' : status === 'mastered' ? 'No mastered words yet' : 'Nothing saved yet'}</h2>
          <p>
            {search
              ? 'Try a different spelling, or clear the search.'
              : status === 'mastered'
                ? 'Words you mark as mastered are kept here, so you can bring them back later.'
                : 'Select text in your browser or reader and choose Add to LexBrain.'}
          </p>
        </div>
      ) : (
        <ul className="rows">{cards?.map((c) => <Row key={c.id} card={c} />)}</ul>
      )}
    </div>
  );
}
