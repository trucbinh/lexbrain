import type { CardKind } from './types';

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const SENTENCE_END = /[.!?。！？…]+["')\]”’]*(\s|$)/g;

/** Trim, drop zero-width characters and collapse whitespace runs. */
export function normalizeSelection(text: string): string {
  return text.replace(ZERO_WIDTH, '').replace(/\s+/g, ' ').trim();
}

export function countWords(text: string): number {
  const t = normalizeSelection(text);
  if (!t) return 0;
  return t.split(' ').length;
}

/**
 * word      - up to 3 words (or 4 CJK characters) with no sentence punctuation
 * sentence  - a single sentence, up to ~40 words
 * paragraph - anything longer, or with several sentences / line breaks
 */
export function detectKind(raw: string): CardKind {
  const text = raw.replace(ZERO_WIDTH, '').trim();
  if (!text) return 'word';
  const hasBreak = /\n\s*\n/.test(text);
  const flat = normalizeSelection(text);
  const enders = (flat.match(SENTENCE_END) ?? []).length;

  if (CJK.test(flat) && !flat.includes(' ')) {
    if (flat.length <= 4 && enders === 0) return 'word';
    if (flat.length <= 80 && enders <= 1) return 'sentence';
    return 'paragraph';
  }

  const words = countWords(flat);
  if (hasBreak || enders >= 2 || words > 40) return 'paragraph';
  if (words <= 3 && enders === 0) return 'word';
  return 'sentence';
}

/**
 * Finds the sentence in `container` that contains `selected`.
 * Returns undefined when the selection is not found or is already sentence-sized.
 */
export function extractContextSentence(container: string, selected: string): string | undefined {
  const sel = normalizeSelection(selected);
  if (!sel || detectKind(sel) !== 'word') return undefined;
  const flat = container.replace(ZERO_WIDTH, '').replace(/\s+/g, ' ');
  const idx = flat.toLowerCase().indexOf(sel.toLowerCase());
  if (idx < 0) return undefined;

  const boundary = /[.!?。！？]/;
  let start = idx;
  while (start > 0 && !boundary.test(flat[start - 1] ?? '')) start--;
  let end = idx + sel.length;
  while (end < flat.length && !boundary.test(flat[end - 1] ?? '')) end++;

  const sentence = flat.slice(start, end).trim();
  if (!sentence || sentence.toLowerCase() === sel.toLowerCase()) return undefined;
  return sentence.length > 400 ? sentence.slice(0, 397) + '…' : sentence;
}

/** Splits text into chunks of at most `max` characters, preferring sentence boundaries. */
export function chunkText(text: string, max = 450): string[] {
  const flat = text.trim();
  if (flat.length <= max) return [flat];
  const parts = flat.split(/(?<=[.!?。！？])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const part of parts) {
    if ((current + ' ' + part).trim().length <= max) {
      current = (current + ' ' + part).trim();
      continue;
    }
    if (current) chunks.push(current);
    if (part.length <= max) {
      current = part;
    } else {
      for (let i = 0; i < part.length; i += max) chunks.push(part.slice(i, i + max));
      current = '';
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Small synchronous hash (FNV-1a) for cache keys. Not cryptographic. */
export function cacheKey(text: string, source: string, target: string): string {
  const input = `${source}|${target}|${text}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${source}:${target}:${(h >>> 0).toString(36)}:${input.length}`;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
