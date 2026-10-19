# Lab

The plugin `claudetto-lab` has tools for plugin authors.
You can test a plugin in a safe sandbox, log the requests of Claude Code, write the settings schema, and compare eval scores.
Most users do not need it.

The plugin works without the core plugin.
It has no hook, no MCP server, no `userConfig`, and no Claude Code setting.

## What It Adds

| Slice | Command | Use |
| --- | --- | --- |
| `sandbox` | `claudetto-sandbox` | Run Claude Code in a config folder apart from yours (see [Lab Sandbox](Lab-Sandbox)) |
| `capture` | `claudetto-capture` | Log the requests of Claude Code and size their parts (see [Lab Capture](Lab-Capture)) |
| `schema` | `claudetto-schema` | Write the JSON Schema of `settings.json` |
| `eval-compare` | `claudetto-eval-compare` | Compare the eval scores of two plugin folders |

The slice `eval-compare` also ships the skill `/eval-compare`, which has `disable-model-invocation: true`.

## How to Install It

1. Install the plugin with `/plugin install claudetto-lab@claudetto`.
2. Make sure that these tools are ready:
   - Bun 1.4.3 or later, because the commands are Bun scripts.
   - The `claude` executable on `PATH`. A shell function or an alias does not work.
     The sandbox and `claudetto-eval-compare` need it.
     `claudetto-schema` needs it when you do not pass `--bundle`.
   - A login token for the sandbox (see [Lab Sandbox](Lab-Sandbox)).

## The Sandbox

```text
claudetto-sandbox [--dir DIR] [--check-frontmatter] [--plugin-dir DIR]... [claude arguments...]
claudetto-sandbox [--dir DIR] --clean
```

The first form runs Claude Code in a config folder apart from yours.
A test of a plugin then cannot change your settings, sessions, or installed plugins.
The command loads no plugin by itself, so pass `--plugin-dir DIR` for each plugin folder.
The second form removes the folder.
See [Lab Sandbox](Lab-Sandbox) for the details.

## The Schema Writer

```text
claudetto-schema --out DIR [--bundle FILE] [--version X.Y.Z]
```

A schema is a file that describes which keys a JSON file can have.
The writer reads the installed Claude Code bundle and writes two files to `DIR`:

- `claude-code-settings.json`, the schema of `settings.json`.
- `claude-code-managed-settings.json`, the schema of `managed-settings.json`.

| Option | Rule |
| --- | --- |
| `--out` | Required. The command exits 2 without it, so it never writes into a folder by chance. |
| `--bundle` | Without it, the command reads the bundle of the `claude` on `PATH`. |
| `--version` | Without it, the command takes the version from the bundle name, or from `--version` of the binary. A value that differs from the installed version fails when you pass no `--bundle`. |

How it works:

- The writer reads the bundle and never changes it.
  The repository forbids a patch of the Claude Code binary or its npm package.
- The bundle has no list of the managed-only keys.
  The writer matches phrases in the descriptions to find them.
  The user schema leaves them out.
  The managed schema marks them with `x-managed-only`.
- The writer follows the references of the bundle to `DEPTH_MAX` levels (8).
  It stops at a reference that is already on the stack.

The command exits 0 and prints the version, the count of top-level keys, and the paths.
It exits 1 on an error.
`just schema` writes the schemas to `schemas/`.

## The Eval Compare

```text
claudetto-eval-compare A B [claude plugin eval options...]
```

The command runs `claude plugin eval` on the plugin folders `A` and `B`, one after the other.
Each run scores a plugin against the same no-plugin baseline.
The two tables then show which folder scores better.
Each run costs money.

| Option | What the command does |
| --- | --- |
| `--no-publish` | Adds it to each run. |
| `--max-cost-usd 5` | Adds it to each run when your options set no cost bound. |
| `--scaffold`, `--allow-tools` | Adds neither. |
| `--json FILE` | Adds it to each run and reads the result. |

An arm fails when:

- its run exits with a code other than 0
- its result has no file, is not JSON, has no case, has a case with no score, or is partial
- its result shows no loaded plugin
- a case has no baseline score, or each baseline score is at the maximum, because no gain can show

The output names the arm and the reason, and says not to compare the tables.

| Exit code | Meaning |
| --- | --- |
| 0 | Both arms succeed |
| 1 | An arm fails |
| 2 | A folder is missing, or a folder name starts with `-` |

The compare logic is in `slices/eval-compare/compare.ts`.

The skill `/eval-compare` asks you to confirm the two folders before it runs the command.
A folder needs `.claude-plugin/plugin.json` and an `evals/` folder.
The skill tells Claude to compare the `WITH` column of the two tables.

## Bounds

| Bound | Value | File |
| --- | --- | --- |
| `DEPTH_MAX` | 8 levels | `slices/schema/domain/types.ts` |
| `--max-cost-usd` | 5 USD for each run | `slices/eval-compare/compare.ts` |

## See Also

- [Lab Capture](Lab-Capture)
- [Lab Sandbox](Lab-Sandbox)
- [Add-Ons](Add-Ons)
- [Troubleshooting](Troubleshooting)
