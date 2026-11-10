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

A helper, constant, or list that two files need SHALL be defined once and imported. `jscpd` SHALL report no exact clone among the source files under `plugins/*/hooks`, leaving out test files and generated rule files. An interface with one implementation that only forwards to `$` MUST NOT exist; its callers SHALL take `$`.

#### Scenario: A Type Guard Used in Five Files

- **WHEN** five files each need `isRecord`
- **THEN** one file defines it and four import it

#### Scenario: The Duplication Check

- **WHEN** `jscpd` scans the source files under `plugins/*/hooks`
- **THEN** it reports no exact clone

### Requirement: An Install Holds Only What Runs

An installed plugin SHALL hold no test file, test support file, or fixture. A repository test SHALL list the files an install would hold and fail on one of those.

#### Scenario: Fixtures of the OpenSpec Plugin

- **WHEN** `claudetto-openspec` is installed
- **THEN** its folder holds no `fixtures` folder, no `memory-fs.ts`, and no file whose name ends in `.test.ts`, `.spec.ts`, or `.mock.ts`

### Requirement: A Guard Refuses on a Fault, and No Fault Is Dropped

Each `tool.check` registration, and each `tool.call` registration that can deny, SHALL carry a `.catch` that refuses with the failure text, because a guard without one fails open. Every other caught fault SHALL be logged with its cause or rethrown. A `catch` MUST NOT turn a fault into a value that reads as a normal answer.

#### Scenario: A Gate That Throws

- **WHEN** a `tool.check` hook throws while it reads a command
- **THEN** the call is refused with the failure text, and does not run

#### Scenario: A Failed Side Read

- **WHEN** a hook's read of its own store fails
- **THEN** the log holds the cause, and the hook's answer does not report success

### Requirement: The Rebuild's Size Is Measured Against a Target

The rebuild SHALL record, before and after, the source lines under `plugins/claudetto/hooks` (leaving out tests and generated rule files), the `jscpd` clone count for the same files, and the count of `catch` sites that drop their error. The source lines SHALL NOT grow, and the record SHALL state the result against the target of 8,000 lines.

#### Scenario: The Record

- **WHEN** the rebuild is done
- **THEN** `CHANGELOG.md` holds the three numbers before and after, each with the command that measured it
