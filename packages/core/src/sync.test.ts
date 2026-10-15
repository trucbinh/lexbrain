import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexBrainDB, getDb, setDb } from './db';
import { addCard } from './repository';
import { getSettings, saveSettings } from './settings';
import { syncNow } from './sync';
import type { Card } from './types';

let n = 0;
beforeEach(async () => {
  setDb(new LexBrainDB(`sync-test-${n++}`));
  await saveSettings({ apiBaseUrl: 'https://api.example.com/' });
});
afterEach(() => vi.unstubAllGlobals());

const remoteCard = (over: Partial<Card>): Card => ({
  id: 'r1', userId: 'u', kind: 'word', sourceText: 'remote', sourceLang: 'en', translatedText: 'distant',
  targetLang: 'es', status: 'learning', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z', ...over,
});

function stubServer(remote: Card[]) {
  const pushed: Card[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/api/sync/pull')) {
      return new Response(JSON.stringify({ cards: remote, serverTime: '2026-06-01T00:00:00.000Z' }), { status: 200 });
    }
    pushed.push(...(JSON.parse(String(init?.body)).cards as Card[]));
    return new Response(JSON.stringify({ accepted: pushed.length }), { status: 200 });
  }));
  return pushed;
}

describe('syncNow', () => {
  it('pulls new remote cards and pushes local ones, then advances both cursors', async () => {
    const local = await addCard({ sourceText: 'local', translatedText: 'cercano', targetLang: 'es' });
    const pushed = stubServer([remoteCard({})]);

    const result = await syncNow();

    expect(result).toMatchObject({ pulled: 1, pushed: 1 });
    expect(pushed.map((c) => c.id)).toEqual([local.id]);
    expect(await getDb().cards.get('r1')).toBeTruthy();
    const s = await getSettings();
    expect(s.lastSyncAt).toBe('2026-06-01T00:00:00.000Z');
    expect(s.lastPushAt).toBeTruthy();
  });

  it('keeps the local version when it is newer (last write wins)', async () => {
    await getDb().cards.put(remoteCard({ translatedText: 'mine', updatedAt: '2026-03-01T00:00:00.000Z' }));
    stubServer([remoteCard({ translatedText: 'theirs', updatedAt: '2026-02-01T00:00:00.000Z' })]);
    await syncNow();
    expect((await getDb().cards.get('r1'))?.translatedText).toBe('mine');
  });

  it('applies remote tombstones', async () => {
    await getDb().cards.put(remoteCard({}));
    stubServer([remoteCard({ updatedAt: '2026-04-01T00:00:00.000Z', deletedAt: '2026-04-01T00:00:00.000Z' })]);
    await syncNow();
    expect((await getDb().cards.get('r1'))?.deletedAt).toBeTruthy();
  });

  it('does not re-push unchanged cards on the second sync', async () => {
    await addCard({ sourceText: 'once', translatedText: 'una', targetLang: 'es' });
    const pushed = stubServer([]);
    await syncNow();
    pushed.length = 0;
    const second = await syncNow();
    expect(second.pushed).toBe(0);
    expect(pushed).toHaveLength(0);
  });

  it('explains how to fix a missing API address', async () => {
    await saveSettings({ apiBaseUrl: '' });
    await expect(syncNow()).rejects.toThrow(/API URL/);
  });
});
