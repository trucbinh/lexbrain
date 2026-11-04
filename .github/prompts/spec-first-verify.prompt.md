---
name: spec-first-verify
description: Verify an implementation against its approved OpenSpec requirements and LexBrain validation gates.
argument-hint: OpenSpec change name
---

Verify OpenSpec change `${input:changeName}`. Resolve its root and artifact paths from `openspec status --change "${input:changeName}" --json`; do not assume paths. Read the approved requirements, design, tasks, review record, and implementation run record.

Check that each requirement scenario and task is implemented, that code behavior matches the approved design, and that no unrequested changes or unresolved conflicts remain. Cite implementation and test evidence by path and line. Run the exact existing validation commands: `openspec validate "${input:changeName}" --json`, `pnpm test`, `pnpm typecheck`, `pnpm build:mobile`, and `pnpm build:ext`. Do not substitute guessed commands or report a gate as passed if it was not run successfully. There is no root lint script.

Record commands, exit results, requirement-to-evidence mapping, unresolved findings, and verification status in `.spec-first/runs/${input:changeName}.md`, linking to OpenSpec artifacts rather than copying their contents. Any failed gate, unmet requirement, missing evidence, or artifact/code conflict means verification is not ready and archive is prohibited.
