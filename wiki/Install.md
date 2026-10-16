# Install

This page tells you how to add the `claudetto` marketplace and install each plugin.
It is for users who run Claude Code and want `claudetto`.
Read it before [Quickstart](Quickstart).

The core plugin is `claudetto`.
`claudetto-codegraph`, `claudetto-browser`, `claudetto-docs`, `claudetto-sessions`, `claudetto-lab`, and `claudetto-you-should-know` are optional add-ons.
Each add-on works without the core plugin.
The `second_opinion` tool is part of the core plugin, and it is off by default.

The commands on this page are for Claude Code 2.1.302.
That is the minimum version (`MIN_CLAUDE_CODE_VERSION` in `tools/limits.ts`).

## Before You Begin

Check that each tool in the table is ready for the plugins that you install.

| Need | For | Note |
| --- | --- | --- |
| Claude Code 2.1.302 or later | all plugins | |
| git | `claudetto` | The status line, the worktree hooks, and the setup use `git`. |
| [Bun](https://bun.sh) 1.4.3 or later on `PATH` | the setup command, the status line, the `minispec` CLI, the CLI `claudetto-decide`, the hooks and bins of `claudetto-codegraph`, and the bins of `claudetto-browser`, `claudetto-sessions`, and `claudetto-lab`. The `docs` skill of `claudetto-docs` also needs Bun, because it runs `ctx7` through `bunx`. | Without Bun, the setup command does not run and the status line does not run. |
| [Node.js](https://nodejs.org) on `PATH` | the npm installs of `codegraph` and `agent-browser`, which the setup command offers | Without Node.js, the npm installs do not run. |
| `codegraph` on `PATH` | `claudetto-codegraph` | Run `bun i -g @colbymchenry/codegraph`. The setup command offers this install. It runs the install only after you say yes. |
| `TYPESAFE_API_KEY` | `claudetto` (`second_opinion` with the option `jev`) | Export it before Claude Code begins. Without it, the option `jev` gives an error. |
| `agent-browser` on `PATH` | `claudetto-browser` | See [Browser](Browser). |

The checks of the core hooks module need no Bun and no Node.js, because the core plugin loads them as a hooks module.
The core plugin's `hooks.json` names only `register.ts`.

On a machine with managed settings, or with a Team or Enterprise login, Claude Code loads the built-in guard `sec-default`.
A user cannot disable it.
In a measurement on Claude Code `2.1.292`, the guard bypassed the `prompt.section` hook of `dotclaude` 1.0.0.
The `context_management` text did not reach the prompt.
The `tool.check` hook and the classic `PreToolUse` hook still ran.
See [Request Build](Request-Build#the-built-in-guard-sec-default).

## Install the Core Plugin

1. Add the marketplace.

   ```text
   /plugin marketplace add xsyetopz/claudetto
   ```

2. Install the plugin.

   ```text
   /plugin install claudetto@claudetto
   ```

3. Apply the settings snippet with the setup skill, then restart Claude Code.

   ```text
   /claudetto:setup
   ```

A plugin cannot set permissions, environment variables, or models.
Claude Code applies only `agent` and `subagentStatusLine` from a plugin settings file.
Without the [settings snippet](Settings-Snippet), compaction stays on, the full system prompt stays, and the status line, the permission rules, and the sandbox are not set.

The setup skill previews each change first.
It writes nothing until you say yes.
The skill runs this command for the scope that you choose:

```bash
claudetto-setup settings --scope user --apply
```

The scopes are `user` (`~/.claude/settings.json`, the default), `project` (`.claude/settings.json`), and `local` (`.claude/settings.local.json`).
When `CLAUDE_CONFIG_DIR` is set, the command uses that folder in place of `~/.claude`.
Run `/claudetto:setup` again after each update of the plugin, because the status line commands hold the path of the plugin version.
The merge adds the keys and rules of the snippet.
It keeps your other keys, except `availableModels`, which it replaces.
See [Settings Snippet](Settings-Snippet) for the keys.
See [Settings Snippet Keys](Settings-Snippet-Keys) for the reason of each key.

After the settings step, the setup skill checks the tools of each installed add-on.
The check reads the `codegraph` CLI and its index, `agent-browser`, `bunx`, and the Bun version.
The setup skill installs a missing CLI only after you say yes.
The project step `codegraph init -y` runs only with `claudetto-setup addons --apply`.

## Enable the Second Opinion

The `second_opinion` tool is part of the core plugin, so it needs no separate install.
It is off by default.
Run `/plugin configure claudetto` to set the option `decide`.
The value `claude` lets a small Claude model answer.
The value `jev` lets TypeSafe Jev answer, and it needs the key.
Export the key before Claude Code begins.

```bash
export TYPESAFE_API_KEY=<your key>
```

With the value `jev`, each call sends the question, the options, and the state of the decision to the TypeSafe API.
See [Decision API](Decision-API).

## Install the Code Graph Plugin

1. Install the plugin.

   ```text
   /plugin install claudetto-codegraph@claudetto
   ```

2. Install the CLI.

   ```bash
   bun i -g @colbymchenry/codegraph
   ```

3. Build the index once in the project.

   ```bash
   codegraph init -y
   ```

The plugin works only in a project that has an index.
The plugin does not change the telemetry setting of the CLI.
See [Code Graph](Code-Graph).

## Install the Browser Plugin

```text
/plugin install claudetto-browser@claudetto
```

The plugin loads the `browse` skill.
It also replaces the built-in `WebSearch` with a search in the headless browser.
It uses `agent-browser` by default.
To run `agent-browser` with the CloakBrowser binary on sites with bot detection, set the `backend` option to `cloakbrowser`.
Run `/plugin configure claudetto-browser` to set the option.
See [Browser](Browser).

## Install the Other Add-Ons

```text
/plugin install claudetto-docs@claudetto
/plugin install claudetto-sessions@claudetto
/plugin install claudetto-lab@claudetto
/plugin install claudetto-you-should-know@claudetto
```

`claudetto-docs` adds the `docs` skill, which gets current library docs through `ctx7`.
See [Library Docs](Library-Docs).
`claudetto-sessions` adds the bins `claudetto-start` and `claudetto-usage`, and the skills `start-cost` and `usage`.
See [Sessions](Sessions).
`claudetto-lab` adds the tools for plugin authors.
See [Lab](Lab).
None of the three needs a key.
`claudetto-you-should-know` is opt-in, because each check costs a model call.
Turn off the built-in plugin `cc-plugin-you-should-know@builtin` in `/plugin`, so that the two do not both check.
See [You Should Know](You-Should-Know).
The `docs` skill uses `CONTEXT7_API_KEY` only to raise the quota limit.

## Update

1. Update the marketplace and the plugins.

   ```bash
   claude plugin marketplace update claudetto
   claude plugin update claudetto@claudetto
   ```

   For each add-on that you installed, run one more `claude plugin update` command.
   Replace `claudetto` with the name of the add-on:

   ```bash
   claude plugin update claudetto-codegraph@claudetto
   claude plugin update claudetto-browser@claudetto
   claude plugin update claudetto-docs@claudetto
   claude plugin update claudetto-sessions@claudetto
   claude plugin update claudetto-lab@claudetto
   claude plugin update claudetto-you-should-know@claudetto
   ```

2. Restart Claude Code.
   The help of `claude plugin update` says that a restart applies the update.
3. Read the new entry in the [CHANGELOG](https://github.com/xsyetopz/claudetto/blob/main/CHANGELOG.md).
4. Run `/claudetto:setup` again.
   The status line commands hold the path of the plugin version, so each update needs a new run.
   The drift check reports the differences that remain when a session begins.

## Uninstall

1. Uninstall each add-on that you installed.

   ```bash
   claude plugin uninstall claudetto-codegraph@claudetto
   claude plugin uninstall claudetto-browser@claudetto
   claude plugin uninstall claudetto-docs@claudetto
   claude plugin uninstall claudetto-sessions@claudetto
   claude plugin uninstall claudetto-lab@claudetto
   claude plugin uninstall claudetto-you-should-know@claudetto
   ```

2. Uninstall the core plugin, then remove the marketplace.

   ```bash
   claude plugin uninstall claudetto@claudetto
   claude plugin marketplace remove claudetto
   ```

3. Remove the keys of the settings snippet by hand.
   The setup command does not remove them.
   Remove the `statusLine` and `subagentStatusLine` keys first.
   These keys hold the path of the plugin folder.
   See [Settings Snippet](Settings-Snippet).

## Try an Unreleased Checkout

Claude Code `2.1.302` has the `--plugin-dir <path>` flag.
The flag loads a plugin folder for one session.

```bash
claude --plugin-dir /path/to/claudetto/plugins/claudetto
```

For a separate config, see [Sandbox](Sandbox).

## Related Pages

- [Quickstart](Quickstart): see what happens in a first session.
- [Troubleshooting](Troubleshooting): find the fix for a symptom.
- [Architecture](Architecture): see each part of the core plugin.
