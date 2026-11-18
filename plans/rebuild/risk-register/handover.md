# Handover Risks

## Handover

- [x] **RISK-119** The code-built handoff drops a user statement older than 12 turns.
  Category: product.
  Cause: the baseline plugin 0.3.0 (`src/blocks/handoff/handoff.ts:6, 122-140`) keeps only the last `TURNS = 12` turns under Current state and writes `couldNotRead()` for Standing instructions and Decisions log. At `088a227c`, `plugins/claudetto/hooks/features/compaction/handoff.ts` holds `TAIL_STEPS = 3` and no `couldNotRead`, so the 12-turn cause was not re-checked there.
  Event: all six 2026-11-05 handoffs (08-27-39, 08-46-08, 09-07-17, 09-37-51, 11-59-23, 13-51-24) hold "Code could not read the standing instructions from the transcript." and the same for Decisions log; none names the deletions. At 08:28:39 the assistant called the deletions something that "need your attention first"; at 13:56:10 a goal draft said "you haven't yet confirmed they're yours". Compaction is not the loss point.
  Consequence: the user repeats a standing statement; the user said this problem should not exist in 0.4.0.
  Likelihood: 4. Impact: 4.
  Existing controls: none; the statement rode in user-pasted STATE blocks on 2026-11-04 so each turn carried it.
  Response: mitigate.
  Actions: carry human-origin standing statements into every handoff (task 5.19).
  Trigger: a handoff that holds "could not read the standing instructions".
  Owner: handover.
  Status: closed; claude 2.1.327, 2026-11-18, `git ls-files plugins/claudetto`: no code-built handoff remains; the fork writes the handover and the extract fallback passes "extract keeps user prompts and the last answer" (claude plugin test).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3201.

- [x] **RISK-120** Auto-compaction fires mid multi-file edit and the summary drops file paths.
  Category: handover
  Cause: Auto-compact triggers while the context is full of raw tool output in the middle of a multi-file edit.
  Event: Reported in two threads: the summary drops file paths; auto-compaction fires at bad times.
  Consequence: Work resumes without the files it was editing.
  Likelihood: 2
  Impact: 3
  Existing controls: User decision, recorded in the 2026-11-17 handover (day of decision not recorded): handover replaces core auto compaction by default; manual /clear stays and writes a handover first.
  Response: mitigate
  Actions: Compact by hand at a finished unit of work or at seams between large steps, with focus text (keep rules, directories left); never let auto-compaction fire mid-step.
  Trigger: An auto compaction while an edit list is open.
  Owner: handover
  Status: mitigated; `claude plugin test plugins/claudetto`, claude 2.1.327, 2026-11-18: "auto compaction gets the handover and no core call" and "a finished last task above 70k renews" pass. Core auto compaction can still fire mid-step when no boundary came.
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xubp1v-is-compacting-still-bad-practi-20261113T000651Z.md:223 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xubp1v/is_compacting_still_bad_practice/>); external/2026-11-16/reddit.com-r-claudecoding-comments-1xw8w8b-tldr-are-people-here-actuall-20261115T135227Z.md:95 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xw8w8b/tldr_are_people_here_actually_using_skills_via/>).



- [x] **RISK-123** A stale or abrupt handoff misleads or interrupts ongoing work.
  - Category: product.
  - Cause: the handoff file is out of date and badly built; the next agent takes it as the work order.
  - Event: a resumed agent reads a handoff saying V3 is not committed when it is, and a handoff interrupts running work (seen in OpenJoystickDriver sessions).
  - Consequence: lost progress and late interventions.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: baseline features/compaction/handoff.ts (partial).
  - Response: mitigate.
  - Actions: [REQ-HANDOVER-063](../prd/handover.md) (handover is current and never interrupts work).
  - Trigger: a handoff older than the working tree state.
  - Owner: handover
  - Status: closed; renewal runs only at a task boundary, never mid-task, and every handover ends with git state read at that moment (test: plugins/claudetto/hooks/handover/renewal.test.ts "an open task is no boundary"; plugins/claudetto/hooks/handover/compact.test.ts "auto compaction gets the handover" checks `git HEAD: abc1234`; claudetto plugin test 59 pass, 2026-11-19).
  - Source: reported, user, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8192).


- [x] **RISK-125** A handover written mid-step reports finished work as not done.
  Category: handover.
  Cause: the handover summary is written from the agent state before the agent's last tool calls finished. The summary of the context reset says an append and commit are still to do, but the agent had already run them.
  Event: the next context follows the stale Next step and repeats the append or commit. In the probe the agent had to check the git log first and found the work done in four handovers in a row (axis1 to axis4).
  Consequence: a duplicate write or commit, or an extra turn spent on a check.
  Likelihood: 4. Impact: 2.
  Existing controls: the summary itself advised a git log check before acting, written by the agent after the third stale handover.
  Response: mitigate.
  Actions: claudetto shall write the handover after the last tool result of the turn, and its Next section shall tell the next context to confirm each step against the repo state (git log, git status) before it repeats the step.
  Trigger: a handover whose Next step names a command that the agent's last tool calls already ran.
  Owner: handover.
  Status: closed; the renewal fires after the turn ends at a task boundary or commit, so the fork sees every finished call, and the git tail records the commit (test: plugins/claudetto/hooks/handover/renewal.test.ts "a git commit is a boundary"; 59 pass, 2026-11-19).
  Source: observed in transcript, 2026-11-15, ~/.claude/projects/-private-tmp-claude-501-ojd-compact-BZJK/7fa6685a-9c72-4275-8c9c-39e7865bd61e.jsonl:51, :103, :152, :201.

- [ ] **RISK-126** A handover carries a cut-off file read and loses the last line.
  Category: handover.
  Cause: the Read of a large file (data3.txt) was cut off at line 10 in the context, so the summary has only the first line and no last line. The task needed the first and last line quoted.
  Event: after the context reset the file must be read again, and the summary records "read once, partial" as state.
  Consequence: an extra turn per reset to read the file again; in three runs the third file was not finished before the reset.
  Likelihood: 4. Impact: 2.
  Existing controls: the summary marks the read as incomplete and lists a re-read as the first Next step.
  Response: mitigate.
  Actions: claudetto shall have the handover name each tool result that was cut off and the fact that is still missing from it, so the next context reads it again at once.
  Trigger: a handover State line that says a read was incomplete.
  Owner: handover.
  Status: open.
  Source: observed in transcript, 2026-11-16, ~/.claude/projects/-private-tmp-claude-501-probe-compact/7612dad0-5b4d-4d11-9751-57fda5939b24.jsonl:62; ~/.claude/projects/-private-tmp-claude-501-probe-compact/c6cabb2f-656b-44a9-85e2-f280e7b53da2.jsonl:62; ~/.claude/projects/-private-tmp-claude-501-probe-compact/cbfe70f3-0670-44b6-abae-b709923f2f43.jsonl:65.

## Delegation


## Verification and Honesty


## Agent Habits


## Context Leakage


## Context Loss and Handover

- [x] **RISK-131** Context decay and rot: long context drops earlier instructions and facts, and a session resumes from a wrong or empty picture.
  - Category: context.
  - Cause: long-context drift; compaction omits valuable context and amplifies hyperfocus; context fades or stays wrong.
  - Event: long-context drift drops earlier instructions and skills; the agent assumes from names instead of reading implementation; forgets by the third reply (Haiku); forgets after compaction (rejected options, tried approaches re-offered 7 of 10 times, author's test, measured); says "extensive work from yesterday" for two-hour-old work; claims it never did a read it announced near half context; a new session re-adds killed design elements; "forgets everything" so the user re-explains the stack each session (1wq0dnm, score 36); the agent "quietly drifts" when thinking blocks are invalidated (1wnxe0v); a Cursor rollback does not restore conversation state; compaction-induced reconvergence failure; codex#37448 summary-of-summary; in 2,518 trajectories the first mistake survives the whole trajectory (2609.17930).
  - Consequence: a wasted session; wrong re-work; user re-work.
  - Likelihood: 5
  - Impact: 3
  - Existing controls: `plugins/claudetto/hooks/features/compaction/handoff.ts` (partial at 088a227c); plan line 1079 holds only the summary-of-summary count.
  - Response: mitigate.
  - Actions: a handoff doc kept current on disk and proofread; `/clear` at a milestone while the cache is warm; skill injection at session start and after compaction; auto-compaction 350k-500k; record decisions with reasons; short project-facts notes; handover schema (REQ in the handover block); a scout method for hidden failures (a slice 4 candidate).
  - Trigger: a session past half the window, or any compaction; a user restating the stack.
  - Owner: handover
  - Status: closed; the session renews from a handover above 70k tokens at a task boundary, so the context never grows to the length where it decays (test: plugins/claudetto/hooks/handover/renewal.test.ts "a finished last task above 70k renews"; 59 pass, 2026-11-19).
  - Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:28; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:134; plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c. The auto-compaction 350k-500k setting conflicts with the settled rule that handover replaces core auto compaction by default (user decision, 2026-11-16 05:57 UTC, hand over when the window is reached, then /clear through the Mod API and resume (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408)); the cure keeps handover and `/clear`; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:140-146.

- [x] **RISK-132** Rejected option amnesia: the agent re-proposes an approach the project already rejected.
  Category: context.
  Cause: compaction and plain handoffs keep decisions and drop rejected options with reasons; the rationale is in nobody's context.
  Event: the agent re-proposes an approach or simplification the project already rejected, or reopens decided work (7 of 10 sessions without the file); the next session re-proposes it. "Keep-the-Why" test: 10 of 10 sessions declined the rejected change with a context folder, 7 of 10 offered it without (measured, author, hand graded; 20 sessions).
  Consequence: a wasted session; decided work reopened.
  Likelihood: 4. Impact: 3.
  Existing controls: handoff at baseline (`plugins/claudetto/hooks/features/compaction/handoff.ts`, partial).
  Response: mitigate.
  Actions: a skill/hook that makes the agent read a `context/` rationale folder before simplifying code with a scar and write the why when a decision lands; handoff or decision-log hook requiring a rejected-options section and a PreCompact flush; SessionStart on compact re-reads it; compaction handoff injecting Decisions and Ruled out.
  Trigger: a simplification of code that carries a recorded decision.
  Owner: handover. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:28; external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:105.

- [x] **RISK-133** Compaction on session age, not cache state.
  - Category: Product.
  - Cause: plugins/claudetto/hooks/features/compaction/handoff.ts:67-70@088a227c sets HANDOFF_MS to 59 minutes and compacts when 59 minutes have passed since session start or the last compaction. That measures age, but the cache is refreshed each time cached content is used, so age never cools it; an idle gap of the TTL or longer does; handoff.ts:67-83 counts age since session start or last compaction, and the cache is refreshed by use, so age does not cool it.
  - Event: A warm session is cycled and a cold session is kept; A session is cut at 59 minutes while the cache is warm.
  - Consequence: A warm cache is thrown away and the next request pays its prefix uncached, or a cold prefix stays and pays uncached anyway; A needless clear and lost context.
  - Likelihood: 4
  - Impact: 3
  - Existing controls: None; the age rule is the control at 088a227c.
  - Response: mitigate.
  - Actions: Renew only at a task boundary with the context above the break-even size (RT-027, ADR-0178). Never trigger on session age or an idle gap.
  - Trigger: A handover starts away from a task boundary or below the break-even size, or a task boundary above it passes with no renewal.
  - Owner: handover
  - Status: closed; a refusal is a user row, and both the fork's Constraints section and the free extract carry every user row, with prior handovers carried whole (test: plugins/claudetto/hooks/handover/compact.test.ts "three compactions in a row carry a stated requirement"; 59 pass, 2026-11-19).
  - Source: plugins/claudetto/hooks/features/compaction/handoff.ts:67-80@088a227c; probe session-cycle, claude 2.1.325, 2026-11-16; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031) (read of the 088a227c code, as the old plan records it; cache refresh on use: verified against the API docs read 2026-11-18, "The cache is refreshed for no additional cost each time the cached content is used", https://platform.claude.com/docs/en/build-with-claude/prompt-caching, section "How prompt caching works"; the docs state the API behavior, not a Claude Code build offset).

- [x] **RISK-134** Auto compaction lands mid-task and compacts late
  Category: handover.
  Cause: built-in auto compaction fires at a fixed fill, not at a task boundary, and on 1M-window models waits until near 967K.
  Event: compaction cuts a task in half, or a request carries a huge context.
  Consequence: re-read context and spend.
  Likelihood: 2 (two reports). Impact: 3.
  Existing controls: the compaction path at 088a227c.
  Response: mitigate.
  Actions: let handover replace auto compaction at a self-chosen moment (74% trigger in the handover block). Measurements to cite: 78 of 82 auto-compactions landed mid-task and compacting at a self-chosen moment re-read about 30% less context (replay of own sessions, a different poster from plan line 998's 47/46); compacting at 400K cut cost per request by 43% (later 38%), the author's own measure with no method.
  Trigger: a compaction notice mid-task.
  Owner: handover. Status: mitigated; `claude plugin test plugins/claudetto`, claude 2.1.327, 2026-11-18: renewal tests pass (a boundary above 70k renews, an open task is no boundary) and the compact hook answers automatic compactions with the handover.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:150; openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:153.

- [x] **RISK-135** Handoff prints empty Git line in a repo with no commits.
  - Category: Product.
  - Cause: git rev-parse --short HEAD fails in a repo with no commits, and the handoff text interpolates its output; The handoff template runs git with no commit to name.
  - Event: The handoff's `Git now:` line prints empty backticks; A line of empty backticks.
  - Consequence: A handoff with a blank git state; the resumed agent cannot tell a clean repo from a failed read; A misleading handoff.
  - Likelihood: 3
  - Impact: 1
  - Existing controls: None.
  - Response: mitigate.
  - Actions: Print `no commits` when git rev-parse --short HEAD fails; Print no line or the state of the empty repo.
  - Trigger: A handoff written in a repo with no commits shows empty backticks; A handoff in a repo with no commit.
  - Owner: handover
  - Status: closed; probe, claude 2.1.327, 2026-11-18, `bun -e 'compose("body","","")'`: prints "git HEAD: unknown" and "(clean)", not an empty line.
  - Source: plugins/claudetto/hooks/features/compaction/handoff.ts:57-58@088a227c; plugins/claudetto/hooks/features/compaction/texts.ts:24@088a227c; probe F transcript, claude 2.1.325, 2026-11-16; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).


## Agent Conduct

- [x] **RISK-137** Agent keeps working after it asks the user for a step.
  - Category: agent conduct, product.
  - Cause: the Stop check on uncommitted files (plugins/claudetto/hooks/slices.ts:105-154) blocks a stop even when the reply hands a step to the user; the root prompt rule "Do the doable work first" also pushes on.
  - Event: after a reply ending with "What I Need From You", the agent writes a second reply and runs a command unasked.
  - Consequence: work built on a step the user has not done. Likelihood: 1; the user's turn is overrun; a critical conduct breach in the user's view; the user's turn is overrun; a critical conduct breach in the user's words.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: grader `doable_step_left` (read, not run).
  - Response: mitigate
  - Actions: stop and wait for the user's step; [REQ-REPLY-109](../prd/reply.md) (a reply that hands the user a step ends the turn; no Stop check blocks it).
  - Trigger: a tool call after a request for a user step; a tool call or reply after a user-step section.
  - Owner: handover
  - Status: closed; claude 2.1.327, 2026-11-18, grep of plugins/claudetto: the only Stop handler (renewal.ts:41) returns next(e); no Stop check blocks a stop that hands the user a step.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:40; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1401; reported, user, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1401); observed in transcript, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1401) (reported, user, 2026-11-10; observed in transcript, 2026-11-10).

- [x] **RISK-138** A handoff cuts a task in the middle and the next session lacks what happened.
  - Category: product
  - Cause: The handoff fires at a random point in a task; its In Progress, Key Files, Gotchas, and Open Questions sections hold 'None given'; the new session does not read the prior transcript; the handoff fires at a fixed point, not at a step end.
  - Event: The user says the work was in the middle of something and the handoff came at random, and shouts that the agent must read the previous session; the user reports that the handoff abruptly interrupts ongoing work.
  - Consequence: Work repeated or dropped; an extra turn; a lost step and a resume cost.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: The handoff names the full transcript path and the next step; the REQ-HANDOVER fork tail fix after a mid-turn compaction.
  - Response: mitigate
  - Actions: claudetto shall fill In Progress with the task under way and the next step, and tell the new session to read the transcript tail before it acts; the REQ-HANDOVER item "not interrupt ongoing work".
  - Trigger: A handoff has an empty In Progress while a task was under way; a handoff while a tool call is open.
  - Owner: handover
  - Status: closed; the cause (a fixed-point trigger) left with the 59-minute rule; `claude plugin test plugins/claudetto`, claude 2.1.327, 2026-11-18: "an open task is no boundary" and "background work holds the boundary" pass.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10 (handoff of 2026-11-12, In Progress: None given); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:8710 (handoff of 2026-11-15, user corrections); reported, user, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369); observed in transcript, 2026-11-12: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:6530.

## Hooks, Gates, and Notices

- [x] **RISK-139** Pin hook re-injects constraints the user never gave.
  - Category: Conduct and hook text
  - Cause: The pin hook keeps constraints (do not delete a branch, leave a file alone) that an earlier summary invented.
  - Event: Each prompt carries the invented constraints again, after the user said to commit those files.
  - Consequence: The agent refuses ordered work and the user repeats the order.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: None found.
  - Response: mitigate
  - Actions: Pin only text that a user message states, and drop a pin the user overrides.
  - Trigger: A pinned constraint with no user message behind it.
  - Owner: handover
  - Status: closed; claude 2.1.327, 2026-11-18, `grep -rniE "pin" plugins/claudetto/hooks` (non-test): no hit, so no pin hook exists.
  - Source: observed in transcript, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:1048.

## Handover, Memory, and Notes

- [x] **RISK-140** Stale git state from before a compaction is reported as current.
  - Category: Conduct
  - Cause: The compaction summary says 'ahead 3, not pushed', and the agent repeats it without a new check.
  - Event: The agent says nothing is pushed after the push happened; the user sees no commits to push in the editor.
  - Consequence: A false status report and a correction turn. The user ordered it recorded as a fault.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: None found.
  - Response: mitigate
  - Actions: Run git status -sb before each statement of what is pushed or committed.
  - Trigger: A status claim taken from a summary and not from a command in the turn.
  - Owner: handover
  - Status: closed; `compose` appends git HEAD and status read when the handover is written, and `unwrap` drops the git tail of a carried handover so stale state is never repeated (plugins/claudetto/hooks/handover/text.ts; test: plugins/claudetto/hooks/handover/compact.test.ts "three compactions in a row" holds size equal across compactions; 59 pass, 2026-11-19).
  - Source: observed in transcript, 2026-11-09; reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:977; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:1003.

- [x] **RISK-141** A handoff note drops a constraint and the next session trusts it.
  Category: agent behaviour.
  Cause: the note is written when the window is full, when the model is most likely to forget a constraint.
  Event: one handoff dropped the pinned API version and the new session coded against another; a second user saw a session re-pick an API version already moved off.
  Consequence: code written against the wrong version.
  Likelihood: 2. Impact: 3.
  Existing controls: plugins/claudetto/hooks/features/compaction/texts.ts:1-30@088a227c asks the handoff for Decisions with reasons and Ruled out.
  Response: mitigate.
  Actions: commit before the handoff and skim the summary; keep an architecture file that lists pinned versions with the reason for each.
  Trigger: a handoff with no pinned versions while the project pins any.
  Owner: handover.
  Status: closed; a stated requirement survives three successive handovers (test: plugins/claudetto/hooks/handover/compact.test.ts "three compactions in a row carry a stated requirement"; 59 pass, 2026-11-19).
  Source: external/2026-10-27/reddit.com-r-claudecode-comments-1x776ms-auto-handoff-are-the-best-new-20261026T134539Z.md:230; external/2026-10-27/reddit.com-r-claudecode-comments-1x776ms-auto-handoff-are-the-best-new-20261026T134539Z.md:236; external/2026-10-27/reddit.com-r-claudecode-comments-1x776ms-auto-handoff-are-the-best-new-20261026T134539Z.md:240 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x776ms/auto_handoff_are_the_best_new_feature/>).




## Safety Classifier False Positives


## Memory Absolutism


## Stale Handoff Base

- [x] **RISK-147** A handoff states tree or git state the agent never checked.
  - Category: agent failure.
  - Cause: the handoff was written without checking the tree; a handoff carries state from before compaction or is cut against a clone of HEAD while the real tree sits dirty: for seven sessions the architect cut handoffs against a clone while the real tree sat dirty on the user's machine, and a helper removed in session 1 was still cited later; another handoff named HEAD, the unpushed count, and the file count unchecked.
  - Event: it said no file changed and HEAD was `ca6b6286` with `openspec/` deleted, while HEAD was `088a227c` and the tree was clean; it set an order for the next session, copied the user's words verbatim, and left the deleted `openspec/` unmentioned in its first view; a handoff is written against a tree or git state that differs from the working tree.
  - Consequence: the next session follows a false state and a standing order the user never gave; the implementer works on false premises; a wrong result shipped; a wasted session.
  - Likelihood: 1
  - Impact: 4
  - Existing controls: Corrected: at 088a227c the forked handoff appends the real state: `compaction/handoff.ts:55-56` runs `git rev-parse --short HEAD` and `git status --short`, and `HANDOFF_OPENING` (`compaction/texts.ts:19-24`) adds "Git now: HEAD, status". The body is model-written with no tool (`HANDOFF_PROMPT`, `texts.ts:5`), so nothing compares it with the real state, and hand-cut architect handoffs have no control; a `git status -sb` read-back is absent at 088a227c (grep found no hit).
  - Response: mitigate.
  - Actions: claudetto shall write a handover from checked state (HEAD and a git status read at write time), as facts and open items without an order for the next session, and without verbatim user quotes; commit each session's tree to a branch and push it at session end, so the next handoff is cut against the real tree (two handoffs since had zero slips, reported); before the first edit a cheap subagent checks the handoff's premises against the tree (planned, not yet run by the poster); the handoff reads git state on resume.
  - Trigger: a handover file written; a handoff cut from a clone of HEAD while the working tree is dirty, or a handoff that names git state with no git call in the turn.
  - Owner: handover
  - Status: mitigated; claude 2.1.327, 2026-11-18, `claude plugin test plugins/claudetto` ("compose appends the git state" passes) and writer.ts runs `git rev-parse --short HEAD` and `git status --short` at write time. No test stubs the git calls.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4121; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4276; observed in transcript, 2026-11-16; external/2026-10-30/reddit.com-r-claudeai-comments-1xftq1a-using-fable-51-as-architect-opus-20261029T124053Z.md:102 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xftq1a/using_fable_51_as_architect_opus_55_in_claude/>); openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:65 (reported, one user).

## Skipped Notes Index


## Concurrent Sessions Share Nothing


## Compaction and Memory

- [x] **RISK-150** Compaction loses old decisions.
  - Category: context loss.
  - Cause: Each compaction summarises the previous summary, so decisions die by generation, not by age. One user's logs show auto-compact at 967k, 972k, and 983k context keeping 11k-15k, about 1.3% surviving per pass. After 62 compactions in one Opus 5.5 session, the summary held 0 of 12 decisions from about 10 compactions back; memory files held about 8; 4 existed nowhere (a positioning line, a backend cleanup call, a tracked bug cause, a reply rule); the recent stretch kept 20 of 21; a summary-of-summary paraphrases decisions; after 62 compactions it kept 0 of 12 decisions from about 10 compactions back and 20 of 21 of the recent stretch; memory files held about 8 of 12 (measured, one poster, Opus 5.5, desktop).
  - Event: Old decisions vanish from the working context; the agent re-opens a rejected approach or drops a decision.
  - Consequence: Rejected options are re-offered and settled work is redone; wasted session; a wrong result shipped.
  - Likelihood: 3
  - Impact: 4
  - Existing controls: handover compaction feature at 088a227c (plugins/claudetto/hooks/features/compaction); `plugins/claudetto/scripts/pre-compact.ts` via hooks.json at 088a227c (partial); post-compact re-read gate missing.
  - Response: mitigate.
  - Actions: Keep decisions in a file re-read fresh, which compaction cannot erode; hand-kept `DECISIONS.md`; decision cards with line number plus verbatim quote pulled from transcript; fresh sessions with a decision log; context under about 400k; re-read the durable "why" file after any compaction; a SessionStart hook (fires on compact and resume) printing a file of about 4 bullets; a PreCompact hook flushing state and plan to memory. One-liners fit a log; decisions needing where/why or a bug cause need more than a line.
  - Trigger: A decision from before the last compaction is absent from context; any compaction in a session with logged decisions.
  - Owner: handover
  - Status: closed; the extract carries every prior handover whole and first, so decisions from earlier compactions remain (test: plugins/claudetto/hooks/handover/compact.test.ts "three compactions in a row carry a stated requirement"; 59 pass, 2026-11-19).
  - Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:50; external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:300; external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:64 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>); external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:143; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:57.

- [ ] **RISK-151** Post-compaction continuation text steamrolls plan-then-wait.
  - Category: instruction loss.
  - Cause: the pause lives only in the conversation; the summary ends with an instruction to continue the task without questions; after compaction the summary message ends with an instruction to continue the last task without asking questions (observed in the session's own summary; the post author's model self-report is weak); the text Claude Code injects after every compaction reads "Please continue the conversation from where we left it off without asking the user any further questions. Continue with the last task that you were asked to work on.".
  - Event: after compaction or `/clear` Claude implements despite a plan-then-wait or investigate-only instruction, and the user's pause was lost after `/clear`; a user context estimate was treated as a trigger; an approval gate or investigation-only task turns into implementation; reported as an anecdote that it overrides plan-approval rules.
  - Consequence: unwanted edits; a wait-for-approval or no-change instruction is lost; a wrong result shipped; an agent acts without the approval a rule demands.
  - Likelihood: 2
  - Impact: 4
  - Existing controls: none at 088a227c (missing); 2.1.327: the wording is a prompt string ("without asking the user any further questions. Resume directly", chunk-m14bt1pz.js@2596525), appended when `suppressFollowUpQuestions` is set (code search "any further questions", claude 2.1.327).
  - Response: mitigate.
  - Actions: a PreCompact hook writes `awaiting approval, do not implement` state; PreCompact/SessionStart hooks write and reload a handoff file including pending pauses; SessionStart on compact re-injects it; a PreCompact hook flushing state; record "awaiting approval, do not implement" as current state in the handoff; the handover writes the open approval into the carried text.
  - Trigger: a compaction while a plan awaits approval.
  - Owner: handover
  - Status: open.
  - Source: external/2026-10-12/export-How do i stop it writing edits ahead while waiting for action-.jsonl:6 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x1htas/how_do_i_stop_it_writing_edits_ahead_while/>) (reported). The `/clear` and context-estimate details: not located; external/2026-10-17/export-Haiku 5.5 on Steroids.jsonl:7 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x5rbwy/haiku_55_on_steroids/>; weak match, the quoted continuation wording was not located in the export); chunk-m14bt1pz.js@2596525 (claude 2.1.327 binary, searched 2026-11-17); openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:11 (reported); external/2026-10-02/export-Beware of this system prompt that is automatically injected into Claude Code after every compaction-.jsonl:1 (url: <https://www.reddit.com/r/ClaudeAI/comments/1piny6t/beware_of_this_system_prompt_that_is/>).


## Ungrouped



## Product and Tooling

- [x] **RISK-155** prompt.context re-sends its block after a compaction.
  - Category: product.
  - Cause: prompt.context fires again after a compaction.
  - Event: A filler is re-sent and one turn cost /bin/zsh.24.
  - Consequence: Spend and a bloated context.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: none.
  - Response: mitigate.
  - Actions: Send the handover block once per compaction.
  - Trigger: A compaction follows a handover.
  - Owner: handover
  - Status: closed; `claude plugin test plugins/claudetto`, claude 2.1.327, 2026-11-18: "manual clear > a typed /clear runs and its handover goes out once" passes; clear.ts deletes the pending text when it sends it.
  - Source: measured, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).

- [x] **RISK-156** A handover is lost on a failed fork or a reload.
  - Category: product.
  - Cause: Module state is lost on reload; a fork can return nothing-to-fork or an error.
  - Event: The cleared session forgets.
  - Consequence: Lost context.
  - Likelihood: 3
  - Impact: 4
  - Existing controls: ADR clear-fork-failure-extract-fallback.
  - Response: mitigate.
  - Actions: Keep pending in $.store; fall back to the extract.
  - Trigger: A clear with no turn since a resume.
  - Owner: handover
  - Status: mitigated; `claude plugin test plugins/claudetto`, claude 2.1.327, 2026-11-18: "a failed fork falls back to the transcript extract" passes; clear.ts keeps the pending text in `$.store`.
  - Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).

## Conduct Faults from the Rearchitecture Sessions

- [x] **RISK-157** The handover fork misses the tool calls after the replayed request.
  Category: Claude Code fault.
  Cause: `$.model.fork` replays the last main-thread request.
  Event: a handover marks committed work as uncommitted and re-reads a file.
  Consequence: a wrong handover state.
  Likelihood: 4.
  Impact: 3.
  Existing controls: `lastCalls` in `handoff.ts` (commit 563c5fcc).
  Response: mitigate.
  Actions: the REQ-HANDOVER item on late calls; rerun the real probe with `CLAUDE_CODE_AUTO_COMPACT_WINDOW=40000`.
  Trigger: a handover whose State disagrees with git.
  Owner: handover.
  Status: closed; the renewal forks after the turn ends, so no tool call follows the replayed request, and the handover's git tail records commits from git itself rather than the fork's memory (plugins/claudetto/hooks/handover/text.ts `compose`; test: compact.test.ts "auto compaction gets the handover" checks `git HEAD: abc1234`; 59 pass, 2026-11-19).
  Source: observed in transcript, 2026-11-16: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790.

- [x] **RISK-482** A headless session never renews because the mod's clear is discarded.
  - Category: host limit.
  - Cause: under `-p`, a plugin `/clear` is dropped from the command queue and `$.session.compact` rejects.
  - Event: probes A and F on 2.1.327: "the command was removed from the queue before it ran", "the host has ended its input", "not available in a headless (-p / SDK) session yet".
  - Consequence: an unattended run grows to auto compaction with no handover.
  - Likelihood: 5
  - Impact: 3
  - Existing controls: none at 088a227c.
  - Response: mitigate.
  - Actions: [ADR-0184](../adr/0184-headless-renewal-by-driver.md): the mod catches both rejections; the driver sends `/clear` or `/compact <instructions>`.
  - Trigger: a caught rejection in the mod log.
  - Owner: handover
  - Status: closed; under `-p` automatic compaction still gets the handover (RISK-489 probe), and the driver lowers core's threshold with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=35` (threshold = min(floor(window x pct/100), window - 13000), read in `L7`, chunk-m14bt1pz.js@1992285, 2.1.327) or sends `/clear` between tasks; probe (cc-inspect `code cli`, fake API, 2.1.327, 2026-11-19): prompts `fix the parser`, `/clear`, `what was the task?` with `--plugin-dir plugins/claudetto`, and request 3 holds "Handover from Previous Session"; documented in plugins/claudetto/README.md Headless Runs.
  - Source: reports/2026-11-18-research/handover-probes/probe-f/probe.log (cc-inspect `code cli`, claude 2.1.327, 2026-11-18); reports/2026-11-18-research/handover.md Q2.

- [x] **RISK-489** A `session.compact` hook that returns its message in the wrong shape is skipped with one log line, and core runs its default summary, so the handover silently never lands.
  - Category: integration fault.
  - Cause: core accepts only `{role:"user", text, toolUses:[]}`; `{role, content}` and `{role, text}` are rejected (CTX-843).
  - Event: probe H runs 1 and 2 logged "session.compact hook skipped: returned the wrong shape" and fell back to the default summary.
  - Consequence: the handover is lost and the summarizer request is paid.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: the hook returns `{messages, tokensBefore, tokensAfter, usage}` with the accepted message shape; compact.test.ts runs it through the test kit check.
  - Response: mitigate.
  - Actions: a unit test runs the hook's return value through the same shape check; REQ-HANDOVER-023 acceptance checks the first message after a dogfood compaction.
  - Trigger: the log line "session.compact hook skipped" in a debug log.
  - Owner: handover
  - Status: closed; probe, `claude` 2.1.327, 2026-11-18, fake API stub (reports/2026-11-18-research/handover-probes/probe-h/stub.ts), `claude -p --input-format stream-json --output-format stream-json --verbose --plugin-dir plugins/claudetto`, auto trigger: the debug log reads "session.compact (auto): a hook's 2 messages stand (hooked by claudetto); core never ran".
  - Source: reports/2026-11-18-research/handover-probes/probe-h/run1/hook.log, run2/hook.log, probe.log.

- [x] **RISK-490** A handover that answers an auto compaction at the start of a turn drops the prompt that opened the turn.
  - Category: Defect
  - Cause: core compacts before the new prompt is answered, so `e.messages` ends with that prompt; a hook that answers with the handover alone replaces it.
  - Event: probe on claude 2.1.327 (stub reporting 195k input tokens, `CLAUDE_CODE_AUTO_COMPACT_WINDOW=200000`, stream-json prompts `first one`, `second one`, 2026-11-18): the request after the compaction held the handover and not `second one`.
  - Consequence: the model answers no prompt, and the user's request is lost without notice.
  - Likelihood: 4
  - Impact: 4
  - Existing controls: the hook keeps the messages after the last assistant message, with their engine handles, after the handover.
  - Response: mitigate.
  - Actions: test "the prompt that opened the turn stays after the handover" in `plugins/claudetto/hooks/handover/compact.test.ts`.
  - Trigger: a first request after a compaction whose last user text is not the prompt the user sent.
  - Owner: handover
  - Status: closed; the same probe after the change sent the handover followed by `second one`.
  - Source: probe, `claude` 2.1.327, 2026-11-18, `$TMPDIR/hprobe3` (stub from reports/2026-11-18-research/handover-probes/probe-h/stub.ts with input tokens 195000), command `CLAUDE_CODE_AUTO_COMPACT_WINDOW=200000 claude -p --input-format stream-json --output-format stream-json --verbose --plugin-dir plugins/claudetto`.
