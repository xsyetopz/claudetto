# Measurement Scripts

- [ ] **RT-034** To measure the peak memory of a command, poll `ps -axo pid,ppid,rss` every 30 ms, sum RSS over the whole child process tree, and report peak MB, maximum process count, time and exit code.
  Basis: measured (script in the repo research; the tsgolint finding needs it).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/scripts/peak.ts:1.

- [ ] **RT-035** To recover files after a destructive repo action, replay a project's transcript Write and Edit tool uses in time order onto a target tree, skip errored uses, and report applied and missed counts (an Edit is missed when its `old_string` is absent).
  Basis: measured (script in the repo research).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/scripts/replay.ts:1.

- [ ] **RT-036** To list the heavy commands a session ran, scan transcript Bash `tool_use` entries for `claude plugin test`, `just check`, `just lab`, `just verify`, `oxlint` and `bun test` between two timestamps, and print the time and 110 characters of each command.
  Basis: measured (script in the repo research; low impact).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/scripts/cmds.ts:1.

- [ ] **RT-037** The fixture harness dedupes `fixtures-*.ts` commands (expect-block when any row names a rule id) into batches of 40 Bash `tool_use` blocks for a stub API, and classifies each outcome from the hook log plus debug `tool_dispatch_start` lines: allow; ask-rule (PermissionRequest without `permission_suggestions`); ask (with it); deny (PreToolUse only). This rule derived the 26 and 380 cover counts.
  Basis: measured (scripts in the repo research).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/scripts/fixture-steps.ts:1; openspec/changes/archive/2026-11-16-2-1-323/research/scripts/fixture-outcomes.ts:1.
