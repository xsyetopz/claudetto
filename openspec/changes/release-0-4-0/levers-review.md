# Reply and token levers (`GOAL-2.txt`)

Part 2 of 2. Part 1 closed: `cd claudekit && just check` on 2026-11-05 printed `136 pass, 0 fail`, `No type errors in 49 files`, `hooks type-check in 2 folders`; DESIGN.md open items O1-O3 are closed. The user deleted `GOAL-1.txt` during this session (reported by the user).

## Paid-run ledger

| Run | Model | Tokens | Cost | Running total (goal cap 2,000,000 tokens) |
|---|---|---|---|---|
| none yet | | | | 0 |

## Findings

### H1. The held-out folder is blocked from this agent

- Choice: `~/.claudetto-holdout/`, the path the goal names.
- Layers: `Read(~/.claudetto-holdout/**)` in `~/.claude/settings.json` `permissions.deny`, and `~/.claudetto-holdout` in `sandbox.filesystem.denyRead` of the same file. Confine has no read rule to add the path to: `profile.sb` of baseline claudetto denies writes only ("reads, the network, and processes stay open"), and confine is off in this session (`printenv CLAUDE_CODE_SHELL_PREFIX` exits 1). Adding a read rule to confine is plugin code, which the goal holds until a lever is approved, and the plugin source was deleted in `f4fdf73a`.
- Hypothesis: the `Read` rule stops the `Read` tool. Prediction: denied. Check: `Read ~/.claudetto-holdout/canary.txt`. Result: held, "File is in a directory that is denied by your permission settings."
- Hypothesis: the `Read` rule also stops `cat` in Bash. Check: `cat ~/.claudetto-holdout/canary.txt`. Result: held, "Permission to use Bash with command cat ... has been denied."
- Gap (hypothesis, not run): a command that builds the path at run time may pass the `Read` rule's path check. The sandbox `denyRead` layer would cover it, but this project's uncommitted `.claude/settings.json` sets `sandbox.enabled: false`, so that layer is off here. Not probed, because probing it means trying to get around a denial.
- Leak: `/tmp/probe-fixtures/index.txt` printed the first 110 characters of every user answer in the 55 mined sessions to this session. The held-out session therefore draws its cases from sources this session did not index (the dossier corpus and the `ISSUES*.md` quotes), not from the mined pool.

### F1. Fixture mining

- `claudekit/probes/fixtures/mine.ts` pairs each main-chain assistant turn with the next typed user message, skipping tool results, subagent entries, meta lines, and command echoes (`mine.test.ts`, 1 pass).
- Run: `bun probes/fixtures/mine.ts /tmp/probe-fixtures/pairs.jsonl <55 sessions>` gave 392 pairs.
- Batch 1 (`/tmp/probe-fixtures/batch1.json`): `2913471d:6412`, `2913471d:6752`, `e8ba35c3:3317`, `f8383c80:1375`, `012b83b1:2734`, control `c7edeceb:10128`.
