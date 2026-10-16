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
| I01 | Ungrounded defaults | None | No context gives the git state. The model guessed whether a version is released. |
| I02 | Instruction decay | Partial | `sembr/slice.ts:16-19`, the `commit-msg` hook in `attribution/slice.ts:22-79`, and the rule lint in `src/kernel/rules.ts` |
| I03 | Context rot | Mostly done | The handoff (`handoff/slice.ts:41`, `handoff/domain/ground.ts`) and `autoCompactWindow` (`handoff/slice.ts:118`) |
| I04 | False completion | Partial | The `reviewer` agent exists, but nothing makes Claude call it. No gate runs at `Stop` or `SubagentStop`. |
| I05 | Specification gaming | Done | The `asks` slice |
| I06 | Sycophancy | Partial | `second_opinion` in `decide/slice.ts:17-55`, which is off |
| I07 | Destructive actions | Done | `guard`, the policy rules, and `isolation: worktree` of `implementer`. The ban in `debugger.md:24` is only a prompt. |
| I08 | Hallucinated packages | None | Nothing checks a package of an `add` or `install` command. |
| I10 | Trust boundaries | Partial | The snippet sets `allowUnsandboxedCommands: true` (`prompt/slice.ts:126`). |
| I11 | Delegation | Partial | No agent has `maxTurns`. Plugin support for the key is not confirmed. |
| I13 | Over-deferral | Partial | `usercheck/adapters/mod.ts:33-41` |
| I14 | Consent drift | None | A call that the user rejected can run again with the same input. |
| I16 | Invalid measurement | Partial | `eval-compare` has no check of the baseline score. |
| I17 | Background jobs | None | Only a prompt line (`surface/prompts/tool-agent.md:13`) |
| I18 | Harness and environment | Partial | No re-read of a file after a rejected write, and no check of the served model |
| Reads | A read of an unchanged file again | Partial | The built-in dedup of `Read` covers only the same range (D60). claudetto has no gate. |

The issues `I09`, `I12`, and `I15` have no row, because the comparison found no new mechanism for them.

The largest gaps are the end-of-turn gate (`I04`, `I06`, `I13`, `I17`) and the git state (`I01`).

## Case: The Shell That Waited 2 Hours

On 2026-10-16, a `Bash` call of a subagent ran `cat > <file>` with no input.
`cat` waited for input, and the shell ran for more than 2 hours.
`ListAgents` showed the agent as `completed`, so the agent did not see the shell.
The sandbox blocked `ps`, so the main session reported the state as unknown.
A local session has no time limit on a background `Bash` command (D59 in [Engine Facts](Decisions-Engine)).
The `background_tasks` check of the turn gate finds such a task when the harness tracks it.
A child process that the harness does not track stays a gap of `I17`.

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
   A small model reads the last reply and a summary of the tool calls of the turn.
   It answers whether the reply claims work that no check of the turn shows, promises work that the turn did not do, or opens with an apology or with agreement.
   The rubric comes from the texts in [Model Guidance](Model-Guidance), not from a word list.
   The judge is on by default, and the user can turn it off (the user, 2026-10-16).
   Each judge call costs money, so the setup and the docs give the measured cost of one call.

The gate keeps its own count of blocks in each turn, and it stops after 2 continuations.
The harness cap of 8 blocks stays as a second bound.

## Why the Old Judge Failed, and the Fix

dotclaude 0.28.0 had a `type: "prompt"` hook on `Stop`, and 0.29.0 removed it ([Stop Prompt Hooks](Stop-Prompt-Hooks)).
The new judge fixes each of its three failures:

| Failure of 0.28.0 | Cause | Fix in the new gate |
| --- | --- | --- |
| The same false claim passed after a block in 2 of 3 runs | The prompt answered `ok` when `stop_hook_active` was `true` | The gate does not use `stop_hook_active` as a pass. It judges each stop, and its own count of 2 continuations stops a loop. |
| Each block sent the whole judge prompt to Claude | Claude Code puts the hook `prompt` into the `Stop hook feedback` text | The judge runs in the hooks module (D39), and the hook returns only the reason of the judge. The gate uses no `type: "prompt"` hook. |
| Each turn cost about 6,914 more input tokens | The prompt hook sends the whole transcript | The judge gets only `last_assistant_message` and the summary of the tool calls of the turn. It runs only when the turn has a reply that is not a question. |

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
  A handoff, a compaction, or the clear of old tool results empties the record, because the content then is not in the context.
  A subagent has its own record, because it does not see the reads of its parent.
  The guard already denies a `Bash` command part that only prints a file, so `Read` is the only read path.
- **Effort:** each agent has an `effort` of at least `medium`, because Sonnet 5.5 and Haiku 5.5 skip checks at `low`.
- **Prompts:** each prohibition list of a prompt goes into the rubric of the judge, or is deleted (`prompt-audit.md:100`).

## Open Checks at No Cost

`just lab` can answer these questions before a paid run:

- Does a plugin `hooks.json` accept `type: "prompt"` and `type: "agent"` on Claude Code `2.1.301`?
- Does a plugin agent accept `maxTurns`?
- Does a mod handler on `Stop` get `background_tasks`?
- The `Stop` agent hook did not fire in `-p` (V7 in the design).
  Does the cause also apply to a command hook?
- Can a mod handler of `Read` read the `mtime` and the size of a file with no `node:` import?
- Does the mod API tell a hook when Claude Code clears old tool results?

## Related Pages

- [Model Guidance for the Turn Gate](Model-Guidance)
- [Stop Prompt Hooks](Stop-Prompt-Hooks)
- [Engine Facts](Decisions-Engine)
- [Evidence](Evidence)
