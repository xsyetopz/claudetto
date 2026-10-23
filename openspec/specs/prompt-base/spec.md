# prompt-base Specification

## Purpose
claudetto sends the model the least text that keeps each rule that the model needs, through the main agent `claudetto:main` and its mods.

## Requirements

### Requirement: Main Agent

The plugin `settings.json` SHALL set `agent` to `claudetto:main`, and each line of its body SHALL map to a fault of `.claudetto/0.3.0-findings.md` or to a test (design D9).

#### Scenario: Default Body Gone

- **WHEN** a stub probe captures the first main request of a session with claudetto
- **THEN** `system[2]` is the body of `claudetto:main`, and it has no `# Harness` and no `# Memory` section

### Requirement: Attachments

A `prompt.context` block SHALL give the shell facts of design D9, because the environment text is the system section `env_info_simple` and not an attachment.
A `prompt.attachment` hook SHALL drop each attachment kind that no rule of the plan needs.
It SHALL pass each other kind unchanged.

#### Scenario: Shell Facts

- **WHEN** a stub probe captures a request on macOS with zsh
- **THEN** the context of the request says that macOS has no `timeout` and that zsh fails on a glob with no match

### Requirement: Tool Texts

A `tool.describe` hook SHALL give each kept built-in tool an ASD-STE100 text that keeps each rule of the default text that the model needs, and SHALL set `isDeferred: true` for each tool that the plan marks as seldom used.
It SHALL NOT defer `ToolSearch`.

#### Scenario: Rule Kept

- **WHEN** a test compares the default text of `Bash` with the claudetto text
- **THEN** each rule that the plan lists for `Bash` is in the claudetto text

### Requirement: Request Size Only Shrinks

A test SHALL pin the size of each part of the first main request that claudetto writes (the body of `claudetto:main`, the tool texts, and the context blocks) at the value that the first version measures after its rewrite pass.
A stub capture SHALL record the size of the whole request in the evidence file.
A change that raises the size SHALL fail the test, unless it adds a behavior that the plan names.

#### Scenario: Text Grows

- **WHEN** a change adds text to the body of `claudetto:main` and adds no named behavior
- **THEN** `just check` fails and names the pinned size

### Requirement: Base without Mods

When mod hooks do not load, the main agent and the settings levers SHALL still apply, and the body of `claudetto:main` SHALL be at most its pinned size.
The size of the probe `mainfloor` in `research/probes.md` is no bar, because its agent body has 65 characters and the body of D9 has more than 9,000 (the user, 2026-10-22: "Cut repeats, pin").

#### Scenario: Mods Off

- **WHEN** a stub probe captures the first main request with the mods turned off
- **THEN** the request has the body of `claudetto:main`, and the body is at most its pinned size
