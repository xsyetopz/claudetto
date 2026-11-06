## MODIFIED Requirements

### Requirement: Narrow Rules Keep Calls from the Classifier

Every tool call that claudetto can settle with a narrow allow rule MUST NOT reach the classifier, because one classifier request has a `system[1]` of `140,015` characters on `2.1.314` (`openspec/changes/archive/2026-10-31-release-0-1-0/decisions.md`, D37) and `141,962` in all on `2.1.317`, which is larger than three first requests of `46,084` characters (both in `openspec/changes/archive/2026-11-03-release-0-3-0/tasks.md`).

#### Scenario: Routine Call with a Rule

- **WHEN** a call is one that claudetto runs on every task, such as `Bash(npm test)`
- **THEN** a narrow `allow` rule covers it and the classifier is not called

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

### Requirement: Choose the Classifier Model by Measurement

The classifier route SHALL be chosen by measurement on the gate fixtures in auto mode: the built-in classifier with the trimmed `autoMode` lists that setup writes, against a Mod `tool.check` route that asks Jev first and falls back to `claude-haiku-5-5`. The cheaper route whose verdicts match at least as many fixtures SHALL ship, and the measurement SHALL record which model answered. The Mod SHALL register no `tool.check` hook that judges a permission.

#### Scenario: Measured Route

- **WHEN** the measurement of 2026-11-06 on 30 cases is read (`ISSUES-2026-11-04-1500.md`, "Task 5.29: route A against route B")
- **THEN** the built-in classifier matched 30 of 30 and the Haiku route 29 of 30, with a stable miss on `push-unnamed-branch`, so the built-in classifier ships
- **AND** `CLAUDE_CODE_AUTO_MODE_MODEL` does not change the model, because a server-configured model wins (`feature-map.md`, "Decisions of the user, 2026-11-05"; task 3.1; `tasks.md` 5.29)

#### Scenario: No Evidence

- **WHEN** no measurement exists
- **THEN** setup does not set `CLAUDE_CODE_AUTO_MODE_MODEL` and no Jev hook decides a permission

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

## ADDED Requirements

### Requirement: Setup Replaces the Built-in Lists

Each `autoMode` list that setup writes SHALL replace the built-in list and name no `$defaults`, because the lists without it cut the classifier request from 140,281 to 63,413 characters (`settings-review.txt`, cl3).

#### Scenario: Lists Written

- **WHEN** setup writes `autoMode`
- **THEN** no list names `$defaults`, and `claude auto-mode config` says it replaces the defaults

## REMOVED Requirements

### Requirement: Keep the Built-in Rules

**Reason**: Replaced by "Setup Replaces the Built-in Lists": setup writes lists without `$defaults` (`tasks.md` 3.1 and 5.28).
**Migration**: None.

### Requirement: Measure the Classifier Cost

**Reason**: The recorder it names is the window row store, removed in 0.4.0 (`feature-map.md`, "Window rows"); the cost of each classifier route is measured per fixture in `ISSUES` (`tasks.md` 5.29).
**Migration**: None.

### Requirement: Protected Files Are Gated by a Hook

**Reason**: The gate drops its protected-file asks because Claude Code's built-in check already asks on writes into `.claude/` and `.git/hooks/` (`design.md`, "The gate keeps only what native rules cannot express": "it drops the `ASK_PROTECTED` asks"). The code holds only the system-folder write rule (`hooks/gate/rules.ts`, `systemPath`).
**Migration**: None.

### Requirement: The Classifier Request Is Read per Rung

**Reason**: Its subject was `just capture`, which read the classifier request on the fake Messages API of the probing tool `claudekit/`. The tool left this repo under task 17.13 (`e20d11df`), and the `capture` recipe is gone from the `justfile`. The classifier routes are measured per fixture in `ISSUES` (`tasks.md` 5.29).
**Migration**: None.
