# Agent failures mapped to fixes that claudetto can ship

This file maps six user-reported failures to fixes that need no patch of the CLI.
Each fix uses one of these: a prompt line, an output style line, an agent description, a hook, or a setting.
Dossier files are in `external/agent-failure-dossier/`.
Claudetto files are in `plugins/claudetto/`.
Line numbers are lines of the file named next to them.

## Scope notes

- The slices `agents`, `reply`, `spec`, `styles`, and `statusline` have no `prompts.ts` at `plugins/claudetto/slices/<slice>/prompts.ts`. The read failed with "file does not exist". The slice `dry` holds only a `jscpd-config` usage text.
- The only output style file found is `plugins/claudetto/output-styles/Concise.md`. The key `outputStyle` in `plugins/claudetto/slices/setup/prompts.ts` names it.
- The dossier has no quote for "a later release". The nearest evidence is I13 in `06-autonomy-and-consent.md`.
- The user report that a side agent caught unchecked changes comes from the user message. The dossier has the same shape in I04.
- Hook facts: a Stop hook can block with `decision: "block"` and a `reason`, and it gets `last_assistant_message`. Source: https://code.claude.com/docs/en/hooks
- A Stop hook can be a `prompt` hook that asks a model for a JSON verdict. Source: https://code.claude.com/docs/en/hooks
- A plugin verdict only makes a call stricter (rule D53 in `.claude/rules/engine-facts.md`). A Stop block is stricter, so it fits.
- Dossier rule: a prose rule fails again on the same incident, and a hook or lint holds. Source: `00-INDEX.md` (cross-cutting principle 1) and `08-session-log-corpus.md` (section "The five things this corpus adds", item 2).
- Dossier rule: a text-pattern check needs known-good and known-bad fixtures from real transcripts, and it is not a unit test of prose. Source: `06-autonomy-and-consent.md` (I15, Recipe, steps 1 and 2).

## Shared fix: one Stop hook named `finish` (carries failures 1, 2, 4, and part of 3)

Mechanism: a Stop hook in a new slice. It makes a `prompt`-type verdict with `$.model.complete`.
Its cost comes from the `usage` of its own result (rule D63 in `.claude/rules/engine-facts.md`).
Input: `last_assistant_message` and the list of tool calls of the turn.
Verdict: block once per turn, with the `reason` below. The second stop of the same turn passes, so the hook cannot loop. Source for the loop guard: `02-verification-and-honesty.md` (I04, Recipe, step 1).
The hook asks the model one question:
`Does this reply leave work undone that a tool call could finish now, or does it name a cause for the pause that is not a block (a denied tool call, a missing login, an approval that only the user can give, or a payment that the user has not approved)?`
Block reason text:
`The reply lists work as paused, not measured, not fixed, or for a later release, and no block stops it. Do that work now, then reply. If a block stops it, name the block and the exact command that the user runs.`
Test it with fixtures from the corpus, not with a regex on wording. Known-bad: "Need your live runs" (`06-autonomy-and-consent.md`, I13, evidence 4). Known-good: a reply that names a sandbox denial (`06-autonomy-and-consent.md`, I13, "The legitimate side").

---

## Failure 1: finishable work paused and listed as "not measured yet"

Dossier evidence:
- `06-autonomy-and-consent.md`, I13 "Shape": "keeping a claim marked 'not verified' when a few tool calls would settle it".
- `06-autonomy-and-consent.md`, I13 "Field evidence": items kept open because an eval "costs money and is for the user" (SL 8f05b63b), and a list of "Need your live runs" that the agent then did (SL d84dc11f).
- `00-INDEX.md`, cross-cutting principle 6: "ask first" rules spread into handing back work the agent could do.

Root cause in claudetto text:
- `plugins/claudetto/output-styles/Concise.md` line 18: "Name each claim that you did not verify, with the command that verifies it." This turns an open check into a report item, and it names the command in place of running it.
- `plugins/claudetto/output-styles/Concise.md` line 13: "Only when the turn needs the user, end instead with a short numbered "What I Need from You" list". The list has no entry condition that says "after a try".
- `plugins/claudetto/agents/main.md` line 74: "Give a check to the user only when a block stops you, such as an unapproved paid run or a login." The phrase "unapproved paid run" lets the agent call any paid run a block.
- `plugins/claudetto/agents/main.md` line 122: "End each turn with what changed and what is next." The word "next" allows a next step that the agent could do now.

Proposed fix:
1. Replace `Concise.md` line 18 with:
   `Run each check that a command can run before the reply. Name a claim as not verified only when a block stopped the command, and name the block and the command.`
2. Add after `Concise.md` line 13:
   `List a task for the user only after you tried it once, or after a block stopped it. Name the try or the block in the item.`
3. Replace `main.md` line 74 with:
   `Try a check once before you give it to the user. A check is a block only when a permission rule, the sandbox, a missing login, or an approval that only the user can give stopped the try. Cost is not a block when the user already approved the run or the dry run shows a cost under the budget in the plan.`
4. Add the `finish` hook above.
Mechanisms: output style line (1, 2), prompt line (3), hook (4).
Residual risk: `06-autonomy-and-consent.md` I13 "Residual risk" says that less deferral widens the I07 and I14 surface. Keep item 3 tied to user-owned values only (see failure 6).

---

## Failure 2: older defects found and only listed ("Older issues, not fixed")

Dossier evidence:
- `06-autonomy-and-consent.md`, I13 "Shape", sub-form "ownership confusion": "the change is not mine" (SL 1213c32c, 9c0492e2). The table had a real bug.
- `06-autonomy-and-consent.md`, I13 Recipe, step 4: treat work of the same user in a prior session as in scope.
- `00-INDEX.md`, quick lookup: "'not mine' about its own earlier session's work" maps to I13.

Root cause in claudetto text:
- `plugins/claudetto/agents/main.md` line 36 says to fix an old defect as its own step. Line 37 then says: "Report code that only looks wrong, and a refactor of other code, with the reason, and ask which ones to do now." The agent files an old defect under "looks wrong", because no text defines the boundary.
- `plugins/claudetto/agents/main.md` line 35: "Rewrite only the code of this task."
- `plugins/claudetto/agents/worker.md` line 12: "Change only the code of the step." A worker cannot fix an old defect, and no text tells `main` to give that defect to a worker.
- `plugins/claudetto/agents/reviewer.md` line 12: "Keep each file as it is, and report what you find." This is right for a reviewer, but `main` has no rule to act on the report.

Proposed fix:
1. Replace `main.md` lines 36 and 37 with:
   `A defect is a case that fails or a line that breaks a rule of the project. Fix each defect that you find, also an older one, in this turn. Give it its own step with a test that fails on it, and report it apart from the task. Ask only about a refactor that no failing case needs, and give the reason.`
2. Add to `main.md` in the tools block:
   `When a worker or a reviewer reports a defect outside its step, start a new worker for it. Do not leave it in the report.`
3. Add to `worker.md` after line 12:
   `A defect outside the step stops your edit, because the plan names the step. Report the defect with its location and the failing case, and main fixes it in a new step.`
4. The `finish` hook covers the phrase "Older issues, not fixed" because it blocks a reply that lists fixable work as not fixed.
Mechanisms: prompt lines (1, 2), agent text (3), hook (4).

---

## Failure 3: a task box checked without a check

Dossier evidence:
- `02-verification-and-honesty.md`, I04 "Ticked despite the evidence": a task marked `[x]` although its subagent said "only partly done" (SL 47eff936). A narrowed scope ticked "Done" (SL 8f05b63b). Tasks ticked while the suite was red (SL 1213c32c).
- `02-verification-and-honesty.md`, I04 "What worked": a fresh-context reviewer found defects after the suites were green, and "Verify" clauses on each task kept tasks unchecked until live evidence came (SL 7f324ada).
- `swe-best-practices.md`, B3-15: keep task lists as structured data with pass or fail flags. B3-22: a verifier apart from the producer.
- `swe-worst-practices.md`, W3-15 and W3-22: free-form progress lists that the agent rewrites, and self-grading.

Root cause in claudetto text:
- `plugins/claudetto/slices/handoff/prompts.ts`, in `CHANGE_HEADER`: "Each checked task is done and verified, so run its check again only when the user asks." This line tells the next session to trust a box. A wrong box then stays wrong.
- Same constant: "Only a checked task or a passed check is done." A checked task counts as proof by itself.
- `plugins/claudetto/agents/main.md` line 66 says to call a part done only after a check passed. It is a prose rule, and it does not mention the boxes of `tasks.md`.
- `plugins/claudetto/slices/setup/prompts.ts`, key `CLAUDE_CODE_TODO_REMINDER_MODE` is "off", and the `permissions.deny` list holds `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate`. So the harness gives no second record of task state.

Proposed fix:
1. Replace the last two lines of `CHANGE_HEADER` with:
   `A task is done when its box is checked and a passed check of that task is in the list above. A box with no passed check is open, so run its check before you build on it.`
2. Add a PreToolUse hook `box` on `Edit` and `Write` of a `tasks.md` file. It compares the boxes in the old text and the new text. For each box that changes from `- [ ]` to `- [x]`, it needs a passed check of that task id in the session record that `CHANGE_HEADER` already prints as "Passed checks". When no check is there, it denies with:
   `The box for task <id> has no passed check in this session. Run the check of task <id>, then check the box.`
   A deny is stricter, so the engine rule D53 allows it.
3. Add to `main.md` after line 66:
   `After the last box of a change is checked, start a reviewer with the diff and tasks.md. The reviewer lists each checked box that no change or no check supports.`
4. Add to `reviewer.md` after line 12:
   `For each checked task, find the line of the diff or the check output that supports it. Report each task with no support.`
Mechanisms: hook (2), prompt line (1, 3), agent text (4).
Residual risk: the hook proves a check ran, and it does not prove that the check tests the task. The reviewer in item 3 covers that gap. Source: `02-verification-and-honesty.md` I04 "Residual risk".

---

## Failure 4: useful changes deferred to "a later release"

Dossier evidence:
- No direct quote in the dossier. Nearest: `06-autonomy-and-consent.md` I13 "Shape": "asking for a decision the user's stated goal already settles", and Recipe step 1 "Try once before handing off".
- `01-grounding-and-memory.md`, I01: the agent builds its release claims from a generic prior in place of the state of the repository (SL dce7cae9). In claudetto the state says the release in progress is the one without a tag.

Root cause in claudetto text:
- `plugins/claudetto/agents/main.md` lines 29 to 31 teach the agent to read the release state from the manifest and the tags. They give no rule on what belongs in the release in progress. The agent then defers by calendar, and no text bans that.
- `main.md` line 37: "ask which ones to do now". The word "now" frames the rest as "later".
- `Concise.md` line 12: "End on what is next." A next release is a "next".

Proposed fix:
1. Add to `main.md` after the release-state lines:
   `A useful change that fits the request or the open plan goes into the release in progress. Defer a change only when it needs a value that the user owns, an approval that only the user can give, or a fact that you cannot get. Name that reason in the report.`
2. The `finish` hook asks for the reason when the reply holds a deferral ("later release", "follow-up", "future work") with no named reason of that kind.
3. Optional check in `reviewer.md`: `Report each change that the author left out for a later release with no reason of the kinds above.`
Mechanisms: prompt line (1), hook (2), agent text (3).

---

## Failure 5: no subagents, or the wrong one

Dossier evidence:
- `04-engineering-delegation-and-cost.md`, I11 Recipe step 1: "Use a single agent unless the task decomposes into parts that share little context". Counter-evidence in the same file: one user found Opus 5.5 alone best (1wt9g4q), and 50 subagents for a small job was a failure (1wvi5ar). So the fix must route, and must not force.
- `02-verification-and-honesty.md`, I04 "What worked": a fresh-context reviewer found 4 defects after 611 passing tests (SL ad68c376), and a parallel read-only reviewer found 7 parser defects (SL 8f05b63b). This is the strongest case for a default `reviewer`.
- `08-session-log-corpus.md`, "Safeguards that held": orchestrator re-verification and fresh reviewers caught real defects.
- `04-engineering-delegation-and-cost.md`, I11 Recipe step 2: parallel workers need their own worktrees and disjoint files.
- Official page, "Subagent orchestration": Claude "delegates appropriately without explicit instruction", and an overuse note applies "if you're seeing excessive subagent use". Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Official sub-agents page: "Claude uses each subagent's description to decide when to delegate", and "include phrases like 'use proactively'". Source: https://code.claude.com/docs/en/sub-agents

Root cause in claudetto text:
- `main.md` line 95: "Delegate a read only when it is larger than the start cost of a subagent." This is a damping text for overuse. The failure here is underuse.
- `plugins/claudetto/slices/prompt/prompts.ts`, in `TOOL_AGENT`: "Do a small task yourself." Same bias.
- `main.md` has no routing table. The tools block never names `scout`, `worker`, `reviewer`, or `researcher`.
- The descriptions have no trigger. `worker.md`: "Use for one planned edit step with its check." `reviewer.md`: "Use for a fresh review of a diff against its plan." `scout.md`: "Use for a read-only search over many files that returns paths and lines." `researcher.md`: "Use for web research that goes to a report file." None says "use proactively" or names the moment.
- `plugins/claudetto/slices/setup/prompts.ts`: the `permissions.deny` list holds `Agent(general-purpose)`, `Agent(Explore)`, `Agent(Plan)`, and others. The env keys `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` is "1" and `CLAUDE_CODE_FORK_SUBAGENT` is "0". So the four claudetto agents are the only ones left. A call with no fit has nowhere to go but the main thread, and the wrong pick has no cheap exit.

Proposed fix:
1. Replace `main.md` line 95 with a routing block:
   `Route work by kind. Use scout for a search over many files. Use worker for one planned edit step with its check. Use reviewer for a fresh review of a finished diff against its plan. Use researcher for web research that goes to a file. Do a single-file edit or a short read yourself.`
2. Add to `main.md`:
   `Start the workers of steps that touch other files in the same turn, each with isolation worktree. Start a reviewer before you report a finished part. The reviewer gets the diff and the plan, not your summary.`
3. Change the agent descriptions (keep them short, the sub-agents page asks for short descriptions):
   - `worker`: `Use proactively for each planned edit step with its check. The default agent for a call with no type.`
   - `reviewer`: `Use proactively after a part is finished, for a fresh review of its diff against its plan.`
   - `scout`: `Use proactively for a read-only search that spans many files, and return paths and lines.`
   - `researcher`: `Use proactively for a web question that needs sources, and write the report to a file.`
4. Edit `TOOL_AGENT` in `prompt/prompts.ts`: replace "Do a small task yourself." with `Do a single-file edit or a short read yourself, and use an agent for the rest.`
5. Setting: keep the denies in `setup/prompts.ts`. They remove the wrong-type choice. Add no new env key.
6. Hook (optional): a Stop check that blocks once when the turn changed files, and no `reviewer` call is in the tool calls of the turn. Reason: `Start a reviewer on the diff before you report.` Skip it for a turn that changed only comments or docs.
Mechanisms: prompt lines (1, 2, 4), agent descriptions (3), setting (5, no change), hook (6).
Risk: more delegation raises cost. Source: `04-engineering-delegation-and-cost.md` I11 and I12. Keep the cap in `main.md`: one worker per disjoint file set.

---

## Failure 6: paid checks interleaved with work, so the agent stops to ask

Dossier evidence:
- `06-autonomy-and-consent.md`, I13: "Inflated cost as the reason to ask". A session filled to 94% of its context cost $2.88 the next day (SL ad68c376, SL d84dc11f). Recipe step 3: state the cost as a number from a dry run. Step 6: bundle the real decisions into one question with a recommendation and a default.
- `04-engineering-delegation-and-cost.md`, I12: serial scripts and redundant baseline sessions (SL a481f295).
- `02-verification-and-honesty.md`, I06 Recipe step 1: ask only when the answer changes something costly to undo.
- `swe-best-practices.md`, B5-5: ask when ambiguous and expensive, and proceed with stated assumptions when cheap to redo.

Root cause in claudetto text:
- `main.md` line 70: "Run the full checks once for each finished part." The unit is each part. So a paid full check comes after every part, and so does the ask.
- `main.md` line 81: "Each approval covers one action, so ask again for the next one." A run of paid checks becomes a run of asks.
- `main.md` line 111: "Ask each decision of the user with `AskUserQuestion`." One question for each decision.
- `main.md` line 114 says "Do the agreed work straight through", but it has no order rule, so a paid check can sit between two edits.
- `Concise.md` lines 13 to 16 give the agent a ready "What I Need from You" list, which invites a stop at each check.
- `plugins/claudetto/slices/setup/prompts.ts`: `permissions.defaultMode` is "default". A paid command then needs a prompt on each call unless a rule allows it.

Proposed fix:
1. Add to `main.md` (working block):
   `Order the work: edit first, test later. Make all the edits of the plan with only the fast checks of the changed files. Then run the full checks. Collect each check that costs money or needs the user in one list, and ask once, at the end of the edits.`
2. Replace `main.md` line 70 with:
   `Run the full checks once for the finished plan, and again only for a part that you changed after a failure.`
3. Add to `main.md` after line 81:
   `One question may hold many approvals. Ask the approvals of one stage together, with the cost of each from a dry run and a recommended default.`
4. Setting (needs user consent, because the user owns the permission list per `06-autonomy-and-consent.md` I14 Recipe step 2): give the user the exact allow rule for the paid command in `claudetto-setup` output, for example `Bash(just eval *)`. Do not write it without the user. Source for the consent rule: `06-autonomy-and-consent.md` I14.
5. The `/goal` slice (`plugins/claudetto/slices/goal/prompts.ts`, `START`: "must exit 0. Work until it does.") already carries "work first". Point `main.md` to it: `For a long plan, set the goal check, and work until it exits 0.` The key `modelProposedGoals` is "disabled" in `setup/prompts.ts`, so the user starts the goal.
Mechanisms: prompt lines (1, 2, 3), setting with consent (4), existing slice (5).

---

## Prompt Rewrite Rules

Each rule is one that current claudetto text breaks. Sources are the best practices page (https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) and the dossier files named.

1. Use damping text only for a measured overuse. The page puts the subagent damping prompt under "Watch for overuse".
   Offending line: `main.md` line 95, "Delegate a read only when it is larger than the start cost of a subagent."
2. Say what to do on the unclear case, and default to action. The page gives a `default_to_action` prompt.
   Offending line: `main.md` line 14, "For a question or a plan, answer and wait for the go-ahead." It has no rule for a plan that the user already approved in a file.
3. Give the reason with each rule. The rule file `.claude/rules/ste-messages.md` also asks for it.
   Offending line: `worker.md` line 12, "Change only the code of the step."
4. Verify against state, not against a claim. Source: `00-INDEX.md`, cross-cutting principle 2.
   Offending line: `handoff/prompts.ts`, `CHANGE_HEADER`, "Each checked task is done and verified, so run its check again only when the user asks."
5. Move a judgment rule up the ladder when a hook can check it. Source: `02-verification-and-honesty.md` I04 Recipe step 1.
   Offending line: `main.md` line 66, "Call a part done only when a check of that part passed in this session, because a claim with no run is a guess."
6. Two rules for one case must not conflict. Source: `01-grounding-and-memory.md` I01, "a written rule conflicted with the derived state".
   Offending line: `main.md` line 35, "Rewrite only the code of this task." against line 36 on older defects.
7. Define a word that sorts a case into "do" or "report". An open word moves work to the report.
   Offending line: `main.md` line 37, "Report code that only looks wrong".
8. Keep task state in a structured form with a check on the status field. Source: `swe-best-practices.md` B3-15. The page also says to use JSON for status data.
   Offending line: `handoff/prompts.ts`, `CHANGE_HEADER`, "Done tasks, checked in `tasks.md`".
9. Write the trigger into a description. Source: https://code.claude.com/docs/en/sub-agents
   Offending line: `reviewer.md` description, "Use for a fresh review of a diff against its plan."
10. Ask only when the answer changes something costly to undo, and ask in one batch. Source: `02-verification-and-honesty.md` I06 Recipe step 1, `06-autonomy-and-consent.md` I13 Recipe step 6.
    Offending line: `main.md` line 81, "Each approval covers one action, so ask again for the next one."
11. Do not turn an unverified claim into a report item when a command can verify it. Source: `06-autonomy-and-consent.md` I13 Recipe step 1.
    Offending line: `Concise.md` line 18, "Name each claim that you did not verify, with the command that verifies it."
12. Do not end the reply on a hand-back with no try. Source: the page, "Context awareness and multiwindow workflows" ("complete tasks fully") and `06-autonomy-and-consent.md` I13.
    Offending line: `Concise.md` line 13, "Only when the turn needs the user, end instead with a short numbered "What I Need from You" list".

## Order of work

1. Edit prompt lines and descriptions (failures 1, 2, 4, 5, 6). No risk of a hook loop.
2. Ship the `box` hook (failure 3), because it makes the check mechanical.
3. Ship the `finish` hook last, with fixtures from `06-autonomy-and-consent.md` I13 and I15, so it does not pin wording.
