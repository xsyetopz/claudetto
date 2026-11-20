# CTX-293: Concurrent Subagents and the Shared Cache Prefix

Hypothesis: subagents started at the same moment each pay the full cache write of the prefix they share (system prompt and tools), because a prefix becomes readable only after the request that writes it has started its reply.

Check: `python3 -I scan.py ~/.claude/projects` reads the first assistant usage of each of the 299 subagent transcripts in the user's own sessions (Claude Code 2.1.32x, all on claude-sonnet-5-5). It groups subagents of one parent session, agent type and model whose first replies fall within 3 seconds of each other. Only usage numbers are read.

Result (2026-11-18): 59 groups of 2 to 9 subagents.

| Group kind | Groups | Subagents | First request |
|---|---|---|---|
| No shared prefix cached yet | 13 | 51 | every member reads 0 and writes the whole prompt (about 8,400 to 13,900 tokens each) |
| Shared prefix cached by an earlier subagent | 46 | 248 | every member reads the same amount (4,365 to 6,018 tokens) and writes only its own part |
| Mixed | 0 | 0 | none |

The hypothesis holds. When no sibling has cached the shared prefix, each concurrent subagent writes it again; once one has, every later subagent reads it. On Sonnet 5.5 the shared part is about 4,900 tokens, so each extra cold sibling pays about 4,900 × ($3.75 − $0.30) per million ≈ $0.017 more than a staggered start. Staggering saves little per batch and adds seconds of wall time, so the plan records the fact and does not add a launch delay (ADR-0177: no component without a measured win that matters).
