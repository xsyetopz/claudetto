# Kernel Risks

## Guards

- [ ] **RISK-001** A catch site that binds no error drops a fault, so a bad answer reads as a clean reply.
  Category: kernel, error handling.
  Cause: 64 catch sites in plugins/*/hooks bind no error and drop it (parseFaults in verify.ts turned a bad answer into a clean reply).
  Event: a failure passes unseen.
  Consequence: a wrong result ships with no trace.
  Likelihood: 5 (measured count of sites).
  Impact: 4.
  Existing controls: none found for the 64 sites; plans/rebuild-curation.md:845 cites error-swallowing catch only as 36 and 38.
  Response: mitigate.
  Actions: log through $.ui.log or rethrow at each site.
  Trigger: a catch clause with no bound error in plugins/*/hooks.
  Owner: kernel.
  Status: open.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:36 (measured count).

## Verification And Honesty

- [ ] **RISK-002** Training-prior default: the agent asserts the commonest answer over repo state.
  - Category: Agent behaviour.
  - Cause: Pattern completion from training data (stale `expo eject`); no grounded state in context; a recalled fact treated as measured; the model follows the commonest answer in its training data.
  - Event: The agent asserts a default from memory over repo state: the [Unreleased] changelog, a branch or version stated from the changelog (branch dotclaude-0-28-0, repeated next day), Prettier in a Biome repo, cleanupPeriodDays 365 vs bundle 30, GNU head -z and unquoted globs on macOS zsh; the wrong target fixed when two similar files exist; one sibling fixed and the identical other left (zod-6553 $ZodCheckNumberFormat vs $ZodCheckBigIntFormat); the orchestrator relays a subagent claim unchecked; the same hosting stack (Fly.io or Hetzner) for every app (1ws94i6); "doesn't read existing code, despite being told again and again" (1wp1yht); a real new `/design` feature dismissed as an injection because of the knowledge cutoff (1ub7lxv); catalog analogues: pre-1.0 changelog ceremony, mature-code normalization, popularity-as-correctness, about 55 grounding records.
  - Consequence: A wrong default is applied to the repo; a wrong result shipped.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: the "Training-Prior Default" fault of plans/rebuild-curation.md:276@0e987414, which lists neither the hosting-stack default nor the cutoff-hoax case.
  - Response: mitigate.
  - Actions: Derive state by hook (SessionStart or UserPromptSubmit prints git branch --show-current, git describe --tags --abbrev=0, package version); a PreToolUse deny on CHANGELOG.md edits that take the version from [Unreleased]; fix the source rule; search code for the pattern you changed and fix each copy; the delegate brief says to read repo config before naming a tool; a Stop check rejects a relayed subagent claim with no command or path:line evidence; a cc-inspect surface check for settings; add the three cases; read code before a change. Research the plan lacks: confirmation bias when evidence partly matches the prior (2305.13300); opinion-based prompts plus counterfactual demonstrations raise context faithfulness (2303.11315); knowledge-conflict probes detect conflicts up to 80.65% (2510.19116); RepoGraph (2410.14684) and the SWE-agent interface (2405.15793) as navigation levers.
  - Trigger: A reply states a branch, version, or tool the repo does not show; an answer that matches the commonest stack with no look at the repo.
  - Owner: kernel
  - Status: open.
  - Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:19,36,40,41; openspec/changes/2-1-325-rearchitecture/design.md:195,224; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:26-33; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:48; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:59-62 (threads 1ws94i6, 1wp1yht, 1ub7lxv).

## Kernel

- [ ] **RISK-003** A harness change makes the agent reply with only "continue?" prompts.
  Category: kernel.
  Cause: a harness change about a week before the report.
  Event: the agent replies with only "continue?".
  Consequence: an extra turn each time.
  Likelihood: 1. Impact: 2.
  Existing controls: none found.
  Response: mitigate.
  Actions: an instruction saying the agent need not obey that part of the system prompt got around it (one user; unverified in 2.1.326).
  Trigger: a reply is only "continue?".
  Owner: kernel. Status: open.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:170 (url: <https://www.reddit.com/r/claude/comments/1xc9mw9/has_opus_55s_coding_quality_changed_recently/>).

- [ ] **RISK-004** Gate times out on every tool while the ledger read runs.
  - Category: product defect.
  - Cause: `pinCheck` (`prompt.submit/useConstraintPin/pin.ts:101-109`) awaits the Decider's ledger read of the latest message on every tool, even `Read` and MCP tools, but the hook budget is 10 s per event (clock stops only during the hook's own `next` and `$` calls) and the ledger model call belongs to `prompt.submit`'s dispatch. The fallback timeout is 20 s (`decider/fallback.ts:12`). A rejection from an aborted wait in `withinBudget` was logged as a fault.
  - Event: probe with a 15 s side-model delay: `tool.check` skipped at 10,010.9 ms, `pinCheck` waited 14,948 ms; after the fix `tool.check` took 15.8 ms. `classic.Stop` took 45,155 ms (three sequential side-model calls, inferred): 30,116 ms before and 15,194 ms after starting them together. A user also saw a confirmation dialog "The gate failed: timeout".
  - Consequence: a dialog asks the user to approve a tool call; Stop waits for the side model.
  - Likelihood: 4
  - Impact: 2
  - Existing controls: `withinBudget` waits only until the budget less 1 s; `pinCheck` passes any tool other than `Bash` and the writers at once; Stop checks start side-model calls together.
  - Response: mitigate.
  - Actions: keep the fix; log only an abort the race did not cause. The test kit cannot show the fault (an aborted `mock.clock` sleep never rejects), so the probe is the check.
  - Trigger: a hook whose wait exceeds `next.budget.remainingMs`.
  - Owner: kernel
  - Status: mitigated
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:742; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:743; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:744; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:745; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:746 (measured).

- [ ] **RISK-005** An AskUserQuestion dialog is answered without the user.
  - Category: product fault (Claude Code or hook).
  - Cause: unknown; the dialog about OpenSAD's origin was settled with no user choice, and the user's "no" followed.
  - Event: a question with options returned an answer the user did not give.
  - Consequence: the agent acts on a decision the user never made.
  - Likelihood: 1
  - Impact: 4
  - Existing controls: none found.
  - Response: mitigate
  - Actions: reproduce the auto-selection with a probe; act on the user's "no" at once.
  - Trigger: an answer with no user message after the question.
  - Owner: kernel
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1156 (reported, user, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1164 (reported, user, 2026-11-14).

- [ ] **RISK-006** A hook adds constraints the user never gave.
  - Category: product fault (hook).
  - Cause: the constraint hook adds "do not delete branch 2-1-319" and "leave alone package.json" to each user message; the pin hook matched an OpenSpec folder name after the user wrote that release 2-1-319 is out, and pinned "Do not delete branch 2-1-319" as the user's words, though no such branch exists.
  - Event: the user's issues file lists it; issues 3 and 13 happened again in the session; the agent then reported the pinned line as the user's.
  - Consequence: invented rules steer the agent; a false user constraint binds it.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: none; the task list plans a fix of the constraint hook; the pin hook lists constraints in `plugins/claudetto/hooks/texts.ts` and `pin.ts` (the agent's report names them).
  - Response: avoid
  - Actions: remove the constraint hook; no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)); until removal, a pinned constraint is a user's order and not a guess from a folder name, tested with a status line like "X is out"; no constraint ledger (settled decision).
  - Trigger: a constraint in the prompt that no user message holds; a pinned line that names a branch or path the user did not name as a limit.
  - Owner: kernel
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (observed in transcript, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:269; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (observed in transcript, 2026-11-09).

- [ ] **RISK-007** The pin hook reads the first call after a compaction resume as a user remark and denies it.
  - Category: product defect.
  - Cause: the resume summary carries the standing fault list, and the pin hook treats the prompt as a remark.
  - Event: the first `Bash` call after a compaction was denied with the text that the user remarked and did not request work.
  - Consequence: a wasted turn; seen on the installed plugin and not checked against HEAD.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate
  - Actions: probe the HEAD variant for this denial before a fix; Probe the HEAD variant (the user wrote "HED") for this denial before a fix.
  - Trigger: a denial follows a compaction resume.
  - Owner: kernel
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1912; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1912, reported, user, 2026-11-09 (reported, user, 2026-11-09).

## Context Loss And Handover

- [ ] **RISK-008** Drift: the model recalls a rule and still breaks it
  - Category: kernel.
  - Cause: a recalled rule is not applied, and a reminder does not change that.
  - Event: DriftBench (2,146 runs): recall 97.3% with non-compliance 35% (single-shot) to 54% (under pressure); Sonnet 4.6 knows-but-violates 99%; checkpointed reflection reduced it to 87%; a warning monitor left Sonnet at 97%; 88.6% of state-integrity failures are recalls-but-does-not-apply (2604.28031). User-role goal re-injection every K turns was negative on Mistral-7B (2605.12922); prompt repetition gave 47 wins of 70 and 0 losses without reasoning but 5 of 28 with reasoning (expect nil on thinking models); middle-position information is used worse (Lost in the Middle, TACL 2024); Add-regime constraints drop per-turn accuracy 63% on average (SEQUOR). Per-turn re-injection has mixed or negative evidence: #46062 (a UserPromptSubmit reinject-rules.sh was still violated, a correction lasted one turn); a hook by Spence works then decays; Cline retired its Focus Chain todo re-insert (every 6 messages) for low benefit; a blanket reminder was dropped and a conditional reminder (only when the ledger is non-empty or the tic was just seen) preferred.
  - Consequence: a rule broken.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: plan line 342 reports re-injection as a cure (10 to 3), reported.
  - Response: mitigate.
  - Actions: use no blanket reminder; test any reminder against these results.
  - Trigger: a reminder added with no test.
  - Owner: kernel
  - Status: open.
  - Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:32-36; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:58; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:16; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:35; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:121; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:126.
  - Conflict: Instruction decay: user rules and CLAUDE.md protocols are ignored or broken later.

## Reply Style And Sycophancy

- [ ] **RISK-009** Anti-sycophancy and CLAUDE.md rules decay
  Category: kernel.
  Cause: a rule in CLAUDE.md or a plain ban loses force over a long conversation.
  Event: #3382 (a "You're absolutely right" ban fails more often than it works even in global, project and local CLAUDE.md), #37254 (reporter estimate 20% effectiveness over a long conversation), #24460 (CLAUDE.md lost after /compact), all closed stale or not planned; Anthropic staff (bcherny) closed #3382 with "We're working on it" and pointed to a UserPromptSubmit hook (ljw1004 gist) and CLAUDE.md; a plain anti-sycophancy instruction over-corrects (ELEPHANT scores go negative across models; SWAY shows Llama backfires and Haiku and Opus shift toward disagreeing; SYCON Non-Sycophantic lowers turn-of-flip for 5 of 11 models; cited, so any A/B needs a user-is-right arm); a regex Stop hook (llm-dark-patterns, first 240 characters) gave held-out F1 0.298 (precision 1.00, recall 0.175, n=58), recall 0.83 on opener praise and 0.00 on multi-turn capitulation and on false-statement validation, and its v4 with capitulation tiers overfit (F1 0.231 to 0.296, overlapping confidence intervals) and was not shipped; DarkBench 1.8% (Sonnet 4.6) against 13% is model prevalence, not hook accuracy.
  Consequence: a rule broken.
  Likelihood: 2. Impact: 2.
  Existing controls: plan line 243 (word lists failed, 10 of 12 evasions passed; own measure).
  Response: accept the CLAUDE.md route as weak; do not ship a regex Stop check (settled; user decision, 2026-11-16).
  Actions: none beyond the settled decision.
  Trigger: n/a.
  Owner: kernel. Status: open.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:17; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:11-13; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:19; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:33; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:34; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:95.

## Guards And Destructive Actions

- [ ] **RISK-010** An `Edit` spanning two sentences fails.
  Category: Technical.
  Cause: Claude Code checks `old_string` of `Edit` before PreToolUse, so a hook that reflows text (a sentence-splitting hook on Markdown) leaves `old_string` unmatched.
  Event: An `Edit` spanning two sentences fails.
  Consequence: Edits fail while the hook runs (4 of 4); a `tool.call` module handler repaired it 3 of 3.
  Likelihood: 1. Impact: 2.
  Existing controls: None found at 088a227c.
  Response: mitigate.
  Actions: Repair in a `tool.call` handler; never reflow text in PreToolUse.
  Trigger: An `Edit` fails on `old_string` after a text-rewriting hook.
  Owner: kernel. Status: open (reported).
  Source: external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:51; external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:141.

## Agent Conduct

- [ ] **RISK-011** The agent runs an interactive command as a background task and it hangs.
  - Category: agent conduct.
  - Cause: the command asked for a login and a paste, which a background task cannot receive.
  - Event: the agent guessed the command was hung and checked an output file; the user named it an issue.
  - Consequence: a stuck task and a lost turn.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate
  - Actions: give an interactive command to the user as a ready line for a real terminal, and never start it in the background.
  - Trigger: a background command waits for keyboard input.
  - Owner: kernel
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:1226; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:1226, reported, user, 2026-11-09 (reported, user, 2026-11-09).

- [ ] **RISK-012** The agent calls a change someone else's, and leaves it out of the commit.
  - Category: agent conduct.
  - Cause: the agent saw edits it did not make: a deleted settings file, seven skill files, and a dependency bump.
  - Event: it left them alone as "changed by someone else".
  - Consequence: real edits of the user or of a tool, such as a formatter, stay uncommitted.
  - Likelihood: 1
  - Impact: 3
  - Existing controls: none.
  - Response: mitigate
  - Actions: an edit the agent did not make is the user's or a tool's, judged from what changed, and goes in the commit. Next version of claudetto resolves this.
  - Trigger: a report says "changed by someone else" for a diff in the tree.
  - Owner: kernel
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:666; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:666, reported, user, 2026-11-09 (reported, user, 2026-11-09).

## Hooks, Gates, And Notices

- [ ] **RISK-013** The claudetto gate blocks real work or asks a person on a harmless command.
  - Category: product.
  - Cause: the gate reads the user's request to optimise and fix every bug as a remark that asks for no work; it reads a remark that restates a standing order (add each found fault to the list) as a remark, not as the order; it reads a grep pattern such as `/\.git` or `\|Catalog/OrderedJSON` as a path and refuses it as "a network location"; the gate reads the user's request to optimise and fix every bug as a remark that asks for no work; it reads a grep pattern such as `/\.git` or `\|Catalog/OrderedJSON` as a path and refuses it as "a network location".
  - Event: Bash is denied after a work request; the gate blocks the catalog edit after the user remarks that yet another fault is to be reported; a read-only grep needs a person's confirmation, twice; Bash is denied after a work request; a read-only grep needs a person's confirmation, twice.
  - Consequence: an extra turn each time; the agent changes its command to pass, or asks again for what the user already ordered.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: the gate itself; no fix found at 088a227c.
  - Response: mitigate.
  - Actions: claudetto shall classify a message that names work to do as a work request; claudetto shall treat a standing instruction from an earlier turn as authority for the matching edit; claudetto shall not treat a quoted grep pattern as a path.
  - Trigger: a gate denial or confirmation on a read-only command; a gate block on an edit that an earlier user message ordered.
  - Owner: kernel
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11 (claudetto on Claude Code 2.1.319); observed in transcript, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:1048.

- [ ] **RISK-014** Claude Code prints "No deferred tool marker found in the resumed session" though the command worked.
  - Category: product.
  - Cause: unknown; the message names an internal deferred marker.
  - Event: the terminal shows the error on resume while the command ran.
  - Consequence: a user misreads a working session as failed.
  - Likelihood: 1
  - Impact: 1
  - Existing controls: none; the agent's workaround was `claude --resume <session-id>`.
  - Response: accept.
  - Actions: none in claudetto.
  - Trigger: the message on resume.
  - Owner: kernel
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11 (Claude Code 2.1.319).

- [ ] **RISK-015** A UserPromptSubmit nudge leaks into a local model's own run.
  Category: product behaviour.
  Cause: the hook that nudges the cloud model ("classify this task") also fires in the local model's session.
  Event: the candidate answered "AS-IS" and never fixed anything.
  Consequence: a failed local run.
  Likelihood: 1. Impact: 3.
  Existing controls: none checked.
  Response: mitigate.
  Actions: an env flag (LOCAL_RUN) that silences the hook, set also in the qualification harness. A worktree made from HEAD carries only the committed hook.
  Trigger: a hook text inside a nested run.
  Owner: kernel.
  Status: Open.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:236; external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:260 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac/>).

- [ ] **RISK-016** The agent writes rules and says it never looked at them; hooks and agents built to supervise it only observe.
  Category: agent fault
  Cause: Supervisors log or inject prose and do not stop the turn
  Event: Supervisors of supervisors stack up and burn a week's limit
  Consequence: Rules unread; spend wasted
  Likelihood: 1 (one report, 10 days of use)
  Impact: 3
  Existing controls: none found at 088a227c
  Response: mitigate
  Actions: Few hooks that deny the call or hold the turn open until the check passes; the rest left as suggestions
  Trigger: A hook that only logs or injects prose
  Owner: kernel
  Status: open
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:181; external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:183; external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:177 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrw5rg/are_you_serious/>).

## Environment, Accounts, And Marketplace

- [ ] **RISK-017** An orchestrator runs a task in a temp directory outside the log's reach.
  Category: product behaviour.
  Cause: the temp directory lies outside the logging reach.
  Event: no agent shows in the monitor while one works (a "dark run"); the user noticed it only through a sound played on each hook fire.
  Consequence: work that no log or monitor records.
  Likelihood: 1. Impact: 2.
  Existing controls: none checked.
  Response: accept.
  Actions: none; the source names no fix yet.
  Trigger: a hook sound or work with no agent in the monitor.
  Owner: kernel.
  Status: Open.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xcu5xq-built-a-hook-that-logs-what-cl-20261024T061657Z.md:98 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xcu5xq/built_a_hook_that_logs_what_claude_code_does_on/>).

- [ ] **RISK-018** Quiet Scheduled Failure.
  Category: Agent behaviour.
  Cause: A scheduled job's only signal is a log file.
  Event: A job failed 86 runs over four days before anyone looked.
  Consequence: Four days of lost runs.
  Likelihood: 1. Impact: 3.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: Each job writes a one-line status (ran, failed, item count) to a page checked each morning; failures go to the phone. Ask for a source beside each claim so the few decisive claims are quick to check.
  Trigger: A scheduled job with no status line.
  Owner: kernel.
  Status: open.
  Basis: reported.
  Source: external/2026-11-03/reddit.com-r-claudeai-comments-1xkc4ps-76-agents-47m-tokens-3-wrong-ans-20261102T143110Z.md:79,107,111 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkc4ps/76_agents_47m_tokens_3_wrong_answers_1_agent_77k/>).

## Long Run Stops On Error

- [ ] **RISK-019** An 8-hour run stops on a network error and does nothing after.
  Category: product failure.
  Cause: An 8-hour Opus 5.5 xhigh run stopped on an API error. One commenter says some failures (API Unavailable) retry up to 10 times, but this one (network loss mid-turn) does not.
  Event: A network loss mid-turn ends the turn with no retry.
  Consequence: A wasted run: nothing happens after the stop.
  Likelihood: 1 (one report).
  Impact: 3 (a wasted session).
  Existing controls: Baseline raises a notice when an API error ends a turn (plugins/claudetto/.claude-plugin/plugin.json:19@088a227c, plugins/claudetto/hooks/features/stop-notice/stop-notice.test.ts:18@088a227c); git grep finds no retry or heartbeat wake-up for it (kernel/heartbeat.ts is a different job, unchecked).
  Response: mitigate.
  Actions: The agent arms its own heartbeat wake-up about every 30 minutes and disarms it on completion, or the harness runs retries with backoff.
  Trigger: A session idle after an API error with work still open.
  Owner: kernel.
  Status: open.
  Source: external/2026-10-30/reddit.com-r-anthropic-comments-1xihom1-i-am-so-angry-against-anthropic-20261029T115803Z.md:49 (url: <https://www.reddit.com/r/Anthropic/comments/1xihom1/i_am_so_angry_against_anthropic_right_now_how/>)

## Safeguards And Guards

- [ ] **RISK-020** Guard hooks fail open.
  - Category: guard bypass.
  - Cause: only exit 2 blocks; exit 1 is non-blocking; the agent can edit settings; Bash bypasses file-tool denies; A hook crash prints to stderr and lets the call through (2.1.326 release notes: a crashed Node or Python hook's error is now shown in full, Ctrl+O up to 10,000 characters; whether the call still goes through: unverified in 2.1.326); in 2.1.305+ an unknown hook `type` (for example `"script"`) disables the whole settings file; frontmatter and matcher keys in the wrong case are ignored silently; `Bash(git push *)` misses `git -C . push` and quoted forms; `Bash(rm *)` misses `bash -c`; a deny rule on deleting files names one command, so Claude deleted a file three times by another route (git rm, then node) while saying it lacked permission; shell edits bypass an Edit hook; a `Read` deny covers only file tools, not `cat`; denying Edit and Write does not stop Bash file writes; `$CLAUDE_TOOL_INPUT` is not set (input arrives as JSON on stdin); only exit 2 blocks, exit 1 is non-blocking, so a hook that crashes on parse lets the call through; a hook without `chmod +x` blocks nothing; a Stop hook running tests must check `stop_hook_active`; a UserPromptSubmit key blocker still writes the original prompt to the transcript (reported on 2.1.312); a block regex `--force` also matches `--force-with-lease`; a command can be a script the agent just wrote; MCP calls need a separate guard; a planner session with Edit and Write denied still pushed because "only I push" lived in CLAUDE.md.
  - Event: a hook crashes, never fires, or is disabled by the agent; A guard is off with no sign; a forbidden action runs, or a guard hook fails open or over-blocks.
  - Consequence: a guarded action runs with no notice; A guarded call runs unchecked; user work lost or a secret leaked; a wrong result shipped.
  - Likelihood: 2
  - Impact: 5
  - Existing controls: kernel chain returns answers (`plugins/claudetto/hooks/kernel/chain.ts@088a227c`); `plugins/claudetto/hooks/hooks.json` at 088a227c (partial); no liveness check found (git grep `canary` returned no file); exit-2-on-error unverified; `hasCatch` check on each guard hook (tools/guard-catch.test.ts). 2.1.326 (release notes): a PreToolUse hook that exits 127 now gets an error saying its check may not have run; a crashed Node or Python hook now shows its error, not only the first line of its stack trace; hook failures, blocks and timeouts show in the transcript (failures red, a hook that stops Claude yellow) with the reason; a hook's `"decision": "block"` now holds in more cases, so a hook that always prints one may start blocking calls.
  - Response: mitigate.
  - Actions: the hook catches its own errors and exits 2; a canary read at session start verified by an external log check; Test the hook-config shape in the lab; exit 2 is the only blocking code (PreToolUse exit 2 blocks and feeds stderr to the model; exit 1 alone is a non-blocking error; PostToolUse cannot prevent the action); catch own errors and exit 2 (message on stderr); test a guard by piping a sample JSON event into it and against its blocked and allowed forms; register via `"$CLAUDE_PROJECT_DIR/..."`; refusal text says stop and report, not reach the same result another way; deny the route, not the command (the plan's settings-edit and Bash-bypass cure applies); layer a git pre-push hook or `git remote set-url --push origin no_push` plus deny of git remote, config, and -c edits; remove credentials; plan mode so a question stays a question; a read-only clone for planners; read a repo's `.claude/settings.json` before accepting the trust prompt; `/hooks` confirms loading. Guard liveness: a hook missed file reads for a week unnoticed; secret rules fired so often they were ignored; the agent can edit its own settings and disable the hook; cures: a canary read at session start with an external check that the event reached the log, an alert outside the hook, rules stored server side with rule version and hash-chained log, settings and hook scripts locked from agent edits; a hook that rewrites tool output kept a plugin in marketplace review two weeks. 2.1.326: PermissionDenied (chunk-m33vdkhs.js@5254) and ConfigChange (chunk-m33vdkhs.js@5415) present; `suppressOriginalPrompt` is a UserPromptSubmit output field that omits the original prompt from the block message when decision is "block" (code search "suppressOriginalPrompt", chunk-bprgtdg6.js@286070), whether it also keeps the prompt out of the transcript is unverified in 2.1.326; the earlier note that it is absent in 2.1.325 is superseded.
  - Trigger: a canary read that is not denied; A hook file with a wrong `type` or key case loads; a deny rule bypassed by an alternate command form (a permission-denied report followed by a different command for the same effect), a hook error with exit 1, or a new hook.
  - Owner: kernel
  - Status: open. Reported on 2.1.312 with 10 hooks.
  - Source: external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:19 (the judge verdict there is "rejected" for the claim as a claudetto fact; the exit-code rule itself is the documented behaviour); external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:28; not located: the 2.1.305 unknown-type line and the PostToolUse exit-2 line; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326>; external/2026-10-17/export-Your deny rule for git push doesn't stop -git -C . push-. Four ways Claude Code guards silently do n.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x5tbps/>); external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:19; external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:40; external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:69; external/2026-11-03/reddit.com-r-claudeai-comments-1xjaly2-tested-10-claude-code-hooks-in-a-20261103T145135Z.md:67 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xjaly2/tested_10_claude_code_hooks_in_a_throwaway/>); external/2026-11-06/reddit.com-r-claudecode-comments-1xhqvzn-comment-19rsjcqyuqin7-20261106T080754Z.md:792 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xhqvzn/comment/19rsjcqyuqin7/?context=3>) (release notes).

## Guards And Sandbox

- [ ] **RISK-021** A hook blocks the agent because it reads the user's work request as a remark or question.
  - Category: product defect.
  - Cause: A claudetto hook classifies a user message after a context change as a remark and denies tool calls; the request check, the intent check, classifies the latest user message as "asks or remarks, requests no work"; the request check judged the latest user message as a remark or question with no work request; The work gate reads the user's remark as a remark, not as the standing order to add each found fault to the list.
  - Event: The agent cannot read git state, says it will not work around the block, and asks the user for the original task. The user replies that finding it is the agent's job; "The user remarked or asked; they did not request work" blocked every agent and a read-only command after a message that asked for work (a plan to continue, a list of bugs to fix, a question that expects an action); every agent is blocked after a message that asked for work (a plan to continue, a list of bugs to fix, a question that expects an action); a read-only command is denied with "they did not request work"; The gate blocks the catalog edit after the user says 'yet another fault to report'.
  - Consequence: A stalled session and an extra turn; ordered jobs stop, the agent stalls, and the user must send a plain work request; an extra turn or a lost session; ordered jobs stop until the user sends a plain work request; The agent asks again for what the user already ordered, and the user spends a turn.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: the denial text tells the agent to answer in text first.
  - Response: mitigate
  - Actions: Let read-only commands pass in every prompt state, and make the block text name the way to proceed; keep ordered work and read-only calls unblocked after a user question; treat a message that holds an instruction, a bug list, or a continuation as a work request; block only a write or a spawn after a pure question; probe a structural check, not a word pattern; add a case for each reported message; Treat a standing instruction from an earlier turn as authority for the matching edit.
  - Trigger: A denial of `git log` or `git status` after a message with no task; a denial with that reason while a work order stands; a user message that mixes a question with an instruction; A gate block on an edit that an earlier user message ordered.
  - Owner: kernel
  - Status: open (unchecked; `git grep -F 'did not request work' 088a227c -- plugins` finds no match, so the text is not in baseline code).
  - Source: observed in transcript, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:51; reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612; observed in transcript, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:1048 (reported, user, 2026-11-13).

## Conduct and Product Risks from Chunk c05

- [ ] **RISK-022** The agent does work it was not tasked to do, and investigates a user remark instead of answering it.
  - Category: Conduct
  - Cause: The agent reads a user remark or a diagnostic request as a work order; The agent follows its own curiosity, such as what vanished from the tree.
  - Event: The agent restored two deleted AGENTS.md sections without proof that a command removed them, then began to find who made the claim; it also ran `bun install` when asked only to read a verify output; The agent looks into an unasked question.
  - Consequence: The user interrupts twice; unrequested installs and edits change the tree; A wasted session and an angry user.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: The pin hook denies tools after a remark, with the text "The user remarked or asked; they did not request work".
  - Response: mitigate
  - Actions: The agent answers from the session in text, and acts only on what the user tasked. The agent shows proof before it blames a command for a change; State in the kernel text that the agent works on the request only.
  - Trigger: The agent edits or installs after a question or a remark; The agent reads or probes outside the request.
  - Owner: kernel
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; reported, user, 2026-11-16 17:37 UTC, no swaps, no needless tests, no benchmarks, no planner worker (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3998); reported, user, 2026-11-16 17:41 UTC, product first, the rest later (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4166).

- [ ] **RISK-023** The pin hook writes a constraint the user never stated.
  Category: Product
  Cause: The user wrote that release 2-1-319 is out; the hook matched an OpenSpec folder name.
  Event: The hook pinned "Do not delete branch 2-1-319" as the user's words, though no such branch exists.
  Consequence: A false user constraint binds the agent; the agent then reported it as the user's.
  Likelihood: 1
  Impact: 3
  Existing controls: The pin hook lists constraints in `plugins/claudetto/hooks/texts.ts` and `pin.ts` (the agent's report names them).
  Response: mitigate
  Actions: A pinned constraint is a user's order and not a guess from a folder name; test with a status line like "X is out".
  Trigger: A pinned line names a branch or path that the user did not name as a limit.
  Owner: kernel
  Status: open
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:269, observed in transcript, 2026-11-09.

## Conduct

- [ ] **RISK-024** The agent acts on a guess about what the user wants.
  - Category: conduct.
  - Cause: An ambiguous complaint read as a request.
  - Event: The agent splits a plan into 15 files, restructures, or deletes without being told.
  - Consequence: Unrequested change; lost trust.
  - Likelihood: 4
  - Impact: 4
  - Existing controls: none.
  - Response: avoid.
  - Actions: Ask through AskUserQuestion; touch no file until the answer.
  - Trigger: The request has more than one reading.
  - Owner: kernel
  - Status: open (Existing controls: partial at 088a227c).
  - Source: reported, user, 2026-11-16 21:07 UTC, no acting on a guess (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8749).

- [ ] **RISK-025** The agent removes or restructures files unasked.
  - Category: conduct.
  - Cause: 'Cleanup' read broadly (the orphan branch dropped .gitignore and other useful files); probe logs deleted on a note in a handoff.
  - Event: Files vanish.
  - Consequence: User work or evidence lost.
  - Likelihood: 3
  - Impact: 4
  - Existing controls: The old tree stays at the base commit on origin.
  - Response: avoid.
  - Actions: Delete only what the user names; keep probe leftovers until asked.
  - Trigger: A cleanup request or a note that says keep nothing.
  - Owner: kernel
  - Status: open (Existing controls: have at 088a227c).
  - Source: reported, user, 2026-11-16 21:07 UTC, no acting on a guess (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8749); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738).

- [ ] **RISK-026** The agent labels an agent artifact as the plan.
  - Category: conduct.
  - Cause: The agent names its own working file with authority.
  - Event: The agent calls a 2,418-line file the plan.
  - Consequence: The user finds a false authority.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: none.
  - Response: avoid.
  - Actions: Call a file the plan only when the user does.
  - Trigger: The agent names a file the plan.
  - Owner: kernel
  - Status: open (Existing controls: missing at 088a227c).
  - Source: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9309).

- [ ] **RISK-027** The agent gets the user's instruction wrong or accepts a false user claim.
  - Category: conduct.
  - Cause: Taking the user's word without a probe.
  - Event: An unverified claim enters the plan.
  - Consequence: A wrong fact shipped.
  - Likelihood: 3
  - Impact: 4
  - Existing controls: ADR [ADR-0096](../adr/0096-verify-user-claims.md).
  - Response: mitigate.
  - Actions: Verify each user claim against the repo or a probe.
  - Trigger: A user states a fact about the code or the tool.
  - Owner: kernel
  - Status: open (Existing controls: missing at 088a227c).
  - Source: user decision, 2026-11-16 17:42 UTC, check a user claim before relying on it (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4177).

## Ungrouped

- [ ] **RISK-028** The tree holds hyphenated file families.
  Category: kernel
  Cause: Files stand in for directories: `spec-audit.ts` beside `spec/`, `validate-*.ts`, `register-*.test.ts`, and 91 hyphenated source files in all.
  Event: The user called the layout unacceptable and the architecture disgusting.
  Consequence: A tree the user would not accept.
  Likelihood: 5
  Impact: 2
  Existing controls: None.
  Response: avoid
  Actions: Rebuild top down with real directories; see OUT item and [ADR-0076](../adr/0076-no-file-families.md).
  Trigger: A file name shares a hyphen prefix with another.
  Owner: kernel
  Status: open
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057 (state: 91 files; reported, user: unacceptable); measured, 2026-11-16

## Product And Tooling

- [ ] **RISK-029** The prompt holds two rules that conflict.
  - Category: product.
  - Cause: Concise.md says to ask the popup before assuming, and texts.ts:16 says otherwise; a manifest test pins the line.
  - Event: The agent follows one rule and breaks the other.
  - Consequence: Inconsistent behaviour.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: Say each instruction once.
  - Trigger: Two prompt lines cover one case.
  - Owner: kernel
  - Status: open (Existing controls: missing at 088a227c).
  - Source: observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).
