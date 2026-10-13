---
schema: dotclaude-spec/2
kind: package
id: P38
title: Session stamp
wave: 4
deps: ["P33"]
owns: ["src/kernel/stamp.ts","tests/kernel/stamp.test.ts","src/plugins/dotclaude/slices/stamp/","tests/dotclaude/stamp/","src/plugins/dotclaude-sessions/","tests/dotclaude-sessions/",".dotclaude/spec/changes/1.0.0/evidence/session-stamp.md"]
satisfies: []
verify: just check, just lab, and the probe of step 1 with its output in the evidence file
agent: implementer
status: doing
---

## Goal

Each session records the dotclaude version and the short commit SHA of the build.
`dotclaude-usage` of `dotclaude-sessions` groups the sessions by build, so that an analysis can tell which build had which problem.
The record costs 0 model tokens.

## Context

- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-13.
- Each transcript line already holds the Claude Code `version`, `sessionId`, and `cwd`, but no plugin version (transcript fact, `2.1.296`).
- `~/.claude/plugins/installed_plugins.json` has an entry for each installed plugin with `version`, `installPath`, `installedAt`, `lastUpdated`, and `gitCommitSha` (file fact, binary fact `2.1.296`).
  An update overwrites the entry, so it does not record the build of an old session.
- The installed plugin folder has no `.git`.
  A checkout that runs with `--plugin-dir`, such as `just sandbox`, has one.
- A commit cannot hold its own SHA, so the SHA comes from the install record or from `git` at runtime, not from a generated file.
- `$.session.append` writes a row into the transcript: a user row with `isMeta`, or a `system` notice (binary fact `2.1.296`).
  `slices/setup/adapters/mod.ts` uses the user row for the drift note, and the model reads that row.
  Whether the model sees a `system` notice is not known.
- D42: zero token cost where a hook, a script, or a CLI can do the work.
- Each add-on imports nothing from another plugin, so the format of the record and its parser are in the kernel.

## Steps

1. Probe: in `just sandbox` with `dotclaude-capture`, append a `system` notice with `$.session.append` at `SessionStart`, and check whether its text is in the next request to the model.
   Write the result, the command, and the version of Claude Code to `evidence/session-stamp.md`.
   If the probe cannot run, write why, and use the file of step 3.
2. The kernel, `src/kernel/stamp.ts`: the type of the record (`version`, `sha`, `source` of the SHA, `sessionId`, `at`), its line format, and its parser.
3. The `stamp` slice of the core plugin, on `SessionStart`:
   - The version is the `version` of the `plugin.json` of the plugin root.
   - The SHA is the short `gitCommitSha` of the entry of the plugin in `installed_plugins.json` whose `installPath` is the plugin root.
     If no entry matches, it is `git rev-parse --short HEAD` in the plugin root.
     If neither gives a SHA, the record says `unknown`.
   - If the probe shows that the model does not see a `system` notice, the slice appends the record as a `system` notice.
     Otherwise, it appends one line to `.dotclaude/sessions.jsonl` of the project.
   - A failure writes nothing and never stops the session.
4. `dotclaude-sessions`: `dotclaude-usage` reads the record of each session, from the transcript or from `<cwd>/.dotclaude/sessions.jsonl`, and shows the build of each session, and a total for each build.
   A session with no record shows as `unknown`.
5. Tests: the parser in the kernel, a lab test of the hook with stubbed events for each SHA source and for a failure, and a test of the grouping in `dotclaude-usage`.
6. Docs: one line on the `stamp` slice in `src/wiki/dotclaude/Architecture.md`, the build column in `wiki/add-ons/Sessions.md`, and a `CHANGELOG.md` entry under `[Unreleased]`.
   P15 owns these files, and P15 is done except the publish, so P38 edits only these lines.

## Acceptance

- `just check` and `just lab` pass.
- The evidence file gives the result of the probe, or the reason that it did not run.
- A request to the model holds no text of the record, by the probe or by the choice of the file.
  The probe of step 1 shows that the model does not see a `system` notice, in one request (`evidence/session-stamp.md`), so the record is a `system` notice of the `informational` subtype.
  A run in `just sandbox` with `dotclaude-capture` and two prompts finds no text of the record in either request.
- `dotclaude-usage` shows the build of a session with a record, and `unknown` for a session without one.

## Boundaries

- Do not edit `installed_plugins.json` or any other file of Claude Code. Read it only.
- Do not add an env var for the stamp.
- Do not change the version with anything but `just bump`, which P16 runs.
