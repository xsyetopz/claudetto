# Spec Delta: `minispec`

## Purpose

MiniSpec is the spec-driven workflow of `claudetto`.
It takes ideas from OpenSpec, Spec Kitty, and SpecKit, and its file layout is near the layout of OpenSpec.
It is built from skills, Markdown files, and one CLI that follows <https://clig.dev/>, tuned for Claude Code and the Claude 5.1 and 5.5 models.
It works with the handoff, so a long change keeps its state across a handoff.

## ADDED Requirements

### Requirement: The `minispec` CLI

MiniSpec SHALL ship one CLI, `minispec`, in the way that OpenSpec ships `openspec`.
The CLI SHALL create, list, show, validate, and archive changes and specs, and SHALL give the status of a change.
The CLI SHALL NOT keep an event log, and the skills SHALL call it only to create, validate, show the status of, or archive a change.

#### Scenario: The plugin contents

- **WHEN** the core plugin is installed
- **THEN** `bin/minispec` is the only `bin/` command of MiniSpec

### Requirement: The CLI follows clig.dev

The `minispec` CLI SHALL follow the Command Line Interface Guidelines at <https://clig.dev/>:

- `-h` and `--help` give help with examples, and a bad command suggests the nearest one.
- The output is for a person by default, and `--json` gives output for a program.
- The output goes to stdout, and the messages and errors go to stderr.
- The exit code is 0 on success and not 0 on a failure.
- Color is off when stdout is not a terminal, when `NO_COLOR` is set, or with `--no-color`.

#### Scenario: Validate in a script

- **WHEN** a script runs `minispec validate add-export --json` on a change with an error
- **THEN** stdout holds JSON with the error, stderr holds no color codes, and the exit code is not 0

### Requirement: CLI prompts and errors

Following <https://clig.dev/>, the `minispec` CLI SHALL ask no question, because an answer is a word of one language, and each confirmation SHALL be a flag.
An error SHALL say what went wrong and what to do next.
A command that changes files SHALL say what it changed and the next command to run.

#### Scenario: No confirmation flag

- **WHEN** Claude runs `minispec archive add-export` without `--yes`
- **THEN** the CLI asks nothing, fails with exit code 2, and names the `--yes` flag

### Requirement: File layout

MiniSpec SHALL keep its files in a `minispec/` folder at the root of the project.
The current specs SHALL be in `minispec/specs/<capability>/spec.md`.
Each change SHALL be in `minispec/changes/<name>/`, with `proposal.md`, `tasks.md`, and, for a big or large change, `design.md` and `specs/<capability>/spec.md`.
The skills, the templates, and the user-facing text SHALL use the name MiniSpec.

#### Scenario: A new medium change

- **WHEN** the user starts a medium change named `add-export`
- **THEN** `minispec/changes/add-export/` holds `proposal.md` and `tasks.md`

### Requirement: Archive

A done change SHALL move to `minispec/changes/archive/<date>-<name>/`, and its spec deltas SHALL merge into `minispec/specs/`.

#### Scenario: Archive

- **WHEN** a change is done and the user archives it
- **THEN** the change folder moves under `minispec/changes/archive/`, and `minispec/specs/` holds the merged requirements

### Requirement: Spec format

A spec file and a delta file SHALL use the fixed labels of the format, such as `### Requirement:` and `#### Scenario:`.
`minispec validate` SHALL check the structure of these labels and SHALL NOT read the words of a requirement, so a spec in any language is valid.

#### Scenario: A spec in Polish

- **WHEN** a requirement has a statement line in Polish and a `#### Scenario:` block
- **THEN** `minispec validate` reports no issue for it

### Requirement: Size tiers

MiniSpec SHALL fit the work to its size.
A small task SHALL go to the work with no change folder.
A medium task SHALL have a change with a proposal and tasks.
A big or large task SHALL also have specs and a design.

#### Scenario: A one-file fix

- **WHEN** the user asks for a fix in one file
- **THEN** Claude does the fix with no change folder

#### Scenario: A large task

- **WHEN** the user asks for a feature over several modules
- **THEN** the change has a proposal, specs, a design, and tasks before the work starts

### Requirement: Low overhead

MiniSpec SHALL use few tool calls of its own.
In the eval of the workflow, the calls that only manage the change SHALL be less than 15 percent of the tool calls.

#### Scenario: Eval of a medium task

- **WHEN** the workflow eval runs on a medium task
- **THEN** less than 15 percent of the tool calls manage the change files

### Requirement: Verification is a command, not prose

Each task SHALL name its check as a command in a code span or block.
Claude SHALL run only a check that is a command, and SHALL report a check in prose as not run.
Claude SHALL mark a task done in `tasks.md` only after its check ran and passed.

#### Scenario: A check in prose

- **WHEN** a task says "check that it works"
- **THEN** Claude reports that the task has no runnable check and does not mark it done

### Requirement: State for the handoff

The checked tasks in `tasks.md` SHALL be the record of the done work of a change.
When a handoff runs during a change, the handoff SHALL name the change folder and the next open task.
The handoff SHALL treat each checked task as done and verified, and the next part of the session SHALL NOT run the check of a checked task again unless the user asks.
The handoff file of a change SHALL be `minispec/changes/<name>/handoff.md`.

#### Scenario: A handoff in the middle of a change

- **WHEN** a handoff runs while tasks 1.1 to 1.3 of `add-export` are checked
- **THEN** the handoff names `minispec/changes/add-export/` and task 1.4, and the session goes on with task 1.4

#### Scenario: No active change

- **WHEN** a handoff runs and no change is active
- **THEN** the handoff file goes to the default place of the handoff

### Requirement: Back to planning

A change SHALL be able to go back to planning from any later step, and the edited plan SHALL replace the old plan.

#### Scenario: A gap found in the work

- **WHEN** Claude finds during the work that a spec is wrong
- **THEN** Claude edits the spec and the tasks, and the change goes on

### Requirement: Review by another agent

The review of a change SHALL come from an agent that did not write the change.
The writer SHALL NOT approve its own work.

#### Scenario: Review step

- **WHEN** a change reaches review
- **THEN** a `reviewer` agent with no part in the work gives the verdict

### Requirement: Works in a linked worktree

Each step SHALL work in a linked worktree, and SHALL NOT need a clean main checkout.

#### Scenario: Review in a worktree

- **WHEN** the review runs in a linked worktree
- **THEN** the review runs and gives a verdict
