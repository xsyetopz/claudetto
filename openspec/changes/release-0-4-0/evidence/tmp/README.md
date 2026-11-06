# Probe files cited by design.md and tasks.md

Task 17.10 copied each `/tmp` path that `design.md` and `tasks.md` cite to the same path under this folder, and the cites
now read `evidence/tmp/...`. The scripts are kept as they ran, so their own paths still point at `/tmp`.

Left out of each copied folder:
- copies of the plugin (folders with a `.claude-plugin`), Claude config folders (`cfg`, `config`, `home`), git folders, and
  any subfolder over 1 MB, such as `probe-121/logs`, `probe-122/logs-r2` and the arm plugin copies of `probe-122`;
- files over 400 KB, binary files, and request bodies (`*.body.json`, `bodies*.jsonl`), which hold the whole system prompt and
  the user's own instructions.

Cited but not copied:
- `probe-142/fixtures.json`: 3.4 MB, built from real replies of the user's sessions.
- `probe-76/shim/node` and `probe-bl/bin/betterleaks`: third-party binaries.
- `probe-nest`: an empty folder.
- `claudetto-baseline`: a checkout of `62e2fe96`. Only its local changes are kept: `worktree.diff` and the untracked
  `tools/evals/alloc/` and `tools/evals/__tests__/alloc.spec.ts`.

Cites of paths that were already gone, such as `probe-sr/`, `probe-old/` and `probe-cmds-scripts/dump.ts`, stay as written.
`/tmp/x`, `/tmp/c-ID` and the like are arguments in a quoted command, not evidence.

Redactions:
- Each Claude Code debug log lost the lines that name the user's own config: their home folders outside this repo, MCP
  servers, installed plugins, account, and remote or policy settings. The claimed lines are unchanged.
- The TUI captures in `../tui/` have `PATH=<user PATH>` and `ANTHROPIC_API_KEY=<fake key>` in their spawn lines.

betterleaks on this folder reports seven findings, all fake fixtures in old plugin copies:
- `probe-17-6/none.ts` and `probe-141/arm-reorder/hooks/secrets.spec.ts` line 42;
- five in `probe-tui/plug/hooks/handoff/secrets.test.ts`.

The same strings are in `plugins/claudetto/hooks/secrets.spec.ts`, marked `betterleaks:allow`.
