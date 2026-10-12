# dotclaude

dotclaude is a Claude Code plugin for software engineering on official extension points.
It turns compaction off, sets a 300K context window, asks only before dangerous commands,
replaces the coding part of the system prompt with a short output style,
and keeps the state of long work in the spec store, `.dotclaude/spec/`, across `/clear`.
It optimizes for the most quality per unit of usage quota, not for speed.

[The wiki](https://github.com/xsyetopz/dotclaude/wiki) tells what each part does and why.
[Core plugin](https://github.com/xsyetopz/dotclaude/wiki/Core-Plugin) lists each part of the core plugin with its file and bound,
and the [overview](https://github.com/xsyetopz/dotclaude/wiki/Home) links the page of each plugin.
[Design](https://github.com/xsyetopz/dotclaude/wiki/Design) gives the source of each design claim.

## Install

```text
/plugin marketplace add xsyetopz/dotclaude
/plugin install dotclaude@dotclaude
```

Requirements: Claude Code 2.1.296, [Node.js](https://nodejs.org) 22.18 or later on `PATH`, and git.
The hooks module uses the mods API of Claude Code, which can change between releases,
so this release is tested only on 2.1.296.

## Setup

A plugin settings file can set only `agent` and `subagentStatusLine`,
so dotclaude gives the other keys as a plain [settings snippet](https://github.com/xsyetopz/dotclaude/wiki/Settings-Snippet).
Copy the keys that you want into your own `settings.json`, and restart Claude Code.
The `/dotclaude:setup` skill changes no Claude Code setting, and it shows each step before it runs.

## Parts

| Part | What it does |
| --- | --- |
| No compaction | `autoCompactEnabled: false` and `DISABLE_COMPACT=1`, which also turns off `/compact`. |
| Window | `CLAUDE_CODE_MAX_CONTEXT_TOKENS=300000` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW=300000`. At the limit the session stops, and you run `/clear`. |
| No auto memory | `autoMemoryEnabled: false`. The spec store holds the state. |
| System prompt | `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1` and the forced `dotclaude` output style, which replaces the built-in coding instructions. |
| Permissions | Normal work passes. `sudo`-like work asks (`soft_deny`). Destructive actions on a database, the system, git, cloud resources, or backups are forbidden always (`hard_deny`), and the `guard` hook denies the literal forms. Deny secret reads. The `asks` hook asks only when a change weakens a check. |
| Sandbox | Bash runs in the sandbox, with network access only to GitHub and the package registries. |
| Guard | One hooks module asks before the first call to a GitHub repository of another owner with an AI policy. |
| Status line | Model, effort, context against the window (yellow at 75%, red at 90%), the 5-hour limit, and the last spec change that is not finished, with its done and total packages. |
| Agents | `investigator`, `implementer`, `debugger`, `reviewer`, `planner`, `researcher`. |
| Checks | The CLI `dotclaude-run-checks` runs a batch of check commands with no model turn, in place of the `test-runner` agent. |
| Skills | `/dotclaude:setup`. |

The plugin has no options.
To drop a part, leave its key out of your `settings.json`.

## Models and effort

| Model | Roles | Effort |
| --- | --- | --- |
| Opus 5.5 | main session, `planner`, `reviewer` | the default of the model, `high` for the two agents |
| Sonnet 5.5 | `researcher`, `implementer`, `debugger` | `medium`, `debugger` `high` |
| Haiku 5.5 | `investigator` | `medium` |

The settings snippet sets no effort level, so each model keeps its default.
`maxEffortLevel` is `max`, so `/effort` can go up to `max` for a hard check.

## Long work without compaction

Each turn reads the whole context again, so the size of the context sets the cost of a turn.

- For work of more than one session, start a spec change with the `spec` skill and `dotclaude-spec new <id>`.
  After `/clear`, `dotclaude-spec next <id>` prints the brief of the next package.
- Before `/clear`, mark the finished tasks in `change.md` and put the reason and the decisions there too.
  At 80% of the window, a note tells Claude to do this and to name the command that continues the work.
- Change the model only right after `/clear`,
  because a new model starts a new prompt cache.
  An effort change keeps the cache.

See [Context bound](https://github.com/xsyetopz/dotclaude/wiki/Context-Bound)
and [Spec store](https://github.com/xsyetopz/dotclaude/wiki/OpenSpec).

## Add-on plugins

Each add-on works without the core plugin.

```text
/plugin install dotclaude-codegraph@dotclaude
/plugin install dotclaude-jev@dotclaude
/plugin install dotclaude-browser@dotclaude
/plugin install dotclaude-docs@dotclaude
```

- `dotclaude-codegraph` gives Claude the code graph of a project from the CodeGraph CLI `codegraph`.
  It needs `codegraph` on `PATH` and a project index from `codegraph init -y`.
  In an indexed project, it syncs the index and adds one line about the graph at session start,
  and adds no MCP server.
  See [Code graph](https://github.com/xsyetopz/dotclaude/wiki/Code-Graph).
- `dotclaude-jev` has the `second_opinion` tool,
  which asks [TypeSafe Jev](https://docs.typesafe.ai/introduction) for probabilities on a decision.
  Export `TYPESAFE_API_KEY` before Claude Code starts.
  Each call sends the data of the decision to the TypeSafe API.
  With no key, the tool sends Claude to the `reviewer` agent.
- `dotclaude-browser` has the `drive-web-browser` skill.
  It uses `agent-browser`, and its `backend` option selects CloakBrowser for sites with bot detection.
  It also answers each `WebSearch` call with a search in the headless browser.
- `dotclaude-docs` has the `docs` skill,
  which gets current library docs with the Context7 CLI `ctx7` and works with no key.

## Update

```bash
claude plugin marketplace update dotclaude
claude plugin update dotclaude@dotclaude
```

1. Restart Claude Code, because a running session keeps the old hooks and agents.
2. Read the new entry in [`CHANGELOG.md`](CHANGELOG.md).
   Before 1.0, a release can change or remove behavior without a compatibility layer.
3. Compare your `settings.json` with the [settings snippet](https://github.com/xsyetopz/dotclaude/wiki/Settings-Snippet).
   The drift check at session start reports some differences.

0.27.0 is a rebuild that removes most 0.26 parts, and 0.28.0 removes the setup profile, the router, and the handoff skill.
See their changelog entries for the list.
To try an unreleased checkout, run `claude --plugin-dir /path/to/dotclaude/plugins/dotclaude`.

## Development

`just check` runs lint, tests, plugin validation, and the hook lab.
`just sandbox` runs Claude Code with this checkout in a separate config.
See [Development](https://github.com/xsyetopz/dotclaude/wiki/Development)
and [Sandbox](https://github.com/xsyetopz/dotclaude/wiki/Sandbox).

## License

[MIT](LICENSE).
