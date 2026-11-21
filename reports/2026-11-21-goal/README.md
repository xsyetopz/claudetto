# /goal in Claude Code 2.1.330: mechanics, field problems, plugin fixes

Scope: evidence base for letting claudetto users control `/goal`. Facts come from the installed 2.1.330 binary (cc-inspect, `module:offset`, offsets are raw character offsets into the module) and from `~/.claude/projects/*/*.jsonl` read this session (the current session's own log excluded). Items marked **(inferred)** were not run or read directly.

## 1. How /goal works (2.1.330)

### 1.1 The command
- `/goal` is registered twice: a `local-jsx` entry (`argumentHint: "[<condition> | clear]"`, `immediate: true`) and a `local` entry with `supportsNonInteractive: true`, description "Set a goal — keep working until the condition is met", `isEnabled: ()=>Se()||Hn()` (chunk-6em0cdq0.js:~700-1080).
- Handler (chunk-8yn0h89b.js:~7600-8500, readable view):
  - empty args: prints `Goal active: <cond> (<n> turn(s) | not yet evaluated)`, `Last check: <lastReason>`, or the paused form with "Claude's reason".
  - `clear` (keyword test `Kdn`): removes the goal, prints `Goal cleared: <cond>`.
  - longer than `OBn` characters: `Goal condition is limited to N characters`.
  - otherwise `qdn(cond)` then returns a model query: value `Goal set: <cond>`, prompt `fwo(cond)`.
  - a message relayed over Slack/Teams/bridge is refused (`Swl`), so a relayed `/goal` never sets or clears.
- Prompt text sent to the model (`fwo`, chunk-ch6321bk.js:~3400): "A session-scoped Stop hook is now active with condition: "<cond>". Briefly acknowledge the goal, then immediately start (or continue) working toward it ... The hook will block stopping until the condition holds. It auto-clears once the condition is met ...".

### 1.2 Storage
- `qdn` (chunk-ch6321bk.js:~3700): supersedes any prior goal, removes every prior goal Stop hook, then `sessionHooksRegistry.add(sessionId, "Stop", "", {type:"prompt", prompt: condition})` and sets `appState.activeGoal = {condition, iterations:0, setAt, origin, tokensAtStart}`. Origin is `user`, or `proposal_direct` / `proposal_approved` for model proposals.
- So a goal is a session-scoped, in-memory `prompt`-type Stop hook plus an `activeGoal` record. It is not a settings file. `/goal clear` is `Ydn` (same module): removes the hook, clears `activeGoal`.
- Preconditions (`Svr`, same module): refused when hooks are restricted (`disableAllHooks` or `allowManagedHooksOnly`), when org settings are unread, or in an untrusted workspace.
- The transcript records `attachment.type="goal_status"` rows (`met`, `failed`, `sentinel`, `condition`, `reason`, `iterations`, `durationMs`, `tokens`). Sentinel rows mark set/clear.

### 1.3 Who decides "met": an evaluator model, never the agent
- The evaluator is the generic prompt-hook model call (chunk-bzyb60p0.js:5277847-5279000). System prompt: "You are evaluating a stop-condition hook ... Read the conversation transcript carefully, then judge whether the user-provided condition is satisfied." It answers JSON `{ok:true|false, reason}` or `{ok:false, impossible:true, reason}`. "If the transcript does not contain clear evidence ... return {ok:false, reason:'insufficient evidence in transcript'}". `impossible` is for self-contradictory or unavailable conditions, and "the assistant claiming the goal is impossible is evidence, not proof".
  - It runs with `tools: []`, thinking disabled, a 30 s default timeout (`_0(e,30000)`).
  - It sees only the transcript. It cannot run commands or read files (the SetGoal prompt says so too, chunk-x1z3yh1m.js:~1000-2400).
- Result handling at turn end (chunk-k5r71ad2.js:134500-139000):
  - `hook_success` for the goal hook: clears `activeGoal`, `goalPass = impossible ? "impossible" : "met"`, emits `goal_status{met:true}` ("Goal achieved") or `{met:false, failed:true}` ("Goal couldn't be achieved"). (:136541)
  - `blockingError` (ok:false): adds a meta user message (`IMn(blockingError)`), bumps `activeGoal.iterations`, stores `lastReason`, emits `goal_status{met:false}`. That is the "Goal not yet met… continuing" row (renderer chunk-zprqxvft.js:140788). (:136700)
  - The row text in the transcript the model reads is `Stop hook feedback:\n[GOAL: <cond>] ...` (log: OpenJoystickDriver/5b76d54d:3946).
- **The model cannot mark the goal met.**
  - `SetGoal` can only set (it refuses a "clear" condition: "SetGoal cannot clear a goal", chunk-nfshrby1.js:~10900).
  - `PauseGoal` can only pause ("You cannot clear the goal yourself", chunk-f6abynt8.js:~900).
  - `GetGoal` is read-only.
  - The only writers of `met:true` are the evaluator path above and the user's `/goal clear`.
  - SetGoal's own prompt says "It clears by itself once met" (chunk-x1z3yh1m.js).

### 1.4 Tools
| Tool | Where | Behaviour |
|---|---|---|
| `SetGoal` (alias `ProposeGoal`) | chunk-nfshrby1.js:10406-13856; names/prompt chunk-x1z3yh1m.js | `condition` ≤500 columns after canonicalization, `ask_user` default true. Main loop only ("cannot be used in agent contexts"); refused in plan mode; refused when the evaluator is blocked (`Svr`). `ask_user:false` sets it at once with a transcript notice "Claude set a goal · /goal clear ends it". While a goal is active the user is always asked. Approval enqueues `Goal set: <cond>` as an auto-continuation. Decline is silent. |
| `PauseGoal` | chunk-wz730a7k.js:6000-10314; prompt chunk-f6abynt8.js | `reason` ≤500 chars. Errors: no goal, already paused, or goal set this turn and unchecked. Sets `paused`; prints "Goal paused · send a message to continue, or run /goal clear". Evaluator still runs and still ends a goal it finds met or impossible, but does not send the model back until the next user message. |
| `GetGoal` | chunk-k8rx3pya.js:9630; name chunk-0ty8qx28.js | Returns `Session goal: <cond>`, paused flag, and "The evaluator's last reason it isn't met". |
- Enablement `Sgt()` (chunk-3rzdsfp6.js:389): `if(Se()||Hn()) return; if(gh()) return; if(Qt()) return; if(!tengu_propose_goal) return; mode = mut(); return mode==="disabled" ? undefined : mode`. SetGoal/PauseGoal need `Sgt() !== undefined`. `Se/Hn/gh/Qt` are session-shape predicates in other modules not decoded here, so the exact session shapes are **inferred**: "interactive local sessions that have /goal" per the SetGoal error text. All three tools are `shouldDefer` (loaded through ToolSearch).
- Setting `modelProposedGoals` = `auto` (default) | `alwaysAsk` | `disabled` (chunk-2yx6c1y2.js:136390 `mut`/`qJi`; schema chunk-xcgcdx61.js:279979, marked `@internal`; "restrictive" values `disabled`/`alwaysAsk` listed in chunk-8hfdvrr1.js:3442 and the managed-only list at :5393). `disabled` removes the tools; the user's own `/goal` still works.

### 1.5 The Stop-hook block cap
- chunk-k5r71ad2.js:305712-306450: when Stop hooks return blocking errors, `at = stopHookBlockingCount+1`; `cap = env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP ?? 8`; if `cap>0 && at>cap` the loop emits the warning and ends the turn with `{reason:"completed", goalPass}`. Default 8 means the **9th** consecutive block trips it, matching "9 consecutive times". Setting `0` disables the cap (`zt>0` test).
- Warning text `UVa` (chunk-bzyb60p0.js:2444944): "A hook blocked the turn from ending N consecutive times—overriding and ending turn. For Stop/SubagentStop hooks, check stop_hook_active ... Set CLAUDE_CODE_STOP_HOOK_BLOCK_CAP to raise this limit."
- The cap counts every Stop/SubagentStop block (goal evaluator and plugin/settings hooks alike). Telemetry `tengu_stop_hook_block_count{goal_active}`.
- After the cap, `goalPass:"not_met"` maps through `uS` to `pause / goal_check_capped` (chunk-k5r71ad2.js:149611); the user sees "Goal paused · goal checks kept finding it unmet this turn · send a message to continue". Log proof: 5b76d54d:3949-3950.
- Other interruption mappings (`dS`, :145870-149600): `stop_hook_prevented`/`hook_stopped` pause (`hook_stopped`); context-limit terminal reasons stop the goal; API errors retry; evaluator timeout (`cancelled`) pauses (`goal_check_timeout`); evaluator error retries (`goal_check`); auth/billing stop the goal.

### 1.6 Background work defers evaluation
- chunk-k5r71ad2.js:131500-134500: if any background agent or shell is running (`op(taskRegistry.all())`), the goal Stop hook is removed for that stop, "[goal] evaluation deferred — background work still running", `goalPass:"deferred"`, and a check-in schedule (`bu`) sets `deferredSince`, `checkinCount`. A check-in meta message wakes the session.
- Check-in interval: `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` (int 0-10080, default 30; `0` disables) via `ri()` (chunk-k5r71ad2.js:15404; env registry chunk-c203g5kd.js:32525), behind gates `tengu_saffron_wren` and `tengu_pewter_avocet`. Backoff `e*2**min(count,2)`.
- Consequence: a session that launched background work looks "idle but not done" for up to 30 minutes per check-in, then 60, then 120. **(inferred from `Su`, `Fy=120`)**

### 1.7 Everything that touches goals
- Env: `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` (default 8), `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` (default 30). `surface env GOAL` finds only the latter by name.
- Setting: `modelProposedGoals` (internal).
- Hook events: `Stop`, `SubagentStop` (input `stop_hook_active`, `background_tasks`, `session_crons`, `last_assistant_message`, d.ts:16304-16318). Goal evaluation is main-loop only (`!h.agentId`, :134500).
- Feature gates: `tengu_propose_goal`, `tengu_quartz_pipit` (stop goal on context-limit), `tengu_saffron_wren`, `tengu_pewter_avocet`, `tengu_mellow_sunset`.
- Telemetry: `tengu_goal_proposed|proposal_decided|achieved|failed|evaluated|interruption|stop_hook_added|removed`.

### 1.8 What a plugin can reach (plugin API types: `plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts`)
The types file contains **no** occurrence of "goal" (case-insensitive grep returned nothing). Nothing is typed for goals; every route below goes through generic events.
| Surface | Evidence | Reach |
|---|---|---|
| `command.run` hook, `{command:"goal"}` | d.ts:2199-2260 (input `command`, `args`, rewrite args with `next({...e,args})`, or answer with `{text}` to run nothing), :5403-5414 | Intercept or rewrite `/goal <cond>` and `/goal clear`. Documented for "one slash command about to run"; built-in coverage is **inferred**, not probed. A `command.run` hook returning `{text}` without `next` replaces the run (so the goal is not set and `fwo`'s query never fires). A rewritten `args` reaches the handler at chunk-8yn0h89b. The type says `command` itself cannot be rewritten. |
| `$.command.run({command:"goal", args:"clear"})` | d.ts:3759-3775 | A plugin can clear or set a goal as if typed. It rejects "inside a hook the turn waits on ... past a Stop" so not from a Stop hook; use a tool or `turn.complete` instead. **(inferred; unprobed)** |
| `$.command.register({name:"goal"})` | d.ts:3776-3790 | Refused: "a built-in's name is refused". A new name (e.g. `/goalx`) works. |
| `tool.call` hook, `{tool:"SetGoal"}`, `"PauseGoal"`, `"GetGoal"` | d.ts:4986, 17727-17738 (`BuiltinToolCallInput | McpToolCallInput`, matcher is a string), `ToolCallResult` :17778-17838 | Can `deny` text, rewrite input (e.g. force `ask_user:true`, shorten the condition) or answer with a result. The three names are not in the typed builtin list, so typed rewrite/narrowing is not available; runtime matching by string is **inferred**. |
| `tool.offer` | d.ts:5372-5400 | Hide SetGoal/PauseGoal from the model: `on("tool.offer",{tool:"SetGoal"},()=>({isOffered:false}))`. `$.tool.register` (d.ts:3743) adds a plugin tool, e.g. an own `CompleteGoal` that calls `$.command.run goal clear`. |
| `classic.Stop` / `classic.SubagentStop` | d.ts:1639-1665, 1683-1701, 1781, 16299-16318 | Results are `block`, `preventContinuation`, `stopReason`, `additionalContext`. A plugin Stop hook cannot edit, skip or read the evaluator's verdict. It sees `background_tasks` and `stop_hook_active`. Its own blocks count toward the 8 cap. Whether the session-scoped prompt hook also reaches `classic.Stop` is **inferred no**. |
| `session.append` with `door:"hook-context"` / `"notice"` / `"attachment"` | d.ts:14203-14310, :5823 | Can rewrite the content of the `Stop hook feedback:\n[GOAL: ...]` row before the model reads it (content is rewritable, `type`/`role` pinned). Whether that row's door is `hook-context` is **inferred**. |
| `turn.complete` | d.ts:5958 | Observe turn end; return `{text}` to show beneath the answer. Cannot change goal state. |
| `env.set` | d.ts:9121, 6250 | `$.env.set("CLAUDE_CODE_STOP_HOOK_BLOCK_CAP", "0")` or `CLAUDE_CODE_GOAL_CHECKIN_MINUTES`. Whether the engine reads `process.env` live (code reads `s.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` at :305712, `s` is an env proxy) is **inferred yes**, untested. |
| `config.set` | d.ts:5440 | `modelProposedGoals` is internal; whether `$.config.list` exposes it is **unchecked**. |
| Evaluator prompt text | chunk-bzyb60p0.js:5277847 | Not reachable: hard-coded in the prompt-hook runner, no event. `turn.step` would see the evaluator's request only if it is raised as a loop turn, which it is not (`isNonInteractiveSession:true`, own query). **(inferred)** |

## 2. Field problems from session logs

Corpus: 2,439 jsonl files excluding this session (2,080 are subagent files), 6.3 GB. Search tool: ripgrep. "Goal not yet met" never appears in the logs because it is a UI row. The record is `goal_status` attachments, so counts below come from those.

Totals of `attachment.type=="goal_status"` (667 lines): 491 sentinel (set/clear markers, duplicated across resumes), **166 not-met**, **9 met**, **1 failed** ("impossible"). So about 95% of evaluated checks were negative; only 9 goals ever finished by the evaluator. Goals with the most not-met rows: bun-next/3b2f4de1 (22), claudetto/5ec39a40 (17), claudetto/2cf55002 (16), OpenJoystickDriver/67b8c6d8 (15), claudetto/a44ff7e7 (12), www-clawdipedia-cc/276bb505 (11).

| # | Failure pattern | Count | Citations | Excerpt |
|---|---|---|---|---|
| G1 | Evaluator keeps saying not met while the agent has stopped and waits for the user | 4 assistant turns with "no more changes ... end the /goal" in 1 session; not-met checks in that session (count not verified) | OpenJoystickDriver/5b76d54d-7aef-4d11-89fb-ab2abbf65a65.jsonl:3913, :3923, :3945 | "I'm making no more changes. To unblock it, send the ZD O+ result or the owner's Input Test result, or end the `/goal`." |
| G2 | 9-block cap override, then auto-pause | 1 real firing (3 other hits are subagents quoting the binary source) | 5b76d54d:3949 (informational row), :3950 (pause row) | "A hook blocked the turn from ending 9 consecutive times—overriding and ending turn." then "Goal paused · goal checks kept finding it unmet this turn · send a message to continue" |
| G3 | Goal names a path that never existed; evaluator then refuses | 1 () | 5b76d54d:3941 | "The DONE condition requires that `.scratch/ojd-zd-report` be deleted, but that path never existed in the checkout; only /tmp/ojd-work/zd-report was removed." The agent also said "never existed in this checkout" at :3923 and :3945. |
| G4 | Evaluator judges from the transcript only, so work done but not echoed in conversation counts as unmet | 128 of 166 not-met reasons cite the transcript or missing evidence (regex over reasons) | (line not re-verified after compaction; see 2cf55002 not-met rows) | "The transcript does not show the condition satisfied. The required 2.1.327 plan redesign is only partly evidenced ..." |
| G5 | Agent believes it must mark the goal complete itself, and cannot | 1 explicit sentence found | claudetto/2cf55002:6656 | "The plan isn't ready yet, so I'm not marking the goal complete." (Code: no tool can mark met, see 1.3.) |
| G6 | Goal paused because the API rejected the last request | 7 rows in 3 sessions of imboredsoletsbreachit | imboredsoletsbreachit/ed1d2cf8-5a1d-4887-a5a5-ee53d3208ea5.jsonl:67; f89f1364-4024-449d-869a-e80009656dd8.jsonl:109 | "Goal paused · the API rejected the last request · send a message to continue, or run /goal clear" |
| G8 | Wake-up gaps while evaluation is deferred by background work | not countable from logs (no row records deferral); see 1.6 | chunk-k5r71ad2.js:131500-134500 | "[goal] evaluation deferred — background work still running" (debug log only) |

Notes on G1: the agent behaved as the PauseGoal prompt asks (real blocker, wait for the user), but the evaluator is still consulted at each stop and returns `ok:false`, so the turn is re-prompted until the cap. `PauseGoal` exists but the agent used plain text; the tool is deferred and only offered when `Sgt()` is defined, **inferred** not offered in that session (the gate is server-side).
Notes on G3: the condition references a path the evaluator cannot check; it judges from text alone, so "deleted a path that never existed" can never be satisfied or declared impossible unless the evaluator chooses `impossible`.

## 3. Non-goal patterns from the same logs

| Pattern | Count | Citations | Excerpt |
|---|---|---|---|
| "Concurrent subagent limit reached" | 69 refusals (tool_result rows) in 7 files; 44 in one OpenGNG session | OpenGNG/4055b42f-dd45-4acd-8be7-f112139abee8.jsonl:1464; claudetto/9e3ba24c-bf25-4881-a934-d2a0964a48fc.jsonl:316, :320 | "Concurrent subagent limit reached. You can run 3 subagents at once. Do not retry. If the user wants more concurrent subagents, ask them to increase CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS." |
| Retry after that refusal | 1 retry within 7 rows in the strict check (claudetto/5ec39a40/subagents/agent-a972f6ddfa83f28ec.jsonl:225). Later relaunches in the OpenGNG session (44 refusals across ~30k rows) are **inferred** retries | | the message itself says "Do not retry" (chunk-kb3nnh8q.js:70165) |
| "Autocompact is thrashing" | 16 assistant final texts in 16 subagent files; 13 more string rows in 3 files (relays or quotes); 1 tool result is a Reddit article quote (not a real hit) | GodHand/4ec97367.../subagents/agent-a558b31912a1b0fe9.jsonl:250; agent-aa3ac0c79614619de.jsonl:776 | "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row. A file being read or a tool output is likely too large ..." (engine: chunk-bzyb60p0.js:2230519, trips at 3 rapid refills `PJo=3`) |
| Subagents running for hours | Of 2,080 subagent files: 95 span more than 1 h first-to-last row. Within a subagent, 6 have a gap over 1 h between consecutive rows and 62 have a gap of 5 min to 1 h (each gap is past the 5 m prompt-cache TTL, so the next call is a cold read). | GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded/subagents/agent-abd96494d46069bd7.jsonl (10.7 h); GodHand/4ec97367-fe41-4682-9a87-42689ea384b4/subagents/agent-a0f87a98d2948ed52.jsonl (1.4 h gap) | Span is row timestamps, so a paused or resumed subagent counts. The 5 m / 1 h TTL values are the user's figures, not re-read here. |
| Background command whose trailing echo hid the exit code | 127 of 1,742 background Bash calls end in `; echo <word>` without `$?` | claudetto/a44ff7e7-da3e-44a9-93c9-262aa488bb37.jsonl:283, :2372; claudetto/a2b25198-f2ba-43aa-865f-98e322681cbf.jsonl:3313 | `... > batch1.log 2>&1; tail -3 batch1.log`; `... | grep -v ... > van.txt; echo done`. A shell returns the last command's status, so a failure upstream exits 0. This is shell semantics; the completion notice for these was not individually inspected. |
| Chained commands hiding a failure | 33 strict cases in 26 files (not `is_error`, no `$?`, no `set -e`, a `;`-chain ending in echo, output containing a failure marker). Lower bound. | claudetto/5ec39a40-e3d5-4f0b-a8ac-97f52d27fa0f.jsonl:10278, :15516 | `ls $TMPDIR/reqs/out/clm-van-1 2>&1; echo $TMPDIR` => "No such file or directory ... /tmp/claude-501" |
| For scale | 186,100 Bash calls, 1,742 run in background | | |

## 4. Recommendations: what a plugin can fix and what it cannot

| Problem | Fix a plugin can ship | API support | Limit |
|---|---|---|---|
| G1 waiting but evaluator says not met | (a) `tool.call` or `command.run` guard that, when the agent has said it is blocked, calls `/goal` pause semantics: none directly, so use a plugin tool `GoalPark` that calls `$.command.run({command:"goal", args:"clear"})` after the user confirms; (b) a `classic.Stop` hook cannot override the evaluator, but a `session.append` rewrite of the `Stop hook feedback` row can add "if blocked on the user, call PauseGoal" text; (c) `tool.offer` can make sure PauseGoal stays offered. | `$.tool.register` d.ts:3743; `$.command.run` :3759; `session.append` :14203; `tool.offer` :5372 | The evaluator itself is not reachable. `$.command.run` is rejected inside a Stop hook (d.ts:3764-3766). Engine limit 2.1.330: the evaluator runs on every stop unless the goal is paused. |
| G2 9-block cap | Set `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` higher through `$.env.set` at `session.start`, or advise users to export it. Raising it lengthens the loop of G1, so pair it with a G1 fix. | `env.set` d.ts:9121; code reads it at chunk-k5r71ad2.js:305712 | Live read through `$.env.set` is inferred. The cap is engine-fixed at 8 when unset; `0` removes it. |
| G3 goal names a nonexistent path | `command.run` hook on `goal` that validates path-like tokens in the condition against `$.fs`/cwd and answers `{text}` ("path X does not exist") instead of setting. Same guard on `tool.call` for `SetGoal`. | `command.run` d.ts:5403-5414; `tool.call` :4986 | Validation is a heuristic over free text. Built-in `/goal` interception is inferred, not probed. |
| G4 evaluator sees only the transcript | A `command.run` rewrite appends "Prove each check in the conversation: print the command and its output" to the condition, within the cap (`OBn`, 500 for SetGoal, chunk-nfshrby1.js). A `classic.Stop` hook cannot add evidence for the evaluator. | `command.run` rewrite args, d.ts:2208-2210 | Engine limit: evaluator has no tools and no file access (chunk-bzyb60p0.js:5277847). Not fixable in the plugin beyond prompt discipline. |
| G5 agent cannot self-complete | Ship an own `CompleteGoal` tool through `$.tool.register` whose handler requires proof, then calls `$.command.run({command:"goal", args:"clear"})`. Hide `PauseGoal` ambiguity with `tool.offer`. | `tool.register` d.ts:3743; `command.run` :3759 | Engine limit: no built-in tool marks a goal met; only the evaluator or the user can (chunk-k5r71ad2.js:136541). Self-completion bypasses the independent check by design, so make it opt-in. |
| G6 API-rejected pause | Observe with `turn.complete` / `classic.StopFailure` (d.ts:5958, 16296) and notify the user; resume needs a user message. | `turn.complete` :5958 | Engine limit: a paused goal resumes only on a user message (chunk-k5r71ad2.js:145870). |
| G8 deferred evaluation | Set `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` via `env.set`; a `classic.Stop` hook sees `background_tasks` (d.ts:16312) and can tell the model what it waits on. | `env.set` :9121; `StopHookInput` :16304 | Interval and backoff are engine-side. |
| Subagent concurrency limit | `agent.spawn` hook can queue or deny with a clear message (`{deny: reason}`, d.ts:5189 area); set `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` via `env.set`. The engine refusal already says "Do not retry"; add a hook that serialises launches. | `agent.spawn` :5189; `env.set` :9121 | The refusal is in `Agent` tool code (chunk-kb3nnh8q.js:70165) and runs before or beside the hook; whether the cap is read live from env is inferred. |
| Autocompact thrashing | `tool.run`/`classic.PostToolUse` truncation of oversized tool output (`updatedToolOutput`, d.ts:1740-1745 region) and a Read-size guard. | `ClassicResult.updatedToolOutput` (ClassicResultFields.PostToolUse, d.ts:1775) | The thrash trip (3 rapid refills) is engine-fixed (chunk-bzyb60p0.js:2230519). A plugin only removes the cause. |
| Subagents over 5 m / 1 h gaps | `agent.spawn` could cap scope; nothing keeps a cache warm. | `agent.spawn` :5189 | Not fixable from a plugin: cache TTL is a server property. Mark as engine limit (2.1.330, evidence: 62 + 6 subagents with 5 m-1 h+ gaps). |
| Background command hiding exit code | `tool.call` rewrite for `Bash`: when `run_in_background` and the command ends in `; echo x` without `$?`, rewrite to `...; echo "exit=$?"`; or `deny` with that advice. | `tool.call` input rewrite, d.ts:17727-17738 | A rewrite changes the user's command; make it a warning in `additionalContext` first. |
| Chained commands hiding failure | `classic.PreToolUse`/`tool.call` check for `;`-chains with a trailing echo and no `set -e`/`$?`; advise `&&` or `set -e`. | `tool.call` d.ts:4986 | Heuristic; false positives on intentional `;`. |

## 5. Unverified items to probe before building
1. Does `command.run` fire for built-in `/goal` (rewrite and `{text}` answer)? Probe with a plugin hook in `cc-inspect cli`.
2. Do `tool.call` / `tool.offer` match `SetGoal`, `PauseGoal`, `GetGoal` (not in the typed builtin list)?
3. Does `$.env.set` change `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`, `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` or `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` live?
4. Which `session.append` door carries the `Stop hook feedback:` row?
5. Exact predicates `Se/Hn/gh/Qt` that gate the goal tools.

## 6. Probe results (Claude Code 2.1.330, fake API, no paid calls)

Harness: a throwaway plugin that logs each event through `$.ui.log` to the debug file, a local fake Messages API that answers scripted turns and a scripted haiku evaluator, run with `claude -p ... --plugin-dir` (kept in `/tmp/claude-501/gp670`, not in the repo). Origin of `/goal` in `-p` is `sdk`.

| # | Hypothesis | Check | Result |
|---|---|---|---|
| P1 | `command.run` fires for the built-in `/goal` | log the event on `-p "/goal the file x exists"` | Fires with `command: "goal"`, `args` as typed, `origin.kind: "sdk"`. |
| P2 | A `command.run` hook can refuse | return `{ text }` for args containing REFUSE | The goal is not set, no model or evaluator request is made, the text is the output. |
| P3 | A `command.run` hook can rewrite args | `next({ ...e, args: "rewritten condition" })` | The evaluator request and the `Stop hook feedback` row carry `rewritten condition`. |
| P4 | `tool.call`, `tool.offer`, `tool.describe` see SetGoal, PauseGoal, GetGoal | log the three events with a name filter | Not testable here: the fake-API session lists no goal tool (they are server-gated, `tengu_propose_goal`). The three events do fire for a plugin tool (`mcp__gp__probe_clear`). So claudetto serves its own tools and sends `tool.offer` `isOffered: false` for the built-in names. |
| P5 | `$.command.run("goal", "clear")` works from a plugin tool | tool handler starts a timer, the timer runs the command | Returns `Goal cleared: the file x exists` after the turn ended; `No goal set` when none. Not usable inside the tool run (the turn waits), so the clear lands after the turn. |
| P6 | `$.env.set` of `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` takes effect live | set 2 in a `command.run` hook before the goal | Baseline: 9 model requests, cap warning at the 9th block. With 2: 3 requests, warning "3 consecutive times". `env.get` reads back `2`. Live. |
| P7 | `$.env.set` of `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` takes effect | set 7 | Set and accepted; effect not observable (needs background work, 30-minute scale, server gates). Unproven. |
| P8 | `classic.Stop` sees a goal prompt-hook block | log each Stop | Fires on every stop; from the second on `stop_hook_active` is true and `last_assistant_message` is the model's text. It carries no evaluator verdict, and cannot raise the cap. The reason reaches the model as a `note` row, which `session.append` sees. |

Reading of P4 against the lead's ruling (2026-11-21): the built-ins are missing in the sessions that can be probed for free, so claudetto registers `get_goal`, `set_goal`, `pause_goal` and `clear_goal` (`mcp__claudetto__*`).

## 7. What shipped, and what stays a recommendation

Shipped in `plugins/claudetto/hooks`: `goal/` (tools, `/goal` path warning, stop-cap note), `delegation/limit.ts` (subagent limit refusal that says to wait), `guards/shell/notes.ts` (background `; echo`, pipeline and chain hiding a failure, zsh word splitting). Tests: `claude plugin test plugins/claudetto`.

Recommendations only:

| Problem | Recommendation |
|---|---|
| Thrashing autocompact | Cap tool output before it lands (`bashOutputMaxChars` is set; add a Read-size note). The 3-refill trip is engine-fixed. |
| Long-running subagents | Give each spawn a bounded scope in the prompt; the cache TTL is a server property. |
| jscpd laziness | A hook cannot judge intent; put the duplicate-removal rule in the Heracles agent text and the verify recipe. |
| Editing bedrock-owned files | A `tool.check` hook denying edits under `justfile`, `.just/` and the shared configs is cheap, but the owner list belongs to bedrock; propose it there. |
| Two changes in one commit | Not detectable from a hook with certainty; a commit-time note listing staged top-level directories is the cheap form. |
