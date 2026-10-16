# Spec Delta: `lab-tools`

## Purpose

Gives the tools that measure `claudetto` against vanilla Claude Code: a logging proxy, an eval comparison, an isolated sandbox config, and the settings schema of the installed bundle.

## ADDED Requirements

### Requirement: Logging proxy

The capture tool SHALL log each API request and response of a session to a file, with no login token in the log.

#### Scenario: A captured session

- **WHEN** a session runs through the capture tool
- **THEN** the log holds each request body, and no line holds the token

### Requirement: Eval comparison checks its input

The comparison SHALL fail when an arm has no valid result, also when the run exits with 0.
A valid result is a `--json` file with at least one case, a finite score for each case, no partial run, and a loaded plugin.

#### Scenario: An empty arm

- **WHEN** one arm of a comparison has no result rows
- **THEN** the comparison exits with a non-zero code and names the arm

### Requirement: Capture sizing checks its input

A `count_tokens` reply with no whole `input_tokens` SHALL be an error, not `NaN`.
The bounds of the sizing SHALL be in `limits.ts`.
An error text SHALL hold no credential of the request.

#### Scenario: A reply with no count

- **WHEN** a `count_tokens` reply has no `input_tokens`
- **THEN** the part shows as not counted with the reason, and no count is `NaN`

### Requirement: Start run is a repository tool

The start run script SHALL be in `tools/`, and `plugins/` SHALL hold no copy of it.

#### Scenario: The plugin folder

- **WHEN** a search for `start-run` runs over `plugins/`
- **THEN** it finds no file

### Requirement: Isolated sandbox

The sandbox SHALL run Claude Code with a config folder apart from the config of the user, and SHALL load only the plugins it names.

#### Scenario: Sandbox run

- **WHEN** the user runs the sandbox
- **THEN** the child process gets `CLAUDE_CONFIG_DIR` and `HOME` in the sandbox folder, so the session reads no file from the user config folder
- **AND** the tool reads only the login token from the user config

### Requirement: Schema of the installed bundle

The schema builder SHALL build the JSON Schema of `settings.json` and `managed-settings.json` from the installed Claude Code bundle.
The builder SHALL read the meaning of the type helpers from the definitions in the bundle, so it has no version table.
The builder SHALL stop and name the version when the bundle of the asked version is not present, or when it has no schema or no helper definitions.

#### Scenario: A new Claude Code version

- **WHEN** the asked version is not the installed version, or the bundle of that version has no schema or no helper definitions
- **THEN** the builder stops and names the version, and writes no schema

### Requirement: A check fails when no plugin loaded

The frontmatter check SHALL fail when no plugin loaded, which the debug line `Loaded inline plugin from path:` shows for each `--plugin-dir` folder.

#### Scenario: No plugin

- **WHEN** the check runs and the session loaded no plugin
- **THEN** the check fails

### Requirement: A gain needs a baseline below the maximum

`eval-compare` SHALL report a gain only when the baseline arm scores below the maximum of the case.
When the baseline arm scores the maximum, the report SHALL say that the case cannot show a gain.

#### Scenario: Both arms at 1.00

- **WHEN** both arms of a case score 1.00
- **THEN** the report says that the case cannot show a gain
