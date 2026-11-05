# Tasks

## 1. Example lookup

- [x] 1.1 Add a shared Tatoeba sentence lookup with explicit mappings for all LexBrain source-language tags, CC0 and approved-result filters, bounded results and timeout; verify each mapping, query escaping/encoding, response filtering, no-match, and failure cases with `pnpm --filter @lexbrain/core test`.

## 2. Extension permission

- [x] 2.1 Add only `https://api.tatoeba.org/*` to the extension manifest host permissions; verify the manifest remains valid and the extension build includes the bundled capture sheet.

## 3. Capture sheet integration

- [x] 3.1 Add a mobile Vitest test script with JSDOM and React Testing Library using the existing Vitest runner; verify the mobile test is included by `pnpm test`.
- [x] 3.2 Fetch suggestions only when a word/phrase capture has an empty example and a supported detected source language; render up to five source-linked choices and add component tests that selection fills the editable field without auto-saving.
- [x] 3.3 Add component tests proving supplied text is preserved, typing during lookup is not overwritten, stale results after unmount or capture change are ignored, and manual entry/save works for unsupported language, no-result, and failure cases; run the mobile tests and `pnpm build:mobile`.

## 4. Privacy disclosure

- [x] 4.1 Update `privacy-policy.html` to identify Tatoeba for Android, iOS, web, and the extension-bundled app; disclose selected text and source-language lookup inputs; link its Terms of Use privacy section; and make no unsupported API-query retention claim. Verify the disclosure matches the request fields.

## 5. Integration validation

- [x] 5.1 Run `openspec validate example-sentence-suggestions --json`, `pnpm test`, `pnpm typecheck`, `pnpm build:mobile`, and `pnpm build:ext`; verify each exits successfully, the extension-bundled shared sheet can reach Tatoeba, the separate in-page panel and direct context-menu save remain unchanged, and no storage schema changed.
- [ ] 5.2 Run the existing `.github/workflows/ios-build.yml` workflow, then launch the simulator app and smoke-test suggestions from both iOS Share Sheet and Safari capture; the workflow only builds the unsigned app and does not exercise runtime capture.
- [ ] 5.3 Smoke-test the capture sheet on Android, the standalone web app, and the extension-bundled app; verify the extension's separate in-page panel and direct context-menu save remain unchanged.

## Workflow follow-up

- Obtain the independent spec-first review and explicit user approval before implementing any tracked task.
- Implement in an isolated Git worktree, then verify requirements and all applicable gates before archiving this change.
