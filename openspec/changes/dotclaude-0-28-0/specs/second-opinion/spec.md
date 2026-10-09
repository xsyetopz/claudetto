# Spec Delta

## Purpose

Defines the second-opinion tool of the `dotclaude-jev` add-on, with Jev and its fallback, and the browser skill of the `dotclaude-browser` add-on.
Each add-on works without the core plugin and imports nothing from it (design D24).

## ADDED Requirements

### Requirement: Second-opinion tool

The hooks module of `dotclaude-jev` SHALL register one custom tool that Claude consults before almost every decision (decision of the user: Jev is the consultant).
When `TYPESAFE_API_KEY` is set, the tool SHALL be loaded, because Claude calls it for most decisions and a deferred tool costs a `ToolSearch` call first.
When the key is not set, the tool SHALL be deferred, and its description SHALL limit it to decisions that are hard to undo.
The tool description SHALL hold the rules of the old session note: facts decide, and the user decides goals, preferences, and approvals.

#### Scenario: Start cost with the key

- **WHEN** a session starts with the snippet applied and the key set
- **THEN** the request has the tool loaded, and no second-opinion skill line and no second-opinion session note

#### Scenario: Start cost without the key

- **WHEN** a session starts with the snippet applied and no key
- **THEN** the request has the tool name in the deferred list only

#### Scenario: Add-on not installed

- **WHEN** `dotclaude-jev` is not installed
- **THEN** the request has no second-opinion tool and no Jev text, and `dotclaude` works as before

### Requirement: Neutral questions

Claude SHALL NOT skew a question to Jev toward its own preference.
The tool description SHALL tell Claude to give the decision, every option, and for each option at least one fact for it and one fact against it.
It SHALL tell Claude to give no preferred answer and no leading words, and to leave out a lean or a preference of the user, the notes, or the team, because Jev judges the facts only.
The tool handler SHALL put the options in a random order before it sends the question, so that the order carries no preference.

#### Scenario: Description

- **WHEN** a test reads the tool description
- **THEN** it has the neutral-question rule

#### Scenario: Option order

- **WHEN** the tool sends a question with options A, B, and C many times
- **THEN** each option comes first in some of the sent questions

#### Scenario: Eval

- **WHEN** an eval case gives Claude a reason to prefer one option
- **THEN** the grader finds no stated preference, no one-sided evidence, and no lean of the user, the notes, or the team that the question passes on

### Requirement: Jev with a key

When `TYPESAFE_API_KEY` is set, the tool SHALL ask Jev and give its pick and its confidence.
The tool SHALL call the Jev client as a child process through `$.process.run`, because the client uses `node:` modules.

#### Scenario: Key set

- **WHEN** the tool runs with the key set and Jev answers
- **THEN** the result has the Jev pick and its confidence

### Requirement: Reviewer fallback

When `TYPESAFE_API_KEY` is not set, or Jev fails, the tool SHALL give a reviewer check on Haiku 5.5.
The check SHALL run on Haiku 5.5.
The check SHALL use `$.model.complete` when a probe shows that it works from a tool handler.
Otherwise the tool result SHALL tell the model to start the `reviewer` agent of `dotclaude` when it is installed, which runs on the model of its definition (Opus 5.5, design D25), else to answer from its own check.
The result SHALL say which route and which model answered.

#### Scenario: No key

- **WHEN** the tool runs with no key
- **THEN** the result comes from the reviewer check and names it, and the session does not stop

#### Scenario: Jev fails

- **WHEN** Jev returns an error or times out
- **THEN** the tool gives the reviewer check and names the Jev failure once

### Requirement: Question pick only with a key

The `AskUserQuestion` hook of Jev SHALL run only when `TYPESAFE_API_KEY` is set, and SHALL leave the question unchanged when Jev fails.

#### Scenario: No key

- **WHEN** Claude calls `AskUserQuestion` with no key
- **THEN** the question reaches the user unchanged

### Requirement: Browser skill in its own add-on

The browser skill SHALL be the part of `dotclaude-browser`, with a listing description of 100 characters or fewer, or a custom tool when that form costs fewer tokens with no eval loss.

#### Scenario: Listing

- **WHEN** a test reads the browser skill
- **THEN** its description has 100 characters or fewer

#### Scenario: Add-on not installed

- **WHEN** `dotclaude-browser` is not installed
- **THEN** the request has no browser skill line

### Requirement: Browser replaces web search

When `dotclaude-browser` is installed, a web search of the model SHALL run through its headless browser, not through the built-in `WebSearch` (design D24).

#### Scenario: Web search with the add-on

- **WHEN** `dotclaude-browser` is installed and the model calls `WebSearch`
- **THEN** the result comes from the headless browser, or the call is denied with a reason that names the browser skill

#### Scenario: Web search without the add-on

- **WHEN** `dotclaude-browser` is not installed
- **THEN** `WebSearch` works as in vanilla Claude Code
