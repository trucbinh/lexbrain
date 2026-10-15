import { describe, expect, it } from 'vitest';
import { isDue, schedule } from './srs';

describe('schedule (SM-2)', () => {
  const t0 = new Date('2026-01-01T00:00:00Z');
  it('re-queues failed cards within minutes', () => {
    const s = schedule({ ease: 2.5, interval: 6, reps: 2 }, 'again', t0);
    expect(s.reps).toBe(0);
    expect(new Date(s.dueAt).getTime() - t0.getTime()).toBe(10 * 60 * 1000);
  });
  it('follows the 1 -> 6 -> ease-multiplied progression', () => {
    const a = schedule({ ease: 2.5, interval: 0, reps: 0 }, 'good', t0);
    expect(a.interval).toBe(1);
    const b = schedule(a, 'good', t0);
    expect(b.interval).toBe(6);
    const c = schedule(b, 'good', t0);
    expect(c.interval).toBe(Math.round(6 * b.ease));
  });
  it('never lets ease drop below 1.3', () => {
    let s = { ease: 1.35, interval: 1, reps: 1 };
    for (let i = 0; i < 5; i++) s = { ...schedule(s, 'again', t0) };
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
  });
  it('treats missing dueAt as due', () => {
    expect(isDue({}, t0)).toBe(true);
  });
});
