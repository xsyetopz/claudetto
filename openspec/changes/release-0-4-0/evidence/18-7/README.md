# 18.7: deferred-tool reliability

Hypothesis: with `Read`, `Write`, `Skill` and `ListAgents` held back (tasks 5.21 and 5.22), the model still loads the tool by `ToolSearch` and calls it when a task needs it, about as often as it calls the same tool when it is sent in full.
Prediction: the change arm reaches in at least 90% of sessions, and the difference from the base arm is not significant at 32 sessions per arm (Fisher p > 0.05). The likeliest misses are `Read` and `Write` tasks that the model does with `Bash` (`cat`, `echo >`) and never loads the tool.

Which tools are deferred (read from `plugins/claudetto/hooks/surface.ts`, 2026-11-07):

```ts
export const DEFERRED_TOOLS: readonly string[] = [
	"Read",         // line 15
	"Write",        // line 16
	"Skill",        // line 17
	"ListAgents",   // line 18
```

and the `tool.describe` hook (lines 184-196) returns `{ ...answer, description, isDeferred: true }` for every name in that list. Read and Write are deferred by this plugin only: stock Claude Code 2.1.319 sends them in full. A free fake-API probe confirms it: the first request's `tools` were `Agent, Bash, Edit, ToolSearch` (+ the engine's `DeferredToolPlaceholder`) with the plugin, and `Agent, Bash, Edit, ListAgents, Read, ReportFindings, ScheduleWakeup, Skill, ToolSearch, Workflow, Write` without it. `SendMessage` is also deferred by 5.21 but needs a live agent to address, so it has no case here.

Design: 8 cases in `cases.json` (2 each for `Read`, `Write`, `Skill`, `ListAgents`), natural wording that never names a tool except the skill name, 4 rounds per case, so 32 sessions per arm, 64 in all, Sonnet 5.5 (`claude-sonnet-5-5`), `-p --output-format stream-json --verbose --no-session-persistence`, `--permission-mode acceptEdits`, `--setting-sources project,local` with a fresh `CLAUDE_CONFIG_DIR` and no user settings, the case's workspace under `/tmp/probe-18-7/runs/`. The change arm adds `--plugin-dir plugins/claudetto` (copied per session by `materializeArm`). The arm check reads the `init` frame: `claudetto` is loaded in change and absent in base, and the model is as asked.

Reach is judged from the stream-json transcript: the session reached when it called the case's tool and that call's `tool_result` was not an error. The log also counts sessions that called the tool at all, and sessions with a `ToolSearch` call that names it. In the base arm the tools are sent in full, so no `ToolSearch` is needed there.

The probe is `probe.ts`, which imports the runner (ab, launcher, ledger, workspace, fake) from `/tmp/claudekit-leftovers/claudekit` (the tool task 17.13 removed) and keeps one ledger at `/tmp/probe-18-7/ledger.jsonl`. Each session is killed at 300,000 tokens. The probe stops its fake APIs on every exit path (`exit`, `SIGINT`, `SIGTERM`, `SIGHUP`).

Free count on the fake API (`--dry --n 1`, 16 sessions, rc 0; the fake answers with one call of the case's tool; the dollar figure it prints is the fake's token estimate, not spend): the change arm reached 0/8 because its fake called a tool it had not loaded, and the base arm called the tool in 8/8 sessions, so the two arms differ in what they send, as designed.

Command (run once from the repo root, in the background; `.env` was passed to bun and never read):

```sh
bun --env-file=.env openspec/changes/release-0-4-0/evidence/18-7/probe.ts --run --n 4 --out /tmp/probe-18-7/out > /tmp/probe-18-7/run.log 2>&1
```

Result (`sessions.jsonl`, one row per session; `run.log` is the probe's own output): the prediction failed, in one tool. Read, Write and Skill reached every time; ListAgents never did.

| Arm | Reached | Wilson 95% | Called the tool | ToolSearch named it | Largest run | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| change | 24/32 | 0.579-0.867 | 24/32 | 23/32 | 36,024 tokens | $0.5237 |
| base | 32/32 | 0.893-1.000 | 32/32 | 0/32 | 33,065 tokens | $0.8077 |

Fisher two-sided: reached p = 0.0048 (24/32 against 32/32). Sample 32 sessions per arm, 64 in all (8 cases x 4 rounds); no session was capped or rejected by the arm check. Total cost $1.3314 (the ledger's price of the sessions' usage), 1,763,829 tokens; the largest session was 36,024 tokens against the 300,000 cap.

By tool (reached, change against base): Read 8/8 and 8/8, Write 8/8 and 8/8, Skill 8/8 and 8/8, ListAgents 0/8 and 8/8 (Fisher p = 0.0002). Read, Write and Skill together: 24/24 in both arms, Wilson 0.862-1.000 each, p = 1.

What the sessions did:
- Read, Write, Skill (change arm): 23 of 24 sessions loaded the tool by `ToolSearch` first. The one exception was a `Read` session that ran `Bash` and then called `Read` with no `ToolSearch`; the call was answered without an error, so the schema was not needed to call it. No session replaced these tools with `Bash`.
- ListAgents (change arm): none of the 8 sessions made any tool call. Each answered in one turn from the session context ("No agents are running ... I have no tool that lists live agents ..."), and the count of 0 was right. The model never learned that a deferred `ListAgents` exists, so a task that it can answer from its own record is not sent to the tool. In the base arm all 8 called `ListAgents` directly.
- Reading limit: the two ListAgents tasks can be answered correctly without the tool in an empty session, so they measure whether the model checks, not whether it fails a task. With no agent running, "the tool was not needed" and "the tool was not found" look the same here.

Not measured: `SendMessage` (deferred by 5.21; needs a live agent), Workflow, ScheduleWakeup and ReportFindings (deferred by 2.13), other models (Sonnet only), interactive sessions, tasks that need a deferred tool for the answer to be right.

Process check after the free run and after the paid run, `ps -axo pid,ppid,command | grep probe-18-7 | grep -v grep` printed nothing both times. An earlier failed free run (a wrong plugin path) left three fake API servers and one more came from a stopped run; they were killed by PID, and `probe.ts` now stops its fakes on `exit`, `SIGINT`, `SIGTERM` and `SIGHUP`.

Processes (18.17): fake API (probe.ts:66) and `claude -p` via `launch` (probe.ts:68) stopped by `try/finally await fake.stop()` (probe.ts:68) plus an exit/SIGINT/SIGTERM/SIGHUP handler killing every live fake (probe.ts:47-51); ps after run: checked 2026-11-07 sweep: none
