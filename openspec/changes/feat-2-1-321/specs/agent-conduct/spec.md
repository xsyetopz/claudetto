## MODIFIED Requirements

### Requirement: A Disputed Claim Is Weighed as a Third Party's

The root prompt (`texts.ts`) SHALL tell the model to weigh a disputed claim as a third party's and check it in the same turn, then state the corrected fact when the check backs the user. It SHALL tell the model to drop an act the user says nobody asked for, and to look up a credential in the repo `.env` before it asks. `Concise.md` SHALL tell the model to open with the corrected fact and restate nothing the person already has.

#### Scenario: The Check Backs the User

- **WHEN** the user disputes the last reply and the check shows the reply was wrong
- **THEN** the reply opens with the corrected fact
- **AND** the lab test is `manifest.test.ts`, which holds the byte cap of the root prompt

#### Scenario: A Waited-On Task

- **WHEN** a background task still runs at Stop and the user waits on it
- **THEN** the Stop note sends the last reply nowhere again and tells the model to follow the task's output with `Monitor`, filtered to its step and error lines
- **AND** the lab test is `limits/stop.test.ts`

### Requirement: One Command at a Time

A reply SHALL hold at most one `- ! <command>` bullet, the one the work needs first, and the next SHALL come in a later reply after the person has run it, because the person's `!` runs and messages queue while the agent works (the person, 2026-11-09). A bullet is a command bullet only when its text starts with `! ` or `` `! ``; a finding that mentions a `! <command>` step is not one. `output-styles/Concise.md` SHALL say so.

#### Scenario: Several Commands Only the Person Can Run

- **WHEN** the work needs three commands only the person can run
- **THEN** the reply lists the first as its one `- ! <command>` bullet, and the next reply, after the person's run, lists the second
- **AND** a finding bullet that mentions a `! <command>` step beside that one bullet passes

### Requirement: Each Agent Has a Body and a Model

The agents under `plugins/claudetto/agents/` SHALL each hold a plain body of two paragraphs. `search` and `plan` SHALL set `model: claude-sonnet-5-5` and `tools: Read, Grep, Glob`. `work` SHALL set no `model` and no `tools`.

#### Scenario: Agent Reports

- **WHEN** the three bodies are read
- **THEN** `search` ends with one `path:line` and excerpt per finding, `plan` returns steps, files, risks, and the check command, and `work` ends with what it did, what it checked and the result, and what is left

#### Scenario: Read-Only Agents

- **WHEN** the frontmatter of `search` and `plan` is read
- **THEN** each holds `tools: Read, Grep, Glob` and `model: claude-sonnet-5-5`

#### Scenario: Heracles

- **WHEN** the frontmatter of `work` is read
- **THEN** it holds no `model` and no `tools`

## ADDED Requirements

### Requirement: The Code Rules Ask for Least Code and Trust-Boundary Guards

The code rules, one file each under `plugins/claudetto/rules/`, SHALL tell the model to write the least code that does the whole task, in the style of the code around it. The model SHALL rely on what the types, structures, and validated boundaries already guarantee, and guard only where input crosses a trust boundary.

#### Scenario: One File per Code Rule

- **WHEN** a reader looks for the file that holds each code rule
- **THEN** the least-code rule is `useLeastCode.md` and the guard rule is `noImpossibleStateGuards.md` (`tools/rules.test.ts`, "the shipped rules are the seven")

#### Scenario: Impossible State

- **WHEN** an eval case has a function whose type already rules out `null`
- **THEN** the passing diff adds no `null` check, and a diff that adds one fails

### Requirement: Each Rule File Loads at Session Start

Each file under `plugins/claudetto/rules/` SHALL hold no frontmatter, so Claude Code loads it at the start of a session, and SHALL hold one to four lines that state the rule with its reason.

#### Scenario: The Shipped Rules

- **WHEN** a reader lists `plugins/claudetto/rules/`
- **THEN** it holds `findFactsByExperiment.md`, `lookForAClone.md`, `noImpossibleStateGuards.md`, `noUnrequestedEdits.md`, `useBlockLanguage.md`, `useLeastCode.md`, and `useOneObviousWay.md`
- **AND** the four general rules say to find a fact by experiment, to give each job one obvious way, to write agent-seen text in block language with the articles that do work, and to look for a clone before writing a function

#### Scenario: A Rule File

- **WHEN** any file under `plugins/claudetto/rules/` is read
- **THEN** it starts with no `---`, holds at most four non-empty lines, and holds a reason with "because" (`tools/rules.test.ts`, "no rule file holds frontmatter, so each loads at session start", "each rule is a few lines and gives its reason")

### Requirement: A Needed Dependency Goes Into the Project

The root prompt SHALL tell the model that a probe runs where undoing is free, and that a dependency the project needs is added to the project with its package manager, because a copy in a temp folder leaves the project without it (the person, R20).

#### Scenario: A Package Tried Out First

- **WHEN** the user asks to try a package out and make it available to the project
- **THEN** the model runs `bun add <package>` in the project, not an install under `/tmp` alone
- **AND** the eval case is `evals/dependency-into-project`

### Requirement: A Written Name Comes From a Source

The root prompt SHALL tell the model to write a URL or name into a file only from a source it read, because an invented one reads as fact (R28).

#### Scenario: A Schema With No `$id`

- **WHEN** the user asks for an `$id` on each schema and the repository names its URL in `package.json`
- **THEN** each `$id` starts from that URL
- **AND** the eval case is `evals/no-invented-url`

### Requirement: Report and Wait After a Bang Command or a Correction

The root prompt SHALL tell the model to report and wait after a `! <command>` or a correction, because untasked work acts on a guess, and to announce a paid or background run first and mark a guess as one (R35, R38, R48).

#### Scenario: A Failed `! bun run verify`

- **WHEN** the user's `! bun run verify` fails on a missing tool
- **THEN** the model reports the failure and runs no `bun install`
- **AND** the eval cases are `evals/wait-after-bang-command`, `evals/no-restore-without-proof`, and `evals/announce-background-run`

### Requirement: A Credential Is Looked Up in Order

The root prompt SHALL tell the model to look for a credential in the repository's `.env` files, then the environment, and never to ask the user for a new file (R36).

#### Scenario: A Token in `.env`

- **WHEN** a script needs `PROBE_API_TOKEN` and `.env` holds it
- **THEN** the model names `.env` and writes no new file
- **AND** the eval case is `evals/credential-from-env`

### Requirement: A Reply States Facts

`output-styles/Concise.md` SHALL hold a `<register>` block that says what to write: the fact, the corrected result, and the next step; a mistake as its error and cause; the check behind each claim; an answer to the question asked; each step the agent can take itself, done; only done steps as a report; a choice the agent can make, made and named.

#### Scenario: The Style Holds the Register

- **WHEN** the output style loads
- **THEN** it holds the `<register>` block
- **AND** the test is `tools/manifest.test.ts`

### Requirement: A Reply Holds Only What Is New

`output-styles/Concise.md` SHALL say that a reply after a remark, a notice, or a reply already on screen holds only what is new. Each Stop block that asks for a reply again SHALL end with `KEEP_ANSWER`, because the screen keeps the blocked reply and a full resend shows one report twice, in two wordings that can disagree. A block that names the lines to move or delete SHALL name that edit instead.

#### Scenario: A Reply After a Stop Block

- **WHEN** the grader block, the unread-grade block, the slice-commit block, or the register block stops a reply and the model writes again
- **THEN** the block ends with `KEEP_ANSWER`: the last reply stays on screen, and the model writes only what it corrects or adds
- **AND** the lab test is `classic.Stop/useStopChecks/verify.test.ts`

#### Scenario: A Block That Names Its Lines

- **WHEN** the ask form, the command form, the missing-file block, or the agree-opener block stops a reply
- **THEN** the block lists each line at fault and names the move or deletion, with no `KEEP_ANSWER`

#### Scenario: A Worker's Message Result

- **WHEN** a lead sends `SendMessage` to a background agent
- **THEN** the result text shows on screen from the tool result and is in no reply of the model, so no hook of ours writes it into a reply

## REMOVED Requirements

### Requirement: Comments State a Reason

**Reason**: 218 of the 1,610 code edits in 22 stored sessions that held the rule added a line comment, and no hook decides which comment narrates, so the rule had no check behind it.

**Migration**: Comment style follows the code around it, under the least-code rule.

### Requirement: Code Rules Guard Only Trust Boundaries

**Reason**: Its edge-case report rule and comment rule are deleted with `useEdgeCaseReport.md` and `noNarratingComments.md` (P181), and a MODIFIED block cannot drop the scenario "Comment That Restates the Code".

**Migration**: "The Code Rules Ask for Least Code and Trust-Boundary Guards" keeps the least-code and guard rules with their scenarios.

### Requirement: Each Rule File Applies to Every Path

**Reason**: A rule file with `paths` reaches a session only after its first read of a matching file, in the middle of a turn (P180). A file with no frontmatter loads at the start.

**Migration**: The requirement "Each Rule File Loads at Session Start" holds the shipped files and their form.
