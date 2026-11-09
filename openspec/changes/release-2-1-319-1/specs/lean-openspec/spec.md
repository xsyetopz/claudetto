## ADDED Requirements

### Requirement: Validate with No Change Checks the Main Specs

A `validate` call with no change named SHALL check every active change and every `openspec/specs/*/spec.md` in one strict pass, and SHALL fail a main spec with a `## Purpose` under 50 characters, no requirement, a requirement with no SHALL or MUST, or a requirement with no scenario. This call SHALL replace `bunx openspec validate --all --strict` in `justfile`.

#### Scenario: No Active Change

- **WHEN** `{action:"validate"}` runs and `openspec/changes/` holds only `archive/`
- **THEN** each main spec is checked and the result lists each one as valid or names its fault, instead of "No active changes"

#### Scenario: A Main Spec Without a Scenario

- **WHEN** a requirement in `openspec/specs/run-limits/spec.md` has no `#### Scenario:`
- **THEN** validate fails and names the spec and the requirement

#### Scenario: The Recipe Uses the Tool

- **WHEN** `justfile` is read
- **THEN** no recipe calls `bunx openspec`

### Requirement: Init Lays Out a New Project

An `init` action SHALL write `openspec/config.yaml` with `schema: spec-driven`, `openspec/specs/.gitkeep`, and `openspec/changes/archive/.gitkeep`, and SHALL leave each file that already exists unchanged. It SHALL write no skill file, because the plugin ships the skills.

#### Scenario: Empty Project

- **WHEN** `{action:"init"}` runs in a folder with no `openspec/`
- **THEN** the three files exist and validate passes with no change and no spec

#### Scenario: Existing Layout

- **WHEN** `init` runs where `openspec/config.yaml` already exists
- **THEN** no file changes and the result says the project was already set up

### Requirement: New Opens a Change

A `new` action SHALL create `openspec/changes/<name>/.openspec.yaml` with `schema: spec-driven` and today's `created` date, after the name passes the kebab-case check that validate uses, and SHALL refuse a name that exists as an active or archived change.

#### Scenario: Valid Name

- **WHEN** `{action:"new", change:"add-init"}` runs
- **THEN** `openspec/changes/add-init/.openspec.yaml` exists

#### Scenario: Taken Name

- **WHEN** `openspec/changes/archive/2026-11-09-add-init/` exists and `new` is called with `add-init`
- **THEN** nothing is written and the result names the archived folder

### Requirement: Status Shows What Is Ready

A `status` call SHALL mark each artifact of a change as done, ready, or blocked in the order proposal, then specs and design, then tasks, where an artifact is ready once each artifact before it is done, and SHALL list archived changes by folder name.

#### Scenario: Proposal Only

- **WHEN** a change holds only `proposal.md`
- **THEN** status shows proposal done, specs and design ready, and tasks blocked

#### Scenario: Archived Changes

- **WHEN** `openspec/changes/archive/` holds two folders
- **THEN** status lists both names after the active changes

### Requirement: List Shows the Specs

A `list` call SHALL name each main spec with its requirement count.

#### Scenario: Two Specs

- **WHEN** `openspec/specs/` holds `a/spec.md` with 3 requirements and `b/spec.md` with 1
- **THEN** the list shows `a 3` and `b 1`
