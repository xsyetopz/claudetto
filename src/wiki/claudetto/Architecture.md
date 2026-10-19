# Architecture

This page is the map of `claudetto`: the layers, the kernel, the slices, and the composition of a plugin.
A contributor reads it before a change to the code.
The build from `src/` to `plugins/` is on [Architecture Generate](Architecture-Generate).
The folders are on [Plugin Layout](Plugin-Layout).

## Layers

`claudetto` has five layers.
A layer imports only from the layers below it.

| Layer | Folder | What it holds | Imports |
| --- | --- | --- | --- |
| Kernel | `src/kernel/` | Pure code that the plugins share: the slice contract, bounds, paths, the shell reader, and the model ids. | Nothing, except `src/kernel/node/` |
| Runtime adapters | `src/kernel/node/` | The adapters of Node and Bun: files, processes, hook input and output. | The kernel |
| Slices | `src/plugins/<plugin>/slices/<s>/` | One feature each. | The kernel, and its own folder |
| Entry points | `src/plugins/<plugin>/` | `plugin.ts` and `description.md`, which give the manifest. | The slices |
| Generator | `tools/generate/` | The build from `src/` to `plugins/` and to the marketplace file. | Each layer, at build time only |

The rules of the layers:

- A slice never imports another slice.
  Slices share data only through a file layout that the kernel names in `src/kernel/paths.ts`.
- A plugin never imports another plugin.
  The generator copies each kernel file that a plugin uses into that plugin.
- A hooks module has no `node:` import, no `bun:` import, and no `Bun`.
  So a mod handler imports only the pure kernel.
- Each slice states its rung of the decision ladder in the field `ladder` of `slice.ts`.

## The Kernel

The kernel has these files:

| File | What it holds |
| --- | --- |
| `slice.ts` | The contract of a slice manifest, the phases, and the rungs of the ladder. |
| `budget.ts` | The shared runtime bounds, such as `CONTEXT_WINDOW` and the handoff trigger. |
| `paths.ts` | The paths of the files that `claudetto` reads or writes. |
| `change.ts` | The task state of an OpenSpec change, from the text of `tasks.md`. |
| `compaction.ts` | The `compaction` option, which `handoff` declares and `prompt` reads. |
| `ground.ts` | The source check of quoted values, for `handoff` and `ground`. |
| `shell.ts`, `shellkinds.ts`, `wrappers.ts`, `shell/` | The shell reader for the guards. It reads the syntax, and it does not run the shell. |
| `model.ts`, `errors.ts`, `text.ts`, `ports.ts` | Model families, the error policy, small text tests, and the ports that tests replace. |
| `node/` | The adapters of Node and Bun, for the CLIs. |

Change a shared bound only in `budget.ts`.
See [Bounds](Bounds).

## The Decision Ladder

For each feature, a slice uses the highest rung that can do the work.
The field `ladder` of `slice.ts` names the rung and the reason.

| Rung | Meaning | Example |
| --- | --- | --- |
| `mod` | A hook of the Mod API. | `guard`, `handoff`, `ground` |
| `classic` | A classic command hook. | The core plugin has none. |
| `built-in` | A setting, an env var, or a plugin part with no hook. | `setup`, `styles`, `spec` |
| `none` | Nothing. | |

## Slices

A slice adds one feature.
The generator finds each folder `slices/<s>/` that has a `slice.ts`.
The file exports `slice`, and `slice.name` equals the folder name.

A slice can add these parts:

| Field | Part |
| --- | --- |
| `mod` | Mod handlers: an event, a filter, a phase, and a `run` function. |
| `hooks` | Classic command hooks. |
| `cli` | A command in `bin/`. |
| `skills` | Skills. |
| `userConfig` | Options that the user sets. |
| `settings` | Keys of the settings snippet. |
| `segments` | Segments of the status line. |
| `controls` | The record of each hook, guard, cap, or notice. |

Mod handlers of one event run in this order of phases:

1. `observe`
2. `normalize`
3. `rewrite`
4. `check`
5. `answer`

For example, `sembr` rewrites in the phase `rewrite`, and `guard` checks in the phase `check`.
The generator orders the handlers by event, phase, slice name, and filter.

## Plugin Composition

A plugin is a folder `src/plugins/<plugin>/` with `plugin.ts`, `description.md`, and a folder `slices/`.
`plugin.ts` gives the keywords and the homepage.
The generator takes the version from `package.json`, the `userConfig` from the slices, and the hooks from the slices.

The core plugin `claudetto` has 15 slices.
See [Overview](Overview) for the list.
Each add-on has one to four slices:

| Plugin | Slices |
| --- | --- |
| `claudetto-codegraph` | `graph` |
| `claudetto-browser` | `browse`, `search` |
| `claudetto-docs` | `docs` |
| `claudetto-sessions` | `sessions` |
| `claudetto-lab` | `capture`, `eval-compare`, `sandbox`, `schema` |

A new feature is a new slice.
It goes into the core plugin only when most users need it.
Otherwise it goes into an add-on, and the add-on works without the core plugin.

## The Hooks Module

Each plugin with mod handlers has one hooks module, `hooks/register.ts`.
The generator writes it, with one literal `on()` call for each handler.
`hooks/hooks.json` names only this module: `{"modules": ["./register.ts"]}`.
The module has a comment `// eval: <event> <slice>` above each `on()` call.
That comment links the hook to its entry in `evals/hooks.json`.
See [Plugin Layout](Plugin-Layout#hook-evals).

## Related Pages

- [Architecture Generate](Architecture-Generate): the build from `src/` to `plugins/`.
- [Plugin Layout](Plugin-Layout): the folders and the import rules.
- [Controls](Controls): the record of each hook and guard.
- [Decisions](Decisions): the reasons for the design.
