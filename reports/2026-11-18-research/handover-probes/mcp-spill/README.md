# MCP Result Spill at a 10,000-Token Cap (2.1.327, Fake API)

Hypothesis: with `MAX_MCP_OUTPUT_TOKENS=10000`, a result estimated at half the cap or less enters the request whole, and a result estimated above 4 times the cap is saved to a file with only a notice in context (ADR-0179, `PVn` in chunk-vxavegfm.js).

Check: cc-inspect `code cli` against the local fake API, 2026-11-18. Flags: `--settings s.json` with `{"env":{"MAX_MCP_OUTPUT_TOKENS":"10000"}}`, `--mcp-config mcp.json` running `python3 -I srv.py`, `--strict-mcp-config`, `--allowedTools mcp__stub__big`. The scripted model calls ToolSearch `select:mcp__stub__big` first (MCP tools are deferred), then `big` with n characters. The cli refuses `MAX_MCP_OUTPUT_TOKENS` as a direct env parameter, so the value goes through the settings `env`.

Result:

| n characters | Estimate (chars/4) | Requests | In the next request |
|---|---|---|---|
| 20,000 | 5,000 (half the cap) | messages only | the whole text, MARKSTART to MARKEND |
| 60,000 | 15,000 (between half and 4x) | `POST /v1/messages/count_tokens` before the next turn | a file notice (the count comes from the fake API, so the outcome on a real count is untested) |
| 200,000 | 50,000 (above 4x) | messages only | a file notice; request body messages 32,405 bytes |

The notice reads: "Error: result (200,000 characters across 1 line) exceeds maximum allowed tokens. Output has been saved to <config>/projects/<project>/<session>/tool-results/mcp-stub-big-<id>.txt." It is followed by a format line, a search hint, and a block headed "REQUIREMENTS FOR SUMMARIZATION/ANALYSIS/REVIEW" that tells the model it MUST read the file in sequential chunks until 100% has been read, slicing by character range when lines are too long, and must state what portion it read.

Confirmed: both thresholds behave as the code predicts. The spill keeps the result out of the current request, but the notice asks the model to read the whole file back, so a model that obeys it pulls the content into context in parts. The cap moves large results out of one tool result. It does not by itself keep them out of the conversation. claudetto's own tools stay at or below 20,000 characters and return a path with an outline instead (REQ-GUARDS-064), which never triggers this notice.

The "⚠ Large MCP response" warning is interactive UI text. `-p` stream output does not carry it, so this probe does not show it. Its trigger is read from the code (ADR-0179 Consequences).
