import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { LexBrainDB, setDb } from './db';
import {
  addCard,
  addCardWithLimit,
  CardLimitReachedError,
  cardsToCsv,
  deleteCard,
  getStudyQueue,
  listCards,
  markMastered,
  restoreCard,
  reviewCard,
} from './repository';

let n = 0;
beforeEach(() => {
  setDb(new LexBrainDB(`test-${n++}`));
});

const base = { translatedText: 'bonjour', targetLang: 'fr', sourceLang: 'en' };

describe('repository', () => {
  it('adds cards and detects their kind', async () => {
    const word = await addCard({ ...base, sourceText: 'hello' });
    const sentence = await addCard({ ...base, sourceText: 'The weather is lovely today.' });
    expect(word.kind).toBe('word');
    expect(sentence.kind).toBe('sentence');
    expect(await listCards()).toHaveLength(2);
  });

  it('does not duplicate the same text for the same target language', async () => {
    const a = await addCard({ ...base, sourceText: 'Hello' });
    const b = await addCard({ ...base, sourceText: '  hello ', translatedText: 'salut' });
    expect(b.id).toBe(a.id);
    expect(b.translatedText).toBe('salut');
    expect(await listCards()).toHaveLength(1);
  });

  it('enforces the active-card limit atomically while allowing duplicate updates', async () => {
    const first = await addCardWithLimit({ ...base, sourceText: 'Hello' }, 1);
    const updated = await addCardWithLimit({ ...base, sourceText: 'hello', translatedText: 'salut' }, 1);

    expect(updated.id).toBe(first.id);
    await expect(addCardWithLimit({ ...base, sourceText: 'goodbye' }, 1)).rejects.toBeInstanceOf(CardLimitReachedError);

    await deleteCard(first.id);
    await expect(addCardWithLimit({ ...base, sourceText: 'goodbye' }, 1)).resolves.toMatchObject({
      sourceText: 'goodbye',
    });
  });

  it('does not allow concurrent limited saves to exceed the card limit', async () => {
    const results = await Promise.allSettled([
      addCardWithLimit({ ...base, sourceText: 'first' }, 1),
      addCardWithLimit({ ...base, sourceText: 'second' }, 1),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await listCards()).toHaveLength(1);
  });

  it('indexes existing cards during the database upgrade', async () => {
    const name = `legacy-${n++}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      cards: 'id, status, kind, targetLang, sourceLang, updatedAt, dueAt, deletedAt',
      settings: 'key',
      translationCache: 'key, createdAt',
    });
    await legacy.table('cards').add({
      id: 'legacy-card',
      userId: 'local',
      kind: 'word',
      sourceText: 'Hello',
      sourceLang: 'en',
      translatedText: 'bonjour',
      targetLang: 'fr',
      status: 'learning',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ease: 2.5,
      interval: 0,
      reps: 0,
    });
    legacy.close();
    setDb(new LexBrainDB(name));

    const updated = await addCard({ ...base, sourceText: 'hello' });

    expect(updated.id).toBe('legacy-card');
    expect(await listCards()).toHaveLength(1);
  });

  it('rejects empty text', async () => {
    await expect(addCard({ ...base, sourceText: '   ' })).rejects.toThrow(/empty/);
  });

  it('archives instead of deleting, and can restore', async () => {
    const c = await addCard({ ...base, sourceText: 'ephemeral' });
    await markMastered(c.id);
    expect(await listCards({ status: 'learning' })).toHaveLength(0);
    expect(await listCards({ status: 'mastered' })).toHaveLength(1);
    await restoreCard(c.id);
    expect(await listCards({ status: 'learning' })).toHaveLength(1);
  });

  it('soft-deletes with a tombstone', async () => {
    const c = await addCard({ ...base, sourceText: 'gone' });
    await deleteCard(c.id);
    expect(await listCards()).toHaveLength(0);
  });

  it('hides cards from the study queue until due after a review', async () => {
    const c = await addCard({ ...base, sourceText: 'queue' });
    expect(await getStudyQueue()).toHaveLength(1);
    await reviewCard(c, 'good');
    expect(await getStudyQueue()).toHaveLength(0);
    expect(await getStudyQueue(50, true)).toHaveLength(1);
  });

  it('filters by search text and exports CSV with escaped quotes', async () => {
    await addCard({ ...base, sourceText: 'say "hi"', translatedText: 'dis "salut"' });
    await addCard({ ...base, sourceText: 'other', translatedText: 'autre' });
    const found = await listCards({ search: 'salut' });
    expect(found).toHaveLength(1);
    expect(cardsToCsv(found)).toContain('"say ""hi"""');
  });
});

describe('settings', () => {
  it('does not lose updates when saves overlap', async () => {
    const { saveSettings, getSettings } = await import('./settings');
    await Promise.all([saveSettings({ apiBaseUrl: 'https://api.example.com' }), saveSettings({ targetLang: 'es' })]);
    const s = await getSettings();
    expect(s.apiBaseUrl).toBe('https://api.example.com');
    expect(s.targetLang).toBe('es');
  });
});
