# Settings resolution

This page says how Claude Code 2.1.296 finds, orders, and merges its settings.
It also says what the dotclaude settings snippet sets, and how `/dotclaude:setup` merges it.

Each fact has a source label.
`Official docs` means the settings pages of Claude Code at code.claude.com, read on 2026-10-13.
`Binary 2.1.296` means a string in `external/cc-2.1.296/strings.txt`, found by a search and not copied.
`Inference` means a conclusion that the sources do not state.

## Settings scopes

Claude Code reads settings from four files.
An organization can also deliver managed settings from the claude.ai console or from MDM.

| Scope | File | Who it affects |
| :- | :- | :- |
| User | `~/.claude/settings.json` | You, in every project on this machine |
| Shared project | `.claude/settings.json` | Everyone who works in the project folder |
| Project local | `.claude/settings.local.json` | You, in one project |
| Managed | `managed-settings.json`, MDM, or the claude.ai console | Everyone the organization deploys to |

Source: official docs.
When `CLAUDE_CONFIG_DIR` is set, Claude Code keeps the user settings in that folder instead of `~/.claude`.

Two more sources set values, but they are not files in the stack:

- Command line: the JSON that you pass with `--settings <file-or-json>`, for one session only.
  Source: official docs.
  The binary has a settings source named `flagSettings`, which fits this source (binary 2.1.296).
- Plugin settings: the values that an enabled plugin applies.
  See [Plugin settings](#plugin-settings).

The official docs do not list plugin settings as a level of the stack.

## Order of precedence

The official docs give this order, highest first:

1. Managed settings.
2. Command line (`--settings`).
3. Project local settings.
4. Shared project settings.
5. User settings.

A key at a higher level overrides the same key at a lower level.
A key that you leave out keeps its value from the lower levels.
Source: official docs.

The docs also name exceptions.
For a few security-sensitive keys, Claude Code honors a stricter value from a lower level over a managed value.
The docs list these keys on the settings page under "Exceptions to managed settings precedence".

Some keys also have a flag or an environment variable that overrides the setting.
For example, `ANTHROPIC_MODEL` overrides the `model` key.
The docs decide this per key and per pair, not by level.
Source: official docs.

## How values merge

- Lists merge.
  When two files set the same list key, such as `permissions.allow`, Claude Code combines the lists.
  Source: official docs.
- Some keys do not merge lists, such as `fallbackModel`, `modelPicker`, and `availableModels`.
  The docs give each one its own rule.
  `availableModels` from managed settings replaces the list, and user, project, and local entries do not add to it.
  Source: official docs.
- Objects: the official docs do not say how an object key merges across the levels.
  The binary 2.1.296 search did not settle it.
  Do not assume a deep merge or a replace until a test shows it.

## Managed settings paths

Source: official docs, and the same paths are in the binary 2.1.296.

| Platform | Managed settings file |
| :- | :- |
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux and WSL | `/etc/claude-code/managed-settings.json` |
| Windows | `C:\Program Files\ClaudeCode\managed-settings.json` |

- The same folder can hold a `managed-settings.d/` folder.
  Claude Code merges `managed-settings.json` first.
  Then it merges each `*.json` file of the folder in alphabetical order.
  Claude Code ignores hidden files and files that do not end in `.json`.
  Source: official docs.
  The binary 2.1.296 has the name `managed-settings.d`.
- The official docs say that Claude Code does not read the legacy Windows path under `ProgramData`.
- Managed settings from several mechanisms do not merge by default.
  The docs say Claude Code uses one mechanism and ignores the others, unless the admin opts in.
  Source: official docs.

## The `env` key and env vars

- An `env` block in a settings file is an ordinary key.
  It follows the same levels as the other keys.
  Source: official docs.
- After `/dotclaude:setup` writes the `env` and model keys, the command tells you to restart Claude Code.
  Source: the printed message of the setup command (see [How setup merges the snippet](#how-setup-merges-the-snippet)).
- A shell export of a variable beats the same key in a settings file, for each pair that the docs name.
  Source: official docs.

The snippet sets 20 `env` entries, such as `CLAUDE_CODE_DISABLE_CRON` and `DISABLE_COMPACT`.
Source: the `env` block of the snippet.
The [Settings-Snippet-Keys](Settings-Snippet-Keys) page gives each entry, its value, and its reason.
Env vars that the binary reads and the docs do not name are on [Undocumented-Reads](Undocumented-Reads).

## Plugin settings

A plugin can set values while it is enabled.
Two places hold them:

- A `settings.json` file at the plugin root.
- The `settings` key of the plugin manifest.

The `settings.json` file takes precedence over the manifest key.
Source: official docs.
The binary 2.1.296 reads `settings.json` first, and then the manifest `settings` key (binary 2.1.296).

Only two keys take effect: `agent` and `subagentStatusLine`.
Other keys are dropped when the plugin loads.
Source: official docs, and the binary 2.1.296 has the same two-key list.

### The `styles` slice

The `styles` slice in `src/plugins/dotclaude/slices/styles/slice.ts` sets `settings: { outputStyle: "dotclaude:Concise" }`.
By the rule above, Claude Code drops `outputStyle` from a plugin.
So this plugin setting has no effect (official docs and binary 2.1.296).
The output style comes from the snippet instead, which writes `outputStyle` into a settings file.
See [What the snippet sets](#what-the-snippet-sets).
This is a defect of the slice, and it is not changed on this page.

## What the snippet sets

The snippet is the JSON of [Settings-Snippet](Settings-Snippet).
It sets top-level keys, such as `model`, `permissions`, `outputStyle`, `sandbox`, and `statusLine`, and an `env` block.
The snippet sets a key only when the Claude Code default does not give the result that dotclaude needs.
Each key has its reason on [Settings-Snippet-Keys](Settings-Snippet-Keys).

Source: the snippet in `src/plugins/dotclaude/slices/setup/texts.ts`, with the `$schema` key removed before the merge.

## How setup merges the snippet

The `/dotclaude:setup` skill runs the `settings` command of `dotclaude-setup`.
The code is in `src/plugins/dotclaude/slices/setup/adapters/settings-cmd.ts` and `src/plugins/dotclaude/slices/setup/domain/merge.ts`.

- The scope picks the file: `user`, `project`, or `local`.
  An unknown scope fails with exit status 2.
- Without `--apply`, the command prints the changes and writes nothing.
  With `--apply`, it writes the merged file, with two-space JSON and a final newline.
- The merge rules are:
  - An object merges key by key.
  - An array keeps its own entries and gains the entries of the snippet that it lacks.
    The key `availableModels` is the exception: the snippet list replaces it.
  - A scalar takes the snippet value.
    A user value that differs from the snippet is replaced.
  - A key that the snippet does not name stays.
- The `project` scope drops the status line keys, because a project file must not hold an absolute path of one computer.
- The user scope also gets the auto mode lists (inference from the `autoMode` option of the command).
- The status line keys stay when they run another tool.
  The command prints `Kept your <key>` for each kept key.
- When the model catalog of the account offers `claude-mythos-5-1`, that model replaces `claude-fable-5-1` in `availableModels`.
  A list that already holds the Mythos model keeps it.
- With the `dotclaude-docs` add-on installed, the command adds the lines of that add-on.

Inference: the merge of an object key follows the dotclaude code, not the Claude Code rule, because the Claude Code rule is not settled (see [How values merge](#how-values-merge)).

After a write, restart Claude Code, because the env and model keys take effect at the next start.
Source: the printed message of the command.

## Related pages

- [Settings-Snippet](Settings-Snippet): the snippet, and how to apply it by hand.
- [Settings-Snippet-Keys](Settings-Snippet-Keys): the reason for each key and env entry.
- [Settings-Schema](Settings-Schema): the schema that the tests check the keys against.
- [Off-Switches](Off-Switches): the keys that turn a feature off.
- [Plugin-Loader](Plugin-Loader): how Claude Code loads a plugin.
- [Undocumented-Reads](Undocumented-Reads): the settings and env vars that the binary reads and the docs do not name.
