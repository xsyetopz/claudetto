# Agents

dotclaude defines five agents in `plugins/dotclaude/agents/`.
This page lists the roster, the pins, and the rules for the files.
The decision is D25 in [Decisions](Decisions-Router).

## Roster

| Agent | Work | Model and effort in the file | `maxTurns` |
| --- | --- | --- | --- |
| `investigator` | Read-only answers from files, logs, git history, dependency data, or web pages. | Haiku 5.5 `medium` | 31 |
| `implementer` | One scoped slice: a feature, a fix with a known cause, tests, docs, or a specified bulk change. | Haiku 5.5 `medium` | 61 |
| `debugger` | A failure with an unknown cause, or a failed fix. | Haiku 5.5 `high` | 61 |
| `reviewer` | Read-only review of code, security, an API, a plan, or PR comments. | Sonnet 5.5 `medium` | 41 |
| `test-runner` | Runs checks and returns the exact failures. It has `omitClaudeMd`. | Haiku 5.5 `low` | 16 |

- `web-researcher` does not exist.
  `investigator` takes its web lookups.
- No agent has the `Agent` tool, so no agent starts another agent.
- Each `maxTurns` holds one spare turn for the report.
  A subagent that reaches `maxTurns` returns no report.
- The file is the default.
  The router can set another model and effort for a task ([Router](Router)).
- Planning and orchestration stay in the main loop.
- Fable 5.1 and Mythos 5.1 are in no file.
  They run only when the user selects them.
- The `Explore`, `Plan`, `general-purpose`, `claude-code-guide`, and `statusline-setup` agents are off, so the listing holds only these five ([Off switches](Off-Switches#built-in-agents)).

## Pins

The frontmatter of `agents/*.md` is the only source of `model`, `effort`, and `maxTurns`.
No code list repeats them.
The pin test in `tests/dotclaude/agents.test.mjs` does these checks:

- The model is one of `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`.
  `claude-haiku-4-5` fails the test.
- The effort is in `ALLOWED_EFFORTS` for that model.
  `ALLOWED_EFFORTS` is data in `features/router/limits.mjs`.
  For example, Sonnet 5.5 at `xhigh` fails.
- The `maxTurns` equals the value in the table above.
- The roster is these five names and no other.

## Description rules

- A description has 300 characters or fewer.
  `AGENT_DESCRIPTION_MAX_CHARS` in `tools/limits.mjs` holds the bound, because only tests read it.
- A description says what the agent does and when to delegate to it.
- A description uses no forceful word.
- The agent listing goes in each request, so a long description costs tokens for each request.

## Body rules

A subagent does not inherit the output style.
Each body therefore repeats the rules that matter for its role:

- The scope rule and the verification rule for the role.
- The read rule: search first with `Grep`, then read the matched range with `Read` and its `offset` and `limit` ([Context bound](Context-Bound)).
- The report bound `REPORT_MAX_WORDS` (400 words), with the value from `features/context/limits.mjs`.
- The keep-the-work rule: when a claim of fault has no check in the workspace, the agent keeps the finished work and reports the claim to the parent ([System prompt](System-Prompt#evidence-before-undoing-finished-work)).

## Related pages

- [Router](Router)
- [Parts](Parts)
- [Context bound](Context-Bound)
