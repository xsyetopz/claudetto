# Settings schema

The JSON Schema of `settings.json` and `managed-settings.json` is made by dotclaude.
It comes from the bundle of the installed Claude Code, and not from the public schema.
The build code says that the public schema lacks some keys, such as `syncClaudeAiSkills`.
The decision is D10 in [Decisions-Settings](Decisions-Settings).
How Claude Code merges its settings files is in [Settings resolution](Settings-Resolution).
How the bundle is found and what it holds is in [Claude Code internals](Claude-Code-Internals).

## Files

`just schema` writes two files to `schemas/`, at the root of the repository.
Git tracks both files.

- `schemas/claude-code-settings.json` is the schema of a user `settings.json`.
- `schemas/claude-code-managed-settings.json` is the schema of a `managed-settings.json`.
  dotclaude writes no managed file, so this file is a reference only ([Off switches](Off-Switches#managed-settings)).

The file names have no version.
The version is in the root `$comment`, which reads `Extracted from Claude Code 2.1.296` for the current files, and in `title`.
The names stay the same after an update, so a `$schema` path to these files does not change.

## Run

`just schema` runs `bun plugins/dotclaude-lab/bin/dotclaude-schema --out schemas`.
Extra arguments go to the command.
The recipe is in `justfile`.
The command is part of the plugin `dotclaude-lab`, and its usage is in [Lab](Lab#the-schema-writer).

- `--out DIR` is required.
  Without it, the command exits with status 2 and writes nothing.
- `--bundle FILE` names the bundle.
  Without it, the command reads the file that `claude` on `PATH` resolves to.
  A global Bun install has a launcher that holds no bundle, so the command reads the binary of the platform package beside it.
- `--version X.Y.Z` names the version.
  Without it, the command takes the version from the bundle file name, or from the output of `claude --version`.
  When neither gives a version, the version is `unknown`, and the build fails.
- The command reads the bundle as latin1, and it never changes the bundle.

On success, the command prints the version, the number of top-level keys of the user schema, and the two paths.
A failure exits with status 1 and a message that names the version.
The build finishes before any file is written, so a failed build writes no file.

## How the build works

The code paths run in this order.

1. `slices/schema/adapters/cli.ts` (`main`) reads the arguments and the bundle, and it writes the files.
   It does no build work.
2. `slices/schema/domain/build.ts` (`buildSchemas`) takes the type table of the version from `TYPES`.
   It finds the settings object, maps each key, and checks that each top-level key has a description.
3. `slices/schema/domain/scan.ts` (`findSchemaBody`, `parseEntries`) finds the settings object in the bundle text.
   It matches brackets, and it skips strings, template literals, regex literals, and comments.
4. `slices/schema/domain/types.ts` (`typeSchema`) maps each type chain to JSON Schema.
   A chain is a helper call, such as the one for a string or an object, with method calls after it.
   `describe` gives the description, and `min`, `max`, and `int` give the bounds and the integer type.
   `passthrough` on an object leaves extra keys allowed, and any other object sets `additionalProperties` to `false`.
   A key is required when its helper is in the table and no call in its chain is `optional`, `catch`, `default`, or `nullish`.
5. The same file follows a plain call to another helper, such as a named object, up to 8 levels (`DEPTH_MAX`).
   It stops at a loop, and it does not follow a name that the bundle defines more than once.
6. `slices/schema/domain/descriptions.ts` gives a fallback text for `attribution`, `sandbox`, and `spellcheck`.
   The fallback is used only when the bundle has no description for the key.
7. `slices/schema/domain/managed.ts` removes the managed-only keys from the user file, and it marks them with `x-managed-only` in the managed file.
8. `slices/schema/domain/spans.ts` puts the code items of the descriptions in backticks.

## Contents for 2.1.296

These counts come from the shipped files.

- The user schema has 162 top-level keys.
- The managed schema has 184 top-level keys.
  Its 22 extra keys are the managed-only keys.
- `permissions` has 7 nested keys, and `sandbox` has 13.
- `env` has no nested keys.
  It takes a value of any type.
- `$schema` is a key of the user schema, typed as a string, so a `settings.json` may hold it.

The build test in `tests/lab/schema/build.test.ts` checks that the managed file has six keys, each with a description.
They are `syncClaudeAiSkills`, `syncClaudeAiPlugins`, `prependPlugins`, `appendPlugins`, `skillOverrides`, and `disableClaudeAiConnectors`.
`prependPlugins` and `appendPlugins` are managed-only, so the user schema lacks them.

## Managed-only keys

- The user schema leaves out the managed-only keys.
  Its root sets `additionalProperties` to `false`, so a user file that holds such a key fails this schema.
- The managed schema keeps these keys and marks each one with `x-managed-only`.
- The keys are found by phrase match on the descriptions, in `MANAGED_ONLY` in `managed.ts`.
  A new description that uses another phrase is not marked, so its key stays in the user schema.

## Use in an editor

Set the `$schema` key of a JSON file to the path of the schema file.
This is the JSON Schema keyword, and an editor that supports it checks the file and shows the descriptions.
This page does not test the editor behavior.

```json
{
  "$schema": "/absolute/path/to/dotclaude/schemas/claude-code-settings.json"
}
```

A relative path in `$schema` resolves from the file that holds it, which is inference from the JSON Schema rules.
Use an absolute path or a URL for a file outside the repository.

## Tests and pins

- `tests/dotclaude/settings-pin.test.ts` checks the JSON blocks of the [settings snippet](Settings-Snippet) against the user schema.
  A key that the schema lacks fails the test, and the test names the key.
- `tests/lab/schema/build.test.ts` checks the six managed keys listed above and the root `$comment`.
  It also tests the scanner and the type mapping on fixtures.
- `tests/lab/schema/bundle.test.ts` checks the shipped keys against the bundle of the installed `claude`.
- `tests/dotclaude/setup/drift.test.ts` checks that the version in the `$comment` is the tested version.
  A new Claude Code version fails this test until the type table and the files are updated ([Drift check](Architecture#drift-check)).
- `just validate` skips the files of `schemas/` in its line-count check, because they are generated (`tools/validate.ts`).

## Limits

- The type table `TYPES` in `slices/schema/domain/types.ts` has 10 helper names for `2.1.296` only.
  The helper names change with each build, and the comment in the file says that the names come from the bundle of that version.
- A version without a table fails the build.
  To support a new version, add its table to `TYPES`, then run `just schema`.
- A helper that is not in the table gives an empty schema, which accepts any value, and its key is not required.
- The descriptions of the three fallback keys are text that a person wrote.
  The fallback applies only when the bundle has no description for the key.
- The code items of a description follow the rules in `spans.ts`.
  A key or a tool name that is also an English word, such as `model`, stays as prose.
- The timing of a build, about 0.2 s, is from a comment in `types.ts`.
  This page did not measure it.

## Related pages

- [Settings resolution](Settings-Resolution)
- [Claude Code internals](Claude-Code-Internals)
- [Settings snippet](Settings-Snippet)
- [Settings snippet keys](Settings-Snippet-Keys)
- [Off switches](Off-Switches)
- [Lab](Lab)
