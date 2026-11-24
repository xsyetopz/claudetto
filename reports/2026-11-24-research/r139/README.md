# REQ-REPLY-139 on Claude Code 2.1.329

Question: does the handover fork write a user's opinion into the handover?

Probe: `bun reports/2026-11-24-research/r139/probe.ts`, claude 2.1.329, Sonnet 5.5, 2026-11-24.
One prompt states two opinions (tabs, Python) and one rule (indent with 2 spaces) and asks for
`hello.py`; a resumed turn then sends `FORK_PROMPT` from `plugins/claudetto/hooks/handover/text.ts`.
The script counts handover lines that restate an opinion and checks that the rule survives.

| FORK_PROMPT | Runs | Opinion lines present | Rule kept |
| --- | --- | --- | --- |
| before the cure | 3 | 3 of 3 runs | 3 of 3 |
| with the line that leaves out opinions | 6 | 0 of 6 runs | 6 of 6 |

Cost: about $0.50 before and $0.28 after.

Cure: one `FORK_PROMPT` line has the handover leave out opinions and remarks that set no rule or
task, and quote only the words that set one.

Side effect: the core auto-memory wrote memory files under `~/.claude/projects/` for the probe
folders; the probe passes no flag that turns it off.
