# Install

Install the dotclaude marketplace, then each plugin that you want.
The core plugin is `dotclaude`.
`dotclaude-codegraph`, `dotclaude-jev`, `dotclaude-browser`, and `dotclaude-docs` are optional.

## Before you begin

| Need | For | Note |
| --- | --- | --- |
| Claude Code 2.1.295 or later | all plugins | |
| git | `dotclaude` | |
| [Node.js](https://nodejs.org) 22.18 or later on `PATH` | the setup script, the status line, and the auto-mode guard of `dotclaude`, the script of `dotclaude-jev`, and OpenSpec | Without Node.js, the auto-mode guard does not run, and the auto-mode classifier decides the calls. |
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

1. Run the setup skill, and restart Claude Code.

   ```text
   /dotclaude:setup
   ```

A plugin cannot set permissions, environment variables, or models.
The setup skill merges one profile into a settings file that you choose.
It shows each change and makes a backup first.
It keeps the 3 newest backups.
It also sets the status line.
The skill offers to install OpenSpec, and it writes no managed settings and runs no `sudo`.
If it finds an old dotclaude managed file, it offers to move the keys and prints the `sudo rm` command for you.
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
1. Run `/dotclaude:setup` again.
   It shows each change.

> **Warning:** Before 1.0, a release can change or remove behavior without a compatibility layer.
> Release 0.27.0 rebuilt the core plugin from an empty tree.
> It removed the 0.26 options, hooks, Terms of Use, evals, and most skills.
> The setup skill removes these 0.26 leftovers from your settings:
> `autoCompactWindow`, the 0.26 `subagentStatusLine`, and the 0.26 `CLAUDE.md` block.

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
