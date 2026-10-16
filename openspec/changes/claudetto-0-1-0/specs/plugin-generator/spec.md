# Spec Delta: `plugin-generator`

## Purpose

Builds the shipped `claudetto` plugins from a small hand-written source, so that the structure of each plugin comes from one place and a test catches drift.

## ADDED Requirements

### Requirement: Generated structure from one source

The build SHALL generate the manifests, `hooks.json`, the frontmatter, the settings profile, the validators, the doc tables, and each value that a test pins, from the source in `src/`.
The prose (prompts, skill bodies, hook logic) SHALL stay hand-written.

#### Scenario: A generated file differs from its source

- **WHEN** a file in `plugins/` differs from the output of the generator
- **THEN** the generated-files check fails and names the file

#### Scenario: A clean build

- **WHEN** the generator runs on an unchanged source
- **THEN** no file in `plugins/` changes

### Requirement: Prompt texts in files

Each text of a slice that goes to Claude or to the user SHALL be a `.md` or `.json` file in the `prompts/` folder of the slice, and the generator SHALL write the module `prompts.ts` from it.
A `{{name}}` part SHALL become a parameter of the export, and a `{{NAME}}` part SHALL get the value of a bound at generate time.
The parts of the prompt transforms SHALL stay in code, next to their anchors.

#### Scenario: A text with a parameter

- **WHEN** `prompts/deny-reason.md` holds `{{command}}`
- **THEN** `prompts.ts` exports `DENY_REASON` as a function of `command` that gives the text with the value in place

#### Scenario: A bound with no value

- **WHEN** a text names a `{{NAME}}` that no bound gives
- **THEN** the generator fails and names the source file

### Requirement: Committed outputs only

Each file that ships SHALL be committed.
The build SHALL NOT need a build input that git ignores, because an agent worktree does not get it.

#### Scenario: Build in a new worktree

- **WHEN** the generated-files check runs in a new linked worktree with no ignored files
- **THEN** the check passes with the same result as in the main worktree

### Requirement: Decision ladder for each feature

Each feature SHALL use the first extension point that can do its work, in this order: the Mod API, a classic hook, a built-in part of Claude Code, and then no feature.
The design of each feature SHALL record which step it uses and why a higher step cannot do the work.

#### Scenario: A feature uses a classic hook

- **WHEN** a feature uses a classic hook in place of a mod hook
- **THEN** the design records the Mod API gap that makes the hook necessary

### Requirement: No change to the Claude Code binary

No part of `claudetto` SHALL patch, replace, or wrap the Claude Code binary or its npm package.
`claudetto` SHALL use only documented or observed extension points.

#### Scenario: A feature needs a missing extension point

- **WHEN** no extension point can do the work of a feature
- **THEN** the feature is not built, and the design records the gap

### Requirement: Independent add-on plugins

Each add-on plugin SHALL work without the core plugin, and no plugin SHALL import code from another plugin.
Shared code SHALL come from the kernel, and the generator SHALL copy it into each plugin that uses it.

#### Scenario: An add-on alone

- **WHEN** an add-on plugin loads in a config with no other `claudetto` plugin
- **THEN** each of its hooks, skills, and commands works

#### Scenario: A cross-plugin import

- **WHEN** a source file of one plugin imports a file of another plugin
- **THEN** the validation fails and names the import

### Requirement: Pinned Claude Code version

`claudetto` SHALL be built for Claude Code 2.1.302 or later (the user, 2026-10-15).
The docs SHALL state this version, CI SHALL install it, and the files of `schemas/` SHALL come from its bundle.
The code SHALL have no check of the Claude Code version at run time, and no part for an older version.

#### Scenario: The version is in the docs and in CI

- **WHEN** a reader opens the `claudetto` overview page, or CI installs Claude Code
- **THEN** the page states 2.1.302 or later, and CI installs 2.1.302

### Requirement: Bounds in one place

Each shared runtime bound SHALL be in the kernel budget file, each slice bound in the `limits` file of its slice, and each repository bound in `tools/limits.ts`.
A test SHALL pin each copy of a bound in code and config.

#### Scenario: A bound outside its file

- **WHEN** a numeric bound is defined in a file that is not its `limits` file
- **THEN** the validation fails and names the file and the line
