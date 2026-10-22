# `claudetto`

claudetto changes Claude Code through its official extension points: settings, hooks, skills, and an output style.
It does not patch the Claude Code binary.
Its goal is the highest quality for the lowest token cost.

The [wiki](https://github.com/xsyetopz/claudetto/wiki) explains each part and the reason for it.
Start with the [Home](https://github.com/xsyetopz/claudetto/wiki/Home) page, or read the [Install](https://github.com/xsyetopz/claudetto/wiki/Install) page for the full setup.
The docs of Claude Code itself are on the [Claude Code docs](https://xsyetopz.github.io/claude-code-docs/) site, with an optional MCP server and a skill (`bunx skills add xsyetopz/claude-code-docs-skills`).

## Plugins

claudetto is a marketplace with one core plugin and two add-on plugins.
Each add-on works without the core plugin.

| Plugin | What it gives |
| --- | --- |
| `claudetto` | The core: the settings snippet, the status line, the output style, the `setup` skill, the `/handoff` command, the `guard` and `ground` hooks, the tailored prompt, and the Jev pick of `AskUserQuestion`. |
| `claudetto-browser` | The `browse` skill, which drives a real browser with `agent-browser`. |
| `claudetto-docs` | The `find-docs` skill, with current library docs from the CLI `ctx7`. |

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

- Claude Code `2.1.307` or later.
  claudetto is tested only on `2.1.307`.
- `git`.
- [Bun](https://bun.sh) `1.4.3` or later on `PATH`, for the status line, the setup command, and the Jev pick of `AskUserQuestion`.
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
| Guard | Asks before a `git push` that deletes a remote branch, and before a `docker` command that runs or creates a container. |
| Ground | Denies a `Write` or `Edit` of a plan file that cites a `file:line` or a convention that the source does not hold. |
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

See [Handoff](https://github.com/xsyetopz/claudetto/wiki/Handoff).

## Jev Pick

With the option `decide` set to `jev`, the core plugin asks [TypeSafe Jev](https://docs.typesafe.ai/introduction) for a pick and a confidence on each `AskUserQuestion` question that facts settle.
Export `TYPESAFE_API_KEY` before Claude Code starts.
Each pick sends the question and the options to the TypeSafe API.
When Jev gives no pick, the question stays as Claude asked it.
See [Decide](https://github.com/xsyetopz/claudetto/wiki/Decide).

## Add-On Plugins

Install each add-on that you need.

```bash
# --- CLI -----------------------------
claude plugin install claudetto-browser@claudetto
claude plugin install claudetto-docs@claudetto

# --- TUI -----------------------------
/plugin install claudetto-browser@claudetto
/plugin install claudetto-docs@claudetto
```

- `claudetto-browser` uses `agent-browser`.
  Install it with `bun add -g agent-browser`.
  See [Browser](https://github.com/xsyetopz/claudetto/wiki/Browser).
- `claudetto-docs` needs no key.
  See [Library docs](https://github.com/xsyetopz/claudetto/wiki/Library-Docs).

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
