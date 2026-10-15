import { describe, expect, it } from 'vitest';
import { chunkText, detectKind, extractContextSentence, normalizeSelection } from './text';

describe('detectKind', () => {
  it('classifies short selections as words', () => {
    expect(detectKind('serendipity')).toBe('word');
    expect(detectKind('break the ice')).toBe('word');
    expect(detectKind('日本語')).toBe('word');
  });
  it('classifies single sentences', () => {
    expect(detectKind('The committee will reconvene on Monday.')).toBe('sentence');
    expect(detectKind('これはペンです。')).toBe('sentence');
  });
  it('classifies long or multi-sentence text as paragraph', () => {
    expect(detectKind('First sentence here. Second sentence follows. A third one.')).toBe('paragraph');
    expect(detectKind('One.\n\nTwo.')).toBe('paragraph');
  });
});

describe('extractContextSentence', () => {
  const article = 'It was raining. The ephemeral nature of fame surprised her. She left early.';
  it('returns the sentence containing the word', () => {
    expect(extractContextSentence(article, 'ephemeral')).toBe('The ephemeral nature of fame surprised her.');
  });
  it('returns undefined when not found or when selection is already a sentence', () => {
    expect(extractContextSentence(article, 'zebra')).toBeUndefined();
    expect(extractContextSentence(article, 'She left early.')).toBeUndefined();
  });
});

describe('helpers', () => {
  it('normalizes whitespace and zero-width characters', () => {
    expect(normalizeSelection('  a\u200b  b \n c ')).toBe('a b c');
  });
  it('chunks long text on sentence boundaries', () => {
    const text = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} is here.`).join(' ');
    const chunks = chunkText(text, 100);
    expect(chunks.every((c) => c.length <= 100)).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });
});
