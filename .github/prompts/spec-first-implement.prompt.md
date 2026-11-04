---
name: spec-first-implement
description: Implement only a reviewed and explicitly approved OpenSpec change in an isolated Git worktree.
argument-hint: Approved OpenSpec change name
---

Implement OpenSpec change `${input:changeName}` only when all prerequisites are present:

- OpenSpec status shows the complete planning artifact set for the change.
- `.spec-first/reviews/${input:changeName}.md` records a fresh independent `BUILD` verdict for these exact artifact versions.
- `.spec-first/runs/${input:changeName}.md` records explicit user approval for this exact change. Never infer approval from the original feature request, a reviewer verdict, or an agent's own statement.

If any prerequisite is missing, a review is not `BUILD`, or artifacts changed since review, stop and report what is missing. Do not edit code or mark tasks complete.

Before implementation, check `git status --short`, the default branch, existing branches, and `git worktree list`. Do not overwrite or reuse an existing branch or worktree. Create a separate worktree using the verified base branch, branch `spec/${input:changeName}`, and a sibling path such as `../lexbrain-${input:changeName}`. If the branch/path is unsafe, exists, or cannot be created, stop and give the user the exact manual issue; do not fall back to editing the current checkout.

Read the approved OpenSpec tasks and their linked artifacts before each task. Implement only requested scope, add/update focused tests, and record non-obvious decisions with `/spec-first-log-decision`. Run relevant checks as work progresses. Do not commit, push, open a PR, or archive. Record changed paths and worktree details under `.spec-first/runs/${input:changeName}.md`.
