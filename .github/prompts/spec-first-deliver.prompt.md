---
name: spec-first-deliver
description: Assess delivery readiness for a verified OpenSpec change without committing or publishing it.
argument-hint: OpenSpec change name
---

Assess delivery readiness for OpenSpec change `${input:changeName}`. Read its current status, the `.spec-first` review, approval, decision, and verification records, and inspect the final diff.

Delivery is ready only when the independent review is `BUILD`, the user approval is recorded, all OpenSpec tasks are complete, implementation verification passes, `openspec validate` passes, and all applicable LexBrain build/test/typecheck commands pass. Identify unrequested changes, unresolved risks, and missing evidence. If any gate is missing or failed, report not ready and do not archive.

Return a concise delivery report with the change/worktree/branch, summary of changed paths, requirement coverage, validation results, decisions, and remaining risks. Do not commit, push, open a pull request, or archive; wait for a separate explicit user instruction. Archive is a separate final action via `/opsx-archive` only after the report is ready.
