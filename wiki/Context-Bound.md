# Context bound

Compaction is off in the dotclaude profile, so a session that reaches its limit stops and loses its state.
This page says how dotclaude bounds the context of each subagent and of the main session.
The decision is D22 in [Decisions](Decisions-Tools).
The measures are in [Usage evidence](Usage-Evidence).

## Why

- Investigator runs, and not the start of a session, used most of the quota in the measured sessions.
  Each run paged files into its context and ended at 110K to 223K tokens (**measured**, `research/subagent-usage.md`).
- The main session grows too.
  In four main sessions, 48 of 86 file reads (56%) read a file again, and almost all were slices through `Bash` (**measured**, `research/session-growth.md`).
- A bound in prose did not hold.
  The output style already told the model to read only the part of a file that it needs.

## Bounds

All bounds are in `plugins/dotclaude/features/context/limits.mjs`, because only the context feature reads them.
Tests pin each copy of a bound in code and config.

| Bound | Value | Use |
| --- | --- | --- |
| `SUBAGENT_CONTEXT_MAX` | 100,000 tokens | A subagent gets the report-now message from this context. |
| `HAIKU_CONTEXT_MAX` | 85,000 tokens | The same for a Haiku 5.5 subagent. |
| `REPORT_MAX_WORDS` | 400 | The most words in the final report of an agent. |
| `RESULT_MAX_CHARS` | 8,000 | The most characters of one tool result in a run that reads a large file. |

Haiku 5.5 costs 5 times as much for each request above 100K prompt tokens.
`HAIKU_CONTEXT_MAX` leaves room for the report turn below that step.

## File reads through `Read`

- Each agent that reads files tells the model to search first.
  The output style of 0.28.0 has no read rule, because the `reads` hook below holds it.
  The model then reads only the matched range with `Read`, and refers to an earlier result instead of a second read of the same lines.
- `Read` returns a short stub when the same file and the same `offset` and `limit` are read again and the file did not change.
  A `Bash` slice gets no stub.
- The `PreToolUse` hook `features/reads/cli.mjs` denies a `Bash` command that only prints a file.
  This covers `cat`, `sed -n` with a print range, `head`, and `tail` on one file, with no pipe and no other command.
  The deny reason gives the `Read` call with the same file and range.
  For example, `sed -n '40,80p' design.md` gets `Read` with `offset` 40 and `limit` 41.
- The same hook denies a `Bash` command whose output has no limit, such as `cat F | grep x`, `jq . F`, `git log`, `find .`, and `rg x`.
  The rule is in `features/reads/bounds.mjs`, and the hook runs on each `Bash` call.
  The deny reason gives the bounded form of the command: `Read` with `offset` and `limit`, `grep -m N`, `| head -n N`, `git log -n N`, or `--stat`.
- A command stays allowed when its output goes to a file, when its pipe ends in `head`, `tail`, or `wc`, or when it has a count, list, or line-range option.
  For example, `grep -n D22 design.md | head -5`, `git log --oneline -n 20`, and `rg -l foo` run.
  A command that is not a read, such as `bun test 2>&1 | grep pass`, also runs.
  A `jq` filter that gives one value, counts, or takes a slice (`jq .version F`, `jq length F`, `jq '.[0:5]' F`) runs.
  A group or a loop that ends in a bound, such as `for f in *; do cat $f; done | head -n 20`, runs.
- A deny here costs little, because the next call does the same read with a limit and no work is lost.
  In the main sessions of 2026-10-09, the rule fires on 59 of 250 `Bash` commands, 41 of them a `grep` with no limit.
- The profile sets `bashOutputMaxChars` to 4000, the lowest value.
  Claude Code saves a longer output to a file and sends a preview and the path.

## Subagent report at the bound

A classic `PostToolUse` hook (`features/context/cli.mjs`) reads the transcript of the subagent.
When the context passes the bound of its model, the hook gives `additionalContext` that tells the subagent to report now.

- The hook tells and does not block, because a block loses the work of the run.
- Below the bound, and in the main session, the hook prints nothing.
- Each agent body names `REPORT_MAX_WORDS`, because the main session keeps each report to the end.
- A run at `maxTurns` returns no report, so each `maxTurns` holds one spare turn ([Agents](Agents)).
- The hook counts the turns of the subagent in its transcript and reads `maxTurns` from the agent file.
  With `TURNS_LEFT_AT` (2) turns left, it gives one note that tells the subagent to report now, joined with the context note when both apply.
- A resume after the limit starts a new count.
  The delegation text therefore tells the coordinator to take the report of a stopped run and not to resume it.

## Context figure from the measure

- The main session gets its context figure only at a level, in one note for each level.
  The levels and the handoff are on the page [Usage awareness](Usage-Awareness).
- The status line may show the figure to the user, but the model does not read it, so the hook is the route to the model.
- No prompt text tells the model to estimate or announce its context share.
  A model can report a false state, so the figure comes from a program (D27 in [Decisions](Decisions-Evidence)).
  A test reads the output style, the prompt variants, and the agent bodies for this.

## Usage report

`just measure` reports the context of a session from its transcripts:

- For each subagent: the requests, the final context, and the total input tokens.
- For the main session: the tool-result size for each tool, and the count of repeat reads of the same file.

See [Usage evidence](Usage-Evidence#usage-report).

## Related pages

- [Agents](Agents)
- [Usage evidence](Usage-Evidence)
- [Prompt surface](Prompt-Surface)
