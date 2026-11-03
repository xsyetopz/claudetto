# Models and Effort

What claudetto sets for models and effort, and the prices it counts with. The code is the source of each value below. The prices come from `claudekit/price/table.ts`, which says they are from the platform pricing page. They are not measured against a run.

The five effort levels are `low`, `medium`, `high`, `xhigh`, and `max`. The keys are `effortLevel` and `maxEffortLevel`, and the flag is `--effort`.

## The Models

Claudetto counts, prices, and looks up three models: `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5` (`plugins/claudetto/src/tiers/tiers.ts:18-22`). Every tier row of `TIERS` spreads `SHARED` (`plugins/claudetto/src/tiers/tiers.ts:43`), so the rows differ only in `subagentCap`.

| Role | Model | Where it is set |
| --- | --- | --- |
| Main thread | `claude-opus-5-5` | `mainModel` of `SHARED`, written as `model` |
| Subagents | `claude-sonnet-5-5` | `subagentModel` of `SHARED`, written as `CLAUDE_CODE_SUBAGENT_MODEL` |
| Fallback | `claude-sonnet-5-5` | `FALLBACK_MODELS` (`plugins/claudetto/src/tiers/disables.ts:54`) |
| Handoff and summary | `claude-haiku-5-5` | `summaryRequest` of `plugins/claudetto/src/blocks/compaction/summary.ts`, only when `cheapSummary` is on |

Agent files carry no `model:` line, so `CLAUDE_CODE_SUBAGENT_MODEL` decides the model of a subagent.

## Effort

`effortLevel` is where a model starts, and `modelSettings.<model>.maxEffortLevel` is a ceiling. `SHARED` writes `effort: "medium"`, and `MAX_EFFORT` (`plugins/claudetto/src/tiers/disables.ts:57-61`) holds the ceilings:

| Model | `maxEffortLevel` |
| --- | --- |
| `claude-opus-5-5` | `high` |
| `claude-sonnet-5-5` | `medium` |
| `claude-haiku-5-5` | `high` |

The source comment calls the `high` ceilings the author's choice. `modelSettingsOf` (`plugins/claudetto/src/tiers/snippet.ts:100`) writes the three ceilings, and `plugins/claudetto/src/tiers/__tests__/snippet.spec.ts` pins them. `tierSnippet` writes `effortLevel` at the top level (`plugins/claudetto/src/tiers/snippet.ts:139`).

## Prices

`PRICES` of `claudekit/price/table.ts` holds dollars per million tokens by billed line:

| Model | Input | Output | Cache read | Cache write, 5 minutes | Cache write, 1 hour |
| --- | --- | --- | --- | --- | --- |
| `claude-opus-5-5` | `$4` | `$20` | `$0.2` | `$5` | `$8` |
| `claude-sonnet-5-5` | `$2` | `$10` | `$0.1` | `$2.5` | `$4` |
| `claude-haiku-5-5` | `$0.1` | `$0.5` | `$0.01` | `$0.125` | `$0.2` |

## The Haiku Price Step

`claude-haiku-5-5` has a second row for a request whose prompt is over `100_000` tokens, counting input, cache read, and cache write: input `$0.5`, output `$2.5`, cache read `$0.05`, cache write `$0.625` for 5 minutes and `$1` for 1 hour. That is five times the base row on every line. The table prices each request on its own, so one long request pays the higher row without repricing the others.

`HAIKU_PRICE_STEP = 100_000` (`plugins/claudetto/src/tiers/tiers.ts:16`) is the same number in the plugin. Two parts of the plugin keep a Haiku session under it, and `docs/window-weights.md` describes both:

- `HAIKU_HANDOFF_TRIGGER_TOKENS = 90_000` (`plugins/claudetto/src/threshold.ts:17`) is the Haiku compaction trigger, 10,000 tokens below the step.
- The `price-step` block withholds a tool result that would take the next Haiku request over the step.
