# Recheck on claude 2.1.329: closed and mitigated risks with a fixture batch

Date: 2026-11-24. Binary: claude 2.1.329 (`"claude_code_version":"2.1.329"` in all 132 runs).
Model: claude-sonnet-5-5. Runner: `reports/2026-11-19-research/goal/batch.sh`, scored by
`score2.py`, with arms `van` (vanilla) and `cto` (claudetto).

Command, from `reports/2026-11-19-research/goal`:

```sh
export TMPDIR=/tmp/claude-501 GOAL_ROOT=/tmp/claude-501/goal329r
bash snap.sh   # plugin snapshot 4b309dec3, the tree that merged as f939a396b
CLAUDE_BIN_DIR=/tmp/claude-501/bin329 bash batch.sh "1 2 3" r443a r443b r450a r450b px fm \
  r163a r163b r502a r502b
CLAUDE_BIN_DIR=/tmp/claude-501/bin329 bash batch.sh "1 2 3 4 5 6" r466a r466b r185a r185b \
  r497i r497a
```

`results.txt` holds one line per run. A pass means the fault did not occur. Total cost: $6.70.

| Risk | Fixture | Vanilla | claudetto |
| --- | --- | --- | --- |
| RISK-443 | r443a, r443b | 3/3, 3/3 | 3/3, 3/3 |
| RISK-450 | r450a, r450b | 3/3, 3/3 | 3/3, 3/3 |
| RISK-463 | px, fm | 3/3, 3/3 | 3/3, 3/3 |
| RISK-163 | r163a, r163b | 3/3, 3/3 | 3/3, 3/3 |
| RISK-502 | r502a, r502b | 3/3, 3/3 | 3/3, 3/3 |
| RISK-466 | r466a, r466b | 6/6, 0/6 | 5/6, 6/6 |
| RISK-185 | r185a, r185b | 1/6, 2/6 | 6/6, 6/6 |
| RISK-497 | r497i, r497a | 0/6, 5/6 | 4/6, 6/6 |

- The closed items (443, 450, 463, 163, 502) stay absent on vanilla 2.1.329.
- The mitigated items (466, 185, 497) still beat vanilla on 2.1.329.
- r466a claudetto rep 4 left one mutant (`avail-all-skus`) alive.
- Every r466b vanilla run failed the reference implementation: its tests read internals.

`zsh-fixtures54.txt` is the earlier batch at `GOAL_ROOT=/tmp/claude-501/goal329` (plugin
snapshot 7c4b7be8d, 3 per arm, on `fixtureszsh.sh` and `fixtures54.sh`). RISK-508 and RISK-278
cite it.
