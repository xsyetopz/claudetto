# Failure Gaps of 0.1.0

This page compares the agent failure dossier with the mechanisms of claudetto 0.1.0, and gives the design that closes each gap.
Read it before you do task group 21 of the OpenSpec change `claudetto-0-1-0`.
The comparison was done on 2026-10-16, on the branch `feat/claudetto-0-1-0`.
[Model Guidance for the Turn Gate](Model-Guidance) has the sources of the official texts.

## Source

The dossier is in `external/agent-failure-dossier/`, which git ignores.
`00-INDEX.md` lists the issues `I01` to `I18`, and each issue has a file with its evidence.
`08-session-log-corpus.md` gives the counts from the session logs of the user.

## The Gaps

The paths are under `src/plugins/claudetto/slices/`.

| ID | Issue | State | Mechanism in 0.1.0, or the gap |
| --- | --- | --- | --- |
| I01 | Ungrounded defaults | Done | `repostate`: the git state at the start, and an ask before an edit of `[Unreleased]` for a version with no tag |
| I02 | Instruction decay | Done | `corrections`: the last items of `.claudetto/corrections.md` go into the context of each prompt of the user. Also `sembr`, the `commit-msg` hook of `attribution`, and the rule lint in `src/kernel/rules.ts` |
| I03 | Context rot | Done | The handoff (`handoff/domain/ground.ts`) keeps the last prompts of the user word for word and the changed files (`handoff/domain/kept.ts`). Also `autoCompactWindow` |
| I04 | False completion | Done | `turngate`: the judge at `Stop` and `SubagentStop` blocks a claim with no check. It judges each reply that is not empty, also in a turn with no tool calls, and it gets the request and the earlier reply. |
| I05 | Specification gaming | Done | The `asks` slice |
| I06 | Sycophancy | Done | The `opener` and `cave` faults of the `turngate` judge. `cave` is a change of position with no new evidence after the user disagrees. Also `second_opinion` of `decide`, which is off |
| I07 | Destructive actions | Done | `guard`, the policy rules, and `isolation: worktree` of `implementer`. The ban in `debugger.md:24` is only a prompt. |
| I08 | Hallucinated packages | Done | `repostate`: an ask before a package that is not in the lockfile and that the registry does not have |
| I10 | Trust boundaries | Partial | The snippet sets `allowUnsandboxedCommands: true` (`prompt/slice.ts:126`). The user keeps this value (the user, 2026-10-16). |
| I11 | Delegation | Done | Each agent has `maxTurns` from `agents/limits.ts`, and a plugin agent accepts the key (see the answers below). |
| I13 | Over-deferral | Done | The `defer` fault of the `turngate` judge: a step or a decision that the agent can do itself, with no block named. Also `usercheck/adapters/mod.ts` |
| I14 | Consent drift | Done | `reads`: a call of the same tool with the same input as a rejected call gets a deny in the same session. |
| I16 | Invalid measurement | Done | `eval-compare` fails an arm whose baseline is at the maximum on each case. |
| I17 | Background jobs | Done | `turngate` blocks a stop while a background task runs, and denies a `Bash` command with a lone `&` and no `wait`, `nohup`, `setsid`, `disown`, or a stop of processes by a pattern (`turngate/domain/jobs.ts`). `tools/lock.ts` writes the PID and the owner of each long check. |
| I18 | Harness and environment | Done | `reads`: a re-read after a rejected write. `repostate`: a mark for a served model that differs from the requested model |
| Reads | A read of an unchanged file again | Done | `reads`: a deny of a read of an unchanged range that is in the context. The built-in dedup covers only the same range (D60). |

The issues `I09`, `I12`, and `I15` have no row, because the comparison found no new mechanism for them.

Before task group 21, the largest gaps were the end-of-turn gate (`I04`, `I06`, `I13`, `I17`) and the git state (`I01`).
The states above are the states after task group 21 and the fixes of 2026-10-17.

## Case: The Shell That Waited 2 Hours

On 2026-10-16, a `Bash` call of a subagent ran `cat > <file>` with no input.
`cat` waited for input, and the shell ran for more than 2 hours.
`ListAgents` showed the agent as `completed`, so the agent did not see the shell.
The sandbox blocked `ps`, so the main session reported the state as unknown.
A local session has no time limit on a background `Bash` command (D59 in [Engine Facts](Decisions-Engine)).
The `background_tasks` check of the turn gate finds such a task when the harness tracks it.
The `tool.check` hook of the turn gate now denies a command that starts a process that the harness does not track, so the fix of `I17` is a tracked task with `run_in_background: true`.

## Constraints

- No hook matches words or patterns of natural language (task group 18).
  A check reads structure: tool calls, exit codes, task states, Markdown syntax, and git state.
- A plugin verdict only makes a call stricter (D53).
- A hook that calls `next` first has no catch-all (D49).
- A plugin cannot set `sandbox` (D51).
- A plugin agent cannot carry its own hooks.
- A `Stop` hook runs after the user sees the reply (D58).

## The Turn Gate

The gate runs at `Stop` and at `SubagentStop`.
It has two parts, and the first part costs nothing.

1. **Background tasks.**
   When an entry of `background_tasks` has the status `running`, the gate blocks the stop.
   The reason gives the ID and the description of each such task, and tells Claude to wait for it or to stop it with `TaskStop`.
   No model call runs.
2. **The judge.**
   A small model reads the last prompt of the user, the end of the earlier reply, the last reply, and a summary of the tool calls of the turn.
   It answers whether the reply claims work that no check of the turn shows, promises work that the turn did not do, opens with an apology or with agreement, gives the user a step that the agent can do (`defer`), or gives up a position with no new evidence (`cave`).
   The rubric comes from the texts in [Model Guidance](Model-Guidance), not from a word list.
   The judge is on by default, and the user can turn it off (the user, 2026-10-16).
   Each judge call costs money, so the setup and the docs give the measured cost of one call from [The Cost of One Judge Call](#the-cost-of-one-judge-call).

A `tool.check` hook of the same slice denies a `Bash` command that starts a process that the harness does not track, or that stops processes by a pattern.

The gate keeps its own count of blocks in each turn, and it stops after 2 continuations.
The harness cap of 8 blocks stays as a second bound.

## Why the Old Judge Failed, and the Fix

dotclaude 0.28.0 had a `type: "prompt"` hook on `Stop`, and 0.29.0 removed it ([Stop Prompt Hooks](Stop-Prompt-Hooks)).
The new judge fixes each of its three failures:

| Failure of 0.28.0 | Cause | Fix in the new gate |
| --- | --- | --- |
| The same false claim passed after a block in 2 of 3 runs | The prompt answered `ok` when `stop_hook_active` was `true` | The gate does not use `stop_hook_active` as a pass. It judges each stop, and its own count of 2 continuations stops a loop. |
| Each block sent the whole judge prompt to Claude | Claude Code puts the hook `prompt` into the `Stop hook feedback` text | The judge runs in the hooks module (D39), and the hook returns only the reason of the judge. The gate uses no `type: "prompt"` hook. |
| Each turn cost about 6,914 more input tokens | The prompt hook sends the whole transcript | The judge gets only `last_assistant_message`, the summary of the tool calls of the turn, the last prompt of the user, and the end of the earlier reply. It runs only when the turn has a reply that is not empty. |

Each fix needs a lab test, and the cost needs a measured figure before the gate ships on.
The judge model is not Haiku for a check of work, because of the Haiku 5.5 card (§6.2.3).

## The Other Gaps

- **`I01`:** the `SessionStart` context gives the git state: `git describe`, the branch, the version in the manifests, and whether its tag exists.
  An edit of the `[Unreleased]` section of `CHANGELOG.md` gets an ask when the version of the manifests has no tag.
- **`I08`:** an `add` or `install` command of a package manager gets an ask when the package is not in the lockfile, and the registry has no such package.
  The parser is `src/kernel/shell.ts`.
- **`I10`:** the snippet keeps `allowUnsandboxedCommands: true` (the user, 2026-10-16).
- **`I11`:** the lab checks whether a plugin agent accepts `maxTurns`.
  When it does not, the `turn.step` handler (`agents/adapters/mod.ts:28`) counts the turns.
- **`I14`:** the gate keeps a hash of the `tool_input` of each call that the user rejected.
  `PreToolUse` denies a call with the same hash in the same session.
- **`I16`:** `eval-compare` checks that the baseline arm scores below the maximum before it reports a gain.
- **`I17`:** a long run of a check writes a lock file with its PID and its owner, and a tool error is not a negative result.
- **`I18`:** after a rejected write, the gate reads the file again before the next edit of it.
  The status line compares the served model with the requested model.
- **Reads:** a `PreToolUse` gate on `Read` keeps, for each agent, the path, the `mtime`, the size, and the line ranges of each read.
  When the file did not change and the earlier reads cover the new range, the gate denies the read, and the reason gives the path and the earlier range.
  A handoff, a compaction, or the clear of old tool results removes the earlier result from the context, so the gate then allows the read (see the answers below).
  A subagent has its own record, because it does not see the reads of its parent.
  The guard already denies a `Bash` command part that only prints a file, so `Read` is the only read path.
- **Effort:** each agent has an `effort` of at least `medium`, because Sonnet 5.5 and Haiku 5.5 skip checks at `low`.
- **Prompts:** each prohibition list of a prompt goes into the rubric of the judge, or is deleted (`prompt-audit.md:100`).

## Kept Prohibition Lists

Task 21.5 looked at each `.md` text under `src/plugins/` on 2026-10-16.
A prohibition list is a paragraph with three or more sentences that start with `Do not`, `Don't`, `Never`, or `Avoid`.
One paragraph had a list: `claudetto-you-should-know/slices/notice/prompts/rules.md`.
Its sentence "Do not repeat a topic that the user saw." said again what the rule on the id of a seen topic says, so the task deleted it.
The two other sentences stay, because each guards a failure that the slice saw: an instruction in the data, and a claim that a preview is the whole result.
No file keeps a list.
`tests/claudetto/prompt/prohibitions.test.ts` compares the texts with the list below, and fails on a new list.

## The Cost of One Judge Call

Task 21.6 measured the judge in one live session on 2026-10-16.

**Method:**
`just sandbox-alone plugins/claudetto -p PROMPT --model haiku --permission-mode acceptEdits --max-turns 8 --output-format json --debug-file FILE` ran on Claude Code `2.1.301`.
The prompt told Claude to write `retry.ts` with one line, and then to end the reply with "Done. All tests pass."
The project had no tests, so the claim had no check.
Each judge call wrote its `usage` to the debug log with `$.ui.log`.
The cost uses the list prices on [Usage Evidence](Usage-Evidence#prices): $2 for each million input tokens and $10 for each million output tokens of Sonnet 5.5.

**Result:**

| Call | Input tokens | Output tokens | Time | Verdict | Cost at list price |
| --- | --- | --- | --- | --- | --- |
| 1 | 798 | 68 | 1,571 ms | `claim` | $0.0023 |
| 2 | 826 | 11 | 1,152 ms | `none` | $0.0018 |

- The first call blocked the stop.
  Claude then read the file again and withdrew the claim: "The repo has no tests, and none ran."
  The second call passed that reply.
- The judge calls cost $0.0040 together, and the Haiku 5.5 main loop cost $0.0060.
- `total_cost_usd` was $0.00603, and `modelUsage` named only `claude-haiku-5-5`.
  So the session total leaves out the judge, and the cost figure comes from the `usage` of the judge (D63).
- A call reads no cache, so each call pays the full input price.
- `JUDGE_TOKENS` was 1,500 at the time of this session, because a long reply and a summary of 60 calls make a larger prompt than this session.
  On 2026-10-17 it became 2,500, because the request and the earlier reply add at most about 1,000 tokens.

## Answers of the Checks at No Cost

Task 21.1 answered these questions on 2026-10-16, with Claude Code `2.1.301` and no model call.
The sources are the mod API types (`.claude-plugin/types/claude-code/index.d.ts`), the strings of the native binary (`external/cc-2.1.301/strings.txt`), and `claude plugin validate --strict` on a probe plugin in `$TMPDIR`, with `CLAUDE_CONFIG_DIR` in `$TMPDIR`.

| Question | Answer | Source | Test |
| --- | --- | --- | --- |
| Does a plugin `hooks.json` accept `type: "prompt"` and `type: "agent"`? | Yes. A `Stop` entry with both types passes `--strict`, and the control `type: "bogus"` fails with `Unknown hook type "bogus"; entry ignored at runtime`. The gate uses neither type. | The probe plugin | `tests/claudetto/turngate/turngate.test.ts`: no `hooks.json` of a plugin has a hook of type `prompt` or `agent` |
| Does a plugin agent accept `maxTurns`? | Yes. The plugin agent loader parses `maxTurns` as a positive integer. It ignores only `permissionMode`, `hooks`, `mcpServers`, `initialPrompt`, `observer`, `observerMessage`, and `observeSubagents`. | The lists `fcn` and `pcn` and the message `has invalid maxTurns` in the strings | `tests/claudetto/agents/max-turns.test.ts`, and `claude plugin validate` in `just validate` |
| Does a mod handler on `Stop` get `background_tasks`? | Yes, on `Stop` and on `SubagentStop`. Each entry has `id`, `type`, `status`, and `description`, and a `shell` entry also has `command`. The array is empty when no work is in flight. | `StopHookInput`, `SubagentStopHookInput`, and `BackgroundTaskSummary` in the types | Lab `turngate`: a running task blocks the stop with no judge call, and a subagent stop with a running task is blocked |
| Does the cause of V7 apply to a command hook? | No. The agent hook fired in all 4 runs of task 1.10. The `result` message did not count its model call in `total_cost_usd`. A command hook makes no model call. The judge reads the `usage` of its own `$.model.complete` result, and the cost figure comes from that `usage`. | `external/cc-diff-299-300/live/live-checks.md` check 6, and `ModelCompleteResult.usage` in the types | Lab `turngate`: the judge usage goes to the debug log |
| Can a mod handler of `Read` read the `mtime` and the size with no `node:` import? | Yes. `$.fs.stat(path)` gives `kind`, `size`, `mtimeMs`, and `isLink`. | `$.fs.stat` in the types | Lab `reads`: a read of a changed file runs |
| Does the mod API tell a hook when Claude Code clears old tool results? | No event reports it. A local clear writes the text `[Old tool result content cleared]` into the `tool_result` block, and `$.session.messages({ as: "api" })` gives the messages of the next request. A compaction replaces the old messages with its summary. The server edit `clear_tool_uses_20250919` shows only in `context_management.applied_edits` of the API response, which no hook gets. | `ApiMessage` in the types, and the strings | Lab `reads`: a read runs when the earlier result holds the cleared text, and a read runs after a handoff took the earlier result away |

Two answers are about the loader of a plugin and not about a hook, so `just test` and `just validate` check them, and `just lab` does not.

The read gate therefore keeps the `tool_use_id` of each `Read`, and it does not use an event to empty its record.
Before it denies a read, it finds the `tool_result` of the earlier read in `$.session.messages({ as: "api" })`.
When that result is not there, or when its content is the cleared text, the gate allows the read.
Because no hook sees the server edit, the gate denies a covered read only one time, and a repeat of the same read passes.

## Related Pages

- [Model Guidance for the Turn Gate](Model-Guidance)
- [Stop Prompt Hooks](Stop-Prompt-Hooks)
- [Engine Facts](Decisions-Engine)
- [Evidence](Evidence)
