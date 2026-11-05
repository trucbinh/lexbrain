import {
  addCard,
  createTranslator,
  detectKind,
  findExampleSentences,
  getSettings,
  LANGUAGES,
  normalizeSelection,
  saveSettings,
  tatoebaLanguageCode,
  translateWithCache,
  type AppSettings,
  type ExampleSentenceSuggestion,
} from '@lexbrain/core';
import { useEffect, useRef, useState } from 'react';

interface Props {
  text: string;
  contextSentence?: string;
  source?: 'process_text' | 'share' | 'safari' | 'web' | null;
  subject?: string;
  sourceUrl?: string;
  onClose: () => void;
}

type Phase = 'loading' | 'ready' | 'pending' | 'error' | 'saving' | 'saved';
type ExamplePhase = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/** The popup shown over the browser / PDF reader after "Add to LexBrain" is chosen. */
export function CaptureSheet({ text, contextSentence: initialContextSentence, source, subject, sourceUrl, onClose }: Props) {
  const original = normalizeSelection(text);
  const kind = detectKind(original);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [translated, setTranslated] = useState('');
  const [contextSentence, setContextSentence] = useState(initialContextSentence ?? '');
  const [detected, setDetected] = useState<string | undefined>();
  const [detectedFor, setDetectedFor] = useState('');
  const [exampleSuggestions, setExampleSuggestions] = useState<ExampleSentenceSuggestion[]>([]);
  const [suggestionsFor, setSuggestionsFor] = useState('');
  const [examplePhase, setExamplePhase] = useState<ExamplePhase>('idle');
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const edited = useRef(false);

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      setTarget(s.targetLang);
    });
  }, []);

  useEffect(() => {
    setContextSentence(initialContextSentence ?? '');
    setDetected(undefined);
    setDetectedFor('');
    setTranslated('');
    setExampleSuggestions([]);
    setSuggestionsFor('');
    setExamplePhase('idle');
  }, [original, initialContextSentence]);

  useEffect(() => {
    if (!settings || !target) return;
    let cancelled = false;
    setPhase('loading');
    setError('');
    edited.current = false;
    setDetected(undefined);
    setDetectedFor('');
    if (!navigator.onLine) {
      setError('No internet connection. This word or phrase will be saved and translated when you open it to learn.');
      setPhase('pending');
      return () => {
        cancelled = true;
      };
    }
    translateWithCache(createTranslator(), original, target)
      .then((r) => {
        if (cancelled) return;
        setTranslated(r.translatedText);
        setDetected(r.detectedLang);
        setDetectedFor(original);
        setPhase('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError('Google Translate could not be reached reliably. This word or phrase will be saved and translated when you open it to learn.');
        setPhase('pending');
      });
    return () => {
      cancelled = true;
    };
  }, [settings, target, original, attempt]);

  useEffect(() => {
    if (kind !== 'word' || contextSentence.trim() || !detected || !tatoebaLanguageCode(detected) || detectedFor !== original) {
      setExampleSuggestions([]);
      setSuggestionsFor('');
      setExamplePhase('idle');
      return;
    }

    const controller = new AbortController();
    let active = true;
    setExampleSuggestions([]);
    setSuggestionsFor('');
    setExamplePhase('loading');
    findExampleSentences(original, detected, { signal: controller.signal })
      .then((suggestions) => {
        if (!active) return;
        setExampleSuggestions(suggestions);
        setSuggestionsFor(original);
        setExamplePhase(suggestions.length ? 'ready' : 'empty');
      })
      .catch(() => {
        if (!active || controller.signal.aborted) return;
        setExamplePhase('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [contextSentence, detected, detectedFor, kind, original]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    if (!target) return;
    setPhase('saving');
    try {
      const card = {
        sourceText: original,
        translatedText: translated,
        translationStatus: translated.trim() ? ('translated' as const) : ('pending' as const),
        sourceLang: detected ?? 'auto',
        targetLang: target,
        contextSentence: contextSentence.trim() || undefined,
        sourceUrl,
        sourceTitle: subject,
      };
      await Promise.all([
        addCard(card),
        saveSettings({ targetLang: target }),
      ]);
      setPhase('saved');
      window.setTimeout(onClose, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setPhase('error');
    }
  };

  const canSave = phase === 'pending' || (translated.trim() !== '' && (phase === 'ready' || phase === 'error'));

  return (
    <div
      className="capture-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Add to LexBrain">
        <header className="sheet-head">
          <h2 className="sheet-brand">LexBrain</h2>
          <span className="chip">{kind}</span>
          <button type="button" className="link-btn sheet-close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="sheet-original">
          <p className={`sheet-source kind-${kind}`}>{kind === 'word' ? <mark className="marker">{original}</mark> : original}</p>
        </div>

        <label className="field">
          <span className="field-label">Translate into</span>
          <select className="input" value={target ?? ''} onChange={(e) => setTarget(e.target.value)} disabled={!target}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Translation</span>
          {phase === 'loading' ? (
            <div className="skeleton" aria-busy="true" aria-label="Translating" />
          ) : (
            <textarea
              className="input sheet-translation"
              rows={kind === 'paragraph' ? 6 : 3}
              value={translated}
              onChange={(e) => {
                edited.current = true;
                setTranslated(e.target.value);
              }}
            />
          )}
        </label>

        {kind === 'word' && (
          <>
            {source === 'process_text' && !contextSentence && (
              <p className="message" role="note">
                Android provided only the selected text. Choose a sample sentence or type its surrounding sentence below.
              </p>
            )}
            <label className="field">
              <span className="field-label">Example sentence (optional)</span>
              <textarea
                className="input"
                rows={2}
                value={contextSentence}
                onChange={(event) => setContextSentence(event.target.value)}
                placeholder={`Use ${original} in a sentence`}
              />
            </label>
            {!contextSentence.trim() && examplePhase === 'loading' && (
              <p className="field-help" role="status" aria-live="polite">Finding sample sentences…</p>
            )}
            {!contextSentence.trim() && examplePhase === 'empty' && (
              <p className="field-help" role="status" aria-live="polite">No sample sentences found. You can write your own.</p>
            )}
            {!contextSentence.trim() && examplePhase === 'error' && (
              <p className="field-help" role="status" aria-live="polite">Sample sentences are unavailable. You can write your own.</p>
            )}
            {!contextSentence.trim() && suggestionsFor === original && examplePhase === 'ready' && (
              <ul className="example-suggestions" aria-label="Example sentence suggestions">
                {exampleSuggestions.map((suggestion) => (
                  <li className="example-suggestion" key={suggestion.id}>
                    <button
                      type="button"
                      className="example-suggestion-select"
                      onClick={() => setContextSentence(suggestion.text)}
                    >
                      {suggestion.text}
                    </button>
                    <a className="example-source-link" href={suggestion.url} target="_blank" rel="noreferrer">
                      Tatoeba source
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {(phase === 'error' || phase === 'pending') && (
          <p className="message message-error" role="alert">
            {error}
            <button type="button" className="link-btn" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          </p>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={() => void save()}>
            {phase === 'saved' ? 'Saved' : phase === 'saving' ? 'Saving' : phase === 'pending' ? 'Save for later' : 'Save card'}
          </button>
        </div>
      </section>
    </div>
  );
}
