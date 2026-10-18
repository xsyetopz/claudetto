# Design: Handoffs

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
- Two handoffs were written to `openspec/changes/release-0-2-0/.claudetto/handoffs/`, because `HANDOFF_DIR` is relative (`src/kernel/paths.ts:31`) and the shell was in the change folder (D23).

## Decisions

### D32. The Stop Gate Blocks Only for Work That a Turn Can Do

- The gate does not block for a background task that runs.
  A turn cannot make a task end, and `TaskStop` is denied, so a block gives an empty turn.
  When the reply does not name the open tasks, the gate gives their count once as `additionalContext`, which continues the turn with no error label.
- The gate blocks only for a claim of the reply that no tool result of the turn shows (D22).
- The gate reads `stop_hook_active` and does not give the notice of the open tasks a second time.
  The hooks docs say to check this value "to avoid blocking on a condition that will never resolve".
- The judge still blocks a repeated false claim when `stop_hook_active` is `true`, by D58: on 2026-10-07 a pass on `stop_hook_active` let a retry repeat "Done, all tests pass" with no test run (`wiki/archive/Stop-Prompt-Hooks.md`).
  The user kept D58 for the judge on 2026-10-17.
- The gate reads the reply from `last_assistant_message`, not from the transcript, which the docs say "may lag".
- `MAX_BLOCKS` goes, because the cap of 8 continuations of Claude Code bounds the blocks of the judge, and the notice of the open tasks comes once.
- A reason names a tool only when the session has it (task 7.5).

- Alternative: keep the block for running tasks, with a lower cap.
  Rejected, because each block of this session gave no work, and the notice of the task end continues the session anyway.

### D33. A Subagent Always Writes Its Report

- D2 removes `maxTurns`, and task 4.3 removes `report-note.md`, with the facts above as their evidence.
- Each delegation text and each agent prompt gives the four parts that the multi-agent post of Anthropic names: "an objective, an output format, guidance on the tools and sources to use, and clear task boundaries".
- A subagent returns a summary, and puts bulk output in a file whose path it returns.
  The output of a failed check or test always goes to a file in full, because a report of "tests failed" hides the detail, and the subagent docs found that "the test runner pattern performed worse among all configurations" (`academy.claude.com`, using subagents effectively).
- A delegation runs work in parallel or keeps bulk reads out of the main context.
  Subagents that run one after another "incur multi-agent token costs without the speed benefit" (`claude.com`, multi-agent coordination patterns).
- When a subagent stops with no report, the main session resumes it with `SendMessage`, and does not start it again.
  The subagent docs say "Resumed subagents retain their full conversation history".
- The Haiku guard of task 4.2 stays a notice that does not stop the run and does not ask for a commit.

### D34. The Session Handoff Stays a File, at the Project Root

- The handoff file stays, because the long-running harness post of Anthropic calls files and git history "the key insight", and says compaction alone "isn't sufficient".
- The path resolves against `CLAUDE_PROJECT_DIR` (D23).
  `.git/info/exclude` of this checkout ignores the stray files, so a fresh clone is the check, not this checkout.
- The handoff is written in `PreCompact`, which does not block the compaction.
- Each field of the handoff comes from tool results or from the words of the user, as now.

### D35. The `guard` Denies Only by the Words That a Command Has

- An empty name still matches each system tool, so `$(which rm) -rf /` stays denied (the user, 2026-10-17).
  The false deny came from the walk, which read `$(( ))` as a subshell, not from the matcher.
- The walk of a command gives only words that the command has.
  A command with `$(( ))`, `$( )`, and pipes gives the words of each part, and no word that is not in the text.
- The lab gets the command of the facts above as a case that must pass.
- Each deny of the guard on a read-only command in the transcripts of other projects becomes a lab case, so the false positives have a count.

### D36. A Question to the User Carries What the User Needs to Answer

- A `!` command that a hook gives the user is the exact command, with one line on why the agent cannot run it.
- A question to the user names what the agent tried and what each answer changes, so the user does not answer twice.
  Cresta names "Lost context" as the first failure of a handoff to a person (opinion).
- When a turn needs the user, the reply ends with a short numbered "What I Need from You" list.
  Each item is one concrete action or decision: what to do, where, and what to send back, with the most blocking item first and what the agent does in the meantime.
  A turn that needs nothing from the user gets no such line, because the first sentence already gives the outcome.
  The example in the rule is from claudetto's own work, such as a `!` command, because the source found that a vague example gave vague asks.
- Source: a Convex video of 2026-10-14 (`youtube.com/watch?v=fXETGbqwrng`), transcribed with `whisper-cli` (`ggml-base.en`).
  The creator had an agent run 138 runs on Opus 5.5 over invented situations: with no rule, about 39% of replies ended with a clear ask, and with the rule, 100%.
  In the creator's own chats since June, a clear ask at the end went from less than 1% of replies to about 90%.
  The exact wording "didn't seem to matter", but a vague example gave vague asks (creator measure, no published method).
  Jev: `only-when-needed (confidence 0.85)`, against the rule as written, which adds "Nothing needed from you right now" to each reply, and against no change.
  Jev picked this before the transcript gave the numbers, and only the full rule was measured.
  So an eval of task 3.15 runs both forms at 10 runs each, and keeps the form with more turns that end with a clear ask when the user is needed, with the fewer words as the tie-break.

## The Handoff in Place of the Compaction Summary

### Facts of the Compaction

- This session had three automatic compactions (`compact_boundary` rows of its transcript):

  | Time (UTC) | Tokens before | Tokens after | Duration |
  | --- | --- | --- | --- |
  | `03:52` | `225,256` | `3,987` | `18.5 s` |
  | `04:24` | `224,872` | `4,209` | `16.9 s` |
  | `05:05` | `225,423` | `5,868` | `27.1 s` |

- The tokens after each compaction grew, because each handoff carried the full text of each earlier handoff.
  The fourth context of this session starts with four handoffs, one after the other.
- `wiki/evidence/Handoff-Cost.md` (2.1.296): the handoff cost `$0.0630`, and `/compact` with its follow-up cost `$0.2288`, with `59,526` input tokens that the cache did not serve.
- The prompt-caching docs say that a compaction on a warm cache "reads your prefix from the cache", and on a cold cache "reprocesses the full history as uncached input".
  The costs docs say that `/compact` "costs the most when you resume an old session".
- Sonnet 5.5 per million tokens: cache read `$0.10`, 5-minute cache write `$2.50`, output `$10` (pricing docs).
  A `200K` prefix costs about `$0.02` warm and `$0.40` cold (inferred).
- Anthropic's harness post: an agent "marks features as done prematurely", and the fix is a feature list where the agent changes only the `passes` field.
- Factory measured anchored updates of one summary above summaries that are written again each time: `3.70` against `3.44` (Anthropic) and `3.35` (OpenAI) out of 5 (vendor, judging method not read).

### D46. One Anchored Handoff, Updated at Each Compaction

- The handoff of a compaction updates the last handoff, and does not stack a new one on top of it.
  It keeps the decisions and the user's words that are still open, and drops each step that a check closed.
- The context after a compaction holds one handoff, so its size does not grow with the count of compactions.

- Alternative: a new handoff each time, as now.
  Rejected by the table above and by the measure of Factory.

### D47. No Model Call on a Cold Cache

- When the last assistant turn is older than the cache TTL, the handoff writes only the part that needs no model: the task, the next open task of `tasks.md`, the changed files, the git state, and the last words of the user.
- When the cache is warm, the model part, which holds the reasons and the decisions, comes from a fork of the cached prefix (D34).
- The TTL is 1 hour for a root session and 5 minutes for a subagent (the user, 2026-10-18).
  Claude Code picks the TTL with `CLAUDE_CODE_PROMPT_CACHE_TTL` (main conversation) and `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` (other requests), and `FORCE_PROMPT_CACHING_5M` overrides both (`external/cc-2.1.302/docs/env.md:369`, `:405`, `:480`).
  The settings snippet of the `handoff` slice sets `CLAUDE_CODE_PROMPT_CACHE_TTL` to `1h`.
- The reasons of a cold handoff come from the decision file of D50, so no model call is needed for them.
- Alternative: a summary by a small model.
  Rejected for now, because Claude Code has no setting for the summary model, and a cold read of the full history costs the most of each path.

### D48. The Status Comes from Checks, Not from the Summary

- The done list of a handoff comes only from the checked tasks of `tasks.md` and the check results of the session.
- The model part can give reasons, and not status.

### D49. API Context Editing Stays Out of Scope

- `clear_tool_uses_20250919` "Invalidates cached prompt prefixes" (context-editing docs), and Claude Code has no documented extension point that sets it.
- Anthropic measured "token consumption by 84%" less with context editing (vendor, measured), so this choice is open again when Claude Code documents a setting for it.

### D50. Decisions Go to a File as the Work Goes

- The agent writes each decision with its reason to a file at the time of the decision: `design.md` in a MiniSpec change, and `.claudetto/progress.md` at the project root (D23) in other work.
- The handoff links that file and copies its open decisions, with no model call.
- The always-loaded text gets one line for this rule, and no more, because the empty session is already large.
- Sources: the lead agent of Anthropic saves its plan to memory "to persist the context", subagents "pass lightweight references back to the coordinator" (multi-agent research post), and the harness post keeps a progress file with git commits.
  An opinion post says that agents that share the source "Context doesn't degrade through successive summarization" (`xtrace.ai`).
- Jev: `write-as-you-go (confidence 0.97)`, against a model call at each stop and against the loss of the reasons after a cold reset.
- Alternative: no file, with only the reasons of the earlier warm handoffs kept.
  Rejected, because after a break, a resumed session can undo a recent choice whose reason it lost.

### Notes from the Multi-Agent Sources of 2026-10-17

- D3 stays.
  The managed agents docs give an example roster with `claude-haiku-5-5` for `reviewer` and `test-writer`.
  The example shows a format and is not a measure, and a separate reviewer context gets support from the coordination patterns article.
- D14 stays.
  The multi-agent research post scales the agent count by the task (1 agent for a simple lookup, 2 to 4 for a comparison, more than 10 for a complex task), and gives no concurrency cap.
  The cap of at most 25 child threads, one level deep, is a limit of the Managed Agents API, not of Claude Code.
- Token cost of agents, vendor measures with no method: about 4x the tokens of a chat for one agent and about 15x for a multi-agent system (multi-agent research post), and 3-10x against a single agent on equivalent tasks (`claude.com`, building multi-agent systems).
  The two use different baselines.

## Sources

Read on 2026-10-17 by a researcher subagent with `curl`.

- 11 multi-agent sources that the user gave, read on 2026-10-17, with notes in the subagent's `notes.md`.
  The EPAM guide was not read (HTTP 403), and the Vertex AI webinar page has no transcript.

- `code.claude.com/docs/en/prompt-caching.md`, `code.claude.com/docs/en/costs.md`, `code.claude.com/docs/en/context-window.md`, documented.
- `platform.claude.com/docs/en/about-claude/pricing.md` and `platform.claude.com/docs/en/build-with-claude/context-editing.md`, documented.
- `claude.com/blog/context-management`, with numbers that Anthropic measured.
- `factory.com/news/evaluating-compression`, vendor measure.
- `arxiv.org/abs/2510.00615` (ACON): summaries cut peak tokens by "26-54%", academic measure.
- `manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus`, vendor opinion.

- `anthropic.com/engineering/effective-harnesses-for-long-running-agents` (2025-11-26), documented.
- `anthropic.com/engineering/effective-context-engineering-for-ai-agents` (2025-09-29), documented.
- `anthropic.com/engineering/multi-agent-research-system` (2025-06-13), with measured numbers of Anthropic that the post does not let others reproduce.
- `code.claude.com/docs/en/hooks` and `code.claude.com/docs/en/sub-agents`, documented.
- `docs.langchain.com/oss/python/langchain/multi-agent/handoffs`, documented: pass the call and its result as a pair, not the history of the subagent.
- `learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/handoff`, which the page calls "experimental".
- `augmentcode.com`, `cresta.com`, and `cowork.ink` guides, which are vendor opinion.
  The cowork.ink copy lost letters, so nothing is quoted from it.
- `towardsdatascience.com/how-agent-handoffs-work-in-multi-agent-systems/` was not read, because Cloudflare returned HTTP 403.
