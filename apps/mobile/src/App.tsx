import { countCards } from '@lexbrain/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { LibraryScreen } from './features/library/LibraryScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { StudyScreen } from './features/study/StudyScreen';
import { useMediaQuery } from './hooks/useMediaQuery';

type Tab = 'study' | 'words' | 'settings';

export function App() {
  const wide = useMediaQuery('(min-width: 900px)');
  const [tab, setTab] = useState<Tab>('study');
  const counts = useLiveQuery(() => countCards(), []);
  // On tablets the word list is always visible on the left, so "Words" is not a separate tab.
  const active: Tab = wide && tab === 'words' ? 'study' : tab;
  const tabs: { id: Tab; label: string }[] = wide
    ? [
        { id: 'study', label: 'Study' },
        { id: 'settings', label: 'Settings' },
      ]
    : [
        { id: 'study', label: 'Study' },
        { id: 'words', label: 'Words' },
        { id: 'settings', label: 'Settings' },
      ];

  const nav = (
    <nav className="tabs" aria-label="Sections">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className="tab"
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => setTab(t.id)}
        >
          <span className="tab-label">{t.label}</span>
          {t.id === 'study' && counts && counts.learning > 0 && <span className="tab-count">{counts.learning}</span>}
        </button>
      ))}
    </nav>
  );

  return (
    <div className={`app ${wide ? 'app-wide' : ''}`}>
      <header className="app-header">
        <h1 className="brand">LexBrain</h1>
        {wide && nav}
      </header>

      <main className="app-main">
        {wide ? (
          <div className="split">
            <aside className="split-list" aria-label="Saved words">
              <LibraryScreen />
            </aside>
            <section className="split-detail">{active === 'settings' ? <SettingsScreen /> : <StudyScreen />}</section>
          </div>
        ) : active === 'study' ? (
          <StudyScreen />
        ) : active === 'words' ? (
          <LibraryScreen />
        ) : (
          <SettingsScreen />
        )}
      </main>

      {!wide && <div className="tabbar">{nav}</div>}
    </div>
  );
}
