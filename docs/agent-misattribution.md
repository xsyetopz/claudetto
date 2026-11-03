# Picking the Right Agent

A task sent to an agent that cannot do it ends in a partial report and a wasted run. `Artemis` declares `tools: Read, Grep, Glob`, so it has no editor, no shell, and no way to make a folder, and a task that needs a write cannot finish there.

## The Cause

A delegation text that names each agent by its topic and not by what it refuses lets a brief that needs a write look acceptable. When two agents share a topic, a reader who picks by topic picks wrong.

## The Guards

Which surface carries a guard decides whether it can prevent the wrong choice or only report it. Only the `description` of an agent is present when the main loop picks one, because an agent body reaches nothing on the main thread, as the table at `docs/instruction-surfaces.md` records. A refusal in a body is read after the choice, so it stops the work and does not prevent the start.

1. Each file in `plugins/claudetto/agents/` declares its `tools:` line. `Artemis` has `Read, Grep, Glob`, `Athena` has `Read, Bash`, `Hephaestus` has `Read, Edit, Write, Bash`, and `Hermes` has `WebSearch, WebFetch, Read`.
2. `Grep` and `Glob` stay out of a file that declares `Bash`, because Claude Code `2.1.317` withholds them for the whole session when its shell search is on, not by the agent's tool list. `SWAPPED_FOR_BASH` of `tools/agent-tools.ts` names the pair.
3. `AGENT_ROSTER` in `plugins/claudetto/src/blocks/tool-describe/texts.ts` maps the shape of a task onto an agent, keyed on what the task produces: `Artemis` for a list of places across many files, `Athena` for a verdict on a diff, `Hephaestus` for an edit whose goal, files, and check can be named, and `Hermes` for an answer from the web.
4. `tools/agent-tools.ts` runs inside `just validate` and exits 1 when:
   - an agent file declares `Grep` or `Glob` beside `Bash`, naming the file and the tools;
   - a body names a tool that its `tools:` line leaves out;
   - the names in `AGENT_ROSTER` and the files of `plugins/claudetto/agents/` disagree in either direction, so a folded name cannot return as a type nothing serves and a shipped agent cannot go unnamed where the main loop picks one;
   - a subagent body lacks one of its sections, or holds text outside them.
