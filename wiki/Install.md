# Install

Install the dotclaude marketplace, then each plugin that you want.
The core plugin is `dotclaude`.
`dotclaude-codegraph`, `dotclaude-jev`, `dotclaude-browser`, `dotclaude-docs`, `dotclaude-sessions`, and `dotclaude-lab` are optional.

## Before you begin

| Need | For | Note |
| --- | --- | --- |
| Claude Code 2.1.296 or later | all plugins | |
| git | `dotclaude` | |
| [Node.js](https://nodejs.org) 22.18 or later on `PATH` | the setup script, the status line, and the classic hooks of `dotclaude`, the Jev client, the hooks of `dotclaude-codegraph`, and the bins of `dotclaude-sessions` and `dotclaude-lab` | Without Node.js, the classic hooks do not run and the call goes on. The permission rules and the sandbox still apply. |
| `gh` on `PATH` | the policy ask of `dotclaude` | Without `gh`, the ask does not run and the call goes on. |
| `codegraph` on `PATH` | `dotclaude-codegraph` | Run `npm i -g @colbymchenry/codegraph`. The plugin never installs it. |
| `TYPESAFE_API_KEY` | `dotclaude-jev` | Export it before Claude Code starts. |
| `agent-browser` on `PATH` | `dotclaude-browser` | See [Browser](Browser#install-agent-browser). |
| `npx` on `PATH` | `dotclaude-docs` | It comes with Node.js. The `docs` skill runs `ctx7` through it. |

The core hooks module needs no Node.js, because Claude Code runs it.

On a machine with managed settings, or with a Team or Enterprise login, the built-in guard `sec-default` loads.
It skips the shared sections and the model variants (`prompt.compose`), and the `context_management` text (`prompt.section`), of dotclaude.
The other parts work.
See [Claude mods](Claude-Mods#the-built-in-guard-sec-default).

## Install the core plugin

1. Add the marketplace.

   ```text
   /plugin marketplace add xsyetopz/dotclaude
   ```

1. Install the plugin.

   ```text
   /plugin install dotclaude@dotclaude
   ```

1. Run the setup skill, then restart Claude Code.

   ```text
   /dotclaude:setup
   ```

A plugin cannot set permissions, environment variables, or models.
Without the [settings snippet](Settings-Snippet), compaction stays on, the full system prompt stays, and the status line, the permission rules, and the sandbox are not set.
The setup skill shows each change of the snippet to the settings file that you pick, and writes it after your yes.
It puts `claude-mythos-5-1` in place of `claude-fable-5-1` when the model catalog of your account offers it.
Then it shows the OpenSpec steps, asks, and runs them after your yes.
Last, it checks the tools of each installed add-on: `codegraph` and its index, `agent-browser`, `npx`, `TYPESAFE_API_KEY`, and Node.js.
It offers each missing global install, runs `codegraph init -y` in the project after your yes, and never asks for or writes a key.
It writes no managed settings and no backup, and it runs no `sudo`.
You can also copy the keys that you want from the snippet by hand.
See [OpenSpec](OpenSpec) and [Guards](Guards).

## Install the Jev plugin

1. Export the key before Claude Code starts.

   ```bash
   export TYPESAFE_API_KEY=<your key>
   ```

1. Install the plugin.

   ```text
   /plugin install dotclaude-jev@dotclaude
   ```

Each call sends the data of the decision to the TypeSafe API.
See [Second opinion](Second-Opinion).

## Install the code-graph plugin

```text
/plugin install dotclaude-codegraph@dotclaude
```

The plugin works only in a project that has an index.
Install the CLI, then build the index once in the project.

```bash
npm i -g @colbymchenry/codegraph
codegraph init -y
```

The CLI keeps telemetry on by default and writes `~/.codegraph/telemetry-queue.jsonl`.
The plugin does not change that setting.
To turn it off, run `codegraph telemetry off`.
The plugin script `bin/dotclaude-codegraph-check` prints the install command when `codegraph` is missing.
See [Code graph](Code-Graph).

## Install the browser plugin

```text
/plugin install dotclaude-browser@dotclaude
```

The plugin loads the `drive-web-browser` skill.
It also replaces the built-in `WebSearch` with a search in the headless browser.
It uses `agent-browser` by default.
Set its `backend` option to `cloakbrowser` to run `agent-browser` with the CloakBrowser binary on sites with bot detection.
See [Browser](Browser).

## Install the other plugins

```text
/plugin install dotclaude-docs@dotclaude
/plugin install dotclaude-sessions@dotclaude
/plugin install dotclaude-lab@dotclaude
```

`dotclaude-docs` adds the `docs` skill ([Library docs](Library-Docs)).
`dotclaude-sessions` adds two bins that measure usage and the skills `start-cost` and `usage` ([Sessions](Sessions)).
`dotclaude-lab` adds the tools for plugin authors ([Lab](Lab)).
Each of the three needs no key.

## Update

1. Update the marketplace and the plugin.

   ```bash
   claude plugin marketplace update dotclaude
   claude plugin update dotclaude@dotclaude
   ```

   For each add-on that you installed, run one more line, with its name in place of `dotclaude`:

   ```bash
   claude plugin update dotclaude-codegraph@dotclaude
   claude plugin update dotclaude-jev@dotclaude
   claude plugin update dotclaude-browser@dotclaude
   claude plugin update dotclaude-docs@dotclaude
   claude plugin update dotclaude-sessions@dotclaude
   claude plugin update dotclaude-lab@dotclaude
   ```

1. Restart Claude Code, because a running session keeps the old hooks and agents.
1. Read the new entry in the [CHANGELOG](https://github.com/xsyetopz/dotclaude/blob/main/CHANGELOG.md).
1. Run `/dotclaude:setup` again.
   The status line commands hold the path of the plugin version, so each update needs a new run.
   The drift check at session start reports some differences.

> **Warning:** Before 1.0, a release can change or remove behavior without a compatibility layer.
> Release 0.27.0 rebuilt the core plugin from an empty tree.
> Release 0.28.0 removed each format that dotclaude had made up for itself:
> the setup profile with its diff and backups, the router table, the usage state file, and the handoff notes.
> Setup still merges the settings snippet into your settings, because Claude Code owns that format.
> dotclaude deletes no file of yours.
> Files that earlier versions wrote stay on your machine, such as `.claude/handoffs/`, setup backups, and launcher stubs.
> A `settings.json` that setup merged keeps its keys, and nothing updates them.
> Remove what you do not want by hand.

## Try an unreleased checkout

```bash
claude --plugin-dir /path/to/dotclaude/plugins/dotclaude
```

For a separate config, see [Sandbox](Sandbox).

## Troubleshooting

A symptom and its fix are on the page of the plugin.
For a recursive `rm` with no ask, see [Guards](Guards#troubleshooting).
For a missing policy ask, see [Contributions](Contributions).
For Claude with no `second_opinion` tool, see [Second opinion](Second-Opinion#troubleshooting).
More symptoms are on [Troubleshooting](Troubleshooting).

## Next steps

- [Quickstart](Quickstart): see what happens in a first session.
- [Core plugin](Core-Plugin): see each part of the core plugin.
