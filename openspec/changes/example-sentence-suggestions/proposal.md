# Proposal

## Why

When a captured word or phrase has no surrounding sentence, the mobile capture sheet currently leaves users to invent, paste, or skip an example. Sample sentences can provide useful context while keeping the saved example under the user's control.

## What Changes

- When the example field is empty for a captured word or phrase, retrieve several best-effort sample sentences from a free multilingual sentence source using the detected source language.
- Let the user select a suggestion to fill the existing editable example field. Preserve any supplied or user-entered example, and keep manual entry and saving available when lookup has no results or fails.
- Disclose that the selected word or phrase and detected language are sent to Tatoeba for lookup, and link its terms; do not send saved cards, study data, or the full captured context.

## Capabilities

### New Capabilities
- `example-sentence-suggestions`: Find and choose sample sentences when a captured word or phrase has no example.

### Modified Capabilities

## Impact

The shared `CaptureSheet` used by Android, iOS Share Sheet/Safari capture, web manual entry, and the extension's bundled app, shared example lookup logic, privacy policy, the extension's narrowly scoped Tatoeba host permission, and focused tests are in scope. The extension's separate in-page capture panel and direct context-menu save remain unchanged. Existing context extraction and card persistence remain in use; no storage migration or backend is proposed. The exact free source and its query/attribution constraints are resolved in the design.