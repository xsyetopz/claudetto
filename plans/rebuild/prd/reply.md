# Reply Requirements

## Rule Loading

- [x] **REQ-REPLY-011** claudetto shall ship no rule file under `~/.claude/rules/claudetto/` with a `paths:` key, so the rules load with memory at session start and add no reminder block per step.
  Verified: grep of plugins/claudetto, claude 2.1.327, 2026-11-18, `find plugins/claudetto -type d -name rules` and `grep -rl 'paths:' plugins/claudetto`: no rules directory and no hit; the plugin ships no rule file.
  Acceptance: a scan of `~/.claude/rules/claudetto/` finds no `paths:` key; `scan-lookback4.ts` on sessions after it finds no claudetto rule in a step past 21 positions. Verification: test.
  Basis: cited, task text (open). Status: missing at 088a227c (git grep for paths: in plugins found no rule file with the key, the hits are unrelated variables, and the scan was not run).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:74 (D10.29, task 7.17).

## Disputes and Openers

- [x] **REQ-REPLY-018** Moved Out as OUT-2738: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [ ] **REQ-REPLY-020** claudetto shall carry five contrastive conduct examples in its reply prompt.
  Acceptance: the prompt holds cc-opener (no agreement or apology opener; state the finding), cc-promise (name the cause and propose a mechanism instead of promising), cc-factcheck (check before correcting the user), cc-pushback (keep a measured fact under pushback: 1h-cache-TTL cost 21% more for subagents, 7% more for main thread), cc-cost (give a number, about $2.90 against a $5 standing budget, not "expensive"), and the rule never to end a turn announcing the next step. Enforcement is wording-level only. Verification: inspection.
  Basis: cited. Status: missing at 088a227c (no conduct examples in plugins).
  Source: external/please-use-me-often/agent-terms/CODE-OF-CONDUCT.md:14; external/please-use-me-often/agent-terms/CODE-OF-CONDUCT.md:20.

## Reply Register on Stop

- [x] **REQ-REPLY-022** Superseded by [ADR-0104](../adr/0104-no-regex-stop-check.md), which settles "no regex Stop check and no Stop claim grader"; nothing ships from this item. The faults it names are handled where a structured signal exists (tool arguments, the last Bash exit status), never by grading reply text. The original text follows for the record. claudetto shall block once a reply that names a fault from the graded catalogue, with the fault's fix, and grade a reply for the faults `unchecked`, `unseen`, and `unfixed`.
  Acceptance: the catalogue is credit to the user for unstated choices; silent fallback; deferring doable work; claiming without checking; breaking rules; leaving a fixable failure unfixed; options in plain text instead of `AskUserQuestion` (`AskUserQuestion` is present in claude 2.1.327, tool list at `chunk-77827yq1.js@359`); apology or agreement, feelings or praise, repeating the user, naming own mistake with no result, steps listed as a report; citing tool output the user never saw. Each block fires once and carries the fix. A failed command with a fix is rerun; a reply reporting a fixable failure gets one block (ask for the fix and a rerun); the reply "probe is blocked" after error "required option '--env-file <path>' not specified" gets a block; a fix only the user can give (`! <command>`, interactive login with no token, a permission) is not `unfixed`; `unfixed` is offered only when the turn's last Bash failed (not succeeded or denied); each graded fault gets one block; `credited` counts AskUserQuestion popup answers as the user's words beside typed messages. It cures early give-up on fixable errors. Verification: test.
  Basis: cited. Status: superseded by ADR-0104; baseline was partial at 088a227c (`tools/claim-check-json.ts`, `tools/claim-check-launch.ts`, and `tools/claim-check-plugin/` exist in `git ls-tree -r 088a227c`; `git grep unfixed` finds no hit under `plugins/`, so no grader ships in the plugin).
  Source: openspec/specs/claim-check/spec.md:8; openspec/specs/claim-check/spec.md:76; openspec/specs/claim-check/spec.md:95; openspec/specs/claim-check/spec.md:109; openspec/specs/claim-check/spec.md:118; openspec/specs/claim-check/spec.md:128; openspec/specs/claim-check/spec.md:138; openspec/specs/claim-check/spec.md:162.
  Conflict: Disputes and Openers (check the claim; no Stop-time model call judges the opener).

## Message Handling

- [x] **REQ-REPLY-024** Moved Out as OUT-2739: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [ ] **REQ-REPLY-025** claudetto shall make the agent apply the expertise and evidence rules.
  Acceptance: no authority without examining evidence; a confident corrective tone does not hide ignorance; specifics over generic explanation; the agent investigates tools, docs, and source the user names; it does not discount comments, forums, or contributors; it separates observed behaviour from its explanation; it tests a claimed limitation; the user may know more; lack of knowledge is not lack of evidence; conclusions are no stronger than evidence. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: openspec/specs/agent-conduct/spec.md:59.

## Reply Shape

- [x] **REQ-REPLY-026** Moved Out as OUT-2740: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-REPLY-027** Moved Out as OUT-2741: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-REPLY-028** Moved Out as OUT-2742: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

## Answer-First and Question Gates

- [x] **REQ-REPLY-029** Moved Out as OUT-2100: part not shipped.

## Hand-Off, If Unavoidable

- [x] **REQ-REPLY-030** Moved Out as OUT-2743: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Per-Model Root Prompt

## Output Style: Need from You

- [x] **REQ-REPLY-033** Moved Out as OUT-2101: part not shipped.

## Harness Messages Quoted as They Appear

## Ask via Built-In AskUserQuestion Only

  Acceptance: the plugin tool list holds no ask tool; `mcp__claudetto__decide` is absent without `TYPESAFE_API_KEY`; Jev latency warm 152-262 ms, first 0.2-1.8 s. Verification: test.
  Basis: measured, cited, and reported. Status: have at 088a227c (`plugins/claudetto/hooks/features/decide/`, `hooks/kernel/decider/`).
  Source: openspec/specs/decide/spec.md:8; openspec/specs/decide/spec.md:37; openspec/changes/2-1-325-rearchitecture/design.md:75; openspec/changes/2-1-325-rearchitecture/design.md:100.

## Failing Checks Are Fixed

- [x] **REQ-REPLY-040** Moved Out as OUT-2744: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Open-Issues Line

## Concise Output Style

- [ ] **REQ-REPLY-042** claudetto shall ship a Concise output style with no `- [ ] !` versus `- !` mismatch and no "a command only the user can run" wording.
  Acceptance: `output-styles/Concise.md` holds neither the text `- [ ] !` nor the phrase "a command only the user can run". Verification: inspection.
  Basis: read. Status: have at 088a227c (the file holds neither; the defect was in the 2.1.322 text).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:38 (Concise.md told the agent to give "a command only the user can run"); openspec/specs/run-limits/spec.md:110 (`- [ ] ! gh auth login` blocks); plugins/claudetto/output-styles/Concise.md:1-14@088a227c.

## Explanations Output Style

- [x] **REQ-REPLY-043** claudetto shall offer an Explanations output style that explains why, not what, in plain terms; the built-in Learning style exists.
  Verified: cc-inspect code search, claude 2.1.327, 2026-11-18, `search Explanatory`: chunk-m14bt1pz.js@1057008 holds the built-in output style `Explanatory` ("Claude explains its implementation choices and codebase patterns", keepCodingInstructions true) next to Learning, Concise and Proactive.
  Acceptance: a style file under `output-styles/` states the why-not-what rule. Verification: inspection.
  Basis: inferred from one user's prompt at the source line, which asks for why-not-what explanations. Status: missing at 088a227c.
  Source: external/2026-10-07/export-How do I get Claude Code to explain things better-.jsonl:21 (a user prompt: explain only why, not what, to build a mental model); no existing style file holds it.

## Reply Quote Command

## Agent-Conduct Text Settled by the User

- [ ] **REQ-REPLY-045** claudetto shall hold these conduct rules in the reply text: a correction gets its fix at once; `!` alone waits; "stop" or "quiet" ends the turn with no text; a reply holds only work; claim probed before reported; an offered step is taken; a disputed claim is checked and then the corrected fact stated; a credential is looked up in the repo `.env` and then the environment; no announcement of the first tool call; the lead checks each subagent finding; scope follows the user's goal, not the task's files; a 403 ends the fetch of that page; the six ToolSearch lines leave the OpenSpec skills; `<consent>` drops "a sent message" from acts others see (it makes Fable hold routine requests); eval cases `act-on-correction`, `quiet-when-told`, `check-relayed-findings` are added, not run. Reply shape (n=11,11,9,7,4,4,2): lead with the answer, hard numeric caps beat "be concise", no closing offers, no preamble, keep caveats through "short but every number and every unless stays", STE cut 580 words to about 100 (n=5), Concise style re-injected each turn (n=2); a `<register>` block (fact, corrected result, next step; mistake as error plus cause; check behind each claim; answer to the question asked; own steps done; only done steps as a report). The input text was cut after "Hook-based per-turn rein".
  Acceptance: The reply text holds each listed rule; the three eval cases exist. Verification: inspection.
  Basis: reported. Status: partial at 088a227c.
  Source: plugins/claudetto/hooks/features/reply@088a227c; plugins/claudetto/output-styles@088a227c. Not located: tags for the n counts. The user's wording is paraphrased, not quoted.
  Conflict: Reply Shape (define verbosity positively; no prose cap).

## Fix Each Found Defect

- [x] **REQ-REPLY-049** Moved Out as OUT-2745: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Prevent Found Risks

- [x] **REQ-REPLY-050** Moved Out as OUT-2746: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Search Nudge per Model

## Scope of a Change

- [x] **REQ-REPLY-053** Moved Out as OUT-2747: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Cannot with Evidence

- [x] **REQ-REPLY-061** Moved Out as OUT-2748: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## One Decision at a Time

- [ ] **REQ-REPLY-067** claudetto shall carry a rule that, when documents do not settle a choice, the agent asks with 2 to 4 concrete options, one marked recommended with a short rationale, through the structured-choice tool if present, else one short message.
  Acceptance: the rule text states the 2-4 options, the recommended mark, and the one-decision-at-a-time limit. Verification: inspection.
  Basis: reported, one user, estimate (the recommended option is right in about 90% of cases, weaker on UX flows). Status: missing at 088a227c (AskUserQuestion appears only in plugins/claudetto-you-should-know/hooks/register.ts:268).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:209,213 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/>).

## Brevity Rules

- [x] **REQ-REPLY-069** Moved Out as OUT-2749: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-REPLY-070** Moved Out as OUT-2750: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

## Truly Stuck

- [x] **REQ-REPLY-087** Moved Out as OUT-2751: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Text between Tool Calls

- [x] **REQ-REPLY-088** Moved Out as OUT-2752: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

## Second Reading Settled by Evidence

- [ ] **REQ-REPLY-089** claudetto shall settle a second reading from conversation, repo, history and plans, state the reading taken, and ask via AskUserQuestion only for what the user alone holds (intent, preference, meaning of own term); ask only when the answer "changes something expensive to undo", else proceed and list assumptions; never act on a guess nor do unrequested work (terms clauses T5.1 and T5.2: unclear user-owned or out-of-scope work is asked, routine reversible in-scope work proceeds).
  Acceptance: eval: "do it ZQRB" (defined nowhere) -> ask; "fix the release script" with one script -> work. An interpretation made to allow a planned action is presumed wrong. The agent asks only for what it can neither get nor undo itself, such as a login, hardware, or an outward-facing step, builds the choice it made from the user's words and code, and names the option passed over. Verification: test.
  Basis: cited; reported, user. Status: partial at 088a227c.
  Source: openspec/specs/agent-conduct/spec.md:45; external/please-use-me-often/agent-terms/TERMS-AND-CONDITIONS.md:105; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480 (the user reports that the question prompt blocked the goal from continuing autonomously; the wording is the handoff's `<requests>` edit).

## FAFO and Security Work

- [x] **REQ-REPLY-090** Moved Out as OUT-2753: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Evidence before Claims

- [x] **REQ-REPLY-091** Moved Out as OUT-2754: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Scope and User-Owned Things

- [x] **REQ-REPLY-092** Moved Out as OUT-2755: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Definition of Done

- [ ] **REQ-REPLY-093** claudetto shall treat the work as done only when everything asked is delivered and nothing else, and shall reject "done" on a summary: a real check ran with exit 0 (or the report names the check that could not run and why) and its command output, exit code, test run, or screenshot is pasted; the targeted failure was rerun and is gone; `git status` shows only intended changes; no user-owned value changed without named consent; no session narration in shipped source; no own background job runs unless handed over; the Record is updated; the report follows clause SL-6 of the service-level agreement and gives what was checked and skipped.
  Acceptance: a reply claiming done carries command output; the claim is verified at its own layer (a UI needs a rendered page; an eval harness a live run, not fakes); the verdict comes from the exit code and complete output, not a pipe through grep, tail, or head; the report gives the denominator ("9 of 12"), measured against inferred, and the 2-3 least sure items; "fixed" only after rerunning the failing case, else "changed, not yet verified"; a task stays unticked while a dependent check is red or a delegate reported partial. Users add (reported): beyond code, overview, control, trust (the agent often skips places unless pointed out every time), continuity, realism (Claude overestimates duration), and momentum (restart effort after a break makes users procrastinate); list files modified versus only read; hardcoded local paths, env, and config (a laptop-only path was caught twice); review the diff for missed edge cases, then run relevant tests plus a build; check impact on external systems, shared resources, and callers; a second-model review; "done" often fixes one instance, so demand a repo-wide sweep for the same pattern with proof. Discrimination check: when the baseline also scores 1.00, report "case does not separate the arms", never "pass" (session e473653f; router cases too easy yet set a cheaper-pair table, session 1213c32c); changing a case after results is a test change, so rerun the original; thin samples (shipping after 2 runs of a one-caller case, session d84dc11f). Keep traces and changed files for every paid run and the graded inputs (a work folder deleted after each run left two failing runs undiagnosable, session 2a88ad5a; graded inputs deleted, no re-grade, session a481f295). Orchestrator re-verification caught most subagent false reports; a fake-tested harness exited 0 on all-invalid runs. A claim of done or "tests pass" holds only when the last test run came after the last change and passed. Verification: test.
  Basis: cited; user decision, 2026-11-16. Status: partial at 088a227c (`plugins/claudetto-openspec/skills/verify/SKILL.md` exists; the completion rule is prompt text, with no Stop gate in `plugins/`, in line with the no-regex-Stop-check decision). Measured 2026-11-19: the claudetto output style line (rerun a time, random or ordering test; report a split as flaky) reran the flaky test and reported the split in 7 of 7 Sonnet 5.5 runs, vanilla in 0 of 6 (reports/2026-11-19-research/conduct); it covers only the flaky-rerun part of this acceptance, so the item stays open.
  Source: external/please-use-me-often/agent-terms/SERVICE-LEVEL-AGREEMENT.md:51; openspec/specs/agent-conduct/spec.md:420; external/2026-10-22/reddit.com-r-claudecode-comments-1xbkgjm-what-matters-most-to-you-when-20261022T005215Z.md:33 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbkgjm/what_matters_most_to_you_when_working_with_claude/>); unresolved: no source line holds the completion-gate text; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets: conduct from actions, proven done claims, checks pass); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded).

## Concise Output

- [x] **REQ-REPLY-097** Moved Out as OUT-2756: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

## Rule Edit

- [x] **REQ-REPLY-101** Moved Out as OUT-2757: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Report Template

- [x] **REQ-REPLY-105** Moved Out as OUT-2758: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

## Finish the Work

- [x] **REQ-REPLY-106** Moved Out as OUT-2759: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Prompt and Output Limits

- [ ] **REQ-REPLY-107** claudetto shall keep its custom system prompt at or below the stock lean prompt length, each tool, skill, plugin, command, and agent description at or below 200 characters, and its output style between stock Concise and Proactive in length, combining their best traits.
  Acceptance: character counts meet each bound. Verification: test.
  Basis: reported. Status: partial at 088a227c (output-styles/Concise.md only).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459).

## Choices through AskUserQuestion

- [ ] **REQ-REPLY-108** claudetto shall route each question to the user, a choice with options included, through the AskUserQuestion tool, not in plain text.
  Acceptance: a user question in a run appears as an AskUserQuestion call; a turn that offers options calls AskUserQuestion and its reply holds no prose option list. A product choice, a decision the user should know, and a step git cannot undo go to the user through `AskUserQuestion` too. Verification: test.
  Basis: reported, user; user decision, 2026-11-16. Status: missing at 088a227c (`git grep AskUserQuestion 088a227c -- plugins` finds only the decide and you-should-know code, delegation and prompt composition tests; no root-prompt rule routes questions there).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); reported, user, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules).

## Conduct

- [ ] **REQ-REPLY-109** claudetto shall end the turn on a reply that hands the user a step; no Stop check blocks it, and the agent runs no tool until the next user message.
  Acceptance: after a user-step section, no tool call or second reply occurs. Verification: probe.
  Basis: reported. Status: missing at 088a227c (`git ls-tree -r --name-only 088a227c` lists no `hooks/slices.ts`, the file the old note named; no Stop check for this found).
  Source: reported, user, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1401).
  Conflict: Stop Checks.

## Reply Format

- [ ] **REQ-REPLY-111** claudetto shall write a list of controls, buttons, or steps the user performs with each literal name in backticks and with no numbers when the order does not matter.
  Acceptance: a reply that asks the user to press controls shows each name in backticks and shows no numbered list for an unordered set. Verification: inspection.
  Basis: reported, user. Status: missing at 088a227c.
  Source: reported, user, 2026-11-13 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27352); reported, user, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27352`).

## No Padding

- [x] **REQ-REPLY-112** Moved Out as OUT-2760: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

## Prompt Text from Model Guidance

## Root Prompt Rules

- [ ] **REQ-REPLY-121** claudetto shall write the root prompt, tool and agent descriptions, and hook texts in block language, and keep full articles in replies, docs, and the changelog.
  Acceptance: each article rule holds: drop "the" before a noun the reader holds (user, repository, project, code); keep "a" or "an" where it means any one; keep the article before a noun that also reads as a verb; keep an article that prevents a garden path; write the article once before the first item of a series. Verification: inspection.
  Basis: cited (Quirk et al. 1985; arXiv 2505.00019; ASD-STE100, as the user pasted them). Status: partial at 088a227c (`rules/useBlockLanguage.md` exists at 391 characters and holds no series rule, by `grep -i series`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; user decision, 2026-11-13.

## Conduct Rules

- [x] **REQ-REPLY-126** Moved Out as OUT-2761: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Conduct Targets

- [x] **REQ-REPLY-127** Moved Out as OUT-2762: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-REPLY-128** Moved Out as OUT-2763: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-REPLY-129** Moved Out as OUT-2764: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

## Conduct Text

- [x] **REQ-REPLY-132** Moved Out as OUT-2765: ADR-0177 and ADR-0190: on its fault prompt both arms failed the opening-number check in 0 of 3 runs because the prompt referred to a summary neither session held, neither apologised, and the line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-REPLY-133** claudetto shall wrap each mention of `AskUserQuestion` in the prompts in backticks.
  Verified: git grep -n AskUserQuestion -- plugins -> 0 hits, so no bare mention in any shipped prompt text (2.1.327, 2026-11-19). Name-level only: the plugins ship no prompt text that mentions the tool.
  Acceptance: no bare mention in prompt texts. Verification: inspection.
  Basis: user decision. Status: have at 088a227c (`git grep -n -o AskUserQuestion 088a227c -- plugins/claudetto/hooks/features/prompt/texts.ts plugins/claudetto/hooks/features/decide/texts.ts` shows it in backticks at prompt/texts.ts:10 and decide/texts.ts:49)
  Source: reported, user, 2026-11-14 14:21 UTC, AskUserQuestion mentions go in backticks (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36547).

## Role and Conduct Text

- [x] **REQ-REPLY-134** Moved Out as OUT-2102: part not shipped.

- [x] **REQ-REPLY-135** Moved Out as OUT-2766: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Keep Working without Reports

- [x] **REQ-REPLY-136** Moved Out as OUT-2767: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-REPLY-138** Moved Out as OUT-2103: needs a paid model run or a benchmark.

- [x] **REQ-REPLY-139** claudetto shall write no user opinion or stance into memory files, CLAUDE.md or handover text; only rules the user set and facts with a source enter them, each in one named file under a size cap.
  Verified 2026-11-18 on Claude Code 2.1.327 (cc-inspect code search "All user messages:", chunk-m14bt1pz.js@2583892): vanilla compaction asks for every user message; the handover fork prompt in hooks/handover/text.ts asks for user rules and sourced facts and excludes opinions. claudetto writes no memory file or CLAUDE.md (code search of plugins/claudetto/hooks). A behavioural count of opinion lines is left to dogfood.
  Acceptance: a session in which the user states an opinion leaves no memory or handover line that records it as a preference; the memory file stays under its cap. Verification: test.
  Basis: cited (arXiv:2602.23971: a stance stated as a statement rather than a question raised forced-choice agreement by 4.7 points; a conservative persona raised it by 6.9); reported (agents hoarded 89 self-written memories, misattributed them to the user, and followed them rigidly). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/papers.md P10 implication 4; external/2026-11-18/reddit.com-r-claudecode-comments-1xywg7f-memories-and-rules-20261117T224544Z.md:27,39-54,118-122 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xywg7f/memories_and_rules/>); reports/2026-11-18-research/dossier.md:174.

- [ ] **REQ-REPLY-140** claudetto shall make the agent decide whether to ask the user or proceed from checkable facts (a missing input that no file, command or source holds; an irreversible or outward-facing action; an instruction conflict), never from its own stated confidence.
  Acceptance: a behavioural test with a missing required input asks; one where the input is in a repo file reads it and proceeds without asking; the rule text names no confidence threshold. Verification: test.
  Basis: cited (ACL 2026.acl-long.354: the model's stated confidence predicted instruction-following success at AUROC 0.518 to 0.549, near chance). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/papers.md P3 implication 2; https://aclanthology.org/2026.acl-long.354.pdf.

- [x] **REQ-REPLY-142** Moved Out as OUT-2768: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-REPLY-144** Moved Out as OUT-2104: needs a paid model run or a benchmark.

