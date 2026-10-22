# Add-On Plugins

An add-on is an optional plugin of `claudetto`.
There are two, and you install only the ones you want.
Each add-on works without the core plugin.

## The Add-Ons

The marketplace lists the core plugin and the two add-ons in `.claude-plugin/marketplace.json`.
Add the marketplace first with `/plugin marketplace add xsyetopz/claudetto`.
See [Install](Install) for details.

| Plugin | What it adds | Needs | Page |
| --- | --- | --- | --- |
| `claudetto-browser` | The skill `browse`, which drives a browser with `agent-browser`. | `agent-browser`. | [Browser](Browser) |
| `claudetto-docs` | The skill `find-docs`, which gets the current docs of a library from Context7 with the `ctx7` CLI. | Bun on `PATH`, for `bunx`. No key. | [Library Docs](Library-Docs) |

Install each add-on with `/plugin install <plugin>@claudetto`.
For example, run `/plugin install claudetto-docs@claudetto`.

## Install One Add-On

1. Add the marketplace, if you have not done so.
2. Run the install command for the add-on.
3. Install the tools in the needs column.
   The plugin never installs an outside tool for you, except where its page says so.
4. Start a new session so that Claude Code loads the plugin.

## Related Pages

- [Install](Install)
- [Settings Snippet](Settings-Snippet)
