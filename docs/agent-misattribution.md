# A Task Sent to an Agent That Could Not Do It

Read on 2026-10-29 from this tree. The run below is a session event and has no transcript file in the tree, so this page records it from the session itself.

## The Run

On 2026-10-29 the main loop sent `Artemis` a task that needed three things: a created folder, a written file of 328 lines, and a line count with `wc -l`. `Artemis` declares `tools: Read, Grep, Glob`, so it has no editor, no shell, and no way to make a folder. It returned a partial report with nothing written, and the work was redone on another agent. The cost was one wasted agent run and a delay.

## The Cause

The delegation text named each agent by its purpose and not by what it cannot do. A brief that needed a write looked acceptable, because the text said what `Artemis` was for and never said what it refused. When two agents share a topic, a reader who picks by topic picks wrong.

## The Guards

Four guards stand between a task and the wrong agent. Which surface carries a guard decides whether it can prevent this run or only report it: only the `description` of an agent is present when the main loop picks one, because an agent body reaches nothing on the main thread, as the table at `docs/instruction-surfaces.md:41` records. A refusal written in a body is therefore read after the choice is already made, which is why this run ended in a partial report rather than in a refusal to start. The refusals live in both places for that reason, in the `description` to prevent the choice and in the body to stop the work.

1. `plugins/claudetto/agents/Artemis.md` declares `tools: Read, Grep, Glob` with no `Bash`, so it has no editor and no shell. Its `description` ends "It writes no file, runs no command, and counts nothing", and its body says the same and sends such a task back to the parent in `<blocks>`. A test in `tests/repo/agent-roster.test.ts` asserts the tool list exactly and that the body names no tool the list withholds.
2. `plugins/claudetto/agents/Athena.md` declares `tools: Read, Bash`, and both its `description` and its body state that it changes no file. The same test covers it. `Grep` and `Glob` stay out of the file because the runtime withholds them from an agent that has `Bash`.
3. `AGENT_ROSTER` in `plugins/claudetto/src/tools/texts.ts` maps the shape of a task onto an agent, keyed on what the task produces: `Artemis` when the product is a list of places across many files, `Athena` when it is a verdict on a diff, and every other task is the main loop's own work. It is one line of the `Agent` tool description rather than a block of `plugins/claudetto/agents/main.md`, for two reasons. The `Agent` text is read at the moment of the choice, while the main body is paid for on every turn whether a session delegates or not. And it fits: the line costs 150 characters, taking the `Agent` text from 823 to 973, where a drafted `main.md` block cost 308 request characters against 26 of headroom. The bound it would have broken is not a figure that could be raised, because a capture of 2026-10-29 read the default system body it replaces at 5,628 characters and 5,680 characters of request JSON, which is the bound exactly.
4. `tools/agent-tools.ts` runs inside `just validate` and exits 1 when an agent file declares `Grep` or `Glob` beside `Bash`, naming the file and the tools, or when a body names a tool its frontmatter leaves out. It also compares the names of guard 3 against the files of `plugins/claudetto/agents/` in both directions, so a folded name cannot return as a type nothing serves and a shipped agent cannot go unnamed where the main loop picks one. Planting `Hephaestus` and `Zeus` back into the roster line made it exit 1 naming each one.

## Why the Declaration Check Exists

The comment above `NEVER_DENY` in `plugins/claudetto/src/deny.ts:54-59` records that denying `Bash` "puts `Grep` and `Glob` in its place". The program offers the pair only on a surface with no `Bash`, so a file that names `Bash` beside them declares two tools the agent never receives. Three of the six archived files did so: `Athena`, `Apollo`, and `Hephaestus`. The same three also told the agent to use `grep` in `Bash` when a build has no `Grep`, a line the rebuilt `Athena` replaces with `grep` in `Bash` as its only search. The archived `Artemis` was consistent with its tools and carried neither fault.

## What Folded the Other Four

The roster is two agents because of the criteria in the article at `https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop`, read on 2026-10-29. It keeps a subagent for measurable context bloat in one loop, for parallel tasks with fresh context that is discarded afterwards, or for an agent that struggles to select tools among conflicting instructions. It folds specialists that chain on each other's output, touch the same data, or are called together.

- `Apollo` folded because a pipe defeats its only claim, bloat, in the main loop. A subagent's check also cannot satisfy a box hook that reads the parent session's own tool uses.
- `Hephaestus` folded because it touches the same data as the main loop and hands back a summary of edits that the main loop must re-read to trust.
- `Zeus` folded because it planned work for parallel `Hephaestus` agents, so folding `Hephaestus` left it no consumer.
- `Hermes` folded because `WebFetch` already takes a `prompt` and returns a compact answer, so a nested model loop adds latency and nothing else.

`Artemis` stays for bulk search whose context is discarded, and `Athena` stays for black-box verification in a context that does not share the author's blind spot.
