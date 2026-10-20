import { cardsToCsv, LANGUAGES, listCards, saveSettings } from '@lexbrain/core';
import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

export function SettingsScreen() {
  const settings = useSettings();
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

      <p className="field-help">Cards and cached translations stay in this app. Text you translate is sent to Google Translate.</p>
      <p className="field-help">A snapshot is saved the first time each app version runs and restored if the card database is empty. It cannot survive uninstalling the app, clearing its storage, or changing its app ID.</p>

      <p className="field-help">
        <a href="https://trucbinh.github.io/lexbrain/privacy-policy.html">Privacy policy</a>
      </p>

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
