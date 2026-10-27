## ADDED Requirements

### Requirement: Positive Form

A text of claudetto that a model reads SHALL say what to do and give the reason, instead of what not to do (the user, 2026-10-26).
It covers each surface of "Surfaces Covered", each skill and agent body, `.claude/rules/`, and `AGENTS.md`, with explicit and soft negatives.
A hard limit with no positive form, and a quoted user rule, SHALL stay as they are.

#### Scenario: Negative Rule

- **WHEN** an agent body holds "Do not wait for the agent"
- **THEN** the rewrite says what to do instead, such as "Go on with independent work while the agent runs"

#### Scenario: Soft Negative

- **WHEN** `Concise.md` holds "End with no offer and no recap"
- **THEN** the rewrite says what to do, such as "End on what is next, because the user has read the reply"

#### Scenario: Hard Limit

- **WHEN** `AGENTS.md` says to never patch the Claude Code binary, because a patch violates the terms of service
- **THEN** the line keeps its negative form and its reason

#### Scenario: Quoted Rule

- **WHEN** a handoff quotes the user rule "Don't edit `a.ts`."
- **THEN** the handoff holds the rule word for word

### Requirement: Briefs in Positive Form

`output-styles/Concise.md` and `agents/main.md` SHALL tell Claude to write each text for a model, such as a subagent brief, a skill, or a prompt, as what to do with its reason (the user, 2026-10-26).

#### Scenario: Subagent Brief

- **WHEN** Claude writes the brief of a `Worker` with the active style `Concise`
- **THEN** each limit of the brief says what to do, such as "Edit only `src/`", with its reason
