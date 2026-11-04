---
name: spec-first-review
description: Prepare an independent, evidence-grounded review of an OpenSpec change before implementation.
argument-hint: OpenSpec change name
agent: Spec First Reviewer
---

Review OpenSpec change `${input:changeName}`. This prompt must run in a fresh chat with the `Spec First Reviewer` custom agent selected. If you cannot confirm that there is no prior planning or implementation discussion in this chat, stop and request a new chat; do not claim an independent review.

Before opening the fresh reviewer chat, the coordinating chat must run `openspec status --change "${input:changeName}" --json` and provide the concrete proposal, specs, design, and tasks paths. Ask for the change name if missing or ambiguous. The reviewer has read/search tools only and must request missing paths rather than running shell commands or guessing. Do not write code or change OpenSpec artifacts during review.

Return exactly one verdict: `BUILD`, `BUILD WITH CUTS`, or `REFUSE`. Ground factual findings in current repository files with path and line references. Check unsupported claims, scope creep, affected flows, tests, privacy/security impact, and feasibility. For cuts, name the exact OpenSpec artifacts and changes needed. The reviewer does not approve implementation; only the user can do that.
