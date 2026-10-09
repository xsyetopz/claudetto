# Prompt surface

This page shows what a Claude Code request contains and where a plugin can add or remove text.
Source labels (official, binary, capture, measured, reported, inference, tested) are in [Home](Home).
The sizes in the capture sections come from 2.1.283 to 2.1.289, and they are the latest measured sizes.

## Summary

- Since 0.27.0, the core plugin gives Claude one text of its own: the forced output style `output-styles/dotclaude.md` (the first request has the targets `FIRST_REQUEST_LOW_BYTES` and `FIRST_REQUEST_HIGH_BYTES`).
  No SessionStart hook of the core plugin adds context.
- The style is a set of XML blocks with consistent, descriptive tag names, and each example is in an `<example>` tag (**official**, [prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).
  The guide says that examples in `<example>` tags let Claude "distinguish them from instructions".
  The `<reports>` block names its nested `<report_examples>` block, and it says that the names and numbers of the examples are not facts of the session, so that Claude copies the form and not the details.
  The guide gives no trained meaning to a tag name, and a tag is plain text.
- The [settings snippet](Settings-Snippet) turns on the simple prompt with `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1`.
- The style has `force-for-plugin: true` and `keep-coding-instructions: false`.
  `force-for-plugin` overrides the `outputStyle` that the user set (**official**).
  `keep-coding-instructions` defaults to false (**official**).
- Only CLI flags replace the system prompt, and no settings key does (**official**).
  A plugin cannot pass flags.
- A request is 122 KB in an interactive session with tool search on (**capture**).
  Without tool search it is 205 KB.

## The simple prompt plus the forced style

The system prompt has a `shared` block and a `session` block (**binary**, 2.1.292).
`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1` swaps the `shared` block for a short `lean_body`.
The forced style then adds the dotclaude rules.

The `context_management` section of the `session` block says that the system summarizes prior messages when the context grows long (**binary**, 2.1.292).
That is wrong in a dotclaude session, because the snippet turns compaction off.
Two parts correct it:

- The hooks module replaces the section with a `prompt.section` hook when `DISABLE_COMPACT` is set.
  The new text says that compaction is off, that the session stops at the limit, and that OpenSpec checkboxes and commits keep the state across `/clear`.
  The text is the same on each call, so the prompt cache stays.
  On a machine where the built-in guard `sec-default` loads, the guard skips this hook (**measured**, see [Claude mods](Claude-Mods#the-built-in-guard-sec-default)).
- The `context` section of the style says the same, and it loads in each case.

The shared block has the sections `intro`, `system`, `doing_tasks`, `actions`, `tools`, and `tone` (**binary**).
The simple prompt replaces them with `lean_body`.

The `intro` text is the same on each call in 2.1.295: "You are an agent working with the user toward their goals, using your own judgment along the way." (**binary**).
In 2.1.294, the env var `CLAUDE_CODE_INTRO_FRAME` or the flag `tengu_ochre_wren` chose this text.
The 2.1.294 default was "You are an interactive agent that helps users with software engineering tasks."
2.1.295 has no variable and no old text.

| Section of the style | What it tells Claude |
| --- | --- |
| `doing_tasks` | How to work on a task. |
| `verification` | Check a claim before a report. |
| `actions` | How to treat actions that are hard to reverse. |
| `context` | The window, the end of the session, and OpenSpec: `/opsx:propose`, `/opsx:apply`, and `tasks.md`. |
| `subagents` | Delegate long reads, and give each subagent a full brief. |
| `reports` | What a final report holds. |

Verify the exact text in `output-styles/dotclaude.md`.
This page describes its sections and not its words.

## What a request contains

An interactive session has plugins, MCP servers, and an output style, with tool search on (**capture**):

| Part | Size | Contents | Replaced by `--system-prompt-file` |
| --- | ---: | --- | --- |
| `system` blocks | 6.4 KB | billing header, identity line, the built-in prompt | the prompt only |
| `messages[0]`, user | varies | `CLAUDE.md` files and the auto-memory index | no |
| `messages[1]`, role `system` | 34 KB | environment, output style, hook context, agents, skills, MCP instructions, date | no |
| `tools`, loaded | 69.5 KB | 14 full definitions, Artifact alone 34 KB | no |
| `tools`, deferred | 0.3 KB | names only, loaded on demand | no |
| Whole request | 122 KB | | about 6 KB less |

Without tool search, all 38 tools load in full, which is a 205 KB request.
Tool search is off by default when `ANTHROPIC_BASE_URL` points to another host.

## The simple prompt switch

The first match in this list decides the prompt (**binary**, 2.1.288):

1. The variable is truthy: simple.
1. The variable is `0` or `false`: full.
1. The provider is Bedrock, Vertex, or Foundry: simple.
1. The feature flag `tengu_velvet_tide` is on: simple.
1. The feature flag `simple_system_prompt` decides.

The simple prompt drops the long system bullets, the coding rules, "Executing actions with care", the task-tool section, and the tone section.
It keeps a one-line form of the first four.
The same switch sends shorter descriptions for Glob, Grep, Write, and WebSearch.

## How the rules reached Claude in older releases

| Version | How the rules reached Claude |
| --- | --- |
| 0.16 | A `claude` shell function passed `--system-prompt-file` with a 4.3k-token replacement prompt. |
| 0.17 | The profile turned on the lean prompt, and the rules sat in an output style. |
| 0.18 to 0.26 | A SessionStart hook added the rules. In 0.26 it rendered the sections of an operating spec from `lib/terms.mjs`. |
| 0.27 | The forced output style only. No SessionStart context from the core plugin. |

From 0.28.0, the `dotclaude-jev` plugin adds no SessionStart note.
Its `second_opinion` tool holds the rules in its description.

## Output styles and hook context

An output style arrives in the role-`system` message, not in the `system` blocks (**capture**, 2.1.283).
The docs say that the style is "appended to the end of the system prompt", which 2.1.283 does not do.

- `keep-coding-instructions` changes only the full prompt.
  The lean prompt has no coding instructions, and the flag does not add them (**binary**, 2.1.286).
- The `additionalContext` of a SessionStart hook arrives in the same role-`system` message as the output style (**capture**, 2.1.288).
- Claude Code keeps at most about 10,000 bytes of output from each hook command (**binary**).
- After a compaction, Claude Code runs a SessionStart hook again with source `compact`, and it drops the copy from startup (**capture**).
  The snippet turns compaction off, so a session does not reach this case.

## Tool removal

A bare tool name in `permissions.deny` removes the definition of that tool, as `--disallowedTools` does (**capture**).
Only a loaded tool saves much, because a deferred tool costs one name.

| Tool | Bytes |
| --- | ---: |
| Artifact | 34037 |
| SendFeedback | 5508 |
| Workflow | 5355 |
| AskUserQuestion | 4897 |
| ScheduleWakeup | 4631 |
| Agent | 3049 |
| Bash | 2237 |
| ReportFindings | 2177 |

The snippet denies `Agent(general-purpose)`, which is a pattern and not a bare tool name.

The snippet removes four unused tools (**binary**, 2.1.292):

- `enableArtifact: false` removes Artifact, and `enableWorkflows: false` removes Workflow.
- ScheduleWakeup has no setting, so the snippet denies it by name.
- The snippet also denies ReportFindings.
  `/code-review` uses it only when `CLAUDE_CODE_REPORT_FINDINGS` is set and the tool is present.
  Otherwise `/code-review` gives its findings as text.

With these switches and the snippet without the advisor, `/context` at the start of a sandbox session fell from 32k to 8.1k tokens (**measured**).
Of the 8.1k, the loaded tools are 5.3k and the system prompt is 1.6k.
The deferred tools (16.1k in `/context`) send only their names until Claude loads one.

## MCP tool descriptions

Claude Code cuts the description of an MCP tool.
In 2.1.295 the cut is 16,384 characters for a tool that the model loads through tool search, and 2,048 characters in other cases (**binary**, 2.1.295).
In 2.1.294 the cut was 2,048 characters for both.
`CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` sets both cuts.
The `$.tool.register` description of a mod gets the same two cuts (**binary**, 2.1.295).
The MCP page of the docs still says 2,048 characters for each tool description (**official**).

## Undocumented surfaces

- `--append-subagent-system-prompt[-file]` works only with `-p` (**official**).
  The bundle gates it behind `CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT`.
  Nobody tested it in an interactive session.
- The `policyHelper` output accepts two optional strings besides `managedSettings`: `appendSystemPrompt` and `claudeMd` (**binary**).
  They append text and cannot replace the prompt.
  Nobody has run them end to end.
- The `prompt.section` and `prompt.compose` mod events can change sections of the system prompt (**official**, d.ts).
  dotclaude uses `prompt.section` for one section, `context_management`.
  See [Claude mods](Claude-Mods).

## Attachment cuts of the hooks module

The `prompt.attachment` handler of dotclaude rewrites an attachment by exact type, and an unknown type passes on.
Task 9.3 measured one headless sandbox session of the `dotclaude` plugin on Haiku 5.5 before and after the `agent_listing_delta` cut.
The prompt was "Reply with the word ok."
The measure is `bun tools/measure.mjs <transcript>`, which prints the figures and writes no file.

| Type | Cut | Saving (tokens) |
| --- | --- | ---: |
| `agent_listing_delta` | The concurrency note is one short sentence. The agent lines stay as they are. | 15 |
| `skill_listing` | None. The listing had two lines in the measured session, and one was the removed `dotclaude:handoff` skill. | 0 |
| `environment` | None. The text holds the facts of the host and the rule for downloaded files. | 0 |
| `session_context` | The commit list is gone (earlier cut). It was empty in the measured project. | 0 |

- First request before: 10,458 tokens (input 2, cache creation 3,010, cache read 7,446).
- First request after: 10,443 tokens (input 2, cache creation 2,995, cache read 7,446).
- The agent lines are the descriptions of the five dotclaude agents.
  A shorter line would make the model pick an agent with less information, so the cut leaves them.
- The `agent.offer` handler drops `claude-code-guide` and `statusline-setup`, and it keeps every dotclaude agent.
- The cut of `environment` has no safe text, because the attachment is the one source of the host facts.

## Capture method

A local HTTP listener stood in for the API.
It saved each `/v1/messages` request body and answered 400.

```sh
ENABLE_TOOL_SEARCH=true ANTHROPIC_BASE_URL=http://127.0.0.1:18771 \
  gtimeout 40 script -q /dev/null claude "hi" </dev/null
```

- `script` gives the CLI a terminal, so it runs interactively.
- To measure print mode, remove `script` and add `-p`.
- The request bodies contain the `CLAUDE.md` of the user, so this page reports only structure and sizes.

## Related pages

- [Design](Design)
- [Claude mods](Claude-Mods)
- [Plans and models](Plans-and-Models)
