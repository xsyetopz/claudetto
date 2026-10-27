# minispec Specification

## Purpose
MiniSpec plans a change in files, with one skill and one small command, in the OpenSpec file layout.

## Requirements

### Requirement: OpenSpec Layout

MiniSpec SHALL write each change to `openspec/changes/<name>/` with the files and the delta headers of OpenSpec, so that `openspec validate` accepts a change that MiniSpec writes.

#### Scenario: OpenSpec Reads a MiniSpec Change

- **WHEN** MiniSpec writes a `story` change and `bunx @fission-ai/openspec validate <name>` runs on it
- **THEN** the command exits `0`

### Requirement: No Start Cost

The skills `claudetto:propose`, `claudetto:apply`, `claudetto:verify`, `claudetto:archive`, `claudetto:explore`, `claudetto:update`, and `claudetto:sync` SHALL each have `disable-model-invocation: true`, and claudetto SHALL ship no other spec skill.
A skill with this key adds no description to the request (`research/probes.md` batch 13, `goalproj`).

#### Scenario: Request at Session Start

- **WHEN** a stub probe captures the first main request of a session with claudetto
- **THEN** the request has no description of a spec skill

### Requirement: Command Scope

The `minispec` command SHALL have `new change`, `list`, `status`, `instructions`, `show`, `validate`, `schemas`, `schema validate`, `sync`, and `archive`, the commands of OpenSpec that the sessions of the user call (design D10).
`status` SHALL give the ready artifacts and the task counts of `countTasks` of `plugins/claudetto/modules/project/domain/change.ts`.
`archive` SHALL merge the delta specs of a change into `openspec/specs/` and move the change to `openspec/changes/archive/`.

#### Scenario: Archive Merges a Delta

- **WHEN** a change has `## ADDED Requirements` with `### Requirement: A` for the capability `x`, and `minispec archive <name> --yes` runs
- **THEN** `openspec/specs/x/spec.md` has `### Requirement: A`, and the change is in `openspec/changes/archive/`

#### Scenario: Validate Finds a Missing Scenario

- **WHEN** a requirement has no `#### Scenario:` and `minispec validate <name>` runs
- **THEN** the command exits not `0` and names the requirement

### Requirement: Parity with OpenSpec

For each command of the scope, a test SHALL run `minispec` and `@fission-ai/openspec@1.15.0` on the same fixtures and SHALL compare the exit codes, the files that each writes, and the facts that each prints.
A difference SHALL fail the test, unless design D10 names it as better, with its reason.

#### Scenario: Archive Differs

- **WHEN** `minispec archive` writes a main spec that differs from the one of `openspec archive` on the same fixture
- **THEN** the parity test fails and names the file

### Requirement: Size Only Shrinks

A test SHALL pin the lines of code of the slice and the bytes of the skill body and its templates at the values that the first version measures after its rewrite pass.
A change that raises a pinned value SHALL fail the test, unless it adds a behavior that the plan names.

#### Scenario: Code Grows

- **WHEN** a change adds lines to the slice and adds no named behavior
- **THEN** `just check` fails and names the pinned value

### Requirement: No OpenSpec Install

MiniSpec SHALL NOT run `bunx @fission-ai/openspec init` and SHALL NOT change the global OpenSpec config.

#### Scenario: Fresh Project

- **WHEN** a user runs `/claudetto:propose` in a project with no `openspec/` folder
- **THEN** MiniSpec makes `openspec/changes/<name>/`, and no file appears under `.claude/skills/` or `.claude/commands/`

### Requirement: Names with Dots

`minispec new change` SHALL turn a name with dots, such as `release-2.1.309`, into kebab-case by a change of each dot to a hyphen, and SHALL print the name that it used.
It SHALL still reject a name with other characters that kebab-case does not allow.

#### Scenario: Version Name

- **WHEN** the user runs `minispec new change release-2.1.309`
- **THEN** the change folder is `openspec/changes/release-2-1-309/`, and the output names `release-2-1-309`

#### Scenario: Bad Name

- **WHEN** the user runs `minispec new change Release_X`
- **THEN** the command exits not `0` and gives the name rule

### Requirement: No Handoff in a Change Folder

`minispec` SHALL write no `handoff.md` into a change folder.
Handoffs SHALL go to `.claudetto/handoffs/` (spec `handover`).

#### Scenario: New Change

- **WHEN** the user runs `minispec new change release-x`
- **THEN** the change folder has no `handoff.md`

### Requirement: Release Preset

The skill `propose` SHALL tell Claude to pick `epic` for a release that holds changes of more than one capability, and `task` only when no behavior changes.

#### Scenario: Release with Several Capabilities

- **WHEN** the user asks for a plan of a release that changes the gate and the setup
- **THEN** the skill text leads Claude to the preset `epic`

### Requirement: Sync without Archive

`minispec sync <name>` SHALL merge the delta specs of a change into `openspec/specs/` with the merge code of `archive`, and SHALL leave the change folder in place.
The skills `explore`, `update`, and `sync` of claudetto SHALL set `disable-model-invocation: true`.

#### Scenario: Sync a Change

- **WHEN** the user runs `minispec sync release-0-3-0-alpha-2`
- **THEN** `openspec/specs/` holds the merged requirements, and `openspec/changes/release-0-3-0-alpha-2/` still exists

### Requirement: Next Step

`minispec status` SHALL print the checklist of artifacts and one `Next:` line in the form of `openspec status`, and JSON only with `--json`.
The `Next:` line SHALL name the next command: `/claudetto:propose` while an artifact is not done, `/claudetto:apply` while a task is open, and `/claudetto:archive` when each task is done.
The JSON SHALL hold the same command as `next`.
The skills `propose`, `apply`, and `verify` SHALL end each report with that command as a line to the user.

#### Scenario: Planning Done

- **WHEN** each artifact of a change is done and task `2.1` is the first open task
- **THEN** `minispec status --change <name>` prints `Next: /claudetto:apply` and the report of `propose` names `/claudetto:apply`

#### Scenario: JSON Only on Request

- **WHEN** the user runs `minispec status --change <name>` with no `--json`
- **THEN** the output is the checklist and the `Next:` line, not JSON

### Requirement: Same Result as OpenSpec

For each command and flag of D22, `minispec` SHALL give the same exit status, the same `valid` value, and the same issues as OpenSpec 1.15.0 for the same input, and SHALL write the same files.
A difference SHALL be listed in the `differences` of its parity case.

#### Scenario: Duplicate Requirement

- **WHEN** a delta has two `### Requirement: Wave` blocks under `## ADDED Requirements`
- **THEN** `minispec validate --strict --json` gives `valid: false` with the ERROR `Duplicate requirement in ADDED: "Wave"`

#### Scenario: Archive Would Refuse

- **WHEN** a delta has `MODIFIED` for a requirement that the main spec lacks
- **THEN** `minispec validate` gives the INFO `Archive would refuse this delta: greet MODIFIED failed for header "### Requirement: Goodbye" - not found`

#### Scenario: Already in Sync

- **WHEN** a delta only removes a requirement that the main spec lacks
- **THEN** `minispec archive --yes` prints `Specs already in sync; no files changed.` and the main `spec.md` keeps each byte

#### Scenario: Main Specs

- **WHEN** the user runs `minispec validate --specs --strict --json`
- **THEN** each spec in `openspec/specs/` is an item, and a short purpose gives the WARNING `Purpose section is too brief (less than 50 characters)`
