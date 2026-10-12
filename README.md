# dotclaude

dotclaude changes Claude Code through its official extension points: settings, hooks, skills, agents, and an output style.
It does not patch the Claude Code binary.
Its goal is the highest quality for the lowest token cost.

The [wiki](https://github.com/xsyetopz/dotclaude/wiki) explains each part and the reason for it.
Start with the [Home](https://github.com/xsyetopz/dotclaude/wiki/Home) page, or read the [Install](https://github.com/xsyetopz/dotclaude/wiki/Install) page for the full setup.

## Plugins

dotclaude is a marketplace with one core plugin and five add-on plugins.
Each add-on works without the core plugin.

| Plugin | What it gives |
| --- | --- |
| `dotclaude` | The core: the settings snippet, the status line, the output style, six agents, six skills, the guard and asks hooks, the spec store, and the `second_opinion` tool. |
| `dotclaude-codegraph` | The code graph of a project, from the CLI `codegraph`. |
| `dotclaude-browser` | The `drive-web-browser` skill, and a headless browser search for each `WebSearch` call. |
| `dotclaude-docs` | The `docs` skill, with current library docs from the CLI `ctx7`. |
| `dotclaude-sessions` | The `start-cost` and `usage` skills, which measure the session start and the usage. |
| `dotclaude-lab` | Tools for plugin authors: the sandbox, capture, schema, and eval compare. |

## Install

```text
/plugin marketplace add xsyetopz/dotclaude
/plugin install dotclaude@dotclaude
```

Then run `/dotclaude:setup`, and restart Claude Code.
The setup skill shows each change to your settings file, and it writes the change after you confirm.

Requirements:

- Claude Code `2.1.296` or later.
  dotclaude is tested only on `2.1.296`.
- `git`.
- [Bun](https://bun.sh) `1.4.3` or later on `PATH`, for the status line, the setup command, and the `second_opinion` tool.
- [Node.js](https://nodejs.org) on `PATH`, for the npm installs of the add-ons.

A plugin cannot set permissions, environment variables, or models.
So the core plugin gives these settings as a [settings snippet](https://github.com/xsyetopz/dotclaude/wiki/Settings-Snippet).
The setup skill applies the snippet for you.
You can also copy the keys that you want into your own `settings.json`.

## What the core plugin changes

| Part | Effect |
| --- | --- |
| Compaction | Off. `autoCompactEnabled` is `false`, and `DISABLE_COMPACT` is `1`, which also turns off `/compact`. |
| Context window | `CLAUDE_CODE_MAX_CONTEXT_TOKENS` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` are `300000`. A session that reaches the limit stops, and you run `/clear`. |
| Memory | `autoMemoryEnabled` is `false`. The spec store holds the state instead. |
| Output style | `outputStyle` is `dotclaude:Concise`. Your own `outputStyle` setting can change it. |
| Permissions | Normal work passes. Work like `sudo` asks. Destructive actions are denied by `autoMode.hard_deny`. Reads of secret files are denied. |
| Sandbox | Bash runs in the sandbox. Its network reaches GitHub and the package registries only. |
| Guard | Asks before the first call of a session to a GitHub repository of another owner that has an AI policy file. |
| Asks | Asks only when a change weakens a check. It never asks for a read. |
| Status line | The folder, git, model, effort, context against the window, cost, the 5-hour, 7-day, and spend limits, and the progress of a spec change. The percent turns yellow at `75%` and red at `90%`. |
| Handoff | With the default `manual` value of `mainHandover`, a hint at `60%` of the window tells you to run `/dotclaude:handoff`. |
| Checks | The CLI `dotclaude-run-checks` runs a batch of check commands, with no model call. |

The core plugin has one option, `mainHandover`.
Its values are `auto`, `manual`, and `off`, and the default is `manual`.

## Agents and models

| Agent | Model | Effort |
| --- | --- | --- |
| `planner`, `reviewer` | `claude-opus-5-5` | `high` |
| `debugger` | `claude-sonnet-5-5` | `high` |
| `implementer`, `researcher` | `claude-sonnet-5-5` | `medium` |
| `investigator` | `claude-haiku-5-5` | `medium` |

The main session uses `claude-opus-5-5`, from the settings snippet.
The `maxEffortLevel` setting is `max`, so `/effort` can go up to `max` for a hard check.
See [Agents](https://github.com/xsyetopz/dotclaude/wiki/Agents).

The six skills are `/dotclaude:handoff`, `/dotclaude:hotfix`, `/dotclaude:rules-creator`, `/dotclaude:setup`, `/dotclaude:ship`, and `/dotclaude:spec`.
See [Skills](https://github.com/xsyetopz/dotclaude/wiki/Skills).

## Long work without compaction

Each model call reads the whole context again, so the size of the context sets the cost of each turn.

- For work that takes more than one session, run the `spec` skill with an id, or run `dotclaude-spec new <id>`.
- Before `/clear`, run `dotclaude-spec status <id>`.
  In the fresh session, run `dotclaude-spec next <id>`, which prints the brief of the next package.
- A model change rebuilds the prompt cache.
  An effort change keeps the prompt cache.

See [Context and handoff](https://github.com/xsyetopz/dotclaude/wiki/Context-And-Handoff)
and [Spec store](https://github.com/xsyetopz/dotclaude/wiki/Spec-Store).

## Second opinion

The `second_opinion` tool of the core plugin asks [TypeSafe Jev](https://docs.typesafe.ai/introduction) for a pick and a confidence on a decision.
Export `TYPESAFE_API_KEY` before Claude Code starts.
Each call sends the data of the decision to the TypeSafe API.
With no key, or when Jev gives no answer, a small Claude model answers instead.
The result says that the answer is not from Jev.
See [Second opinion](https://github.com/xsyetopz/dotclaude/wiki/Second-Opinion).

## Add-on plugins

Install each add-on that you need.

```text
/plugin install dotclaude-codegraph@dotclaude
/plugin install dotclaude-browser@dotclaude
/plugin install dotclaude-docs@dotclaude
/plugin install dotclaude-sessions@dotclaude
/plugin install dotclaude-lab@dotclaude
```

- `dotclaude-codegraph` needs the CLI `codegraph` on `PATH`, and an index that `codegraph init -y` builds in the project.
  It syncs the index at session start, and it adds no MCP server.
  See [Code graph](https://github.com/xsyetopz/dotclaude/wiki/Code-Graph).
- `dotclaude-browser` uses `agent-browser`.
  Its `backend` option can select CloakBrowser, for sites with bot detection.
  See [Browser](https://github.com/xsyetopz/dotclaude/wiki/Browser).
- `dotclaude-docs` needs no key.
  See [Library docs](https://github.com/xsyetopz/dotclaude/wiki/Library-Docs).
- `dotclaude-sessions` measures the start of a session and the usage of each run.
  See [Sessions](https://github.com/xsyetopz/dotclaude/wiki/Sessions).
- `dotclaude-lab` is for plugin authors, and it works alone.
  See [Lab](https://github.com/xsyetopz/dotclaude/wiki/Lab).

## Update

```bash
claude plugin marketplace update dotclaude
claude plugin update dotclaude@dotclaude
```

Run the `claude plugin update` line again for each add-on that you installed, with its name in place of `dotclaude`.
Then restart Claude Code, read the [changelog](CHANGELOG.md), and run `/dotclaude:setup` again.
The status line commands hold the path of the plugin version, so each update needs the new setup run.

To try an unreleased checkout, run:

```bash
claude --plugin-dir /path/to/dotclaude/plugins/dotclaude
```

## Development

Edit the source in `src/`, and run `just generate`.
Do not edit `plugins/` by hand.
`just check` runs the lint, the type check, the check of the generated files, the tests, the validation, and the hook labs.
`just sandbox` runs Claude Code with this checkout in a separate config.
See [Development](https://github.com/xsyetopz/dotclaude/wiki/Development)
and [Sandbox](https://github.com/xsyetopz/dotclaude/wiki/Sandbox).

## License

[MIT](LICENSE).
