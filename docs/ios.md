# iOS plan

iOS has no way to add an item to the system text-selection menu, so capture goes through the **Share sheet** (and a Safari Web Extension for browsing). Not implemented yet; this is the intended design.

## Setup

```bash
pnpm --filter @lexbrain/mobile build
cd apps/mobile && npx cap add ios && npx cap sync ios && npx cap open ios
```

Requires a Mac with Xcode and an Apple Developer account.

For the freemium entitlement and purchase setup, see [freemium.md](freemium.md). Add `apps/mobile/native/ios/BuildInfoPlugin.swift` to the app target and register it with the Capacitor bridge so debug builds bypass the free-card limit.

## Share Extension

1. In Xcode: **File -> New -> Target -> Share Extension** ("Add to LexBrain"). Use Swift.
2. Set the activation rule to accept text (`NSExtensionActivationSupportsText`).
3. Add an **App Group** (for example `group.com.yourdomain.lexbrain`) to both the app and the extension.
4. In the extension, read the shared text and write it to the App Group container (shared `UserDefaults` or a file), then dismiss. Keep it tiny: extensions run in a separate process with a small memory limit and **cannot share the WebView's IndexedDB**.
5. In the main app, add a Capacitor plugin implementing the same `SelectionCapture` interface as Android (`getPendingText`, `close`) that reads and clears the App Group value. The React code in `apps/mobile` then works unchanged: when pending text exists it renders the capture sheet.

## Safari

Add a **Safari Web Extension** target and reuse `apps/extension/src/content.ts`. Its background messaging must hand saves to the main app through the App Group, for the same storage reason.
