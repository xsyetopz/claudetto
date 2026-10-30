## Purpose

The local gate runs the checks that guard the code and nothing about a wiki. A dangling reference to a deleted wiki cannot fail the build.

## ADDED Requirements

### Requirement: No Wiki Step

`just check` SHALL run lint, the type check, the tests, plugin validation, and the hook labs, and SHALL NOT run a generated-wiki check.

#### Scenario: Gate after the Wiki Is Deleted

- **WHEN** `wiki/` does not exist and `just check` runs
- **THEN** it does not fail on a missing wiki page

### Requirement: No Dead Wiki Code

The tree that ships SHALL NOT hold `tools/generate/`, `tools/wiki.ts`, `src/wiki/`, a `wiki` or `generate` recipe in the `justfile`, or a test that reads a generated page.

#### Scenario: Reference Search

- **WHEN** a search for the word wiki runs over the repo outside `archive/`, which is read-only evidence and ships nothing
- **THEN** each hit is plain prose that the maintainer chose to keep, or the history file `CHANGELOG.md`

### Requirement: Every Kept or Denied Surface Has a Decision Page

Each tool, skill, command, and built-in plugin that a tier row keeps, denies, or describes SHALL have one page under `docs/keep/`, holding what the item does from the docs, what claudetto needs it for with its file and line, its measured request cost, and the recommendation the user answered, so that a surface is a decision on a page and not a default we inherited.

No recipe enforces this. `tools/keep-pages.ts` did, and it is deleted with the rest of the prose-checking tooling (the user, 2026-10-30: "clean up the mess that is tools/ *ONLY* to what the plugin needs"), so the pages are a record the maintainer keeps and `just check` reads none of them. The gate checks code.

#### Scenario: A Row Names an Item with No Page

- **WHEN** a tier row denies a tool name, or sets a `tool.describe` text for it, and no file of `docs/keep/tools/` covers that name
- **THEN** nothing fails, and the missing page is a gap in the record for the maintainer to fill

#### Scenario: The Pages That Exist

- **WHEN** the pages written on 2026-10-27, 2026-10-28, and 2026-10-30 are counted
- **THEN** there are 37 under `docs/keep/tools/`, 46 under `docs/keep/skills/`, 1 under `docs/keep/commands/`, and 16 under `docs/keep/plugins/`

### Requirement: Evidence in One Place

Probe results SHALL live in one plain Markdown file under `docs/`, with the command that made them.

#### Scenario: Probe Page

- **WHEN** a reader opens the probe file
- **THEN** it names the model, the Claude Code version, the arms, the forks, and the cost of each fork
