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

### Requirement: Base without Mods

When mod hooks do not load, the main agent and the settings levers SHALL still apply.

#### Scenario: Mods Off

- **WHEN** a stub probe captures the first main request with the mods turned off
- **THEN** the request has the body of `claudetto:main`

### Requirement: Plan Line

The `prompt.context` block SHALL give one line with the plan of the login, from the plan keys of `oauthAccount` in `~/.claude.json`.
On a subscription, the line SHALL tell Claude to speak of usage as a share of the plan limits, not as dollars.
With no known plan, the block SHALL give no plan line.

#### Scenario: Max 20x

- **WHEN** `oauthAccount.organizationRateLimitTier` is `default_claude_max_20x`
- **THEN** the context of the first request says that the login is a Max 20x subscription

#### Scenario: API Key

- **WHEN** the session runs with an API key and no `oauthAccount`
- **THEN** the context has no plan line

#### Scenario: No Identity

- **WHEN** the plan line is built
- **THEN** it holds no email, name, or UUID

### Requirement: Repository Facts

The `prompt.context` block SHALL give the branch, the latest tag, the open `openspec` changes, the shell, and the `grep` engine of the session, built by code with no model call, in at most one line each.

#### Scenario: Release in Progress

- **WHEN** the branch is `main`, the latest tag is `claudetto--v0.3.0-alpha.1`, and the change `release-0-3-0-alpha-2` is open
- **THEN** the context of the first request names all three

### Requirement: Fresh Session Size

A fresh session in this repository, with the settings that setup writes, SHALL show 10k tokens or fewer in `/context` on Claude Code 2.1.309 with `claude-opus-5-5`.
The release run of `/context` SHALL be the one check of the total size of the first request, and no test SHALL bound that total, because only the release run checks the size (the user, 2026-10-23).
The size tests of the requirement "Shorter Than the Default" of spec `text-surfaces` stay (the user, 2026-10-23).

#### Scenario: Fresh Session

- **WHEN** `just sandbox` starts a session in this repository and runs `/context` as its first prompt
- **THEN** the total is 10k tokens or fewer, and the evidence file records each category
