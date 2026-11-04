---
name: spec-first-log-decision
description: Record a non-obvious implementation decision for an approved OpenSpec change.
argument-hint: OpenSpec change name and decision
---

Record the decision for OpenSpec change `${input:changeName}` in `.spec-first/decisions/${input:changeName}.md`. Before writing, confirm the named change exists and the decision arose during its approved implementation. Capture only the choice, alternatives considered, rationale, evidence paths, and impact. Link to the relevant OpenSpec design/task artifact; do not duplicate requirements or redesign the approved change here.

If the decision changes requirements, scope, or approved design, stop and ask to update the OpenSpec change and repeat the independent review before continuing implementation.
