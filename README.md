# Claudetto

Plugins that tune Claude Code for coding at the lowest token cost. They use only Claude Code's official extension points (settings, hooks, skills, agents, and an output style) and patch nothing.

## Plugins

- **claudetto** gates risky commands, scans every tool result for secrets, writes Claude Code's own settings keys for output size, compaction, and subagent limits, cleans up what a session leaves behind, checks each final reply before it ends the turn, and adds an `advisor` tool and a read-only `Athena` agent on Fable. The next release deletes the handoff, the temp marker, the run logs, and the output files; [CHANGELOG.md](CHANGELOG.md) names what replaces each.
- **claudetto-you-should-know** shows a short note above the prompt when a side check finds something about the work you likely missed. It is off by default. Once on, it sends one small request before each action that can change something, and a note stops that action until you answer. It sends no telemetry.
- **claudetto-openspec** runs the OpenSpec workflow through one deferred `openspec` tool and skills for propose, explore, apply, update, verify, and archive. It runs no `openspec` binary and makes no network calls.

## Install

In Claude Code:

```text
/plugin marketplace add xsyetopz/bedrock
/plugin install claudetto@xsyetopz
```

Install `claudetto-you-should-know@xsyetopz` or `claudetto-openspec@xsyetopz` the same way. The `xsyetopz` marketplace lists every xsyetopz plugin.

## Setup

claudetto needs `betterleaks` and `mole`, and a `/claudetto:setup` run in each project: see [plugins/claudetto/README.md](plugins/claudetto/README.md).

## Options

Each plugin's options are its `userConfig` fields, set in `/plugin` → the plugin → Configure. The field descriptions in each `plugins/*/.claude-plugin/plugin.json` say what each one does and its default. To turn on `claudetto-you-should-know`, set `sideCheckEnabled` to `true`.

## TypeSafe Key

claudetto reads `TYPESAFE_API_KEY` from the environment of the shell that launched Claude Code, or from the `env` block of your Claude Code settings. It does not read a project `.env` file, so a key that sits only there is not seen.

With a key, claudetto sends two kinds of request to `api.typesafe.ai`, where Jev, TypeSafe's decision model, answers typed questions:

- **A delete of a branch the session did not make** sends your messages and the branch name.
- **A call of the `decide` tool** sends the question the agent wrote and each option's label and description, and nothing else from the session.

The first holds only what you wrote, never agent text or a tool result, and the secret scan redacts it before it leaves. When Jev fails or refuses the key, each question stays unsettled, and no other model answers it.

Without a key, no request reaches that host: `decide` is not registered, and the branch gate stays unsettled.

## Process Priority

Each `Bash` command runs at niceness 10, so your own apps win the CPU, and one core stays out of `cargo` and Go builds. A sandboxed command keeps niceness 0, because the Claude Code sandbox refuses `renice`.

## License

See [LICENSE](LICENSE).
