## Why

minispec copies the behavior of OpenSpec 1.14.3, so it also has defects that are open issues of OpenSpec (github.com/Fission-AI/OpenSpec, 133 open issues on 2026-10-26).
A run of the `minispec` binary on 2026-10-26 showed 7 gaps that minispec shares with OpenSpec.
The user selected all 7 for a fix, in the answer to the two questions "Gaps to fix" and "More gaps" (the user, 2026-10-26).

## What Changes

- `validate` gives an ERROR, not an INFO, when the archive would refuse a delta, so `validate` stops what `archive` stops (OpenSpec #1112).
- `validate` gives a WARNING when a scenario has no `WHEN` or `GIVEN` step, or no `THEN` step (OpenSpec #2078, PR #2079).
- `validate` gives a WARNING when another open change has a `MODIFIED`, `REMOVED`, or `RENAMED` entry for the same requirement (OpenSpec #1669).
- `archive --json` with open tasks and `--yes` puts the open task count in the JSON (OpenSpec #2006).
- A `MODIFIED` block can declare a scenario rename, so the old scenario is not counted as dropped (OpenSpec #1697, PR #1843).
- `status` marks an artifact `done` only when each section of its template has text (OpenSpec #1084).
- `validate` gives a WARNING when `tasks.md` has a duplicate task number or a number out of order (OpenSpec #311).

- The surface of minispec follows OpenSpec `1.15.0` for the kept commands: `spec-driven` reads as `story`, an unknown flag exits `2`, `--help` works, and `validate --archived`, `status --all`, `show --no-scenarios`, and `new change --goal` exist. The user wants minispec familiar to OpenSpec users, but lighter and only for Claude (the user, 2026-10-26).

## Capabilities

### Modified Capabilities

- `minispec`: stricter `validate`, a scenario rename, a content check in `status`, and the task count in `archive --json`.

## Impact

- Code: `plugins/claudetto/modules/spec/domain/validate.ts`, `domain/markdown.ts`, `domain/merge.ts`, `domain/graph.ts`, `adapters/check.ts`, `adapters/archive.ts`, `adapters/ctx.ts`.
- Tests: `tests/claudetto/spec/`, with a parity exception for each change that differs from OpenSpec 1.15.0.
- Skills: `plugins/claudetto/skills/propose/SKILL.md` and `skills/update/SKILL.md` name the rename form.
- Users: a change that passed `validate --strict` before can fail now, when the archive would refuse it.
