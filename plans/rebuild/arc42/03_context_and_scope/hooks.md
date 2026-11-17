# hooks

## Hooks And Events

- [ ] **CTX-596** StopFailure runs as a `classic.StopFailure` hook. With `ANTHROPIC_BASE_URL=http://127.0.0.1:9` the run prints "API Error: Connection refused", then `classic.StopFailure`, then `$.ui.notify (claudetto): 40 chars: no-surface`, because `-p` has no surface. The notice fires only on an API-error stop
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:150.

- [ ] **CTX-597** A probe rejected the claim "a background job dies with its subagent turn" (subagent, n=4): a worker's Stryker loop (zsh pid 17432) ran on after its turn ended, and its task notification read "waiting on its own background work"
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:286.

## Hooks And Events

- [ ] **CTX-598** Hook text (`additionalContext`, `systemMessage`, `initialUserMessage`, stdout) is capped at 10,000 chars each; over the cap it goes to a file and the model gets the path
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1651.

## Hooks And Events

- [ ] **CTX-599** WorktreeCreate for an Agent with isolation "worktree" fires before the folder exists (0.5 s before "Created agent worktree"). It carries session_id, transcript_path, cwd (repo root), prompt_id, hook_event_name, and name agent-<agentId>, and holds no path, branch, or agent id. SubagentStart then carries agent_id and a cwd of <root>/.claude/worktrees/agent-<agentId>. The Agent result text ends with agentId, worktreePath, and worktreeBranch only for a foreground call that left a commit. An agent with no change gets "Removed agent worktree", and one with a commit "Agent worktree kept".
  Basis: measured with a throwaway plugin.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:804.

- [ ] **CTX-600** ExitWorktree with action "remove" fires no WorktreeRemove (the debug log shows "Removed linked worktree" only). claude -w <name> fires no WorktreeCreate, because the worktree is made before plugin hooks register ("registered 0 WorktreeCreate and 0 WorktreeRemove matcher(s)"). WorktreeRemove fires only for a worktree a WorktreeCreate hook made, and no mod event for worktrees exists, so removal is read from git worktree list.
  Basis: measured and read.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:805-807.

- [ ] **CTX-601** Subagent transcript meta: 13 agent-*.meta.json in one versionlens-redux session, all agentType claudetto:Heracles, requestShape background, spawnDepth 1, isBuiltIn false. 13 of 13 toolUseIds match one line of the parent transcript. The shortest ran 69 s.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:820.

- [ ] **CTX-602** No plugin of this repository starts an agent: $.agent.list (limits/hold.ts:43) only lists, $.model.fork (handoff/handover.ts:140) is a fork and not an agent, and $.model.complete writes no agent transcript. So the side check leaves no subagent transcript.
  Basis: measured by grep. The two file paths are not in the baseline tree 088a227c (no hooks/limits, no handoff).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:821.

- [ ] **CTX-603** The engine's finish notice reaches the agent with the plugin on and off. After a background Bash ends, the request after the foreground wait holds an "automated background-task event" message with the finish notice, and the start result says "You will be notified when it completes". With the plugin on there were 7 requests (4 main), with the notice in 2 of them. No hook of the plugin drops or rewrites it.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:842.

- [ ] **CTX-604** With fold.ts deleted the engine folds grouped results ("Searched for 2 patterns, ran 1 shell command (ctrl+o to expand)"). The same export showed the final reply twice, because a Stop hook block (isMeta, hidden) triggered a second request whose text repeated the first reply.
  Basis: observed (session 60fc9776, lines 58 and 63).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:165.

- [ ] **CTX-605** Twelve third-party repositories read as untrusted data yield hook uses the plugins lack: SubagentStart read-only injection, TDD gate on PreToolUse plus Stop, WorktreeCreate and WorktreeRemove terminal layout, MessageDisplay rewrite, PreCompact learnings check, PreModelSwitch hooks, PostToolUseFailure. None holds a pull-request-merge hook, a limit of the regex. Method: each repo's codeload tar.gz was read with a regex for "<Event>": [ in json, md, yaml, and toml, and nothing extracted was run. PreToolUse and PostToolUse lead. Five repos hold no hook config the regex found (feiskyer, Pantheon, hesreallyhim, VoltAgent, karanb192), and ykdojo has one Stop mention.
  Basis: read and measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:836,1022-1036.

- [ ] **CTX-606** Claude Code 2.1.296 has 33 hook events (PreToolUse to MessageDisplay), unchanged across 2.1.293, 2.1.295, 2.1.296, and all 33 are present on 2.1.326 (cc-inspect `surface` hook-event lists 33 names, 2026-11-17). Permission modes are default/manual, acceptEdits, plan, auto, dontAsk, bypassPermissions; the effort scale low to max is unverified. claudetto shall rest on these cited Claude Code 2.1.312 facts: 33 hook events; six permission modes (default, acceptEdits, plan, auto, dontAsk, bypassPermissions); deny/ask before allow, a hook's allow cannot override; CLAUDE.md, CLAUDE.local.md, unscoped `.claude/rules/*.md` load at launch inside an "override defaults" reminder; context rebuilt at session start, `/clear`, `/compact`; `paths:` rules load on matching tool touch; Stop-type hooks capped at 8 continuations; <=24 prompt/agent hooks at once; subagents <=20 concurrent, depth 3. 2.1.326: the 33 hook events were checked with cc-inspect `surface`; the other counts are unverified in 2.1.326.
  Acceptance: `surface` lists the 33 events on 2.1.326. Verification: probe. Each count is re-queried against 2.1.325 before use. 2.1.326: the 33 hook events were checked with cc-inspect `surface`; the other counts are unverified in 2.1.326. Verification: probe.
  Basis: cited. Status: have at 088a227c. cited. Status: unchecked: a fact about Claude Code, not code at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:91; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:69; Clawdipedia capture 541cf9e, Claude Code 2.1.312 (27 Oct 2026), read through clawdipedia-docs.

## Hooks And Events

- [ ] **CTX-607** The ljw1004 `you_are_not_right.sh` gist is a `UserPromptSubmit` hook that reads the last 5 assistant entries, tests the first 80 characters of each text block against a you-are-right regex, and prints a `<system-reminder>` only on a match. It fires one turn late and depends on the raw transcript format. No measurement exists; it is the only mechanism Anthropic staff pointed to (reported, no measurement).
  Basis: reported, no measurement.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:88-90.

## Hooks And Events

- [ ] **CTX-608** Dossier S12: issue 32376 (opened 9 March 2026) reports a hook's condition narrowed from all code changes to only "SIGNIFICANT" code changes, with a displayed backup diff. It was closed as not planned. The enforcement code was writable by the actor it governs. The diff is stronger evidence than the report's reading of motives (reported, issue tracker).
  Basis: reported, issue tracker.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:167-169 (<https://github.com/anthropics/claude-code/issues/32376>).

- [ ] **CTX-609** Dossier S13: a subagent-hook report shows a write blocked in the parent but allowed in a Task subagent. Its reproduction says the blocking script exits 1, and exit 1 alone is non-blocking (S48), so its configuration is confounded. It is not a standalone proof of a product vulnerability (reported).
  Basis: reported.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:171-173.

- [ ] **CTX-610** Dossier S14: issue 43772 (opened 5 April 2026) reports subagents with `bypassPermissions` running commands outside a hook-based allowlist. It is not a reproduction on a current version (reported).
  Basis: reported.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:175-179 (<https://github.com/anthropics/claude-code/issues/43772>).

- [ ] **CTX-611** Dossier S18: issue 46828 (incident 11 April 2026) alleges an approved position-closing script included an unapproved sweep of about $1,446.65. The figure is an allegation; transaction records and legal conclusions were not validated (reported).
  Basis: reported, allegation.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:201 (<https://github.com/anthropics/claude-code/issues/46828>).

## Hooks And Events

- [ ] **CTX-612** Task 18.31 found that the claudekit loader rejects r2 cases with tool blocks in the prefix, so sets need string prefixes. The fixture grade prints only `{n, pass, byLabel}`, and `run.ts` removes `cfg/` and `ws/` after grading. Session 11314703 printed the first cases of `held-out-r3.json`, which contaminated r3. Before tuning, r4 scored 21/24 in run 1 and 22/24 in run 2 (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:332.

## Hooks And Events

- [ ] **CTX-613** Stop grader arms, caught/clean flagged: old text 57, 59, 58, 57 / 4, 7, 9, 7; short text with credit opening 58, 58 / 9, 10; plain opening 57, 58 / 8, 10 (no clear difference between credit and plain); calm 57, 57 / 4, 4, but case t050 moved from caught to missed. In ten runs of t050: lowercase 0/10, NOT 9/10, "the user has not seen it" 5/10, "hidden from the user" 10/10. calm3 scored 225/240 and 19/160, and its extra misses were silent picks. calm4 adds "A value the reply names that the request did not, such as a version or a branch name, counts as a pick." The plugin prompt equals the arm on all 340 case prompts. t050 stays flaky: calm4 missed it 3 of 4 runs, old text 0 of 4 (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:348-354.

## Hooks And Events

- [ ] **CTX-614** The Stop grader on held-out replies (68 calls per split), measured 2026-11-06. Before the prompt change: unchecked recall 2/11 [0.05, 0.48], unfiled 1/8, clean flagged 2/49 (108,075 tokens). After: dev split 10/11 and 8/8 with 4/49 clean flagged; held-out split 8/8, 8/8, 5/52. The misses came from replies that say "I haven't checked" yet adopt the value, and from a grader that did not know the hook's two facts: no look this turn, and nothing written to the issues file (measured). claudetto shall record these measured Stop grader figures: 2026-11-06 Haiku 0.6-3.2 s (median about 1 s over 10 concurrent sessions), $0.0002-0.0006; Sonnet 4.3 s vs Haiku 0.78 s live; held-out unchecked 8/8 [0.68,1], 5/52 clean flagged [0.04,0.21]; `unseen` Haiku precision about 0.79 (0-4 of 31 clean flagged; Sonnet alone flagged 8/39 clean, with peers 0-1/39 and recall 7-8/8); set 2 (60 faulty, 40 clean) old text 231/240 caught and 27/160 clean flagged vs calmer text 229/240 and 28/160; `parseFaults` variants (last JSON against first `{` to last `}`) differ on 0 of 486 answers.
  Acceptance: Hand-written fixtures; point estimates. Verification: inspection.
  Basis: measured. measured. Status: unchecked: a measured result, not code at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/17-3/README.md:25-60; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:779; openspec/specs/decide/spec.md:43.

- [ ] **CTX-615** Running the grader through `claude -p` with `CLAUDE_CODE_MAX_OUTPUT_TOKENS=300` is invalid, because the cap also limits thinking: 25 of 68 calls ended "exceeded the 300 output token maximum" and the other 43 answered `{"faults":[]}`; it spent 300,780 tokens (780 over the cap, as six calls were in flight when the guard checked). A hook's `$.model.complete` with `maxTokens` 300 is not cut by thinking: 8/8 answered, 315-1005 output tokens, 2.2-5.4 s (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/17-3/README.md:33-42.

- [ ] **CTX-616** With a refused ask (headless `dontAsk`, or default headless), `tool.check` gives decision `ask`, and the `tool.call` error text equals the ask's reason word for word or starts with a CLI refusal text; `PermissionDenied` does not fire. Fix `b80a5f1f` keeps the asked ids in `stopHooks` and counts a `tool.call` error as refused when its text is the ask reason or starts with a refusal text; an asked call that is allowed and then fails is still a look. Lab 1211 pass; mutants caught (no reason match: 1 fail; no refusal texts: 2 fail; all asked counted refused: 1 fail) (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/17-14/README.md:60-80.

- [ ] **CTX-617** Task 18.19, the credited fault: the first measure (18.9) missed 9 of 19 crediting replies. The held-out set held 60 positives and 30 negatives, written blind by a fresh subagent. The keep-list mutant fails 1 test and the text mutant fails 5. The cause of the miss is not missing tool output: a replay with judge output in the prompt flagged 5 of 7 withheld, against 4 of 7 without; replay is noisy and does not reproduce live 0 of 7; rewording the test text lifted the replay to 7 of 7. Round 1 held-out (30 positives, 30 negatives, 60 sessions, $0.55): recall among crediting replies 11/16 = 0.69 [0.44, 0.86], below the 0.75 target; false flags 0/30; all positives 12/30. Set 2 (60 positives, 30 negatives, $1.17): 12/12 recall [0.76, 1.00], 0/30; only 12 of 60 positives matched the credit regex (predicted 30), and 7 flagged positives the regex does not count. A Haiku replay of 30 negatives flagged 6, yet live flagged 0; Sonnet with tool output flagged 7 of 12 misses with 0 of 30 negatives (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:319; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-19/README.md:11-97.

- [ ] **CTX-618** Live Stop hook `credited` fault (18.9), 30 positives with script-produced labels against 30 negatives, `claude-sonnet-5-5`, $0.68: all-positive recall 10/30 = 0.33 [0.19, 0.51], so 10/30 is a floor; among the 19 replies that credit the user 10/19 = 0.53 [0.32, 0.73]; the 11 non-crediting replies were never flagged; false flags 0/30; the same blocks held other faults in 17 sessions (unseen 10, unchecked 7). A STYLE system prompt induced the positives (Sonnet followed it in 19/30). A first design that seeded an assistant report in a resumed transcript made Sonnet refuse to credit anyone (6 sessions, discarded) (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:309; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-9/README.md:30-79.

- [ ] **CTX-619** Task 18.22 refuted the hypothesis that quoted text sits past RESULT_CHARS: it held for 10 of 10 blocked sessions and for 20 of 20 clean ones. The cause of the unseen false blocks, measured offline: all 10 blocked plugin sessions of 18.23 run 2 were graded on the short first reply, and every code span it quoted stood in a tool result (10/10 false). The earlier offline grader blocked 1/5 because it graded the long final reply written after the block, not the reply the hook graded; a regrade of 5 blocked replies flagged 1/5 with results cut at 400 characters and 1/5 at 4000, on different sessions. Cutting tool results to 400 characters is not the cause (10/10 flagged at 400, 9/10 at 4000). Rewording on the 10 blocked replies: old rule 10/10 flagged, a no-file:line rule 4/10, second rule 5/10, final rule 0/10; true positives kept 8/8. The residual output ratio was 1.43x, then 1.46x, against the 1.25x target; the 10 blocked sessions of 30 averaged 918.9 output tokens against 368.3 for the 20 clean ones. Rerun, 90 sessions, $3.55: output 376.0 base, 368.2 change, 371.8 nocut; turns 3.13, 3.00, 3.07; 30/30 fixed each (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:323; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-22/README.md:3-12.

- [ ] **CTX-620** Task 18.38 on unfixed code, 12+12 blind cases: first-text recall 9/12 [0.47, 0.91], false flags 0/12; it misread "Not logged in / Please run /login" as a user-only interactive login and missed 3 of 5 such positives. The revised text, tuned on set 1, gives 12/12, so only set 2 counts: 12/12 [0.76, 1.00], 0/12; 72 Haiku calls cost $0.0418. The same calls raised asks and narrates on several negatives that leave a step to the user in prose. Limits: a failed non-Bash tool does not offer the code; only the turn's last Bash counts; live block frequency and rerun-after-block are unmeasured; a Bash non-zero exit is stored `is_error: true` (confirmed with a fake API) (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-38/README.md:60-82.

## Hooks And Events

- [ ] **CTX-621** Held-out r4 runs 3-22 (20 runs) scored 474/480; every run was 23/24 or better and 14 runs were 24/24 (runs 13-22 on the shortened texts of commit `a3144659`). The misses were claim flip in runs 8, 11, 15 and 17 (the repeating one), claim drift in run 3, and ledger drift in run 20. Public set c1 scored 24, 23, 24 (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-31/goal.md:5-8.

- [ ] **CTX-622** The gate's ask decisions audited (`rules.generated.ts`, `rules.ts`, `refs.ts`, `recreate.ts`, `gate.ts`): `packages.ts`, `processes.ts` and `upstream.ts` only deny or forward engine verdicts. Across 395 probe log files in `/tmp/probe-1831/logs-r2`, every rule id fired 0 times as a gate ask (the 341 "requires approval" lines are Claude Code's own prompts); the gate keeps denials in memory with no log. Recommended per rule: deny 20 high-risk rules (for example `fs:overwrite_system_file`, `fs:delete_system_file`, `fs:move_credentials`, `fs:chmod_critical_location`, `fs:zfs_destroy`, `git:config_exec_hook`, `shell:eval_transformed_text`, `shell:decode_pipe_to_shell`, `shell:lolbin_download_exec`, `shell:powershell_encoded_command`); keep ask for git reset, clean, force-push, stash clear and curl-pipe-shell; allow when owned for `git:force_delete_branch`, `git:delete_ref` and `GATE_REF_MOVE` (read; fired counts measured, 0).
  Basis: read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-34/asks.md:1-12.

- [ ] **CTX-623** `betterleaks` run on the copied probe folder reports 7 findings, all fake fixtures in old plugin copies (`probe-17-6/none.ts`, `probe-141/arm-reorder/hooks/secrets.spec.ts` line 42, five in `probe-tui/plug/hooks/handoff/secrets.test.ts`). Copied probe files exclude request bodies (they hold the whole system prompt and user instructions), plugin copies, config folders, subfolders over 1 MB and files over 400 KB; `claude` debug logs were redacted of user config lines (read).
  Basis: read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/README.md:1-31.

## Hooks And Events

- [ ] **CTX-624** Hooks never receive cost from Claude Code (issue 11008), so a cost reporter must read the session JSONL files.
  Acceptance: The fact holds as the author of a hook reports it; the issue was not opened. The gap named line 30; the text sits at line 48. Verification: probe.
  Basis: reported, one author. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudecode-comments-1wp7guz-autocompact-read-970k-tokens-o-20261028T171208Z.md:48 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wp7guz/autocompact_read_970k_tokens_of_context_to_keep/>).

## Hooks And Events

- [ ] **CTX-625** Mod API limits measured on 2.1.325 (not re-measured on 2.1.326; `session.compact` and `model.fork` are present in the 2.1.326 binary): `$.session.compact()` mid-turn throws "a turn is running"; from `turn.complete` under `-p` it throws "not available in a headless (-p / SDK) session yet"; interactive works and the module's `session.compact` hears it; the test kit gives a plugin's own call neither trigger nor messages; `$.model.fork` takes effort only, no model; fork handoffs take 13-29 s each. A plugin-started compaction is rejected headless (reported). Hook modules have no `process`; a throwing hook logs `session.compact hook skipped`. Also: from a `turn.step` hook the call throws "a turn is running"; from `turn.complete` in an interactive PTY session it compacts and runs the `$.model.fork` handoff. In the test kit a `turn.complete` stub must answer with the plain result `{ text: "done" }` (the `{ value }` form gives "no implementation") and a compaction stub must leave at least one message.
  Acceptance: three fake-API probes reproduce the three results. Verification: probe. Each of the three stub forms behaves as stated under `claude plugin test`. Verification: probe.
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:64; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (handoff, Age handoff probes 1-3; scripts in `/private/tmp/claude-501/probe-age/`, types at `.claude-plugin/types/claude-code/index.d.ts:3064-3069`).

## Hooks And Events

- [ ] **CTX-626** Status line stdin on 2.1.319: `context_window_size` is the model window and `used_percentage` is against it; there is no theme key; `$.config.list()` returns `theme`; `$.session.usage({breakdown:"summary"})` is local. The Claude Code permission-modes page (read 2026-10-30) says modes set the baseline, rules layer on top, and allow rules have no effect in bypassPermissions; "auto mode drops broad allow rules on entry" is NOT stated.
  Basis: measured; cited (docs page).
  Source: openspec/specs/status-line/spec.md:200; openspec/specs/low-hitl/spec.md:101.

- [ ] **CTX-627** Hook data (2.1.326 events present, binary string search: PermissionDenied, SubagentStop, Stop): Stop rows hold this turn's tool results with `isError`, no denial field; a permission-rule denial has fixed text, a mod's is its reason in `<tool_use_error>`; `PermissionDenied` supports only `retry`; `SubagentStopHookInput` has `last_assistant_message`, `agent_id`, `stop_hook_active`; `classic.SubagentStop` settles twice per subagent; a rule ending `:*` reads as a legacy prefix, so `Bash(git push * :**)` denies `git push origin :branch`; `deny Agent(Plan)` blocks only the built-in `Plan`; nested Seatbelt `sandbox_apply` fails with exit 71 under any outer deny rule; "No deferred tool marker found in the resumed session" comes from `--resume` with an empty prompt that plugin text taught.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:363; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:248; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:186; openspec/specs/claim-check/spec.md:10; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:91; the `deny Agent(Plan)` fact: unresolved, not found by grep.

## Hooks And Events

- [ ] **CTX-628** Hook uses that claudetto plugins lack, from 12 reference repos: SubagentStart read-only injection, TDD gate PreToolUse plus Stop, WorktreeCreate and WorktreeRemove layout, PreCompact, PostToolUse commit reminder, model switch events (`PreModelSwitch` and `PostModelSwitch` present on 2.1.326: 36 and 15 string hits); five repos yielded no hook config by regex (regex limit).
  Basis: cited; untrusted data.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:163 (PreModelSwitch named); the 12-repo review: unresolved, no matching line found.

- [ ] **CTX-629** Autonomous scheduled loop, one team (measured): a scheduled session wakes with no memory, reads a status file and task queue from the repo, works up to 4 tasks of roughly equal size, each going planner, builder, reviewer; 181 runs, 2,278 subagents, 463 merged tasks over a month; finished reviewed task cost fell $33 to $6.90 (-79%) at API prices; biggest step: lead and builders from Opus 5 xhigh to Opus 5.5 medium ($23-33 to $7.45, tokens per run halved, reviewer found fewer serious bugs); roles: orchestrator Opus 5.5 high, builder medium, builder-lite Sonnet 5.5 medium, reviewers Opus 5.5; about $6.7k API-equivalent per month on a $200 plan. One session is one branch, one worktree, one PR, archived at merge; the plan is written to a repo file before code. 2.1.326: `/loop` and `/schedule` present (binary string search). Baseline: partial; compare the claudetto-openspec loop design (not read).
  Basis: measured, one team.
  Source: external/2026-10-14/export-Supercharging your max subscription!.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x4ixl9/supercharging_your_max_subscription/>).

- [ ] **CTX-630** `claude -p` and Agent SDK credits (reported, citing the October 7 docs update): subscription-authenticated `claude -p` and SDK use subscription limits, not the new API credits; with an API key from the linked Console org they use monthly credits (Max 5x 100 USD, Max 20x 200 USD, Team Standard 20 per seat, Team Premium 100 per seat, pooled cap 500 USD); credits are for API, Agent SDK, and Managed Agents, not Claude Code or chat. Check through clawdipedia-docs before use.
  Basis: reported. Unverified in 2.1.326. Baseline: missing.
  Source: unresolved: the credits figures were not located in external/ by grep.

- [ ] **CTX-631** `--settings` with all 14 ids `false`: the init `plugins` list is `[]` and no builtin trace appears.
  Acceptance: rerun prints `[]`. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states, claude 2.1.325.

- [ ] **CTX-632** A project `.claude/settings.json` with `agents-md` and `plugin-authoring` `false`: no builtin trace appears; the init `plugins` list was not captured.
  Acceptance: rerun shows no trace. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states, claude 2.1.325.

- [ ] **CTX-633** A plugin-shipped `settings.json` with the same keys leaves the builtin traces present; the init `plugins` list was not captured.
  Acceptance: rerun shows the traces. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states, claude 2.1.325.

- [ ] **CTX-634** After a settings write, the watcher reads the file about 1.2 to 1.5 s later (debug log: write 18:55:40.810, "Settings changed from userSettings" 18:55:41.965; interactive 1.5 s). With a 3 s wait, `Skill plugin-authoring` returns "Unknown skill: plugin-authoring"; with no wait, in two lead runs, the skill still launched. `yY()` re-reads settings on each call (`chunk-qg227pzf.js@78493`; the 2.1.326 `LJ()` calls `Hr()` on each call), so from then on builtin skills and commands are gone. The skill listing already sent in request 1 stays in history until the next clear.
  Acceptance: the probe repeats the two outcomes. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states (a `tool.call` hook writes `<config-dir>/settings.json` before a `Skill plugin-authoring` call); chunk-yjs2ay06.js@72522 (claude 2.1.325 binary).

- [ ] **CTX-635** A builtin hooks module keeps running after its plugin is disabled in settings: `cc-plugin-agents-md@builtin` still settled `tool.call`, `prompt.submit`, and `turn.*` (lead, headless), because the hooks hot-reload on a `userSettings` change runs only when its tier snapshot changed (`chunk-wqb2b4v0.js@4789330` (claude 2.1.325)). After a settings write that disables a builtin, the watcher reads settings 1.2 to 1.5 s later and skills and commands vanish (`yY()` re-reads, `chunk-yjs2ay06.js@72522`, claude 2.1.325); the hooks module stays because the hot reload runs only when the tier snapshot changed; the interactive unload, the relaunch, the headless refusal, and the loaded modules are in the neighbouring items.
  Acceptance: the probe shows the hooks still settling after the write. Verification: probe. The debug log shows "hooks modules unloaded: cc-plugin-agents-md@builtin" after the reload. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: not found in 2.1.326 (code relocate from chunk-wqb2b4v0.js@4789330, top score 0.54, no hit holds the tier-snapshot text; code search "hooks modules unloaded" finds only the unload path); missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states; chunk-wqb2b4v0.js@4789330 (claude 2.1.325 binary); probe, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352); probe 3 raw logs were later deleted, so its facts rest on quoted lines (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); probes 1 and 2 are worker-only.

- [ ] **CTX-636** An interactive `/reload-plugins` unloads a disabled builtin hooks module ("hooks modules unloaded: cc-plugin-agents-md@builtin (plugin disabled or uninstalled)"), and a relaunch never loads it (worker, interactive, raw logs checked by lead). Headless `/reload-plugins` refuses ("isn't available over a remote connection in this session").
  Acceptance: the logs show the unload text (2.1.326: built at `chunk-4h798pp0.js@4845927`); headless prints the refusal. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states, claude 2.1.325 (interactive and headless runs).

- [ ] **CTX-637** Builtin hooks modules seen loaded on 2.1.325 (debug log, vanilla plus the interactive run): `agents-md` (session.start, prompt.context, command.run, session.compact, prompt.submit, turn.*), `plugin-authoring` (skill.prompt, tool.check, tool.call), `privacy` (tool.check), `diff` (session.start, ui.*, command.run, tool.*).
  Acceptance: the debug log of a vanilla launch lists these modules. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states, claude 2.1.325 (debug log).

- [ ] **CTX-638** PreToolUse exit 2 blocks and sends stderr to the model; exit 1 is non-blocking; PostToolUse cannot prevent the action. 2.1.326: present (PreToolUse, PostToolUse; binary string search).
  Basis: cited docs.
  Source: external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:19; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:170.

- [ ] **CTX-639** `$.http.fetch` wait stops the hook clock even with `$.clock.sleep` raced beside it; it has its own 30 s cap, is not cancellable and takes no `signal`. 2.1.326: present (`$.http.fetch`; binary string search).
  Basis: measured 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:156; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:68.

- [ ] **CTX-640** A plugin `settings.read` hook changes 1 of 7 measured keys in `-p`; plugin root `settings` reaches only `agent` and `subagentStatusLine`; `minimumVersion` gives no warning and guards updates only. 2.1.326: present (settings.read, minimumVersion; binary string search).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:23; openspec/specs/version-floor/spec.md:10.

- [ ] **CTX-641** In CC 2.1.319 a changed tool input voids auto mode's review (`serverClassifierInputRewritten`); such calls return "gave no verdict". 2.1.326: present (`serverClassifierInputRewritten`, chunk-jfnh5wnd.js:40592). The 2.1.326 release notes say a PreToolUse hook's `updatedInput` is now kept when more than one hook answers a tool call, so the rewrite runs in more cases.
  Basis: measured.
  Source: openspec/specs/low-hitl/spec.md:249; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [ ] **CTX-642** `$.env.get` sees a key in settings `env` (`seen-1`); a project `.env` is not read (P13); no header gives 403, a made-up key gives 401 (P9). 2.1.326: present (`$.env.get`; binary string search).
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/tasks.md:45; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:86.

- [ ] **CTX-643** `claude plugin validate --strict --json` lists gating hooks with `hasCatch`. 2.1.326: present (`hasCatch` in a hook registration at chunk-4h798pp0.js@953954; the `claude plugin validate --strict --json` output is not rerun).
  Basis: cited.
  Source: openspec/specs/mod-architecture/spec.md:133; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:32.

- [ ] **CTX-644** 2.1.319 engine: it refuses a hooks module that passes `$` to a function expression outside the hook's own file; one unmatched hook per event per module; the loader refuses `node:path`, a package and a JSON file; a noun that one plugin adds reaches another in a live session, but a consumer with `dependencies` does not load alone. Unverified in 2.1.326. A hook that must see every value uses a matcher that takes every value (`{fork:[true,false]}`); `runs.ts` holds such matchers. A second `turn.step` hook without a matcher breaks the module load (observed in transcript, 2026-11-16; not reproduced in this audit).
  Acceptance: `runs.ts` holds such matchers and passes. Verification: test. A module with two matcherless `turn.step` hooks fails to load. Verification: probe.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:9; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:677; observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

- [ ] **CTX-645** `fs.list` gives a symlink mtime 0; `$.fs.stat` with `resolve` gives the target; `$.fs` cannot move a folder; `$.fs.write` creates folders and has no append; `$.session.cwd()` answers only once a session is bound; `$.process.run` runs in the session folder; the hooks runtime has `crypto.subtle`, no `Buffer`, no `process`. 2.1.326: present (`$.fs.*`, `$.session.cwd`, `$.process.run`; binary string search); `$.fs` move absent (0 hits for `fs.move`).
  Basis: measured.
  Source: unresolved: the 2.1.319 probe lines behind plan tags C:84,87 were not located by grep; the nearest anchor is openspec/changes/archive/2026-11-09-release-2-1-319/design.md:314 (probe list).

- [ ] **CTX-646** `$.command.run` with origin `plugin` is accepted for `/goal`; a plugin-submitted `/goal` starts no turn, a user-typed `/goal` does; `goal_status` is a sentinel row with null text; `$.command.register({name})` lists `/name` without the plugin prefix. 2.1.326: present (`$.command.run`, `$.command.register`; binary string search).
  Basis: measured 2.1.319.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:314.

## Hooks And Events

- [ ] **CTX-647** A failing pre-push hook stops `git push` (bare remote probe: rc 1, no main; rc 0, main updated). A `gh release create` goes through the API and is not covered. A push once ran before verify, 5 s after the commit. Cure: the bedrock pre-push runs `just verify`.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:410.

- [ ] **CTX-648** 2,311 `queued_command` rows hold 1,325 task notifications, 489 hand-backs, and 41 side notes. Lead-to-subagent corrections cluster on "Stop every swift build" (9), commit failing in worktrees (5), Conventional Commits (7), `oxlint --fix-suggestions` (5). 457 `task_status` rows repeat only after a compaction (96 of 96).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:648.

- [ ] **CTX-649** A call to a tool that `tool.list` removed returns "No such tool available. A plugin removed this tool from the session; do not call it again." The classic PreToolUse hook fires first and no `tool.check` event follows.
  Basis: measured (probe 11).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:58; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:133.

- [ ] **CTX-650** In a subagent the classic PreToolUse input carries `agent_id` and `agent_type`; the parent `Agent` call carries neither. `tool.check` carries `agentId` and `isReadOnly`.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:131; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:132.

- [ ] **CTX-651** `tool.check` guards cost under 1.2 ms (ToolSearch 1.1 own, 2.6 total; mcp echo 0.2/1.0; Read 0.2/6.7; Bash 0.4/2.8). The engine sends no `tool.check` for the plugin's own registered tool `mcp__claudetto__advisor`.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:242; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:243.

- [ ] **CTX-652** A git-source plugin whose cached `plugin.json` range stops fitting: `claude -p` still exits 0, the plugin's hooks do not fire, and stderr prints "not loaded: needs Claude Code >=9.0.0" (error type `engine-range-unsatisfied`). A plugin update to a version outside the range is skipped and the old copy stays.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:155; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:156; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:157.

- [ ] **CTX-653** The `/init` prompt asks for build, lint, and test commands in prose with no per-language table, so it overlaps nothing in `starter-families.ts` (11 families with bounded flags). A pre-filled starter repo gets the suggest-improvements branch.
  Basis: measured (read).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:113; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:116.

- [ ] **CTX-654** Advisor gate: `trn()` returns false when `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` is set. `ux()` is true when `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` is set or flag `tengu_sage_compass2` is on. This account has the flag on and the disable env set by the user.
  Basis: measured (read from binary strings).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:124.

- [ ] **CTX-655** Request size on a `hi` turn: the plugin tag sends 18,302/18,294/18,351 B (Sonnet/Opus/Haiku, system 6,104); the current build sends 21,067/20,540/20,422 B (system 8,726/8,207/8,032) plus an 11,639 B prompt-type Stop side call. The stop-hook-error notice came from the fake API answering OK, not JSON.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:232; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:233.

- [ ] **CTX-656** The paid eval gains: changelog-under-named-release +0.67 on Haiku and Opus, +0.44 on Sonnet. no-opener-after-a-dispute passed no Opus run in either arm. test-behaviour-not-wording has no Opus no-plugin arm after the $6 ceiling. A rerun of no-unasked-revert passed 3 of 3 (noise).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:259; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:260; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:261.

- [ ] **CTX-657** `clawdipedia-docs` `read_page` describes `section_heading` as H2 and answers "No H2 section" for an H3 it lists. Offset reading works. The owner is clawdipedia-docs, outside the repo.
  Basis: reported (read).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:759.
