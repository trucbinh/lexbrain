# iOS Capture

LexBrain supports incoming text through an iOS Share Sheet extension and a Safari Web Extension. Both queue text in an App Group shared with the main app; the existing React capture sheet translates and saves it locally.

## Setup

```bash
pnpm --filter @lexbrain/mobile build
cd apps/mobile
npx cap add ios                 # only the first time
npx cap sync ios
cd ../..
gem install xcodeproj --no-document
ruby scripts/apply-ios-native.rb
cd apps/mobile && npx cap open ios
```

Requires macOS with Xcode. For device signing, register `group.datamerge.xyz.lexbrain.app` as an App Group with Apple, then enable that App Group for the app and both extensions in the signing configuration. The GitHub Actions workflow configures the targets for unsigned simulator builds.

## Use Capture

1. From another app, select text and choose LexBrain in the Share Sheet. The extension queues the text; then open LexBrain to translate and save it.
2. In Safari, select text and tap the floating **Add to LexBrain** control. Safari sends the selection to the app and opens LexBrain.
3. If the Safari extension is not visible, enable **LexBrain Safari Capture** under **Settings -> Apps -> Safari -> Extensions** and allow it on the page.

The extensions cannot access the app's IndexedDB directly. They only pass the selected text, page title, and URL through the App Group; translation and card storage remain in the main app.
