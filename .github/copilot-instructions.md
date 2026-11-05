# LexBrain Agent Instructions

## Purpose

This repository uses OpenSpec and spec-first together for specification-driven development.

Use a risk-based workflow for development. Before starting, classify each change as DIRECT, LEAN, or FULL, explain the choice in one sentence, and use the lowest-cost workflow that safely handles it. Do not choose FULL simply because OpenSpec and spec-first are available. Workflows may escalate DIRECT → LEAN → FULL when concrete risk is discovered; do not automatically downgrade after implementation begins. Reuse investigation when escalating rather than restarting discovery.

## Workflow selection

### DIRECT

Use DIRECT for low-risk, localized changes such as typos, documentation, simple styling, obvious localized bug fixes, small UI adjustments, mechanical refactoring, or changes whose correctness is easily verified from the diff and focused tests.

Workflow: inspect relevant code → implement → focused validation.

- Do not create an OpenSpec change or invoke spec-first.
- Do not create evidence artifacts or run independent review.
- Do not create decision records unless there is a genuinely important decision.
- Read only files necessary for the change.
- If product behavior requiring specification is discovered, escalate to LEAN.

### LEAN

LEAN is the default for normal LexBrain feature development. Use it for normal product features, localized behavior changes, UI features, straightforward API changes, changes confined to one application/component, and changes with clear requirements and limited architectural risk.

Workflow: OpenSpec proposal/spec/tasks → Copilot implementation → applicable validation → one verification pass.

- OpenSpec owns requirements and acceptance criteria.
- Create `design.md` only when meaningful technical design is required.
- Do not run the independent spec-first reviewer by default.
- Do not generate a separate repository evidence document by default.
- Do not use a worktree by default.
- Do not duplicate OpenSpec requirements into other artifacts.
- Do not run both spec-first verification and OpenSpec verification when one verification pass can establish the requirements.
- Read only files relevant to the proposed change. Use focused tests during development and broader validation only when required before completion.
- Escalate to FULL only when a risk condition is discovered. Before escalating, report the risk, why LEAN is insufficient, and which additional FULL stages are required. Do not repeat completed discovery.

### FULL

Use FULL only for material engineering risk, including architecture changes; security or privacy-sensitive changes; authentication; persistence/storage redesign; data migration; destructive operations; synchronization architecture; major shared-code changes; changes spanning multiple LexBrain platforms; large refactoring; major API contracts; significant requirements ambiguity; risk of data loss from implementation errors; or repository evidence contradicting the proposed specification.

Workflow: OpenSpec explore/propose → requirements → design → tasks → repository grounding → independent spec-first review → user approval → isolated worktree → implementation → validation → verification → delivery readiness.

- Use the existing spec-first review process and require `BUILD` before implementation.
- `BUILD WITH CUTS` requires specification changes and re-review. `REFUSE` stops implementation.
- Require explicit user approval and use the existing worktree isolation process.
- Record important decisions, run applicable LexBrain validation gates, use spec-first verification where required, and verify OpenSpec requirements before delivery.

Workflow examples:

- DIRECT: fix flashcard button spacing; correct a README typo; fix an obvious null check.
- LEAN: add a favorite button to saved vocabulary; add replay pronunciation; add a flashcard filter; add a user preference.
- FULL: replace local storage; add synchronization between Android, web, and extensions; change the spaced repetition algorithm and migrate review data; add authentication; redesign saved-vocabulary persistence.

When uncertain between adjacent levels, start with the lower level and escalate if concrete risk is discovered. Specification-driven development reduces the cost of mistakes; do not spend more reasoning and specification effort than the risk justifies.

## Context and artifact efficiency

- Never scan the entire repository unless the task genuinely requires it.
- Search for relevant files and symbols before reading files; read only relevant portions of large files.
- Reuse existing OpenSpec specifications and project documentation. Do not regenerate information that already exists or repeatedly explain unchanged architecture.
- Do not copy OpenSpec requirements into spec-first artifacts. Reference existing artifacts instead of summarizing them repeatedly.
- Repository evidence should reference code rather than reproduce code. Collect formal evidence only for claims that materially affect architecture, scope, compatibility, security/privacy, destructive behavior, or data integrity.
- Use focused tests during implementation. Do not repeatedly run full-project validation while developing.
- Use one verification pass for LEAN changes.
- Do not use an independent second agent for DIRECT or normal LEAN changes.
- Use existing project documentation before rediscovering architecture from code.
- For LEAN, normally create only the OpenSpec proposal/specification and tasks. Create design documentation only for meaningful design decisions. Do not create artifacts merely because a template exists.
- For FULL, create only artifacts required by the actual risk and installed OpenSpec/spec-first workflow.

## Responsibility model

### OpenSpec

OpenSpec is authoritative for approved desired behavior, including:

- product requirements
- expected behavior
- acceptance criteria
- change proposals
- specification deltas
- technical design when needed
- implementation tasks
- verification against requirements
- current and living specifications

OpenSpec requirements are the source of truth for what the product should do.

### Repository evidence

The repository is authoritative for claims about the current implementation.

Use current source code, tests, configuration, and documentation to establish what exists today. A file path or line citation alone does not prove a claim; explain what the cited code establishes.

If an OpenSpec artifact makes a factual claim about the current implementation that conflicts with repository evidence, correct the OpenSpec artifact and repeat the required review. Do not silently implement a false premise.

### spec-first

spec-first controls whether the proposed transition from the current state to the approved desired state is safe to execute. It owns:

- repository grounding and evidence
- independent specification review
- scope control
- isolated implementation
- implementation decision records
- validation gates
- implementation-to-requirement verification
- delivery readiness

spec-first artifacts must reference the relevant OpenSpec change. Do not copy full OpenSpec requirements into `.spec-first/`.

## Instruction precedence

Apply guidance in this order:

1. LexBrain privacy, security, and architectural constraints evidenced by the repository
2. Explicit user-approved requirements
3. Approved OpenSpec specifications
4. Approved OpenSpec design and tasks
5. Current repository evidence for facts about the existing implementation
6. spec-first review and execution records
7. General coding-agent assumptions

If authoritative sources materially disagree, stop and report the exact conflict. Do not choose silently.

## FULL lifecycle

For FULL changes, follow this lifecycle:

1. Explore the request and current implementation
2. Run `/opsx-propose` to create or update the OpenSpec change
3. Complete its proposal, requirement deltas, design when needed, and tasks
4. Ground the proposed work in repository evidence
5. Obtain an independent spec-first review in a fresh chat
6. Resolve `BUILD WITH CUTS` or `REFUSE` outcomes
7. Stop for explicit user approval
8. Record approval under `.spec-first/runs/`
9. Run `/spec-first-implement` in an isolated Git worktree
10. Implement only the approved scope and record non-obvious decisions
11. Run applicable LexBrain validation gates
12. Run `/spec-first-verify`
13. Verify the implementation against OpenSpec requirements
14. Report delivery readiness
15. Commit, push, open a pull request, or archive only when the user separately requests that action

Do not skip required FULL stages. DIRECT and LEAN follow their workflow requirements above; the detailed stages below apply when required by FULL or when explicitly invoked by the user.

## 1. Explore

Before changing application code, follow the exploration steps required by the selected workflow:

- understand the user's request
- inspect relevant current OpenSpec specifications
- inspect the relevant LexBrain source code and nearby tests
- identify affected components, dependencies, constraints, and unknowns
- determine whether the change affects the web app, Android app, Chrome extension, Edge extension, shared code, storage, backend/API, translation, vocabulary, flashcards, learning/review, or synchronization
- limit investigation to areas relevant to the request

Do not modify product code during exploration.

If an important product decision cannot be determined from the request, approved specifications, or repository, ask the user. Do not invent missing requirements.

## 2. Create the OpenSpec change

For LEAN and FULL, use `/opsx-propose` to create or update the appropriate OpenSpec change.

The change should include, as applicable:

- proposal
- requirement or specification deltas
- design
- tasks

Requirements must be clear, observable, testable, and unambiguous. For changed behavior, identify relevant `ADDED`, `MODIFIED`, and `REMOVED` behavior.

OpenSpec must describe what the system should do. Avoid unnecessary implementation detail unless it is a genuine constraint or approved design decision.

## 3. Design

Create or update the OpenSpec design when the change requires meaningful technical decisions.

Consider:

- affected components and architecture
- interfaces and data flow
- data model, storage, and migration
- backward compatibility
- Android and browser-extension compatibility
- security and privacy
- performance
- testing approach

Prefer the smallest design consistent with LexBrain's current architecture. Do not include unrelated refactoring, speculative features, or unnecessary dependency upgrades.

## 4. Tasks

Break the approved change into implementation tasks. Each task should:

- map to an OpenSpec requirement when applicable
- have clear completion criteria
- be independently understandable
- be small enough to verify
- avoid unrelated scope

## 5. Repository grounding

Before implementation, ground important assumptions in the current repository.

For each material claim, record where practical:

- file path
- component, function, symbol, or configuration
- relevant line or location
- what the evidence establishes

Never invent evidence. If the proposed scope, design, or assumptions conflict with current code, stop and report the conflict. Update OpenSpec when necessary, then repeat review.

## 6. Independent review

For FULL, obtain a verdict from the Spec First Reviewer custom agent in a fresh chat with no planning or implementation conversation history.

The reviewer must assess:

- whether important claims are supported by repository evidence
- whether the plan satisfies the OpenSpec requirements
- whether requested behavior is missing
- whether unrequested behavior is included
- whether important edge cases are missing
- whether acceptance criteria are verifiable
- whether the test plan is sufficient
- whether existing behavior could regress
- whether all affected platforms are accounted for
- whether the plan contains unnecessary refactoring

Save the review under `.spec-first/reviews/`.

Allowed verdicts:

- `BUILD`
- `BUILD WITH CUTS`
- `REFUSE`

A `BUILD WITH CUTS` verdict requires the specified OpenSpec updates and a new independent review. A `REFUSE` verdict stops the change.

Any material edit to approved requirements or design invalidates the previous review and approval. Repeat review and obtain approval again.

## 7. Mandatory user approval

For FULL, no implementation begins until:

- the verdict is `BUILD`
- the review record exists under `.spec-first/reviews/`
- the user explicitly approves the named OpenSpec change
- approval is recorded under `.spec-first/runs/`

An agent cannot approve on the user's behalf.

Before asking for approval, present:

- OpenSpec change name
- goal
- requirements
- affected components
- implementation tasks
- repository evidence summary
- risks
- validation plan
- review verdict

Stop and wait for explicit approval.

## 8. Isolated implementation

For FULL, after approval, use `/spec-first-implement`.

Use a dedicated Git branch and an isolated Git worktree on Windows. Do not install or enable a Git hook. Do not implement directly on the main branch unless the user explicitly requests it.

For every task:

1. Read the corresponding OpenSpec requirement.
2. Inspect the relevant existing implementation.
3. Make the smallest correct change.
4. Add or update appropriate tests.
5. Run focused validation.
6. Update task status.

Do not silently expand scope.

## 9. Decision records

For FULL, record important non-obvious implementation decisions with the spec-first decision mechanism. For DIRECT and LEAN, decision records are unnecessary unless there is a genuinely important decision.

Each record should include:

- context
- decision
- alternatives considered
- reasoning
- consequences

Decision records may explain how an approved requirement is implemented. They must not silently change what the product should do. If observable behavior needs to change, update OpenSpec and repeat review and approval.

## 10. Validation gates

Use the existing pnpm workspace and preserve its lockfile. Do not invent validation commands.

The root validation commands are:

```text
pnpm test
pnpm typecheck
pnpm build:mobile
pnpm build:ext
```

There is no root lint script.

Run only the commands applicable to the affected components, and run applicable root gates before completion. Prefer focused validation during implementation; do not repeatedly run full-project validation. Broader gates are required before completion when applicable to the affected platforms. For example, do not run Android/mobile builds for a browser-extension-only change unless shared code makes mobile regression plausible.

Do not:

- skip failing tests
- disable failing tests
- weaken assertions merely to obtain a passing result
- bypass validation gates
- replace existing tooling without an approved requirement

When validation fails, determine whether the cause is implementation, test, requirement, design, or environment. Correct the appropriate source and rerun the relevant checks.

## 11. Verification

For FULL, after applicable validation gates pass, run `/spec-first-verify` where required and verify the implementation against OpenSpec. LEAN uses one verification pass sufficient to establish the requirements; do not duplicate spec-first and OpenSpec verification unnecessarily. DIRECT requires focused validation.

Classify each applicable requirement as:

- `PASS`
- `PARTIAL`
- `FAIL`
- `NOT VERIFIED`

Support `PASS` with implementation or test evidence. Also check for behavior outside the approved scope.

Do not mark the change ready for delivery while required items remain `PARTIAL`, `FAIL`, or `NOT VERIFIED`.

## 12. Delivery boundary

After successful verification, report that the change is ready for delivery. Include:

- changed files
- completed tasks
- tests added or modified
- validation results
- decision records
- satisfied requirements
- known limitations
- branch and worktree state

Do not commit, push, open a pull request, merge, or otherwise publish the change unless the user separately requests that action after the required gates pass.

## 13. OpenSpec archive

Do not archive automatically.

Archive only when:

- implementation is complete
- applicable tests and builds pass
- `/spec-first-verify` passes
- OpenSpec verification passes
- delivery is complete or the user explicitly directs archival
- the user separately requests the archive action

Ensure archival updates the current and living OpenSpec specifications correctly.

## Conflict handling

Never silently resolve conflicts among user requirements, OpenSpec artifacts, repository evidence, spec-first records, tests, and implementation.

When a material conflict occurs, stop and explain:

- what conflicts
- the repository evidence
- the affected requirement or design decision
- the recommended resolution
- which stages must be repeated

Wait for user direction when resolution changes product behavior.

## Scope control

Avoid:

- speculative features
- unrelated refactoring
- unnecessary dependency upgrades
- architecture rewrites
- formatting unrelated files
- changing tests merely to make gates pass

Prefer the smallest change that completely satisfies the approved specification.

## Completion criteria

A FULL change is complete only when:

- OpenSpec requirements are satisfied
- implementation matches the approved scope
- appropriate tests exist
- applicable validation gates pass
- `/spec-first-verify` passes
- OpenSpec verification passes
- relevant decisions are recorded
- delivery is complete or explicitly reported as ready
- archival is complete when separately requested

For LEAN, confirm the OpenSpec requirements and applicable validation in one verification pass. For DIRECT, confirm the diff and focused validation. Never claim completion based only on code generation.
