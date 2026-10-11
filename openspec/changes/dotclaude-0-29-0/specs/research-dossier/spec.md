## ADDED Requirements

### Requirement: One page for each Claude Code version

The wiki SHALL hold one research page for each supported Claude Code version, in prose with no minified code (design D24).
Each page SHALL cover the tools, settings, env vars, extension points, and start costs of that version.

#### Scenario: Supported version

- **WHEN** a test reads the supported Claude Code version
- **THEN** the wiki has a research page for it

### Requirement: Changes against the version before

Each version page SHALL show its changes against the version before it, and link to that page.

#### Scenario: New tool

- **WHEN** a version adds a built-in tool
- **THEN** its page lists the tool under the changes

### Requirement: Undocumented data

Each version page SHALL list the undocumented data that Claude Code writes and reads, such as config keys, transcript entries, and cache files, with its path, its shape, the part of Claude Code that writes it, and the dotclaude part that uses it, if one does.
The shape SHALL come from the bundle of that version.

#### Scenario: Usage cache

- **WHEN** a reader looks up `cachedUsageUtilization` on the page of 2.1.296
- **THEN** the page gives its path, its shape, its writer, and the status line as its user

### Requirement: Sources stay local

The raw research in `external/dossier/` SHALL stay out of the repository, and a wiki page SHALL NOT quote minified bundle code.

#### Scenario: Repository check

- **WHEN** a test lists the files that git tracks
- **THEN** none is under `external/`
