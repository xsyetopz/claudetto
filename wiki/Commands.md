# Commands

dotclaude adds a small set of entries to Claude Code.
This page says who can invoke each entry, what each entry costs, and what the drift check does.
The decision is D5 in [Decisions](Decisions-Settings).

## Who invokes what

- An entry that writes user configuration is user-invoked only.
  Claude Code refuses a `Skill` call for it.
- Each other entry is model-invocable, so Claude can move the work forward without the user.

| Entry | Invoked by | File |
| --- | --- | --- |
| `/dotclaude:setup` | The user only (`disable-model-invocation: true`) | `skills/setup/SKILL.md` |
| `docs` in `dotclaude-docs` | The model | `plugins/dotclaude-docs/skills/docs/SKILL.md` |
| Drift check | Runs at session start | `features/drift/` |

The path for `setup` is under `plugins/dotclaude/`.

## Small listing

Each skill that the model can invoke adds its listing line to each request.
These rules keep the cost small:

- The `name` and `description` of a skill have 150 to 300 bytes together.
  `SKILL_META_LOW_BYTES` and `SKILL_META_HIGH_BYTES` in `tools/limits.mjs` hold the bounds.
- A user-invoked entry has no listing line.
- The `openspec-*` skills are project skills, so the [settings snippet](Settings-Snippet) sets them `name-only` in `skillOverrides`.
- `skillOverrides` does not apply to a plugin skill on Claude Code 2.1.293.
  A plugin skill therefore keeps its full listing line until the user turns off the whole plugin.
  This is why `docs` is in its own add-on ([Library docs](Library-Docs)).

## Setup

`/dotclaude:setup` sets up OpenSpec in the current project.
It shows each step and asks before it runs one.
It changes no Claude Code setting.
The settings are in the [settings snippet](Settings-Snippet), which you merge by hand.

## Drift check

At session start, the hooks module compares the active settings with the [settings snippet](Settings-Snippet).
It adds text to the context only when it finds a difference, and it changes no setting.

- Plugin on again: a Claude Code update turned on a built-in plugin that the snippet turns off.
  The check names the plugin and the setting that turns it off, in one line.
- Synced skill: a skill of the listing comes from the claude.ai sync.
- Version: Claude Code is not 2.1.295, the tested version.
- Unknown section: the system prompt has a section id that dotclaude does not know.
  The section stays as Claude Code made it.
- Guard seated: the machine has managed settings.
  The check names the dotclaude parts that the guard skips ([Parts](Parts#drift-check)).
- Agent files blocked: `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set, so the `model` and `effort` of the agent files do not apply.

When the settings match the snippet, the check adds no text.
A fact that the check cannot read gives no line.

## Script before model

An entry whose work is a fixed procedure does the work in a script.
The model gets the result and the decisions that the user must make.
For example, the setup script makes the diff, and the model does not read the settings files.
This saves tokens and gives the same result in each run.

## No third-party skills

dotclaude ships no skill from another author or from another repository of the same author.
Each skill in the plugins is a dotclaude part.
A test checks that each skill of the plugin has a file, a matching name, and a row in [Parts](Parts#skills).

## Related pages

- [Parts](Parts)
- [Install](Install)
- [Prompt surface](Prompt-Surface)
