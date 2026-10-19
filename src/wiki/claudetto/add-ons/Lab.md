# Lab

The plugin `claudetto-lab` has tools for plugin authors.
Read this page if you write or test a plugin, or if you build the settings schema.

The plugin works without the core plugin.
It imports nothing from another plugin.
It has no hook, no MCP server, no `userConfig`, and no Claude Code setting.
The source is in `src/plugins/claudetto-lab/`.

## What It Adds

| Slice | Command | Use |
| --- | --- | --- |
| `sandbox` | `claudetto-sandbox` | Run Claude Code in a config folder apart from yours (see [Lab Sandbox](Lab-Sandbox)) |
| `capture` | `claudetto-capture` | Log the requests of Claude Code and size their parts (see [Lab Capture](Lab-Capture)) |
| `schema` | `claudetto-schema` | Write the JSON Schema of `settings.json` |
| `eval-compare` | `claudetto-eval-compare` | Compare the eval scores of two plugin folders |

The slice `eval-compare` also ships the skill `/eval-compare`, which sets `disable-model-invocation: true`.

## Install

1. Install the plugin with `/plugin install claudetto-lab@claudetto`.
2. Make sure that these tools are ready:
   - Bun 1.4.3 or later.
     The commands are Bun scripts.
   - The `claude` executable on `PATH`.
     A shell function or an alias does not work.
     The sandbox and `claudetto-eval-compare` need it.
     `claudetto-schema` needs it when you do not pass `--bundle`.
   - A login token for the sandbox (see [Lab Sandbox](Lab-Sandbox)).

## The Sandbox

`claudetto-sandbox [--dir DIR] [--check-frontmatter] [--plugin-dir DIR]... [claude arguments...]` runs Claude Code in a config folder apart from yours.
`claudetto-sandbox [--dir DIR] --clean` removes that folder.
A test of a plugin then cannot change your settings, sessions, or installed plugins.
The command loads no plugin by itself, so pass `--plugin-dir DIR` for each plugin folder.
See [Lab Sandbox](Lab-Sandbox) for the folder layout, the login token, the child environment, and the clean rules.

## The Schema Writer

```text
claudetto-schema --out DIR [--bundle FILE] [--version X.Y.Z]
```

The writer reads the installed Claude Code bundle.
It writes two files to `DIR`:

- `claude-code-settings.json`, the schema of `settings.json`.
- `claude-code-managed-settings.json`, the schema of `managed-settings.json`.

Rules of the writer:

- `--out` is required.
  The command exits 2 without it, so it never writes into a folder by chance.
- Without `--bundle`, the command reads the bundle of the `claude` on `PATH`.
- Without `--version`, the command takes the version from the name of the bundle, or from `--version` of the binary.
  A `--version` that differs from the installed version fails when you pass no `--bundle`.
- The writer reads the bundle and never changes it.
  The repository forbids a patch of the Claude Code binary or its npm package.
- The bundle has no list of the managed-only keys.
  The writer matches phrases in the descriptions to find them.
  The user schema leaves them out, and the managed schema marks them with `x-managed-only`.
- The build follows the references of the bundle to `DEPTH_MAX` levels (8), and it stops at a reference that is already on the stack.
  `DEPTH_MAX` is in `slices/schema/domain/types.ts`.

The command exits 0 and prints the version, the count of top-level keys, and the paths.
It exits 1 on an error.
`just schema` writes the schemas to `schemas/`.

## The Eval Compare

```text
claudetto-eval-compare A B [claude plugin eval options...]
```

The command runs `claude plugin eval` on the plugin folders `A` and `B`, one after the other.
Each run scores a plugin arm against the same no-plugin baseline.
The two tables then show which folder scores better.

- The command adds `--no-publish` to each run.
- The command adds `--max-cost-usd 5` to each run when your options set no cost bound.
- The command adds no `--scaffold` and no `--allow-tools`.
- The command runs each arm with `--json FILE` and reads the result.
  An arm fails when its run exits with a code other than 0.
  An arm also fails when its result has no file, is not JSON, has no case, has a case with no score, is partial, or shows no loaded plugin.
  An arm fails too when a case has no baseline score or when each baseline score is at the maximum, because no gain can show.
  The output names the arm and the reason, and says not to compare the tables.
- The command exits 0 when both arms succeed, 1 when an arm fails, and 2 when a folder is missing or a folder name starts with `-`.
- The compare logic is in `slices/eval-compare/compare.ts`.

Each run costs money.
The skill `/eval-compare` asks you to confirm the two folders before it runs the command.
A folder has `.claude-plugin/plugin.json` and an `evals/` folder.
The skill tells Claude to compare the `WITH` column of the two tables.

## Bounds

| Bound | Value | File |
| --- | --- | --- |
| `DEPTH_MAX` | 8 levels | `slices/schema/domain/types.ts` |
| `--max-cost-usd` | 5 USD for each run | `slices/eval-compare/compare.ts` |

The bounds of the capture proxy are on [Lab Capture](Lab-Capture).

## Related Pages

- [Lab Capture](Lab-Capture): the request capture proxy.
- [Lab Sandbox](Lab-Sandbox): the sandbox command in detail.
- [Add-Ons](Add-Ons): the list of the add-on plugins.
- [Troubleshooting](Troubleshooting): the symptoms of the sandbox and the lab, and their fixes.
