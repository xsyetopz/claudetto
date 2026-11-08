## Purpose

`claudetto-openspec`, claudetto's own OpenSpec workflow for Claude Code: a plugin that reads and writes upstream `@fission-ai/openspec` files, fixes the upstream defects that hurt a Claude Code user, and measures smaller in skill text and code.

## ADDED Requirements

### Requirement: File Compatibility with Upstream

The workflow MUST read and write the upstream `spec-driven` layout: `openspec/specs/<capability>/spec.md`, `openspec/changes/<name>/` with `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, and delta specs under `specs/`, and archives under `changes/archive/YYYY-MM-DD-<name>/`. A tree it writes MUST pass upstream `openspec validate --strict`.

#### Scenario: A Change Written by claudetto-openspec

- **WHEN** claudetto-openspec writes a change
- **THEN** upstream `openspec validate <name> --strict` passes on it with no edit

#### Scenario: A Change Written by Upstream

- **WHEN** upstream wrote a change, including `x-` keys in `.openspec.yaml` and nested capability paths
- **THEN** claudetto-openspec reads it, and keeps the keys it does not use

### Requirement: Validation Parity with Named Fixes

For each case ported from upstream's `test/core` validation and archive tests, the validator MUST reach upstream's verdict and name the same requirement or scenario, except for the fixes this spec names. Each fix only fails a change that upstream passes; the validator MUST NOT pass a case that upstream fails.

#### Scenario: A MODIFIED Block That Drops a Scenario

- **WHEN** a MODIFIED requirement omits a scenario the current spec holds
- **THEN** validation fails and names the dropped scenario, as upstream does

#### Scenario: A Warning under Strict

- **WHEN** a spec's Purpose is under 50 characters and validation runs strict
- **THEN** validation fails, as upstream does

### Requirement: One Merge for Validate and Archive

Validation MUST run the same merge that archive runs, applying RENAMED, REMOVED, MODIFIED, and ADDED in that order, so a delta that archive would refuse fails validation (upstream #1112 reports it as `INFO` and passes).

#### Scenario: A MODIFIED Header Missing from the Base Spec

- **WHEN** a delta modifies a requirement the main spec does not hold
- **THEN** validation fails before archive is tried

### Requirement: Only Delta Specs Are Merged

The validator MUST fail a change with a file under `specs/` other than `specs/<capability>/spec.md`, and a delta section other than ADDED, MODIFIED, REMOVED, or RENAMED Requirements, under any strictness (upstream #2173, #2195).

#### Scenario: A Notes File beside a Delta

- **WHEN** a change holds `specs/cap/notes/extra.md`
- **THEN** validation fails and names that file, and archive merges nothing

### Requirement: Archive Retires a Capability Only When Told

Archive MUST delete `specs/<id>/spec.md` and the directories it empties only when `.openspec.yaml` sets `retire_capabilities: true`, the delta removes every requirement, and the spec holds nothing else (#1302).

#### Scenario: A Retirement with a Leftover

- **WHEN** `retire_capabilities: true` is set, the delta removes every requirement, and the main spec holds a section the merge does not account for
- **THEN** archive refuses and deletes nothing

### Requirement: Archive Refuses What Upstream Mishandles

Archive MUST refuse a folder that holds changes but is no change (#1846), a change whose `.openspec-archive.lock` exists, and a capability directory or `spec.md` that is a link leaving the specs tree. It MUST name the archive folder with the local date and carry a delta's Purpose into a new spec (#1413) unless that text would hide or split the spec.

#### Scenario: A Namespace Folder

- **WHEN** archive is asked for a folder that holds only directories, one of them a change
- **THEN** archive refuses with `not_a_change` and moves nothing

### Requirement: Documented Divergences in the Replay

The replay of upstream's 763 cases MUST count each case as passed, as one of the divergences this spec names, or as excluded with a stated reason, and MUST NOT leave one unwired. The tool carries no `skipSpecs`, `noValidate`, or prompt option, so a case that sets one is compared by its verdict and, where upstream left the main specs as before, by the rest of the tree.

#### Scenario: A Case with an Option the Tool Lacks

- **WHEN** an upstream case archives with `noValidate`
- **THEN** the replay counts it as `diverged` with the plugin's verdict, and its tally has no `not wired`

### Requirement: Archive Refuses Open Tasks

Archive MUST refuse a change whose `tasks.md` holds an unticked task, with no option that overrides it (upstream #2006, #1652). It MUST leave the tree unchanged when it refuses.

#### Scenario: One Open Task

- **WHEN** `tasks.md` holds `- [ ] 1.2 open` and archive runs
- **THEN** archive refuses, names task 1.2, and moves no file

### Requirement: No openspec Executable, No Network

The workflow MUST run inside the plugin's hooks module, through one tool it registers, and MUST run no `openspec` executable and open no network connection, so no `node` shim, PATH entry, or telemetry is involved. Archive's processes are `mv`, which moves the change folder, and, for a retirement, `mkdir`, `rm`, and `rmdir`; `$.fs` has none of them.

#### Scenario: A Validate Call

- **WHEN** the model validates a change
- **THEN** the call is answered by the plugin's tool, and no process runs

### Requirement: Apply Stops on an Invalid Change

The apply skill MUST validate the change before it implements a task and stop on any validation error, naming it (upstream #2166).

#### Scenario: A Stray Delta File

- **WHEN** apply starts on a change that validation fails
- **THEN** the model reports the failure and implements no task

### Requirement: Open Work as Task Items

The apply skill MUST have the model end a pause or a report by copying each unticked task it leaves as its `- [ ]` line from `tasks.md`, each with its blocker: a `! <command>` for the user, the denial in this turn, or an open question to the user. The root prompt and the output style carry no such rule, so the Stop check in run-limits sees task items only where this workflow wrote them.

#### Scenario: A Paused Apply

- **WHEN** an apply run stops with two tasks unticked, one waiting on the user's `sudo`
- **THEN** the final reply holds both `- [ ]` lines, and the `sudo` one carries the exact `! <command>`

### Requirement: Smaller Than Upstream, Measured

claudetto-openspec MUST ship only after a recorded measurement shows that its skill bytes are below the upstream core profile's (95,443 skill bytes, plus 92,122 command bytes it does not ship) for the workflows it covers, and its code lines are below upstream's for the same work.

#### Scenario: A Skill Larger Than Upstream

- **WHEN** a claudetto-openspec skill measures more bytes than the upstream skill it replaces
- **THEN** it does not ship until it is cut below
