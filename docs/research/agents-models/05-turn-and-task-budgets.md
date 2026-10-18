# Turn Limits and Other Budgets in the Official Docs

## Sources

- S1: Agent SDK, "How the agent loop works" (`https://code.claude.com/docs/en/agent-sdk/agent-loop`).
- S2: Agent SDK, "Subagents in the SDK" (`https://code.claude.com/docs/en/agent-sdk/subagents`).
- S3: Agent SDK, "Track cost and usage" (`https://code.claude.com/docs/en/agent-sdk/cost-tracking`).
- S4: Claude Code, "Create custom subagents" (`https://code.claude.com/docs/en/sub-agents`).
  The last 8,547 characters of this page were not read.
- S5: API, "Task budgets" (`https://platform.claude.com/docs/en/build-with-claude/task-budgets`).
- S6: Managed Agents, "Session budgets" (`https://platform.claude.com/docs/en/managed-agents/budgets`).
- S7: Managed Agents, "Multiagent orchestration" (`https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration`).
  Not fetched in full.
  Only the limits in the local `claude-api` skill summary of this page were read.

## Findings

### What Each Limit Is For

1. `maxTurns` counts tool-use round trips only, and the default is no limit (S1).
2. S1 sample code uses `max_turns=30` with the comment "Prevent runaway sessions".
3. `maxBudgetUsd` stops the loop at an estimated spend, and it counts subagent spend (S1, S2).
4. A task budget is a token pacing hint for one agentic loop.
   S5: "Task budgets are a **soft hint, not a hard cap**."
5. A managed session budget is a hard dollar cap on one session (S6).
   It is one shared pool: "there are no per-thread caps" (S6).
6. The subagent field `maxTurns` is the only per-subagent bound in the definition (S2, S4).

### What Happens to the Work When a Limit Hits

1. Subagent `maxTurns`: Claude Code returns the output "marked as partial" (S4).
   The parent can resume it with `SendMessage`, and it keeps its full history (S2, S4).
   `Explore` and `Plan` cannot be resumed (S2).
2. Query-level `maxTurns`: the `ResultMessage` subtype is `error_max_turns` and has no `result` field (S1).
   The result still has cost, `num_turns`, and `session_id` "so you can track cost and resume" (S1).
3. `maxBudgetUsd`: subtype `error_max_budget_usd`, no `result` field (S1).
   New subagents fail with `Budget limit reached`, and background subagents stop (S1, S2).
   Spend can pass the cap by one response (S1).
4. Managed session budget: the session goes `idle` with `budget_reached` and is "not terminated" (S6).
   History and sandbox stay, and a higher budget resumes the work (S6).
5. Task budget: the model wraps up by itself, with no error event (S5).
   A too-small budget "can cause refusal-like behavior" (S5).
6. Context limit: the SDK compacts the history (S1).
   S1: "Compaction replaces older messages with a summary".
   S1 and S2 show no error subtype for a full context window.

### Does Anthropic Set a Turn Limit on Its Own Workers

1. No page that we read gives a `maxTurns` value for `Explore`, `Plan`, or `general-purpose` (S4).
2. The SDK default is no limit (S1).
3. S2 names three bounds for a subagent tree: depth, concurrency, and spend.
   The defaults are 3 layers, 20 running subagents, and no spend cap (S2).
   S2 does not list `maxTurns` among them.
4. Managed Agents bounds threads by count and depth, not by turns (S7, via local skill summary).
   The limits are 25 child threads per session and one level of delegation.

### Which Signal Best Bounds a Worker

1. Dollars are the only hard cap that covers a subagent tree (S1, S2, S6).
   S3: `total_cost_usd` includes subagents, and `usage` "undercounts as soon as nesting occurs".
2. A dollar cap is per query or per session, not per subagent (S1, S6).
3. Turns are a coarse proxy for cost.
   S5 shows that the budget counts tokens from tool results, which vary by call.
4. Task budgets do not apply here.
   S5: "Task budgets are not supported on Claude Code or Cowork surfaces."
5. S5 sizing advice is to measure, then "start with the p99 of your per-task token spend".
6. Context is bounded by compaction (S1).
   Subagent isolation is the doc answer to context growth: the parent grows "by that summary" (S1).

### Orchestration

1. Managed Agents allows one level of delegation (S7, via local skill summary).
2. Claude Code nests up to 3 layers by default, and `1` turns nesting off (S2, S4).
   To stop one subagent from spawning, omit `Agent` from its `tools` (S4).
3. S2: Opus 5 "delegates to subagents more readily than earlier models".

## Implications for the `claudetto` Agents

1. The documented default is no `maxTurns`.
   Anthropic documents depth, concurrency, and dollars for a tree, and `maxTurns` as a runaway guard (S1, S2).
2. The 5 stops on 2026-10-13 match the documented partial-return behavior (S2, S4).
   The orchestrator must check for the partial mark and resume or re-slice.
   Whether the stops were turn limits or context limits is not known (see Open questions).
3. A limit sized to a typical slice cuts the long tail of large packages.
   A safe `maxTurns` is a high backstop above the p99 turn count.
   No official source gives a number for it.
4. Only `maxTurns` is available per subagent in the definition (S2, S4).
   The plugin cannot set a dollar cap per worker.
   The user can set `maxBudgetUsd` and the depth variable for a whole run (S2).
5. Read-only agents leave no half-written files when cut.
   A cut costs a partial answer, and the parent can resume (S4).
   A cap is low risk for them.
6. Write agents lose the most when cut, because edits stay uncommitted.
   If a cap stays, the prompt must tell the worker to commit at milestones.
   This is a prompt rule and not an official feature.
7. Workers must not orchestrate.
   Omit `Agent` from each worker `tools` list (S4).
   Opus 5.x workers delegate more readily (S2), so this matters most for `planner` and `reviewer`.

## Proposed `maxTurns` by Agent

These are proposals.
No source gives the numbers.

| Agent | Proposal | Basis |
| - | - | - |
| `implementer` | Remove, or a backstop far above 61 | S1 default none, S2 partial, S4 resume |
| `debugger` | Remove, or a backstop far above 61 | S1 default none, S4 resume |
| `planner` | Keep a backstop, read-only | S1 runaway guard |
| `reviewer` | Keep a backstop, read-only | S1 runaway guard |
| `researcher` | Keep a backstop, read-only | S1 runaway guard |
| `investigator` | Keep a backstop, read-only | S1 runaway guard |

## Open Questions

1. Do `Explore`, `Plan`, or `general-purpose` have a default `maxTurns`?
   The unread end of S4 may say.
2. Does a full context window end a subagent with a partial mark, or does compaction always run first?
   S1 and S2 do not say.
3. Does `maxTurns` count turns again after a resume?
