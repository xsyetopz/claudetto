## MODIFIED Requirements

### Requirement: Agents Inherit the Tier

Setup SHALL write `CLAUDE_CODE_SUBAGENT_MODEL` as `claude-sonnet-5-5` in the "Models and windows" group. An agent file that names no `model:` line SHALL run on it; each claudetto agent, `Artemis`, `Metis`, `Athena`, and `Heracles`, names its own. The order of choice is the per-call `model`, then the agent field, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model (`clawdipedia` route `extend/subagents/frontmatter`, row `model`, checked 2026-10-27).

#### Scenario: Subagent Model

- **WHEN** a plugin agent with no `model:` line starts with no model passed in the call
- **THEN** it runs on `claude-sonnet-5-5`
