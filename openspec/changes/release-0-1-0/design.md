## Context

`proposal.md` lists the changes, `architecture.md` the components, and `specs/` the behavior. Each choice below names its decision in `decisions.md`. Every source under `archive/` is read for evidence and rebuilt, never copied (`architecture.md` A6).

## Decisions

### Setup

- The snippet grows in `src/tiers/snippet.ts`, and each new group is its own file so no file passes 300 lines: `src/tiers/env.ts` (the 17 flags, `CLAUDE_CODE_THRIFTY_SONIC` with its unofficial note), `src/tiers/disables.ts` (the five `/config` keys and `minimumVersion`), and `src/tiers/agents.ts` (the six denies). Why: one concern per file. Alternative: one long table in `snippet.ts`.
- `$schema` is the `$id` of `docs/keep/settings/claude-code-settings.schema.json`. Each new key is checked against that schema by the existing key check of `tier-profiles` ("Keys Are Checked"), so a renamed key fails a test.
- `openspec init --tools claude --profile core` (D27) runs from `src/tiers/openspec.ts`, called by `src/tiers/setup.ts` after the merge, through `Bun.which("openspec")`, in the working directory, and only when `openspec/` is absent. Why: D3, and the CLI is not on this machine's `PATH`. Alternative: run it from the mod at `SessionStart`, which runs a CLI on every start.

### Status Line

- A new `src/statusline/` module with a `bin/claudetto-statusline` entry. It parses stdin once, builds segments as pure functions, and prints one line. The archive's `segments.ts`, `context.ts`, `window.ts`, and `width.ts` are read for the segment set. `/tmp/ccx/report-statusline.md` D1 to D4 and D7 each become a test fixture first, then the fix. Why: G3, A6.
- The stdin fields are read from the `2.1.314` docs page for the status line. A field the docs do not list is not used. Alternative: the archive's field list, which predates `2.1.314`.

### Version Floor

- The `SessionStart` rule compares the running version with `2.1.314` by numeric parts. The source of the running version is the mod API value that `cc-inspect` `surface mod-api` names, read before the code is written. If the mod API gives none, the rule reads the version from `process.execPath`'s version folder, which is the layout of this install (`~/.local/share/claude/versions/2.1.314`).

### Hygiene and Finish

- Hygiene is rebuilt from `archive/plugins/claudetto/modules/session/hygiene/` as a CLI (`just hygiene`, `--dry-run`) and a non-blocking `SessionStart` run. The list of `~/.claude/` paths and ages lives in one file. Each row names its source: a docs page, or a reading of the directory on this machine.
- Finish is rebuilt from `archive/plugins/claudetto/modules/work/finish/`: `/goal <cmd>` stores the command in `$.store`, and a `classic.Stop` rule runs it and reads `tasks.md` of the change being applied. The block bound is a constant with a test.

### Agents and Docs Lookup

- `agents/Hermes.md` is rewritten from the archive with web and read tools only, and no `model:` line (restart `architecture.md` D10).
- Docs lookup: read the standing size of each candidate with `just capture` and pick the smallest. The candidates are the Context7 MCP server, and our own tool registered through `$.tool.register` that calls the Context7 HTTP API with one short definition. The sizes and the pick go to `decisions.md`. Why: D15.

### Auto Mode

- The classifier request is read by extending `tools/capture/fake-api.ts`: in a new `--classifier` mode its first reply is a `Bash` tool call no rule allows, and it records every request after that whose system text starts with the classifier's monitor line. `tools/capture/run.ts` prints the split per rung. Why: D20 needs a free size reading.
- The rungs come from the `CLAUDE_CODE_AUTO_MODE_*` names of the `2.1.314` binary. Each name is read in the binary for what it changes before it is a rung. A name that changes no request text is dropped from the ladder, with the reading.
- The A/B extends `tools/evals/` with arms A (built-in, `CLAUDE_CODE_AUTO_MODE_SERVER=0`), C (claudetto's own mode: `default` permission mode plus a `PreToolUse` hook, Jev then Haiku 5.5 at `high`, failing closed), and the smallest B rungs. It runs in plan mode first, which prints the sessions and the price at no cost. The paid run waits for approval.
- `src/summary.ts` sends effort `high` on the Haiku call, as a named constant, apart from the row's `effort`.

### Surfaces

- Each surface of D21 is read by `just capture` and `just inventory` before its cut, and the rows are recorded in `docs/` with the command. A cut ships when it lowers the reading and passes its tests.

### Version

- `just claude-version` keeps `2.1.314`. The release moves the four manifests to `0.1.0`, and `tools/manifests.ts` checks they agree.

### Building Blocks

- A block is one module that exports a `Block` record (`id`, `kind`, `routes` typed as the host's event names, `needs`) and one attach function, a `const` named at the top of the file. The first block is `src/init/interview.ts`.
- `src/blocks/catalog.ts` lists the records and calls each block's attach function by name, because the hook loader takes `on` only into a function named at the top of a file. The call order is the hook chain order. `register.ts` keeps only `attachBlocks`.
- A block reads its options from its `BlockContext`, never from a shared global. Plugin options stay as they are; a new one is added only for a block the user must switch.
- `src/blocks/__tests__/catalog.spec.ts` fails when an id repeats, a block needs a Claude Code above the version floor, a block has no `tests/<id>.test.ts` hook lab file, or `attachBlocks` does not call it.
- Base texts follow the writing guide in `.claude/claudetto/research/`. A text's character count is recorded with its cut, as for the other surfaces.
- Order of work: the core and its test, then each existing hook moved into a block with its lab cases unchanged, then new blocks by kind, each built by one worker in its own worktree.

## Risks / Trade-Offs

- [A host release changes a route] -> The block's lab case fails, and only that block goes; `needs` and the version floor say which release it was pinned on.
- [Two blocks on one event fight over the chain] -> The call order in `attachBlocks` is the only order.

- [A trim rung drops a safety rule the eval cases do not cover] -> The A/B reports regression per case, and the eval cases include the hard-deny cases of `low-hitl`.
- [Claude Code changes a setting key or the stdin JSON] -> `minimumVersion` and the schema key check fail loudly, and the status line drops an unknown field instead of crashing.
- [Hygiene removes a file the user wanted] -> Listed paths only, `--dry-run`, and no settings, credentials, `CLAUDE.md`, skills, agents, or plugin installs.
- [The finish loop spins] -> The block bound.
- [The paid A/B costs more than its share] -> Plan mode prints the price first, and the run waits for approval with its share of the weekly limit.
