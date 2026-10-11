## ADDED Requirements

### Requirement: One source for each shared part

Each text that a plugin ships SHALL come from one source folder `src/` outside `plugins/` (design D12).
`src/` SHALL hold each repeated rule and each copied limit once.
`just generate` SHALL write each generated file from its source.
A generated file SHALL start with a header that names its source and says that the file is generated.

#### Scenario: Generate

- **WHEN** a developer changes a shared rule and runs `just generate`
- **THEN** each agent body that repeats the rule has the new text

#### Scenario: Header

- **WHEN** a test reads a generated file that is not JSON
- **THEN** its first lines name the source

### Requirement: No header in a generated JSON file

A generated JSON file, such as `hooks.json` or the plugin `settings.json`, SHALL have no header, because JSON has no comment and Claude Code rejects an unknown key.
A `$comment` key fails `claude plugin validate --strict` in `plugin.json`, and it logs an error at each session start in `hooks.json`.

#### Scenario: Generated JSON file

- **WHEN** a test reads a generated JSON file
- **THEN** the file has no header key, and the list of generated files of the generator names the file and its source

### Requirement: Text and code apart

A generated file SHALL hold no logic, and code SHALL stay hand-written `.ts` in `plugins/`.
The texts from `src/` SHALL be the prompt sections, the agent bodies, the output style, the skill files, the tool texts, `hooks.json`, the plugin `settings.json`, the settings snippet, and the wiki tables.

#### Scenario: Text in the plugin

- **WHEN** a test lists the Markdown, JSON, and text files under `plugins/`
- **THEN** each one has the header of a generated file, or is on the short list of files that the test names with a reason
- **AND** each generated JSON file is on that list, with the reason that JSON has no comment

### Requirement: Generated files match their sources

The check SHALL fail when a generated file differs from the output of its source, and SHALL name the file.

#### Scenario: Edit by hand

- **WHEN** a developer edits a generated file by hand and runs `just check`
- **THEN** the check fails and names the file and its source

#### Scenario: Edit of a generated JSON file

- **WHEN** a developer edits a generated JSON file by hand and runs `just check`
- **THEN** the check fails and names the file and its source, with no header in the file

### Requirement: Generated files out of the size bound

The file size test SHALL skip each file whose header names it as generated.

#### Scenario: Long generated file

- **WHEN** a generated wiki table has 400 lines
- **THEN** the size test passes
