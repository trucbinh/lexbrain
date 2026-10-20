# LexBrain

Save words, sentences and paragraphs from anything you read, translate them, and learn them as flip cards.

```
lexbrain/
├─ packages/core        Shared TypeScript: Card model, Dexie (IndexedDB) storage, translation clients,
│                       SM-2 scheduling and local translation caching.
├─ apps/mobile          React + Vite + Capacitor app for phones and tablets (Study / Words / Settings),
│                       plus the capture popup shown over other apps. Native Android sources in native/android.
├─ apps/extension       Chrome / Edge extension (Manifest V3): select text -> popup -> save. Bundles the mobile
│                       UI as its study page, so desktop and mobile share one codebase.
├─ backend/LexBrain.Api Azure Functions (C#, isolated worker): /api/translate proxy + /api/sync/pull|push.
├─ scripts              apply-android-native.mjs: installs the Android capture activity into the Capacitor project.
└─ docs                 iOS notes.
```

## What works today

| Capability | Status |
|---|---|
| Android: "Add to LexBrain" in the text-selection menu (Chrome, Edge, most PDF readers) and the share sheet | Native sources included (see "Android") |
| Desktop browser: select text -> floating button -> translate -> edit -> save, with the context sentence captured automatically | Working |
| Right-click "Add to LexBrain" (also works in Chrome's built-in PDF viewer, where content scripts cannot run) | Working |
| Cards: tap to flip, swipe right = "I know it" (moved to mastered), swipe left / button = "Show again", undo | Working |
| Manual removal: mark mastered (restorable) or delete (two-tap confirm) | Working |
| Phone layout and tablet two-pane layout (word list + study card), dark mode | Working |
| App-local storage (IndexedDB), translation cache | Working; cards are not uploaded or synced |
| Spaced repetition (SM-2), listen button (device text-to-speech), CSV copy | Working |
| Cloud sync | Not exposed by the app UI |
| iOS capture (Share Extension) | Not implemented; plan in `docs/ios.md` |

## Quick start

Requirements: Node 22+, pnpm 11+. Android builds also need Android Studio (and the JDK version your Capacitor release requires - check the Capacitor docs for your version).

```bash
pnpm install
pnpm test              # unit tests (core)
pnpm typecheck
pnpm dev:mobile        # http://localhost:5173
```

Try the capture popup in a browser without a phone: <http://localhost:5173/?capture=serendipity>

Translation temporarily uses Google's undocumented, keyless web Translate endpoint. It is not the supported Google Cloud Translation API and may change without notice. Card data and the translation cache stay in the app's local database; text submitted for translation is sent to Google.

### Chrome and Edge extension

```bash
pnpm build:ext         # builds the study UI into the extension, then bundles the extension
```

The same Manifest V3 build supports both browsers:

- **Chrome:** open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, then select `apps/extension/dist`.
- **Edge:** open `edge://extensions`, enable Developer mode, choose **Load unpacked**, then select `apps/extension/dist`.

Select text on a page and click **Add to LexBrain**; the toolbar icon opens the study / library app. For store submission, zip the contents of `apps/extension/dist` (so `manifest.json` is at the archive root) and submit that same package separately to the Chrome Web Store and Microsoft Edge Add-ons. Store listings and review are separate.

The extension requests translations from Google's Translate web endpoint; its host permission is declared in `apps/extension/manifest.json`.

> Cards live in each app's own local database. The app UI does not sync cards between devices.

### Mobile bundles

The production web assets are bundled into Capacitor's native app. No LexBrain backend or cloud database is required.

```bash
pnpm --filter @lexbrain/mobile build
cd apps/mobile
npx cap add android
cd ../..
node scripts/apply-android-native.mjs     # installs the capture activity, plugin and theme
pnpm cap:sync
cd apps/mobile && npx cap open android    # run from Android Studio
```

Build the signed Android App Bundle (`.aab`) from Android Studio. For iOS, run `npx cap add ios`, then `pnpm cap:sync` and open the iOS project in Xcode on macOS. Android selection-menu capture is included; iOS share capture is not implemented.

Before publishing, change `appId` in `apps/mobile/capacitor.config.ts` (it cannot change after release) and re-run the steps above on a fresh `android/` folder.

How capture works:

- `CaptureActivity` (translucent) declares the `PROCESS_TEXT` and `SEND text/plain` intent filters. Android lists it as **Add to LexBrain** in the selection menu, next to Translate, ChatGPT and so on.
- It hosts the same React app. The `SelectionCapture` plugin returns the selected text; the app sees pending text and renders only the bottom sheet over the page you were reading.
- Saving writes to the same IndexedDB the main app uses, then closes the popup and returns you to the reader.
- `PROCESS_TEXT` delivers only the selected text, with no surrounding sentence or page URL. If you want context on mobile, select the whole sentence.

Re-running `apply-android-native.mjs` is safe (it detects its own changes). If you delete `android/`, run it again after `cap add android`.

### Backend components

Legacy Azure Functions and sync code remain in the repository, but the mobile app does not call them. Do not deploy or configure them for a local-only mobile build. Google receives the text submitted to its translation endpoint; LexBrain does not send saved cards or study progress.

## Design notes

- **Legacy sync model.** Last-write-wins on a client `updatedAt`; deletes are tombstones. This code is not used by the mobile app.
- **Archive by default.** "I know it" marks a card mastered and keeps it (restorable from Words); permanent deletion is a separate, confirmed action.
- **Dedupe.** Saving the same text for the same target language updates the existing card.
- **Card kinds.** `word` (up to 3 words, or 4 CJK characters), `sentence`, `paragraph`, detected automatically. For single words the page's sentence is stored as context and highlighted on the card.
- **Replaceable translators.** Client side: `TranslationProvider`. Server side: `ITranslationProvider`.

## What has and has not been verified

Verified in the build environment:

- Core and app TypeScript checks pass; 26 core unit tests pass (text detection, SM-2, repository against a fake IndexedDB, sync client against a stubbed server, Google Translate response handling).
- Production builds of the mobile app and the extension.
- Headless Chromium end-to-end: study flow (flip, mastered, undo), search, capture popup with a mocked translator, error state, tablet layout.
- Translation provider tests validate the Google endpoint request and response mapping without making live requests.
- `cap add android` followed by `apply-android-native.mjs` produces a valid manifest and the expected sources.

**Not** verified (no SDK available in the build environment):

- The Android Gradle build and running on a device or emulator. The Java sources follow the Capacitor `BridgeActivity` / `@CapacitorPlugin` APIs but have not been compiled.
- The C# backend has not been compiled or run. Expect to fix small compile issues on first build.
- Live Google Translate behavior and translation quality.
- iOS native build; the iOS Share Extension is not implemented.

## Next steps

1. Run on an Android device and confirm "Add to LexBrain" appears in Chrome's selection menu.
2. Add a PDF.js reader (Chrome's built-in viewer blocks content scripts) and the iOS Share Extension.
3. Add dictionary lookups for single words (definition, part of speech) beside machine translation.
