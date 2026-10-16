import { getDb, type CardRow } from './db';
import { getSettings, saveSettings } from './settings';
import { normalizeSelection } from './text';
import type { Card } from './types';

interface PullResponse {
  cards: Card[];
  serverTime: string;
}

export interface SyncResult {
  pulled: number;
  pushed: number;
  at: string;
}

/**
 * Last-write-wins sync by `updatedAt`, with tombstones for deletes.
 * `getHeaders` is where the access token goes once authentication is added.
 */
export async function syncNow(getHeaders: () => Promise<Record<string, string>> = async () => ({})): Promise<SyncResult> {
  const settings = await getSettings();
  if (!settings.apiBaseUrl.trim()) throw new Error('Set the API URL in Settings to enable sync.');
  const base = settings.apiBaseUrl.trim().replace(/\/+$/, '');
  const headers = { 'Content-Type': 'application/json', ...(await getHeaders()) };
  const db = getDb();
  const since = settings.lastSyncAt ?? '';
  // Two separate cursors: the pull cursor is SERVER time, the push cursor is LOCAL time. Comparing a
  // local updatedAt with a server timestamp would silently skip edits when the device clock is behind.
  const pushSince = settings.lastPushAt ?? '';
  const startedAt = new Date().toISOString();

  // 1. Pull
  const pullRes = await fetch(`${base}/api/sync/pull?since=${encodeURIComponent(since)}`, { headers });
  if (!pullRes.ok) throw new Error(`Sync pull failed (${pullRes.status}).`);
  const pull = (await pullRes.json()) as PullResponse;

  const applied = new Set<string>();
  await db.transaction('rw', db.cards, async () => {
    for (const remote of pull.cards) {
      const local = await db.cards.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        const indexedRemote: CardRow = {
          ...remote,
          sourceKey: normalizeSelection(remote.sourceText).toLowerCase(),
          isActive: remote.deletedAt ? 0 : 1,
        };
        await db.cards.put(indexedRemote);
        applied.add(remote.id);
      }
    }
  });
  const pulled = applied.size;

  // 2. Push everything changed locally since the last sync
  // Skip cards we just received: pushing them back would only echo the server's own data.
  const changed = (await db.cards.where('updatedAt').above(pushSince).toArray()).filter((c) => !applied.has(c.id));
  for (let i = 0; i < changed.length; i += 200) {
    const batch = changed.slice(i, i + 200).map(({ sourceKey: _sourceKey, isActive: _isActive, ...card }) => card);
    const res = await fetch(`${base}/api/sync/push`, { method: 'POST', headers, body: JSON.stringify({ cards: batch }) });
    if (!res.ok) throw new Error(`Sync push failed (${res.status}).`);
  }

  await saveSettings({ lastSyncAt: pull.serverTime, lastPushAt: startedAt });
  return { pulled, pushed: changed.length, at: pull.serverTime };
}
