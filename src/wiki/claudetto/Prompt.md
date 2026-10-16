# Prompt

This page describes the system prompt that the core plugin `claudetto` gives to each model.
It is for a user who wants to know what Claude reads, and for a contributor who edits the `prompt` slice.

## What the Slice Does

The `prompt` slice replaces the built-in sections of the system prompt with a shorter text.
The text has the rules that each model shares and one variant for each model.
The slice uses four hooks:

| Hook | What it does |
| --- | --- |
| `prompt.compose` | Replaces the known built-in sections with the shared sections and the variant of the model. |
| `prompt.section` | Gives each built-in section that has a transform its shorter text. |
| `agent.spawn` | Keeps the model of a subagent for `session.append`. |
| `session.append` | Adds the model block to the end of the task of a subagent, one time. |

The code is in `src/plugins/claudetto/slices/prompt/`.
The texts are `.md` files in the folder `prompts/`, and `just generate` builds the module `prompts.ts` from them.

## Variants

Each model family gets one variant:

| Key | Model | Model notes |
| --- | --- | --- |
| `opus` | Opus 5.5 | One notes section. |
| `sonnet` | Sonnet 5.5 | No notes section. |
| `haiku` | Haiku 5.5 | One notes section with the step line. |
| `fable` | Fable 5.1 | One notes section. |

A model id that matches no family gets no variant.
Its sections get only the transforms of `prompt.section`.
The slice chooses the variant at the first `prompt.compose` of a session and keeps it.
A model switch does not change the system prompt, because a changed system prompt breaks the prompt cache.

The `intro` section starts from the `lean_body` text that Claude Code 2.1.302 sends (`domain/live-block.ts`).
A test fails when a line of that text has no transform.

## Transforms

A transform finds each part of a built-in section with an anchor, and it replaces the part with a shorter text (`transforms/parts.ts`).
The anchors match the text that Claude Code writes.
This text is English in each language of the user, so an anchor does not depend on the language of the user.
A new version of Claude Code can change the text.
Then an anchor finds nothing, and that part stays as Claude Code wrote it.
For each anchor that finds nothing, the slice writes one line to the debug log (`missLines` in `domain/apply.ts`).
The line names the section and the anchor.
Some parts are in the text only in some sessions, such as the line about fast mode, so a line in the log does not always mean a new version.

## Subagents

A subagent gets its system prompt from its agent file, so it does not get the shared sections.
The slice adds a short block for the model of the subagent to the end of its task.
The block has the block line and the evidence line.
Sonnet and Haiku also get the verification line, and Haiku also gets the step line.

## Compaction Gate

The `context_management` section agrees with the compaction state of the session:

| State | When | Text |
| --- | --- | --- |
| `handoff` | The `compaction` option is `handoff`, the default. | It says that a handoff carries the work. |
| `built-in` | The `compaction` option is `built-in`. | The built-in text. |
| `off` | `DISABLE_COMPACT` is on. | It says nothing of compaction. |

See [Handoff](Handoff) for the `compaction` option.

## Tool Descriptions

The `surface` slice gives shorter descriptions for these tools:

| Tool | Change |
| --- | --- |
| `Agent` | A shorter description. |
| `Bash` | A shorter description, with the parts that Claude Code computes for each run. |
| `Read` | A shorter description. |
| `ListAgents` | Deferred behind `ToolSearch`. |

A description replaces the built-in one only when it is shorter.
The built-in `Bash` text has values that Claude Code computes for each run:
the Windows note, the timeouts, the background line, and the `# Machines` section.
The `Bash` text of `claudetto` copies each of these parts from the built-in text, so a value such as `BASH_DEFAULT_TIMEOUT_MS` stays correct.

## Size

The profile makes the first request smaller for each model, by about 2,000 to 2,500 tokens.
`tests/claudetto/prompt/sizes.test.ts` pins the size of each text, and a test fails when a text grows past its pin.
To change a text, measure the first request again and update the pin.

## Related Pages

- [Trim](Trim): the built-in parts that `claudetto` turns off.
- [Output Style](Output-Style): the `Concise` output style.
- [Agents](Agents): the role agents and their model blocks.
- [Handoff](Handoff): the `compaction` option.
- [Settings Snippet](Settings-Snippet): the settings that the profile sets.
