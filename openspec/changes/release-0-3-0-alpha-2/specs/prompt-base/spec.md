## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Base without Mods

When mod hooks do not load, the main agent and the settings levers SHALL still apply.

#### Scenario: Mods Off

- **WHEN** a stub probe captures the first main request with the mods turned off
- **THEN** the request has the body of `claudetto:main`

## REMOVED Requirements

### Requirement: Request Size Only Shrinks

**Reason**: A snapshot cap of each part is a style goal, not a behavior, so no custom lint gates it, because such a lint checks no behavior (the user, 2026-10-23).
**Migration**: The requirement "Fresh Session Size" bounds the first request by the 10k-token goal of release gate G2.
