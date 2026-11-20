# Tick rerun: REQ-REPLY-109, REQ-REPLY-140, RISK-203, RISK-207

Claude Code 2.1.327, claude-sonnet-5-5, 2026-11-19. Scripts: `lib/rerun.sh` (driver), `lib/one.sh` + `lib/drive.py` (from risks-reply-reqs and risks-reply), `lib/run.sh` (from risks-delegation). Run with `lib/rerun.sh`; raw output in `out-reqs/`, `out-risksdel/`, `results-risksdel.txt`.
Deviations: the "full style" arm uses the current `plugins/claudetto/output-styles/claudetto.md` (no hooks), not the older copies in /tmp. The "line alone" arm is the `c140` plugin, whose text equals line 16 of the shipped style. Nothing under plans/ or plugins/ was edited.

| Item | Result | Verdict | Cost |
|---|---|---|---|
| REQ-REPLY-140 | Missing host, asked before running: vanilla 0/6, line alone 4/6 (2 more ran `deploy.sh staging` first, one via AskUserQuestion after), full shipped style 1/3. Host in config.json, no ask: vanilla 3/3, line 3/3, style 3/3, all read the host and ran it. `grep -ci confiden` on the style = 0. | FAIL on the ask arm for the shipped style (original: line 5/6, style 3/3); the proceed arm and no-threshold clause pass | $0.97 (24 runs) |
| REQ-REPLY-109 | 30 runs (all the 140 and dirty-tree runs, which the 60 original runs could not be told apart from): 0 had a tool call or assistant message after the final reply; hooks.json has no Stop entry. | PASS (structural; the original 60 runs were not identifiable, so 30 were rerun, and none was a dedicated user-step prompt) | $0.77 (30 runs, includes 6 g-cell runs; 140 runs counted once above) |
| RISK-203 | s203 (WAIT right): vanilla 15/16 (original 8/16), line 8/8, full style 4/4. s203c (RESTART right): vanilla 1/4 (orig 3/4), line 8/8, full 4/4. 0 Agent spawns. | PASS for the shipped line (20/20 vs original 20/20); vanilla baseline did not reproduce on s203 | $0.97 (44 runs) |
| RISK-207 | s207 vanilla 3/3 with 0 Agent calls, $0.033-0.036 a run. | PASS (matches original; swarm not reproduced) | $0.10 |

Total: $2.81 (74 runs plus the 6 g-cell runs counted in the 109 row; the 109 row reuses runs). Exact sums: 140/109 batch $1.736 (30 runs), delegation batch $1.077 (47 runs).
