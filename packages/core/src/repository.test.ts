import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { LexBrainDB, setDb } from './db';
import { backupDatabaseForVersion, restoreDatabaseIfEmpty } from './backup';
import {
  addCard,
  cardsToCsv,
  deleteCard,
  getStudyQueue,
  listCards,
  markMastered,
  restoreCard,
  reviewCard,
} from './repository';
import { getSettings, saveSettings } from './settings';

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

  it('allows more than 20 cards', async () => {
    for (let index = 0; index < 21; index += 1) {
      await addCard({ ...base, sourceText: `word ${index}` });
    }

    expect(await listCards()).toHaveLength(21);
  });

  it('backs up once per app version and restores the newest snapshot if the database is empty', async () => {
    const name = `backup-${n++}`;
    const original = new LexBrainDB(name);
    setDb(original);
    await addCard({ ...base, sourceText: 'remember me' });
    await backupDatabaseForVersion('1.0.0', original);
    await saveSettings({ targetLang: 'de' });
    await addCard({ ...base, sourceText: 'added later' });
    await backupDatabaseForVersion('1.0.0', original);

    const backups = new Dexie(`${name}-auto-backup`);
    backups.version(1).stores({ snapshots: 'id, createdAt' });
    const firstVersionSnapshot = await backups.table('snapshots').get('1.0.0');
    expect(firstVersionSnapshot?.cards).toHaveLength(1);

    await backupDatabaseForVersion('1.1.0', original);
    const nextVersionSnapshot = await backups.table('snapshots').get('1.1.0');
    expect(nextVersionSnapshot?.cards).toHaveLength(2);
    await backups.close();

    original.close();
    await original.delete();

    const empty = new LexBrainDB(name);
    setDb(empty);
    expect(await restoreDatabaseIfEmpty()).toBe(true);
    expect(await listCards()).toHaveLength(2);
    expect(await getSettings()).toMatchObject({ targetLang: 'de' });
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
