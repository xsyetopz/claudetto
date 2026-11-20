# ToolSearch Input Under a Deferred Tool's Name

RISK-512, issue #76. Claude Code 2.1.327 sends a deferred tool's schema only after ToolSearch loads it. In the dogfood round at 72796b825 (session 1c9f6d80, Sonnet 5.5), the agent called `Monitor` with `{"query": "select:Monitor", "max_results": "1"}`, which is ToolSearch's input. Core answered with an InputValidationError that names the missing schema and says to call ToolSearch first (chunk-m14bt1pz.js offset 4744979).

`scan.py` counts such calls in transcripts and records the call that followed each one.

## Run, 2026-11-20

`python3 -I scan.py /private/tmp/claude-501/df/cfg/projects ~/.claude/projects`

| Measure | Count |
| --- | --- |
| Sessions | 1,998 |
| Sessions with the slip | 34 |
| Tool calls | 165,204 |
| Slips | 35, all under `Monitor` |
| Next call | Bash 30, ToolSearch 3, Edit 1, none 1; never the slip again |

The slip costs one errored call, after which the agent takes a working path. At 1.7% of sessions and one call each, no prompt line could show a measured gain, so the risk is accepted.
