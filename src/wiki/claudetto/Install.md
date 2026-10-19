# Install

This page tells how to add the `claudetto` marketplace, install the plugins, update them, and remove them.
A user who runs Claude Code and wants `claudetto` reads it before [Quickstart](Quickstart).

The core plugin is `claudetto`.
`claudetto-codegraph`, `claudetto-browser`, `claudetto-docs`, `claudetto-sessions`, and `claudetto-lab` are optional add-ons.
Each add-on works without the core plugin.

## Before You Begin

Check that each tool in the table is ready for the plugins that you install.

| Need | For | Note |
| --- | --- | --- |
| Claude Code 2.1.303 or later | all plugins | `MIN_CLAUDE_CODE_VERSION` in `tools/limits.ts` sets the minimum. |
| `git` | `claudetto` | The status line and the `patch` slice use `git`. |
| [Bun](https://bun.sh) 1.4.3 or later on `PATH` | the CLIs of `claudetto`, the bins of the add-ons, and the `docs` and `sessions` skills | The status line, `claudetto-setup`, and the other `bin/` launchers start with `bun`. The `docs` skill runs `ctx7` with `bunx`. |
| [Node.js](https://nodejs.org) on `PATH` | `npm install -g agent-browser` | Only for the install of `agent-browser`. |
| `codegraph` on `PATH` | `claudetto-codegraph` | Run `bun i -g @colbymchenry/codegraph`. See [Code Graph](Code-Graph). |
| `agent-browser` on `PATH` | `claudetto-browser` | See [Browser](Browser). |
| `TYPESAFE_API_KEY` | `claudetto`, with the option `decide` set to `jev` | Export it before Claude Code starts. See [Decide](Decide). |

## Install the Core Plugin

1. Add the marketplace.

   ```text
   /plugin marketplace add xsyetopz/claudetto
   ```

2. Install the plugin.

   ```text
   /plugin install claudetto@claudetto
   ```

3. Apply the settings snippet with the setup skill.

   ```text
   /claudetto:setup
   ```

4. Restart Claude Code.

In a shell, the same steps are `claude plugin marketplace add xsyetopz/claudetto` and `claude plugin install claudetto@claudetto`.

A plugin cannot set permissions, environment variables, or models.
Claude Code applies only `agent` and `subagentStatusLine` from a plugin settings file.
So the setup skill merges the [settings snippet](Settings-Snippet) into a settings file of yours.
The skill shows each change first, and it writes nothing until you say yes.
It runs this command for the scope that you choose:

```bash
claudetto-setup --scope user --apply
```

The scopes are `user` (`~/.claude/settings.json`, the default), `project` (`.claude/settings.json`), and `local` (`.claude/settings.local.json`).
When `CLAUDE_CONFIG_DIR` is set, the command uses that folder in place of `~/.claude`.
The merge adds the keys and rules of the snippet and keeps your other keys.
See [Setup](Setup) for the merge and [Settings Snippet](Settings-Snippet) for the keys.

After the settings, the skill offers two more steps.
It gives you an `alias` line for the search tools `Glob` and `Grep`, and it does not edit your shell file.
It also prints one step for each add-on that is installed, such as `codegraph install --target claude --location global`.
It runs such a step only after you say yes.

## Install an Add-On

Install each add-on that you need:

```text
/plugin install claudetto-codegraph@claudetto
/plugin install claudetto-browser@claudetto
/plugin install claudetto-docs@claudetto
/plugin install claudetto-sessions@claudetto
/plugin install claudetto-lab@claudetto
```

- `claudetto-codegraph` needs the CLI `codegraph` and an index that `codegraph init -y` builds in the project.
  See [Code Graph](Code-Graph).
- `claudetto-browser` uses `agent-browser`.
  The option `backend` can select CloakBrowser.
  See [Browser](Browser).
- `claudetto-docs` needs no key.
  See [Library Docs](Library-Docs).
- `claudetto-sessions` needs no setup.
  See [Sessions](Sessions).
- `claudetto-lab` is for plugin authors.
  See [Lab](Lab).

## Enable the Jev Pick

The Jev pick is part of the core plugin, and it is off by default.
Set the option `decide` of `claudetto` to `jev`, and export the key before Claude Code starts:

```bash
export TYPESAFE_API_KEY=<your key>
```

With the value `jev`, each pick sends the question and the options to the TypeSafe API.
See [Decide](Decide).

## Update

1. Update the marketplace and the plugins.

   ```bash
   claude plugin marketplace update claudetto
   claude plugin update claudetto@claudetto
   ```

   Run `claude plugin update` again for each add-on that you installed, with its name in place of `claudetto`.
2. Restart Claude Code.
3. Read the new entry in the [CHANGELOG](https://github.com/xsyetopz/claudetto/blob/main/CHANGELOG.md).
4. Run `/claudetto:setup` again.
   The status line commands hold the path of the plugin version, so each update needs a new run.
   A second run with no change in the snippet changes nothing.

In a checkout of the repository, `just update` runs the first step for each plugin under `plugins/`.

## Uninstall

1. Uninstall each add-on that you installed, then the core plugin.

   ```bash
   claude plugin uninstall claudetto-codegraph@claudetto
   claude plugin uninstall claudetto@claudetto
   ```

2. Remove the marketplace.

   ```bash
   claude plugin marketplace remove claudetto
   ```

3. Remove the keys of the settings snippet by hand.
   The setup command does not remove them.
   Remove the `statusLine` and `subagentStatusLine` keys first, because they hold the path of the plugin folder.

## Try an Unreleased Checkout

The flag `--plugin-dir <path>` loads a plugin folder for one session.

```bash
claude --plugin-dir /path/to/claudetto/plugins/claudetto
```

For a separate config, see [Sandbox](Sandbox).

## Related Pages

- [Quickstart](Quickstart): see what happens in a first session.
- [Troubleshooting](Troubleshooting): find the fix for a symptom.
- [Setup](Setup): the merge of the settings snippet.
