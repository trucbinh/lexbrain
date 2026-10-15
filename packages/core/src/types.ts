export type CardKind = 'word' | 'sentence' | 'paragraph';
export type CardStatus = 'learning' | 'mastered';
export type StudyDirection = 'source-to-target' | 'target-to-source';

/** A saved word, sentence or paragraph with its translation. */
export interface Card {
  /** Client-generated UUID, so cards can be created offline. */
  id: string;
  userId: string;
  kind: CardKind;
  sourceText: string;
  /** BCP-47 code, or "auto" when the language was not detected. */
  sourceLang: string;
  translatedText: string;
  targetLang: string;
  /** The sentence the word was found in. */
  contextSentence?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  note?: string;
  status: CardStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601 - drives sync
  /** Tombstone: set instead of removing the row so deletes can sync. */
  deletedAt?: string;
  // Spaced repetition (SM-2)
  dueAt?: string;
  interval?: number; // days
  ease?: number;
  reps?: number;
}

export interface NewCardInput {
  sourceText: string;
  translatedText: string;
  sourceLang?: string;
  targetLang: string;
  contextSentence?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  note?: string;
}

export interface TranslateResult {
  translatedText: string;
  detectedLang?: string;
  provider: string;
}

export interface AppSettings {
  targetLang: string;
  studyDirection: StudyDirection;
  /** Base URL for the legacy sync API. The mobile app does not expose or use sync. */
  apiBaseUrl: string;
  /** Server time of the last successful pull (the pull cursor). */
  lastSyncAt?: string;
  /** Local clock time when the last successful push started (the push cursor). */
  lastPushAt?: string;
}
