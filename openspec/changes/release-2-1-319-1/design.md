# Design

## Context

`release-2-1-319` (`openspec/changes/archive/2026-11-09-release-2-1-319/`) rebuilt claudetto on the Claude Code v2.1.319 engine. `ISSUES-2026-11-09-1422.md` records what held the agent back since. This change keeps the engine and the version string.

## Goals

- Fix or record each open item of `ISSUES-2026-11-09-1422.md`.
- Re-audit every rule, gate, and hook (issue item 16).

## Non-Goals

- A new Claude Code engine version.
- A new version string. `package.json` stays at `2.1.319`.

## Decisions

- Branch `feat/2.1.319+1`, change `release-2-1-319-1`. The person chose the SemVer build-metadata form, because build metadata marks a build without a new version.
- The first delta is `constraint-ledger`, because issue items 3 and 13 recur on every prompt: the ledger showed "Do not delete branch 2-1-319" and "Leave alone ... package.json" again on 2026-11-09 while this change was set up. The other deltas follow from tasks 1.1 and 1.2.

## Issue Map

| Item (2026-11-09) | Delta | Code |
| --- | --- | --- |
| 1 | permission-policy: protected-path check | `hooks/gate/processes.ts` |
| 2 | permission-policy: branch gate | `hooks/gate/processes.ts:286-293` |
| 3, 13 | constraint-ledger | `hooks/pin.ts`, `texts.ts:442-445` |
| 4 | permission-policy: Read redirect | `hooks/gate/rules.ts:120-121` |
| 5 | out of reach: core classifier | none |
| 6 | out of reach: MCP environment | none |
| 7, 8 | run-limits | `hooks/slices.ts:128-139`, `texts.ts:61-69` |
| 9 | claim-check | `texts.ts:473-475` |
| 10 | lean-openspec | `plugins/claudetto-openspec/openspec.ts:97-104`, `justfile:46` |
| 11 | session-handoff | `hooks/handoff/` |
| 12 | permission-policy: standing instruction | work gate |
| 14 | agent-conduct | `Concise.md:23`, `limits/open-items.ts:12` |
| 15 | later: probe whether Mods and the TUI allow a reply to one part | none yet |
| 16 | task 1.2 | all |

The 2026-11-02 items 1 and 5 (classifier) and 6 (prompt wording review) stay out of reach; item 11 (message 0 rewrite) joins the probe in task 3.

## Handover Instead of Compaction

Read on 2026-11-09 in the 2.1.319 engine and the Mods types; no runtime probe ran, because the classifier denied the cc-inspect run.

- A `session.compact` hook that answers with its own `messages` makes no summarizer request and keeps the cached prefix (`index.d.ts:11734-11754`). Claudetto's forked handover (`hooks/handoff/handover.ts:45-69, 125-160`) already does this.
- `$.command.run({command:"clear"})` then `$.prompt.submit(text)` clears and seeds, but the seed is a user prompt, not a compact summary; the Mods API has no way to clear and install a compaction boundary at once. The two routes are kept for two jobs: the handover inside a task, the clear at a task boundary.
- Observed in this project's transcripts: the first request after the built-in compaction read 5,819 and wrote 19,448 tokens at 1h; the first after a typed `/clear` read 5,819 and wrote 7,101. ISSUES 2026-11-02 item 12 measured a handover at $0.043 against $0.094 for the built-in compaction at 166k tokens, one run per arm.
- Decision: keep the forked handover as the path inside a task and the handoff tool plus clear at task boundaries; change the threshold only from the four-arm probe in `specs/compaction-path/spec.md`, because the existing data has one run per arm.

## Risks

- The re-audit can widen the change past the issues file. Task 1.2 lists each removal for review before any code moves.
