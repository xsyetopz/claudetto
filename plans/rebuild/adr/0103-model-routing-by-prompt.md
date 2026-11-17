---
status: accepted
date: 2026-11-17
---

# Model Routing By Prompt

## Context and Problem Statement

A cost goal for delegation. Subagent delegation can lose money: one Opus 5.5 session took 25% as many tokens as a rigid system of many scoped-model subagents, because files were re-read into each context, while delegation wins for targeted one-off edits and a single session wins when the cache stays warm over a few files iterated repeatedly. Re-pricing delegated tokens at Opus rates predicted 34-85% savings, head-to-head runs ranged from 30% more expensive to 75% cheaper. Which unit of routing should claudetto use?

## Considered Options

- Subagent delegation by step type
- One session that does it all
- Route the main conversation per prompt (quick question Haiku, edit Sonnet, design or risky work Opus) with a check before each model switch so a warm cache is not thrown away, and use effort as the cheaper lever since it keeps the cache

## Decision Outcome

Chosen option: route the main conversation per prompt (quick question Haiku, edit Sonnet, design or risky work Opus), with a cache-warm check before each model switch, and effort as the first lever because it keeps the cache (user decision, AskUserQuestion 2026-11-17). Fable and Opus stay off subagents. The $2.01 against $4.14 figure is author-reported by a mod author; the rebuild checks it with billed head-to-head runs.

## Consequences

Estimate savings from billed head-to-head runs, not repriced tokens. A per-prompt router needs a cache-warm check before each switch.

Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs1d5y-most-of-my-claude-code-tokens-we-20261110T093224Z.md:62 (url: https://www.reddit.com/r/ClaudeAI/comments/1xs1d5y/most_of_my_claude_code_tokens_went_to_subagents/); external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:300 (url: https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/); external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:302 (url: https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/).
