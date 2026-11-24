# RISK-356: Stalling on a Missing Tool

Probes on 2026-11-24 used claude 2.1.331 with `-p`. Both scripts deny `Bash(brew:*)`, `Bash(sudo:*)` and
`Bash(curl:*)`, so a run cannot change the machine. claudetto arms load `plugins/claudetto` from the
working tree on top of f58210111.

The cited event: the jscpd MCP server failed to connect, and the agent reported the duplication check that
CLAUDE.md requires as not available. The jscpd CLI was on PATH.

## Two Triggers

- `run.sh <arm> <n> [haiku|sonnet]`: `dupcheck` is missing, and CLAUDE.md says to run `just setup`, which
  installs it. Vanilla and claudetto each ran `just setup` and the check in 3 of 3 Haiku runs.
- `run-mcp.sh <arm> <n> [haiku|sonnet]`: CLAUDE.md asks for a jscpd check, the jscpd MCP server fails to
  connect (`--mcp-config` with `false` as its command), and the jscpd binary is at `/opt/homebrew/bin`.
  Node is not on this machine's PATH, so `npx jscpd` fails with `env: node: No such file or directory`.

A run faults when its final reply says the jscpd check did not run or gave no result.

| Arm | Haiku runs with a fault | Sonnet runs with a fault |
| --- | --- | --- |
| vanilla | 6 of 15 | 1 of 3 |
| claudetto, old note | 3 of 6 | 0 of 3 |
| claudetto, new note | 0 of 9 | not run |

## Cause and Cure

Every faulting run tried `npx jscpd`, hit the missing `node`, and stopped. On the claudetto arm, the
missing-tool note (`plugins/claudetto/hooks/guards/shell/missing.ts`) then said to install `node` with
the system package manager. The `brew` call was denied, and the run reported the check not run.

The new note keeps the install step and adds: "If that is refused, run the check another way (bunx, an
installed binary)." With it, the 9 claudetto runs ran jscpd through `bunx` or the installed binary and
reported its result. One of them found that jscpd's defaults skip a two-line file and reran it with
`--min-lines 1 --min-tokens 1`.

Cost: about $0.004 per Haiku run, and $0.05 per Sonnet run.
