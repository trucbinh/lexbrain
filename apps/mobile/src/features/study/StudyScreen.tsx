import {
  countCards,
  getStudyQueue,
  markMastered,
  restoreCard,
  reviewCard,
  saveSettings,
  type Card,
} from '@lexbrain/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { FlipCard } from './FlipCard';

const SWIPE_DISTANCE = 100;

interface Undo {
  card: Card;
  label: string;
}

export function StudyScreen() {
  const settings = useSettings();
  const counts = useLiveQuery(() => countCards(), []);
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dx, setDx] = useState(0);
  const [undo, setUndo] = useState<Undo | null>(null);
  const drag = useRef<{ startX: number; moved: boolean } | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);

  const load = useCallback(async (includeNotDue = false) => {
    const q = await getStudyQueue(50, includeNotDue);
    setQueue(q);
    setTotal(q.length);
    setFlipped(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Pick up newly saved cards while the queue is empty.
  useEffect(() => {
    if (queue && queue.length === 0) void load();
  }, [counts?.learning, queue, load]);

  const current = queue?.[0];

  const showUndo = (card: Card, label: string) => {
    window.clearTimeout(undoTimer.current);
    setUndo({ card, label });
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000);
  };

  const advance = useCallback((requeue: boolean) => {
    setFlipped(false);
    setDx(0);
    setQueue((q) => {
      if (!q || q.length === 0) return q;
      const [first, ...rest] = q;
      return requeue && first ? [...rest, first] : rest;
    });
  }, []);

  const know = useCallback(async () => {
    if (!current) return;
    await markMastered(current.id);
    showUndo(current, 'Moved to mastered.');
    advance(false);
  }, [current, advance]);

  const again = useCallback(async () => {
    if (!current) return;
    await reviewCard(current, 'again');
    advance(true);
  }, [current, advance]);

  const undoLast = async () => {
    if (!undo) return;
    await restoreCard(undo.card.id);
    setQueue((q) => [undo.card, ...(q ?? [])]);
    setUndo(null);
  };

  // Keyboard: space flips, arrows answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') void know();
      else if (e.key === 'ArrowLeft') void again();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [know, again]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { startX: e.clientX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const delta = e.clientX - drag.current.startX;
    if (Math.abs(delta) > 6) drag.current.moved = true;
    setDx(delta);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      setDx(0);
      setFlipped((f) => !f);
    } else if (dx > SWIPE_DISTANCE) void know();
    else if (dx < -SWIPE_DISTANCE) void again();
    else setDx(0);
  };

  if (!queue) return <div className="study" aria-busy="true" />;

  const hasLearning = (counts?.learning ?? 0) > 0;
  const swipeHint = dx > SWIPE_DISTANCE / 2 ? 'know' : dx < -SWIPE_DISTANCE / 2 ? 'again' : undefined;

  return (
    <div className="study">
      <div className="study-bar">
        <p className="study-progress" aria-live="polite">
          {current ? `${total - queue.length + 1} of ${total}` : 'Study'}
        </p>
        <button
          type="button"
          className="link-btn"
          onClick={() =>
            void saveSettings({
              studyDirection: settings.studyDirection === 'source-to-target' ? 'target-to-source' : 'source-to-target',
            })
          }
        >
          {settings.studyDirection === 'source-to-target' ? 'Showing original first' : 'Showing translation first'}
        </button>
      </div>

      {current ? (
        <>
          <div
            className="card-stage"
            role="button"
            tabIndex={0}
            aria-label={flipped ? 'Card back. Press space to flip.' : 'Card front. Press space to flip.'}
            data-swipe={swipeHint}
            style={{
              transform: `translateX(${dx}px) rotate(${dx / 40}deg)`,
              transition: drag.current ? 'none' : undefined,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              drag.current = null;
              setDx(0);
            }}
          >
            <FlipCard card={current} flipped={flipped} direction={settings.studyDirection} />
          </div>

          <p className="study-hint">Tap the card to flip it. Swipe right when you know it, left to see it again.</p>

          <div className="study-actions">
            <button type="button" className="btn btn-quiet" onClick={() => void again()}>
              Show again
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void know()}>
              I know it
            </button>
          </div>
        </>
      ) : hasLearning ? (
        <div className="empty">
          <h2>You're caught up</h2>
          <p>No cards are due right now. Cards you marked "Show again" come back in a few minutes.</p>
          <button type="button" className="btn btn-primary" onClick={() => void load(true)}>
            Review everything anyway
          </button>
        </div>
      ) : (
        <div className="empty">
          <h2>Nothing to study yet</h2>
          <p>
            Select a word or sentence in your browser or reader, then choose <strong>Add to LexBrain</strong>. It will
            appear here as a card.
          </p>
        </div>
      )}

      {undo && (
        <div className="toast" role="status">
          <span>{undo.label}</span>
          <button type="button" className="link-btn" onClick={() => void undoLast()}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
