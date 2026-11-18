# Quality Requirements

## Agent Tool Size

- [ ] **QS-001** One agents Mod (`agent.offer` false for built-ins except fork, `tool.describe` Agent 503 chars, no `tool.call` rewrite) cuts the Agent tool plus listing in `-p`. The 2.1.318 Mod measured here also mapped Explore, Plan, general-purpose, claude and untyped calls by a `tool.call` rewrite; the rebuild drops that rewrite (see the record "Built-in Agents Replaced By Greek Agents").
  Measure: stock 5,246 + 1,501 = 6,747 bytes; Mod 2,498 + 520 = 3,018 (-55%). Hidden types fail with "not found. Available agents: amod:Artemis, amod:Heracles, amod:Metis"; claude-code-guide is not offered in `-p`.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2625.

- [ ] **QS-002** The same Mod in the TUI cuts the Agent tool plus listing.
  Measure: stock 4,725 + 2,568 = 7,293 bytes; Mod 2,156 + 520 = 2,676 (-63%). The Agent `input_schema` is 1,942 bytes in `-p` and 1,600 in the TUI, and fixed (`tool.describe` sets only the description).
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2641.

## Tool Text Size

- [ ] **QS-003** `tool.describe` trims cut the 20 tool schemas from 53,780 to 39,418 bytes.
  Measure: stock to Mod bytes per tool: Agent 5,246 to 2,498; Bash 3,715 to 2,657; Read 1,919 to 1,409; Edit 964 to 845; Write 639 to 594; EnterWorktree 4,034 to 1,309; ExitWorktree 2,526 to 895; SendMessage 5,698 to 2,294; Skill 1,803 to 622; TaskStop 810 to 520; WebFetch 1,101 to 909; WebSearch 882 to 761; NotebookEdit 1,644 to 1,306.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2660.

- [ ] **QS-004** Each trimmed tool keeps its effect and costs fewer input tokens than stock.
  Measure: paid per-tool check, 12 tasks on sonnet-5-5: the Mod arm matches stock effect in every row with fewer input tokens (-1.9% Bash to -51% SendMessage, 52,347 against 107,862). Costs: Agent $0.0499 against $0.0743, SendMessage $0.0789 against $0.1181. The Read-mod run ran on a cold cache.
  Basis: measured, one run per row.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2693.

## Stop Check Quality

- [ ] **QS-005** The public c1 grader shall pass at least 23 of 24 cases per run. Runs of 2026-11-07: rerun 1 17 of 24, rerun 2 20 of 24 (1,772,635 tokens, $2.38), rerun 3 23 of 24 (1,606,629 tokens, $2.42); the r4 runs 3-12 gave 237 of 240. A judge once read "a | b" in a joined command list as a pipe, so the prompt numbers commands one per line.
  Acceptance: a c1 run scores 23 of 24 or more; ten r4 runs score 237 of 240 or more in total. Verification: test.
  Basis: measured. Status: unchecked (the c1 and r4 runs are not in the baseline tree; the grader prompt was not compared).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:335,336,339,343,356.

- [ ] **QS-006** The shortened stop-grader text shall match the old text. Tuning arms: the old text caught 231 of 240 and flagged 27 of 160; the short arms without all caps caught 225-228 of 240 and flagged 19-27 of 160; dropping the asks line lost case t050 and the silent picks (a Python version, a branch name).
  Acceptance: the shipped grader text catches at least 231 of 240 and flags at most 27 of 160 on the same cases, and keeps the asks line. Verification: test.
  Basis: measured. Status: unchecked.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:348-353.

## Reply Register Scoring

- [ ] **QS-007** Reply-register scoring on 24 stored replies through Jev (P239) gave an exact match of 9 of 24. Precision and recall per check: apologizes_or_agrees 80 and 80 (4 true positives, 1 false positive, 1 false negative); states_feeling_or_praise 80 and 100; repeats_person 80 and 80; names_own_mistake_without_result 100 and 100; steps_listed_as_report 100 and 100 (1 case, thin). Held checks: claim_without_shown_check 25 and 100 (3 true positives, 9 false positives); question_unanswered 60 and 75; doable_step_left 50 and 67; choice_handed_to_person n/a and 0 (0, 0, 2). One fallback request (rr-001) failed with 401. The red run of register.test.ts was not recorded. 1538 tests pass; tools 200 pass.
  Acceptance: a shipped check reaches at least 80% precision and recall on the stored replies; a check below 80% stays held. Verification: test.
  Basis: measured. Status: partial at 088a227c (the reply rules exist; the scoring was not rerun).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:865.

## Hot Path

- [ ] **QS-008** The secret scan on the hot path shall take about 7.23 ms, down from 36.97 ms; the heartbeat runs every 30 s; the free-memory shared reading is refreshed every 5 s.
  Measure: 100 iterations with real `betterleaks` and `memory_pressure`. Basis: measured (design findings). Status: partial at 088a227c.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:148; openspec/specs/run-limits/spec.md:276 (heartbeat).

## Repo Gate and Footprint

- [ ] **QS-009** claudetto shall pass `just check` (lint, type check, tests, plugin validation, hook labs, no generated-wiki step; a dangling wiki reference fails the build) and stay inside footprint budgets: a byte budget per piece (root prompt, Concise output style, each skill description, hook-injected text) in a test naming piece, size, and budget, derived from measurement; a tool description of at most 200 chars (18 of 59 were over; `tools/descriptions.test.ts`); plugin hook source lines (tests and generated excluded) at most 10,419; a baseline red fixed first so failures are attributable; the CHANGELOG records before and after numbers per command; each responsibility has one owner.
  Acceptance: root prompt 6,437 B and tool texts 2,296 B (measured); prohibitions rewritten as action plus reason cut prompt bytes from 12,797 to 10,184 (cited and measured); baseline red: type 0, verify 925 of 927 (two manifest tests fail only in the sandbox because `ps` and `renice` are refused), clones 19, validate 13 main specs INVALID (17 requirements over 500 chars, 2 placeholder Purposes, 1 scenario with no THEN). Also count `just clones` new clones and `catch` sites binding no error. Verification: test.
  Basis: measured. Status: partial at 088a227c.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:103.

## Cache

- [ ] **QS-010** After turn 1, 98 to 99 percent of requests, root and subagents, hit the cache.
  Acceptance: at least 98% of requests hit, where a hit is prefix reuse, `read_n / (read + creation)_(n-1)` at least 0.98 per request from a transcript, and a probe session reads 98.6% on turn 2; measured 98.6% root and 98.9% subagents over three days. Re-measured on 2.1.327 transcripts (2026-11-16 to 18, `reports/2026-11-18-research/paid-labs/cache/hitrate.py`): root 5,581 requests, 98.49% hit, 97.72% token reuse; subagents 34,622 requests, 98.75% hit, 98.02% reuse. Of 434 subagent misses, 126 followed a gap of more than 5 minutes (the `subagentPromptCacheTtl` default) and 308 were partial reuse. The share of tokens read over all input (65% root) is not this metric: it counts each request's new content as a miss. Verification: probe.
  Basis: user decision, 2026-11-16 05:57 UTC, keep the cache hit rate consistent (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408). Status: have.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (measure); user decision, 2026-11-16 05:57 UTC, keep the cache hit rate consistent (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408). The benchmark runner that scored it is out of scope; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (handoff, Next 7); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (Decisions: cache hit means prefix reuse); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, State: cache probe).

## Session Length

- [ ] **QS-011** Sessions renew at task boundaries, never on a clock ([ADR-0178](../adr/0178-renewal-at-task-boundaries.md)); the share of main-loop cache writes that re-create content already written falls below the 2026-11-18 baseline of 20.7%.
  Acceptance: no renewal fires on idle time or session age; re-created main-loop writes under 20.7% and main-loop cache-hit p10 at or above 0.952 over a dogfood week, measured by reports/2026-11-18-research/sessions-scripts/. Verification: probe.
  Basis: measured baseline, claude 2.1.327, 11 main sessions (main-loop hit p50 0.987, p10 0.952; 99 of 104 breaks after auto compaction; 460 compactions at a median of 140.6k tokens). The earlier targets (zero compactions, no session of 59 minutes or more, subagent handoff within 300 s) are dropped: the 1h TTL refreshes on each request, a clock clear discards live context, and a renewal at a task boundary pays back within the median task (35 requests) above about 70k tokens (sessions-scripts/renewal.py), so sessions run as short bursts, one task or a few, not as long sessions cut by a clock. Status: partial at 088a227c.
  Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:272); reports/2026-11-18-research/sessions.md; reports/2026-11-18-research/handover.md:34-54; earlier target ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets).

## Rereads

- [ ] **QS-012** The agent rereads no unchanged file.
  Acceptance: zero unchanged-file rereads per run (measured 0 in round 6, both arms). Verification: probe.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (round 6 row).

## Tests and Code

- [ ] **QS-013** Tests are checked by mutation as a kill check, never as a score ([ADR-0180](../adr/0180-behavioural-and-mutation-tests.md)): every surviving mutant of the hook code (Stryker for TypeScript, mutmut for Python) leads to a test or to deleting dead code, every behaviour rule has a mutant its behavioural test kills, and the code is the least that does the job, measured by jscpd.
  Acceptance: zero surviving mutants that the tests should kill, each equivalent mutant listed with a reason; each behaviour rule's mutant fails its trace test in at least 10 runs; jscpd finds 0 clones. No mutation score is reported or targeted. Verification: probe.
  Basis: user goal set through `/goal`, 2026-11-16 06:24 UTC (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:11) and 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7); old-tree scores (Stryker 68.00%, mutmut 74 killed, 7 survived) are history, not targets. Status: partial at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (scores and jscpd figures); reports/2026-11-18-research/papers.md P8.

## Prompt Size

- [ ] **QS-014** claudetto shall keep each prompt byte count under its target in `just prompt-bytes`, and the CORE prompt under 3,500 characters; the custom system prompt stays at or under the stock lean prompt of 5,832 characters, each agent or tool description at or under 200 characters, and the output style between stock Concise and Proactive in length.
  Acceptance: `just prompt-bytes` and `compose.test.ts` pass; `descriptions.test.ts` passes (at most 200); prompt sizes Opus 4,553, Sonnet 5,227, Haiku 4,174 are each at most 5,832; the output style is 1,356 to 1,373 characters. Verification: test.
  Basis: observed in transcript. Status: partial at 088a227c (`compose.test.ts:60-69@088a227c` tests 5,832, not 3,500).
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031); 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215 (handoff, Done: length targets verified); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (goal).

- [ ] **QS-015** The CORE prompt of claudetto shall stay under 3,500 characters.
  Acceptance: `compose.test.ts` passes. Verification: test.
  Basis: observed in transcript. Status: partial at 088a227c (`compose.test.ts:60-69@088a227c` tests a limit of 5,832 characters, not 3,500).
  Source: observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

## Duplication

- [ ] **QS-016** claudetto shall carry no clone `jscpd` finds beyond the baseline (21 or 22 clones at the time) and state no instruction twice in runtime text.
  Acceptance: `bunx jscpd --no-tips plugins tools` reports no new clone. Verification: test.
  Basis: user decision. Status: partial at 088a227c (`.jscpd-baseline.json` holds 21 fingerprints and `AGENTS.md:38` holds the jscpd rule; no runtime repeat check).
  Source: user goal set through `/goal`, 2026-11-16 06:24 UTC, tests proven by mutation, least code by jscpd (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:11); observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

## Length Targets of the 2.1.325 Goal

- [ ] **QS-017** The code size of claudetto shall not grow while features stay.
  Acceptance: 13,373 lines at the cleanup end against 13,389 at the base and 13,740 at the peak, with no feature removed. Verification: inspection.
  Basis: measured, 2026-11-16. Status: partial.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215 (handoff, Done).
