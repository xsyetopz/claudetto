# Request Build

This page answers four questions about the request of Claude Code `2.1.296`:

- What does one request contain?
- In what order does the system prompt put its sections?
- How does an output style change the prompt?
- Where are the cache breakpoints, and where does dotclaude change the request?

The page also covers the plugin hooks modules.
Read it if you change the prompt, the cache, or the hooks of dotclaude.

## Sources and Labels

The labels are **`official`** (Anthropic docs), **`binary`** (the Claude Code bundle, read only), **`capture`** (a live request, recorded through a proxy).
The label **`measured`** marks a run on this machine.
An inference is marked `(inferred)`.

- The section and tool texts come from an extract of the `2.1.296` bundle.
  The extract has two live sessions with an empty configuration.
  So each text has a capture where it shows.
  The method and the byte sizes are in the extract report of the change folder `evidence/extract.md`.
- The request captures are from 2026-10-11.
  They are three requests in the `vanilla` folder, four requests in the `snippet` folder, and one request in the `snippet-applied` folder.
  They are read only.
  The sizes below are UTF-8 byte counts of the text.
- The docs are the Claude Code page on [output styles](https://code.claude.com/docs/en/output-styles) and the platform page on [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).
  Both were read on 2026-10-13.
- This page gives no bundle code and no verbatim prompt text.
  It names the sections and the files, and it gives the size of each text.

## The Request

A request has three parts.
The prompt cache reads them in the same order (**`official`**).

| Part | What it holds | Size in the captures (**`capture`**) |
| --- | --- | --- |
| `tools` | The tool definitions, with the deferred tools as names only. | 12 definitions, 28546 bytes of JSON, in the sonnet capture. 9 definitions, 14474 bytes, in the opus capture. |
| `system` | Three blocks: the billing header, the identity line, and the body. | 74, 62, and 5880 bytes in the sonnet lean capture. 62 and 7762 bytes in the opus capture. |
| `messages` | The first user message with the `<system-reminder>` blocks, then the user prompt. A second message with role `system` holds the environment block. | First message 4794 bytes of reminders. Environment block 9755 bytes in the sonnet capture, and 5389 bytes in the opus capture. |

The byte counts of the `tools` part are the UTF-8 bytes of the `tools` value, as compact JSON with no spaces.
The method uses `json.dumps` with the separators `,` and `:` and `ensure_ascii=False`.
A run on the `tools` value of `external/capture/vanilla/request-2026-10-11T03-06-47-464Z-1.json` and `-2.json` applies it.
The files are pretty-printed.
Their raw text is larger: 33,619 and 17,825 bytes with the indentation.

The billing header has no cache marker.
The identity line and the body have the marker in each capture that sends them.

## The System Prompt Sections

The engine builds the body from sections, and each section has an `id`.
The bundle chooses the set by a gate.
The gate is the trait `lean` (**`binary`**, `2.1.296`).
The extract report gives the gate in full.

- **Lean body.**
  The sonnet capture has the trait `lean`.
  So its body is `lean_body`, with the other sections of the lean form.
  The body holds, in this order: the opening text (`intro`, 853 bytes, and `lean_body`, 1607 bytes), `communication` (94 bytes), and `pronouns` (361 bytes).
  The body then holds `action_caution` (520 bytes), `session_guidance` (664 bytes), `env_info_simple` (581 bytes), and `context_management` (282 bytes).
  The order is the offset order in the capture (**`capture`**).
  The capture has 918 bytes that this page does not map to a file.
- **Full body.**
  Without the trait `lean`, the shared scope has the sections `intro`, `system`, `doing_tasks`, `actions`, `tools`, and `tone`.
  The full session of the extract confirms them, with sizes 853, 1939, 3319, 3587, 650, and 555 bytes.
  The opus capture of 2026-10-11 has a different body.
  It starts with the text of `doing_tasks`.
  Then it has `communication`, `pronouns`, `action_caution`, `session_guidance`, and `env_info_simple`.
  It has no `context_management` text.
  The page does not map its other bytes (**`capture`**).

The lists below summarize each section in the words of this page.
The text of each file is in the extract, and this page does not copy it.

Sections of the full body and of the shared scope:

- `intro` says that the agent works with the user toward the user's goals, with its own judgment and the tools.
- `system` says how the output reaches the user, and how to read a tool result.
  A tool result can hold data from outside sources.
  Feedback from a hook comes from the user.
  A call that a hook blocks needs a change of action, or a question to the user.
- `doing_tasks` says how to do a software task, and how to confirm the work.
- `actions` says how to treat an action that is hard to reverse.
- `tools` says to use the dedicated tools before a shell command, and to run independent tool calls in parallel.
- `tone` says to use no emojis unless the user asks, to keep the replies short, and to refer to code as `file_path:line_number`.

Sections of the lean form:

- `lean_body` opens the lean body.
  It also holds the rules of the harness, such as the markdown output, the permission modes, and the text in pasted content.
  It limits the security work to authorized and defensive tasks.
- `communication` says to write code that matches the code around it, in the comment density, the naming, and the idiom.
- `pronouns` says to use `they` and `them` for a person whose pronouns are not stated.
- `action_caution` says to confirm first before an action that is hard to reverse or that faces outside, unless the user gave a standing approval.
- `session_guidance` says to call a skill with the `Skill` tool when the user types a skill name, and to use only the skills that are listed.
- `env_info_simple` holds notes on the model families, on the Claude Code surfaces, and on the fast mode.
- `context_management` says that a long context is summarized into the next context window, so the work goes on.

Long forms and other sections of the extract:

- `communication.full` holds the long text-output rules, such as a one-sentence plan before the first tool call.
- `session_guidance.full` holds the long session guidance, such as when to use the `Agent` tool with a specialized agent.
- `memory` and `memory.full` hold the instructions of a persistent file-based memory, in a short form and a long form.
- `total_tokens` is a one-line tag with the token budget left.
  The page does not map its gate.
- `env_info` holds the long environment notes, with the fast mode and the Claude Code surfaces.

Gated sections that the extract did not confirm in a capture:

- `autonomy_append` says to work without questions in the middle of a task, when the user is not watching.
- `bg-session` says how to work in a background session.
  It says to commit before the end, and to push when the repository has a remote.
- `brook_heron` and `willow_tern` are functions that return a text.
  This page does not summarize the text.
- `delivering_work_max` says to do the requested work, and not to narrow or widen its scope.
- `opus5_reduced_delegation` says not to use the workflow or deep-research tools unless the user, a `CLAUDE.md` file, or a skill asks for them.
- `overcorrection` says to correct an earlier statement only when the error changes the user's code, conclusions, or decisions.
- `task_continuity` says that an agreed task is approved from end to end.
  An irreversible action still needs a confirm.
- `user_pays` says that the user pays per token, so the work should be no larger than it needs to be.

## Output Styles

An output style is a set of instructions that Claude Code sends with each request (**`official`**).
It sets the role, the tone, and the format of the replies for a session.
The change takes effect from the next message (**`official`**).

The field `keep-coding-instructions` decides whether the software engineering section stays (**`official`**).
Its default is `false`.
When it is `false`, the full prompt leaves out the coding section.
The shorter prompt has no such section, so the field has no effect there (**`official`**).

The engine uses the lean form when `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` is `1`.
It uses the full form when it is `0` (**`binary`**, `2.1.296`).
The env var `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` selects the full prompt on each model (**`official`**).
When the style has no coding instructions, the section `doing_tasks` is `null` (**`binary`**, `inferred` from the same gate).

The shipped style is described under [dotclaude changes](#where-dotclaude-changes-the-request) below.
An example of a built-in style is `Concise`.
It has 265 bytes in one capture of `2.1.296` (**`capture`**).

Output styles add input tokens.
The cache reduces this cost after the first request (**`official`**).

## Attachments and Reminders

The captures show no attachment event.
The capture plugin does not record `prompt.attachment` (**`capture`**, `evidence/extract.md`).
So this page does not say which attachment types exist in `2.1.296`.

The captures show the text in the first user message:

- A block with the project instructions, 4794 bytes, that starts with a `<system-reminder>` tag.
- A block with a note about how to answer questions, 555 bytes.
- A block with the attribution rule for commits and pull requests, 585 bytes.
- In a dotclaude session, a block with the drift note of the settings snippet, 873 bytes.
  The `session.start` hook of the core plugin adds it (**`capture`**, see [Architecture](Architecture)).

The bundle has the text of a plan mode reminder and of a `TodoWrite` reminder.
Their types are `plan_mode` and `todo_reminder` (**`binary`**).
The mapping from each text to its type is not confirmed (**`binary`**).
The `prompt` slice of dotclaude sets `CLAUDE_CODE_TODO_REMINDER_MODE` to `off` (**`source`**, `src/plugins/dotclaude/slices/prompt/slice.ts`).
This page does not measure the effect on the reminder.

## Cache Breakpoints

The docs say that a cache hit needs the same prefix, up to the breakpoint (**`official`**).
The order of the prefix is `tools`, `system`, and `messages`.

- A change in `tools` clears all three levels.
- A change in `system` clears `system` and `messages`.
- A change in the images or in `tool_choice` clears `messages` only.
- A change in the thinking settings always clears `messages`.
  On some models, it also clears `tools` and `system` (**`official`**).
- The docs do not list a model change.
  So a switch of model is likely a miss (`inferred`).

The default time to live is 5 minutes.
A request can ask for 1 hour with `"ttl": "1h"` (**`official`**).
The captures show these markers (**`capture`**):

- Sonnet lean capture: the identity line and the body have `ttl` `1h`, and the environment block has `ttl` `1h`.
- Snippet capture: the same three markers with `ttl` `1h`.
- Opus capture: the identity line and the environment block have no `ttl`, so the default of 5 minutes applies.

This page does not measure the cache hits.

## Where dotclaude Changes the Request

The changes are in the sources of the plugin and in its settings snippet.

- The `styles` slice ships the style `Concise` (`src/plugins/dotclaude/slices/styles/slice.ts`).
  Its source is `src/plugins/dotclaude/slices/styles/styles/Concise.md`.
  The built file is `plugins/dotclaude/output-styles/Concise.md`.
  The style has `keep-coding-instructions: true`, so the coding section stays.
  The style sets no `force-for-plugin`, so the user's `outputStyle` setting still decides.
- The settings snippet selects `dotclaude:Concise` through the key `outputStyle`.
- The `prompt` slice has three hooks (**`source`**, `src/plugins/dotclaude/slices/prompt/slice.ts`).
  - `prompt.compose` applies the section transforms.
    It adds the model variant block once per session.
    The variant is chosen at the first call of the session and kept, so a model switch does not change the prompt.
  - `agent.spawn` adds a block to the end of the task prompt of a subagent.
  - `prompt.section` answers the section `context_management` with other text, when `DISABLE_COMPACT` is set.
    The text is the same on each call, so the cache stays.
- The settings of the `prompt` slice set these env vars: `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` to `1`, `DISABLE_COMPACT` to `1`, `CLAUDE_CODE_TODO_REMINDER_MODE` to `off`, and `CLAUDE_CODE_ATTRIBUTION_HEADER` to `0`.
  The captures of the snippet still show the billing header (**`capture`**).
  So the effect of `CLAUDE_CODE_ATTRIBUTION_HEADER` on the header is not settled.
- The `surface` slice shortens the tool texts, or defers a tool.
  The tests confirm that each transform finds its text in the extract (`tests/dotclaude/surface/extract.test.ts`).
  See [Prompt Surface](Prompt-Surface) for the sizes of the tool texts.

The `prompt.section` hook does not run when the built-in guard `sec-default` loads (see below).

## Hooks Modules

The facts of the plugin hooks modules are in this section.
They describe Claude Code `2.1.287` and later.

- A plugin can have one module, named in `hooks/hooks.json` (**`official`**).
  The module exports `register`.
  Each hook has the form `($, e, next)` (**`official`**).
- The module is an ESM file in one of the module extensions.
  It runs without the DOM and without Node (**`official`**).
  It uses `$.fs` and `$.process.run` for file and process work (**`official`**).
- The gate is the GrowthBook flag `tengu_plugin_hooks_modules`, and its default is `true` (**`binary`**, `2.1.287`).
  An organization can refuse modules with `allowManagedModsOnly` (**`official`**).
- The API is early access.
  It may change between releases (**`official`**).
- The chain order is the managed settings hooks, then the modules, then the other settings hooks (**`official`**).
- The module has no `.catch` in dotclaude.
  So a failure gives no ask, and the verdict of the engine stands.
  An action that throws is skipped.
  Its error is not logged (**`binary`**).
- The module has no permission mode.
  No field of `tool.call` or `tool.check` has one (**`official`**).
- In auto mode, the classifier decides an `ask` of `tool.check`, and it can allow the call (**`measured`**, `2.1.292`).
  A classic `PreToolUse` hook with an `ask` stops the call in auto mode (**`measured`**, `2.1.292`).
- A section has an `id`, a `text`, and a `scope` of `shared` or `session` (**`official`**).
- The module does not see the sections of `prompt.compose` in one call.
  So the core plugin uses `prompt.section` for one section.

The events that dotclaude uses are on [Architecture](Architecture#the-11-events).

## The Built-In Guard (`sec-default`)

Claude Code has six built-in mods, and `sec-default` is one of them (**`official`**).
The guard loads for Team and Enterprise users, and on a machine with managed settings (**`official`**).
A user cannot turn it off (**`official`**).

The rules that matter here are these (**`official`**).

- A user's mod cannot change the system prompt, the managed hooks, or the managed instructions.
- A user's mod can deny a call.
  It can approve a call that an `ask` rule would stop.
- A plugin that comes from a marketplace counts as a user's plugin.

On a machine with managed settings and `sec-default` loaded (**`measured`**, `2.1.292`):

- The debug log said that the `prompt.section` hook of dotclaude was bypassed.
  So the replacement of `context_management` did not reach the prompt.
- The `tool.check` hook still ran, and its `ask` reached the user.
- The classic `PreToolUse` command hook of the plugin still ran.

A managed drop-in that sets `prependPlugins` without the guard let the `prompt.section` hook run (**`measured`**, `2.1.293`).
dotclaude ships no managed settings file.
So the guard decides on a machine that has its own managed settings.

## Related Pages

- [Prompt Surface](Prompt-Surface) has the sizes of the tools and the tool transforms.
- [Prompt Variants](Prompt-Variants) has the system prompt variants of the core plugin.
- [Architecture](Architecture#the-hook-module) describes what the hooks module does.
- [Compaction and Context](Compaction-And-Context) has the `context_management` section.
- [Tools and Deferral](Tools-And-Deferral) has the deferred tools.
- [Claude Code Internals](Claude-Code-Internals) has the scope and the version of the facts.
