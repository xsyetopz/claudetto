## ADDED Requirements

### Requirement: One Registration File per Plugin

Each plugin SHALL register its hooks from one file, which calls each group of hooks in the order they nest. A module that only forwards to another module's exports MUST NOT exist.

#### Scenario: The Order Is Kept

- **WHEN** the registration files of `claudetto` are merged into one
- **THEN** the groups register in the same order as before, and every test passes with its expected values unchanged

#### Scenario: A Pass-Through Module

- **WHEN** a source file holds only re-exports or calls that pass their arguments on unchanged
- **THEN** it is deleted, and its callers import the real module

### Requirement: One Copy of Each Shared Helper

A helper, constant, or list that two files of one plugin need SHALL be defined once and imported. Two different things MUST NOT share one name. `just clones` SHALL report no clone outside the recorded baseline. An interface with one implementation that only forwards to `$` MUST NOT exist; its callers SHALL take `$`.

#### Scenario: A Type Guard Used in Four Files

- **WHEN** four files of one plugin each need `isRecord`
- **THEN** one file defines it and three import it

#### Scenario: Two Patterns Under One Name

- **WHEN** two files each define a `USER_COMMAND` pattern that matches different text
- **THEN** each pattern gets a name that says what it matches, and neither is merged into the other

#### Scenario: The Duplication Check

- **WHEN** `just clones` runs
- **THEN** it exits 0 and reports 0 new clones

### Requirement: A Plugin Folder Holds No Bun-Run Test File

A plugin folder SHALL hold no file that only a Bun-run test loads: no `*.spec.ts` file, no fixture, and no helper that only those load. Such files SHALL live under `tests/<plugin>/`. Lab tests (`*.test.ts`) and the mocks they import SHALL stay beside their source, because the lab loads a test only from inside the plugin folder. A repository test SHALL list each plugin folder's files and fail on a Bun-run test file.

#### Scenario: Fixtures of the OpenSpec Plugin

- **WHEN** the files of `plugins/claudetto-openspec` are listed
- **THEN** the list holds no `fixtures` folder, no `*.spec.ts` file, and no `fixture-*.ts` file, and the folder holds under 110,000 bytes

#### Scenario: A Lab Test Stays

- **WHEN** `just lab` runs after the move
- **THEN** each `*.test.ts` file still sits beside its source and passes

#### Scenario: A Helper a Tool Needs

- **WHEN** a file under `tools/` needs a helper that a moved file defined
- **THEN** the helper lives under `tools/`, and no file under `tools/` imports from `tests/`

### Requirement: A Guard Refuses on a Fault, and No Fault Is Dropped

Each `tool.check` and `tool.call` registration SHALL carry its own `.catch` that returns a refusal with the failure's message, or its `kind` when there is none, and calls nothing, because a guard without one fails open. Every other caught fault SHALL be logged with its cause or rethrown. A `catch` MUST NOT turn a fault into a value that reads as a normal answer.

#### Scenario: A Gate That Throws

- **WHEN** a `tool.check` hook throws while it reads a command
- **THEN** the call is refused with the failure text, and does not run

#### Scenario: A Call Hook That Throws Before the Tool

- **WHEN** a `tool.call` hook throws before it calls `next`
- **THEN** its own `.catch` refuses, and the tool does not run

#### Scenario: A Hook That Overruns

- **WHEN** a guard's own code runs past the hook time limit
- **THEN** the call is refused, and the refusal names the kind `timeout`

#### Scenario: The Validator Lists Each Guard

- **WHEN** `claude plugin validate --strict --json` runs on a plugin
- **THEN** each `tool.check` and `tool.call` gating hook it lists has `hasCatch` true, and a repository test fails on one that is false

#### Scenario: A Failed Side Read

- **WHEN** a hook's read of its own store fails
- **THEN** the log holds the cause, and the hook's answer does not report success

### Requirement: The Rebuild's Size Is Measured Against a Target

The rebuild SHALL record, before and after, the source lines under `plugins/claudetto/hooks` (leaving out tests and generated rule files), the count of clones `just clones` reports as new, and the count of `catch` sites that bind no error. The source lines SHALL NOT grow, and the record SHALL state the result against the target of 8,000 lines.

#### Scenario: The Record

- **WHEN** the rebuild is done
- **THEN** `CHANGELOG.md` holds the three numbers before and after, each with the command that measured it
