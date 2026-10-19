# Claude Code Undocumented Plugins

A plugin adds skills, hooks, and tools to Claude Code.
Some plugin files and keys are not in the official docs.
All 8 rows are found only in the program.
Anthropic can change or remove each item in any release.

## Found Only in the Program

8 items are in the program but not in the official docs.
These are the most useful ones.

- `plugins/cache/<marketplace>/<plugin>/<version>/`: One copy of each installed version. See [Plugins Loader](Claude-Code-Plugins-Loader).
- `plugins/installed_plugins.json`: Install records. See [Plugins Loader](Claude-Code-Plugins-Loader).
- `plugins/known_marketplaces.json`: Marketplace records. See [Plugins Loader](Claude-Code-Plugins-Loader).
- Registry files `installed`, `marketplaces`, `flagged`, `catalog`: Named files of the plugin registry. See [Plugins Loader](Claude-Code-Plugins-Loader).
- `experimental.syntaxHighlighting.hljsLanguages`: Extra highlight.js languages. See [Plugins Manifest](Claude-Code-Plugins-Manifest).
- `binaries`: Files fetched into `bin/` at install. See [Plugins Manifest](Claude-Code-Plugins-Manifest).
- `unsupported`: Placeholder source. See [Plugins Marketplace](Claude-Code-Plugins-Marketplace).

## Full Lists

Each page below has the full rows, with the value and the effect.

| Page | Rows |
| --- | --- |
| [Plugins Loader](Claude-Code-Plugins-Loader) | 5 |
| [Plugins Manifest](Claude-Code-Plugins-Manifest) | 2 |
| [Plugins Marketplace](Claude-Code-Plugins-Marketplace) | 1 |

## See Also

- [Undocumented](Claude-Code-Undocumented)
- [Claude Code](Claude-Code)
- [Probes](Claude-Code-Probes)
