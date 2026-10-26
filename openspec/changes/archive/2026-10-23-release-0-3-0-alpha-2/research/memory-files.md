# Memory Files: What `external/` Users Say

Source: a `claudetto:worker` survey of `external/` on 2026-10-23, read only.
Counts: 200 files name `CLAUDE.md` or `AGENTS.md`, 159 distinct threads in `*.jsonl`, and 66 files name `AGENTS.md`.
Each quote names its thread file in `external/`.

## What People Put In

- Response style, the most common: `"If my request is ambiguous, ask one clarifying question before doing anything."` (score 367, `export-What's the one line in your CLAUDE.md that made the biggest difference -.jsonl`).
- Scope limits: `"don't change anything I didn't ask you to change"`, and "Never commit unless I ask" (`export-How do you set up global CLAUDE.md - AGENTS.md ...jsonl`).
- Incident rules: `"commit with --only <paths>, never a plain git commit."` (`export-What rule in your CLAUDE.md clearly has a backstory-.jsonl`).
- Machine facts, such as "Windows, so 2>nul and never /dev/null".
- An index that points to other files: `"My CLAUDE.md was one line: @AGENTS.md."`

## What Works

- Rules tied to an incident: "A CLAUDE.md rule without an incident behind it is probably instruction debt." (`export-A CLAUDE.md rule without an incident...jsonl`).
- Short files: "my `CLAUDE.md` is 23 lines", and a global file "only gets rules that are true in every session".
- Hooks for checkable rules: "if you want to make sure it runs tests after implementing something, don't write that in CLAUDE.md, make a hook".
- Pruning at each model release (`export-CLAUDE.md for Opus 5.5 based on Anthropic's official platform docs...jsonl`).

## What Fails

- Bloat: "my agents.md was 102kb, costing 30k tokens just to start a new session".
- Stale and conflicting rules: "two rules that disagree are worse than a long file".
- Rules are advice: "i also had 'only i push' written in claude.md. the planner pushed anyway".
- Machine-written files: a cited ETH Zurich study says generated context "reduces task success... while increasing inference cost by 20%" (second-hand citation, not verified).
- Untested files: one benchmark of 24 runs found that a pack of specs, `CLAUDE.md`, and a hook "made no difference".

## Unverified Loading Claims

- `CLAUDE.md` goes in the first user message, not the system prompt.
- Re-injection after compaction: two threads disagree.
- `@path` imports load in full at start, so splitting into imported files saves nothing.
  `configure/memory-and-rules.md:63` confirms that imports load at launch.
