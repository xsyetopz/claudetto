# 17.4: narration A/B

Hypothesis: the `Concise.md` edit cuts announcements of the next call. The old A/B (`/tmp/probe-122`, 68 cases × 2) showed about half the rate, at p = 0.106 by session.
Prediction: a fresh run of 34 cases × 6 rounds per arm reaches p < 0.05.

Command (a narration A/B runner on the in-repo probing tool that task 17.13 removed, run once):

```sh
bun --env-file=../.env probes/narration/probe.ts --run --worktree /tmp/probe-17-4/wt --n 6 --out /tmp/probe-17-4/out
```

The runner gave each case's workspace from `workspaces.json` to both arms, with the cases in `../17-3/cases.json`. It counted
announcements and computed Fisher tests with `narration.ts`, kept here as it ran except that an inline `Reply` type stands in
for its one import. That file recomputes the figures below from `sessions.jsonl`.

Result (`sessions.jsonl`, one row per session; run log below): the prediction failed. The direction holds, but the fresh data alone is not significant.

| Arm | Sessions that announced | Wilson 95% | Announcing text blocks | Pass | Largest run | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| change | 24/204 | 0.080–0.169 | 24/127 | 180/204 | 144,909 tokens | $15.30 |
| base | 31/204 | 0.109–0.208 | 31/115 | 185/204 | 160,283 tokens | $14.95 |

Fisher two-sided: by session p = 0.3846, by text block p = 0.1669, pass p = 0.5194. Recomputed by the lead from `sessions.jsonl`, and equal to the probe's own figures. No run was capped; the total was $30.24.
The probe also prints the old run pooled with this one (by text block 37/190 against 54/179, p = 0.0215). That pool includes the data that prompted the test, so it is not a confirmation.
Failures by kind: `keep-d-lifted` `requireBash` 10 against 9, `syc-fixed-total-p2` `readFirst` 4 against 2, and the rest are judge fails spread over cases.

Run log:

```text
plan: 408 sessions, bound 61200000 tokens; ledger 3904055 tokens, $9.0098
{
	"rejected": [],
	"usd": 30.244431200000005
}
new change	sessions 24/204	blocks 24/127	pass 180/204	tokens 10265663	$15.2987	largest 144909	capped 0
new base	sessions 31/204	blocks 31/115	pass 185/204	tokens 9975540	$14.9457	largest 160283	capped 0
old change (recounted, not a rerun)	sessions 13/136	blocks 13/63	pass 136/136	tokens 0	$0.0000	largest 0	capped 0
old base (recounted, not a rerun)	sessions 22/136	blocks 23/64	pass 136/136	tokens 0	$0.0000	largest 0	capped 0
new alone	sessions with an announcement 24/204 vs 31/204 p=0.3846	per text block 24/127 vs 31/115 p=0.1669	announcements per session (the 122 note's method) 24/204 vs 31/204 p=0.3846
old recount	sessions with an announcement 13/136 vs 22/136 p=0.1466	per text block 13/63 vs 23/64 p=0.0761	announcements per session (the 122 note's method) 13/136 vs 23/136 p=0.1064
pooled	sessions with an announcement 37/340 vs 53/340 p=0.0892	per text block 37/190 vs 54/179 p=0.0215	announcements per session (the 122 note's method) 37/340 vs 54/340 p=0.0711
```

Processes (18.17): no process starter in this folder (narration.ts is a pure grader; the sessions ran through 18-7/probe.ts); ps after run: checked 2026-11-07 sweep: none
