---
status: accepted
date: 2026-11-16
---
# Run Limits Removed

## Context and Problem Statement

2.1.322 ran many Stop-time checks. The audits show Stop loops that asked the agent to commit files it did not write, and blocks up to 44 times in a row.

## Considered Options

- Keep the Stop blocks and shrink them.
- Remove them; use `/goal`, `TaskStop`, a classic Stop command hook for the What I Need form, and a prompt-type Stop hook for the fault list.

## Decision Outcome

Chosen: Removed (D323 Decision 6). Gone: Open Items at Stop; Background Tasks at Stop (the agent uses `TaskStop`, `/goal` continues); the Stop-loop stall stop (`stallStop` turned a `/goal` block into `preventContinuation`, pausing the goal 8 times in 6 sessions; the user ends a goal with `/goal clear`); Named Files Exist (`named-files.ts` ran `$.fs.exists` on non-path words); Uncommitted Session Changes Block the Stop Once (`useSliceCommits` blocked up to 44 times in a row; the commit rule stays a prompt line); the slice tracker, other-edits commit text, headless commit exception; closing-stop leftover removal (the SessionStart hygiene sweep does it); subagent removal of own leftovers; Refuse Repeated Failures (`useMemoryHold/admit.ts`, never fired). This supersedes the matching D321 items and the run-limits spec.

## Consequences

- Good: no Stop loop on files the agent did not write.
- Bad: the loss of the two-model vote waits for a paid replay.
- Run limits (removed): the first Stop block after no write became a stall stop (a flag set by a write that ran and cleared by every Stop; at a Stop block with the flag clear return `preventContinuation` and a `stopReason` naming the loop and `/goal clear`), replacing the block counter (3, or cap 8, also `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`); a never-met goal ended after 1 check (4 requests against 18). The identical-failure (3 identical failures) and heavy-context (20 calls, 400,000 heavy tokens, 12 starts per 600 s) refusals sat in one run-limits owner and failed open on a state fault. Command-step rules at Stop: `- [ ] ! gh auth login` was blocked with advice to use a `- ! <command>` bullet (owner decision 2026-11-09); two such bullets blocked once naming both; a Stop hook read `transcript_path` and blocked a bullet whose command no earlier Bash call ran or last run succeeded (D323 7.22); a prompt-type Stop hook judged by model, with no word regex, and counted typed slash-command arguments (a `/goal` condition) as the user's words.

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:119; openspec/changes/archive/2026-11-16-2-1-323/specs/run-limits/spec.md:97; openspec/changes/archive/2026-11-16-2-1-323/design.md:99; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:525; openspec/specs/run-limits/spec.md:99.
