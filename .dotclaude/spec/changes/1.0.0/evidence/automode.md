# Evidence: the auto mode classifier of Claude Code 2.1.296

## Status

The main session ran `claude auto-mode defaults` and `claude auto-mode config` on 2026-10-12.
The user has no `autoMode` settings, so both print the same JSON.
A copy of the defaults is in `external/cc-2.1.296/automode-defaults.json`, which git ignores.
An investigator read `external/cc-2.1.296/strings.txt`, and each line number refers to that file.
The user decided that the classifier allows each safe command, and that a leak or a destructive command goes to ask or deny (`change.md`, decisions).

## The settings

- `autoMode` has the keys `allow`, `soft_deny`, `hard_deny`, and `environment` (L319436).
- An entry `$defaults` in a list expands to the built-in list of that key (L322860-322861, L193571-193573).
- `claude auto-mode config` prints the effective rules, `claude auto-mode critique` reviews custom rules, and `claude auto-mode reset` removes `autoMode` from the user settings file.
- The classifier allows an action by default.
  It blocks only on a `hard_deny` match, or on a `soft_deny` match with no `allow` exception (L327118, L327186-327190).
  User intent never clears a `hard_deny` rule (L327123).

## The defaults

- `allow` has 17 rules, such as `Local Operations`, `Read-Only Operations`, `Declared Dependencies`, `Session-Created Job Cleanup`, and `Multi-Agent Coordination`.
- `soft_deny` has rules such as `Git Destructive`, `Irreversible Local Destruction`, `Unverifiable Deletion Target`, `Shared Scratch Sweep`, `Credential Leakage`, and `Code That Leaks When Run`.
- `hard_deny` has one rule, `Data Exfiltration`.
- `environment` has 21 fields for the user to fill in, such as `Trusted repo`, `Source control`, and `Trusted internal domains`.

## The case of 2026-10-12

The classifier blocked `git worktree remove -f -f .claude/worktrees/<id>` with `git branch -d`, for three clean worktrees that agents made and that were merged.
The rule was `Irreversible Local Destruction`.

- The rule names `git worktree remove --force` and `rm -rf`, and it presumes that a working tree is dirty.
- The rule clears when the target is an agent-created worktree or scratch clone (clause b).
  The transcript did not show that the session made those worktrees, because another session made them.
- `Shared Scratch Sweep` blocks a delete by pattern in `/tmp` or `$TMPDIR`, and allows the delete of a named path that the agent worked with.
- `Unverifiable Deletion Target` blocks `rm -rf` of a variable whose value the transcript does not show.

So an `environment` entry that says which paths are agent worktrees and Claude Code temp folders can let clause (b) and the named-path case apply, with `$defaults` kept for each other rule (inferred, not tested).

## Sources

- Only the user settings, the `--settings` flag, and the managed settings can set `autoMode` (L319670).
  Claude Code ignores `autoMode` in the project and local settings, because a repository controls them, and it logs `tengu_settings_auto_mode_rules_untrusted_source_ignored`.
- The `settings.json` of a plugin accepts only `agent` and `subagentStatusLine` (L323807, inferred for plugins), so a plugin cannot set `autoMode`.
- So the setup of dotclaude writes `autoMode` to the user settings, as it writes the other keys of its snippet.

## Garbage collection

- `cleanupPeriodDays` keeps chat transcripts for 30 days by default (`cTt=30`, L323574), with a minimum of 1 (L261144).
- `desktopSessionCleanupPeriodDays` is a ceiling for the transcripts of the desktop app (L319438).
- The cleanup pauses while the settings have errors (L148139).
- The cleanup skips when the user settings are off and no enabled source sets `cleanupPeriodDays` (L192527).
  It also skips when the key is not valid (L336417).
- A key that a policy sets always runs the cleanup.
- dotclaude adds no cleanup key and no cleanup code.
  Claude Code already removes stale agent worktrees and old `/tmp/claude-<uid>/` images, and no code in `src/` deletes Claude Code files.
  A shorter `cleanupPeriodDays` also deletes transcripts, which `dotclaude-sessions` reads for its usage reports.
  So the default of 30 days stays.
- `--no-session-persistence` turns off the writes of a session.

## Open

- Whether a permission allow rule skips the classifier in auto mode.
- The env var or flag of the diskless mode.

## Cleanup answers

- [x] When the cleanup runs.
  The background housekeeping (`w0r`, L336502) checks 5 s after start.
  It runs only when the session is interactive and not diskless, and after 60 s of user idle.
  It runs at most once per 24 h, tracked by `.last-cleanup`.
  When the session is busy, it retries every 10 min.
- [x] Which files the sweep removes, and which it keeps.
  The sweep (`K6r`, L336418) removes files older than the cutoff in `transcripts`, `file-history`, `session-env`, `tasks`, `jobs`, `uploads`, `dev-mods`, `shares`, `todos`, `statsig`, `logs`, and `access-audit`.
  It also removes paste `.txt` files (L324687) and staging files older than 1 day.
  It does not name plans.
  It does not remove the plugin cache, old versions, or `history.jsonl`.
  `history.jsonl` is pruned only with the HIPAA flag.
  `mcp-skill-archives` is removed on another path (L323584), not by the sweep.
- [x] Whether Claude Code removes stale agent worktrees.
  The sweep (`_Yr`, L327918) removes an agent worktree only when all of these hold.
  Its name is `agent-a` followed by 16 hex characters.
  It is older than the cutoff and not the current worktree.
  No live process locks it, and it is clean.
- [x] Whether the cleanup removes `/tmp/claude-<uid>/` images, the plugin cache, and old versions.
  It removes old `images` folders under `/tmp/claude-<uid>/` (L333917).
  It does not remove the plugin cache or old versions.
