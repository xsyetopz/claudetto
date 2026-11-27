---
status: accepted
date: 2026-11-17
---

# Where Instructions Live: CLAUDE.md, Skill, Command, Subagent, Hook

## Context and Problem Statement

Six places can hold an instruction. CLAUDE.md (`./CLAUDE.md` or `./.claude/CLAUDE.md`) for always-true rules; a rule file under `.claude/rules/` (found recursively; without `paths` it loads at launch like `.claude/CLAUDE.md`, with a `paths` glob list it loads when Read, Write, Edit or a Bash read touches a matching file; `~/.claude/rules/*.md` load before project rules); a skill for instructions needed in some circumstances (runs in main context, description-only until triggered); a slash command is a saved manual prompt; a subagent is a persona with isolated context; a hook forces what instructing alone cannot (not 100% reliable). Skills earn tokens when narrow and repeated; the description is the only always-loaded part (one line, SKILL.md under about 603 lines); deterministic parts become scripts; a trim is A/B tested with saved inputs because it silently drops edge-case rules; `!command` lines run the CLI and embed stdout; third-party skills are not tuned to the user; house rules ship as one shared plugin per project instead of copied CLAUDE.md.

## Considered Options

- Everything in CLAUDE.md.
- Always-true rules split into unscoped `.claude/rules/*.md`, file-specific rules into `paths`-scoped rule files.
- Place each instruction by the decision table above.

## Decision Outcome

Chosen option: split rule files (user decision, AskUserQuestion 2026-11-17). Always-true rules live in unscoped `.claude/rules/*.md`; file-specific rules live in `paths`-scoped rule files; CLAUDE.md holds only build and test commands and directory boundaries; skills, commands, subagents and hooks keep the roles in the context above.

## Consequences

Good: each rule has one home. Bad: the table itself is not yet a shipped doc.

Source: probe above; clawdipedia `configure/memory-and-rules` (2.1.323); unresolved in external/ for the decision table wording; located: external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:8 (skillOverrides).
