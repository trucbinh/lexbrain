# Free and Pro plans

LexBrain's mobile app allows 20 active cards on the free plan. Deleted cards do not count. Updating an existing card is allowed at the limit. Debug builds and browser/web builds have unlimited cards; native release builds check RevenueCat's `pro` entitlement.

## RevenueCat setup

1. Create Android and iOS apps in RevenueCat using the app's store identifiers.
2. Create the `pro` entitlement.
3. Add one non-consumable lifetime product for each store and attach both products to `pro`.
4. Add the lifetime product to the current offering's Lifetime package.
5. Copy the platform public SDK keys from RevenueCat into `apps/mobile/.env.local`, using `.env.example` as the template. These are client SDK keys, not RevenueCat secret API keys.
6. Enable In-App Purchase for the iOS app target and add the RevenueCat Capacitor plugin with `pnpm.cmd --filter @lexbrain/mobile exec cap sync ios` after creating the iOS project.

Build the app after configuring the keys so Vite embeds them into the mobile bundle. Do not use the Android key for iOS or vice versa.

## Debug builds

Android debug APKs and web development builds skip the card cap. For iOS, add `native/ios/BuildInfoPlugin.swift` to the app target and register `BuildInfoPlugin` with the Capacitor bridge. The Swift `DEBUG` build configuration then bypasses the cap for Xcode debug runs, while App Store builds enforce it.

Store internal/beta builds are release builds and therefore enforce the cap. Use a debug build for unlimited local testing.
