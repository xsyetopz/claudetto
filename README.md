# `claudetto`

claudetto changes Claude Code through its official extension points: settings, hooks, skills, and an output style.
It does not patch the Claude Code binary.
Its goal is the highest quality for the lowest token cost.

The [wiki](https://github.com/xsyetopz/claudetto/wiki) explains each part and the reason for it.
Start with the [Home](https://github.com/xsyetopz/claudetto/wiki/Home) page, or read the [Install](https://github.com/xsyetopz/claudetto/wiki/Install) page for the full setup.

## Plugins

claudetto is a marketplace with one core plugin and five add-on plugins.
Each add-on works without the core plugin.

| Plugin | What it gives |
| --- | --- |
| `claudetto` | The core: the settings snippet, the status line, the output style, the `setup` skill, the `/handoff` command, the `guard`, `ground`, and `sembr` hooks, the tailored prompt, and the `second_opinion` tool. |
| `claudetto-codegraph` | The code graph of a project, from the CLI `codegraph`. |
| `claudetto-browser` | The `browse` skill, and a headless browser search for each `WebSearch` call. |
| `claudetto-docs` | The `docs` skill, with current library docs from the CLI `ctx7`. |
| `claudetto-sessions` | The `sessions` skill, with two scripts: `audit` for the setup and `replay` for a hook on past transcripts. |
| `claudetto-lab` | Tools for plugin authors: the sandbox, capture, schema, and eval compare. |

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

- Claude Code `2.1.302` or later.
  claudetto is tested only on `2.1.302`.
- `git`.
- [Bun](https://bun.sh) `1.4.3` or later on `PATH`, for the status line, the setup command, and the `second_opinion` tool.
- [Node.js](https://nodejs.org) on `PATH`, for the npm installs of the add-ons.

A plugin cannot set permissions, environment variables, or models.
So the core plugin gives these settings as a [settings snippet](https://github.com/xsyetopz/claudetto/wiki/Settings-Snippet).
The setup skill applies the snippet for you.
You can also copy the keys that you want into your own `settings.json`.

## What the Core Plugin Changes

| Part | Effect |
| --- | --- |
| Compaction | The `handoff` slice replaces the summary of a compaction with a handoff. `autoCompactWindow` is `300000`. The `compaction` option `built-in` turns the handoff off. |
| Memory | `autoMemoryEnabled` is `false`. |
| Prompt | `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` is `1`, and the `prompt` slice gives one tailored text for the short prompt. |
| Output style | `outputStyle` is `claudetto:Concise`. Your own `outputStyle` setting can change it. |
| Permissions | Reads of secret files and destructive commands such as `rm -rf /` are denied. A force push asks. |
| Sandbox | Bash runs in the sandbox. Its network reaches GitHub and the package registries only. |
| Guard | Denies a `Bash` command that only prints a file, and names the `Read` call to use. |
| Ground | Denies a `Write` or `Edit` of a plan file, and a `ProposeGoal` call, that cites a `file:line` or a convention that the source does not hold. |
| Sembr | Checks the line breaks of Markdown. |
| Status line | The folder, git, model, effort, context against the window, cost, and the limits. The percent turns yellow at `75%` and red at `90%`. |
| Handoff | `/handoff` writes the handoff, clears the chat, and starts the next session from it. |

## Model and Skills

The main session uses `claude-opus-5-5`, from the settings snippet.
`CLAUDE_CODE_SUBAGENT_MODEL` is `claude-sonnet-5-5`.

The core plugin has the skill `/claudetto:setup`, and the command `/handoff`.
Use openspec for specs: `claudetto` has no spec store.

## Long Work without Compaction

Each model call reads the whole context again, so the size of the context sets the cost of each turn.
Run `/handoff` to start a fresh session from a handoff.
A model change rebuilds the prompt cache.
An effort change keeps the prompt cache.

See [Context and handoff](https://github.com/xsyetopz/claudetto/wiki/Context-And-Handoff).

## Second Opinion

The `second_opinion` tool of the core plugin asks [TypeSafe Jev](https://docs.typesafe.ai/introduction) for a pick and a confidence on a decision.
Export `TYPESAFE_API_KEY` before Claude Code starts.
Each call sends the data of the decision to the TypeSafe API.
With no key, or when Jev gives no answer, a small Claude model answers instead.
The result says that the answer is not from Jev.
See [Second opinion](https://github.com/xsyetopz/claudetto/wiki/Second-Opinion).

## Add-on Plugins

Install each add-on that you need.

```bash
# --- CLI -----------------------------
claude plugin install claudetto-codegraph@claudetto
claude plugin install claudetto-browser@claudetto
claude plugin install claudetto-docs@claudetto
claude plugin install claudetto-sessions@claudetto
claude plugin install claudetto-lab@claudetto

# --- TUI -----------------------------
/plugin install claudetto-codegraph@claudetto
/plugin install claudetto-browser@claudetto
/plugin install claudetto-docs@claudetto
/plugin install claudetto-sessions@claudetto
/plugin install claudetto-lab@claudetto
```

- `claudetto-codegraph` needs the CLI `codegraph` on `PATH`, and an index that `codegraph init -y` builds in the project.
  It syncs the index at session start, and it adds no MCP server.
  See [Code graph](https://github.com/xsyetopz/claudetto/wiki/Code-Graph).
- `claudetto-browser` uses `agent-browser`.
  Its `backend` option can select CloakBrowser, for sites with bot detection.
  See [Browser](https://github.com/xsyetopz/claudetto/wiki/Browser).
- `claudetto-docs` needs no key.
  See [Library docs](https://github.com/xsyetopz/claudetto/wiki/Library-Docs).
- `claudetto-sessions` audits the setup and replays a hook on past transcripts.
  See [Sessions](https://github.com/xsyetopz/claudetto/wiki/Sessions).
- `claudetto-lab` is for plugin authors, and it works alone.
  See [Lab](https://github.com/xsyetopz/claudetto/wiki/Lab).

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
