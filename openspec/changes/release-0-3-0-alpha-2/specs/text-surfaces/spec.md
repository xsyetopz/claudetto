## Purpose

Each text that claudetto writes, and each text of Claude Code that a supported surface can replace, keeps its behavior in fewer words with positive framing.

## ADDED Requirements

### Requirement: Surfaces Covered

The audit SHALL cover these surfaces: `agents/main.md`, `output-styles/Concise.md`, each agent body and description, each skill description, `tool.describe` for each tool that a session can load (deferred tools too), `prompt.attachment` texts, the subagent notes block of `prompt.compose`, the hook messages in each `prompts.ts`, and the `PreCompact` line for the `built-in` path.
`Concise.md` SHALL have no `keep-coding-instructions` line.

#### Scenario: Deferred Tool

- **WHEN** a hook lab probe shows that `tool.describe` fires for `SendMessage`
- **THEN** claudetto replaces its text with a shorter one

#### Scenario: Unreached Surface

- **WHEN** a probe shows that a surface cannot be replaced
- **THEN** the audit records the surface and the reason

### Requirement: Behavior Kept

Each replacement SHALL keep each behavior line of the text that it replaces.
`research/text-audit.md` SHALL map each behavior line of the default to the line that carries it.

#### Scenario: Missing Line

- **WHEN** a behavior line of the default has no carrying line in the map
- **THEN** the audit test fails and names the behavior

### Requirement: Positive Framing

A text of claudetto SHALL say what to do and give the reason in one clause.
A lint test SHALL fail on a rule in the form `do not`, `never`, `NOT`, or `don't`, with an allow list for quoted text.

#### Scenario: Negative Rule

- **WHEN** a claudetto text holds "Do not wait for the agent"
- **THEN** the lint test fails and names the text

#### Scenario: Quoted Text

- **WHEN** a text quotes "do not" from a user message and the quote is on the allow list
- **THEN** the lint test passes

### Requirement: Shorter Than the Default

A size test SHALL fail when a replacement is longer than the default text of its capture.
`agents/main.md` SHALL stay below the default lean body of 5,627 characters, with the bound in `slices/prompt/limits.ts`.

#### Scenario: Longer Replacement

- **WHEN** a replacement of `Bash` text has more characters than the captured default
- **THEN** the size test fails and names the tool

#### Scenario: Main Body Grows

- **WHEN** `agents/main.md` passes 5,627 characters
- **THEN** the size test fails

### Requirement: One Rule per Case

Two texts in one request SHALL NOT give conflicting rules for one case, and a text SHALL NOT restate a rule that another text of the same request holds.

#### Scenario: Conflict

- **WHEN** `main.md` says "wait for the agent" and another text says "go on with independent work"
- **THEN** the audit test fails and names both texts

### Requirement: Research Fixes in the Pass

The same pass SHALL carry the content fixes of `research/failures.md` (failures 1 to 6) and the 10 fixes of `research/incidents.md`.

#### Scenario: Deferral Rule

- **WHEN** the audit runs on `main.md`
- **THEN** `main.md` tells Claude to fix each defect that it finds, also an older one

### Requirement: Run the Free Check

No surface SHALL let Claude report a claim as not verified when a free local check can verify it.
`Concise.md` SHALL tell Claude to run each free check before the report, and to name a claim as not verified only when its check needs a paid run, a login, a block, or the user, with that check.

#### Scenario: Free Check Runs

- **WHEN** a claim can be checked with a local command that makes no model call and needs no login
- **THEN** Claude runs the command before the report and gives its result, not a proposal to run it

#### Scenario: Paid Check Is Named

- **WHEN** the only check of a claim is a paid sandbox run
- **THEN** Claude names the claim as not verified, gives the run, and asks with its cost
