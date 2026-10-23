# Replace Matrix: Cache, Compaction, and Other Internals

Sources: `claude-code-docs/docs/how-it-works/request-and-cache.md`, `how-it-works/context-and-compaction.md`, `configure/settings/core.md`, `configure/env-vars/context-and-compaction.md`, and `extend/subagents/frontmatter.md`.
The env vars that `p1-env-vars.md` decides are not decided again here.
The rows of `reference/undocumented.md` are an index of the rows of the other pages, so they have no row here.

## Cache

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` | `request-and-cache.md:91` | keep (`p1-env-vars.md`) | The main thread reads its prefix after a pause of up to one hour. |
| `subagentPromptCacheTtl`, `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` | `request-and-cache.md:92` | measure, then set | Each spawn of one claudetto agent sends the same tools and body, so a `1h` lifetime lets a later spawn read the prefix of an earlier one. A `1h` write costs more than a `5m` write, so the eval compares both on a session with several spawns. Unmeasured. |
| `ENABLE_PROMPT_CACHING_1H` | `request-and-cache.md:93` | n/a | The two keys above are more exact. |
| `FORCE_PROMPT_CACHING_5M`, `DISABLE_PROMPT_CACHING*`, `CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL` | `request-and-cache.md:94` | keep default | Each one costs more, or has no known effect. |
| Model, effort, and tool list at the start | `request-and-cache.md:103` | use | The snippet fixes the model and the tool list at the start (A13 constraints). The 5.5 models keep the cache when the effort changes, so an agent `effort` costs no miss. |
| `--exclude-dynamic-system-prompt-sections` | `request-and-cache.md:139` | n/a | A flag for one launch, and the agent route already replaces the system body. |

## Compaction

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `autoCompactWindow`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | `context-and-compaction.md:49`, `context-and-compaction.md:74` | measure, then set one | The window of the 5.5 models is 1,000,000 tokens (`context-budget.md:37`), and 0.2.0 sets the percent to `80.3571`. Each turn reads the whole cached context again, so a lower window cuts the cost of each turn of a long session, and each compaction costs one summary call. The eval finds the window with the lowest cost for each finished task. Use one key only. |
| `autoCompactWindow` in agent frontmatter | `extend/subagents/frontmatter.md:38` | use | A lower window for `scout` and `worker` (from `100000`), because their tasks are short. Unmeasured. |
| `idleCompaction`, `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` | `configure/settings/core.md:41`, `configure/env-vars/context-and-compaction.md:50` | keep default (on) | After the cache expires, the next turn of an idle session writes the whole context again. Idle compaction makes that context small first. |
| Files read again after a compaction (up to five, under 5,000 tokens each) | `context-and-compaction.md:143` | measure | A handoff through `session.compact` decides what comes back. The comparison of `handoff` with the built-in summary (architecture, verdict table) counts these tokens. |
| Skills kept after a compaction (5,000 tokens each, 25,000 in all) | `context-and-compaction.md:144` | use | Short skill bodies keep this cost low (D7). |
| `DISABLE_AUTO_COMPACT`, `DISABLE_COMPACT`, `CLAUDE_CODE_DISABLE_1M_CONTEXT` | `context-and-compaction.md:77` | keep default | Each one removes a capability. |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS`, `CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT` | `context-and-compaction.md:78` | n/a | Only for a model that Claude Code does not know. |
| `PreCompact`, `PostCompact` | `context-and-compaction.md:84` | n/a | The mod event `session.compact` does the work in-process (`p3-mod-api.md`). |

## Attachments

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| Attachment kinds (`total_tokens_reminder`, `output_style`, `nested_memory`, `skill_listing`, `queued_command`, `edited_text_file`, `deferred_tools_record`, and others) | `context-and-compaction.md:22` | use `prompt.attachment` (A16) | Each kind gets a row in the text table of `p3-mod-api.md`: drop, rewrite, or keep. |

## Open

- The window with the lowest cost for each finished task.
  This is likely the largest dollar lever of the release, because a long session reads its whole context on each turn.
  The eval of `release-evidence` measures it (a paid run, ask first).
- Whether a `1h` subagent cache costs less over a session with several spawns.
