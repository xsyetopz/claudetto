# Design: handoffs

This file continues [`design.md`](design.md) with the four handoffs of claudetto: to the next context, to a subagent and back, to the user, and at the stop gate.
The sources are in the last section.

## Facts of 2026-10-17

- The stop gate blocked this session's turns again and again while background agents ran, with the same set of tasks each time.
  Each block gave a turn that could do no work.
  Its reason names `TaskStop` (`slices/turngate/prompts/tasks-reason.md:4`), which the snippet denies (`slices/prompt/slice.ts:181`).
  `MAX_BLOCKS` is `2` (`slices/turngate/limits.ts:4`).
- Three of four read-only subagents of 2026-10-17 stopped at the `maxTurns` of `30` (`slices/agents/limits.ts`, `AGENT_MAX_TURNS`) with no report.
  Each gave its report only after a `SendMessage` from the main session, and one cut it to the 400 words of `REPORT_MAX_WORDS` and left most counts unmeasured.
- `slices/agents/prompts/report-note.md` tells each subagent "Commit your work first, then report", also a read-only one.
  A researcher read this as an instruction in a tool result, and correctly did not follow it.
- The guard denied the read-only command `d=…; echo $(( $(date +%s) - $(stat -Lf %m $d/a.output) )); cat $d/b.output 2>&1 | tail -3` as `git.discard-uncommitted` (`slices/guard/domain/matchers/git.ts:96`).
  The command has no `git` word.
  The walk gave the words `["git",""]`, and an empty name matches each tool (`slices/guard/domain/matchers/system.ts:50`).
- Two handoffs were written to `minispec/changes/release-0-2-0/.claudetto/handoffs/`, because `HANDOFF_DIR` is relative (`src/kernel/paths.ts:31`) and the shell was in the change folder (D23).

## Decisions

### D32. The stop gate blocks only for work that a turn can do

- The gate does not block for a background task that runs.
  A turn cannot make a task end, and `TaskStop` is denied, so a block gives an empty turn.
  When the reply does not name the open tasks, the gate gives their count once as `additionalContext`, which continues the turn with no error label.
- The gate blocks only for a claim of the reply that no tool result of the turn shows (D22).
- The gate reads `stop_hook_active` and does not block a second time for the same reason.
  The hooks docs say to check this value "to avoid blocking on a condition that will never resolve".
- The gate reads the reply from `last_assistant_message`, not from the transcript, which the docs say "may lag".
- `MAX_BLOCKS` goes, because `stop_hook_active` and the cap of 8 continuations of Claude Code do its work.
- A reason names a tool only when the session has it (task 7.5).

- Alternative: keep the block for running tasks, with a lower cap.
  Rejected, because each block of this session gave no work, and the notice of the task end continues the session anyway.

### D33. A subagent always writes its report

- D2 removes `maxTurns`, and task 4.3 removes `report-note.md`, with the facts above as their evidence.
- Each delegation text and each agent prompt gives the four parts that the multi-agent post of Anthropic names: "an objective, an output format, guidance on the tools and sources to use, and clear task boundaries".
- A subagent returns a summary, and puts bulk output in a file whose path it returns.
- When a subagent stops with no report, the main session resumes it with `SendMessage`, and does not start it again.
  The subagent docs say "Resumed subagents retain their full conversation history".
- The Haiku guard of task 4.2 stays a notice that does not stop the run and does not ask for a commit.

### D34. The session handoff stays a file, at the project root

- The handoff file stays, because the long-running harness post of Anthropic calls files and git history "the key insight", and says compaction alone "isn't sufficient".
- The path resolves against `CLAUDE_PROJECT_DIR` (D23).
  `.git/info/exclude` of this checkout ignores the stray files, so a fresh clone is the check, not this checkout.
- The handoff is written in `PreCompact`, which does not block the compaction.
- Each field of the handoff comes from tool results or from the words of the user, as now.

### D35. The guard denies only by the words that a command has

- A matcher with an empty name matches no tool.
- The walk of a command gives only words that the command has.
  A command with `$(( ))`, `$( )`, and pipes gives the words of each part, and no word that is not in the text.
- The lab gets the command of the facts above as a case that must pass.
- Each deny of the guard on a read-only command in the transcripts of other projects becomes a lab case, so the false positives have a count.

### D36. A question to the user carries what the user needs to answer

- A `!` command that a hook gives the user is the exact command, with one line on why the agent cannot run it.
- A question to the user names what the agent tried and what each answer changes, so the user does not answer twice.
  Cresta names "Lost context" as the first failure of a handoff to a person (opinion).

## Sources

Read on 2026-10-17 by a researcher subagent with `curl`.

- `anthropic.com/engineering/effective-harnesses-for-long-running-agents` (2025-11-26), documented.
- `anthropic.com/engineering/effective-context-engineering-for-ai-agents` (2025-09-29), documented.
- `anthropic.com/engineering/multi-agent-research-system` (2025-06-13), with measured numbers of Anthropic that the post does not let others reproduce.
- `code.claude.com/docs/en/hooks` and `code.claude.com/docs/en/sub-agents`, documented.
- `docs.langchain.com/oss/python/langchain/multi-agent/handoffs`, documented: pass the call and its result as a pair, not the history of the subagent.
- `learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/handoff`, which the page calls "experimental".
- `augmentcode.com`, `cresta.com`, and `cowork.ink` guides, which are vendor opinion.
  The cowork.ink copy lost letters, so nothing is quoted from it.
- `towardsdatascience.com/how-agent-handoffs-work-in-multi-agent-systems/` was not read, because Cloudflare returned HTTP 403.
