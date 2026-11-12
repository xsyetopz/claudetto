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

### Requirement: One Command at a Time

A reply SHALL hold at most one `- ! <command>` bullet, the one the work needs first, and the next SHALL come in a later reply after the person has run it, because the person's `!` runs and messages queue while the agent works (the person, 2026-11-09). A bullet is a command bullet only when its text starts with `! ` or `` `! ``; a finding that mentions a `! <command>` step is not one. `output-styles/Concise.md` SHALL say so.

#### Scenario: Several Commands Only the Person Can Run

- **WHEN** the work needs three commands only the person can run
- **THEN** the reply lists the first as its one `- ! <command>` bullet, and the next reply, after the person's run, lists the second
- **AND** a finding bullet that mentions a `! <command>` step beside that one bullet passes

## ADDED Requirements

### Requirement: A Reply States Facts and Holds Only What Is New

`output-styles/Concise.md` SHALL hold a `<register>` block that says what to write: the fact, the corrected result, and the next step; a mistake as its error and cause; the check behind each claim; an answer to the question asked; each step the agent can take itself, done; only done steps as a report; a choice the agent can make, made and named. It SHALL say that a reply after a remark, a notice, or a reply already on screen holds only what is new. Each Stop block SHALL end with the same instruction, because the screen keeps the blocked reply and a full resend shows one report twice, in two wordings that can disagree.

#### Scenario: A Reply After a Stop Block

- **WHEN** the Stop check blocks a reply and the model writes again
- **THEN** the block says the last reply stays on screen and asks for only what it corrects or adds
- **AND** the lab test is `limits/verify.test.ts`, and `tools/manifest.test.ts` holds the style's `<register>` block

#### Scenario: A Worker's Message Result

- **WHEN** a lead sends `SendMessage` to a background agent
- **THEN** the result text shows on screen from the tool result and is in no reply of the model, so no hook of ours writes it into a reply
