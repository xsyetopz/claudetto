# Early Stops of Subagents

Goal G11. Read on 2026-10-27 from the subagent transcripts of this change's session, Claude Code `2.1.311`.

Source and method: a subagent writes to `~/.claude/projects/<project>/<session>/subagents/*.jsonl`, not to the parent transcript, so a one-level glob finds none of them (`references.md`). A recursive pass over `*/subagents/*.jsonl` of the project folder found 90 files in two parent-session folders. The 6 top-level transcripts hold 0 rows with `isSidechain`. For each file the pass took the agent type from `attributionAgent`, the tool calls as the distinct `tool_use` ids, the last assistant text, and every `tool_result` with `is_error`.

The 90 runs by type: `claudetto:Hephaestus` 39, `claudetto:Artemis` 30, `claudetto:Hermes` 18, `claudetto:Athena` 2, `claudetto:Apollo` 1.

## No Run Ended on a Denied Tool Call

All 90 runs ended with an assistant text. 0 ended with a denied tool call as the last act. The denials are below, as friction inside a run rather than a cause of an early stop.

## Runs Whose Final Text Leaves Work Open

13 of the 90 final texts hold "partial coverage" or "not opened". Two of the 13 are false positives: the phrase names a file outside the brief, and the `blocks` tag is `none`.

| Run | Type | Tool calls | Cause | The last lines of the transcript |
| --- | --- | --- | --- | --- |
| `agent-ac20e93f` | `Hermes` | 33 | Our turn bound, with a GitHub 403 and a `WebFetch` result too large to read | "The research run was stopped early by a hook message (\"You have made many tool calls … End the run now\"). The unread items are listed above." |
| `agent-aeb52307` | `Hermes` | 33 | Our turn bound, with a GitHub 403 | "I stopped researching further repos after a hook told me I had made many tool calls. The unchecked repos are listed above." |
| `agent-ad66be77` | `Hermes` | 33 | Our turn bound | The run received the bound line and ended with a list of 15 `arxiv.org` links. |
| `agent-a3624515` | `Artemis` | 93 | A read limit of the harness, with our turn bound at 93 calls | "background outputs `aaba55cbf7b1dcb2c.output` and `a935e8a5abd2c3405.output` (exceeded read limit; background transcripts, not source)" |
| `agent-abbdc48f` | `Artemis` | 22 | A tool limit of the harness | "`Glob` `**/*` under `external/`: first 100 results only." |
| `agent-ae6335e6` | `Hermes` | 21 | A tool limit of the harness | "`module.js` was read only to 100,000 of 130,555 characters." |
| `agent-a935e8a5` | `Artemis` | 15 | A brief that asks for more files than one run opens, and `Bash` is not a tool of the type | "Bash is not available in this session, so no shell checks were run. Coverage gap: about 75 files not opened, and one file read only to line 151 of 316. This is a limit of this turn, not a permission block." |
| `agent-aac97347` | `Artemis` | 20 | A brief that asks for every file of four folders | "Partial coverage: the task requires every file in the four folders to be opened. Not all of them have been opened, so the task is not complete. No permission, hook, or check blocked a step." |
| `agent-a24cb4ee` | `Artemis` | 19 | The agent's own choice: it stopped with no block | "none. The run stopped after the three named reads. The remaining 16 files and 2 partials are still open. The parent should decide whether to continue." |
| `agent-a0a9f58e` | `Artemis` | 32 | A brief that named a file which does not exist | "`Read` on `export-Anyone solely trying out Sonnet 5.5.jsonl` (wrong path; the file title is on the excluded list): error, file does not exist. Not read." |
| `agent-a4f9553c` | `Hermes` | 15 | An outside limit: one fetch timed out | "None blocking. The byteiota fetch timed out. The SlopCodeBench primary was not opened." |
| `agent-ac65d33d` | `Artemis` | 17 | None. The phrase names files outside the brief | "Read 14 target files with offset and limit. All read without error. … `<blocks>` none" |
| `agent-afd7e666` | `Hermes` | 20 | None. The phrase is in the body of the report | "`<checks>` none. WebSearch and WebFetch only. No commands were run. `<blocks>` none" |

Rows by cause: our own turn bound 4 (3 alone, 1 with a read limit), a tool or fetch limit of the harness 3, a brief larger than one run 2, a brief with a wrong path 1, the agent's own choice 1, an outside limit 1, no early stop 2.

## The Turn Bound Is the Only Cause in Our Own Code

`TURN_BOUNDS` in `plugins/claudetto/modules/session/prompt/limits.ts` injects a line asking the agent to stop and report. The phrase "You have made many tool calls in this run" is in 11 of the 90 transcripts: 6 of the 18 `Hermes` runs, 4 of the 39 `Hephaestus` runs, and 1 of the 30 `Artemis` runs.

Tool calls per run, each `tool_use_id` once:

| Type | Runs | Counts | Bound before | Runs that got the line |
| --- | --- | --- | --- | --- |
| `claudetto:Hermes` | 18 | 7, 8, 8, 9, 10, 11, 15, 18, 20, 21, 25, 27, 30, 31, 32, 33, 33, 33 | 30 | 6 |
| `claudetto:Hephaestus` | 39 | 1 to 157 | 120 | 4 |
| `claudetto:Artemis` | 30 | 10 to 93 | 90 | 1 |
| `claudetto:Athena` | 2 | 21, 24 | 65 | 0 |
| `claudetto:Apollo` | 1 | 3 | 120 | 0 |

The `Hermes` bound of 30 came from a single run of 8 calls on 2026-10-26, which is the whole `Hermes` sample that `limits.ts` had. The new counts pile up at 30, 31, 32, 33, 33, 33 and stop there, so a third of the runs of the type ended at the bound rather than at the work, and three of them say so in the text above. It was raised to 40, a quarter above the largest count, which is the method the other three bounds already use. The 33 is itself a capped count, so 40 is a floor.

`Hephaestus` and `Artemis` crossed their bounds in 5 runs, and none of those 5 reports open work, so neither bound moved. The reasoning is that a bound changes only with a row that it would have fixed.

## Denied Tool Calls Inside a Run

The gate denied 50 `Bash` calls of 27 runs, each with a text that starts "Permission to use Bash denied by plugin claudetto". 49 are the wrong-tool rule of `plugins/claudetto/modules/gate/domain/wrongtool.ts`, by program `cat` 28, `head` 14, `tail` 7. The 50th is the classifier, which stopped `git checkout plugins/claudetto/tests/prompt-size.test.ts` because the file held uncommitted edits, and that denial is correct.

Every one of the 49 was a compound command, and the rule reads each top-level part, so one part with the wrong tool denies the whole call. All 49 reproduce on the rule as it stood before the fix.

The 49 commands hold 62 parts that deny. By shape:

| Shape | Parts | Can one `Read` call do it | Verdict |
| --- | --- | --- | --- |
| A plain read of one file, such as `cat prd.md` | 20 | Yes | Correct. The agent should have used `Read`. |
| The reader feeds a pipe, such as `cat -n /tmp/rest.txt \| cut -c1-140` | 21 | No, but the gate denies it by a decision of the user of 2026-10-27, pinned by the case `tail -20 a.txt \| grep x` in `tests/claudetto/gate/wrongtool.test.ts` | Kept. Not ours to change. |
| Two files in one call, such as `tail -n 4 docs/keep/skills/find-docs.txt docs/keep/tools/ListAgents.txt` | 8 | No. `Read` takes one path | Defect. Fixed. |
| A glob, such as `head -c 1500 2026-10-26/reddit.com-r-programming-comments-1xfszv3*` | 6 | No. `Read` cannot expand a pattern | Defect. Fixed. |
| A reader inside a loop body, such as `do cat h_$k.txt` | 1 | Yes, one call for each name | Correct. |
| A byte count, such as `head -c 1500 "export-Opus 5.5 Context Degradation.jsonl"` | 10, counted in the two rows above | Yes for these files | Kept. The longest line of the 31 `.jsonl` exports measured is 7,981 characters, so `Read` with `limit` covers them, and the agent used `head -c` as a cheap preview. |

The two defects are one inconsistency: `wrongtool.ts` already exempted a `cat` of more than one file, with the reason that it "does what `Read` cannot", and the same shape with `head` or `tail`, or with a glob, was denied. The fix generalises the exemption to the three programs and to an operand the gate cannot resolve to one path, which is the category the rule already uses for a substitution such as `$(ls)`.

After the fix the 49 commands hold 53 denying parts in place of 62, and 6 of the 49 commands are no longer denied at all. The other 43 are the plain reads, the pipe heads, and the loop body, each of which the rule denies on purpose.

## What Changed in an Agent File

A dump of the six agent files of `plugins/claudetto/agents/` compared the tools each body names in backticks against the `tools` list of its frontmatter. One file disagreed: `Artemis.md` said "Find the place with `Grep` (or with `grep` in `Bash` when a native build has no `Grep`)", and the type is `tools: Read, Grep, Glob`, with no `Bash`. The row `agent-a935e8a5` above is that instruction reaching a run: its `blocks` tag opens with "Bash is not available in this session, so no shell checks were run", which reads as a block although nothing blocked it. The parenthetical is gone.

The fact inside it is kept here rather than in the file: if a build of Claude Code ships without the `Grep` tool, `Artemis` would need `Bash` in its `tools` list to search at all. No row of the table above shows such a build, so the list is unchanged.

The other causes are not ours to change in an agent file:

- A brief that asks for every file of a folder set (`agent-a935e8a5`, `agent-aac97347`) or that names a file which does not exist (`agent-a0a9f58e`) is a defect of the brief, which the parent writes for one run. `Artemis.md` already ends each run with a report of what is open, and both runs did exactly that, so the file behaved as written.
- A run that stops with no block and open files (`agent-a24cb4ee`) reported the open files and handed the decision to the parent, which is what line 21 of `Artemis.md` asks for.
- A read limit, a `Glob` cut at 100 results, a `WebFetch` cut at 100,000 characters, a timeout, and a GitHub 403 are limits outside this repository.
