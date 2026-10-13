# Add-On Plugins

This page lists the five add-on plugins of dotclaude.
It shows what each add-on adds, what it needs, and how to install it.
Read it if you want an optional feature that the core plugin does not include.

Each add-on is a separate plugin.
You install and remove each add-on by itself.
Each add-on works without the core plugin.
An add-on imports nothing from another plugin.
See D24 in [Decisions-Layout](Decisions-Layout).

## The Add-Ons

The marketplace lists the five add-ons in `.claude-plugin/marketplace.json`.
Add the marketplace first with `/plugin marketplace add xsyetopz/dotclaude`.
See [Install](Install) for details.

| Plugin | What it adds | Install | Needs | Page |
| --- | --- | --- | --- | --- |
| `dotclaude-codegraph` | The code graph of a project, from the `codegraph` CLI. The graph syncs after edits and after `git` commands that change the tree. | `/plugin install dotclaude-codegraph@dotclaude` | Bun, the `codegraph` CLI (`npm i -g @colbymchenry/codegraph`), and a project index (`codegraph init -y`). | [Code Graph](Code-Graph) |
| `dotclaude-browser` | A browser that Claude drives with `agent-browser`. The `WebSearch` answers come from a headless browser. | `/plugin install dotclaude-browser@dotclaude` | Bun, `agent-browser` (`npm install -g agent-browser`). The `cloakbrowser` backend also needs the CloakBrowser binary. | [Browser](Browser) |
| `dotclaude-docs` | The current docs of a library, from Context7 through the `ctx7` CLI. | `/plugin install dotclaude-docs@dotclaude` | Bun on `PATH`, for `bunx`. No key is needed for the free quota. | [Library Docs](Library-Docs) |
| `dotclaude-sessions` | The cost of a session start by source, and the usage of a period by run. | `/plugin install dotclaude-sessions@dotclaude` | Bun. The CLIs read the transcripts under `~/.claude/projects`. | [Sessions](Sessions) |
| `dotclaude-lab` | Tools for plugin authors: a sandbox for Claude Code, a request capture, the JSON Schema of `settings.json`, and an eval compare. | `/plugin install dotclaude-lab@dotclaude` | Bun 1.4.3 or later, and the `claude` executable on `PATH`. The sandbox needs a login token. | [Lab](Lab) |

The commands of the add-ons run on Bun.
Bun must be on `PATH`.
The `codegraph` and `agent-browser` installs use npm.
Node.js must be on `PATH`.
See the table in [Install](Install).

## Install One Add-On

1. Add the marketplace, if you have not done so.
2. Run the install command for the add-on from the table.
3. Install the tools in the needs column.
   The plugin never installs an outside tool for you, except where its page says so.
4. Start a new session so that Claude Code loads the plugin.

## Related Pages

- [Install](Install): the install steps of the core plugin and the marketplace.
- [Code Graph](Code-Graph): the first add-on page.
