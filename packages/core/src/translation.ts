import { getDb } from './db';
import { cacheKey, chunkText, normalizeSelection } from './text';
import type { TranslateResult } from './types';

export interface TranslationProvider {
  readonly name: string;
  translate(text: string, target: string, source?: string): Promise<TranslateResult>;
}

/** Uses Google's undocumented, keyless Translate web endpoint. It may change without notice. */
export class GoogleTranslateProvider implements TranslationProvider {
  readonly name = 'google-translate';

  async translate(text: string, target: string, source?: string): Promise<TranslateResult> {
    const from = !source || source === 'auto' ? 'auto' : source;
    const parts: string[] = [];
    let detectedLang: string | undefined;
    for (const chunk of chunkText(text, 4500)) {
      const params = new URLSearchParams({ client: 'gtx', sl: from, tl: target, dt: 't', q: chunk });
      const url = `https://translate.googleapis.com/translate_a/single?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Google Translate request failed (${res.status}).`);
      const data: unknown = await res.json();
      if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Google Translate returned an invalid response.');
      const translated = data[0]
        .filter((segment: unknown) => Array.isArray(segment) && typeof segment[0] === 'string')
        .map((segment: unknown[]) => segment[0] as string)
        .join('');
      if (!translated) throw new Error('Google Translate returned no translation.');
      parts.push(translated);
      if (typeof data[2] === 'string') detectedLang = data[2];
    }
    return { translatedText: parts.join(' '), detectedLang, provider: this.name };
  }
}

export function createTranslator(): TranslationProvider {
  return new GoogleTranslateProvider();
}

/** Translates with a local cache so repeated lookups never hit the network. */
export async function translateWithCache(
  provider: TranslationProvider,
  rawText: string,
  target: string,
  source = 'auto',
): Promise<TranslateResult> {
  const text = normalizeSelection(rawText);
  if (!text) throw new Error('Select some text first.');
  const db = getDb();
  const key = cacheKey(text, source, target);

  const hit = await db.translationCache.get(key);
  if (hit) return { translatedText: hit.translatedText, detectedLang: hit.detectedLang, provider: 'cache' };

  const result = await provider.translate(text, target, source);
  await db.translationCache.put({
    key,
    translatedText: result.translatedText,
    detectedLang: result.detectedLang,
    createdAt: new Date().toISOString(),
  });
  return result;
}
