# A Task Sent to an Agent That Could Not Do It

Read on 2026-10-29 from this tree. The run below is a session event and has no transcript file in the tree, so this page records it from the session itself.

## The Run

On 2026-10-29 the main loop sent `Artemis` a task that needed three things: a created folder, a written file of 328 lines, and a line count with `wc -l`. `Artemis` declares `tools: Read, Grep, Glob`, so it has no editor, no shell, and no way to make a folder. It returned a partial report with nothing written, and the work was redone on another agent. The cost was one wasted agent run and a delay.

## The Cause

The delegation text named each agent by its purpose and not by what it cannot do. A brief that needed a write looked acceptable, because the text said what `Artemis` was for and never said what it refused. When two agents share a topic, a reader who picks by topic picks wrong.

## The Guards

Four guards stand between a task and the wrong agent. Which surface carries a guard decides whether it can prevent this run or only report it: only the `description` of an agent is present when the main loop picks one, because an agent body reaches nothing on the main thread, as the table at `docs/instruction-surfaces.md:41` records. A refusal written in a body is therefore read after the choice is already made, which is why this run ended in a partial report rather than in a refusal to start. The refusals live in both places for that reason, in the `description` to prevent the choice and in the body to stop the work.

1. `plugins/claudetto/agents/Artemis.md` declares `tools: Read, Grep, Glob` with no `Bash`, so it has no editor and no shell. Its `description` ends "It writes no file, runs no command, and counts only what `Grep` and `Glob` return", and its body says the same and sends such a task back to the parent in `<blocks>`. `tools/agent-tools.ts` checks the tool list and that the body names no tool the list withholds.
2. `plugins/claudetto/agents/Athena.md` declares `tools: Read, Bash`, its `description` ends "It changes no file", and its body says "You report, and the fix is the parent agent's work." The same test covers the tool list (`Athena declares Read and Bash`). `Grep` and `Glob` stay out of the file because Claude Code `2.1.317` withholds them on a native build off Windows when the entry point is not `local-agent` (`eR()` and `Qse()` in the strings dump), and a `Grep` call then gets "Grep is not available in this session — search file contents with `grep` via the Bash tool instead". That rule is tied to the session, not to the agent's tool list, so the claim that the pair is withheld only from an agent with `Bash` is unmeasured, and so is whether `Artemis` (`Read, Grep, Glob`) has a search tool on that build.
3. `AGENT_ROSTER` in `plugins/claudetto/src/blocks/tool-describe/texts.ts:4` maps the shape of a task onto an agent, keyed on what the task produces: `Artemis` for a list of places across many files, `Athena` for a verdict on a diff, `Hephaestus` for an edit whose goal, files, and check can be named, and `Hermes` for an answer from the web. `tools/agent-tools.ts` reads it. The character costs once recorded here (150 characters, 823 to 973, 308 against 26, 5,628 and 5,680) were not re-measured and are removed.
4. `tools/agent-tools.ts` runs inside `just validate` and exits 1 when an agent file declares `Grep` or `Glob` beside `Bash`, naming the file and the tools, or when a body names a tool its frontmatter leaves out. It also compares the names of guard 3 against the files of `plugins/claudetto/agents/` in both directions, so a folded name cannot return as a type nothing serves and a shipped agent cannot go unnamed where the main loop picks one. The planted-name run was not repeated.

## Why the Declaration Check Exists

The `NEVER_DENY` comment once quoted here was not found in git history and is removed. In the six archived files (`git show 199a3de8^:plugins/claudetto/agents/NAME.md`), three declare `Bash` beside `Grep` and `Glob`: `Athena`, `Apollo`, and `Hephaestus`. Four bodies (`Apollo`, `Artemis`, `Athena`, `Hephaestus`) name `grep` in `Bash` once each, so `Artemis` is not free of that line.

## What Folded the Other Four

This section records an earlier fold of four agents, read on 2026-10-29. The tree now holds `Artemis`, `Athena`, `Hephaestus`, and `Hermes` (`ls plugins/claudetto/agents`), so the bullets for `Hephaestus` and `Hermes` no longer describe the tree. The fold followed the criteria in the article at `https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop`. It keeps a subagent for measurable context bloat in one loop, for parallel tasks with fresh context that is discarded afterwards, or for an agent that struggles to select tools among conflicting instructions. It folds specialists that chain on each other's output, touch the same data, or are called together.

- `Apollo` folded because a pipe defeats its only claim, bloat, in the main loop. A subagent's check also cannot satisfy a box hook that reads the parent session's own tool uses.
- `Hephaestus` folded because it touches the same data as the main loop and hands back a summary of edits that the main loop must re-read to trust.
- `Zeus` folded because it planned work for parallel `Hephaestus` agents, so folding `Hephaestus` left it no consumer.
- `Hermes` folded because `WebFetch` already takes a `prompt` and returns a compact answer, so a nested model loop adds latency and nothing else.

`Artemis` stays for bulk search whose context is discarded, and `Athena` stays for black-box verification in a context that does not share the author's blind spot.
