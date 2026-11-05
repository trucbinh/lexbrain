import { afterEach, describe, expect, it, vi } from 'vitest';
import { findExampleSentences, tatoebaLanguageCode } from './examples';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('tatoebaLanguageCode', () => {
  it.each([
    ['en', 'eng'],
    ['hi', 'hin'],
    ['mr', 'mar'],
    ['gu', 'guj'],
    ['bn', 'ben'],
    ['ta', 'tam'],
    ['te', 'tel'],
    ['vi', 'vie'],
    ['zh-CN', 'cmn'],
    ['zh-TW', 'cmn'],
    ['ja', 'jpn'],
    ['ko', 'kor'],
    ['th', 'tha'],
    ['id', 'ind'],
    ['es', 'spa'],
    ['fr', 'fra'],
    ['de', 'deu'],
    ['it', 'ita'],
    ['pt', 'por'],
    ['nl', 'nld'],
    ['pl', 'pol'],
    ['sv', 'swe'],
    ['ru', 'rus'],
    ['uk', 'ukr'],
    ['tr', 'tur'],
    ['ar', 'ara'],
  ])('maps %s to %s', (sourceLanguage, tatoebaLanguage) => {
    expect(tatoebaLanguageCode(sourceLanguage)).toBe(tatoebaLanguage);
  });

  it('does not map unknown, missing, or auto-detected languages', () => {
    expect(tatoebaLanguageCode('xx')).toBeUndefined();
    expect(tatoebaLanguageCode(undefined)).toBeUndefined();
    expect(tatoebaLanguageCode('auto')).toBeUndefined();
  });
});

describe('findExampleSentences', () => {
  it('queries the detected language and returns only approved CC0 matches', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: 21, text: 'I found a quiet path.', lang: 'eng', license: 'CC0 1.0', is_unapproved: false },
            { id: 22, text: 'Unapproved example.', lang: 'eng', license: 'CC0 1.0', is_unapproved: true },
            { id: 23, text: 'Attribution required.', lang: 'eng', license: 'CC BY 2.0 FR', is_unapproved: false },
            { id: 24, text: 'Wrong language.', lang: 'fra', license: 'CC0 1.0', is_unapproved: false },
            { id: 25, text: '   ', lang: 'eng', license: 'CC0 1.0', is_unapproved: false },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const suggestions = await findExampleSentences('quiet path', 'en');
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(requestUrl);

    expect(url.origin).toBe('https://api.tatoeba.org');
    expect(url.pathname).toBe('/v1/sentences');
    expect(url.searchParams.get('lang')).toBe('eng');
    expect(url.searchParams.get('q')).toBe('"quiet path"');
    expect(url.searchParams.get('is_unapproved')).toBe('no');
    expect(url.searchParams.get('license')).toBe('CC0 1.0');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(requestInit.signal).toBeInstanceOf(AbortSignal);
    expect(suggestions).toEqual([
      {
        id: 21,
        text: 'I found a quiet path.',
        language: 'eng',
        source: 'Tatoeba',
        url: 'https://tatoeba.org/en/sentences/show/21',
      },
    ]);
  });

  it('caps the number of requested and returned suggestions at five', async () => {
    const data = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      text: `Sentence ${index + 1}.`,
      lang: 'eng',
      license: 'CC0 1.0',
      is_unapproved: false,
    }));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const suggestions = await findExampleSentences('sample', 'en', { limit: 50 });
    const url = new URL(fetchMock.mock.calls[0]?.[0] as string);

    expect(url.searchParams.get('limit')).toBe('5');
    expect(suggestions).toHaveLength(5);
  });

  it('treats punctuation in input as literal words rather than search operators', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await findExampleSentences('walk (home) | "now"', 'en');
    const url = new URL(fetchMock.mock.calls[0]?.[0] as string);

    expect(url.searchParams.get('q')).toBe('"walk home now"');
  });

  it('does not make a request for blank input or an unmapped language', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(findExampleSentences('   ', 'en')).resolves.toEqual([]);
    await expect(findExampleSentences('hello', 'auto')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an empty result for a valid response with no sentences', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 })));

    await expect(findExampleSentences('hello', 'en')).resolves.toEqual([]);
  });

  it('rejects failed and malformed responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(findExampleSentences('hello', 'en')).rejects.toThrow(/503/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 })));
    await expect(findExampleSentences('hello', 'en')).rejects.toThrow(/invalid response/i);
  });

  it('aborts a request after the configured timeout', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);

    const request = findExampleSentences('hello', 'en', { timeoutMs: 25 });
    const rejected = expect(request).rejects.toThrow(/abort/i);
    await vi.advanceTimersByTimeAsync(25);
    await rejected;
  });
});
