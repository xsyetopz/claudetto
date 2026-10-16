# Agents

This page describes the six role agents of the core plugin `claudetto`.
It says what each agent file sets, which hooks bound the agents, and which tests and evals pin them.
It is for a contributor who edits an agent file or a test of the agents.

## The Roster

Each agent is one Markdown file in `src/plugins/claudetto/slices/agents/agents/`.
The build copies each file to `plugins/claudetto/agents/`.
The copy is generated, so edit only the source.

| Agent | Model | Effort | Tools | Delegate it for |
| --- | --- | --- | --- | --- |
| `investigator` | `claude-haiku-5-5` | `xhigh` | `Bash`, `Read`, `Grep`, `Glob` | Read-only answers from many files, logs, git history, or dependency data. |
| `implementer` | `claude-haiku-5-5` | `xhigh` | `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit` | One scoped slice with a known check. It runs in a worktree. |
| `debugger` | `claude-opus-5-5` | `medium` | `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit`, `EnterWorktree`, `ExitWorktree` | A failure with an unknown cause, or a fix that failed. |
| `planner` | `claude-haiku-5-5` | `xhigh` | `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit` | A plan across several files, before any edit. |
| `researcher` | `claude-haiku-5-5` | `xhigh` | `Bash`, `Read`, `Grep`, `Glob`, `WebFetch`, `WebSearch` | A claim that must match current web, vendor, or official docs. |
| `reviewer` | `claude-opus-5-5` | `medium` | `Read`, `Grep`, `Glob`, `Bash` | A read-only review of code, security, an API design, or a plan. |

The model and the effort come from the role table of the big sweep (D7).
A test compares the front matter of each file with that table.
The test fails when an agent on Opus has the effort `xhigh` or `max`.
The main session keeps the model and the effort that the user set.

Each file has a `tools` allowlist, and no `disallowedTools` line.
No agent has the `Agent` tool or `AskUserQuestion`.
A test reads each tool that a prompt or a fragment names in inline code, and checks that the tool is in the `tools` line.

## The Write Scope of the Planner

The `planner` writes a plan only in `minispec/changes/<name>/`.
A `tool.call` hook in the `agents` slice denies a `Write` or `Edit` call of a planner agent for any other path.
The hook also denies a path with a `..` part.
The hook cannot see a write that the planner does through `Bash`, so the prompt of the planner also tells it to use `Write` and `Edit`.

A plugin agent cannot carry a hook, and no setting bounds a subagent.
For this reason the slice uses the Mod API for this limit and for the report limit below.

## The Report Limit

Each agent file includes the fragment `report-size`.
It says that the final report has `{{REPORT_MAX_WORDS}}` words or fewer.
The `turn.step` hook of the `agents` slice records the context size of each subagent.
When a subagent has more than `{{SUBAGENT_CONTEXT_MAX}}` tokens of context, or `{{HAIKU_CONTEXT_MAX}}` tokens on Haiku, the next `tool.call` hook adds a report-now note.
The hook adds the note one time for each agent.
The bounds are in `src/plugins/claudetto/slices/agents/limits.ts`.
[Bounds](Bounds) lists them.

## Work Stays With the Agent

Each agent file includes the fragment `settle-it`.
An agent settles what the code, the docs, or a check can settle, and it states its assumption.
A subagent cannot ask the user.
When a choice belongs to the user, the agent gives the options in its report, with one fact for each option.
The caller then asks the user.
The agent does not end its report with a question, and it does not give the user a command that it can run.

## The Evals

Three `claude plugin eval` cases are in `src/plugins/claudetto/slices/agents/evals/`:

- `big-file-subagent` sends a 1 MB log search to one `investigator`.
- `delegation-related-grouped` gives four related questions to one `investigator`.
- `delegation-related-split` gives each of four questions to its own `investigator`.

Each case has these graders:

- An answer grader reads `ANSWERS.md` line by line.
  It fails when a numbered line names another file, or when the file is a list of all files.
- An `Agent` grader checks the `subagent_type` of each `Agent` call.
  It fails when a call uses an agent type other than `investigator`.
- A final-message grader fails a run that ends with a question in plain text.
  It also fails a run that gives the user a decision, or a command, that the agent can settle.

The tests in `tests/claudetto/agents/graders.test.ts` run each grader on a transcript that passes and on transcripts that fail.
The transcripts are in `tests/claudetto/agents/transcripts/`, and a person built them by hand.

## Related Pages

- [Overview](Overview)
- [Architecture](Architecture)
- [Handoff](Handoff)
- [Bounds](Bounds)
- [Subagents](Subagents)
