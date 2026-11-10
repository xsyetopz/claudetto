## MODIFIED Requirements

### Requirement: One Owner per Responsibility

Each responsibility the plugin carries MUST have exactly one owner in the shipped plugin: a Claude Code setting or built-in behavior, a mod hook, a settings hook, a skill, or none because it is removed. Two code paths MUST NOT write the same file, settings key, or state key from different tables or with different rules. Code paths that write the same kind of file MAY exist when each fires on its own trigger and all of them take the file name, the root, and the layout from one shared function.

#### Scenario: Setup Exists Twice

- **WHEN** a command and a standalone script both write the user's settings from the same table
- **THEN** one of them is removed before release

#### Scenario: Two Writers of a Handoff

- **WHEN** two hooks can each write a file under `.claude/claudetto/handoffs/`, as the compaction fallback (`hooks/handoff.ts`), the handoff tool (`hooks/handoff/call.ts`), and the forked handover (`hooks/handoff/handover.ts`) each write a file under `.claude/claudetto/handoffs/`
- **THEN** each takes its name from `handoffPath`, its root from `atRoot`, and its layout from `layout` in `hooks/handoff/layout.ts`, and none writes on another's trigger

#### Scenario: Two Writers of the Status Line

- **WHEN** `/claudetto:setup` and a bare `/statusline` both write `statusLine`
- **THEN** both read the one `STATUS_LINE` group of `hooks/setup/settings.ts` and write through `changesOf`, `applyChanges`, and `writeFile`, so the key has one table and one rule
