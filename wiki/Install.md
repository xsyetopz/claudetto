# Install

Install the dotclaude marketplace, then each plugin that you want.
The core plugin is `dotclaude`.
`dotclaude-codegraph`, `dotclaude-jev`, `dotclaude-browser`, and `dotclaude-docs` are optional.

## Before you begin

| Need | For | Note |
| --- | --- | --- |
| Claude Code 2.1.295 or later | all plugins | |
| git | `dotclaude` | |
| [Node.js](https://nodejs.org) 22.18 or later on `PATH` | the setup script, the status line, the classic hooks, and the auto-mode guard of `dotclaude`, the script of `dotclaude-jev`, and OpenSpec | Without Node.js, the auto-mode guard does not run, and the auto-mode classifier decides the calls. |
| `gh` on `PATH` | the policy ask of `dotclaude` | Without `gh`, the ask does not run and the call goes on. |
| `codegraph` on `PATH` | `dotclaude-codegraph` | Run `npm i -g @colbymchenry/codegraph`. The plugin never installs it. |
| `TYPESAFE_API_KEY` | `dotclaude-jev` | Export it before Claude Code starts. |

The core hooks module needs no Node.js, because Claude Code runs it.

On a machine with managed settings, or with a Team or Enterprise login, the built-in guard `sec-default` loads.
It skips the `prompt.section` hook of dotclaude, so the `context_management` text of dotclaude does not load.
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

1. Copy the keys that you want from the [settings snippet](Settings-Snippet) into your own `settings.json`, and restart Claude Code.
1. Optional: run the setup skill to set up OpenSpec.

   ```text
   /dotclaude:setup
   ```

A plugin cannot set permissions, environment variables, or models.
So dotclaude gives a plain JSON snippet and writes no setting for you.
The setup skill does one thing.
It shows the OpenSpec steps, asks, and runs them after your yes.
It writes no Claude Code setting, no managed settings, and no backup, and it runs no `sudo`.
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

## Update

1. Update the marketplace and the plugin.

   ```bash
   claude plugin marketplace update dotclaude
   claude plugin update dotclaude@dotclaude
   ```

1. Restart Claude Code, because a running session keeps the old hooks and agents.
1. Read the new entry in the [CHANGELOG](https://github.com/xsyetopz/dotclaude/blob/main/CHANGELOG.md).
1. Compare your `settings.json` with the [settings snippet](Settings-Snippet).
   The drift check at session start reports some differences.

> **Warning:** Before 1.0, a release can change or remove behavior without a compatibility layer.
> Release 0.27.0 rebuilt the core plugin from an empty tree.
> Release 0.28.0 removed each format that dotclaude had made up for itself:
> the setup profile with its merge, diff, and backups, the router table, the usage state file, and the handoff notes.
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

| Symptom | Cause and fix |
| --- | --- |
| No ask for a recursive `rm` outside the project | Claude Code does not load hooks modules in your mode, for example `--bare`. |
| No policy ask for a repository of another owner | `gh` is not on `PATH` or has no login. The ask fails open and the call goes on. |
| Jev calls fail | `TYPESAFE_API_KEY` was not set when Claude Code started. Export it and restart. |

## Next steps

- [Quickstart](Quickstart): see what happens in a first session.
- [Parts](Parts): see each part of the core plugin.
