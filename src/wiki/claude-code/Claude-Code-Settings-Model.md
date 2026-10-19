# Claude Code Settings: Model

These keys choose the model that Claude Code uses and how hard it thinks.
Administrators also use them to allow or block models.
For example, `{ "model": "opus", "effortLevel": "high" }` starts each session on Opus at high effort.

The marks and the scopes are explained on [Settings](Claude-Code-Settings).
A `-` in the `Default` column means that neither the docs nor the schema state a default.

| Mark | Key | Type | Default | What It Is For | Scope | Source |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ | `advisorModel` | string | - | Pick which model answers when Claude asks the advisor tool. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `alwaysThinkingEnabled` | boolean | - | Turn extended thinking off for every session. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `availableModels` | array of string | - | Restrict which models people can pick. Accepts family aliases (`opus`), version prefixes (`opus-4-5`), and full model IDs. An empty array leaves only the default model. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `availableModelsMatch` | enum: `prefix`, `exact` | - | Make each `availableModels` model ID entry permit only the version it names. `prefix` is the default. `exact` stops an entry from allowing other versions. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `deniedModels` | array of string | - | Block specific models, even ones `availableModels` permits. A family alias blocks the family. Claude Code does not start if no allowed model is left for Default. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `effortLevel` | enum: `low`, `medium`, `high`, `xhigh` | - | Set a default effort level for models without a saved level of their own. Saved for supported models. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `enforceAvailableModels` | boolean | - | Keep the `/model` Default choice inside your `availableModels` allowlist. Has no effect when `availableModels` is unset or empty. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `fallbackModel` | array of string | - | Name backup models for when the primary is overloaded. Models are tried in order. The `--fallback-model` flag wins. `default` expands to the default model. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `fastMode` | boolean | - | Turn fast mode on for sessions where it's available. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `fastModePerSessionOptIn` | boolean | - | Require people to turn fast mode on each session. Each session starts with fast mode off. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `maxEffortLevel` | string | - | Cap the effort level for every model or per model, on every provider. The lowest value across files wins. An effort set through `CLAUDE_CODE_EXTRA_BODY` is not clamped. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `model` | string | - | Change the model Claude Code starts with. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `modelOverrides` | object | - | Map model IDs to your provider's IDs, such as Bedrock ARNs. Usually set in managed settings. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `modelPicker` | object | - | Choose which models the `/model` picker lists, in your own order and with your own labels. Read only from managed, `--settings`, and user settings. The first source that sets it wins whole. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `modelPricing` | object | - | Report spend at your organization's contracted rates instead of list price. `overrides` maps a model ID to USD rates per million tokens. The figures stay estimates. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `modelSettings` | - | - | Keep a saved effort level or auto-compact window per model, or cap one model's effort. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `promptCacheTtl` | string | - | Choose the prompt cache lifetime for the main conversation. `5m` or `1h`. Unset is 1 hour on a subscription and 5 minutes on an API key or cloud provider. `CLAUDE_CODE_PROMPT_CACHE_TTL` wins. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `showThinkingSummaries` | boolean | - | See summaries of Claude's thinking instead of a collapsed stub. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `subagentPromptCacheTtl` | string | - | Choose the prompt cache lifetime for subagent requests. `5m` or `1h`. Unset is 5 minutes unless `ENABLE_PROMPT_CACHING_1H=1`. `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` wins. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `switchModelsOnFlag` | boolean | - | Switch models automatically or pause when a safety classifier flags a request. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `totalTokensReminder` | enum: `off`, `infinite`, `fixed`, `countdown`, `padded-countdown` | `padded-countdown` | Add a "tokens left" reminder to the system prompt and after each tool result. Modes: `off`, `infinite`, `fixed`, `countdown`, `padded-countdown`. `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` wins. | Settings files | Bundle settings schema |
| 🔍 | `totalTokensReminderAfterUserTurn` | boolean | On | Repeat the "tokens left" reminder after each user prompt. When off, it shows only in the system prompt and after tool results. `CLAUDE_CODE_TOTAL_TOKENS_REMINDER_AFTER_USER_TURN` wins. | Settings files | Bundle settings schema |
| 🔍 | `totalTokensReminderBudget` | integer | `15000000` | Set the starting token budget of `padded-countdown`. `CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET` wins. | Settings files | Bundle settings schema |

## See Also

- [Settings](Claude-Code-Settings) explains the marks, the scopes, and the precedence.
- [Settings Reference](https://code.claude.com/docs/en/settings-reference) is the docs page for each key.
- [Model Configuration](https://code.claude.com/docs/en/model-config) explains aliases and effort.
- [Models And API](Claude-Code-Models-And-API) lists the models.
