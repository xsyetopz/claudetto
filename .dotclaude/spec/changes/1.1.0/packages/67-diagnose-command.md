---
schema: dotclaude-spec/2
kind: package
id: P67
title: Session diagnosis: command and skill
wave: 4
deps: ["P66"]
owns: ["src/plugins/dotclaude-sessions/slices/diagnose/slice.ts","src/plugins/dotclaude-sessions/slices/diagnose/adapters/","src/plugins/dotclaude-sessions/slices/diagnose/skills/","tests/sessions/diagnose/cli.test.ts",".dotclaude/spec/changes/1.1.0/evidence/diagnose-builtins.md"]
satisfies: ["REQ-6"]
verify: just test tests/sessions/diagnose && just check
agent: implementer
status: planned
---

## Goal

The user runs `/diagnose` or `dotclaude-diagnose`, and gets what went wrong in a session, ranked, with the dossier ID and a hint for each finding.

## Context

- The signals of P66 in `diagnose/domain/`.
- The CLIs of 1.0.0: `dotclaude-start` and `dotclaude-usage` (`slices/start-cost/`, `slices/usage/adapters/cli.ts`).
- The input: `~/.claude/projects/*/*.jsonl` under `CLAUDE_CONFIG_DIR` or `HOME`, and `<cwd>/.dotclaude/sessions.jsonl` for the build.
- A command is a skill with `disable-model-invocation: true` (`design.md` of 1.0.0).
- The built-ins of Claude Code 2.1.296 that read sessions (the bundle, the audit of 2026-10-14): `/insights` ("Generate a report analyzing your Claude Code sessions"), `/usage` with the aliases `cost` and `stats`, `/context`, and `/resume`.
  The `usage` skill of 1.0.0 overlaps `/usage`.
- The user: "dotclaude-sessions plugin doesn't have enough commands for deep session analysis, if any at all."

## Steps

1. Compare each built-in above with the analysis of P66, and write in the evidence file what each built-in gives, what dotclaude adds, and each analysis that no command gives yet.
   Do not copy a built-in.
   Add each missing analysis that the dossier signals need as a flag or a subcommand of the CLI, and list it in the evidence file.
2. The CLI `dotclaude-diagnose [--session <id>] [--days <n>] [--project <dir>] [--json]`.
   With no flag, it reads the last session of the current project.
3. The text output: one block for each session, with the build, then each finding with its count, dossier ID, transcript path and line, a short quote, and a hint.
   A session with no finding says so.
4. The skill `/diagnose` runs the CLI and tells Claude to explain the top findings to the user in plain words.
5. A big transcript is read as a stream, so the CLI does not load it whole.
6. Tests: the CLI on fixtures, with `--json`, a missing session, and an empty project.

## Acceptance

- `just test tests/sessions/diagnose` and `just check` pass.
- On the transcripts of the user, the command lists the "Prompt is too long" sessions, each compaction as a handoff failure, and the `dangerouslyDisableSandbox` calls, which P70 and P76 use.
- Session `d87f7ed2` of OpenJoystickDriver shows its "Prompt is too long" finding.

## Boundaries

- Read only.
- Print no secret: shorten each quote and drop each value that looks like a key.
