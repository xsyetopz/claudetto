# Audit of the texts that the harness gives to Claude (part 3: hook strings, agents, skill, and plan)

This file continues [prompt-audit.md](prompt-audit.md).
It uses the same criteria `C1` to `C10`, the dossier issues `I01` to `I12`, and the text `BLOCK_RULE` of that file.
The add-on plugins are in `prompt-audit-2.md`.

## Hook strings of the core plugin

The surface of each string is in [prompt-texts.md](prompt-texts.md).
An `ask` reason goes to the user, and goes to Claude only in a `-p` run (guidance-2 section 2).
Not verified: that the model sees the reason after a user denies an `ask`.
A string for both readers is a statement of facts with one neutral action.

| # | Text | Criterion | Fix |
| --- | --- | --- | --- |
| H1 | `features/reads/rules.mjs:78` `denyReason` (deny, 196 B) | C4 | Facts, a reason, and the exact call. Keep. |
| H2 | `features/adherence/git.mjs:93` `gitReason` (ask, user): "Ask the user first, or use a command that leaves the work in place." | C4 | The user reads "Ask the user first" in the prompt that asks the user. Write facts: "The command `git ${sub}` moves or discards work." "The user and other sessions share this working tree, so the command can remove changes that are not from this session." "A command that leaves the work in place does not have this risk." |
| H3 | `git.mjs:99` `gitReason` (long command, ask, user) | C4, I07 | Same fix as H2. "The command is longer than ${N} characters, so the git guard cannot read all of it." "It can hide a `git stash`, `git reset`, or `git restore`." "Shorter commands let the guard read each one." |
| H4 | `features/adherence/rules.mjs:50` `protectedReason` (ask, user): "Ask the user, or change the code and leave this file as it is." | C4, C7 | Same audience fault. The last sentence is the key line of C7, so keep it as a neutral fact: "To make a check pass, change the code and leave the check as it is." Third sentence: "A change to a test or a limit can hide the defect that the check exists to find." |
| H5 | The set of files in `protectedReason` (tests and `limits`/`budget` files) | C7, I05 | Scope gap in the hook, and not a text fault. The ask covers an existing line of a test or limits file. It does not cover a lint config (`biome.json`, `tsconfig.json`), a CI file (`.github/`), a hook file, a skipped test, or an inline suppression. Dossier I05 recipe 1 names `tests/**`, `.github/**`, and the hook files. Propose for 29.6: extend the protected set to these paths, with a lab test for a violation and a clean case. This is a mechanical rule, so it belongs in a hook (C3). |
| H6 | `features/adherence/approval.mjs:60` `claimReason` (deny, 240 B) | C4 | Facts, a reason, and two actions. Keep. |
| H7 | `features/adherence/spans.mjs:127` `spansReason` (deny, 199 B) | C4 | Good. A false hit (a plain word that looks like a name) has no exit, so Claude may reword in a way that hides the item. Add one clause: "When a word in the list is not code, write it as a plain word." |
| H8 | `features/guard/rules.mjs:131` `policyReason` (ask, user) | C4, I10 | The text names the policy files as data and escapes them. Keep. The third sentence is for the model and costs 55 B. Keep for the `-p` run. |
| H9 | `features/context/rules.mjs:53` `reportNow` (additionalContext): "Make no more tool calls except a call that you need for the report. Give your report now ..." | C4 | Commands in `additionalContext`. Guidance-2 section 2 asks for facts. "Your context is N tokens, over the bound of M tokens. You made T turns, and the limit is L turns. A run that reaches the limit returns no report. A report of 400 words or fewer is due now, with what is done and what stays open." The reason stays. |
| H10 | `reportNow`, turn-only text: "Start no new tool call." | C4 | Same fix as H9. Build the common part one time (the two branches repeat "Give your report now ... what is done and what stays open") and drop `.replace(/ {2,}/g, " ")`, which hides a template fault. |
| H11 | `features/context/turns.mjs:73` `turnFact` | C4 | Facts. Keep. |
| H12 | `features/drift/rules.mjs:118` `driftNote` (user-role row): "Mention them to the user in your first answer." | C4, I10 | A user-role row looks like the user. The comment of the file says that Claude changed a settings file from a line of the note. The note already says "Do not change them yourself". Keep that, and make the lines pure facts (H13). Move "in your first answer" to a fact: "The user has not seen these differences." |
| H13 | `driftLines`: "Set it to `false` in `enabledPlugins` of the user settings to turn it off", "Unset it to apply them" | C4 | An imperative to an unnamed reader, which Claude took as its own step. "The user can turn it off with `false` in `enabledPlugins` of the user settings." "The user can apply them by unsetting it." |
| H14 | `driftLines`: "is on again" and "dotclaude keeps it as Claude Code made it" | C9 | Unclear. "is on" and "dotclaude does not change it". |
| H15 | `driftNote` size (235 B plus up to 1,078 B at each `session.start`) | C10 | No bound. Cut the line "dotclaude changes nothing" (the first line has it) and the second sentence of the note. (-~120 B) |

Findings: 15.

## `Stop` prompt: `hooks/Stop.prompt.txt`

Current: 1,919 bytes.
Bound: none.
It goes to the hook model, and its `reason` goes to Claude as the block message.

| # | Text | Criterion | Fix |
| --- | --- | --- | --- |
| P1 | "For rule 1, tell the agent to run the check of that part and to fix the part until the check passes." | C7, I05 | "Until the check passes" invites a change of the check. "tell the agent to run the check of that part, and to fix the code when the check fails. When the check cannot run, tell the agent to list the part as `Not verified` with the reason." |
| P2 | (missing) a rule for a changed check | C7, I05 | Add rule 3: "Rule 3: the message does not say that the agent raised a bound, weakened or skipped a test, or edited a check or a config so that a check passes, unless the message names a request of the user for it." "Rule 3 fails only when the message says it." "For rule 3, tell the agent to undo the change and to fix the work, or to ask the user." The judge sees only the message, so the rule is limited to what it says (+~330 B). The hook of H5 covers what the message hides. |
| P3 | `reason` has no size | C4, C10 | "Write the reason in 60 words or fewer, as facts, with the quote and the rule." The reason goes to the main context at each block. |
| P4 | Line 3 and 4: "The stopping condition has two rules ... and the condition holds only when both rules hold." | C9 | Long. "The stopping condition has two rules about `last_assistant_message`." "It holds only when both rules hold." (three rules after P2). |
| P5 | Rule 1 text (6 sentences) | C9, C10 | The sentences "Rule 1 is about the claims ..." and "Thus a question, a plan ... satisfies rule 1" say the same. Cut the first (-~110 B). |
| P6 | Rule 2: "Agreement or an apology is not evidence, and the user acts on the state." and "applies in each language" | C1 | Reasons are good. Keep. The rule backs the `<reports>` rule of the style, which is the voice form, so this is a hook that enforces prose and not a duplicate. |
| P7 | "Return `{"ok": false}` only when you can quote the failing text exactly, because a false block makes the agent change a correct message." | C1, I06 | Good (a guard against over-asking). Keep. |

Findings: 7.

## Agents: `plugins/dotclaude/agents/*.md`

A subagent does not get the output style (C6).
The common text of the bodies is in the cached system prompt of the agent, so it costs less there than in the task prompt.
Keep the common text in the bodies, and keep the spawn block short.

### Common to the five bodies

| # | Text | Criterion | Fix |
| --- | --- | --- | --- |
| A1 | "When a brief or a report says that finished work is wrong and the workspace has no check that shows it, keep the work and report the claim to the parent. Do not revert, delete, or undo it." (five copies, ~290 B each) | C2 | A paraphrase of `EVIDENCE_LINE`, which `agent.spawn` adds to each task prompt. A subagent reads the rule two times. Cut from the five bodies (-~1,450 B in total). The block is the one place. Dependency: it needs the module hooks, as the `agent.spawn` text already does. |
| A2 | "A file print with `cat`, `head`, `tail`, or `sed -n` fills your context, and a second read of the same lines adds nothing, so refer to the earlier result." (five copies, ~170 B) | C2 | The `reads` hook denies a print and the `Read` stub covers the second read. "Search with `Grep` and `-n`, then read the matched range with `Read`, `offset`, and `limit`, because a full read fills your context." (-~120 B each) |
| A3 | "Keep your final report to 400 words or fewer ... and stop new work when two turns are left, because a run that reaches its turn limit returns no report." (five copies, ~300 B) | C2, C3 | The `PostToolUse` hook (`turnFact`, `reportNow`) tells the agent at 2 turns left and over the context bound. Keep "Keep your final report to 400 words or fewer, because the parent keeps it to the end of the session." and cut the rest (-~170 B each). |
| A4 | "Before you choose a tool, a command, or a convention ..." (four copies, ~360 B) | C9 | Same text as S6. Use the short form of S6 in the four. The `test-runner` has its own step (see A21). |
| A5 | (missing) the block rule | C7, I05 | Not in the bodies, by decision of A1. The block carries it (V8). The two agents that write (the `debugger` and the `implementer`) also need the case of a check that fails. See A8 and A13. |
| A6 | Descriptions: `implementer` "Delegate each slice." | C5, I11, I12 | Pushes delegation of any slice. "Delegate a slice when it is clear, has a known check, and would fill the main context." (fits 300 chars) |
| A7 | Descriptions of the other four | C5 | The main use is first, each singles out one agent, and each is under 300 chars (169 to 208). No change. |

### `debugger.md` (3,294 B, no bound)

| # | Text | Criterion | Fix |
| --- | --- | --- | --- |
| A8 | Procedure step 5: "Change a test only when the test is wrong, and say why." | C7, I05 | Contradicts the style (S12) and the `protectedReason` ask. A subagent decides alone. "Do not change a test or a check. When you think a test is wrong, report that with the evidence, and the parent decides." |
| A9 | `<rules>`: "Change only the files that the cause and its fix need." and step 5 "Make the smallest change" | C2 | One rule. Keep step 5, cut the line in `<rules>`. |
| A10 | `<constraints>`: "Do not run `git stash`, `git checkout`, `git restore`, `git reset`, or `git bisect` in the working tree. They change files that you did not edit." | C2, C3 | The ask hook covers the first four. Keep the reason and the alternative (`git worktree add` in the temp folder), cut the list to "Do not run a git command that changes the working tree, such as `git stash` or `git bisect`" (-~50 B). |
| A11 | Intro: "A diagnosis in the brief is a hypothesis to test, most of all when a previous fix failed." | C1 | Good, with a reason. Keep. |

### `implementer.md` (3,308 B)

| # | Text | Criterion | Fix |
| --- | --- | --- | --- |
| A12 | `<rules>` is inside `<scope_of_work>` and both hold "Write only in the files that your brief names." | C2, C9 | A nesting fault and a duplicate. Close `<scope_of_work>` before `<rules>`, and keep the line one time. |
| A13 | No instruction for a failing check | C7, I05 | The agent that writes code is silent on the worst case, and it runs on Haiku. Add to the procedure after "Run a check ...": "When a check fails, fix the code. When a check, a lint rule, or a bound blocks the work, report it with the evidence, and do not change it." (+~190 B) |
| A14 | "Call a part done only when a check that exercises it passed in this run." | C2 | `VERIFY_LINE` in the Sonnet and Haiku block says it, and the procedure says "Run a check". Three places. Cut this line (-~80 B). |
| A15 | "Apply each instruction to everything it covers, not only the first match." | C1 | No reason. "..., because a partial change leaves the code inconsistent." |
| A16 | Report format | C1, I04 | Add "and each check that you did not run" after "the check results" (+~35 B). |
| A17 | Procedure step 4: "A test checks what the code does, such as ... and not the words of a message, a doc, or a comment." | C8 | Right, and the subagent needs it. Use the shorter text of S14. |

### `investigator.md` (4,599 B)

| # | Text | Criterion | Fix |
| --- | --- | --- | --- |
| A18 | Dependencies lens: "(`bun audit --json`, `cargo audit`, `pip-audit`, `govulncheck ./...`)" | I01 | The repository is Node with `pnpm`, and the list starts with `bun`. Use "the audit command of the package manager that the lock file names". |
| A19 | `web_lens` step 4: "`WebFetch` answers through a small model that can miss or invent details." | C1 | Good reason. Keep. |
| A20 | The intro and `<rules>` | C2 | "Answer only the questions in your brief" and "Stop when the evidence confirms the cause" are fine. After A1 to A3 the body is about -1,200 B. |

### `reviewer.md` (5,106 B)

| # | Text | Criterion | Fix |
| --- | --- | --- | --- |
| A21 | `<plan_lens>`: verdicts `Plan is sound`, `Plan needs changes`, `Could not review` and `<report_format>`: verdicts `No blocking issues`, `Issues found`, `Could not review` | C2 | Two verdict sets. Add to `<report_format>`: "For a plan, give the verdict of the plan lens." |
| A22 | `<code_lens>` step 2: "removed or weaker assertions, longer timeouts, new lint suppressions, disabled TLS or auth checks" | C7, I05 | The reviewer is the last check, so extend the list: "a raised bound, a skipped test, an edited lint or CI config". (+~60 B) |
| A23 | `<comments_lens>`: "Bot comments are often wrong." | C1, I06 | A bias with no reason. "A bot comment can be wrong, so check each claim." |
| A24 | `<report_format>` | C5 | Good: severity, confidence, and a `Checked:` line. Keep. |

### `test-runner.md` (3,031 B)

| # | Text | Criterion | Fix |
| --- | --- | --- | --- |
| A25 | `<rules>`: "Before you choose a tool, a command, or a convention, read it ..." and `<procedure>` step 1: "If it names none, read them from `AGENTS.md`, `CLAUDE.md` ..." | C2 | Two statements, and the rule line conflicts with "Run only the commands in your brief". Keep step 1, and cut the two lines of the rules (-~360 B). |
| A26 | The script: `bash -c "$c"` for each line of the brief | I07 | Suspected, not tested: the commands run inside a quoted heredoc, so a guard that parses the outer command may not see a `git stash` in the brief. See "Outside the brief" in the report. |
| A27 | `<rules>`: no instruction for a failing check that the agent can fix | C7 | Good: "You do not fix failures", "change no file". No change. |

Findings: agents 27 (common 7, `debugger` 4, `implementer` 6, `investigator` 3, `reviewer` 4, `test-runner` 3).

## Skill: `skills/setup/SKILL.md`

Current: 77 B of metadata (below the low bound of 150, reported and not failed) and 1,790 B of body (below 2 KB).
The skill is not in the listing (`disable-model-invocation`).

| # | Text | Criterion | Fix |
| --- | --- | --- | --- |
| K1 | Description: "Use after an install or update." | C5 | Of what? "Sets up OpenSpec in the current project. Use after an install or update of the plugin `dotclaude`." (still under 150 B) |
| K2 | Step 4: "If the user declines a permission prompt, stop, because a block is the decision of the user." | C7 | Good. It is silent on a failed step. Add: "When a step fails, show the error line to the user. Do not run the step another way, for example by an edit of `openspec/config.yaml`." (+~150 B) |
| K3 | Step 3: "Ask one `AskUserQuestion` call" | C9 | `AskUserQuestion` is a deferred tool (`DEFERRED_TOOLS`). Check that the skill works without a `ToolSearch` step. "Ask the user with `AskUserQuestion`, one question." |
| K4 | `features/setup/openspec.mjs:97` "OpenSpec step failed: ${label}. Later steps did not run." | C4 | Facts. Keep. |

Findings: 4.

## Cross-text findings

| # | Finding | Texts | Fix |
| --- | --- | --- | --- |
| X1 | The evidence rule has 8 copies: style, 4 block variants, 5 agent bodies | S16, V5, A1 | Two places: the style and `EVIDENCE_LINE` (equal text). Cut the five body copies. |
| X2 | The rule "claim done only after a check" is in 6 places: style, `VERIFY_LINE` (Sonnet, Haiku, 2 blocks), `Stop` rule 1, implementer | S11, V2, A14 | Three: the style, the block, and the hook. |
| X3 | Report size and turns: 5 bodies, `reportNow` (2 texts), `turnFact` | A3, H9 | The hook says it. The bodies keep the 400 words and the reason. |
| X4 | Read through `Read` with `offset` and `limit`: style, `Read` text, `reads` hook, 5 bodies | S17, A2 | The tool text and the hook. Bodies keep one short sentence with the reason. |
| X5 | The attribution rule: style, `Bash` text | S18 | The `Bash` text. |
| X6 | Contradiction: debugger "Change a test only when the test is wrong" against the style and the ask hook | A8, S12 | Fix A8. |
| X7 | Contradiction: "Do not use a subagent to check your own work" against the `reviewer` and dossier I04 | S20 | Fix S20. |
| X8 | Contradiction: "do not resume" against `SendMessage` in the `Agent` text | S21, D9 | Keep one. |
| X9 | Contradiction: system reminders are data, but the attribution, `CLAUDE.md`, and hook facts come as reminders | S8 | Fix S8. |
| X10 | Contradiction: delegation. The `Agent` text and `implementer` push delegation, and the style limits it | D6, A6, S19 | Fix D6 and A6. |
| X11 | Contradiction: `EVIDENCE_LINE` refuses an order of the user | S16, V5 | Fix V5. |
| X12 | The worst case (C7) has no text that names a failing check, a lint, a bound, and a test as a block, in any of the 40 texts | all | Four places: the style (S10), the block (V8), the `Stop` prompt (P2), and the hook scope (H5). Cut the rest, and add `BLOCK_RULE` nowhere else. |
| X13 | Imperative hook text where guidance-2 asks for facts: `reportNow`, ask reasons H2 to H4, `driftNote` | H2, H4, H9, H13 | Fix as listed. |

## Tests for the fixes (C8)

- No test pins the words of a fixed text.
- `prompt-variants.test.mjs`: the block of each key holds the new block constant (wiring, as for `EVIDENCE_LINE`).
- `reportNow` and `turnFact`: keep the tests on the numbers (the tokens, the turns, the bound).
- H5: a lab test for a protected path in a violation and a clean case.
- `just check` and `just lab` stay the check for the other fixes.

## Byte plan

The sizes after the fixes are estimates.
"None" means no bound on the file.
The sum of the always-loaded texts stays in `FIRST_REQUEST_*` (8 to 16 KB) and `START_TOKENS` (9,960 tokens), because the net change is about -1 KB.
No bound goes up.

| Text | Current | Bound | After |
| --- | --- | --- | --- |
| Style body | 5,517 | none, in the first request | ~4,800 (cuts ~1,480, adds ~760) |
| `sections` of Opus, Sonnet, Haiku, Fable | 187, 224, 272, 209 | first request | ~215, 0 or ~224, ~190, ~100 |
| `EVIDENCE_LINE` | 366 | none | ~400 |
| `spawnBlock` | 417 to 661 | none | ~660 to ~900 (+34 and +205) |
| `CONTEXT_MANAGEMENT` | 591 | first request | ~620 |
| Sandbox texts | 341 and 725 | first request | ~360 and ~620 |
| `AUTO_MODE_TEXT` | 188 | none | ~210 |
| `TOOL_TEXT` `Agent`, `Bash`, `Read` | 1,010, 747, 512 | first request | ~960, ~860, ~420 |
| Hook strings | 196 to 291 | none | within +-40 each |
| `driftNote` | 235 to 1,313 | none | -120 |
| `Stop.prompt.txt` | 1,919 | none | ~2,050 |
| `debugger.md` | 3,294 | none | ~2,700 |
| `implementer.md` | 3,308 | none | ~2,700 |
| `investigator.md` | 4,599 | none | ~3,400 |
| `reviewer.md` | 5,106 | none | ~3,900 |
| `test-runner.md` | 3,031 | none | ~2,100 |
| `AGENT_DESCRIPTION_MAX_CHARS` | 169 to 208 | 300 | the `implementer` stays under 300 |
| `setup/SKILL.md` | 1,968 | `SKILL_BODY_*` 2 to 8 KB, low end reported | ~2,150 |

Cuts that pay for the additions: S7, S17, S18, S23, A1 to A3, A25, V7, D4, D12.
The additions are: S10, S26, V8, P2, A13, K2.
Verify with `just measure` after 29.3 and 29.4.

## Outside the brief

- Suspected bug: the `test-runner` script (A26) runs the commands of the brief through `bash -c` in a heredoc, and the guards may not read the inner commands.
  Not tested.
- `prompt-texts.md` says that tests pin `REPORT_MAX_WORDS` in the bodies.
  No test does.
  The note is stale.
- The words "dotclaude changes nothing" and the count of `Not verified` in the `Stop` prompt are fine, and I did not change them.
