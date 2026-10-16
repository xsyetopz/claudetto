# Settings Resolution

This page says how Claude Code 2.1.296 finds, orders, and merges its settings.
It also says what the claudetto settings snippet sets, and how `/claudetto:setup` merges it.
Read it if you edit a settings file, or if you need to know which file sets a key.

## Source Labels

Each fact has a source label.

- `Official docs` means the settings pages of Claude Code at code.claude.com, read on 2026-10-13.
- `Binary 2.1.296` means a string in `external/cc-2.1.296/strings.txt`.
  The page found the string with a search, and it does not copy the string.
- `Inference` means a conclusion that the sources do not state.

## Settings Scopes

Claude Code reads settings from four files.
An organization can also deliver managed settings from the claude.ai console or from MDM.

| Scope | File | Who it affects |
| :- | :- | :- |
| User | `~/.claude/settings.json` | You, in every project on this machine |
| Shared project | `.claude/settings.json` | Everyone who works in the project folder |
| Project local | `.claude/settings.local.json` | You, in one project |
| Managed | `managed-settings.json`, MDM, or the claude.ai console | Everyone the organization deploys to |

Source: official docs.
When you set `CLAUDE_CONFIG_DIR`, Claude Code keeps the user settings in that folder instead of `~/.claude`.

Two more sources set values, but they are not files in the stack:

- Command line: the JSON that you pass with `--settings <file-or-json>`, for one session only.
  Source: official docs.
  The binary has a settings source named `flagSettings`, which fits this source (binary 2.1.296).
- Plugin settings: the values that an enabled plugin applies.
  See [Plugin Settings](#plugin-settings).

The official docs do not list plugin settings as a level of the stack.

## Order of Precedence

The official docs give this order, highest first:

1. Managed settings.
2. Command line (`--settings`).
3. Project local settings.
4. Shared project settings.
5. User settings.

A key at a higher level overrides the same key at a lower level.
A key that you omit keeps its value from the lower levels.
Source: official docs.

The docs also name exceptions.
For a few security-sensitive keys, Claude Code honors a stricter value from a lower level over a managed value.
The docs list these keys on the settings page under "Exceptions to managed settings precedence".

Some keys also have a flag or an environment variable that overrides the setting.
For example, `ANTHROPIC_MODEL` overrides the `model` key.
The docs decide this per key and per pair, not by level.
Source: official docs.

## How Values Merge

- Lists merge.
  When two files set the same list key, such as `permissions.allow`, Claude Code combines the lists.
  Source: official docs.
- Some keys do not merge lists, such as `fallbackModel`, `modelPicker`, and `availableModels`.
  The docs give each one its own rule.
  `availableModels` from managed settings replaces the list, and user, project, and local entries do not add to it.
  Source: official docs.
- Objects: the official docs do not say how an object key merges across the levels.
  The search of the binary 2.1.296 did not answer the question.
  Do not assume a deep merge or a replace until a test shows it.

## Managed Settings Paths

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
  The docs say Claude Code uses one mechanism and ignores the others, unless the admin enables the merge.
  Source: official docs.

## The `env` Key and Env Vars

- An `env` block in a settings file is an ordinary key.
  It follows the same levels as the other keys.
  Source: official docs.
- After `/claudetto:setup` writes the `env` and model keys, the command tells you to restart Claude Code.
  Source: the printed message of the setup command (see [How Setup Merges the Snippet](#how-setup-merges-the-snippet)).
- A shell export of a variable overrides the same key in a settings file, for each pair that the docs name.
  Source: official docs.

The snippet sets 13 `env` entries, such as `CLAUDE_CODE_DISABLE_CRON` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.
Source: the `env` block of the snippet.
The [Settings Snippet Keys](Settings-Snippet-Keys) page gives each entry, its value, and its reason.
The [Undocumented Reads](Undocumented-Reads) page lists the env vars that the binary reads and the docs do not name.

## Plugin Settings

A plugin can set values while you keep it enabled.
Two places hold them:

- A `settings.json` file at the plugin root.
- The `settings` key of the plugin manifest.

The `settings.json` file overrides the manifest key.
Source: official docs.
The binary 2.1.296 reads `settings.json` first.
It then reads the manifest `settings` key (binary 2.1.296).

Only two keys apply: `agent` and `subagentStatusLine`.
Claude Code drops other keys when the plugin loads.
Source: official docs, and the binary 2.1.296 has the same two-key list.

### The `styles` Slice

The `styles` slice in `src/plugins/claudetto/slices/styles/slice.ts` sets `settings: { outputStyle: "claudetto:Concise" }`.
By the rule above, Claude Code drops `outputStyle` from a plugin.
So this plugin setting has no effect (official docs and binary 2.1.296).
The output style comes from the snippet instead, which writes `outputStyle` into a settings file.
See [What the Snippet Sets](#what-the-snippet-sets).
This is a defect of the slice.
This page does not change it.

## What the Snippet Sets

The snippet is the JSON of [Settings Snippet](Settings-Snippet).
It sets top-level keys, such as `model`, `permissions`, `outputStyle`, `sandbox`, and `statusLine`, and an `env` block.
The snippet sets a key only when the Claude Code default does not give the result that claudetto needs.
The reason for each key is on [Settings Snippet Keys](Settings-Snippet-Keys).

Source: the `settings` entries of the slices in `src/plugins/claudetto/slices/`, which `just generate` writes into [Settings Snippet](Settings-Snippet), with the `$schema` key removed before the merge.

## How Setup Merges the Snippet

The `/claudetto:setup` skill runs the `settings` command of `claudetto-setup`.
The code is in `src/plugins/claudetto/slices/setup/adapters/settings-cmd.ts` and `src/plugins/claudetto/slices/setup/domain/merge.ts`.

- The scope picks the file: `user`, `project`, or `local`.
  An unknown scope fails with exit status 2.
- Without `--apply`, the command prints the changes and writes nothing.
  With `--apply`, it writes the merged file, with two-space JSON and a final newline.
- The merge rules are:
  - An object merges key by key.
  - An array keeps its own entries and gains the entries of the snippet that it lacks.
    The key `availableModels` is the exception: the snippet list replaces it.
  - A scalar takes the snippet value.
    The snippet value replaces a user value that differs from it.
  - A key that the snippet does not name stays.
- The `project` scope drops the status line keys, because a project file must not hold an absolute path of one computer.
- The user scope also gets the auto mode lists.
  Inference: the command takes them from the `autoMode` option.
- The status line keys stay when they run another tool.
  The command prints `Kept your <key>` for each kept key.
- When the model catalog of the account offers `claude-mythos-5-1`, that model replaces `claude-fable-5-1` in `availableModels`.
  A list that already holds the Mythos model keeps it.
- With the `claudetto-docs` add-on installed, the command adds the lines of that add-on.

Inference: the merge of an object key follows the claudetto code, not the Claude Code rule.
The Claude Code rule is not confirmed (see [How Values Merge](#how-values-merge)).

After a write, restart Claude Code.
The env and model keys apply at the next start.
Source: the printed message of the command.

## Related Pages

- [Settings Snippet](Settings-Snippet): the snippet, and how to apply it by hand.
- [Settings Snippet Keys](Settings-Snippet-Keys): the reason for each key and env entry.
- [Settings Schema](Settings-Schema): the schema that the tests compare the keys with.
- [Off Switches](Off-Switches): the keys that turn a feature off.
- [Plugin Loader](Plugin-Loader): how Claude Code loads a plugin.
- [Undocumented Reads](Undocumented-Reads): the settings and env vars that the binary reads and the docs do not name.
