import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTranslator, GoogleTranslateProvider } from './translation';

afterEach(() => vi.unstubAllGlobals());

describe('GoogleTranslateProvider', () => {
  it('calls Google Translate and maps the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([[["Hola", "Hello"]], null, 'en']), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createTranslator().translate('Hello', 'es');
    const requestUrl = fetchMock.mock.calls[0]?.[0];
    expect(requestUrl).toBeDefined();
    const url = new URL(requestUrl as string);

    expect(url.origin).toBe('https://translate.googleapis.com');
    expect(url.searchParams.get('sl')).toBe('auto');
    expect(url.searchParams.get('tl')).toBe('es');
    expect(url.searchParams.get('q')).toBe('Hello');
    expect(result).toEqual({ translatedText: 'Hola', detectedLang: 'en', provider: 'google-translate' });
  });

  it('reports failed requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));

    await expect(new GoogleTranslateProvider().translate('Hello', 'es')).rejects.toThrow(/503/);
  });
});