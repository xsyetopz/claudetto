# Lab

The plugin `dotclaude-lab` has tools for plugin authors.
It has four slices and one check.
The slice `sandbox` runs Claude Code in a config folder apart from yours (`dotclaude-sandbox`).
The slice `capture` logs the requests of Claude Code (`dotclaude-capture`).
The slice `schema` writes the JSON Schema of `settings.json` (`dotclaude-schema`).
The slice `eval-compare` compares the eval scores of two plugin folders (`dotclaude-eval-compare`).
The check is the hook lab, which the repository runs with `just lab`.
The plugin works without the core plugin, and it imports nothing from another plugin.

The source is in `src/plugins/dotclaude-lab/`.
The plugin has no `limits.ts` file.

## Install

Install the plugin with `/plugin install dotclaude-lab@dotclaude`.

## The sandbox

```text
dotclaude-sandbox [--dir DIR] [claude arguments...]
dotclaude-sandbox [--dir DIR] --clean
dotclaude-sandbox [--dir DIR] --check-frontmatter ...
```

The sandbox runs Claude Code in a config folder apart from yours.
A test of a plugin then cannot change your settings, sessions, or installed plugins (the header of `slices/sandbox/adapters/cli.ts`).
The first form sets up the folder, then runs `claude`.
The second form removes the folder.
The third form runs one headless session with a debug log, and prints each line that names an unknown field.

The sandbox needs a login token.
It takes the token from `CLAUDE_CODE_OAUTH_TOKEN`, then from the macOS Keychain entry `Claude Code-credentials`, then from `~/.claude/.credentials.json` (`loginToken` in `slices/sandbox/adapters/login.ts`).
The child process drops the variables that the parent Claude Code session sets for its own tools, because in the sandbox they would join the parent session or fake its state (the comment in `slices/sandbox/adapters/login.ts`).
The sandbox setup is in `slices/sandbox/adapters/setup.ts`.
The sandbox run starts from `slices/sandbox/adapters/start-run.ts`.

## The capture proxy

```text
dotclaude-capture [--port 8787] [--out DIR] [--upstream URL] [--no-count] [--count FILE]
ANTHROPIC_BASE_URL=http://127.0.0.1:8787 claude
```

The proxy forwards each request to the upstream, and it writes the body of each `/v1/messages` request to `DIR`.
The default folder is `$TMPDIR/dotclaude-capture`.
The default upstream is `https://api.anthropic.com` (`DEFAULT` in `slices/capture/domain/upstream.ts`).
The proxy accepts a loopback upstream only, which is the set `LOOPBACK` in `slices/capture/domain/upstream.ts`.
The report sizes a text by section when the text is longer than `SPLIT_CHARS` characters (`slices/capture/domain/report.ts`).

The types of the capture are in `slices/capture/domain/types.ts`, and the report is in `slices/capture/domain/report.ts`.

## The schema writer

```text
dotclaude-schema --out DIR [--bundle FILE] [--version X.Y.Z]
```

The writer reads the installed Claude Code bundle, and it writes the JSON Schema of `settings.json` and of `managed-settings.json`.
The option `--out` is required, so the command never writes into a folder by chance (the header of `slices/schema/adapters/cli.ts`).
The managed-only keys are in `MANAGED_ONLY` in `slices/schema/domain/managed.ts`.
The schema build follows the references of the bundle to a depth of `DEPTH_MAX` levels, and it stops at a loop (`slices/schema/domain/types.ts`).
The scan of the bundle is in `slices/schema/domain/scan.ts`.

The repository forbids a patch of the Claude Code CLI binary or its npm package, so the writer only reads the bundle (`CLAUDE.md`).

## The eval compare

```text
dotclaude-eval-compare A B [claude plugin eval options...]
```

The command runs `claude plugin eval` on the plugin folders `A` and `B`, one after the other.
Each run scores a plugin arm against the same no-plugin baseline arm (the header of `slices/eval-compare/adapters/cli.ts`).
The comparison is in `slices/eval-compare/domain/compare.ts`.
The skill `eval-compare` runs the command.

## The hook lab

The command `just lab` runs `bun tools/lab.ts`.
It runs the tests of the hooks module of each plugin, with stubbed Claude Code events.
The lab tests are in the `lab/` folders of the slices, for example `slices/graph/lab/tree-change.test.ts` in the code-graph plugin.
Run `just lab` before a live session when a change touches `hooks/register.ts`.

## Why

- The sandbox keeps a test from changing the settings and the sessions of the user.
- The schema comes from the installed bundle.
  See D10 in [Decisions-Settings](Decisions-Settings).
- The evals run through `claude plugin eval`.
  See D9 in [Decisions-Tools](Decisions-Tools).
- The reports state measurements.
  See D27 in [Decisions-Evidence](Decisions-Evidence).
- Each add-on stays a separate plugin.
  See D24 in [Decisions-Layout](Decisions-Layout).

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| The sandbox has no login | Set `CLAUDE_CODE_OAUTH_TOKEN`, or log in to Claude Code so that the token is in the Keychain or in `~/.claude/.credentials.json`. |
| `dotclaude-schema` needs an output | The command needs `--out DIR`. Pass it. |

See also [Troubleshooting](Troubleshooting).
