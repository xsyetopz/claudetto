# Claudetto

Plugins that tune Claude Code for coding at the lowest token cost. They use only Claude Code's official extension points (settings, hooks, skills, agents, and an output style) and patch nothing.

## Plugins

- **claudetto** gates risky commands, scans every tool result for secrets, keeps test output short, hands a long session over to a fresh one, cleans up what a session leaves behind, and checks each final reply before it ends the turn.
- **claudetto-you-should-know** shows a short note above the prompt when a side check finds something about the work you likely missed. It is off by default. Once on, it sends one small request before each action that can change something, and a note stops that action until you answer. It sends no telemetry.
- **claudetto-openspec** runs the OpenSpec workflow through one deferred `openspec` tool and skills for propose, explore, apply, update, verify, and archive. It runs no `openspec` binary and makes no network calls.

## Install

In Claude Code:

```text
/plugin marketplace add xsyetopz/claudetto
/plugin install claudetto@claudetto
```

Install `claudetto-you-should-know@claudetto` or `claudetto-openspec@claudetto` the same way.

## Setup

claudetto needs `betterleaks` and `mole`, and a `/claudetto:setup` run in each project: see [plugins/claudetto/README.md](plugins/claudetto/README.md).

## Options

Each plugin's options are its `userConfig` fields, set in `/plugin` → the plugin → Configure. The field descriptions in each `plugins/*/.claude-plugin/plugin.json` say what each one does and its default. To turn on `claudetto-you-should-know`, set `sideCheckEnabled` to `true`.

## License

See [LICENSE](LICENSE).
