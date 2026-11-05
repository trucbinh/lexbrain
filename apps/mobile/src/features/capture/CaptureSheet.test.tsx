// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CaptureSheet } from './CaptureSheet';

const coreMocks = vi.hoisted(() => ({
  addCard: vi.fn().mockResolvedValue(undefined),
  findExampleSentences: vi.fn().mockResolvedValue([]),
  saveSettings: vi.fn().mockResolvedValue(undefined),
  translateWithCache: vi.fn().mockResolvedValue({ translatedText: 'tranquilo', detectedLang: 'en' }),
  tatoebaLanguageCode: vi.fn((language: string | undefined) => language === 'en' ? 'eng' : undefined),
}));

vi.mock('@lexbrain/core', () => ({
  addCard: coreMocks.addCard,
  createTranslator: vi.fn(() => ({})),
  detectKind: vi.fn(() => 'word'),
  findExampleSentences: coreMocks.findExampleSentences,
  getSettings: vi.fn().mockResolvedValue({ targetLang: 'es' }),
  LANGUAGES: [{ code: 'es', name: 'Spanish', native: 'Español' }],
  normalizeSelection: vi.fn((text: string) => text.trim()),
  saveSettings: coreMocks.saveSettings,
  tatoebaLanguageCode: coreMocks.tatoebaLanguageCode,
  translateWithCache: coreMocks.translateWithCache,
}));

afterEach(() => {
  cleanup();
  coreMocks.findExampleSentences.mockReset().mockResolvedValue([]);
  coreMocks.addCard.mockClear();
  coreMocks.saveSettings.mockClear();
  coreMocks.translateWithCache.mockReset().mockResolvedValue({ translatedText: 'tranquilo', detectedLang: 'en' });
  vi.clearAllMocks();
});

describe('CaptureSheet', () => {
  it('keeps an incoming example sentence editable without requesting suggestions', async () => {
    render(<CaptureSheet text="quiet" contextSentence="The room was quiet." onClose={vi.fn()} />);

    const example = (await screen.findByLabelText('Example sentence (optional)')) as HTMLTextAreaElement;
    expect(example.value).toBe('The room was quiet.');
    expect(coreMocks.findExampleSentences).not.toHaveBeenCalled();
  });

  it('lets the user select and edit a suggestion without saving it automatically', async () => {
    coreMocks.findExampleSentences.mockResolvedValueOnce([
      {
        id: 21,
        text: 'I found a quiet path.',
        language: 'eng',
        source: 'Tatoeba',
        url: 'https://tatoeba.org/en/sentences/show/21',
      },
    ]);
    render(<CaptureSheet text="quiet" onClose={vi.fn()} />);

    const suggestion = await screen.findByRole('button', { name: 'I found a quiet path.' });
    expect(screen.getByRole('link', { name: 'Tatoeba source' }).getAttribute('href')).toBe(
      'https://tatoeba.org/en/sentences/show/21',
    );
    fireEvent.click(suggestion);

    const example = screen.getByLabelText('Example sentence (optional)') as HTMLTextAreaElement;
    expect(example.value).toBe('I found a quiet path.');
    expect(coreMocks.addCard).not.toHaveBeenCalled();
    fireEvent.change(example, { target: { value: 'My quiet path was peaceful.' } });
    expect(example.value).toBe('My quiet path was peaceful.');
  });

  it('does not overwrite text entered while suggestions are loading', async () => {
    let resolveSuggestions!: (suggestions: Array<{
      id: number;
      text: string;
      language: string;
      source: 'Tatoeba';
      url: string;
    }>) => void;
    coreMocks.findExampleSentences.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSuggestions = resolve;
      }),
    );
    render(<CaptureSheet text="quiet" onClose={vi.fn()} />);
    const example = (await screen.findByLabelText('Example sentence (optional)')) as HTMLTextAreaElement;
    await waitFor(() => expect(coreMocks.findExampleSentences).toHaveBeenCalled());

    fireEvent.change(example, { target: { value: 'A user-written example.' } });
    await act(async () => {
      resolveSuggestions([
        { id: 22, text: 'A stale suggestion.', language: 'eng', source: 'Tatoeba', url: 'https://tatoeba.org/en/sentences/show/22' },
      ]);
    });

    expect(example.value).toBe('A user-written example.');
    expect(screen.queryByRole('button', { name: 'A stale suggestion.' })).toBeNull();
  });

  it('discards suggestions when the capture changes while lookup is pending', async () => {
    let resolveFirst!: (suggestions: Array<{
      id: number;
      text: string;
      language: string;
      source: 'Tatoeba';
      url: string;
    }>) => void;
    let resolveSecond!: (suggestions: Array<{
      id: number;
      text: string;
      language: string;
      source: 'Tatoeba';
      url: string;
    }>) => void;
    coreMocks.findExampleSentences
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
    const onClose = vi.fn();
    const view = render(<CaptureSheet text="quiet" onClose={onClose} />);
    await waitFor(() => expect(coreMocks.findExampleSentences).toHaveBeenCalledTimes(1));

    view.rerender(<CaptureSheet text="serendipity" onClose={onClose} />);
    await waitFor(() => expect(coreMocks.findExampleSentences).toHaveBeenCalledTimes(2));
    await act(async () => {
      resolveFirst([
        { id: 23, text: 'Old capture result.', language: 'eng', source: 'Tatoeba', url: 'https://tatoeba.org/en/sentences/show/23' },
      ]);
    });
    expect(screen.queryByRole('button', { name: 'Old capture result.' })).toBeNull();

    await act(async () => {
      resolveSecond([
        { id: 24, text: 'New capture result.', language: 'eng', source: 'Tatoeba', url: 'https://tatoeba.org/en/sentences/show/24' },
      ]);
    });
    expect(await screen.findByRole('button', { name: 'New capture result.' })).toBeTruthy();
  });

  it('ignores a lookup that completes after the sheet unmounts', async () => {
    let resolveSuggestions!: (suggestions: Array<{
      id: number;
      text: string;
      language: string;
      source: 'Tatoeba';
      url: string;
    }>) => void;
    coreMocks.findExampleSentences.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSuggestions = resolve;
      }),
    );
    const view = render(<CaptureSheet text="quiet" onClose={vi.fn()} />);
    await waitFor(() => expect(coreMocks.findExampleSentences).toHaveBeenCalled());
    view.unmount();

    await act(async () => {
      resolveSuggestions([
        { id: 25, text: 'After unmount.', language: 'eng', source: 'Tatoeba', url: 'https://tatoeba.org/en/sentences/show/25' },
      ]);
    });
    expect(screen.queryByRole('button', { name: 'After unmount.' })).toBeNull();
  });

  it.each([
    ['no results', []],
    ['a failed lookup', new Error('offline')],
  ])('keeps manual entry available when lookup returns %s', async (_label, result) => {
    if (result instanceof Error) coreMocks.findExampleSentences.mockRejectedValueOnce(result);
    else coreMocks.findExampleSentences.mockResolvedValueOnce(result);
    render(<CaptureSheet text="quiet" onClose={vi.fn()} />);

    const example = (await screen.findByLabelText('Example sentence (optional)')) as HTMLTextAreaElement;
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    expect(example).toBeTruthy();
    fireEvent.change(example, { target: { value: 'I can still add my own example.' } });
    expect(example.value).toBe('I can still add my own example.');
    fireEvent.click(screen.getByRole('button', { name: 'Save card' }));
    await waitFor(() => expect(coreMocks.addCard).toHaveBeenCalledWith(expect.objectContaining({
      contextSentence: 'I can still add my own example.',
    })));
  });

  it('does not look up a different language when the detected source is unsupported', async () => {
    coreMocks.translateWithCache.mockResolvedValueOnce({ translatedText: 'tranquilo', detectedLang: 'xx' });
    render(<CaptureSheet text="quiet" onClose={vi.fn()} />);

    const example = (await screen.findByLabelText('Example sentence (optional)')) as HTMLTextAreaElement;
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save card' })).toBeTruthy());
    expect(coreMocks.findExampleSentences).not.toHaveBeenCalled();
    fireEvent.change(example, { target: { value: 'A manually entered example.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save card' }));
    await waitFor(() => expect(coreMocks.addCard).toHaveBeenCalledWith(expect.objectContaining({
      contextSentence: 'A manually entered example.',
    })));
  });
});
