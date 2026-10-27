## Context

`modules/project/domain/paths.ts` holds `CLAUDETTO_DIR = ".claudetto"`, and `HANDOFF_DIR` and `GOAL_FILE` build on it.
`modules/work/protect/limits.ts` names `.claudetto/goal.json` as a protected file.
The status line keeps the last limit reading in the temp folder as `claudetto-limits-<hash of CLAUDE_CONFIG_DIR>.json` (`modules/statusline/adapters/last-limits.ts:12-18`).
The mod file API has `read`, `write`, `list`, `exists`, `stat`, and `ancestors`, and no rename (`.claude-plugin/types/claude-code/index.d.ts`).

## Decisions

- **One constant.** `CLAUDETTO_DIR` becomes `.claude/claudetto`, so `HANDOFF_DIR`, `GOAL_FILE`, and each reader follow it. Alternative: a new constant for each file, which keeps two names for one folder.
- **Move with `/bin/mv`.** The mod has no rename, so the move runs `/bin/mkdir -p <project>/.claude` and `/bin/mv <project>/.claudetto <project>/.claude/claudetto` through `$.process.run`, by absolute paths as the protect rule does. Alternative: a copy file by file with `$.fs`, which cannot keep binary files or modes and leaves two copies when it fails in the middle.
- **Move before the other start steps.** The move runs in the `session.sweep` hook, awaited before `next(e)`, like the `.gitignore` step. A failed move adds no stop, and the old folder stays.
- **Parent covers child.** The `.gitignore` match compares the key of each line with the key of the entry and with each parent folder of it, so `.claude/` covers `.claude/claudetto/`.
- **User folder for the limits only.** The last limit reading must outlive a reboot to show a `7d` reading, so it moves to `${CLAUDE_CONFIG_DIR:-~/.claude}/claudetto/limits.json`. The ledger, the gate log, and the git cache stay in the temp folder, because a reboot ends each session that they serve.

## Risks / Trade-Offs

- [Risk] No hook of `classic.SessionStart` reads a handoff file today, because the model reads it by the path in `HANDOVER_RESUME`. -> The order of the two start hooks does not matter now, and a new hook that reads a handoff at start must run after the move.
- [Risk] When the project is the home folder and `CLAUDE_CONFIG_DIR` is not set, the project folder and the user folder are the same `~/.claude/claudetto/`. -> An old `~/.claudetto/` does not move after the status line made the folder.
- [Risk] Claude Code asks before an `Edit` or a `Write` of a file in `.claude/`. -> The mod writes the state with `$.fs`, not with a tool, and the model only reads it.
- [Risk] A user tracks `.claude/` in git with no ignore line. -> The `.gitignore` step adds `/.claude/claudetto/`, so the state stays out of commits.
