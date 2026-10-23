# References: Web Pages

The main session read these pages on 2026-10-21.
The six papers and the saved Reddit threads are in `references.md`.

## How Boris Uses Claude Code

Source: <https://howborisusesclaudecode.com/>, read with `WebFetch` at offsets `0` and `100000` (171,316 characters).
The page collects posts by the creator of Claude Code.
The model versions on the page run from Opus 4.5 to Opus 5.5 and Fable 5.1, so a claim can be old.

- Verification is the top tip: give Claude a way to check its work, which the page says gives "2-3x" the quality.
- Instruction files:
  - Add a rule each time Claude makes a mistake, and keep editing until the mistake rate drops.
  - Keep `CLAUDE.md` light: what the repository is for, and its gotchas.
  - Push detail into skills and nested files.
  - Boris's `CLAUDE.md` loaded "~10k tokens every session", and moving about 1.9k tokens to lazy loading saved about 5.5k tokens for each session.
- Keep the system prompt and the tool list minimal, and give Claude a way to fetch context.
- Subagents:
  - Custom agents are `.md` files with `name`, `tools`, `disallowedTools`, `permissionMode`, `model`, and `isolation`.
  - The `agent` setting or `--agent` sets a default agent.
  - Nested subagents go to depth 5.
- Use a second agent with a fresh context for review, because it has less bias.
- Fork the heavy skills (`fork: true`, experimental), such as research and review, to keep the main context clean.
- Effort:
  - `low` for quick work in the loop.
  - `medium` for feature work.
  - `high` for bugs and edge cases.
  - `max` for hard tasks that run unattended.
  - `/effort` can change mid-session and keeps the prompt cache.
  - One loop: interview, then build at `low`, then review at `low`, then verify at `high`.
- Tokens:
  - Fable 5.1 used a "median 73k vs 222k tokens" at `low` against `max` (Terminal-Bench example).
  - Opus 5.5 matched Fable 5.1 at `max` with "half the tokens".
  - Fable 5 costs "$10/M input · $50/M output", double Opus 4.8.
- Use cheaper models for routine work with a high volume.
- Permissions:
  - Pre-allow safe commands with wildcards, such as `Bash(bun run *)`.
  - `/fewer-permission-prompts` scans the history and suggests allow rules.
  - `/checkup` pre-approves read-only commands that are often denied.
  - The page treats auto mode as safe on the strength of "thousands of transcripts" and red-team evals.
  - The page gives no cost of the classifier.
- Hooks:
  - `/checkup` turns off slow hooks "that tax every turn".
  - A `PostToolUse` format hook on `Write|Edit`.
  - A `Stop` hook for long runs.
- Skills:
  - The description is the trigger.
  - Keep a Gotchas section.
  - Persist data in `${CLAUDE_PLUGIN_DATA}`.
  - `/checkup` found "38 project skills never used across 2,345 sessions".
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW=400000` compacts before context rot, which the page puts at about 300k to 400k tokens.

## AGENTS.md Patterns

Source: <https://blakecrosley.com/blog/agents-md-patterns>, read with `WebFetch`.

- The author keeps each section under 50 lines and the file under 150 lines.
  This is a rule of thumb with no source.
- Put the commands and the definition of done first, and style last.
- Organize by task ("When Writing Code", "When Reviewing Code"), not by category.
- Include:
  - exact commands with arguments
  - one verify command that chains the checks
  - done as exit codes
  - escalation rules, such as "stop after 3 failed test attempts"
  - a "Never" list
  - numbered priorities for goals that conflict
- Leave out:
  - prose about values
  - vague directives ("be careful", "handle errors gracefully")
  - priorities that conflict with no order
  - style rules with no command that enforces them
  - the reasons behind conventions that the agent only has to follow
- Evidence:
  - GitHub's analysis of 2,500+ repositories found most agent files fail because they are too vague.
  - Ambig-SWE (ICLR 2026) found that models "almost never interact" on underspecified input, and that a prompt to ask improved results by up to 74%.
  - The author's own 10+ runs for each pattern have no published numbers.
- Test: ask the agent to recite the build commands, and if it cannot, the file is too long, too vague, or not read.
- Claude Code reads `CLAUDE.md`, not `AGENTS.md`, so keep one source.

## When Is a Code File Too Big

Source: <https://softwareengineering.stackexchange.com/questions/176999/at-what-point-range-is-a-code-file-too-big>.
`WebFetch` could not reach the host, so the main session read the answers through `api.stackexchange.com`.

- Top answer (score 68): one class for each file, 7 to 10 methods for each class (the "seven items" limit of working memory), and a method no longer than one or two screens of about 50 lines.
- Second answer (score 40): group by logic, not by line count.
- Answer (score 12): split when you cannot tell whether a function is in the file, and where.
- Answer (score 3): look at how often a big file breaks, and remove copy-paste, which grows the line count.

## Readability for Humans and Agents

Source: `/Users/krystian/Downloads/code-readability-for-humans-and-ai-agents.md`.

- Function bounds:
  - a body of 30 lines or fewer (review above 40)
  - cognitive complexity of 10 or less (review above 15)
  - cyclomatic complexity of 8 or less
  - nesting of 2 or less
  - 4 parameters or fewer
  - a line width of 100 or less
- Do not split a function only to meet a line count.
- One concept gets one term.
- Agents optimize locally, infer through ambiguity, over-abstract and under-abstract, hide uncertainty with plausible code, drift in terms, churn diffs, and treat passing tests as proof.
- Comments say why, not what.
- A long comment on an ordinary function means that the function is too hard to read.

## What This Means for 0.3.0

These are proposed, and the design decides each one.

- Verification beats instruction text, so a check that runs (a hook, a test, a lint rule) wins over a sentence in a prompt.
- The instruction text of claudetto keeps only rules that a fault in the session data backs, which follows the "add a rule after a mistake" method.
- A subagent has a short prompt, an explicit `model` and `effort`, and a narrow tool list.
  Review and verify agents get a fresh context.
- An allow list from the session history (`/fewer-permission-prompts`) is the built-in way to cut prompts.
  Check it in the Claude Code 2.1.306 docs before claudetto adds its own.
- Add `noExcessiveCognitiveComplexity` (15 at first, then 10) to `biome.json`, and fix or justify the 20 functions above 15.

## Reddit Threads with Measured Data (Main Session)

Source: `external/2026-10-21/`.
Each thread is one person's data, with no control.
The references agent reads the other threads.

- `1x97ix2` (a read-only custom subagent):
  - A panel of 5 reviewers on `general-purpose` cost about 116,000 tokens for each call.
  - A custom agent with `tools: Read` and `model: sonnet` cost about 30,000 tokens for each call, on the same briefs (measured 2026-10-14).
  - The author guesses that the start context of `general-purpose` holds each allowed tool and the MCP servers.
- `1xak96j` (87,020 API calls, 2026-09-12 to 2026-10-20, weighted by API price ratios):
  - Auto-compact at 400k cut the cost of each main call by 38%.
  - Subagents were 62% of the weighted tokens.
  - One `CLAUDE.md` rule, "Never launch Claude subagents ... unless I explicitly ask", took them to 3%.
  - Main calls for each prompt went from 21 to 34, and the main cost for each prompt changed by +2%.
  - The author found that the advisor, rtk, and turning off skills saved little or cost tokens.
- `1x8xqu7` (idle cost):
  - Goal check-ins send the full context while background work keeps a goal waiting.
  - `CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0` turns them off (2.1.236 or later, capped at 3 from 2.1.246).
  - This is a commenter's claim. Check it in the 2.1.306 docs.
- `1xb34h4`:
  - Cheap worker models that loop on a failing fix cost more than a strong model.
  - The author escalates a task to a stronger model after repeated failures.
  - Opinion, with no numbers.
- `1xbholz`:
  - One account logged its meters on each plan.
  - On Max 20x, one full 5-hour session used about 27.1% of the week, against about 12.8% on Pro.
  - The author puts the weekly limit of Max 20x at about 9.5x Pro, not 20x.
  - The sample is 3 sessions on Max 20x.
- `1xamnkc`:
  - Commenters run an Opus orchestrator with Sonnet implementers, and say Sonnet 5.5 is weaker for design.
  - Opinion.

What this means for 0.3.0 (proposed):

- An agent with a narrow `tools` list and no MCP cuts the start cost of each call, so each claudetto agent names its tools.
- Subagents are the largest cost when Claude starts them freely, so the main prompt starts one only when the reads would fill the context, or for work in parallel.
  The 87k-call data conflicts with Boris's "use subagents for more compute". The design picks the rule, and the eval checks it.
- Escalate to a stronger model after repeated failures, and do not loop on a cheap one.
- On Max 20x a session can use about 27% of the week, so the cap of claudetto follows cost, not the plan name alone.
