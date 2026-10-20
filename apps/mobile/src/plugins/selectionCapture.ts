import { registerPlugin } from '@capacitor/core';

export interface PendingText {
  text: string;
  /** How the text arrived: Android, iOS Share Sheet/Safari, or the web dev fallback. */
  source: 'process_text' | 'share' | 'safari' | 'web' | null;
  subject?: string;
  sourceUrl?: string;
}

export interface SelectionCapturePlugin {
  /** Text handed to this activity by the system selection menu / share sheet (empty when launched normally). */
  getPendingText(): Promise<PendingText>;
  /** Closes the capture popup and returns to the app the user was reading. */
  close(): Promise<void>;
}

/**
 * Native implementations: apps/mobile/native/android (Java) and @lexbrain/ios-capture (Swift).
 * Web fallback: open the dev server with ?capture=some%20text to test the capture sheet in a browser.
 */
export const SelectionCapture = registerPlugin<SelectionCapturePlugin>('SelectionCapture', {
  web: () =>
    Promise.resolve<SelectionCapturePlugin>({
      async getPendingText() {
        const params = new URLSearchParams(window.location.search);
        const text = params.get('capture') ?? '';
        return { text, source: text ? 'web' : null, subject: params.get('title') ?? undefined };
      },
      async close() {
        window.location.search = '';
      },
    }),
});
