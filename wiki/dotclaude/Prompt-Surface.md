# Prompt surface

The prompt surface is the text that the core plugin `dotclaude` adds to what Claude reads.
It has four parts: the output style, the prompt sections, the model notes, and the tool and agent texts.
This page says what each part does, where its code is, and why it exists.
How Claude Code builds the whole request is on [Request build](Request-Build).

## Summary

- The output style `dotclaude:Concise` is the only style that the plugin ships.
- The `prompt` slice rewrites the sections of the system prompt, and it adds one model note block for each model family.
- The `surface` slice shortens the descriptions of four tools and hides two built-in agent types.
- The `handoff` slice adds the file path to the `/handoff` skill text.
  It is not part of the `prompt` slice.
- A plugin cannot replace the system prompt.
  Only CLI flags do that, and a plugin cannot pass flags.

## Output style

The `styles` slice (`src/plugins/dotclaude/slices/styles/slice.ts`) sets `outputStyle` to `dotclaude:Concise`.
The style file is `slices/styles/styles/Concise.md`.
It sets `keep-coding-instructions: true`, so the coding sections stay in the prompt.

The slice does not set `force-for-plugin`.
The `outputStyle` setting of the user therefore keeps control, and the plugin only sets the default.
The [settings snippet](Settings-Snippet) gives the same value, and the test `tests/dotclaude/settings-pin.test.ts` keeps the two equal.

Why: a style without `keep-coding-instructions` sets the section `doing_tasks` to `null`.
The `prompt` slice then has no section to change.

## Prompt sections

The `prompt` slice changes the sections of the system prompt on two hooks.

| Hook | Code | What it does |
| --- | --- | --- |
| `prompt.compose` | `onCompose` in `slices/prompt/adapters/mod.ts` | Applies the text transforms to each section, and replaces the known sections with the model variant. |
| `prompt.section` | `onSection` in `slices/prompt/adapters/mod.ts` | Applies one transform to the sections in `TRANSFORMS`. |

The known sections are in `KNOWN_SECTIONS` in `slices/prompt/domain/apply.ts`.
They are `intro`, `system`, `doing_tasks`, `actions`, `tools`, `tone`, and `lean_body`.
The transforms are in `slices/prompt/transforms/`, one file for each section.
The text of each section is in `slices/prompt/texts.ts/`.

The `context_management` section says that the context is summarized.
Its transform applies only when `DISABLE_COMPACT` is set to a value other than `0` or `false`.
The [settings snippet](Settings-Snippet) sets `DISABLE_COMPACT` to `1`.
The reason is on [Context and handoff](Context-And-Handoff).

The transform of a section gives the same text on each call.
The prompt cache therefore keeps its entries.

## Model variants

Each model family gets one variant.
The family comes from the model id, in `variantKey` in `slices/prompt/domain/apply.ts`.

| Key | Models | Model notes |
| --- | --- | --- |
| `opus` | Opus 5.5 | One notes section, and the block and evidence lines. |
| `sonnet` | Sonnet 5.5 | No notes section, and the verify, block, and evidence lines. |
| `haiku` | Haiku 5.5 | One notes section with the step line, and the verify, step, block, and evidence lines. |
| `fable` | Fable 5.1, and Mythos 5.1 | One notes section, and the block and evidence lines. |

The variant sections are in `slices/prompt/domain/variants.ts`.
Mythos 5.1 uses the `fable` variant, because one prompting guide covers both models.

A model that has no key gets no variant.
Its sections stay as Claude Code sends them.

The key is chosen at the first `prompt.compose` of a session and kept for the session.
A model switch therefore changes nothing in the system prompt.
A changed system prompt would break the prompt cache.

The variant sits where the first known section was.
The unknown sections keep their order (`composeSections` in `slices/prompt/domain/apply.ts`).

## Subagent model block

A subagent gets its system prompt from its agent body.
The `agent.spawn` hook (`onSpawn`) therefore adds the model block to the end of the task prompt.
It uses the model of the spawn, or the parent model when the spawn names none or `inherit`.
The block is added once.

## Bare traits

When a request has the trait `bare`, `onCompose` returns the sections of Claude Code unchanged.

## Simple prompt

The [settings snippet](Settings-Snippet) sets `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` to `1`.
The `lean_body` transform is in `slices/prompt/transforms/lean_body.ts`, and it is one of the known sections.

## Tool descriptions

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
A tool that no transform names passes on with no change.

## Agent offers

The `agent.offer` hook drops two built-in agent types, `claude-code-guide` and `statusline-setup`.
They are listed in `DROPPED_AGENTS` in `slices/surface/domain/agents.ts`.
The hook leaves them out of the listing and out of dispatch.
The plugin does not use these agents.

## Skill text

The `skill.prompt` hook for `/handoff` adds the handoff file path to the skill text.
The code is `onSkill` in `slices/handoff/adapters/mod.ts`.
The hook is part of the `handoff` slice, and it runs only for the skill `handoff`.
See [Context and handoff](Context-And-Handoff).

## Why the prompt is short

The text of each section is in the prompt of every request.
A rule in the prompt costs tokens on each request, so the plugin keeps the text short.
The [Decisions](Decisions) page gives the choices behind the prompt.

## Tests

- `tests/dotclaude/prompt/` checks the transforms and the variant choice.
- `slices/prompt/lab/section.test.ts` checks the `context_management` rule with `DISABLE_COMPACT`.
- `slices/surface/lab/surface.test.ts` checks the tool and agent answers.
- `tests/dotclaude/settings-pin.test.ts` keeps the output style and the environment keys of the snippet equal to the code.

## Related pages

- [Request build](Request-Build) describes how Claude Code builds each request.
- [Context and handoff](Context-And-Handoff) describes the context bound and the handoff.
- [Second opinion](Second-Opinion) describes the `second_opinion` tool.
- [Agents](Agents) describes the subagent types.
- [Settings snippet](Settings-Snippet) gives the settings keys.
