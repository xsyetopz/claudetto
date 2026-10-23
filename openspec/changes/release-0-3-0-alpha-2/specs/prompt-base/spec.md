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
Each text that claudetto adds to the first request SHALL have a size bound in `slices/prompt/limits.ts`, and a test SHALL pin it.

#### Scenario: Fresh Session

- **WHEN** `just sandbox` starts a session in this repository and runs `/context` as its first prompt
- **THEN** the total is 10k tokens or fewer, and the evidence file records each category

#### Scenario: Text Grows

- **WHEN** a change makes the body of `claudetto:main` larger than its bound
- **THEN** a test fails and names the bound
