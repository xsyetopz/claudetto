# Claude Code Plugins: CLI

The `claude plugin` command installs, updates, and removes plugins from the shell.
Inside a session, the `/plugin` command does the same in a panel.
For example, `claude plugin list` prints each plugin and tells you if it is on.
The marks are explained on [Plugins](Claude-Code-Plugins).

## Subcommands

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `init` (`new`) `<name>` | Scaffolds `~/.claude/skills/<name>/`. | Flags `--description`, `--author`, `--author-email`, `-f/--force`, `--with skills agents hooks mcp lsp output-style channel`. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Manage Claude Code Plugins for Your Organization](https://code.claude.com/docs/en/plugins/org) |
| ✅ | `install` (`i`) `<plugin>` | Installs from a marketplace. | `-s/--scope` (default `user`), `--config key=value`, `-y/--yes`, `--accept-command <sha256>`, `--json`, `--marketplace <source>`. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Plugin Loading Reference](https://code.claude.com/docs/en/plugins/loading) |
| ✅ | `install --registry <url>` | npm registry for `<package>@npm` installs. | In `--help`, not in the docs table. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Plugin Loading Reference](https://code.claude.com/docs/en/plugins/loading) |
| ✅ | `uninstall` (`remove`, `rm`) | Removes one scope. | `-s`, `--keep-data`, `--prune`, `-y`, `--json`. Deletes options, secrets, and data on the last scope. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Install and Manage Plugins](https://code.claude.com/docs/en/plugins/install) |
| ✅ | `enable` `<plugin>` | Enables. | `-s` (auto-detect local, project, user), `--json`. | Shell | [Install and Manage Plugins](https://code.claude.com/docs/en/plugins/install) |
| ✅ | `disable` `[plugin]` | Disables. | `-a/--all`, `-s`, `--json`. Fails if another plugin depends on it. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Install and Manage Plugins](https://code.claude.com/docs/en/plugins/install) |
| ✅ | `update` `<plugin>` | Updates. | `-s`, `-y`, `--accept-command`, `--json`. Restart or `/reload-plugins` applies. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `list` | Lists installs. | `--json`, `--available`, `--data-size [plugin]`. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | `details` `<name>` | Component inventory and token cost. | No flags. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | `configure` `<plugin>` | Shows or saves `userConfig`. | `--values-stdin`, `--json`. Needs the full id. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | `prune` (`autoremove`) | Removes unused auto dependencies. | `-s`, `--dry-run`, `-y`. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | `validate` `<path>` | Checks a plugin, marketplace, or component directory. | `--strict`, `--json`. | Shell, `/plugin validate` | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Create a Marketplace](https://code.claude.com/docs/en/plugins/create-marketplace) |
| ✅ | `tag` `[path]` | Creates the git tag `<name>--v<version>`. | `--push`, `--dry-run`, `-f`, `-m`, `--remote`. | Shell, `/plugin tag` | - |
| ✅ | `test` `[dir]` | Runs the tests of a mod. | Every `*.test.ts` and `*.test.tsx`. See [Mod API](Claude-Code-Mod-API). | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | `eval` `[target]` | Runs eval cases (v2.1.269 or later). | Docs list the main flags. Help adds `--allow-real-servers`, `--case`, `--disallow-tools`, `--keep-temp`, `--no-scaffold`, `--output-dir`, `--publish-report`, `--report`, `--tag`, `--verbose`. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `eval init` `[name]` | Creates an eval suite. | `--bare`, `-i/--interactive`, `--eval-dir`. | Shell | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | `marketplace add` `<source>` | Adds a marketplace. | `--scope`, `--sparse <paths...>`, `--claudeai`, `--json`. Source forms: `owner/repo[#ref\|@ref]`, git URL, https URL, path. | Shell | [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `marketplace list` | Lists. | `--json`. | Shell | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `marketplace remove` (`rm`) `<name>` | Removes the declaration. | `--scope`, `--json`. Last scope: deletes cache and uninstalls its plugins. | Shell | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `marketplace update` `[name]` | Refreshes. | `--json` needs a name. | Shell | - |

## Session Forms

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `/plugin` (`/plugins`, `/marketplace`) | Opens the panel (tabs Discover, Installed, Marketplaces, Stats, Errors). | Subcommands: `help`, `list [--enabled\|--disabled]`, `install`, `manage`, `stats`, `enable`, `disable`, `uninstall`, `configure`, `validate`, `tag`, `marketplace add\|list\|update\|remove`. | Interactive | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `/reload-plugins [--force]` | Applies pending changes. | Refuses a change to MCP tools that breaks the prompt cache unless `--force`. | Both | - |

## Session Flags

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `--plugin-dir <path>` | Loads a directory or `.zip` for one session. | Id `<name>@inline`. Env `CLAUDE_CODE_PLUGIN_DIRS` does the same. | CLI | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | `--plugin-url <url>` | Loads a `.zip` from a URL. | Repeatable. | CLI | [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |

Both flags are rejected when managed `disableSideloadFlags` is true.

## See Also

- [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) is the docs page.
- [CLI](Claude-Code-CLI) lists the other subcommands.
