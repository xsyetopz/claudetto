# Sessions: `dotclaude-sessions`

The plugin `dotclaude-sessions` measures usage from the session transcripts on your machine.
It has two bins and two skills.
It registers no hook, adds no tool, and changes no file.
It works without the core plugin.
The figures are measurements.
The plugin does not state the cause of a usage limit, because no source gives one.

## At a glance

| Item | Value |
| --- | --- |
| Install | `/plugin install dotclaude-sessions@dotclaude`, with Bun 1.4.3 or later |
| Skills | `start-cost` and `usage`, in `skills/` |
| Bins | `dotclaude-start` and `dotclaude-usage`, in `bin/` |
| Hooks | None |
| Options | None. The bins take flags |
| Limits | None in code. Costs are API-equivalent list prices |
| Problems | See [Troubleshooting](#troubleshooting) |

## Install

```text
/plugin install dotclaude-sessions@dotclaude
```

Claude Code adds the `bin/` folder of an installed plugin to `PATH`, so the two commands run from a session.
Outside a session, run `bun <plugin folder>/bin/dotclaude-usage`.
`<plugin folder>` is the `installPath` of `dotclaude-sessions@dotclaude` in `~/.claude/plugins/installed_plugins.json`.

## `dotclaude-start`

It prints what a session sent at its start, from one transcript.
With no file, it reads the newest main transcript of the current folder.

| Flag | Use |
| --- | --- |
| `--compare BASE.jsonl OTHER.jsonl` | Prints the difference of two starts by source. Each row is the other start minus the base. |
| `--bound N` | Exits 1 when the first request is above `N` tokens. |
| `--text-max N` | Exits 1 when the first request text is above `N` bytes. |
| `--text-min N` | Prints an advisory when the first request text is below `N` bytes. It does not exit 1. |

The output has the tokens of the first request and the characters of each source: the built-in set, each plugin, each MCP server, `CLAUDE.md` and memory, the output style, and the system prompt.
It also lists the size of each tool, system block, and attachment, the runs of each subagent, and the repeat file reads.
The sizes by source are characters of the records and not tokens.
Only the line `First request` gives tokens.

## `dotclaude-usage`

It prints where usage went in a period, from the transcripts under `~/.claude/projects` (or `$CLAUDE_CONFIG_DIR/projects`).

| Flag | Default | Use |
| --- | --- | --- |
| `--days N` | 7 | The period in days back from now. |
| `--root DIR` | `projects` under the config dir | The folder of the transcripts. |
| `--runs N` | 20 | The rows in the run tables. |
| `--window N` | From the model name | The context window in tokens. |
| `--agents-dir DIR` | None | Reads `maxTurns` from `DIR/<agent>.md` to compare the briefs of runs that hit the turn limit. |
| `--json` | Off | Prints the report as JSON. |

The report lists the model calls of each run, the context that each call reads again, the cost shares, the cache hit rate, the delegation share, usage-limit hits, and the skills that the period did not use.
The cost is in API-equivalent dollars at list prices.
The header of the report says `API-equivalent at list prices, not a subscription bill`.
A subscription does not bill them, but its limits follow the same token mix.
See [Usage evidence](Usage-Evidence) for the measured week and what it means.

## Skills

| Skill | Use it to |
| --- | --- |
| `start-cost` | Show where the start of a session spends context, or compare a start with a plugin and a start without it. Both skills tell Claude to copy each figure and not to compute or round one. |
| `usage` | Show where usage went in a period, and which skills the period did not use. |

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `No request with usage` | The transcript has no model call yet. Run the bin after the first answer. |
| The list of unused skills comes from the installed plugins | The transcripts list no skills, and the output names its source. |

See also [Troubleshooting](Troubleshooting).

## Related pages

- [Usage evidence](Usage-Evidence)
- [Context bound](Context-Bound)
- [Hooks](Hooks)
