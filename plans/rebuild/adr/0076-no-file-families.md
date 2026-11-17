---
status: accepted
date: 2026-11-16
---
# No File Families Posing As Directories

## Context and Problem Statement

The user showed claudetto files that stand in for directories: open-items.ts with open-items-commands.test.ts and open-items.mock.ts; ignore-block.ts, ignore-plan.ts, ignores.ts; setup.ts with setup.rules.test.ts, setup.startup.test.ts, setup.tools.test.ts. Which file layout does claudetto use?

The tree held 91 hyphenated source files, such as `foo.ts`, `foo-one.ts`, `foo-two-three.ts`. The user called this unacceptable and asked for a top-to-bottom rebuild.

Transcript record tx-x01b/no-hyphenated-file-families: The tree uses file names as directories: `foo.ts`, `foo-one.ts`, `foo-two-three.ts`.

Transcript record tx-x02/no-hyphenated-file-families: The old tree holds files that act as a directory (`foo.ts`, `foo-one.ts`, `foo-two-three.ts`). 91 hyphenated source files remained at the time.

## Considered Options

- Hyphen or dot families of sibling files.
- One directory per family with plain file names.
- Keep file families named by hyphen.
- Use real directories, one concern each.
- Keep hyphenated families.
- Make each family a real directory.
- A family of hyphenated files.

## Decision Outcome

Chosen: One directory per family; no hyphenated or dotted file families. This matches the settled decision "no hyphenated file families (foo.ts, foo-one.ts)".

Use real directories. No hyphenated file families. Matches a settled decision of the plan; supersedes nothing.

## Consequences

Each family at 088a227c moves into a directory; tests and mocks sit beside the unit in that directory.

The rebuild moves 91 hyphenated files into directories.

Transcript record tx-x01b/no-hyphenated-file-families decided: A family becomes a directory (`spec/audit.ts`, not `spec/spec-audit.ts`). The user called the families unacceptable. Matches the settled decision of no hyphenated file families. Good: the layout reads as a tree. Bad: 91 source files to move.

Transcript record tx-x02/no-hyphenated-file-families decided: real directories. A family of hyphenated files is unacceptable. The old code goes as the new code replaces it. Each module is a directory. A hyphenated family is a defect.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; user decision, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3949; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4166; user decision, 2026-11-16; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738.
