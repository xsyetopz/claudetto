# Prompt audit, part 4: Jev, lab, sessions, cross-text findings, and the byte plan

This file continues [prompt-audit-2.md](prompt-audit-2.md).
The method, the keys, and the criteria are in that file.

## `plugins/dotclaude-jev` tool description and schema

The tool `second_opinion` exists only when `TYPESAFE_API_KEY` is set.
The description is 1,119 B and the schema descriptions are 341 B.
Both are in each request, and `FIRST_REQUEST_*` bounds the start (8 to 16 KB).

### `features/jev/tool.mjs:16` `RULES` and `:27` `DESCRIPTION`

| # | Quoted text | Criterion or issue | Fix |
| --- | --- | --- | --- |
| 1 | `Ask about ... a decision or an answer of the user, and each request for a second opinion.` | 5, I06, I07 | "An answer of the user" lets Claude check a user answer with a model and then act against it. The trigger also overlaps `` AskUserQuestion` and the `reviewer` agent. Replace with: `Use it for a close call or a technical choice, and when the user asks for a second opinion. `` |
| 2 | `When Jev picks ... confidence of 0.9 or more for a question that facts decide, do not ask the user that question unless the user asks for it.` | 1, 2, I06, I07 | The sentence has no reason. The bound 0.9 comes from no source (`limits.mjs` says "text for the model only", and the TypeSafe docs give only 0.5). A model pick then replaces a question to the user. Also `ask.mjs` already shows the pick to the user at 0.5 or more, so two rules with two bounds say one thing. Delete the sentence. Then `HIGH_CONFIDENCE` has no use and goes from `limits.mjs`, with its tests. If the user wants the skip rule, it needs the user's approval, a reason, and the bound of `ask.mjs`. |
| 3 | `Keep the question neutral. ... Give no preferred answer and no leading words.` | 2 | Two sentences say one rule. The schema repeats it twice. Keep one sentence with its reason: `Keep the question neutral, because a leading question gets the answer that it leads to.` |
| 4 | `A confidence under 0.5 is a weak signal.` | 2 | `format` in `cli.mjs:152` adds this at the time of need. Delete it from the description. |
| 5 | `The question goes to the TypeSafe API, so put no secret and no personal data in it.` | 1, I10 | Good reason. The `state` and the `options` go too. Replace `The question` with `The question, the options, and the state`, and `it` with `them`. |
| 6 | `When you do not follow the pick of Jev, say so and give the reason.` | 1, I06 | Good: action and a check on a silent override. Keep, and say to whom: `tell the user and give the reason`. |
| 7 | `The tool puts the options in a random order before it asks Jev.` | 2 | The schema says it too (finding 8). Keep it here, and delete it from the schema. |

Proposed `DESCRIPTION` (with `RULES` merged, 781 B, saves about 340 B):

```text
Asks Jev, a decision model, for a second opinion on a choice that facts can settle.
Use it for a close call or a technical choice, and when the user asks for a second opinion.
Do not use it for goals, preferences, or approvals, because only the user decides those.
Jev returns a pick and a confidence from 0 to 1.
The question, the options, and the state go to the TypeSafe API, so put no secret and no personal data in them.
Keep the question neutral, because a leading question gets the answer that it leads to.
Give each option with one fact for it and one fact against it.
Leave out the lean of the user, the notes, or the team, because Jev judges the facts only.
The tool puts the options in a random order.
When you do not follow the pick, tell the user and give the reason.
```

### `features/jev/tool.mjs:35` `INPUT_SCHEMA` descriptions

| # | Quoted text | Criterion or issue | Fix |
| --- | --- | --- | --- |
| 8 | `Every option. Leave it out for a yes or no question. The tool orders the options at random.` | 2, 5 | Delete the last sentence (finding 7). |
| 9 | `question`: `The decision to check, as a neutral question with no preferred answer.` | 2 | Shorten to `The decision to check, as a neutral question.` |
| 10 | `key`: `A short name of the option, with no = character.` | 3, 1, 4 | A mechanical rule, with no reason. The tool joins `key` and `description` with `=` (`tool.mjs:113`), which is why `=` fails. `INVALID_INPUT` already names the rule. Delete from the schema (saves 25 B). Better, change the code to pass a JSON list to the client, so the rule goes. |
| 11 | `description`: `What the option is, with the evidence for and against it.` | 5 | Keep. It is exact. |

The five schema descriptions become 259 B (from 341 B).

## `plugins/dotclaude-jev` tool results and errors

| # | Quoted text | Criterion or issue | Fix |
| --- | --- | --- | --- |
| 12 | `fallback` (`tool.mjs:119`, 275 B): `Route: no check ran in this tool, and no model answered. Start the reviewer agent of dotclaude when it is installed ... Do not call this tool again for this question.` | 6, 4, 1, I06 | Five faults. The add-on names the core plugin and one of its agents, against criterion 6. `Route:` repeats the first line. The last line forbids with no reason. A failed call may be a timeout that a second call fixes. Nothing tells Claude to tell the user, so Claude can go on as if the check ran. Replace with the 3 lines in the next row. |
| 13 | Proposed `fallback` (179 B plus the reason) | 4, 8 | `` Jev gave no answer. REASON` / `Another call for this question is unlikely to help. `` / `Answer from your own check of the evidence, and tell the user that no second opinion was available.` |
| 14 | `result`: `Route: Jev (its own models).` (29 B) | 4 | "Route" is jargon. Use `Jev answered:`. Saves 15 B. |
| 15 | `register.mjs:81`: `The second-opinion tool failed. Answer from your own check.` (59 B) | 4, 2, 7 | No reason, no tell-the-user step, and a second error text for the same case. Return `fallback("The tool run failed.")`, so the case has one text. The catch hides the error, so log nothing new, but the reason in the text must say "run failed". |
| 16 | `` INVALID_INPUT` (122 B): `The input is not valid. Give question and ... `` | 4, PG2 §6 | `clientArgs` returns `null` for three different faults. Return the fault: `` The `question` is empty. ``, `` A pick needs 2 or more `options`. ``, or `` An option key is empty or has an `=` character. `` Claude then fixes the one fault. About +30 B. |
| 17 | `cli.mjs:127`: `await res.text()` in `throw new Error(`TypeSafe API ${status}: ${why}`)` | 4, PG2 §6 | The whole body of an error reply goes to Claude through `fallback`. It can be an HTML page. Cut it to 200 characters. |
| 18 | `cli.mjs:152`: `TYPESAFE_API_KEY is not set. Get a key at https://console.typesafe.ai and export it before Claude Code starts.` and the 401 text | 4 | Claude cannot do this action. The text reaches Claude through `fallback`. Say: `` The user must set `TYPESAFE_API_KEY` before Claude Code starts. A key is at https://console.typesafe.ai. `` Same for the 401 text: `` The key in `TYPESAFE_API_KEY` is not valid. Tell the user. `` |
| 19 | `format`: `` This is near 0.5, so Jev is not sure. Treat it as a weak signal.` and `Confidence is low, so treat this answer as a weak signal. `` | 4, 2 | Two texts for one case, and the number 0.5 is in neither. Use the same fact: `` The confidence is under 0.5, so Jev is not sure.` and `P(yes) is near 0.5, so Jev is not sure. `` Drop the command, since "not sure" is the fact. |
| 20 | `cli.mjs` `USAGE` and `UsageError` texts (lines 52, 83, 91, 101, 106, 120) | 4 | The tool builds the arguments, so these texts cannot reach Claude with valid input. No change. |

### `features/jev/ask.mjs:64` note for the user

| # | Quoted text | Criterion or issue | Fix |
| --- | --- | --- | --- |
| 21 | `Jev picks "X" (confidence 0.83).` | 4, I06 | The user reads it, not Claude. It is a fact, short. The user does not know "Jev". Use `Jev (a decision model) picks "X" (confidence 0.83).` +20 B. The note can anchor the user. Outside the brief. |

Count: 21 findings (3 are "keep" or "no change": 11, 20, 21 partly).

## `plugins/dotclaude-lab/skills/eval-compare/SKILL.md`

The skill has `disable-model-invocation`, so its meta (191 B) is not in the listing.
Body 1,532 B (below 2 KB).

| # | Quoted text | Criterion or issue | Fix |
| --- | --- | --- | --- |
| 1 | `<task>` lines 10 to 12: `Each folder is one plugin arm. ... So the scores of the two arms can be compared with each other.` | 2 | Step 3 repeats the shared baseline and gives the action. Cut lines 10 to 12 and keep: `Compare the eval scores of two plugin folders for the user.` Saves about 190 B. |
| 2 | `Each run costs money and takes minutes, so confirm the two folders with the user before the run.` | 1 | Good. Keep. |
| 3 | `The command adds --max-cost-usd 5 for each run when the options set no bound.` | 7, I12, I05 | The bound is mechanical and the code does it, which is right. The text does not say what to do when a run stops at the bound. Claude may pass a larger `--max-cost-usd` on its own. Add: `If a run stops at the cost bound, tell the user. Do not raise the bound without the user.` About +90 B. |
| 4 | `If the user names a git ref ... ask for a folder, or tell the user to check out the ref in a git worktree.` | 1 | Action is clear. Add the reason, which is that the command reads folders and not refs. 25 B. |
| 5 | `If the baseline scores differ much between the two runs, say so, because ...` | 1, I06 | "Differ much" has no number. Replace with: `If the two baseline scores differ by more than the gap between the arms, say so, because the model varies between runs and the gap is then weak evidence.` +30 B. |
| 6 | `Say when a difference is within the noise of the baseline.` | 1, I06 | Same fault. Delete, since finding 5 now holds the rule. Saves 58 B. |
| 7 | `runBoth` (`run.mjs:48`): `Compare the WITH column of the two tables.` | 4, I04 | It prints even when a run failed (`x` or `y` not 0). Print it only when both runs succeed. On a failure print: `Arm A failed with exit code N. Tell the user, and do not compare the tables.` |
| 8 | `--allow-tools Bash,Write,Edit` in `evalOf` | I07 | Not a text. The eval run gets write and shell tools without a prompt. Outside the brief. |

Count: 8 findings (1 is a "keep" note: 2).

## `plugins/dotclaude-sessions/skills/start/SKILL.md`

Meta 223 B (bound 150 to 300).
Body 1,881 B (below 2 KB).

| # | Quoted text | Criterion or issue | Fix |
| --- | --- | --- | --- |
| 1 | `name: start` | 5 | The name is a common word and does not say what the skill does. A user or Claude cannot tell it from a start command. Rename to `start-cost` (the folder, the name, and the pins of the tests change). A description edit alone cannot fix the name. |
| 2 | `description: Measures what a Claude Code session sends at its start, by source ...` | 5 | Third person, main use first, with a trigger. Good. Add the boundary with `usage` in few bytes: `Use when asked what a plugin, skill list, or MCP server costs at the start of a session, not for usage over time.` About +30 B. |
| 3 | `Do not state the cause of a usage limit, because no source gives one.` | 1, I06 | Good: a reason. The same sentence is in `usage`. A copy in each skill is right because the add-ons cannot share (criterion 6). Keep. |
| 4 | `Say that the sizes are characters of the records and not tokens` | 2 | The output already prints `Start by source (chars of the records, an estimate)`. Delete this half. Keep `give the real token figures only from the line First request`. |
| 5 | `If the output says No request with usage, tell the user the transcript has no model call yet.` | 3, 4 | A mechanical case. The tool prints only `` No request with usage.` (`cli.mjs:68`). Make the output say it: `No request with usage. The transcript has no model call yet. `` Delete the sentence from the skill. Saves about 95 B. |
| 6 | `Ask the user for the two transcript paths, or tell the user to start one session ...` | 1 | Action and reason (the transcript shows only the plugins that were on). Keep. |
| 7 | `Copy each figure ... Do not compute, round, or convert a figure, because ...` | 1, I04 | Good. Keep. |

Count: 7 findings (3 are "keep" notes: 3, 6, 7).

## `plugins/dotclaude-sessions/skills/usage/SKILL.md`

Meta 243 B.
Body 1,717 B (below 2 KB).

| # | Quoted text | Criterion or issue | Fix |
| --- | --- | --- | --- |
| 1 | `description: Reports where Claude Code usage went ... Use when asked why usage or limits drained, or which skills to remove.` | 5 | Good. The "why limits drained" trigger overlaps `start`. Add `over time` after "usage went": `Reports where Claude Code usage went over a period`. +12 B. |
| 2 | `Costs are API-equivalent dollars at list prices, so say that a subscription does not bill them.` | 3, 2 | Mechanical: the output header (`cli.mjs:54`) says `API-equivalent`. Make it say `API-equivalent at list prices, not a subscription bill`, and delete the rule. Saves about 85 B. |
| 3 | `Use --runs N ..., --json ..., --window N ...` | 2 | `dotclaude-usage --help` lists them. Keep one line: `` Run `dotclaude-usage --help` for the options. `` Saves about 130 B. |
| 4 | `Read three parts of the output:` with a bullet of 4 lines on `Skills that the period did not use` | 2 | The output labels each part. Cut the description of the parts to the one rule that matters: `For unused skills, name the source that gave the list.` Saves about 450 B. |
| 5 | `Do not remove or change a skill.` | 1, I07 | No reason. Add `because the user decides what to remove.` The line before it already says the same. Merge: `Let the user decide what to remove, and change no skill.` |
| 6 | `Name the runs with the most calls and the largest sums first.` | 1 | Action only. Add the reason: `because they hold most of the usage`. 30 B. |

Count: 6 findings (0 keep notes).

## `plugins/dotclaude-sessions` tool results

`dotclaude-start` and `dotclaude-usage` print computed tables, and a long output goes to a file with a preview (inventory).
Only the error lines are text:
`` Give two transcript paths: --compare BASE OTHER.` and `No transcript found. Give the path of a session .jsonl file. ``
Both are specific and give the next step.
No finding.
The one fix is finding 5 of `start` and finding 2 of `usage`.

## Cross-text findings

| # | Finding | Criterion or issue | Fix |
| --- | --- | --- | --- |
| X1 | Every error text that a tool returns to Claude and that invites a different route: `MISSING_BINARY` (use the skill), `<blocked_pages>` (switch browser), `fallback` of Jev (use the reviewer, else answer alone). | 7, I05, I07 | Rule for all add-ons: a failed tool or a block gives the fact, the cause, and "ask the user" or "tell the user". A named alternative is allowed only when it keeps the setting of the user. See browser findings 5 and 14 and Jev finding 12. |
| X2 | No add-on text tells Claude to raise a bound, edit a check, or weaken a test. Two texts leave the case open: the cost bound of `eval-compare` and the `ctx7` call bound of `docs`. | 7, I05, I07 | Add the "tell the user, do not raise it" sentence to both (lab finding 3, docs finding 4). |
| X3 | The tool results that tell Claude to regard page or docs text as data (browser `pageResult`, docs skill, browser skill). | 4, I10 | Keep one place for each source: the skill states the rule with its reason, and the tool result states the provenance as a fact. |
| X4 | Cross-plugin reference: the Jev `fallback` names the `reviewer` agent of `dotclaude`. | 6, AGENTS.md | Remove the plugin name (Jev finding 12). No other add-on text names another plugin. |
| X5 | Meta below the low bound of 150 B: `drive-web-browser` (114) and `docs` (103). The sum of the 6 skills is 951 B, below 5 KB. | 5 | The new descriptions reach the low bound. Do not pad the others. The sum stays below the low bound and the check reports it only. |
| X6 | Bodies below 2 KB: `docs`, `eval-compare`, `start`, `usage`. | Size | The cuts make them smaller. Report only, and do not pad. |
| X7 | A judgment rule in prose and a mechanical rule in a hook (dossier I02). The mechanical rules in prose are: the exact `ctx7` form (a permission rule does it), the cost bound (code does it), the unit note of `start` and `usage` (move to the output), and the `=` rule of Jev (code can remove it). | 3, I02 | Apply the moves in the findings above. |
| X8 | Hook text as facts: only the `SessionStart` line of codegraph is a command list. | 4, PG2 §2 | Codegraph finding 1. |
| X9 | Frequent text after a tool result: codegraph `contextText` adds a tail on each symbol search. | 4, PG2 §2 | Codegraph finding 4. |
| X10 | The built-in `WebSearch` runs after a silent browser failure. | Outside the brief | The model cannot tell a browser result from a built-in result. Not a prompt fix. |

## Byte plan

The bound column is the bound of `tools/limits.mjs` or the feature, and "none" means that no bound pins the text.
After counts use the proposed text, and "about" marks an estimate.

| Text | Current | Bound | After |
| --- | --- | --- | --- |
| `drive-web-browser` meta | 114 | 150 to 300 | about 190 |
| `drive-web-browser` body | 2,895 | 2 to 8 KB | about 2,640 (-55, -330, +90, +40, +10, ...) |
| `pageResult` template | 135 | none | 135 (+85 only if finding 13 applies) |
| `MISSING_BINARY` | 358 | none | about 230 |
| `INVALID_INPUT` (browser) | 57 | none | about 70 |
| `SESSION_LINE` | 258 | none | about 250 |
| `contextText` template | 125 | `GRAPH_CONTEXT_MAX` 1,200 | about 100 (-70 tail, +45 steer) |
| `docs` meta | 103 | 150 to 300 | about 160 |
| `docs` body | 1,543 | 2 to 8 KB | about 1,580 |
| Jev `DESCRIPTION` | 1,119 | start 8 to 16 KB | 781 |
| Jev schema descriptions | 341 | start 8 to 16 KB | 259 |
| Jev `fallback` | 275 | none | about 180 plus the reason |
| Jev `result` prefix | 29 | none | 14 |
| `register.mjs:81` text | 59 | none | 0 (uses `fallback`) |
| Jev `INVALID_INPUT` | 122 | none | about 150 |
| `eval-compare` meta | 191 | 150 to 300 | 191 |
| `eval-compare` body | 1,532 | 2 to 8 KB | about 1,500 (-190, +90, +25, +30, -58) |
| `start` meta | 223 | 150 to 300 | about 255 |
| `start` body | 1,881 | 2 to 8 KB | about 1,700 (-95, -50) |
| `usage` meta | 243 | 150 to 300 | about 255 |
| `usage` body | 1,717 | 2 to 8 KB | about 1,030 (-85, -130, -450, +60) |

Net for the main session with the Jev key: the start falls by about 420 B (description 338, schema 82).
Without the key, the start does not change.
The Jev edits pay for the additions to the browser and `docs` bodies, which load only when a skill runs.
No fix raises a bound.

## Not verified

- I did not run `agent-browser read`, so the order in browser finding 6 is a reading of the skill text only.
- I did not check what `agent-browser --max-output` appends at a cut (browser finding 13).
- I did not check the claim of codegraph finding 6 against the CodeGraph docs.
- The proposed byte counts that say "about" are estimates.
