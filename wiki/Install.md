# Install

This page tells you how to add the dotclaude marketplace and install each plugin.
It is for users who run Claude Code and want dotclaude.
Read it before [Quickstart](Quickstart).

The core plugin is `dotclaude`.
`dotclaude-codegraph`, `dotclaude-browser`, `dotclaude-docs`, `dotclaude-sessions`, and `dotclaude-lab` are optional add-ons.
Each add-on works without the core plugin.
The `second_opinion` tool is part of the core plugin.

The commands on this page are for Claude Code `2.1.296`.
That is the minimum version, from `TESTED_VERSION` in `src/plugins/dotclaude/slices/setup/domain/facts.ts`.

## Before You Begin

Check that each tool in the table is ready for the plugins that you install.

| Need | For | Note |
| --- | --- | --- |
| Claude Code 2.1.296 or later | all plugins | |
| git | `dotclaude` | The checks of `git` calls and the spec lanes use `git`. |
| [Bun](https://bun.sh) 1.4.3 or later on `PATH` | the setup command, the status line, the `second_opinion` CLI `dotclaude-decide`, the hooks of `dotclaude-codegraph`, the bins of `dotclaude-codegraph`, `dotclaude-browser`, `dotclaude-sessions`, and `dotclaude-lab`. The `docs` skill of `dotclaude-docs` also needs Bun, because it runs `ctx7` through `bunx`. | Without Bun, the setup command does not run, the status line does not run, and `second_opinion` answers from a Claude model. |
| [Node.js](https://nodejs.org) on `PATH` | the npm installs of `codegraph` and `agent-browser` | Without Node.js, the npm installs do not run. |
| `gh` on `PATH` | the policy ask of `dotclaude` | Without `gh`, the ask does not run. The call continues. |
| `codegraph` on `PATH` | `dotclaude-codegraph` | Run `bun i -g @colbymchenry/codegraph`. The setup command offers this install. It runs the install only after you say yes. |
| `TYPESAFE_API_KEY` | `dotclaude` (`second_opinion`) | Export it before Claude Code begins. Without it, `second_opinion` answers from a Claude model. |
| `agent-browser` on `PATH` | `dotclaude-browser` | See [Browser](Browser). |

The checks of the core hooks module need no Bun and no Node.js, because the core plugin loads them as a hooks module.
The core plugin's `hooks.json` names only `register.ts`.

On a machine with managed settings, or with a Team or Enterprise login, Claude Code loads the built-in guard `sec-default`.
A user cannot disable it.
In a measurement on Claude Code `2.1.292`, the guard bypassed the `prompt.section` hook of dotclaude.
The `context_management` text did not reach the prompt.
The `tool.check` hook and the classic `PreToolUse` hook still ran.
See [Request build](Request-Build#the-built-in-guard-sec-default).

## Install the Core Plugin

1. Add the marketplace.

   ```text
   /plugin marketplace add xsyetopz/dotclaude
   ```

2. Install the plugin.

   ```text
   /plugin install dotclaude@dotclaude
   ```

3. Apply the settings snippet with the setup skill, then restart Claude Code.

   ```text
   /dotclaude:setup
   ```

A plugin cannot set permissions, environment variables, or models.
Claude Code applies only `agent` and `subagentStatusLine` from a plugin settings file.
Without the [settings snippet](Settings-Snippet), compaction stays on, the full system prompt stays, and the status line, the permission rules, and the sandbox are not set.

The setup skill previews each change first.
It writes nothing until you say yes.
The skill runs this command for the scope that you choose:

```bash
dotclaude-setup settings --scope user --apply
```

The scopes are `user` (`~/.claude/settings.json`, the default), `project` (`.claude/settings.json`), and `local` (`.claude/settings.local.json`).
When `CLAUDE_CONFIG_DIR` is set, the command uses that folder in place of `~/.claude`.
Run `/dotclaude:setup` again after each update of the plugin, because the status line commands hold the path of the plugin version.
The merge adds the keys and rules of the snippet.
It keeps your other keys, except `availableModels`, which it replaces.
See [Settings snippet](Settings-Snippet) for the keys.
See [Settings snippet keys](Settings-Snippet-Keys) for the reason of each key.

After the settings step, the setup skill checks the tools of each installed add-on.
The check reads the `codegraph` CLI and its index, `agent-browser`, `npx`, and the Bun version.
The check reads `npx`, not `bunx`, although the `docs` skill of `dotclaude-docs` runs `ctx7` through `bunx` (see the table above).
The setup skill installs a missing CLI only after you say yes.
The project step `codegraph init -y` runs only with `dotclaude-setup addons --apply`.

## Enable the Second Opinion

The `second_opinion` tool is part of the core plugin, so it needs no separate install.
To use TypeSafe Jev, export the key before Claude Code begins.

```bash
export TYPESAFE_API_KEY=<your key>
```

Each call sends the question, the options, and the state of the decision to the TypeSafe API.
Without a key, or when Jev gives no answer, a small Claude model answers.
See [Second opinion](Second-Opinion).

## Install the Code-Graph Plugin

1. Install the plugin.

   ```text
   /plugin install dotclaude-codegraph@dotclaude
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
See [Code graph](Code-Graph).

## Install the Browser Plugin

```text
/plugin install dotclaude-browser@dotclaude
```

The plugin loads the `browse` skill.
It also replaces the built-in `WebSearch` with a search in the headless browser.
It uses `agent-browser` by default.
To run `agent-browser` with the CloakBrowser binary on sites with bot detection, set the `backend` option to `cloakbrowser`.
Run `/plugin configure dotclaude-browser` to set the option.
See [Browser](Browser).

## Install the Other Add-Ons

```text
/plugin install dotclaude-docs@dotclaude
/plugin install dotclaude-sessions@dotclaude
/plugin install dotclaude-lab@dotclaude
```

`dotclaude-docs` adds the `docs` skill, which gets current library docs through `ctx7`.
See [Library docs](Library-Docs).
`dotclaude-sessions` adds the bins `dotclaude-start` and `dotclaude-usage`, and the skills `start-cost` and `usage`.
See [Sessions](Sessions).
`dotclaude-lab` adds the tools for plugin authors.
See [Lab](Lab).
None of the three needs a key.
The `docs` skill uses `CONTEXT7_API_KEY` only to raise the quota limit.

## Update

1. Update the marketplace and the plugins.

   ```bash
   claude plugin marketplace update dotclaude
   claude plugin update dotclaude@dotclaude
   ```

   For each add-on that you installed, run one more `claude plugin update` command.
   Replace `dotclaude` with the name of the add-on:

   ```bash
   claude plugin update dotclaude-codegraph@dotclaude
   claude plugin update dotclaude-browser@dotclaude
   claude plugin update dotclaude-docs@dotclaude
   claude plugin update dotclaude-sessions@dotclaude
   claude plugin update dotclaude-lab@dotclaude
   ```

2. Restart Claude Code.
   The help of `claude plugin update` says that a restart applies the update.
3. Read the new entry in the [CHANGELOG](https://github.com/xsyetopz/dotclaude/blob/main/CHANGELOG.md).
4. Run `/dotclaude:setup` again.
   The status line commands hold the path of the plugin version, so each update needs a new run.
   The drift check reports the differences that remain when a session begins.

## Uninstall

1. Uninstall each add-on that you installed.

   ```bash
   claude plugin uninstall dotclaude-codegraph@dotclaude
   claude plugin uninstall dotclaude-browser@dotclaude
   claude plugin uninstall dotclaude-docs@dotclaude
   claude plugin uninstall dotclaude-sessions@dotclaude
   claude plugin uninstall dotclaude-lab@dotclaude
   ```

2. Uninstall the core plugin, then remove the marketplace.

   ```bash
   claude plugin uninstall dotclaude@dotclaude
   claude plugin marketplace remove dotclaude
   ```

3. Remove the keys of the settings snippet by hand.
   The setup command does not remove them.
   Remove the `statusLine` and `subagentStatusLine` keys first.
   These keys hold the path of the plugin folder.
   See [Settings snippet](Settings-Snippet).

## Try an Unreleased Checkout

Claude Code `2.1.296` has the `--plugin-dir <path>` flag.
The flag loads a plugin folder for one session.

```bash
claude --plugin-dir /path/to/dotclaude/plugins/dotclaude
```

For a separate config, see [Sandbox](Sandbox).

## Related Pages

- [Quickstart](Quickstart): see what happens in a first session.
- [Troubleshooting](Troubleshooting): find the fix for a symptom.
- [Architecture](Architecture): see each part of the core plugin.
