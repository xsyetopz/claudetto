# Add-On Plugins

An add-on is an optional plugin of `claudetto`.
There is one, `claudetto-browser`, and you install it only if you want it.
The add-on works without the core plugin.

## The Add-Ons

The marketplace lists the core plugin and the add-on in `.claude-plugin/marketplace.json`.
Add the marketplace first with `/plugin marketplace add xsyetopz/claudetto`.
See [Install](Install) for details.

| Plugin | What it adds | Needs | Page |
| --- | --- | --- | --- |
| `claudetto-browser` | The skill `browse`, which drives a browser with `agent-browser`. | `agent-browser`. | [Browser](Browser) |

Install each add-on with `/plugin install <plugin>@claudetto`.
For example, run `/plugin install claudetto-browser@claudetto`.
The skill `find-docs` is in the core plugin, so it is not an add-on ([Library Docs](Library-Docs)).

## Install One Add-On

1. Add the marketplace, if you have not done so.
2. Run the install command for the add-on.
3. Install the tools in the needs column.
   The plugin never installs an outside tool for you, except where its page says so.
4. Start a new session so that Claude Code loads the plugin.

## Related Pages

- [Install](Install)
- [Settings Snippet](Settings-Snippet)
