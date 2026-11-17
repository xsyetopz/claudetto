---
status: accepted
date: recorded in user decision, 2026-11-13 (day of decision not recorded)
---
# Rule Files Stay Few And Use camelCase Names

## Context and Problem Statement

A project held an over-long CLAUDE.md and too many rule files under .claude/rules.

`plugins/claudetto/rules/` holds 11 files at `088a227c`; 7 and 8 are older counts.

## Considered Options

Keep all rules; trim, combine, and rename; delete the basics and keep the bedrock parts.

- 11 (baseline).
- 7 or 8 (older counts).

## Decision Outcome

Trim the rule files, combine some, and name each in camelCase in linter style; keep the shared bedrock parts; remove basic rules the agent already follows. Supersedes none.

Chosen: 11 is the baseline count; the rebuild count follows the trim.

## Consequences

claudetto ships a short rule set with camelCase names, as its rules/ directory at 088a227c already does.

No fixed rebuild count is set.

Source: user decision, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/c615db71-3797-4d18-98ff-238e573f5930.jsonl:17`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:249`); probe: `git ls-tree 088a227c plugins/claudetto/rules` lists 11 files, 2026-11-17.
