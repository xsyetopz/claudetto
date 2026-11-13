# Community Findings, Part 1

Source: `external/` Reddit and Discord captures, read on 2026-11-13. Tags: M measured by the author, A anecdote or opinion, V vendor claim relayed, D docs or price arithmetic. All of it is self-reported and untrusted; sample sizes are small. Part 2 is in `reddit-2.md`.

## System Prompt

- `export-Don't use Claude Code's Default System Prompt.jsonl`:2: write your own prompt and pass it with `--system-prompt` (A). Line 36 says `--system-prompt` replaces only the identity lines (A); our probe saw it replace the whole body (`cc-2-1-323.md`, observed). Line 19: "Copy the default. Remove all the stuff that directly conflicts with your CLAUDE.md rules" (A).
- `2026-10-12/export-claude code 66k system prompt.jsonl`:2: on a fresh Haiku session, system tools were 35.6k, MCP tools 16.6k, the skills list 5.9k, and the system prompt 5.2k (M). Tool schemas, not prompt text, dominate.
- `2026-10-02/export-I tested whether a custom system prompt ... 456 API calls`: `@lru_cache` in 93% of runs with a custom prompt against 53% with the default. Over-strict anti-markdown text made Claude refuse lists (M, small).
- `export-CLAUDE.md for Opus 5.5 based on Anthropic's official platform docs`:2: Anthropic removed over 80% of Claude Code's system prompt for Opus 5 with no loss on coding evals (V). Line 3: "Conflicting instructions are worse than missing ones" (A).
- `2026-10-02/export-Beware of this system prompt that is automatically injected ... after every compaction`: the post-compaction "continue without asking the user" text overrides plan-approval rules (A).
- `2026-10-02/export-I wrote "a bit dumb" into my system prompt`: competence words in a persona act as capability instructions (A).

## Effort and Models

- `export-Claude Code ships a per-model table of what each effort level costs.jsonl`: `effort_cost_index` from the binary, with high = 1.00 (V). opus-5: low 0.67, medium 0.76, xhigh 1.60, max 1.70. fable-5: 0.60, 0.77, 1.74, 1.91. Opus 5 max against xhigh: 397,761 against 397,827 tokens (M, n=2).
- `2026-09-30/... 30-line Claude Code plugin on Opus 5.5 and Sonnet 5.5`: a 650-token rule set cut cost by 51% (Opus) and 55% (Sonnet) at max effort, and by 11% and 3% at medium (M, 18 tasks, author's own plugin).
- `export-Be careful with Opus 5.5's confidence.jsonl`: confident, incomplete investigations (A).
- `export-Claude's responses are just word vomit.jsonl`: a 124-word answer to "which button" (A, score 717).
- `2026-11-13/...is-fable-52-actually-worse`: Fable 5.2 used 60% of the 5-hour window for equal output. The consensus is Fable to plan and Opus 5.5 to execute (A).
- `2026-11-13/...fable-52-wakes-up-opus-55`: planning with Fable improves Opus execution. Fable is "very literal" (A).
- Discord, from the user's paste: "Fable 5.2 medium can replace Opus 5.5 high"; Fable as advisor, reviewer, planner, and orchestrator. SteelHard: Fable does system sweeps for performance and bugs "significantly better than opus" (A).

## Subagents

- `2026-10-08/...Haiku 5.5 is 40x cheaper ... Explore subagent`: Explore follows the main model. `CLAUDE_CODE_SUBAGENT_MODEL=haiku` needs `_FORCE=1` to cover Explore and Plan (D).
- `2026-10-27/...stop-using-subagents`: subagents re-read files the main agent has read, and 97–98% of subagent tokens still went to Opus after a prompt rule (M, one user).
- `2026-10-07_p2/...Subagents use a 5-min cache by default`: `subagentPromptCacheTtl: "1h"` raises total cost for subagents and lowers it for the orchestrator (M, one user).
- `2026-10-04/...five orchestration methods with Opus 5.5`: solo Opus did best; a second model as reviewer caught a real issue (M, n=1).
- `2026-11-10/...sonnet-with-opus-advisor`: every advisor call re-reads the full context and is "lossy" (A).
- `2026-11-11/...opus-is-not-a-great-coordinator`: "only hooks can act as hard gates"; atomic dispatch with a self-contained brief; delete old rules instead of adding new ones (A).
- `export-Opus 5.5 as a fleet orchestrator`: cap parallelism at 6–8, and have subagents write to files and return a short summary (A).

## Harness

- `export-I analyzed 246 repos and 57 papers on agent harnesses`: Vercel removed 80% of its tools and success rose from 80% to 100% at half the tokens. Machine-written context lowered success (V, relayed).
- `2026-10-30/...how-to-build-a-harness`: "Delete any rule you can't prove helps." (A)
- `export-How prompt caching works in Claude Code`: a cache read costs 0.1x, a 5-minute write 1.25x, a 1-hour write 2x. Changing the model, effort, plugins, or MCP servers mid-session can invalidate the cache (D).
- `export-A CLAUDE.md rule without an incident behind it is probably instruction debt`: each rule should carry its incident and a review condition (A).

## Skills and Hooks

- `2026-10-12_p2/...9 most popular Claude Code skills a sugar pill`: 450 runs. Six of nine skills were no better than a same-length placebo, and none beat having no skill on cost. Placebo length alone added 2–16% cost (M, the strongest data here).
- `2026-10-12_p2/...debugging skill against a same-length placebo`: the skill was never auto-invoked in 16 runs (M, n=5 per group).
- `2026-10-07/...my own guardrail pack. It made no difference` (M, small).
- `2026-11-03/...tested-10-claude-code-hooks`: "CLAUDE.md is a request, a hook runs every single time"; exit 2 blocks; a Stop hook needs `stop_hook_active` or it loops (M for exit codes).

## Dossier 2026-11-13 (31 Files, Earlier Pass)

- Fable skips checks and lookups (6 threads), over-spawns subagents (3), and is better for planning, review, and sweeps (about 10).
- Compaction loses state, so people keep durable state on disk (`idleCompaction: false`). Subagents ignore that state.
- Reviews should quote the lines they judge.
- "Tell it this is ITS CODEBASE" matches the Fable 5.2 ownership line in `model-guidance.md`.
- These claims had no support in the files: Fable ignoring hooks, Opus at medium stopping halfway, and thinking blocks regenerated after compaction.
