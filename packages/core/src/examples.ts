import { normalizeSelection } from './text';

const TATOEBA_API_URL = 'https://api.tatoeba.org/v1/sentences';
const TATOEBA_SOURCE_URL = 'https://tatoeba.org/en/sentences/show';
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 5;
const DEFAULT_TIMEOUT_MS = 8000;

const TATOEBA_LANGUAGES: Record<string, string> = {
  en: 'eng',
  hi: 'hin',
  mr: 'mar',
  gu: 'guj',
  bn: 'ben',
  ta: 'tam',
  te: 'tel',
  vi: 'vie',
  'zh-cn': 'cmn',
  'zh-tw': 'cmn',
  ja: 'jpn',
  ko: 'kor',
  th: 'tha',
  id: 'ind',
  es: 'spa',
  fr: 'fra',
  de: 'deu',
  it: 'ita',
  pt: 'por',
  nl: 'nld',
  pl: 'pol',
  sv: 'swe',
  ru: 'rus',
  uk: 'ukr',
  tr: 'tur',
  ar: 'ara',
};

export interface ExampleSentenceSuggestion {
  id: number;
  text: string;
  language: string;
  source: 'Tatoeba';
  url: string;
}

export interface ExampleSentenceLookupOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  limit?: number;
}

interface TatoebaSentence {
  id: number;
  text: string;
  lang: string;
  license: string;
  is_unapproved: boolean;
}

interface TatoebaResponse {
  data: unknown[];
}

export function tatoebaLanguageCode(sourceLanguage: string | undefined): string | undefined {
  const key = sourceLanguage?.trim().toLowerCase();
  return key ? TATOEBA_LANGUAGES[key] : undefined;
}

function makeSearchQuery(rawText: string): string {
  const tokens = normalizeSelection(rawText).match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  return tokens.length ? `"${tokens.join(' ')}"` : '';
}

function isSentence(value: unknown, language: string): value is TatoebaSentence {
  if (!value || typeof value !== 'object') return false;
  const sentence = value as Partial<TatoebaSentence>;
  return (
    typeof sentence.id === 'number' &&
    Number.isSafeInteger(sentence.id) &&
    sentence.id > 0 &&
    typeof sentence.text === 'string' &&
    sentence.text.trim().length > 0 &&
    sentence.lang === language &&
    sentence.license === 'CC0 1.0' &&
    sentence.is_unapproved === false
  );
}

function resultLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

export async function findExampleSentences(
  rawText: string,
  sourceLanguage: string | undefined,
  options: ExampleSentenceLookupOptions = {},
): Promise<ExampleSentenceSuggestion[]> {
  const language = tatoebaLanguageCode(sourceLanguage);
  const query = makeSearchQuery(rawText);
  if (!language || !query) return [];

  const parameters = new URLSearchParams({
    lang: language,
    q: query,
    is_unapproved: 'no',
    license: 'CC0 1.0',
    sort: 'relevance',
    limit: String(resultLimit(options.limit)),
  });
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const cancel = () => controller.abort();
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort', cancel, { once: true });

  try {
    const response = await fetch(`${TATOEBA_API_URL}?${parameters}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Tatoeba request failed (${response.status}).`);

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !Array.isArray((payload as TatoebaResponse).data)) {
      throw new Error('Tatoeba returned an invalid response.');
    }

    const seen = new Set<number>();
    return ((payload as TatoebaResponse).data as unknown[])
      .filter((sentence): sentence is TatoebaSentence => isSentence(sentence, language))
      .filter((sentence) => {
        if (seen.has(sentence.id)) return false;
        seen.add(sentence.id);
        return true;
      })
      .slice(0, resultLimit(options.limit))
      .map((sentence) => ({
        id: sentence.id,
        text: sentence.text.trim(),
        language: sentence.lang,
        source: 'Tatoeba',
        url: `${TATOEBA_SOURCE_URL}/${sentence.id}`,
      }));
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
  }
}
