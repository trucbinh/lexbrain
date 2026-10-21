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

/** Dragging further than this (px) answers the card when you let go. */
const SWIPE_DISTANCE = 80;
/** A quick flick answers the card even when it is shorter than SWIPE_DISTANCE. */
const FLICK_MIN_DISTANCE = 30;
const FLICK_VELOCITY = 0.5; // px per ms
/** Movement below this (px) still counts as a tap. */
const MOVE_DEADZONE = 8;
/** A press held longer than this is not a tap, so letting go does not flip the card. */
const TAP_MAX_MS = 450;
/** How long the card takes to fly off screen. Keep in sync with the transition below. */
const EXIT_MS = 200;

type Answer = 'know' | 'again';

/**
 * Rules that must apply to EVERY element inside the card, not just the card itself.
 *
 * - `touch-action` is not inherited. When a finger lands on the text inside the card, the browser looks at that
 *   inner element (touch-action: auto), decides it is a scroll, and cancels the swipe after a few pixels.
 * - On Android, pressing and holding on text starts text selection (and opens the system toolbar, which in this
 *   app even offers "Add to LexBrain"). That steals the touch, so the drag that follows never arrives.
 *
 * (You can move this into styles.css if you prefer.)
 */
const CARD_TOUCH_CSS = `
.card-stage, .card-stage * {
  touch-action: pan-y;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}`;

interface Props {
  onAddCard: () => void;
}

interface Undo {
  card: Card;
  label: string;
}

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  /** "pending" until the finger moves past the dead zone; then "swipe". */
  mode: 'pending' | 'swipe';
  dx: number;
}

export function StudyScreen({ onAddCard }: Props) {
  const settings = useSettings();
  const counts = useLiveQuery(() => countCards(), []);
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  /** Bumped whenever the shown card changes, so the card element is rebuilt (see FlipCard key below). */
  const [round, setRound] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);

  const gesture = useRef<Gesture | null>(null);
  const busy = useRef(false); // true while a card is flying off / being saved
  const undoTimer = useRef<number | undefined>(undefined);
  const exitTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(undoTimer.current);
      window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const load = useCallback(async (includeNotDue = false) => {
    const q = await getStudyQueue(50, includeNotDue);
    // Keep the same state object when it is empty both before and after. Otherwise the effect below
    // sees a "new" empty queue every time and reloads in an endless loop.
    setQueue((prev) => (q.length === 0 && prev?.length === 0 ? prev : q));
    setTotal(q.length);
    setFlipped(false);
    setRound((r) => r + 1);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Pick up newly saved cards while the queue is empty.
  useEffect(() => {
    if (queue && queue.length === 0) void load();
  }, [counts?.learning, queue, load]);

  const current = queue?.[0];

  const showUndo = useCallback((card: Card, label: string) => {
    window.clearTimeout(undoTimer.current);
    setUndo({ card, label });
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000);
  }, []);

  const advance = useCallback((requeue: boolean) => {
    setFlipped(false);
    setRound((r) => r + 1);
    setQueue((q) => {
      if (!q || q.length === 0) return q;
      const [first, ...rest] = q;
      return requeue && first ? [...rest, first] : rest;
    });
  }, []);

  /** Animate the card back to the middle. */
  const snapBack = useCallback(() => {
    setDragging(false);
    setDx(0);
  }, []);

  /** Put the (new) card in the middle instantly, with no slide-in. */
  const placeAtCenter = useCallback(() => {
    setDragging(true);
    setDx(0);
    requestAnimationFrame(() => requestAnimationFrame(() => setDragging(false)));
  }, []);

  /** Fly the card off screen, save the answer, then show the next card. */
  const answer = useCallback(
    (kind: Answer) => {
      if (busy.current || !current) return;
      busy.current = true;
      gesture.current = null;

      const card = current;
      // Start saving right away; the animation runs while the write happens.
      const work = kind === 'know' ? markMastered(card.id) : reviewCard(card, 'again');

      setDragging(false);
      setDx(kind === 'know' ? window.innerWidth : -window.innerWidth);

      exitTimer.current = window.setTimeout(() => {
        work
          .then(() => {
            if (kind === 'know') showUndo(card, 'Moved to mastered.');
            advance(kind === 'again');
            placeAtCenter();
          })
          .catch((error: unknown) => {
            console.error('Could not save the answer', error);
            snapBack();
          })
          .finally(() => {
            busy.current = false;
          });
      }, EXIT_MS);
    },
    [current, advance, placeAtCenter, snapBack, showUndo],
  );

  const know = useCallback(() => answer('know'), [answer]);
  const again = useCallback(() => answer('again'), [answer]);

  const undoLast = async () => {
    if (!undo) return;
    await restoreCard(undo.card.id);
    setQueue((q) => [undo.card, ...(q ?? [])]);
    setRound((r) => r + 1);
    setFlipped(false);
    setUndo(null);
  };

  // Keyboard: space flips, arrows answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!busy.current) setFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') know();
      else if (e.key === 'ArrowLeft') again();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [know, again]);

  // ---- Pointer gestures -------------------------------------------------------------------

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busy.current) return;
    if (!e.isPrimary) return; // ignore a second finger
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Always start from a clean slate. A previous gesture can end without pointerup (for example when the
    // system opens a text-selection or context menu); refusing to start would leave the card dead.
    gesture.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      mode: 'pending',
      dx: 0,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone; the gesture simply won't receive more events.
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - g.startX;
    const deltaY = e.clientY - g.startY;

    if (g.mode === 'pending') {
      if (Math.hypot(deltaX, deltaY) < MOVE_DEADZONE) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Mostly vertical: the person is scrolling, not swiping. Ignore the rest of this gesture.
        gesture.current = null;
        return;
      }
      g.mode = 'swipe';
      setDragging(true);
    }

    g.dx = deltaX;
    setDx(deltaX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gesture.current = null;

    if (g.mode === 'pending') {
      // A real tap: short and (almost) still. A long press is not a tap.
      if (performance.now() - g.startTime <= TAP_MAX_MS) setFlipped((f) => !f);
      return;
    }

    const elapsed = Math.max(1, performance.now() - g.startTime);
    const distance = Math.abs(g.dx);
    const isFlick = distance > FLICK_MIN_DISTANCE && distance / elapsed > FLICK_VELOCITY;

    if (distance > SWIPE_DISTANCE || isFlick) answer(g.dx > 0 ? 'know' : 'again');
    else snapBack();
  };

  /** The system took over (scroll, long-press menu, ...): drop the gesture and recentre the card. */
  const cancelGesture = () => {
    if (!gesture.current) return; // already finished normally
    gesture.current = null;
    snapBack();
  };

  /** Blocks text selection from starting inside the card (long-press, double-tap). React has no onSelectStart. */
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    el?.addEventListener('selectstart', (e) => e.preventDefault());
  }, []);

  if (!queue) return <div className="study" aria-busy="true" />;

  const hasLearning = (counts?.learning ?? 0) > 0;
  const swipeHint = dx > SWIPE_DISTANCE / 2 ? 'know' : dx < -SWIPE_DISTANCE / 2 ? 'again' : undefined;

  return (
    <div className="study">
      <style>{CARD_TOUCH_CSS}</style>
      <div className="study-bar">
        <p className="study-progress" aria-live="polite">
          {current ? `${total - queue.length + 1} of ${total}` : 'Study'}
        </p>
        <div className="study-bar-actions">
          <button type="button" className="link-btn" onClick={onAddCard}>
            Add card
          </button>
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
      </div>

      {current ? (
        <>
          <div
            ref={stageRef}
            className="card-stage"
            role="button"
            tabIndex={0}
            aria-label={flipped ? 'Card back. Press space to flip.' : 'Card front. Press space to flip.'}
            data-swipe={swipeHint}
            style={{
              transform: `translateX(${dx}px) rotate(${dx / 40}deg)`,
              transition: dragging ? 'none' : `transform ${EXIT_MS}ms ease-out`,
              // Vertical scrolling stays with the browser; horizontal swipes are ours (see CARD_TOUCH_CSS).
              touchAction: 'pan-y',
              // No text selection or callout menu while pressing and dragging the card.
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={cancelGesture}
            onLostPointerCapture={cancelGesture}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            {/* The key rebuilds the card for each new question. Without it the old element is reused and
                flips back with an animation, briefly showing the NEXT card's answer. */}
            <FlipCard key={`${current.id}-${round}`} card={current} flipped={flipped} direction={settings.studyDirection} />
          </div>

          <p className="study-hint">Tap the card to flip it. Swipe right when you know it, left to see it again.</p>

          <div className="study-actions">
            <button type="button" className="btn btn-quiet" onClick={again}>
              Show again
            </button>
            <button type="button" className="btn btn-primary" onClick={know}>
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
