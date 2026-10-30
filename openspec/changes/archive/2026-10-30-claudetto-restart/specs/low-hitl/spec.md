## Purpose

A semi-autonomous run uses auto mode, so the work is to make auto mode and its classifier cheap, quiet on safe actions, and firm on unsafe ones. Every requirement uses a documented key or command. Sources: `configure/permissions/auto-mode`, `configure/permissions/auto-mode-rules`, `prompts/auto-classifier-custom`, and `how-it-works/permission-flow` of the `clawdipedia` pages for `2.1.311`.

## ADDED Requirements

### Requirement: Setup Writes `autoMode` to User Settings

Setup SHALL write the `autoMode` setting to the user settings file and SHALL NOT write it to project, local, or plugin settings, because the program reads it only from user settings, `--settings`, and managed settings.

#### Scenario: Plugin Install

- **WHEN** the plugin is installed and setup has not run
- **THEN** no `autoMode` is in effect, and the setup report says so

#### Scenario: Setup Run

- **WHEN** setup runs
- **THEN** `claude auto-mode config` shows the claudetto entries, tagged as added alongside the defaults

### Requirement: Keep the Built-in Rules

Each list that setup writes SHALL start with `$defaults`, because a list without it replaces the built-in rules.

#### Scenario: Defaults Kept

- **WHEN** setup writes `allow`, `soft_deny`, `hard_deny`, or `environment`
- **THEN** each list holds `$defaults`, and `claude auto-mode config` does not say "replacing defaults"

### Requirement: Describe the Environment

Setup SHALL fill `autoMode.environment` with the facts of the project, such as the check commands, so that the classifier allows routine work without a prompt. Setup SHALL take the facts from the project and from `/auto-mode-setup` proposals (task 6.3), and SHALL NOT invent a rule. A rule that treats a git remote as a trusted repository has no source and is held back in `prd.md`.

#### Scenario: Fact from a Proposal

- **WHEN** an `/auto-mode-setup` proposal names a fact of the project and task 6.3 keeps it
- **THEN** `environment` holds that fact, and `docs/auto-mode.md` cites the session it came from

### Requirement: Review the Rules with the Built-in Critique

Before a release, the rules SHALL pass `claude auto-mode critique`, and each finding SHALL be fixed or answered in `docs/auto-mode.md`.

#### Scenario: Critique

- **WHEN** the gate runs with approval for the model call
- **THEN** the critique output is stored, and each finding has an answer

### Requirement: Settle Safe Calls before the Classifier

A call that a permission rule or a hook already settles SHALL NOT reach the classifier, because the classifier runs only for calls that would otherwise ask. Claudetto SHALL measure the share of calls that reach it.

#### Scenario: Settled by Rule

- **WHEN** an `allow` rule covers a read-only call
- **THEN** the call runs and `window-budget` records no `classifier` row for it

### Requirement: Narrow Rules Keep Calls from the Classifier

Every tool call that claudetto can settle with a narrow allow rule MUST NOT reach the classifier, because one classifier request has a `system[1]` of `140,015` characters and `140,718` in all, which is larger than three first requests of `42,676` characters (`docs/prompt/machinery.md`, `docs/surfaces.md`).

#### Scenario: Routine Call with a Rule

- **WHEN** a call is one that claudetto runs on every task, such as `Bash(npm test)`
- **THEN** a narrow `allow` rule covers it and the classifier is not called

### Requirement: Do Not Replace the Built-in Rules to Save Size

Setup MUST NOT drop `$defaults` from an `autoMode` list as a size trim unless the user approves it. The saving of `-64,690` characters in `prompts/auto-classifier-custom` came from a `soft_deny` list with no `$defaults`, which dropped the built-in safety rules, and not from better writing (`docs/prompt/machinery.md`).

#### Scenario: Trim by Dropping Defaults

- **WHEN** a change shrinks the classifier request by removing `$defaults` and the user has not approved it
- **THEN** the setup test fails and names the list

### Requirement: Do Not Force Shell Commands through the Classifier

Setup MUST NOT set `autoMode.classifyAllShell` to `true`, because it suspends every `Bash` allow rule and sends each shell command to the classifier. The setup test fails when it is `true`.

#### Scenario: Default

- **WHEN** setup finishes
- **THEN** `classifyAllShell` is unset or `false`

### Requirement: Measure the Classifier Cost

The recorder of `window-budget` SHALL tag classifier requests with the source `classifier`, and the report SHALL give their count and window points. The recorder SHALL measure per login whether a plan counts classifier requests against its limits, and SHALL NOT assume it.

#### Scenario: Plan Charge Not Sourced

- **WHEN** the report states a plan charge for classifier requests
- **THEN** it cites rows of this login, because no page sources the claim: an earlier text cited a `claude.com` article with no URL and no date, a `search_docs` call for "classifier cost" over `clawdipedia` found no page that says it, and the claim is held back in `prd.md`
- **AND** the classifier request with custom rules carries a system prompt of about 75,000 characters (`prompts/auto-classifier-custom`)

#### Scenario: Report

- **WHEN** the report runs after a week of auto mode
- **THEN** it lists classifier requests per day and the points they moved, or prints "not measured"

### Requirement: Use Narrow Allow Rules

Allow rules that setup writes SHALL be narrow, such as `Bash(npm test)`, and setup SHALL refuse a broad one.

The rationale first written here, that auto mode drops broad rules on entry (`Bash(*)`, wildcarded interpreters, package-manager run commands, `Agent` and `Monitor`) and only narrow rules stay, is NOT in the `permission-modes` page of `code.claude.com` as that page read on 2026-10-30, so it is withdrawn rather than cited. What the page states is that modes set the baseline and permission rules layer on top to pre-approve specific tools, and that allow rules have no effect in `bypassPermissions`.

The requirement stands on its own reason: a broad allow rule pre-approves a whole tool or interpreter for every call, which is a permission the person did not grant per command. A rule that ships to every install SHALL also be true of every machine, which is why the list is read-only `git` and nothing that depends on a project's package manager, interpreter, or test runner.

A rule SHALL also be narrow in what the command may do once allowed. A rule cannot exclude a flag, so a wildcard over a command that writes a file with a flag pre-approves that write. Measured in this checkout: `git diff --output=F HEAD~1`, `git log -1 --output=F`, and `git show --output=F HEAD` each exited `0` and left `F` on disk, where `git status --output=F` exited `129` and wrote nothing. Only a command that refuses such a flag may carry a wildcard; the rest are named bare, which holds no `*` and so matches that text alone (`configure/permissions/rules`, `2.1.314`).

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

### Requirement: Let the Sandbox Settle Shell Commands

Setup SHALL enable the sandbox where the platform supports it, so that `autoAllowBashIfSandboxed` (default true) approves sandboxed commands with no prompt and no classifier call. Setup SHALL set `sandbox.allowUnsandboxedCommands` to `false` and SHALL add `denyRead` for secret paths, because the sandbox reads most of the machine by default, including `~/.ssh`. Source: `sandboxing` on `code.claude.com`.

#### Scenario: Sandboxed Command

- **WHEN** a command runs inside the sandbox
- **THEN** it runs with no prompt

#### Scenario: Secret Read

- **WHEN** a sandboxed command reads `~/.ssh`
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

The classifier model SHALL stay at the program default (Sonnet 5, per `permission-modes`) until a measurement shows a cheaper model blocks and allows the same actions. `CLAUDE_CODE_AUTO_MODE_MODEL` needs `2.1.302` or later, and a server-configured model wins, so the measurement SHALL check which model answered before setting it.

#### Scenario: No Evidence

- **WHEN** no measurement exists
- **THEN** setup does not set `CLAUDE_CODE_AUTO_MODE_MODEL`

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

### Requirement: Protected Files Are Gated by a Hook

Edits to protected paths (secrets, settings, hook scripts) SHALL be gated by a `PreToolUse` hook and not left to the classifier, because an independent evaluation found that in-project file edits fall outside what the classifier evaluates (arXiv 2604.04978: 36.8% of state-changing actions, and an end-to-end false negative rate of 81.0% on its ambiguous workload, against 17% that the vendor reports on real traffic). The docs also point to a hook or the sandbox for firm lines (`references.md`).

#### Scenario: Edit of a Protected File

- **WHEN** the model edits a protected path with `Edit` or `Write`
- **THEN** the hook blocks or holds the call, whatever mode is active

### Requirement: A Decision of the Model Goes to a Registered Tool

With the option `decide` set to `jev` and a key set, claudetto SHALL register the tool `mcp__claudetto__decide` at `session.start`, and the model SHALL call it for a decision that is the model's own. The reply SHALL name the pick and its confidence for each question Jev is sure about, and SHALL say so for each question it is not, because silence would read as a pick.

#### Scenario: Decision of the Model

- **WHEN** the model calls `mcp__claudetto__decide` with a question that has two or more options
- **THEN** one request goes to the TypeSafe API, and the reply names the pick and its confidence, with no dialog

#### Scenario: Jev Not Sure

- **WHEN** Jev is not sure about a question of the call
- **THEN** the reply says so for that question and keeps the decision with the model

#### Scenario: No Key

- **WHEN** the option is `jev` and no key is set
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
