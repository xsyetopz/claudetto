## MODIFIED Requirements

### Requirement: Command Scope

The `minispec` command SHALL have `new change`, `list`, `status`, `validate`, and `archive`, the commands of OpenSpec that the sessions of the user call (design D10).
`status` SHALL give the ready artifacts and the task counts of the task parser of the `project` module.
`archive` SHALL merge the delta specs of a change into `openspec/specs/` and move the change to `openspec/changes/archive/`.

#### Scenario: Archive Merges a Delta

- **WHEN** a change has `## ADDED Requirements` with `### Requirement: A` for the capability `x`, and `minispec archive <name> --yes` runs
- **THEN** `openspec/specs/x/spec.md` has `### Requirement: A`, and the change is in `openspec/changes/archive/`

#### Scenario: Validate Finds a Missing Scenario

- **WHEN** a requirement has no `#### Scenario:` and `minispec validate <name>` runs
- **THEN** the command exits not `0` and names the requirement

### Requirement: Size Only Shrinks

A test SHALL pin the lines of code of the `spec` module and the bytes of the skill body and its templates at the values that the first version measures after its rewrite pass.
A change that raises a pinned value SHALL fail the test, unless it adds a behavior that the plan names.

#### Scenario: Code Grows

- **WHEN** a change adds lines to the `spec` module and adds no named behavior
- **THEN** `just check` fails and names the pinned value

## REMOVED Requirements

### Requirement: Release Preset

**Reason**: Its only check was a test of the wording of the skill `propose`. The rule of `.claude/rules/test-behavior.md` deletes a test of prose (the user, 2026-10-26).
**Migration**: The skill `propose` keeps the text. No test checks it.
