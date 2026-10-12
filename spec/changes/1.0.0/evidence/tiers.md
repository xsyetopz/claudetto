# Evidence: account tiers in Claude Code 2.1.296

## Status

Two investigator runs read `external/cc-2.1.296/strings.txt` on 2026-10-12.
Each line number refers to that file.
A claim is `confirmed` when a run saw it in the code, and `inferred` when a run read it from the context.
The user decided that the setup scales from Pro as the baseline (`change.md`, decisions).

## How Claude Code finds the tier

- `Sr()` returns `subscriptionType`: `max`, `pro`, `team`, `enterprise`, or null (L320127, confirmed).
- `jA()` returns the rate limit tier, such as `default_claude_max_5x` and `default_claude_max_20x` (L320127, confirmed).
- `V2e` maps `max` by `jA()` to `max_5x` or `max_20x` (L340168, confirmed).
- The env vars `CLAUDE_CODE_SUBSCRIPTION_TYPE` and `CLAUDE_CODE_RATE_LIMIT_TIER` override the stored values (L243430-243431, confirmed).
- The credentials are in `~/.claude/.credentials.json`, or in the keychain on macOS (L319702, L320127, confirmed).
- With an API key (`ANTHROPIC_API_KEY`, `apiKeyHelper`), `Sr()` and `jA()` return null, so no tier shows (L320126, inferred).
- The status line input has no tier field (L327924, confirmed).
- No mod `$.` method gives the tier (`.claude-plugin/types/claude-code/index.d.ts`, confirmed).
  `$.session.authorize()` gives only `kind: 'bearer' | 'api-key'`, and `$.session.usage().rateLimits` is empty off a subscription.
- `claude auth status --json` gives `authMethod`, `apiProvider`, and `subscriptionType` (here `claude.ai`, `firstParty`, and `max`), but not the rate limit tier, so it does not tell Max 5x from Max 20x (run on 2026-10-12, confirmed).

## What Claude Code already scales by tier

- The plan mode agent count: 3 for `max` with `default_claude_max_20x`, 3 for `team` or `enterprise`, and 1 for each other tier.
  `CLAUDE_CODE_PLAN_V2_AGENT_COUNT` (1 to 10) overrides it (L329115, confirmed).
- The usage warning thresholds: 0.99 for `default_claude_max_5x`, 0.9975 for `default_claude_max_20x`, and 0.95 for each other tier (L322634, confirmed).
- `Cw` and `lv` gate features on `max` or `pro` (L322625, L324803, confirmed, features not read).

## Default model

- `Iv()` picks the default of the main session (L320099, confirmed).
  A `max` subscriber gets the Opus default, and `pro`, `team`, and `enterprise` get it unless `Ev()` applies.
  A subscriber with no type gets the Sonnet default.
- The API key case goes through `qd()`, which no run read (open).

## Models

| Name | Id | Line |
| --- | --- | --- |
| Fable 5.1 | `claude-fable-5-1` | L126126 |
| Mythos 5.1 | `claude-mythos-5-1` | L227588 |
| Opus 5.5 | `claude-opus-5-5` | L158722 |
| Sonnet 5.5 | `claude-sonnet-5-5` | L163712 |
| Haiku 5.5 | `claude-haiku-5-5` | L163713 |

- The aliases are `sonnet`, `opus`, `haiku`, `fable`, `best`, and `opusplan`, each with a `[1m]` form (L318911, confirmed).
  Mythos has no alias (inferred).
- `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL` come first, then the alias table, then a built-in fallback (L320099, confirmed).

## Settings that can scale

- `effortLevel` is the stored effort (L262309, confirmed).
- `maxEffortLevel` caps each effort, and `modelSettings.<model>.maxEffortLevel` replaces it for one model (L262310-262312, confirmed).
- `CLAUDE_CODE_DISABLE_1M_CONTEXT` turns off the `[1m]` forms (L320099, confirmed).
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS` applies only with `DISABLE_COMPACT` (L320099, confirmed).
- `effortLevel` in the settings takes `low`, `medium`, `high`, or `xhigh` (L319438, L322403, confirmed).
  The full effort list is `low`, `medium`, `high`, `xhigh`, and `max` (L319433, confirmed).
- The agent front matter key `effort` takes one of the 5 effort values or a positive integer, `model` takes an alias, a full model id, or `inherit`, and `maxTurns` takes a positive integer (L319232, confirmed).
  With no `model`, an agent uses the configured default subagent model, else the main model.
- The agent front matter keys are `name`, `description`, `prompt`, `tools`, `disallowedTools`, `model`, `effort`, `permissionMode`, `mcpServers`, `hooks`, `maxTurns`, `autoCompactWindow`, `skills`, `initialPrompt`, `memory`, `background`, `omitClaudeMd`, and `isolation` (L322283, confirmed).
- `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` defaults to 10 (L332609, confirmed).
- `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` exists (L260959, L319434, L336251), and its default is not read.
- `fastMode` is a boolean, next to `fastModePerSessionOptIn` (L319438, confirmed).
- `CLAUDE_CODE_SUBAGENT_MODEL` and `CLAUDE_CODE_MAX_TURNS` exist (L212058, L265174, L318868), and their values are not read.

## Open

- The default model of an API key, and the condition `Ev()`.
- The default of `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`, what `CLAUDE_CODE_SUBAGENT_MODEL` overrides, and which tiers can use fast mode.
- A way to tell Max 5x from Max 20x without the credentials file.
