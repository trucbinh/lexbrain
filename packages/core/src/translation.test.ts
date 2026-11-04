import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTranslator, GoogleTranslateProvider, translateWithRetry, type TranslationProvider } from './translation';

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

  it('retries transient failures with bounded attempts', async () => {
    vi.useFakeTimers();
    try {
      const provider: TranslationProvider = {
        name: 'test',
        translate: vi.fn()
          .mockRejectedValueOnce(new TypeError('Network unavailable'))
          .mockRejectedValueOnce(new TypeError('Connection interrupted'))
          .mockResolvedValue({ translatedText: 'Hola', detectedLang: 'en', provider: 'test' }),
      };
      const translation = translateWithRetry(provider, 'Hello', 'es');
      const assertion = expect(translation).resolves.toMatchObject({ translatedText: 'Hola' });
      await vi.advanceTimersByTimeAsync(250);
      await vi.advanceTimersByTimeAsync(500);
      await assertion;
      expect(provider.translate).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not retry when the app is no longer eligible to retry', async () => {
    const provider: TranslationProvider = {
      name: 'test',
      translate: vi.fn().mockRejectedValue(new TypeError('Network unavailable')),
    };
    await expect(translateWithRetry(provider, 'Hello', 'es', 'auto', { shouldRetry: () => false })).rejects.toThrow(
      'Network unavailable',
    );
    expect(provider.translate).toHaveBeenCalledTimes(1);
  });

  it('stops retrying when the app becomes inactive during backoff', async () => {
    vi.useFakeTimers();
    try {
      let active = true;
      const provider: TranslationProvider = {
        name: 'test',
        translate: vi.fn()
          .mockRejectedValueOnce(new TypeError('Network unavailable'))
          .mockResolvedValue({ translatedText: 'Hola', detectedLang: 'en', provider: 'test' }),
      };
      const translation = translateWithRetry(provider, 'Hello', 'es', 'auto', { shouldRetry: () => active });
      const assertion = expect(translation).rejects.toThrow('Network unavailable');
      await vi.advanceTimersByTimeAsync(0);
      active = false;
      await vi.advanceTimersByTimeAsync(250);
      await assertion;
      expect(provider.translate).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not retry permanent client errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(translateWithRetry(new GoogleTranslateProvider(), 'Hello', 'es')).rejects.toThrow(/400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});