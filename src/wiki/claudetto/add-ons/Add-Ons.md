# Add-On Plugins

An add-on is an optional plugin of `claudetto`.
There are five, and you install only the ones you want.
Each add-on works without the core plugin.

## The Add-Ons

The marketplace lists the core plugin and the five add-ons in `.claude-plugin/marketplace.json`.
Add the marketplace first with `/plugin marketplace add xsyetopz/claudetto`.
See [Install](Install) for details.

| Plugin | What it adds | Needs | Page |
| --- | --- | --- | --- |
| `claudetto-codegraph` | The skill `codegraph` and the command `claudetto-codegraph-check`. Claude reads the code graph of a project with the `codegraph` CLI. | The `codegraph` CLI and a project index. | [Code Graph](Code-Graph) |
| `claudetto-browser` | The skill `browse`, which drives a browser with `agent-browser`. With the `cloakbrowser` backend, a CloakBrowser search answers `WebSearch`. | `agent-browser`. The `cloakbrowser` backend also needs a CloakBrowser build. | [Browser](Browser) |
| `claudetto-docs` | The skill `docs`, which gets the current docs of a library from Context7 with the `ctx7` CLI. | Bun on `PATH`, for `bunx`. No key. | [Library Docs](Library-Docs) |
| `claudetto-sessions` | The skill `sessions` with the scripts `audit` and `replay`. | Bun. | [Sessions](Sessions) |
| `claudetto-lab` | Tools for plugin authors: a sandbox, a request capture, a settings schema writer, and an eval compare. | Bun 1.4.3 or later, and `claude` on `PATH`. | [Lab](Lab) |

Install each add-on with `/plugin install <plugin>@claudetto`.
For example, run `/plugin install claudetto-docs@claudetto`.

## Install One Add-On

1. Add the marketplace, if you have not done so.
2. Run the install command for the add-on.
3. Install the tools in the needs column.
   The plugin never installs an outside tool for you, except where its page says so.
4. Start a new session so that Claude Code loads the plugin.

## Hooks

An add-on is an optional plugin of `claudetto`.
There are five, and you install only the ones you want.
Each add-on works without the core plugin.

## See Also

- [Install](Install)
- [Code Graph](Code-Graph)
- [Settings Snippet](Settings-Snippet)
