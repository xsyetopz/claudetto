## 1. Format

- [x] 1.1 Build the handoff text with the 9 sections of the spec in `modules/session/handoff/handover.ts`, with constraints word for word, user messages filtered, and one state for each task. Check: unit tests for "Pinned Version", "Task Notification", and "Next Task Open" fail before the change, then `bun test tests/claudetto/session/handoff/`.
- [x] 1.2 Write the same text to `.claude/claudetto/handoffs/`, and keep `/clear` and resume working from the file. Check: the lab tests in `plugins/claudetto/tests/handover.test.ts` pass, then `just lab`.

## 2. Code Compaction

- [x] 2.1 Answer `session.compact` with the handoff message and the tail by `handle`, with the tool pair rule, behind a `compaction` option value `code`. Check: lab tests for "Automatic Compaction" and "Tool Pair Kept" fail before the change, then `just lab`.
- [x] 2.2 Call `next(e)` on an error or an oversized head, and log the cause. Check: a lab test for "Build Error" fails before the change, then `just lab`.
- [x] 2.3 Check that the engine accepts the answer on Claude Code `2.1.310`: a session in the local stub runs `/compact`, and the transcript after it starts with the handoff message. Check: the stub run passes with no model call. If it needs a real model, ask the user first.

## 3. Probe

- [x] 3.1 Build the fixture and the probe script in `dev/`, for the arms B, C, and H at about 80k and 200k tokens, with 3 runs of each, on `claude-sonnet-5-5`. Check: a dry run of the script with no model call lists 18 forks.
- [ ] 3.2 Run the probe after the user approves the cost of each round, and write the evidence page in `src/wiki/claudetto/evidence/` with the cost, quality, and cache numbers of each arm. When the code arm misses a bar, change the code path and run the next round, with a new approval. Check: `just generate`, then `just check`.
- [ ] 3.3 Only when the code arm meets each bar of "Default Path from the Probe", set the default path and `PATH_TABLE` from the result, and add the entries to the `0.4.0-alpha.1` section of `CHANGELOG.md`, because each change of this session ships in `0.4.0-alpha.1` (the user, 2026-10-26). Check: `just check`.

## 4. Close

- [x] 4.1 Get a `claudetto:Reviewer` review of the diff against this plan, and fix each defect. Check: the review lists no open defect.
