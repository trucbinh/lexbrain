/** Messages between the content script (page) and the background service worker (storage + network). */
export type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface SavePayload {
  sourceText: string;
  translatedText: string;
  targetLang: string;
  sourceLang?: string;
  contextSentence?: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export type Req =
  | { type: 'lexbrain/init' }
  | { type: 'lexbrain/translate'; text: string; target: string }
  | ({ type: 'lexbrain/save' } & SavePayload);

export type InitRes = Res<{ targetLang: string }>;
export type TranslateRes = Res<{ translatedText: string; detectedLang?: string }>;
export type SaveRes = Res;
