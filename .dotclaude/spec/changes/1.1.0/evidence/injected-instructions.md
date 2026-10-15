# Instruction Text in Tool Results (P58)

## Result

Only 2 hook texts put live instruction-shaped text into the context of an agent:

- `reportNote` of the `handoff` slice (`src/plugins/dotclaude/slices/handoff/domain/context.ts:41`): 303 hits in 17 subagent transcripts.
  One `planner` run (`7f9af63f`, agent `a06a31145c4734243`) got it 154 times, in 156 tool results from line 194 to line 764.
- `headsUpNote` of `dcc-plugin-you-should-know` (`src/plugins/dcc-plugin-you-should-know/slices/notice/domain/notice.ts:197`): 8 hits in 4 main-session transcripts.
  Each one starts "The person gave a heads-up", but a side agent wrote the topic.

No transcript and no file under `external/` shows instruction text from a web page or a third-party plugin that a model obeyed.
The other 121 hits are Claude Code harness texts (56) and quotes in files and command output (65).
The 65 quotes are dotclaude source and spec texts, briefs and handoff files of the OpenJoystickDriver project, strings of the Claude Code bundle, quotes of the user, and 1 `pip` warning.

## Dotclaude Texts for P57

| Text | Source | Units | Pattern hits | Names its source | Action |
| --- | --- | --- | --- | --- | --- |
| "Your context is N tokens, … Commit your work first, then report. A report of 400 words or fewer is due now" | `handoff/domain/context.ts:41` | 303 | 303 | no | P57 owns it. |
| "This command only prints a file. … Call `Read` with … instead." | `guard/domain/deny.ts:22` | 102 | 0 | no | Tag it too. It is an imperative to the model in a tool result, but P57 does not own `guard/`. |
| "dotclaude forbids this destructive action. …" and "dotclaude forbids this command in a subagent …" | `guard/domain/reason.ts` | 5 | 0 | yes | None. |
| "Contents of `<path>`:" and the text of a nested `AGENTS.md` file | `dcc-plugin-agents-md/…/agents.ts:147` (`nestedText`) | 4 | 0 | no | Tag it too. It puts file text into a tool result after a `tool.call`, but P57 does not own the plugin. |
| "The person gave a heads-up about the change you are making: … Take this into account for the rest of this turn." | `dcc-plugin-you-should-know/…/notice.ts:197` | 8 | 8 | no, and it names the wrong source | P68 step 7 and P69 step 6 remove it. |
| "This project has a code graph. …" | `dotclaude-codegraph/…/graph.ts:24` | 17 | 0 | no | `SessionStart` context, not a tool result. Out of scope of P57. |
| "CloakBrowser gave no search results: …" | `dotclaude-browser/…/search.ts` | 6 | 0 | names CloakBrowser | None. |

The pattern set does not find the imperative "Call `Read` … instead", so the `deny.ts` row comes from the attribution step, not from a pattern hit.

## Claude Code Harness Texts

These texts come from Claude Code, so dotclaude cannot tag them.
P57 can only make sure that the dotclaude texts do not look like them.

| Text (start) | Where | Hits |
| --- | --- | --- |
| "agentId: … (internal ID - do not mention to user. Use SendMessage …)" | end of each `Agent` result | 33 (32 live, 1 quoted) |
| "REMINDER: You MUST include the sources above in your response" | end of each `WebSearch` result | 11 |
| "Permission for this action was denied by the Claude Code auto mode classifier … IMPORTANT: You *may* attempt …" | auto mode deny | 10 (7 live, 3 quoted) |
| `<system-reminder>` block in a tool result | Claude Code | 1 |
| "you should default to running future commands within the sandbox" | quoted in a command output | 1 |

## Counts

The counts are from the run at 2026-10-14T01:36Z, on `main` at `76dc06d7`, with Claude Code 2.1.296.
The run read 68 transcripts: each `.jsonl` file under `~/.claude/projects/`, except the session that ran this survey (`d9133bf3`), because its hits are the reads of the survey.
A second run gave the same output, byte for byte.

| Origin | Source | Hits |
| --- | --- | --- |
| live hook text | hook `dotclaude` (`reportNote`) | 303 |
| live hook text | hook `dcc-plugin-you-should-know` | 8 |
| live deny or harness text | Claude Code auto mode deny | 7 |
| live deny or harness text | Claude Code `<system-reminder>` in a tool result | 1 |
| Claude Code harness signature | `Agent` trailer, in a subagent report | 32 |
| Claude Code harness signature | `Agent` trailer, quoted in a file | 1 |
| Claude Code harness signature | `WebSearch` reminder | 11 |
| Claude Code harness signature | auto mode deny, quoted | 3 |
| Claude Code harness signature | sandbox reminder, quoted | 1 |
| content of the tool result | command output | 25 |
| content of the tool result | file in the repository | 22 |
| content of the tool result | file outside the repository | 18 |
| total | | 432 |

Units scanned, by source: command output 1191, file in the repository 343, hook `dotclaude` 303, `Edit` 165, file outside the repository 159, `Write` 151, deny `dotclaude` 107, `SubagentHandback` 43, subagent report 41, web page 31, `AskUserQuestion` 21, hook `dotclaude-codegraph` 17, `SendMessage` 16, `ToolSearch` 10, hook `dcc-plugin-you-should-know` 8, MCP `dotclaude` 8, MCP `apple-docs` 7, auto mode deny 7, harness reminder 7, hook `dotclaude-browser` 6, hook `dcc-plugin-agents-md` 4, other units 12.
No unit from a web page holds page text with an instruction pattern.
The 11 web page hits are the `WebSearch` reminder of Claude Code.

## Method

1. I read the row shapes of the transcripts.
   A hook text is a row with `attachment.type` `hook_additional_context`, with `hookEvent` and `hookName`.
   A tool result is a `tool_result` block of a `user` row.
   A deny has the row field `toolDenialKind`.
2. The counter `count.py` (in `$TMPDIR/p58/`, not in the repository) makes one unit for each hook text, each `tool_result` block, and each `<system-reminder>` block in a tool result.
3. It gives the source of each unit:
   - A hook text or a deny goes to the plugin whose file in `src/` holds a static part of the text.
     The part is 20 characters or more, or it is a start of the text of 12 characters or more that only one file holds.
   - A tool result goes to the tool of its `tool_use_id`: `Read`, `Grep`, and `Glob` give a file in or outside the repository (from `cwd`), `Bash` gives command output, `WebFetch` and `WebSearch` give a web page, and `Agent` gives a subagent report.
4. A unit is a hit when it matches one of these patterns:
   - `commit` as an imperative: "then commit", "commit your", "commit the", and similar, not "commit 3f2a…" and not "added to commit"
   - "words or fewer", "you must", "do not tell", and "ignore" with an object such as "ignore all" or "ignore previous"
   - "IMPORTANT" in capitals
   - an imperative to the model: "you should" (not "You should know", the name of the plugin), "you need to", "take this into account", "report now", "reply with", "do not mention", and similar
5. Each hit that is not a hook text gets an origin.
   Claude Code harness signatures come first, then "content of the tool result".
6. I read the match context (100 characters) of each of the 65 "content" hits to check the origin.
   I did not quote a secret or a token, and no match context holds one.

## Fixture Check

Each fixture ran before each full run.
The outputs are in `$TMPDIR/p58/*.tsv` and `*.out`.

| Fixture | Expected | Result |
| --- | --- | --- |
| `good.jsonl`: a `reportNote` hook row | 1 hit, hook `dotclaude`, `context.ts` | 1 hit, hook `dotclaude`, `plugins/dotclaude/slices/handoff/domain/context.ts` |
| `bad.jsonl`: `git log` output with "commit 3f2a1b9c" and "important commit of the parser, ignore-list update" | 0 hits | 0 hits |
| `bad2.jsonl`: "Turn on You should know:", "no changes added to commit", and "whether to commit and push" | 0 hits | 0 hits |
| `origin.jsonl`: an `Agent` trailer and a `Read` of the `reportNote` source | 2 hits, origins `CC Agent result trailer` and "content of the tool result" | as expected |
| `agentsmd.jsonl`: a hook row "Contents of /r/sub/AGENTS.md:" | 0 hits, source hook `dcc-plugin-agents-md` | as expected |

The counter has had 3 versions:

- Version 1 failed `good.jsonl` (source "hook unattributed") and `bad.jsonl` (1 `commit` hit).
  The attribution searched only the first 20 to 60 characters, and the token count is not in the source.
  The `commit` pattern matched at the start of each line.
- Version 2 passed `good.jsonl`, `bad.jsonl`, and `origin.jsonl`.
  A `reviewer` run found 2 defects in its full run: "you should" matched the plugin name "You should know", "to commit" matched "added to commit", and the 4 `agents.ts` hook texts were "hook unattributed".
  `bad2.jsonl` and `agentsmd.jsonl` show these cases.
- Version 3 passes all 5 fixtures.
  On the same 68 transcripts, version 2 gives 463 hits (95 "content") and version 3 gives 432 (65 "content").

The `grep` of the export threads also had a fixture: a file with "Prompt Injection" matched, and a file with "injection molding prompts" did not.

## Commands

```sh
find ~/.claude/projects -name '*.jsonl' | sort | grep -v d9133bf3 > tx.final.list  # 68
for x in good bad bad2 origin agentsmd; do
  python3 -I count.py "$REPO/src" $x.tsv fx/$x.jsonl > $x.out
done
python3 -I count.py "$REPO/src" tx.tsv $(cat tx.final.list) > tx.out          # 432 rows
python3 -I count.py "$REPO/src" tx.check.tsv $(cat tx.final.list) > tx.check.out
cmp tx.out tx.check.out && cmp tx.tsv tx.check.tsv
python3 -I count.v2.py "$REPO/src" old.tsv $(cat tx.final.list)               # 463 rows
find external/capture -name '*.jsonl'                                          # 9 files
python3 -I count.py "$REPO/src" ext.tsv <the 9 files>                          # 0 units
grep -rlisZ -e 'prompt injection' --include='export-*.jsonl' external
```

## `external/`

- 500 `export-*.jsonl` files are Reddit threads (`content_trust` `untrusted_page_content`).
  They are not tool results.
  They become tool results only when a session reads them, and the transcripts show such reads as "file in the repository".
- The 9 `.jsonl` files under `external/capture/` have 0 tool results and 0 hook texts.
- No other file under `external/` has a `tool_result` row, except the string table `external/cc-2.1.296/strings.txt`.
- Threads that report instruction text in tool results, found by search:
  - `2026-10-02/export-Why I am receiving a prompt injection with -system-reminder- on Claude Code -.jsonl` (`1wemrgz`): Sonnet 5 flagged a `<system-reminder>` after a `Bash` result as injected.
    This is the I10 (b) row of the dossier.
  - `export-Claude treating Anthropic's internal instructions as prompt injection.jsonl` (`1wpqjln`): Claude treated an `<ip_reminder>` as injection.
  - `2026-10-02/export-Beware of this system prompt that is automatically injected into Claude Code after every compaction-.jsonl` (`1piny6t`): a text after compaction made Claude skip the planning step that the user asked for.
  - `export-Well I almost got prompt injected.jsonl` (`1w57t43`): a real injection that Claude caught.
- Thread counts, of 500: "prompt injection" 12, "tool result" 15, "system-reminder" 7, "additionalContext" or "additional context" 4.
  The 4 "additional context" threads are about other topics.

## Hits by Transcript

The paths are relative to `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-`, with the session ID cut to 8 characters, and `a-` for `subagents/agent-`.

| Transcript | Source | Origin | Hits | Lines |
| --- | --- | --- | --- | --- |
| `OpenJoystickDriver/4a5015db` | file in repository | content of the tool result | 1 | 109 |
| `OpenJoystickDriver/949a747a` | deny Claude Code automode-blocked | live deny or harness text | 1 | 193 |
| `OpenJoystickDriver/949a747a` | file outside repository | content of the tool result | 1 | 271 |
| `OpenJoystickDriver/949a747a` | hook dcc-plugin-you-should-know | live hook text | 1 | 321 |
| `OpenJoystickDriver/949a747a` | subagent report | CC Agent result trailer | 3 | 169-170, 200 |
| `OpenJoystickDriver/949a747a/a-a39189873b5636f5e` | hook dotclaude | live hook text | 2 | 9, 15 |
| `OpenJoystickDriver/949a747a/a-a442fe00ad1d69b78` | hook dotclaude | live hook text | 6 | 122, 127, 132, 136, 142, 146 |
| `OpenJoystickDriver/949a747a/a-a6af1bb9090610f8e` | deny Claude Code automode-blocked | live deny or harness text | 2 | 135, 140 |
| `OpenJoystickDriver/949a747a/a-a73ba0b59ec6f0d75` | hook dotclaude | live hook text | 6 | 2, 8, 14, 20, 24, 28 |
| `OpenJoystickDriver/949a747a/a-ad08b469087e80ac1` | command output | content of the tool result | 1 | 12 |
| `OpenJoystickDriver/9b38a538` | deny Claude Code automode-blocked | live deny or harness text | 1 | 122 |
| `OpenJoystickDriver/9b38a538` | subagent report | CC Agent result trailer | 12 | 149-150, 154-155, 310-311, 315-317, 354-355, 374 |
| `OpenJoystickDriver/9b38a538/a-a73ba0b59ec6f0d75` | hook dotclaude | live hook text | 2 | 111, 117 |
| `OpenJoystickDriver/d87f7ed2` | command output | content of the tool result | 1 | 46 |
| `OpenJoystickDriver/d87f7ed2` | file outside repository | content of the tool result | 1 | 51 |
| `OpenJoystickDriver/d87f7ed2/a-a0db29ad97cb4888c` | command output | content of the tool result | 1 | 19 |
| `OpenJoystickDriver/d87f7ed2/a-a0db29ad97cb4888c` | file outside repository | content of the tool result | 1 | 23 |
| `OpenJoystickDriver/d87f7ed2/a-a0db29ad97cb4888c` | hook dotclaude | live hook text | 2 | 182, 187 |
| `OpenJoystickDriver/d87f7ed2/a-a58137c0b14bed64b` | hook dotclaude | live hook text | 2 | 253, 258 |
| `OpenJoystickDriver/d87f7ed2/a-ada2df293dbe9539d` | file outside repository | content of the tool result | 1 | 25 |
| `OpenJoystickDriver/d87f7ed2/a-ada2df293dbe9539d` | hook dotclaude | live hook text | 5 | 158, 164, 171, 176, 181 |
| `OpenJoystickDriver/d87f7ed2/a-afd56c8a5a5448ac2` | command output | content of the tool result | 1 | 21 |
| `OpenJoystickDriver/d87f7ed2/a-afd56c8a5a5448ac2` | file outside repository | content of the tool result | 1 | 25 |
| `OpenJoystickDriver/d87f7ed2/a-afd56c8a5a5448ac2` | hook dotclaude | live hook text | 7 | 167, 174, 180, 185, 191, 195, 200 |
| `OpenJoystickDriver/d87f7ed2/a-afea2434f2a9b1150` | hook dotclaude | live hook text | 2 | 228, 234 |
| `dotclaude/2bb59b8b` | command output | content of the tool result | 2 | 89, 198 |
| `dotclaude/2bb59b8b` | file in repository | content of the tool result | 2 | 52, 661 |
| `dotclaude/2bb59b8b` | file outside repository | content of the tool result | 2 | 54, 203 |
| `dotclaude/2bb59b8b` | hook dcc-plugin-you-should-know | live hook text | 2 | 163, 437 |
| `dotclaude/2bb59b8b` | subagent report | CC Agent result trailer | 5 | 713-717 |
| `dotclaude/2bb59b8b/a-a1a0225d76f47fb04` | command output | CC auto mode deny | 1 | 97 |
| `dotclaude/2bb59b8b/a-a3289832a1e55069d` | web page | CC WebSearch reminder | 6 | 17, 19, 21, 66, 68, 92 |
| `dotclaude/2bb59b8b/a-a719c801502c23993` | file in repository | content of the tool result | 1 | 38 |
| `dotclaude/2bb59b8b/a-acfe161ee6eeffbf2` | command output | content of the tool result | 1 | 67 |
| `dotclaude/2bb59b8b/a-acfe161ee6eeffbf2` | file in repository | content of the tool result | 2 | 25, 34 |
| `dotclaude/2bb59b8b/a-ae41309c869da34c4` | web page | CC WebSearch reminder | 5 | 17, 19, 48, 50, 63 |
| `dotclaude/401e7c86` | deny Claude Code automode-blocked | live deny or harness text | 1 | 521 |
| `dotclaude/401e7c86` | file in repository | content of the tool result | 1 | 235 |
| `dotclaude/401e7c86` | hook dcc-plugin-you-should-know | live hook text | 3 | 277, 326, 345 |
| `dotclaude/401e7c86` | subagent report | CC Agent result trailer | 2 | 188, 325 |
| `dotclaude/401e7c86/a-aa0b3d63d3ae6de27` | command output | content of the tool result | 2 | 56, 119 |
| `dotclaude/401e7c86/a-aa0b3d63d3ae6de27` | file in repository | content of the tool result | 1 | 60 |
| `dotclaude/401e7c86/a-aa0b3d63d3ae6de27` | file outside repository | CC Agent result trailer | 1 | 37 |
| `dotclaude/401e7c86/a-aa0b3d63d3ae6de27` | file outside repository | CC auto mode deny | 2 | 33, 108 |
| `dotclaude/401e7c86/a-aa0b3d63d3ae6de27` | file outside repository | content of the tool result | 1 | 52 |
| `dotclaude/401e7c86/a-aa0b3d63d3ae6de27` | hook dotclaude | live hook text | 5 | 104, 109, 114, 120, 126 |
| `dotclaude/401e7c86/a-aa8ac1b9fc476a4d2` | command output | content of the tool result | 3 | 34, 77, 88 |
| `dotclaude/7f9af63f` | deny Claude Code automode-blocked | live deny or harness text | 1 | 761 |
| `dotclaude/7f9af63f` | file in repository | content of the tool result | 1 | 238 |
| `dotclaude/7f9af63f` | hook dcc-plugin-you-should-know | live hook text | 2 | 936, 985 |
| `dotclaude/7f9af63f` | subagent report | CC Agent result trailer | 8 | 103-104, 179, 321, 360-361, 634, 644 |
| `dotclaude/7f9af63f/a-a00ba1f821dfd3841` | command output | content of the tool result | 2 | 84, 91 |
| `dotclaude/7f9af63f/a-a00ba1f821dfd3841` | deny Claude Code automode-blocked | live deny or harness text | 1 | 161 |
| `dotclaude/7f9af63f/a-a06a31145c4734243` | command output | content of the tool result | 1 | 20 |
| `dotclaude/7f9af63f/a-a06a31145c4734243` | file in repository | content of the tool result | 4 | 23, 25, 120, 180 |
| `dotclaude/7f9af63f/a-a06a31145c4734243` | file outside repository | content of the tool result | 1 | 33 |
| `dotclaude/7f9af63f/a-a06a31145c4734243` | hook dotclaude | live hook text | 154 | 194, 201, 209, 217, 223, 225, 232, 238, 242, 251, 253, 255, 257, 267, 269, 271, 273, 275, 277, 287, 289, 291, 293, 295, 297, 299, 312, 314, 316, 318, 320, 322, 324, 326, 328, 341, 343, 345, 347, 349, 351, 353, 355, 368, 370, 372, 374, 376, 378, 380, 382, 384, 399, 401, 403, 405, 407, 409, 411, 413, 415, 425, 438, 440, 442, 444, 446, 448, 458, 460, 462, 464, 466, 468, 476, 478, 480, 492, 494, 496, 498, 500, 502, 510, 512, 544, 546, 548, 550, 552, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 576, 578, 580, 582, 584, 586, 588, 590, 592, 594, 603, 605, 607, 615, 617, 630, 632, 634, 636, 638, 640, 642, 654, 656, 658, 660, 662, 664, 676, 678, 680, 682, 684, 686, 696, 698, 700, 713, 715, 717, 719, 727, 729, 737, 739, 741, 743, 754, 756, 758, 760, 762, 764 |
| `dotclaude/7f9af63f/a-a481de2dd8875c63f` | command output | content of the tool result | 1 | 51 |
| `dotclaude/7f9af63f/a-a6041ffb9a41a624e` | Claude Code harness reminder | live deny or harness text | 1 | 66 |
| `dotclaude/7f9af63f/a-a6041ffb9a41a624e` | file outside repository | content of the tool result | 1 | 66 |
| `dotclaude/7f9af63f/a-a6041ffb9a41a624e` | hook dotclaude | live hook text | 2 | 119, 126 |
| `dotclaude/7f9af63f/a-a6d87525f0863db28` | hook dotclaude | live hook text | 5 | 119, 125, 131, 136, 141 |
| `dotclaude/7f9af63f/a-a9a03e455facf28a7` | command output | content of the tool result | 3 | 51, 90, 145 |
| `dotclaude/7f9af63f/a-a9a03e455facf28a7` | file in repository | content of the tool result | 4 | 44, 46, 56, 85 |
| `dotclaude/7f9af63f/a-a9a03e455facf28a7` | file outside repository | content of the tool result | 4 | 22, 24, 33, 101 |
| `dotclaude/7f9af63f/a-a9a03e455facf28a7` | hook dotclaude | live hook text | 19 | 86, 91, 99, 102, 105, 116, 121, 126, 131, 136, 141, 146, 151, 156, 161, 166, 171, 176, 181 |
| `dotclaude/7f9af63f/a-aa9b2effa22301e0c` | command output | CC sandbox reminder | 1 | 269 |
| `dotclaude/7f9af63f/a-aa9b2effa22301e0c` | file outside repository | content of the tool result | 3 | 26, 29, 36 |
| `dotclaude/7f9af63f/a-aa9b2effa22301e0c` | hook dotclaude | live hook text | 42 | 96, 102, 108, 114, 120, 125, 131, 137, 141, 147, 152, 158, 164, 170, 176, 180, 186, 192, 198, 204, 210, 216, 220, 226, 232, 236, 242, 248, 252, 258, 264, 270, 276, 282, 288, 294, 300, 306, 312, 318, 324, 332 |
| `dotclaude/7f9af63f/a-abab27c724d190c5c` | command output | content of the tool result | 3 | 148, 169, 180 |
| `dotclaude/7f9af63f/a-abab27c724d190c5c` | file in repository | content of the tool result | 2 | 151, 174 |
| `dotclaude/7f9af63f/a-abab27c724d190c5c` | hook dotclaude | live hook text | 37 | 213, 225, 231, 237, 241, 246, 251, 262, 264, 266, 268, 270, 280, 282, 284, 286, 288, 290, 299, 301, 303, 305, 307, 316, 318, 320, 322, 324, 335, 337, 339, 341, 343, 345, 347, 353, 359 |
| `dotclaude/c3191715` | file in repository | content of the tool result | 2 | 39, 188 |
| `dotclaude/c3191715` | subagent report | CC Agent result trailer | 2 | 179, 512 |
| `dotclaude/c3191715/a-a3b5e49028a2abcab` | file outside repository | content of the tool result | 1 | 41 |
| `dotclaude/c3191715/a-ab53d73e0802bcfad` | command output | content of the tool result | 2 | 16, 38 |
| `dotclaude/c3191715/a-acfe161ee6eeffbf2` | command output | content of the tool result | 1 | 45 |
| `dotclaude/c3191715/a-acfe161ee6eeffbf2` | file in repository | content of the tool result | 1 | 28 |
| `dotclaude/c3191715/a-acfe161ee6eeffbf2` | hook dotclaude | live hook text | 5 | 41, 46, 51, 56, 60 |

## Unknowns and Limits

- The pattern set is a heuristic, so its recall is not known.
  It does not find "Call `Read` … instead" (the `deny.ts` row).
- 4 tool results have no matching `tool_use` row, so their source is "other tool unknown".
  None of them is a hit.
- Only 3 project folders exist under `~/.claude/projects/`, so sessions that Claude Code removed are not in the count.
- No search failed and no search was denied.
  The first `grep` of the export threads was wrong, because `--` made `grep` take `--include=…` as a file name.
  It counted 18 files for "prompt injection" in all of `external/`, and the counts above come from the corrected command.
  No saved output shows the count of 18, because the command printed it to this session only.
- The brief cites `design.md`, "Instruction text in tool results".
  `design.md` has no such section.
  The text is REQ-10 of `change.md:129-133`.
