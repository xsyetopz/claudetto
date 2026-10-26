## MODIFIED Requirements

### Requirement: Snippet from the Matrix

The snippet SHALL write the `Lever` of each row of `research/replace-matrix.md` with the decision `disable` or `replace and disable`, and SHALL write no key that no row and no decision of `design.md` names.
The decisions of change `release-0-3-0-alpha-2` count as decisions of `design.md`.

#### Scenario: Extra Key

- **WHEN** a change adds a key to the snippet that no row of the matrix and no decision names
- **THEN** a test fails and names the key

## ADDED Requirements

### Requirement: Deny Rules Match Only Their Target

Each `Bash` deny rule of the snippet SHALL match only the command that its reason names.
No deny rule SHALL match a delete in the temp folder or in a folder under the home folder.

#### Scenario: Temp Delete

- **WHEN** a test matches each `Bash` deny rule of the snippet with the rule syntax of Claude Code against `rm -rf /tmp/x` and `rm -rf ~/proj/build`
- **THEN** no rule matches

#### Scenario: Root Delete

- **WHEN** the same test matches the rules against `rm -rf /`
- **THEN** a rule matches

### Requirement: Off Switches of Unused Parts

The snippet SHALL set `syncClaudeAiSkills` and `syncClaudeAiPlugins` to `false`, `ENABLE_CLAUDEAI_MCP_SERVERS` to `false`, `enabledPlugins["cc-plugin-you-should-know@builtin"]` to `false`, and `idleCompaction` to `false`.
It SHALL NOT set `IS_DEMO`.

#### Scenario: Away from the Terminal

- **WHEN** the user is away for 2 hours with a context of 210k tokens
- **THEN** no compaction runs until the user comes back

#### Scenario: Fresh Install

- **WHEN** setup writes the snippet into an empty settings file
- **THEN** the file has the four off switches above and no `IS_DEMO`

#### Scenario: Skills Listing

- **WHEN** a fresh session starts with these settings on a claude.ai login
- **THEN** the skill listing has no `anthropic-skills:` skill

### Requirement: Effort and Window Caps

The snippet SHALL set `modelSettings` with `maxEffortLevel` `high` for Opus 5.5 and `medium` for Sonnet 5.5, and an `autoCompactWindow` of about 132k for Haiku 5.5.
It SHALL keep `autoCompactWindow` 300k with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `CLAUDE_CODE_PROMPT_CACHE_TTL` `1h`, `CLAUDE_CODE_FORK_SUBAGENT=0`, and `CLAUDE_CODE_DISABLE_FAST_MODE=1`.
No agent SHALL get `maxTurns`.

#### Scenario: Sonnet Cap

- **WHEN** setup writes the snippet
- **THEN** `modelSettings` caps Sonnet 5.5 at `medium`

#### Scenario: Cap Not Enforced on Agents

- **WHEN** the hook lab probe shows that `maxEffortLevel` does not cap the `effort` of an agent file
- **THEN** a roster test holds the caps

### Requirement: Built-In Agents Off

The snippet SHALL deny the built-in agents `claude`, `claude-code-guide`, and `general-purpose`, set `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` to `1`, and set `disableAgentView` to `true`, so only the claudetto roster stays (design D21).

#### Scenario: Agent Deny

- **WHEN** setup writes the snippet
- **THEN** the deny rules name `claude`, `claude-code-guide`, and `general-purpose`, `env` has `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` `1`, and `disableAgentView` is `true`

### Requirement: MCP Description Bound

The snippet SHALL set `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` to a value from `kernel/budget.ts`.

#### Scenario: Bound Value

- **WHEN** setup writes the snippet
- **THEN** the env var equals the bound in `kernel/budget.ts`

### Requirement: Tools Needed by Monitor

The snippet SHALL write no deny rule for `TaskStop`, `Bash(rm -rf /*)`, or `Bash(rm -rf ~/*)`.

#### Scenario: Monitor Stop

- **WHEN** Claude stops a `Monitor` with `TaskStop` in a session with the snippet
- **THEN** the call runs with no deny
