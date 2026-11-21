# Masking the Transcript's Tool Record (issue #63, RISK-506)

Claude Code 2.1.327 stores each tool result twice in the session file: the model-facing `content` and the tool's structured `toolUseResult` record. A `session.append` hook rewrites only `content`. A `tool.call` hook that returns its own `{ result }` replaces the record itself: core validates it, maps it for the model with the tool's mapper, and records it in the transcript (ToolCallResult in the plugin types). An errored call goes back as a `deny` carrying the masked text.

`run.sh <vanilla|claudetto> <rep> <out>` runs one Haiku session on 2.1.327 with three tool calls: a Bash command that prints a token, an errored Bash command that prints a token, and a Read of `config/app.env`. It counts the raw values left in the session file's `toolUseResult` records.

| Arm | Run | Raw values in `toolUseResult` (of 3) | Cost |
| --- | --- | --- | --- |
| vanilla | 1 | 3 | $0.0024 |
| claudetto | 1 | 0 | $0.0051 |
| claudetto | 2 | 0 | $0.0033 |

In the claudetto runs the records kept their keys (`stdout`, `stderr`, `interrupted`, `file.numLines`), and the model read `[REDACTED]` in each result. The errored call's content reads `<tool_use_error>Exit code 3 ...</tool_use_error>`, where vanilla's reads `Exit code 3 ...`. Both are error results.

Date: 2026-11-20. Total cost of the runs: $0.0108, plus $0.0102 for three earlier probes with a minimal plugin.
