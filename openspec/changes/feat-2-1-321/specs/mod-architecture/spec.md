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

### Requirement: One Guard Hook per Event

Each plugin SHALL register at most one `tool.check` hook and one `tool.call` hook, each with one `.catch`, because a guard hook without one fails open. A guard SHALL be a named function that tests the tool's name itself and passes every other call on. The registration file SHALL list the guards of each event in the order they nest.

#### Scenario: The Validator Lists Each Guard Hook

- **WHEN** `claude plugin validate --strict --json` runs on a plugin
- **THEN** it lists at most one `tool.check` and one `tool.call` gating hook, each with `hasCatch` true, and a repository test fails otherwise

#### Scenario: A Call of Another Tool

- **WHEN** a guard for `Read` receives a `Bash` call
- **THEN** it passes the call to `next` unchanged

#### Scenario: The Guard Order Is Kept

- **WHEN** the 22 guard registrations of `claudetto` become two guard lists
- **THEN** the guards run in the order their registrations nested, and every lab test passes with its expected values unchanged, except the fault texts

### Requirement: A Guard Refuses on a Fault, and No Fault Is Dropped

A fault in a `tool.check` guard SHALL ask the person, and a fault in a `tool.call` guard SHALL refuse, each with the failure's message, or its `kind` when there is none. The side check of `claudetto-you-should-know` SHALL instead log its fault and let the call go on. Every other caught fault SHALL be logged with its cause or rethrown. A `catch` MUST NOT turn a fault into a value that reads as a normal answer.

#### Scenario: A Gate That Throws

- **WHEN** a `tool.check` guard throws while it reads a command
- **THEN** the verdict is `ask` with the failure text, and the call does not run unasked

#### Scenario: A Call Guard That Throws Before the Tool

- **WHEN** a `tool.call` guard throws before it calls `next`
- **THEN** the call is refused with the failure text, and the tool does not run

#### Scenario: A Call Guard That Throws After the Tool

- **WHEN** a `tool.call` guard throws after `next` answered
- **THEN** the tool has run once, and its result is withheld with the failure text

#### Scenario: A Tool That Fails Beneath the Plugin

- **WHEN** what is beneath the plugin throws while a `tool.call` guard waits on `next`
- **THEN** that failure reaches the caller as its own, and no guard's refusal replaces it

#### Scenario: A Hook That Overruns

- **WHEN** the guards' own code runs past the hook time limit
- **THEN** the `.catch` answers as for a throw, and its text names the kind `timeout`

#### Scenario: A Side Check That Fails

- **WHEN** the `tool.call` hook of `claudetto-you-should-know` throws
- **THEN** the log holds the cause, and the call goes on as its spec requires

#### Scenario: A Failed Side Read

- **WHEN** a hook's read of its own store fails
- **THEN** the log holds the cause, and the hook's answer does not report success

### Requirement: The Rebuild's Size Is Measured Against a Target

The rebuild SHALL record, before and after, the source lines under `plugins/claudetto/hooks` (leaving out tests and generated rule files), the count of clones `just clones` reports as new, and the count of `catch` sites that bind no error. The source lines SHALL NOT grow, and the record SHALL state the result against the target of 8,000 lines.

#### Scenario: The Record

- **WHEN** the rebuild is done
- **THEN** `CHANGELOG.md` holds the three numbers before and after, each with the command that measured it

### Requirement: Each Responsibility Has One Owner

Each responsibility the plugin carries MUST have exactly one owner in the shipped plugin: a Claude Code setting or built-in behavior, a mod hook, a settings hook, a skill, or none because it is removed. Two code paths MUST NOT write the same file, settings key, or state key from different tables or with different rules. Code paths that write the same kind of file MAY exist when each fires on its own trigger and all of them take the file name, the root, and the layout from one shared function.

#### Scenario: Setup Exists Twice

- **WHEN** a command and a standalone script both write the user's settings from the same table
- **THEN** one of them is removed before release

#### Scenario: Two Writers of the Status Line

- **WHEN** `/claudetto:setup` and a bare `/statusline` both write `statusLine`
- **THEN** both read the one `STATUS_LINE` group of `hooks/setup/settings.ts` and write through `changesOf`, `applyChanges`, and `writeFile`, so the key has one table and one rule

## REMOVED Requirements

### Requirement: One Owner per Responsibility

**Reason**: Its "Two Writers of a Handoff" scenario names the handoff writers, which the handoff removal deletes, and a MODIFIED block cannot drop a scenario.

**Migration**: "Each Responsibility Has One Owner" keeps the rule and its other two scenarios.
