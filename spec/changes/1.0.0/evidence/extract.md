# P01c evidence: built-in text of Claude Code 2.1.296

## Status

The user ran two live sessions with only the capture plugin and an empty config.
The lean session has the capture file `/tmp/ccx-out/capture-lean.json`.
The full session has the capture file `/tmp/ccx-out/capture.json`.
The full session ran with the lean prompt off, so its capture has no trait `lean`.
This report compares each id with the capture of the session that shows it.
An earlier capture with the dotclaude 0.28.0 plugins, `/tmp/ccx-out/capture-with-dotclaude.json`, has the same section ids.
This report does not use its texts, because the plugins changed them.
An id that no capture shows is `not confirmed`, and the reason is in the sections below the table.
`action_caution` is in the lean capture only, so the full session does not show it.
It stays confirmed by the lean session.

## Live captures

The lean session ran from the main checkout with this command:

`bun plugins/dotclaude-lab/bin/dotclaude-sandbox --dir /tmp/ccx-sandbox --plugin-dir /tmp/ccx-capture -p "Reply with the word ok."`

The full session ran from the main checkout with this command:

`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0 just sandbox-alone /tmp/ccx-capture -p "Reply with the word ok."`

The capture plugin records the `prompt.compose` and `tool.describe` events.
It changes no answer.
It has no `prompt.attachment`, `prompt.section`, or `command.describe` event, so the captures show no attachment id.

The `prompt.compose` input of the lean capture has the model `claude-sonnet-5-5` and the traits `lean`, `print`, and `skills`.
The `prompt.compose` input of the full capture has the model `claude-sonnet-5-5` and the traits `print` and `skills`.
Neither capture has an output style.

## Method

1. The section text is the `text` of each section in the `compose` result of the capture that shows the id.
   The tool text is the `description` of the `tool.describe` input of the capture that shows the tool.
   The input is the text that the engine computes before a hook answers.
   No hook changed a description in either capture.
2. The id of a section is its `id` in `prompt.compose`.
   The id of a tool is its `tool` in `tool.describe`.
   A part with no id in the Mod API has the id `none`.
3. A size is a count of UTF-8 bytes.
   Tokens are the bytes divided by 4, rounded half up to a whole number.
   This is an estimate.
4. The strings of the binary come from `external/cc-2.1.296/strings.txt` in the main checkout.
   The binary is not patched.

## Counts by kind

| Kind | Ids in report | Confirmed | Not confirmed | Files | Full files |
| --- | --- | --- | --- | --- | --- |
| section | 29 | 15 | 14 | 25 | 3 |
| tool | 25 | 25 | 0 | 25 | 7 |
| style | 1 | 1 | 0 | 1 | 0 |
| compaction | 3 (`none`) | 0 | 3 | 3 | 0 |
| listing | 3 (`none`) | 0 | 3 | 3 | 0 |
| attachment | 0 | 0 | 0 | 0 | 0 |
| simple prompt | 2 (`none`) | 0 | 2 | 0 | 0 |

The report has 63 ids.
The captures confirm 41 of them: 15 sections, 25 tools, and 1 style.
The 22 ids that are not confirmed are 14 sections, 3 compaction prompts, 3 listings, and 2 simple prompts.
Of the 14 section ids that are not confirmed, 4 have no file: `memory_static`, `brief`, `focus_mode`, and `subagent_steer_delegation`.
The `Full files` column counts the `.full.txt` files that hold the text of the full session where it differs from the lean session.

## Extracted texts

The section files `intro`, `system`, `doing_tasks`, `actions`, `tools`, and `tone` have the text of the full session.
The 3 `.full.txt` section files have the text of the full session, and their `.txt` files have the lean text.
The 7 `.full.txt` tool files have the text of the full session, and their `.txt` files have the lean text.
The 18 other tools have the same text in both captures.
The other unconfirmed files have the text of the earlier extract from the bundle, and that text is not confirmed.

| Kind | Id | Size in bytes | Tokens | Path | Live capture |
| --- | --- | --- | --- | --- | --- |
| section | `action_caution` | 520 | 130 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/action_caution.txt` | confirmed (lean) |
| section | `actions` | 3587 | 897 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/actions.txt` | confirmed (full) |
| section | `communication` | 94 | 24 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/communication.txt` | confirmed (lean) |
| section | `communication` | 1350 | 338 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/communication.full.txt` | confirmed (full) |
| section | `context_management` | 282 | 71 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/context_management.txt` | confirmed (lean) |
| section | `doing_tasks` | 3319 | 830 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/doing_tasks.txt` | confirmed (full) |
| section | `env_info_simple` | 581 | 145 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/env_info_simple.txt` | confirmed (lean) |
| section | `intro` | 853 | 213 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/intro.txt` | confirmed (full) |
| section | `lean_body` | 1607 | 402 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/lean_body.txt` | confirmed (lean) |
| section | `memory` | 2098 | 525 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/memory.txt` | confirmed (lean) |
| section | `memory` | 12910 | 3228 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/memory.full.txt` | confirmed (full) |
| section | `pronouns` | 361 | 90 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/pronouns.txt` | confirmed (lean) |
| section | `session_guidance` | 664 | 166 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/session_guidance.txt` | confirmed (lean) |
| section | `session_guidance` | 1287 | 322 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/session_guidance.full.txt` | confirmed (full) |
| section | `system` | 1939 | 485 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/system.txt` | confirmed (full) |
| section | `tone` | 555 | 139 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/tone.txt` | confirmed (full) |
| section | `tools` | 650 | 163 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/tools.txt` | confirmed (full) |
| section | `total_tokens` | 49 | 12 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/total_tokens.txt` | confirmed (lean) |
| section | `autonomy_append` | 1483 | 371 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/autonomy_append.txt` | not confirmed |
| section | `bg-session` | 2611 | 653 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/bg-session.txt` | not confirmed |
| section | `brook_heron` | 165 | 41 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/brook_heron.txt` | not confirmed |
| section | `delivering_work_max` | 2047 | 512 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/delivering_work_max.txt` | not confirmed |
| section | `env_info` | 375 | 94 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/env_info.txt` | not confirmed |
| section | `opus5_reduced_delegation` | 122 | 31 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/opus5_reduced_delegation.txt` | not confirmed |
| section | `overcorrection` | 1256 | 314 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/overcorrection.txt` | not confirmed |
| section | `task_continuity` | 510 | 128 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/task_continuity.txt` | not confirmed |
| section | `user_pays` | 150 | 38 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/user_pays.txt` | not confirmed |
| section | `willow_tern` | 109 | 27 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/section/willow_tern.txt` | not confirmed |
| tool | `Agent` | 2920 | 730 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Agent.txt` | confirmed (lean) |
| tool | `Agent` | 6954 | 1739 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Agent.full.txt` | confirmed (full) |
| tool | `Bash` | 1494 | 374 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Bash.txt` | confirmed (lean) |
| tool | `Bash` | 10326 | 2582 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Bash.full.txt` | confirmed (full) |
| tool | `CronCreate` | 2619 | 655 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/CronCreate.txt` | confirmed |
| tool | `CronDelete` | 100 | 25 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/CronDelete.txt` | confirmed |
| tool | `CronList` | 60 | 15 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/CronList.txt` | confirmed |
| tool | `DesignSync` | 3778 | 945 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/DesignSync.txt` | confirmed |
| tool | `Edit` | 362 | 91 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Edit.txt` | confirmed (lean) |
| tool | `Edit` | 1094 | 274 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Edit.full.txt` | confirmed (full) |
| tool | `EnterWorktree` | 3232 | 808 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/EnterWorktree.txt` | confirmed |
| tool | `ExitWorktree` | 1929 | 482 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/ExitWorktree.txt` | confirmed |
| tool | `ListAgents` | 785 | 196 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/ListAgents.txt` | confirmed |
| tool | `Monitor` | 6392 | 1598 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Monitor.txt` | confirmed |
| tool | `NotebookEdit` | 623 | 156 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/NotebookEdit.txt` | confirmed |
| tool | `PushNotification` | 1372 | 343 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/PushNotification.txt` | confirmed |
| tool | `Read` | 794 | 199 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Read.txt` | confirmed (lean) |
| tool | `Read` | 1784 | 446 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Read.full.txt` | confirmed (full) |
| tool | `RemoteTrigger` | 2848 | 712 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/RemoteTrigger.txt` | confirmed |
| tool | `ReportFindings` | 574 | 144 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/ReportFindings.txt` | confirmed |
| tool | `ScheduleWakeup` | 3180 | 795 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/ScheduleWakeup.txt` | confirmed |
| tool | `SendMessage` | 4285 | 1071 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/SendMessage.txt` | confirmed |
| tool | `Skill` | 1425 | 356 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Skill.txt` | confirmed |
| tool | `TaskStop` | 364 | 91 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/TaskStop.txt` | confirmed |
| tool | `ToolSearch` | 963 | 241 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/ToolSearch.txt` | confirmed |
| tool | `WebFetch` | 471 | 118 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/WebFetch.txt` | confirmed (lean) |
| tool | `WebFetch` | 1608 | 402 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/WebFetch.full.txt` | confirmed (full) |
| tool | `WebSearch` | 336 | 84 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/WebSearch.txt` | confirmed (lean) |
| tool | `WebSearch` | 1344 | 336 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/WebSearch.full.txt` | confirmed (full) |
| tool | `Workflow` | 3502 | 876 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Workflow.txt` | confirmed |
| tool | `Write` | 240 | 60 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Write.txt` | confirmed (lean) |
| tool | `Write` | 620 | 155 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/tool/Write.full.txt` | confirmed (full) |
| style | `Concise` | 265 | 66 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/style/Concise.txt` | confirmed (one `-p` request through the capture proxy, with `outputStyle` `Concise` and only an empty test plugin; the body equals the file except one blank line before `# Concise Style Active`) |
| compaction | `none` | 4287 | 1072 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/compaction/full.txt` | not confirmed |
| compaction | `none` | 2433 | 608 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/compaction/recent.txt` | not confirmed |
| compaction | `none` | 384 | 96 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/compaction/entire.txt` | not confirmed |
| listing | `none` | 147 | 37 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/listing/agent_types.txt` | not confirmed |
| listing | `none` | 134 | 34 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/listing/deferred_tools.txt` | not confirmed |
| listing | `none` | 64 | 16 | `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/listing/skills.txt` | not confirmed |

## What selects `lean_body`

Line numbers are lines of `external/cc-2.1.296/strings.txt`.

### What the lines show

- Line 328051, the function that builds the sections, sets `s=WJ(n)` and `h=ZK(s)`.
  When `h` is true, the `shared` scope has only `lean_body`.
  When `h` is false, the `shared` scope has `intro`, `system`, `doing_tasks`, `actions`, `tools`, and `tone`.
  `doing_tasks` is `null` when an output style is set without `keepCodingInstructions`.
- Line 328050 builds the `prompt.compose` input.
  It sets the trait `lean` to `ZK(s)` with the same `s=WJ(n)`, and it sets `model` to `n`.
  Thus the trait `lean` in `prompt.compose` shows the same decision as the choice of `lean_body`.
- Line 322416: `ZK(e)` calls `leanPrompt(e)` on the host object, and the class `z` sets `leanPrompt=po(I)`.
  `I(e)` gives this result, in this order:
  1. `false` when there is no model.
  2. `true` when `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` is true.
  3. `false` when `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` is false.
  4. `true` when `de(e)` is false.
  5. `true` when the flag `tengu_velvet_tide` is on.
  6. Else, the value of `U("simple_system_prompt", We(e))`.
- Line 322416: `de(e)` reads the capability `lean_prompt` of the model with `E_`, and gives its inverse when it is set.
  Else `de` is `false` for an `-eap` model (`ATe`) and for `claude-mythos-5`.
  It is `true` for a model name that has `claude-3-`, `haiku`, or `sonnet`, and for `claude-opus-4-0`, `claude-opus-4-1`, `claude-opus-4-5`, `claude-opus-4-6`, and `claude-opus-4-7`.
  Else it is the inverse of `qd()`.
- Line 318985: `qd()` is true for the providers `firstParty`, `anthropicAws`, `anthropicGoogleCloud`, and `gateway`.
- Line 318985: `E_` reads `CLAUDE_CODE_MODEL_CAPABILITIES` first, then a capability lookup from the server, then the capabilities of the model catalog.
  The env var has entries split by `;`, an optional model prefix before `=`, and capability names split by `,`, with `-` to remove a capability.
- Line 318599: the env parsers read `1`, `true`, `yes`, and `on` as true, and `0`, `false`, `no`, and `off` as false.

### What is inferred

- The condition is the model, not interactive against `-p`.
  `print` is a different trait, and `I(e)` does not read it.
- The `Ne` and `Es` that `I(e)` uses are the env parsers of line 318599.
  The import names point to that chunk, but no line shows the binding.
- The capture model `claude-sonnet-5-5` has `sonnet` in its name.
  So the lean session got `lean` from the capability `lean_prompt` of the catalog or the server, from `tengu_velvet_tide`, or from `U("simple_system_prompt", ...)`.
  The lines do not show which one.
- `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` makes `I(e)` return `false` at step 3, before each model check and each flag.
  The full session shows this result, because its trait `lean` is absent.
- The section function adds a suffix such as `:L` to some names in the lean form, but the capture ids have no suffix.
  The engine removes the suffix before `prompt.compose`.
- `lean` also selects shorter tool texts.
  The captures show a difference for `Agent`, `Bash`, `Edit`, `Read`, `Write`, `WebFetch`, and `WebSearch`.
  The bundle lines of 323033 to 323071, and 324964, name `Glob` and `Grep` too, but no capture shows them.
  The tool files `<name>.txt` of this report are the lean texts, and the `<name>.full.txt` files are the full texts.

## Commands for the section ids

The lean session showed 9 section ids.
The full session showed the 6 ids `intro`, `system`, `doing_tasks`, `actions`, `tools`, and `tone`.
Its gate was the trait `lean` set to false.
Its `shared` scope had these 6 sections in place of `lean_body`, as the lines above show.
The full session also showed the full texts of 3 sections and 7 tools.

The full session did not confirm the other 14 section ids, because each one has a different gate on line 328051:

- `memory_static`: the trait `sdk-preset`, which only an SDK call with the preset sets.
- `env_info`: no line of `strings.txt` has this id as a whole word.
  The bundle has `env_info_static`, with the trait `sdk-preset`.
- `task_continuity`, `bg-session`, `brief`, `focus_mode`, `brook_heron`, `willow_tern`, and `autonomy_append`: a function of the model or of the session state.
- `delivering_work_max`: `CLAUDE_CODE_BISON_CAIRN`, or a prompt bundle of the model.
- `overcorrection`: the capability `larch_cistern`, or `CLAUDE_CODE_LARCH_CISTERN`.
- `opus5_reduced_delegation`: the capability `opus_5_prompt_bundle` and the flag `tengu_slate_bittern`.
- `subagent_steer_delegation`: the `Agent` tool and the mode `counter_steer`.
- `user_pays`: the flag `tengu_wobbly_dahl` (line 328034).

## Reasons for each id that is not confirmed

- Sections `autonomy_append`, `bg-session`, `brook_heron`, `delivering_work_max`, `opus5_reduced_delegation`, `overcorrection`, `task_continuity`, `user_pays`, `willow_tern`, `brief`, `focus_mode`, and `subagent_steer_delegation`: the gate of the section was off in both live sessions.
- Sections `memory_static` and `env_info`: neither session had the trait `sdk-preset`.
- Compaction prompts and listings: the captures do not record these events.
  Their `none` id has no event in the captures.
- Attachments: the captures do not record `prompt.attachment`.

## Sections whose extract is not confirmed

The 10 section files `autonomy_append`, `bg-session`, `brook_heron`, `delivering_work_max`, `env_info`, `opus5_reduced_delegation`, `overcorrection`, `task_continuity`, `user_pays`, and `willow_tern` come from the bundle and not from a capture.
The earlier extract of 5 confirmed sections had the wrong text, so these 10 files can also have the wrong text.
P20, P22, and P23 must not use them before a capture confirms them.
`memory_static`, `brief`, `focus_mode`, and `subagent_steer_delegation` have no file.
The files of `actions`, `doing_tasks`, `intro`, `system`, `tone`, and `tools` came from the bundle before the full session.
The full session replaced them with the captured texts.

## Not extracted

- The reminders and the attachments.
  The searches of the strings found the text of the plan mode reminder at lines 204887 and 207233, and the text of the `TodoWrite` reminder at line 213830, of `strings.txt`.
  The mapping from the text to the attachment type is not confirmed, so no file is written.
  The types `plan_mode`, `plan_mode_reentry`, `plan_mode_exit`, and `todo_reminder` appear at lines 134513, 144179, and 144185.
- The prompts of `CLAUDE_CODE_SIMPLE` and `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`.
  `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` sets the trait `lean`, so its prompt is the `lean_body` form.
  `CLAUDE_CODE_SIMPLE` gives only a `bare` section (line 328050 and line 322416).
- The listings have headers only, because the items come at run time.

## Commands run

- `python3 -I` reads of `/tmp/ccx-out/capture.json` and `/tmp/ccx-out/capture-lean.json`, which list the ids, the traits, and the sizes.
- One earlier `python3 -I` run that wrote the 9 section files and the 25 tool files from the lean capture.
- One `python3 -I` run of the full capture that wrote the 6 section files, the 3 `.full.txt` section files, and the 7 `.full.txt` tool files.
  It compared the lean files of the 3 changed sections and the 7 changed tools with the lean capture, and it found no mismatch.
- `wc -c` on the new files, which matches the sizes of the table.
- `grep -n -F` searches and `python3 -I` reads of ranges of `external/cc-2.1.296/strings.txt`, for the gate of `lean_body`.
- `bunx markdownlint-cli2` on this file.
- Live sessions run by this package: none.
  The user ran the lean session and the full session.
