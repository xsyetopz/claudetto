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

The skills `claudetto:propose`, `claudetto:apply`, `claudetto:verify`, and `claudetto:archive` SHALL each have `disable-model-invocation: true`, and claudetto SHALL ship no other spec skill.
A skill with this key adds no description to the request (`research/probes.md` batch 13, `goalproj`).

#### Scenario: Request at Session Start

- **WHEN** a stub probe captures the first main request of a session with claudetto
- **THEN** the request has no description of a spec skill

### Requirement: Command Scope

The `minispec` command SHALL have `new change`, `list`, `status`, `validate`, and `archive`, the commands of OpenSpec that the sessions of the user call (design D10).
`status` SHALL give the ready artifacts and the task counts of `countTasks` of `src/kernel/change.ts`.
`archive` SHALL merge the delta specs of a change into `openspec/specs/` and move the change to `openspec/changes/archive/`.

#### Scenario: Archive Merges a Delta

- **WHEN** a change has `## ADDED Requirements` with `### Requirement: A` for the capability `x`, and `minispec archive <name> --yes` runs
- **THEN** `openspec/specs/x/spec.md` has `### Requirement: A`, and the change is in `openspec/changes/archive/`

#### Scenario: Validate Finds a Missing Scenario

- **WHEN** a requirement has no `#### Scenario:` and `minispec validate <name>` runs
- **THEN** the command exits not `0` and names the requirement

### Requirement: Parity with OpenSpec

For each command of the scope, a test SHALL run `minispec` and `@fission-ai/openspec@1.14.3` on the same fixtures and SHALL compare the exit codes, the files that each writes, and the facts that each prints.
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
