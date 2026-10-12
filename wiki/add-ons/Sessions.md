# Sessions

The plugin `dotclaude-sessions` measures Claude Code sessions from their transcripts.
It has two slices.
The slice `start-cost` reports what a session sends at its start, by source (`dotclaude-start`).
The slice `usage` reports where usage went over a period (`dotclaude-usage`).
Each slice gives one skill and one typed command, and each command runs its CLI with no model turn.
The plugin works without the core plugin, and it imports nothing from another plugin.

The source is in `src/plugins/dotclaude-sessions/`.
The tests are in `tests/sessions/`.

## Install

Install the plugin with `/plugin install dotclaude-sessions@dotclaude`.

The CLIs read the transcripts under `~/.claude/projects`, or under `$CLAUDE_CONFIG_DIR/projects` when that variable is set (`main` in `slices/usage/adapters/cli.ts`).
The `usage` CLI takes `--root DIR` for another folder.

## The start-cost slice

The command `dotclaude-start` prints, for one session, the tokens of the first request and the characters of each source.
Its sources are the built-in set, each plugin by the name prefix of its skills, agents, and tools, each MCP server, `CLAUDE.md` and memory, the output style, and the system prompt (`SOURCE` and the comment in `slices/start-cost/domain/sources.ts`).
It also prints the size of each tool, system block, and attachment, and the requests and context of each subagent.

```text
dotclaude-start [SESSION.jsonl] [--bound N] [--text-min N] [--text-max N]
dotclaude-start --compare BASE.jsonl OTHER.jsonl
```

- With no file, the command reads the newest main transcript of the current folder.
- `--compare` prints the difference of two starts by source.
  Use it to measure a plugin, with one start with the plugin and one without it.
- The command exits with 1 when the first request is above `--bound N` tokens, or when its text is above `--text-max N` bytes.
  It advises when the text is below `--text-min N` bytes.
  With no bound, it never fails on size.

The transcript has no request body.
So the sizes are the characters of the records, and they are an estimate (the comment in `slices/start-cost/domain/sources.ts`).

The skill `start-cost` allows `Bash(dotclaude-start *)`.
The command `/start-cost` runs the CLI in the handler `onStartCost` (`slices/start-cost/adapters/mod.ts`).
Arguments that need a shell go to the skill, which is a model call.

## The usage slice

The command `dotclaude-usage` reports the usage of a period from the transcripts.
It covers these parts (the header of `slices/usage/adapters/cli.ts`).

- The share of each agent type, and of the main session.
- The model calls of each run, and the context that each call reads again.
- The cost of cache rewrites.
- The turns that background agents started from the main conversation.
- The prompt cache hit rate, which is the cache reads over all input tokens.
- The main sessions by Claude Code entrypoint, and the usage-limit hits.
- The `Skill` tool calls by skill, and the skills that the period did not call.
- The tool results that enter the main context of each session.

```text
dotclaude-usage [--days 7] [--root DIR] [--runs 20] [--window N] [--agents-dir DIR] [--json]
```

| Option | Meaning |
| --- | --- |
| `--days N` | The period, in days back from now. Default 7. |
| `--root DIR` | The transcripts folder. |
| `--runs N` | Rows in the run tables. Default 20. |
| `--window N` | The context window in tokens. |
| `--agents-dir DIR` | Reads `maxTurns` from `DIR/<agent>.md`, to compare the briefs of runs that hit the turn limit. |
| `--json` | Prints the report as JSON. |

The skill `usage` allows `Bash(dotclaude-usage *)`.
The command `/usage` runs the CLI in the handler `onUsage` (`slices/usage/adapters/mod.ts`).

Costs are API-equivalent dollars at list prices.
A subscription does not bill them, but its limits follow the same token mix, so the shares show what spends a plan's limits (the header of `slices/usage/adapters/cli.ts`).
The price table is `PRICES` in `slices/usage/domain/parse.ts`, with the families `fable`, `opus`, `sonnet`, and `haiku`.
The report does not check the table against a price list.

A cache rewrite is a call with a cache write over 30,000 tokens that is larger than its cache read (`rewrite` in `slices/usage/domain/parse.ts`).
A full rewrite is expected on the first call of a transcript, on the first call after a compaction, and after a model switch.
The report counts those apart from the rewrites that nothing explains (the header of `slices/usage/adapters/cli.ts`).

The context window is 1,000,000 tokens when the model name has `[1m]` or `-1m`, and 200,000 tokens otherwise (`windowOf` in `slices/usage/domain/parse.ts`).
The `--window` option overrides it.

## Bounds

The plugin has no `limits.ts` file.
The bounds below are in the code of each file that holds them.

| Bound | Value | File | Use |
| --- | --- | --- | --- |
| Command time limit | 120,000 ms | `slices/start-cost/adapters/mod.ts` | The run of `dotclaude-start` by `/start-cost` |
| Command time limit | 120,000 ms | `slices/usage/adapters/mod.ts` | The run of `dotclaude-usage` by `/usage` |
| Period | 7 days | `slices/usage/adapters/cli.ts` | Default of `--days` |
| Run rows | 20 | `slices/usage/adapters/cli.ts` | Default of `--runs` |
| Context window | 200,000 tokens | `slices/usage/domain/parse.ts` | Default window |
| Context window | 1,000,000 tokens | `slices/usage/domain/parse.ts` | Window of a model name with `[1m]` or `-1m` |
| Rewrite size | 30,000 tokens | `slices/usage/domain/parse.ts` | A cache write above it can be a rewrite |
| Turn reserve | `max(3, round(limit / 20))` turns | `slices/usage/domain/turns.ts` | Turns before `maxTurns` at which an agent must report |

## Why

- The reports state measurements.
  They do not state the cause of a limit (the header of `slices/usage/adapters/cli.ts`).
  See D27 in [Decisions-Evidence](Decisions-Evidence).
- The costs use list prices, because the plan limits follow the same token mix (the header of `slices/usage/adapters/cli.ts`).
- The start sizes are estimates, because the transcript has no request body.
- Each add-on stays a separate plugin.
  See D24 in [Decisions-Layout](Decisions-Layout).

## Troubleshooting

To read a longer period, pass `--days N` to `dotclaude-usage`.
To read another transcripts folder, pass `--root DIR`.
To measure one session, pass the path of its `.jsonl` file to `dotclaude-start`.

See also [Troubleshooting](Troubleshooting).
