# Handover probe

The four-arm probe of task 3.2 in `openspec/changes/release-2-1-319-1`: which compaction path costs least on one scripted 40-turn task, and does recall hold.

## Run it free

```sh
bun tools/handover-probe/probe.ts
```

It runs each arm three times against a fake Messages API on `127.0.0.1` and prints one table per arm. Name arms to run fewer: `bun tools/handover-probe/probe.ts C D`. Each run gets its own scratch project, `CLAUDE_CONFIG_DIR`, and server log under `$TMPDIR`, loads `plugins/claudetto` with `--plugin-dir`, and uses `ANTHROPIC_API_KEY=sk-ant-fake`. A proxy sink on a local port catches any connection to another host, and the report prints how many it caught.

Every token count the fake server returns is FAKE: it is `20,000 + 5,000 × human turns in the request body`, so it falls when a compaction or a handover shortens the messages. It tests that each arm's event fires where the spec says, not what the arm costs.

## Run it paid (task 3.3)

```sh
CLAUDE_CODE_OAUTH_TOKEN=… bun tools/handover-probe/probe.ts --paid
```

Each run's `ANTHROPIC_BASE_URL` points at a relay on `127.0.0.1` (`relay.ts`), which forwards every request to the real API (or to the caller's `ANTHROPIC_BASE_URL`) and logs the usage the API returned. It needs `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`), because each run's config dir has no login. The table scores recall: the last 10 turn results against `recall.ts`. The token counts are real, so an arm whose threshold the real context never reaches shows no event.

## Arms

| Arm | What fires | How |
| --- | --- | --- |
| A | a handoff and a clear at each of 3 task boundaries | the fake model calls `mcp__claudetto__handoff` on a prompt that ends a task; the handover threshold is off |
| B25, B50, B70 | a forked handover at 25%, 50%, 70% of a 200,000 window | `handoverThresholdTokens` of 50,000, 100,000, 140,000 |
| C | the built-in compaction near 140,000 | `CLAUDE_CODE_AUTO_COMPACT_WINDOW=200000` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=78`; the handover is off |
| D | two built-in compactions, then a handover | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=28` until 2 compactions, then a restart with `--continue`, the compaction off, and a threshold of 100,000 |

## Files

- `task.ts`: the 40 turns. Turns 1-10 state decisions, 11-30 are work, 31-40 are the recall questions.
- `recall.ts`: the 10 questions and the scorer. A fake model cannot be scored; the paid run (3.3) feeds the real answers to `scoreRecall` and compares arms with `lostAgainst`.
- `usage.ts`: usage once per `requestId`: cache read, cache write by TTL, output.
- `fake.ts`, `server.ts`: the fake API.
- `events.ts`, `arms.ts`, `report.ts`: events, per-arm expectations, tables.
- `run.ts`, `probe.ts`: one run, and the command.
