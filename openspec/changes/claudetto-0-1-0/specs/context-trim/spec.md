# Spec Delta: `context-trim`

## Purpose

Turns off the built-in parts that use context and give little value, and makes the descriptions of the built-in tools shorter, so that each request carries less text.

## ADDED Requirements

### Requirement: Each switch is checked

Each env var or setting that the trim sets SHALL have a check against Claude Code 2.1.300 that shows its effect.
A switch with no effect SHALL NOT ship.

#### Scenario: A switch with no effect

- **WHEN** a switch shows no change in the request in its check
- **THEN** the switch is removed from the profile

#### Scenario: A switch not in the docs

- **WHEN** a switch is not in the Claude Code docs
- **THEN** its entry cites the line of the bundle that reads it

### Requirement: Switches do what they say

The trim SHALL NOT use a switch that keeps the part it says it turns off.

#### Scenario: Chrome tools

- **WHEN** the trim turns off the Chrome part
- **THEN** the Chrome tools are not in the tool list, and the trim does not rely on `CLAUDE_CODE_DISABLE_CFC_PROMPT` alone

### Requirement: Shorter tool descriptions

The trim SHALL give shorter or deferred descriptions of the built-in tools.
A description SHALL NOT state a fact that Claude Code computes for each run.

#### Scenario: A computed fact

- **WHEN** a tool description holds a value that Claude Code computes for each run
- **THEN** the trim keeps the text of Claude Code for that value

### Requirement: Drop of built-in agent types

The trim SHALL drop the built-in agent types that a `claudetto` role agent replaces, because a plugin agent cannot replace a built-in agent by name.

#### Scenario: Agent list

- **WHEN** a session starts with the core plugin
- **THEN** the agent listing has no dropped built-in type

### Requirement: `Glob` and `Grep` stay available

The trim SHALL keep the `Glob` and `Grep` tools available on the native build, through the CLI tool list.

#### Scenario: Native build

- **WHEN** a session starts on the native build with `claudetto`
- **THEN** the `init` event lists `Glob` and `Grep`
