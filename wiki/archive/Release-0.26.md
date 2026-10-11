# Release 0.26

Released 2026-10-06.
Makes the prompts and the session context shorter, and turns the Terms of Use clauses into the dotclaude operating spec.

## Migration from 0.25

- Run `/dotclaude:setup` after the update.
  The settings profile now sets `promptCacheTtl` to `"5m"`, and setup writes it over the earlier value.
  The other options, the stored state, the status line, and the `CLAUDE.md` block need no change.

## Removed

- The clause 18 prompt hook on `SubagentStop`.
  Claude Code sends the transcript with each prompt hook call on `Stop` and `SubagentStop`, up to half of the context window of the model.
  In 7 days of sessions, the mean was about 46k tokens, or about $0.046 on Claude Haiku 4.5, for each call.
  Clause 18 already tells the main agent to compare each "done" in a subagent report with the check output.
  The prompt hook on `Stop` stays.

## Changed

- The settings profile sets `promptCacheTtl: 5m` for the main conversation.
  In 7 days of transcripts, 98.7% of the main-agent calls came 5 minutes or less after the call before them.
  At API prices, the 5-minute cache would have cost 8.5% less than the 1-hour cache.
- The section "Long runs" is now "Runs and subagents", and it has a new routing rule for the main agent.
  The main agent does a chain of dependent steps itself, and gives long reads, long check runs, and bulk work to worker agents.
  The main agent does a worker slice itself when its check failed twice.
  In 7 days of transcripts, tool results in the main context cost about 15% of the main-agent cost, because each later turn reads them again.
- The SessionStart context is about 2.5 KB, and the SubagentStart context is about 1 KB.
  Each rule is one line, with a reason only where the rule needs one.
  The rules that a hook teaches (Bash writes, line breaks, `AskUserQuestion`) are not in the context, because the hook message gives the rule when it fires.
  The handoff rules move to the `handoff` skill, and the session context only points to an open note.
  The project AI policy rules come with the ask of the policy guard, because Claude does not see an ask reason.
  Subagents get one section of six rules, with their progress file.
  The section "Known defects" is now "Checks", and the done-claim rule is now rule 12.1.
  The line-break note gives the line numbers of each block, and not the sembr text.
- The agent prompts are about half as long (66 KB to less than 32 KB), and a test keeps all agent files together at 32,000 bytes or less (`AGENTS_MAX_BYTES`).
  They lose the rules that the SubagentStart context now gives each subagent: defects, checks, the turn budget, denies, and the report start.
  They also lose examples and repeated points.
  A new subagent rule tells each subagent to start its report with `Done` or `Not done`.
- Rules 10.6 and 12.1 do not offer the **Not verified** list as an exit.
  When the check of a part fails, the agent fixes the part and runs the check again.
  A part goes under **Not verified** only when its check cannot run.
- Text from outside (AI policy files, CodeGraph index data, and `um kb` field notes) goes to Claude in its own tag, with each `<` escaped, so that the text cannot close the tag.
  The Stop prompt hook puts its input in a `hook_input` tag first, and asks for only the JSON object.
  Wrapper tags around one short block are removed.
- The `handoff` skill is 43% shorter (5.1 KB to 2.9 KB), and it also tells Claude how to read a note.
  The rules removed in 0.26.0: wait-for-go, no-invented-steps, measure, deny-route, deny-final, lower-cost, no-extras, keep-safety, background, blocker, shared-runs, policy-subagent, the progress rules for the main agent, escalate, fix-own, run-checks, self-check, not-verified, and continue.
- **Breaking:** the Terms of Use clauses are now the dotclaude operating spec (`wiki/Operating-Spec.md`).
  Each rule has a number, such as 12.1, and an RFC 2119 level, and each hook reason ends with the number of its rule.
  The text goes to Claude in `dotclaude_spec` tags, and not in `dotclaude_terms` tags.
  The working rules lose the `<verification>` block and the line about LSP, CodeGraph, and `grep`.
  The Jev section loses the line about `AskUserQuestion`, because rule 11.1 says the same thing.
- The rule about a deny moves to the start of the spec, which subagents also get.
  A hook deny is a decision of the user, so the agent does what its reason says, and does not get its result another way.
  A subagent got past a deny in 0.25.1 by rewording a command.
- The Bash guard deny of a write to a project file tells an agent with no `Edit` or `Write`, such as a read-only subagent, to report the write that it needs.
  Before, the deny told it only to use tools that it did not have.
- The wiki labels the subagent cache figures in `Design.md` with their measurement, and records that the Stop hook lets one retry through.
- The cold-cache note counts the idle time from the last compaction of the main agent, and not only from the last turn.
  A compaction writes a new cache, so after it the note does not say that the cache expired too early.

## Fixed

- The clause 18 prompt hook blocked correct messages that list a part as not verified, repeat a claim of another agent that they did not check, or report a run whose results they did not read.
  It now blocks only when it can quote the words of the done claim.
  In a replay of 32 real messages and 5 breaks with the transcript, the system prompt, and the model of Claude Code 2.1.292, false blocks went from 4 of 32 to 2 of 32, and the hook caught 5 of 5 breaks.
  Transcripts do not record `background_tasks` and `session_crons`, so the replay sent them empty.
  A second replay of one real progress report and one false done claim, each with `background_tasks` empty and with a running `just check`, gave the correct result in 4 of 4 runs.
- The clause 18 prompt hook on `Stop` blocked a message that only asked the user for approval.
  The prompt now states rule 12.1 as a stopping condition about the claims of the last message, and not about whether the task is complete.
  In 10 sandbox runs on Claude Haiku 4.5, the false blocks went from 2 to 0, and 2 of 2 unchecked done claims were still blocked.
  The block reason tells the agent to run the check and fix the part, and does not offer the **Not verified** list as an exit.
  The prompt went from 1,859 to 1,498 characters.
- The Bash guard denied a write to a temporary file as a write to a project file.
  It now ignores module paths in `import`, `from`, and `require`, and follows `cd` from part to part of a command, so that `cd "$TMPDIR/x" && … > out.txt` writes to `$TMPDIR`.
