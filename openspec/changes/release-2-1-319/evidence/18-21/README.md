# 18.21: a question that needs a lookup gets the lookup

Hypothesis: the answer-first gate (`PIN_ANSWER_FIRST`, `hooks/pin.ts`) denied the first `ListAgents` call of each 18.18 session because the pin read the prompt as a `question`. Letting read-only built-ins pass on `question` turns makes the change arm reach as often as the base arm.
Prediction (before the run): change 7/8 or 8/8, base 8/8, Fisher p > 0.05.

Change: `pin.ts` adds `LOOKUPS` (`ListAgents`, `Read`, `Grep`, `Glob`; no existing read-only set was reusable, `LISTERS` in `gate/recreate.ts` is private and only Glob and Grep). `tool.check` passes a call when `kind === "question"` and the tool is in `LOOKUPS`. `remark` turns, and `question` turns whose call is `Bash`, `Edit` or any other tool, still get the gate. Lab tests in `pin.test.ts`: the old "a question's first call is denied" test (it used `Read`) now uses `Bash` and `Edit`; four new tests pass a question's first `ListAgents`, `Read`, `Grep`, `Glob`; the existing remark test (`Grep` denied) pins the remark side.

Mutant: delete the `question` clause (`kind === "task" || (kind === "question" && LOOKUPS.has(e.tool))` back to `kind === "task"`), run `claude plugin test plugins/claudetto`: rc 1, 1219 pass, 4 fail (`a question's first ListAgents|Read|Grep|Glob call passes the answer-first gate`). Restored; `cmp` against the saved copy is clean.

Lab: `claude plugin test plugins/claudetto`: 1223 pass, 0 fail.

Command (same as 18.18, own ledger, `.env` passed to bun and never read):

```sh
PROBE_ROOT=/tmp/probe-18-18 PROBE_TOOLS=ListAgents bun --env-file=/Users/krystian/CodeProjects/xsyetopz/claudetto/.env openspec/changes/release-2-1-319/evidence/18-7/probe.ts --run --n 4 --out /tmp/probe-18-18/out --ledger /tmp/probe-18-18/ledger2.jsonl
```

Result (`sessions.jsonl`, `run.log`; 16 sessions, no arm-check diff, none capped): prediction held.

| Arm | Reached | Wilson 95% | Largest run | Cost |
| --- | --- | --- | --- | --- |
| change | 8/8 | 0.676-1.000 | 13,537 tokens | $0.0627 |
| base | 8/8 | 0.676-1.000 | 32,930 tokens | $0.1989 |

Fisher p = 1. Total $0.2616 (ledger price), 371,278 tokens. Closes 18.18: its 0/8 came first from the deferral (fixed in 18.18) and then from this gate.

Process check: `ps -axo pid,ppid,command | grep probe-18-18 | grep -v grep` printed nothing after the run.

Processes (18.17): runs `../18-7/probe.ts`, no starter of its own; fake stopped by 18-7/probe.ts:68 and 47-51; ps after run: nothing, see the process check above
