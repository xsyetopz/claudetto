# claudetto

claudetto changes Claude Code through its official extension points: settings, hooks, skills, agents, and an output style.
It does not patch the Claude Code binary.
Its goal is the highest quality for the lowest token cost.

The [wiki](https://github.com/xsyetopz/claudetto/wiki) explains each part and the reason for it.
Start with the [Home](https://github.com/xsyetopz/claudetto/wiki/Home) page, or read the [Install](https://github.com/xsyetopz/claudetto/wiki/Install) page for the full setup.

## Plugins

claudetto is a marketplace with one core plugin and six add-on plugins.
Each add-on works without the core plugin.

| Plugin | What it gives |
| --- | --- |
| `claudetto` | The core: the settings snippet, the status line, the output style, six agents, ten skills, the guard and asks hooks, the spec store, and the `second_opinion` tool. |
| `claudetto-codegraph` | The code graph of a project, from the CLI `codegraph`. |
| `claudetto-browser` | The `browse` skill, and a headless browser search for each `WebSearch` call. |
| `claudetto-docs` | The `docs` skill, with current library docs from the CLI `ctx7`. |
| `claudetto-sessions` | The `sessions` skill, with scripts that audit the setup and replay a hook on past transcripts. |
| `claudetto-lab` | Tools for plugin authors: the sandbox, capture, schema, and eval compare. |
| `claudetto-you-should-know` | Opt-in. Shows one thing to know before Claude changes something, in place of the built-in `cc-plugin-you-should-know`. |

## Install

```bash
# --- CLI -----------------------------
claude plugin marketplace add xsyetopz/claudetto
claude plugin install claudetto@claudetto

# --- TUI -----------------------------
/plugin marketplace add xsyetopz/claudetto
/plugin install claudetto@claudetto
```

Then run `/claudetto:setup`, and restart Claude Code.
The setup skill shows each change to your settings file, and it writes the change after you confirm.

Requirements:

- Claude Code `2.1.296` or later.
  claudetto is tested only on `2.1.296`.
- `git`.
- [Bun](https://bun.sh) `1.4.3` or later on `PATH`, for the status line, the setup command, and the `second_opinion` tool.
- [Node.js](https://nodejs.org) on `PATH`, for the npm installs of the add-ons.

A plugin cannot set permissions, environment variables, or models.
So the core plugin gives these settings as a [settings snippet](https://github.com/xsyetopz/claudetto/wiki/Settings-Snippet).
The setup skill applies the snippet for you.
You can also copy the keys that you want into your own `settings.json`.

## What the core plugin changes

| Part | Effect |
| --- | --- |
| Compaction | Off. `autoCompactEnabled` is `false`, and `DISABLE_COMPACT` is `1`, which also turns off `/compact`. |
| Context window | `CLAUDE_CODE_MAX_CONTEXT_TOKENS` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` are `300000`. A session that reaches the limit stops, and you run `/clear`. |
| Memory | `autoMemoryEnabled` is `false`. The spec store holds the state instead. |
| Output style | `outputStyle` is `claudetto:Concise`. Your own `outputStyle` setting can change it. |
| Permissions | Normal work passes. Work like `sudo` asks. Destructive actions are denied by `autoMode.hard_deny`. Reads of secret files are denied. |
| Sandbox | Bash runs in the sandbox. Its network reaches GitHub and the package registries only. |
| Guard | Asks before the first call of a session to a GitHub repository of another owner that has an AI policy file. |
| Asks | Asks only when a change weakens a check. It never asks for a read. |
| Status line | The folder, git, model, effort, context against the window, cost, the 5-hour, 7-day, and spend limits, and the progress of a spec change. The percent turns yellow at `75%` and red at `90%`. |
| Handoff | With the default `manual` value of `mainHandoff`, a hint at `60%` of the window tells you to run `/claudetto:handoff`. |
| Checks | The CLI `claudetto-run-checks` runs a batch of check commands, with no model call. |

The core plugin has one option, `mainHandoff`.
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
See [Agents](https://github.com/xsyetopz/claudetto/wiki/Agents).

The ten skills are `/claudetto:handoff`, `/claudetto:rules-creator`, `/claudetto:setup`, and the seven spec phases `/claudetto:specify`, `/claudetto:plan`, `/claudetto:implement`, `/claudetto:review`, `/claudetto:merge`, `/claudetto:accept`, and `/claudetto:archive`.
See [Skills](https://github.com/xsyetopz/claudetto/wiki/Skills).

## Long work without compaction

Each model call reads the whole context again, so the size of the context sets the cost of each turn.

- For work that takes more than one session, run `/claudetto:specify <id>`, or run `claudetto-spec specify <id>`.
- Before `/clear`, run `claudetto-spec status <id>`.
  In the fresh session, run `claudetto-spec next <id>`, which prints the brief of the next package.
- A model change rebuilds the prompt cache.
  An effort change keeps the prompt cache.

See [Context and handoff](https://github.com/xsyetopz/claudetto/wiki/Context-And-Handoff)
and [Spec store](https://github.com/xsyetopz/claudetto/wiki/Spec-Store).

## Second opinion

The `second_opinion` tool of the core plugin asks [TypeSafe Jev](https://docs.typesafe.ai/introduction) for a pick and a confidence on a decision.
Export `TYPESAFE_API_KEY` before Claude Code starts.
Each call sends the data of the decision to the TypeSafe API.
With no key, or when Jev gives no answer, a small Claude model answers instead.
The result says that the answer is not from Jev.
See [Second opinion](https://github.com/xsyetopz/claudetto/wiki/Second-Opinion).

## Add-on plugins

Install each add-on that you need.

```bash
# --- CLI -----------------------------
claude plugin install claudetto-codegraph@claudetto
claude plugin install claudetto-browser@claudetto
claude plugin install claudetto-docs@claudetto
claude plugin install claudetto-sessions@claudetto
claude plugin install claudetto-lab@claudetto
claude plugin install claudetto-you-should-know@claudetto

# --- TUI -----------------------------
/plugin install claudetto-codegraph@claudetto
/plugin install claudetto-browser@claudetto
/plugin install claudetto-docs@claudetto
/plugin install claudetto-sessions@claudetto
/plugin install claudetto-lab@claudetto
/plugin install claudetto-you-should-know@claudetto
```

- `claudetto-codegraph` needs the CLI `codegraph` on `PATH`, and an index that `codegraph init -y` builds in the project.
  It syncs the index at session start, and it adds no MCP server.
  See [Code graph](https://github.com/xsyetopz/claudetto/wiki/Code-Graph).
- `claudetto-browser` uses `agent-browser`.
  Its `backend` option can select CloakBrowser, for sites with bot detection.
  See [Browser](https://github.com/xsyetopz/claudetto/wiki/Browser).
- `claudetto-docs` needs no key.
  See [Library docs](https://github.com/xsyetopz/claudetto/wiki/Library-Docs).
- `claudetto-sessions` measures the start of a session and the usage of each run.
  See [Sessions](https://github.com/xsyetopz/claudetto/wiki/Sessions).
- `claudetto-lab` is for plugin authors, and it works alone.
  See [Lab](https://github.com/xsyetopz/claudetto/wiki/Lab).
- `claudetto-you-should-know` is opt-in, because each check makes one Haiku call, on an API key or a subscription.
  It replaces the built-in `cc-plugin-you-should-know`, so turn the built-in plugin off.
  See [You should know](https://github.com/xsyetopz/claudetto/wiki/You-Should-Know).

## Update

```bash
claude plugin marketplace update claudetto
claude plugin update claudetto@claudetto
```

Run the `claude plugin update` line again for each add-on that you installed, with its name in place of `claudetto`.
Then restart Claude Code, read the [changelog](CHANGELOG.md), and run `/claudetto:setup` again.
The status line commands hold the path of the plugin version, so each update needs the new setup run.

To try an unreleased checkout, run:

```bash
claude --plugin-dir /path/to/claudetto/plugins/claudetto
```

## Development

Edit the source in `src/`, and run `just generate`.
Do not edit `plugins/` by hand.
`just check` runs the lint, the type check, the check of the generated files, the tests, the validation, and the hook labs.
`just sandbox` runs Claude Code with this checkout in a separate config.
See [Development](https://github.com/xsyetopz/claudetto/wiki/Development)
and [Sandbox](https://github.com/xsyetopz/claudetto/wiki/Sandbox).

## License

[MIT](LICENSE)
