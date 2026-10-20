import { getDb, type CardRow } from './db';
import { isDue, schedule, type Grade } from './srs';
import { detectKind, newId, normalizeSelection } from './text';
import type { Card, CardKind, CardStatus, NewCardInput } from './types';

export const LOCAL_USER = 'local';

export interface CardFilter {
  status?: CardStatus | 'all';
  kind?: CardKind | 'all';
  search?: string;
}

const now = () => new Date().toISOString();

/** Adds a card. If the same text + target language already exists, that card is updated instead. */
export async function addCard(input: NewCardInput, userId = LOCAL_USER): Promise<Card> {
  return saveCard(input, userId);
}

async function saveCard(input: NewCardInput, userId: string): Promise<Card> {
  const db = getDb();
  const sourceText = normalizeSelection(input.sourceText);
  if (!sourceText) throw new Error('Nothing to save: the text is empty.');
  const sourceKey = sourceText.toLowerCase();

  return db.transaction('rw', db.cards, async () => {
    const existing = await db.cards
      .where('[targetLang+sourceKey]')
      .equals([input.targetLang, sourceKey])
      .filter((c) => !c.deletedAt)
      .first();

    const stamp = now();
    if (existing) {
      const updated: CardRow = {
        ...existing,
        translatedText: input.translatedText,
        contextSentence: input.contextSentence ?? existing.contextSentence,
        sourceUrl: input.sourceUrl ?? existing.sourceUrl,
        sourceTitle: input.sourceTitle ?? existing.sourceTitle,
        note: input.note ?? existing.note,
        status: 'learning',
        updatedAt: stamp,
      };
      await db.cards.put(updated);
      return updated;
    }

    const card: CardRow = {
      id: newId(),
      userId,
      kind: detectKind(sourceText),
      sourceText,
      sourceLang: input.sourceLang ?? 'auto',
      translatedText: input.translatedText.trim(),
      targetLang: input.targetLang,
      contextSentence: input.contextSentence,
      sourceUrl: input.sourceUrl,
      sourceTitle: input.sourceTitle,
      note: input.note,
      status: 'learning',
      createdAt: stamp,
      updatedAt: stamp,
      ease: 2.5,
      interval: 0,
      reps: 0,
    };
    await db.cards.add(card);
    return card;
  });
}

export async function listCards(filter: CardFilter = {}): Promise<Card[]> {
  const { status = 'all', kind = 'all', search } = filter;
  const q = search?.trim().toLowerCase();
  const rows = await getDb().cards.orderBy('updatedAt').reverse().toArray();
  return rows.filter(
    (c) =>
      !c.deletedAt &&
      (status === 'all' || c.status === status) &&
      (kind === 'all' || c.kind === kind) &&
      (!q || c.sourceText.toLowerCase().includes(q) || c.translatedText.toLowerCase().includes(q)),
  );
}

/** Learning cards that are due, oldest due first. Pass includeNotDue to review everything. */
export async function getStudyQueue(limit = 50, includeNotDue = false): Promise<Card[]> {
  const rows = await listCards({ status: 'learning' });
  const due = includeNotDue ? rows : rows.filter((c) => isDue(c));
  return due
    .sort((a, b) => (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt))
    .slice(0, limit);
}

export async function countCards(): Promise<{ learning: number; mastered: number }> {
  const rows = await listCards();
  return {
    learning: rows.filter((c) => c.status === 'learning').length,
    mastered: rows.filter((c) => c.status === 'mastered').length,
  };
}

async function patch(id: string, changes: Partial<CardRow>): Promise<void> {
  const indexes: Partial<CardRow> = {};
  if (typeof changes.sourceText === 'string') {
    indexes.sourceKey = normalizeSelection(changes.sourceText).toLowerCase();
  }
  if ('deletedAt' in changes) indexes.isActive = changes.deletedAt ? 0 : 1;
  await getDb().cards.update(id, { ...changes, ...indexes, updatedAt: now() });
}

export const markMastered = (id: string) => patch(id, { status: 'mastered' });
export const restoreCard = (id: string) => patch(id, { status: 'learning', dueAt: undefined, reps: 0, interval: 0 });
export const updateCard = (id: string, changes: Partial<Pick<Card, 'translatedText' | 'note' | 'sourceText'>>) =>
  patch(id, changes);

/** Soft delete (tombstone) so the deletion can sync to other devices. */
export const deleteCard = (id: string) => patch(id, { deletedAt: now(), isActive: 0 });

export async function reviewCard(card: Card, grade: Grade): Promise<void> {
  const next = schedule(card, grade);
  await patch(card.id, next);
}

export function cardsToCsv(cards: Card[]): string {
  const esc = (v: string | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const header = ['source', 'translation', 'sourceLang', 'targetLang', 'kind', 'context', 'url', 'status'];
  const rows = cards.map((c) =>
    [c.sourceText, c.translatedText, c.sourceLang, c.targetLang, c.kind, c.contextSentence, c.sourceUrl, c.status]
      .map(esc)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}
