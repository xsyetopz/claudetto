## MODIFIED Requirements

### Requirement: Tested Claude Code Version

The release SHALL name Claude Code 2.1.309 as the minimum and the tested version in `tools/limits.ts`, the CI workflow, `README.md`, `CONTRIBUTING.md`, the schemas, the issue templates, and `src/wiki/`.
A test SHALL read the version from `tools/limits.ts` and fail when the version that `ci.yml` installs differs.
The release review checks the copies in the docs, because a test of their text is a test of prose (the user, 2026-10-26).

#### Scenario: Stale Pin

- **WHEN** `ci.yml` installs `2.1.302` and `tools/limits.ts` names `2.1.309`
- **THEN** the test fails and gives both versions

### Requirement: Arms Are What They Say

A sandbox session and a paired eval SHALL fail when the plugin set or the model that loaded differs from the arm.
A paired eval SHALL fail and name the arm when the baseline score of each case is at the maximum, because then no case separates the arms.

#### Scenario: No Plugin Loaded

- **WHEN** the claudetto arm of an eval loads no plugin
- **THEN** the run fails and names the arm

#### Scenario: Baseline at the Maximum

- **WHEN** the baseline score of each case of arm B is at the maximum
- **THEN** the comparison fails and names arm B
