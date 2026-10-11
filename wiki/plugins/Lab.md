# Lab: `dotclaude-lab`

The plugin `dotclaude-lab` holds tools for plugin authors.
It has four bins and one skill.
It registers no hook and adds no tool.
It works without the core plugin, and the repository `justfile` calls its bins.
Nothing in it changes your own Claude Code config.

## At a glance

| Item | Value |
| --- | --- |
| Install | `/plugin install dotclaude-lab@dotclaude`, with Node.js 22.18 or later |
| Skills | `eval-compare`, user-invoked only |
| Bins | `dotclaude-sandbox`, `dotclaude-capture`, `dotclaude-schema`, and `dotclaude-eval-compare`, in `bin/` |
| Hooks | None |
| Options | None. The bins take flags |
| Limits | `dotclaude-eval-compare` adds `--max-cost-usd 5` for a run that sets no bound |
| Problems | See [Troubleshooting](#troubleshooting) |

## Bins

### `dotclaude-sandbox`

Runs Claude Code in a config directory apart from your own, so a test cannot change your settings, sessions, or plugins.

```text
dotclaude-sandbox [--dir DIR] [claude arguments...]
dotclaude-sandbox [--dir DIR] --clean
dotclaude-sandbox [--dir DIR] --check-frontmatter ...
```

- `--dir DIR` sets the sandbox directory.
  The default is `dotclaude-sandbox` in the temp folder.
  The directory holds `config/` (`CLAUDE_CONFIG_DIR`), `project/` (an empty git repository), and `home/` (the `HOME` of `claude`).
- The bin loads no plugin by itself.
  Pass `--plugin-dir DIR` once for each plugin folder.
- `--clean` removes the sandbox.
- `--check-frontmatter` runs one headless session with a debug log, and exits 1 when the log names an unknown field.
- The login is `CLAUDE_CODE_OAUTH_TOKEN`, or your own login token, which goes to `claude` in its environment only.

See [Sandbox](Sandbox) for the full guide.

### `dotclaude-capture`

A local logging proxy for the requests of Claude Code.

```text
dotclaude-capture [--port 8787] [--out DIR] [--upstream URL] [--no-count] [--count FILE]
```

- `--upstream URL` sets the upstream.
  Without it, the upstream is `ANTHROPIC_BASE_URL`, then `https://api.anthropic.com`.
  The proxy stops when the upstream is its own address, because requests would loop.
- `--out DIR` sets the folder for the request bodies and the report.
  The default is `dotclaude-capture` in the temp folder.
- It never writes a request header, because the headers carry the credential.
- For the first request with tools, it sizes each part with the `count_tokens` endpoint.
  `--no-count` turns this off, and `--count FILE` sizes `FILE` instead.

### `dotclaude-schema`

Writes the JSON Schema of `settings.json` from the installed Claude Code bundle.

```text
dotclaude-schema --out DIR [--bundle FILE] [--version X.Y.Z]
```

`--out` is required.
The bin reads the bundle and never changes it.
See [Settings schema](Settings-Schema).

### `dotclaude-eval-compare`

Runs `claude plugin eval` on two plugin folders, one after the other.

```text
dotclaude-eval-compare A B [claude plugin eval options...]
```

Each run scores a plugin arm against the same no-plugin baseline arm, so the `WITH` column of the two tables shows which folder scores better.
Each run costs money, so the bin adds `--max-cost-usd 5` when the options set no bound.
The bin adds no `--scaffold` and no `--allow-tools`, because each one runs the scripts or the tools of a suite as you.
Add them in the options only for suites that you trust.
`just eval-variant` adds both, because the suite of this repository needs them.
The results stay in `evals/results/` of each plugin folder.
See [Evals](Evals).

## Skill

`eval-compare` is user-invoked only (`disable-model-invocation: true`), so it has no listing line.
It confirms the two folders with you, runs `dotclaude-eval-compare`, and compares the `WITH` columns case by case.
The skill grants no tool, so Claude Code asks you before each run.
When a run stops at the cost bound, Claude stops and tells you, and it does not raise the bound without you.

## Troubleshooting

See [Sandbox](Sandbox#troubleshooting) for the sandbox problems, and [Troubleshooting](Troubleshooting#dotclaude-lab) for the list.

| Symptom | Cause and fix |
| --- | --- |
| `dotclaude-schema` stops with an error that names a version | The script has no type table for that Claude Code version, and it writes no file. |
| `dotclaude-eval-compare` prints a usage message and exits 2 | One of the two folders is missing, or it starts with `-`. |

## Related pages

- [Sandbox](Sandbox)
- [Settings schema](Settings-Schema)
- [Evals](Evals)
- [Development](Development)
