# Subagent usage and the start gap, Claude Code 2.1.293

Labels: **confirmed** = read in a local transcript under `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-dotclaude/`.
**inferred** = my reasoning.
Token sums count `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`, one time for each unique `message.id`.

## Answer in short

- The `/usage` report of 2026-10-07 gives these shares for the last 24 hours.
  99% of usage came from subagent-heavy sessions, 44% was at more than 150K context, and 40% came from `dotclaude:investigator`.
- The investigator runs of session `157f1ff7` are the cause (**confirmed**).
  Each run made 16 to 66 requests, and ended at 110K to 223K context.
  Each run sent 0.8M to 8.9M input tokens in total.
  The "more than 150K" share comes from these subagents, not from the main session (**inferred** from the final context of each run).
- The runs paged whole files into context.
  Run `abac1ea0` read a bundle-derived text file in steps of `head -c 30000` and `tail -c +N | head -c 24000`.
  Its 66 tool results hold 322,490 chars, the largest is 29,999 chars, and the 90th percentile is 13,001 chars (**confirmed**).
  29,999 is the Bash output cap, so the cap did not stop the paging.
- `maxTurns: 60` did not bound the runs.
  Three runs made 64 to 66 requests (**confirmed**).
  The count unit of `maxTurns` is not verified.
- Subagent starts do not share a cache.
  The first request of 28 of 31 subagents (both sessions) had `cache_read_input_tokens: 0`, and each start created 8.3K to 17.2K tokens (**confirmed**).
  Parallel spawns of one agent type write the same prefix at the same time (**inferred**).
- The "20k/300k" start is the first billed request of session `ce160872`: 2 input, 12,031 cache creation, and 7,744 cache read, a total of 19,777 tokens (**confirmed**).
  The fresh `/usage` session `683526a1` sent no request.
  `/context all` in that session showed 10.8K.

## The start gap, from the `prompt_snapshot` attachment

Claude Code 2.1.293 writes a `prompt_snapshot` attachment to the transcript.
The second snapshot of a session has `cliPrefix`, `systemPrompt`, and `tools` (**confirmed**).
This is a source for the request body that needs no proxy.

| Part | Chars | Note |
| --- | ---: | --- |
| `tools` (9 loaded) | 29,407 | `/context` shows 4.2K tokens |
| `AskUserQuestion` | 6,794 | largest tool |
| `Agent` | 5,362 | |
| `Bash` | 4,622 | |
| `Skill` | 3,302 | |
| `ToolSearch` | 2,497 | |
| `Read` | 2,459 | |
| `ListAgents` | 2,009 | loaded, not in the 0.27 research |
| `Edit`, `Write` | 2,352 | |
| static system block | 1,641 | before `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` |
| dynamic system blocks | about 4,100 | pronouns, actions, session guidance, env, context management |

- The cached prefix of 7,744 tokens matches `cliPrefix`, the static block, and `tools` (31.1K chars, 4.0 chars for each token) (**inferred**).
  The same 7,744 appears in session `157f1ff7`, so the prefix is shared across sessions (**confirmed**).
- `/context` counts tools at 4.2K tokens, and the wire has about 7.3K.
  That is about 3K of the gap (**inferred**).
- The created part (12,031 tokens) holds the dynamic system blocks and the first-turn attachments.
  The attachments are 29,323 chars as JSON: `skill_listing` 9,245, `sandbox_instructions` 6,344, `output_style_instructions` 4,489, `agent_listing_delta` 3,290, `instructions` 3,232, `session_context` 1,022, and others (**confirmed**).
  `/context` does not count `sandbox_instructions`, the output style, or `session_context`.
- About 3K to 4K tokens of the created part stay unexplained (**inferred**: tokenizer ratio, reminder wrappers).
  Task 2.5 closed it: see `capture.md`.

## What this changes in the plan

- Subagent cost is the largest usage item, and the start cost is second.
  A cut of 5K at start saves less than one investigator run that pages a file.
- Bound the context of each subagent: a range-read rule in each agent body, a context stop, and a smaller output cap for bulk reads.
- Prefer fewer, scoped subagents: the delegation text and the router decide when a subagent is worth its start cost of about 10K created tokens.
- Use the `prompt_snapshot` attachment in `just measure` before the proxy.
