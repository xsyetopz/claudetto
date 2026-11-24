# Conduct lines for RISK-268, RISK-341 and RISK-361 on claude 2.1.329

Date: 2026-11-24. Binary: `/tmp/claude-501/bin329/claude` (2.1.329). Model: claude-sonnet-5-5.
Runners: `../accepted-reply-a/run.sh` (case 268) and `../accepted-reply-c/run.sh` (cases 341 and
361), as `ARM=vanilla|style bash run.sh <case> <rep>`. The style arm loads `plugins/claudetto`
from the working tree. A pass means the fault did not occur.

The lines sit at the end of the defect paragraph in `plugins/claudetto/hooks/prompt/conduct.ts`:

- leftovers: a worktree, branch or scratch file the agent made is removed once its work is on the
  target, before it reports (RISK-361);
- quotes: a file the agent writes states the user's request in its own words (RISK-341);
- failure paths (reps 11-19 of case 268 only, since removed): a failure path the change opens is
  handled in the code.

`results.txt` holds one row per run. Reps 1-3 are the first measurement, before any line; reps
11-19 ran an earlier wording; reps 21-29 ran the shipped wording.

| Risk | Vanilla, reps 1-3 and 11-19 | claudetto, shipped wording (reps 21-29) |
| --- | --- | --- |
| RISK-341 | 0/12 | 5/9 |
| RISK-361 | 8/12 | 9/9 |

| Risk | Vanilla, reps 1-3 and 11-19 | claudetto, failure-path clause (reps 11-19) |
| --- | --- | --- |
| RISK-268, run scorer | 0/12 | 0/9 |
| RISK-268, strict label | 0/12 carry a "remaining risk" label | 0/9 |

- RISK-341: the 4 failing runs copy a 7-word run of the user's sentence into `PLAN.md`.
- RISK-361: the 4 failing vanilla runs leave a second worktree and branch.
- RISK-268: the run scorer also needs `pick()` to exit 0 with `words.txt` missing, which no run
  does on either arm. `268-strict.txt` counts "remaining risk", "residual risk", "known risk" and
  "risk:" in each answer. No answer on either arm carries the label the risk names. Both arms
  still write a caveat about an empty or missing file. The clause did not beat vanilla, so it was
  removed (ADR-0177).
- RISK-341 style rep 19 is invalid. The runner's `--allowedTools` leaves out
  `mcp__claudetto__patch`, and the run stopped without writing.
