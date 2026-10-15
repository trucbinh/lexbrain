import type { Card } from './types';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };
const DAY = 24 * 60 * 60 * 1000;

export interface SrsState {
  ease: number;
  interval: number;
  reps: number;
  dueAt: string;
}

/** SM-2 scheduling. "again" re-queues the card in 10 minutes instead of tomorrow. */
export function schedule(
  card: Pick<Card, 'ease' | 'interval' | 'reps'>,
  grade: Grade,
  now: Date = new Date(),
): SrsState {
  const q = QUALITY[grade];
  let ease = card.ease ?? 2.5;
  let reps = card.reps ?? 0;
  let interval = card.interval ?? 0;

  if (q < 3) {
    reps = 0;
    interval = 0;
    return { ease: Math.max(1.3, ease - 0.2), interval, reps, dueAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString() };
  }

  reps += 1;
  if (reps === 1) interval = 1;
  else if (reps === 2) interval = 6;
  else interval = Math.round(interval * ease);

  ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return { ease, interval, reps, dueAt: new Date(now.getTime() + interval * DAY).toISOString() };
}

export function isDue(card: Pick<Card, 'dueAt'>, now: Date = new Date()): boolean {
  return !card.dueAt || new Date(card.dueAt).getTime() <= now.getTime();
}
