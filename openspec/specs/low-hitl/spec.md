# low-hitl Specification

## Purpose
A semi-autonomous run uses auto mode, so the work is to make auto mode and its classifier cheap, quiet on safe actions, and firm on unsafe ones. Every requirement uses a documented key or command. Sources: `configure/permissions/auto-mode`, `configure/permissions/auto-mode-rules`, `prompts/auto-classifier-custom`, and `how-it-works/permission-flow` of the `clawdipedia` pages for `2.1.311`.

## Requirements

### Requirement: Setup Writes `autoMode` to User Settings

Setup SHALL write the `autoMode` setting to the user settings file and SHALL NOT write it to project, local, or plugin settings, because the program reads it only from user settings, `--settings`, and managed settings.

#### Scenario: Plugin Install

- **WHEN** the plugin is installed and setup has not run
- **THEN** no `autoMode` is in effect, and the setup report says so

#### Scenario: Setup Run

- **WHEN** setup runs
- **THEN** `claude auto-mode config` shows the claudetto entries, tagged as added alongside the defaults

### Requirement: Describe the Environment

Setup SHALL fill `autoMode.environment` with the facts of the project, such as the check commands, so that the classifier allows routine work without a prompt. Setup SHALL take the facts from the project and from `/auto-mode-setup` proposals (task 6.3), and SHALL NOT invent a rule. A rule that treats a git remote as a trusted repository has no source and is held back in `prd.md`.

#### Scenario: Fact from a Proposal

- **WHEN** an `/auto-mode-setup` proposal names a fact of the project and task 6.3 keeps it
- **THEN** `environment` holds that fact

### Requirement: Review the Rules with the Built-in Critique

Before a release, the rules SHALL pass `claude auto-mode critique`, and each finding SHALL be fixed or answered in the `design.md` of the change that ships them.

#### Scenario: Critique

- **WHEN** the gate runs with approval for the model call
- **THEN** the critique output is stored, and each finding has an answer

### Requirement: Settle Safe Calls before the Classifier

A call that a permission rule or a hook already settles SHALL NOT reach the classifier, because the classifier runs only for calls that would otherwise ask.

#### Scenario: Settled by Rule

- **WHEN** an `allow` rule covers a read-only call
- **THEN** the call runs and the classifier is not asked

### Requirement: Narrow Rules Keep Calls from the Classifier

Every tool call that claudetto can settle with a narrow allow rule MUST NOT reach the classifier, because one classifier request has a `system[1]` of `140,015` characters on `2.1.314` (`d581df3b:openspec/changes/archive/2026-10-31-release-0-1-0/decisions.md`, D37) and `141,962` in all on `2.1.317`, which is larger than three first requests of `46,084` characters (both in `d581df3b:openspec/changes/archive/2026-11-03-release-0-3-0/tasks.md`).

#### Scenario: Routine Call with a Rule

- **WHEN** a call is one that claudetto runs on every task, such as `Bash(npm test)`
- **THEN** a narrow `allow` rule covers it and the classifier is not called

### Requirement: Do Not Replace the Built-in Rules to Save Size

Setup MUST NOT drop `$defaults` from an `autoMode` list as a size trim unless the user approves it. The user approved a trim by reading on 2026-10-30 (D20), so a rung without `$defaults` ships when its characters and its regression are read and recorded.

#### Scenario: Trim by Dropping Defaults

- **WHEN** a change shrinks the classifier request by removing `$defaults` with no recorded reading of its regression
- **THEN** the setup test fails and names the list

### Requirement: Do Not Force Shell Commands through the Classifier

Setup MUST NOT set `autoMode.classifyAllShell` to `true`, because it suspends every `Bash` allow rule and sends each shell command to the classifier. The setup test fails when it is `true`.

#### Scenario: Default

- **WHEN** setup finishes
- **THEN** `classifyAllShell` is unset or `false`

### Requirement: Use Narrow Allow Rules

Allow rules that setup writes SHALL be narrow, such as `Bash(npm test)`, and setup SHALL refuse a broad one. A rule SHALL be narrow in what the command may do once allowed, and a rule that ships to every install SHALL be true of every machine.

#### Scenario: Broad Rule

- **WHEN** a proposed allow rule is `Bash(*)` or `Bash(python*)`
- **THEN** setup rejects it, because it pre-approves a whole interpreter rather than one command

#### Scenario: Wildcard Over a Command That Writes with a Flag

- **WHEN** a proposed allow rule is `Bash(git diff *)`, and `git diff` takes `--output=<file>`
- **THEN** setup rejects it and names it in the report, because the rule would pre-approve an arbitrary file write
- **AND** the bare `Bash(git diff)` is accepted, because it matches that text alone

#### Scenario: The Shipped List

- **WHEN** setup writes `permissions.allow`
- **THEN** the list is `Bash(git status *)`, `Bash(git diff)`, `Bash(git log)`, and `Bash(git show)`, each of which passes both checks
- **AND** a user's own `allow` list is kept whole and reported as skipped

#### Scenario: The Withdrawn Rationale

- **WHEN** a document gives the reason for narrow rules
- **THEN** it does not say that auto mode drops broad rules on entry (`Bash(*)`, wildcarded interpreters, package-manager run commands, `Agent` and `Monitor`), because the `permission-modes` page of `code.claude.com` as read on 2026-10-30 does not state it, so it is withdrawn and not cited
- **AND** what the page states is that modes set the baseline, permission rules layer on top to pre-approve specific tools, and allow rules have no effect in `bypassPermissions`

#### Scenario: A Broad Rule Is a Grant Per Call

- **WHEN** the reason for refusing a broad rule is asked
- **THEN** the answer is that a broad allow rule pre-approves a whole tool or interpreter for every call, a permission the person did not grant per command

#### Scenario: The List Is True of Every Machine

- **WHEN** a rule ships to every install
- **THEN** it is read-only `git` and nothing that depends on a project's package manager, interpreter, or test runner

#### Scenario: A Rule Cannot Exclude a Flag

- **WHEN** a wildcard covers a command that writes a file with a flag
- **THEN** the rule pre-approves that write
- **AND** measured in this checkout, `git diff --output=F HEAD~1`, `git log -1 --output=F`, and `git show --output=F HEAD` each exited `0` and left `F` on disk, where `git status --output=F` exited `129` and wrote nothing
- **AND** only a command that refuses such a flag may carry a wildcard, and the rest are named bare, which holds no `*` and so matches that text alone (`configure/permissions/rules`, `2.1.314`)

### Requirement: Let the Sandbox Settle Shell Commands

Setup SHALL enable the built-in sandbox where the platform supports it, with the keys of the `sandbox` spec, so that `autoAllowBashIfSandboxed` (default true) approves sandboxed commands with no prompt and no classifier call. Setup SHALL set `allowUnsandboxedCommands` to `false`, add `denyRead` for cloud-credential files, and set `network.allowedDomains` to `["*"]` and `filesystem.allowWrite` to the temp folder and the tool caches.

#### Scenario: Least Friction

- **WHEN** the groups are chosen
- **THEN** no domain is listed by hand, per the user on 2026-11-06: "just block the truly destructive stuff and let the rest pass free" (source: `sandboxing` on `code.claude.com`)

#### Scenario: Sandboxed Command

- **WHEN** a command runs inside the sandbox
- **THEN** it runs with no prompt

#### Scenario: Secret Read

- **WHEN** a sandboxed command reads a path in `denyRead`
- **THEN** the read is denied by `denyRead`

### Requirement: Do Not Trip the Circuit Breaker

Auto mode pauses prompting after 3 denials in a row or 20 in total. Claudetto SHALL count each denial per call through the `PermissionDenied` hook, and `tool.check` SHALL deny a call with 2 denials, naming the earlier reason. The hook cannot add text, so its only output is `retry: true` under the bound. Source: `extend/hooks/events` (`PermissionDenied`) and `permission-modes`.

#### Scenario: Repeated Denial

- **WHEN** auto mode denies the same call twice
- **THEN** the next identical call is denied at `tool.check` with the earlier reason, and the classifier is not asked

#### Scenario: Different Call

- **WHEN** auto mode denied one call twice and the model sends a call with another input
- **THEN** the new call is not blocked by the count

### Requirement: Choose the Classifier Model by Measurement

The classifier route SHALL be chosen by measurement on the gate fixtures in auto mode: the built-in classifier with the trimmed `autoMode` lists that setup writes, against a Mod `tool.check` route that asks Jev first and falls back to `claude-haiku-5-5`. The cheaper route whose verdicts match at least as many fixtures SHALL ship, and the measurement SHALL record which model answered. The Mod SHALL register one `tool.check` hook (`gate.ts:234`) and it SHALL only tighten a verdict, or turn a bare `ask` on a read-only command into `allow`; it SHALL NOT ask a model, Jev or another, to judge a permission.

#### Scenario: Measured Route

- **WHEN** the measurement of 2026-11-06 on 30 cases is read (`ISSUES-2026-11-04-1500.md`, "Task 5.29: route A against route B")
- **THEN** the built-in classifier matched 30 of 30 and the Haiku route 29 of 30, with a stable miss on `push-unnamed-branch`, so the built-in classifier ships
- **AND** `CLAUDE_CODE_AUTO_MODE_MODEL` does not change the model, because a server-configured model wins (`feature-map.md`, "Decisions of the user, 2026-11-05"; task 3.1; `tasks.md` 5.29)

#### Scenario: No Evidence

- **WHEN** no measurement exists
- **THEN** setup does not set `CLAUDE_CODE_AUTO_MODE_MODEL` and no Jev hook decides a permission

#### Scenario: The Gate Hook

- **WHEN** the Mod registers its hooks
- **THEN** the one `tool.check` hook is the gate, and no request from it reaches a model (`decide.test.ts`, "A Gated Tool Call: Bash and Edit send nothing")

### Requirement: Fail Closed When the Classifier Is Down

When the classifier is unavailable, the call SHALL be held and not allowed. The program already does this (`Classifier unavailable`, and the context-exceeded fallback to manual approval), and claudetto SHALL NOT add an allow path for it.

#### Scenario: Unavailable

- **WHEN** the classifier cannot answer
- **THEN** the call is held or goes to a person, and a test shows no hook allows it

### Requirement: Hard Boundaries Stay Hard

Claudetto's `deny` rules and its `hard_deny` entries SHALL stay in every tier, because the classifier clears only `soft_deny` by user intent.

#### Scenario: Push

- **WHEN** the model runs `git push` and the user did not ask for it
- **THEN** the call is blocked in every tier

### Requirement: A Decision of the Model Goes to a Registered Tool

When a `typesafeApiKey` is set, claudetto SHALL register the tool `mcp__claudetto__decide` at `session.start` (`register.ts:35-37`), and the model SHALL call it for a decision that is the model's own. No option named `decide` is read. The reply SHALL name the pick and its probability for each question Jev is sure about (`texts.ts:325-326`, "probability 0.NN"), and SHALL say so for each question it is not, because silence would read as a pick.

#### Scenario: Decision of the Model

- **WHEN** the model calls `mcp__claudetto__decide` with a question that has two or more options
- **THEN** one request goes to the TypeSafe API, and the reply names the pick and its probability, with no dialog

#### Scenario: Jev Not Sure

- **WHEN** Jev is not sure about a question of the call
- **THEN** the reply says so for that question and keeps the decision with the model

#### Scenario: No Key

- **WHEN** no key is set
- **THEN** no tool is registered, so the model never sees a tool it cannot call

### Requirement: The Dialog Reaches the User

Claudetto SHALL NOT answer an `AskUserQuestion` call in the user's place, whatever the option, because that dialog is the user's own decision (the user, 2026-10-27: "Jev's restart becomes a separate agent-accessible decision API, rather than overriding user's needed AskUserQuestion and not letting user choose").

#### Scenario: Dialog of the User

- **WHEN** the model calls `AskUserQuestion` with the option `jev` and a key
- **THEN** the call reaches the user with the questions as sent, and nothing goes to the TypeSafe API

### Requirement: Ask Once, Late, with a Brief

When a decision needs a person, the system SHALL defer the question until the prepared work is done and SHALL present one decision-ready brief that links to the assets. The wording is from `mattpocock/skills` `loop-me` (MIT), "push right": do maximal work before involving the human, who is then asked once with everything prepared.

#### Scenario: Several Open Choices

- **WHEN** work reaches a choice that needs a person and other work can go on
- **THEN** the other work goes on first, and the choice is asked once with a brief

### Requirement: Setup Replaces the Built-in Lists

Each `autoMode` list that setup writes SHALL replace the built-in list and name no `$defaults`, because the lists without it cut the classifier request from 140,281 to 63,413 characters (`settings-review.txt`, cl3).

#### Scenario: Lists Written

- **WHEN** setup writes `autoMode`
- **THEN** no list names `$defaults`, and `claude auto-mode config` says it replaces the defaults

### Requirement: No Hook Changes a Call's Input in Auto Mode

No claudetto `tool.call` hook SHALL change the input of a call, because in 2.1.319 a changed input voids auto mode's server review of every call in the same response (`serverClassifierInputRewritten`), and each comes back with "gave no verdict". The `Agent` hook SHALL deny a call not in its exact form (`subagent_type` `claudetto:<Name>`, and an explicit `run_in_background` for Artemis and Metis) and name the form to send; the `ToolSearch` hook SHALL rewrite only the result.

#### Scenario: An Agent Call Off Its Form

- **WHEN** the model calls `Agent` with `subagent_type` `Explore`, or with none
- **THEN** the call is denied with the exact form to send and nothing runs, and the other calls of the response keep their review
- **AND** the lab tests are `delegation.test.ts`, "a call typed ... is refused with its exact form, never rewritten"

#### Scenario: A ToolSearch Query Naming AskUserQuestion

- **WHEN** a `ToolSearch` query names `AskUserQuestion`
- **THEN** the query reaches `ToolSearch` as written and the result lists `mcp__claudetto__ask-user-question` in its place

### Requirement: An Unexplained Server Denial Is Out of Reach

The server verdict `flagged` carries an optional `explanation`; when the server leaves it out, the client prints "judged this action dangerous (it gave no explanation)" and no setting changes that text. claudetto SHALL keep reporting a call denied twice that way with the `!` form.

#### Scenario: Denied Twice with No Reason

- **WHEN** auto mode denies the same `make deploy` call twice with "(it gave no explanation)"
- **THEN** the gate denies a third send and names the command as `` `! make deploy` `` for the user (`hooks/gate.test.ts`)
