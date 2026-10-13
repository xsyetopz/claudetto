# Prompt Surface

This page describes the text that the core plugin `dotclaude` adds to what Claude reads.
It is for a contributor who edits a prompt transform, a model variant, or a tool text.
The prompt surface has four parts: the output style, the prompt sections, the model notes, and the tool and agent texts.
This page says what each part does, where its code is, and why it exists.
How Claude Code builds the whole request is on [Request build](Request-Build).

## Summary

- The output style `dotclaude:Concise` is the only style that the plugin ships.
- The `prompt` slice rewrites the sections of the system prompt.
  It adds one model note block for each model family.
- The `surface` slice shortens the descriptions of four tools.
  It hides two built-in agent types.
- The `handoff` slice adds the file path to the `/handoff` skill text.
  It is not part of the `prompt` slice.
- A plugin cannot replace the system prompt.
  Only CLI flags do that, and a plugin cannot pass flags.

## Output Style

The `styles` slice (`src/plugins/dotclaude/slices/styles/slice.ts`) sets `outputStyle` to `dotclaude:Concise`.
The style file is `slices/styles/styles/Concise.md`.
It sets `keep-coding-instructions: true`, so the coding sections stay in the prompt.

The slice does not set `force-for-plugin`.
So the `outputStyle` setting of the user keeps control.
The plugin only sets the default.
The [settings snippet](Settings-Snippet) gives the same value.
The test `tests/dotclaude/settings-pin.test.ts` keeps the two values equal.

Why: a style without `keep-coding-instructions` sets the section `doing_tasks` to `null`.
The `prompt` slice then has no section to change.

## Prompt Sections

The `prompt` slice changes the sections of the system prompt on two hooks.

| Hook | Code | What it does |
| --- | --- | --- |
| `prompt.compose` | `onCompose` in `slices/prompt/adapters/mod.ts` | Applies the text transforms to each section, and replaces the known sections with the model variant. |
| `prompt.section` | `onSection` in `slices/prompt/adapters/mod.ts` | Applies one transform to the sections in `TRANSFORMS`. |

The known sections are in `KNOWN_SECTIONS` in `slices/prompt/domain/apply.ts`.
They are `intro`, `system`, `doing_tasks`, `actions`, `tools`, `tone`, and `lean_body`.
The transforms are in `slices/prompt/transforms/`, with one file for each section.
The text of each section is in `slices/prompt/texts.ts/`.

The `context_management` section says that the context is summarized.
Its transform applies only when `DISABLE_COMPACT` is set to a value other than `0` or `false`.
The [settings snippet](Settings-Snippet) sets `DISABLE_COMPACT` to `1`.
The reason appears on [Context and handoff](Context-And-Handoff).

The transform of a section gives the same text on each call.
So the prompt cache keeps its entries.

## Model Variants

Each model family gets one variant.
`variantKey` in `slices/prompt/domain/apply.ts` matches the family.
A model id that contains a family word gets the variant of that family, whatever its version.

| Key | Matches | Model notes |
| --- | --- | --- |
| `opus` | The `opus` family | One notes section, and the block and evidence lines. |
| `sonnet` | The `sonnet` family | No notes section, and the verify, block, and evidence lines. |
| `haiku` | The `haiku` family | One notes section with the step line, and the verify, step, block, and evidence lines. |
| `fable` | The `fable` family, and the `mythos` family | One notes section, and the block and evidence lines. |

The variant sections are in `slices/prompt/domain/variants.ts`.
Mythos 5.1 uses the `fable` variant, because one prompting guide covers both models.

A model id that matches no family gets no variant.
Its sections stay as Claude Code sends them.

The key is chosen at the first `prompt.compose` of a session, and the session keeps it.
So a model switch changes nothing in the system prompt.
A changed system prompt would break the prompt cache.

The variant sits where the first known section was.
The unknown sections keep their order (`composeSections` in `slices/prompt/domain/apply.ts`).

## Subagent Model Block

A subagent gets its system prompt from its agent body.
So the `agent.spawn` hook (`onSpawn`) adds the model block to the end of the task prompt.
The hook uses the model of the spawn.
When the spawn names no model, or it names `inherit`, the hook uses the parent model.
The block is added once.

## Bare Traits

When a request has the trait `bare`, `onCompose` returns the sections of Claude Code unchanged.

## Simple Prompt

The [settings snippet](Settings-Snippet) sets `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` to `1`.
The `lean_body` transform is in `slices/prompt/transforms/lean_body.ts`.
It is one of the known sections.

## Tool Descriptions

The `surface` slice (`slices/surface/`) answers `tool.describe` for four tools.

| Tool | Change | Text |
| --- | --- | --- |
| `Agent` | A shorter description | `slices/surface/texts.ts/tool-agent.md` |
| `Bash` | A shorter description | `slices/surface/texts.ts/tool-bash.md` |
| `Read` | A shorter description | `slices/surface/texts.ts/tool-read.md` |
| `ListAgents` | Deferred behind `ToolSearch` | None |

The rules are in `TOOL_TRANSFORMS` and `toolAnswer` in `slices/surface/domain/tools.ts`.
A shorter description replaces the built-in one, and only when it is shorter.
A deferral sets `isDeferred` to `true`.
It never sets `false`.
A tool that no transform names stays unchanged.

## Agent Offers

The `agent.offer` hook drops two built-in agent types, `claude-code-guide` and `statusline-setup`.
They are listed in `DROPPED_AGENTS` in `slices/surface/domain/agents.ts`.
The hook omits them from the listing and from dispatch.
The plugin does not use these agents.

## Skill Text

The `skill.prompt` hook for `/handoff` adds the handoff file path to the skill text.
The code is `onSkill` in `slices/handoff/adapters/mod.ts`.
The hook is part of the `handoff` slice, and it runs only for the skill `handoff`.
See [Context and handoff](Context-And-Handoff).

## Why the Prompt Is Short

The text of each section is in the prompt of every request.
A rule in the prompt costs tokens on each request.
So the plugin keeps the text short.
The [Decisions](Decisions) page gives the choices behind the prompt.

## Tests

- `tests/dotclaude/prompt/` tests the transforms and the variant choice.
- `slices/prompt/lab/section.test.ts` tests the `context_management` rule with `DISABLE_COMPACT`.
- `slices/surface/lab/surface.test.ts` tests the tool and agent answers.
- `tests/dotclaude/settings-pin.test.ts` keeps the output style and the environment keys of the snippet equal to the code.

## Related Pages

- [Request Build](Request-Build): how Claude Code builds each request.
- [Context and Handoff](Context-And-Handoff): the context bound and the handoff.
- [Second Opinion](Second-Opinion): the `second_opinion` tool.
- [Agents](Agents): the subagent types.
- [Settings Snippet](Settings-Snippet): the settings keys.
