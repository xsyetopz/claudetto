# RISK-451 on claude 2.1.329: background exit status

Date: 2026-11-24. Binary: claude 2.1.329 (`/tmp/claude-501/bin329`). Model: claude-sonnet-5-5.
Fixtures: `reports/2026-11-19-research/goal/fixtures451.sh` (r451a, r451b, r451d target; r451c control).
The scorer replays each `run_in_background` Bash call in zsh, where the check fails by construction,
and passes a run whose replay keeps the failure status.

Command, per plugin snapshot in `$GOAL_ROOT/plug`:

```sh
GOAL_ROOT=<root> CLAUDE_BIN_DIR=/tmp/claude-501/bin329 \
  bash reports/2026-11-19-research/goal/batch.sh "1 2 3" r451a r451b r451c r451d
```

| Fixture | vanilla | recipes in Bash description only | plus the two paragraphs in the style |
| --- | --- | --- | --- |
| r451a | 0/3 | 0/3 | 3/3 |
| r451b | 0/3 | 1/3 | 3/3 |
| r451d | 0/3 | 2/3 | 3/3 |
| r451c (control) | 3/3 | 3/3 | 3/3 |

Vanilla is the sum of both batches' van arms (0/6 on each target). The cure batch cost $0.83.
In the current placement, r451a cto writes `(…; echo …)` in a background subshell, and r451b cto-1
ends with `exit ${PIPESTATUS[0]}`, which zsh does not set. Raw lines: `results.txt`.
