# repo-gate Specification

## Purpose
The local gate runs the checks that guard the code and nothing about a wiki. A dangling reference to a deleted wiki cannot fail the build.

## Requirements

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
