## ADDED Requirements

### Requirement: The First Tool Call Is Not Announced

The per-model body SHALL tell the model to start its first tool call with no text that announces it, because the call shows itself.

#### Scenario: A Turn That Starts with a Read

- **WHEN** an eval case's turn opens with "I'll start by reading the config file." before its first `Read` call
- **THEN** the case fails, and a turn that opens with the `Read` call passes

### Requirement: A Handed-Over Command Failed for the Agent First

The classic Stop hook SHALL block a reply whose `- ! <command>` bullet names a command that no earlier Bash call of the session ran, or whose last run succeeded. It SHALL read the session's calls and results from `transcript_path`, and the block SHALL name the command and tell the agent to run it.

#### Scenario: An Untried Commit

- **WHEN** a reply lists `- ! git commit -m x` and the session ran no `git commit`
- **THEN** the Stop hook blocks the reply and names the command

#### Scenario: A Denied Command

- **WHEN** a reply lists a command whose Bash call the session ran and that call was denied
- **THEN** the Stop hook lets the reply end

## MODIFIED Requirements

### Requirement: Truly Stuck Means Only the User Can Act

The model SHALL call itself stuck only when the next step needs what only the user has: a password, hardware, or an interactive login. It SHALL then give the exact `! <command>` for the user to run, and finish every part that does not depend on it.

#### Scenario: Interactive Login

- **WHEN** an eval case has a step that needs an interactive login the agent cannot run
- **THEN** the passing reply gives the exact `! <command>` line and finishes the other parts, and a reply that ends the turn with a general request for help fails

#### Scenario: Sudo Step

- **WHEN** an eval case has a step that needs `sudo`
- **THEN** the passing reply holds no `- ! sudo …` bullet and finishes the parts that do not depend on the step

#### Scenario: Authorized Token in `.env`

- **WHEN** an eval case needs a scratch login, and the user has authorized the token in `.env` for it
- **THEN** the passing reply runs the login with that token, and a reply that calls it "a step only you can do" fails

### Requirement: The Output Style Hands Over Commands

The "What I Need From You" rule of `output-styles/Concise.md` SHALL list only commands the agent cannot run itself, once each, as plain `- ! <command>` bullets with no `sudo` and no slash command; every text that names the form SHALL use `- ! <command>`. The heading SHALL capitalize every word (the person, 2026-11-09). The style SHALL tell the model to report each experiment and its result.

#### Scenario: Login Needed

- **WHEN** a step needs an interactive login
- **THEN** the reply gives the `! <command>` to run as its one bullet under `## What I Need From You`

#### Scenario: A Command the Agent Can Run

- **WHEN** the next step is a command the agent can run with its own tools
- **THEN** the agent runs it, and the reply lists no bullet for it

#### Scenario: A Sudo or Slash Command

- **WHEN** a reply's draft lists `- ! sudo make install` or `- ! /login`
- **THEN** the reply breaks the rule

#### Scenario: A Repeated Bullet

- **WHEN** the last reply listed `- ! gh auth login` and the person has not run it
- **THEN** the next reply does not list it again

### Requirement: Each Agent Has a Body and a Model

The agents under `plugins/claudetto/agents/` SHALL be `Artemis`, `Metis`, `Athena`, and `Heracles`, each with a plain body that is its whole prompt, and each SHALL set `model`, `effort`, `tools`, and `maxTurns` to the values of "Each Agent File Sets Its Model, Effort, Tools, and Turns" in `subagent-prompts`.

#### Scenario: Agent Reports

- **WHEN** the bodies are read
- **THEN** `Artemis` ends with one `path:line` and excerpt per finding, `Metis` returns steps, files, risks, and the check command, and `Heracles` ends with what it did, what it checked and the result, and what is left

#### Scenario: Read-Only Agents

- **WHEN** the frontmatter of `Artemis`, `Metis`, and `Athena` is read
- **THEN** each holds `tools: Read, Grep, Glob` and a `maxTurns` value, `Artemis` holds `model: claude-haiku-5-5`, `effort: high`, and `autoCompactWindow: 100000`, and `Metis` and `Athena` each hold `model: claude-sonnet-5-5` and `effort: medium`

#### Scenario: Heracles

- **WHEN** the frontmatter of `Heracles` is read
- **THEN** it holds `model: claude-sonnet-5-5`, `effort: medium`, a `maxTurns` value, and grants every tool

### Requirement: A Disputed Claim Is Weighed as a Third Party's

The per-model body SHALL tell the model to weigh a disputed claim as a third party's and check it in the same turn. When the check backs the user, the model SHALL state the corrected fact. When it backs the reply, the model SHALL keep the reply and show the check. It SHALL tell the model to drop an act the user says nobody asked for. `Concise.md` SHALL tell the model to open with the corrected fact and restate nothing the person already has.

#### Scenario: The Check Backs the User

- **WHEN** the user disputes the last reply and the check shows the reply was wrong
- **THEN** the reply opens with the corrected fact

#### Scenario: The Check Backs the Reply

- **WHEN** the user disputes the last reply and the check shows the reply was right
- **THEN** the reply keeps its claim and shows the check that ran, with its command and output

#### Scenario: A Waited-On Task

- **WHEN** a background task still runs at Stop and the user waits on it
- **THEN** no claudetto Stop hook blocks the stop for the task

### Requirement: A Credential Is Looked Up in Order

The per-model body SHALL tell the model to look for a credential in the repository's `.env` files first, then in the environment, and to use the one it finds in place of asking the user for a new file (R36).

#### Scenario: A Token in `.env`

- **WHEN** a script needs `PROBE_API_TOKEN` and `.env` holds it
- **THEN** the model names `.env` and writes no new file
- **AND** the eval case is `evals/credential-from-env`

#### Scenario: A Token Only in the Environment

- **WHEN** a script needs `PROBE_API_TOKEN`, no `.env` file holds it, and the environment does
- **THEN** the model uses the environment value and asks the user nothing

### Requirement: A Needed Dependency Goes Into the Project

The per-model body SHALL tell the model that a probe runs where undoing is free, and that a dependency the project needs is added to the project with the project's package manager, because a copy in a temp folder leaves the project without it (the person, R20).

#### Scenario: A Package Tried Out First

- **WHEN** the user asks to try a package out and make it available to the project
- **THEN** the model adds it in the project with the package manager the session start named, such as `bun add <package>` in a Bun project, not an install under `/tmp` alone
- **AND** the eval case is `evals/dependency-into-project`

### Requirement: Each Rule File Loads at Session Start

Each file under `plugins/claudetto/rules/` SHALL hold no frontmatter, so Claude Code loads it at the start of a session, and SHALL hold one to four lines that state the rule with its reason.

#### Scenario: The Shipped Rules

- **WHEN** a reader lists `plugins/claudetto/rules/`
- **THEN** it holds `findFactsByExperiment.md`, `lookForAClone.md`, `noImpossibleStateGuards.md`, `noUnrequestedEdits.md`, `useBlockLanguage.md`, `useHeadlineseNames.md`, `useLeastCode.md`, and `useOneObviousWay.md`
- **AND** the four general rules say to find a fact by experiment, to give each job one obvious way, to write agent-seen text in block language with the articles that do work, and to look for a clone before writing a function

#### Scenario: A Rule File

- **WHEN** any file under `plugins/claudetto/rules/` is read
- **THEN** it starts with no `---`, holds at most four non-empty lines, and holds a reason with "because" (`tools/rules.test.ts`, "no rule file holds frontmatter, so each loads at session start", "each rule is a few lines and gives its reason")

### Requirement: A Reply Holds Only What Is New

`output-styles/Concise.md` SHALL say that a reply after a remark, a notice, or a reply already on screen holds only what is new. The prompt-type Stop hook, when it asks for a reply again, SHALL say to keep the last reply and write only the correction, because the screen keeps the blocked reply and a full resend shows one report twice, in two wordings that can disagree. The open-items Stop hook SHALL name the lines to move or delete instead.

#### Scenario: A Reply After a Stop Block

- **WHEN** the prompt-type Stop hook stops a reply and the model writes again
- **THEN** the last reply stays on screen, and the model writes only what it corrects or adds

#### Scenario: A Block That Names Its Lines

- **WHEN** the open-items Stop hook stops a reply for its ask form or command form
- **THEN** the block lists each line at fault and names the move or deletion

#### Scenario: A Worker's Message Result

- **WHEN** a lead sends `SendMessage` to a background agent
- **THEN** the result text shows on screen from the tool result and is in no reply of the model, so no hook of ours writes it into a reply
