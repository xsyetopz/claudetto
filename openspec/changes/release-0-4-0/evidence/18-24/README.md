# 18.24 Messages fit their reader

## Prediction (written before any run)

Change: `output-styles/Concise.md` `<sentence_style>` gains one rule for agent messages (task, inputs, done-check, no greeting, thanks, or restated context) and one for replies to a person (plain English, no pleasantries, praise, or filler).

- Agent messages: plugin mean characters at or below base. Confidence moderate. The style also trims text, but the plugin's delegation hook may add text, and the done-check clause could lengthen a prompt that base writes tersely.
- Flesch-Kincaid grade of reply prose: plugin at or below base. Confidence moderate. Backticked identifiers are stripped before scoring, and short literal sentences lower the grade, but "plain English" may shift little.
- Filler hits (regex list fixed in `prompts.json` `fillers` before any run): plugin at or below base. Confidence high, because base Claude rarely opens with filler, so both counts may be near 0 and tie.

Design: 32 blind prompts (16 delegate, 16 question) written by a fresh subagent that never saw the style, in `prompts.json`. Arms `base` (no plugin) and `plugin` (plugin loaded, `outputStyle` `claudetto:Concise`), model `claude-sonnet-5-5`, one session per prompt per arm, no tuning on these prompts. Runner: `probe.ts` over `../18-5/harness.ts`.


## Result

Run: 32 prompts x 2 arms, `claude-sonnet-5-5`, one session each, `ARM_BUDGET_USD=0.12`, none capped, none rejected by the arm check. A pilot session came first: `apiKeySource` "none" and a real reply. Output: `/tmp/probe-18-24/out2`, log `run2.log`. The earlier round, which failed on credit (`/tmp/probe-18-24/out`), is void. Cost $1.61 (base $0.7434, plugin $0.8653). The largest session used 90,441 tokens, under 300,000.

| measure | base | plugin | plugin <= base |
|---|---|---|---|
| mean characters per `Agent`/`SendMessage` text (16 / 19 messages) | 560.4 | 604.8 | NO |
| Flesch-Kincaid grade of reply prose, mean of 32 sessions | 5.43 | 4.63 | yes |
| Flesch-Kincaid grade, pooled words | 5.08 | 4.37 | yes |
| filler-phrase hits (replies and agent messages) | 1 (q12 reply) | 0 | yes |

Done check not met: agent message length failed. The plugin's prompts are 8% longer. Of the 13 prompts that produced a message in both arms, 10 are longer under the plugin (d01 515 vs 595, d11 779 vs 890, d12 360 vs 492) and 3 are shorter. Hypothesis, not tested: base prompts already have no greeting (0 filler hits in either arm's agent messages), so the no-greeting half has nothing to cut, and the "inputs and done-check" half adds paths and a finish condition. The plugin also sent 19 messages to base's 16. The prompts were not tuned on. The prediction for message length (moderate confidence, at or below base) missed. The other two held.

The text change and its pin in `tools/manifest.test.ts` are done: 3 pass with the rule, 1 fail with the clause removed, 3 pass after restoring.


# Round 2

## Prediction (written before any run)

Change: the agent-message sentence in `<sentence_style>` now asks for only what the agent cannot find itself (task, inputs it lacks, done-check) in the fewest words, one message per agent, a follow-up only when the report leaves the task undone. `hooks/texts.ts` `AGENT_TEXT` loses "Pass `name` to address the agent by it in SendMessage." (a spawn result already gives the `agentId`, which `SendMessage` accepts), because it invites extra `SendMessage` calls and no requirement needs it.

- Mean characters per agent message, plugin at or below base: confidence low to moderate. "Fewest words" is a direct length instruction, but round 1 showed the plugin's text pulling in paths and done-checks that base omits.
- Message count, plugin at or below base: confidence moderate. The extra three messages in round 1 may have come from the `name` hint or from the Heracles background mode, and only the first is removed.
- Flesch-Kincaid grade, plugin at or below base: confidence moderate to high, unchanged from round 1.
- Filler hits (same regex list, copied unchanged from `prompts.json` into `prompts-b.json`): plugin at or below base, confidence high, both near 0.

Design: 32 new prompts (16 delegate, 16 question) from a fresh subagent that never saw the style or round 1 (`prompts-b.json`, 0 exact overlaps with `prompts.json`). Same probe (`probe.ts`, now reading `PROMPTS`, `PROBE`, `ROOT` from the environment), same harness (`../18-5/harness.ts`, with `PLUGIN` now read from `PLUGIN_DIR` so the plugin arm loads this checkout's edited plugin; the shared harness otherwise hardcodes the main tree's plugin, which holds the round 1 text). Output `/tmp/probe-18-24b/out`.

## Result

The first attempt (`/tmp/probe-18-24b/pilot`) failed: no OAuth token in the environment, reply "Not logged in", 0 tokens. No prompt text was tuned on it. The harness `REPO` is now `join(import.meta.dir, "../../../../..")`, so the plugin arm loads this checkout's plugin (the `PLUGIN_DIR` override is gone). Launch: `bun --env-file=<main>/.env probe.ts` (file never read).

Pilot (`/tmp/probe-18-24b/pilot2`, task d08, both arms): `apiKeySource` "none" in both init frames, real replies. Full run: 32 prompts x 2 arms, `claude-sonnet-5-5`, `ARM_BUDGET_USD=0.12`, none capped, none rejected. Output `/tmp/probe-18-24b/full/out`, log `run.log`. Cost $1.63 (base $0.780, plugin $0.847), plus pilot $0.046. Largest session 100,552 tokens, under 300,000.

| measure | round 1 base | round 1 plugin | round 2 base | round 2 plugin | plugin <= base |
|---|---|---|---|---|---|
| mean characters per `Agent`/`SendMessage` text (messages) | 560.4 (16) | 604.8 (19) | 517.0 (22) | 375.2 (23) | yes |
| Flesch-Kincaid grade, mean of 32 sessions | 5.43 | 4.63 | 5.07 | 4.49 | yes |
| Flesch-Kincaid grade, pooled | 5.08 | 4.37 | 4.96 | 4.37 | yes |
| filler hits (same regex list) | 1 | 0 | 0 | 0 | yes (tie) |

Done check met: all three measures at or below base on prompts not used in round 1. Predictions: message length (low to moderate) held, message count at or below base did not (23 vs 22, one more), FK held, filler held as a tie at 0. The count was not in the done check. Caveats: n is one session per prompt, the filler tie at 0 carries no signal, and the sample of messages is small (22 and 23), so the 28% length gap is one run, not a repeat. The prompts were written once, run once, and not tuned on. Which of the two edits (style sentence or `AGENT_TEXT` cut) caused the drop was not separated.
