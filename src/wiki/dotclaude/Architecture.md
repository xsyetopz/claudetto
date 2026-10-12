# Architecture

This page is the map of dotclaude 1.0.0.
It covers the kernel, the slices of the core plugin `dotclaude`, the one hook module, the 11 events, the path from `src/` to `plugins/`, and the five add-on plugins.
The core plugin is the reference for the parts that you copy from the settings snippet too.
The Claude Code side of each event is on [Hook-Events](Hook-Events).

## Folder map

dotclaude has three folders of code.

- The kernel, in `src/kernel/`, holds the code that the plugins share.
- The slices, in `src/plugins/<plugin>/slices/<s>/`, hold the features.
- The plugins, in `plugins/<plugin>/`, are the output of `just generate`.
  Claude Code loads these folders.
  Do not edit them by hand.

## Parts of a slice

Each slice has one `slice.ts`, which names what the slice adds to its plugin.
The other parts depend on the slice.

- `domain/` holds the logic of the slice.
- `adapters/` connects the domain to an entry point, such as `mod.ts` for the mod handlers.
- `limits.ts` holds the bounds of the slice.
- The ports are the interfaces that the domain needs.
  The shared ports are in `src/kernel/ports.ts`.
- `lab/` holds the hook lab tests, and `skills/` holds the skill files.

The contract of a slice is in `src/kernel/slice.ts`.
A mod handler has an `event`, an optional `filter`, a `phase`, and a `run` function.
The phases run in this order: `observe`, `normalize`, `rewrite`, `check`, and `answer`.

## Kernel

| File | What it holds |
| --- | --- |
| `src/kernel/slice.ts` | The slice contract, the `PHASES` order, and the types of a mod handler and a classic hook. It has no runtime import. |
| `src/kernel/budget.ts` | The shared runtime bounds, such as `CONTEXT_WINDOW` and `BASH_OUTPUT_MAX_CHARS`. |
| `src/kernel/paths.ts` | The paths of the files that dotclaude reads or writes. It has no import. |
| `src/kernel/temp-paths.ts` | The names of the scratch folders in the temp folder. |
| `src/kernel/errors.ts` | The error policy. A `catch` names the errors that it expects, and passes the others on. |
| `src/kernel/model.ts` | The parts of a Claude model id. |
| `src/kernel/ports.ts` | The interfaces that a CLI or a test replaces with an adapter or a fake. |
| `src/kernel/node/` | The adapters of the Node and Bun runtimes, such as `fs.ts`, `hook-io.ts`, and `process.ts`. |
| `src/kernel/shell.ts`, `shellkinds.ts`, `wrappers.ts` | The shell reader. It reads the syntax that decides which command runs, and it does not run a shell. |
| `src/kernel/rules.ts` | The checks of rule files in `.claude/rules/` that need no model. |
| `src/kernel/policy/` | The catalog of the destructive floor. Each category is a file in `rules/`, and `index.ts` lists them. |
| `src/kernel/spec-store.ts` | The format and the reader of the spec store file `events.jsonl`. Only the `spec` slice writes it. |
| `src/kernel/skill-command.ts` | The rules of a mod handler that answers a skill command by running its CLI. |

A hooks module imports only the kernel files that have no `node:` import, because a hooks module has no `Bun` and no `node:` module.
The generator copies each kernel file that a plugin imports into the plugin, so each plugin has its own copy.

## Slices of the core plugin

The core plugin has 15 slices.
The events column names the events that the slice declares in `mod`, in its `slice.ts`.

| Slice | What it does | Events |
| --- | --- | --- |
| `agents` | Holds the six agent files, with the model, the effort, and the `maxTurns` of each. | None |
| `asks` | Asks before a change to a protected file, a git call that discards work, or an added skipped test or lint suppression. | `tool.check` |
| `checks` | The CLI `dotclaude-run-checks`, which runs check commands with no model turn. | None |
| `decide` | The tool `second_opinion` and the CLI `dotclaude-decide`, which ask Jev. | `session.start`, `tool.call` |
| `guard` | Denies a `Bash` command that only prints a file. Asks before the first call of a session that reaches a repository of another owner with an AI policy. | `tool.call`, `tool.check` |
| `handoff` | The handoff of the main session, and the note that tells a subagent to report before its bound. | `turn.step`, `tool.call`, `skill.prompt`, `turn.complete` |
| `prompt` | The system prompt of each model, the block at the end of a subagent task prompt, and the `context_management` section. | `prompt.compose`, `prompt.section`, `agent.spawn` |
| `rules` | The skill `rules-creator`. | None |
| `sembr` | Rewrites a `tool.call` on a Markdown file so that each sentence starts a line. | `tool.call` |
| `setup` | The skill `setup`, the CLI `dotclaude-setup`, and the drift check. | `session.start` |
| `spec` | The CLI `dotclaude-spec`, which writes the spec store, and the handlers that move a package lane for `ship`. | `agent.spawn`, `turn.complete` |
| `statusline` | The CLI `dotclaude-statusline` and its segments. | None |
| `styles` | The output style `dotclaude:Concise`. | None |
| `surface` | Shortens the descriptions of the built-in tools, and drops built-in agent types from the listing and from dispatch. | `agent.offer`, `tool.describe` |
| `trim` | The settings and env entries that turn off each built-in part that dotclaude removes. | None |

The `statusline` slice and the `styles` slice declare no mod handler.
Their parts go to Claude Code as a status line command and an output style.

## The 11 events

The core plugin uses 11 events.
Each event has one or more mod handlers, and each handler names its phase.

| Event | Slice and phase |
| --- | --- |
| `session.start` | `decide` (`observe`), `setup` (`observe`) |
| `tool.check` | `asks` (`check`), `guard` (`check`) |
| `tool.call` | `decide` (`rewrite`, `answer`), `guard` (`check`), `handoff` (`observe`), `sembr` (`rewrite`) |
| `prompt.compose` | `prompt` (`rewrite`) |
| `prompt.section` | `prompt` (`answer`) |
| `agent.spawn` | `prompt` (`rewrite`), `spec` (`observe`) |
| `turn.step` | `handoff` (`observe`) |
| `turn.complete` | `handoff` (`observe`), `spec` (`observe`) |
| `skill.prompt` | `handoff` (`rewrite`) |
| `tool.describe` | `surface` (`answer`) |
| `agent.offer` | `surface` (`answer`) |

The 19 mod handlers of the core plugin become 19 `on()` calls in one file.
The generator writes that file as `plugins/dotclaude/hooks/register.ts`.
It sorts the calls by event, then by phase, then by slice name, then by filter, in `tools/generate/order.ts`.

### Known open point: the filter of a `tool.call` handler

`tools/generate/order.ts` and the `handoff` slice say that the mod runtime refuses a handler that has no filter.
The `guard` slice has one `tool.call` handler with no filter, and `register.ts` registers it next to filtered handlers.
This page does not state the refusal as a fact.
A run of the runtime settles it, and [Hook-Events](Hook-Events) gives the Claude Code side.

## The hook module

The core plugin has one hook module, `plugins/dotclaude/hooks/register.ts`.
It is generated, so do not edit it.
The file `plugins/dotclaude/hooks/hooks.json` lists only the module:

```json
{"modules": ["./register.ts"]}
```

The core plugin has no classic command hook.
The checks that the module runs are on [Guards](Guards).

## Drift check

The `session.start` handler of the `setup` slice compares the active settings with the settings snippet.
It appends one note to the conversation only when it finds a difference, and the note asks Claude to tell you.
It changes no setting.

| Difference | Line of the note |
| --- | --- |
| A built-in plugin of the snippet is not `false` in `enabledPlugins`. | Names each plugin and the setting that turns it off. |
| A skill of the listing has the source `syncedSkills`. | Gives the count and names `syncClaudeAiSkills`. |
| The Claude Code version is not `2.1.296`. | Gives the version and the tested version. |
| The policy source of the settings has a key. | Reports that the guard is seated, and names the parts that it skips. |
| `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set. | Reports that the `model` and `effort` of the agent files do not apply. |

A fact that cannot be read gives no line, so a failed read cannot make a false report.
The tested version is `TESTED_VERSION` in `src/plugins/dotclaude/slices/setup/domain/facts.ts`.
The section ids, the plugin names, and the version are data that Claude Code does not document, as [Undocumented-Reads](Undocumented-Reads) explains.

## Skills

The core plugin ships six skills.
Each one is user-invoked, with `disable-model-invocation: true`, so it has no listing line in a request.

| Entry | What it does |
| --- | --- |
| `/dotclaude:handoff` | Writes a handoff file, then starts a clean session that reads it. |
| `/dotclaude:hotfix` | Fixes a defect with a known cause, then runs the check and writes a record with `dotclaude-spec record`. |
| `/dotclaude:rules-creator` | Creates and improves rule files in `.claude/rules/`. |
| `/dotclaude:setup` | Applies the settings snippet and checks the tools of the installed add-ons. |
| `/dotclaude:ship` | Runs the open packages of a large change, one implementer for each package in a worktree. |
| `/dotclaude:spec` | Sizes a request, then starts a change in the spec store with `dotclaude-spec new`. |

A skill has a `name` and a `description` of 150 to 300 bytes together.
The bounds are `SKILL_META_LOW_BYTES` and `SKILL_META_HIGH_BYTES` in `tools/limits.ts`.
A skill above 300 bytes fails the size check, and a skill below 150 bytes gives only an advisory.

## Limits

Each bound is in one file, and tests pin the copies.
The shared bounds are in `src/kernel/budget.ts`.

| Bound | Value | File |
| --- | --- | --- |
| Context window | {{CONTEXT_WINDOW}} tokens | `src/kernel/budget.ts` (`CONTEXT_WINDOW`) |
| Status line colors | Yellow at {{USAGE_LEVEL_LOW}}% and red at {{USAGE_LEVEL_HIGH}}% of the window | `src/kernel/budget.ts` (`USAGE_LEVELS`) |
| `bashOutputMaxChars` | {{BASH_OUTPUT_MAX_CHARS}} characters | `src/kernel/budget.ts` (`BASH_OUTPUT_MAX_CHARS`) |
| Policy `gh` call | {{POLICY_TIMEOUT_MS}} ms | `src/kernel/budget.ts` (`POLICY_TIMEOUT_MS`) |
| Policy text in the ask | {{POLICY_FILE_MAX_CHARS}} characters | `src/kernel/budget.ts` (`POLICY_FILE_MAX_CHARS`) |
| Subagent context | {{SUBAGENT_CONTEXT_MAX}} tokens, and {{HAIKU_CONTEXT_MAX}} for Haiku 5.5 | `src/plugins/dotclaude/slices/handoff/limits.ts` |
| Subagent turns left at the note | {{TURNS_LEFT_AT}} | `src/plugins/dotclaude/slices/handoff/limits.ts` (`TURNS_LEFT_AT`) |
| Subagent report | {{REPORT_MAX_WORDS}} words | `src/plugins/dotclaude/slices/handoff/limits.ts` (`REPORT_MAX_WORDS`) |
| Size of a file that the `asks` checks read | {{FILE_MAX_BYTES}} bytes | `src/plugins/dotclaude/slices/asks/limits.ts` |
| Rows of the status line | {{MAX_ROWS}} | `src/plugins/dotclaude/slices/statusline/limits.ts` |

The size of the first request is bounded in `tools/limits.ts` (`FIRST_REQUEST_LOW_BYTES` to `FIRST_REQUEST_HIGH_BYTES`).
The [Plugin-Layout](Plugin-Layout#bound-tiers) page explains the tiers.

## From `src/` to `plugins/`

`just generate` runs `bun tools/generate/index.ts`.
It writes a generated file only when the content differs, and `just generate --check` exits 1 and names each file that differs.
The steps are these.

1. `tools/generate/discover.ts` finds each `src/plugins/<plugin>/slices/<s>/slice.ts`, the `plugin.ts` of each plugin, and each `adapters/mod.ts`.
2. `tools/generate/order.ts` orders the mod handlers, and refuses two handlers of one slice with the same event, filter, and phase.
3. `tools/generate/emit/register.ts` writes `hooks/register.ts`.
4. `tools/generate/emit/hooks.ts` writes `hooks/hooks.json`, and `tools/generate/emit/evals.ts` writes `evals/hooks.json`.
5. `tools/generate/emit/manifest.ts` writes `.claude-plugin/plugin.json` from `plugin.ts`, and takes the version from `package.json`.
6. `tools/generate/emit/slices.ts` copies the skills, agents, styles, lab tests, and evals of each slice to the plugin folder, and writes one launcher for each CLI.
7. `tools/generate/closure.ts` copies each kernel file that a plugin imports to `plugins/<plugin>/kernel/`.
8. `tools/generate/emit/snippet.ts` computes the settings snippet from the `settings` of the slices.
9. `tools/generate/emit/texts.ts` writes every other file of `src/` to the same path under `plugins/` or `wiki/`.
   So `src/wiki/dotclaude/Architecture.md` gives `wiki/dotclaude/Architecture.md`, and a `src/fragments/` file gives no output.
   `tools/generate/emit/fill.ts` replaces each include line with a fragment of `src/fragments/`, and each bound name in double braces with its value.

The files under `plugins/` have a header that names the source, except a JSON file, because JSON has no comment.
A file in `plugins/` that has no source fails the generator.
The check `just check` runs `just generate --check`, so a change in `src/` needs `just generate` before the commit.

## Add-on plugins

Five add-on plugins sit next to the core plugin.
Each one has its own tree under `src/plugins/<name>/`, and works without the core plugin.

| Plugin | Slices | What it does |
| --- | --- | --- |
| `dotclaude-codegraph` | `graph` | Gives Claude the code graph of a project, with the `codegraph` CLI. See [Code-Graph](Code-Graph). |
| `dotclaude-browser` | `browse`, `search` | Drives a real browser for Claude. See [Browser](Browser). |
| `dotclaude-docs` | `docs` | Gets the current docs of a library with the `ctx7` CLI. See [Library-Docs](Library-Docs). |
| `dotclaude-sessions` | `start-cost`, `usage` | Measures Claude Code sessions from their transcripts. See [Sessions](Sessions). |
| `dotclaude-lab` | `capture`, `eval-compare`, `sandbox`, `schema` | Has tools for plugin authors. See [Lab](Lab). |

The add-ons import nothing from each other, and nothing from `dotclaude`.
Each one imports only the kernel and the `claude-code` types, and the generator copies the kernel files into the plugin.
The overview of the add-ons is on [Add-Ons](Add-Ons).

## Related pages

- [Guards](Guards)
- [Agents](Agents)
- [Skills](Skills)
- [Spec-Store](Spec-Store)
- [Prompt-Surface](Prompt-Surface)
- [Status-Line](Status-Line)
- [Settings-Snippet](Settings-Snippet)
- [Bounds](Bounds)
- [Plugin-Layout](Plugin-Layout)
- [Decisions](Decisions)
