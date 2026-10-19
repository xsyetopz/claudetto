# Claude Code Context and Compaction

The context window is the amount of text the model can read at one time.
When a session gets close to the limit, Claude Code compacts it:
it asks the model for a summary and goes on from the summary.
You can set when this happens, and you can say what the summary must keep.

## Example

Your session is long and you start a new task.
Run `/compact focus on the auth bug fix` to keep what matters.
Or run `/autocompact 500k` to compact earlier next time.

## What Fills the Context

Source: [How Claude Code Works](https://code.claude.com/docs/en/how-claude-code-works#the-context-window) and [Explore the Context Window](https://code.claude.com/docs/en/context-window).

| Content | Mark | Note |
| --- | --- | --- |
| System prompt and tool names | ✅ | MCP tool schemas stay deferred until a tool search loads them. |
| `CLAUDE.md`, rules, and auto memory | ✅ | The first 200 lines or 25 KB of `MEMORY.md` load. |
| Skill descriptions | ✅ | The body of a skill loads only when the skill runs. |
| Messages, tool results, and file reads | ✅ | This is the part that grows. |
| Attachments that Claude Code adds | 🔍 | A transcript of `2.1.303` shows types such as `total_tokens_reminder`, `output_style`, `queued_command`, `nested_memory`, `skill_listing`, and `edited_text_file`. |

The mod event `prompt.attachment` can rewrite or drop one attachment (see [Mod API](Claude-Code-Mod-API)).

## When Compaction Runs

Let `window` be the window of the model, or the window you set.
Let `out` be the smaller of the model output limit and `20000`.

| Level | Mark | Formula | Example for a 1,000,000 window |
| --- | --- | --- | --- |
| Effective window | 🔍 | `window - out` | 980,000 |
| Compact threshold | ✅ | `effective - 13000` | 967,000, which the docs call "about 967K" |
| Warning | 🔍 | `threshold - 20000` | 947,000 |
| Blocked | 🔍 | `window - out - 3000` | 977,000 |
| Percent override | ✅ | The smaller of `effective * pct / 100` and `effective - 13000` | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` sets `pct` from 1 to 100 |

At the blocked level, Claude Code stops the turn with a "prompt is too long" error, unless it can recover by compacting.
`CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE` (🔍) replaces the blocked level.
Claude Code finds the window in this order:
`CLAUDE_CODE_AUTO_COMPACT_WINDOW`, then the setting `autoCompactWindow` (for one model in `modelSettings`), then client data, then an experiment, then the default of the model.
The accepted window is from 100K to 1M tokens.
Source: [Model Configuration](https://code.claude.com/docs/en/model-config#context-window-and-auto-compaction) and the bundle.

## Controls

Source: [Model Configuration](https://code.claude.com/docs/en/model-config#set-the-auto-compact-window) and [Environment Variables](https://code.claude.com/docs/en/env-vars).

| Item | Mark | Effect |
| --- | --- | --- |
| `/compact [focus]` | ✅ | Compacts now, and `DISABLE_COMPACT` removes it. |
| `/autocompact <size\|auto>` | ✅ | Saves the window for the current model. |
| `--autocompact <auto\|tokens>` | ✅ | Sets the window for one launch. |
| `autoCompactWindow`, `autoCompactEnabled` | ✅ | Settings, and `autoCompactWindow` also works in the frontmatter of a subagent. |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | ✅ | Sets the window and wins over the command, the flag, and the setting. |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | ✅ | Sets the percent of the effective window. |
| `DISABLE_AUTO_COMPACT` and `DISABLE_COMPACT` | ✅ | Turn off automatic compaction, or all compaction. |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | ✅ | Sets the window for a model ID that Claude Code does not know. |
| `CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT` | ✅ | Compacts only after the API says the prompt is too long. |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | ✅ | Turns off the 1M choice. |
| `idleCompaction`, `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` | ✅ | Compact a conversation that is idle. |
| `/rewind`, then Summarize from here or up to here | ✅ | Compacts one part of the conversation. |
| `/clear` | ✅ | Starts with an empty context. |

## Kinds of Compaction

| Kind | Mark | How it works |
| --- | --- | --- |
| Automatic | ✅ | It starts at the compact threshold, and the hooks `PreCompact` and `PostCompact` get `trigger: auto`. |
| Manual | ✅ | It starts with `/compact`, and the trigger is `manual`. |
| Reactive | 🔍 | The API refuses a request as too long, and Claude Code compacts and tries again. |
| Precomputed | 🔍 | A summary made ahead of time replaces the conversation. |
| Larger-model retry | 🔍 | A compaction that fails can try again on a model with a larger window. |
| Server side | 🔍 | The beta `context-management-2025-06-27` lets the API edit the context. |

Auto compaction stops with an error when the context refills within 3 turns of the last compaction, 3 times in a row.
The message starts `Autocompact is thrashing`.
Source: [How Claude Code Works](https://code.claude.com/docs/en/how-claude-code-works#when-context-fills-up) and [Troubleshooting](https://code.claude.com/docs/en/troubleshooting).

## The Summary Prompt

The compaction request asks the model for a summary in `<summary>` tags with nine parts.
Source: the bundle (🔍).

1. Primary Request and Intent
2. Key Technical Concepts
3. Files and Code Sections
4. Errors and Fixes
5. Problem Solving
6. All User Messages
7. Pending Tasks
8. Current Work
9. Optional Next Step

The prompt has a short form ("in 2000 words or fewer"), a form that asks for an `<analysis>` first, and a form that covers only the recent messages.
The request uses the thinking setting of the session (v2.1.198 or later).

## What Survives

Source: [Explore the Context Window](https://code.claude.com/docs/en/context-window#what-survives-compaction).

| Content | Mark | After compaction |
| --- | --- | --- |
| System prompt and output style | ✅ | They still apply. |
| Root `CLAUDE.md`, unscoped rules, and auto memory | ✅ | Claude Code reads them again from disk. |
| The plan from plan mode | ✅ | Claude Code reads it again from disk. |
| Rules with `paths:` and nested `CLAUDE.md` files | ✅ | They load again when needed. |
| Files that were read or edited | ✅ | Up to five are read again, newest first, and a file over 5,000 tokens comes back as a path. |
| Skills that ran | ✅ | Each keeps 5,000 tokens, up to 25,000 in total, and the oldest go first. |
| Background commands and subagents | ✅ | They keep running. |
| `SessionStart` hooks with the `compact` matcher | ✅ | They run again. |

## See Also

- [Sessions and Storage](Claude-Code-Sessions-And-Storage)
- [Request Build](Claude-Code-Request-Build)
- [Models Catalog](Claude-Code-Models-Catalog)
- [Hooks](Claude-Code-Hooks)
- [Settings](Claude-Code-Settings)
