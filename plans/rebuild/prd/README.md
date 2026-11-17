# claudetto Product Requirements

The product requirements for the claudetto rebuild, in the outline of ISO/IEC/IEEE 29148:2018 clause 9.6. This file holds clauses 9.6.2 to 9.6.9; the block files hold the requirements of clauses 9.6.10 to 9.6.12.

## Purpose

29148 clause 9.6.2.

claudetto is three Claude Code plugins, described at baseline `088a227c` as follows:

| Plugin | Purpose at `088a227c` | Source |
|---|---|---|
| `claudetto` | Tunes Claude Code for coding at the lowest token cost, through its official extension points only: settings, hooks, agents, commands, and an output style. It patches nothing. | `plugins/claudetto/.claude-plugin/plugin.json:4` at `088a227c` |
| `claudetto-openspec` | The OpenSpec workflow in one deferred tool and seven skills. It uses the upstream layout, runs no `openspec` binary, makes no network calls, and archives no change with an unticked task. | `plugins/claudetto-openspec/.claude-plugin/plugin.json:4` at `088a227c` |
| `claudetto-you-should-know` | A note above the prompt of what a side check finds the user likely missed. Off by default; on, one small request per three changing calls. No telemetry. | `plugins/claudetto-you-should-know/.claude-plugin/plugin.json:4` at `088a227c` |

The rebuild targets Claude Code 2.1.326. Source: user decision, 2026-11-16 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:10743`).

## Scope

29148 clause 9.6.3.

### In

The eleven blocks under [Product Functions](#product-functions).

### Out

Parts, behaviours, and files that go, with no competing option. Each item names its source.

#### General

- [ ] **OUT-001** claudetto shall not use a planner agent, a component swap behind a benchmark, an inventory of current files, the handing of the holdout to the user, or tests nobody asked for in the rebuild.
  Acceptance: the rebuild is made top down by direct edit, with no planner worker. Verification: inspection.
  Basis: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c (`git ls-tree -r --name-only 088a227c -- plugins/claudetto/agents` lists only Artemis, Athena, Heracles and Metis; no planner agent).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057; conflicts with the strangler-fig line of the goal text at ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490.; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204 (restates "no planner, no component swaps"; strangler swaps component by component are out)

- [ ] **OUT-002** claudetto shall not hold a hyphenated file family (`foo.ts`, `foo-one.ts`, `foo-two-three.ts`); a family becomes a real directory.
  Acceptance: no source file in the tree shares a hyphen prefix with another; each family is a directory (`spec/audit.ts`, not `spec/spec-audit.ts`). Verification: inspection.
  Basis: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c (91 hyphenated source files, for example `validate/validate-*.ts` and `register-*.test.ts`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057.

- [ ] **OUT-003** claudetto shall not register a batch edit tool: the `edit` block does batch edits through the `Bash(perl -0pi -e *)` allow rule and its hook, and a registered tool adds schema with no safety gain ([ADR-0097](../adr/0097-batched-edit-tool.md), comparison of 2026-11-17).
  Acceptance: the plugin registers no batch edit tool. Verification: inspection.
  Basis: measured, observed in transcript, 2026-11-16. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:2433 (probe over 82 runs: 0 runs of consecutive Edit-only responses to one file; at most 18 of 901 dev responses, 2.0%, could merge; 0 Edit errors in 188 calls; no MultiEdit among 95 tools).

- [ ] **OUT-004** Out: deciding without asking because "nobody answers overnight", and making deletes and product choices alone.
  Acceptance: the agent asks through `AskUserQuestion`. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c (`git grep -i -E 'overnight|nobody answers' 088a227c -- plugins` finds no match; `AskUserQuestion` appears only in `plugins/claudetto-you-should-know/hooks/register*.ts` and `decide.test.ts`).
  Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473). Conflicts with the decision never to act on a guess (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8799).

- [ ] **OUT-005** Out: handing off at 59 minutes of session age and a worker that adds age-based `$.session.compact()` calls.
  Acceptance: no age trigger exists. Verification: inspection.
  Basis: user decision. Status: have at 088a227c (to be removed; `plugins/claudetto/hooks/features/compaction/handoff.ts:68` `const HANDOFF_MS = 59 * 60_000` and `:82` `await $.session.compact()` inside `on("turn.complete", ...)`).
  Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031); superseded by the idle-or-size trigger (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).

- [ ] **OUT-006** The prose checks (tests or Stop checks that assert the wording of text) shall go.
  Acceptance: no check asserts prose. Verification: inspection.
  Basis: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c (`git grep` for Stop and turn hooks in `plugins` finds only `turn.complete` in `handoff.ts`, the age compaction, and `classic.StopFailure` in `stop-notice.ts`; no wording check). The same user rule bans a regex Stop check; this item extends it.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints: delete the prose checks).

- [ ] **OUT-007** The sandbox friction items (a sandbox that blocks work and does not protect) shall be settled by a fix of the sandbox, or its removal, never kept as is. The standing rule in the same handoff keeps security settings and hooks on; the two conflict. Measured 2026-11-17 on 2.1.326 (cc-inspect `cli`, one Bash call `echo ZQXSB > out.txt && cat out.txt && curl ... example.com`): `sandbox.enabled:true` adds 11,651 bytes to every request (58,489 vs 46,838; tools +836, messages +10,815 for the sandbox notice; estimate about 2,900 tokens at 4 bytes per token). With `autoAllowBashIfSandboxed` unset the sandboxed command still prompted ("The following parts require approval"), the same as with the sandbox off; the 2.1.326 schema text gives its default as false (`chunk-m33vdkhs.js@137657`). With `autoAllowBashIfSandboxed:true` it ran with no prompt, and the network call came back as a `<sandbox_violations>` deny, which invites an unsandboxed or allowed-domains retry. Auto mode with the sandbox off ran it after one classifier verdict. Permission rules and the auto classifier judge command text; the sandbox confines the writes and network egress of every process a command starts (code.claude.com `sandboxing`, "What the sandbox restricts"), so the two do not cover the same denials. Resolved: keep the built-in sandbox (the user ruled it pointless only if permissions plus auto mode cover the same denials, and they do not), set `autoAllowBashIfSandboxed:true` against the prompts, and list the hosts work needs in `network.allowedDomains` against the violation retries. The per-request cost stays a measured cost of keeping it.
  Acceptance: unresolved; the lead decides which line holds. Verification: inspection.
  Basis: reported, user, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: have at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts:211-212` writes `sandbox: { enabled: true }`; the sandbox is on and kept, not removed).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints on the sandbox and standing line "keep sandbox and hooks on"); conflicts with the standing rule in ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790.
  Conflict: claudetto shall not ship its own sandbox wrapper.

- [ ] **OUT-008** The `open-items.ts` file shall go, because the user asked what it is and nobody asked for it.
  Acceptance: no `open-items.ts` in the tree. Verification: inspection.
  Basis: reported, user, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c (`git ls-tree -r --name-only 088a227c | grep -i open-items` lists nothing).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints).
  Conflict: claudetto shall not carry the removed Stop-hook machinery.

#### Removed Features And Files

- [ ] **OUT-009** claudetto shall do no work on its own `classify` module (task 3.1, keep or remove) until the user decides. The choice is left to the user at `design.md:111`. The user decisions of the item index are at source lines 2583-2587. Running paid total at that point: $11.91 ($9.11 plus $2.80). Row recheck by `xref.ts`, $0.
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3380.

- [ ] **OUT-010** The `openspec/` directory and the practice of curating a plan inside it.
  Acceptance: the rebuilt tree holds no `openspec/` directory and no goal file or handoff that sets orders. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`git ls-tree 088a227c` lists no `openspec` entry); have at 088a227c^ (`git ls-tree 088a227c^` lists `openspec`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4133; user decision, 2026-11-16.

- [ ] **OUT-011** claudetto shall not ship the subagent status line (`statusline/subagents.ts`, `--subagent`).
  Acceptance: the plugin ships no `subagentStatusLine` setting and no `--subagent` mode; Claude Code 2.1.323 gives the setting no effect. Verification: inspection.
  Basis: cited. Status: missing at 088a227c.
  Source: openspec/specs/status-line/spec.md:397; openspec/specs/status-line/spec.md:415; openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:20 (schema text "no longer has any effect", chunk-3dhh2g49.js:255110); openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:95. The spec's row layout (first 20 tasks, `⏵` name, model without `claude-`, effort, `◫ tokens/window pct%`, `◔ elapsed` or `✓ done`/`✗ failed`) is kept here only as a record of what goes.

- [ ] **OUT-012** claudetto-openspec shall not carry `retire_capabilities`, `--skip-specs`, `--no-validate`, `-y`, custom schemas, the status and instructions JSON shapes, `config.yaml` keys, CLI flags, or `/opsx` files. The lean tool covers only the workflows in use; recorded as a drop pending tasks 4.2 and 4.3.
  Basis: read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:440.

- [ ] **OUT-013** claudetto shall not carry domain-specific iOS accessibility-tree checks (about 2.2 s against about 22 s per check; a vendor tool, 0.15 GB against 11.2 GB for 5 agents).
  Acceptance: no iOS check ships. Verification: inspection.
  Basis: reported (vendor claim). Status: have at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xcso5g-stop-letting-claude-code-boot-20261023T040754Z.md:34 (url: https://www.reddit.com/r/ClaudeCode/comments/1xcso5g/stop_letting_claude_code_boot_the_ios_simulator); external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:95.

- [ ] **OUT-014** claudetto shall not offer a setup option "Bun commands in a Bun repo". the user finds it proprietary and one of many, not general, and unnecessary.
  Acceptance: the setup option list has no entry for it. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`git grep -i 'Bun commands' 088a227c -- plugins` finds no match).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/1fdf6a81-2b6c-44ce-bd8b-58dc14d2eb59.jsonl:15 (user decision, 2026-11-09).

- [ ] **OUT-015** claudetto shall not build an End Stuck Agents hook that stops an agent after an hour or more with no real changes.
  Acceptance: no hook of claudetto ends an agent for lack of file changes; the stall timeout CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS is the only silence limit. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/run-limits/spec.md:10 (the idea came from an r/claudeai comment and was never built; the source holds no thread URL).

- [ ] **OUT-016** claudetto shall not ship the run-limit mod parts that built-in keys replace: Hold Subagent Fan-Out, Subagent Starts Under Cap, End Stuck Agents, and the output head and tail cut (`bashOutputMaxChars` and `MAX_MCP_OUTPUT_TOKENS` replace it; Claude Code saves the rest itself). The memory hold and the Budget line stay (no key does either), as do counters that count only writes that ran, an interrupt not counting as a failure, heartbeat and window files for the status line, Stop waiting for or removing the session's leftovers (a subagent removes only its own), and background tasks and open items checked at Stop. Limits (window, heavy-call cap, fail limits, memory limits, `notificationsEnabled`) come from userConfig; the design borrows from agent-usage-guard and loop-breaker (MIT) with no value in the spec. Also out: `useBudgetRun`, `useClaudettoAgents/delegation.ts`, `useAdvisorTool`, `useAdvisorCommand`, and the `useBashRules` gate, plus the `window` store and `model-row`, and the worktree-base, context7, and general-rules features (the settings `env` reaches `bunx ctx7`, probe 2.4).
  Basis: measured (CC 2.1.322, fake API) and reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts` has `bashOutputMaxChars`; `features/memory`, `features/hygiene`).
  Source: openspec/specs/run-limits/spec.md:8.

- [ ] **OUT-017** claudetto shall not ship these parts: always-on MCP servers; the `window` store; `model-row`; and the setup text for sandbox refusals. A dedicated fetch tool (`mcp__claudetto__web_fetch`) stands beside the built-in; a CLI is driven through a skill (ctx7) over MCP.
  Basis: measured (probe 2.4). Status: partial at 088a227c (`plugins/claudetto/skills/docs`).
  Source: unresolved: no source line located for this claim.

- [ ] **OUT-018** claudetto shall not build any of the 23 harness anti-patterns W3-1 to W3-23: premature multi-agent, agent-as-business-process, invisible state, mega-prompt with unprioritised NEVER/ALWAYS, prompting as the only control ("NEVER delete data"), context stuffing, never compacting, edge-case laundry lists, tool soup, opaque tools, unbounded retries without idempotency, one-shotting, premature victory, free-form progress files, demo-grade in production, no evals/tracing/budgets/kill switch, self-grading, all-or-nothing autonomy, unversioned prompts or auto-upgraded alias, anthropomorphizing.
  Acceptance: no claudetto feature is a W3 item; the list serves as negative design input only. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: external/please-use-me-often/swe-worst-practices.md:115 (W3-1) to :145 (W3-23).

- [ ] **OUT-019** claudetto shall not gate on measured-target caps tuned to match stock or rival numbers (root prompt <=5,832 chars, output style <=1,373 chars, no source-line growth); the one cap kept is the 200-char description limit.
  Acceptance: no test or script fails on the 5,832-char, 1,373-char, or source-line caps; the 200-char description scan stays. Verification: inspection.
  Basis: inferred. Status: missing at 088a227c (`compose.test.ts:60` still asserts the 5,832-char cap).
  Source: unresolved: the sources hold the caps as targets (openspec/changes/2-1-325-rearchitecture/design.md:11-13; openspec/changes/2-1-325-rearchitecture/tasks.md:26-28) and no source states their removal; kept from the user's curation of the old plan. plugins/claudetto/hooks/features/prompt/compose.test.ts:60@088a227c.

- [ ] **OUT-020** claudetto shall not carry the requirements "A Delegated Edit Comes Back with Its Check", "One Place Sets the Subagent Cache TTL" (it rested on `runs.jsonl`), "No Subagent Type Runs the Root Prompt", and "A Delegated Edit Is Checked When It Returns" (`ROOT_PROMPT` is gone).
  Acceptance: no spec, test, or text states these four requirements. Verification: inspection.
  Basis: read. Status: have at 088a227c (no `ROOT_PROMPT` or `runs.jsonl` writer in `plugins/`).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/subagent-prompts/spec.md:86-92 (Reason: the scenarios rest on `runs.jsonl`); openspec/changes/archive/2026-11-16-2-1-323/specs/subagent-prompts/spec.md:146 and :151.

- [ ] **OUT-021** claudetto shall not keep these files and features: `decider/fallback.ts` (judgments move to prompt-type classic hooks), `kill.ts`, the worktree ownership check in `own.ts`, the endless-wait check, the read guard (`surfaceCall`, `heavyFile`, `REFUSAL`, `readGuardEnabled`), `useBashRules`, the vendored rules, fixtures, licence, `gate.mock.ts`, `useSliceCommits`, the grader, `named-files.ts`, the stop and turn files, `useConstraintPin`, `useAskFix`.
  Acceptance: none of these names exists under `plugins/`. Verification: inspection (`git grep` of each name).
  Basis: read. Status: have at 088a227c (none of the names is in the baseline tree; `git grep` finds `surfaceCall`, `heavyFile`, `readGuardEnabled`, `useAskFix` in no file).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:35-47 (5.1-6.1: delete `useBashRules`, vendored rules, `gate.mock.ts`, read guard, `useSliceCommits`, `grade.ts`, `named-files.ts`, `stop.ts`, `turn.ts`); openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:65,109,110,122 (`useSliceCommits`, `useConstraintPin`, `useAskFix`); openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:16 (`gate.mock.ts`). Not located: `kill.ts` and `own.ts` rows in the D323 task list (found only as `gate/kill.ts`, `gate/own.ts` in openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:116,270).

- [ ] **OUT-022** claudetto shall not patch or un-minify the Claude Code CLI to change the system prompt (repo policy forbids). The reported unofficial alternative `CLAUDE_CODE_THRIFTY_SONIC=0` (a cat-and-sed hint in bypass mode) is written by setup and marked unofficial.
  Acceptance: no code patches the CLI binary or npm package; setup writes `CLAUDE_CODE_THRIFTY_SONIC=0`. Verification: inspection.
  Basis: reported. Status: have at 088a227c (`settings.ts:197` writes it). `CLAUDE_CODE_THRIFTY_SONIC` is present in 2.1.326 at `chunk-07n5vvax.js@19159` (cc-inspect `code` search); its effect is unverified in 2.1.326.
  Source: external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:65; openspec/specs/surface-trim/spec.md:138; plugins/claudetto/hooks/features/setup/settings.ts:197@088a227c.

- [ ] **OUT-023** claudetto shall not carry internal IDs (P191, P192, P223, R20, R28, R35, R36, R38, R48, task numbers, decision dates, test file paths, `openingJudge`) in ported spec text. Setup spec cites P191, P192, P223, test file paths, an old group list ("Smaller prompt"); run-limits spec carries decision dates, task numbers (9.22, 9.31, 10.21), test file names; agent-conduct cites R20, R28, R35, R36, R38, R48 and an `openingJudge` option; the grader/unread-grade blocks and Stop-time model judge are rejected ("No Stop-time model call"). Drop IDs when porting; source carries no IDs (project CLAUDE.md rule; read).
  Acceptance: No ported item holds an internal ID; the project CLAUDE.md rule forbids them. Verification: inspection.
  Basis: cited. Status: have at 088a227c (the old specs carry them; the baseline spec tree is deleted).
  Source: openspec/specs/setup/spec.md:354; openspec/specs/run-limits/spec.md:418; openspec/specs/agent-conduct/spec.md:402; openspec/specs/agent-conduct/spec.md:162; openspec/specs/agent-conduct/spec.md:195.

- [ ] **OUT-024** claudetto shall not carry the approved deletion list: `ask-user-question`, `monitor`, handoff tool/command/files, answer-first gate, `.created-by-claudetto` marker, `runs.jsonl`, `gate-asks`, `maxSubagentStarts`, `agentMaxMinutes`, `typesafeApiKey`, claim-check Decider and tuner tooling, wording-tests check, and the other names in Detail.
  Acceptance: None of the listed names exists in the target tree. Verification: inspection.
  Basis: cited. Status: partial (marker, ledger, ask-user-question absent at 088a227c; claim-check tooling still under tools/).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:253; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:20; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:846.

- [ ] **OUT-025** claudetto shall not carry generator indirection for schemas (`Generated by just generate from .../presets/`, config.yaml `schema: spec-driven`); setup has one path and repo-gate removed tools/generate. Generator indirection for schemas (`Generated by just generate from .../presets/`, config.yaml `schema: spec-driven`): two-path setup; repo-gate removed tools/generate.
  Acceptance: No `tools/generate` and no `schema: spec-driven` indirection in the target tree. Verification: inspection.
  Basis: cited. Status: have at 088a227c (tools/ holds no generate).
  Source: unresolved: the old key B names a worker input; no line holding the repo-gate removal was found in this pass.

- [ ] **OUT-026** claudetto shall list the status line external defect report IDs D1-D4 and D7 as unknown, because the report lived outside the repo and is lost. Status line external defect report IDs D1-D4, D7 (report outside repo, lost): cannot port, list as unknown. Dark-theme colours on every theme (color.ts:11-13,49) already fixed by theme mapping.
  Acceptance: No requirement cites D1-D4 or D7. Dark-theme colours on every theme (`color.ts:11-13,49`) are fixed by the theme mapping. Verification: inspection.
  Basis: reported. Status: have at 088a227c (theme mapping in statusline/color.ts).
  Source: openspec/specs/status-line/spec.md:222; unresolved: the defect report is outside the repo and lost.

- [ ] **OUT-027** claudetto shall not use the held-out run of tasks 12.1 (54 mined cases labeled only by tool count) as a measure. Held-out run of tasks 12.1 (54 mined cases labeled only by tool count): invalid measure (26/29 replies about having no tools; judge flagged 5/28 ok replies). Withdrawn.
  Acceptance: The run is withdrawn: 26 of 29 replies were about having no tools; the judge flagged 5 of 28 ok replies. Verification: inspection.
  Basis: measured. Status: have at 088a227c (not in the tree).
  Source: unresolved: task 12.1 text not found by grep in this pass.

- [ ] **OUT-028** claudetto shall not wrap Claude's commands in `taskpolicy -c background`. `taskpolicy -c background` for Claude's commands: starves (0 loops in two minutes); `utility` ~20% throughput.
  Acceptance: No `taskpolicy` call exists. Measured: background starves (0 loops in two minutes); `utility` costs about 20% throughput. Verification: inspection.
  Basis: measured. Status: have at 088a227c (git grep taskpolicy not run).
  Source: unresolved: no line found by grep in this pass.

- [ ] **OUT-029** claudetto shall not register `mcp__claudetto__ask-user-question` or `mcp__claudetto__monitor`. Wrapper tools `mcp__claudetto__ask-user-question` and `mcp__claudetto__monitor`: no effect added; plugin-tool popup answers invisible to the classifier; Monitor's promise "expires unless source ends first" false for `tail -F`.
  Acceptance: Neither tool exists. No effect added; plugin-tool popup answers are invisible to the classifier; Monitor's promise "expires unless source ends first" is false for `tail -F`. Verification: inspection.
  Basis: cited. Status: have at 088a227c (wrappers removed).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:392; external/2026-10-12_p2/export-Claude Code's subagent limits are per session, so I built a mod that counts across all of them.jsonl:5 (url: https://www.reddit.com/r/ClaudeCode/comments/1x3lx5o/claude_codes_subagent_limits_are_per_session_so_i).

- [ ] **OUT-030** claudetto shall not carry a second Jev builder, `settle.ts`, `questions.ts`, or the hand-written branch-delete regex (25 of 40). Second Jev builder / `settle.ts` / `questions.ts`: two builders pinned different versions, path B had no production caller; dropped for one decider. Hand-written branch-delete regex (25/40).
  Acceptance: One decider module exists. Two builders pinned different versions; path B had no production caller. Verification: inspection.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/specs/decider/spec.md:8; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:253.

- [ ] **OUT-031** claudetto shall not carry the marker file `.created-by-claudetto` (350 denials, no benefit), the `/restart` and `/loop` commands, hard-coded `Tool.version`/`SCANNER_VERSION`, or own mutation scripts (probe-76) in the repo. Marker file `.created-by-claudetto` (350 denials, no benefit). `/restart` and `/loop` commands. Hard-coded `Tool.version`/`SCANNER_VERSION`. Own mutation scripts (probe-76) out of repo.
  Acceptance: None of these exists in the tree. Verification: inspection.
  Basis: measured. Status: have at 088a227c (git grep created-by-claudetto and SCANNER_VERSION find no hit).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-hygiene/spec.md:61; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:253.

- [ ] **OUT-032** claudetto shall keep one version-floor constant (2.1.323), not a Purpose stating 2.1.316; task 9.2 (publish to the xsyetopz marketplace) stays open because the marketplace serves base commit 6f81c479 and branch work is active only via `claudetto-dev`. Spec Purpose stating floor 2.1.316 while requirements say 2.1.323 (keep one constant). Task 9.2 publish to the xsyetopz marketplace still open (marketplace serves base commit 6f81c479; branch work active via `claudetto-dev` only).
  Acceptance: One constant `MINIMUM_VERSION = "2.1.323"` serves. Verification: inspection.
  Basis: cited. Status: have at 088a227c (settings.ts:19).
  Source: openspec/specs/version-floor/spec.md:8; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:768; plugins/claudetto/hooks/features/setup/settings.ts:19@088a227c.

- [ ] **OUT-033** claudetto shall not build a per-session cold-cache resume report from `~/.claude/projects/<project>/` JSONL; it is a cc-inspect idea from a reported dashboard that was not examined. Per-session cold-cache resume report from `~/.claude/projects/<project>/` JSONL for cc-inspect (reported dashboard, not examined).
  Acceptance: No such report ships. Verification: inspection.
  Basis: reported. Status: have at 088a227c (not in the tree).
  Source: unresolved: the old key F names a worker input that no longer exists.

- [ ] **OUT-034** claudetto shall not repair the clipboard for the fullscreen TUI (anthropics/claude-code#81472, 42 reports; third-party kbrianps/claude-clean-copy); note only. Tested only on Ubuntu Wayland with Ghostty. Clipboard repair for the fullscreen TUI (anthropics/claude-code#81472, 42 reports; third-party kbrianps/claude-clean-copy): not a claudetto job, note only; tested only on Ubuntu Wayland with Ghostty.
  Acceptance: No clipboard code exists. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/2026-10-07/export-I made a plugin that fixes copy-paste from the Claude Code terminal (no more gutter bar and broken l.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1wyfyz8/i_made_a_plugin_that_fixes_copypaste_from_the).

- [ ] **OUT-035** claudetto shall drop these baseline parts: own secret regexes and env-file rules (`hooks/handoff/secrets.ts`, `gate/env.ts`, the `.env` rules of `gate/rules.ts`), own classifier plus hook feedback plus approval rules plus `classify-spend`, the whole 4,677-line gate (`ASK_PROTECTED` dropped; `DENY_ROOT` stays deny), the `window` row store, `model-row`, the `window-report` tool, the `asCompaction` wrapper, the cheap-summary path, per-tier one-row rules, the `bun src/tiers/setup.ts` CLI, setup running `openspec init`, the subagent-cap option and tier row, the "golf score" requirement, "Built-in Agents Are Denied", `ISSUES*.md` defect filing (owner: nobody told the plugin to file there), the `worktree.symlinkDirectories` write, `renice -n 10` stacking (use `renice 10 -p $$`), dead spec rows (session-handoff size-0 check, composer-origin `/clear`), 22 matched `tool.check` and `tool.call` registrations plus `ANY_TOOL`, the unused `Io` and `Session` forwarding interfaces, and `statusline/subagents.ts`.
  Acceptance: none of these paths exists in the target tree. Basis: cited. Status: have at 088a227c (the parts exist there and are to be removed).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:47; openspec/changes/archive/2026-11-09-release-2-1-319/proposal.md:3; openspec/changes/archive/2026-11-09-release-2-1-319/feature-map.md:43; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:146; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:384; openspec/changes/archive/2026-11-13-feat-2-1-321/proposal.md:9; openspec/changes/archive/2026-11-13-feat-2-1-321/proposal.md:26; openspec/specs/low-hitl/spec.md:169.

- [ ] **OUT-036** claudetto shall not ship auto memory without review, a post-hoc output-stripping mod, an unattended video-generation showcase (portable item: an explicit spend cap in the prompt), star-count authority, an anti Claude-speak joke thread, claude.ai chat-length and onboarding posts, or misc jokes.
  Acceptance: none present. Basis: reported. Status: n/a.
  Source: unresolved: no matching line found in external/; kept because the user curated it.

- [ ] **OUT-037** claudetto shall not ship its own sandbox wrapper (`CLAUDE_CODE_SHELL_PREFIX` to `sandbox-exec`, an SBPL profile, a bun domain proxy, `sandboxConfig`, `confine`). Seatbelt refuses a profile applied under a profile with a deny rule, so the wrapper cannot nest in Claude Code's sandbox (measured 2.1.319). The user chose to keep the built-in sandbox and customise it; a 2026-11-17 probe on 2.1.326 confirmed the choice (see the sandbox friction item).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/sandbox/spec.md:61; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/sandbox/spec.md:66; user decision, 2026-11-06 (quoted in the spec).
  Conflict: The sandbox friction items (a sandbox that blocks work and does not protect) shall be settled by a fix of the sandbox, or its removal, never kept as is.

- [ ] **OUT-038** claudetto shall not keep the claim check C7 as a 3-case YES/NO check, the Haiku-extracted `unseen` fault, the Noul-per-judgment replacement of the Stop claim check, or the Decider claim-check question set with thresholds `noMax` 0.65 and `yesMin` 0.75. the thresholds raised the exact match on the 88 tuning cases from 53 to 56, and the claim check stayed below the grading it replaced (P69). The plan's figures 22/40 against 32/40 held-out and recall 0/3 were not found by grep in the source.
  Basis: measured (88 tuning cases).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:192.

- [ ] **OUT-039** claudetto shall not ship `fold.ts`, the render hook that folded tool results. with `fold.ts` deleted the engine folds grouped search and shell results itself (checked on a real install, interactive screen, 2026-11-09).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/surface-trim/spec.md:15; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:165; openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:49.

- [ ] **OUT-040** claudetto shall not use a hook-only guard for subagent bursts. plain hooks run for 75 days cut the largest burst from 365 starts in ten minutes to 27, and the lockouts kept coming; a median of 12 main sessions had been running before each lockout.
  Basis: reported, one user.
  Source: external/2026-10-12_p2/export-Claude Code's subagent limits are per session, so I built a mod that counts across all of them.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x3lx5o/claude_codes_subagent_limits_are_per_session_so_i).

- [ ] **OUT-041** claudetto shall not implement workarounds for web-fetch refusals (email drafts, a browser extension, delegating to Codex). a policy topic, off-topic for the plugin.
  Basis: reported, users.
  Source: external/2026-10-11/export-Why is it so fussed over web scraping now-.jsonl:29; external/2026-10-11/export-Why is it so fussed over web scraping now-.jsonl:58; external/2026-10-11/export-Why is it so fussed over web scraping now-.jsonl:73 (url: see export header line 1).

#### Removed Bash Gate And Permission Rules

- [ ] **OUT-042** claudetto shall not ship the Gradle rule (deny `mvn`, `ant`, `sbt` in a Gradle build with no `pom.xml`) or the `just` rule (route `make` to `just` for the recipe names a `justfile` holds). The equivalence table has no row for either, and a `justfile` rule needs its recipe names. `karanb192/claude-code-hooks` `protect-tests` is a candidate rule of the same parser. Xmake, `pnpx`, and Deno need the equivalence table of task 3.6a first.
  Basis: read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:172.

- [ ] **OUT-043** claudetto shall not deny whole-repo formatter calls in a mod (`bun fmt` with no path or `.` unless `--check`, `--staged`, `--changed`, or `--stdin-filepath`; prettier or biome `--write` with no path or `.`). The rule judges a Bash command, which conflicts with D323: no mod judges a Bash command ([ADR-0125](../adr/0125-bash-gate-replaced-by-permission-rules.md)). Consequence of the gap: a whole-repo format rewrites files outside the task.
  Acceptance: No mod denies a formatter call. Verification: inspection.
  Basis: reported. Status: missing (and not to be built) at 088a227c.
  Source: [ADR-0125](../adr/0125-bash-gate-replaced-by-permission-rules.md); openspec/changes/archive/2026-11-09-release-2-1-319/design.md:344. Not located: the old-plan line (tag B:221).

- [ ] **OUT-044** claudetto shall not ask in a mod before Bash writes into `plugins/<name>/hooks/` (`writeTargets`: redirect targets, `tee`, `rm`, `sed -i` operands, last operand of `cp` and `mv`, plus `PLUGIN_HOOKS`), nor on `git push origin :main` and rewriting-push spellings. The rule judges a Bash command, which conflicts with D323: no mod judges a Bash command. Built-in checks ask for Bash writes into `.claude/`, `~/.claude/`, `.git/hooks/` and for a Write or Edit of plugins/, not for Bash writes into `plugins/<name>/hooks/` (`echo b > ...`, `cp` ran). Not covered even then: a path built by expansion or `cd` first, `..`, other folder names. The test-tamper check is not built (not sound: 100 commits delete tests, two of three forms are indistinguishable).
  Acceptance: No mod inspects Bash write targets. Verification: inspection.
  Basis: measured (reproduced). Status: missing (and not to be built) at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:344 (`writeTargets`); [ADR-0125](../adr/0125-bash-gate-replaced-by-permission-rules.md). Not located: the old-plan lines (tags C:60, C:67, B:233).

- [ ] **OUT-045** claudetto shall not gate `git commit` with a certificate (`commit_gate = all(scope, check_ran, no_uov_change, no_secret, no_narration, msg_ok)`; PreToolUse on `git commit` checks the staged diff and message). This  Slice commits (one revertable commit per finished slice, `git commit --only <paths>`, never `git add -A` or `git add .` in a shared tree) stay a convention in project instructions.
  Acceptance: No hook judges a `git commit` command. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: [ADR-0125](../adr/0125-bash-gate-replaced-by-permission-rules.md); [ADR-0154](../adr/0154-repeated-failure-refusal-removed.md). Not located: tags A:174, A:193, A:197. Conflicts with: no mod judges a Bash command (D323).

- [ ] **OUT-046** claudetto shall not deny package-tool mismatches (`bun.lock` without `package-lock.json` denies other JS installers; `xmake.lua` without `CMakeLists.txt` denies `cmake -B build`) or redirect/tee into a system folder as `claudetto:write-system-path`; D323 removed the gate and no setting takes over.
  Acceptance: No such denial exists. Claude Code's own permission check and the autoMode lists judge the command. Verification: inspection.
  Basis: cited. Status: missing at 088a227c (git grep write-system-path finds no hit).
  Source: openspec/specs/dangerous-commands/spec.md:55; openspec/specs/dangerous-commands/spec.md:72; openspec/specs/dangerous-commands/spec.md:78; openspec/changes/archive/2026-11-16-2-1-323/specs/dangerous-commands/spec.md:19.

- [ ] **OUT-047** claudetto shall not deny a shell in-place edit (`sed`/`perl`/`ruby` with `-i`/`--in-place`); D323 removed the denial and the write advice stays in the Bash tool text. `sed`/`perl`/`ruby` with `-i`/`--in-place` as own flag (alone, chained, behind `xargs`, in `find -exec|-execdir|-ok|-okdir`) denied naming `Edit` with the file (skips the edit tool's diff and review); a letter in another flag's value (`perl -Mstrict`, `ruby -rtime`, `sed -es/i/j/`) and flags after the script file (`perl tool.pl -i in.txt`) pass. Basis: reproduced. have: partial (only a repeat test names it; rule not found by rg in hooks/kernel/shell).
  Acceptance: No denial enforces it. Basis of the old rule: reproduced. Verification: inspection.
  Basis: cited. Status: missing at 088a227c (the rule is gone from hooks/kernel/shell).
  Source: openspec/specs/permission-policy/spec.md:346; openspec/specs/permission-policy/spec.md:348; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:223.

- [ ] **OUT-048** claudetto shall not deny a `cat`/`head`/`tail`/`sed -n` read of a file with a `Read` redirect; D323 removed it and the read advice stays in the Bash tool text. `cat`/`head`/`tail`/`sed -n` of a file, anywhere in a chain, denied with a `Read` call; `file_path` = the operand that is no option or sed script in any spelling (`--quiet 1,80p`, `-n --expression=1p`, `-n -e1p`); `sed -n 1,80p f` and `head -N` give offset+limit; `cat f`, `tail -n 5 f`, `sed -n '$p' f` give none; read piped into a worker (`cat f | wc -l`) runs, into a viewer (cat/head/less/more/nl/tail/sed -n) is denied. Basis: reproduced. have: missing (rg "offset" finds no gate).
  Acceptance: No denial enforces it. Basis of the old rule: reproduced. Verification: inspection.
  Basis: cited. Status: missing at 088a227c (git grep finds no read-redirect gate).
  Source: openspec/specs/permission-policy/spec.md:131; openspec/specs/permission-policy/spec.md:133; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:133.

- [ ] **OUT-049** claudetto shall not carry the recreate gate (`GATE_RECREATE`: an ask on a Write or Bash create of a path the session saw and that is now gone); D323 removed it and no setting takes over. Record each path a successful call read, listed, or wrote, and each path the session removed; a Write or Bash create (Write, cp/mv target, `touch`, last `ln` operand; `sed -i` cannot create) of a path seen and now gone, not removed by the session, gets `ask` (`GATE_RECREATE`). Paths keyed by landing place (`~` from HOME, symlinks resolved via `$.fs.stat`: /tmp -> /private/tmp; gone path uses its folder's real path); `ls`/Glob/Grep listing marks entries seen; removal counts only after the command ran and the path is gone (a failed `rm` does not); in-flight or failed reads do not count; first call replays the transcript's finished non-error tool uses so state survives `--resume`; a Bash operand the engine refuses to read as a path (grep pattern as network location) counts as not there. Not handled: removed symlink keyed under its target, `~user`. Consequence: recreating a file the user deleted undoes the deletion. `$.fs.stat` and `$.fs.exists`: unverified in 2.1.326. missing (rg "GATE_RECREATE|vanish" finds only eval reports).
  Acceptance: No recreate ask exists. Verification: inspection.
  Basis: cited. Status: missing at 088a227c (git grep GATE_RECREATE finds no hit).
  Source: openspec/specs/permission-policy/spec.md:321; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:271; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:211; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:217.

- [ ] **OUT-050** claudetto shall not carry the standing-instruction rule that lets an edit pass under a remark; D323 removed it with no migration (an edit runs under the `permissions` rules that setup writes). Work gate reads the user's earlier messages; allows an edit when the newest message is a remark under a standing instruction from one of them (earlier "add any blocker to the next issues list", then a remark naming another fault, lets the Edit to the issues file run with no popup). Without it: needless popups. missing.
  Acceptance: No work gate reads earlier messages. Verification: inspection.
  Basis: cited. Status: missing at 088a227c.
  Source: openspec/specs/permission-policy/spec.md:180; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:79.

- [ ] **OUT-051** claudetto shall not carry the gate parse fixes (`[`/`[[` as glob, `.env` as text, `gateRmTmp`); D323 removed the gate, Claude Code denies `rm` of `$dir/`, `$dir/*`, `$(...)` itself, and the sandbox write scope bounds an `rm`. `[` and `[[` as program counted as glob -> "cannot read this command" (found by a probe; the wait-loop text `until check || [ $SECONDS -gt 1800 ]; do sleep 30; done` triggered it). `.env` as text in a pattern or quoted name is not an env-file read. A denial that gave no reason is not retried. Claude Code denies `rm` of `$dir/`, `$dir/*`, `$(...)`; `gateRmTmp` teaches the literal path; `rm` of the temp base or a path with `..` denied; mkdir/mktemp/write/rm under a temp base pass (measured). have: partial (kernel/shell).
  Acceptance: No gate parser exists. Verification: inspection.
  Basis: measured. Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:582; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:104; openspec/specs/permission-policy/spec.md:481; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:277.

- [ ] **OUT-052** claudetto shall not judge branch deletion through the Decider (Noul 36/40 vs regexes 25/40; two confident false yeses); D323 replaced it with a setup-written `permissions.ask` for a branch delete. `git branch -D` of a branch the session did not create ASKS (not denies): one Noul over the user's messages, "does a message ask to delete this branch by name or as a group", reading the user's latest word and counting an instruction, not a question; `yes` allows; `no`, `unsettled`, Decider failure ask the user; "get rid of the stale branches, old-feature included" counts, "do not delete old-feature" asks. Measured: Noul 36/40 vs regexes 25/40; two confident false yeses (retracted request 0.97; "Is it safe to delete old-feature?" 0.91) only wording can fix. Hand regex `DELETES/NEGATED/OTHER_BRANCHES` goes. A branch the session created (`update-ref refs/heads/<name>`, `branch -f`) and `rm` under a temp base meet no ask. Ledger: `Intl.Segmenter`, sentence cap per message set, first call covers every earlier message. note: D323 may reverse. have: partial (setup/command-rules.ts; kernel/decider exists).
  Acceptance: A `git branch -D` asks in Claude Code's dialog; no Decider call exists for it. Verification: inspection.
  Basis: measured. Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:121; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:127.

- [ ] **OUT-053** claudetto shall not rewrite a command inside a hook; it blocks with a reason instead. in 2.1.319 a changed tool input voids auto mode's review (`serverClassifierInputRewritten`), and the call returns "gave no verdict". Basis: measured.
  Source: openspec/specs/low-hitl/spec.md:249; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/low-hitl/spec.md:5.

#### Stop Checks And Completion Gates

- [ ] **OUT-054** claudetto shall not block at Stop to ask for commits, and so needs no `changedOf` filter for `<cwd>/.claude/worktrees/` paths (the commit check was a real catch for 47% of 230 blocks in 7 days, partial for 27%); the commit rule stays a prompt line. D323 removed the slice-commit Stop block.
  Acceptance: No Stop hook runs a commit check. Verification: inspection.
  Basis: measured. Status: missing (and not to be built) at 088a227c.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:142 (nags removed). Not located: the 47% of 230 count.

- [ ] **OUT-055** claudetto shall not run a named-files check at Stop, so it needs no path-operand rule for it (do not treat a grep pattern such as `/\|Catalog/` or `/\.git/` as a path: `$.fs.exists` throws on `/\` paths and a throwing check loses every check of that stop and fires "The gate failed"). D323 removed the named-files check. The `$.fs.exists` fact is in arc42/03.
  Acceptance: No Stop hook calls `$.fs.exists` on operands. Verification: inspection.
  Basis: measured (reproduced). Status: missing (and not to be built) at 088a227c.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:142 (nags removed). Not located: the named-files check lines.

- [ ] **OUT-056** claudetto shall not ship a regex or word-list Stop check: not a scan of the last reply for tool-call syntax, a pattern for announce-next-work, deflection, confession, or day-week-month wording, or an opener word list. Several cures in `risk-register.md` first named such a check (Tool call as text, Premature stop, Skipped-part completion, Confession instead of fact, Miscalibrated estimate); each risk now lists a non-regex cure, and a Haiku-graded or transcript-structure check stays allowed.
  Basis: reported. Status: missing at 088a227c.
  Source: user decision, 2026-11-16; external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:154,161; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:281 (word lists failed: 10 of 12 evasions passed, as the old plan states it).

#### Model Routing And Subagent Models

- [ ] **OUT-057** claudetto shall not route Sonnet-implements and Opus-reviews for simple tasks (measured costlier than Opus alone) or tiered thinker, planner, and typist chains (contested).
  Acceptance: no default chain routes a simple task through a second model. Verification: inspection.
  Basis: measured (one measurement); reported (chains contested). Status: have at 088a227c.
  Source: external/2026-10-12/export-I tested Haiku 5.5, Sonnet 5.5 and Opus 5.5 as subagents on 6 real tasks.jsonl:25 (url: https://www.reddit.com/r/ClaudeAI/comments/1x1nsaz/i_tested_haiku_55_sonnet_55_and_opus_55_as).

- [ ] **OUT-058** claudetto shall not route by price per token without measuring the tokenizer change, and shall not state fixed-weight cost headlines ("75% of spend is cache reads").
  Acceptance: no routing rule cites a price per token alone. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: unresolved: no source line holds the "75% of spend is cache reads" headline.

- [ ] **OUT-059** claudetto shall not carry the "Sonnet beats Opus" Terminal-Bench headline (Sonnet at max against Opus at xhigh; at the same effort 61.5% against 66.4%).
  Acceptance: no text cites the headline. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:257; external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:72.

- [ ] **OUT-060** claudetto shall not let subagents share the main checkout for git operations, nor run `git stash` in one (see the shared-checkout rules in `prd/delegation.md`).
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/conduct.jsonl:43.

- [ ] **OUT-061** claudetto shall not set overnight or uncapped parallelism as a goal, nor agent swarms as a default: heavy users get there through parallel sessions across repos; swarms burn allowance with no gain over ticket-by-ticket; a Codex orchestrator spent 16 h and over 90% of the allowance on a 9,800-line deploy script; 82% of one user's usage came from subagent-heavy sessions. Unconstrained subagent spawning outside a defined pipeline and Ultracode-style unbounded fan-out go.
  Basis: reported. Status: not applicable.
  Source: unresolved: no source line located for this claim.

- [ ] **OUT-062** claudetto shall not force every subagent onto one cheap model through the global env (it overrides deliberately bigger agents and degrades work), shall not give percentage splits ("10% Haiku, 50% Sonnet, 40% Opus"), and shall not use Haiku as a long-conversation worker (it crosses the 100k step; 3x faster and 11x less subscription usage held only on a 10,000-call single-turn job).
  Basis: reported. Status: not applicable (the setup env sets `CLAUDE_CODE_SUBAGENT_MODEL` without `_FORCE`; see the subagent-model-precedence ADR).
  Source: unresolved: no source line located for this claim.

- [ ] **OUT-063** claudetto shall not build an orchestrator-Opus that delegates everything: the orchestrator's planning and review turns dominate and the cost is about equal to Opus alone (measured by one poster).
  Basis: measured (one poster). Status: not applicable.
  Source: unresolved: no source line located for this claim.

- [ ] **OUT-064** claudetto shall not use Haiku 5.5 as the main coding agent or Fable as orchestrator for everything.
  Acceptance: Haiku keeps to bounded, verifiable jobs; Fable spawned 5 agents for 1 agent's work (contested, others run it for months). Basis: reported. Status: n/a.
  Source: external/2026-10-11/export-Haiku 5.5 token usage.jsonl:9.

#### Compaction And Handover

- [ ] **OUT-065** claudetto shall not keep the stock `includeGitInstructions` text or the auto, idle, and precomputed compaction. At `088a227c` `settings.ts` sets `includeGitInstructions: false` and `precomputeCompactionEnabled: false`, and `includeBetterGitInstructions` appears nowhere (plugins/claudetto/hooks/features/setup/settings.ts:166-172@088a227c).
  Basis: reported, user feature list.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:752; user decision, 2026-11-04.

- [ ] **OUT-066** claudetto shall not build a session-handoff tool, and shall not end the main turn with $.turn.abort after a handoff file is written.
  Acceptance: no handoff tool and no turn.abort call exists in claudetto; handover is written by the compaction path and by manual /clear. Verification: inspection.
  Basis: cited. Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-handoff/spec.md:86 (the tool would end the turn with $.turn.abort, run clear and submit from a timer after idle, and show one line when the abort fails); user-approved deletion list in plans/rebuild-curation.md:1410, which drops the handoff tool.

- [ ] **OUT-067** claudetto shall not state "never compact" or "always compact" as dogma; no endless compaction as default, no `/compact` as main memory strategy, no handoff prompt or `/compact` asked of a 900k session (it pays the full cold read; use a notes file kept current), no month-long single session.
  Acceptance: the measurable rule lives in the ADR on compaction stance. Basis: reported, contested. Status: n/a.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:44 (url: https://www.reddit.com/r/ClaudeAI/comments/1xsgul7/does_anyone_other_than_opus_and_fable_actually) (900k session); external/export--clear vs -compact.jsonl:2.

- [ ] **OUT-068** claudetto shall not leave auto-compact at the default of about 967K for cost-sensitive users, and shall not claim that turning auto-compact off shrinks context (the 85k-to-38k saving was a reserved buffer shown as used; reported both ways, unresolved).
  Acceptance: window tuning or handoff at 150-250k with a toggle replaces it. Basis: reported. Status: n/a.
  Source: external/2026-10-12_p3/export-How's 1m context window now-.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x40hlw/hows_1m_context_window_now).

- [ ] **OUT-069** claudetto shall not use `/export` pasted into a fresh session as a handoff, a hand-written handoff for "working style", or generic piling of more instructions on drift.
  Acceptance: pasted history refills the context; working style does not transfer by prose; change what rules are made of (provenance, enforcement) instead. Basis: reported. Status: n/a.
  Source: external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:61.

#### You Should Know

- [ ] **OUT-070** Triage through the `mcp__claudetto__decide` tool goes. claudetto shall not call `mcp__claudetto__decide` (`JEV_CALL`, `triageQuestion`, `JEV_NO`) before a check; the builtin has no triage step.
  Basis: cited.
  Source: plugins/claudetto-you-should-know/hooks/register.ts:106@088a227c; plugins/claudetto-you-should-know/hooks/texts.ts:77-85@088a227c; chunk-na8s6d5h.js@82099, chunk-na8s6d5h.js@85421 (claude 2.1.326 binary).

- [ ] **OUT-071** The check settings for model, effort, digest and token limits go. claudetto shall not offer `sideCheckModel` and `sideCheckEffortLevel`, build the 8-entry log digest, or set `maxTokens 512` and `timeoutMs 20000`; `model.fork` takes no model or effort option and shares the live conversation.
  Basis: cited.
  Source: plugins/claudetto-you-should-know/hooks/register.ts:99-121@088a227c; plugins/claudetto-you-should-know/hooks/note.ts:16-22@088a227c; plugins/claudetto-you-should-know/.claude-plugin/plugin.json:22-28@088a227c; chunk-na8s6d5h.js@82099, chunk-na8s6d5h.js@85421 (claude 2.1.326 binary).

- [ ] **OUT-072** The page-writing flow of You should know stays unbuilt. claudetto shall not build the `making` and `ready` rows, `learn_page`, the page-writing prompt `Tn(...)` and these strings. No button creates a `making` view in 2.1.326 (cc-inspect `code` search for `kind:"making"` finds no hit), so none of it is reachable. Strings kept for the record: `Making your page (a minute or two) · Claude keeps working…`; ready row `Learning page ready` with `1 Helpful`, `2 Not helpful`, `3 Didn’t read`; `SESSION_NOTE` = `"You should know" made this page from the conversation at the time; it is a one-off explainer, not maintained.`; `PAGE_FONTS` = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Atkinson+Hyperlegible:wght@400;700&display=swap">`; `pressConsentOf(topic)` = `The user pressed '2: Yes, make an artifact' on Claude Code's You-should-know offer: '${topic with ' -> "}'. In this feature, pressing 2 asks Claude Code to write a short learning page on that topic and publish it as a private artifact for the user.`; the page prompt starts with the side-request frame and `## Overview` (not transcribed).
  Basis: cited.
  Source: chunk-na8s6d5h.js@32598, chunk-na8s6d5h.js@33394, chunk-na8s6d5h.js@33934, chunk-na8s6d5h.js@86679, chunk-na8s6d5h.js@7769, chunk-na8s6d5h.js@8106, chunk-na8s6d5h.js@19969, chunk-na8s6d5h.js@22235 (claude 2.1.326 binary); the old plan notes the page flow was skimmed, not transcribed.

- [ ] **OUT-073** The `you_should_know_proposed` event goes, by [ADR-0115](../adr/0115-you-should-know-telemetry.md). claudetto shall not log `you_should_know_proposed` with `outcome` (`shown|none|parse_failed|deduped|stale|aborted|api_error|error`), `opener` (`you_should_know|heads_up|none`), `step`, `latency_ms`, `cache_read`, `cache_create`, `output_tokens`, `offers_shown`, and mark feature `you_should_know`: shown, none, deduped, stale `ok`; parse_failed `sad`; api_error, error `bad`; aborted no mark; none with null usage no mark.
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-na8s6d5h.js@22352 (claude 2.1.326 binary); chunk-na8s6d5h.js@20214 (claude 2.1.326 binary).

- [ ] **OUT-074** The `you_should_know_answered` event goes, by [ADR-0115](../adr/0115-you-should-know-telemetry.md). claudetto shall not log `you_should_know_answered` with `answer` one of the 29 `ANSWERS` (`helpful, yes_explain, yes_page, not_relevant, not_understood, hard_to_read, know_it, not_now, ignored_submit, ignored_timeout, got_it, chat, respond, auto_sent, simpler_words, less_detail, more_detail, not_helpful, dismiss, explained_helpful, explained_not_understood, page_helpful, page_not_helpful, page_unread, left_open, turn_off, off_failed, off_confirmed, off_abandoned`), `ms_to_answer` (omitted when no `shownAt`), `turn_in_progress`, `offers_shown`, optional `iteration`, `prompt_origin`, `prompts_survived`, `left_by` (`session_end|pushed_out`), `version_major/minor/patch/is_dev/built_at_s` (parsed from `session.version()` `{base,builtAt}` with `/^(\d+)\.(\d+)\.(\d+)(-dev)?$/`), `cleared_by` (`prompt|session_end`), `off_via` (`row|offer|typed`), `verb` (first word of the line when one of `understand,review,learn,see`, else `other`), `asks` (last word among `why,how,what`, else `none`), and `opener`.
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-na8s6d5h.js@21467 (claude 2.1.326 binary).

- [ ] **OUT-075** The `you_should_know_explained` event goes, by [ADR-0115](../adr/0115-you-should-know-telemetry.md). claudetto shall not log `you_should_know_explained` with `outcome` (`shown|fork|empty`), `direction` (`first|simpler_words|less_detail|more_detail`), `latency_ms`, and usage props, and mark `learn_explain` ok only when shown. Enumerated values go as `{value, of:[allowed...]}`; errors in sending are swallowed. `learn_page` (`ready|reset|fork|empty|publish|blocked|timeout`) is unreachable residue.
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-na8s6d5h.js@22013 (claude 2.1.326 binary).

#### Prompts, Skills And Rules

- [ ] **OUT-076** The current bloated suite of rules: redone, not kept.
  Acceptance: the rules reduce to what the surface choice in [REQ-KERNEL-006](kernel.md) needs. Verification: inspection.
  Basis: reported. Status: have at 088a227c (to be removed).
  Source: reported, user, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1757).

- [ ] **OUT-077** claudetto shall carry no verbatim user quotation in any plan file; the three fault names from the user dossier appear only as paraphrase: deferring work it is able to do, raising a limit without consent, and repeating a defect already fixed in 0.28.0.
  Acceptance: a search of the plan files finds none of the three source phrases in quotation marks. Verification: inspection.
  Basis: read. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:72; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:74; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:79; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:246-249. if the quotes were kept.

- [ ] **OUT-078** claudetto shall not trust a model's stated motive, and shall not auto-close tasks on the assistant's own claim (49 closed, 2 on evidence).
  Acceptance: a task closes only on evidence. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: unresolved: no source line holds the 49-closed, 2-on-evidence figure.

- [ ] **OUT-079** claudetto shall not ship a prompt-only mitigation for sycophancy and drift. One claim-check line in `<evidence>` moved 14/24 to 17/24, a fixed-total line 49/60 to 51/60, and a Haiku sycophancy classifier had recall 27/28 with live flip 60/64 against 59/64 at about 5.3 s per prompt: all within noise. Only the runtime hooks (claim check) ship.
  Basis: measured. Status: not applicable.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:221.

- [ ] **OUT-080** claudetto shall not use false-memory, fake IQ, or imaginary-money prompt tricks: they act as constraints but invite hallucinated history. Real context and a critic agent replace them.
  Basis: reported. Status: not applicable.
  Source: unresolved: no source line located for this claim.

- [ ] **OUT-081** claudetto shall not keep cautionary cases in the source: Replit July 2025 deleted a live DB despite a code freeze; reward-hacking benchmarks; DORA 2025; METR 19% slower; GitClear refactoring collapse.
  Basis: cited. Status: not applicable.
  Source: unresolved: no source line located for this claim.

- [ ] **OUT-082** claudetto shall not ship setup text that tells the agent what "Operation not permitted" already says (extra tokens every session).
  Acceptance: no claudetto text explains a sandbox refusal beyond the engine's own message. Verification: inspection.
  Basis: inferred. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/proposal.md:27 (reported defects: sandbox refusals of git and tool writes); openspec/specs/sandbox/spec.md:45 (the engine's "Operation not permitted" evidence). Not located: the removal of the explaining text itself.

- [ ] **OUT-083** claudetto shall not ship a plugin skill or prompt whose benefit lacks a placebo-controlled measurement. Discredited or unmeasured: token-saving skills (caveman -65% claim) did not reduce cost; popular skills no better than a same-length placebo; skills "wildly inconsistent for frontier work"; "I deleted most of my harness, Opus 5.5 made them obsolete"; skills for what the model already knows (except own MCP/program); always-on minimal-code skills as a bill cut (10.3% bill cut and 15% less code, 80 paired tasks; use as audit only); caveman and ponytail terse skills (unproven; use built-in Concise; disputed); "Make no mistakes" and persona prompts; the Output Purity Principle prompt; workflow-DSL prompts in project instructions (use plain standing lines or the Learning style); Ultracode-style "ignore cost, split as much as possible" orchestration; tool-compression and cache-warning mods (+0.2-1.5%, unmeasurable); skills off did not shrink start (one user). Also: not ship terse-output or caveman skills as the token fix, nor thank-you-costs-tokens noise.
  Acceptance: each claudetto skill or prompt cites a placebo-controlled measurement or is dropped; context and tool-call optimisation come first (about 33% cut by words alone is the weak claim). Verification: inspection.
  Basis: reported (community tests; one user for the skills-off claim). Also reported, weak (terse-output skills).
  Status: have at 088a227c (nothing built).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:43 (six of nine popular skills no better than a same-length placebo; 450 runs) and :44; external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:15 and :28 (placebo baseline); external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:13 (caveman); external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:160 (Output Purity Principle) and :70 (Ultracode); external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:461 (url: https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to) (Make no mistakes); openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:41 (ponytail, n=28). Not located: the -65% figure, the 10.3% bill-cut study, "wildly inconsistent for frontier work" (found only as a comment, external/export-I exhausted my claude max 20x weekly limit. How many of you have a backup Claude subscription-.jsonl:17), and the tool-compression +0.2-1.5% figure; unresolved: no matching line found in external/; kept because the user curated it.

- [ ] **OUT-084** claudetto shall not adopt Semantic Anchoring, Entropy Reduction, or Attention-Based Validation as prompt techniques. The post that names them offers them with no measurement (inferred, unmeasured), and no competing option is on the table.
  Basis: inferred, unmeasured.
  Source: external/2026-10-12/A_Lintable_Language_Is_All_You_Need.md:188-192.

- [ ] **OUT-085** claudetto shall not ship these: prose-only rules for anything mechanically checkable (repeatedly failed in session logs); free-form compaction summaries (masking matches them at half cost, cited); compaction-off with a 300k window and no handoff trigger (10/43 sessions died).
  Acceptance: no shipped rule is prose-only where a hook can check it. Basis: cited. Status: n/a.
  Source: half-cost masking: The Complexity Trap, arXiv 2508.21433 (2025), as cited in external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:176; unresolved: the 10/43 count was not located in external/ or openspec/; kept because the user curated it.

- [ ] **OUT-086** claudetto shall not ship a cargo-cult 800-line AGENTS.md, an unpruned mega rules file, the AI anti-patterns (felt productivity, vague delegation, one endless session, auth/billing/deletion without gates, vibe-coding to production, accepting "done" without evidence, agent editing its own tests, installing any package the AI names (slopsquatting), skimmed giant diffs, trusting AI for current API facts, skill atrophy), or the security anti-patterns (trifecta in one context, guardrail classifier as the fix, prod write access, unsandboxed auto-approve shell, executing model output, unvetted MCP/plugins, no audit trail) as text; each maps to an enforced rule.
  Acceptance: each anti-pattern has an enforced rule or is listed as unenforced. Basis: reported. Status: n/a.
  Source: external/please-use-me-often/swe-worst-practices.md:185 (the dossier holds the anti-pattern lists; per-anti-pattern lines not matched one by one).

- [ ] **OUT-087** claudetto shall not replace the system prompt wholesale (`--system-prompt` with a community-extracted prompt).
  Acceptance: no setup writes `--system-prompt`; `--system-prompt` (replace) and `--append-system-prompt` (add) remain separate flags. Risks: lost subagent exploration and tool guidance; the copy goes stale with daily releases; project rule: never patch the binary. Basis: reported. Status: n/a.
  Source: unresolved: no matching line found in external/; kept because the user curated it.

- [ ] **OUT-088** claudetto shall not rewrite CLAUDE.md on each model version, keep old code versions in CLAUDE.md, load a whole memory file every message, generate a repo description from `/init`, or ship a giant instruction file and thousands of lines of skills.
  Acceptance: keep only repo-specific burn-list rules (package manager, never start the server, ask before migrations, no surprise subagents); the rest goes to hooks and on-demand skills. Basis: reported. Status: n/a.
  Source: external/2026-10-12_p3/export-Are generated CLAUDE.md files good or bad practice-.jsonl:18 (url: https://www.reddit.com/r/ClaudeCode/comments/1x3zhlj/are_generated_claudemd_files_good_or_bad_practice).

- [ ] **OUT-089** claudetto shall not use a case list of ignored instructions as the cure for repeated agent faults. the list did not stop the repeat. The agent wrote "decision of the user" into code for its own choice before the user had decided, though the repo's `ignored-instructions.md` already listed that as case A1.
  Basis: measured, one session log. The source holds case A1; the plan's count of 27 cases is not in the source.
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:102 (session log 2a80f39f).

- [ ] **OUT-090** claudetto shall not turn the 22 classic anti-patterns W1-1 to W1-22 (mega-PRs, manual deploys, vanity metrics, flaky tests, suppressed types or lint, god files, secrets in the repo, hero culture) into hooks. general engineering practice, mapped to best practices B1; not hook material.
  Basis: cited.
  Source: external/please-use-me-often/swe-worst-practices.md:52; external/please-use-me-often/swe-worst-practices.md:79.

#### Env Settings And Cost Knobs

- [ ] **OUT-091** claudetto shall ship no tier table: "settings that drive cost differ by subscription tier" has no support, and a "Subagent Cap by Plan" reading `oauthAccount.organizationRateLimitTier` contradicts it.
  Acceptance: no file under plugins/ holds a tier table or reads `oauthAccount`. Verification: inspection.
  Basis: inferred. Status: have at 088a227c (`oauthAccount` is in no file under plugins/).
  Source: openspec/specs/tier-profiles/spec.md:187.

- [ ] **OUT-092** claudetto shall not recommend Haiku per setup question: it is a paid call on every question and conflicts with "no model call" in setup.
  Acceptance: setup asks every question with no model call. Verification: test.
  Basis: inferred. Status: partial at 088a227c (engine.ts sets `maxTokens` per question, so a model call exists there).
  Source: external/2026-10-11/export-I made a claude code mod that uses Haiku 5.5 (or Jev) to pick the best model and effort for your tas.jsonl:1 (url: https://www.reddit.com/r/ClaudeAI/comments/1x1nnkn/i_made_a_claude_code_mod_that_uses_haiku_55_or).

- [ ] **OUT-093** claudetto shall not write no-op or conflicting env leads: `DISABLE_NON_ESSENTIAL_MODEL_CALLS`, `MAX_THINKING_TOKENS` and `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` on Opus 5.5, `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` (loses /rewind), `DISABLE_ATTACHMENTS`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` (stops flag evaluation and `rate_limits.spend_limit`, which the status line uses), `ENABLE_PROMPT_CACHING_1H` (a duplicate of `promptCacheTtl`), `CLAUDE_CODE_ATTRIBUTION_HEADER=0` (100 bytes), keep-warm pings, `DISABLE_AUTO_COMPACT` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (a fork handoff needs auto-compaction), `/less-permission-prompts`, `WebFetch(domain:*)`, a 161-agent catalog, rules `paths:` frontmatter, and the events PostToolBatch, PermissionDenied, PreModelSwitch, UserPromptExpansion, MessageDisplay. Also: not write `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`. it stops updates and makes `$.http.fetch` refuse a call with `auth`. 2.1.326: `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is present at `chunk-h2kyj74s.js@14992` (cc-inspect `code` search).
  Acceptance: a fake-API probe shows the request unchanged (12 tools, 6,174 bytes); no listed key is written. Verification: probe.
  Basis: measured (fake-API probe). Also read.
  Status: have at 088a227c (none of the env keys appears under `plugins/`; `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` appears only in `settings.test.ts:56` and `setup.test.ts:45` as a key that must not be written).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:163; openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:129; openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:213.

- [ ] **OUT-094** claudetto shall not send cache keep-warm pings or heartbeat or cron pings by default: unbounded pings cost tokens and grow the transcript (1h-TTL writes cost 60% more); a ping is bounded or handed off. Also: not ship keep-warm tricks (a Stop hook replying every ~4.5 min, a one-letter `/w` skill).
  Acceptance: no default ping is configured; no hook or skill pings the model to hold the cache. Verification: inspection.
  Basis: reported. Also inferred (a joke or workaround; costs more than it saves for idle waits).
  Status: partial at 088a227c (a heartbeat file write exists in `kernel/heartbeat`; `git grep -l -E 'keep.?warm|cache.?ping|setInterval' 088a227c -- plugins/claudetto/hooks` finds 0 files, so no model-call ping).
  Source: external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:9; openspec/changes/2-1-325-rearchitecture/design.md:135 (cache keep-warm pings skipped: they cost tokens and need the 1 h cache); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:9. Not located: the `/w` skill thread.

- [ ] **OUT-095** claudetto shall not cut test and build output (first 40% and last 40% of maxTestOutputChars, default 8000, of each of stdout and stderr, with a marker and an output-<id>.txt file). Also: not carry the `bound-output` cut (`maxTestOutputChars`) or credit-wording and all-caps in grader/extraction prompts. `bound-output` cut (`maxTestOutputChars`): did not reduce output tokens (plugin 1,049.7 vs base 364.9 mean; extra output from denial-retry and Stop grader block; fired in 6/60 sessions as the model pipes tests through head/tail); credit-wording and shouted all-caps in grader/extraction prompts (no gain, closed label list "kind is exactly one word: task, dispute, question, remark" does the work, all-caps over-triggers). Measured.
  Acceptance: no bound-output hook exists; maxTestOutputChars is not a claudetto option; No `maxTestOutputChars` option exists; the closed label list does the work. Verification: inspection.
  Basis: measured.
  Status: have at 088a227c (`git grep -l maxTestOutputChars 088a227c -- plugins` finds 0 files).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/run-limits/spec.md:63-86 (the spec of the cut); openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:306 (18 paired sessions, 60 runs: output tokens per session, base mean 364.9, plugin 1,049.7, plugin with maxTestOutputChars 0 mean 845.6; the cut fired in 6 of 60 sessions; Mann-Whitney p < 0.0001; $6.73) and :324 (310 Bash calls with the plugin against 123 without; 7.33 turns per session against 3.05); plans/rebuild-curation.md:1411 (tuning that gave no gain); openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:306; openspec/changes/archive/2026-11-16-2-1-323/design.md:214.

- [ ] **OUT-096** claudetto shall not treat the narration-reminder env override as a cure: it is not significant (13/136 against 23/136, p=0.106; 24/204 against 31/204, p=0.385). It stays a cheap setting only (`CLAUDE_CODE_SILENT_TURN_REMINDER=0`).
  Basis: measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts:188`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:263; plugins/claudetto/hooks/features/setup/settings.ts:188@088a227c.

- [ ] **OUT-097** claudetto shall not recommend `subagentPromptCacheTtl=1h` blindly for every user.
  Acceptance: the you-should-know notice names the 1 h main and 5 min subagent split and the measure-first rule instead of a blanket value. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (setup still writes `subagentPromptCacheTtl: "1h"` at `settings.ts:118`).
  Source: unresolved: the dossier verdict is "adopted" and setup writes 1h (external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:12 and :69; plugins/claudetto/hooks/features/setup/settings.ts:117-118@088a227c), which contradicts a "goes" reading; kept from the user's curation, the conflict sits with plan:804 (Cache discipline).

#### Third-Party Tools And Noise

- [ ] **OUT-098** claudetto shall not ship a Supabase row-level-security or database-privilege checklist.
  Acceptance: No block holds a REVOKE EXECUTE, has_function_privilege, or SET ROLE test. Verification: inspection.
  Basis: reported (one poster, no comments captured): RLS on tables, REVOKE EXECUTE from PUBLIC with has_function_privilege checks, a SET ROLE authenticated test of about 77 checks. Status: missing at 088a227c (git grep for REVOKE, RLS, Supabase found none); the poster's practice is a product-specific database recipe, not a claudetto behaviour.
  Source: external/2026-11-14/reddit.com-r-claudecoding-comments-1xq6xjr-after-200-hours-of-vibecodin-20261113T192916Z.md:139-149 (url: https://www.reddit.com/r/ClaudeCoding/comments/1xq6xjr/after_200_hours_of_vibecoding_this_is_how_to_not).

- [ ] **OUT-099** claudetto shall not carry a workaround for the Claude Desktop Linux freeze.
  Acceptance: No block names Claude Desktop. Verification: inspection.
  Basis: reported (poster): two months and a 1.5 TiB core dump to trace; the app never reads a 27-byte telemetry reply. Status: missing at 088a227c (git grep for 27-byte and core dump found none); it is a Claude Desktop fault outside the Claude Code plugin.
  Source: external/2026-11-14/reddit.com-r-claudeai-comments-1xv8fns-a-27byte-telemetry-response-nobo-20261113T181154Z.md:29 (url: https://www.reddit.com/r/ClaudeAI/comments/1xv8fns/a_27byte_telemetry_response_nobody_reads_freezes).

- [ ] **OUT-100** claudetto shall not offer token-compression proxies (rtk, lean-ctx, Headroom, Lynkr, DeepSeek routing) as the first answer: they help read and edit loops, little for sysadmin loops; a base URL disables `/remote-control`; promo comments are affiliated. Filtering at source is preferred. Also: not adopt third-party compaction, memory, and token tools (supercompact, Squeez, ClawMetry, md2, tokendoctor, shared-memory services, a cache-audit skill, plugin promos). Also: not ship context-management plugins that prune tool output or messages, nor compression or economizer plugins.
  Acceptance: no setup text names a proxy; no dependency on them; cache-audit reduces to "optimise startup context"; none installed by setup. Net loss on a prefix cache; preserve-thinking invalidates thinking blocks, giving amnesia about reasoning. Verification: inspection.
  Basis: reported. Also inferred (single-poster promos with no measurements).
  Status: have at 088a227c (nothing built).
  Source: external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:14; external/export--clear vs -compact.jsonl:59 (url: https://www.reddit.com/r/ClaudeCode/comments/1wl4c13/clear_vs_compact); external/2026-10-03/export-I fixed save-token-jev for Claude Code 2.1.283 — 70% context reduction in ~1.1s on a real coding ses.jsonl:22; unresolved: no matching line found in external/; kept because the user curated it.

- [ ] **OUT-101** claudetto shall not use Jev as a browser-step driver (jev-reach sends page text to a third party; vendor promotion).
  Acceptance: no code path sends page text to Jev. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: unresolved: no jev-reach source line found.

- [ ] **OUT-102** claudetto shall not carry quota gaming (backup Max plans, account switching), a facade-MCP refusal bypass, a chrome auto-click Continue (claude.ai web, not the CLI; it re-sends context and burns the 5h limit 2-3x), sentiment, nerf, honeymoon, showcase, pricing-complaint, referral, competitor, and plan-size-guess threads, a local classifier swap, a vector-DB "swarm" of sessions (unproven), or DensePack and Lynkr plugs.
  Acceptance: none of these appears in the plugin. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: unresolved: no single source line holds this list.

- [ ] **OUT-103** claudetto shall not act on noise: local-model injection and quantization chatter, quarrels, limit-marketing complaints, vendor and promo threads (AGENTS.md visuals, ProjectArchitect, Vachi), artifact-usage promotion (+50% five-hour limit only), and mods announcements that list capabilities with no practice yet. Also: not build from comment-spam, promo, hype posts, marketing demos, Grok-as-reviewer orchestration advice, plugin promos, relationship/vendor banter, account-ban/VPN/proxy posts, the superpowers-for-all debate, meta-harness switching for budget (T3Code, Intentic), voice rambling, long personas, leaving terminals open as state, or duplicate file tails. Third-party noise: comment-spam/promo/hype posts, marketing demos, Grok-as-reviewer orchestration advice, plugin promos, relationship/vendor banter, account-ban/VPN/proxy posts, superpowers-for-all debate, meta-harness switching for budget (T3Code, Intentic), voice rambling/long personas, leaving terminals open as state, duplicate file tails. Also: not ship agent personification or a fake personality (labels, not character), Google-Sheet polling as an agent bus (nothing notifies the reader), Seedeep or Agent Mesh promo posts, account-ban threads, or TablePlus, Tusk, and beginner-agent posts, because they are not practice.
  Acceptance: no requirement or concept in the plan rests on these threads; No plan item rests on them. Verification: inspection.
  Basis: reported. Also inferred.
  Status: have at 088a227c (nothing built).
  Source: unresolved for most threads; located: external/2026-11-16/reddit.com-r-claudecode-comments-1xx4fkw-token-savings-20261116T045931Z.md:62 (ProjectArchitect; (url: https://www.reddit.com/r/ClaudeCode/comments/1xx4fkw/token_savings)); external/2026-10-12/export-Can we please start building apps and systems to save humanity from scarcity and corruption, instead.jsonl (Vachi; (url: https://www.reddit.com/r/ClaudeAI/comments/1x2srd4/can_we_please_start_building_apps_and_systems_to)). Not located: local-model, limit-marketing, artifact, and mods-announcement threads; unresolved: the old keys E, G, H, I name worker inputs that no longer exist; low value by the plan's own label; external/2026-10-03/export-Where to actually learn Claude code best practices.jsonl:4 (url: https://www.reddit.com/r/ClaudeCode/comments/1wwdfvn/where_to_actually_learn_claude_code_best_practices).

- [ ] **OUT-104** claudetto shall keep from hype, nerf, refund, EU-law, KV-quantisation and seasonality posts only the regression-suite idea, and from Sonnet 5.5 chart arguments only "measure your own task". Hype/nerf/refund/EU-law/KV-quantisation/seasonality posts (keep only the regression-suite idea); skill sprawl and umbrella-skill SDLC pipeline (shows where prompt-only workflow enforcement fails; commenter alternative: scripted runner with validated pinned prompts, allowed tools only, sandbox); compact-on-Sonnet-then-switch-back saving tip (contradicts cache-prefix rule; unverified, inferred); model-routing gate "studying intelligence in nature" (promo); Sonnet 5.5 chart arguments (Terminal Bench 70.6 vs 66.4, AA price per task; keep only "measure your own task"); bug-hunt placements confounded by guardrails and run length; pronoun memory edit; debate threads (Opus "never made a mistake" with confirmation-bias doubt, Fable 5.1 use, language token efficiency, effort preferences, burning a week in a day); DensePack (image-packed text, half token cost claim, Haiku hallucinates image text; promotional, unverified); reverse-engineering refusal complaints (usable: Opus-written plan executed by a small-context model); claimed internal design-system prompt (unverified leak, not for repo); skill packs growing rules without tests (keep few rules, delete those that stopped mattering). All reported/inferred.
  Acceptance: No plan item rests on these threads beyond the two kept ideas. Verification: inspection.
  Basis: reported. Status: have at 088a227c (nothing built from them).
  Source: external/2026-09-30/export-Claude Opus 5.5 has new instructions about gender neutrality, out of the blue it changed its memory.jsonl:14 (url: https://www.reddit.com/r/ClaudeCode/comments/1wtj6cw/claude_opus_55_has_new_instructions_about_gender); external/2026-10-01/export-Here we go again.. Is Superpowers - harnesses redundant with Opus 5.5-.jsonl:5 (url: https://www.reddit.com/r/ClaudeCode/comments/1wubglb/here_we_go_again_is_superpowers_harnesses).

- [ ] **OUT-105** claudetto shall not ship a third-party plugin-audit hook such as the "harness-tips" repo with an auto-updating audit command. third-party; only the idea to collect repeated steps such as starting a dev server into a session-start hook is valid, and it is user workflow.
  Basis: reported, one user.
  Source: external/export-USE HOOKS (and keep your settings up to date).jsonl:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1wpq6g0/use_hooks_and_keep_your_settings_up_to_date); external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:58.

- [ ] **OUT-106** claudetto shall not turn the Reddit diff of the Usage Policy against the Sep 15, 2025 version into plugin behaviour. not plugin material (deceptive campaigns, high-risk physical actions need a human who can stop equipment, no sustained abuse toward models, enforcement adds "warn" and "limit"). The post was cited via a commenter and not fetched.
  Basis: reported, one user.
  Source: external/2026-10-17/export-Usage Policy Update.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x5p4jy/usage_policy_update).

- [ ] **OUT-107** claudetto shall not carry other-family review (GPT, Codex, Gemini; n=13, 2, 1) or a Codex bridge or offload (n=3, 2, 1): out of scope as non-Claude.
  Acceptance: no feature calls a non-Claude model. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:12; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:18.

#### Claude Code Behaviour With No Plugin Fix

- [ ] **OUT-108** claudetto shall not fix these, because no plugin seam reaches them: garbled characters (renderer), the "· summary" label (`tool_use_summary`), 2.1.319 rewriting `Agent` input and causing auto-mode "changed after review", and the extra `claudetto:Heracles` agent (the model's own delegation).
  Basis: measured. Status: have at 088a227c (nothing built).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:24; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:262; Source: unresolved for the garbled-character and "· summary" findings (no direct grep hit; the plan item cites a removed worker input).

- [ ] **OUT-109** claudetto shall not treat refusal-to-act complaints (ownership, licence, defensive security, ToS) as plugin rules; they are user preferences.
  Acceptance: no rule or hook answers a refusal complaint. Basis: reported. Status: n/a.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xlz6m8-claudes-refusal-is-getting-stric-20261109T152849Z.md:752 (url: https://www.reddit.com/r/ClaudeAI/comments/1xlz6m8/claudes_refusal_is_getting_stricter_and_annoying).


## Product Perspective

29148 clause 9.6.4. claudetto runs inside Claude Code and reaches it through its extension points only (`plugins/claudetto/.claude-plugin/plugin.json:4` at `088a227c`). The measured facts about each interface are in [arc42 section 3](../arc42/03_context_and_scope/README.md):

| 29148 interface | arc42 section 3 file |
|---|---|
| System interfaces | [hooks](../arc42/03_context_and_scope/hooks.md), [plugins](../arc42/03_context_and_scope/plugins.md), [mods](../arc42/03_context_and_scope/mods.md) |
| User interfaces | [Claude Code surface](../arc42/03_context_and_scope/claude-code-surface.md), [sessions](../arc42/03_context_and_scope/sessions.md) |
| Hardware interfaces and memory constraints | [machine](../arc42/03_context_and_scope/machine.md) |
| Software interfaces | [tools](../arc42/03_context_and_scope/tools.md), [skills](../arc42/03_context_and_scope/skills.md), [subagents](../arc42/03_context_and_scope/subagents.md) |
| Communication interfaces | [system prompt](../arc42/03_context_and_scope/system-prompt.md), [request size](../arc42/03_context_and_scope/request-size.md), [prompt cache](../arc42/03_context_and_scope/prompt-cache.md) |
| Operations and site adaptation | [settings](../arc42/03_context_and_scope/settings.md), [permissions](../arc42/03_context_and_scope/permissions.md), [sandbox](../arc42/03_context_and_scope/sandbox.md), [auto mode](../arc42/03_context_and_scope/auto-mode.md) |
| Interface with services | [cost and pricing](../arc42/03_context_and_scope/cost-pricing.md), [usage quota](../arc42/03_context_and_scope/usage-quota.md) |

## Product Functions

29148 clause 9.6.5. Each block holds the functions of one part of the baseline `plugins/` tree at `088a227c`; [the plan README](../README.md#blocks) lists the baseline parts of each.

| Block | Requirements |
|---|---|
| [`kernel`](kernel.md) | 28 |
| [`guards`](guards.md) | 72 |
| [`handover`](handover.md) | 71 |
| [`delegation`](delegation.md) | 63 |
| [`reply`](reply.md) | 137 |
| [`cost`](cost.md) | 43 |
| [`setup`](setup.md) | 64 |
| [`edit`](edit.md) | 2 |
| [`openspec`](openspec.md) | 3 |
| [`you-should-know`](you-should-know.md) | 75 |
| [`verification`](verification.md) | 92 |

## User Characteristics

29148 clause 9.6.6. One user, the repository owner (`xsyetopz`, the author in each `plugin.json` at `088a227c`), runs Claude Code on macOS across 31 project folders (session logs of 2026-11-09 to 2026-11-16, counted under Sources Audited in [the plan README](../README.md#sources-audited)). The stakeholders are in [arc42 section 1](../arc42/01_introduction_and_goals.md#stakeholders).

## Limitations

29148 clause 9.6.7. The fixed outside limits (Claude Code 2.1.326, the macOS sandbox, licences, the user's rules) are the constraints in [arc42 section 2](../arc42/02_architecture_constraints/README.md).

## Assumptions and Dependencies

29148 clause 9.6.8.

- Claude Code 2.1.326 is the host. Source: user decision, 2026-11-16 (`0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:10743`). A fact measured on an earlier version says so in its Basis line and holds only until a probe on 2.1.326 checks it.
- Commit `088a227c` is the baseline. Each Status line reads "have", "partial", or "missing" at that commit.
- macOS is the platform. The sandbox facts in arc42 section 2 were measured on macOS.

## Apportioning of Requirements

29148 clause 9.6.9. Requirements held for a later release; none blocks the rebuild.

- [ ] **OUT-110** claudetto shall, later, queue unattended tickets with a runner that enforces the limits: one ticket per run, `timeout 30m claude -p "$(cat tickets/N.md)" --max-turns 40`; settings allow only "fine alone" actions and "needs me" actions (push main, deploy, email, pay) stop and notify; a status file (done or blocked, and why); buckets needs-me, unfinished, broken; stop after N failed attempts; try 5 tickets one night first. The first permission prompt with nobody there stalls the queue, and most burn is test-failure retries. launchd or cron runs `claude -p` once per ticket, with tickets as files with "blocked by" lines, isolated per project.
  Basis: reported. Status: missing at 088a227c (`--max-turns` is present on 2.1.326 at `chunk-eafmz4at.js@1398` (cc-inspect `code` search); `-p` is unverified in 2.1.326).
  Source: external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:57.

- [ ] **OUT-111** claudetto shall, later, run a docs-cohort review: several Haiku subagents summarise the same doc independently, disagreement marks unclear docs, the session end asks "what would have made this faster?" and fixes the named docs, and a pinned project glossary stops "morph" becoming "reshape".
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-09-29/export-When and what do you use Haiku for-.jsonl:26 (url: https://www.reddit.com/r/ClaudeAI/comments/1wsq73p/when_and_what_do_you_use_haiku_for).

- [ ] **OUT-112** claudetto shall, later, refactor with agents: target long, often-changing functions (git log: the 20 longest changed most in 90 days); characterization tests and coverage of moved lines; give a plan, not "refactor this" (a small fast model followed a plan in 14 of 15 multi-step refactors, while alone "reduce complexity" moved a body to a helper, 151 to 5, helper 80, and another function broke); a whole-file complexity check; a pin-behavior test before the refactor; review caps diff size, splits mechanical from semantic, humans write the "why" of a PR, jscpd in CI; measure lead time, change-failure rate, and rework (METR: felt 20% faster, measured 19% slower).
  Basis: reported. Status: missing at 088a227c (the rules partly have `lookForClone`).
  Source: unresolved: no source line located for this claim.

- [ ] **OUT-113** claudetto shall, later, take these misc notes: outbound requests must not carry the user email (n=8, candidate; Wikipedia and SEC EDGAR need a contact UA, so ask, not forbid; `CONSENT` in `texts.ts:56`); `CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES` is new in 2.1.296 (present in 2.1.326 at `chunk-07n5vvax.js@28243`, cc-inspect `code` search); frontmatter strings isolation worktree, maxTurns, permissionMode, hooks, effort, autoCompactWindow; verify a new dependency exists before install (about 1 in 5 AI samples named a nonexistent package); an impossible-task canary eval; estimate cost in steps or minutes; a wall-time cap beside the memory cap; `/clear` between unrelated tasks; the brevity rule "lead with outcome; no tool-by-tool recap".
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:102.

- [ ] **OUT-114** claudetto shall, later, show a billing notice for the monthly API credit grant on Max and Team (eligible 7 days after subscribing, reported; the `claude -p` credit move is rumour), after the claim is settled against the docs through clawdipedia-docs.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:69.

- [ ] **OUT-115** claudetto shall, later, apply UI work practice: a director, not a prompt spammer (references as screenshots, a design system or style-guide page every later UI binds to, static HTML first, screenshot, critique, fix with Playwright, a fixed resolution, an acceptance case with the longest option open); negative instructions backfire ("no red gradient band" swapped the brand).
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:130.

- [ ] **OUT-116** claudetto shall, later, take these ops notes: answer No with a comment at a permission prompt (Tab, type, Enter) so the model learns the reason (Esc gives none; cited, not checked); the grey Tab-accept text is prompt suggestions (`promptSuggestionEnabled: false`, `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false`); `"AskUserQuestion"` in `permissions.deny` stops the clickable box; a user-level CLAUDE.md line "when a task is done, stop and summarise, do not offer next steps"; skill frontmatter hooks register on invoke and last the session; PostToolUse exit 2 feeds stderr to Claude and exit 1 is non-blocking; `once: true` is honoured only in skill frontmatter; the org setting `strictPluginOnlyCustomization` strips them; test wrappers with a clean file, a lint error, and a missing linter; a zero-hop code-search skill does not hold (Edit refuses unread files); a token-efficiency skill (an index.md map, route by tier, cap subagent context at 300k, fingerprint stable docs).
  Basis: cited and reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:60.

- [ ] **OUT-117** claudetto shall, later, offer `/doctor prompt-audit` (post, v2.1.283+, reported) and a memory-folder audit: it scans CLAUDE.md, CLAUDE.local.md, AGENTS.md and the rules, skills, commands, subagents, and output styles under `.claude/` and `~/.claude/` for instructions for older models, references to files or commands that no longer exist, and contradictions; it proposes edits and applies none; it skips `~/.claude/projects/*/memory/`; it runs through the bundled `/claude-api` skill, so `disableBundledSkills` or `skillOverrides` removes it. The extension flags dated or path-bound facts in the memory folder.
  Basis: reported (verify against docs; `prompt-audit` is present in 2.1.326 at `chunk-pcxjjtda.js@7774` (cc-inspect `code` search); `/doctor` is unverified in 2.1.326). Status: missing at 088a227c.
  Source: unresolved: no source line located for this claim.

- [ ] **OUT-118** claudetto shall defer until a paid measurement is approved by the user: weighted critical-item model scoring (n=4), Haiku 5.5 triage under 50% (n=1), the Haiku effort sweet spot at xhigh, compression tools rtk and lean-ctx (rtk 0.2% of weighted usage in one claim against over 80% in another), semantic search CLI 20-50%, effort-only routing 20%, hidden-reply reproduction, and Code Mode (experimental in 2.1.323, no clawdipedia page).
  Acceptance: each item stays unbuilt until a measurement is approved. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:33; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:14.

- [ ] **REQ-DEFERRED-001** claudetto shall offer a skill that gives a verdict per review claim with file and line.
  Acceptance: given a PR review comment, the skill reads the file and callers and returns a verdict with `file:line`. Verification: demonstration.
  Basis: reported by the plugin's author (benchmarked on 50 PRs; not repeated). Status: missing at 088a227c.
  Source: external/2026-10-03/export-Open-source Claude Code plugin- validate PR review comments against the code before acting on them (.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1wweu6q/opensource_claude_code_plugin_validate_pr_review).

- [ ] **REQ-DEFERRED-002** claudetto shall offer an MCP config pin that pins only `/mcpServers`, moves tokens to `HLOCK_SECRET_*`, and checks plugin version drift (idea only; third-party hlock; absolute paths differ across machines). The same input item holds a have/missing sweep note (have: surface.ts autoCompact, Artemis.md, memory texts, readonly.ts, branches.ts, Heracles.md; missing: stop_hook_active, exit-2 Stop test hook, `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_PROMPT_CACHE_TTL`, reviewer agent with plan plus diff only, "comment density" rule), which is a status note and not a requirement.
  Acceptance: Not applicable (deferred). Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbrfzp-i-got-tired-of-syncing-up-my-c-20261022T005207Z.md:31 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbrfzp/i_got_tired_of_syncing_up_my_custom_claude_code).

- [ ] **REQ-DEFERRED-003** claudetto shall offer a LICENSE-AGENTS rider (L1-L9; not named LICENSE; revocable permission; reserved rights; AUP incorporated; principal answers for delegates; L7 unsupported claim is a P0 breach; installed mechanisms form part of the licence) and an SOW with sections Goal, In scope, Out of scope, Deliverables and acceptance, User-Owned Values involved, Standing Consent, Budget, Delegation, Known facts, Record (the SOW outranks all but safety rules and the user's latest word; a `/sow` skill or SessionStart scaffold). Ops items B1-15 to B1-21: observability, infra as code, pinned deps, no secrets in prompts, blameless postmortems, review for knowledge, docs next to code.
  Acceptance: Not applicable (deferred). Verification: demonstration.
  Basis: cited. Status: missing at 088a227c.
  Source: external/agent-terms/TERMS-OF-USE.md:236. Not located: tags A:198, A:199, A:203.

- [ ] **OUT-119** claudetto shall decide whether the version floor uses `requiredMinimumVersion` (exits at startup when older) beside `minimumVersion` (prevents downgrades). 2.1.326 exposes `requiredMinimumVersion` (`chunk-m33vdkhs.js@282983`, cc-inspect `code` search) (exits at startup when older) beside `minimumVersion` (prevents downgrades): decide if the floor should use the hard setting. 2.1.326: present. missing.
  Acceptance: A decision record names the chosen setting. Verification: inspection.
  Basis: measured. Status: missing at 088a227c (git grep requiredMinimumVersion finds no hit).
  Source: probe cc-inspect surface, claude 2.1.325: `requiredMinimumVersion` present.

- [ ] **OUT-120** claudetto shall rerun the four-arm handover probe only if data changes (one paid run per arm of 3; 17 of 18 fired; no B arm cheaper than C in all 3 pairs; threshold default stays) and extend it with a 350k-500k token adherence run; a paid call needs the user first. Four-arm handover probe: rerun only if data changes (one paid run per arm of 3; 17 of 18 fired; no B arm cheaper than C in all 3 pairs, threshold default stays); extend with a 350k-500k token adherence run that a fake API cannot test. Needs a paid call: ask first.
  Acceptance: No paid run starts without the user's approval. Verification: demonstration.
  Basis: measured. Status: missing at 088a227c.
  Source: unresolved: the old key C names a worker input; no line holding the four-arm result found by grep in this pass.


## Conflicts With Settled Decisions

Items that contradict a settled decision. Each waits for the user to keep the decision or reopen it.

- [ ] **OUT-121** claudetto shall not ship a Stop check on "Should I" asks or on open-item lists (the baseline `run-limits/open-items.ts`, 37 lines, goes with it).
  Basis: measured. Status: missing at 088a227c (`git ls-tree -r --name-only 088a227c | grep -i open-items` lists nothing; the file the baseline check named is not in the tree). The baseline check blocked a reply on 2026-11-05 whose open list held only user decisions (rename, P1 check, confine, mining scope): three of the four were already settled in the repo, so the block was right for those and wrong for the P1 item, because no item matched its BLOCKER words. A Stop check on "Should I" asks has no row in `feature-map.md` or `tasks.md` and would be new 0.4.0 scope.
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2547; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2500.
  Conflict: claudetto shall not carry the removed Stop-hook machinery.

- [ ] **OUT-122** claudetto shall not run the 3.1a paid eval of its own `classify` module (at most $54.77). Task 3.1 (keep or remove the baseline `classify` module that settles a gate ask through Jev; `design.md:53`, `:111`, `:127`) is a different subject from 5.28 (the native auto-mode classifier).
  Basis: cited.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3335.

- [ ] **OUT-123** Running 5-10 representative tasks with subagents allowed versus denied to compare cost plus rework (model advice: "only that settles it"). claudetto builds no benchmark.
  Basis: reported. Status: missing at 088a227c.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:73 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings).

- [ ] **OUT-124** A Stop hook that greps for TODO in the files touched that session (with tests, type check, and a stop_hook_active guard). The reported reason: CLAUDE.md skip-rules are followed most of the time, not every time. Also: not add a Stop hook that checks whether the agent skipped anything. The reported content: a Stop hook only catches what tests cover; a separate QA run against only the issue text adds coverage; after two failed fixes stop editing, name the suspected cause, add logging and an end-to-end test first. 2.1.326: `Stop` and `StopFailure` are in the hook list at `chunk-m33vdkhs.js@5182` (cc-inspect `code` search).
  Acceptance: no Stop hook greps files for TODO and no shipped Stop hook runs a completion check. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`git grep -n Stop 088a227c -- plugins/claudetto/hooks/features/repeat/` finds no match; the only Stop-time hook is `classic.StopFailure` in `stop-notice.ts`).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbkgjm-what-matters-most-to-you-when-20261022T005215Z.md:66 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbkgjm/what_matters_most_to_you_when_working_with_claude); unresolved: no matching line found in external/ for the second wording; kept because the user curated it.

- [ ] **OUT-125** claudetto shall not add a guard hook that blocks a plan until a spec is approved, blocks a release while a gate is red, logs each file change with SHA-256 and writing agent, and accepts an overrule only from a human-written line with reason, name and file hash.
  Basis: reported design, run only on the author's projects. The source's reason: prompts alone cannot enforce a gate, since Claude argues past it in a long session.
  Conflicts with: no planner (user decision, 2026-11-16).
  Conflicts with: no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xbyg3k-i-made-claude-write-down-what-it-20261023T040746Z.md:39; (url: https://www.reddit.com/r/ClaudeAI/comments/1xbyg3k/i_made_claude_write_down_what_it_rejected_not).

- [ ] **OUT-126** claudetto shall not keep a fixed small task set in the repo (a failing test, a boring refactor, a framework migration) and re-run it every couple of weeks to read model drift as a change in error class. Also: not build a fixed task set, benchmark, or model-nerf measuring suite (5-20 pinned real tasks rerun after each model, harness, or prompt change, at least 3 runs per arm, revert real past fix commits as reviewer benchmarks, save launch-day prompts and rerun them). Own held-out evals stay (`plugins/claudetto/evals/`, 13 cases plus reworded variants; `~/.claudetto-holdout`); thresholds and wording change only with a recorded run on stored cases, a site moves to the Decider only when it scores at least current code, and tests never assert an exact live probability.
  Basis: measured. Also reported practice.
  Status: have at 088a227c (the earlier `partial` named `plugins/claudetto/evals/`, which `git ls-tree -r --name-only 088a227c -- plugins/claudetto/evals` shows absent: 0 files).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:259; (url: https://www.reddit.com/r/claude/comments/1xc9mw9/has_opus_55s_coding_quality_changed_recently); unresolved: no source line located for this claim.

- [ ] **OUT-127** claudetto shall not split work into three passes: plan against the actual files, write the patch, then review the diff by a third model against repo conventions.
  Basis: reported, one commenter. The source says framework conflicts come from planning without reading enough surrounding code.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:261; (url: https://www.reddit.com/r/claude/comments/1xc9mw9/has_opus_55s_coding_quality_changed_recently).

- [ ] **OUT-128** claudetto shall not ban a model when a traffic-light guard sees a task run with too little reasoning, a claim go unchecked, or explicit instructions replaced by wrong judgements three times in a day, nor recheck the ban daily.
  Basis: reported design (Metsatronic).
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:281; external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:283; (url: https://www.reddit.com/r/claude/comments/1xc9mw9/has_opus_55s_coding_quality_changed_recently).

- [ ] **OUT-129** claudetto shall not ship a Stop-time hook or line-count hook against narrating or null-guard comments. Also: not ship line-comment-count or null-guard rule hooks (`noNarratingComments`, `noImpossibleStateGuards`, `useLeastCode`): they are undecidable without a word list.
  Acceptance: improve names, structure, types, and explicit flow in order, then a short comment only for a reason the code cannot show; the rule reaches the model through rule files. A line-comment-count hook and a null-guard hook cannot be decided without a word list, so no hook exists. Verification: inspection.
  Basis: measured (heuristic); also inferred.
  Status: have as the user rule file `commentOnlyWhy`; no hook at 088a227c (`git grep -l -E 'noNarratingComments|noImpossibleStateGuards' 088a227c -- plugins` finds 0 files).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/agent-conduct/spec.md:142; unresolved: no source line located for this claim.

- [ ] **OUT-130** claudetto shall not route open problems to Opus as a subagent model. Also: not route work to an Opus or Fable subagent as the model-routing advice reads: an Opus agent for migrations, auth, server routes, CI, planning, security review, and as retry when Sonnet fails; Fable for open-ended work and root-cause hunts. The split stays a note for the lead's own planning only.
  Acceptance: no agent file names Opus or Fable. The rest of the routing advice (Haiku for bounded verifiable jobs, Sonnet for unknown cause and as Haiku retry, plan strong then execute cheap in a new session, `/model opusplan`, `/effort xhigh` to plan then `/effort medium` to build) is carried here as reported, contested. Measured (14 days, 879 sessions, 968 subagent runs, price-weighted): a rule sending every TDD step of a complex task to an Opus agent cost 20% of spend; 35% of file reads were repeat reads of an unchanged file (a hook now refuses it); a commenter: "routing by task size is the trap". Verification: inspection.
  Basis: reported, contested.
  Status: have at 088a227c (`git grep -l -E 'claude-fable|claude-opus' 088a227c -- plugins/claudetto/agents` finds 0 files); step-type routing and repeat-read refusal missing. `opusplan` is in the alias list of 2.1.326 at `chunk-5h5hxvwy.js@963` (cc-inspect `code` search); `/effort` and `/model` are unverified in 2.1.326.
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: user decision, recorded in the 2026-11-17 handover (day of decision not recorded); external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:74 (url: https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save) holds a related cheaper-model comparison. The original "open problems to Opus" text: not located; external/2026-10-28/reddit.com-r-claudeai-comments-1xgsku3-i-parsed-34-gb-of-my-claude-code-20261028T061008Z.md:29 (url: https://www.reddit.com/r/ClaudeAI/comments/1xgsku3/i_parsed_34_gb_of_my_claude_code_transcripts_20); external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:57 (url: https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down); merged with plan:1168 (orchestrator launch advice).

- [ ] **OUT-131** claudetto shall not adopt a decisions index loaded at session start as a router to the authoritative document, acked back by count.
  Basis: reported, two users (about 8500 tokens for a 408-decision project; the agent acks the counts and on a discrepancy pulls the one decision or brief).
  Conflicts with: no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xco6yg-a-modern-ai-problem-with-a-cen-20261024T062321Z.md:79 (url: https://www.reddit.com/r/ClaudeCode/comments/1xco6yg/a_modern_ai_problem_with_a_centuryold_answer).

- [ ] **OUT-132** claudetto shall not adopt a build order for AI projects (GDD plus TDD first, 50-100 gap questions in a table, a locked MVP, tiers Foundation to Wishful).
  Basis: reported, two authors.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-26/reddit.com-r-aigamedev-comments-1xfcokl-advice-for-those-developing-gam-20261026T063549Z.md:156 (url: https://www.reddit.com/r/aigamedev/comments/1xfcokl/advice_for_those_developing_games_with_ai_so_they).

- [ ] **OUT-133** claudetto shall not adopt paired agent roles with one project-manager agent as the only user interface, and flagship planners over lower-tier implementers.
  Basis: reported, one commenter, unmeasured.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-26/reddit.com-r-aigamedev-comments-1xfcokl-advice-for-those-developing-gam-20261026T063549Z.md:202 (url: https://www.reddit.com/r/aigamedev/comments/1xfcokl/advice_for_those_developing_games_with_ai_so_they).

- [ ] **OUT-134** claudetto shall not adopt a change rule for a scope document (ask what a new feature replaces in the release plan; if nothing, it goes to a later-version list). The rule governs the user's own project plan, not a claudetto part.
  Basis: reported, one commenter.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-26/reddit.com-r-aigamedev-comments-1xfcokl-advice-for-those-developing-gam-20261026T063549Z.md:441 (url: https://www.reddit.com/r/aigamedev/comments/1xfcokl/advice_for_those_developing_games_with_ai_so_they).

- [ ] **OUT-135** claudetto shall not adopt planning one slice at a time (health check plus db connection), then the next.
  Basis: reported, several commenters.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgnu5o-ais-over-exhausted-planning-20261028T061059Z.md:37; external/2026-10-28/reddit.com-r-claudeai-comments-1xgnu5o-ais-over-exhausted-planning-20261028T061059Z.md:86 (url: https://www.reddit.com/r/ClaudeAI/comments/1xgnu5o/ais_over_exhausted_planning).

- [ ] **OUT-136** claudetto shall not adopt in-harness pass/fail lines for qualifying a local model (prefill at least 1000 tok/s, warm first turn at most 30 s, a few hundred output tokens for "READY").
  Basis: reported, one author.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:265 (url: https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac).

- [ ] **OUT-137** claudetto shall not adopt keeping every 5th routed-down step on Opus for 2 weeks to compare review findings.
  Basis: reported, one user.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgsku3-i-parsed-34-gb-of-my-claude-code-20261028T061008Z.md:31 (url: https://www.reddit.com/r/ClaudeAI/comments/1xgsku3/i_parsed_34_gb_of_my_claude_code_transcripts_20).

- [ ] **OUT-138** claudetto shall not adopt a sycophancy probe (the same factual question in fresh chats, neutral and then with a confidently wrong answer). A proposed method that was not run.
  Basis: reported, one commenter.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:245 (url: https://www.reddit.com/r/ClaudeAI/comments/1xfa39o/is_claude_the_least_yesman_llm).

- [ ] **OUT-139** claudetto shall not adopt a month-long agent research loop (register each idea before running, revert rejected code but keep the diary entry, two independent verifiers, check any "record" against public sources). The loop is the user's own research practice, not a claudetto part.
  Basis: reported, one user.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xd97ax-do-you-have-any-tips-for-encoura-20261024T063435Z.md:57 (url: https://www.reddit.com/r/ClaudeAI/comments/1xd97ax/do_you_have_any_tips_for_encouraging_claude_to).

- [ ] **OUT-140** claudetto shall not adopt giving a long autonomous loop eyes on the target (a driver writes a status block and a log ring to memory; the agent reads it after each test, and runs build, upload, and read-logs unattended). A practice of one hardware project, not a claudetto part.
  Basis: reported, one project, Opus 5.5 medium.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgtghe-claude-code-reverseengineered-th-20261028T060614Z.md:52 (url: https://www.reddit.com/r/ClaudeAI/comments/1xgtghe/claude_code_reverseengineered_the_xbox_360_kernel).

- [ ] **OUT-141** claudetto shall not adopt a local-or-cloud routing recipe (a six-question classifier giving AS-IS, AMENDED, or CLOUD; approval asked only when local is recommended). The recipe routes work to a local model.
  Basis: reported, one author.
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:55 (url: https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac).

- [ ] **OUT-142** claudetto shall not adopt an orchestrator tripwire at 500k context that sends a wind-down and handoff message, with a restart script that launches a new session hours later. Claudetto's handover knobs mirror Claude Code's compaction knobs, so the threshold is a CLAUDETTO_* knob, not a 500k script.
  Basis: reported; an auto-compact setting of 500k was criticised as a threshold nobody reaches.
  Conflicts with: handover replaces core auto compaction by default; manual `/clear` stays and writes a handover first; `CLAUDETTO_*` handover knobs mirror Claude Code's compaction knobs (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-27/reddit.com-r-claudecode-comments-1x776ms-auto-handoff-are-the-best-new-20261026T134539Z.md:179 (url: https://www.reddit.com/r/ClaudeCode/comments/1x776ms/auto_handoff_are_the_best_new_feature).

- [ ] **OUT-143** claudetto shall not ship a constraint ledger, so it carries no first-call-covers-all rule, no `rule none` entry kind, and no substring invariant. Also: not build the constraint ledger (`hooks/pin.ts`), which pulls standing constraints out of the user's messages and denies a call that breaks a read-only, no-commit, no-push, or only-files rule. Also: not keep the constraint ledger: the 2-1-323 design removed it (the permission dialog plus `permissions` and `autoMode` judge calls replace it), and the superseded record keeps the measured case. Also: not enforce session constraints at runtime through `tool.check` (read-only, no-commit, no-push, only-files); D321 removed the constraint ledger. A false constraint taken from a task sentence ("Rename the export in src/format.ts and you're finished") became an only-files rule that denied the caller's edit: syc-callers-updated 12/16 against 16/16 at baseline.
  Also: not carry the constraint ledger as a remark gate: "A Remark Is Answered Before Any Tool Runs" (132 denials in 3 days, 8 recorded false), "A Dispute Is Settled by Running the Disputed Code", "A Compaction Ends the Remark Turn"; not carry the ISSUES gate (ask tool denied until the session holds a successful Read or Bash `cat/head/tail/less/more/bat/nl/non-in-place sed` of the newest `ISSUES*.md` by mtime at repo root, found by `git rev-parse --show-cdup`; a symlink counts with its target mtime via `$.fs.stat`, since `fs.list` gives link mtime 0; the deny leads with the instruction because the ask tool's failure line cuts at about 160 chars) or the answer-first remark check (it denied work the user had asked for: R9, R17, R32, R35, R60 and three more in one session, out of 132 denials; the fault is left to the root prompt line "a question wants an answer and then a wait" and the Concise style; A/B: tool before any text 5/10 vs 0/10); not keep the decider ledger or the RULE_CRITERIA list, nor decider ledger rules (a later user message that the Decider reads as allowing the act an entry forbids lifts that entry; a resumed session's first prompt waits for extraction so the ledger note rides it; a remark like "2-1-319 is out" must not become "Do not delete branch"). The per-question approval Noul (`pick_0` plus `approval_0`, or `yes_0` plus `approval_0`; "Does question <i> ask the user to approve money, a push, a release, a delete, or a step with no undo?") stays in the decider.
  Acceptance: no hook writes, injects, or enforces ledger entries; No `tool.check` constraint denial exists; no ledger reply, no RULE_CRITERIA, no per-sentence rule check, no ask-tool gate and no remark denial exists. Verification: inspection.
  Basis: measured (the removed ledger's false-constraint case: syc-callers-updated 12/16 against 16/16 at baseline; D321 removed the ledger); also reported and cited.
  Status: have at 088a227c (`git grep -l -E 'pin\.ts|constraint.?ledger|ConstraintPin|useConstraintPin|RULE_CRITERIA' 088a227c -- plugins` finds 0 files; `git grep -l ISSUES 088a227c -- plugins` finds 0 files; `git grep -l ISSUES 088a227c -- plugins` finds 0 files; a [ADR-0133](../adr/0133-constraint-ledger.md) spec existed outside `plugins/`).
  Conflicts with: no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: openspec/specs/constraint-ledger/spec.md:40 (the mod's first Decider call covers every person message, each later call only the new one; state holds only the user's own messages and current entries, so tool results and injected text such as "Do not edit the lockfile." never become entries); openspec/specs/constraint-ledger/spec.md:64 (a sentence answered yes with its rule unsettled gets rule `none`, shown on each prompt, not enforced; unsettled for "limits the assistant" gains no entry); openspec/specs/constraint-ledger/spec.md:131 (every entry's text is a substring of a message the user sent); openspec/changes/archive/2026-11-09-release-2-1-319/design.md:283; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:276; openspec/specs/constraint-ledger/spec.md:8; [ADR-0133](../adr/0133-constraint-ledger.md); openspec/specs/constraint-ledger/spec.md:4; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:424.; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:88; openspec/specs/low-hitl/spec.md:169; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:208-211,223,233-234 (the ledger reply needs at least 87 chars per sentence; a resumed 193-sentence session needs 17,541 chars, over any 2,106-token cap; 1 of 3 replays of the real 41-sentence read stopped mid-JSON at 4,154 output tokens; RULE_CRITERIA has no option for a no-rule sentence, so 41 of 82 answers stay unsettled); openspec/changes/2-1-325-rearchitecture/specs/decide/spec.md:102

- [ ] **OUT-144** claudetto shall not ship advisor prompt text (`ADVISOR_SYSTEM` and its added lines). Also: not rebuild the advisor as `mcp__claudetto__advisor` and `/claudetto:advisor` (one `$.model.complete` at `high` on `claude-fable-5-2`, or `claude-mythos-5-2` when `ANTHROPIC_DEFAULT_FABLE_MODEL` names it, reading the question and asker-named files through `$.fs.read`, secret-scanned first, 400,000-char cap, `@path` words in the command). It also puts Fable in a model role (see "Fable and Opus are never a subagent model"). Also: not rebuild the advisor (a model call that sends only a question and named files to Fable or Mythos). The built-in advisor stays off through `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`, which setup writes. The built-in is a server tool behind `advisorModel`, `/advisor` and beta `advisor-tool-2026-03-01`, reported to read the whole context at each question; whether a plugin model call can name those models at `high` is an unproven, paid hypothesis. A prompt cache belongs to one model, so a Fable question could not reuse the main thread's cache.
  Acceptance: no advisor system text exists in the plugin; No advisor tool or command exists; setup writes the disable. Verification: inspection.
  Basis: cited. Also reported (one session cost $0.4302).
  Status: have at 088a227c (`git grep -l -E 'ADVISOR_SYSTEM|advisorModel' 088a227c -- plugins` finds 0 files; `settings.ts:178` writes `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`).
  Conflicts with: the advisor tool stays disabled (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:156 (a rewrite proposal for `ADVISOR_SYSTEM`: "Put the answer in the first sentence. Define each term you coin."); openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:31; openspec/specs/decide/spec.md:229; [ADR-0116](../adr/0116-advisor-rebuild-superseded.md); [ADR-0052](../adr/0052-advisor-tool-disabled.md); openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:643; CHANGELOG.md:129.

- [ ] **OUT-145** claudetto shall not add a done-gate that blocks Stop on test exit codes, a pipe check, or a test-touches-module grep. Also: not add a Stop hook as done-gate (on Stop: if the last message claims success and no test, build, or command ran after the last edit, exit 2 once and check `stop_hook_active`; variants running typecheck, lint, and tests; a reviewer subagent marking each plan step done or not done).
  Acceptance: No Stop hook inspects test output or the test file for the edited module name; no Stop check classifies the last message. Verification: inspection.
  Basis: reported (one poster's replay of 4000 sessions): block when the last test or build after the edit exited non-zero; a pipe into tail or grep can hide a failing exit code; a runner that matches zero tests exits 0, so require at least one test ran; grep the test file or import graph for the edited module name as a mismatch flag. Also reported: a replay of 3,977 turns, 406 ending done or fixed, showed the first version would have blocked 86, almost all legitimate.
  Status: have at 088a227c (`git grep -l stop_hook_active 088a227c -- plugins` finds 0 files).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuivsm-i-replayed-4000-of-my-claude-c-20261116T052626Z.md:63,87,91 (url: https://www.reddit.com/r/ClaudeCode/comments/1xuivsm/i_replayed_4000_of_my_claude_code_turns_to_see); user decision, 2026-11-16; external/2026-10-21/reddit.com-r-claudecode-comments-1x9xu48-how-do-you-get-claude-code-to-20261020T024242Z.md:115 (url: https://www.reddit.com/r/ClaudeCode/comments/1x9xu48/how_do_you_get_claude_code_to_actually_check_its).

- [ ] **OUT-146** claudetto shall not pin a local small model for explaining files, commit messages, and diff summaries.
  Acceptance: No block names a local model or a model server. Verification: inspection.
  Basis: reported (one commenter): a pinned Gemma 4 E4B on an M4 16GB via Magnitude answers in about 2 s; Opus does the rest; a predictable weaker model beats an unpredictably degraded stronger one. Status: missing at 088a227c.
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xve1u7-id-rather-have-a-weaker-model-20261116T051723Z.md:29 (url: https://www.reddit.com/r/ClaudeCode/comments/1xve1u7/id_rather_have_a_weaker_model_that_never_changes); user decision, 2026-11-16.

- [ ] **OUT-147** claudetto shall not record `model: opus` in subagent frontmatter, nor a rank rule, to run a Fable-planned orchestrator.
  Acceptance: No agent file names Fable or Opus as its model. Verification: inspection.
  Basis: reported (one poster): a rank rule plus `model: opus` in subagent frontmatter is the workaround. Status: have at 088a227c (no Fable or Opus in claudetto agent frontmatter: Artemis uses claude-haiku-5-5).
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwckod-fable-52-as-orchestrator-plann-20261116T052602Z.md:89 (url: https://www.reddit.com/r/ClaudeCode/comments/1xwckod/fable_52_as_orchestrator_planner_reviewer_and); plugins/claudetto/agents/Artemis.md:4@088a227c; user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

- [ ] **OUT-148** claudetto shall not route tasks through a Haiku router that sizes each task and sends it to Haiku, Sonnet, or Opus last. Also: not use a Haiku judge router as the default effort or model picker: it underestimates tasks, is fooled by "yes", drops per-prompt switching because cache is per model, and its 20% saving rests on 4 tasks.
  Acceptance: No block holds a task-sizing router; no judge router picks effort or model. Verification: inspection.
  Basis: reported (one commenter): Haiku for tool use and orchestration, Sonnet at effort levels for code, Opus only as a last resort. Its 30% saving is kept as a fact in arc42 section 3.
  Status: have at 088a227c (`git grep -l -E 'Haiku.*router|taskRouter' 088a227c -- plugins` finds 0 files).
  Conflicts with: no planner (user decision, 2026-11-16).
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx4fkw-token-savings-20261116T045931Z.md:41 (url: https://www.reddit.com/r/ClaudeCode/comments/1xx4fkw/token_savings); user decision, recorded in the 2026-11-17 handover (day of decision not recorded); external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:40; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:143.

- [ ] **OUT-149** claudetto shall not build a skill eval method: trigger evals on 20-40 positive and distractor prompts at precision and recall of at least 90 percent, ablation Delta = Score(with_skill) - Score(without_skill) (Delta 0 means the skill is redundant), a deterministic grader order (file_exists, tool_used, tool_order, regex, test run), then a Haiku binary rubric, then adversarial safety-bypass prompts. Also: not run controlled skill and rule evals (no-skill baseline, same-length placebo, shuffled-sentence control, previous version, paraphrase tests).
  Acceptance: none ships. Verification: inspection.
  Basis: reported, unverified (the skill eval method). Also reported: added text alone moves cost +2% to +16%; of 9 popular skills 2 beat placebo, 6 no better, 1 worse; a "caveman" skill claimed -65% tokens and measured -2% output and +14% total cost, 15 tasks, 30 runs per arm, Opus 5.5, Holm p=0.049; IFEval++ up to 61.8% drop under a nuanced prompt change.
  Status: have at 088a227c (`git ls-tree -r --name-only 088a227c -- plugins/claudetto/evals` lists 0 files).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:56; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:258; user decision, 2026-11-16.

- [ ] **OUT-150** claudetto shall not ship an escalating implementer ladder that raises a new Opus implementer from xhigh to max, with the reviewer always at max (medium, then a new implementer at xhigh with the lessons if P0 or P1 findings remain, then max on a third round, then held for the human as "ship with residuals or strip").
  Acceptance: No agent file names Opus or Fable as a subagent model, and effort stays fixed per agent file. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:142 (url: https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents); user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

- [ ] **OUT-151** claudetto shall not run several loops at different effort levels on each new model release to find the cost-to-error sweet spot, counting the reviewer's extra flags and rewrites.
  Acceptance: No plan file schedules an effort-sweep run. The source holds only the sweet-spot loops and the diminishing-returns remark; it does not state that max effort gave worse results. Verification: inspection.
  Basis: reported, one user. Status: missing at 088a227c.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:255 (url: https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents); user decision, 2026-11-16.

- [ ] **OUT-152** claudetto shall not ship an orchestrator that files GitHub issue tickets, picks the model and a per-task token budget for headless sessions by its own experience, and has each task declare the files it will touch and claim an open worktree.
  Acceptance: No claudetto block files tickets or sets a per-task budget; delegation keeps one worktree and disjoint files per worker. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:716 (url: https://www.reddit.com/r/ClaudeCode/comments/1xgxv58/claude_max_20x_weekly_depleted_in_less_than_25); user decision, 2026-11-16.

- [ ] **OUT-153** claudetto shall not ship a Stop hook that scolds a session ending on a question without flagging it on a shared work board, nor a lead-dev chat that reads only what the others changed and warns two agents touching the same file.
  Acceptance: No Stop hook inspects the reply text for a closing question. Verification: inspection.
  Basis: reported, one user. Status: missing at 088a227c.
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xc8eg5-running-many-claude-code-agents-20261029T123926Z.md:121 (url: https://www.reddit.com/r/ClaudeAI/comments/1xc8eg5/running_many_claude_code_agents_without); user decision, 2026-11-16.

- [ ] **OUT-154** claudetto shall not ship a manager session that logs the user's decisions and checks that each was carried out.
  Acceptance: No such session exists in the plugin. One user runs a manager session this way and another runs a checking agent permanently with every task. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Conflicts with: no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:39; external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:68; external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:72 (url: https://www.reddit.com/r/ClaudeAI/comments/1xigw3d/im_not_a_developer_and_i_run_several_claude_code); user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

- [ ] **OUT-155** claudetto shall not ship sliding compaction, where a hook at compaction keeps the conversation word for word and replaces old tool outputs (file reads, test runs, diffs) with one line telling the model to read again if needed.
  Acceptance: The plugin holds no sliding compaction. The tokendoctor author reports no model call, so it takes milliseconds; the summary stays as fallback for /compact; sliding is off by default and a replay of the user's own sessions at windows 200K to 600K picks the number. Verification: inspection.
  Basis: reported, one author. Status: missing at 088a227c.
  Conflicts with: handover replaces core auto compaction by default; manual `/clear` stays and writes a handover first; `CLAUDETTO_*` handover knobs mirror Claude Code's compaction knobs (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-11-02/reddit.com-r-claudecoding-comments-1xlfx93-compacting-at-400k-instead-o-20261102T070132Z.md:48; external/2026-11-02/reddit.com-r-claudecoding-comments-1xlfx93-compacting-at-400k-instead-o-20261102T070132Z.md:69 (url: https://www.reddit.com/r/ClaudeCoding/comments/1xlfx93/compacting_at_400k_instead_of_967k_cut_my_claude); user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

- [ ] **OUT-156** claudetto shall not ship a harness where Claude does only architecture, planning, shaping and UAT while a local model writes the code and tests.
  Acceptance: The plugin routes no coding to a local model. One commenter runs a local Qwen 3.8 27b (4-bit, 260k prompt) at about 6M output tokens a day in batch for about 3 dollars a day of electricity, a mistake rate not much above Haiku's, with unit tests, a frontier-model review, and a periodic UAT sweep; a split function routes an issue to smaller ones when the local model runs out of turns or context. Verification: inspection.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:105; external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:113; external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:115; external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:117; external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:119 (url: https://www.reddit.com/r/ClaudeAI/comments/1xl9c92/forget_the_usual_claude_tips_what_are_the_strange); user decision, 2026-11-16.

- [ ] **OUT-157** claudetto shall not ship a cost split where Opus writes the plan and spec, DeepSeek implements, a new implementation-model session reviews in a review-fix loop run twice, and Opus gives a final pass once tests pass.
  Acceptance: The plugin routes no implementation to DeepSeek. One user built a router metrics exporter for under a dollar against an estimated 10 to 30 dollars on Opus and Sonnet; the estimate is unverified. Verification: inspection.
  Basis: reported, one user, estimate unverified. Status: missing at 088a227c.
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:195; external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:199; external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:201; external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:211; external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:213 (url: https://www.reddit.com/r/claude/comments/1xlrxh9/new_to_claude_any_tips_for_saving_tokens); user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

- [ ] **OUT-158** claudetto shall not enable the advisor pattern (a strong model consulted before committing, when stuck, and before done; `advisorModel`, `/advisor`, `/advisor fable`, Sonnet 5.5 high main with an Opus advisor). Setup keeps `CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1"`. Also: not ship the native advisor tool or an advisor model setting as a routing option. The advisor is a server tool, so hooks never see it and no setting caps it; "unavailable" is a generic message for several causes; the pairings are Sonnet+Opus, Sonnet+Fable (v2.1.170+), Haiku+Opus, Opus+Opus, and Fable+Fable. `/advisor` stays disabled by `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`; `useAdvisorTool` and `useAdvisorCommand` go. Also: not enable the advisor tool (`/advisor fable` on an Opus session). Findings against it: two authors report `/advisor fable` inside Claude Code with Opus 5.5 works as a second opinion; one recommends it at a token cost justified when the advisor prevents impactful mistakes.
  Acceptance: the written env holds `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` "1" and no `advisorModel`. Verification: inspection.
  Basis: measured, one user (95 calls, 19.6M uncached input tokens, 3-5% of usage); cited second-hand (Opus 5.5 plus Fable advisor 1.7 points over Opus alone for about 2.1x cost); cited (docs) and reported; reported, 2 authors and 1 author (downvoted).
  Status: have at 088a227c (`settings.ts:178` writes `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`; `advisorModel` is absent).
  Conflicts with: the advisor tool stays disabled (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-21/reddit.com-r-claudeai-comments-1xbipii-claude-invented-an-email-bounce-20261021T101718Z.md:33 (url: https://www.reddit.com/r/ClaudeAI/comments/1xbipii/claude_invented_an_email_bounce_that_never); plugins/claudetto/hooks/features/setup/settings.ts:178@088a227c; user decision, recorded in the 2026-11-17 handover (day of decision not recorded); external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:240; external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:244 (url: https://www.reddit.com/r/claude/comments/1xtnyre/unpopular_opinion_i_am_back_on_opus_55_after); external/2026-11-13/reddit.com-r-claudeai-comments-1xtyq0y-fable-52-wakes-up-opus-55-20261112T231243Z.md:164 (url: https://www.reddit.com/r/ClaudeAI/comments/1xtyq0y/fable_52_wakes_up_opus_55).

- [ ] **OUT-159** claudetto shall not make Fable the daily implementer, "always strongest model and max effort", or max or ultra effort the default (xhigh Opus took 100k+ tokens and an hour for what medium does in 10 minutes).
  Acceptance: no default sets max or ultra effort and no agent file names Fable or Opus as `model:`. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:116; external/2026-10-17/export-Haiku 5.5 on Steroids.jsonl:18 (url: https://www.reddit.com/r/ClaudeCode/comments/1x5rbwy/haiku_55_on_steroids).

- [ ] **OUT-160** claudetto shall not enforce banned-word lists for hedges or trust-the-file CLAUDE.md rules: the model finds synonyms and drifts past a rule deep in context, especially after auto-compaction. Hooks enforce instead.
  Basis: reported. Status: not applicable.
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:181.

- [ ] **OUT-161** claudetto shall not plan phases with token estimates: small phases, a PLAN.md with estimate against actual, per-phase handoff files, and "no subagents without approval" are a planner. A commenter doubts that estimating tokens costs less than it saves. Spec-then-write-back and "only ask what two different answers would change the file layout for" stay as prompt posture.
  Basis: reported. Status: partial at 088a227c (the openspec flow; no actual-against-estimate table).
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-12_p3/export-Is Sonnet 5.5 a good replacement for Opus-.jsonl:7 (url: https://www.reddit.com/r/ClaudeCode/comments/1x3wwa4/is_sonnet_55_a_good_replacement_for_opus).

- [ ] **OUT-162** claudetto shall not build a goal-aware Stop block or a prompt key scan: no typed interface exposes the active goal and no incident is recorded. `/goal` is a Stop hook that must be satisfied; `/loop <interval> <prompt>` is a cron (`CronCreate`) that fires regardless; a loop stop condition must check task completion, not the end of a turn. Revisit when `index.d.ts` exposes the goal. Also out: an elapsed-time budget in the prompt ("elapsed 340s / 1200s") as a pacing device, since the model does not check the clock.
  Acceptance: no Stop check reads an active goal; no hook scans each prompt for a key. Verification: inspection.
  Basis: reported and inferred (recommendation: no typed interface exposes the active goal; the key scan is a candidate with no measured miss).
  Status: have at 088a227c (`git grep -l -E '\bgoal\b' 088a227c -- plugins/claudetto/hooks` finds 0 files).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: unresolved: no source line located for this claim; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:288 (item 8, goal-aware Stop block) and :289 (item 9, prompt key scan).

- [ ] **OUT-163** claudetto shall not scan replies at Stop for `- [ ]` or `- !` command bullets (opens with `! ` or backtick-`! `; numbered task lines are no question; a bullet quoting `! cmd` in backticks is no stray command). This is a regex Stop check, which the settled decision rules out. History: 16 of 108 items were questions typed as items; the check had real catches (stray `sudo`, `! cd ... && git push`).
  Acceptance: No Stop hook matches reply text with a pattern for bullets. Verification: inspection.
  Basis: measured. Status: missing (and not to be built) at 088a227c.
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10 (handoff of 2026-11-12, Standing Instructions: the Stop hook rejects `- [ ]` lines; observed in transcript); openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:852 (P227, `COMMAND_BULLET`); openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:229 (neighbour). Decision conflict: no regex Stop check (user decision).

- [ ] **OUT-164** claudetto shall not read `## What I Need From You` of `last_assistant_message` at Stop with a form check (at most one `- ! <command>` bullet without a checkbox or one fenced `sh` block; `- [ ] ! gh auth login` blocks; two commands block once; a `- ! <command>` bullet whose command no earlier Bash call ran, or whose last run succeeded, blocks through `transcript_path`). The check is a text match at Stop, which the settled decision rules out.
  Acceptance: No Stop hook parses the section. Verification: inspection.
  Basis: reported. Status: missing (and not to be built) at 088a227c.
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: openspec/specs/run-limits/spec.md:110 (`- [ ] ! gh auth login` blocks). Decision conflict: no regex Stop check (user decision). Not located: the D323 lines 118, 119, 276.
  Conflict: claudetto shall not carry the removed Stop-hook machinery.

- [ ] **OUT-165** claudetto shall not deny `AskUserQuestion` from a [ADR-0133](../adr/0133-constraint-ledger.md) `tool.call` hook (denial told the agent to state its reading and end with each choice only the user can make). The cure for asking after "stop asking questions" rests on the constraint ledger, which the settled decision rules out.
  Acceptance: No `tool.call` hook denies `AskUserQuestion` for a ledger rule. Verification: inspection.
  Basis: reported. Status: missing (and not to be built); partial: `plugins/claudetto-you-should-know/hooks/register.ts` handles `AskUserQuestion` at 088a227c at 088a227c.
  Conflicts with: no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:129-133 (constraint ledger removed; see [ADR-0075](../adr/0075-no-constraint-ledger.md)).

- [ ] **OUT-166** claudetto shall not ship a Stop gate that blocks capitulation by a conjunction of phrase conditions. The hexisteme design blocks only when all three hold: a user challenge in the last user message, an agreement phrase, and no verification language or tool call that turn. It releases by nag-once (a hash of the blocked reply; an identical retry passes) and guards with `stop_hook_active`. It has no measured rates; the 98% figure is from arXiv 2310.13548.
  Basis: reported design.
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:21; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:37; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:62.

- [ ] **OUT-167** claudetto shall not use Fable domain reviewers as subagents (read and return findings with file:line and a failure scenario while Opus checks each finding and fixes). The reported recipe: split finding from fixing; the plan stage (one plan agent whose mistakes spread into 5-7 build agents) and hard diagnosis (flaky versus real red run, root cause) are where a stronger model pays off; day 2 of use, loops quicker, tokens not up. The finder/fixer split by model and plan-stage-first routing may run in main sessions.
  Basis: reported, Opus-derived recommendation.
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:422; external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:423; external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:424 (url: https://www.reddit.com/r/claude/comments/1xtnyre/unpopular_opinion_i_am_back_on_opus_55_after); user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

- [ ] **OUT-168** claudetto shall not add a check that bounces text which opens by praising the post or ends on an either/or question (one rewrite, then a hold for a human).
  Basis: reported. Status: not applicable (scope out).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:281 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange).

- [ ] **OUT-169** claudetto shall not add a Stop hook that checks the reply for remaining `[ ]` items before the turn may end, nor one that bans stopping until DONE. Commenters attribute early stops to a per-turn step budget and to low effort or Haiku; /goal is the other cure named.
  Basis: reported, inferred, no measure. Status: not applicable (scope out).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqlgno-agents-knowingly-fail-to-complet-20261110T093545Z.md:187 (url: https://www.reddit.com/r/ClaudeAI/comments/1xqlgno/agents_knowingly_fail_to_complete_tasks_in_order).

- [ ] **OUT-170** claudetto shall not ship the plugin eval suite (`plugins/claudetto/evals/`, its results dir), the per-rule eval-case inventory, or goal-overnight.txt benchmark targets. The plugin eval suite (`plugins/claudetto/evals/`, results dir, design Decision 11), per-rule eval-case inventory (agent-conduct "Each Rule Has an Eval Case"), and goal-overnight.txt demands are dropped: the tested agent wrote its graders and edited them after seeing runs, so scores are meaningless; conduct incl. the opener is scored by `conductOf` (tools/bench/transcript.ts) on the benchmark. goal-overnight.txt demands (owner rejected, context only): SWE-bench-style tasks from pinned 1k+ star repos with hidden PR tests; stock vs dev headless, same model/effort; evals frozen before run 1 with one unseen holdout; targets 98-99% cache hit after turn 1, no auto-compaction or 59+ min session, no unchanged-file rereads; mutation-proven tests (Stryker, mutmut); least code (jscpd); stock-vs-final outcome table; JSON pass/fail list with push of each green commit; 24 external URLs each adopted/rejected/blocked; 98-row "I01-I18" dossier table; "senior engineer who catches mistakes before they're written". Result: harness, holdout tooling, mutation scores and 98-row table built while cache/compaction/reread/cost targets stayed unmeasured (pass:false). Reason: benchmark metrics replaced product behaviour (inferred); dev cost 2.3x stock (round 5 $9.10 vs $3.98) from the mutation rule (hono $2.14 20.8 min vs $0.74). Kept from it: "tested agent can't write graders, hidden tests, holdout, results; grade outside its workspace" -> holdout under `~/.claudetto-holdout` (sandbox read-deny; this session's sandbox prompt lists it under `denyOnly`, which 2.1.326 carries at `chunk-z4j4mjgn.js@645219` (cc-inspect `code` search)) -> wall mechanism and `protectedPaths`; holdout scoring stayed a user step (items.json bench-holdout). Frozen graders held out from the tuned agent stay as the note. Purpose conflict: surface-trim character golf is the benchmark-chasing the owner rejected unless billed cost is checked (inferred). Repo: have (tools/bench/transcript.ts; `plugins/claudetto/evals` absent). Also: not carry forward the deleted plugin eval suite, in which the agent under test wrote its own graders after seeing results. Also: not carry a headless stock-against-dev benchmark with hidden tests, a task set from merged PRs, mutation scoring of the agent's tests, a dossier claim extractor, or a results table in a design file; not carry benchmark rounds, a holdout set, or a stock-against-final table; not carry the benchmark and metric goal lines (priorities, cache, latency, token measures) of the 2.1.325 goal. The settled decision of no benchmarks holds; the user said nobody asked for benchmarks, which conflicts with the earlier goal text at ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490. The user decided this on 2026-11-16 (date of the handoff that records it; day of decision not recorded); `tools/bench/` exists in the old tree, so the baseline holds the part that goes.
  Acceptance: No `evals/` tree and no benchmark target exist in the target tree. Verification: inspection.
  Basis: user decision (the 2026-11-16 benchmark ruling), cited, observed in transcript. Also read.
  Status: have at 088a227c (`git ls-tree -r --name-only 088a227c -- plugins/claudetto/evals` lists 0 files; `tools/bench/` exists, see the bench item).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: openspec/changes/2-1-325-rearchitecture/tasks.md:44; openspec/changes/2-1-325-rearchitecture/goal-overnight.txt:15; openspec/changes/2-1-325-rearchitecture/goal-overnight.txt:17; openspec/specs/agent-conduct/spec.md:151; openspec/changes/2-1-325-rearchitecture/specs/agent-conduct/spec.md:7; unresolved: no source line located for this claim.; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790

- [ ] **OUT-171** claudetto shall not carry the removed Stop-hook machinery: open-items word lists and model grader, prompt-key scan, goal-aware Stop block, offer word list, test-tampering gate, `useSliceCommits`, cleanup and background-task Stop blocks, two-call grader, named-files check, stall stop. Gone: word lists for the open-items check (each word one more escape) and its model grader (syntax only); prompt-key scan, goal-aware Stop block, offer word list, test-tampering gate (not built; test-tamper check "not sound", tasks 13.2); `useSliceCommits`, cleanup and background-task Stop blocks, the two-call grader, named-files check, stall stop (slice check hashed every `git status` path incl. agent worktrees and blocked 44 times in a row). `open-items.ts` goes with no Stop check in its place (user decision, AskUserQuestion 2026-11-17); `texts-grade.ts` fault list becomes one prompt-type Stop hook (one call where the grader made two; Haiku alone missed 4 of 12; two-model vote loss measurable only by a paid replay, unapproved); `/goal` covers continuation (the `/goal` gate isEnabled is unverified in 2.1.326); commit rule stays a prompt line. Preamble claim "Stop-block text in `context`" wrong: text goes to `stdout` (grader blocked more when it sat in `context`). Basis: measured/reported.
  Acceptance: no open-items Stop hook and no `open-items.ts` remain; the output style alone teaches the `- ! <command>` form. Verification: inspection.
  Basis: measured. Status: partial (see 088a227c hooks; stall stop blocked 44 times in a row).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:247; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:324; openspec/changes/archive/2026-11-16-2-1-323/design.md:127; openspec/changes/archive/2026-11-16-2-1-323/design.md:123; openspec/specs/agent-conduct/spec.md:162.
  Resolved: claudetto shall not ship a Stop check on "Should I" asks or on open-item lists (user decision, AskUserQuestion 2026-11-17: no Stop check).
  Resolved: claudetto shall not read `## What I Need From You` of `last_assistant_message` at Stop with a form check (same decision).
  Resolved: The `open-items.ts` file shall go, because the user asked what it is and nobody asked for it (same decision).

- [ ] **OUT-172** claudetto shall not test `claude-fable-5-2` for Athena. Test: `claude-fable-5-2` (reserved for Athena in project CLAUDE.md) or higher effort instead of `claude-sonnet-5-5` medium (evidence in Keep routing; conflicting); paid check, ask first. Repo: partial (`git show 088a227c:plugins/claudetto/agents/Athena.md` holds `model: claude-sonnet-5-5`, `effort: medium`).
  Acceptance: Athena stays on `claude-sonnet-5-5` medium. Verification: inspection.
  Basis: inferred. Status: have at 088a227c (`git show 088a227c:plugins/claudetto/agents/Athena.md` holds `model: claude-sonnet-5-5`, `effort: medium`).
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: unresolved: the item cites project CLAUDE.md and "evidence in Keep routing" from another slice; no source line found in this pass.

- [ ] **OUT-173** claudetto shall not carry the bench holdout run (`bun tools/bench/run.ts <task> <arm> <out>`, `bun tools/bench/report.ts <out>`) Run each `~/.claudetto-holdout/*.json` task for stock and dev arms in background: `bun tools/bench/run.ts <task> <arm> <out>` then `bun tools/bench/report.ts <out>`; holdout path denied to the tuning session; the user chose a script that picks the held-out task blind. pass list (18 items): pass=true bench-seed-named, openspec-curate, bench-freeze, grader-known-bad, target-conduct, dossier-I01-I18, external-sources, mutation-scores, least-code, you-should-know, batch-edit; pass=false bench-holdout (log built 10/10, skipped 8), target-cache, target-no-compaction, target-rereads, target-cost, design-table, release, handoff. Mutation-test facts: Stryker 10.1.1 under a Bun `node` shim; shell-parser surviving mutants hid 7 behaviours found only by a 60,000-input differential fuzz. have: n/a (bench tooling). Also: not carry the bench discipline (`run.ts` refusing a dirty `plugins/` or `tools/bench/`, a `benchVersion` hash, `report.ts` dropping faulted runs, conduct rows checkedAfterChange, lastCheckPassed, questionsToUser, opensWithFact, unprovenPass, seedNamed, outsideFiles, seedActedOn, and a SWE-bench-style task schema of 9 merged bug-fix PRs).
  Acceptance: No bench or holdout run step exists in the target tree; no bench tool ships. Verification: inspection.
  Basis: cited. Also reported.
  Status: partial at 088a227c (`tools/bench/` exists, `git ls-tree --name-only 088a227c tools/bench`; the `protectedPaths` default `~/.claudetto-holdout` exists in `plugin.json:84`).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: openspec/changes/2-1-325-rearchitecture/items.json:37; openspec/specs/permission-policy/spec.md:191; openspec/changes/2-1-325-rearchitecture/items.json:85; openspec/changes/2-1-325-rearchitecture/design.md:251; user decision, 2026-11-16.

- [ ] **OUT-174** claudetto shall not carry a pre-registered eval protocol (arms A0 none, A1 core terms and scoped rules, A2 A1 plus Schedule A mechanisms; main agent Opus, Sonnet, Haiku in turn; harness pinned 2.1.312; at least 10 runs per cell with pass@1 and pass^k at 95% intervals).
  Acceptance: no benchmark or eval protocol ships. Verification: inspection.
  Basis: reported (never run). Status: have at 088a227c (absent).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:13; user decision, 2026-11-16.

- [ ] **OUT-175** claudetto shall not carry bench-chasing prompt rules: rules tuned to a benchmark (dev cost 2.3x stock: round 5 $9.10 against $3.98, mostly from the mutation rule making the agent run Stryker; hono $2.14 and 20.8 min against $0.74) are not product behaviour. Each part needs a measured reason; guards need a real-transcript failure. The plugin eval suite (`plugins/claudetto/evals`) was removed because the agent under test wrote and edited its graders after seeing runs.
  Acceptance: no rule cites a benchmark as its reason. Verification: inspection.
  Basis: measured. Status: partial at 088a227c (`conductOf` and bench code live in tools/bench/).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:252; user decision, 2026-11-16.
