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

### Requirement: Worktree hooks

The plugin SHALL have a `WorktreeCreate` hook and a `WorktreeRemove` hook.
The create hook SHALL make the worktree from `HEAD` and SHALL copy the ignored files that `.worktreeinclude` names, because a `WorktreeCreate` hook replaces the copy of Claude Code.
The remove hook SHALL remove a worktree only when `git status --ignored` shows no file that a session made.
The `.worktreeinclude` of this repository SHALL name the generated Claude Code types.

#### Scenario: Create

- **WHEN** an agent starts in a new worktree
- **THEN** the worktree is at `HEAD`, holds the files of `.worktreeinclude`, and the hook prints its path

#### Scenario: Remove with work in it

- **WHEN** a session made a file in the worktree and the worktree is removed
- **THEN** the worktree stays and the hook names the file

### Requirement: Sandbox can install and sign

The sandbox entries SHALL let a package install write its cache, and SHALL let a commit sign with the SSH key of the user.

#### Scenario: `bun install` in the sandbox

- **WHEN** Claude runs `bun install` in the sandbox
- **THEN** the install succeeds with no `EPERM`

#### Scenario: A signed commit in the sandbox

- **WHEN** Claude runs `git commit` in the sandbox with SSH signing on, and the ssh-agent holds the key
- **THEN** the commit is signed
- **AND** `sandbox.filesystem.allowRead` names only the public key file (a private key path in `user.signingkey` gives its `.pub` sibling), and `sandbox.network.allowUnixSockets` names the folder of `SSH_AUTH_SOCK`

#### Scenario: Agent socket of an earlier boot

- **WHEN** `sandbox.network.allowUnixSockets` names a launchd agent folder that is not the folder of `SSH_AUTH_SOCK`
- **THEN** the drift notice names the folder and gives `/claudetto:setup` as the fix

### Requirement: Starter rules for CLAUDE.md

The setup SHALL merge a managed block of working rules into the `CLAUDE.md` file of the scope the user picks.
The block SHALL sit between `<!-- claudetto:begin -->` and `<!-- claudetto:end -->`.
The command SHALL write only with `--apply`.

#### Scenario: Create

- **WHEN** the file does not exist and the user applies
- **THEN** the file holds the block

#### Scenario: Update only the block

- **WHEN** the file has the markers and the block differs
- **THEN** only the text between the markers changes
- **AND** each byte outside the markers stays

#### Scenario: Broken markers

- **WHEN** the file has a begin marker with no end marker, an end marker with no begin marker, the end before the begin, or a repeated marker
- **THEN** the command exits with an error and the file stays as it is

#### Scenario: Add-on sections

- **WHEN** `claudetto-codegraph`, `claudetto-docs`, or `claudetto-browser` is installed and not turned off
- **THEN** the block holds the section of that add-on
- **AND** an add-on that is not installed has no section

### Requirement: Option values

An option that needs a value SHALL be an error when the value is missing.

#### Scenario: `--scope` with no value

- **WHEN** the command runs with `--scope` as the last argument or before another option
- **THEN** it exits with status 2 and writes no file

### Requirement: Runtime paths are git-excluded

Each runtime path of `claudetto` and of Claude Code worktrees SHALL be in `.git/info/exclude` after session start.
A path with non-ASCII characters SHALL match.

#### Scenario: Worktree folder

- **WHEN** a session starts in a repository, even a path with non-ASCII characters
- **THEN** `git status` does not list `.claude/worktrees/`

### Requirement: Drift notice

At session start, the setup SHALL compare the settings with the profile and the tested Claude Code version, and SHALL give one short notice when they differ.
A `git` failure SHALL show as an error, not as "no files".

#### Scenario: Drift

- **WHEN** a profile entry is missing from the settings
- **THEN** the user sees one notice that names the setup command

#### Scenario: An env key with no effect

- **WHEN** the settings set `BASH_OUTPUT_MAX_CHARS`, or `CLAUDE_CODE_MAX_CONTEXT_TOKENS` with no `DISABLE_COMPACT`
- **THEN** the notice names the key and the setting or env var that does the work

### Requirement: Say when git is too old for the hooks

`claudetto-setup settings` SHALL run `git --version`.
When git is older than 2.54 or is missing, it SHALL name the checks that do not run (the `commit-msg` and `pre-push` checks) and the checks that still work.

#### Scenario: Git 2.53

- **WHEN** `git --version` prints `git version 2.53.0`
- **THEN** the output names both hooks as not running

#### Scenario: Git from Apple

- **WHEN** `git --version` prints `git version 2.54.0 (Apple Git-157)`
- **THEN** the output has no note

### Requirement: Hard stop for an external checkout

`claudetto-setup sandbox` SHALL act only in a checkout of a repository that the user does not own and whose verdict is not `allowed` or `conditions`.
It SHALL merge the hard stop (`sandbox.enabled`, `allowUnsandboxedCommands: false`, `failIfUnavailable`, and the deny of `github.com`) into `.claude/settings.local.json`, and keep each other key.
It SHALL write nothing when the platform has no sandbox or a program or the seccomp filter of the sandbox is missing.

#### Scenario: A checkout of the user

- **WHEN** the user runs `claudetto-setup sandbox --apply` in a checkout of a repository that the user owns
- **THEN** no file changes and the output tells why

#### Scenario: A second run

- **WHEN** the hard stop is already in the settings
- **THEN** a second run changes nothing

#### Scenario: A missing sandbox program

- **WHEN** the user runs `claudetto-setup sandbox --apply` on Linux, and `bwrap` or `socat` is not on `PATH`
- **THEN** no file changes, and the output names each missing program and the install command for the package manager that it finds

#### Scenario: A blocked sandbox program

- **WHEN** the user runs `claudetto-setup sandbox --apply` on Linux, and a test run of `bwrap` fails
- **THEN** no file changes, and the output gives the error of the run
- **AND** the run uses `sandbox.bwrapPath` when a settings file sets it, and the resolved path of that `bwrap`
- **AND** with the sysctl `kernel.apparmor_restrict_unprivileged_userns` at 1, the output gives the AppArmor profile for that path

#### Scenario: A missing seccomp filter

- **WHEN** the user runs `claudetto-setup sandbox --apply` on Linux or WSL2, and the engine finds no `apply-seccomp` helper
- **THEN** no file changes, and the output names the filter and gives `npm install -g @anthropic-ai/sandbox-runtime`

#### Scenario: The filter turned off

- **WHEN** a settings file sets `sandbox.network.allowAllUnixSockets` to `true`
- **THEN** no file changes, and the output names that file

#### Scenario: A platform with no sandbox

- **WHEN** the user runs `claudetto-setup sandbox --apply` on native Windows or WSL1
- **THEN** no file changes and the output tells why

#### Scenario: Remove

- **WHEN** the user runs `claudetto-setup sandbox --remove --apply`
- **THEN** only the changes in `.claudetto/sandbox-stop.json` go, and each old value comes back
