# 18.18: ListAgents loaded, not deferred

Hypothesis: 18.7's 0/8 came from `ListAgents` being deferred (the model never saw the tool, so it answered the two agent-list tasks from its own context). With `ListAgents` out of `DEFERRED_TOOLS` and its trimmed 5.22 text kept, the model calls it as often as it does without the plugin.
Prediction (written before the paid run): the change arm reaches in 7/8 or 8/8 sessions, the base arm in 8/8, and Fisher p > 0.05. A miss would mean the 304-char text, not the deferral, keeps the model from calling it.

Change: `plugins/claudetto/hooks/surface.ts` drops `"ListAgents"` from `DEFERRED_TOOLS` and its comment says why it stays loaded. `surface.test.ts` gains a test that pins the list by `toEqual` (and `not.toContain("ListAgents")`).

Script: no copy of 18.7's probe. `../18-7/probe.ts` gained two env overrides (`PROBE_ROOT`, `PROBE_TOOLS`, defaults unchanged) so it runs the two `ListAgents` cases in `/tmp/probe-18-18`. Same cases, arms, model (`claude-sonnet-5-5`), cap (300,000 tokens per session), arm check and reach rule as 18.7.

Free dry run on the fake API (`PROBE_ROOT=/tmp/probe-18-18/dry PROBE_TOOLS=ListAgents bun ../18-7/probe.ts --dry --n 1 ...`, 4 sessions, rc 0): the change arm's main request now lists `ListAgents` as a loaded tool (`Agent, Bash, Edit, ListAgents, DeferredToolPlaceholder, ToolSearch`). The dry count for the change arm is 0/2 for another reason: the plugin sends a side request (constraint listing) first, and the fake spends its one scripted tool call on it. So the dry run checks the tool list, not reach.

Command:

```sh
PROBE_ROOT=/tmp/probe-18-18 PROBE_TOOLS=ListAgents bun --env-file=/Users/krystian/CodeProjects/xsyetopz/claudetto/.env openspec/changes/release-0-4-0/evidence/18-7/probe.ts --run --n 4 --out /tmp/probe-18-18/out --ledger /tmp/probe-18-18/ledger.jsonl > /tmp/probe-18-18/run.log 2>&1
```

Result (`sessions.jsonl`, `run.log`; 16 sessions, 8 per arm, no arm-check diff, none capped): the prediction failed, and for a reason other than the deferral.

| Arm | Reached (call answered without error) | Wilson 95% | Called the tool | Wilson 95% | Largest run | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| change | 0/8 | 0.000-0.324 | 8/8 | 0.676-1.000 | 29,118 tokens | $0.1910 |
| base | 8/8 | 0.676-1.000 | 8/8 | 0.676-1.000 | 32,915 tokens | $0.1989 |

Fisher two-sided: reached p = 0.0002, called p = 1. Total $0.3900 (ledger price), 440,947 tokens; 300,000 cap not reached.

What changed against 18.7: the model now calls `ListAgents` in 8/8 change sessions (18.7: 0 calls), so the deferral was what hid the tool. Every call was refused by the plugin, not by the tool: `Permission to use ListAgents denied by plugin claudetto: The user remarked or asked; they did not request work. Answer from what the session holds, in text, before any tool call. If the answer needs a fact the session lacks, name that fact in one line, then call.` (text in `hooks/texts.ts`). Two sessions per task then ran `Bash` (`ls`) and the rest answered from context. By the reach rule of 18.7 (call answered without error) the done condition is not met: 0/8 against 8/8. A rerun after the gate stops denying `ListAgents` on these two prompts is needed for the done condition; not done here.

Process check, `ps -axo pid,ppid,command | grep probe-18-18 | grep -v grep` printed nothing after the dry run and after the paid run.

Follow-up: the denial above came from the answer-first gate in `hooks/pin.ts`; task 18.21 fixed it and the rerun reached 8/8 against 8/8, see `../18-21/README.md`.

Processes (18.17): runs `../18-7/probe.ts`, no starter of its own; fake stopped by 18-7/probe.ts:68 and 47-51; ps after run: nothing, see the process check above
