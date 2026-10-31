# Tasks

## 1. Block Kinds

- [x] 1.1 Remove `context` and `screen` from `BlockKind` in `plugins/claudetto/src/blocks/block.ts`, and point task 12.4 of `openspec/changes/release-0-1-0/tasks.md` at this change. Verify: `just check` exits 0, and `rg '"(context|screen)"' plugins/claudetto/src/blocks` finds no `kind` value.

## 2. `status-line` Block

- [x] 2.1 Probe first: add a `command.run` hook on `statusline` that answers `{ text }`, install the plugin into a temporary `CLAUDE_CONFIG_DIR`, and run `/statusline` in a real `2.1.314` session in `tmux`. Verify: the session prints the hook's text and the transcript holds no assistant turn for it. On a failure, stop and revise `design.md`. Ran on Claude Code `2.1.316`, the installed version, with `--plugin-dir` and the real config, since a fresh `CLAUDE_CONFIG_DIR` asks for a login. `/statusline` printed `claudetto: claudetto probe: /statusline answered by the hook`, and the transcript holds 0 `assistant` lines.
- [ ] 2.2 Move `settingsPath` and `heldSettings` from `plugins/claudetto/src/blocks/setup-command/hooks.ts` to `plugins/claudetto/src/shared/settings.ts`. Verify: `claude plugin test plugins/claudetto` reads the same pass count as before, and `just lint` passes `jscpd`.
- [ ] 2.3 Build `plugins/claudetto/src/blocks/status-line/` with kind `status-line`: the no-argument write of `STATUS_LINE_KEYS` through `applyTier`, the report, the argument pass-through when `Agent(statusline-setup)` is not denied, the denied answer, `next(e)` when the hook throws, and the `command.describe` label. Add it to `catalog.ts`. Verify: a unit spec and `plugins/claudetto/tests/status-line.test.ts` cover each scenario of `specs/status-line/spec.md` and pass, and the catalog test passes.
- [ ] 2.4 Confirm the label leaves the first request unchanged. Verify: `just capture --shipped` reads the same character count as `docs/prompt/footprint.md` records.
- [ ] 2.5 Add the `/statusline` line to `README.md`. Verify: the README line matches what a real `/statusline` run in the temporary config prints.

## 3. Release `0.1.1`

- [ ] 3.1 Move the four manifests to `0.1.1` and add a `[0.1.1]` section to `CHANGELOG.md`. Verify: `just validate` passes and `rg '"0\.1\.0"' $(git ls-files '*.json')` finds no manifest.
- [ ] 3.2 Run the gate, and review the change diff. Verify: `just check` exits 0, and a `claudetto:Athena` review of `main..feat/0.1.1` against this change reports no open defect.

## Workflow follow-up

- Archive `release-0-1-0`, then this change, after the owner's review.
- Open the pull request to `main` and merge after CI passes, when the owner asks.
