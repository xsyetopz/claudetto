# Overriding Claude Code's Own Prompt Text

A main-thread custom agent replaces the default body of `system`. An output style adds to the request and leaves the body. Each reading is `just capture` on Claude Code `2.1.317`, in characters of the first request, against a fake API with no model call. `docs/surfaces.md` holds the baseline and the method.

## Main-Thread Custom Agent

A `prompt.compose` hook returns the root prompt as the whole section list of the main loop, and it takes the place of the default body, the third `system` block. A subagent's prompt is untouched. With the `agent` setting on, the body is the agent file alone and the hook has no effect.

- The `plain` arm's third `system` block is 5,799 characters. With the shipped settings, it is the 5,216 characters of the root prompt in `plugins/claudetto/src/blocks/root-prompt/`, and `system` reads 5,352 in all.
- The shipped settings turn off auto memory and git instructions, so the default body they leave is 3,519 characters (`just capture --arm plain --shipped`), shorter than the 5,799 of the `plain` arm.
- The tool list does not change with the agent: it reads 7,245 characters for 6 tools either way.

## Output Style

`outputStyle` adds text and does not replace the body. Read with `just capture --arm plain --settings FILE`:

| Style | Total | `system` | `messages` |
| --- | --- | --- | --- |
| none | 46,084 | 5,935 | 9,984 |
| built-in `Concise` | 47,651 | 5,973 | 11,511 |
| built-in `Proactive` | 47,607 | 5,973 | 11,467 |

- A style swaps the first line of the default body for "You are an interactive agent that helps users according to your \"Output Style\"...", which grows the third `system` block from 5,799 to 5,837, and puts the style body under `# Output Style: NAME` in the first system message of `messages`.
- Claudetto's `plugins/claudetto/output-styles/Concise.md` is 2,147 characters (`wc -m`). In the shipped arm it adds 2,157 to the request (`docs/surfaces.md`).

## Built-in Agents

Each row is `just capture --arm plain --settings FILE` with deny rules, against 46,084:

| Deny | Total | Change |
| --- | --- | --- |
| `Agent(Explore)` and `Agent(Plan)`, or `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | 45,173 | -911 |
| `Agent(general-purpose)`, `Agent(claude)`, `Agent(statusline-setup)`, and `Agent(claude-code-guide)` | 45,526 | -558 |
| `Agent` | 39,186 | -6,898 |

The listing of agents sits in `messages`, so each agent denied takes its line out, and the `Agent` deny takes the tool definition, 5,246 characters, out as well. The shipped settings deny the six built-in agents named above and set `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`. They leave `Agent` allowed, because claudetto's four agents are reached through it.

## What This Means for the Files

A rule in the root prompt is in every request of every session. A rule that applies to one kind of work belongs in an agent body or a rule file, and `docs/instruction-surfaces.md` holds the placement rule.
