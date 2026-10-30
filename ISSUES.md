# ISSUES.md

Problems found while working in this repository. An open entry moves to "Fixed" with the commit that fixes it.

## Open

### The gate takes the `$.env` API in a command for a read of an env file

Two `Bash` calls were denied by the claudetto gate with "This call reads `.env`, which can hold secrets" (2026-10-30), and neither read an env file. The first was a mutation check, `perl -0pi -e` over `src/blocks/context7/block.ts` with `$.env.get` in its pattern. The second was a `python3` heredoc that appended this entry, whose text names `.env`. The rule fires only when `src/blocks/gate/env-scan.ts` finds an env file near the working folder, and then any shell text that holds `.env` matches. The mutation checks of the `context7` block were not run because of it.

Fix: the shell rule of `src/blocks/gate/` should treat `.env` as a file only when it stands as a path word (an argument or a redirect target), not inside a quoted pattern, a heredoc body, or after `$`. Add failing gate cases for both commands first. Waits on the owner's approval, because the gate's own message says to stop and report.

## Fixed

### `bunx ctx7` is denied by the auto mode classifier

Running the Context7 CLI, `bunx ctx7 --help`, was denied as code from outside the repository (2026-10-30), so the arguments of the `docs` skill were read from `packages/cli/README.md` of `upstash/context7`. On 2026-10-31 the CLI ran, and `ctx7` `0.8.2` has no `search` command and no `--library-version` flag, both of which that README and the skill named. The skill now runs `library`, then `docs` with the version in the ID, such as `/colinhacks/zod/v3.24.2`, and `src/blocks/context7/__tests__/skill.spec.ts` fails on a command or flag that `ctx7 --help` does not list.

### Stray edits from a broken `cp -R` in the main tree

A `cp -R` from a worktree copied three changed files into the main tree, and each one came back in every fresh worktree. `biome.jsonc` (a `$schema` of `2.6.4` against the pinned `2.6.3`) and `plugins/claudetto/commands/setup.md` (a rewrap with the same text) were restored. The owner wanted the `high` effort, so the commit "feat(you-should-know): default the side check to `high` effort" changes `DEFAULT_EFFORT`, the manifest `default`, the `README.md` line, and the two add-on lab cases together.

### A hook lab file named after no block

`plugins/claudetto/src/blocks/__tests__/catalog.spec.ts` checked that each block has a lab file or folder, but not that each lab entry names a block. `tests/goal.test.ts` was added beside `tests/finish.test.ts` for the `finish` block and broke that layout without failing anything. Fixed in `5782abb2`: both files moved to `tests/finish/`, and a new case fails on any lab entry that names no block. That case failed on `goal.test.ts` before the move.

### `just capture --help` ran a capture

`tools/capture/run.ts` ignored `--help` and started both arms, and the `capture` recipe comment of `justfile` left out `--shipped` and `--deny`. Fixed in the commit "feat(capture): read an MCP server or another plugin": `--help` prints the usage, and the comment lists every flag.
