# Spec Delta: `settings-setup`

## Purpose

Writes the settings that a plugin cannot ship, keeps the runtime paths out of git, and tells the user when the settings drift from the profile.

## ADDED Requirements

### Requirement: Settings that a plugin cannot ship

The setup command SHALL write the `env`, `permissions`, `autoMode`, `worktree`, and `sandbox` entries of the profile to a settings file that the user picks, because a plugin `settings` block applies only `agent` and `subagentStatusLine`.

#### Scenario: Apply the profile

- **WHEN** the user runs the setup command with the apply option
- **THEN** the chosen settings file holds the profile entries, and each other entry is unchanged

### Requirement: Check before a write

The setup command SHALL show the difference first, and SHALL write nothing, not even the git excludes, until each check of the call passes.

#### Scenario: A bad option

- **WHEN** the user runs the apply option with an option that the command does not know
- **THEN** the command fails and writes no file

#### Scenario: A `null` settings file

- **WHEN** the settings file holds `null`
- **THEN** the difference shows each profile entry as new

### Requirement: Built-in entries stay

An `autoMode` list that the profile writes SHALL keep the built-in entries with `$defaults`.

#### Scenario: `autoMode` soft deny

- **WHEN** the profile adds one `soft_deny` entry
- **THEN** the written list holds `$defaults` and the new entry

### Requirement: Worktrees start from `HEAD`

The profile SHALL set `worktree.baseRef` so that an agent worktree starts from the current `HEAD`.

#### Scenario: An agent worktree

- **WHEN** an agent starts in a new worktree on a branch with local commits
- **THEN** the worktree holds those commits

### Requirement: Sandbox can install and sign

The sandbox entries SHALL let a package install write its cache, and SHALL let a commit sign with the SSH key of the user.

#### Scenario: `bun install` in the sandbox

- **WHEN** Claude runs `bun install` in the sandbox
- **THEN** the install succeeds with no `EPERM`

#### Scenario: A signed commit in the sandbox

- **WHEN** Claude runs `git commit` in the sandbox with SSH signing on
- **THEN** the commit is signed

### Requirement: Runtime paths are git-excluded

Each runtime path of `claudetto` and of Claude Code worktrees SHALL be in `.git/info/exclude` after session start.
A path with non-ASCII characters SHALL match.

#### Scenario: Worktree folder

- **WHEN** a session starts in a repository
- **THEN** `git status` does not list `.claude/worktrees/`

### Requirement: Drift notice

At session start, the setup SHALL compare the settings with the profile and the tested Claude Code version, and SHALL give one short notice when they differ.
A `git` failure SHALL show as an error, not as "no files".

#### Scenario: Drift

- **WHEN** a profile entry is missing from the settings
- **THEN** the user sees one notice that names the setup command
