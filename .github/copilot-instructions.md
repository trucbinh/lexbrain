# LexBrain Agent Instructions

## Project workflow

This repository uses OpenSpec and spec-first together for specification-driven development.

For non-trivial features, behavior changes, architectural changes, refactoring, and bug fixes with product impact, use the workflow defined below.

OpenSpec and spec-first have separate responsibilities.

### OpenSpec owns

OpenSpec is the source of truth for:

- product requirements
- expected behavior
- acceptance criteria
- change proposals
- specification deltas
- technical design when required
- implementation tasks
- verification against requirements
- living/current specifications

Do not duplicate OpenSpec requirements into spec-first artifacts.

### spec-first owns

spec-first is the execution-control layer for:

- grounding implementation assumptions against the repository
- repository evidence
- independent specification review
- scope control
- isolated implementation
- implementation decision records
- validation gates
- delivery readiness

spec-first artifacts should reference the relevant OpenSpec change.

---

# Required development lifecycle

For a new feature or significant change, follow:

OpenSpec Explore
→ OpenSpec Propose
→ Requirements
→ Design when needed
→ Tasks
→ spec-first Ground
→ spec-first Review
→ USER APPROVAL
→ Isolated Implementation
→ Tests / Lint / Type Check / Build
→ OpenSpec Verify
→ spec-first Delivery
→ OpenSpec Archive

Do not skip required stages.

---

# Phase 1: Explore

Before creating or modifying application code:

1. Understand the user's request.
2. Inspect relevant existing OpenSpec specifications.
3. Inspect the relevant LexBrain implementation.
4. Inspect relevant tests.
5. Identify affected components.
6. Identify constraints and dependencies.
7. Identify unknown requirements.

For LexBrain, determine whether the change affects any of:

- web application
- Android application
- Chrome extension
- Edge extension
- shared application code
- storage/database
- translation functionality
- vocabulary functionality
- flashcards
- learning/review functionality
- synchronization
- backend/API

Only investigate areas relevant to the requested change.

Do not modify product code during exploration.

---

# Phase 2: OpenSpec change

Create or update the appropriate OpenSpec change.

The OpenSpec change should contain the appropriate:

- proposal
- requirement/specification deltas
- design
- tasks

Requirements must be:

- clear
- observable
- testable
- unambiguous

For changed behavior, explicitly identify relevant:

- ADDED behavior
- MODIFIED behavior
- REMOVED behavior

Do not invent missing product requirements.

If an important product decision cannot be determined from the request, existing specifications, or codebase, ask the user.

---

# Phase 3: Design

Create or update the OpenSpec design when implementation requires meaningful technical decisions.

Consider:

- affected components
- architecture
- interfaces
- data flow
- data model
- storage
- migration
- backwards compatibility
- browser extension compatibility
- Android compatibility
- security
- performance
- testing

Prefer the smallest implementation consistent with LexBrain's existing architecture.

Do not include unrelated refactoring.

---

# Phase 4: Tasks

Break the approved change into implementation tasks.

Each task should:

- correspond to an OpenSpec requirement when applicable
- have clear completion criteria
- be independently understandable
- be small enough to verify
- avoid unrelated scope

---

# Phase 5: spec-first grounding

Before implementation, use the installed spec-first workflow to ground the proposed change in the actual repository.

Validate important assumptions using repository evidence.

Evidence should specify, where practical:

- file
- component/function/symbol
- relevant location
- what the evidence establishes

Never invent repository evidence.

If repository evidence contradicts an OpenSpec assumption, stop and report the conflict.

OpenSpec remains the requirements source of truth, but an incorrect requirement or assumption must not be silently implemented.

---

# Phase 6: Independent review

Use the spec-first review workflow before implementation.

Review:

1. Are important claims supported by repository evidence?
2. Does the plan satisfy the OpenSpec requirements?
3. Is any requested behavior missing?
4. Is any unrequested behavior included?
5. Are important edge cases missing?
6. Are acceptance criteria verifiable?
7. Is the testing plan sufficient?
8. Could existing functionality regress?
9. Are affected platforms accounted for?
10. Does the plan contain unnecessary refactoring?

Use the spec-first review outcome:

- BUILD
- BUILD WITH CUTS
- REFUSE

For BUILD WITH CUTS, remove or correct the rejected scope before continuing.

For REFUSE, do not implement.

---

# Mandatory approval checkpoint

For non-trivial changes, STOP before implementation.

Present:

- OpenSpec change name
- goal
- requirements
- affected components
- implementation plan
- repository evidence
- risks
- validation plan
- spec-first review result

Wait for explicit user approval.

Do not begin implementation simply because the specification exists.

---

# Phase 7: Implementation

After approval, use spec-first's isolation workflow when available.

Prefer implementation on:

- a dedicated Git branch
- an isolated Git worktree

Do not implement directly on the main branch unless explicitly requested.

For every task:

1. Read the corresponding requirement.
2. Inspect the relevant existing code.
3. Implement the smallest correct change.
4. Add or update tests.
5. Run focused validation.
6. Update task status.

Do not silently expand scope.

---

# Implementation decisions

Record non-obvious technical decisions using the spec-first decision mechanism.

Record:

- context
- decision
- alternatives
- reasoning
- consequences

Implementation decisions may clarify HOW a requirement is implemented.

They must not silently change WHAT the product should do.

If observable behavior needs to change, update and review OpenSpec first.

---

# Validation gates

Before considering implementation complete, run the repository's applicable existing validation commands.

Use actual commands defined by LexBrain.

When available and applicable, validate:

- unit tests
- integration tests
- type checking
- lint
- build
- Android build/tests
- Chrome extension build/tests
- Edge extension build/tests

Do not invent replacement tooling.

Do not:

- skip failing tests
- disable failing tests
- weaken assertions only to obtain a passing build
- bypass validation gates

When validation fails, determine whether the problem is:

- implementation
- test
- requirement
- design
- environment

Correct the appropriate source of the problem and rerun the relevant validation.

---

# Phase 8: OpenSpec verification

After implementation passes project gates, verify the implementation against OpenSpec.

For every applicable requirement classify it as:

- PASS
- PARTIAL
- FAIL
- NOT VERIFIED

PASS should be supported by implementation or test evidence.

Do not archive a change containing unresolved PARTIAL, FAIL, or required NOT VERIFIED requirements.

Also check for implementation outside the approved scope.

---

# Phase 9: Delivery

Use the spec-first delivery workflow.

Before delivery report:

- changed files
- completed tasks
- tests added or modified
- validation results
- recorded decisions
- requirements satisfied
- known limitations

Do not automatically merge unless explicitly requested.

---

# Phase 10: OpenSpec archive

Archive an OpenSpec change only when:

- implementation is complete
- required tests pass
- required builds pass
- validation gates pass
- OpenSpec verification passes
- delivery is complete

Ensure the archive updates the current/living specifications correctly.

---

# Conflict handling

Never silently resolve conflicts among:

1. user requirements
2. OpenSpec requirements
3. current LexBrain behavior
4. spec-first evidence
5. implementation

When significant conflicts occur:

STOP

Explain:

- what conflicts
- repository evidence
- affected requirement
- recommended resolution

Wait for user direction when the conflict changes product behavior.

---

# Scope control

Do not make unrelated changes.

Avoid:

- speculative features
- unrelated refactoring
- unnecessary dependency upgrades
- architecture rewrites
- formatting unrelated files
- modifying tests simply to make gates pass

Prefer the smallest change that completely satisfies the approved specification.

---

# Source-of-truth hierarchy

Use this hierarchy:

1. Explicit user-approved requirements
2. Approved OpenSpec specifications
3. Approved OpenSpec design and tasks
4. Current repository evidence
5. spec-first review and execution artifacts
6. General agent assumptions

When two authoritative sources materially disagree, stop instead of choosing silently.

---

# Completion criteria

A non-trivial change is complete only when:

- OpenSpec requirements are satisfied
- implementation matches approved scope
- appropriate tests exist
- applicable validation gates pass
- OpenSpec verification passes
- relevant decisions are recorded
- delivery is ready or complete
- OpenSpec is ready to archive or has been archived

Never claim completion based only on code generation.

## Instruction Precedence

Apply guidance in this order:

1. LexBrain architecture, privacy, and security constraints evidenced by the repository.
2. Requirements in the approved OpenSpec change.
3. The approved OpenSpec design and tasks.
4. Repository evidence and findings recorded under `.spec-first/`.
5. General coding-agent instructions.

If source code, approved OpenSpec artifacts, and `.spec-first/` execution records disagree, stop and report the exact conflict. Do not silently choose a source.

## Required Change Gate

- Use `/opsx-propose` to create the OpenSpec proposal, requirement deltas, design, and tasks. OpenSpec is the sole source of requirements; `.spec-first/` records link to those artifacts and never copy their full content.
- Before implementation, ground the proposed scope in current repository files and line-level evidence, then obtain a verdict from the `Spec First Reviewer` custom agent in a fresh chat with no planning or implementation conversation history.
- No implementation begins until the review verdict is `BUILD`, the review record is saved under `.spec-first/reviews/`, and the user explicitly approves the named OpenSpec change. Record the approval in `.spec-first/runs/`; an agent cannot approve on the user's behalf.
- A `BUILD WITH CUTS` requires the specified OpenSpec artifact changes and a new review. `REFUSE` stops the change. Any material edit to approved requirements or design invalidates the prior review and approval.
- Use `/spec-first-implement` only after these gates pass. Use a Git worktree on Windows; do not install or enable a Git hook.
- Use `/spec-first-verify` before delivery. Do not archive until OpenSpec validation, implementation-to-requirement verification, and the applicable LexBrain checks pass.

## Repository Evidence And Validation

- Inspect the current code, nearby tests, and docs; cite paths and line numbers for factual claims. A valid path citation alone does not prove a claim.
- The root scripts are `pnpm test`, `pnpm typecheck`, `pnpm build:mobile`, and `pnpm build:ext`. There is no root lint script. Do not invent validation commands.
- Preserve the pnpm workspace and lockfile. Do not change application code during workflow setup.
- Do not commit, push, open a pull request, or archive unless the user separately asks for that action after the required gates.
