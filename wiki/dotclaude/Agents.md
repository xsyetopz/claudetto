# Agents

This page describes the six agents of the core plugin.
It says what the agent files set, and which tests pin each setting.
It is for a contributor who edits an agent file or a test of the agents.

dotclaude ships six agents in the core plugin.
Each agent is one Markdown file in `src/plugins/dotclaude/slices/agents/agents/`.
The build copies each file to `plugins/dotclaude/agents/`.
The copy is generated.

Claude Code starts a subagent from the main session.
It reads the front matter of each file.
For how Claude Code runs a subagent, see [Subagents](Subagents).
This page covers only what the dotclaude files set.

## Roster

| Agent | Model | Effort | `maxTurns` | Delegate it for |
| --- | --- | --- | --- | --- |
| `investigator` | `claude-haiku-5-5` | `medium` | 31 | Read-only answers from many files, logs, git history, or dependency data. |
| `implementer` | `claude-sonnet-5-5` | `medium` | 61 | One scoped slice with a known check. |
| `debugger` | `claude-sonnet-5-5` | `high` | 61 | A failure with an unknown cause, or a fix that failed. |
| `planner` | `claude-opus-5-5` | `high` | 41 | A plan across several files, before any edit. |
| `researcher` | `claude-sonnet-5-5` | `medium` | 41 | A claim that must match current web, vendor, or official docs. |
| `reviewer` | `claude-opus-5-5` | `high` | 41 | A read-only review of code, security, an API design, or a plan. |

The model and the effort are the values of each file.
The main session keeps the model and the effort that the user set.
[Decisions-Router](Decisions-Router) explains this in D13.

## Agents in Detail

The tool lists come from the front matter of each file.
A file with no `tools` line gets the tools of the session.
Its `disallowedTools` line removes some of them.

- `investigator` answers a question from several sources, and it changes nothing.
  Its brief gives a lens: `ci`, `history`, or `dependencies`.
  It may not use `Edit`, `Write`, `NotebookEdit`, `Agent`, `WebFetch`, or `WebSearch`.
- `implementer` carries out one slice that has a known check.
  It does not plan.
  It may use every tool except `Agent`.
- `debugger` finds the root cause of a failure or a regression, and it makes the smallest fix.
  It may also measure and speed up a slow path.
  It may use every tool except `Agent`.
- `planner` writes a plan under `.dotclaude/spec/`, and it does not edit the code that the plan changes.
  Its tools are `Read`, `Grep`, `Glob`, `Bash`, `Write`, and `Edit`.
  It may not use `NotebookEdit` or `Agent`.
  The folder limit is a rule in the body of the file.
  The tool list does not enforce it (inference from the front matter).
- `researcher` answers from web pages and official docs, with exact quotes and sources.
  Its tools are `Bash`, `Read`, `Grep`, `Glob`, `WebFetch`, and `WebSearch`.
  It may not use `Edit`, `Write`, `NotebookEdit`, or `Agent`.
- `reviewer` reviews a change, a plan, an API design, or a trust boundary.
  Its tools are `Read`, `Grep`, `Glob`, and `Bash`.
  It may not use `Edit`, `Write`, `NotebookEdit`, or `Agent`.

No agent has the `Agent` tool, so no agent starts another agent.
The roster test checks this for each file.

The web tools reach `researcher`.
The file of `debugger` and of `implementer` has no `tools` line.
So they inherit the web tools too (inference from the front matter).

## Turn Bounds

The bound of each agent is `MAX_TURNS` in `src/plugins/dotclaude/slices/agents/limits.ts`.
That file is the source.
The other copies are these:

- The `maxTurns` of each agent file.
  The roster test checks each file against `turnBound` in `slices/agents/domain/turns.ts`.
- `AGENT_MAX_TURNS` in `src/plugins/dotclaude/slices/handoff/limits.ts`.
  The handoff slice reads it to tell a subagent to report.
  Its test checks that the table has the same agents as the roster.

Claude Code reads `maxTurns` from the front matter.
Claude Code 2.1.296 rejects a value that is not a positive integer.
A search of the extracted strings of the 2.1.296 bundle found this fact.
The search looked for the text of the validation message.

### What Happens at the Limit

The bundle of 2.1.296 has the text for a subagent that stops at its turn limit.
When the subagent still calls tools and has produced no report, the parent receives its output as partial output.
The output is marked as incomplete.
The trigger is inferred from the text.
The search did not run a live subagent.

### The Report-Now Note

The `tool.call` hook of the handoff slice adds a note when four turns remain.
The bound `TURNS_LEFT_AT` is in `slices/handoff/limits.ts`.
The note tells the subagent to commit its work and to report.
The comment of `TURNS_LEFT_AT` counts two turns for the commit, one turn for the report, and one spare turn (inference from the comment).

## Description and Body Rules

- A description has 300 characters or fewer.
  `AGENT_DESCRIPTION_MAX_CHARS` in `tools/limits.ts` holds the bound.
  The roster test checks it.
- A description says what the agent does and when to delegate to it.
- A report has at most `REPORT_MAX_WORDS` words, which is 400 in `slices/handoff/limits.ts`.
  Each body gets the bound from the `report-size` fragment.
- Each body gets the search rule from the `search-route` fragment.
  The rule says to search with `Grep`, and then to read the matched range with `Read`.
- `debugger` and `implementer` fix the code, or they report the failure with its evidence.
  They do not raise a bound, skip a test, or edit a check, unless the brief says that the user asked.
- `debugger` does not change a test.
  When it thinks that a test is wrong, it reports that.
  The parent decides.

## Subagent Git Rule

The rule `git.shared-checkout` in `src/kernel/policy/rules/git.ts` has the tier `subagent`.
It denies a git action in a subagent that changes the shared checkout of the main session or the shared `refs/stash`.
The text of the rule gives `git checkout`, `git switch`, `git reset`, and `git stash` as examples.
See [Guards](Guards) for the other rules.

## Surface

The `agent.offer` handler in `slices/surface/adapters/mod.ts` omits two built-in agent types from the listing.
They are `claude-code-guide` and `statusline-setup`.
The list is `DROPPED_AGENTS` in `slices/surface/domain/agents.ts`.
dotclaude uses neither type.

## Pins

The tests of the agents pin these facts:

- The six agent files are the six names of the table, and no other file.
- Each file has the model and the effort of the table.
- Each `maxTurns` equals `turnBound`.
- `investigator`, `researcher`, and `reviewer` may not write or edit.
  `debugger`, `implementer`, and `planner` may write and edit.
- No agent may use `Agent`.
- `researcher` may use the web, and `investigator` may not.
- Each bound is a whole number of at least one.
  `withinTurnBound` allows the counts from one to the bound.
- Each description is within `AGENT_DESCRIPTION_MAX_CHARS`.

The tests are in `tests/dotclaude/agents/` and `tests/dotclaude/handoff/context.test.ts`.

## Related Pages

- [Context and Handoff](Context-And-Handoff): the bounds on the context, which use the same turn limits.
- [Subagents](Subagents): how Claude Code runs a subagent.
- [Decisions: Router and Agents](Decisions-Router#d25-agent-roster): the choice of the agent roster.
- [Decisions](Decisions): the other choices of the project.
- [Core Plugin](Architecture): the layout of the core plugin.
- [Guards](Guards): the checks that apply to the agents.
