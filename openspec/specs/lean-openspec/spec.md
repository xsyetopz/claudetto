# lean-openspec Specification

## Purpose
`claudetto-openspec`, claudetto's own OpenSpec workflow for Claude Code: a plugin that reads and writes upstream `@fission-ai/openspec` files, fixes the upstream defects that hurt a Claude Code user, and measures smaller in skill text and code.

## Requirements

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

The workflow MUST run inside the plugin's hooks module, through one tool it registers, and MUST run no `openspec` executable and open no network connection, so no `node` shim, PATH entry, or telemetry is involved. Archive's processes are `mv`, which moves the change folder, `mkdir -p`, which creates `openspec/changes/archive/` when it is absent (`archive.ts:239-241`), and, for a retirement, `rm` and `rmdir`; `$.fs` has none of them.

#### Scenario: A Validate Call

- **WHEN** the model validates a change
- **THEN** the call is answered by the plugin's tool, and no process runs

#### Scenario: A First Archive

- **WHEN** archive runs and `openspec/changes/archive/` does not exist
- **THEN** `mkdir -p` creates it before `mv` moves the change

### Requirement: Apply Stops on an Invalid Change

The apply skill MUST validate the change before it implements a task and stop on any validation error or warning, naming each issue by path and message (upstream #2166; `apply/SKILL.md:9`).

#### Scenario: A Stray Delta File

- **WHEN** apply starts on a change that validation fails
- **THEN** the model reports the failure and implements no task

#### Scenario: A Warning

- **WHEN** validation reports a WARNING and no ERROR
- **THEN** apply stops, names the warning, and implements no task

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

### Requirement: Validate with No Change Checks the Main Specs

A `validate` call with no change named SHALL check every active change and every `openspec/specs/*/spec.md` in one strict pass, and SHALL fail a main spec with a `## Purpose` under 50 characters, no requirement, a requirement with no SHALL or MUST, or a requirement with no scenario. This call SHALL replace `bunx openspec validate --all --strict` in `justfile`.

#### Scenario: No Active Change

- **WHEN** `{action:"validate"}` runs and `openspec/changes/` holds only `archive/`
- **THEN** each main spec is checked and the result lists each one as valid or names its fault, instead of "No active changes"

#### Scenario: A Main Spec Without a Scenario

- **WHEN** a requirement in `openspec/specs/run-limits/spec.md` has no `#### Scenario:`
- **THEN** validate fails and names the spec and the requirement

#### Scenario: The Recipe Uses the Tool

- **WHEN** `justfile` is read
- **THEN** no recipe calls `bunx openspec`

### Requirement: Init Lays Out a New Project

An `init` action SHALL write `openspec/config.yaml` with `schema: spec-driven`, `openspec/specs/.gitkeep`, and `openspec/changes/archive/.gitkeep`, and SHALL leave each file that already exists unchanged. It SHALL write no skill file, because the plugin ships the skills.

#### Scenario: Empty Project

- **WHEN** `{action:"init"}` runs in a folder with no `openspec/`
- **THEN** the three files exist and validate passes with no change and no spec

#### Scenario: Existing Layout

- **WHEN** `init` runs where `openspec/config.yaml` already exists
- **THEN** no file changes and the result says the project was already set up

### Requirement: New Opens a Change

A `new` action SHALL create `openspec/changes/<name>/.openspec.yaml` with `schema: spec-driven` and today's `created` date, after the name passes the kebab-case check that validate uses, and SHALL refuse a name that exists as an active or archived change.

#### Scenario: Valid Name

- **WHEN** `{action:"new", change:"add-init"}` runs
- **THEN** `openspec/changes/add-init/.openspec.yaml` exists

#### Scenario: Taken Name

- **WHEN** `openspec/changes/archive/2026-11-09-add-init/` exists and `new` is called with `add-init`
- **THEN** nothing is written and the result names the archived folder

### Requirement: Status Shows What Is Ready

A `status` call SHALL mark each artifact of a change as done, ready, or blocked in the order proposal, then specs and design, then tasks, where an artifact is ready once each artifact before it is done, and SHALL list archived changes by folder name.

#### Scenario: Proposal Only

- **WHEN** a change holds only `proposal.md`
- **THEN** status shows proposal done, specs and design ready, and tasks blocked

#### Scenario: Archived Changes

- **WHEN** `openspec/changes/archive/` holds two folders
- **THEN** status lists both names after the active changes

### Requirement: List Shows the Specs

A `list` call SHALL name each main spec with its requirement count.

#### Scenario: Two Specs

- **WHEN** `openspec/specs/` holds `a/spec.md` with 3 requirements and `b/spec.md` with 1
- **THEN** the list shows `a 3` and `b 1`

### Requirement: The Tool Refuses Bad Input in Plain Words

The `openspec` tool (`openspec.ts:83-105`) MUST answer bad input in a plain sentence and not throw: no `openspec/changes` folder, no active change, `archive` with no `change`, a name that fails `^[\w][\w.-]*$`, and a change folder that is absent. An archive refusal MUST read `Archive of <name> refused, nothing changed: <why>`, with a code from `archive.ts` such as `open_tasks`, `archive_locked`, or `archive_target_exists`.

#### Scenario: A Path as a Name

- **WHEN** `change` is `../x`
- **THEN** the tool answers that it is not a change name and reads no file (`openspec.test.ts`, "A change name that is a path is refused")

#### Scenario: No Folder

- **WHEN** the project holds no `openspec/changes`
- **THEN** the tool answers "No openspec/changes folder in this project." (`openspec.test.ts`, "No openspec folder: says so")

#### Scenario: Archive Without a Name

- **WHEN** `{action:"archive"}` runs with no `change`
- **THEN** the tool answers that `archive` needs `change`, and nothing moves

#### Scenario: Archive Target Exists

- **WHEN** `openspec/changes/archive/2026-11-09-x/` exists and archive runs on `x` the same day
- **THEN** archive refuses with `archive_target_exists` and moves nothing (`archive.ts:213-219`)

### Requirement: Explore Thinks and Writes Nothing

The explore skill MUST write no code and edit no file in the repo, except OpenSpec artifacts when the user asks for them. It MUST read the code and specs the topic touches and cite file and line, lay out options with their cost, and write a settled decision into an artifact only after the user says yes. It MUST then suggest the propose skill, or the update skill when a change exists.

#### Scenario: A Settled Decision

- **WHEN** a decision settles in an explore session
- **THEN** the skill offers to record it and writes nothing until the user agrees

### Requirement: Propose Writes a Change in One Pass

The propose skill MUST take a kebab-case name from the user's words, read the code and specs first, and invent no behavior. It MUST write `.openspec.yaml`, `proposal.md`, `design.md`, one `specs/<capability>/spec.md` per capability, and `tasks.md` with numbered `- [ ]` lines. It MUST validate until the change is valid, then report the name and the files, and that apply is next.

#### Scenario: A Name That Exists

- **WHEN** the chosen name matches an existing change folder
- **THEN** the skill asks for another name or points to the update skill, and writes nothing

#### Scenario: A Delta Fails

- **WHEN** validate reports an issue on a new change
- **THEN** the skill fixes it and validates again before it reports

### Requirement: Update Edits Only the Change

The update skill MUST read every file of the change, apply the new decision to the artifact it belongs to and carry it to proposal, design, spec deltas, and `tasks.md`, and edit only files under `openspec/changes/<name>/`. It MUST NOT edit code or `openspec/specs/`. A ticked task MUST stay ticked unless the decision undoes it, and the skill MUST say so then. It MUST validate until the change is valid and report one line per changed file.

#### Scenario: A Decision Undoes a Ticked Task

- **WHEN** a new decision undoes task 1.2, which is ticked
- **THEN** the skill unticks it and says so in the report

#### Scenario: A Code Edit

- **WHEN** the user's decision needs a code change
- **THEN** the skill edits no code and records the work as a task

### Requirement: Verify Reports and Edits Nothing

The verify skill MUST call validate and status for the change, name the file and line that meets each requirement, and call a requirement with no match a gap. It MUST report three lists: critical (a missing requirement, an unticked task, a validation error), warnings (a `design.md` decision the code does not follow), and notes. It MUST edit nothing.

#### Scenario: An Unticked Task

- **WHEN** `tasks.md` holds `- [ ] 2.1 open`
- **THEN** the critical list names task 2.1

### Requirement: A MODIFIED Requirement That Grows Past the Limit Warns

The validator MUST warn on a MODIFIED requirement whose text holds more than 500 characters when the main spec's text for that requirement holds 500 or fewer, because archive would merge it into a main spec whose check warns on every such text. A MODIFIED requirement whose main-spec text is already over the limit MUST get no length warning, as upstream gives none. This fix only fails a change that upstream passes.

#### Scenario: A Text That Grows Past the Limit

- **WHEN** a change restates a requirement of 417 characters under MODIFIED with a text of 501 characters and validation runs strict
- **THEN** validation fails and names the requirement

#### Scenario: A Text That Was Already Long

- **WHEN** a change restates a requirement whose main-spec text holds 570 characters, and the MODIFIED text holds 560
- **THEN** the validator gives no length warning for it, as upstream gives none

### Requirement: The Tool Result Is Bounded

The `openspec` tool MUST return at most 12,000 characters of result, because a `status` of a change with many open tasks reached about 11,400 tokens and Claude Code warns on an MCP result past 10,000 tokens. A longer result MUST keep whole lines up to the limit and end with a line that counts the lines not shown. A first line past the limit MUST be cut at the limit. A result within the limit MUST be returned whole.

#### Scenario: Many Open Tasks

- **WHEN** `status` names a change with 3,000 open tasks
- **THEN** the result holds at most 12,000 characters of task lines and ends with the count of the lines not shown

#### Scenario: A Short Result

- **WHEN** a result holds fewer than 12,000 characters
- **THEN** the tool returns it unchanged
