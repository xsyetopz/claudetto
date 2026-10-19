# Claude Code Models Capabilities

Each model in the catalog has capability flags, a price, and an effort cost index.
They show what a model can do and what it costs.
For example, `claude-opus-5-5` at `medium` effort costs about `0.66` of its cost at `high`.

## About the Lists

Source: the `capabilities`, `pricing`, and `pricing_tiers` keys of the catalog, and the file `models-2.1.303.tsv` (see [Models Catalog](Claude-Code-Models-Catalog)).
The docs do not list these fields, so all rows have the mark 🔍.
The meaning of a flag is given only where the docs or a string of the bundle make it clear.

## Capability Flags

A capability is a string in the `capabilities` list of a model.
The code tests the string to switch a feature on for that model.
The column `Models` is the number of models that have the flag.

| Flag | Mark | What it does | Models |
| --- | --- | --- | --- |
| `context_management` | 🔍 | The model works with the `context-management-2025-06-27` beta. | 18 |
| `effort` | 🔍 | The model accepts the `effort` setting. | 12 |
| `max_effort` | 🔍 | The model accepts the level `max`. | 12 |
| `xhigh_effort` | 🔍 | The model accepts the level `xhigh`. | 10 |
| `adaptive_thinking` | 🔍 | The model accepts adaptive thinking. | 12 |
| `mid_conv_tool_change` | 🔍 | The tool list can change in the middle of a conversation. | 8 |
| `rejects_disabled_thinking` | 🔍 | Thinking cannot be turned off, as the docs say for `MAX_THINKING_TOKENS`. | 6 |
| `per_turn_effort` | 🔍 | The model can take the effort with each message. | 4 |
| `lean_prompt` | 🔍 | The model gets the short system prompt. | 8 |
| `org_locked_thinking` | 🔍 | The organization locks the thinking setting. | 2 |
| `haiku_5_5_early_stopping_guidance` | 🔍 | Claude Code adds guidance against early stopping. | 1 |
| `per_turn_timing` | 🔍 | The model can take the current time with each message. | 4 |
| `refusal_fallback` | 🔍 | A refused request can run again on a fallback model. | 5 |
| `silent_turn_reminder` | 🔍 | Claude Code adds a reminder after a turn with no text. | 1 |
| `fast_mode` | 🔍 | The model supports `/fast`. | 3 |
| `thinking_disabled_effort_cap` | 🔍 | The bundle does not state the purpose. | 1 |
| `opus_5_prompt_bundle` | 🔍 | The model gets the prompt sections for Opus 5. | 1 |
| `opus_5_5_prompt_bundle` | 🔍 | The model gets the prompt sections for Opus 5.5. | 1 |
| `fable_5_mitigations` | 🔍 | The model gets extra safety text for Fable 5. | 3 |
| `fable_5_1_prompt_bundle` | 🔍 | The model gets the prompt sections for Fable 5.1. | 2 |

The flags `effort`, `max_effort`, `xhigh_effort`, and `adaptive_thinking` say which effort levels and which thinking mode a model accepts.
Thinking cannot be turned off on Opus 5.5, Sonnet 5.5, Haiku 5.5, and the Fable models ([Environment Variables](https://code.claude.com/docs/en/env-vars)).
The betas `per-turn-control-2026-07-01` and `timing-2026-09-09` match the flags `per_turn_effort` and `per_turn_timing` (see [API Betas](Claude-Code-API-Betas)).

## Pricing

The prices are in US dollars for each million tokens.
A search request costs `0.01` in every group.
Haiku 5.5 costs `0.5` for input and `2.5` for output above 100,000 prompt tokens.

| Models | Mark | Input | Output | Cache write 5m | Cache write 1h | Cache read |
| --- | --- | --- | --- | --- | --- | --- |
| `claude-sonnet-5` | 🔍 | 2 | 10 | 2.5 | 4 | 0.2 |
| `claude-sonnet-5-5` | 🔍 | 2 | 10 | 2.5 | 4 | 0.1 |
| `claude-3-5-sonnet`, `claude-3-7-sonnet`, `claude-sonnet-4-0`, `claude-sonnet-4-5`, `claude-sonnet-4-6` | 🔍 | 3 | 15 | 3.75 | 6 | 0.3 |
| `claude-opus-4-5`, `claude-opus-4-6`, `claude-opus-4-7`, `claude-opus-4-8`, `claude-opus-5` | 🔍 | 5 | 25 | 6.25 | 10 | 0.5 |
| `claude-opus-4-0`, `claude-opus-4-1` | 🔍 | 15 | 75 | 18.75 | 30 | 1.5 |
| `claude-fable-5`, `claude-mythos-5` | 🔍 | 10 | 50 | 12.5 | 20 | 1 |
| `claude-fable-5-1`, `claude-mythos-5-1` | 🔍 | 10 | 50 | 12.5 | 20 | 0.25 |
| `claude-opus-5-5` | 🔍 | 4 | 20 | 5 | 8 | 0.2 |
| `claude-3-5-haiku` | 🔍 | 0.8 | 4 | 1 | 1.6 | 0.08 |
| `claude-haiku-4-5` | 🔍 | 1 | 5 | 1.25 | 2 | 0.1 |
| `claude-haiku-5-5` | 🔍 | 0.1 | 0.5 | 0.125 | 0.2 | 0.01 |

## Effort Cost Index

The index scales the cost of an effort level against `high`, which is `1`.
The levels are `low`, `medium`, `high`, `xhigh`, and `max`.
The model `claude-opus-4-7` has the default effort `xhigh` and no index.
The other models have no default effort in the catalog.

| `id` | Mark | Default effort | Index |
| --- | --- | --- | --- |
| `claude-fable-5` | 🔍 | high | `low:0.6,medium:0.77,high:1,xhigh:1.74,max:1.91` |
| `claude-fable-5-1` | 🔍 | high | `low:0.75,medium:0.86,high:1,xhigh:1.38,max:1.74` |
| `claude-haiku-5-5` | 🔍 | medium | `low:0.38,medium:0.52,high:1,xhigh:2.03,max:4.34` |
| `claude-mythos-5-1` | 🔍 | high | `low:0.75,medium:0.86,high:1,xhigh:1.38,max:1.74` |
| `claude-opus-4-7` | 🔍 | xhigh | - |
| `claude-opus-4-8` | 🔍 | high | `low:0.72,medium:0.9,high:1,xhigh:1.65,max:1.88` |
| `claude-opus-5` | 🔍 | high | `low:0.67,medium:0.76,high:1,xhigh:1.6,max:1.7` |
| `claude-opus-5-5` | 🔍 | medium | `low:0.48,medium:0.66,high:1,xhigh:1.66,max:3.44` |
| `claude-sonnet-5` | 🔍 | high | `low:0.47,medium:0.74,high:1,xhigh:2.41,max:5.59` |
| `claude-sonnet-5-5` | 🔍 | medium | `low:0.49,medium:0.54,high:1,xhigh:1.87,max:5.5` |

## See Also

- [Models and API](Claude-Code-Models-And-API)
- [Models Catalog](Claude-Code-Models-Catalog)
- [Turn Pipeline](Claude-Code-Turn-Pipeline)
