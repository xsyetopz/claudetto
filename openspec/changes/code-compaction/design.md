## Context

The handover of today (`modules/session/handoff/adapters/mod.ts:178-215`) writes a file, then runs `/clear` or `/compact`, then submits a resume prompt.
The resume prompt is a new model turn. In the run of 2026-10-19 (wiki `Handoff-Cost`), that turn read files again and cost $0.035 to $0.073, against $0.030 for built-in compaction.
`onCompact` in `modules/session/prompt/adapters/mod.ts:142` only adds a line to the instructions of the built-in summary.

## Decisions

- **Answer the hook, not `/clear`.** Code compaction returns `{ messages, tokensBefore, tokensAfter }` from `session.compact`. The session goes on in place with no new prompt, so no resume turn is needed and the user sees no `/clear`. Alternative: the `/clear` handover of today. It stays as one arm of the probe.
- **Head and tail.** The messages are 1 handoff message (role `user`, a plain message, because `session.compact` exposes no `isMeta`), then the newest messages, kept by `handle`, up to `TAIL_TOKENS`. A `tool_use` keeps its `tool_result`, so the tail does not start in the middle of a tool call. (proposed: `TAIL_TOKENS` = 20,000. The probe picks the value.)
- **Format.** The sections are `## Goal`, `## Constraints and Pins`, `## Decisions`, `## Open Change and Tasks`, `## Files`, `## Errors and Fixes`, `## Checks`, `## Next Step`, and `## User Messages`. They follow the 9 parts of the built-in summary prompt (Claude Code Docs, `how-it-works/context-and-compaction`) and the `HANDOFF.md` guides. Code builds each section from the transcript, with no model call. (proposed)
- **Constraints word for word.** "Do not", "never", "pin", "keep", and "only" lines of the user and of `CLAUDE.md` changes in the session go into `## Constraints and Pins` as quotes with their source. Facts are rewritten, but rules are not (arXiv 2608.29028).
- **Files as paths.** `## Files` lists each read or edited file with the line ranges that the session read, newest first. Claude Code already reads up to 5 files again after a compaction, and a file of any size can come back with a `Read`.
- **User messages filtered.** A message of the user is text that the user typed. A row with `isMeta`, a `<task-notification>`, a `<system-reminder>`, and a hook text are not messages of the user.
- **Fallback.** Any error, or a handoff over `HEAD_TOKENS`, calls `next(e)`. The built-in compaction runs, and the log names the cause.
- **Precompute.** When the session is idle, a `precompute` call can store the code result for the next compaction. (proposed, only when the probe shows that the build time matters)

## Probe

Arms: B (built-in compaction), C (code compaction), H (the handover of today: `/clear` and resume).
The fixture is a git project with an openspec change of 6 tasks. Three constraints are planted early:

- a pinned version that a decision of the user names
- a file that the user says not to touch
- a value of the user, such as a port

The base session does tasks 1 to 3, until the context is about 80k and then about 200k tokens. Each arm forks from the base with `--fork-session`, compacts (`/compact`, which is the `manual` trigger), and runs 2 hops of follow-up work.

Each measure is from code, with no judge model:

- the cost and time of the compaction step and of the 2 follow-ups
- the cache: `cache_creation_input_tokens` and `cache_read_input_tokens` of each request after the compaction, and the cache read share of each follow-up turn
- the context after the compaction
- the `Read` calls of files that were already read
- the work done again
- each planted constraint kept or broken, by a check of the files
- the task done next

The probe measures B and H against C, the code path of `0.4.0-alpha.1`. C wins only when it matches or beats B on each quality measure, costs less, and has no cache problem (the user, 2026-10-26). A round that misses a bar declares no winner. The next round changes C, such as the tail budget, the sections, or the head size, and runs again.

## Risks / Trade-Offs

- [Risk] Code compaction changes the prompt prefix in a new way, so the cache must be written again. The built-in compaction has the same cost, so the bar is "no worse than B". -> The probe measures the cache write and the read share. The head message keeps a fixed order, so two compactions of one session give a stable prefix.

- [Risk] A hook that answers drops the summary that the model would write, which holds the reasons. -> `## Decisions` and `## User Messages` keep the words of the user, and the tail keeps the newest reasons word for word.
- [Risk] A compaction on "prompt is too long" with a tail that is still too big. -> The tail budget is a cap, and a second refusal calls `next(e)`.
- [Risk] `DISABLE_COMPACT` refuses `$.session.compact`. -> Keep auto compaction on. The hook replaces the summary, so the user does not set the switch.
