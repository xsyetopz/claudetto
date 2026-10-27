## Why

claudetto writes its project state to `<project>/.claudetto/`, a second dot folder next to `.claude/`, and keeps the state of the user only in the temp folder, where a reboot removes it.
The user wants no `.claudetto/` folder: the project state goes to `.claude/claudetto/`, and the state of the user goes to `${CLAUDE_CONFIG_DIR:-~/.claude}/claudetto/` (the user, 2026-10-26).

## What Changes

- **BREAKING** The project state (`handoffs/`, `goal.json`) moves from `<project>/.claudetto/` to `<project>/.claude/claudetto/`.
- At `session.start`, an old `<project>/.claudetto/` folder moves to `.claude/claudetto/` when that folder does not exist (the user, 2026-10-26).
- The state of the user that must outlive a reboot goes to `${CLAUDE_CONFIG_DIR:-~/.claude}/claudetto/`. The first file is the last limit reading of the status line, which then needs no key for each config folder. The edit ledger, the gate log, and the git cache stay in the temp folder.
- The `.gitignore` step of task 20.4 of `redesign-0-4-0` and `claudetto-setup --apply` write `/.claude/claudetto/` in place of `/.claudetto/`. An entry that ignores `.claude/` also covers the folder.
- The protected file `.claudetto/goal.json` is now `.claude/claudetto/goal.json`.

## Capabilities

### New Capabilities

- `state-folders`: where claudetto keeps the state of a project and of a user, the move of the old folder, and the `.gitignore` entry.

### Modified Capabilities

- `handover`: the handoff files go to `.claude/claudetto/handoffs/`.
- `minispec`: handoffs go to `.claude/claudetto/handoffs/`.
- `release-evidence`: the findings file of the fault map is `.claude/claudetto/0.3.0-findings.md`.

## Impact

- Code: `modules/project/domain/paths.ts`, `modules/project/domain/gitignore.ts` (also used by `modules/setup/adapters/cli.ts`), `modules/session/hygiene/adapters/mod.ts`, `modules/work/protect/limits.ts`, `modules/statusline/adapters/last-limits.ts`, `dev/sandbox/domain/clean.ts`, and the lab and unit tests that name the old path.
- Repo: `.gitignore`, `justfile`, `.markdownlint-cli2.jsonc`, and the wiki pages in `src/wiki/`.
- Users: a handoff or a goal from before the update moves with its folder at the first session start, so no state is lost.
