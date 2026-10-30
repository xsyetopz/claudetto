# ISSUES.md

Problems found while working in this repository. An open entry moves to "Fixed" with the commit that fixes it.

## Open

### Stray edits from a broken `cp -R` in the main tree

A `cp -R` from a worktree copied three changed files into the main tree. Each one sits there as an uncommitted edit, and each one shows up again in every fresh worktree that copies the main tree's changes, so each commit has to leave them out by hand.

| File | Change | Effect if committed |
| --- | --- | --- |
| `biome.jsonc` | `$schema` moves from `2.6.3` to `2.6.4` | Wrong: `package.json` pins `@biomejs/biome` at `~2.6.3`, and `bunx biome --version` reads `2.6.3`. |
| `plugins/claudetto-you-should-know/src/options.ts` | `DEFAULT_EFFORT` moves from `"medium"` to `"high"` | Wrong: its own comment requires it to equal the manifest's `default`, and `plugins/claudetto-you-should-know/.claude-plugin/plugin.json` reads `"medium"`. With the edit in place, `just check` fails at `tests/repo/manifests.test.ts:49` (expected `"high"`, received `"medium"`). |
| `plugins/claudetto/commands/setup.md` | The body is rewrapped into two paragraphs | Text unchanged. The model reads the same words. |

Fix: run `git restore` on the three paths in the main tree, after the owner confirms that none of them is wanted. If the `high` effort is wanted, change the manifest `default` and `DEFAULT_EFFORT` together in one commit.

### `bunx ctx7` is denied by the auto mode classifier

Running the Context7 CLI, `bunx ctx7 --help`, was denied as code from outside the repository (2026-10-30). The docs lookup of D35 runs that CLI, so it cannot be run live from an auto mode session here, and its arguments were read from `packages/cli/README.md` of `upstash/context7` instead.

Fix: the owner adds a permission rule such as `Bash(bunx ctx7:*)` to the settings, or runs the CLI once by hand to confirm its output.

## Fixed

### A hook lab file named after no block

`plugins/claudetto/src/blocks/__tests__/catalog.spec.ts` checked that each block has a lab file or folder, but not that each lab entry names a block. `tests/goal.test.ts` was added beside `tests/finish.test.ts` for the `finish` block and broke that layout without failing anything. Fixed in `6ed34812`: both files moved to `tests/finish/`, and a new case fails on any lab entry that names no block. That case failed on `goal.test.ts` before the move.

### `just capture --help` ran a capture

`tools/capture/run.ts` ignored `--help` and started both arms, and the `capture` recipe comment of `justfile` left out `--shipped` and `--deny`. Fixed in the commit "feat(capture): read an MCP server or another plugin": `--help` prints the usage, and the comment lists every flag.
