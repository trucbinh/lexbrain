import { cardsToCsv, countActiveCards, LANGUAGES, listCards, saveSettings } from '@lexbrain/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { usePremium } from '../premium/PremiumProvider';

export function SettingsScreen() {
  const settings = useSettings();
  const premium = usePremium();
  const activeCardCount = useLiveQuery(() => countActiveCards(), []);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMessage(null);
    try {
      setMessage(await fn());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings">
      <h2 className="settings-title">Settings</h2>

      <label className="field">
        <span className="field-label">Translate into</span>
        <select
          className="input"
          value={settings.targetLang}
          onChange={(e) => void saveSettings({ targetLang: e.target.value })}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} ({l.native})
            </option>
          ))}
        </select>
        <span className="field-help">New cards use this language. You can change it for a single word in the popup.</span>
      </label>

      <label className="field">
        <span className="field-label">Card front</span>
        <select
          className="input"
          value={settings.studyDirection}
          onChange={(e) => void saveSettings({ studyDirection: e.target.value as typeof settings.studyDirection })}
        >
          <option value="source-to-target">Original text</option>
          <option value="target-to-source">Translation</option>
        </select>
      </label>

      <section className="premium-settings" aria-labelledby="premium-title">
        <h3 id="premium-title">LexBrain Pro</h3>
        <p className="field-help">
          {premium.debugBuild
            ? 'Unlimited cards are enabled for testing.'
            : premium.isPro
              ? 'Unlimited cards are unlocked.'
              : `${activeCardCount ?? 0} of 20 free cards used.`}
        </p>
        {!premium.debugBuild && !premium.isPro && (
          <div className="premium-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !premium.ready || !premium.lifetimePackage}
              onClick={() =>
                void run(async () => {
                  await premium.buyPro();
                  return 'LexBrain Pro is active. You now have unlimited cards.';
                })
              }
            >
              {premium.lifetimePackage
                ? `Unlock Pro · ${premium.lifetimePackage.product.priceString}`
                : 'Pro purchase unavailable'}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              disabled={busy || !premium.purchasesConfigured}
              onClick={() =>
                void run(async () => {
                  await premium.restorePurchases();
                  return 'Purchases restored.';
                })
              }
            >
              Restore purchases
            </button>
          </div>
        )}
        {premium.error && !premium.isPro && <p className="message message-error">{premium.error}</p>}
      </section>

      <p className="field-help">Cards and cached translations stay in this app. Text you translate is sent to Google Translate.</p>

      <div className="settings-actions">
        <button
          type="button"
          className="btn btn-quiet"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const csv = cardsToCsv(await listCards());
              await navigator.clipboard.writeText(csv);
              return 'Copied all cards as CSV. Paste into a spreadsheet or Anki import.';
            })
          }
        >
          Copy cards as CSV
        </button>
      </div>

      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
