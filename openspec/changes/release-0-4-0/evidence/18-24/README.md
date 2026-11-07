# 18.24 Messages fit their reader

## Prediction (written before any run)

Change: `output-styles/Concise.md` `<sentence_style>` gains one rule for agent messages (task, inputs, done-check, no greeting, thanks, or restated context) and one for replies to a person (plain English, no pleasantries, praise, or filler).

- Agent messages: plugin mean characters at or below base. Confidence moderate. The style also trims text, but the plugin's delegation hook may add text, and the done-check clause could lengthen a prompt that base writes tersely.
- Flesch-Kincaid grade of reply prose: plugin at or below base. Confidence moderate. Backticked identifiers are stripped before scoring, and short literal sentences lower the grade, but "plain English" may shift little.
- Filler hits (regex list fixed in `prompts.json` `fillers` before any run): plugin at or below base. Confidence high, because base Claude rarely opens with filler, so both counts may be near 0 and tie.

Design: 32 blind prompts (16 delegate, 16 question) written by a fresh subagent that never saw the style, in `prompts.json`. Arms `base` (no plugin) and `plugin` (plugin loaded, `outputStyle` `claudetto:Concise`), model `claude-sonnet-5-5`, one session per prompt per arm, no tuning on these prompts. Runner: `probe.ts` over `../18-5/harness.ts`.

## Result: not measured

The real round (64 sessions, `ARM_BUDGET_USD=0.12`) ran once and every session ended at its first API call with `api_error_status` 400, `result` "Credit balance is too low", `$0.0000`, 0 tokens (`/tmp/probe-18-24/runs/probe-18-24/*/stdout.txt`). The numbers it printed (messages 0, no filler, FK 2.88 for both arms) come from the empty reply and mean nothing. Prediction stands as an unchecked hypothesis. The init frame of the session lists the tool as `Task`, so `probe.ts` counts both `Agent` and `Task` names.

Done check (plugin at or below base on all three) is not met because no data exists. The text change and its pin in `tools/manifest.test.ts` are done: 3 pass with the rule, 1 fail (`toContain "holds the task, its inputs, ... restated context"`) with the clause removed, 3 pass again after restoring.
