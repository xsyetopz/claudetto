## ADDED Requirements

### Requirement: Tool Text Answers

A `tool.describe` hook SHALL give each kept built-in tool a shorter ASD-STE100 text, and SHALL set `isDeferred: true` for each tool that the plan marks as seldom used.
It SHALL NOT defer `ToolSearch`.

#### Scenario: Kept Tool

- **WHEN** the hook lab test sends the built-in text of `Bash`, `Edit`, `Read`, `ToolSearch`, or `Write` to `tool.describe`
- **THEN** the answer has a shorter text and no `isDeferred`

#### Scenario: Seldom-Used Tool

- **WHEN** the hook lab test sends `Workflow` to `tool.describe`
- **THEN** the answer has `isDeferred: true`

### Requirement: Model Line

A `models` block of `prompt.context` SHALL name the model IDs for code that calls a Claude model.
It SHALL name `claude-mythos-5-1` in place of `claude-fable-5-1` only when the newest slot of `clientDataCacheSlots` in `.claude.json` has `cedar_lagoon["claude-mythos"]: true`, and it SHALL read nothing else of that file (the user, 2026-10-26).
A missing file, slot, or key SHALL count as no access.

#### Scenario: Login with Mythos

- **WHEN** the hook lab test gives a `.claude.json` whose newest slot has `cedar_lagoon["claude-mythos"]: true`
- **THEN** the `models` block names `claude-mythos-5-1` and not `claude-fable-5-1`

#### Scenario: No Access

- **WHEN** the hook lab test gives no readable `.claude.json`
- **THEN** the `models` block names `claude-fable-5-1` and no Mythos model

## MODIFIED Requirements

### Requirement: Main Agent

The plugin `settings.json` SHALL set `agent` to `claudetto:main`.
The body of `main.md` SHALL come from the system prompt sections of the supported Claude Code version, trimmed and reworded, and each XML tag SHALL name its topic in plain words, because a descriptive tag tells the model what the part is for, and an internal section id such as `delivering_work_max` does not (the user, 2026-10-26).
Each line SHALL work in the TUI and in `claude -p`, and each line SHALL map to a section, to a fault of `.claude/claudetto/0.3.0-findings.md`, or to a test.

#### Scenario: Default Body Gone

- **WHEN** a stub probe captures the first main request of a session with claudetto
- **THEN** `system[2]` is the body of `claudetto:main`, and it has no `# Harness` and no `# Memory` section

#### Scenario: No Dialog in Headless Mode

- **WHEN** a stub probe captures the first main request of `claude -p` with claudetto, and the request has no `AskUserQuestion` tool
- **THEN** the body tells the model to decide, to state the assumption, and to stop only before an action with no undo

## REMOVED Requirements

### Requirement: Tool Texts

**Reason**: Its scenario "Rule Kept" was a test of the wording of each tool text. The rule of `.claude/rules/tests.md` deletes a test of prose (the user, 2026-10-26).
**Migration**: The requirement "Tool Text Answers" keeps the size and the deferral, with hook lab checks.
