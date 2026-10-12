# Install

Add the dotclaude marketplace, then install each plugin that you want.
The core plugin is `dotclaude`.
`dotclaude-codegraph`, `dotclaude-browser`, `dotclaude-docs`, `dotclaude-sessions`, and `dotclaude-lab` are optional add-ons.
Each add-on works without the core plugin.
The `second_opinion` tool is part of the core plugin.

The commands on this page are for Claude Code `2.1.296`.
That is the minimum version, from `TESTED_VERSION` in `src/plugins/dotclaude/slices/setup/domain/facts.ts`.

## Before you begin

| Need | For | Note |
| --- | --- | --- |
| Claude Code 2.1.296 or later | all plugins | |
| git | `dotclaude` | The checks of `git` calls and the spec lanes use `git`. |
| [Bun](https://bun.sh) 1.4.3 or later on `PATH` | the setup command, the status line, the `second_opinion` CLI `dotclaude-decide`, the hooks of `dotclaude-codegraph`, the bins of `dotclaude-codegraph`, `dotclaude-browser`, `dotclaude-sessions`, and `dotclaude-lab`, and the `docs` skill of `dotclaude-docs`, which runs `ctx7` through `bunx` | Without Bun, the setup command does not run, the status line does not run, and `second_opinion` answers from a Claude model. |
| [Node.js](https://nodejs.org) on `PATH` | the npm installs of `codegraph` and `agent-browser` | Without Node.js, the npm installs do not run. |
| `gh` on `PATH` | the policy ask of `dotclaude` | Without `gh`, the ask does not run, and the call goes on. |
| `codegraph` on `PATH` | `dotclaude-codegraph` | Run `npm i -g @colbymchenry/codegraph`. The setup command offers this install, and runs it only after your yes. |
| `TYPESAFE_API_KEY` | `dotclaude` (`second_opinion`) | Export it before Claude Code starts. Without it, `second_opinion` answers from a Claude model. |
| `agent-browser` on `PATH` | `dotclaude-browser` | See [Browser](Browser). |

The checks of the core hooks module need no Bun and no Node.js, because the core plugin loads them as a hooks module.
The core plugin's `hooks.json` names only `register.ts`.

On a machine with managed settings, or with a Team or Enterprise login, Claude Code loads the built-in guard `sec-default`.
A user cannot turn it off.
In a measurement on Claude Code `2.1.292`, the guard bypassed the `prompt.section` hook of dotclaude, so the `context_management` text did not reach the prompt.
The `tool.check` hook and the classic `PreToolUse` hook still ran.
See [Request build](Request-Build#the-built-in-guard-sec-default).

## Install the core plugin

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

The setup skill runs the preview of each change first, and it writes nothing until you say yes.
The skill runs this command for the scope that you pick:

```bash
dotclaude-setup settings --scope user --apply
```

The scopes are `user` (`~/.claude/settings.json`, the default), `project` (`.claude/settings.json`), and `local` (`.claude/settings.local.json`).
When `CLAUDE_CONFIG_DIR` is set, the command uses that folder in place of `~/.claude`.
Run `/dotclaude:setup` again after each update of the plugin, because the status line commands hold the path of the plugin version.
The merge adds the keys and rules of the snippet, and it keeps your other keys, except that it replaces `availableModels`.
See [Settings snippet](Settings-Snippet) for the keys, and [Settings snippet keys](Settings-Snippet-Keys) for the reason of each key.

After the settings step, the setup skill checks the tools of each installed add-on.
The check reads the `codegraph` CLI and its index, `agent-browser`, `npx`, and the Bun version.
The check reads `npx`, not `bunx`, although the `docs` skill of `dotclaude-docs` runs `ctx7` through `bunx` (see the table above).
The install of a missing CLI runs only after your yes.
The project step `codegraph init -y` runs only with `dotclaude-setup addons --apply`.

## Enable the second opinion

The `second_opinion` tool is part of the core plugin, so it needs no separate install.
To use TypeSafe Jev, export the key before Claude Code starts.

```bash
export TYPESAFE_API_KEY=<your key>
```

Each call sends the question, the options, and the state of the decision to the TypeSafe API.
Without a key, or when Jev gives no answer, a small Claude model answers.
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

The plugin does not change the telemetry setting of the CLI.
See [Code graph](Code-Graph).

## Install the browser plugin

```text
/plugin install dotclaude-browser@dotclaude
```

The plugin loads the `drive-web-browser` skill.
It also replaces the built-in `WebSearch` with a search in the headless browser.
It uses `agent-browser` by default.
To run `agent-browser` with the CloakBrowser binary on sites with bot detection, set the `backend` option to `cloakbrowser`.
Run `/plugin configure dotclaude-browser` to set it.
See [Browser](Browser).

## Install the other add-ons

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

   For each add-on that you installed, run one more `claude plugin update` line, with the name of the add-on in place of `dotclaude`:

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
   The drift check at session start reports the differences that remain.

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
   The setup command has no command that removes them.
   The `statusLine` and `subagentStatusLine` keys hold the path of the plugin folder, so remove them first.
   See [Settings snippet](Settings-Snippet).

## Try an unreleased checkout

Claude Code 2.1.296 has the `--plugin-dir <path>` flag, which loads a plugin folder for one session.

```bash
claude --plugin-dir /path/to/dotclaude/plugins/dotclaude
```

For a separate config, see [Sandbox](Sandbox).

## Next steps

- [Quickstart](Quickstart): see what happens in a first session.
- [Troubleshooting](Troubleshooting): find the fix for a symptom.
- [Architecture](Architecture): see each part of the core plugin.
