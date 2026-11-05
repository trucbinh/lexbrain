# Design

## Context

See [proposal.md](proposal.md) for motivation and [specs/example-sentence-suggestions/spec.md](specs/example-sentence-suggestions/spec.md) for behavior.

`CaptureSheet` initializes its editable `contextSentence` from the incoming capture and saves it with the card (`apps/mobile/src/features/capture/CaptureSheet.tsx:26,32,92`). The field is currently shown only for `kind === 'word'` (`CaptureSheet.tsx:158-172`), which includes short phrases classified by `detectKind` (`packages/core/src/text.ts`). Translation returns a detected source language through `TranslateResult` (`packages/core/src/translation.ts:53-75`), and the language picker defines the currently supported language set (`packages/core/src/languages.ts:8-33`). The privacy policy currently names Google Translate as the external recipient of selected text (`privacy-policy.html:52-53`).

The extension's toolbar opens the bundled app (`apps/extension/src/background.ts:42-45`), which renders `App`; manual entry there opens the shared `CaptureSheet` (`apps/mobile/src/App.tsx:82-93`). The in-page extension panel and direct context-menu save use separate flows (`apps/extension/src/content.ts`, `apps/extension/src/background.ts:67-86`) and are not changed by this design.

iOS Share Sheet and Safari capture queue text for the main app, which opens the shared capture sheet (`docs/ios.md`, `apps/mobile/src/main.tsx:46-54`, `apps/mobile/src/plugins/selectionCapture.ts:5-20`). The existing iOS simulator build is the manual macOS workflow `.github/workflows/ios-build.yml`.

As verified on 2026-11-04, Tatoeba's [stable API OpenAPI documentation](https://api.tatoeba.org/openapi) describes `GET /v1/sentences` as public, read-only, and unauthenticated, with ISO 639-3 `lang`, text query `q`, `limit`, `is_unapproved`, and `license` parameters and sentence id/text/language/license/owner fields. The docs warn that unapproved results are included by default. A direct sample request accepted the proposed language codes and returned CC0 results; `zho` was rejected while `cmn` was accepted. A request carrying a browser `Origin` header received `Access-Control-Allow-Origin: *`. Tatoeba's [Terms of Use, section 4](https://tatoeba.org/en/terms_of_use#section-4) says its operations are logged, describes storage in Germany and possible transfers to its development/administration locations, but does not state whether API search terms are retained. The [license terms, section 6](https://tatoeba.org/en/terms_of_use#section-6) state that textual sentences default to CC BY 2.0 FR, which requires attribution; the API supports filtering for CC0 1.0. The [corpus reuse guide](https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus) warns that sentences may need review. Recheck these contracts against the linked official sources before implementation; do not rely on defaults or claim query-specific retention details.

## Goals / Non-Goals

**Goals:**
- Fetch up to five optional suggestions only when a word/phrase capture has an empty example and a known supported source language.
- Keep examples in the existing capture state and persistence flow; never replace captured context or user input.
- Keep lookup client-side, bounded, and best-effort; update the privacy policy to name the lookup, data sent, and provider terms.
- Permit the extension-bundled shared app to reach only Tatoeba's API host for these suggestions.
- Keep the same suggestion behavior available through iOS Share Sheet and Safari capture in the main app.
- Add automated capture-sheet tests for supplied text, async edits, stale results, selection, and lookup failures using the existing Vitest test framework.

**Non-Goals:**
- Change the extension's separate in-page capture panel or direct context-menu save, translation behavior, card storage schema, synchronization, or backend APIs.
- Store suggestion results in IndexedDB or automatically save a suggestion without the user's save action.
- Use audio, CC BY results, or unapproved sentences; add a runtime dependency, backend, or browser-extension UI.

## Decisions

1. **Revalidate the external contract before implementation.** Upstream API, language-code, CORS, license, and privacy behavior can change. Before coding, check the official links in this design and preserve this source/verification date in the implementation run record. If behavior or terms materially differ, stop, update the OpenSpec artifacts, and repeat review.

2. **Use Tatoeba's stable sentence-search API and CC0-only results.** Query `https://api.tatoeba.org/v1/sentences` with the detected source language, selected text, `is_unapproved=no`, `license=CC0 1.0`, `sort=relevance`, and `limit=5`. Encode parameters with `URLSearchParams`, and escape the term for Tatoeba's documented Manticore query syntax so selected text is treated as search text rather than operators. Validate each returned record and accept only non-empty text with the requested language and `CC0 1.0` license. Reject malformed or unexpected responses. Alternatives considered: Free Dictionary API is free but its published endpoint is English-word-oriented and does not fit the multilingual phrase requirement; Tatoeba's CC BY sentences would require contributor attribution, so use CC0 rather than introduce attribution obligations.

3. **Map source language explicitly and fail closed.** Tatoeba requires ISO 639-3 codes while Google Translate returns detected language tags and LexBrain's picker uses its own codes. Map the supported tags as follows and test the full table: `en→eng`, `hi→hin`, `mr→mar`, `gu→guj`, `bn→ben`, `ta→tam`, `te→tel`, `vi→vie`, `zh-CN→cmn`, `zh-TW→cmn`, `ja→jpn`, `ko→kor`, `th→tha`, `id→ind`, `es→spa`, `fr→fra`, `de→deu`, `it→ita`, `pt→por`, `nl→nld`, `pl→pol`, `sv→swe`, `ru→rus`, `uk→ukr`, `tr→tur`, and `ar→ara`. The API accepted this code set in a live validation query; `zho` was rejected, so both Chinese variants map to Tatoeba's accepted Mandarin code `cmn`. If the language is `auto`, missing, or has no verified mapping, do not make a lookup or substitute another language. This is best-effort coverage, not a guarantee that the corpus contains examples for every supported language.

4. **Keep the provider separate from UI state.** Add a small shared-core lookup function with a typed result and no persistence. `CaptureSheet` starts the lookup only when the initial example is empty and the selection is a word/phrase. It renders a bounded suggestion list with Tatoeba identified and each sentence linked to its Tatoeba page; choosing one fills the existing textarea. Guard asynchronous completion so it cannot overwrite text the user entered, and cancel/ignore stale results when the sheet closes or the capture changes. This applies to Android and iOS capture and manual entry in the standalone web app and extension-bundled app. Add only `https://api.tatoeba.org/*` to the extension's `host_permissions`; do not change the separate in-page panel or context-menu save path.

5. **Do not block capture on the external service.** Use a bounded request timeout and render loading, empty, and unavailable states without making them errors in the existing translation/save flow. Keep manual typing and saving without an example available throughout. Do not cache results in the card database.

6. **Disclose the additional text transfer without implying unknown retention.** Tatoeba's [Terms of Use, section 4](https://tatoeba.org/en/terms_of_use#section-4) describes logs of site operations and data storage/transfers, but does not state whether API search terms are retained. Update `privacy-policy.html` to identify Tatoeba, say the selected word or phrase and detected source language are sent as lookup inputs, link to those terms, and avoid claiming a specific API-query retention policy. The request also carries fixed search parameters and ordinary network metadata. Page context, source URL, saved cards, and study data are not lookup inputs. Do not add a separate backend.

7. **Test UI behavior with the established test framework.** Add a mobile test script using the workspace's Vitest version, JSDOM, and React Testing Library. Component tests must cover an incoming example (no replacement), user typing before lookup completion, stale completion after unmount, stale results when the capture changes while mounted, selecting/editing a suggestion, and no-results/failure fallback. Keep this test tooling in dev dependencies; do not introduce a separate test runner.

## Risks / Trade-offs

- [The corpus may have no useful CC0 result for a supported language or term] → Treat zero results as normal and retain manual entry and save.
- [Crowdsourced sentences can be awkward or contextually unsuitable] → Exclude unapproved results, identify Tatoeba and link each sentence, and let the user edit or decline every suggestion.
- [External service availability, latency, or API changes] → Bound request time, validate the response, and keep lookup independent of translation and saving.
- [Search syntax could interpret punctuation in selected text as an operator] → Escape query syntax, URL-encode parameters, and test punctuation and phrase cases.
- [Tatoeba does not specify API-query retention in its published terms] → Link its Terms of Use, describe only supported collection and data-location statements, and make no retention claim about API search text.
- [The shared app is bundled in the extension] → Apply the feature only in the shared `CaptureSheet`; keep the extension's separate in-page panel and direct context-menu save unchanged and cover them in integration verification.
- [The extension uses explicit host permissions for external services] → Add only `https://api.tatoeba.org/*` and verify the extension bundle can perform the lookup.
- [iOS capture is only built by the existing macOS workflow] → Validate the shared mobile bundle with existing commands, run the existing iOS simulator workflow, and separately smoke-test Share Sheet and Safari suggestion flows because that workflow builds but does not launch or exercise capture.
- [Sending selected text to a new third party changes the privacy surface] → Limit user-derived request content and update the privacy policy before release.
- [A source language maps incorrectly or has a different Tatoeba code] → Keep the mapping explicit, test all mapped codes, and fail closed for unmapped tags.
- [Component tests require browser APIs] → Use the existing Vitest runner with JSDOM and React Testing Library as development-only dependencies.

## Migration Plan

No data migration is needed. Ship the client lookup and privacy disclosure together. Rollback consists of removing the suggestion lookup/UI while retaining the existing editable example field and card data.
