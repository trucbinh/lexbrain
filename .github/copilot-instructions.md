# LexBrain Agent Instructions

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
