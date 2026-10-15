import Dexie, { type Table } from 'dexie';
import type { Card } from './types';

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
  cards!: Table<Card, string>;
  settings!: Table<SettingRow, string>;
  translationCache!: Table<TranslationCacheRow, string>;

  constructor(name = 'lexbrain') {
    super(name);
    this.version(1).stores({
      cards: 'id, status, kind, targetLang, sourceLang, updatedAt, dueAt, deletedAt',
      settings: 'key',
      translationCache: 'key, createdAt',
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
