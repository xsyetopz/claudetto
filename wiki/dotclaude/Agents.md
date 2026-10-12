# Agents

dotclaude defines six agents in `plugins/dotclaude/agents/`.
This page lists the roster, the pins, and the rules for the files.
The decisions are D12, D13, and D25 in [Decisions](Decisions-Router).

## Roster

| Agent | Work | Model and effort in the file | `maxTurns` |
| --- | --- | --- | --- |
| `investigator` | Read-only answers from files, logs, git history, dependency data, or web pages. | Haiku 5.5 `medium` | 31 |
| `implementer` | One scoped slice: a feature, a fix with a known cause, tests, docs, or a specified bulk change. | Sonnet 5.5 `medium` | 61 |
| `debugger` | A failure with an unknown cause, or a failed fix. | Sonnet 5.5 `high` | 61 |
| `planner` | Plans a change across several files before any edit, and writes only the plan. | Opus 5.5 `high` | 41 |
| `researcher` | Answers from web pages, official docs, specifications, or vendor pages. | Sonnet 5.5 `medium` | 41 |
| `reviewer` | Read-only review of code, security, an API, a plan, or PR comments. | Opus 5.5 `high` | 41 |

- The `test-runner` agent is gone.
  The CLI `dotclaude-run-checks` runs a batch of check commands with no model turn, and it prints the failures.
- `web-researcher` does not exist.
  `researcher` takes the web lookups.
- No agent has the `Agent` tool, so no agent starts another agent.
- Each `maxTurns` holds one spare turn for the report.
  A subagent that reaches `maxTurns` returns no report.
- At 4 turns left, the `tool.call` hook adds a note that tells the subagent to report now.
  The bound `TURNS_LEFT_AT` is in `slices/handoff/limits.ts`.
- In a subagent, a git action that changes the shared checkout or the shared `refs/stash` is denied.
  The rule is `git.shared-checkout` in `src/kernel/policy/rules/git.ts`, and it is in the `hard_deny` list of the [Guards](Guards) page.
  `/ship` runs one `reviewer` for each package diff, and `dotclaude-spec runs` gives the number of reviewers that start at once.
- The file is the only source of the choice.
  No router rewrites it, and a coordinator can pass `model` and `effort` in an `Agent` call ([Decisions: router and agents](Decisions-Router)).
- Planning and orchestration stay in the main loop.
- Fable 5.1 and Mythos 5.1 are in no file.
  They run only when the user selects them.
- The `Explore`, `Plan`, `general-purpose`, `claude-code-guide`, and `statusline-setup` agents are off, so the listing holds only these six ([Off switches](Off-Switches#built-in-agents)).

## Pins

The frontmatter of `agents/*.md` is the only source of `model`, `effort`, and `maxTurns`.
No code list repeats them.
The roster test in `tests/dotclaude/agents/roster.test.ts` does these checks:

- The agent files are these six names and no other.
- The `model` and the `effort` of each file are the ones of the table in the test.
- The `maxTurns` of each file is the turn bound of `turnBound` in `slices/agents/domain/turns.ts`.

The test `tests/dotclaude/agents/turns.test.ts` checks that each agent has a whole-number turn bound of at least one, and that the turn count check allows the counts up to the bound.

## Description rules

- A description has 300 characters or fewer.
  `AGENT_DESCRIPTION_MAX_CHARS` in `tools/limits.ts` holds the bound, because only tests read it.
- A description says what the agent does and when to delegate to it.
- A description uses no forceful word.
- The agent listing goes in each request, so a long description costs tokens for each request.

## Body rules

A subagent does not inherit the output style or the shared sections of the system prompt.
Each body therefore repeats the rules that matter for its role:

- The scope rule and the verification rule for the role.
- The read rule: search first with `Grep`, then read the matched range with `Read` and its `offset` and `limit` ([Context bound](Context-And-Handoff)).
- The report bound `REPORT_MAX_WORDS` (400 words), with the value from `slices/handoff/limits.ts`.
- The keep-the-work rule and the block rule come in the `agent.spawn` block, and not in the body ([System prompt](Prompt-Surface)).
- What to do when a check fails: `debugger` and `implementer` fix the code or report the failure with the evidence.
  They do not raise a bound, weaken or skip a test, or edit a check, a config, or a hook unless the brief says that the user asked.
- `debugger` does not change a test.
  When it thinks that a test is wrong, it reports that with the evidence, and the parent decides.
- `reviewer` looks for tests of prose, a raised bound, a skipped test, and an edited lint or CI config.

## Related pages

- [Decisions: router and agents](Decisions-Router)
- [Core plugin](Core-Plugin)
- [Context bound](Context-And-Handoff)
