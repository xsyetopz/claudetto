# Settings schema

The public JSON Schema of Claude Code `settings.json` is out of date.
dotclaude therefore makes its own schema from the installed Claude Code.
The decision is D10 in [Decisions](Decisions-Settings).

## Generate

Run `just schema`.
It runs `dotclaude-schema` of the plugin `dotclaude-lab`, which reads the bundle of the installed Claude Code and never changes it.

- The script finds the settings schema object in the bundle, reads each key with its description, and maps the minified type helpers with a table for each version.
- It writes `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json`.
  The file names have no version, so the `$schema` link of your `settings.json` stays the same after an update.
  The version is in the root `$comment` of each file, for example `Extracted from Claude Code 2.1.296`.
- It puts the code items of each description in single backticks, because the bundle text has them bare and an editor shows a description as Markdown.
  A code item is a camelCase or dotted settings key, a path, a file name, a slash command, a flag, an env var, a quoted literal, a permission rule, or a tool name.
  A key that is also an English word, such as `model`, stays as prose.
- When the script cannot find the schema, or has no type table for the version, it exits with an error that names the version and writes no file.
  A wrong table would give a wrong schema.
- Extra arguments are `--bundle FILE`, `--version X.Y.Z`, and `--out DIR`.

## Keys

The schema holds each top-level key that the bundle defines, with its description.
It also holds the nested keys of `permissions`, `sandbox`, and `env`.
The version 2.1.296 files have `syncClaudeAiSkills`, `syncClaudeAiPlugins`, `prependPlugins`, `appendPlugins`, `skillOverrides`, and `disableClaudeAiConnectors`, which the public schema lacks.

## Managed-only keys

Some keys work only in managed settings.

- The user schema leaves them out, so a user file with such a key is not valid.
- The managed schema marks them with `x-managed-only`.
- The managed schema is a reference only, because dotclaude writes no managed file ([Off switches](Off-Switches#managed-settings)).

## Shipped and pinned

- The repository holds the generated files in `schemas/`.
  They are generated files, so the size test excludes them.
- A test (`tests/dotclaude/settings-pin.test.mjs`) checks the JSON blocks of the [settings snippet](Settings-Snippet) against the schema.
  A key that the schema lacks fails the test and the test names the key.
- A test (`tests/lab/schema/build.test.mjs`) checks that the shipped schema has the keys of 2.1.296.
- A new Claude Code version needs a new type table and a new run of the script.
  The drift check reports a version other than the tested one ([Core plugin](Core-Plugin#drift-check)).

## Related pages

- [Settings snippet keys](Settings-Snippet-Keys)
- [Off switches](Off-Switches)
