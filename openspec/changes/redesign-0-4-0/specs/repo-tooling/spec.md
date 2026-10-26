## Purpose

The layout of the repository around the plugins: the gate tools, the paid and manual tools of the maintainer, the one gate script, the generated files, and no tool or test that nothing uses.

## ADDED Requirements

### Requirement: Dev Split

`tools/` SHALL hold only the tools of the local gate, the CI workflows, and the release.
`dev/` SHALL hold the tools that make a paid call or need the maintainer: evals and their statistics, the sandbox, the request capture, the schema extract, the built-in prompt diff, and the Docker check.
No file of `tools/` SHALL import `dev/`.

#### Scenario: Gate Imports Dev

- **WHEN** a file of `tools/` imports a file of `dev/`
- **THEN** `just check` fails and names the import

#### Scenario: Eval Tool Home

- **WHEN** a reader looks for the tool that runs an eval
- **THEN** the tool is in `dev/`, and `tools/` has no eval runner

### Requirement: One Gate Script

`just check` and the CI workflow SHALL run the same step list from one script in `tools/`.
CI SHALL skip only the steps that need a login, and the script SHALL name each skipped step in its output.
`just test` SHALL write no file.

#### Scenario: Same Steps

- **WHEN** a change adds a step to the gate script
- **THEN** `just check` and CI both run it, with no edit of `justfile` or of the workflow

#### Scenario: Test Writes Nothing

- **WHEN** `just test` runs on a clean work tree
- **THEN** `git status --porcelain` is empty after the run

### Requirement: No Unused Tool or Test

Each file of `tools/` and `dev/` SHALL have a caller: a `justfile` recipe, a `package.json` script, a CI workflow, or another tool with a caller.
A test SHALL fail for a tool with no caller.
The gate SHALL fail and name each test file that runs 0 cases.

#### Scenario: Orphan Tool

- **WHEN** `dev/yolo/index.ts` has no recipe, script, workflow, or importer
- **THEN** `just check` fails and names the file

#### Scenario: Empty Test

- **WHEN** a test file makes its cases from a folder list that is empty, so it runs 0 cases
- **THEN** `just check` fails and names the file

### Requirement: Generated Schemas

`openspec/schemas/` SHALL be written by `just generate` from the presets of the `spec` module, and the header of each file SHALL name a source that exists.
`generate --check` SHALL fail when a file differs from its source.

#### Scenario: Hand Edit

- **WHEN** a person edits `openspec/schemas/epic/schema.yaml` and not the preset
- **THEN** `just check` fails and names the file

#### Scenario: Header Source

- **WHEN** a test reads the header of each file of `openspec/schemas/`
- **THEN** each named source exists

### Requirement: Tests Mirror the Modules

The unit tests SHALL be in `tests/`, in one folder for each plugin and each module, and `tests/repo/` SHALL hold the tests of the rules of the repository.
The hook lab tests SHALL stay in `plugins/claudetto/tests/`.
No test file SHALL be in a folder of `plugins/` other than `plugins/claudetto/tests/`.

#### Scenario: Test in a Module

- **WHEN** a change adds `plugins/claudetto/modules/gate/gate.test.ts`
- **THEN** `just check` fails and names the file
