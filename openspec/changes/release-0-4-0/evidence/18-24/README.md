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
