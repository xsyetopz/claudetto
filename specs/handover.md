# Handover

History, checks and sources: [evidence/handover.md](evidence/handover.md).

## HANDOVER-017 Carry State Across Clear

claudetto carries state across `/clear` through SessionStart and PreCompact.

Given a recorded pause
When the user runs `/clear`
Then the pause still holds in the next session

## HANDOVER-018 Start a Cycle at a Task Boundary

claudetto starts a renewal cycle only for the main loop at a task boundary with the context from `$.session.usage()` above the break-even size.

Given a main-loop boundary over the threshold
When the turn completes
Then a cycle starts

Given a boundary under the threshold, a subagent boundary, or a prompt an hour after the last request
When the turn completes
Then no cycle starts

Given renewal
When it runs
Then no `$.clock.after` or `$.clock.every` call serves it

## HANDOVER-020 Write a Handover on Typed Clear

claudetto writes a handover on a typed `/clear`, keeps it, lets the clear run unchanged and injects it into the first request after the clear.

Given prompts `first one`, `second one`, `/clear`, `third prompt`
When the clear runs
Then the fork request carries `"effort":"low"` and is the only extra request

Given the same prompts
When the first request after the clear is sent
Then it opens with the `claudetto:handover` block once
And it holds no `first one`

## HANDOVER-021 Show Status While the Fork Writes

claudetto shows a status line through `$.ui.status` while the handover fork runs, because the clear waits on it.

Given the fork runs
When it starts
Then the status line "Writing handover…" shows until the fork returns, also when it throws

Given a pending `/clear` handover
When the clear is pending
Then it is kept in `$.store`

## HANDOVER-022 Fall Back to a Transcript Extract

claudetto falls back to a `$.session.messages()` extract at zero model cost when the fork returns `reason:'nothing-to-fork'`, throws or returns empty text.

Given a fork that returns nothing-to-fork, throws, returns empty text or fails with an API error
When the handover is written
Then it comes from `$.session.messages()` rows `{role,text,toolUses}`
And no fork cost is billed

Given a clear whose origin is plugin
When the clear runs
Then no handover is written

## HANDOVER-023 Answer Auto Compaction with the Handover

claudetto answers a `session.compact` hook with trigger `auto` or `precompute` and no `agentId` as `{messages:[handover]}`, never as `{skip}`.

Given an auto compaction with handover on
When the hook answers
Then the handover is its one message
And no summarizer request is made

Given a subagent compaction, a manual compaction, or handover off
When the compaction runs
Then it takes the built-in path through `next(e)`

Given a fork that fails or is empty
When the handover is written
Then it is the `$.session.messages()` extract, with no summarizer request

## HANDOVER-024 Read the Handover Knobs

claudetto reads knob settings keys through `$.settings.read()` and env through `$.env.get`.

Given `CLAUDETTO_DISABLE_HANDOVER` is set
When any compaction or clear runs
Then no path writes a handover

Given `CLAUDETTO_DISABLE_AUTO_HANDOVER` is set
When compactions and a `/clear` run
Then only `/clear` writes a handover

Given the knobs `autoHandoverEnabled`, `autoHandoverWindow`, `precomputeHandoverEnabled`, `CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE` and `CLAUDETTO_AUTO_HANDOVER_WINDOW`
When they are set
Then each governs the handover as its compaction counterpart does

## HANDOVER-053 Compact on the Session Model

claudetto compacts on the session model while the cache is warm and does not switch the compaction model.

Given a handover fork
When it is called
Then `$.model.fork` gets `{ prompt: FORK_PROMPT, effort: "low" }` and no model
And the fork reuses the main thread's model and cached prefix

## HANDOVER-055 Keep Manual Compact On

claudetto keeps `/compact` on and visible and passes a manual `/compact` to core through `next()`.

Given a manual `/compact`
When it runs
Then it reaches core with trigger manual and the keep line
And no claudetto hook answers or skips it

## HANDOVER-056 Measure the Summarizer Cache TTL

claudetto measures whether the summarizer request carries `cache_control` and its TTL before costing a compaction.

Given `/compact` against a fake API on 2.1.327
When the summarizer request is read
Then `cache_control` sits at `system[1]`, `system[2]` and `messages[2].content[0]`
And no request holds `ttl`, so the write is 5 m

## HANDOVER-061 Replace the Core Summary with the Handover

claudetto replaces core auto-compaction's summary with its handover by default and keeps sessions short by renewing at task boundaries, not by a session-age bound.

Given a renewal
When the first request after it is sent
Then it holds the handover and none of the old messages

Given a session above the RT-027 threshold
When a task boundary arrives
Then it renews at each boundary and at no other time
And the user's own `/clear` stays unbroken

## HANDOVER-063 Write a Current Handover without Interruption

claudetto writes a handover that is current to the working tree and never interrupts ongoing work abruptly.

Given a resumed agent
When it reads the handover
Then it finds committed and uncommitted state as it is

Given a running task
When a handover is due
Then the handover does not cut the task

## HANDOVER-067 Keep Corrections Through Compaction

claudetto appends "Keep the user's corrections, refusals, and consents word for word." after the existing instructions of each compaction through `next({...e, instructions})`.

Given a compaction
When the request is sent
Then it ends with that instruction

Given a classic `PreCompact` command hook
When a manual or automatic compaction runs
Then it prints one keep line
And it makes no model call

## HANDOVER-072 Carry a Requirement Through Three Compactions

claudetto carries one explicit requirement through three successive compactions with its own re-injected text present and no larger after the third than after the first.

Given a fixture run against a fake API that states one requirement
When three compactions are forced
Then the requirement is still stated in the context after the last one
And claudetto's injected bytes per compaction do not grow
