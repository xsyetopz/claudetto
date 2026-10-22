# Architecture

This page is the map of the `claudetto` repository: the plugins, the kernel, the slices, and the hooks module.
Read it before you read the code or add a feature.

## The Plugins

The repository is a Claude Code plugin marketplace.
`plugins/` is the source of each plugin, and Claude Code reads its files as they are.
No build step writes them.

| Plugin | Folder | What it holds |
| --- | --- | --- |
| `claudetto` | `plugins/claudetto/` | The core plugin: the main agent, the roster, the permission gate, and the other slices. |
| `claudetto-browser` | `plugins/claudetto-browser/` | The browser add-on. |
| `claudetto-docs` | `plugins/claudetto-docs/` | The library docs add-on. |

Each add-on works without the core plugin, so it imports nothing from another plugin.
Only `plugins/` ships to users.
The core plugin sets `agent` to `claudetto:main` in its `settings.json`.

## The Layers

Each plugin has the same layers.
A layer uses only the layers below it.

| Layer | Folder | What it holds | Imports |
| --- | --- | --- | --- |
| Kernel | `plugins/<plugin>/kernel/` | Pure code that the slices of the plugin share: bounds, paths, the shell reader, the model ids, and the ports that tests replace. | Nothing, except `kernel/node/` |
| Runtime adapters | `plugins/<plugin>/kernel/node/` | The adapters of Node and Bun: files, processes, and hook input and output. | The kernel |
| Slices | `plugins/<plugin>/slices/<s>/` | One feature each. | The kernel, and its own folder |
| Entry points | `plugins/<plugin>/hooks/register.ts` and `bin/` | The hooks module and the commands. | The slices |

The rules of the layers:

- A slice never imports another slice.
- A plugin never imports another plugin.
  An add-on keeps its own copy of each kernel file that it uses, and a test keeps each copy equal to the file in `plugins/claudetto/kernel/`.
- A file in the import graph of the hooks module has no `node:` import, no `bun:` import, and no `Bun`.
  So a mod handler imports only the pure kernel.

The tests in `tests/claudetto/imports.test.ts` and `tests/claudetto/import-rules.test.ts` check the import rules.
See [Plugin Layout](Plugin-Layout#imports).

## The Kernel

The kernel of the core plugin has these files:

| File | What it holds |
| --- | --- |
| `budget.ts` | The shared runtime bounds, such as `CONTEXT_WINDOW` and the handoff trigger. |
| `paths.ts` | The paths of the files that `claudetto` reads or writes. |
| `change.ts` | The task state of an OpenSpec change, from the text of `tasks.md`. |
| `compaction.ts`, `plugin-option.ts` | The `compaction` option and the reader of the options of the plugin. |
| `ground.ts` | The source check of quoted values, for `handoff` and `ground`. |
| `shell.ts`, `shellkinds.ts`, `wrappers.ts`, `shell/` | The shell reader for the permission gate. It reads the syntax, and it does not run the shell. |
| `model.ts`, `errors.ts`, `text.ts`, `ports.ts`, `slice.ts` | Model families, the error policy, small text tests, the ports that tests replace, and the shared hook types. |
| `node/` | The adapters of Node and Bun, for the commands. |

Change a shared bound only in `budget.ts`.
See [Bounds](Bounds).

## The Slices

A slice adds one feature, in one folder `slices/<s>/`.
The core plugin has these slices:

| Slice | What it does | Page |
| --- | --- | --- |
| `agents` | Offers the roster of four subagents and hides the built-in agents | [Agents](Agents) |
| `decide` | Gives Jev answers for `AskUserQuestion` | [Decide](Decide) |
| `dry` | The `claudetto:dedupe` skill | [Dry](Dry) |
| `goal` | The `/goal` check command and its `Stop` hook | [Goal](Goal) |
| `ground` | Checks plan files for claims with no source | [Ground](Ground) |
| `guard` | The permission gate | [Guard](Guard) |
| `handoff` | Writes a handoff file in place of the compaction summary | [Handoff](Handoff) |
| `hygiene` | The cleanup at session start and the edit ledger | [Session Hygiene](Hygiene) |
| `prompt` | The main agent body and the shorter tool texts | [Prompt](Prompt) |
| `reply` | The reply button | [Reply](Reply) |
| `setup` | The `claudetto-setup` command and the settings snippet | [Setup](Setup) |
| `spec` | MiniSpec | [Spec](Spec) |
| `statusline` | The status line | [Status Line](Status-Line) |
| `styles` | An empty folder. The style is in `output-styles/Concise.md` | [Styles](Styles) |

A slice has the parts that it needs:

| Part | Use |
| --- | --- |
| `domain/` | Pure logic with no I/O, and no import of an adapter. |
| `adapters/mod.ts` | The functions that the hooks module registers. |
| `adapters/cli.ts` | A command in `bin/` that exports `main`. |
| `prompts.ts` | The texts for Claude and for the user. |
| `limits.ts` | The bounds of the slice. |

A skill is in `skills/<name>/SKILL.md`, an agent is in `agents/<name>.md`, and an output style is in `output-styles/`.

## The Hooks Module

The core plugin has one hooks module, `hooks/register.ts`.
`hooks/hooks.json` names it with `{"modules": ["./register.ts"]}`, and it holds the one classic hook `PreModelSwitch`.
The module has one literal `on()` call for each mod handler.
The event name of each call is a string literal.
The module is hand-written, so a new handler needs a new `on()` call there.
Test each change to it in the hook lab (`just lab`).
See [Plugin Layout](Plugin-Layout#hook-evals) for the eval entry of each hook.

## Related Pages

- [Plugin Layout](Plugin-Layout)
- [Controls](Controls)
- [Decisions](Decisions)
- [Development](Development)
