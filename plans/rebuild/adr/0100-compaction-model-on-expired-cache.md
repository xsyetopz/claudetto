---
status: accepted
date: 2026-11-17
---

# Compaction Model on Expired Cache

## Context and Problem Statement

When the 5-hour limit ran out and the prompt cache expired, compaction on the main model spends the limited Opus allowance. One commenter runs /model Haiku, /compact, /model Sonnet: the summary is lower quality but spends far fewer tokens; another turned on auto-compact at 400k tokens and ignores cache hits. The old plan says never switch the compaction model, only when the cache already expired. The user decision says handover replaces core auto compaction by default and a manual /clear writes a handover first.

## Considered Options

- Never switch the model for compaction or handover
- Switch to Haiku only when the cache already expired, as a deliberate cost trade with a quality loss
- Auto-compact at a fixed token count, ignoring the cache

## Decision Outcome

Chosen: switch to Haiku only when the prompt cache already expired, by user decision on 2026-11-17 (asked through AskUserQuestion in session `0342617c`). The user accepts the lower summary quality as the cost trade. With a live cache the main model writes the summary, because a cache hit costs less than a cold Haiku request.

## Consequences

A cheaper summary comes with lower quality; the handover writer inherits the same trade.

Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:44 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsgul7/does_anyone_other_than_opus_and_fable_actually/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:68 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsgul7/does_anyone_other_than_opus_and_fable_actually/>).
