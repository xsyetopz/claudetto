# Release 0.23

This page records the notes of the `0.23` release.

Released 2026-10-06, with the patch versions 0.23.1 and 0.23.2.
The release adds the `translator`, `docs-writer`, and `digest-writer` agents.
It adds a clause for questions to the user.
It also adds a `Bash` guard deny for writes to project files.

## Added

- Three agents:
  - `translator` translates and localizes UI strings, docs, and string catalogs, such as `.xcstrings`, `.strings`, `.po`, and JSON or YAML locale files.
    It also fixes defects in existing translations.
    It keeps keys, placeholders, and markup byte for byte.
    It lists the defects before it edits.
    It has `Bash` only to run the validators of the project, such as `plutil -lint`.
    It edits only with `Edit` or `Write`.
    It runs on Sonnet 5.5 at medium effort.
  - `docs-writer` writes or updates READMEs, guides, wiki pages, changelogs, docstrings, and examples to match the code.
    It has no `Bash`, so it marks each run-time claim that it could not check.
    It runs on Sonnet 5.5 at medium effort.
  - `digest-writer` reads long material, such as files, logs, transcripts, threads, and git history.
    It writes a short digest of the facts that the brief asks for.
    It is read-only.
    It has `Bash` to read `git log` and similar output.
    It runs on Haiku 4.5 without `CLAUDE.md`.
- Clause 16 of the Terms of Use, `Questions to the user`: Claude asks each question to the user through `AskUserQuestion`, with options, and not in plain text.
  The user can then pick an answer.
  Other hooks, such as the `dotclaude-jev` hook, can add facts to the question.
  A new `Stop` hook, `hooks/stop/block-plain-questions.mjs`, blocks the end of a turn.
  It does so when one of the last 3 prose lines of the message ends in a question mark.
  It skips code, headings, and quotes.
  It does not block a second time in a row.

## Changed

- dotclaude needs Claude Code 2.1.291 or later (0.23.1).
  2.1.291 fixes a regression of 2.1.288.
  The regression could lose the last messages of a session at quit.
  2.1.291 also fixes a regression of 2.1.290.
  That regression could drop answers to permission prompts in cloud sessions.
- In auto mode, the reminder of Claude Code 2.1.290 tells Claude to edit files with `sed`, heredocs, or scripts through `Bash`.
  The hooks module puts the dotclaude edit rule in place of this text.
  So the reminder agrees with the `Bash` guard.
  The `guard_bash` option also turns this change off.
- The release rewrites the working rules in shorter words.
  The release removes no rule.
  `RULES_MAX_BYTES` is 2,000 again, down from 2,200.
  The rules now say that Claude changes a test or a limit only when the user asks.
  This is because a raised limit hides the defect.

## Fixed

- The `Bash` guard denies a `Bash` command that writes a project file.
  These forms are a redirect, `tee`, `sed -i`, `perl -i`, or script code with a write call.
  A `Bash` write skips the diff that the user sees, the Claude Code checkpoints, and the dotclaude edit guard.
  The deny tells Claude to edit with `Edit` or `Write`, and to put a temporary file in `$TMPDIR`.
  A write to the temporary folder passes.
  The body of a heredoc counts as data.
- Clause 13 of the Terms of Use, `Long runs` (0.23.2): when a background run stalls, Claude stops that blocker.
  The same applies when a run waits on a stale process, lock, or monitor.
  Claude then runs the step again, also when Claude did not start the blocker.
  Before, Claude could read the `shared_workspace` rule as a reason to stop.
  It could end the turn with the task blocked.

## Related Pages

- Previous: [Release 0.22](Release-0.22)
- Next: [Release 0.24](Release-0.24)
- [Archive](Archive): the index of the archived pages.
