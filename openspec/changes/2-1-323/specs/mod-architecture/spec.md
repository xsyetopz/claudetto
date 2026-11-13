## ADDED Requirements

### Requirement: Three Files That Share a Prefix Become a Folder

Three or more source files in one folder whose names share a prefix SHALL become a folder named for the prefix, or merge into one file when together they do one job. Each load path that names a moved file, in `register.ts`, `bunfig.toml`, and `project.just`, SHALL follow the move.

#### Scenario: The Spec and Validate Files

- **WHEN** the trim is done
- **THEN** the `spec*` and `validate*` source files of `claudetto-openspec/hooks` sit under `spec/` and `validate/`, and `register.ts` loads them from there

#### Scenario: The Ignore Files

- **WHEN** the trim is done
- **THEN** `useSetup` holds one `ignore.ts` and no other `ignore*` source file

#### Scenario: The Texts Files

- **WHEN** three or more `texts*` files remain under `hooks/`
- **THEN** they sit under `texts/`; when only two remain, they stay where they are

#### Scenario: A Load Path After a Move

- **WHEN** a file named in `bunfig.toml` or `project.just` moves into a folder
- **THEN** the entry names the new path, and `just check` passes

## MODIFIED Requirements

### Requirement: The Owner Is Chosen by a Recorded Check

The owner of a feature MUST be the first in this order that a recorded check shows to keep its behavior: a settings key or built-in behavior, a classic hook, a skill, an output style, a rule file, a mod, removal. A setting or a classic hook comes first because it costs no mod code, keeps working under `--safe-mode`, and is checked by Claude Code itself. A text MUST ship only where a check shows it helps. The feature map MUST name the check, the Claude Code version it ran on, and its result.

#### Scenario: A Native Setting Covers a Hook

- **WHEN** a probe on the installed Claude Code shows that a setting gives the same observed result as a hook
- **THEN** the hook is removed and setup writes the setting

#### Scenario: A Job Only a Mod Can Do

- **WHEN** no settings key, classic hook, skill, output style, or rule file can do a job, such as hiding a slash command
- **THEN** the job stays a mod

#### Scenario: The Check Has Not Run

- **WHEN** a feature's deciding check has not run
- **THEN** its fate stays marked proposed and the release does not ship a change to it

### Requirement: One Guard Hook per Event

Each plugin SHALL register at most one `tool.check` hook and one `tool.call` hook. The `tool.call` hook SHALL carry one `.catch`, because without one it fails open after the tool may have run. The `tool.check` hook SHALL carry none, because Claude Code skips a failed `tool.check` guard and keeps its own verdict. Each guard SHALL be a named function that passes every other tool's call on, and the registration file SHALL list each event's guards in nesting order.

#### Scenario: The Validator Lists Each Guard Hook

- **WHEN** `claude plugin validate --strict --json` runs on a plugin
- **THEN** it lists at most one `tool.check` gating hook, with `hasCatch` false, and at most one `tool.call` gating hook, with `hasCatch` true, and a repository test fails otherwise

#### Scenario: A Call of Another Tool

- **WHEN** a guard for `Read` receives a `Bash` call
- **THEN** it passes the call to `next` unchanged

#### Scenario: The Guard Order Is Kept

- **WHEN** the 22 guard registrations of `claudetto` become two guard lists
- **THEN** the guards run in the order their registrations nested, and every lab test passes with its expected values unchanged, except the fault texts

### Requirement: A Guard Refuses on a Fault, and No Fault Is Dropped

A fault in a `tool.check` guard SHALL leave Claude Code's verdict in place, with no ask of its own, because such an ask stops a person for a call their rules already settle. A fault in a `tool.call` guard SHALL refuse with the failure's message, or its `kind`. The side check of `claudetto-you-should-know` SHALL log its fault and let the call go on. Every other caught fault SHALL be logged with its cause or rethrown, and a `catch` MUST NOT turn a fault into a normal answer.

#### Scenario: A Gate That Throws

- **WHEN** a `tool.check` guard throws while it reads a command, and the verdict beneath is `allow`
- **THEN** the verdict is `allow`, and no dialog opens
- **AND** the lab test is `faults.test.ts`, "a check guard that throws leaves the verdict beneath"

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
- **THEN** in `tool.check` the verdict beneath stands, and in `tool.call` the `.catch` answers as for a throw, with a text that names the kind `timeout`

#### Scenario: A Side Check That Fails

- **WHEN** the `tool.call` hook of `claudetto-you-should-know` throws
- **THEN** the log holds the cause, and the call goes on as its spec requires

#### Scenario: A Failed Side Read

- **WHEN** a hook's read of its own store fails
- **THEN** the log holds the cause, and the hook's answer does not report success
