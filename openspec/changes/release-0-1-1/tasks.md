# Tasks

## 1. Block Kinds

- [x] 1.1 Remove `context` and `screen` from `BlockKind` in `plugins/claudetto/src/blocks/block.ts`, and point task 12.4 of `openspec/changes/release-0-1-0/tasks.md` at this change. Verify: `just check` exits 0, and `rg '"(context|screen)"' plugins/claudetto/src/blocks` finds no `kind` value.

## 2. `status-line` Block

- [x] 2.1 Probe first: add a `command.run` hook on `statusline` that answers `{ text }`, install the plugin into a temporary `CLAUDE_CONFIG_DIR`, and run `/statusline` in a real `2.1.314` session in `tmux`. Verify: the session prints the hook's text and the transcript holds no assistant turn for it. On a failure, stop and revise `design.md`. Ran on Claude Code `2.1.316`, the installed version, with `--plugin-dir` and the real config, since a fresh `CLAUDE_CONFIG_DIR` asks for a login. `/statusline` printed `claudetto: claudetto probe: /statusline answered by the hook`, and the transcript holds 0 `assistant` lines.
- [x] 2.2 Move the settings path and parse of `plugins/claudetto/src/blocks/setup-command/hooks.ts` to pure `settingsFileFor` and `settingsOf` in `plugins/claudetto/src/settings-file.ts`. Verify: `claude plugin test plugins/claudetto` reads the same pass count as before, and `just lint` passes `jscpd`. `claude plugin test plugins/claudetto` reads 209 pass, 0 fail, before and after, and `just lint` exits 0.
- [x] 2.3 Build `plugins/claudetto/src/blocks/status-line/` with kind `status-line`: the no-argument write of `STATUS_LINE_KEYS` through `applyTier`, the report, the argument pass-through when `Agent(statusline-setup)` is not denied, the denied answer, `next(e)` when the hook throws, and the `command.describe` label. Add it to `catalog.ts`. Verify: a unit spec and `plugins/claudetto/tests/status-line.test.ts` cover each scenario of `specs/status-line/spec.md` and pass, and the catalog test passes. Both `command.run` handlers live in `plugins/claudetto/src/blocks/settings-commands.ts` with one `$` read of the settings, since the hook loader takes `$` into a helper only within one file. The `status-line.test.ts` lab reads 8 pass, `claude plugin test plugins/claudetto` 216 pass, 0 fail, and `bun test` of the `status-line` spec, `catalog.spec.ts` and `tests/claudetto/tier` 139 pass, 0 fail.
- [x] 2.4 Confirm the label leaves the first request unchanged. Verify: `just capture --shipped` reads the same character count as `docs/prompt/footprint.md` records. Read on Claude Code `2.1.316`: `just capture --arm plugin --shipped` reads 31,213 against the 31,237 recorded on `2.1.314`, and the tree of `main` reads 31,182 from a path 31 characters shorter, so the two requests are equal and the label adds nothing. The 24 are the engine's, in the sandbox block, and `just inventory` holds all three rows after the constants were read again.
- [ ] 2.5 Add the `/statusline` line to `README.md`. Verify: the README line matches what a real `/statusline` run in the temporary config prints.

## 3. Release `0.1.1`

- [ ] 3.1 Move the four manifests to `0.1.1` and add a `[0.1.1]` section to `CHANGELOG.md`. Verify: `just validate` passes and `rg '"0\.1\.0"' $(git ls-files '*.json')` finds no manifest.
- [ ] 3.2 Run the gate, and review the change diff. Verify: `just check` exits 0, and a `claudetto:Athena` review of `main..feat/0.1.1` against this change reports no open defect.

## Workflow follow-up

- Archive `release-0-1-0`, then this change, after the owner's review.
- Open the pull request to `main` and merge after CI passes, when the owner asks.
