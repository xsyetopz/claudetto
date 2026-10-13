# 1.0.0 design: architecture

The spec workflow, the handoff, the agents, the status line, and the settings are in [workflow](workflow.md).

## Plugins

| Plugin | Commands (user-invoked skills) | Model-invoked skills | Other parts |
| --- | --- | --- | --- |
| `dotclaude` | `/spec`, `/hotfix`, `/ship`, `/handoff`, `/setup` | none | `dotclaude-spec` CLI, the mods, the status line, 7 agents, the output style |
| `dotclaude-codegraph` | none | none | 1 classic `PostToolUse` hook, a CLI, a `SessionStart` note |
| `dotclaude-browser` | none | `browse` | a mod on `WebSearch`, a CLI |
| `dotclaude-jev` | none | none | a mod with the custom tool `second_opinion` |
| `dotclaude-docs` | none | `docs` | `ctx7` |
| `dotclaude-sessions` | `/usage`, `/start-cost` | none | CLIs |
| `dotclaude-lab` | none | `eval-compare` | `capture`, `sandbox`, `schema`, and `eval-compare` CLIs, to debug Claude Code and a plugin |

A command is a skill with `disable-model-invocation: true`, so the model list at the start of a session does not show it.
No plugin has an MCP server.
Each add-on works with no other plugin installed, and `dotclaude-lab` most of all, because a user debugs a session with it.

## Component types

| Need | Type | Reason |
| --- | --- | --- |
| A fixed operation on files, such as `validate` | CLI | The model reads no code, and a test checks the output |
| A workflow that the user starts | user-invoked skill that calls a CLI | Costs nothing at the start of a session |
| Knowledge that the model looks for | model-invoked skill | Only when no CLI help text can do the work |
| A check before or after a tool call | mod (`tool.call`, `tool.check`) | Runs in the process, with no Bun start |
| A prompt change | mod (`prompt.compose`, `prompt.section`) | The only extension point for it |
| A step that needs a subprocess on an event | classic hook | Only when no mod event can do the work |
| The status line | `statusLine` command | The documented extension point |

## Architecture pattern

The code uses ports and adapters (hexagonal architecture) inside vertical slices.

- A slice holds one capability, such as `guard`, `statusline`, or `spec`, from its domain to its entry points.
  To add a capability, add a slice.
  To remove it, delete the slice.
  To move it to another plugin, move the slice.
- The domain of a slice is pure code: data and functions, with no I/O and no host API.
- A port is an interface that the domain needs from the outside, such as `FileReader` or `Clock`.
- An adapter connects the domain to one entry point of Claude Code: a mod handler, a classic hook, a CLI, or a status-line segment.
  One domain can have more than one adapter, such as a check that runs as a mod handler and as a CLI.
- The composition root is generated.
  `just generate` reads the manifest of each slice and writes the host files, so no shared file gets a hand edit.
- The mod handlers of one event form a chain of responsibility in named phases, so a slice picks a phase and not a place in a list.

Jev picked this pattern over clean architecture in layers and over a microkernel alone, with confidence 0.82 (2026-10-12).
Layers spread one capability over four folders, so parallel agents conflict on shared folders.
A microkernel alone does not keep I/O out of the logic of an extension.

### Source tree

The source is only in `src/` and `tests/`.
Tests import from `src/`.

```text
src/kernel/<module>.ts                 # shared domain code and ports, with no I/O
src/kernel/node/<module>.ts            # shared adapters with node:, bun:, or Bun, for CLIs only
src/plugins/<plugin>/plugin.ts         # the manifest data: name, description, keywords
src/plugins/<plugin>/slices/<s>/
  slice.ts                             # the manifest of <s>
  domain/                              # pure code
  ports.ts                             # the interfaces that the domain needs
  adapters/mod.ts                      # mod handlers, only when <s> has them
  adapters/cli.ts                      # a CLI, only when <s> has one
  adapters/hook.ts                     # a classic hook, only when <s> has one
  limits.ts                            # the bounds of <s>
  skills/ agents/ texts/               # the texts of <s>
tests/<plugin>/<s>/                    # the tests of <s>
```

### Generated tree

`plugins/` is generated, and no package edits it by hand.
`just generate --check` fails when `plugins/` differs from the output of the generator, and `just check` runs it.

```text
plugins/<plugin>/
  .claude-plugin/plugin.json           # from plugin.ts and the userConfig of each slice
  hooks/hooks.json                     # from the classic hooks of each slice
  hooks/register.ts                    # the composition root: one literal on() for each mod handler
  bin/<cli>                            # one launcher for each CLI adapter
  kernel/                              # the transitive closure of the src/kernel modules that the plugin imports
  slices/<s>/                          # a copy of <s>, with each src/kernel import path changed to the plugin kernel/
  skills/ agents/ output-styles/       # from the texts of each slice
```

- The generator finds each `src/plugins/<plugin>/slices/*/slice.ts`, so no list of slices exists to edit.
- The mod runtime needs a literal event name in each `on()` call, and the generated `register.ts` has one.
- Each add-on gets its own copy of the `src/kernel/` modules that it imports, so it works alone, and the copies cannot drift.
- The hook lab loads each generated `register.ts` in the mod runtime, so a module that cannot load there, such as one that imports `node:`, fails in `just lab`.
- The settings snippet is generated from the settings entries of each slice ([workflow](workflow.md#settings-snippet)).

### The slice manifest

`src/kernel/slice.ts` holds the contract of a manifest:

```ts
export type Phase = "observe" | "normalize" | "rewrite" | "check" | "answer";

export interface ModHandler<E extends EventName = EventName> {
  readonly event: E;
  readonly filter?: EventFilter<E>;
  readonly phase: Phase;
  readonly run: Handler<E>;
}

export interface Slice {
  readonly name: string;
  readonly mod?: readonly ModHandler[];
  readonly hooks?: readonly ClassicHook[];
  readonly cli?: { readonly bin: string };
  readonly segments?: readonly StatusSegment[];
  readonly skills?: readonly string[];
  readonly agents?: readonly string[];
  readonly outputStyles?: readonly string[];
  readonly userConfig?: Readonly<Record<string, UserConfigOption>>;
  readonly settings?: Readonly<Record<string, unknown>>;
}
```

- A slice can have more than one mod handler for one event, each with its own filter, such as `tool.call` on `Bash` and on `Write`.
- The generator orders the handlers of one event and filter by phase, then by slice name.
  It fails when one slice has two handlers with the same event, filter, and phase.
- A slice imports only `src/kernel/` and its own folder, and Biome enforces it with `noRestrictedImports` in an override for each folder.
- Domain code imports no adapter and no `src/kernel/node/`, and Biome enforces it in the same way.
- Data that two slices read goes in `src/kernel/`.
  The types of the spec store and its reader are in `src/kernel/spec-store.ts`, because the `spec` slice, the status line, and the handoff read them.
  Only the `spec` slice writes the store.
- Each file format has a `schema` number.
  The CLI stops with a message on a number that it does not know, with no conversion of an older file.

### Bounds

- A shared runtime bound is in `src/kernel/budget.ts`.
- A slice bound is in `slices/<s>/limits.ts`.
- A repository bound is in `tools/limits.ts`.

P01b changes the rule in `AGENTS.md` to these paths.

## Code conventions

- Arrow functions: `export const f = (a: A): B => ...`.
  Biome enforces it in `src/`, `tools/`, and `tests/`, with no test: `useArrowFunction` at the level `error` for a `function` expression, and the GritQL plugin `tools/lint/arrow-functions.grit` for a `function` declaration, because Biome has no built-in rule for a declaration.
- An interface for each port and each contract, such as `Slice` and `FileReader`.
- A class only for state that lives across calls, such as the open spec store of a CLI run.
- Plain data and pure functions in `domain/`, so that tests call them with no stub.
- No legacy code: no shim, no alias of an old name, no fallback for an old file layout.

## The rebuild branch

During the rebuild, `plugins/` holds the generated slices and the 0.28.0 files of each capability that no package has ported yet.
`tools/rebuild-pending.txt` lists those 0.28.0 paths.
The generator fails on a file in `plugins/` that it did not write and that the list does not name.
Each package removes the 0.28.0 files and tests of its capability, and their lines in the list.
P16 checks that the list is empty, and deletes it with its check.

## Tests and checks

A test checks what dotclaude does: a decision, an exit status, a written file, or a value in an output.
A test does not check the layout of the code, the text of a prompt or a doc, or a manifest field.

| Rule | Where it is enforced |
| --- | --- |
| Arrow functions, import boundaries, domain purity | `bunx biome lint` |
| `plugins/` equals the generator output | `just generate --check` |
| File size of 300 lines, and 500 for a test file | `just validate` |
| The hooks module loads in the mod runtime | `just lab` |
| Each transform finds its built-in section on the pinned version | a test of the `prompt` and `surface` slices, because a transform that finds nothing changes nothing |
| The generator orders handlers, copies the kernel closure, and writes the snippet in schema order | tests of `tools/generate/` on fixture slices |
