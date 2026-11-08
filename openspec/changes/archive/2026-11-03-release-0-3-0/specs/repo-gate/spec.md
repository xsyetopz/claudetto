## REMOVED Requirements

### Requirement: Every Kept or Denied Surface Has a Decision Page

**Reason**: The pages under `docs/keep/tools/`, `docs/keep/skills/`, and `docs/keep/commands/`, and most of `docs/keep/plugins/`, were copies of Claude Code text, and the repo keeps no copy of Claude docs. No code read them.
**Migration**: Read the text of a tool, skill, command, or plugin through `clawdipedia-docs` or its `clawdipedia.cc` URL. The reason a tier row keeps or denies an item stays in `docs/surfaces.md`.

### Requirement: Evidence in One Place

**Reason**: Probe results no longer live in `docs/`. The docs keep only numbers that a free command reads on Claude Code `2.1.317`, and each names the command that reads it.
**Migration**: Rerun the command a doc names, such as `just inventory` or `just compaction-cost`, to read a number again.
