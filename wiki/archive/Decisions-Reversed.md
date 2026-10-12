# Decisions-Reversed

The decisions of 0.x that 1.0.0 reverses, with the reason for each reversal.
The decisions in force are in [Decisions](Decisions).

## Settings

- D35 No proprietary formats.
  Old choice: dotclaude writes no format of its own that Claude Code does not read or define, and a feature that needs a file for a later call to read back is not built.
  Reason: the user decided on 2026-10-12 that `.dotclaude/` holds dotclaude's own files, with an append-only `events.jsonl` for the spec store, and that `/handoff` returns.
  This also reverses the handoff clause of D5.
  Source: `.dotclaude/spec/changes/1.0.0/change.md` (Decisions of the user, 2026-10-12, and Scope), and `.dotclaude/spec/changes/1.0.0/packages/34-spec-events.md`.

## Prompt

None yet.

## Router

None yet.

## Tools

### D7 Auto-fix hook

- Old choice: a `PostToolUse` hook logged each edited path to a session file.
  A `Stop` hook ran the project formatters and linters on the logged files.
  The variable `DOTCLAUDE_AUTOFIX` turned it on.
- Reason for the reversal: the edited-files log is a state file, and 1.0.0 keeps no such file.
  The feature, its hooks, and the variable are removed.
- Sources: the line of [Release 0.28](Release-0.28) that says the auto-fix at `Stop` is gone.
  [Off-Switches](Off-Switches) says that no hook runs a project formatter outside the sandbox.

## Layout

- D19 Runtimes.
  Old choice: runtime JavaScript is `.mjs` on Node.js 22.18 or later, and tests and `tools/` run on Node.js with no Bun.
  Reason: 1.0.0 code is `.ts` with erasable syntax, the bins of the add-ons run on Bun, and the setup step checks Bun 1.4.3.
  Source: `CHANGELOG.md`, the `[Unreleased]` section, `package.json` `engines`, and `tests/support/runtimes.test.ts`.
- D21 Hand-off order.
  Old choice: the 0.28.0 plan ended in a hand-off, with a preparation group that ran a live patch of settings before the 0.28.0 work.
  Reason: 1.0.0 discards the 0.28.0 plan.
  Source: `.dotclaude/spec/changes/1.0.0/change.md`, "Decisions of the user", the first item.

## Evidence

- D27, the claim-check part: a `Stop` prompt hook judged the claims of each reply.
  The 0.28.0 choice was this hook, with no other check of a passed claim.
  Reason: the hook failed its hook eval on 2026-10-12, because a block carried the whole evaluator prompt, and a repeated reply passed in 2 of 3 runs.
  Source: [Stop-Prompt-Hooks](Stop-Prompt-Hooks), section "Removal in 0.29.0".
