## ADDED Requirements

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

## MODIFIED Requirements

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
