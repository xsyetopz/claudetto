# mod-architecture Specification

## Purpose
Each claudetto responsibility has exactly one owner, chosen from evidence in a fixed order, and the release proves it keeps or improves each observed behavior of the baseline while it ships less code and less prompt text.

## Requirements

### Requirement: The Owner Is Chosen by a Recorded Check

The owner of a feature MUST be the first in this order that a recorded check shows to keep its behavior: a native setting or built-in behavior, a mod hook, a settings hook, a skill, removal. The feature map MUST name the check, the Claude Code version it ran on, and its result.

#### Scenario: A Native Setting Covers a Hook

- **WHEN** a probe on the installed Claude Code shows that a setting gives the same observed result as a hook
- **THEN** the hook is removed and setup writes the setting

#### Scenario: The Check Has Not Run

- **WHEN** a feature's deciding check has not run
- **THEN** its fate stays marked proposed and the release does not ship a change to it

### Requirement: Behavior Parity with the Baseline

Each kept feature MUST pass a test written from its observed behavior at the baseline, and each test MUST pass against the baseline and the rebuild alike, unless the feature map records the behavior change and its reason.

#### Scenario: A Lab Case Fails Only on the Rebuild

- **WHEN** a parity test passes at `62e2fe96` and fails on the rebuild
- **THEN** the rebuild is fixed, or the map records the change

#### Scenario: A Test Mirrors the Implementation

- **WHEN** a test's expected value is computed by the code under test
- **THEN** the test is rewritten to an expected value from the spec or a recorded observation

### Requirement: A Smaller Footprint, Measured

The release MUST report, against the baseline and by the same commands, the lines of source and tests, the count of hooks and options, the bytes of prompt text the plugin adds or replaces, and the runtime and dev dependencies. Source lines and added prompt bytes MUST NOT grow.

#### Scenario: Prompt Bytes

- **WHEN** the release report is written
- **THEN** it lists the bytes of the root prompt, the tool texts, and each context line, measured with the same script at baseline and at release

### Requirement: Installed Files Know Their Version

Setup MUST save the SHA-256 of each file it copies out of the plugin when it writes it. At startup the plugin MUST log one line for each installed copy whose hash differs from the shipped file's, naming the file, the hashes, and the dates, calling it updated or modified by the saved hash, and recommending `/claudetto:setup`.

#### Scenario: The Plugin Ships a Newer Rule

- **WHEN** an installed rule still hashes as setup saved it, and the shipped rule hashes differently
- **THEN** the startup log names the rule as updated and recommends `/claudetto:setup`

#### Scenario: The User Edited an Installed Rule

- **WHEN** an installed rule no longer hashes as setup saved it, or setup saved no hash for it, whatever the file dates say
- **THEN** the startup log names the rule as modified and recommends `/claudetto:setup`

#### Scenario: Nothing Changed

- **WHEN** every installed copy hashes the same as its shipped file
- **THEN** the startup logs nothing about installed files

#### Scenario: A Rule Never Installed

- **WHEN** the user skipped a rule, so no installed copy exists
- **THEN** the startup logs nothing about that rule

#### Scenario: A Difference Already Reported

- **WHEN** a startup finds the same shipped and installed hashes it reported at an earlier startup
- **THEN** it logs nothing about that file

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

The rebuild SHALL record, before and after, the source lines under `plugins/claudetto/hooks` (leaving out tests and generated rule files), the count of clones `just clones` reports as new, and the count of `catch` sites that bind no error. The target is the 10,419 lines measured after the rebuild's last cut, because the safe cuts left found only 30 lines; the source lines SHALL NOT grow past it, and the record SHALL state the result against it.

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
- **THEN** both read the one `STATUS_LINE` group of `hooks/command.run/useSetup/settings.ts` and write through `changesOf`, `applyChanges`, and `writeFile`, so the key has one table and one rule
