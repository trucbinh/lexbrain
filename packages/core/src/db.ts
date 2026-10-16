import Dexie, { type Table } from 'dexie';
import { normalizeSelection } from './text';
import type { Card } from './types';

interface IndexedCard extends Card {
  sourceKey?: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export interface TranslationCacheRow {
  key: string;
  translatedText: string;
  detectedLang?: string;
  createdAt: string;
}

export class LexBrainDB extends Dexie {
  cards!: Table<IndexedCard, string>;
  settings!: Table<SettingRow, string>;
  translationCache!: Table<TranslationCacheRow, string>;

  constructor(name = 'lexbrain') {
    super(name);
    this.version(1).stores({
      cards: 'id, status, kind, targetLang, sourceLang, updatedAt, dueAt, deletedAt',
      settings: 'key',
      translationCache: 'key, createdAt',
    });
    this.version(2)
      .stores({
        cards: 'id, status, kind, targetLang, sourceLang, updatedAt, dueAt, deletedAt, [targetLang+sourceKey]',
        settings: 'key',
        translationCache: 'key, createdAt',
      })
      .upgrade(async (transaction) => {
        await transaction.table('cards').toCollection().modify((card: IndexedCard) => {
          card.sourceKey = normalizeSelection(card.sourceText).toLowerCase();
        });
      });

    this.cards.hook('creating', (_key, card) => {
      card.sourceKey = normalizeSelection(card.sourceText).toLowerCase();
    });
    this.cards.hook('updating', (changes) => {
      const cardChanges = changes as Partial<IndexedCard>;
      if (typeof cardChanges.sourceText === 'string') {
        cardChanges.sourceKey = normalizeSelection(cardChanges.sourceText).toLowerCase();
      }
    });
  }
}

let instance: LexBrainDB | undefined;

/** Lazy singleton so importing the package never opens IndexedDB by itself. */
export function getDb(): LexBrainDB {
  instance ??= new LexBrainDB();
  return instance;
}

/** For tests: swap in a different database. */
export function setDb(db: LexBrainDB | undefined): void {
  instance = db;
}
