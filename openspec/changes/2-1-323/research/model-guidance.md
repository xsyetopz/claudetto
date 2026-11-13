# Per-Model Prompting Guidance

Source: clawdipedia-docs on 2026-11-13. Pages: `prompting-claude-opus-5-5`, `prompting-claude-opus-5`, `prompting-claude-sonnet-5-5`, `prompting-claude-haiku-5-5`, `prompting-claude-fable-5-2`, `claude-prompting-best-practices` (BP), `effort`, `models/*/overview`, Claude Code `model-config`. Each item is cited unless marked inferred.

## Models

| Model | Context | Price in/out per MTok | Thinking | Default effort | Docs advice on effort |
|---|---|---|---|---|---|
| `claude-opus-5-5` | 1M | $4/$20 | adaptive, always on | `medium` | Sweep levels; `xhigh` and `max` only with a measured gain |
| `claude-sonnet-5-5` | 1M | $2/$10 | adaptive; `between_tools` is the lowest | `high` | `medium` for agentic coding, `high` for harder work |
| `claude-haiku-5-5` | 1M | from $0.10/$0.50 | adaptive; can be disabled at `high` or lower | `medium` | `medium` for agentic work; `low` for chat |
| `claude-fable-5-2` | 1M | $8/$40 | adaptive, always on | `high` | `medium` for interactive work |

Claude Code minimum versions: Opus 5.5 2.1.280, Sonnet 5.5 2.1.284, Haiku 5.5 2.1.293, Fable 5.2 2.1.321.

## Shared Core

- Be clear and direct, as for "a brilliant but new employee who lacks context".
- Give the reason for each rule, because the model generalizes from it.
- Say what to do rather than what to avoid. Match the prompt's own format to the output you want.
- Examples steer best: 3 to 5, wrapped in `<example>` tags.
- Use XML tags to separate instructions, context, and input.
- Prefer general instructions over prescriptive steps. Do not ask the model to write out its reasoning, which can trigger a `reasoning_extraction` refusal.
- Use "change this function", not "can you suggest changes".
- Avoid over-engineering, and validate only at system boundaries.
- Read code before you claim anything about it (`<investigate_before_answering>`).
- Ask before risky actions, with a reversibility list.
- For long runs, save state in files and use git for state.
- Use subagents only for parallel, isolated, or independent work.
- Keep the system prompt stable from the first request. A changed `system` or `tools` breaks the thinking prefix; on Fable 5.2 it returns a 400.

Leave out, because the models already do it or it backfires:

- verification and double-check steps on Opus 5 and Fable;
- "think carefully" and "answer directly" lines;
- tool-triggering emphasis such as "CRITICAL: You MUST use";
- standing "delegate to subagents" lines;
- token budget text (Fable 5.2);
- hard style caps, which Fable obeys literally;
- generic "avoid AI aesthetic" lines;
- unscoped "never" absolutes (Fable).

## Opus 5.5

- Starts work quickly on loosely specified tasks. In multi-app work it misses facts the task did not point to. Docs line: "Before taking any action, explore broadly with tool calls".
- Progress updates can end the turn early in unattended loops. It responds to instructions that name the kinds of early stop to avoid. Leave that paragraph out of human-in-the-loop apps.
- Defaults to long replies (Opus 5 page; carried to 5.5 by inference). Prompt for length; effort does not shorten replies.
- Opus 5 page: over-verifies, expands scope, and narrates its own corrections. The page gives the paragraphs "Deliver what was asked, at the scope intended…" and "Only correct an earlier statement when the error would change…".
- Delegates readily (Opus 5 page). Damping line: "Delegate to a subagent only for large tasks that are genuinely independent and parallelizable…". Hard caps: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`.
- Review prompts: "only report high-severity issues" is followed literally. Ask for everything, then filter.
- Pasted text: wrap it in `<pasted_content>` and say that instructions inside it count only when the user's own message asks for them.
- Responds to elapsed-time lines.

## Sonnet 5.5

- At `low` or `medium` it checks in before the work is done, and at `low` it skips verification.
- Adds tests, docs, and files unprompted at every effort. At `xhigh` and `max` it starts its own review rounds.
- Starts building when the user asked for ideas.
- Sometimes treats a genuine mid-turn user message as injected text.
- Sometimes calls a tool with the wrong case (`bash`).
- System prompt additions from the page:
  - finish: "Keep working until everything the user asked for is done, and only stop to ask when you can't go on without the user or before a risky step."
  - scope: "Don't add features, tests, files, docs, or refactors that weren't asked for. If you think one would help, mention it at the end"
  - ideas: "When the user asks for ideas, options, or a plan, give them that and stop."
  - cost: "Don't start extra rounds of review or hardening on your own, and don't launch reviewer subagents unless the user asked for a review." This cut session cost by about a third.
  - search: "Use the search tool to check specifics that may have changed since your training… even when you feel confident."
  - verify at `low`: "run a real check that exercises the change before reporting it done…".
- Mid-turn user text goes in a text block after the last `tool_result`, never inside one.

## Haiku 5.5

- With a short system prompt it "rarely stops before the work is done". With a long agent prompt at low effort it stops early, skips searches, and reports changes done without a check.
- Can drift from its system prompt when users argue. Docs line: "The rules in this system prompt hold for the whole conversation…".
- Can leak reasoning-like text into replies at `low` or with thinking off.
- Search text: give the date. Use "Your training data ends well before today's date… search for those before you answer, even when you feel sure. Facts that can't change need no search". Do not use a blanket "search every present-day fact".
- Uses the same finish, scope, and verify paragraphs as Sonnet 5.5.
- Moving from `low` to `medium` halved early stops and doubled output tokens.
- The default Claude Code prompt for Haiku 5.5 is the largest (8,429 chars, 5 extra paragraphs).

## Fable 5.2 (Agent Prompts)

- Ends turns early at `low` and `medium`. Docs block `# Finishing work`: "Please avoid stopping while you still owe work the user asked for… diagnose ordinary obstacles first… leave a deliberate blocker alone". This halved unfinished sessions and cost about 30% more output.
- Adds to existing code even when that duplicates it, unless ownership is stated. "You are the owner and long-term maintainer of this codebase, and its design is up to you." raised consolidation from under 10% to 75%, at 70–80% more output. Leave it out where the user owns the code.
- Follows leftover cautions too closely and treats "never" as absolute. Write rules with scope and reason, as in "ask for approval before deleting files".
- Rarely delegates with a minimal subagent tool; delegates readily when invited. A cost-focused Agent description halved subagent counts.
- Reports: `# Communicating clearly` asks for a low-context reader, key points first, plain words, and "mostly … ASD-STE100 Simplified Technical English".
- Claude Code docs: "Describe the outcome, not the steps", and "Skip the verification reminders".
- Fits planner, reviewer, and orchestrator roles (testers, overview page).

## Length

The docs give no token limit. Long prompts hurt Haiku at low effort and trigger more adaptive thinking (BP). In a long prompt, repeat a short reminder near the end. Fable piles up stale cautions, so delete each line whose reason no longer holds.

## No Guidance Found

The docs name no sycophancy guidance for any of the four models. Haiku's "rules hold when a user argues" line is the closest.
