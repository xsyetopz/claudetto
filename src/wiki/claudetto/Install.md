# Install

`claudetto` is a plugin for Claude Code.
You add it from a plugin marketplace, which is a list of plugins.
Add-ons are optional.

## Before You Begin

| Need | For | Note |
| --- | --- | --- |
| Claude Code 2.1.303 or later | all plugins | |
| `git` | `claudetto` | The status line and the `patch` slice use it. |
| [Bun](https://bun.sh) 1.4.3 or later, on `PATH` | all plugins | The `docs` skill runs `ctx7` with `bunx`. |
| [Node.js](https://nodejs.org) | `agent-browser` | Only for `npm install -g agent-browser`. |
| `codegraph` | `claudetto-codegraph` | Run `bun i -g @colbymchenry/codegraph`. |
| `agent-browser` | `claudetto-browser` | See [Browser](Browser). |
| `TYPESAFE_API_KEY` | `decide` set to `jev` | Export it before Claude Code starts. |

## Install the Core Plugin

1. Add the marketplace.

   ```text
   /plugin marketplace add xsyetopz/claudetto
   ```

2. Install the plugin.

   ```text
   /plugin install claudetto@claudetto
   ```

3. Apply the settings.

   ```text
   /claudetto:setup
   ```

4. Restart Claude Code.

In a shell, use `claude plugin marketplace add xsyetopz/claudetto` and `claude plugin install claudetto@claudetto`.

## What the Setup Does

A plugin cannot set permissions, env vars, or models.
So the setup skill copies the [settings snippet](Settings-Snippet) into one of your settings files.
It shows each change first and writes nothing until you say yes.

It runs this command for the scope that you choose:

```bash
claudetto-setup --scope user --apply
```

| Scope | File |
| --- | --- |
| `user` (default) | `~/.claude/settings.json` |
| `project` | `.claude/settings.json` |
| `local` | `.claude/settings.local.json` |

When `CLAUDE_CONFIG_DIR` is set, the command uses that folder in place of `~/.claude`.
The merge adds the keys of the snippet, and your other keys stay.

The skill then offers two more steps:

- An `alias` line for the search tools `Glob` and `Grep`. It does not edit your shell file.
- One step for each add-on that you installed, such as `codegraph install --target claude --location global`. It runs a step only after you say yes.

## Install an Add-On

```text
/plugin install claudetto-codegraph@claudetto
/plugin install claudetto-browser@claudetto
/plugin install claudetto-docs@claudetto
/plugin install claudetto-sessions@claudetto
/plugin install claudetto-lab@claudetto
```

| Add-On | What it needs |
| --- | --- |
| `claudetto-codegraph` | The CLI `codegraph` and an index from `codegraph init -y`. See [Code Graph](Code-Graph). |
| `claudetto-browser` | `agent-browser`. The option `backend` can pick CloakBrowser. See [Browser](Browser). |
| `claudetto-docs` | No key. See [Library Docs](Library-Docs). |
| `claudetto-sessions` | No setup. See [Sessions](Sessions). |
| `claudetto-lab` | For plugin authors. See [Lab](Lab). |

## Turn On the Jev Pick

The Jev pick is off by default.
To use it, set the option `decide` of `claudetto` to `jev`.
Then export the key before Claude Code starts:

```bash
export TYPESAFE_API_KEY=<your key>
```

Each pick then sends the question and the options to the TypeSafe API.
See [Decide](Decide).

## Update

1. Update the marketplace and the plugins.

   ```bash
   claude plugin marketplace update claudetto
   claude plugin update claudetto@claudetto
   ```

   Run `claude plugin update` again for each add-on.
2. Restart Claude Code.
3. Read the new entry in the [CHANGELOG](https://github.com/xsyetopz/claudetto/blob/main/CHANGELOG.md).
4. Run `/claudetto:setup` again.
   The status line commands hold the path of the plugin version, so each update needs a new run.

In a checkout of the repository, `just update` updates each plugin under `plugins/`.

## Uninstall

1. Uninstall each add-on, then the core plugin.

   ```bash
   claude plugin uninstall claudetto-codegraph@claudetto
   claude plugin uninstall claudetto@claudetto
   ```

2. Remove the marketplace.

   ```bash
   claude plugin marketplace remove claudetto
   ```

3. Remove the keys of the settings snippet by hand.
   Remove `statusLine` and `subagentStatusLine` first, because they hold the path of the plugin folder.

## Try an Unreleased Checkout

The flag `--plugin-dir <path>` loads a plugin folder for one session.

```bash
claude --plugin-dir /path/to/claudetto/plugins/claudetto
```

For a separate config, see [Sandbox](Sandbox).

## See Also

- [Quickstart](Quickstart)
- [Troubleshooting](Troubleshooting)
- [Setup](Setup)
- [Settings Snippet](Settings-Snippet)
