# auto-fix Specification

## Purpose

States that the auto-fix capability is removed from 0.28.0.
The first plan had a hook that ran the project formatters and linters on the files that Claude edited, when Claude stopped.
That hook kept a log of the edited files, which is a state file.
Rule D35 forbids it (design D7, D35), so the feature, its hooks, its detection table, and its tests are deleted.

## Requirements

### Requirement: Auto-fix capability removed

dotclaude SHALL NOT ship a hook that records edited files or that runs project formatters and linters at `Stop`.
dotclaude SHALL NOT read `DOTCLAUDE_AUTOFIX`.
Claude Code, the project, and `just check` stay the route for format and lint fixes.

#### Scenario: No feature folder

- **WHEN** a test lists `plugins/dotclaude/features/`
- **THEN** it finds no `autofix` folder

#### Scenario: No hook entry

- **WHEN** a test reads `plugins/dotclaude/hooks/hooks.json`
- **THEN** no hook runs `features/autofix/cli.mjs`
