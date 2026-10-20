import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { initializeDatabase } from '@lexbrain/core';
import { App } from './App';
import { CaptureSheet } from './features/capture/CaptureSheet';
import { SelectionCapture, type PendingText } from './plugins/selectionCapture';
import './styles.css';

function Root({ initialPending }: { initialPending: PendingText }) {
  const [pending, setPending] = useState<PendingText | null>(initialPending.text.trim() ? initialPending : null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let listener: { remove: () => Promise<void> } | undefined;

    void CapacitorApp.addListener('appUrlOpen', async () => {
      try {
        const next = await SelectionCapture.getPendingText();
        if (!disposed && next.text.trim()) setPending(next);
      } catch {
        // Ignore URL opens that did not originate from a LexBrain capture.
      }
    }).then((handle) => {
      if (disposed) void handle.remove();
      else listener = handle;
    });

    return () => {
      disposed = true;
      void listener?.remove();
    };
  }, []);

  const closeCapture = async () => {
    await SelectionCapture.close();
    setPending(null);
    document.documentElement.classList.remove('capture-mode');
  };

  if (pending?.text.trim()) {
    document.documentElement.classList.add('capture-mode');
    return (
      <CaptureSheet
        text={pending.text}
        subject={pending.subject}
        sourceUrl={pending.sourceUrl}
        onClose={() => void closeCapture()}
      />
    );
  }

  return <App />;
}

async function boot() {
  const appVersion = Capacitor.isNativePlatform()
    ? await CapacitorApp.getInfo().then(({ version, build }) => `${version}+${build}`)
    : 'web';
  await initializeDatabase(appVersion);

  let pending: PendingText = { text: '', source: null };
  try {
    pending = await SelectionCapture.getPendingText();
  } catch {
    // Plugin not available (e.g. an extension page): behave like a normal launch.
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root initialPending={pending} />
    </StrictMode>,
  );
}

void boot();
