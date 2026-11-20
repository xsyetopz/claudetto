# CTX tick rerun on vanilla Claude Code 2.1.327

Environment: `export TMPDIR=/tmp/claude-501/ PATH=/tmp/claude-501/bin327:$PATH`; helpers in `env.sh`; raw output in `raw/`.
Free probes use a local stub (`stub.ts`) via ANTHROPIC_BASE_URL, `CLAUDE_CODE_MAX_RETRIES=0`, `--debug-file`, `env -i`.
Paid runs use the logged-in config dir with `--setting-sources project --strict-mcp-config` and `ENABLE_CLAUDEAI_MCP_SERVERS=false`, because the dogfood settings env block otherwise leaks into the run.

| Item | Command (script) | Observed | Verdict | Cost |
|---|---|---|---|---|
| CTX-001 | `claude plugin test` (raw/c001.out) | 160 pass, 0 fail | PASS (painted check OUT-2002 needs a TUI; not run) | $0 |
| CTX-458 | real `/compact` (p458.sh) | 116,913 to 3,295 and 34,935 to 4,184 tokens | PASS | paid, see total |
| CTX-466 | c466.sh | 1m window, 33k buffer, 967k threshold | PASS (490,000 case and percent math are source-only) | $0 |
| CTX-553 | c553.sh, c553b.sh | OTel tool_decision shows accept/config; file changed; no-allow arm rejected | PASS | $0 |
| CTX-725 | c725.sh | free arms on three models; DISABLE_THINKING paid run | PASS | $0.0017 |
| CTX-830 | cmp830.ts | identical tools and system; cacheRead 113,339 on compact | PASS | paid |
| CTX-839 | c839.sh, p839.sh, cmp839.ts | bytes mostly match, msg[1] string vs blocks (text identical); fork read 6,985 tokens (tools+system), did not read parent history | PARTIAL | paid |
| CTX-840 | c840.sh, s840.js | PostToolUse and Stop fire; TaskCreated/TaskCompleted not reproducible (Task* tools absent) | PARTIAL | $0 |
| CTX-841 | c841 | `model` key absent (not null) on clear | PASS | $0 |
| CTX-842 | p842.sh | main 1h, subagent 5m, 1h with env var | PASS | paid, small |
| CTX-843 | c843.sh, plugin843/ | three variants match; handover and second prompt separate blocks | PASS | $0 |
| CTX-844 | c844.sh, cmp844*.ts | prefix and history identical; rewound prompt restored; C+D merge; byte sizes 66,072/10,865 vs item 34,072/6,409 (environment) | PASS | $0 |
| CTX-846 | grep of plans | meter measurement not rerunnable locally; only OUT-444, ADR-0110, prompt-cache.md cite CTX-846; REQ-COST-039/046 not defined in prd/cost.md | NOT CHECKABLE / inspection partial | $0 |
| CTX-853 | c853.sh | 0 / 1 / 0 hook runs across three arms | PASS | $0 |

Total cost: about $1.61, of which $1.13 was a mistaken opus-5 run (a script bug dropped `--model`; fixed) and about $0.45 the intended haiku/sonnet runs.
