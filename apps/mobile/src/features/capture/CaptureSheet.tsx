import {
  addCard,
  addCardWithLimit,
  CardLimitReachedError,
  createTranslator,
  detectKind,
  getSettings,
  LANGUAGES,
  normalizeSelection,
  saveSettings,
  translateWithCache,
  type AppSettings,
} from '@lexbrain/core';
import { useEffect, useRef, useState } from 'react';
import { usePremium } from '../premium/PremiumProvider';

const FREE_CARD_LIMIT = 20;

interface Props {
  text: string;
  subject?: string;
  onClose: () => void;
}

type Phase = 'loading' | 'ready' | 'error' | 'saving' | 'saved';

/** The popup shown over the browser / PDF reader after "Add to LexBrain" is chosen. */
export function CaptureSheet({ text, subject, onClose }: Props) {
  const original = normalizeSelection(text);
  const kind = detectKind(original);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [translated, setTranslated] = useState('');
  const [detected, setDetected] = useState<string | undefined>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const edited = useRef(false);
  const premium = usePremium();
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      setTarget(s.targetLang);
    });
  }, []);

  useEffect(() => {
    if (!settings || !target) return;
    let cancelled = false;
    setPhase('loading');
    setError('');
    edited.current = false;
    translateWithCache(createTranslator(), original, target)
      .then((r) => {
        if (cancelled) return;
        setTranslated(r.translatedText);
        setDetected(r.detectedLang);
        setPhase('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Translation failed.');
        setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [settings, target, original, attempt]);

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
        sourceLang: detected ?? 'auto',
        targetLang: target,
        sourceTitle: subject,
      };
      await Promise.all([
        premium.unlimited ? addCard(card) : addCardWithLimit(card, FREE_CARD_LIMIT),
        saveSettings({ targetLang: target }),
      ]);
      setPhase('saved');
      window.setTimeout(onClose, 700);
    } catch (e) {
      if (e instanceof CardLimitReachedError) setLimitReached(true);
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setPhase('error');
    }
  };

  const unlockPro = async () => {
    try {
      await premium.buyPro();
      setLimitReached(false);
      setError('LexBrain Pro is active. Save your card to continue.');
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete the purchase.');
    }
  };

  const canSave = premium.ready && !limitReached && translated.trim() !== '' && (phase === 'ready' || phase === 'error');

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

        {phase === 'error' && (
          <p className="message message-error" role="alert">
            {error}
            {limitReached ? (
              premium.lifetimePackage && (
                <button type="button" className="link-btn" onClick={() => void unlockPro()}>
                  Unlock Pro{premium.lifetimePackage.product.priceString ? ` · ${premium.lifetimePackage.product.priceString}` : ''}
                </button>
              )
            ) : (
              <button type="button" className="link-btn" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            )}
          </p>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={() => void save()}>
            {phase === 'saved' ? 'Saved' : phase === 'saving' ? 'Saving' : 'Save card'}
          </button>
        </div>
      </section>
    </div>
  );
}
