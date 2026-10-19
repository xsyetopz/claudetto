# Claude Code Undocumented Settings

Some keys of `settings.json` work in Claude Code `2.1.303` but the official docs do not list them.
Of its 27 rows, 25 are found only in the program, and 2 differ from the docs.
Anthropic can change or remove each item in any release.

## Found Only in the Program

25 items are in the program but not in the official docs.
These are the most useful ones.

- `todoFeatureEnabled`: Turn the todo and task tracking panel on or off. See [Settings Core](Claude-Code-Settings-Core).
- `disablePluginDirectory`: Let an administrator turn the plugin directory off. See [Settings Extra Keys](Claude-Code-Settings-Extra-Keys).
- `totalTokensReminder`: Add a "tokens left" reminder to the system prompt and after each tool result. See [Settings Model](Claude-Code-Settings-Model).
- `breakReminder`: Show a dismissible nudge after long continuous use. See [Settings UI](Claude-Code-Settings-UI).
- `quietHours`: Show one soft nudge per session during a local-time window you set. See [Settings UI](Claude-Code-Settings-UI).
- `totalTokensReminderBudget`: Set the starting token budget of `padded-countdown`. See [Settings Model](Claude-Code-Settings-Model).
- `autoDreamEnabled`: Turn background memory consolidation (auto-dream) on or off. See [Settings Core](Claude-Code-Settings-Core).
- `modelProposedGoals`: Control whether the model may propose session goals. See [Settings Agents and Remote](Claude-Code-Settings-Agents-And-Remote).
- `remoteControl`: Set options for `claude remote-control`. See [Settings Agents and Remote](Claude-Code-Settings-Agents-And-Remote).
- `xaaIdp`: Set the XAA (SEP-990) identity provider once, and every XAA-enabled MCP server reuses it. See [Settings Auth](Claude-Code-Settings-Auth).

## Where the Docs Differ

2 items work in a different way from what the docs say.
This is the whole list.

- `appendPlugins`: List managed plugins whose hooks run last, in the listed order. See [Settings Hooks and Plugins](Claude-Code-Settings-Hooks-And-Plugins).
- `prependPlugins`: List managed plugins whose hooks run first, in the listed order. See [Settings Hooks and Plugins](Claude-Code-Settings-Hooks-And-Plugins).

## Full Lists

Each page below has the full rows, with the value and the effect.

| Page | Rows |
| --- | --- |
| [Settings](Claude-Code-Settings) | 1 |
| [Settings Agents and Remote](Claude-Code-Settings-Agents-And-Remote) | 7 |
| [Settings Auth](Claude-Code-Settings-Auth) | 1 |
| [Settings Core](Claude-Code-Settings-Core) | 3 |
| [Settings Enterprise](Claude-Code-Settings-Enterprise) | 1 |
| [Settings Extra Keys](Claude-Code-Settings-Extra-Keys) | 6 |
| [Settings Hooks and Plugins](Claude-Code-Settings-Hooks-And-Plugins) | 2 |
| [Settings Model](Claude-Code-Settings-Model) | 3 |
| [Settings UI](Claude-Code-Settings-UI) | 3 |

## See Also

- [Undocumented](Claude-Code-Undocumented)
- [Claude Code](Claude-Code)
- [Probes](Claude-Code-Probes)
