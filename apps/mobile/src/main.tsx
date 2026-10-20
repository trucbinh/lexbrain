import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { CaptureSheet } from './features/capture/CaptureSheet';
import { SelectionCapture, type PendingText } from './plugins/selectionCapture';
import './styles.css';

async function boot() {
  const root = createRoot(document.getElementById('root')!);

  let pending: PendingText = { text: '', source: null };
  try {
    pending = await SelectionCapture.getPendingText();
  } catch {
    // Plugin not available (e.g. an extension page): behave like a normal launch.
  }

  let content: ReactNode;
  if (pending.text.trim()) {
    // Opened from the system text-selection menu or share sheet: show only the popup.
    document.documentElement.classList.add('capture-mode');
    content = <CaptureSheet text={pending.text} subject={pending.subject} onClose={() => void SelectionCapture.close()} />;
  } else {
    content = <App />;
  }

  root.render(
    <StrictMode>
      {content}
    </StrictMode>,
  );
}

void boot();
