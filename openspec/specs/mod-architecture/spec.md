# mod-architecture Specification

## Purpose
Each claudetto responsibility has exactly one owner, chosen from evidence in a fixed order, and the release proves it keeps or improves each observed behavior of the baseline while it ships less code and less prompt text.

## Requirements

### Requirement: One Owner per Responsibility

Each responsibility the plugin carries MUST have exactly one owner in the shipped plugin: a Claude Code setting or built-in behavior, a mod hook, a settings hook, a skill, or none because it is removed. Two code paths MUST NOT write the same file, settings key, or state key from different tables or with different rules. Code paths that write the same kind of file MAY exist when each fires on its own trigger and all of them take the file name, the root, and the layout from one shared function.

#### Scenario: Setup Exists Twice

- **WHEN** a command and a standalone script both write the user's settings from the same table
- **THEN** one of them is removed before release

#### Scenario: Two Writers of a Handoff

- **WHEN** two hooks can each write a file under `.claude/claudetto/handoffs/`, as the compaction fallback (`hooks/handoff.ts`), the handoff tool (`hooks/handoff/call.ts`), and the forked handover (`hooks/handoff/handover.ts`) each write a file under `.claude/claudetto/handoffs/`
- **THEN** each takes its name from `handoffPath`, its root from `atRoot`, and its layout from `layout` in `hooks/handoff/layout.ts`, and none writes on another's trigger

#### Scenario: Two Writers of the Status Line

- **WHEN** `/claudetto:setup` and a bare `/statusline` both write `statusLine`
- **THEN** both read the one `STATUS_LINE` group of `hooks/command.run/useSetup/settings.ts` and write through `changesOf`, `applyChanges`, and `writeFile`, so the key has one table and one rule

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
