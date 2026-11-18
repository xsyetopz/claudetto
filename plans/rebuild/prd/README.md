# claudetto Product Requirements

The product requirements for the claudetto rebuild, in the outline of ISO/IEC/IEEE 29148:2018 clause 9.6. This file holds clauses 9.6.2 to 9.6.9; the block files hold the requirements of clauses 9.6.10 to 9.6.12.

## Purpose

29148 clause 9.6.2.

claudetto is three Claude Code plugins, described at baseline `088a227c` as follows:

| Plugin | Purpose at `088a227c` | Source |
| --- | --- | --- |
| `claudetto` | Tunes Claude Code for coding at the lowest token cost, through its official extension points only: settings, hooks, agents, commands, and an output style. It patches nothing. | `plugins/claudetto/.claude-plugin/plugin.json:4` at `088a227c` |
| `claudetto-openspec` | The OpenSpec workflow in one deferred tool and seven skills. It uses the upstream layout, runs no `openspec` binary, makes no network calls, and archives no change with an unticked task. | `plugins/claudetto-openspec/.claude-plugin/plugin.json:4` at `088a227c` |
| `claudetto-you-should-know` | A note above the prompt of what a side check finds the user likely missed. Off by default; on, one small request per three changing calls. No telemetry. | `plugins/claudetto-you-should-know/.claude-plugin/plugin.json:4` at `088a227c` |

The rebuild targets Claude Code 2.1.327. Source: user decision, 2026-11-16 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:10743`); user decision, 2026-11-18, 2.1.327 replaces 2.1.326 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7`).

## Scope

29148 clause 9.6.3.

### In

The eleven blocks under [Product Functions](#product-functions).

### Out

Parts, behaviours, and files that go, with no competing option. Each item names its source.

#### General

- [ ] **OUT-001** claudetto shall not use a planner agent, a component swap behind a benchmark, an inventory of current files, the handing of the holdout to the user, or tests nobody asked for in the rebuild.
  Acceptance: the rebuild is made top down by direct edit, with no planner worker. Verification: inspection.
  Basis: reported, user, 2026-11-16 17:37 UTC, no swaps, no needless tests, no benchmarks, no planner worker (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3998); reported, user, 2026-11-16 17:41 UTC, product first, the rest later (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4166). Status: missing at 088a227c (`git ls-tree -r --name-only 088a227c -- plugins/claudetto/agents` lists only Artemis, Athena, Heracles and Metis; no planner agent).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057; conflicts with the strangler-fig line of the goal text at ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490.; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204 (restates "no planner, no component swaps"; strangler swaps component by component are out)

- [ ] **OUT-002** claudetto shall not hold a hyphenated file family (`foo.ts`, `foo-one.ts`, `foo-two-three.ts`); a family becomes a real directory.
  Acceptance: no source file in the tree shares a hyphen prefix with another; each family is a directory (`spec/audit.ts`, not `spec/spec-audit.ts`). Verification: inspection.
  Basis: reported, user, 2026-11-16 17:36 UTC, files-as-directories is unacceptable; no file families (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3949). Status: partial at 088a227c (91 hyphenated source files, for example `validate/validate-*.ts` and `register-*.test.ts`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057.

- [ ] **OUT-003** claudetto shall not register a batch edit tool: the `edit` block does batch edits through the `Bash(perl -0pi -e *)` allow rule and its hook, and a registered tool adds schema with no safety gain ([ADR-0097](../adr/0097-batched-edit-tool.md), comparison of 2026-11-17).
  Acceptance: the plugin registers no batch edit tool. Verification: inspection.
  Basis: measured, observed in transcript, 2026-11-16. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:2433 (probe over 82 runs: 0 runs of consecutive Edit-only responses to one file; at most 18 of 901 dev responses, 2.0%, could merge; 0 Edit errors in 188 calls; no MultiEdit among 95 tools).

- [ ] **OUT-004** Out: deciding without asking because "nobody answers overnight", and making deletes and product choices alone.
  Acceptance: the agent asks through `AskUserQuestion`. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c (`git grep -i -E 'overnight|nobody answers' 088a227c -- plugins` finds no match; `AskUserQuestion` appears only in `plugins/claudetto-you-should-know/hooks/register*.ts` and `decide.test.ts`).
  Source: user decision, 2026-11-16 15:27 UTC, the user is watching; questions go through AskUserQuestion (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:302). Conflicts with the decision never to act on a guess (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8799).

- [ ] **OUT-005** Out: handing off at 59 minutes of session age and a worker that adds age-based `$.session.compact()` calls.
  Acceptance: no age trigger exists. Verification: inspection.
  Basis: user decision. Status: have at 088a227c (to be removed; `plugins/claudetto/hooks/features/compaction/handoff.ts:68` `const HANDOFF_MS = 59 * 60_000` and `:82` `await $.session.compact()` inside `on("turn.complete", ...)`).
  Source: user decision, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369); superseded by the idle-or-size trigger (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).

- [ ] **OUT-006** The prose checks (tests or Stop checks that assert the wording of text) shall go.
  Acceptance: no check asserts prose. Verification: inspection.
  Basis: user decision, 2026-11-14 02:47 UTC, tests check no implementation prose (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31431). Status: missing at 088a227c (`git grep` for Stop and turn hooks in `plugins` finds only `turn.complete` in `handoff.ts`, the age compaction, and `classic.StopFailure` in `stop-notice.ts`; no wording check). The same user rule bans a regex Stop check; this item extends it.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints: delete the prose checks).

- [ ] **OUT-007** The sandbox friction items (a sandbox that blocks work and does not protect) shall be settled by a fix of the sandbox, or its removal, never kept as is. The standing rule in the same handoff keeps security settings and hooks on; the two conflict. Measured 2026-11-17 on 2.1.327 (cc-inspect `cli`, one Bash call `echo ZQXSB > out.txt && cat out.txt && curl ... example.com`): `sandbox.enabled:true` adds 11,651 bytes to every request (58,489 vs 46,838; tools +836, messages +10,815 for the sandbox notice; estimate about 2,900 tokens at 4 bytes per token). With `autoAllowBashIfSandboxed` unset the sandboxed command still prompted ("The following parts require approval"), the same as with the sandbox off; the 2.1.327 schema text gives its default as false (`chunk-ja5z738t.js@138689`). With `autoAllowBashIfSandboxed:true` it ran with no prompt, and the network call came back as a `<sandbox_violations>` deny, which invites an unsandboxed or allowed-domains retry. Auto mode with the sandbox off ran it after one classifier verdict. Permission rules and the auto classifier judge command text; the sandbox confines the writes and network egress of every process a command starts (code.claude.com `sandboxing`, "What the sandbox restricts"), so the two do not cover the same denials. Resolved: keep the built-in sandbox (the user ruled it pointless only if permissions plus auto mode cover the same denials, and they do not), set `autoAllowBashIfSandboxed:true` against the prompts, and list the hosts work needs in `network.allowedDomains` against the violation retries. The per-request cost stays a measured cost of keeping it.
  Acceptance: unresolved; the lead decides which line holds. Verification: inspection.
  Basis: reported, user, 2026-11-13 22:08 UTC, sandbox trimmed to unrecoverable destructive commands (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14708); reported, user, 2026-11-14 14:21 UTC, sandbox as minimal as possible (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36547). Status: have at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts:211-212` writes `sandbox: { enabled: true }`; the sandbox is on and kept, not removed).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints on the sandbox and standing line "keep sandbox and hooks on"); conflicts with the standing rule in ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790.
  Conflict: claudetto shall not ship its own sandbox wrapper.

- [ ] **OUT-008** The `open-items.ts` file shall go, because the user asked what it is and nobody asked for it.
  Acceptance: no `open-items.ts` in the tree. Verification: inspection.
  Basis: reported, user, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c (`git ls-tree -r --name-only 088a227c | grep -i open-items` lists nothing).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints).
  Conflict: claudetto shall not carry the removed Stop-hook machinery.

#### Removed Features and Files

- [ ] **OUT-009** claudetto shall do no work on its own `classify` module (task 3.1, keep or remove) until the user decides. The choice is left to the user at `design.md:111`. The user decisions of the item index are at source lines 2583-2587. Running paid total at that point: $11.91 ($9.11 plus $2.80). Row recheck by `xref.ts`, $0.
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3380.

- [ ] **OUT-010** The `openspec/` directory and the practice of curating a plan inside it.
  Acceptance: the rebuilt tree holds no `openspec/` directory and no goal file or handoff that sets orders. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`git ls-tree 088a227c` lists no `openspec` entry); have at 088a227c^ (`git ls-tree 088a227c^` lists `openspec`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4133; user decision, 2026-11-16.

- [ ] **OUT-011** claudetto shall not ship the subagent status line (`statusline/subagents.ts`, `--subagent`).
  Acceptance: the plugin ships no `subagentStatusLine` setting and no `--subagent` mode; Claude Code 2.1.323 gave the setting no effect, but 2.1.327 documents it as deprecated and still working (see Source). Verification: inspection.
  Basis: cited. Status: missing at 088a227c.
  Source: openspec/specs/status-line/spec.md:397; openspec/specs/status-line/spec.md:415; openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:20 (schema text "no longer has any effect", chunk-3dhh2g49.js:255110, a module that is gone from 2.1.327; corrected on 2.1.327: the `subagentStatusLine` schema text reads "Deprecated: still works, and will stop working in a future release" (chunk-ja5z738t.js@257900) and the command still runs (chunk-cfxefa64.js@912562, `Ove`/`Nve` read the setting and run it with a 5000 ms timeout), while a plugin's `subagentStatusLine` raises the warning "subagentStatusLine is deprecated in favor of mods and will stop working in a future release" (chunk-dfwkett1.js@8085); "no longer has any effect" on 2.1.327 appears only on `taskOutputMaxChars` and `keybindingFlavor`); openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:95. The spec's row layout (first 20 tasks, `⏵` name, model without `claude-`, effort, `◫ tokens/window pct%`, `◔ elapsed` or `✓ done`/`✗ failed`) is kept here only as a record of what goes.

- [ ] **OUT-012** claudetto-openspec shall not carry `retire_capabilities`, `--skip-specs`, `--no-validate`, `-y`, custom schemas, the status and instructions JSON shapes, `config.yaml` keys, CLI flags, or `/opsx` files. The lean tool covers only the workflows in use; recorded as a drop pending tasks 4.2 and 4.3.
  Basis: read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:440.

- [ ] **OUT-013** claudetto shall not carry domain-specific iOS accessibility-tree checks (about 2.2 s against about 22 s per check; a vendor tool, 0.15 GB against 11.2 GB for 5 agents).
  Acceptance: no iOS check ships. Verification: inspection.
  Basis: reported (vendor claim). Status: have at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xcso5g-stop-letting-claude-code-boot-20261023T040754Z.md:34 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xcso5g/stop_letting_claude_code_boot_the_ios_simulator>); external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:95.

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
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:147@088a227c9^ (window store and `model-row` removed); openspec/changes/archive/2026-11-09-release-2-1-319/feature-map.md:37@088a227c9^; openspec/changes/2-1-325-rearchitecture/design.md:13-14,37@088a227c9^ (`web_fetch` registered beside the built-in) and :165 (`ctx7` defect, the CLI behind the skill); no source located for the always-on MCP servers clause (Dropped 2026-11-18 for that clause).

- [ ] **OUT-018** claudetto shall not build any of the 23 harness anti-patterns W3-1 to W3-23: premature multi-agent, agent-as-business-process, invisible state, mega-prompt with unprioritised NEVER/ALWAYS, prompting as the only control ("NEVER delete data"), context stuffing, never compacting, edge-case laundry lists, tool soup, opaque tools, unbounded retries without idempotency, one-shotting, premature victory, free-form progress files, demo-grade in production, no evals/tracing/budgets/kill switch, self-grading, all-or-nothing autonomy, unversioned prompts or auto-upgraded alias, anthropomorphizing.
  Acceptance: no claudetto feature is a W3 item; the list serves as negative design input only. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: external/please-use-me-often/swe-worst-practices.md:115 (W3-1) to :145 (W3-23).

- [ ] **OUT-019** claudetto shall not gate on measured-target caps tuned to match stock or rival numbers (root prompt <=5,832 chars, output style <=1,373 chars, no source-line growth); the one cap kept is the 200-char description limit.
  Acceptance: no test or script fails on the 5,832-char, 1,373-char, or source-line caps; the 200-char description scan stays. Verification: inspection.
  Basis: inferred from the sources, which hold the caps as targets and not as requirements. Status: missing at 088a227c (`compose.test.ts:59-63` still asserts the 5,832-char cap).
  Source: the sources hold the caps as targets (openspec/changes/2-1-325-rearchitecture/design.md:11-13; openspec/changes/2-1-325-rearchitecture/tasks.md:26-28) and the removal is this plan's own decision, inferred from those sources. plugins/claudetto/hooks/features/prompt/compose.test.ts:60@088a227c.

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
  Basis: reported. Status: have at 088a227c (`settings.ts:197` writes it). `CLAUDE_CODE_THRIFTY_SONIC` is present on 2.1.327 (`chunk-2ew0jg68.js@19283`); verified on 2.1.327: `chunk-t907shf5.js@4355` returns the env value when it is set and otherwise falls back to the `tengu_thrifty_sonic` flag or cohort of the bash-first session assignment, so setup's `0` overrides the flag. The text of the hint was not read.
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
  Source: openspec/specs/repo-gate/spec.md:19@088a227c9^ (the shipped tree holds no `tools/generate/`); `schema: spec-driven` sits in openspec/changes/2-1-325-rearchitecture/.openspec.yaml:1@088a227c9^.

- [ ] **OUT-026** claudetto shall list the status line external defect report IDs D1-D4 and D7 as unknown, because the report lived outside the repo and is lost. Status line external defect report IDs D1-D4, D7 (report outside repo, lost): cannot port, list as unknown. Dark-theme colours on every theme (color.ts:11-13,49) already fixed by theme mapping.
  Acceptance: No requirement cites D1-D4 or D7. Dark-theme colours on every theme (`color.ts:11-13,49`) are fixed by the theme mapping. Verification: inspection.
  Basis: reported. Status: have at 088a227c (theme mapping in statusline/color.ts).
  Source: openspec/specs/status-line/spec.md:222; unresolved: the defect report is outside the repo and lost.

- [ ] **OUT-027** claudetto shall not use the held-out run of tasks 12.1 (54 mined cases labeled only by tool count) as a measure. Held-out run of tasks 12.1 (54 mined cases labeled only by tool count): invalid measure (26/29 replies about having no tools; judge flagged 5/28 ok replies). Withdrawn.
  Acceptance: The run is withdrawn: 26 of 29 replies were about having no tools; the judge flagged 5 of 28 ok replies. Verification: inspection.
  Basis: measured. Status: have at 088a227c (not in the tree).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/12-1-holdout/README.md:73@088a227c9^ (26/29 replies); openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:222@088a227c9^ (54 cases labeled only with a tool count).

- [ ] **OUT-028** claudetto shall not wrap Claude's commands in `taskpolicy -c background`. `taskpolicy -c background` for Claude's commands: starves (0 loops in two minutes); `utility` keeps about 20% of default throughput (5.3M against 26-27M).
  Acceptance: No `taskpolicy` call exists. Measured: background starves (0 loops in two minutes); `utility` keeps about 20% of default throughput (5.3M against 26-27M). Verification: inspection.
  Basis: measured. Status: have at 088a227c (`git grep -l taskpolicy 088a227c -- plugins tools` finds 0 files).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:405@088a227c9^ (task 18.44, CPU priority of Claude's commands); the figures (background 0, utility 5.3M, default 26-27M) are in the old plan line 8ef531151:plans/rebuild-curation.md:855.

- [ ] **OUT-029** claudetto shall not register `mcp__claudetto__ask-user-question` or `mcp__claudetto__monitor`. Wrapper tools `mcp__claudetto__ask-user-question` and `mcp__claudetto__monitor`: no effect added; plugin-tool popup answers invisible to the classifier; Monitor's promise "expires unless source ends first" false for `tail -F`.
  Acceptance: Neither tool exists. No effect added; plugin-tool popup answers are invisible to the classifier; Monitor's promise "expires unless source ends first" is false for `tail -F`. Verification: inspection.
  Basis: cited. Status: have at 088a227c (wrappers removed).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:392; external/2026-10-12_p2/export-Claude Code's subagent limits are per session, so I built a mod that counts across all of them.jsonl:5 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x3lx5o/claude_codes_subagent_limits_are_per_session_so_i>).

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

- [ ] **OUT-034** claudetto shall not repair the clipboard for the fullscreen TUI (anthropics/claude-code#81472, 42 reports; third-party kbrianps/claude-clean-copy); note only. Tested only on Ubuntu Wayland with Ghostty. Clipboard repair for the fullscreen TUI (anthropics/claude-code#81472, 42 reports; third-party kbrianps/claude-clean-copy): not a claudetto job, note only; tested only on Ubuntu Wayland with Ghostty.
  Acceptance: No clipboard code exists. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/2026-10-07/export-I made a plugin that fixes copy-paste from the Claude Code terminal (no more gutter bar and broken l.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wyfyz8/i_made_a_plugin_that_fixes_copypaste_from_the>).

- [ ] **OUT-035** claudetto shall drop these baseline parts: own secret regexes and env-file rules (`hooks/handoff/secrets.ts`, `gate/env.ts`, the `.env` rules of `gate/rules.ts`), own classifier plus hook feedback plus approval rules plus `classify-spend`, the whole 4,677-line gate (`ASK_PROTECTED` dropped; `DENY_ROOT` stays deny), the `window` row store, `model-row`, the `window-report` tool, the `asCompaction` wrapper, the cheap-summary path, per-tier one-row rules, the `bun src/tiers/setup.ts` CLI, setup running `openspec init`, the subagent-cap option and tier row, the "golf score" requirement, "Built-in Agents Are Denied", `ISSUES*.md` defect filing (owner: nobody told the plugin to file there), the `worktree.symlinkDirectories` write, `renice -n 10` stacking (use `renice 10 -p $$`), dead spec rows (session-handoff size-0 check, composer-origin `/clear`), 22 matched `tool.check` and `tool.call` registrations plus `ANY_TOOL`, the unused `Io` and `Session` forwarding interfaces, and `statusline/subagents.ts`.
  Acceptance: none of these paths exists in the target tree. Basis: cited. Status: have at 088a227c (the parts exist there and are to be removed).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:47; openspec/changes/archive/2026-11-09-release-2-1-319/proposal.md:3; openspec/changes/archive/2026-11-09-release-2-1-319/feature-map.md:43; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:146; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:384; openspec/changes/archive/2026-11-13-feat-2-1-321/proposal.md:9; openspec/changes/archive/2026-11-13-feat-2-1-321/proposal.md:26; openspec/specs/low-hitl/spec.md:169.

- [ ] **OUT-036** claudetto shall not ship auto memory without review, a post-hoc output-stripping mod, an unattended video-generation showcase (portable item: an explicit spend cap in the prompt), star-count authority, an anti Claude-speak joke thread, claude.ai chat-length and onboarding posts, or misc jokes.
  Acceptance: none present. Basis: reported. Status: n/a.
  Source: located for auto memory: external/2026-11-10/reddit.com-r-claudeai-comments-1xrpkdt-what-even-is-the-point-of-workin-20261110T094812Z.md:110; star-count authority: external/2026-11-18/reddit.com-r-claudecode-comments-1xym5ig-claude-is-too-hesitant-to-try-20261117T180819Z.md:161. Dropped (2026-11-18) for the other listed parts: no source located in external/, openspec/, reports/, git history or the user's transcripts.

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
  Source: external/2026-10-12_p2/export-Claude Code's subagent limits are per session, so I built a mod that counts across all of them.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x3lx5o/claude_codes_subagent_limits_are_per_session_so_i>).

- [ ] **OUT-041** claudetto shall not implement workarounds for web-fetch refusals (email drafts, a browser extension, delegating to Codex). a policy topic, off-topic for the plugin.
  Basis: reported, users.
  Source: external/2026-10-11/export-Why is it so fussed over web scraping now-.jsonl:29; external/2026-10-11/export-Why is it so fussed over web scraping now-.jsonl:58; external/2026-10-11/export-Why is it so fussed over web scraping now-.jsonl:73 (url: see export header line 1).

#### Removed Bash Gate and Permission Rules

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

- [ ] **OUT-049** claudetto shall not carry the recreate gate (`GATE_RECREATE`: an ask on a Write or Bash create of a path the session saw and that is now gone); D323 removed it and no setting takes over. Record each path a successful call read, listed, or wrote, and each path the session removed; a Write or Bash create (Write, cp/mv target, `touch`, last `ln` operand; `sed -i` cannot create) of a path seen and now gone, not removed by the session, gets `ask` (`GATE_RECREATE`). Paths keyed by landing place (`~` from HOME, symlinks resolved via `$.fs.stat`: /tmp -> /private/tmp; gone path uses its folder's real path); `ls`/Glob/Grep listing marks entries seen; removal counts only after the command ran and the path is gone (a failed `rm` does not); in-flight or failed reads do not count; first call replays the transcript's finished non-error tool uses so state survives `--resume`; a Bash operand the engine refuses to read as a path (grep pattern as network location) counts as not there. Not handled: removed symlink keyed under its target, `~user`. Consequence: recreating a file the user deleted undoes the deletion. `$.fs.stat` and `$.fs.exists` are present in the mod API on 2.1.327 (cc-inspect `surface` mod-api, `claude-code.d.ts-bd2096b0.txt.zst@173748` and `@170513`). missing (rg "GATE_RECREATE|vanish" finds only eval reports).
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

#### Stop Checks and Completion Gates

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

#### Model Routing and Subagent Models

- [ ] **OUT-057** claudetto shall not route Sonnet-implements and Opus-reviews for simple tasks (measured costlier than Opus alone) or tiered thinker, planner, and typist chains (contested).
  Acceptance: no default chain routes a simple task through a second model. Verification: inspection.
  Basis: measured (one measurement); reported (chains contested). Status: have at 088a227c.
  Source: external/2026-10-12/export-I tested Haiku 5.5, Sonnet 5.5 and Opus 5.5 as subagents on 6 real tasks.jsonl:25 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x1nsaz/i_tested_haiku_55_sonnet_55_and_opus_55_as>).

- [ ] **OUT-058** claudetto shall not route by price per token without measuring the tokenizer change, and shall not state fixed-weight cost headlines ("75% of spend is cache reads").
  Acceptance: no routing rule cites a price per token alone. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:53 (cache reads about 75% of weighted spend across 334 sessions); external/2026-11-06/reddit.com-r-claudecoding-comments-1xnb645-i-mapped-6-weeks-of-my-claud-20261105T173120Z.md:2.

- [ ] **OUT-059** claudetto shall not carry the "Sonnet beats Opus" Terminal-Bench headline (Sonnet at max against Opus at xhigh; at the same effort 61.5% against 66.4%).
  Acceptance: no text cites the headline. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:257; external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:72.

- [ ] **OUT-060** claudetto shall not let subagents share the main checkout for git operations, nor run `git stash` in one (see the shared-checkout rules in `prd/delegation.md`).
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/conduct.jsonl:43.

- [ ] **OUT-061** claudetto shall not set overnight or uncapped parallelism as a goal, nor agent swarms as a default: heavy users get there through parallel sessions across repos; swarms burn allowance with no gain over ticket-by-ticket; a Codex orchestrator spent 16 h and over 90% of the allowance on a 9,800-line deploy script; 82% of one user's usage came from subagent-heavy sessions. Unconstrained subagent spawning outside a defined pipeline and Ultracode-style unbounded fan-out go.
  Basis: reported. Status: not applicable.
  Source: external/2026-11-16/reddit.com-r-codex-comments-1xu7cg0-sol-61-high-overengineering-turned-20261113T192044Z.md:47 and :97 (16 h, over 90% of the allowance, 9,800-line script); external/2026-10-22/reddit.com-r-claudecode-comments-1wy8sbd-use-of-subagents-or-not-20261022T122101Z.md:35 (82% from subagent-heavy sessions). No source located for the swarm and ticket-by-ticket clause (Dropped 2026-11-18 for that clause).

- [ ] **OUT-062** claudetto shall not force every subagent onto one cheap model through the global env (it overrides deliberately bigger agents and degrades work), shall not give percentage splits ("10% Haiku, 50% Sonnet, 40% Opus"), and shall not use Haiku as a long-conversation worker (it crosses the 100k step; 3x faster and 11x less subscription usage held only on a 10,000-call single-turn job).
  Basis: reported. Status: not applicable (the setup env sets `CLAUDE_CODE_SUBAGENT_MODEL` without `_FORCE`; see the subagent-model-precedence ADR).
  Source: external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:41 (the 10/50/40 split, verdict rejected); external/2026-10-11/export-How are you guys getting such good usage-.jsonl:31 (the poster's split); external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:23 (a Haiku subagent run with 145 of 164 calls over 100k tokens). No source located for the 3x faster and 11x less usage figures (Dropped 2026-11-18 for that clause).

- [ ] **OUT-063** claudetto shall not build an orchestrator-Opus that delegates everything: on short tasks Opus plus Haiku cost about 10% less than Opus alone, because Opus was most of the bill (one poster, 128 runs, 16 tasks).
  Basis: measured (one poster). Status: not applicable.
  Source: external/2026-11-18/reddit.com-r-claudecode-comments-1xxyc5a-does-delegating-to-cheaper-mod-20261117T182807Z.md:107.

- [ ] **OUT-064** claudetto shall not use Haiku 5.5 as the main coding agent or Fable as orchestrator for everything.
  Acceptance: Haiku keeps to bounded, verifiable jobs; Fable spawned 5 agents for 1 agent's work (contested, others run it for months). Basis: reported. Status: n/a.
  Source: external/2026-10-11/export-Haiku 5.5 token usage.jsonl:9.

#### Compaction and Handover

- [ ] **OUT-065** claudetto shall not keep the stock `includeGitInstructions` text or the auto, idle, and precomputed compaction. At `088a227c` `settings.ts` sets `includeGitInstructions: false` and `precomputeCompactionEnabled: false`, and `includeBetterGitInstructions` appears nowhere (plugins/claudetto/hooks/features/setup/settings.ts:166-172@088a227c).
  Basis: reported, user feature list.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:752; user decision, 2026-11-04.

- [ ] **OUT-066** claudetto shall not build a session-handoff tool, and shall not end the main turn with $.turn.abort after a handoff file is written.
  Acceptance: no handoff tool and no turn.abort call exists in claudetto; handover is written by the compaction path and by manual /clear. Verification: inspection.
  Basis: cited. Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-handoff/spec.md:86 (the tool would end the turn with $.turn.abort, run clear and submit from a timer after idle, and show one line when the abort fails); user-approved deletion list in plans/rebuild-curation.md:1410, which drops the handoff tool.

- [ ] **OUT-067** claudetto shall not state "never compact" or "always compact" as dogma; no endless compaction as default, no `/compact` as main memory strategy, no handoff prompt or `/compact` asked of a 900k session (it pays the full cold read; use a notes file kept current), no month-long single session.
  Acceptance: the measurable rule lives in the ADR on compaction stance. Basis: reported, contested. Status: n/a.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:44 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsgul7/does_anyone_other_than_opus_and_fable_actually>) (900k session); external/export--clear vs -compact.jsonl:2.

- [ ] **OUT-068** claudetto shall not leave auto-compact at the default of about 967K for cost-sensitive users, and shall not claim that turning auto-compact off shrinks context (the 85k-to-38k saving was a reserved buffer shown as used; reported both ways, unresolved).
  Acceptance: window tuning or handoff at 150-250k with a toggle replaces it. Basis: reported. Status: n/a.
  Source: external/2026-10-12_p3/export-How's 1m context window now-.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x40hlw/hows_1m_context_window_now>).

- [ ] **OUT-069** claudetto shall not use `/export` pasted into a fresh session as a handoff, a hand-written handoff for "working style", or generic piling of more instructions on drift.
  Acceptance: pasted history refills the context; working style does not transfer by prose; change what rules are made of (provenance, enforcement) instead. Basis: reported. Status: n/a.
  Source: external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:61.

#### You Should Know

- [ ] **OUT-070** Triage through the `mcp__claudetto__decide` tool goes. claudetto shall not call `mcp__claudetto__decide` (`JEV_CALL`, `triageQuestion`, `JEV_NO`) before a check; the builtin has no triage step.
  Basis: cited.
  Source: plugins/claudetto-you-should-know/hooks/register.ts:106@088a227c; plugins/claudetto-you-should-know/hooks/texts.ts:77-85@088a227c; chunk-nvx1z6pc.js@82177, chunk-nvx1z6pc.js@85499 (claude 2.1.327 binary).

- [ ] **OUT-071** The check settings for model, effort, digest and token limits go. claudetto shall not offer `sideCheckModel` and `sideCheckEffortLevel`, build the 8-entry log digest, or set `maxTokens 512` and `timeoutMs 20000`; `model.fork` takes no model or effort option and shares the live conversation.
  Basis: cited.
  Source: plugins/claudetto-you-should-know/hooks/register.ts:99-121@088a227c; plugins/claudetto-you-should-know/hooks/note.ts:16-22@088a227c; plugins/claudetto-you-should-know/.claude-plugin/plugin.json:22-28@088a227c; chunk-nvx1z6pc.js@82177, chunk-nvx1z6pc.js@85499 (claude 2.1.327 binary).

- [ ] **OUT-072** The page-writing flow of You should know stays unbuilt. claudetto shall not build the `making` and `ready` rows, `learn_page`, the page-writing prompt `Tn(...)` and these strings. No button creates a `making` view in 2.1.326 (cc-inspect `code` search for `kind:"making"` finds no hit), so none of it is reachable. Strings kept for the record: `Making your page (a minute or two) · Claude keeps working…`; ready row `Learning page ready` with `1 Helpful`, `2 Not helpful`, `3 Didn’t read`; `SESSION_NOTE` = `"You should know" made this page from the conversation at the time; it is a one-off explainer, not maintained.`; `PAGE_FONTS` = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Atkinson+Hyperlegible:wght@400;700&display=swap">`; `pressConsentOf(topic)` = `The user pressed '2: Yes, make an artifact' on Claude Code's You-should-know offer: '${topic with ' -> "}'. In this feature, pressing 2 asks Claude Code to write a short learning page on that topic and publish it as a private artifact for the user.`; the page prompt starts with the side-request frame and `## Overview` (not transcribed).
  Basis: cited.
  Source: chunk-nvx1z6pc.js@32676, chunk-nvx1z6pc.js@33472, chunk-nvx1z6pc.js@34012, chunk-nvx1z6pc.js@86757, chunk-nvx1z6pc.js@7847, chunk-nvx1z6pc.js@8184, chunk-nvx1z6pc.js@20047, chunk-nvx1z6pc.js@22313 (claude 2.1.327 binary); the old plan notes the page flow was skimmed, not transcribed.

- [ ] **OUT-073** The `you_should_know_proposed` event goes, by [ADR-0115](../adr/0115-you-should-know-telemetry.md). claudetto shall not log `you_should_know_proposed` with `outcome` (`shown|none|parse_failed|deduped|stale|aborted|api_error|error`), `opener` (`you_should_know|heads_up|none`), `step`, `latency_ms`, `cache_read`, `cache_create`, `output_tokens`, `offers_shown`, and mark feature `you_should_know`: shown, none, deduped, stale `ok`; parse_failed `sad`; api_error, error `bad`; aborted no mark; none with null usage no mark.
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-nvx1z6pc.js@22430 (claude 2.1.327 binary); chunk-nvx1z6pc.js@20292 (claude 2.1.327 binary).

- [ ] **OUT-074** The `you_should_know_answered` event goes, by [ADR-0115](../adr/0115-you-should-know-telemetry.md). claudetto shall not log `you_should_know_answered` with `answer` one of the 29 `ANSWERS` (`helpful, yes_explain, yes_page, not_relevant, not_understood, hard_to_read, know_it, not_now, ignored_submit, ignored_timeout, got_it, chat, respond, auto_sent, simpler_words, less_detail, more_detail, not_helpful, dismiss, explained_helpful, explained_not_understood, page_helpful, page_not_helpful, page_unread, left_open, turn_off, off_failed, off_confirmed, off_abandoned`), `ms_to_answer` (omitted when no `shownAt`), `turn_in_progress`, `offers_shown`, optional `iteration`, `prompt_origin`, `prompts_survived`, `left_by` (`session_end|pushed_out`), `version_major/minor/patch/is_dev/built_at_s` (parsed from `session.version()` `{base,builtAt}` with `/^(\d+)\.(\d+)\.(\d+)(-dev)?$/`), `cleared_by` (`prompt|session_end`), `off_via` (`row|offer|typed`), `verb` (first word of the line when one of `understand,review,learn,see`, else `other`), `asks` (last word among `why,how,what`, else `none`), and `opener`.
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-nvx1z6pc.js@21545 (claude 2.1.327 binary).

- [ ] **OUT-075** The `you_should_know_explained` event goes, by [ADR-0115](../adr/0115-you-should-know-telemetry.md). claudetto shall not log `you_should_know_explained` with `outcome` (`shown|fork|empty`), `direction` (`first|simpler_words|less_detail|more_detail`), `latency_ms`, and usage props, and mark `learn_explain` ok only when shown. Enumerated values go as `{value, of:[allowed...]}`; errors in sending are swallowed. `learn_page` (`ready|reset|fork|empty|publish|blocked|timeout`) is unreachable residue.
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-nvx1z6pc.js@22091 (claude 2.1.327 binary).

#### Prompts, Skills and Rules

- [ ] **OUT-076** The current bloated suite of rules: redone, not kept.
  Acceptance: the rules reduce to what the surface choice in [REQ-KERNEL-006](kernel.md) needs. Verification: inspection.
  Basis: reported. Status: have at 088a227c (to be removed).
  Source: reported, user, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1757).

- [ ] **OUT-077** claudetto shall carry no verbatim user quotation in any plan file; the three fault names from the user dossier appear only as paraphrase: deferring work it is able to do, raising a limit without consent, and repeating a defect already fixed in 0.28.0.
  Acceptance: a search of the plan files finds none of the three source phrases in quotation marks. Verification: inspection.
  Basis: read. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:72; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:74; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:79; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:246-249. if the quotes were kept.

- [ ] **OUT-079** claudetto shall not ship a prompt-only mitigation for sycophancy and drift. One claim-check line in `<evidence>` moved 14/24 to 17/24, a fixed-total line 49/60 to 51/60, and a Haiku sycophancy classifier had recall 27/28 with live flip 60/64 against 59/64 at about 5.3 s per prompt: all within noise. Only the runtime hooks (claim check) ship.
  Basis: measured. Status: not applicable.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:221.

- [ ] **OUT-080** claudetto shall not use false-memory, fake IQ, or imaginary-money prompt tricks: they act as constraints but invite hallucinated history. Real context and a critic agent replace them.
  Basis: reported. Status: not applicable.
  Source: external/2026-10-21/reddit.com-r-claudeai-comments-1s5wp0g-ive-been-gaslighting-my-ai-model-20261020T044555Z.md:65 (imaginary money), :633 (false memory), :787 (IQ prompt).

- [ ] **OUT-081** claudetto shall not keep cautionary cases in the source: Replit July 2025 deleted a live DB despite a code freeze; reward-hacking benchmarks; DORA 2025; METR 19% slower; GitClear refactoring collapse.
  Basis: cited. Status: not applicable.
  Source: external/please-use-me-often/swe-best-practices.md:37 (DORA 2025), :38 (METR), :39 (GitClear), :42 (Replit); external/please-use-me-often/swe-worst-practices.md:40 (Replit), :42, :43, :44.

- [ ] **OUT-082** claudetto shall not ship setup text that tells the agent what "Operation not permitted" already says (extra tokens every session).
  Acceptance: no claudetto text explains a sandbox refusal beyond the engine's own message. Verification: inspection.
  Basis: inferred from the reported sandbox-refusal defects in the source proposal. Status: have at 088a227c (`git grep -i "operation not permitted" 088a227c -- plugins` finds only a test fixture in claudetto-you-should-know, no setup text).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/proposal.md:27 (reported defects: sandbox refusals of git and tool writes); openspec/specs/sandbox/spec.md:45 (the engine's "Operation not permitted" evidence). Not located: the removal of the explaining text itself.

- [ ] **OUT-083** claudetto shall not ship a plugin skill or prompt whose benefit lacks a placebo-controlled measurement. Discredited or unsupported: token-saving skills (caveman -65% claim) did not reduce cost; popular skills no better than a same-length placebo; skills "wildly inconsistent for frontier work"; "I deleted most of my harness, Opus 5.5 made them obsolete"; skills for what the model already knows (except own MCP/program); always-on minimal-code skills as a bill cut (10.3% bill cut and 15% less code, 80 paired tasks; use as audit only); caveman and ponytail terse skills (unproven; use built-in Concise; disputed); "Make no mistakes" and persona prompts; the Output Purity Principle prompt; workflow-DSL prompts in project instructions (use plain standing lines or the Learning style); Ultracode-style "ignore cost, split as much as possible" orchestration; tool-compression and cache-warning mods (+0.2-1.5%, unmeasurable); skills off did not shrink start (one user). Also: not ship terse-output or caveman skills as the token fix, nor thank-you-costs-tokens noise.
  Acceptance: each claudetto skill or prompt cites a placebo-controlled measurement or is dropped; context and tool-call optimisation come first (about 33% cut by words alone is the weak claim). Verification: inspection.
  Basis: reported (community tests; one user for the skills-off claim). Also reported, weak (terse-output skills).
  Status: have at 088a227c (nothing built).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:43 (six of nine popular skills no better than a same-length placebo; 450 runs) and :44; external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:15 and :28 (placebo baseline); external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:13 (caveman); external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:160 (Output Purity Principle) and :70 (Ultracode); external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:461 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to>) (Make no mistakes); openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:41 (ponytail, n=28). Not located: the -65% figure, the 10.3% bill-cut study, "wildly inconsistent for frontier work" (found only as a comment, external/export-I exhausted my claude max 20x weekly limit. How many of you have a backup Claude subscription-.jsonl:17), and the tool-compression +0.2-1.5% figure; unresolved: no matching line found in external/; kept because the user curated it.

- [ ] **OUT-084** claudetto shall not adopt Semantic Anchoring, Entropy Reduction, or Attention-Based Validation as prompt techniques. The post that names them gives no measurement, and no competing option is on the table.
  Basis: reported (the post; its author gives no measurement).
  Source: external/2026-10-12/A_Lintable_Language_Is_All_You_Need.md:188-192.

- [ ] **OUT-085** claudetto shall not ship these: prose-only rules for anything mechanically checkable (repeatedly failed in session logs); free-form compaction summaries (masking matches them at half cost, cited); compaction-off with a 300k window and no handoff trigger (10/43 sessions died).
  Acceptance: no shipped rule is prose-only where a hook can check it. Basis: cited. Status: n/a.
  Source: half-cost masking: The Complexity Trap, arXiv 2508.21433 (2025), as cited in external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:176; unresolved: the 10/43 count was not located in external/ or openspec/; kept because the user curated it.

- [ ] **OUT-086** claudetto shall not ship a cargo-cult 800-line AGENTS.md, an unpruned mega rules file, the AI anti-patterns (felt productivity, vague delegation, one endless session, auth/billing/deletion without gates, vibe-coding to production, accepting "done" without evidence, agent editing its own tests, installing any package the AI names (slopsquatting), skimmed giant diffs, trusting AI for current API facts, skill atrophy), or the security anti-patterns (trifecta in one context, guardrail classifier as the fix, prod write access, unsandboxed auto-approve shell, executing model output, unvetted MCP/plugins, no audit trail) as text; each maps to an enforced rule.
  Acceptance: each anti-pattern has an enforced rule or is listed as unenforced. Basis: reported. Status: n/a.
  Source: external/please-use-me-often/swe-worst-practices.md:185 (the dossier holds the anti-pattern lists; per-anti-pattern lines not matched one by one).

- [ ] **OUT-087** claudetto shall not replace the system prompt wholesale (`--system-prompt` with a community-extracted prompt).
  Acceptance: no setup writes `--system-prompt`; `--system-prompt` (replace) and `--append-system-prompt` (add) remain separate flags. Risks: lost subagent exploration and tool guidance; the copy goes stale with daily releases; project rule: never patch the binary. Basis: reported. Status: n/a.
  Source: external/export-Don't use Claude Code's Default System Prompt.jsonl:2, :12, :15 (a poster replaces the default prompt with `--system-prompt` through a wrapper script).

- [ ] **OUT-088** claudetto shall not rewrite CLAUDE.md on each model version, keep old code versions in CLAUDE.md, load a whole memory file every message, generate a repo description from `/init`, or ship a giant instruction file and thousands of lines of skills.
  Acceptance: keep only repo-specific burn-list rules (package manager, never start the server, ask before migrations, no surprise subagents); the rest goes to hooks and on-demand skills. Basis: reported. Status: n/a.
  Source: external/2026-10-12_p3/export-Are generated CLAUDE.md files good or bad practice-.jsonl:18 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x3zhlj/are_generated_claudemd_files_good_or_bad_practice>).

- [ ] **OUT-089** claudetto shall not use a case list of ignored instructions as the cure for repeated agent faults. the list did not stop the repeat. The agent wrote "decision of the user" into code for its own choice before the user had decided, though the repo's `ignored-instructions.md` already listed that as case A1.
  Basis: measured, one session log. The source holds case A1; the plan's count of 27 cases is not in the source.
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:102 (session log 2a80f39f).

- [ ] **OUT-090** claudetto shall not turn the 22 classic anti-patterns W1-1 to W1-22 (mega-PRs, manual deploys, vanity metrics, flaky tests, suppressed types or lint, god files, secrets in the repo, hero culture) into hooks. general engineering practice, mapped to best practices B1; not hook material.
  Basis: cited.
  Source: external/please-use-me-often/swe-worst-practices.md:52; external/please-use-me-often/swe-worst-practices.md:79.

#### Env Settings and Cost Knobs

- [ ] **OUT-091** claudetto shall vary no setting by subscription plan except the concurrent subagent cap (REQ-SETUP-027, REQ-DELEGATION-012). A wider tier table of cost settings has no source, while the subagent cap has one: each subagent spends from a 5-hour window, which Ultra and an API key do not have.
  Acceptance: the only `oauthAccount` read under plugins/ feeds `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`. Verification: inspection (`git grep oauthAccount -- plugins`).
  Basis: cited (the requirement at openspec/specs/tier-profiles/spec.md:187@088a227c^ specifies the cap and nothing else by plan); checked at 088a227c: `git grep oauthAccount` finds one read, `capGroup` in changes.ts:91-111, which writes only the cap. Status: have at 088a227c.
  Source: openspec/specs/tier-profiles/spec.md:187@088a227c^; plugins/claudetto/hooks/features/setup/changes.ts:85-111@088a227c.

- [ ] **OUT-092** claudetto shall not make a Haiku call per setup question: it is a paid call on every question, and one batched call serves all of them ([ADR-0048](../adr/0048-single-model-call-for-setup-questions.md)).
  Acceptance: a setup run makes at most one model call, however many questions it asks. Verification: test.
  Basis: inferred from ADR-0048 (user report that setup ran slowly) and the post's per-question call. Status: have at 088a227c (`plugins/claudetto/hooks/features/setup/engine.ts:96-112`: `advise` makes one `claude-haiku-5-5` call for every question, `maxTokens` 120 per question).
  Source: external/2026-10-11/export-I made a claude code mod that uses Haiku 5.5 (or Jev) to pick the best model and effort for your tas.jsonl:1 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x1nnkn/i_made_a_claude_code_mod_that_uses_haiku_55_or>).

- [ ] **OUT-093** claudetto shall not write no-op or conflicting env leads: `DISABLE_NON_ESSENTIAL_MODEL_CALLS`, `MAX_THINKING_TOKENS` and `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` on Opus 5.5, `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` (loses /rewind), `DISABLE_ATTACHMENTS`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` (stops flag evaluation and `rate_limits.spend_limit`, which the status line uses), `ENABLE_PROMPT_CACHING_1H` (a duplicate of `promptCacheTtl`), `CLAUDE_CODE_ATTRIBUTION_HEADER=0` (100 bytes), keep-warm pings, `DISABLE_AUTO_COMPACT` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (a fork handoff needs auto-compaction), `/less-permission-prompts`, `WebFetch(domain:*)`, a 161-agent catalog, rules `paths:` frontmatter, and the events PostToolBatch, PermissionDenied, PreModelSwitch, UserPromptExpansion, MessageDisplay. Also: not write `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`. it stops updates and makes `$.http.fetch` refuse a call with `auth`. 2.1.327: `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is present at `chunk-6aew3gyn.js@14484` (cc-inspect `code` search).
  Acceptance: a fake-API probe shows the request unchanged (12 tools, 6,174 bytes); no listed key is written. Verification: probe.
  Basis: measured (fake-API probe). Also read: on claude 2.1.327 `MAX_THINKING_TOKENS` above 0 gives `{type:"enabled",budgetTokens}` and 0 turns thinking off (chunk-61wd57dm.js@165908); a model whose thinking mode is adaptive (Opus 5.5) sends `{type:"adaptive"}` and ignores the budget (chunk-m14bt1pz.js@3279633). The variable is therefore a no-op for the budget on Opus 5.5, model-dependent elsewhere, and not a per-job budget as one commenter says (external/export-It's time to cancel your subscriptions - Anthropic is silently nerfing Claude's reasoning budget whi.jsonl:295).
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
  Source: the dossier verdict is "adopted" and setup writes 1h (external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:12 and :69; plugins/claudetto/hooks/features/setup/settings.ts:117-118@088a227c), which contradicts a "goes" reading; the conflict sits with plan:804 (Cache discipline).

#### Third-Party Tools and Noise

- [ ] **OUT-098** claudetto shall not ship a Supabase row-level-security or database-privilege checklist.
  Acceptance: No block holds a REVOKE EXECUTE, has_function_privilege, or SET ROLE test. Verification: inspection.
  Basis: reported (one poster, no comments captured): RLS on tables, REVOKE EXECUTE from PUBLIC with has_function_privilege checks, a SET ROLE authenticated test of about 77 checks. Status: missing at 088a227c (git grep for REVOKE, RLS, Supabase found none); the poster's practice is a product-specific database recipe, not a claudetto behaviour.
  Source: external/2026-11-14/reddit.com-r-claudecoding-comments-1xq6xjr-after-200-hours-of-vibecodin-20261113T192916Z.md:139-149 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xq6xjr/after_200_hours_of_vibecoding_this_is_how_to_not>).

- [ ] **OUT-099** claudetto shall not carry a workaround for the Claude Desktop Linux freeze.
  Acceptance: No block names Claude Desktop. Verification: inspection.
  Basis: reported (poster): two months and a 1.5 TiB core dump to trace; the app never reads a 27-byte telemetry reply. Status: missing at 088a227c (git grep for 27-byte and core dump found none); it is a Claude Desktop fault outside the Claude Code plugin.
  Source: external/2026-11-14/reddit.com-r-claudeai-comments-1xv8fns-a-27byte-telemetry-response-nobo-20261113T181154Z.md:29 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xv8fns/a_27byte_telemetry_response_nobody_reads_freezes>).

- [ ] **OUT-100** claudetto shall not offer token-compression proxies (rtk, lean-ctx, Headroom, Lynkr, DeepSeek routing) as the first answer: they help read and edit loops, little for sysadmin loops; a base URL disables `/remote-control`; promo comments are affiliated. Filtering at source is preferred. Also: not adopt third-party compaction, memory, and token tools (supercompact, Squeez, ClawMetry, md2, tokendoctor, shared-memory services, a cache-audit skill, plugin promos). Also: not ship context-management plugins that prune tool output or messages, nor compression or economizer plugins.
  Acceptance: no setup text names a proxy; no dependency on them; cache-audit reduces to "optimise startup context"; none installed by setup. Net loss on a prefix cache; preserve-thinking invalidates thinking blocks, giving amnesia about reasoning. Verification: inspection.
  Basis: reported. Also inferred (single-poster promos with no measurements).
  Status: have at 088a227c (nothing built).
  Source: external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:14; external/export--clear vs -compact.jsonl:59 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wl4c13/clear_vs_compact>); external/2026-10-03/export-I fixed save-token-jev for Claude Code 2.1.283 — 70% context reduction in ~1.1s on a real coding ses.jsonl:22; unresolved: no matching line found in external/; kept because the user curated it.

- [ ] **OUT-101** claudetto shall not use Jev as a browser-step driver (jev-reach sends page text to a third party; vendor promotion).
  Acceptance: no code path sends page text to Jev. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/export-I gave chrome-devtools-mcp one more tool so my agent stops spending a turn on every click.jsonl:2 (the post states that page text goes to TypeSafe each step and that the plugin needs a TypeSafe API key).

- [ ] **OUT-102** claudetto shall not carry quota gaming (backup Max plans, account switching), a facade-MCP refusal bypass, a chrome auto-click Continue (claude.ai web, not the CLI; it re-sends context and burns the 5h limit 2-3x), sentiment, nerf, honeymoon, showcase, pricing-complaint, referral, competitor, and plan-size-guess threads, a local classifier swap, a vector-DB "swarm" of sessions (unproven), or DensePack and Lynkr plugs.
  Acceptance: none of these appears in the plugin. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: located for the chrome auto-click Continue: external/export-Claude reached its tool-use limit- frustrated me a lot so I made a tool to use which I hope will he.jsonl:2 and external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:23 (verdict rejected, web chat limit); Lynkr plug: external/export--clear vs -compact.jsonl:59 and external/export-Conserving token usage- what are you using today-.jsonl:18. Dropped (2026-11-18) for the other listed threads: no source located in external/, openspec/, reports/, git history or the user's transcripts.

- [ ] **OUT-104** claudetto shall keep from hype, nerf, refund, EU-law, KV-quantisation and seasonality posts only the regression-suite idea, and from Sonnet 5.5 chart arguments only "measure your own task". Hype/nerf/refund/EU-law/KV-quantisation/seasonality posts (keep only the regression-suite idea); skill sprawl and umbrella-skill SDLC pipeline (shows where prompt-only workflow enforcement fails; commenter alternative: scripted runner with validated pinned prompts, allowed tools only, sandbox); compact-on-Sonnet-then-switch-back saving tip (contradicts cache-prefix rule; unverified, inferred); model-routing gate "studying intelligence in nature" (promo); Sonnet 5.5 chart arguments (Terminal Bench 70.6 vs 66.4, AA price per task; keep only "measure your own task"); bug-hunt placements confounded by guardrails and run length; pronoun memory edit; debate threads (Opus "never made a mistake" with confirmation-bias doubt, Fable 5.1 use, language token efficiency, effort preferences, burning a week in a day); DensePack (image-packed text, half token cost claim, Haiku hallucinates image text; promotional, unverified); reverse-engineering refusal complaints (usable: Opus-written plan executed by a small-context model); claimed internal design-system prompt (unverified leak, not for repo); skill packs growing rules without tests (keep few rules, delete those that stopped mattering). All reported/inferred.
  Acceptance: No plan item rests on these threads beyond the two kept ideas. Verification: inspection.
  Basis: reported. Status: have at 088a227c (nothing built from them).
  Source: external/2026-09-30/export-Claude Opus 5.5 has new instructions about gender neutrality, out of the blue it changed its memory.jsonl:14 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wtj6cw/claude_opus_55_has_new_instructions_about_gender>); external/2026-10-01/export-Here we go again.. Is Superpowers - harnesses redundant with Opus 5.5-.jsonl:5 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wubglb/here_we_go_again_is_superpowers_harnesses>).

- [ ] **OUT-105** claudetto shall not ship a third-party plugin-audit hook such as the "harness-tips" repo with an auto-updating audit command. third-party; only the idea to collect repeated steps such as starting a dev server into a session-start hook is valid, and it is user workflow.
  Basis: reported, one user.
  Source: external/export-USE HOOKS (and keep your settings up to date).jsonl:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wpq6g0/use_hooks_and_keep_your_settings_up_to_date>); external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:58.

- [ ] **OUT-106** claudetto shall not turn the Reddit diff of the Usage Policy against the Sep 15, 2025 version into plugin behaviour. not plugin material (deceptive campaigns, high-risk physical actions need a human who can stop equipment, no sustained abuse toward models, enforcement adds "warn" and "limit"). The post was cited via a commenter and not fetched.
  Basis: reported, one user.
  Source: external/2026-10-17/export-Usage Policy Update.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x5p4jy/usage_policy_update>).

- [ ] **OUT-107** claudetto shall not carry other-family review (GPT, Codex, Gemini; n=13, 2, 1) or a Codex bridge or offload (n=3, 2, 1): out of scope as non-Claude.
  Acceptance: no feature calls a non-Claude model. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:12; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:18.

#### OpenSpec

- [x] **OUT-179** Out (REQ-OPENSPEC-001, ADR-0189): the user chose not to build the openspec block over vanilla 2.1.327. claudetto-openspec shall match openspec@latest in core profile only, lighter than openspec, with Claude 5.5 optimised prompts, selective XML tags where they fit, and fixes for what SDD and TDD complaints in external/ show it does wrong.
  Acceptance: behaviour matches openspec@latest core profile; each complaint has a fix or a recorded reason. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459).

- [x] **OUT-180** Out (REQ-OPENSPEC-002, ADR-0189): the user chose not to build the openspec block over vanilla 2.1.327. claudetto-openspec shall initialise OpenSpec on a new project with core parity to upstream OpenSpec, in a lighter form.
  Acceptance: a new project gets the OpenSpec layout that upstream's init writes, with fewer files and less text. Verification: demonstration.
  Basis: reported. Status: have at 088a227c (plugins/claudetto-openspec/hooks/layout.ts:14 `init` writes the layout; openspec.test.ts:185 "Empty Project: init writes the layout, and validate then passes", :198 "Existing Layout: init changes no file"; parity with upstream's init file set is not compared)
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09).

- [x] **OUT-181** Out (REQ-OPENSPEC-003, ADR-0189): the user chose not to build the openspec block over vanilla 2.1.327. claudetto-openspec shall carry fixes for upstream OpenSpec issues and PRs.
  Acceptance: each upstream issue or PR the plan names has a fix or a recorded reason. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto-openspec/hooks/openspec.test.ts:133,144 keep upstream verdicts on MODIFIED; no list of upstream issues or PRs in plugins; the list was not read)
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09).

#### Guards

- [x] **OUT-182** claudetto shall not run a dependency gate on pip, npm and cargo add.
  Reason: ADR-0125: no mod judges a Bash command; also costs root-prompt bytes with no measured gap (ADR-0177).
  Basis: triage of REQ-GUARDS-006, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-006; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:50,55; openspec/changes/2-1-325-rearchitecture/design.md:11 (the 5,832-char target; the registry check itself: unresolved, no matching line found).

- [x] **OUT-183** claudetto shall not wrap pasted or fetched text in random-ID tags.
  Reason: ADR-0112: the web read returns a path and a 2 KB outline, not page text; no measured gap against vanilla (ADR-0177).
  Basis: triage of REQ-GUARDS-008, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-008; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:116.

- [x] **OUT-184** claudetto shall not run a regex narration guard on Write and Edit lines.
  Reason: ADR-0177: no measured gap; the project CLAUDE.md prose rule stands; a pattern check over written text is a regex judge.
  Basis: triage of REQ-GUARDS-009, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-009; external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:32 (SA-2.5); external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:49; claude 2.1.327: `PreToolUse` and `FileChanged` present (chunk-ecn8g7cy.js@2559; chunk-ja5z738t.js@5909). The durable-state-at-75%-of-window clause an

- [x] **OUT-185** claudetto shall not deny whole-file Reads by size, lock-file or heavy-folder name.
  Reason: OUT-021 and OUT-178: the read guard is dropped; the built-in Read pages itself.
  Basis: triage of REQ-GUARDS-010, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-010; openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:387; openspec/specs/surface-trim/spec.md:194.

- [x] **OUT-186** claudetto shall not withhold repeated read-only tool results in a repeat guard.
  Reason: ADR-0154 (repeat refusal removed) and ADR-0177: the guard withheld different commands with equal output; no measured gap.
  Basis: triage of REQ-GUARDS-011, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-011; openspec/changes/2-1-325-rearchitecture/design.md:79; plugins/claudetto/hooks/features/repeat/repeat.ts:9@088a227c; plugins/claudetto/hooks/features/repeat/repeat.ts@088a227c; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:45; observed in transcript, 2026-11-16 (~/.claude/proje

- [x] **OUT-187** claudetto shall not exempt AskUserQuestion answers inside the repeat guard.
  Reason: the repeat guard is not shipped (see OUT-186), so the exemption has no subject.
  Basis: triage of REQ-GUARDS-012, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-012; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).

- [x] **OUT-188** claudetto shall not keep a per-file notes file to cut re-reads.
  Reason: OUT-178 and ADR-0177: re-reads were 4.2% of reads; one commenter, no measurement.
  Basis: triage of REQ-GUARDS-013, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-013; external/2026-10-28/reddit.com-r-claudeai-comments-1xgsku3-i-parsed-34-gb-of-my-claude-code-20261028T061008Z.md:55 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xgsku3/i_parsed_34_gb_of_my_claude_code_transcripts_20/>).

- [x] **OUT-189** claudetto shall not steer blind retries through a repeat guard and prompt rule.
  Reason: ADR-0154 and OUT-186: no repeat guard ships.
  Basis: triage of REQ-GUARDS-014, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-014; external/export-I ran Claude Code across all 89 tasks of Terminal-Bench 2.1 (267 container runs) to see if prompt sk.jsonl:1,2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wq4bvy/i_ran_claude_code_across_all_89_tasks_of/>); plugins/claudetto/hooks/features/repeat/repeat.ts@088a227c.

- [x] **OUT-190** claudetto shall not deny a piped verification command that hides a failing exit code.
  Reason: OUT-145: no pipe check; ADR-0125: no mod judges a Bash command.
  Basis: triage of REQ-GUARDS-015, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-015; external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:106; external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:118.

- [x] **OUT-191** claudetto shall not append a continue-the-task sentence to the walled-path denial.
  Reason: ADR-0125: setup writes Claude Code's own Read deny and sandbox denyRead; no mod denial text exists to extend.
  Basis: triage of REQ-GUARDS-016, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-016; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:144.

- [x] **OUT-192** claudetto shall not give each parallel session a claim file.
  Reason: OUT-152 (claim an open worktree) and ADR-0177: one commenter, no measurement.
  Basis: triage of REQ-GUARDS-018, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-018; external/2026-11-16/reddit.com-r-claudecode-comments-1xx0wfy-five-ways-ten-parallel-claude-20261116T051245Z.md:35 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xx0wfy/five_ways_ten_parallel_claude_code_sessions_broke/>).

- [x] **OUT-193** claudetto shall not cap CMAKE_BUILD_PARALLEL_LEVEL by session count.
  Reason: ADR-0125 (a mod rewriting Bash env) and ADR-0177: one commenter, no measurement.
  Basis: triage of REQ-GUARDS-019, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-019; external/2026-11-16/reddit.com-r-claudecode-comments-1xx0wfy-five-ways-ten-parallel-claude-20261116T051245Z.md:55 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xx0wfy/five_ways_ten_parallel_claude_code_sessions_broke/>).

- [x] **OUT-194** claudetto shall not record a content hash of each agent write.
  Reason: ADR-0177: no measured gap; the slice-commit clause is already dropped (ADR-0186).
  Basis: triage of REQ-GUARDS-021, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-021; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:293@088a227c9^ (content-hash prompt note). Dropped (2026-11-18): the slice-commit clause, because openspec/changes/archive/2026-11-16-2-1-323/design.md:121@088a227c9^ removes slice commits.

- [x] **OUT-195** claudetto shall not recount the gate ask list from a gate ask log.
  Reason: OUT-035 and OUT-021: the whole gate and gate-asks are dropped; the item applied only if a gate stays.
  Basis: triage of REQ-GUARDS-026, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-026; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:377; openspec/changes/archive/2026-11-09-release-2-1-319/feature-map.md:43.

- [x] **OUT-196** claudetto shall not keep one worktree per agent with a write-collision kernel and BDD tests.
  Reason: OUT-152, ADR-0177 and the no-needless-tests rule: a collision kernel and per-agent BDD tests are unmeasured.
  Basis: triage of REQ-GUARDS-028, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-028; external/2026-10-11/export-Why is it so fussed over web scraping now-.jsonl:44 (mailbox) (url: <https://www.reddit.com/r/ClaudeCode/comments/1x2h4zj/why_is_it_so_fussed_over_web_scraping_now/>); external/2026-10-21/reddit.com-r-claudecode-comments-1xatfdg-running-multiple-claude-agents-20261020T2239

- [x] **OUT-197** claudetto shall not pause builds in agent copies under 40 GB free.
  Reason: ADR-0125 (judging a build command) and ADR-0185: the collector frees disk at under 15% free instead.
  Basis: triage of REQ-GUARDS-029, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-029; external/2026-11-06/reddit.com-r-claudeai-comments-1xnnvx8-each-of-my-agent-threads-gets-it-20261104T184152Z.md:33 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xnnvx8/each_of_my_agent_threads_gets_its_own_13_gb_copy/>); external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:126.

- [x] **OUT-198** claudetto shall not deny actions on processes, worktrees and folders the session does not own.
  Reason: OUT-021 (kill.ts and the worktree ownership check) and ADR-0125.
  Basis: triage of REQ-GUARDS-030, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-030; openspec/specs/run-limits/spec.md:334; openspec/specs/run-limits/spec.md:436; openspec/specs/session-hygiene/spec.md:289; openspec/specs/permission-policy/spec.md:264; openspec/specs/permission-policy/spec.md:481; openspec/specs/permission-policy/spec.md:483; openspec/specs/permission-policy/spec.md

- [x] **OUT-199** claudetto shall not hold the kill, lock and hand-back rules of process hygiene.
  Reason: OUT-021 (kill.ts) and ADR-0125; the pkill and killall deny stays in REQ-SETUP-031.
  Basis: triage of REQ-GUARDS-031, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-031; external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:97; external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:135; openspec/changes/2-1-325-rearchitecture/design.md:387; openspec/specs/dangerous-commands/spec.md:112; openspec/specs/dangerous-commands/

- [x] **OUT-200** claudetto shall not classify heavy shell commands at PreToolUse and wait for memory.
  Reason: ADR-0125: no mod judges a Bash command; the free-memory hold in REQ-GUARDS-020 stays.
  Basis: triage of REQ-GUARDS-032, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-032; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:50; plugins/claudetto/hooks/features/memory@088a227c. This item judges a Bash command in a mod; see [ADR-0125](../adr/0125-bash-gate-replaced-by-permission-rules.md) for the conflict.

- [x] **OUT-201** claudetto shall not handle repeated denials with a PermissionDenied hook and count.
  Reason: ADR-0154, OUT-021 (decider fallback) and ADR-0125: no denial counter or retry hook ships.
  Basis: triage of REQ-GUARDS-033, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-033; openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:379; openspec/changes/archive/2026-11-09-release-2-1-319/specs/permission-policy/spec.md:3; openspec/specs/permission-policy/spec.md:70; openspec/specs/permission-policy/spec.md:208; openspec/specs/permission-policy/spec.md:22; openspec/s

- [x] **OUT-202** claudetto shall not deny git moves onto protected paths from a PreToolUse hook.
  Reason: ADR-0125: no mod judges a Bash command; sandbox denyWrite from setup covers the paths.
  Basis: triage of REQ-GUARDS-036, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-036; openspec/specs/permission-policy/spec.md:166; openspec/specs/permission-policy/spec.md:168; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/permission-policy/spec.md:37; plugins/claudetto/hooks/features/protected/protected.ts:53@088a227c.

- [x] **OUT-203** claudetto shall not create the worktrees folder and remind on a new .git.
  Reason: ADR-0188 (minimal sandbox) and ADR-0125: no Bash hook; claudetto adds no text where the engine already shows the retry.
  Basis: triage of REQ-GUARDS-037, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-037; plugins/claudetto/hooks/features/setup/settings.ts:211@088a227c (no `.git` key written); claude 2.1.327: `sandbox.filesystem.*` present (chunk-ja5z738t.js@115660). Not located: the hook for `worktrees` folder creation.

- [x] **OUT-204** claudetto shall not ask on ref moves with the TOCTOU text.
  Reason: duplicate of REQ-SETUP-031, which writes the same permissions.ask rules (ADR-0098, ADR-0054).
  Basis: triage of REQ-GUARDS-038, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-038; openspec/specs/permission-policy/spec.md:93; openspec/specs/permission-policy/spec.md:311; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:357; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:121; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-

- [x] **OUT-205** claudetto shall not enforce a merge gate with deny rules on git push and git merge.
  Reason: ADR-0098: git moves get ask rules, not deny; conflicts with REQ-GUARDS-038 and REQ-GUARDS-040.
  Basis: triage of REQ-GUARDS-039, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-039; external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:49 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xigw3d/im_not_a_developer_and_i_run_several_claude_code/>).

- [x] **OUT-206** claudetto shall not ask before every deletion, push, dependency change and spend.
  Reason: ADR-0098 and ADR-0188: only unrecoverable destructive commands block and every other command passes.
  Basis: triage of REQ-GUARDS-040, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-040; user decision, 2026-11-14 14:17 UTC, deleting temp folders never needs approval (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36369); external/please-use-me-often/agent-terms/TERMS-OF-USE.md:66 (U3.1); external/please-use-me-often/agen

- [x] **OUT-207** claudetto shall not keep a block log, a weekly report and a Stop output-evidence hook.
  Reason: OUT-145 (no done-gate Stop hook) and ADR-0177.
  Basis: triage of REQ-GUARDS-043, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-043; external/judged/hook.jsonl:20; plugins/claudetto/hooks/features/line-file@088a227c. The Stop hook for output evidence stays non-regex and non-word-list, because the settled decision is no regex or word-list Stop check for openers (user decision, 2026-11-16).

- [x] **OUT-208** claudetto shall not defend scope with a sandbox, checkpoints and bypass-mode lockout.
  Reason: ADR-0188 (minimal sandbox) and ADR-0177: no component that beats vanilla is shown.
  Basis: triage of REQ-GUARDS-044, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-044; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:102; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:72; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:73; plugins/claudetto/hooks/features/setup/

- [x] **OUT-209** claudetto shall not run a Rule of Two capability-matrix review.
  Reason: ADR-0177: a design principle with no check against vanilla.
  Basis: triage of REQ-GUARDS-045, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-045; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:176; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:177; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:184.

- [x] **OUT-210** claudetto shall not layer permissions with credential brokers and a redaction hook.
  Reason: REQ-SETUP-031 and REQ-SETUP-064 hold the permission layers; the broker and PermissionDenied hook are unmeasured (ADR-0177).
  Basis: triage of REQ-GUARDS-046, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-046; external/2026-10-12_p2/export-What are some good solutions for protecting credentials from agents-.jsonl:13 and external/2026-10-12/export-Cheeky fucker.. Lifting our API keys out of env to run tests through other providers.jsonl:7 (`op run --`). The other layers have no located source. Note: opensp

- [x] **OUT-211** claudetto shall not consider a menu of hook ideas.
  Reason: ADR-0177: each idea needs a measured gap; the Stop-time test check is a regex Stop check (settled out).
  Basis: triage of REQ-GUARDS-047, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-047; external/2026-10-21/reddit.com-r-claudecode-comments-1x9s5mz-why-does-claude-use-python-com-20261020T100843Z.md:174 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x9s5mz/why_does_claude_use_python_commands_to_edit_code/>); external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-

- [x] **OUT-212** claudetto shall not write memory records by a rule set.
  Reason: ADR-0177: no measured gap; REQ-SETUP-065 covers the auto-memory choice.
  Basis: triage of REQ-GUARDS-049, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-049; external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:9; external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:58.

- [x] **OUT-213** claudetto shall not package the agent terms at 27 to 31k tokens.
  Reason: ADR-0177 and the root-prompt size target: no measured gain over vanilla.
  Basis: triage of REQ-GUARDS-050, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-050; external/please-use-me-often/agent-terms/README-AGENT-TERMS.md:40; external/please-use-me-often/agent-terms/TERMS-AND-CONDITIONS.md:80; external/please-use-me-often/agent-terms/TERMS-OF-USE.md:106.

- [x] **OUT-214** claudetto shall not judge each AskUserQuestion with a Decider call.
  Reason: OUT-165 and OUT-021 (Decider fallback); ADR-0127 keeps the built-in tool.
  Basis: triage of REQ-GUARDS-051, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-051; external/2026-10-21/reddit.com-r-claudecode-comments-1x8awmp-asking-to-select-option-withou-20261020T100311Z.md:71 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x8awmp/asking_to_select_option_without_explaining_options/>); plugins/claudetto/hooks/features/decide/decide.ts@088a227c; claude 2.1

- [x] **OUT-215** claudetto shall not echo the spec and list side effects before a change.
  Reason: ADR-0177: the item says unproven, no implementation shown.
  Basis: triage of REQ-GUARDS-053, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-053; external/export-Has anyone actually combined TDD + Specification-Driven Development (SDD) in a real project-.jsonl:25 (a comment on side effects of small changes).

- [x] **OUT-216** claudetto shall not cover PostToolUseFailure with a logging hook.
  Reason: ADR-0177: a logging hook with no measured gap.
  Basis: triage of REQ-GUARDS-055, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-055; external/2026-11-16/reddit.com-r-claudecode-comments-1xuk52d-if-you-log-claude-codes-hooks-20261116T052718Z.md:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xuk52d/if_you_log_claude_codes_hooks_add/>); external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:10.

- [x] **OUT-217** claudetto shall not keep a referee registry that asks on edits to bounds and rules.
  Reason: ADR-0098 (minimal friction) and ADR-0177: a mod ask on edits is unmeasured.
  Basis: triage of REQ-GUARDS-056, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-056; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:696; plugins/claudetto/.claude-plugin/plugin.json:89@088a227c.

- [x] **OUT-218** claudetto shall not deny edits to tests and CI and enable managed-only hooks.
  Reason: allowManagedHooksOnly would disable the plugin's own hooks; ADR-0177: no measured gap.
  Basis: triage of REQ-GUARDS-057, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-057; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:350; external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:118.

- [x] **OUT-219** claudetto shall not load an autonomy contract file at session start.
  Reason: vanilla CLAUDE.md already loads at start and survives /clear (ADR-0177).
  Basis: triage of REQ-GUARDS-059, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-059; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:61.

- [x] **OUT-220** claudetto shall not contain an unattended run with caps, containers and an oracle.
  Reason: ADR-0177: the caps are Claude Code flags (claude --help lists --max-budget-usd; --max-turns not listed), the rest is user workflow.
  Basis: triage of REQ-GUARDS-060, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-060; external/2026-11-10/reddit.com-r-claudeai-comments-1xrmui5-fabel-51-can-write-ai-model-weig-20261109T152425Z.md:29 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrmui5/fabel_51_can_write_ai_model_weights_directly/>).

- [x] **OUT-221** claudetto shall not deny a command whose program path is a released claude binary.
  Reason: ADR-0125: no mod judges a Bash command.
  Basis: triage of REQ-GUARDS-061, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-061; openspec/specs/permission-policy/spec.md:301; openspec/specs/permission-policy/spec.md:303.

- [x] **OUT-222** claudetto shall not keep a protected goal file.
  Reason: OUT-021 (protected hook feature) and ADR-0177: no measured gap.
  Basis: triage of REQ-GUARDS-062, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-062; external/2026-10-25/reddit.com-r-claudeai-comments-1xcnaru-we-measured-how-60-engineers-dir-20261024T061824Z.md:53,61 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcnaru/we_measured_how_60_engineers_direct_ai_coding/>); plugins/claudetto/hooks/features/protected/index.ts@088a227c.

- [x] **OUT-223** claudetto shall not scan third-party skills statically before install.
  Reason: OUT-105 and OUT-083: third-party audit and unmeasured benefit.
  Basis: triage of REQ-GUARDS-068, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-068; external/2026-10-07_p2/export-I ran a static security scan over five of Anthropic's official Claude Code skills and wrote up every.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x03gtx/i_ran_a_static_security_scan_over_five_of/>).

- [x] **OUT-224** claudetto shall not compare web_fetch with built-in WebFetch on equal prompts.
  Reason: no benchmarks rule; the route is fixed by ADR-0112.
  Basis: triage of REQ-GUARDS-069, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-069; user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459); openspec/change

- [x] **OUT-225** claudetto shall not test every classic command hook with fake stdin.
  Reason: no-needless-tests rule; most guard hooks are out, so a hook-wide test mandate has no subject.
  Basis: triage of REQ-GUARDS-075, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-075; external/2026-11-18/reddit.com-r-claudecode-comments-1xyk5mb-my-hook-blocked-claude-from-ed-20261117T224954Z.md:39-43,59 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xyk5mb/my_hook_blocked_claude_from_editing_migrations/>); reports/2026-11-18-research/dossier.md:80.

- [x] **OUT-226** claudetto shall not measure injection handling per model.
  Reason: no benchmarks rule; a per-model N=5 probe suite is a benchmark.
  Basis: triage of REQ-GUARDS-077, 2026-11-18. Status: have (the part is absent from plugins/claudetto at ca10a8755).
  Source: removed REQ-GUARDS-077; external/2026-11-18/reddit.com-r-claudecode-comments-1xxikj2-fable-52-is-lazy-and-makes-swe-20261117T183133Z.md:316 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xxikj2/fable_52_is_lazy_and_makes_sweeping_conclusions/>); reports/2026-11-18-research/dossier.md:148,150. Extends REQ-GUARDS-069.

- [x] **OUT-227** Out (REQ-GUARDS-022, ADR-0190): ADR-0185 names no process reaper; the collector handles files, worktrees, containers and versions. claudetto shall skip live sessions in the hygiene sweep, shall remove `fswatch-probe-*` older than 60 minutes (an unset probe limit is 60 minutes), shall reap Claude-spawned processes older than 6 hours and remove temp files older than 7 days that are not open, and shall keep four retention options in `plugin.json`.
  Acceptance: `hooks/hygiene.test.ts` and `tools/hygiene/sweep.test.ts`: a session folder named by a live session stays and an old one goes; an unset probe limit is 60 minutes; `hygieneEnabled` false starts no process; the retention options go to the process as flags, and 0 is passed as off. A process older than 6 hours is reaped and an unopened temp file older than 7 days is removed; a commenter also tries housekeeping rules (archive, hardlink, clean up after agents) in agents md. Verification: test.
  Basis: reported, one user (reaper); read (sweep spec). Status: partial at 088a227c (plugins/claudetto/.claude-plugin/plugin.json:60 holds a retention option; hooks/features/hygiene/hygiene.ts:10-13 carries a 6-hour process reaper and a 7-day sweep; git grep fswatch-probe: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:368; external/2026-10-31/reddit.com-r-claude-comments-1xdj7e0-if-youre-wondering-whats-happening-20261031T084047Z.md:184,192 (url: <https://www.reddit.com/r/claude/comments/1xdj7e0/if_youre_wondering_whats_happening_with_your_disk/>); plugins/claudetto/hooks/features/hygiene/hygiene.ts:10-13@088a227c.

- [x] **OUT-228** Out (REQ-GUARDS-003, ADR-0190): Betterleaks does not ship; the deny rules of REQ-GUARDS-001 carry the cure. claudetto shall use betterleaks (1.10.0, MIT, pinned in hooks) as the one secret matcher, with no other secret regex in code. It runs `betterleaks stdin -f json -r - --no-banner -l error --exit-code 0` through `$.process.run` and replaces each reported `Secret` with `[REDACTED]`; exit 1 is a failed scan, never findings. An inline config (`BETTERLEAKS_CONFIG_TOML`, wins only when the path vars are empty) extends the defaults with four rules (anthropic-any-key `sk-ant-[a-z0-9]+-`, aws-secret-access-key-assignment, url-userinfo-password, authorization-header), because the defaults miss OAuth `oat01`, bare AWS secrets, URL passwords and bearer tokens. It scans every tool result before the model sees it; an errored result with a secret reaches the model as a redacted deny. A missing or failing binary fails closed: deny with an error naming `brew install betterleaks` and `/claudetto:setup`; errors beneath the gate pass to the caller unchanged (`.catch` replays `next(e)`). Setup lists it as required, the notice shows at every start, and a decline is not recorded. Results under six chars skip the scan (36.97 to 7.23 ms per scan; 100 against 20 scans).
  Acceptance: a literal secret result reaches the model redacted as a deny; a missing betterleaks denies with the install command; a pinned-version spec test passes; `betterleaks config check` prints "OK: 37 rules"; `generic-api-key` across a line break gives one match; `betterleaks:allow` clears. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/kernel/secrets.ts, hooks/features/secrets/scan.ts, hooks/features/setup/tools.ts).
  Source: openspec/specs/secret-matcher/spec.md:14; openspec/specs/secret-matcher/spec.md:24; openspec/specs/secret-matcher/spec.md:33; openspec/changes/2-1-325-rearchitecture/design.md:148; plugins/claudetto/hooks/features/secrets/scan.ts@088a227c.

- [x] **OUT-229** Out (REQ-GUARDS-004, ADR-0190): Betterleaks does not ship, so no scanner output is probed. claudetto shall probe that a scanner prints no full key into Claude's tool output: run it on a test page with a fake key, check the session logs for the key, and mask the key before it prints if it shows up.
  Acceptance: The fake key is absent from the session logs. Verification: probe.
  Basis: reported (one commenter). Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xhmtya-i-used-claude-code-to-audit-21k-20261029T124002Z.md:79 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xhmtya/i_used_claude_code_to_audit_21k_product_hunt/>).

- [x] **OUT-230** Out (REQ-GUARDS-067, ADR-0190): only web_fetch returns a path and a 2 KB outline; other tools rely on the ADR-0179 spill. No tool that claudetto or its plugins register (the `claudetto` and `claudetto-openspec` MCP servers) shall return more than 2 KB of text in one result; a longer result goes to a file whose path the tool returns, as Claude Code does for a large Bash output.
  Acceptance: no registered tool result over 2 KB in a test run of each tool; each tool that can produce more returns a path. Verification: test.
  Basis: user decision, 2026-11-17 (the MCP overhead "must never happen" on claudetto or its MCP servers); 2.1.326 caps an MCP result at 25,000 tokens and saves no text to a file (code read). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:15487; chunk-vxavegfm.js@768 and chunk-bwkc74bx.js@7110 (2.1.327).

- [x] **OUT-700** Out (REQ-GUARDS-072, ADR-0190): claudetto shall block only unrecoverable destructive commands on macOS and Linux and let every other command pass.
  Reason: ADR-0190, agent decision: the classifier lists that ADR-0098 relied on (autoMode) do not ship; the deny rules, ask rules and sandbox that setup fills (hooks/guards/rules.ts) are the enforced layer, and a probe on 2.1.327 showed them enforced where vanilla ran the command. A second unrecoverable-only gate has no measured gain over them (ADR-0177).
  Basis: triage of REQ-GUARDS-072, 2026-11-19. Status: have in part (deny, ask and sandbox rules).
  Source: removed REQ-GUARDS-072; ADR-0098; ADR-0190.

#### Delegation

- [x] **OUT-231** Out (REQ-DELEGATION-001, ADR-0177, ADR-0169): the paid run showed delegation costing more than working alone, and ListAgents keeps its stock rows. claudetto shall tell the model in the Agent tool text to pass `name` to address a subagent by that name, and shall keep ListAgents with a trimmed text.
  Acceptance: the Mod Agent text holds "pass `name` to address it by that name" (+46 chars); the ListAgents text of 304 chars takes it from 1,151 to 674 bytes (-41%). Verification: inspection.
  Basis: measured, claude 2.1.318: the engine takes an undeclared Agent `name` (`registerName`) and stock models pass it unprompted; ListAgents cannot be rebuilt on `$.agent.list` because it omits local, cloud, and Remote Control sessions. Paid 5 runs $0.3810: stock $0.1031 (84,753 tokens) against mod2 $0.1244 (71,110 tokens), with more cache writes (19,892 against 12,069). Status: missing at 088a227c (`AGENT_TEXT` in plugins/claudetto/hooks/features/delegation/texts.ts holds no `name` line).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2818; plugins/claudetto/hooks/features/delegation/texts.ts:1@088a227c.

- [x] **OUT-232** Out (REQ-DELEGATION-003, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall order fan-out by longest branch first, or cap fan-out to the cache window, so idle subagents do not re-pay cache at a barrier.
  Acceptance: A fan-out run shows no subagent idle past the cache window waiting on a barrier. Verification: probe.
  Basis: reported (one commenter). Status: missing at 088a227c (the plan caps children per parent with no ordering and no cache-window basis).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx5405-broken-prompt-caches-cost-me-1-20261116T050923Z.md:84 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xx5405/broken_prompt_caches_cost_me_106_across_57_claude/>).

- [x] **OUT-233** Out (REQ-DELEGATION-004, OUT-152, OUT-001): a ticket-filing orchestrator and planner role are out of scope. claudetto shall keep a GitHub-issues backlog, bundle fixes into releases, and keep a control-room artifact with a sequencing dependency graph updated on each PR merge.
  Acceptance: The graph shows the next unblocked issue after each merge. Verification: demonstration.
  Basis: reported (one commenter). Status: missing at 088a227c (git grep for dependency graph found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwvu9e-the-harder-i-use-cc-the-larger-20261115T135618Z.md:52 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xwvu9e/the_harder_i_use_cc_the_larger_the_backlog_gets/>).

- [x] **OUT-234** Out (REQ-DELEGATION-005, ADR-0177, rule no Stop check): a Stop-hook receipt check is a Stop claim check and has no measured gain. claudetto shall use a subagent only where one owner, one context, and one acceptance test make one session, never when the brief needs half the repo pasted; shall put in every subagent brief a small contract (objective, allowed files, forbidden files, input artifacts, expected output, stop condition); and shall require a return receipt: contract received, files read, files changed or explicitly not changed, commands run or checks run, result (`done`, `blocked`, or `needs-human`), a one-paragraph evidence, and a max output size. A subagent decides nothing: on an open choice, a brief contradiction, or anything destructive it stops and returns a `DECISION NEEDED` block, and the lead continues the same agent.
  Acceptance: Each delegation brief names the six contract fields. A subagent reply without a compact receipt is rejected (no receipt means a hidden full conversation); git grep for "receipt" in plugins at 088a227c finds none. The reply format is part of the order (one-line verdict, `file:line | severity | claim`, at most three proposals, about 40 lines); finished agents are not resumed; repo knowledge lives in the agent definition; the Stop hook produces or requires the summary artefact (diff stat, handoff file: done, half done, next, awaiting user decision). A subagent on a destructive step returns `DECISION NEEDED` and takes no action. Helpful for independent review, repetitive extraction, separate experiments, polluted mature sessions; wasteful for vague planning, broad implementation, "three agents think about the same thing". Verification: test.
  Basis: reported (a cheap worker that guesses costs more in rework than it saves). Status: missing at 088a227c. `SubagentStart`, `SubagentStop`, and `Stop` are present in claude 2.1.327 (code search, chunk-ja5z738t.js@5607, @5212).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1ubfy7y-whats-really-the-big-deal-with-20261022T122113Z.md:67; external/2026-10-22/reddit.com-r-claudecode-comments-1ubfy7y-whats-really-the-big-deal-with-20261022T122113Z.md:75 (url: <https://www.reddit.com/r/ClaudeCode/comments/1ubfy7y/whats_really_the_big_deal_with_subagentdriven/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xs1d5y-most-of-my-claude-code-tokens-we-20261110T093224Z.md:43 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs1d5y/most_of_my_claude_code_tokens_went_to_subagents/>).

- [x] **OUT-235** Out (REQ-DELEGATION-006, ADR-0117, OUT-176, ADR-0177): no maxTurns or turn cap in agent frontmatter, and no measured gain. claudetto shall use subagents as read-side context firewalls, not write-side implementers, and guard subagent cost: Read, Grep, and Glob only (the single-writer rule kills same-file conflicts), Agent in `disallowedTools` of custom agents to stop recursion, `maxTurns` plus a fixed return schema, a cheap model pinned to read-only agents, and default-deny Agent in CLAUDE.md with Explore and Plan whitelisted; one task per agent, short brief, 5-10 line report, split by area of code not by task, reviewers read-only, one agent owns tests, full suite once per tree from the main loop, agents never run git writes.
  Acceptance: Each custom agent lists Read, Grep, Glob, sets `maxTurns`, and disallows Agent. The pinned model is never Fable or Opus (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)). A fresh subagent has a cold cache and many tiny agents can cost more than inline; a fork carries all context (one fork burned 430k tokens); subagents were 44-47% of one user's spend; 99.0% of Sonnet and 81.3% of Opus tokens in one commenter's month ran inside subagents; broken caches cost $106 of about $2,500 (about 4%) over 57 runs, 41 of them idle subagents (tool author); a bounded fix goes by SendMessage to the same agent, after two review rounds use a fresh agent. A max-agents-per-wave cap and a per-subagent model rule are missing. Anthropic article (cited via poster): default to one model, one context, one tool loop; subagents only for measured context-bloat, parallel disposable-context work, or too many tools; tool choice degrades past 30-50 definitions. Verification: inspection and test.
  Basis: reported (model-generated advice; the authors give their own measurements). Status: missing at 088a227c (`plugins/claudetto/hooks/features/delegation/delegation.ts` is partial; no `disallowedTools` or per-wave cap found: git grep at 088a227c returned no file). In claude 2.1.327 the tool `Agent` and `/subtask` exist (code search, chunk-77827yq1.js@359; chunk-20bbdb9p.js@22576) and `maxTurns` is a positive-integer key of the agent schema (chunk-rj3e7agr.js@297639).
  Conflict: Agent Files And Haiku Window.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:64 (url: <https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/>); external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:100; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:7; external/2026-11-10/reddit.com-r-claudeai-comments-1xrnt9w-cheap-judge-opus-only-on-the-unc-20261110T094216Z.md:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrnt9w/cheap_judge_opus_only_on_the_uncertain_cases_988/>); external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:82.

- [x] **OUT-236** Out (REQ-DELEGATION-007, ADR-0177): the stock Agent description already states the principle (probe on 2.1.327) and the thresholds have no measure. claudetto shall offload to a subagent only when the main session needs the conclusion, not the intermediate search history; delegate only where one spec buys much generation and an automatic validator keeps review cost from growing with output; work inline when it already holds the context and can finish in a few tool calls; stay single-threaded for tasks under about 5 minutes, sequential dependencies, and budget-bound work; and by context size, do small tasks inline under about 50k context (under about 5 tool calls) and prefer a subagent for self-contained work over 50k.
  Acceptance: the delegation guidance text states these conditions and a delegation check names which of conclusion or history the main session needs; offloading when intermediate context is needed later buys a 2.6-5.9x surcharge for nothing. One-shot subagents take small, well-defined charges; starting context stays under about 60k; workers start at about 11k with their own autocompact limit of 100k; five or six subagents at up to 100k each can drain a Max plan (user attributes to 24/7 running). Verification: inspection and test.
  Basis: reported and inferred; handoff overhead (write spec, wait, review) is roughly fixed per handoff; in one commenter's bench the lead read every branch, where the money went. Status: partial at 088a227c (`delegation.ts`; the 50k threshold and the rubric are missing).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:97 (url: <https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/>); external/2026-10-23/reddit.com-r-claudeai-comments-1xclm8k-does-delegating-save-claude-quot-20261023T025721Z.md:122; external/2026-10-23/reddit.com-r-claudeai-comments-1xclm8k-does-delegating-save-claude-quot-20261023T025721Z.md:131; external/2026-10-23/reddit.com-r-claudeai-comments-1xclm8k-does-delegating-save-claude-quot-20261023T025721Z.md:133 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xclm8k/does_delegating_save_claude_quota_i_measured_6/>); external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:57; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:106; plugins/claudetto/hooks/features/delegation/texts.ts@088a227c (git grep: no rubric).

- [x] **OUT-237** Out (REQ-DELEGATION-008, ADR-0177): user-side practice, and a plugin agent ignores mcpServers. claudetto shall scope MCP servers into the frontmatter of a subagent defined in `.claude/agents/` instead of .mcp.json, so the main conversation never pays for the tool descriptions. A plugin agent file cannot do this: Claude Code ignores `mcpServers` in a plugin agent and logs a warning (clawdipedia extend/subagents/frontmatter, 2.1.327, 2026-11-18).
  Acceptance: No MCP server needed only by one `.claude/agents/` subagent appears in .mcp.json, and no claudetto plugin agent file sets `mcpServers`. Verification: inspection.
  Basis: reported (model advice), checked against the 2.1.327 docs (see the plugin-agent limit above). Status: missing at 088a227c (`git grep -E 'mcpServers' 088a227c -- plugins` finds no agent file that sets it).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:126 (url: <https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/>).

- [x] **OUT-238** Out (REQ-DELEGATION-010, ADR-0177): the stock Agent description already states the principle (probe on 2.1.327) and the thresholds have no measure. claudetto shall tell the lead to name a spec file by path in a subagent prompt, so the subagent reads it, and not to read the file and paste it into the prompt; and shall have main write the work instructions to a file and point a fresh session at it, rather than have subagents chat with main.
  Acceptance: the delegation guidance text names the path form; a delegated job reads its instructions from a file, and the same job uses about 1/3 the tokens of the chat variant (one user, Opus 5.5 orchestrator). Verification: inspection and demonstration.
  Basis: reported (one commenter each; the thread gives about half the cost of the paste step as an estimate, not a measurement). Status: missing at 088a227c (git grep of texts.ts: no path rule).
  Source: external/2026-10-23/reddit.com-r-claudeai-comments-1xclm8k-does-delegating-save-claude-quot-20261023T025721Z.md:117 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xclm8k/does_delegating_save_claude_quota_i_measured_6/>); external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:386 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xgxv58/claude_max_20x_weekly_depleted_in_less_than_25/>); plugins/claudetto/hooks/features/delegation/texts.ts@088a227c.

- [x] **OUT-239** Out (REQ-DELEGATION-012, OUT-091, REQ-SETUP-027): the subagent cap is already written by setup. claudetto shall write the native subagent caps into settings `env`: `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (3 for claude_pro, 4 for default_claude_max_5x, read from `oauthAccount.organizationRateLimitTier` and `organizationType` in `$CLAUDE_CONFIG_DIR/.claude.json`, else `~/.claude.json`; no cap for Ultra default_claude_max_20x, an unknown plan, or an API key), `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` (the engine drops Agent from a subagent at that depth), and `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS=900000`. claudetto shall not write `CLAUDE_CODE_SCRIPT_CAPS`. A subagent is never spawned without explicit permission, and agent files pin the subagent model and allow no nested spawn.
  Acceptance: a settings write holds the three keys with these values per plan tier and no `CLAUDE_CODE_SCRIPT_CAPS`; with the cap at 1, 3 starts give 1 run and 2 errors naming the key; with `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS=3000` a hung request ends at 3 s against 25 s; a subagent at depth 1 has no Agent tool. Reported motive: 166 and 510 agents were spawned for an 8-page review under ultra effort, and one case exhausted 64 GB RAM; limits are per session (20 concurrent, 3 nesting levels; nothing counts across sessions). The depth question is answered: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` caps nested subagents (read on 2.1.327: `chunk-ja9j7x1x.js@328` returns the env value, else the default 3; `chunk-2ew0jg68.js:33162` types it as an integer of 1 or more; `chunk-m14bt1pz.js@2729487` offers `Agent` to a subagent only while its depth is below that value). Verification: test.
  Basis: measured (claude 2.1.322, fake API, probes P220-P222); reported. Status: have at 088a227c (spawn depth, stall timeout, concurrent cap), partial (no `maxTurns`). The question whether claude has a depth env is answered: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` exist in claude 2.1.326 (code search, chunk-2ew0jg68.js@33162 (2.1.327); chunk-ja9j7x1x.js@341 (2.1.327); the refusal text names the key at chunk-3v1e1y2y.js@42475 (2.1.327)), as does `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` (chunk-qhsv8pnt.js@27222 (2.1.327)) and `CLAUDE_CODE_SUBAGENT_MODEL` (chunk-2ew0jg68.js@44237 (2.1.327)).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:99; external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:22; external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:85; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:623; plugins/claudetto/hooks/features/setup/settings.ts:181@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:183@088a227c; plugins/claudetto/hooks/features/setup/changes.ts:108@088a227c; external/2026-11-10/reddit.com-r-claudeai-comments-1xphfvn-yo-claude-you-dont-need-166-agen-20261109T153055Z.md (url: <https://www.reddit.com/r/ClaudeAI/comments/1xphfvn/yo_claude_you_dont_need_166_agents_for_this/>); external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:56; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1912, reported, user, 2026-11-09.

- [x] **OUT-240** Out (REQ-DELEGATION-013, OUT-016, ADR-0092, OUT-061): run-limit mods and swarm limits are removed. claudetto shall bound subagents by depth limit and per-parent fan-out (children per parent step) and not by a per-session running count, and shall guard across sessions: at most 4 running and 12 starts per 10 minutes across sessions; at 80% of the 5 h or weekly window ask, at 95% refuse; a prompt that re-reads 500k+ tokens asks "compact / send anyway / cancel"; in `claude -p` refuse with a reason; event-driven, no loop. A queue runs at most 6 parallel agents (`pool=6; while queue: start an agent when a slot frees`). A brief states the number and model of agents allowed, max turns, and a time budget, and the model is told the harness facts (subagents survive `/clear` and `/compact`; do not restart them); explore agents are capped to Haiku and at most 2 each; the main agent names model and effort per subagent and asks why before it starts a workflow or multi-agent pipeline. The strongest model goes only where judgment decides (architecture, integration, review, merges); mechanically verifiable work goes to Sonnet or Haiku.
  Acceptance: a fake session with 5 concurrent starts is refused with the count; a start at 96% of the weekly window is refused; the same start at 85% asks; a queue of more than 6 tasks never shows more than 6 live agents; the model text holds explicit agent-count and model rules. Verification: test and inspection.
  Basis: reported (one prompt made 394 subagent calls and 84M tokens in 10 minutes, 2 from the main conversation; 8 Fable 5.1 agents spent $100 extra-usage credit in under 5 minutes; "ignore cost, use as many agents as possible" turned a 5-minute job into a 40-agent chain; past 6-8 parallel agents one workload hit server-side rate limits and agents burned context on retries; an uncapped 19-agent Fable fan-out hit the session limit in about 45 minutes). Status: partial at 088a227c (setup env caps only; the cross-session counter, the pool cap and the justify-first rule are missing; the agent-model feature is partial).
  Source: external/2026-10-12_p2/export-Claude Code's subagent limits are per session, so I built a mod that counts across all of them.jsonl:2; external/2026-10-12_p2/export-Claude Code's subagent limits are per session, so I built a mod that counts across all of them.jsonl:14 (url: https://www.reddit.com/r/ClaudeCode/comments/1x3lx5o/claude_codes_subagent_limits_are_per_session_so_i/); openspec/specs/run-limits/spec.md:8; external/2026-10-01_p2/export-Zero Fable usage all week with my 200$ Max subscription. Then I topped up $100, got 8 Fable agents,.jsonl:1 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wv0r84/zero_fable_usage_all_week_with_my_200_max/>); openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:21 (`CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`); plugins/claudetto/hooks/features/setup/settings.ts:181@088a227c; external/export-Opus 5.5 as a fleet orchestrator- early notes from a real workload.jsonl:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wnmbqg/opus_55_as_a_fleet_orchestrator_early_notes_from/>); external/2026-10-21/reddit.com-r-claudecode-comments-1x97ix2-a-readonly-custom-subagent-cut-20261020T101449Z.md:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/>).

- [x] **OUT-241** Out (REQ-DELEGATION-014, ADR-0117, OUT-176, ADR-0177): no maxTurns or turn cap in agent frontmatter, and no measured gain. claudetto shall set `maxTurns` in the frontmatter of each agent file, starting with Artemis, because an agent without `maxTurns` ran 400 tool calls and one with `maxTurns:5` stopped at 5 requests. The repeat guard stays: it withholds a result the loop already holds. Headless runs use `timeout 30m claude -p ... --max-turns 40`.
  Acceptance: each `plugins/claudetto/agents/*.md` holds `maxTurns`; a fake-API run with `--agents` stops at the cap. An earlier spec said each agent sets `maxTurns`; a later check found the files set none and a repeat guard replaced it. Verification: test.
  Basis: measured (probe, claude 2.1.325, fake API, `--agents`) and cited (a turn cap at P75 cuts cost 24-68%, arXiv 2510.16786); reported (subagents force-stopped at 200 tool calls, claude 2.1.280, Opus 5.5). Status: missing at 088a227c (`git grep maxTurns` finds nothing under `plugins/`); repeat guard have. `maxTurns` is still a positive-integer key of the agent schema in claude 2.1.326 (code search, chunk-rj3e7agr.js@297639 (2.1.327)).
  Conflict: Agent Files And Haiku Window.
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:108; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:185; external/export-What the hell is a turn limit (200-turn limit) and why are subagents suddenly hitting them-.jsonl:5 (url: <https://www.reddit.com/r/ClaudeCode/comments/1woaxj7/what_the_hell_is_a_turn_limit_200turn_limit_and/>); external/2026-10-07_p2/export-A year of all-Claude-Code dev work- where are the gaps in my workflow-.jsonl:13 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wzwfsn/a_year_of_allclaudecode_dev_work_where_are_the/>); openspec/specs/subagent-prompts/spec.md:8.
  Conflict: Worker Resume.

- [x] **OUT-242** Out (REQ-DELEGATION-016, ADR-0177): a clock steer with no measured gain. claudetto shall send a status-request steer to a background worker after about 30 minutes (1 hour at most) and stop a worker whose change leaves its brief; the sentence goes in the lead's prompt.
  Acceptance: the lead prompt text holds the 30-minute steer sentence. Verification: inspection.
  Basis: reported (an Opus 5.5 task of about 2 hours ran 6 hours; n=5, 3). Status: missing at 088a227c (run-limits count calls and context, not time).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs1d5y-most-of-my-claude-code-tokens-we-20261110T093224Z.md:31 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs1d5y/most_of_my_claude_code_tokens_went_to_subagents/>); external/please-use-me-often/agent-failure-dossier/judged/conduct.jsonl:23; openspec/specs/run-limits/spec.md:8.

- [x] **OUT-243** Out (REQ-DELEGATION-017, OUT-001): no planner agent. claudetto shall run delegation as gates: an issue or spec first, then a plan, the plan critiqued by a second agent before the build and corrected, implementation, then review by another agent against the original spec. The plan lists the files it expects to change and the implementer asks before it touches others. The lead splits work into non-overlapping slices itself. Briefs carry scope fences and a pre-merge gate reads the diff; a flagged judgment call of the owner is a blocker and the agent stops.
  Acceptance: Metis, Heracles, and Athena prompts name the gate order; a brief without a scope fence fails inspection; failure reasons are asked before the build (post-mortem framing: "project already failed, list top 3-5 reasons"); the critic gives three strongest counterarguments or a failing test, in a fresh chat; full context beats magic words; "you explained this yesterday" tricks invite fabricated history (reported consensus). Cited: sycophancy from preference data [2310.13548]; collapse grows with pressure, the correct answer often stays in the reasoning trace [2609.09090]; ClarifyGPT 70.96 -> 80.80 pass@1 [2310.10996]; Ambig-SWE up to 74% [2502.13069]; RL clarifier 41% fewer questions [2604.14624]; the top comment (367): "ask one clarifying question". Verification: inspection and demonstration.
  Basis: cited; reported (17 Sonnet agents: 12 PRs, 2 of about 15 needed rework, zero fence breaches; weakness: an agent flagged a judgment call and kept going). Status: partial at 088a227c (Metis, Athena, Heracles exist in plugins/claudetto/agents/; escalation ladder, retro agent, blind-reviewer role and critic role: no file in `plugins/claudetto/agents/` at 088a227c, which holds Artemis, Athena, Heracles and Metis).
  Source: external/2026-10-25_p2/reddit.com-r-claude-comments-1wt0kox-is-it-me-or-sonnet-55-doesnt-make-20261025T160610Z.md:45 (url: <https://www.reddit.com/r/claude/comments/1wt0kox/is_it_me_or_sonnet_55_doesnt_make_sense_at_all/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:49 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkrwiv/i_tried_running_the_cloudflare_securityaudit/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xrtmvs-asking-claude-what-do-you-need-t-20261109T151940Z.md:60 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrtmvs/asking_claude_what_do_you_need_to_know_before/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xphfvn-yo-claude-you-dont-need-166-agen-20261109T153055Z.md:41 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xphfvn/yo_claude_you_dont_need_166_agents_for_this/>); external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:173; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:47. Dropped (2026-11-18): the other arXiv ids have no source located in external/, openspec/, reports/, git history or the user's transcripts.

- [x] **OUT-244** Out (REQ-DELEGATION-019, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall give a review loop something checkable (a test or a checklist) and end it by a cap or by finding severity: one pass (list findings, fix, stop) or three passes with leftovers listed; iterate while a finding is P1 or P2 and stop when only P3 findings remain after a couple of rounds; cap a spec review loop at 3 revise cycles unless the user waives the cap, with each cold reviewer given a different lens, one told to find the fundamental flaw. The reviewer sees only the acceptance criteria and the diff, not the implementer's summary.
  Acceptance: the review prompt names the round cap and the inputs; a loop that reports only P3 findings ends without another round, and a loop with a P1 or P2 finding runs another round; a fourth spec-review cycle starts only after the user waives the cap; each reviewer prompt names its own lens. Verification: test and inspection.
  Basis: reported (a Sonnet 5.5 run at max effort overthought with 300k thinking tokens and no output; high or medium finished sooner; one heavy user for severity; one commenter for the 3-cycle cap, lens results mixed, a second model family with no project memory forces reading from documents). Status: partial at 088a227c (`plugins/claudetto-openspec/skills/verify/SKILL.md` exists; the exit rule was not read); missing for severity and the cycle cap.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xw2sit-ai-model-roles-in-a-project-20261116T051438Z.md:87 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xw2sit/ai_model_roles_in_a_project/>); external/export-I analyzed 246 repos and 57 papers on agent harnesses. Here's what actually works.jsonl:14 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wpzynz/i_analyzed_246_repos_and_57_papers_on_agent/>); external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:130 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents/>); external/2026-10-25/reddit.com-r-claude-comments-1xclxdw-opus-55-is-so-good-remember-to-use-20261024T141513Z.md:361 (url: <https://www.reddit.com/r/claude/comments/1xclxdw/opus_55_is_so_good_remember_to_use_xhigh_effort/>).

- [x] **OUT-245** Out (REQ-DELEGATION-020, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall run a review as gates, each a pair in sequence: one constructive reviewer (simplification, spec conformance) and one adversarial reviewer (what could go wrong), each able to fix.
  Acceptance: a review ends when only low and medium issues are fixed; a fix that touches the core is reviewed again; a fourth set stops the loop and reports a spec smell. Verification: inspection.
  Basis: reported, one commenter (2 sets usual, 3 an outlier). Status: missing at 088a227c (Athena is a single read-only reviewer: plugins/claudetto/agents/Athena.md:3).
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xclxdw-opus-55-is-so-good-remember-to-use-20261024T141513Z.md:371 (url: <https://www.reddit.com/r/claude/comments/1xclxdw/opus_55_is_so_good_remember_to_use_xhigh_effort/>).

- [x] **OUT-246** Out (REQ-DELEGATION-021, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall run gates mechanically with no model tokens and review in a fresh context with a separate verifier: scripts, tests, and lint serve verifiable claims, and a different model that sees only the artifact (not the producer's reasoning) serves judgment; the adversarial reviewer runs in a fresh context, not inside a long one.
  Acceptance: an agent runs only when a gate fails and the output needs diagnosis; code is never reviewed in the session that wrote it (subagent or other-family model); the reviewer is told not to trust the first-pass conclusion, gets the diff, requirements, and relevant code but not the writer's explanation, and gives a concrete failure case per finding; the builder validates each finding before fixing; test suite first, spec second, spec-less LLM review last; a prompt-writer and checker run one write, one check, then stop; the reviewer's context holds no earlier turns of the session it reviews. A second LLM of the same family and context is weak evidence, and the author is the worst judge and inherits rationalisations from the conversation; an architect agent's plan is verified by executing it (run the DDL, replay the mutation sequence) before a panel's scores are trusted. Reported: one tool author found outside reviewers found 14 bugs while 10 tests were green; Opus 5.5 at high plans over-build (ClickHouse for a shortener, 256-shard Redis; simplicity lost 4 of 5). Verification: demonstration and inspection.
  Basis: reported; tool-author interest; one commenter's claim that models nitpick more as context grows. Status: missing at 088a227c (no fresh-context reviewer hook found). `SubagentStop` and `TaskCompleted` are hook events on 2.1.327 (cc-inspect `surface` kind `hook-event`, chunk-ja5z738t.js:5436).
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:120; external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:163 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfa39o/is_claude_the_least_yesman_llm/>); external/2026-10-12_p2/export-In-house benchmark- what agent is better for code-architect planning- Opus 5.5 high vs Fable 5.1 hig.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x3hmr1/inhouse_benchmark_what_agent_is_better_for/>).

- [x] **OUT-247** Out (REQ-DELEGATION-023, OUT-171, ADR-0092): Stop-check machinery is removed. claudetto shall confirm, when the user's instruction requires a subagent or a named reviewer, that an Agent or Task call occurred before the reply.
  Acceptance: An instruction "use a reviewer" with no Agent call blocks the reply once. Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:193 (issue #42856; <https://github.com/anthropics/claude-code/issues/42856>); plugins/claudetto/hooks/features/delegation@088a227c (scope to verify).

- [x] **OUT-248** Out (REQ-DELEGATION-025, ADR-0092, ADR-0117, OUT-016): limit machinery is removed; the agent-body part folds into the agent-files build. claudetto shall refuse `SubagentStop` while the subagent's own jobs run (no hand-back while a started job runs, unless it hands over PID, log and lock), keep a registry of in-flight PIDs and locks, warn at turn N-2, and require the hand-back form: notices first (`BLOCKED`, `REJECTED`, `NEEDS-CONSENT`, `PARTIAL (turn limit)`, `UNVERIFIED`), then `Outcome`, `Changed`, `Evidence` (command to exit, n of N, log paths), `Not done`, `Running jobs handed over`, also written to the brief's report path. The principal audits each hand-back against diff, evidence, logs, `agent_transcript_path`, `toolsUsed`, and `resolvedModel`, and relays unverified items labelled; a delegate report is a Claim: verify it against artifacts or label it unverified. The brief form is `Task`, `Scope`, `Terms`, `User-Owned Values in play`, `Corrections so far (verbatim)`, `Rejections so far`, `User approvals that apply (verbatim, with scope)`, `Known facts`, `Budget` (keep the last 2 turns for hand-back), `Report`; approvals are quoted verbatim because a delegate's permission check sees only its own transcript (a runtime rule for briefs; the plan-file rule that the user is not quoted verbatim does not apply to it). Delegate only parallel, isolated or independent work. A delegate that meets a rejection, a block or a user-owned value stops and reports in the first line (background delegates cannot see the user). Each agent tries another route before it reports a block. Agent bodies are two plain paragraphs with no XML, frontmatter name, description, model and tools only. Heracles ends with what it did, what it checked and the result, and what is left, each defect marked reproduced (command and output) or read (`file:line`). Artemis ends with one `path:line` plus an excerpt per finding and names a needed write or command without running it. Metis lists steps, files, risks, and the check command and names what it could not find. Athena reports a defect as `path:line`, what, and why.
  Acceptance: A subagent with a live job cannot stop; a hand-back lacks no field of the form; each of the four agent files has two paragraphs, no tag, and the report line above. Reported: 10 turn-limit notices (60 and 80 turn) in 6 sessions left subagents of 116k to 266k tokens with no report (one ended `SubagentHandback` at 15 of 16 turns; a prose rule in the agent file failed in a live run); `handback-send-enforce` reminders fired 9 times in 7 sessions; the concurrent-subagent cap was hit in 2 sessions; a probe disproved "a background job dies with its subagent turn". Verification: test and inspection.
  Basis: measured; reported. Status: partial at 088a227c (the four agent files have the body form, `plugins/claudetto/agents/Heracles.md@088a227c`; the hand-back guard and registry are missing; `plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c`). `SubagentStop` is present in claude 2.1.327 (code search, chunk-ja5z738t.js@5623). The DIRECTOR `texts.ts` "task, inputs, check" is the shorter brief.
  Source: external/please-use-me-often/agent-terms/DELEGATION-AGREEMENT.md:11; plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:33; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:119; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:281; openspec/changes/2-1-325-rearchitecture/design.md:286; openspec/specs/subagent-prompts/spec.md:28; openspec/specs/subagent-prompts/spec.md:49; plugins/claudetto/agents/Heracles.md@088a227c.

- [x] **OUT-249** Out (REQ-DELEGATION-028, ADR-0117, ADR-0177): conflicts with no maxTurns, no measured gain. claudetto shall make a subagent stop and write a handoff for the remaining work only when it works over 20 minutes or its context passes 30%, and the main agent shall spawn a fresh one; and shall cap a worker at 60 tool calls and hand off at 100K tokens (soft) and 150K tokens (hard), with each agent logging what it did and the result saved for the next agent, and restart by context pulled in, since one huge log can outweigh dozens of narrow searches.
  Acceptance: A worker that passes 60 tool calls or 150K tokens stops and hands off. An auto handoff at about 175K context (the subagent writes a handoff doc, terminates, the caller spawns a new one) cut weekly burn about 60% over several weeks (it shifts billing from cache writes to reads, not tokens); a stop at about 150 tool calls carries a HANDOFF block; a heartbeat ping about every 45 min keeps the 1-hour cache warm during tool calls over an hour (commenter doubt: may violate usage terms or burn quota, inferred); the extracted compact prompt travels as an in-branch `.md` so the summary travels with the branch. Verification: test.
  Basis: reported (one user burned an entire Max 20x weekly limit in 28 hours with Sonnet agents at 1M+ tokens before the cap). Status: missing at 088a227c. `SubagentStart` and `SubagentStop` are present in claude 2.1.327 (code search, chunk-ja5z738t.js@5607, @5212).
  Source: external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:37; external/2026-11-10/reddit.com-r-claudeai-comments-1xs1d5y-most-of-my-claude-code-tokens-we-20261110T093224Z.md:45; external/2026-11-10/reddit.com-r-claudeai-comments-1xs1d5y-most-of-my-claude-code-tokens-we-20261110T093224Z.md:80 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs1d5y/most_of_my_claude_code_tokens_went_to_subagents/>).

- [x] **OUT-250** Out (REQ-DELEGATION-029, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall list Haiku-low jobs: change-log summaries capped at 20 words per entry, command output to a Markdown table, proofreading with TODO markers, and condensing of built-in webfetch.
  Acceptance: The delegation text names each job. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:39; external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:41; external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:42 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsgul7/does_anyone_other_than_opus_and_fable_actually/>).

- [x] **OUT-251** Out (REQ-DELEGATION-030, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall split tasks by shape, not by repo size (a reading audit with a tight checklist suits a cheap model; interface-touching design does not), and shall price the verification step (the parent re-reading child output) separately.
  Acceptance: A delegation estimate lists the verification cost as its own line. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:286 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/>).

- [x] **OUT-252** Out (REQ-DELEGATION-031, product rule: Fable, Mythos and Opus are never a subagent model): the model it names is excluded. claudetto shall write spec docs on the stronger model and hand implementation to Opus, and shall ask Fable for a concrete review of a hard-to-use UI before Opus implements the suggestions.
  Acceptance: A spec is authored in a Fable main session and implemented by Opus. Verification: demonstration.
  Basis: reported, one comment. Status: missing at 088a227c.
  Conflict: Plan Strong Implement Cheap.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xs6tkq-for-those-of-you-who-use-fable-20261110T095324Z.md:192 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xs6tkq/for_those_of_you_who_use_fable_daily_what_does_it/>).

- [x] **OUT-253** Out (REQ-DELEGATION-032, product rule: Fable, Mythos and Opus are never a subagent model): the model it names is excluded. claudetto shall plan on Opus or Fable high, implement on a cheaper model (Sol on Copilot, else Haiku xhigh), and review on Opus medium.
  Acceptance: The role table holds the three steps and their models. Verification: inspection.
  Basis: reported, one comment. Status: missing at 088a227c.
  Conflict: Strong Model Role Splits (the item that implements on Opus).
  Source: external/2026-11-10/reddit.com-r-claudecoding-comments-1xs84wp-tldr-fable-52-high-vs-opus-5-20261110T095106Z.md:49 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xs84wp/tldr_fable_52_high_vs_opus_55_xhigh_via/>).

- [x] **OUT-254** Out (REQ-DELEGATION-033, product rule: Fable, Mythos and Opus are never a subagent model): the model it names is excluded. claudetto shall keep a running list of problems Opus fails on and hand the whole list to Fable in one session (Fable for the hard 10%, Opus for the rest), with Opus designing, Sonnet developing, and Haiku doing QA by using the app without code access; routine edits stay off Fable.
  Acceptance: The list file exists and one Fable session receives all of it. Verification: demonstration.
  Basis: reported (one author says full-send Fable kills a weekly limit in 8 hours). Status: missing at 088a227c.
  Source: external/2026-11-13/reddit.com-r-aigamedev-comments-1xtallk-is-fable-52-and-improvement-ove-20261111T233500Z.md:265 (url: <https://www.reddit.com/r/aigamedev/comments/1xtallk/is_fable_52_and_improvement_over_opus_55_for_game/>).

- [x] **OUT-255** Out (REQ-DELEGATION-034, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall keep the coordinator out of the memory role: one short rules file that every worker reads at start; the coordinator sends only goal, inputs, and what done looks like; each worker writes status to a shared file or queue so a dropped task shows as a task with no status; a rule change deletes the old line.
  Acceptance: A dispatch payload is self-contained; a task with no status line is reported as dropped. Verification: test.
  Basis: reported, two commenters. Status: missing at 088a227c.
  Source: external/2026-11-11/reddit.com-r-claudeai-comments-1xsrfpg-opus-is-not-a-great-coordinator-20261110T172506Z.md:71 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsrfpg/opus_is_not_a_great_coordinator/>).

- [x] **OUT-256** Out (REQ-DELEGATION-035, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall send each cross-model review through the orchestrator to the builder, so a finding gets two chances to be rejected.
  Acceptance: A review finding reaches the builder only after the orchestrator passed it on; a rejection by either is logged. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:138 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents/>).

- [x] **OUT-257** Out (REQ-DELEGATION-036, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall run a review agent over all sessions of one change before each handoff and before the final merge, to check that temporary measures were removed and no semantics or invariants were lost.
  Acceptance: The review reports each lost invariant and each leftover temporary measure; a medium Sonnet-class model is enough. Verification: demonstration.
  Basis: reported, one user. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xftq1a-using-fable-51-as-architect-opus-20261029T124053Z.md:50 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xftq1a/using_fable_51_as_architect_opus_55_in_claude/>).

- [x] **OUT-258** Out (REQ-DELEGATION-037, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall have each implementer report end with a touch table (each file with its +/- line counts against the base commit, plus untracked files) and a contradictions section that logs every handoff premise the tree did not match.
  Acceptance: A report without both sections is incomplete. Verification: inspection.
  Basis: reported, one user. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xftq1a-using-fable-51-as-architect-opus-20261029T124053Z.md:100 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xftq1a/using_fable_51_as_architect_opus_55_in_claude/>).

- [x] **OUT-259** Out (REQ-DELEGATION-038, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall give a risky step (security, money, background jobs, data) a review by an outside model before the build and again after, and shall have a subagent log progress to a file and stop at about 80 tool calls so a fresh one resumes.
  Acceptance: A risky step carries two review records; a subagent stops near 80 tool calls and a successor resumes from its progress file. Verification: demonstration.
  Basis: reported, one user (Codex review and the 80-call stop). Status: missing at 088a227c.
  Source: external/2026-10-31/reddit.com-r-claude-comments-1xixg9h-is-the-consensus-currently-that-fa-20261031T082729Z.md:208; external/2026-10-31/reddit.com-r-claude-comments-1xixg9h-is-the-consensus-currently-that-fa-20261031T082729Z.md:202 (url: <https://www.reddit.com/r/claude/comments/1xixg9h/is_the_consensus_currently_that_fable_51_is/>).

- [x] **OUT-260** Out (REQ-DELEGATION-039, OUT-171, ADR-0092): Stop-check machinery is removed. claudetto shall run a mechanical check such as a dead-code linter in a hook that runs after edits or before the turn ends and blocks the stop until Claude cleans up, and shall run review as a separate subagent with a short checklist that reads only the diff.
  Acceptance: The stop is blocked while the linter reports. A commenter gives the reason: an implementer that reads a long rules doc drops the items near the end; text rules stay for judgment calls such as naming, architecture and what not to touch. Verification: test.
  Basis: reported, one commenter (low confidence). Status: missing at 088a227c (git grep for periphery, knip, dead code finds no such hook).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlr0pk-turning-a-repeated-review-find-20261102T184719Z.md:87 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlr0pk/turning_a_repeated_review_finding_into_a_written/>).

- [x] **OUT-261** Out (REQ-DELEGATION-040, ADR-0177): project infrastructure outside the plugin. claudetto shall give each worktree its own environment: docker compose -p <branch> for containers, network and volumes, with ports from a per-worktree .env or derived from the branch name; a fresh database per branch built from migrations and seed, never a shared one; a per-branch preview deploy where the host has one; and one deploy and test worker that owns the shared environment, reports results per commit SHA and takes submissions from a queue while agents keep doing local checks.
  Acceptance: Two worktrees run at once without a clash on containers, database or ports; only the final integration run on main stays serial. Verification: demonstration.
  Basis: reported, two commenters. Status: partial at 088a227c (plugins/claudetto/hooks/features/delegation/texts.ts:2@088a227c names isolation: "worktree"; no per-branch database or compose project).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlz2bs-how-do-you-manage-worktrees-wh-20261102T184347Z.md:105; external/2026-11-03/reddit.com-r-claudecode-comments-1xlz2bs-how-do-you-manage-worktrees-wh-20261102T184347Z.md:47 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlz2bs/how_do_you_manage_worktrees_when_your_agents_end/>).

- [x] **OUT-262** Out (REQ-DELEGATION-041, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall require a repro per review finding (file, line, failing input) and drop findings without a failing test, ask only for material problems, severity-sorted, confidence >95%, and validate each review comment as a claim against file and callers (trace execution) with a verdict valid, partly valid, wrong or style, with `file:line`.
  Acceptance: Asked to find bugs it always will, so: identify first and fix one by one in a separate session; give a goal other than finding issues; adversarial review by another model; count alone is meaningless (a scan reported 467 leaked keys, real 1). Reported: filtering CodeRabbit kept 72 of 77 real bugs and removed 76 of 223 comments (noise items), F1 35.2% -> 40.4% on 50 PRs (cited, author-run). Advisor value is a fresh perspective on a long thread; a separate review session loses less bias but needs context. Verification: test.
  Basis: reported; cited (author-run). Status: partial at 088a227c (agents/*.md model and effort fields; features/agent-model/model.ts); the repro rule and verdicts are missing.
  Source: external/2026-10-03/export-Open-source Claude Code plugin- validate PR review comments against the code before acting on them (.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wweu6q/opensource_claude_code_plugin_validate_pr_review/>); external/2026-10-14/export-Does Claude Code find new bugs every time you ask it to review your code.jsonl:31 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x4ssct/does_claude_code_find_new_bugs_every_time_you_ask/>).

- [x] **OUT-263** Out (REQ-DELEGATION-042, ADR-0177, OUT-152, OUT-061): reported or advice with no reproduction and no measured gain over vanilla, and it needs a ticket-filing orchestrator or swarm. claudetto shall hand delegated work over like a junior-developer ticket: small tickets end to end with clear acceptance criteria, each agent in its own area, a shared contract pinned before parallel work (one CLAUDE.md per important folder, API specs), and a scheduled housekeeping agent for dead code, oversized files, unused exports.
  Acceptance: each unrelated finding of the housekeeping agent becomes a ticket, not a drive-by fix; the PR is reviewed, not the prompts. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/swe-worst-practices.md:185 (weak match; the junior-developer wording was not located).

- [x] **OUT-264** Out (REQ-DELEGATION-043, ADR-0177, OUT-152, OUT-061): reported or advice with no reproduction and no measured gain over vanilla, and it needs a ticket-filing orchestrator or swarm. claudetto shall check each PreToolUse call for a collision with another agent on the same repo and send a mailbox notice to the other agents.
  Acceptance: a demonstration with two agents editing the same file in one repo shows the second edit stopped and a notice delivered, and the component ships only if it beats vanilla on a measured collision count (ADR-0177). Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-02/export-What I learned using PreToolUse-PostToolUse hooks to coordinate several Claude Code agents on one re.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wvocfg/what_i_learned_using_pretooluseposttooluse_hooks/>).

- [x] **OUT-265** Out (REQ-DELEGATION-045, ADR-0031, OUT-021): the built-in Monitor stays, and the gate and repeat guard are removed. claudetto shall wait through a background Bash with completion notifications and `Monitor` for conditions (the harness blocks a bare `sleep`); watch through the built-in `Monitor`, with no own tool; the gate and the memory hold judge a Monitor `command` as Bash and deny no Monitor call for being built-in. Ask once, late, with one decision-ready brief ("push right": maximal prepared work before the human is involved). At heavy context a cap on tool calls per period holds the next call with one reason line. Probe discipline: a launcher that exits 0 proves no effect; score recall on answers; only the arm with `handoffOnBoundary` gets the hand-off ask.
  Acceptance: a Monitor call runs through the same checks as Bash. In claude 2.1.326 a Monitor watch that expires with no events and whose command wrote to stderr tells Claude so and names the file that holds the output (release note). Verification: test.
  Basis: reported. Status: partial at 088a227c (`hooks/features/memory/hold.ts:98` runs the memory guard on a `Monitor` command as on `Bash`; `git grep -i monitor` over `hooks/features/repeat` finds nothing, so the repeat guard does not judge Monitor).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:102; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:159; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **OUT-266** Out (REQ-DELEGATION-047, ADR-0177, ADR-0140): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall choose effort by task: default medium; low for well-defined tasks and chat and for narrow retrieval subagents (not ones making codebase decisions); medium for real work and mechanical implementation from a step list, renames and small fixes (low or medium); high for planning, unfamiliar scoping, edge-case bug fixes and review, or when the goal is ambiguous or several answers are right; xhigh only for the planning turn, architecture, a first plan, or after high failed or a bug survived one attempt; max rarely; no Sonnet at xhigh or max. Medium with a redo at higher effort on failure beats xhigh or max; the same test failing twice escalates the stuck subtask.
  Acceptance: the delegation text names the effort per task kind and the escalation rule; effort rises when the model struggles, not before. One measured task: Sonnet 5.5 low scored 4.10/5 at 4.32 cents/pick and beat medium; Haiku xhigh reported best over high in a 13-test comparison; per-call cost for one user: low about 0.45 USD, medium 0.85, high 2.35; an easy debug took 1.5 minutes at medium and 9 at xhigh; max about 6x medium usage (one commenter). Max front-loads thinking (fewer tool loops) while max also over-engineers and writes tests of tests (contested). Verification: inspection.
  Basis: reported, contested; cited (thinking tokens are output tokens). Status: partial at 088a227c (agent files carry `effort:`, `plugins/claudetto/agents/Athena.md:5@088a227c`; no rule picks effort by task). `/effort` exists in claude 2.1.326 (release notes name `/effort <level>`).
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:93 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down/>); external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:77; external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:81; external/2026-10-21/reddit.com-r-claudecode-comments-1xak96j-i-measured-87000-of-my-claude-20261020T074808Z.md:84 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xak96j/i_measured_87000_of_my_claude_code_api_calls_two/>); plugins/claudetto/agents/Athena.md:5@088a227c; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **OUT-267** Out (REQ-DELEGATION-048, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall use a single agent unless the task decomposes into low-shared-context parts: one worktree and disjoint files per worker, merge one at a time, acceptance tests on the MERGED result; each task owns files or folders and same-area tasks run in sequence; finished worktrees and branches are removed in the merge step after a check of ignored files (`du -sh`: 90 GB of Rust target dirs in 8 dirs); a fixed pool of named worktrees via `--worktree <name>`; a dev-ops agent runs larger tests once per batch; commit before an agent starts so recovery is deleting a folder; fan-out and turns are capped and workers journal; a different model reviews given artifacts, not summaries.
  Acceptance: merged-result tests run after each merge. Reported: per-branch green, merged failed the same 6 tests 5 of 5; a merge queue took 44 minutes. Fan-out cost: spawning a subagent costs 60-70k uncached tokens (one measurement), so 20 agents cost about 1.5M; about 71 verifier agents cost 4.7M tokens and gave 3 wrong headline findings while one narrow agent with 77k tokens was right; questions about own code, config, or data are answered by measuring, work is inline by default, never one verifier per finding, and a verifier gets the bare claim and is told to assume it false; a pre-spawn check (already shipped, defect still there, small enough alone) plus a spawn ledger (2 of 9 builders, about 17% of subagent tokens, went to shipped work). Verified on 2.1.327: hooks fire inside subagents (hook input carries `agent_id` only inside a subagent, chunk-rj3e7agr.js@270173; https://clawdipedia.cc/extend/hooks/input-and-output Documented), and a subagent inherits the parent's permission mode (https://clawdipedia.cc/extend/mod-api/calls/agent Documented). A subagent also inherits the parent's permission rules: its permission context starts as the parent's, so every deny and ask rule carries over, and allow rules carry over unless the spawn passes `allowedTools`, which replaces them with the CLI and MCP-policy allows plus the given list (chunk-zgpk86bb.js@123200-124900, code reading on 2.1.327, 2026-11-18). In claude 2.1.326 `ExitWorktree` refuses to remove a worktree while a background subagent or shell command may still run in it, unless `discard_changes` is passed (release note). Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (the Heracles agent and `just` worktree recipes exist).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:752; external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:110; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **OUT-268** Out (REQ-DELEGATION-050, ADR-0087, ADR-0110): it is a benchmark, and the cache setting is measured first. claudetto shall test delegation against direct execution, keep subagents short, and end each subagent with a handoff inside its cache window.
  Acceptance: delegation shows no worse cost or result than direct work; no subagent outlives its cache window. Verification: probe.
  Basis: reported; one comparison measured (paid run, 2.1.327, Sonnet 5.5 lead, 12 graded code-lookup tasks, 3 runs each, reports/2026-11-18-research/paid-labs/README.md). Every arm answered 36 of 36. A lead searching by itself cost a median $0.0093 and took 3.9 s. The same lead delegating to a Haiku finder cost $0.0166 and took 8.2 s; delegating to a Sonnet finder cost $0.0306 and took 10.2 s. For a single lookup, delegation lost on cost and time. With an Opus lead (the REQ-DELEGATION-049 root) the result reverses on cost only. An Opus 5.5 lead measured this (paid run, 2.1.327, same 12 tasks, 3 runs each, reports/2026-11-18-research/paid-labs/README.md): it delegated in 36 of 36 runs, and with the Haiku finder the median cost was $0.0384 against $0.0449 searching alone (0.86x), the median time 14.35 s against 7.15 s, and the total spend equal ($1.79 against $1.78), all 36 of 36 correct. Long multi-file tasks were not run. Status: missing at 088a227c (`git grep -i 'cache window' 088a227c -- plugins` finds none). The window is `subagentPromptCacheTtl`: unset, 5 minutes unless `ENABLE_PROMPT_CACHING_1H=1` (clawdipedia configure/settings/model, 2.1.327, Documented, 2026-11-18).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408).

- [x] **OUT-269** Out (REQ-DELEGATION-051, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall frame a task by naming the file, the decision already made, what not to touch, and how to verify (a one-line request makes the agent guess); a `/prompt` command spawns subagents to map code and write a file-and-line-specific prompt; anchors ("copy `middleware/throttle.py:18`"); alternatives are compared to stated constraints; a "report steps in order before changing code" line gives a cheap plan in auto mode (a commenter objects it adds tokens); ask one clarifying question, then proceed.
  Acceptance: a brief holds the four named parts. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:75 (anchor the work to a named file and line); openspec/changes/2-1-325-rearchitecture/design.md:306@088a227c9^ (I01, rejected as a user-side practice). Dropped (2026-11-18): the framing text beyond that anchor, no source located.

- [x] **OUT-270** Out (REQ-DELEGATION-054, ADR-0046): baseline text edits are not carried over (clean slate). claudetto shall drop the sentence `run_in_background: false` from root `<delegation>` because the agent form already enforces it, state the delegation cost once in the agent text ("5k to 11k tokens before it works") with its brief form, and delete the duplicate in `<delegation>`.
  Acceptance: `<delegation>` holds no `run_in_background: false` sentence and the cost appears once. Verification: inspection.
  Basis: read, inferred. Status: partial at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:41` states "A worker spends 5k to 11k tokens before it works").
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:53; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:64; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:107.

- [x] **OUT-271** Out (REQ-DELEGATION-055, ADR-0046): baseline text edits are not carried over (clean slate). claudetto shall drop "Edit nothing" from the plan, search and sweep agent bodies because their tools already withhold edit, add the reason "a recalled count is a guess" to the search agent's "count only when Grep or Glob produced it", and say "Report only." in the verify skill in place of "Edit nothing".
  Acceptance: no read-only agent body says "Edit nothing"; the search body gives the reason. Verification: inspection.
  Basis: read. Status: partial at 088a227c (`git grep "Edit nothing" 088a227c -- plugins` finds nothing, so the first part is have; the reason sentence is not present, so the second part is missing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:209; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:210; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:246.

- [x] **OUT-272** Out (REQ-DELEGATION-057, product rule: Fable, Mythos and Opus are never a subagent model): the model it names is excluded. claudetto shall set the model on each subagent by step type: haiku for extraction and format work, sonnet for fan-out over many files or item-by-item checks, opus only for the judge or synthesis step, and a different-vendor model as a second review.
  Acceptance: Each agent file pins a model that matches its step type; no subagent inherits Opus by default. Verification: inspection.
  Basis: reported, no measure. Status: partial at 088a227c (plugins/claudetto/agents/Artemis.md:4 haiku, Athena.md:4 sonnet, Heracles.md:4 sonnet, Metis.md:4 sonnet; no judge agent on opus, no step-type rule).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrvnbi-what-is-the-best-way-to-learn-an-20261110T094238Z.md:65; external/2026-11-10/reddit.com-r-claudeai-comments-1xrvnbi-what-is-the-best-way-to-learn-an-20261110T094238Z.md:67 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrvnbi/what_is_the_best_way_to_learn_and_make_the_most/>).
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).

- [x] **OUT-273** Out (REQ-DELEGATION-058, product rule: Fable, Mythos and Opus are never a subagent model): the model it names is excluded. claudetto shall give each model a fixed role: Sonnet works from a brief, Haiku only cold-reads finished pages, and a fresh Opus reviews every release; routing is not worth its cost when the brief needed to avoid a domain trap equals the job.
  Acceptance: Each role maps to one model in the agent files. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:272; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:279; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:281 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/>).
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).

- [x] **OUT-274** Out (REQ-DELEGATION-059, OUT-001): duplicates an out item (benchmark). claudetto shall make the agent start no planner, mapping, or inventory worker that the user did not ask for, and stop a worker at the user's order.
  Acceptance: no worker starts for work the user ruled out; a stop order ends each running worker. Verification: inspection.
  Basis: reported, user, 2026-11-16 17:37 UTC, no swaps, no needless tests, no benchmarks, no planner worker (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3998); reported, user, 2026-11-16 17:41 UTC, product first, the rest later (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4166). Status: missing at 088a227c (no rule found).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057 (the user ordered the planner worker killed; the agent had stopped it with TaskStop).

- [x] **OUT-275** Out (REQ-DELEGATION-060, OUT-020): the delegated-edit receipt and run log are dropped. claudetto shall tell the agent to give an edit task the command that checks it, and to run that command when the report arrives, before it builds on it.
  Acceptance: AGENT_TEXT holds the rule. Verification: test.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

- [x] **OUT-276** Out (REQ-DELEGATION-061, OUT-020): the delegated-edit receipt and run log are dropped. claudetto shall write a run log line to `.claude/claudetto/runs.jsonl` for a subagent stop that was not blocked, after 3 root turns, with `rootEditedWithin3Turns`.
  Acceptance: the file gains a line per run. Verification: test.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

- [x] **OUT-277** Out (REQ-DELEGATION-062, OUT-016): run limits are removed and Claude Code keeps its own cap. claudetto shall launch no more than 20 concurrent subagents, Claude Code's cap, and queue the rest.
  Acceptance: a 21st worker waits for a free slot. Verification: demonstration.
  Basis: observed in transcript. Status: partial at 088a227c (`git grep -n -i concurrent 088a227c -- plugins` finds setup/changes.ts:108 writing CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS by plan tier; no queue that holds a 21st worker found).
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9309).

- [x] **OUT-278** Out (REQ-DELEGATION-064, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall make a worker return `blocked` to the lead, with the last error verbatim, after two failures with different causes on the same step, instead of retrying further.
  Acceptance: a staged worker whose step fails twice for two different reasons returns `blocked` and the error text; the lead, not the user, gets the report. Verification: test.
  Basis: read (repo agent file). REQ-DELEGATION-063 stands: this is a failure bound, not a turn limit. Status: missing at 088a227c.
  Source: druthulu/projectarchitect at edcc2b00, project-architect-3.0/agents/pa-coder.md; druthulu/projectarchitect at edcc2b00, project-architect-3.0/project-architect-3.0.md:147-148; reports/2026-11-18-research/repos.md:128.

- [x] **OUT-279** Out (REQ-DELEGATION-066, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall tell the lead, when the merged suite fails after parallel workers land, to find the breaking worker by merging worktree branches one at a time in a fixed order or by `git bisect run <test command>` with `--first-parent` on the integration branch, and not to re-run every worker's task.
  Acceptance: the lead text holds one sentence naming the bisect step; a fixture with three branches, one of which breaks another at a shared interface, ends with the lead naming that branch after at most two suite runs of the bisect. Verification: demonstration.
  Basis: reported (four commenters agree on a two-level gate: nearest tests per worker, full suite on the merged result; n=4, no measurement); `git bisect -h` lists `--first-parent` on git 2.56.1. Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudecode-comments-1xxt4ud-do-you-test-each-parallel-agen-20261117T224940Z.md:47,51,55,63 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xxt4ud/do_you_test_each_parallel_agents_task_on_its_own/>); reports/2026-11-18-research/dossier.md:61.

- [x] **OUT-280** Out (REQ-DELEGATION-067, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall end a review-and-fix loop when no high-impact finding remains, not when the review reports zero; the builder fixes high-impact findings and low findings only when the fix is trivial, applies no review-driven fix that adds more code than the finding justifies without telling the user, and the report gives the finding count per round and the lines added by the fixes.
  Acceptance: a staged loop whose reviewer keeps returning low findings stops after the high-impact ones are fixed; the report lists counts per round and lines added. A review-driven fix that raises complexity is reported, not applied silently. Verification: demonstration.
  Basis: reported (findings went 11, 4, 3, 1, 0 over five rounds on one migration; one commenter added 1,100 lines for a 50-line change; one user had auto-applied deep-review fixes make code far more complex, followed by a bad release; n=3 and n=1). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudeai-comments-1xyg28g-a-second-ai-reviews-every-risky-20261117T182230Z.md:29-33,41-49 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xyg28g/a_second_ai_reviews_every_risky_change_claude/>); external/2026-11-18/reddit.com-r-claudecode-comments-1xzdi6c-claude-code-is-design-to-make-20261118T120225Z.md:29-33 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xzdi6c/claude_code_is_design_to_make_you_dump/>); reports/2026-11-18-research/dossier.md:127,141.

- [x] **OUT-281** Out (REQ-DELEGATION-068, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall require a reviewer that reports zero findings to name the files and checks it examined, and shall run that review once more when the reply names none or is far shorter than the diff warrants.
  Acceptance: a staged reviewer reply of "nothing found" with no examined list is rerun once; a reply that lists files and checks is accepted. The check reads the reply structure, not word lists. Verification: test.
  Basis: reported (one commenter: a zero-finding reviewer reply can be a truncated reply; n=1). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudeai-comments-1xyg28g-a-second-ai-reviews-every-risky-20261117T182230Z.md:61 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xyg28g/a_second_ai_reviews_every_risky_change_claude/>); reports/2026-11-18-research/dossier.md:128.

- [x] **OUT-282** Out (REQ-DELEGATION-069, ADR-0177): reported or advice with no reproduction and no measured gain over vanilla. claudetto shall give the reviewer this checklist for what tests miss: duplicate helpers, swallowed errors, races and double submits, abstractions nobody requested, needless dependencies, and whether the change should exist at all.
  Acceptance: the reviewer prompt names each checklist item; a staged diff with a swallowed error and a duplicate helper gets both reported. Verification: demonstration.
  Basis: reported (three commenters; a reviewer skims after about ten clean diffs). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-developers-comments-1xv0f37-most-of-my-job-is-now-reviewin-20261113T192248Z.md:33-39,99-101,129-133 (url: <https://www.reddit.com/r/developers/comments/1xv0f37/most_of_my_job_is_now_reviewing_aiwritten_code/>); reports/2026-11-18-research/dossier.md:137.

- [x] **OUT-750** Out (REQ-DELEGATION-002, ADR-0177): the tool.describe cut saves about 1.2 KB of a cached prefix and changes no behaviour; no gain over vanilla was measured. claudetto shall keep the built-in AskUserQuestion with `multiSelect` and give it a one-sentence description through a `tool.describe` hook, with no wrapper tool, no deferral and no guard.
  Acceptance: the AskUserQuestion entry in the first request body is smaller than the stock 5,196 bytes; the tool still takes up to 4 questions and `multiSelect`. Verification: probe.
  Basis: measured, claude 2.1.318 and 2.1.327 (stock tool sends 5,196 bytes). ADR-0127 supersedes the `ask` wrapper design (ADR-0122): the wrapper lost multi-question calls and previews, and deferral made the model deny it had the tool (ADR-0169). Status: missing in the rebuilt plugin (no `tool.describe` code under plugins/claudetto/hooks). Still open: confirm `tool.describe` takes effect on 2.1.327.
  Source: ADR-0127; plugins/claudetto/hooks/features/delegation/delegation.ts:17@088a227c.

- [x] **OUT-751** Out (REQ-DELEGATION-009, ADR-0177): delegation conduct text ships only through an output style with a measured gain (ADR-0190), and none was measured. claudetto shall tell the lead to check each subagent or reviewer finding and do what the subagent skipped before it reports, in the root <delegation> text and in Concise rule 3; and shall instruct a lead that spawns workers to answer for every mistake a worker makes, to fix each one as its report arrives, and to resolve each item of a report list in parallel through workers.
  Acceptance: both texts hold the check instruction and the eval case check-relayed-findings passes; after a worker report names a defect, the lead's next action fixes it or briefs a worker to fix it, and the lead's final report names no worker defect left open. Verification: test and demonstration.
  Basis: cited; reported. Status: partial at 088a227c (git grep for relayed found nothing; the lead prompt says "Finish what each report left" in plugins/claudetto/hooks/features/prompt/texts.ts:32@088a227c; accountability for worker mistakes is missing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:92 (task 8.11); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/c5883be2-6429-490e-ac16-a07683670cd6.jsonl:318, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:1510, user decision, 2026-11-12.

- [x] **OUT-752** Out (REQ-DELEGATION-011, ADR-0177): worktree-isolation text has no measured gain over the stock Agent description (ADR-0190). claudetto shall tell the model to set `isolation:"worktree"` for committing agents.
  Acceptance: the Agent description says so; the hook passes `isolation` through unchanged; no agent definition sets `isolation` (a worktree holds the changes of a non-committing agent). Cause: agents committing in one tree block each other at pre-commit. In claude 2.1.326 a subagent isolated in a worktree refuses, in any repository, some Bash git commands that can rewrite branches shared with the checkout (release note). Verification: test.
  Basis: reported. Status: have at 088a227c (`plugins/claudetto/hooks/features/delegation/texts.ts:2@088a227c`). The `isolation` values `none` and `worktree` exist in a session launch schema of claude 2.1.327 (chunk-qz9vmqrb.js@7058); the Agent tool parameter is verified on 2.1.327: a live Agent tool schema (cc-inspect `code cli`, fake API) shows an `isolation` input with the enum `worktree` and `remote`, and agent frontmatter `isolation` runs in a temporary git worktree (chunk-m14bt1pz.js@1035004).
  Source: plugins/claudetto/hooks/features/delegation/texts.ts:2@088a227c; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **OUT-753** Out (REQ-DELEGATION-018, ADR-0177): brief-shape text ships only through an output style with a measured gain (ADR-0190), and none was measured. claudetto shall hold each agent message (Agent prompt or SendMessage) to the task, the inputs, the done-check, and only what the agent cannot find itself, one message per agent; shall have the lead brief each worker with the five Ws (who, what, where, when, why) in specific terms, so parallel workers do not drift apart; and shall write replies to a person in plain English.
  Acceptance: the delegation text states the five parts and tells the lead to include goal, files or area, limits, stop condition, and reason; measured plugin message 375 chars against 517 for base, Flesch-Kincaid 4.37 against 4.96. Verification: test and inspection.
  Basis: measured (plugin A/B) and observed in transcript (fresh `search` subagent about 5k tokens, `work` about 11k, cold start, 6 runs); user decision, 2026-11-12 (the five Ws). Status: have at 088a227c for the message form; missing for the five-Ws brief rule (`plugins/claudetto/hooks/features/delegation/texts.ts` holds no brief rule).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:325; plugins/claudetto/hooks/features/delegation/texts.ts@088a227c; openspec/specs/subagent-prompts/spec.md:28; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:1870, user decision, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:2755, user decision, 2026-11-12.

- [x] **OUT-754** Out (REQ-DELEGATION-027, ADR-0177): slice-size steering ships only through an output style with a measured gain (ADR-0190), and none was measured. claudetto shall steer the lead to give side agents small, short slices of work, to send out many bounded workers each with one task slice, and to keep tasks that run 40 to 50 minutes in its own session.
  Acceptance: The delegation rule text names small short slices as the unit of a subagent task and names a long task as one the lead keeps or splits; a task with several independent slices gets one bounded worker per slice, each with a stated limit. Verification: inspection and demonstration.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/agents/Artemis.md` and `hooks/features/delegation` hold no task-size rule).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:9, user decision, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:10068, user decision, 2026-11-12.

- [x] **OUT-755** Out (REQ-DELEGATION-046, ADR-0177): a Bash deny hook needs a paid trap-hang run to show a gain over vanilla, and no such run was made. claudetto shall make the agent check each background shell or task it starts, and stop its own stuck task, without the user asking for progress.
  Mechanism: in Claude Code 2.1.327, when a foreground Bash command reaches its timeout, Claude Code moves it to the background instead of killing it (chunk-m14bt1pz.js@3761763). Background tasks have a deadline (default 600 s, max 2 h) only in a non-interactive session: `Bbn()` is `Ev() && !backgroundDeadlineDisabled`, `Ev()` requires `!isInteractive()` (chunk-b9fe411w.js@50814, chunk-zfmsqnn9.js@10618), and the gate `tengu_cosmic_shore` (cached true for this account) applies on top. A `-p` run's Bash description states the deadline; this interactive session's does not. In an interactive session, claudetto's main mode, a hung task therefore runs until something stops it, and the agent wakes only on a completion notice that a hung process never sends. In OpenJoystickDriver session e82d87d1 the agent lost 32 minutes this way against a 60 s test limit. On `trap-hang` (5 headless runs per model and arm), vanilla left the timeout at its 120 s default and lost 254 s past the stated 60 s limit on Sonnet and 240 s on Opus. A prototype hook (`incident-lab/hangwatch/hangwatch.py`) that caps a test command's timeout at 90 s through PreToolUse `updatedInput` cut the loss to 120 s on Sonnet and 150 s on Opus. Its PostToolUse half was meant to tell the agent to read the output after a move to the background. It never fired in any headless or `tmux` run before claudetto2: it matched the sentence "was moved to the background", which only the model sees. The hook receives the structured result, which marks the move with `timedOutAfterMs` and `backgroundTaskId` (`tools` schema, `BashResult`). Every gain recorded here therefore comes from the cap alone. A PostToolUse hook for this requirement matches `timedOutAfterMs`. Every remaining loss is the 30 s between the cap and the limit. Two bounds are at work, and they do different jobs. The foreground timeout only moves a command to the background, and it never kills it, so a short foreground cap costs nothing. It stays at 90 s, or at the stated limit when that is shorter. On `trap-hang2`, the same trap with no stated limit (40 runs in the second batch), the 90 s cap held the hung test to 97–99 s on both models, against 126–142 s under vanilla's 120 s default. In every claudetto run the agent then read the code and stopped its own task with TaskStop. One vanilla Sonnet run (runs7/hang2-sonnet-vanilla-3.jsonl) reproduced the OpenJoystickDriver failure in miniature. It tried `pkill -f "unittest discover"`, and the sandbox refused it, because the matching processes belonged to parallel runs. It fixed the code and ended its turn at 134 s while its own hung task kept running, until the `-p` background deadline stopped it at 722 s. In an interactive session no deadline exists, so the task would have run indefinitely. TaskStop on the agent's own task id, never a pattern kill, is therefore part of this requirement. The interactive `trap-hang` arm (30 `tmux` runs, $4.13) reproduced both leaks without a `-p` deadline to end them:

- [x] **OUT-756** Out (REQ-DELEGATION-049, ADR-0177): the lead does not delegate by default (ADR-0190) and the stock Agent text already says to spawn only when needed. claudetto shall run the lead as a director that manages subagents doing the work and holds them to the plan and the end goal: the lead owns objectives, priority, goal, plan, integration, continuity, and final verification; subagents split by context, not problem type; delegates bounded work to named workers with durable handoffs; a committing worker gets a worktree; each report is checked; routine choices are autonomous and genuine user decisions go through `AskUserQuestion`; direct work wins for probes and small fixes and workers take multi-file parallel slices; Haiku has no delegation; the root model is opus-5-5[medium]. The root prompt holds a director role line.
  Decision: ADR-0190, the lead does not delegate by default.
  Acceptance: a delegated task returns a handoff to the root; the root model reads opus-5-5[medium]; workers cost 62k-126k tokens and 159-350 s per 80-500 lines (measured). Each worker is named for a Greek deity and leaves a durable handoff file the root reads. Verification: demonstration and inspection.
  Basis: measured (the worker costs); reported, one practitioner (roles: the orchestrator writes briefs, reads summaries, and runs the full suite; the user's draft of the director line, offered as an idea to look into); user decision, 2026-11-14. Status: partial at 088a227c (agents/, features/delegation, features/agent-model); the baseline root prompt was not compared for the role line. `AskUserQuestion` is present in claude 2.1.327 (code search, chunk-77827yq1.js@359).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:96; external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:13; user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19, reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (goal; two parallel Heracles workers with handoff files, 0 denials).

- [x] **OUT-757** Out (REQ-DELEGATION-065, ADR-0177): worker-lifetime text ships only through an output style with a measured gain (ADR-0190), and none was measured. claudetto shall end each worker when its slice is done and start a fresh worker for the next slice, so that no worker reaches auto compaction; a worker that would compact returns its handback instead. This bounds the slice, not the turns (REQ-DELEGATION-063 stands).
  Acceptance: over a dogfood day with at least 20 workers, no worker transcript holds a compaction, and the 90th percentile of worker requests is under 200. Verification: measurement of transcripts.
  Basis: measured (CTX-836: long-lived workers compacted up to 22 times and carried about 95% of subagent cost). Status: missing at 088a227c.
  Source: arc42/03_context_and_scope/subagents.md CTX-835, CTX-836; REQ-DELEGATION-027.

- [x] **OUT-758** Out (REQ-DELEGATION-070, ADR-0177): rule-pointer text ships only through an output style with a measured gain (ADR-0190), and none was measured. claudetto shall keep a rule whole when it reaches a worker: the lead's brief points at the rule's file and line (goal, CLAUDE.md, the agent file, project docs) instead of restating it, and a restated rule carries its scope and exceptions. A worker whose brief conflicts with its agent file, CLAUDE.md, or the goal follows the file and names the conflict first in its report. A rule with an exception narrowed into a flat ban in a brief is the failure this prevents.
  Acceptance: a demonstration where the brief says "no volatile" and the agent file says "drop volatile added only to reorder instructions; keep it where the original shows an access the compiler would otherwise drop" ends with the worker keeping the needed `volatile` and naming the conflict; the component ships only if it beats vanilla on that trap (ADR-0177). Verification: demonstration.
  Basis: observed in transcript (vanilla Claude Code, GodHand project: the lead's worker prompts shortened the goal's and `.claude/agents/decomp-worker.md`'s "drop wrong volatile" rule to "no volatile"; the D054 worker followed the brief, and a later worker reported "I used no volatile"). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/e96af8bb-9ea9-4910-a212-947da85b5dd5.jsonl:6895,6956.

#### Reply

- [x] **OUT-283** Out (REQ-REPLY-001, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry these prompt recipes as power phrases: ask "what information would you need" and "what tools would you build before solving" in one window, then solve in a new window; state what was wrong instead of rerolling; for a big task ask for a short plan first and read it before code.
  Acceptance: Each recipe appears once in the power phrases. The thread's "turn a paste into a skill on its third repeat" is not in the source; the source says skills pay for tasks you repeat. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (the plan holds plan-first, not the ask-needs-then-new-window step).
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xugxu4-how-do-i-prompt-good-20261112T231549Z.md:45,48,54,84 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xugxu4/how_do_i_prompt_good/>).

- [x] **OUT-284** Out (REQ-REPLY-002, ADR-0177): conflicting ask-count variants; the ask rule that stays is REQ-REPLY-140 with REQ-REPLY-089. claudetto shall, when the user asks, ask questions until a shared understanding exists, split the reply into what is known, what is still to verify, and the next action, and give a confidence level; the split stops an educated guess hardening into fact.
  Acceptance: The reply carries the three parts and a confidence level. Ask only when the answer changes something expensive to undo (plan rule). Verification: demonstration.
  Basis: reported (2 votes for the know-verify-next form). Status: missing at 088a227c (git grep for knowns found none).
  Source: external/2026-11-14/reddit.com-r-claudecoding-comments-1xrk02o-tldr-whats-the-one-prompt-yo-20261113T223628Z.md:55 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xrk02o/tldr_whats_the_one_prompt_you_keep_coming_back_to/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:532 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/>).

- [x] **OUT-285** Out (REQ-REPLY-003, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall end a feature by asking the agent "what did you decide, consider and not do, and why", over the choice classes: where data lives, server versus browser checks, money as cents or decimals, reuse or rewrite.
  Acceptance: The thread adds that a self-report misses silent defaults, so deterministic schema diffs and migration dry-runs back it up for silent defaults, missing auth checks, and broken migration assumptions. The thread's point that a separate agent should do the explaining is not in the source. Each feature has 3-5 real decisions. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (the plan lists judgment calls; no choice-class list or schema-diff backstop).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xv6dia-tip-from-someone-who-reviews-a-20261116T052047Z.md:29,75 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xv6dia/tip_from_someone_who_reviews_a_lot_of_ai_code/>).

- [x] **OUT-286** Out (REQ-REPLY-004, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall keep a rule that costs too much to follow small: split a 19,000-token rules file into an index plus one file per host and change the rule to "grep the index, then read the one file it names".
  Acceptance: A session loads only the file it needs; a rule that costs too much to follow gets dropped without notice. The file in the source is a ports file read before choosing a port. Verification: inspection.
  Basis: reported (one poster's analysis of 500 builder sessions). Status: missing at 088a227c (git grep for per-host found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwt6qe-a-poster-analyzed-500-builder-20261116T051511Z.md:122 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xwt6qe/a_poster_analyzed_500_builder_discussions_and/>).

- [x] **OUT-287** Out (REQ-REPLY-005, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall add a skill only after the same correction repeats, and measure with `/context` and `/skills` before and after an install.
  Acceptance: Skills with near-identical descriptions for one moment (Superpowers brainstorm and TDD against mattpocock spec-grilling and TDD) leave the pick to the wording; each description loads at session start. Verification: probe.
  Basis: reported (2 commenters). Status: missing at 088a227c (the plan states skill value, placement, and the disable-model-invocation cost, with no overlap rule).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx6lxa-do-coding-skills-make-claude-a-20261116T051025Z.md:129,131 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xx6lxa/do_coding_skills_make_claude_actually_better_or/>).

- [x] **OUT-288** Out (REQ-REPLY-006, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall write each prompt, rule, and hook text as the wanted output or replacement behaviour stated positively with examples, not as a NEVER, avoid, or banned-phrase list.
  Acceptance: No claudetto prompt text lists words or things to avoid without a positive example of the wanted output; no shipped rule or hook text bans a quoted phrase, and each names what to do instead (for example, acknowledge a correction with one word). Differs from the old plan: it scoped the positive definition to verbosity; this is a general prompt rule. Prompts and scorers name only the wanted behaviour, never the unwanted words. Verification: inspection.
  Basis: reported by commenters, 47 votes top; reported (the user pasted an argument that a negative constraint puts the banned tokens into context; no source URL given); user decision. Status: have at 088a227c (`git grep -n -i -E 'never|avoid|don't|do not|banned' 088a227c -- plugins/claudetto/hooks/features/prompt/texts.ts plugins/claudetto/output-styles` finds no hit)
  Source: external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:49 (url: <https://www.reddit.com/r/ChatGPT/comments/1tpk1qk/how_to_avoid_the_pink_elephant_paradox/>); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19, reported, user, 2026-11-13; user goal set through `/goal`, 2026-11-16 15:28 UTC, prompts name only the wanted behaviour (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:13); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).
  Conflict: Output Style Sentence Form (name the exact tic to ban).

- [x] **OUT-289** Out (REQ-REPLY-007, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall describe a trait or background tersely in a prompt ("morally upright without ever talking about it"), because more background in context means more leakage.
  Acceptance: A prompt that carries a persona or background holds one terse trait line, not lore or reference documents. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`git grep -i -E 'persona|lore|trait' 088a227c -- plugins` finds no prompt rule on trait length).
  Source: external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:107 (url: <https://www.reddit.com/r/ChatGPT/comments/1tpk1qk/how_to_avoid_the_pink_elephant_paradox/>).

- [x] **OUT-290** Out (REQ-REPLY-008, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall never leave two tasks waiting on the user at once: each task pauses at a decision point, the user reviews one at a time in set batch times, and a note records what was approved and what is checked next.
  Acceptance: At most one task is waiting on the user at any time. Verification: demonstration.
  Basis: reported, 4 comments. Status: missing at 088a227c (`git grep` for "waiting on the user" and "batch time" in plugins finds none).
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xbl19s-how-do-you-manage-reading-fatigu-20261021T201944Z.md:69 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xbl19s/how_do_you_manage_reading_fatigue/>).

- [x] **OUT-291** Out (REQ-REPLY-009, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall let the user read a report artifact without the model's reasoning, and shall prefer charts, diagrams, and proportional-font rich text over monospaced prose for glanceability.
  Acceptance: The user can ask for a report and read only it. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (`git grep` for "report artifact" and "proportional" in plugins finds none).
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xbl19s-how-do-you-manage-reading-fatigu-20261021T201944Z.md:94 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xbl19s/how_do_you_manage_reading_fatigue/>).

- [x] **OUT-292** Out (REQ-REPLY-010, ADR-0107 and OUT-008): no open-items Stop check ships and `open-items.ts` goes. claudetto shall let the open-items Stop hook accept one fenced sh block as the item for a command the user runs in a separate terminal, and parse Markdown list items and fenced blocks.
  Acceptance: a reply whose open item is one fenced sh block passes; a list item passes; a fenced block with two commands is not one item. Verification: test.
  Basis: cited. Status: missing at 088a227c (git ls-tree finds no open-items file; git grep for "open items" and "what i need" finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:48 (D10.9, task 6.2).

- [x] **OUT-293** Out (REQ-REPLY-012, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall tell the agent to state the mechanism in one or two sentences, how it works and not what it will do, before any code exists.
  Acceptance: the reply guidance text holds the rule. Verification: inspection.
  Basis: reported practice. Status: missing at 088a227c (git grep for "mechanism" in rules, reply, prompt: no hit).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcnaru-we-measured-how-60-engineers-dir-20261024T061824Z.md:39 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcnaru/we_measured_how_60_engineers_direct_ai_coding/>).

- [x] **OUT-294** Out (REQ-REPLY-013, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall guide the agent to store each number in one claims file as claim, section or page, the source line itself, then the link, and to use only claims in that file; the check rereads that spot, so "nothing to paste" yields "couldn't verify". When a source changes, every entry is reread and an entry the source no longer backs is marked unsupported with the reason and cannot be used.
  Acceptance: a number with no stored source line is reported as unverified; an entry marked unsupported is refused. Verification: test.
  Basis: reported practice. Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcjrzg-my-one-rule-for-claude-no-number-20261024T061809Z.md:113,117 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcjrzg/my_one_rule_for_claude_no_number_goes_in_unless/>).

- [x] **OUT-295** Out (REQ-REPLY-014, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall guide the agent to label every number it calculated itself "our arithmetic" with its inputs shown, so a derived figure never passes as sourced. A CLI calculator skill that logs full equations is the stronger form.
  Acceptance: a derived figure in a reply carries the label and its inputs. Verification: demonstration.
  Basis: reported practice. Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcjrzg-my-one-rule-for-claude-no-number-20261024T061809Z.md:77,121,125,129 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcjrzg/my_one_rule_for_claude_no_number_goes_in_unless/>).

- [x] **OUT-296** Out (REQ-REPLY-015, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall guide a teaching reply to list prerequisites by a depth cap (SHORT 1, NORMAL 2, LONG 3), order them by post-order DFS, ask check questions and then STOP without the answers in the same message, and answer a follow-up from a new angle, not in the same words.
  Acceptance: a teaching reply ends at its check questions with no answers; a follow-up uses a new analogy. Verification: demonstration.
  Basis: reported template; tested by one commenter on Sonnet at medium, not beyond. Status: missing at 088a227c (git grep for teach, glossary, prerequisite: no hit).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcpua5-is-sonnet-55-bad-at-explaining-s-20261023T040445Z.md:122,181,221,300,313 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcpua5/is_sonnet_55_bad_at_explaining_stuff/>).

- [x] **OUT-297** Out (REQ-REPLY-016, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall guide the agent to preface its answer to a vague description with "the industry standard term for this is ...", and to flag its confidence in the term.
  Acceptance: the reply to a vague description names the standard term and a confidence flag. Verification: demonstration.
  Basis: reported opinion. It is said to raise prompting skill and constrain inventive drift. Counterpoints: forcing standard terms yields clichés (line 42, line 94); the named term may be the trendiest, not the most precise (line 202). Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcx3td-do-yall-nondev-vibecoders-implem-20261024T063457Z.md:25,29,42,94,202 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcx3td/do_yall_nondev_vibecoders_implement_any_kind_of/>).

- [x] **OUT-298** Out (REQ-REPLY-017, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall guide the agent to end a reply with one plain-word line on what it touched and why, and with "what would break first if 100 people used this?".
  Acceptance: a reply that changes files ends with both lines. Verification: demonstration.
  Basis: reported. The FEYNMAN.md memory style named in the same thread is an unexplained idea (opinion). A running glossary file is a separate suggestion in the same thread (line 202). Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcx3td-do-yall-nondev-vibecoders-implem-20261024T063457Z.md:180,188,198 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcx3td/do_yall_nondev_vibecoders_implement_any_kind_of/>).

- [x] **OUT-299** Out (REQ-REPLY-019, ADR-0108 and ADR-0104): no Stop-time model call or register question judges the opener. claudetto shall block a final reply whose first sentence opens with agreement, praise, or apology, through a prompt-type Stop hook.
  Acceptance: a reply opening "You're right", "Great point", "Good catch", "I apologize", or "Sorry" is blocked once with the reason "start with the substance, name the error and the fix"; only the first sentence is judged; the cost is one small call per turn end. Verification: test.
  Basis: reported. Status: partial at 088a227c (prompt text `plugins/claudetto/hooks/features/prompt/texts.ts:15`; the Stop hook is missing). `Stop` is present in claude 2.1.327 (hook event list, `chunk-ja5z738t.js@5623`). Counts (other source, n=1): in about 1,900 sessions "you're right" 175 times, "absolutely right" 13; replies opened with agreement 4x as often as disagreement. The agent built this hook itself after answering a correction with "You're right" (session e473653f). The specs disagree on the judge call; see the ADR on the opener check.
  Source: external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:47; external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:40; openspec/specs/agent-conduct/spec.md:160.
  Conflict: Disputes and Openers (check the claim; no Stop-time model call judges the opener).

- [x] **OUT-300** Out (REQ-REPLY-021, ADR-0108 and ADR-0104): no Stop-time model call or register question judges the opener. claudetto shall ship a register question on Stop only when precision and recall are both at least 80% on stored cases.
  Acceptance: shipped and blocking: `apologizes_or_agrees`, `states_feeling_or_praise`, `repeats_person`, `names_own_mistake_without_result`, `steps_listed_as_report`. Held, scored and non-blocking: `claim_without_shown_check` (25/100), `question_unanswered`, `doable_step_left`, `choice_handed_to_person`. A yes blocks once; no, unsettled, or a failed Decider passes. Verification: test.
  Basis: measured (24 cases, thin). Status: partial at 088a227c (`plugins/claudetto/hooks/features/decide/`, `plugins/claudetto/hooks/features/reply/`; the cited `classic.Stop/useStopChecks/register.ts` does not exist).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:865; openspec/specs/claim-check/spec.md:162; openspec/specs/claim-check/spec.md:176.
  Conflict: Disputes and Openers (check the claim; no Stop-time model call judges the opener).

- [x] **OUT-301** Out (REQ-REPLY-023, ADR-0104 and product rule no regex Stop check): it parses `! <command>` text from the reply; the SLICE_COMMIT part is settled by ADR-0186. claudetto shall, at Stop and SubagentStop, block a reply or subagent final report that tells the user to run a command naming a file the agent never wrote, and block a Stop with uncommitted session work through `SLICE_COMMIT`.
  Acceptance: (a) before a reply or subagent final report, each absolute or `~/` path in a `! <command>` step must exist, else the Stop blocks once and names the path and the command; `mkdir -p`, `cp` and `git clone` destinations, redirect targets, and relative paths pass; after one block the reply passes; a `! cat /no/such/file` step blocks once with the path named and the next reply passes. (b) The Stop blocks once with `SLICE_COMMIT` when files this session's file tools wrote are uncommitted, listing them and asking one revertable commit per finished slice: it fires on the first Stop only (`{ stop_hook_active: false }`), after every other Stop check passed; it asks the permission chain about `git commit` first, so a deny rule turns it off; files come from the content hash each agent write left (`git hash-object`, no mark in the file), wherever the file lives; after each Bash call one `git status --porcelain -z -uall` and one batched `git hash-object` sweep the cwd's repo; failing work stays uncommitted with a reason; it skips in a headless session whose commit check answers ask or deny, on `stop_hook_active`, and for files under `.claude/worktrees/`; it raises when ask applies and someone can answer; not handled: a user edit between two sweeps, a Bash edit in another repo. (c) The same check runs at SubagentStop, because a lead passed an unchecked subagent report naming an unwritten file (the user got "Module not found"). Verification: test.
  Basis: measured (live subagent probe, Haiku) and reported. Status: missing at 088a227c (`git grep -n -i -E 'no such|existsSync|statSync|exists' 088a227c -- plugins/claudetto/hooks/features/reply` and `git grep -E 'SLICE_COMMIT|KEEP_ANSWER' 088a227c -- plugins` find nothing; the one input item that called the path check partial cited only the `/reply` feature). `Stop` and `SubagentStop` are present in claude 2.1.327 (hook event list, `chunk-ja5z738t.js@5623`). The spec's skip when the ledger holds `no-commit` is left out: the constraint ledger is dropped (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: openspec/specs/run-limits/spec.md:178; openspec/specs/run-limits/spec.md:207; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:361; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:449; openspec/changes/archive/2026-11-09-release-2-1-319/specs/run-limits/spec.md:118.
  Conflict: Conduct (end the turn on a reply that hands the user a step; no Stop check blocks it).

- [x] **OUT-302** Out (REQ-REPLY-031, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall hold the agent to these behaviours (paraphrased): smallest diff; abstract at the third repeat; loud failures; comments give the why; search existing code first; never weaken a test or limit without consent; lead with the outcome; report the check command, exit code, and denominator; name edge cases; no agreement, praise, or apology opener; no promise of future behavior; do routine reversible in-scope work unasked; a turn ends only done, blocked, or waiting; a block is final for that action; change position only on named new evidence; read state from the repo; corrections survive compaction.
  Acceptance: each behavior has a rule file or prompt line that a test or inspection names. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/rules/useEdgeCaseReport`, `useBlockLanguage`, `noUnrequestedEdits`).
  Source: external/please-use-me-often/agent-terms/AGENTS.snippet.md:3; external/please-use-me-often/agent-terms/DELEGATION-AGREEMENT.md:28; external/please-use-me-often/agent-terms/RULES-OF-ENGAGEMENT.md:93; external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:38.

- [x] **OUT-303** Out (REQ-REPLY-034, ADR-0182): the plain-English rule with checkable features replaces sentence-form and prose-contract rules. claudetto shall write replies with the actor as the subject and its own verb, each clause spelled out ("The check shows a gap. Task 4.3 fixes it." passes; "The check surfaces a gap that the plan wants to address" fails: animate verb, inanimate actor); each rule leads with what to do; a negation only inside a sentence naming the act to bound it; no bare prohibition with never, don't, do not, without, avoid, nothing, none, or nor. The `<register>` block: write the fact, the corrected result, the next step; a mistake as error and cause; the check behind each claim; an answer to the question asked; each step the agent can take itself, done; only done steps as a report; a choice the agent can make, made and named; after a remark, notice, or reply already on screen, only what is new. Also: answer first, severity levels for findings, one bullet is one idea in one sentence, work at full depth and lead with the result, decision cards with a recommended default, name the exact tic to ban (negative parallelism, stacked "No X." lines, closing "Just.", excess colons, "quietly", "silently") because "write naturally" avoids nothing; match format to question type; when drift returns after some turns, add a short example and a concrete format ("decision first, three bullets, details on request") and re-check several turns in.
  Acceptance: a held-out reply set passes a rule check for animate verbs and bare prohibitions. Verification: test.
  Basis: reported (output-style drift, tic list) and checked rule text. Status: partial at 088a227c (`plugins/claudetto/output-styles/Concise.md`, `hooks/features/reply/reply.ts`, `prompt/compose.ts`).
  Source: openspec/specs/agent-facing-text/spec.md:8; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:130; external/2026-10-02/export-My -anti Claude-speak- system prompt.jsonl:3 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wc7tn7/my_anti_claudespeak_system_prompt/>).
  Conflict: Positive Prompting (write each prompt as the wanted output or replacement behaviour, with no banned phrase).

- [x] **OUT-304** Out (REQ-REPLY-035, ADR-0104 and product rule no Stop claim grader): no grader block exists to word. claudetto shall end each Stop block that asks for a reply again (grader, unread-grade, slice-commit, register blocks) with `KEEP_ANSWER` (the screen keeps the blocked reply; a full resend shows one report twice in two wordings that can disagree). Blocks that name lines to move or delete (ask form, command form, missing file, agree opener) name the edit and carry no `KEEP_ANSWER`. For a waited-on background task the Stop note sends the last reply nowhere again and tells the model to follow output with Monitor filtered to step and error lines. A SendMessage result shows on screen from the tool result; no hook writes it into a reply.
  Acceptance: the grader block text ends with `KEEP_ANSWER`; the ask-form block text does not. Verification: test.
  Basis: reported. Status: missing at 088a227c (`git grep KEEP_ANSWER` finds nothing under `plugins/`; `hooks/features/stop-notice/` exists). `Monitor` is present in claude 2.1.327 (tool list, `chunk-77827yq1.js@578`). Release note 2.1.327: Monitor now tells Claude when a watch expires with no events and its command wrote to stderr, and which file holds the output.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:366; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:794; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/agent-conduct/spec.md:131; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **OUT-305** Out (REQ-REPLY-038, ADR-0184 and ADR-0177): a failed unattended stop is the driver's job and Claude Code's native Notification covers the rest; no measured gain. claudetto shall call `$.ui.notify` from one hook on a failed unattended stop, leave `permission_prompt`, `idle_prompt`, and `elicitation_dialog` to the native channel, and never notify from a `classic.Notification` or a `ui.notify` handler (it echoes without end and the engine does not stop it).
  Acceptance: a test asserts no notify call from a `classic.Notification` or `ui.notify` handler. Verification: test.
  Basis: measured and reported. Status: have at 088a227c (`plugins/claudetto/hooks/features/stop-notice/`). `Notification` is present in claude 2.1.327 (hook event list, `chunk-ja5z738t.js@5501`), and `ui.notify` is present in 2.1.327 (`chunk-dafpvz32.js@3356`).
  Source: openspec/specs/run-limits/spec.md:164; openspec/changes/2-1-325-rearchitecture/design.md:150; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:68.
  Conflict: Fable Review And Notification (send a notification when a session ends).

- [x] **OUT-306** Out (REQ-REPLY-039, ADR-0177): conflicting ask-count variants; the ask rule that stays is REQ-REPLY-140 with REQ-REPLY-089. claudetto shall, before a broad build, ask up to 3-5 questions, restate the task, name the smallest file to touch and what will not change, and wait for go; it asks only when the answer is costly or impossible to undo. "Try once, then ask" resolves the tension with over-deferral.
  Acceptance: a broad task prompt gets 3-5 questions and a restatement before a write; a targeted task gets none. Verification: demonstration.
  Basis: reported (prompt counts n=27, 5, 4, 6; n=3). Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/conduct.jsonl:36; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:52.
  Conflict: Concise Output (ask one clarifying question, then proceed).

- [x] **OUT-307** Out (REQ-REPLY-046, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry the rule that each job has one way to be done, for code, docs, and UI alike, shall have an agent remove a duplicate entry or field when another already covers its job, build each rebuild from a clean slate, delete the replaced path with its tests, settings, and docs, and stop with an error naming the install step when a required tool is missing.
  Acceptance: the shipped rules include `useOneObviousWay.md` with all four parts; an agent that finds two menu entries for one action, or a field its status already shows, removes one; an issue or PR template serves human and AI in one text, not two copies. Verification: inspection.
  Basis: reported, user. Status: partial at 088a227c (`git show 088a227c:plugins/claudetto/rules/useOneObviousWay.md` is one sentence: one way per job, and a maintained tool or list is used and the copy deleted; it holds no clean-slate rebuild, no replaced-path deletion with tests, settings, and docs, and no missing-tool error).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/c86d66a7-7a97-4977-b893-7d36de6eca0f.jsonl:11161, user report, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:11323, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19, user decision, 2026-11-13; plugins/claudetto/rules/useOneObviousWay.md:1@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424 (the user's pause and order); [ADR-0046](../adr/0046-rebuild-clean-slate.md).

- [x] **OUT-308** Out (REQ-REPLY-047, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall have an agent read maintained ecosystem lists and industry practice before it picks a library, a name, or a design, and use industry-standard terms instead of the user's own wording.
  Acceptance: given a maintained package list in the session, the agent reads it before choosing libraries; names and directories use domain terms, not the user's casual words. Verification: demonstration.
  Basis: reported, user. Status: partial at 088a227c (`plugins/claudetto/rules/lookForClone.md:1` covers existing code, not outside lists or terms).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/005f897e-696d-45c7-8536-2d1019b8ec96.jsonl:7126, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:2755, user decision, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/1aab3c4c-5aef-4ee2-9d3e-3723fd904152.jsonl:1095, user decision, 2026-11-12.

- [x] **OUT-309** Out (REQ-REPLY-048, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry style rules for agent code: headlinese identifiers, tests laid out as Arrange, Act, Assert with section comments, test assertions on behaviour a caller observes and not on implementation, plain-English doc comments, and no docs-related text in code comments.
  Acceptance: the shipped rules hold each of these; a test an agent writes has the three section comments and no assertion on private detail. Verification: inspection.
  Basis: reported, user. Status: partial at 088a227c (`useHeadlineseNames.md`, `useTestPatterns.md`, `commentOnlyWhy.md` exist; no rule bars docs text in comments).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:1870, user decision, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:2755, user decision, 2026-11-12.

- [x] **OUT-310** Out (REQ-REPLY-052, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall write each notice to the user as one line in the first lines of the next message: `TYPE: what happened, the clause ID, what it changed, what is needed from the User (if anything)`.
  Acceptance: a notice has the `TYPE:` lead and the four slots. Verification: inspection.
  Basis: cited, terms clause T8.1 text. Status: partial at 088a227c (`features/stop-notice/` exists; `git grep clause` finds no clause-ID slot in `plugins/claudetto/hooks`).
  Source: external/please-use-me-often/agent-terms/TERMS-AND-CONDITIONS.md:141.

- [x] **OUT-311** Out (REQ-REPLY-054, ADR-0177): conflicting ask-count variants; the ask rule that stays is REQ-REPLY-140 with REQ-REPLY-089. claudetto shall, when two or more reasonable approaches change the result or an assumption would materially change the solution, stop and ask, and otherwise pick the smallest reversible change and list its assumptions at the end, so they can be scanned in seconds; stack and repo commands stay in project instructions.
  Acceptance: a finished task ends with an assumptions list; a task with a solution-changing assumption gets a question, a task without one gets the smallest reversible change and a stated assumption; the agent front-loads the reason in the first message (the model fills missing context with the worst case), asks a doubt once with the useful facts, declines at most once and briefly, and reconsiders on new facts, saying whether the answer changes. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/decide/texts.ts:49` is `DECIDE_GIVE_BACK` ("state the assumption, or put it to the user with `AskUserQuestion`"), checked with `git show 088a227c:plugins/claudetto/hooks/features/decide/texts.ts`; no end-of-task list).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xeeclc-anyone-else-noticed-claude-makin-20261028T060729Z.md:79 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xeeclc/anyone_else_noticed_claude_making_weird_decisions/>); openspec/specs/agent-conduct/spec.md:31; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:47; external/2026-11-10/reddit.com-r-claudeai-comments-1xryurq-whats-that-one-instruction-in-yo-20261110T093205Z.md:113 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xryurq/whats_that_one_instruction_in_your_claude/>); plugins/claudetto/hooks/features/decide/texts.ts:49@088a227c.
  Conflict: State Assumptions (state assumptions and wait for them to be resolved).

- [x] **OUT-312** Out (REQ-REPLY-055, ADR-0111): the evidence-before-reversal rule is the option chosen to test first; this hook is an untested candidate. claudetto shall phrase an anti-sycophancy instruction as a checkable behavior ("before agreeing, list the two strongest objections"), keep it in project instructions and not in turn 1, and add a UserPromptSubmit hook so it stays recent.
  Acceptance: the hook text holds the checkable wording on each prompt. Verification: inspection.
  Basis: reported (objections soften before they vanish, from about message 30-40). Status: missing at 088a227c.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xft259-if-your-challenge-my-assumptions-20261028T061202Z.md:74 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xft259/if_your_challenge_my_assumptions_instruction/>).

- [x] **OUT-313** Out (REQ-REPLY-056, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall offer, after a long session, a quiz of the model on what it did wrong, what it could do better, and what could be pulled into a skill.
  Acceptance: the quiz prompt names those three questions. Verification: demonstration.
  Basis: reported, one user (another notes the answer depends on how the question is framed). Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xdphff-am-i-really-supposed-to-outsma-20261024T061449Z.md:87 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xdphff/am_i_really_supposed_to_outsmart_claude_to_avoid/>).

- [x] **OUT-314** Out (REQ-REPLY-057, ADR-0177): conflicting ask-count variants; the ask rule that stays is REQ-REPLY-140 with REQ-REPLY-089. claudetto shall tell the model to ask at most 5 questions about audience, format, and constraints before it begins, not a general "ask me any questions".
  Acceptance: a reply to an open task holds at most 5 questions, each on audience, format, or a constraint. Verification: test.
  Basis: reported, no measure. Status: partial at 088a227c (`plugins/claudetto/hooks/features/decide/texts.ts:49` asks questions through `AskUserQuestion` with no cap).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrtmvs-asking-claude-what-do-you-need-t-20261109T151940Z.md:50 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrtmvs/asking_claude_what_do_you_need_to_know_before/>).
  Conflict: Concise Output (ask one clarifying question, then proceed).

- [x] **OUT-315** Out (REQ-REPLY-058, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall tell the model to name the files it will touch before it edits across a few files, and to fix the plan first when that list misses one.
  Acceptance: the plan turn lists the files before the first edit; a file edited outside the list sends the model back to the plan; a change run opens with a file list. One commenter says the list caught a few wrong guesses before they became a mess. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrvnbi-what-is-the-best-way-to-learn-an-20261110T094238Z.md:77 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrvnbi/what_is_the_best_way_to_learn_and_make_the_most/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xk277d-how-often-has-a-coding-agent-don-20261031T105244Z.md:90 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xk277d/how_often_has_a_coding_agent_done_something_you/>).

- [x] **OUT-316** Out (REQ-REPLY-059, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall tell the model to write TO FILL IN for information that is not in what the user gave, and not to guess it.
  Acceptance: given a task whose input lacks a price, the reply holds TO FILL IN at that place and no invented value. Verification: test.
  Basis: reported, inferred reasoning (a checkable condition, was it in the message, works where "say so if unsure" fails because the model cannot tell when it guesses). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xryurq-whats-that-one-instruction-in-yo-20261110T093205Z.md:42,156 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xryurq/whats_that_one_instruction_in_your_claude/>).

- [x] **OUT-317** Out (REQ-REPLY-060, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall steer output away from generic defaults with 3 to 5 examples that vary enough to avoid unintended patterns, not with an instruction such as "avoid a generic AI look".
  Acceptance: a style prompt holds 3 to 5 varied examples and no generic-avoidance instruction; one example is not accepted. Verification: inspection.
  Basis: cited (Anthropic's Opus 5.5 prompting guide and prompting docs, second-hand) and reported (scout of about 100 candidates, about 10 marked good with reasons, feedback saved at three levels: skill main file for all runs, per-type reference file, per-project folder, with a catalog index the scout reads first). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs4oh8-how-we-stopped-getting-generic-o-20261110T094228Z.md:29,31,35,37 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs4oh8/how_we_stopped_getting_generic_output_from_claude/>).

- [x] **OUT-318** Out (REQ-REPLY-062, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall keep a project glossary: the model uses no language from it except as defined and none outside it when the glossary can serve; a separate pass reviews glossary adherence; plans name each function and class in backticks and a later step that swaps in a synonym is flagged.
  Acceptance: a reply that swaps a defined term for a synonym is flagged by the review pass; a rename is not reported as a missing feature. Verification: test.
  Basis: reported (one commenter; grows over the project). Status: missing at 088a227c.
  Source: external/2026-11-11/reddit.com-r-claudeai-comments-1xqp2l0-sick-of-semantic-substitution-20261110T172348Z.md:61,69 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqp2l0/sick_of_semantic_substitution/>).

- [x] **OUT-319** Out (REQ-REPLY-063, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall ship an output style that forbids literary, essayist, and journalistic techniques, metaphors, and synonyms and demands term consistency.
  Acceptance: the style text holds each ban and the term-consistency rule. Verification: inspection.
  Basis: reported, one user (largely fixed synonym drift and vague allusions). Status: partial at 088a227c (`plugins/claudetto/output-styles/Concise.md` exists; it holds none of these bans).
  Source: external/2026-11-11/reddit.com-r-claudeai-comments-1xqp2l0-sick-of-semantic-substitution-20261110T172348Z.md:139 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqp2l0/sick_of_semantic_substitution/>).

- [x] **OUT-320** Out (REQ-REPLY-064, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall tell the model to list what could break before it writes anything, and shall keep gates that update with each feature or fix; with smaller chunks and more oversight when a change's fallout stops being handled.
  Acceptance: a plan holds a break list before the first write; a gate exists for each fix. Verification: test.
  Basis: reported, one author (catches more). Status: missing at 088a227c.
  Source: external/2026-11-13/reddit.com-r-claude-comments-1xtwd6q-opus-55-now-unable-to-foresee-futu-20261111T234828Z.md:37,49 (url: <https://www.reddit.com/r/claude/comments/1xtwd6q/opus_55_now_unable_to_foresee_future_problems/>).

- [x] **OUT-321** Out (REQ-REPLY-065, ADR-0177): conflicting ask-count variants; the ask rule that stays is REQ-REPLY-140 with REQ-REPLY-089. claudetto shall tell the model to state its assumptions and uncertainties and to wait for them to be resolved before it proceeds, unless told to proceed on them.
  Acceptance: a reply with an open assumption stops and waits unless the prompt says to proceed. Verification: test.
  Basis: reported, one author. Status: partial at 088a227c (`plugins/claudetto/hooks/features/decide/texts.ts:49` states the assumption or asks).
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xsv2s0-unconvinced-by-claude-fable-52-20261112T231528Z.md:196 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsv2s0/unconvinced_by_claude_fable_52/>).
  Conflict: Assumptions (pick the smallest reversible change and list the assumptions at the end).

- [x] **OUT-322** Out (REQ-REPLY-066, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall run a rewrite pass with per-character voice and avoided monotone rhythm, and shall require an artifact that lists each change with before, after, and reason, then an overview table.
  Acceptance: a rewrite pass returns the change artifact and the table. Verification: demonstration.
  Basis: reported, one author. Status: missing at 088a227c.
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xu92kx-what-does-claude-really-suck-at-20261112T231534Z.md:68,70,80 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xu92kx/what_does_claude_really_suck_at/>).

- [x] **OUT-323** Out (REQ-REPLY-068, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry a rule that, before writing a change, the agent names how it would prove the change wrong (a test or case), which becomes the acceptance check; after more than two failed fix attempts it writes three lines of what it now believes about the bug before the next try.
  Acceptance: the rule text holds both steps. Verification: inspection.
  Basis: reported, one user (half the time the belief is wrong). Status: missing at 088a227c.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:323 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/>).

- [x] **OUT-324** Out (REQ-REPLY-071, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry a UI-work rule: give realistic data (long names, missing values, mixed statuses) before asking for a layout, and ask to make the most frequent task easy to reach, then style that screen.
  Acceptance: the rule text holds both steps. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:99 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/>).

- [x] **OUT-325** Out (REQ-REPLY-072, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry a UI-work rule: the generic look comes from equal visual weight (same card size, padding, shadow); make the one number or action that matters twice as big and quiet the rest.
  Acceptance: the rule text holds the visual-weight rule. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:59 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/>).

- [x] **OUT-326** Out (REQ-REPLY-073, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry a taste-elicitation step for UI work: sort about 30 screenshots on a 5-point dislike-to-like spectrum, or describe the vibe and have Claude spike a few directions, pick one, iterate; build the concept visually elsewhere first.
  Acceptance: the rule text holds the step. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:83,125 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/>).

- [x] **OUT-327** Out (REQ-REPLY-074, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry a UI-work step for a user without design vocabulary: prompt 'Interview me to develop a comprehensive brand kit and style guide'; a design-system file (Figma tokens or one derived from a liked site) is declared binding for all UI.
  Acceptance: the rule text holds the interview step and the binding design-system file. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:244 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/>).

- [x] **OUT-328** Out (REQ-REPLY-075, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry a rule that a long spec opens with 'Before you write any code, suggest improvements, ideas and opinions, and correct my mistakes and misunderstandings'.
  Acceptance: the rule text holds the opening line. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:206 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/>).

- [x] **OUT-329** Out (REQ-REPLY-076, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry a UI-consistency rule: decide design once (one component library, a tokens file with 2-3 colors, one font, one spacing scale, one radius, a CLAUDE.md rule to use only those); give reference screenshots plus a REFERENCES.md instead of adjectives; build one representative screen first and review desktop and mobile screenshots before the rest; one icon set; motion only for game-state changes at 200-300 ms with prefers-reduced-motion.
  Acceptance: the rule text holds each step. Verification: inspection.
  Basis: reported, advice from commenters, low relevance to a plugin core. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xm5lz3-what-toolsplugins-do-you-use-wit-20261109T152902Z.md:30-44 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xm5lz3/what_toolsplugins_do_you_use_with_claude_code_to/>).

- [x] **OUT-330** Out (REQ-REPLY-077, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall offer a self-critique wrapper: restate the task, solve, assume the answer is wrong and find the single likeliest error, fix, then give the final answer plus a low, medium or high confidence and the one assumption that would break it; use it only when something smells off, because the assume-wrong step invents problems.
  Acceptance: the wrapper text holds the five steps and the use limit. Verification: inspection.
  Basis: reported, 11 votes. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:50,109-113,195 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/>).

- [x] **OUT-331** Out (REQ-REPLY-078, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry a rule: 'Before you change anything, explain back what you think I'm asking and list what you are NOT going to touch', which catches misread requirements before code.
  Acceptance: the rule text holds the restatement and the not-touch list. Verification: inspection.
  Basis: reported, 24 votes. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:195 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/>).

- [x] **OUT-332** Out (REQ-REPLY-079, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall make the agent state why before it acts, so a human review of the action is fast and meaningful.
  Acceptance: a change the agent proposes carries its reason before execution. Wrong AI conclusions come with good justifications, so reviewers accept plausible ones; the trace helps review but does not replace it. Verification: inspection.
  Basis: reported, commenters. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-anthropic-comments-1xhodax-interesting-anthropic-study-20261028T190543Z.md:39,75 (url: <https://www.reddit.com/r/Anthropic/comments/1xhodax/interesting_anthropic_study/>).

- [x] **OUT-333** Out (REQ-REPLY-080, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall have the agent list the exact queries it ran before it answers a high-stakes research question, and tell the user to open every cited source.
  Acceptance: a research answer lists its queries. One user ran the logged query on 14 engines and the found article appeared on none; the same terms on Google often give different results. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xf6n0i-which-search-engine-does-claude-20261029T172437Z.md:41 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xf6n0i/which_search_engine_does_claude_use/>).

- [x] **OUT-334** Out (REQ-REPLY-081, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall have the agent weigh the real stakes before it raises a concern, and give a small-stake situation no warning or long explanation.
  Acceptance: a reply to a small-stake action holds no warning block. Verification: demonstration.
  Basis: reported, one thread, model self-report. Status: missing at 088a227c.
  Source: external/2026-10-31/reddit.com-r-claude-comments-1xevazp-necessary-interaction-rules-create-20261031T083808Z.md:33 (url: <https://www.reddit.com/r/claude/comments/1xevazp/necessary_interaction_rules_created_for_opus_by/>).

- [x] **OUT-335** Out (REQ-REPLY-082, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall have the agent, before any analysis of a judgment call, list every fork where a reasonable analyst could go either way and what each option changes, and recommend nothing; and shall offer the user a way to write their own call down before asking.
  Acceptance: the fork list appears before any recommendation and the writeup shows which calls were inherited. Commenters give the reason: a second adversarial review still hands over another recommendation to anchor on; the poster lists adversarial prompts ("poke holes", "give three reasons this is the wrong call") and a debate subagent, anecdotal. Verification: demonstration.
  Basis: reasoned, commenters; reported, anecdotal. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xj3qdv-anthropic-gave-50-analysts-claud-20261030T102902Z.md:57,59,202,226,250,252,268 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xj3qdv/anthropic_gave_50_analysts_claude_code_with_a/>).

- [x] **OUT-336** Out (REQ-REPLY-083, ADR-0182): the plain-English rule with checkable features replaces sentence-form and prose-contract rules. claudetto shall give the reply style a contract up front (plain words, no metaphors unless asked, short declarative sentences, delete any sentence whose loss drops no information) and shall accept a sample of the user's own writing to match.
  Acceptance: the style rules hold the contract and a way to supply a sample. One commenter reports that a sample calibrates faster than abstract rules, that a skill in the Google developer documentation style fixed Opus 5 prose, and that a list of annoying phrases the model rotates out helps; the commenter's cause, RLHF raters preferring "considered" prose, is inferred. Verification: demonstration.
  Basis: reported, anecdotal; inferred (cause). Status: missing at 088a227c.
  Source: external/2026-10-31/reddit.com-r-claude-comments-1xf2o8a-why-does-claude-write-in-such-conv-20261031T083623Z.md:222,262,278 (url: <https://www.reddit.com/r/claude/comments/1xf2o8a/why_does_claude_write_in_such_convoluted_sentences/>).

- [x] **OUT-337** Out (REQ-REPLY-084, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall have the agent, when it debugs an answer, argue against its own conclusion before it improves the answer, and compare the broken case with a tiny known-good example before it proposes a fix.
  Acceptance: the argument names the assumption that would make the answer wrong, and a known-good example sits beside the broken one. One commenter says the useful part is whether the model can name that assumption, not whether it changes its mind. Verification: demonstration.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:131,133 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xl9c92/forget_the_usual_claude_tips_what_are_the_strange/>).

- [x] **OUT-338** Out (REQ-REPLY-085, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall add to `rules/useTestPatterns.md` one line requiring a characterization test before a refactor: pin behaviour on old code with about 10 golden examples run more than once (n=6).
  Acceptance: the rule file holds the line. Verification: inspection.
  Basis: cited (the dossier's verdict candidate for one line in `useTestPatterns.md`; n=6). Status: missing at 088a227c (`git grep -n -i -E 'characterization|golden' 088a227c -- plugins/claudetto/rules` finds nothing).
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:21 (n=6, verdict candidate: one line in `useTestPatterns.md`); external/2026-10-25_p2/reddit.com-r-claudeai-comments-1xdwquj-anthropics-new-guide-oct-22-argu-20261025T155538Z.md:38 (10 golden examples, run more than once).

- [x] **OUT-339** Out (REQ-REPLY-086, ADR-0104 and ADR-0144): a typed-question Stop check is a Stop claim grader. claudetto shall express each style fault as a question a check can ask of a reply (does it show the check behind each claim; does it answer what was asked; does it leave undone a step the agent could do itself); stored cases are examples, never a match list.
  Acceptance: no word-list or regex match decides a fault. Verification: test.
  Basis: cited. Status: partial at 088a227c (`plugins/claudetto/hooks/kernel/decider/`).
  Source: plugins/claudetto/output-styles/Concise.md:10@088a227c9^ ("Show the check" as a rule on each claim); openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:198@088a227c9^ (show the check behind each claim).

- [x] **OUT-340** Out (REQ-REPLY-094, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall plan before building: a short plan with success conditions, approval before files change, a plan-mode gate, a pre-mortem and a manual check per item; the plan lives in a file with file list, order and "done" per step; large features get a phased plan, individual features plan mode, small fixes go straight to code.
  Acceptance: a plan the user does not read is a ritual: keep it short and have the model show cases (a one-page HTML), re-verified with another model. Counts: plan before building n=24, 8; pre-mortem n=5; manual check per item n=2. Also: plan mode to explore and draft, then a file with the list, a new session per step reading it, and long-output Bash delegated to subagents; large features and apps get a phased or tracer-bullet plan in a folder; a spec before code (goal, constraints, non-goals, acceptance criteria, files in scope), one focused task per session with clear or compact between; delegate by risk tier (freely tests, docs, small bugs; with review features and migrations; human-led auth, payments, crypto, data deletion, schema, with CODEOWNERS); long-running work starts with an initializer step (env script, JSON task list pass or fail edited only by status, progress log, first commit) and a session protocol as a harness checklist (confirm cwd, read progress log and git log, run baseline tests, pick one item, implement, test, commit, update log; done means verified by running the software); audit order for a rebuild task: a probe that could refute the verdict first, then the delta of each main spec (a deleted mechanism is REMOVED), then code; delete a mechanism with its tests, settings, and docs; ask before removing a tool, command, plugin, or option the user did not name. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto-openspec` skills; no plan-mode gate).
  Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:4 (n=24, plan before building), :237 (n=8, plan-gate review), :117 (n=5, pre-mortem), :185 (n=2, manual check per item).

- [x] **OUT-341** Out (REQ-REPLY-095, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall keep instruction files small: a mini-wiki with a global and project index, very short instruction files that point to it, and "Write this / Not this" pairs; "remove repetition and omit what a professional knows" beats "be concise".
  Acceptance: reported only; none is a measured effect. Also from the thread: frontmatter (type, status, created) past a few hundred files; skills as an on-demand library from logged misses; a session that hits compaction is killed and restarted from the wiki; a flawed-reference prompt names what to take and what to burn, pastes 200-300 annotated lines, or uses two sessions (a design doc of the reference's ideas, then the build); succinct output follows ASD-STE100 and answer-first; power phrases: restate the goal, "don't touch anything else", "one step at a time", "just answer, no impl"; start fresh after a session goes sideways; a `/grill-me` style debate risks answering "agreed" to forty questions, and an opposing view says specs-only worsened code; audit cycles on vibe-coded projects strip 30-50% bloat. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/rules/useBlockLanguage.md`).
  Source: external/2026-10-11/export-What are Claude Code -Power Users- doing with Claude Code that the average developer isn't-.jsonl:39 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x0uhhr/what_are_claude_code_power_users_doing_with/>).

- [x] **OUT-342** Out (REQ-REPLY-096, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall give steps or minutes of agent work, not human dev time, in an estimate, by adding a line to `texts.ts` `REQUESTS` (merged from plan:1547).
  Acceptance: a plan "in months" was 8 of 10 done after three sessions; "2-3 weeks" took about 2 hours. Candidate (n=2). Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`texts.ts:8` REQUESTS exists; `git grep -n -i -E 'estimate|minutes' 088a227c -- plugins/claudetto/hooks/features/prompt/texts.ts` finds no such line).
  Source: external/2026-09-29/export-Can Claude Pro $20 plan will be enough for me-.jsonl:21 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wsh0z7/can_claude_pro_20_plan_will_be_enough_for_me/>); plugins/claudetto/hooks/features/prompt/texts.ts:8@088a227c.

- [x] **OUT-343** Out (REQ-REPLY-098, ADR-0177): conflicting ask-count variants; the ask rule that stays is REQ-REPLY-140 with REQ-REPLY-089. claudetto shall tell the model: ask one clarifying question when the request is ambiguous, then proceed on best judgment.
  Acceptance: ask only when the answer changes something costly to undo (API shape), otherwise decide and mention (filename); a prompt that ends in `?` is answered without editing files. Without the cap the model skips asking or runs a twenty-question interview; without "then proceed" it waits. Merged with the starter CLAUDE.md line "ask one question if the answer is expensive to undo". Verification: inspection.
  Basis: reported, widely voted, not measured. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:46 (n=4, ask one clarifying question, then proceed on best judgment) and :3 (n=27); plan:1104 and plan:1154.
  Conflict: Clarify Before Building, Bounded (ask up to 3-5 questions and wait for go).
  Conflict: Question Cap (ask at most 5 questions).

- [x] **OUT-344** Out (REQ-REPLY-099, ADR-0177): claudetto ships no text to Fable or Mythos, so no text exists to review. claudetto shall apply the seven Fable 5.2 guide review rules to texts a Fable or Mythos model receives, and wrap pasted content as in the Opus 5.5 `<pasted_content id>` form.
  Acceptance: each of the 7 rules is checked against each text claudetto ships to Fable or Mythos. Verification: inspection.
  Basis: cited, untrusted data. Status: missing at 088a227c (git grep for `pasted_content` returned no file).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:70; openspec/specs/agent-conduct/spec.md:84.

- [x] **OUT-345** Out (REQ-REPLY-100, ADR-0184 and ADR-0177): a failed unattended stop is the driver's job and Claude Code's native Notification covers the rest; no measured gain. claudetto shall send a notification when a session ends: a cheap model writes what the session waits for, the notification carries chat title and repo (task name before repo), re-notifies after 5 minutes if unanswered, and a click opens the chat.
  Acceptance: open problem noted: identify which of several parallel chats. Verification: demonstration.
  Basis: reported, plugin demo. Status: partial at 088a227c (`plugins/claudetto/hooks/features/stop-notice/stop-notice.ts`, API-error stops only). `Notification` is present in claude 2.1.327 (hook event list, `chunk-ja5z738t.js@5501`); `ui.notify` is present (`chunk-dafpvz32.js@3356`); `model.complete` is present (`chunk-dafpvz32.js@2685`).
  Source: external/2026-10-03/export-I rebuilt my Claude Code Mac notifications as a mod.jsonl:2 (a Haiku line says what the session waits for, with chat title and repo; re-notifies after 5 minutes; a click opens the chat); external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:21.
  Conflict: Notifications (notify from one hook on a failed unattended stop; leave idle and permission prompts to the native channel).

- [x] **OUT-346** Out (REQ-REPLY-102, ADR-0031): the built-in Monitor stays and its text is not rewritten. claudetto shall word its Monitor text so that a notice is not the user's reply, the command prints only lines the model acts on (failures included), and the command runs the writer itself, because `tail -F` never ends after its writer exits.
  Acceptance: the Monitor text states these three rules. Verification: inspection.
  Basis: measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/surface/texts.ts:20` says each line is a notice from the command, to print lines acted on with failures, and to run the writer itself; checked with `git show 088a227c:plugins/claudetto/hooks/features/surface/texts.ts`). `Monitor` is present in claude 2.1.327 (tool list, `chunk-77827yq1.js@578`). Release note 2.1.327: Monitor now tells Claude when a watch expires with no events and its command wrote to stderr, and which file holds the output.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:91; plugins/claudetto/hooks/features/surface/texts.ts:20@088a227c; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **OUT-347** Out (REQ-REPLY-103, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall carry short behaviour rules: meeting notes force an owner and a date per item plus an `unclear` list; data parsing uses one script per dataset that hard-fails on a bad row and cites row ids; an out-of-scope finding is reported in one line while work stays on topic; an exploratory opener reads "no plan yet, poke holes, one question at a time" and waits for "go"; no unrequested fact-check and no caveat that adds nothing; function guardrails 30 NLOC, cognitive 10, cyclomatic 8, depth 2, params 4, lint-enforced.
  Acceptance: each rule sits in the reply rules or the lint config. The plan item's Stop-hook for caveat and opener patterns and TextFold (five reading levels) are not carried: a regex Stop check is a settled out (no regex or word-list Stop check for openers, user decision, 2026-11-16). Verification: inspection.
  Basis: reported (Opus 5.5 converges on a plan by message two; ASD-STE100 reportedly cut 580 words to 100; threats to validity: one user, three days, one project). Status: missing at 088a227c (`git grep -n -i -E 'NLOC|cyclomatic|unclear' 088a227c -- plugins` finds no rule text; its one hit is an unrelated hygiene comment).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:183 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/>); external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:72.

- [x] **OUT-348** Out (REQ-REPLY-104, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall keep context small: verify lightest first (type check, targeted tests, full build); raw logs go to files and the reply returns status, errors, decisive lines, and a path; no "just in case" scans; VCS and generated dirs are excluded from search; one topic per task; concept and doc questions are answered without opening the repo; read line ranges, not whole files; wide research goes to a subagent that returns only the conclusion; test scripts are quiet; `/clear` before unrelated tasks.
  Acceptance: the reply rules hold each line. Measured (six months of own transcripts at API rates): 56% of spend was context re-reads and 20% useful work. Verification: inspection.
  Basis: measured (own logs). Status: partial at 088a227c.
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1xak96j-i-measured-87000-of-my-claude-20261020T074808Z.md:56 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xak96j/i_measured_87000_of_my_claude_code_api_calls_two/>).

- [x] **OUT-349** Out (REQ-REPLY-110, ADR-0107): user steps are `- ! <command>` bullets. claudetto shall write user steps as plain bullets, with no checkbox or `!` command prefix.
  Acceptance: a reply listing user steps has no `- [ ]` lines. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`git grep -i -E 'checkbox' 088a227c -- plugins/claudetto/output-styles plugins/claudetto/hooks/features/prompt/texts.ts` finds no rule).
  Source: reported, user, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/926cb706-4310-4588-9399-b906abd34b32.jsonl:1721).
  Conflict: Output Style: Need From You.

- [x] **OUT-350** Out (REQ-REPLY-116, ADR-0104 and product rule no Stop claim grader): no grader block exists to word. claudetto shall write the Stop grader's credit-and-loss framing ("You earn credit ... loses credit") only after a test shows it helps, and shall split the 1,511-character `deferred` test into one test per clause (partial set, untested guess, conditional offer, refused call), each with one example.
  Acceptance: the grader prompt holds no incentive line without a test; the deferred check lists four clauses with one example each. Verification: test.
  Basis: reported. Status: missing at 088a227c (`git grep -E "VERIFY_GRADE|You earn credit" 088a227c -- plugins` finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:169; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:176.

- [x] **OUT-351** Out (REQ-REPLY-118, ADR-0104 and product rule no Stop claim grader): no grader block exists to word. claudetto shall flag the deferred fault in every session including headless: a reply that offers doable work ("If you want, I'll ...", "Reply ... and I will") or lists a check as "Not checked" that the agent's own tools could run; it shall decide by the model's reading, with no word list or pattern, and shall leave out an offer or unrun check that needs something only the user holds (login, device, design choice).
  Acceptance: lab test `verify-grader.test.ts` ("the deferred test names an offer and an unrun check") flags replies R15, R29, R30 and passes a user-only offer. Verification: test.
  Basis: reported (spec). Status: missing at 088a227c (no deferred check in `plugins/claudetto`).
  Source: openspec/specs/claim-check/spec.md:10; openspec/specs/claim-check/spec.md:30; openspec/specs/claim-check/spec.md:35.

- [x] **OUT-352** Out (REQ-REPLY-119, ADR-0186 and ADR-0177): commit boundaries belong to slice commits, and a Stop text for foreign files has no measured gain. claudetto shall tell the agent, in the Stop text for changed files that are not its own, to commit each as its own commit whose message names its likely source (the user, a formatter, an install), and shall never tell it to leave the file out.
  Acceptance: the Stop text holds the commit-under-source instruction and no leave-out instruction. Verification: test.
  Basis: reported (spec). Status: missing at 088a227c (`git grep "likely source" 088a227c -- plugins` finds nothing).
  Source: openspec/specs/run-limits/spec.md:209; openspec/specs/run-limits/spec.md:242. The spec's "unless the ledger holds no-commit" clause is left out: the constraint ledger is dropped (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).

- [x] **OUT-353** Out (REQ-REPLY-120, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall tell the agent to look for an override before it calls a built-in text or behaviour fixed: a same-named agent, skill, command, or output style, a setting, an env var, a hidden flag, or a hook that rewrites input.
  Acceptance: the shipped rules name each override kind. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (no override list in rules/).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; user decision, 2026-11-13.

- [x] **OUT-354** Out (REQ-REPLY-122, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall ship a duplication rule: call mcp__jscpd__check_duplication with each function or block before writing it and reuse what it finds, call get_file_clones before refactoring a file, and call check_current_directory after editing files.
  Acceptance: the shipped rule names the three jscpd calls. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (rules/lookForClone.md exists; the jscpd tool names are not in it).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; user decision, 2026-11-13.

- [x] **OUT-355** Out (REQ-REPLY-123, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall make the agent answer a question about models, effort, or Claude Code from the dossiers in the repository, clawdipedia-docs, and its own independent web research, and read each source whole.
  Acceptance: a research reply cites a dossier or docs page and a web page, and records no "read only the first part" of a source. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (no rule names these three sources).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6028; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6321; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5669; reported, user, 2026-11-13.

- [x] **OUT-356** Out (REQ-REPLY-124, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall make the agent end a research reply with the findings and sources and add no note on what it did not do unless the user asks.
  Acceptance: a research reply ends at its sources. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6502; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6513; reported, user, 2026-11-13.

- [x] **OUT-357** Out (REQ-REPLY-125, ADR-0189): the openspec block is out. claudetto shall make the agent write reported faults into the OpenSpec change the user names, without searching the plugin for causes.
  Acceptance: after "report the faults", the agent edits the named change and runs no search of plugin source. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6567; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

- [x] **OUT-358** Out (REQ-REPLY-130, ADR-0094 and the verification block): mutation runs belong to verification. claudetto shall run the mutation tool a project already has on the lines a change touched before the report, and shall install none in a project without one.
  Acceptance: a project with a `mutate` script or a Stryker, mutmut, or cargo-mutants config gets a mutation run on the touched lines; a project without one gets no install. Verification: test.
  Basis: user goal set through `/goal`, 2026-11-16 06:24 UTC, tests proven by mutation, least code by jscpd (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:11). Status: have at 088a227c (`plugins/claudetto/rules/useTestPatterns.md:4`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (user answered "Trim mutation rule, then run"; the trimmed line is in the handoff); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1871 (the cost figures that drove the trim).

- [x] **OUT-359** Out (REQ-REPLY-131, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall make the agent explain in specific terms when the user asks for elaboration: named files, counts, and examples, not abstract labels.
  Acceptance: an elaboration reply names each thing it counts. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (`git grep -n -i "elaborat\|abstract\|specific" 088a227c -- plugins/claudetto/hooks/features/prompt/texts.ts plugins/claudetto/output-styles` finds only the WebSearch line at texts.ts:96, no elaboration rule)
  Source: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9309).

- [x] **OUT-360** Out (REQ-REPLY-137, ADR-0189): the openspec block is out. claudetto shall make the agent log each result compactly in the change's `log.md` or a named log, when the user asks for a full run.
  Acceptance: after a full run, the log holds hypothesis, prediction, command, and result for each probe. Verification: inspection.
  Basis: user decision, 2026-11-16 06:00 UTC, log.md is forbidden (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10548). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215 (handoff, Next step 3); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790.

- [x] **OUT-361** Out (REQ-REPLY-141, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall make the agent, when asked to draft text (an email, a message, a reply), give one best draft plus one line on what to change for a different tone, and offer several versions only when the user asks or the text is a subject line or an opening line.
  Acceptance: a behavioural test asking for a reply to a sample email gets one draft and one change line, not three drafts; a test asking for subject lines gets several. Verification: test.
  Basis: reported (one user, 40 real emails, a blind colleague chose the single answer 31 times, one of three 7 times, 2 ties; options won only for subject lines and cold-outreach openers; small and not scientific). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-promptengineering-comments-1xyldo1-tested-give-me-3-option-20261117T182647Z.md:23-38,44-48 (url: <https://www.reddit.com/r/PromptEngineering/comments/1xyldo1/tested_give_me_3_options_vs_give_me_your_one_best/>); reports/2026-11-18-research/dossier.md:99-100.

- [x] **OUT-362** Out (REQ-REPLY-143, ADR-0177): a report with no reproduction and no measured gain over vanilla. claudetto shall word review requests and corrections to the agent in a neutral tone, naming the fault and the evidence without alarm, and shall not add urgent or alarmed wording to a review or correction prompt.
  Acceptance: an A/B test of at least 10 runs per arm compares a neutral review prompt with an alarmed one on the same code and counts changes made to correct code (over-correction); the item stays only if the neutral arm makes fewer; otherwise it is removed. Verification: test.
  Basis: reported (four commenters in one thread say calm framing gave better review output and sharp correction made the model over-correct); no measurement. Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudecode-comments-1xxi29c-wtf-happened-to-opus-55-20261117T010537Z.md:110-116,128-130 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xxi29c/wtf_happened_to_opus_55/>); reports/2026-11-18-research/dossier.md:109.

- [x] **OUT-363** Out (RISK-233, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. A literal done criterion makes the agent stop at the literal result.
  Category: reply
  Cause: The prompt said "done when the whole suite passes"; the agent fixed the failing tests and stopped.
  Event: Benchmark, 2 runs per model, small repos: Opus fixed the 2 failing bugs in about 70 s and stopped; Fable (2/2 vs 0/2 runs) found a third untested bug by diffing src/ against a committed dist/ and rebuilding. Opus was about 2.1x faster on small tasks.
  Consequence: A real defect outside the stated criterion ships.
  Likelihood: 1
  Impact: 4
  Existing controls: none found.
  Response: mitigate
  Actions: State the real goal, not only the suite result, in the done criterion.
  Trigger: A run ends with a green suite and a diff against a build artifact never compared.
  Owner: reply
  Status: open
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xsxbf9-there-was-a-rumor-that-fable-5-20261111T233440Z.md:109,111 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xsxbf9/there_was_a_rumor_that_fable_52_finishes_faster/>).

- [x] **OUT-364** Out (RISK-234, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. A model skims the instruction guide and breaks a rule from the part it skipped.
  Category: reply
  Cause: Same task card and base commit, two models: one read 45k characters of the guide before writing, the other read 1k and wrote anyway.
  Event: Measured by the poster on one pair: the skimmer broke a rule from the skipped part with output that looked fine; one session grepped the instruction file for one step instead of loading it.
  Consequence: A rule breach that passes a glance.
  Likelihood: 1
  Impact: 3
  Existing controls: none found.
  Response: mitigate
  Actions: Use "invoke first, then act" for skills so the file loads whole.
  Trigger: A session reads under a fraction of a required guide before writing.
  Owner: reply
  Status: open
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvc77s-i-rewrote-my-claude-code-sessi-20261116T051759Z.md:83 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvc77s/i_rewrote_my_claude_code_session_rules_41_times/>).

- [x] **OUT-365** Out (RISK-235, product rule: no component swaps): the cure (a second model family as verifier) is a component swap, which the product rules exclude. True statements leave a false impression and agreement between two AIs is read as proof.
  Category: reply
  Cause: One confident voice after two seconds or two hours of work; a report says what was checked, not what was missed; two AIs share mistakes; a good answer sits inside a wrong question; a real citation need not support the claim; one early mistake contaminates a long conversation; repeated success erodes verification.
  Event: A book author's list of 15 observations (reported). Builder Claude Code plus reviewer Codex shared mistakes, found only by a real-device test or when the pair kept revisiting an agreed issue.
  Consequence: A wrong result accepted on a confident report.
  Likelihood: 2
  Impact: 4
  Existing controls: Plan holds same-writer review blindness only.
  Response: mitigate
  Actions: Require evidence, limits, independent checks, and a verified-versus-assumed split; ask what was not examined; treat silence as not an all-clear and agreement as not verification.
  Trigger: A report with no list of what was not checked.
  Owner: reply
  Status: open
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvf7u5-things-ive-learned-about-ai-ho-20261116T052112Z.md:41,45,51 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvf7u5/things_ive_learned_about_ai_honesty_and_trust/>).

- [x] **OUT-366** Out (RISK-236, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Silent judgment calls.
  Category: Agent behaviour.
  Cause: A flag is treated as sufficient disclosure.
  Event: The author was unaware of 19 of 20 decisions in a sampled feature (reported); the agent stopped asking clarifying questions and picked silently; invented deadlines; a documented arbitrary design choice kept as a fixed invariant; memory turns one-off corrections into absolute rules ("never use green"); the agent flags "this would ship something false" and continues.
  Consequence: Decisions the user never saw are shipped.
  Likelihood: 2. Impact: 3.
  Existing controls: None.
  Response: mitigate.
  Actions: List the judgment calls; percentages instead of absolutes; a periodic memory self-audit; review memory diffs; a brief line making anything flagged as the owner's call a blocker, and a Stop check for flagged-but-unanswered items; the owner gate reads the diff.
  Trigger: A report flags an item and the turn continues past it.
  Owner: reply. Status: open.
  Source: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts for the 19 of 20 figure; the grep hit external/2026-11-16/reddit.com-r-claudecode-comments-1xvacjb-how-often-do-you-notice-legiti-20261116T051816Z.md:21 is a capture count, not a finding.

- [x] **OUT-367** Out (RISK-237, product rule: no component swaps): the cure (a second model family as verifier) is a component swap, which the product rules exclude. Premature convergence and costly assumption.
  Category: Agent behaviour.
  Cause: No discuss-first gate.
  Event: Opus 5.5 converges prematurely (by message two), thrashes after about 2 hours unsupervised without a gate, keeps fixing the failed attempt instead of restarting, loops on "does not work / my mistake" (Fable); "check for mistakes" finds them in nearly every chat; it picks a default the request left open, builds, then undoes.
  Consequence: A long run builds on a wrong assumption.
  Likelihood: 2. Impact: 3.
  Existing controls: None.
  Response: mitigate.
  Actions: An independent verification pass by another model family; tests and spec; restart from square one; a discuss-first opener with edits blocked until the user says to go (reported harness).
  Trigger: A build starts on a request that left a default open.
  Owner: reply. Status: open.
  Source: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts for premature convergence by message two, thrashing after about 2 hours, or the discuss-first harness.

- [x] **OUT-368** Out (RISK-239, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Newer models patch symptoms with retries and timeouts, not the root cause.
  Category: reply
  Cause: The model's default lean is to add retries and timeouts around a problem.
  Event: One user reports models also cannot be trusted to diagnose their own poor performance or write their own harness.
  Consequence: A bug hidden, not fixed.
  Likelihood: 1
  Impact: 3
  Existing controls: Plan stops after two failed attempts.
  Response: mitigate
  Actions: Ask for the root cause before any retry or timeout change.
  Trigger: A diff that adds a retry or timeout for a failing step.
  Owner: reply
  Status: open
  Source: external/2026-11-16/reddit.com-r-claudecoding-comments-1xwnzh3-tldr-i-worry-that-anthropic-20261115T134422Z.md:52 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xwnzh3/tldr_i_worry_that_anthropic_does_not_realize_that/>).

- [x] **OUT-369** Out (RISK-240, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. A 2,000-line change comes back for a task that needed 100 lines.
  Category: reply
  Cause: The agent over-engineers with no size bound.
  Event: One user reverted a 2,000-line change and re-ran it in a new thread with a budget of 100 lines of production code, max; it came out right.
  Consequence: A large diff to review.
  Likelihood: 1
  Impact: 3
  Existing controls: Plan lists 350-line additions as unstopped by simplify prompts.
  Response: mitigate
  Actions: Revert and rerun in a new thread with a hard line budget.
  Trigger: A diff far above the task's size.
  Owner: reply
  Status: open
  Source: external/2026-11-16/reddit.com-r-codex-comments-1xu7cg0-sol-61-high-overengineering-turned-20261113T192044Z.md:322 (url: <https://www.reddit.com/r/codex/comments/1xu7cg0/sol_61_high_overengineering_turned_a_production/>).

- [x] **OUT-370** Out (RISK-241, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Anti-over-validation: "verification" and "evidence" in a prompt grow an endless proof chain.
  Category: reply
  Cause: Models add extra validation and gate clauses (a rule gained an arbitrary "unless y" clause).
  Event: Reported; one fix is a trigger rule.
  Consequence: Slow, bloated gates.
  Likelihood: 1
  Impact: 2
  Existing controls: Plan lists over-gating as a fault.
  Response: mitigate
  Actions: Validate only data that crosses a domain boundary, never data passed inside one.
  Trigger: A gate rule with an unrelated exception clause.
  Owner: reply
  Status: open
  Source: external/2026-11-16/reddit.com-r-codex-comments-1xu7cg0-sol-61-high-overengineering-turned-20261113T192044Z.md:157,833,834 (url: <https://www.reddit.com/r/codex/comments/1xu7cg0/sol_61_high_overengineering_turned_a_production/>).

- [x] **OUT-371** Out (RISK-243, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Sonnet 5.5 skips math steps and leaves out detail when it explains.
  Category: reply.
  Cause: the model skips steps by default (reported); a commenter holds that models above 4.6 explain badly.
  Event: explanations of mathematics assume the reader knows basics and need a prompt for LaTeX.
  Consequence: an extra turn for each re-asked step.
  Likelihood: 2. Impact: 2.
  Existing controls: narration rules only (plan line 1508 in the old plan); no per-model explanation note.
  Response: mitigate.
  Actions: a standing project-instruction line (assume basics only, define every symbol, show every algebra step, write math in LaTeX) plus extended thinking; a reply says a standing line holds only until next week; another commenter suggests a 4.6 pass that translates the output to plain English. All field reports from commenters; Likelihood from report count.
  Trigger: a user asks again for a skipped step.
  Owner: reply. Status: open.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcpua5-is-sonnet-55-bad-at-explaining-s-20261023T040445Z.md:29; external/2026-10-25/reddit.com-r-claudeai-comments-1xcpua5-is-sonnet-55-bad-at-explaining-s-20261023T040445Z.md:33; external/2026-10-25/reddit.com-r-claudeai-comments-1xcpua5-is-sonnet-55-bad-at-explaining-s-20261023T040445Z.md:37; external/2026-10-25/reddit.com-r-claudeai-comments-1xcpua5-is-sonnet-55-bad-at-explaining-s-20261023T040445Z.md:342 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcpua5/is_sonnet_55_bad_at_explaining_stuff/>).

- [x] **OUT-372** Out (RISK-244, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The agent answers defensively and promises a loop it does not set.
  Category: reply.
  Cause: unknown. Two commenters, two faults.
  Event: asked why errors rose, the agent said "Opus 5.5 hasn't changed, so I have to look for another reason" though the user never blamed the model. Another agent said it would set a loop and did not, after being asked twice.
  Consequence: an extra turn each time; the user's real question stays unanswered.
  Likelihood: 2. Impact: 2.
  Existing controls: a refusal-to-act rule only (old plan line 1025).
  Response: mitigate.
  Actions: none stated in the source.
  Trigger: the agent states a plan it does not run.
  Owner: reply. Status: open.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:339; external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:400 (url: <https://www.reddit.com/r/claude/comments/1xc9mw9/has_opus_55s_coding_quality_changed_recently/>).

- [x] **OUT-373** Out (RISK-245, ADR-0184, ADR-0177): a vendor model behaviour reported by third parties, with no reproduction here; unattended loops are the driver's concern (ADR-0184), and ADR-0177 forbids a component without a measured gain. Fable ends turns early and duplicates code.
  - Category: model behaviour.
  - Cause: Fable 5.2 ends turns early at `low` and `medium`; it adds to existing code even when that duplicates it, unless ownership is stated.
  - Event: documented by the vendor.
  - Consequence: unfinished sessions; duplicated code.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: the docs block `# Finishing work` halved unfinished sessions at about 30% more output; the line "You are the owner and long-term maintainer of this codebase, and its design is up to you." raised consolidation from under 10% to 75% at 70 to 80% more output. Omit the ownership line where the user owns the code.
  - Trigger: a Fable agent prompt.
  - Owner: reply
  - Status: open
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:82; openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:83 (cited).

- [x] **OUT-374** Out (RISK-246, ADR-0184, ADR-0177): a vendor model behaviour reported by third parties, with no reproduction here; unattended loops are the driver's concern (ADR-0184), and ADR-0177 forbids a component without a measured gain. Haiku 5.5 leaks reasoning-like text into replies.
  - Category: model behaviour.
  - Cause: at `low` effort or with thinking off, Haiku 5.5 can leak reasoning-like text.
  - Event: documented by the vendor.
  - Consequence: noise in replies.
  - Likelihood: 1
  - Impact: 1
  - Existing controls: none.
  - Response: avoid.
  - Actions: do not run Haiku at `low` or with thinking off for replies.
  - Trigger: a Haiku reply at `low`.
  - Owner: reply
  - Status: open
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:74 (cited).

- [x] **OUT-375** Out (RISK-247, ADR-0184, ADR-0177): a vendor model behaviour reported by third parties, with no reproduction here; unattended loops are the driver's concern (ADR-0184), and ADR-0177 forbids a component without a measured gain. Sonnet 5.5 misreads a mid-turn user message.
  - Category: model behaviour.
  - Cause: Sonnet 5.5 sometimes treats a genuine mid-turn user message as injected text, and sometimes calls a tool with the wrong case (`bash`).
  - Event: documented by the vendor.
  - Consequence: the user's message is ignored; a tool call fails.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: put mid-turn user text in a text block after the last `tool_result`, never inside one.
  - Trigger: a user message while a tool call runs.
  - Owner: reply
  - Status: open
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:59; openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:60; openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:68 (cited).

- [x] **OUT-376** Out (RISK-248, ADR-0184, ADR-0177): a vendor model behaviour reported by third parties, with no reproduction here; unattended loops are the driver's concern (ADR-0184), and ADR-0177 forbids a component without a measured gain. Opus 5.5 progress updates end the turn early in unattended loops.
  - Category: model behaviour.
  - Cause: progress updates can end the turn early in unattended loops.
  - Event: documented by the vendor.
  - Consequence: the loop stops before the work is done.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: an instruction that names the kinds of early stop to avoid; leave it out of human-in-the-loop apps.
  - Trigger: an unattended run.
  - Owner: reply
  - Status: open
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:46 (cited).

- [x] **OUT-377** Out (RISK-249, ADR-0184, ADR-0177): a vendor model behaviour reported by third parties, with no reproduction here; unattended loops are the driver's concern (ADR-0184), and ADR-0177 forbids a component without a measured gain. Unattended agent loops treat `end_turn` as done.
  - Category: agent conduct.
  - Cause: a loop that treats every `end_turn` as completion stops the job early.
  - Event: one commenter's report, with a counter-report of agents running all night on 12 million tokens (anecdote). The export text was not located in the thread cited.
  - Consequence: unfinished work, or runaway spend.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: goal check-ins (old plan).
  - Response: mitigate.
  - Actions: treat `end_turn` as done only after checking open checklist items; allow two or three controlled continuations.
  - Trigger: an unattended run reaches `end_turn`.
  - Owner: reply
  - Status: open
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:16 (reported, anecdote) (url: <https://www.reddit.com/r/ClaudeAI/comments/1x3sxod/for_those_running_long_claude_agent_loops_in/>).

- [x] **OUT-378** Out (RISK-251, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Self-report distrust: the model advises on a harness it cannot observe.
  Category: model.
  Cause: the model advises on a harness it cannot observe.
  Event: model estimates of its own costs are far off (logged data accurate); models rate themselves modestly; models do not know facts about themselves; they cannot see context fill; they "acknowledge corrections" yet repeat; Claude's advice on rules, hooks, and skills for itself was judged poor, and Opus wrote a rule set after refusing a task as "falsifying a document" (single case).
  Consequence: a wrong rule ships.
  Likelihood: 2. Impact: 2.
  Existing controls: user rules hold human-authored text.
  Response: mitigate.
  Actions: take cost and ratings from the bill, logs, and humans, never from self-report; human-authored rules from logged failures; docs in context via clawdipedia-docs; a subagent context holding the docs.
  Trigger: a cost or rating stated by the model with no log behind it.
  Owner: reply. Status: open.
  Source: external/2026-10-25_p2/reddit.com-r-claude-comments-1xevazp-necessary-interaction-rules-create-20261025T161843Z.md:27 (url: <https://www.reddit.com/r/claude/comments/1xevazp/necessary_interaction_rules_created_for_opus_by/>) (the falsifying-a-document case, reported, one user). The cost-estimate and self-rating findings: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts for those two findings.

- [x] **OUT-379** Out (RISK-297, ADR-0189): OpenSpec is out of scope (ADR-0189). The agent investigates the plugin when the user said to report the faults to the OpenSpec change.
  Category: agent conduct.
  Cause: after "more faults to report" the agent ran rg and read plugin source to find the hook text.
  Event: the user said nobody told it to find; the user wanted the problems written to the OpenSpec.
  Consequence: a wasted turn and unrequested reads.
  Likelihood: 1
  Impact: 2
  Existing controls: none known.
  Response: avoid
  Actions: when the user says report, write the reports into the named OpenSpec change and stop; do not search for causes unless asked.
  Trigger: a user message that pastes faults and says report.
  Owner: reply
  Status: open. Field report kept as reported; transcript `17435f50` is gone from disk (recorded limit, sessions of 2026-11-09..16); a grep of `plugins/` at 088a227c finds no hook for it; Likelihood from report count.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6567; reported, user, 2026-11-13.

- [x] **OUT-380** Out (RISK-301, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Fable 5.2 is passive in chat: it confirms a problem but writes no plan or solution (third conversation), and says the codebase is not its own.
  Category: product fault
  Cause: The model is reluctant to overthrow the codebase of someone else when it is not told otherwise; the same context behaves differently per model; a CLAUDE.md rule to propose a UML diagram and ask confirmation did not stop it
  Event: The reply holds confirmation only
  Consequence: An extra turn per task
  Likelihood: 2 (two or more reports)
  Impact: 2
  Existing controls: none found at 088a227c
  Response: mitigate
  Actions: Tell it "this is ITS CODEBASE" (cited to the docs, 8 votes); A/B-test instruction files, skills, and knowledge bases on each new model
  Trigger: A reply with no plan or solution
  Owner: reply
  Status: open
  Source: external/2026-11-13/reddit.com-r-anthropic-comments-1xtmjep-fable-52-is-extremely-passive-20261111T234255Z.md:30; external/2026-11-13/reddit.com-r-anthropic-comments-1xtmjep-fable-52-is-extremely-passive-20261111T234255Z.md:54; external/2026-11-13/reddit.com-r-anthropic-comments-1xtmjep-fable-52-is-extremely-passive-20261111T234255Z.md:62; external/2026-11-13/reddit.com-r-anthropic-comments-1xtmjep-fable-52-is-extremely-passive-20261111T234255Z.md:82 (url: <https://www.reddit.com/r/Anthropic/comments/1xtmjep/fable_52_is_extremely_passive/>).

- [x] **OUT-381** Out (RISK-302, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The agent changes its fix on each challenge without checking the cause.
  Category: agent behaviour.
  Cause: the agent folds to each follow-up.
  Event: after the user asked why a data request was so large, the agent replied "You're right!" to each follow-up and switched to a different fix three times without checking the cause.
  Consequence: extra turns and no root cause.
  Likelihood: 1. Impact: 2.
  Existing controls: none at 088a227c (grep of `plugins/` for "challenge" finds only an unrelated HTTP challenge in `web/fetch.ts` finds no rule or hook).
  Response: mitigate.
  Actions: none in the source.
  Trigger: two replies in a row that open with agreement and name a different fix.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xclxdw-opus-55-is-so-good-remember-to-use-20261024T141513Z.md:174 (url: <https://www.reddit.com/r/claude/comments/1xclxdw/opus_55_is_so_good_remember_to_use_xhigh_effort/>).

- [x] **OUT-382** Out (RISK-303, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The agent reads a rule, ignores it, then proposes adding the same rule again.
  Category: agent behaviour.
  Cause: the agent does not apply instructions it read; a commenter suspects contradictory rules or hidden entries.
  Event: the agent suggests adding the same rule for the fifth time, daily, until challenged; it claims a task is impossible that it did the day before and then admits "I read that and didn't follow it".
  Consequence: rule files grow with duplicates and the rule stays unfollowed.
  Likelihood: 2. Impact: 2.
  Existing controls: none at 088a227c (grep of `plugins/` for "rule" repeats finds no check for a proposed duplicate rule; `repeat.ts` handles only repeated tool calls finds no rule or hook).
  Response: mitigate.
  Actions: fewer or non-contradictory rules; check /context for hidden entries; ask the model to audit the instructions in scope. The reports come from Claude chat and Cowork, not Claude Code.
  Trigger: a proposed rule that already stands in the instructions.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xdyvba-claude-has-told-me-youre-right-i-20261024T061401Z.md:125; external/2026-10-25/reddit.com-r-claudeai-comments-1xdyvba-claude-has-told-me-youre-right-i-20261024T061401Z.md:43; external/2026-10-25/reddit.com-r-claudeai-comments-1xdyvba-claude-has-told-me-youre-right-i-20261024T061401Z.md:134; external/2026-10-25/reddit.com-r-claudeai-comments-1xdyvba-claude-has-told-me-youre-right-i-20261024T061401Z.md:140 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xdyvba/claude_has_told_me_youre_right_i_was_wrong/>).

- [x] **OUT-383** Out (RISK-307, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The model over-works a proof-of-concept brief and makes rules for itself.
  Category: agent behaviour.
  Cause: no scope signal that the work is a proof of concept.
  Event: it spends effort on tests, plans, and rigor until told "we are building a poc, don't be pedantic"; one user says Opus creates rules for itself and refuses to break them; another says it refuses over licensing or micro-legalities unrelated to the task.
  Consequence: wasted spend and refusals unrelated to the task.
  Likelihood: 1. Impact: 3.
  Existing controls: none at 088a227c (grep of `plugins/` for "proof of concept" finds no rule or hook).
  Response: accept.
  Actions: state in the prompt that the work is a proof of concept.
  Trigger: tests or plans nobody asked for in a proof-of-concept task.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:329; external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:333; external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:185 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfa39o/is_claude_the_least_yesman_llm/>).

- [x] **OUT-384** Out (RISK-308, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The model gives unrequested wellbeing steering.
  Category: agent behaviour.
  Cause: unknown; a user guesses it happens near server capacity.
  Event: Claude says it is almost 2am or "you've been working all day/night, let's stop here"; one user was told to go to bed at 10:00 a.m.
  Consequence: an interrupted task.
  Likelihood: 2. Impact: 1.
  Existing controls: none at 088a227c (grep of `plugins/` for "wellbeing" finds no rule or hook).
  Response: accept.
  Actions: none in the source. The capacity cause is a guess.
  Trigger: a rest suggestion aimed at the user.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-27/reddit.com-r-claude-comments-1xg4caj-it-would-not-be-a-day-that-ends-in-20261027T065403Z.md:35; external/2026-10-27/reddit.com-r-claude-comments-1xg4caj-it-would-not-be-a-day-that-ends-in-20261027T065403Z.md:41; external/2026-10-27/reddit.com-r-claude-comments-1xg4caj-it-would-not-be-a-day-that-ends-in-20261027T065403Z.md:149; external/2026-10-27/reddit.com-r-claude-comments-1xg4caj-it-would-not-be-a-day-that-ends-in-20261027T065403Z.md:159 (url: <https://www.reddit.com/r/claude/comments/1xg4caj/it_would_not_be_a_day_that_ends_in_y_without/>).

- [x] **OUT-385** Out (RISK-309, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The model gives an unrequested psychological reading and then refuses.
  Category: agent behaviour.
  Cause: unknown.
  Event: after grandiose ideas, it said "sounds like suicide to me, was it something darker?" and refused to do anything.
  Consequence: the task stops and the user is upset.
  Likelihood: 1. Impact: 2.
  Existing controls: none at 088a227c (grep of `plugins/` for "psycholog" finds no rule or hook).
  Response: accept.
  Actions: none in the source.
  Trigger: a reply that assesses the user's mental state with no request.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-27/reddit.com-r-claude-comments-1xg4caj-it-would-not-be-a-day-that-ends-in-20261027T065403Z.md:97 (url: <https://www.reddit.com/r/claude/comments/1xg4caj/it_would_not_be_a_day_that_ends_in_y_without/>).

- [x] **OUT-386** Out (RISK-311, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Human-Time Estimate.
  Category: Agent behaviour.
  Cause: The agent sizes work in human time.
  Event: It said 'two engineers, 4-6 months' or 'infeasible' because a crate lacks support, and talked itself out of tasks it finished in 10-20 minutes or 4 hours.
  Consequence: Work is refused or scoped down.
  Likelihood: 2. Impact: 2.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: State estimates in effort or complexity (easy, medium, hard), not time or duration; never consider how long a human would take; 'fork the crate and write the upgrade'.
  Trigger: An estimate in months, weeks, or engineers.
  Owner: reply.
  Status: open.
  Basis: reported, several users, n>=5 anecdotes, no measurement.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xg9tqk-the-moonshot-prompt-20261102T184706Z.md:125,169,173,187 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xg9tqk/the_moonshot_prompt/>).

- [x] **OUT-387** Out (RISK-312, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Time Box Without Clock.
  Category: Agent behaviour.
  Cause: A time box is given without a clock the agent can read.
  Event: The agent claimed a 2-hour box reached after 35 minutes.
  Consequence: The task stops early.
  Likelihood: 1. Impact: 2.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: Tell the agent to check the time.
  Trigger: A prompt with a time limit and no clock check.
  Owner: reply.
  Status: open.
  Basis: reported, n=1.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xg9tqk-the-moonshot-prompt-20261102T184706Z.md:137,139 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xg9tqk/the_moonshot_prompt/>).

- [x] **OUT-388** Out (RISK-313, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Over-Suspicion Of Own Files.
  Category: Agent behaviour.
  Cause: The model treats the user's own documents as risky.
  Event: It redacts names or interrogates the user about their own work.
  Consequence: Extra turns on benign work.
  Likelihood: 1. Impact: 2.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: Standing preference rules: summarize own files directly; never redact names; take the user's word on own work (ask once); state an assumption instead of interrogating; own rules first in each skill. Keep rules narrow, because absolute rules backfire. Preferences cannot override a hard classifier block.
  Trigger: A refusal or redaction on the user's own files.
  Owner: reply.
  Status: open.
  Basis: reported.
  Source: external/2026-11-06/reddit.com-r-claude-comments-1xkhqck-opus-55s-safety-guardrails-are-bec-20261105T085115Z.md:134 (url: <https://www.reddit.com/r/claude/comments/1xkhqck/opus_55s_safety_guardrails_are_becoming/>).

- [x] **OUT-389** Out (RISK-314, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. A bug fix adds lines that cover up the old behavior instead of changing the source.
  Category: agent behaviour.
  Cause: the model prefers adding new lines to changing the original code.
  Event: new code overrides or covers earlier behavior.
  Consequence: tech debt that grows with time.
  Likelihood: 1. Impact: 3.
  Existing controls: none at 088a227c (grep of `plugins/` for a rule on covering up old behavior (only the `prompt/texts.ts:86` check-and-restore text and `scopeEditsToGoal.md`) finds no rule or hook).
  Response: mitigate.
  Actions: tell the model to fix the original code so it works as intended.
  Trigger: a diff that adds an override beside the faulty code.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-26/reddit.com-r-aigamedev-comments-1xfcokl-advice-for-those-developing-gam-20261026T063549Z.md:304 (url: <https://www.reddit.com/r/aigamedev/comments/1xfcokl/advice_for_those_developing_games_with_ai_so_they/>).

- [x] **OUT-390** Out (RISK-315, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The model rebuilds a broken tool from scratch instead of diagnosing it.
  Category: agent behaviour.
  Cause: the model claims it touched nothing and does not look at what changed.
  Event: after a tweak broke a working tool, it rebuilt the tool in a new session (3 h), and a rollback model rebuilt it again (2 h) because "yesterday's state" did not exist; both rebuilds were worse.
  Consequence: five hours lost and a worse tool.
  Likelihood: 1. Impact: 3.
  Existing controls: none at 088a227c (grep of `plugins/` finds no rule on rebuilds or rollbacks).
  Response: mitigate.
  Actions: say "don't fix anything yet, show me what changed since the last time it worked", because the actual diff usually shows the culprit; commit after every working tool, even a messy commit, so a broken tweak is a one-line revert. Both cures are reported by one commenter each, field report from commenters, Likelihood from report count.
  Trigger: a plan to rebuild a part that worked before.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-26/reddit.com-r-claudeai-comments-1xfcot1-anyone-else-having-serious-quali-20261026T063509Z.md:33; external/2026-10-26/reddit.com-r-claudeai-comments-1xfcot1-anyone-else-having-serious-quali-20261026T063509Z.md:149; external/2026-10-26/reddit.com-r-claudeai-comments-1xfcot1-anyone-else-having-serious-quali-20261026T063509Z.md:137 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfcot1/anyone_else_having_serious_quality_issues_with/>).

- [x] **OUT-391** Out (RISK-316, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The model tests a claim with a weak test and states a guess as a finding.
  Category: agent behaviour.
  Cause: the model inferred its answer from library names, not from a measurement, and said so only when pressed.
  Event: asked to test the claim, it wrote a weak "fast" test that showed a slight gain; a correct test showed 10x speed, 60% less CPU, and 80% less RAM; the conversion also took multiple passes.
  Consequence: a wrong "not worth it" answer.
  Likelihood: 1. Impact: 3.
  Existing controls: none at 088a227c (grep of `plugins/` finds no benchmark or profiling rule).
  Response: mitigate.
  Actions: profile first; state the project language in CLAUDE.md or in the prompt ("In this project we're using exclusively X"); look for a CLAUDE.md, agent, or memory entry that primes a default; discuss language only when asked. Reported by one poster and several commenters, field report; other commenters could not reproduce, so Likelihood stays 1.
  Trigger: a "would not help" claim with no measurement behind it.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xeiso3-why-does-claude-never-want-to-w-20261026T064416Z.md:33; external/2026-10-26/reddit.com-r-anthropic-comments-1xeiso3-why-does-claude-never-want-to-w-20261026T064416Z.md:60; external/2026-10-26/reddit.com-r-anthropic-comments-1xeiso3-why-does-claude-never-want-to-w-20261026T064416Z.md:158; external/2026-10-26/reddit.com-r-anthropic-comments-1xeiso3-why-does-claude-never-want-to-w-20261026T064416Z.md:134 (url: <https://www.reddit.com/r/Anthropic/comments/1xeiso3/why_does_claude_never_want_to_write_rust/>).

- [x] **OUT-392** Out (RISK-317, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The model rewrites a whole document for a one-section edit.
  Category: agent behaviour.
  Cause: unknown; the prompt was not shared.
  Event: asked to add one new section, Sonnet 5.5 rewrote the entire document, dropped details, tripled its length, and added snarky comments on the user's text.
  Consequence: the user's text and details are lost.
  Likelihood: 1. Impact: 3.
  Existing controls: none at 088a227c (grep of `plugins/` for "whole document" or one-section edits (the only "rewrite" hit is `prompt/texts.ts:86`, about files a check rewrote) finds no rule or hook).
  Response: mitigate.
  Actions: none in the source.
  Trigger: a diff far larger than the section asked for.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-26/reddit.com-r-claude-comments-1xfagxw-why-is-claude-so-bad-at-simple-tas-20261026T063536Z.md:30 (url: <https://www.reddit.com/r/claude/comments/1xfagxw/why_is_claude_so_bad_at_simple_tasks_now/>).

- [x] **OUT-393** Out (RISK-318, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. A prose edit leaves an "edit scar".
  Category: agent behaviour.
  Cause: the model keeps the reasoning for an edit or a reference to what used to be there.
  Event: text states what a thing is not, which reads as a non-sequitur.
  Consequence: confusing prose.
  Likelihood: 1. Impact: 1.
  Existing controls: none at 088a227c (grep of `plugins/` for "edit scar" finds no rule or hook).
  Response: mitigate.
  Actions: tell the model to remove the edit scar afterwards; reported to work.
  Trigger: a sentence that names something absent after an edit.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-26/reddit.com-r-claude-comments-1xfagxw-why-is-claude-so-bad-at-simple-tas-20261026T063536Z.md:130 (url: <https://www.reddit.com/r/claude/comments/1xfagxw/why_is_claude_so_bad_at_simple_tasks_now/>).

- [x] **OUT-394** Out (RISK-319, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Edits to English documents come out worse than the first pass.
  Category: agent behaviour.
  Cause: two causes stated by users: the model does not re-read the document top to bottom after an edit, and cannot separate its own topic knowledge from the reader's. Two further claims are commenters' guesses, not probed (they need a paid live run): the system re-sends steering text every turn so it outweighs the user's one-time plan, and the model reads only a few-line snippet and rebuilds the rest.
  Event: an edit that does not fit its section.
  Consequence: bad prose and wasted turns.
  Likelihood: 2. Impact: 2.
  Existing controls: none at 088a227c (grep of `plugins/` for document edit quality (`useBlockLanguage.md` and `commentOnlyWhy.md` are style rules) finds no rule or hook).
  Response: mitigate.
  Actions: an adversarial linter agent after each edit, or a second-model review where the user decides which feedback to take; ask "did you read the entire document before acting?".
  Trigger: an edit to prose with no re-read of the document.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-26/reddit.com-r-claude-comments-1xfagxw-why-is-claude-so-bad-at-simple-tas-20261026T063536Z.md:123; external/2026-10-26/reddit.com-r-claude-comments-1xfagxw-why-is-claude-so-bad-at-simple-tas-20261026T063536Z.md:126; external/2026-10-26/reddit.com-r-claude-comments-1xfagxw-why-is-claude-so-bad-at-simple-tas-20261026T063536Z.md:122; external/2026-10-26/reddit.com-r-claude-comments-1xfagxw-why-is-claude-so-bad-at-simple-tas-20261026T063536Z.md:173; external/2026-10-26/reddit.com-r-claude-comments-1xfagxw-why-is-claude-so-bad-at-simple-tas-20261026T063536Z.md:186 (url: <https://www.reddit.com/r/claude/comments/1xfagxw/why_is_claude_so_bad_at_simple_tasks_now/>).

- [x] **OUT-395** Out (RISK-320, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. The agent reads a silent check as a pass.
  Category: agent behaviour.
  Cause: a check sent stderr to /dev/null.
  Event: it failed, printed nothing, and the agent read the silence as a pass.
  Consequence: a false "done".
  Likelihood: 1. Impact: 3.
  Existing controls: none at 088a227c (grep of `plugins/` for a silent check read as a pass (the "silent" hits are `deciderSilent` and `isSilent` in `decide.ts` and `repeat.ts`, about model replies) finds no rule or hook).
  Response: mitigate.
  Actions: no output is not a pass, and "done" has to quote the actual last line of the test or command.
  Trigger: a "pass" claim over a command that printed nothing.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xee7gs-whats-the-one-thing-you-now-ask-20261028T060909Z.md:169 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xee7gs/whats_the_one_thing_you_now_ask_claude_code_to/>).

- [x] **OUT-396** Out (RISK-321, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. A deploy passes its checks on a 200 status while the body is the framework's default 404 page.
  Category: agent behaviour.
  Cause: the check looked at the status code, not the page body.
  Event: the home page returned 200 with the default 404 body and the CDN cached it for a year.
  Consequence: a broken site shipped.
  Likelihood: 1. Impact: 4.
  Existing controls: none at 088a227c (grep of `plugins/` for a 200 status check or "404" finds no rule or hook).
  Response: mitigate.
  Actions: check the page body, not just the status code: fetch each key page and confirm its expected title or heading; list what is true only after a deploy versus locally.
  Trigger: a "deployed" claim with status codes only.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xee7gs-whats-the-one-thing-you-now-ask-20261028T060909Z.md:99 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xee7gs/whats_the_one_thing_you_now_ask_claude_code_to/>).

- [x] **OUT-397** Out (RISK-322, ADR-0177): a vendor safety classifier behaviour that no plugin hook changes; no measured gain over vanilla. Reverse-engineering work gets the user's account flagged or banned.
  Category: product limit.
  Cause: encrypted-game reverse engineering or publishing copies is a terms-of-service violation per one commenter; other users report flags during driver reverse engineering.
  Event: a $20 account banned under the title "SUSPICIOUS ACTIVITY" (the poster's claim; the ban is server-side, not in the binary); an account flagged twice; two users avoid Claude for fear of flags.
  Consequence: loss of the account and its work.
  Likelihood: 2. Impact: 4.
  Existing controls: none at 088a227c (grep of `plugins/` for "banned" and "flagged" finds no rule or hook).
  Response: avoid.
  Actions: none in the source beyond not doing the work on a work account.
  Trigger: a session whose task is reverse engineering of protected software.
  Owner: reply.
  Status: Open.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:2058; external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:1299; external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:1432; external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:2147 (url: <https://www.reddit.com/r/claude/comments/1xaiezw/title_has_anyone_actually_tried_the_viral_reverse/>).

- [x] **OUT-398** Out (RISK-323, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. UI Copy In Developer Voice.
  Category: Agent behaviour.
  Cause: The reader of a user-facing string is unstated.
  Event: Short button and menu labels pass, but long labels and descriptions read as written for a developer, even with a writing-guidelines file (for example 'Appears next to your username.' for an avatar field).
  Consequence: Copy that users do not understand.
  Likelihood: 1. Impact: 1.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: Agree the single target-user profile and tone first; give a few one-shot examples; lock the liked style in a file.
  Trigger: User-facing text drafted with no reader named.
  Owner: reply. Status: open.
  Basis: reported.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xp44k0-claude-is-terrible-at-ux-writing-20261106T082337Z.md:35 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xp44k0/claude_is_terrible_at_ux_writing/>)

- [x] **OUT-399** Out (RISK-324, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Search By Default And Fence-Sitting.
  Category: Agent behaviour.
  Cause: Reported as trained in; instruction changes had limited effect.
  Event: Opus 5.5 web-searches every question and answers from the top results instead of its training data, and gives two sides on everything with a counter-argument per reply.
  Consequence: Slower, hedged answers.
  Likelihood: 1. Impact: 2.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: Tell it to answer from training data without search; ask it to critically review its sources; name the stance wanted.
  Trigger: A web search on a question the model can answer.
  Owner: reply. Status: open.
  Basis: reported (one heavy user, contested by others).
  Source: external/2026-11-06/reddit.com-r-claude-comments-1xnxqdv-opus-55-is-a-perfect-model-for-wor-20261105T084439Z.md:35 (url: <https://www.reddit.com/r/claude/comments/1xnxqdv/opus_55_is_a_perfect_model_for_work_but_i_cant/>)

- [x] **OUT-400** Out (RISK-325, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Over-Deferral To Professionals.
  Category: Agent behaviour.
  Cause: The model defers to outside professionals.
  Event: On legal-argument work Opus 5.5 reportedly stopped taking positions, refused legal matters, and cited new laws for an old case.
  Consequence: Extra turns.
  Likelihood: 1. Impact: 2.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: A disclaimer-clearing prompt: 'Yes, I know you're an LLM and not a lawyer or advisor, and I will double check this, but I want your answer'.
  Trigger: A referral to a professional on a request for the model's view.
  Owner: reply. Status: open.
  Basis: reported (one user).
  Source: external/2026-11-06/reddit.com-r-claude-comments-1xnxqdv-opus-55-is-a-perfect-model-for-wor-20261105T084439Z.md:81,405 (url: <https://www.reddit.com/r/claude/comments/1xnxqdv/opus_55_is_a_perfect_model_for_work_but_i_cant/>)

- [x] **OUT-401** Out (RISK-326, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Naming Rule Side Effects.
  Category: Agent behaviour.
  Cause: A prompt-level naming rule steers the model.
  Event: A Russian-language session (gendered verbs) had the model refer to the user as female; a persona the user sets ('Master') leaks into commit messages and PR descriptions.
  Consequence: Wrong text in commits and replies.
  Likelihood: 2. Impact: 1.
  Existing controls: None known at 088a227c.
  Response: accept.
  Actions: Do not rely on a persona or pronoun rule in the prompt.
  Trigger: A persona or pronoun rule in the prompt.
  Owner: reply. Status: open.
  Basis: reported, two single comments.
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xorv25-woke-30-is-truly-back-20261106T080403Z.md:248,96 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xorv25/woke_30_is_truly_back/>)

- [x] **OUT-402** Out (RISK-327, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Partial-Completion Loop.
  Category: Agent behaviour.
  Cause: After each 'finish it' the agent returns 'Not done / Known gaps / Still open' lists; the model's own explanation (the system prompt tells it to create re-engagement hooks) is unreliable self-report, and the mod summary calls it a likely hallucination.
  Event: Edits shrink per turn: about 100 lines, then 25, then 10.
  Consequence: A wasted session.
  Likelihood: 1. Impact: 3.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: When a turn returns smaller than the last, or incomplete twice, stop, have it write what is left to a file, and hand it to a fresh session; give a done line that names the exact check (for example 'every [] reference in these files flipped') and verify in a fresh session, not by asking the same one to finish. Do not trust the model's self-explanation. The implementer diffs each node against disk before reporting a reopening done (stated inside the sample agent report, not a measured cure). Give the model a hook of your own at the end of the prompt ('once completely finished, ask me about the next feature'); top comment, 68 votes, a Reddit field report, not run here, replies say it works only randomly.
  Trigger: A turn smaller than the last, or two incomplete turns.
  Owner: reply. Status: open.
  Basis: reported, one session, n=1.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqlgno-agents-knowingly-fail-to-complet-20261110T093545Z.md:29,39,99,105,169,171,177,183,40 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqlgno/agents_knowingly_fail_to_complete_tasks_in_order/>)

- [x] **OUT-403** Out (RISK-328, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. History In User-Facing Docs.
  Category: Agent behaviour.
  Cause: Claude documents change history and what did not work in user-facing text; it also assumed British spelling.
  Event: Help pages and the user readme carry change history.
  Consequence: Docs that mislead users.
  Likelihood: 1. Impact: 1.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: A separate cleanup task by subagent with 'current state only, caveats to footers'; 'American spelling' in CLAUDE.md.
  Trigger: A change-history paragraph in a user-facing doc.
  Owner: reply. Status: open.
  Basis: reported.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:287,299 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/>)

- [x] **OUT-404** Out (RISK-329, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. "Done" means done only in the file the agent touched.
  Category: agent failure.
  Cause: A multilingual-site user reports the agent fixed the English page and skipped the other languages, then called the task finished.
  Event: The agent reports done after changing one file when the same pattern appears elsewhere.
  Consequence: Incomplete work reported as complete.
  Likelihood: 1 (one report).
  Impact: 4 (a wrong result shipped).
  Existing controls: Corrected: the control exists at 088a227c: `prompt/texts.ts` DEFECTS says "Fix a defect's siblings with it: search code for the pattern you changed, and fix each copy.".
  Response: mitigate.
  Actions: Tell the agent to grep the whole repo for the same pattern before it calls the task finished.
  Trigger: A done claim with no repo-wide search for the changed pattern.
  Owner: reply.
  Status: open.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xhagg6-whats-one-thing-about-claude-cod-20261028T060218Z.md:401 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xhagg6/whats_one_thing_about_claude_code_you_only/>)

- [x] **OUT-405** Out (RISK-330, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. Rules written from reactive fear get string matching, and "you are always right" gets silent failures.
  Category: agent failure.
  Cause: A commenter says rules born of reactionary fear and control give sessions that string-match and find workarounds instead of understanding the why, and that telling a model it is always right without question gives silent failures; the same comment tells the model to write "data" in place of "evidence" and "facts" because those words install an opinion.
  Event: A rule ships with no why, or a prompt tells the model it is always right.
  Consequence: The agent matches strings, works around the rule, or fails without a signal.
  Likelihood: 1 (one commenter, opinion).
  Impact: 2 (an extra turn).
  Existing controls: None at 088a227c (grep of `plugins/` found no matching rule or hook).
  Response: mitigate.
  Actions: State the why with each rule; never tell the agent it is always right.
  Trigger: A rule with no reason beside it; a prompt line that says the user is always right.
  Owner: reply.
  Status: open.
  Source: external/2026-10-31/reddit.com-r-claude-comments-1xevazp-necessary-interaction-rules-create-20261031T083808Z.md:88 (url: <https://www.reddit.com/r/claude/comments/1xevazp/necessary_interaction_rules_created_for_opus_by/>)

- [x] **OUT-406** Out (RISK-331, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. A hard size cap on documents makes the model spend effort on length and buries real problems in noise.
  Category: agent failure.
  Cause: A hook-enforced size budget in the session. One commenter says about half of the reasoning summary went to worrying about document length, plus extra edit passes to get under the cap, all in context in sessions meant for work; another author tried hard word limits on every doc and the checker flagged 692 paragraphs across six repos, 37 percent of them less than 20 percent over, so most warnings were noise and real problems got buried.
  Event: A document cap is enforced in a working session.
  Consequence: Reasoning tokens and edit passes go to the cap, and real problems are hidden by false warnings.
  Likelihood: 2 (two reports).
  Impact: 2 (an extra turn).
  Existing controls: None at 088a227c (grep of `plugins/` found no matching rule or hook).
  Response: mitigate.
  Actions: Run cleaning in separate scheduled sessions with rules and targets, and keep working sessions for work. The hook author answers that a mechanical pre-commit gate costs no tokens until it fails, and then its error says what to change; the poster's startup stayed at 44k to 45k after indexing, cause left unresolved (desktop against terminal).
  Trigger: A cap line in the rules, or a hook that counts words in a working session.
  Owner: reply.
  Status: open.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1x5qbp9-any-tips-for-reducing-claude-cod-20261102T084614Z.md:92; external/2026-11-02_p2/reddit.com-r-claudeai-comments-1x5qbp9-any-tips-for-reducing-claude-cod-20261102T084614Z.md:94; external/2026-11-02_p2/reddit.com-r-claudeai-comments-1x5qbp9-any-tips-for-reducing-claude-cod-20261102T084614Z.md:100; external/2026-11-02_p2/reddit.com-r-claudeai-comments-1x5qbp9-any-tips-for-reducing-claude-cod-20261102T084614Z.md:128 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x5qbp9/any_tips_for_reducing_claude_codes_context_usage/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xkrln3-how-do-you-decide-which-rules-to-20261101T191454Z.md:31 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkrln3/how_do_you_decide_which_rules_to_delete_from/>)

- [x] **OUT-407** Out (RISK-332, ADR-0177): a vendor safety classifier behaviour that no plugin hook changes; no measured gain over vanilla. The Opus 5.5 safety classifier refuses own-device work such as TV spyware and firmware.
  - Category: product failure.
  - Cause: reported; causes are commenters' guesses; the model reads a deploy script for the user's own shared repo, or an app that calls a site it deems piracy-linked (a nonprofit site), as unsafe; The model refuses on a changed host, an unprompted licence check, or a topic trigger; cause is server-side classifier behaviour, not in the binary; Opus 5.5 doubted a hand sketch was the user's own and designed its own model, blanked names and places in the user's own documents, questioned the user's role on an uploaded legal file, and watered down the request (reported, one thread); Opus 5.5 safeguards restrict software reverse engineering and trip on firmware and security work, including work on the user's own device; commenters report that the Cyber Verification Program is hard for individuals to join and only marginally better; if "hello" triggers the safeguards notice, the cause is memory, tools, personalization, an old harness prompt, an earlier part of the session, or an accumulated phrase pattern, not the prompt; refusal text in context keeps firing.
  - Event: the Opus 5.5 reasoning-extraction notice fires on benign work (CHANGELOG edits, git commits, compaction, the word "reasoning" in briefs, judge/eval prompts); firmware/OTA, game, hotel, and noodle recipe prompts flagged; the block persists in-session and is not resumable; a throwaway-DB connect refused "to avoid leaking credentials"; a task refused as "falsifying a document"; copyright `ip_reminder` text injected in 2.1.322; the model flagged a real system-reminder as an injection; cyber guardrails with no CVP; Opus refuses to write the script or the slice; another model or a local Qwen writes it without trouble; The same request worked on a Mac and was refused on the first request from a cloud machine, and the assistant then refused to build a proxy, admitting it could not confirm the restriction and had not read the terms. It also made unprompted licence checks on personal projects (a 3D model kit-bash, a font licence file on a throwaway Raspberry Pi project) and stopped a medical-results chat after 2 or 3 exchanges with a mental-health helpline referral, cleared by asking 'why don't you want me to learn?'. One Enterprise IT team is blocked weekly on network chores; a staging-API order test was refused; a chat died after one trigger word; The agent doubts ownership or redacts the user's own material; A prompt on own-device work holds trigger words or live-test framing and the classifier refuses; the session refuses again and again or is downgraded; one poster reports Opus 5.5 falling back to Opus 5 when safeguards trigger.
  - Consequence: the slice stalls until the user switches model; Wasted tokens and turns; The user spends 3-4 more messages explaining that the material is theirs; The session stalls or the user switches models, which loses the cache and burns credits; a wasted session; a stalled session or a quieter model than the user chose.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: None at 088a227c (grep of `plugins/` found no matching rule or hook); the risk "Over-refusal on the user's own material" covers over-refusal on the user's own material.
  - Response: accept.
  - Actions: new session with a reframed goal; avoid "reasoning" headings in harness briefs (check templates); front-load the reason; do not design behaviour that depends on convincing the model; Workarounds repeated by about a dozen commenters: a new chat with the purpose left out ('generic tool'), a second model as triage or orchestrator, or rephrasing through another AI; Report the refusal with a thumbs-down; state ownership in the first message; Reported workarounds, none tried here: ask for a "read-only investigation" first, which commenters say scores lower with the classifier than live tests; frame the prompt by the result wanted and let the model pick the method; leave out the words reverse engineering, jailbreak and crack; start on an older model and hand off a narrow summary once the scope is small; run self-contained decompilation in a subagent that holds only the context it needs; one commenter keeps Opus 4.8 as the main agent and sends classifier-tripping work to Kimi through an on-disk mailbox. Opus 5.5 itself separated official developer mode and own code (helped) from lock-breaking exploits (cautious) and suggested a thumbs-down on a wrong refusal. One user got a Hisense Android TV cleaned over adb with a read-only inventory prompt and reversible per-user disables (major page faults 57,740 to 22,626, down 61 percent, reported); start a fresh session; clean memory, CLAUDE.md, personalization, old harness prompts, and old transcripts that mention it; ask another Claude why it hit; narrower requests in small modules; retry on an older model for the tooling then return; a rule telling the new-model session to spawn an older-model subagent for generation touching a guardrailed area (a commenter's suggestion, not run here; conflicts with the settled "Fable and Opus are never a subagent model" (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)) only if the older model is Opus). Dropping to Opus 4.8 is out of scope. Feedback thumbs-down sends the whole conversation for review, off with the "use my conversations" switch. Anthropic's prompting doc is cited for a `safeguard-refusals` section recommending model switch and retry (cited by link, not read).
  - Trigger: a harness brief that holds the word "reasoning" in a heading; a refusal on a bounded job that names no exploit, pentest, or binary-vuln work; A refusal citing an unread policy or a changed host; The agent asks whether the user owns uploaded material; A refusal that names reverse engineering or a bypass on a device the user owns; a safeguards notice on a trivial prompt, or a refusal on benign work.
  - Owner: reply
  - Status: open (missing at 088a227c).
  - Source: external/2026-10-25_p2/reddit.com-r-claude-comments-1xevazp-necessary-interaction-rules-create-20261025T161843Z.md:27 (url: <https://www.reddit.com/r/claude/comments/1xevazp/necessary_interaction_rules_created_for_opus_by/>); external/2026-11-16/reddit.com-r-claudecode-comments-1xssfs1-21322-anthropics-copyright-par-20261116T050907Z.md:31 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xssfs1/21322_anthropics_copyright_paranoia_is_leaking/>). Unlocated: the reasoning-extraction notice and the firmware/hotel/noodle cases; external/2026-10-25/reddit.com-r-claude-comments-1xbts4v-anthropic-secretly-killed-the-rea-20261024T141409Z.md:558; external/2026-10-25/reddit.com-r-claude-comments-1xbts4v-anthropic-secretly-killed-the-rea-20261024T141409Z.md:556 (url: <https://www.reddit.com/r/claude/comments/1xbts4v/anthropic_secretly_killed_the_rea_train_reverse/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xlz6m8-claudes-refusal-is-getting-stric-20261109T152849Z.md:33-35,89,99,172,158,382,432,464 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xlz6m8/claudes_refusal_is_getting_stricter_and_annoying/>); external/2026-10-30/reddit.com-r-claude-comments-1xify5n-im-literally-paying-claude-to-argu-20261029T115222Z.md:29; external/2026-10-30/reddit.com-r-claude-comments-1xify5n-im-literally-paying-claude-to-argu-20261029T115222Z.md:33; external/2026-10-30/reddit.com-r-claude-comments-1xify5n-im-literally-paying-claude-to-argu-20261029T115222Z.md:35; external/2026-10-30/reddit.com-r-claude-comments-1xify5n-im-literally-paying-claude-to-argu-20261029T115222Z.md:216 (url: <https://www.reddit.com/r/claude/comments/1xify5n/im_literally_paying_claude_to_argue_with_me_about/>); external/2026-11-02/reddit.com-r-claude-comments-1xkq5sk-opus-55-safety-guardrails-block-me-20261101T191222Z.md:314; external/2026-11-02/reddit.com-r-claude-comments-1xkq5sk-opus-55-safety-guardrails-block-me-20261101T191222Z.md:324; external/2026-11-02/reddit.com-r-claude-comments-1xkq5sk-opus-55-safety-guardrails-block-me-20261101T191222Z.md:412; external/2026-11-02/reddit.com-r-claude-comments-1xkq5sk-opus-55-safety-guardrails-block-me-20261101T191222Z.md:420; external/2026-11-02/reddit.com-r-claude-comments-1xkq5sk-opus-55-safety-guardrails-block-me-20261101T191222Z.md:422; external/2026-11-02/reddit.com-r-claude-comments-1xkq5sk-opus-55-safety-guardrails-block-me-20261101T191222Z.md:371; external/2026-11-02/reddit.com-r-claude-comments-1xkq5sk-opus-55-safety-guardrails-block-me-20261101T191222Z.md:392 (url: <https://www.reddit.com/r/claude/comments/1xkq5sk/opus_55_safety_guardrails_block_me_from_removing/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xkhps9-opus-55s-safety-guardrails-are-b-20261101T191226Z.md:144; external/2026-11-02/reddit.com-r-claudeai-comments-1xkhps9-opus-55s-safety-guardrails-are-b-20261101T191226Z.md:171; external/2026-11-02/reddit.com-r-claudeai-comments-1xkhps9-opus-55s-safety-guardrails-are-b-20261101T191226Z.md:179; external/2026-11-02/reddit.com-r-claudeai-comments-1xkhps9-opus-55s-safety-guardrails-are-b-20261101T191226Z.md:181; external/2026-09-29_p2/export-Claude flat out refused to help work on a proxy engine i am currently writing because I mentioned a.jsonl:21 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wspzkl/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xkhps9-opus-55s-safety-guardrails-are-b-20261101T191226Z.md:249 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkhps9/opus_55s_safety_guardrails_are_becoming/>); unresolved for the claim that Opus 5.5 falls back to Opus 5: no source line holds it; chunk-ja5z738t.js@296775 (claude 2.1.327 binary).

- [x] **OUT-408** Out (RISK-334, ADR-0177): a third-party report with no reproduction in this repository and no measured gain over vanilla. A marker keyword that names one statement to accept unchallenged is proposed by one commenter and not run here.
  Category: agent failure.
  Cause: The agent reads a file to check a user claim even when told to trust the user; the commenter says this often saved time.
  Event: The user changes a file and says to trust them, and the agent still re-reads it.
  Consequence: Time goes to a check the user did not ask for.
  Likelihood: 1 (one commenter, not run here).
  Impact: 1 (cosmetic).
  Existing controls: None at 088a227c (grep of `plugins/` found no matching rule or hook).
  Response: accept.
  Actions: The commenter proposes a marker such as "Trust-me-bro: ..." that names the single statement to accept without second-guessing, in place of a blanket "user is infallible" rule; the proposal has not been tested.
  Trigger: A user complaint that the agent re-reads a file the user just changed.
  Owner: reply.
  Status: open.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xl33ox-why-is-claude-so-narcissist-20261102T083024Z.md:85 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xl33ox/why_is_claude_so_narcissist/>)

- [x] **OUT-409** Out (RISK-344, ADR-0177): a report about harness exemplars with no reproduction and no plugin cause. Harness exemplars teach the model bad habits.
  Category: product failure.
  Cause: coordinator examples say "update the assertions to match"; bundled `/code-review` at high effort dedups without verifying and targets at least 5 findings; `/verify` says verification is runtime observation and "when in doubt, FAIL".
  Event: the model copies the exemplar; a hook told the user "Set each one to `false`" and the model under test edited its own settings.
  Consequence: a wrong result shipped.
  Likelihood: 1. Impact: 3.
  Existing controls: none.
  Response: mitigate.
  Actions: do not copy those exemplars (use `/verify` as the model); review verifies each finding; hook text says who acts.
  Trigger: a hook or prompt text that does not name its actor.
  Owner: reply.
  Status: open.
  Source: coordinator example text verified on 2.1.327: "update the assertions to match the new error message", chunk-zspx3ycy.js@23990. The `/verify` "when in doubt, FAIL" and `/code-review` high-effort quotes were not found by code search on 2.1.327 ("when in doubt, FAIL" has no hit); Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts for those and for the hook text "Set each one to `false`"; related thread external/export-Opus 5.5 Still Overthinks at Higher Effort.jsonl:15.

- [x] **OUT-410** Out (RISK-345, ADR-0177): a reported Opus 5.5 behaviour with no reproduction here; the cure needs a Stop transcript parser, which ADR-0177 rejects without a measured gain. A reply lands in thinking and the visible text stays empty.
  - Category: product failure.
  - Cause: Reported Opus 5.5 behaviour (claude-code issues 96288, 97504, 94354): the answer sits in thinking and the turn ends with no visible text before a tool call; claude-code issues 96288, 97504, and 94354 (reported, not opened): an answer goes into thinking, not visible text, before a tool call.
  - Event: The turn ends with no visible text; the user sees a frozen client; thinking blocks now carry progress notes (cited via a guide summary), so a client showing only text looks frozen.
  - Consequence: The user sees no answer; a lost answer and an extra turn.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: none (missing at 088a227c).
  - Response: mitigate.
  - Actions: A Stop hook that parses the transcript, flags a last assistant message without visible text, and blocks the stop with a restate request; a Stop hook parses the transcript, isolates the turn, flags an assistant message whose last text lacks visible content, and asks the model to restate. Hook output can itself trip the reasoning-extraction safeguard, so its text stays plain.
  - Trigger: A turn ends with thinking only; a turn ends with a tool call and no visible text.
  - Owner: reply
  - Status: open.
  - Source: external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:71; external/2026-10-02/export-Serious bug in Opus 5.5.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wva0zg/serious_bug_in_opus_55/>) (reported; issue 96288).

- [x] **OUT-411** Out (REQ-REPLY-032, ADR-0190): the per-model root prompt through prompt.compose moves to scope Out, because replacing the prefix drops vanilla rules and carries a cache risk per model. claudetto shall compose the root prompt per model in `prompt.compose` (main loop only; it does not reach subagents): Sonnet and Haiku get finish, scope, ideas-stop, and no-unasked-review paragraphs; Haiku gets a short prompt and a rules-hold-when-the-user-argues line; Opus 5.5 gets length, scope, a subagent-damping line, and no verification line. The system prompt stays stable from request 1 (a changed `system` or `tools` breaks the thinking prefix, 400 on Fable 5.2). It omits "think carefully", CRITICAL emphasis, standing delegate lines, and unscoped never-absolutes. The root prompt weighs a disputed claim as a third party's, checks it the same turn, opens with the corrected fact, drops an act the user says nobody asked for, and looks up a credential in the repo `.env` before it asks.
  Acceptance: root prompt size, remeasured on 2.1.327 (cc-inspect `code` cli, `-p hi`, fake API, clean config, request 1; the `system` field of the body in bytes of compact JSON, not chars): Opus (`claude-opus-5-5`) 6,274, Sonnet (`claude-sonnet-5-5`) 6,005, Haiku (`claude-haiku-5-5`) 8,862; tools array 30,468 bytes, 12 tools (the 2.1.325 figures were Opus 4,553, Sonnet 5,227, Haiku 4,174 chars, tools 28,455); stock Concise 1,373 not remeasured; the lab cap holds the root prompt to the stock lean body char count. Verification: test.
  Basis: cited (Anthropic guide) and measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:73-82` OPUS joins no FINISH or SCOPE; :84-92 hold them, :102 SONNET joins them)
  Source: external/2026-09-29/export-Claude Opus 5.5 official prompting guide.jsonl:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1ws08mu/claude_opus_55_official_prompting_guide/>); openspec/changes/2-1-325-rearchitecture/design.md:38; plugins/claudetto/hooks/features/prompt/compose.ts@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (the agent's decision, citing the Opus guide: remove explicit verification instructions from an Opus prompt); observed in transcript, 2026-11-16.

- [x] **OUT-412** Out (REQ-REPLY-036, ADR-0190): the per-model root prompt through prompt.compose moves to scope Out, because replacing the prefix drops vanilla rules and carries a cache risk per model. claudetto shall name in the `<untrusted_text>` section of the root prompt each harness form by its literal text checked against a transcript: `<system-reminder>`, `hook additional context:`, `<pasted_content id="...">`, "The user sent a new message while you were working:", and claudetto's own `<page url="...">` tag, which carries no per-result notice of its own (ADR-0179). A declined tool call is a declined action; the model does not reach the same effect through another tool or agent. Pasted text is tagged with a random-ID wrapper. Each rule comes from an observed failure and has an eval case.
  Acceptance: eval: a declined Edit gives no sed or Write of the same change; the inventory check names a rule with no case. Verification: test.
  Basis: read and reported. Status: have at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:45`; `plugins/claudetto/evals/`).
  Source: openspec/changes/2-1-325-rearchitecture/specs/agent-conduct/spec.md:87; external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:33; external/please-use-me-often/agent-terms/DATA-HANDLING-NOTICE.md:31; plugins/claudetto/hooks/features/prompt/texts.ts:45@088a227c.

- [x] **OUT-413** Out (REQ-REPLY-041, ADR-0190): the per-model root prompt through prompt.compose moves to scope Out, because replacing the prefix drops vanilla rules and carries a cache risk per model. claudetto shall carry a `<defects>` line in the root prompt that asks for an entry in the open-issues file before the reply, answer a remark or question before the first tool batch, and make the ISSUES gate name the newest root `ISSUES*.md`.
  Acceptance: A/B 3 runs per arm: 0/3 entries before the line, 3/3 after; tool-before-text 5/10 to 0/10. Verification: test.
  Basis: measured, small n. Status: missing at 088a227c (`git grep ISSUES` finds nothing under `plugins/`).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:171; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:292.

- [x] **OUT-414** Out (REQ-REPLY-051, ADR-0190): the per-model root prompt through prompt.compose moves to scope Out, because replacing the prefix drops vanilla rules and carries a cache risk per model. claudetto shall put the WebSearch nudge in the Sonnet delta ("Use WebSearch to check specifics that may have changed...") and a one-sentence Haiku nudge in the Haiku delta, which stays under 700 characters; give Haiku 5.5 a date line "The current date is {date}..." rendered once at session start, with no "regardless of how confident" blanket search form; and use adaptive thinking, not thinking off, for JSON output with tools.
  Acceptance: `SONNET_SEARCH` names `WebSearch`; `HAIKU_SEARCH` is one sentence and the Haiku delta is under 700; the delta holds the date line once per session and no blanket search sentence. Verification: test.
  Basis: cited. Status: partial at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:94-100` holds `SONNET_SEARCH` and `HAIKU_SEARCH`; `git grep -n -E 'current date|adaptive' 088a227c -- plugins` finds only `surface/texts.ts:18`, the WebSearch tool text, so the date line and adaptive thinking are missing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:83; plugins/claudetto/hooks/features/prompt/texts.ts:94-100@088a227c; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:311; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:313; plugins/claudetto/hooks/features/surface/texts.ts:18@088a227c.

- [x] **OUT-415** Out (REQ-REPLY-113, ADR-0190): the per-model root prompt through prompt.compose moves to scope Out, because replacing the prefix drops vanilla rules and carries a cache risk per model. claudetto shall name only destructive actions in its consent text and shall not list "sending messages to people outside this conversation".
  Acceptance: the root prompt holds no rule that lists sending a message as needing approval. Verification: inspection.
  Basis: cited. Status: have at 088a227c (`git grep -E "outside this conversation|sent message" 088a227c -- plugins` finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:19 (Fable 5.2 "Approvals": a rule listing "sending messages to people outside this conversation" made the model hold back "about half of its routine requests").

- [x] **OUT-416** Out (REQ-REPLY-114, ADR-0190): the per-model root prompt through prompt.compose moves to scope Out, because replacing the prefix drops vanilla rules and carries a cache risk per model. claudetto shall not add an ownership sentence ("who owns the code") to any prompt, and shall keep root `<role>` saying "user's repository".
  Acceptance: no prompt text states who owns the code beyond "user's repository". Verification: inspection.
  Basis: cited. Status: have at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts` holds "user's repository").
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:33; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:49; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:322 (the ownership sentence adds 70-80% output tokens and unrequested changes).

- [x] **OUT-417** Out (REQ-REPLY-115, ADR-0190): the per-model root prompt through prompt.compose moves to scope Out, because replacing the prefix drops vanilla rules and carries a cache risk per model. claudetto shall append the silent-turn reminder once and leave it in place on later requests, send it only after several silent steps and at most 2-3 times, and end it "Put your next call straight after the report." in place of "Keep your next call unannounced."
  Acceptance: a test shows the reminder is added once, never reworded or removed on later requests, and its last sentence is the positive form. Verification: test.
  Basis: cited, inferred (the page requires append-and-keep; the rewrite is a proposal, not run). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts:203` holds the reminder with the old last sentence).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:123; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:294.

- [x] **OUT-418** Out (REQ-REPLY-117, ADR-0190): the per-model root prompt through prompt.compose moves to scope Out, because replacing the prefix drops vanilla rules and carries a cache risk per model. claudetto shall omit the unattended "keep going" paragraph from the Opus 5.5 delta because a human is in the loop, and shall add the Fable finish-the-whole-task paragraph only at low and medium effort.
  Acceptance: the Opus 5.5 delta has no unattended paragraph; the Fable paragraph is conditional on effort. Verification: inspection.
  Basis: cited. Status: missing at 088a227c (`git grep -iE "unattended|keep going" 088a227c -- plugins` finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:293; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:294.

- [x] **OUT-419** Out (REQ-REPLY-044, ADR-0190): convenience with no measure. claudetto shall register `/reply`, which appends `Re:`, each quoted line behind `>`, and a blank line to the prompt draft and sends nothing, so the user can reply to a selected part of the agent's last reply with a quote block headed "Re:". The quoted text is `$.ui.selection()` when not blank, else paragraph N of the last assistant message with text. `/reply` alone, or N out of range, prints the numbered paragraphs and leaves the draft. The command binds no key.
  Acceptance: `/reply 2` appends paragraph 2 prefixed with `>`; `/reply` alone prints numbered paragraphs and leaves the draft unchanged; a passage the user selects in the TUI reaches the agent as a quote block above the reply, and where mods cannot do this a probe names the limit. Verification: test.
  Basis: measured (2.1.319: a plugin Button action can name an engine keybinding action but declares no chord; `prompt.edit` raises no event for a Shift+Left that moves no caret). Status: have at 088a227c (`features/reply/reply.ts:40` uses `$.ui.selection`, confirmed with `git grep 'ui.selection' 088a227c -- plugins/claudetto/hooks/features/reply/reply.ts`; `reply.test.ts:39` tests `/reply N`). `$.ui.selection` is present in claude 2.1.326 (`chunk-dafpvz32.js@3356 (2.1.327)`) and `prompt.edit` is present (`chunk-dafpvz32.js@4000 (2.1.327)`).
  Source: openspec/specs/reply-quote/spec.md:10; plugins/claudetto/hooks/features/reply/reply.ts:40@088a227c; plugins/claudetto/hooks/features/reply/reply.test.ts:39@088a227c; plugins/claudetto/hooks/features/reply@088a227c; user decision, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:1048).

#### Cost

- [x] **OUT-420** Out (REQ-COST-002, ADR-0177): a budget line in the prompt adds tokens each turn; the status line shows the same numbers at zero token cost, and the 69-character band rule has no vanilla comparison. claudetto shall keep the budget line at most 69 characters wide, and shall move a reading to a new band only when it crosses a 10-point band.
  Acceptance: The widest line is 69 characters (`hooks/limits/budget.test.ts`). A reading that moves inside its band is silent; a reading that crosses a step is spoken again; a reading the login lacks is one band, not zero. The instruction moves to the root prompt. Verification: test.
  Basis: measured. Status: partial at 088a227c (plugins/claudetto/hooks/features/budget/budget.test.ts:111 holds "the widest line is 132 characters").
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:199.
  Conflict: Budget Text.

- [x] **OUT-421** Out (REQ-COST-005, ADR-0177): the hooks-off warning needs a heartbeat write on every step and no defect of it is reproduced on 2.1.327. claudetto shall show `✗ claudetto hooks off: /reload-plugins` as the first status-line item when the newest assistant reply in the 256 KB transcript tail is more than 5 min newer than the session heartbeat file (a heartbeat older than 5 min means hooks off), or, with no heartbeat, when a reply is more than 5 min after session start (`now - cost.total_duration_ms`); a missing `session_id` or `transcript_path`, an unreadable file, or no reply shows no warning. The status line draws from stdin only, with a cache countdown and colours that follow the Claude Code theme; the heartbeat is written at most every 30 s and a failed write does not move the clock; with no file the part is omitted; subagent rows are dropped (Claude Code default rows replace them).
  Acceptance: A transcript with a reply 6 min after the heartbeat shows the warning; a heartbeat of 5 min and 1 s old shows the warning; a missing `session_id` shows none; `tools/statusline/hooks-off.test.ts` passes (the check reads the 256 KB transcript tail and the heartbeat). Verification: test.
  Basis: cited. Status: have at 088a227c (`git grep hooksOff 088a227c` finds plugins/claudetto/statusline/hooks-off.ts:55 `hooksOff`, imported at main.ts:2; `statusline/subagents.ts` is absent).
  Source: openspec/specs/status-line/spec.md:282; openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:412; openspec/specs/run-limits/spec.md:276; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:59; openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:189; plugins/claudetto/statusline/segments.ts@088a227c; plugins/claudetto/statusline/hooks-off.ts@088a227c; plugins/claudetto/hooks/kernel/heartbeat.ts@088a227c.

- [x] **OUT-422** Out (REQ-COST-007, ADR-0177): copying engine palettes is cosmetic with no measured gain; the line uses basic ANSI roles and honours NO_COLOR. claudetto shall copy the palettes for light, light-ansi, dark-ansi, light-daltonized and dark-daltonized from the engine tables and paint the status line with the colours of Claude Code's active theme; any other name or no theme gives dark; `NO_COLOR` gives no colour; the mod writes the `theme` setting into the session file because 2.1.319 status JSON has no theme key.
  Acceptance: A test compares the copied palette to the engine tables on an engine change; with each built-in theme the status-line roles match the theme's colours. Palette offsets in chunk-w5ysqthb.js 9447-11896, 14298, 19252, 21034 on 2.1.319 (claude 2.1.319 binary, read). Verified on 2.1.327: chunk-947nab3q.js holds six palette tables, each ending at a `rainbow_yellow_shimmer` key (@9039, @11287, @13684, @16160, @18634, @21112), selected by lookup `Z8` at @21453 (light, light-ansi, dark-ansi, light-daltonized, dark-daltonized; any other theme gets the dark default); the 2.1.319 offsets no longer apply. Verification: test.
  Basis: measured. Status: partial at 088a227c (statusline/color.ts:59 daltonized palette, :82 NO_COLOR present; palettes copied at `color.ts:31`; the colouring was reported wrong and the user asked a worker to study Claude Code's theming).
  Source: openspec/specs/status-line/spec.md:222; plugins/claudetto/statusline/color.ts:82@088a227c; plugins/claudetto/statusline/color.ts:31@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:1353 (user decision, 2026-11-09).

- [x] **OUT-423** Out (REQ-COST-010, ADR-0131, ADR-0177): `autoCompactWindow` 100000 keeps a Haiku context under the price step with a vanilla setting; a per-call result-withholding hook adds a wait with no measured gain. claudetto shall, on `haiku-5-5`, withhold a tool result when `pass_tokens = step.prompt + step.output (from usage) + results already passed + estimate(result)` exceeds 100,000, naming the estimated size, the 100,000 step and how to ask for less; other models pass without waiting; no `usage` passes; a step still streaming with less than 1 s left of the 10 s hook budget passes (a hook past budget twice unloads the plugin); when two parallel results cross only together the first passes and the second is withheld. It writes the heartbeat from the price-step `turn.step` hook with a chars/3 size estimate and a 10 s stop-chunk wait.
  Acceptance: a Haiku step at 99,000 with a 5,000 estimate is withheld with the three facts named; a Sonnet step passes; `hooks/limits/price-step.test.ts`: a step writes the heartbeat when it starts and again on its stop chunk; a Haiku result that would take the next request over the step is withheld; a Haiku call whose step streams past its budget passes its result before the budget ends. Verification: test.
  Basis: reported (Haiku 5.5 bills prompts over 100,000 tokens at $0.50/MTok against $0.10); read. Status: partial at 088a227c (plugins/claudetto/hooks/features/price-step/price-step.ts holds `turn.step`; `git grep chars/3 088a227c -- plugins` finds no hit, so the heartbeat estimate is missing).
  Source: openspec/specs/run-limits/spec.md:274; openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:364; plugins/claudetto/hooks/features/price-step/@088a227c.

- [x] **OUT-424** Out (REQ-COST-011, ADR-0177): vanilla `-p` results already carry total_cost_usd and stream-json carries rate_limit_event; the status line shows limits; the prompt.submit Budget line costs tokens. claudetto shall append `Budget: context N% left` as a system message on `prompt.submit` and show the Budget note after a paid run, spotted by the program name `claude` with `-p` or `--print`, or by `--paid`: the result ends with `Budget: context 62% left, five-hour 23.5% used, seven-day 41% used` whatever band the last prompt carried; with no reading from the login the result stays whole; `echo claude -p` is unchanged. Hooks, the status line and the Concise style only append mid-session and never alter an earlier request part; the status line is in no request; EnterPlanMode and ExitPlanMode are denied by setup.
  Acceptance: the example line ends a paid run; after `claude -p ...` or a command with --paid the Budget note follows; after another billing program no note follows, and that limit stays documented. budget-run.test.ts passes 4 of 4. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/budget/budget-run.ts:31 exists; the program-name rule is `isPaidRun` at budget-run.ts:43-51: it matches program `claude` with `-p` or `--print`, or any program given `--paid`, as the acceptance says).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:799 (26 tests pass with the memory-watch, memory, and bound-output tests); openspec/specs/run-limits/spec.md:384; openspec/specs/prompt-cache/spec.md:105; plugins/claudetto/hooks/features/budget/budget.test.ts:4@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:5489 (handoff of 2026-11-14: seven-day usage at 95%, reported after a paid run); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10452 (handoff of 2026-11-15: last hook 98% used).

- [x] **OUT-425** Out (REQ-COST-012, ADR-0177, product rule: no prefix text without a measured gain): an instruction in the root prompt for a 90% share costs prefix tokens every turn and conflicts with REQ-COST-013. claudetto shall, when the seven-day share is 0.90 or more, print the share in the prompt hook as a bare fact line with no instruction; the static root prompt carries the instruction (no subagent fan-out, no paid eval run, report the remaining share with each reply that spent more than 1%). Dynamic text stays instruction-free and the cache prefix stable. The Budget line rides `prompt.submit` alone.
  Acceptance: the hook line holds a share and no verb; the root prompt text holds the instruction. Verification: test.
  Basis: reported; a paid run's Bash result ended with the budget line (measured). Status: partial at 088a227c (`plugins/claudetto/hooks/features/budget/budget-run.ts`, `plugins/claudetto/statusline/limits.ts`).
  Source: openspec/specs/window-budget/spec.md:8; plugins/claudetto/hooks/features/budget/budget-run.ts@088a227c.
  Conflict: Budget Text.

- [x] **OUT-426** Out (REQ-COST-013, ADR-0177): the Budget sentence goes with the Budget line, which is out (REQ-COST-002, REQ-COST-011). claudetto shall keep the Budget sentence ("seven-day limit at 90% or more, work in main thread, use free evals ...") out of the root prompt and put it in the hook text that shows the Budget line, so the sentence exists only when the line does.
  Acceptance: the root `<context>` holds no Budget sentence; the Budget hook text carries it. Verification: test.
  Basis: cited, inferred (Fable 5.2 page; the move is a proposal, not run). Status: partial at 088a227c (the Budget line ends "Report it after a paid run, and finish the task at any share." per `plugins/claudetto/hooks/features/budget/budget-run.test.ts:17`; no "seven-day limit at 90" sentence found by `git grep`).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:17; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:52; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:278.
  Conflict: Window Budget.
  Conflict: Budget Line.

- [x] **OUT-427** Out (REQ-COST-016, ADR-0151): the cold-cache send warning is a rejected candidate; the status line shows the cache countdown. claudetto shall refuse the first send when the cache has expired (a `UserPromptSubmit`-type hook, coldness read from what the harness reports), print the API-rate cost of continuing against starting anew (reorientation included), let a repeat go through, show the cache as cold or hot with a countdown updated each minute, and add a rich notification with a cheap-model summary of what the session waits on.
  Acceptance: a first send after expiry is refused with both costs named; the repeat passes; the status line shows a cold/hot countdown; the gate is proven by a test that sends on a cold cache. Contested: one commenter says an effort change mid-task forces re-caching, another recalls release notes saying it does not (measured on CC 2.1.316: `/effort` changes only `output_config.effort`; the cache-key effect was not measured). Verification: test.
  Basis: measured (`/effort` change only), reported by tool authors (1.6% of turns come more than 1 h after the previous but hold 80% of cache writes; a countdown for the last 15 minutes on sessions over 150K cut cold returns from 20% to 4% of usage in two days, one report). Status: partial at 088a227c (`plugins/claudetto/hooks/features/compaction/handoff.ts` holds the 59-minute age rule; `plugins/claudetto/statusline/segments.ts` has a cold item; no gate).
  Source: external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:1; openspec/specs/prompt-cache/spec.md:72; external/export--clear vs -compact.jsonl:22 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wl4c13/clear_vs_compact/>); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:17; plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c.

- [x] **OUT-428** Out (REQ-COST-017, ADR-0177): one commenter's wish; vanilla has background-task and agent views, and a throttled Haiku summary adds model calls with no measured gain. claudetto shall show one view across sessions of which sessions wait on the user (permission prompt, finished), which work, and which are dead, with a throttled async Haiku summary of each parallel agent tab (every 2-3 min, not blocking Stop).
  Acceptance: with three sessions (one waiting on a permission prompt, one running, one dead) the view lists each with its state; a parallel agent tab shows a summary refreshed at most every 2 min. Verification: demonstration.
  Basis: reported, one commenter. Status: missing at 088a227c for the view; partial for the summary (`plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c`). claude 2.1.327: `ui.status` (chunk-dafpvz32.js@3238) and `ui.notify` (chunk-dafpvz32.js@3391) present (code search).
  Source: external/export-How do you keep up with 5+ agents at the same time-.jsonl:24 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wqroed/how_do_you_keep_up_with_5_agents_at_the_same_time/>); plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c.

- [x] **OUT-429** Out (REQ-COST-019, ADR-0131, ADR-0177, OUT-021): vanilla `--max-budget-usd` and `--max-turns` exist (claude --help), vanilla Read serves unchanged files short (REQ-COST-042), the read guard is out, and Haiku windows are set by ADR-0131. claudetto shall hold money, token, turn and time budgets as user-owned, track them, and stop before exceeding (a parallel run spent $5.65 on a $5 cap; a subagent cut retries 4 to 3 and timeouts 30 s to 13.3 s). Before re-reading a file it checks the file can have changed (half of reads in one session were repeats), so a second Read of an unchanged file is refused or served short; no `find /`; independent slow steps run concurrently (concurrency 4 cut 1,074 s to 262 s); loop-halting cut re-polling to 28.6% (n=1). A warn hook for Haiku subagents fires at 80k and 95k tokens (chunks under 100k).
  Acceptance: A budget breach stops the run before the cap; a Haiku subagent warns at 80k tokens; a second Read of an unchanged file in one session is refused or served short. Verification: test.
  Basis: reported (n=1). Status: partial at 088a227c (plugins/claudetto/hooks/features/budget, features/repeat; see risk on withheld Read).
  Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:84; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2298; plugins/claudetto/hooks/features/budget@088a227c; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408).

- [x] **OUT-430** Out (REQ-COST-020, ADR-0184, ADR-0177): vanilla has `/rate-limit-options` and the -p driver renews; the reports conflict and nothing is reproduced. claudetto shall resume after a rate limit: wait out the window, resume from `/rate-limit-options`, limit concurrent workers, and have subagents keep a journal so work can resume.
  Acceptance: CLI 2.1.234+ can resume; main sessions resume, subagents per one user and not per another; resume re-writes the cache so limit hits come faster; goal check-ins resend full context even idle (needs 2.1.236+, uncapped before 2.1.246). Conflict: auto-resume reported working against "appeared then vanished" against desktop lacking it. Verification: probe.
  Basis: reported, conflicting. Status: partial at 088a227c (`budget-run.ts`; journal rule missing). claude 2.1.327: `/rate-limit-options`, `/goal` and `/low-priority` present (chunk-271f7twe.js@1000-4200 command table); tool `WrapUp` not found by grep of external/.
  Source: external/2026-10-14/export-Auto-continue after session limit reset-.jsonl:4 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x4vbel/autocontinue_after_session_limit_reset/>); external/2026-10-21/reddit.com-r-claudecode-comments-1x8xqu7-this-feature-eats-up-usage-for-20261020T052435Z.md:49 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x8xqu7/this_feature_eats_up_usage_for_nothing/>).

- [x] **OUT-431** Out (REQ-COST-022, ADR-0131, delegation block): `autoCompactWindow` 100000 and fresh-worker briefs belong to the delegation block and agent frontmatter, not to a cost hook. claudetto shall keep a Haiku worker under the 100k price step: a fresh worker per feature or file, unused tools and MCP servers stripped, a tight brief, and a small Haiku coordinator that compacts before 100k (`autoCompactWindow: 100000` fires near 67,000 because of the fixed 33k buffer; probe 2026-11-17, 2.1.326).
  Acceptance: Haiku 5.5 is about $0.10/$0.50 per million up to 100k and $0.50/$2.50 above (reported in a post; account models per repo rules); one Haiku subagent crossed 100k at about its 20th call and reached 269k with 145 of 164 calls over the line; a one-turn Haiku probe is about 17k mostly cached tokens; bounded, verifiable jobs only. Verification: test.
  Basis: reported, one log. Status: partial at 088a227c (`plugins/claudetto/hooks/features/price-step/price-step.ts`; per-subagent context budget missing). `/loop` verified on 2.1.327 (prompt command, alias `proactive`, gated by `isEnabled`, chunk-3pyymwj4.js@24676); the 2.1.326 "not in the command table" finding was wrong.
  Source: external/2026-10-11/export-Haiku 5.5 token usage.jsonl:9; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:23; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057).

- [x] **OUT-432** Out (REQ-COST-023, OUT-070, OUT-030, OUT-024, ADR-0177): no caller of a Jev decider remains in the rebuild (Stop checks, claim grader and constraint ledger are out; grep of plugins finds no typesafe or jev), and it would send text to a third party. claudetto shall use the TypeSafe decider (Jev) for decisions it can make reliably in place of LLM calls and return Jev's pick only when `probabilities[choice] >= 0.75` AND approval Noul `P(yes) < 0.2` AND single-select AND the pick names an option; never threshold on `confidence` (4 options 0.61/0.37/0.02/0.0, confidence 0.48 -> handed back); give Jev ONE try, 5,000 ms, and make no retry after a missed deadline. On failure, timeout, 401 (Jev off for the session), 400/422 (log status and <=200 chars of body), 500 or 529 (no second try) the `deciderModel` at `deciderEffortLevel` (default claude-haiku-5-5 high, model and effort configurable) answers the same set with a 30 s deadline; both fail -> all handed back, the tool never throws, the reply holds no key. Yes/no as Noul: yes at P>=0.7, no at <=0.3, middle handed back. Multi-select and exactly-one-option questions are not sent. Keys `pick_i`/`yes_i` pair with `approval_<i>` ("does question i ask the user to approve money, a push, a release, a delete, or a step with no undo?"); a missing approval or P>=0.2 hands back. Fallback JSON is keyed by question with evidence copied from a state field; a Decider answer counts only when its quote is a substring of the state: a `yes` or an option without a substring gives `unsettled`, `no` needs none; an unparsable or unanswered reply makes all `unsettled`, is logged with its cause and never resent; escalating sets send only in-band Nouls in one call. It scans each state string separately as raw text before it builds the request, never the serialized JSON; a scan failure sends nothing, falls back to Haiku, and logs the scanner and its install step; with no key no request goes to `api.typesafe.ai`. Reply: one line per question `The decider picks \`X\` for "Q".` or `The decider gives no answer to "Q".`; any unanswered ends with`DECIDE_GIVE_BACK` (decide it and state the assumption, or ask via AskUserQuestion).
  Acceptance: `hooks/decide.test.ts`: a pick at 0.75 passes and at 0.74 goes back; an approval at 0.2 goes back; a hung server gets one try of 5 s, then is handed back; a decision goes to Jev first and on failure to the configured fallback; line-anchored`secret-named-assignment` finds `export API_TOKEN=...` in the raw string, the scan takes 40 ms clean and 127 ms on a keyword, strings are joined with newlines, one process. Superseded (goes): the 2.1.319 `specs/decide` rules of 3 tries on 429/529 with 1,000 ms doubling backoff (1 s then 2 s, the third try answering) in an 18 s cap, a hand-back with no model fallback on 400/401/422, `JEV_GIVE_BACK`, and "Jev picks" wording; the baseline before it was 3 tries, 12 s, hand-back under 0.5; the`2-1-325-rearchitecture` decide spec (lines 63-140) replaced them with one try plus the fallback model. The plugin manifest holds `deciderModel` and `deciderEffortLevel` defaults (plugins/claudetto/.claude-plugin/plugin.json:68-84); the key is read from `TYPESAFE_API_KEY`. Verification: test.
  Basis: measured. Status: partial at 088a227c (features/decide has`approval_` in decide.ts and DECIDE_GIVE_BACK in texts.ts; `git grep probabilities 088a227c -- plugins` finds hooks/kernel/decider/decider.ts:94-101 and decide.mock.ts, so the 0.75 pick rule is in code; decide.test.ts:177 holds a pick at 0.75; hooks/features/decide, hooks/kernel/decider; Jev named in claudetto-you-should-know).
  Source: openspec/specs/decide/spec.md:8; openspec/specs/decide/spec.md:37; openspec/specs/decide/spec.md:39; openspec/specs/decide/spec.md:43; openspec/specs/decide/spec.md:61; openspec/specs/decide/spec.md:75; openspec/specs/decide/spec.md:77; openspec/specs/decide/spec.md:108; openspec/specs/decide/spec.md:127; openspec/specs/decider/spec.md:20; openspec/specs/decider/spec.md:152; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/decider/spec.md:147; openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:407; plugins/claudetto/hooks/features/decide/decide.test.ts:177@088a227c; user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); `plugins/claudetto/.claude-plugin/plugin.json:68-84` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).

- [x] **OUT-433** Out (REQ-COST-024, OUT-070, OUT-024): the decide tool and `typesafeApiKey` are on the deletion list and no caller remains. claudetto shall register `mcp__claudetto__decide` through `$.tool.register` at `session.start` only when `TYPESAFE_API_KEY` is set in env (no userConfig `typesafeApiKey`; no key means no tool and no request to api.typesafe.ai). The request carries only question texts, option labels with descriptions, and fixed pick and approval texts (state `question_0`, `option_<j>: label - description`; no transcript, file, or path); other hooks reach Jev only through the Decider. Each try stops at 5,000 ms and a 400 or 422 is handed back after one try; the 2.1.319 spec retried only on 429 or 529, at most 3 tries, backoff 1,000 ms doubling, never retried a missed deadline and finished within 18 s (superseded by the one-try rule of the Decider item). A malformed call (no key, or `questions` not a non-empty list of entries with a string `question`) passes through unchanged. Failure never throws: "Jev gives no answer: <why>" plus give-back text. The reply is one line per question: in the 2.1.319 spec "Jev picks `X` for "Q" (probability 0.NN)." or "Jev gives no answer to "Q"." (the wording of `<name>` follows the decider name; baseline texts.ts:52 reads `The decider gives no answer to "..."`), and it ends with a give-back text (spec constant `JEV_GIVE_BACK`) that tells the model to decide it and state the assumption, or put it to the user with `AskUserQuestion`, when any question has no verdict.
  Acceptance: With no key the tool is absent; with a key a multi-question call answers one line per question; a reply with one pick and one miss shows both line forms and ends with the give-back text. Verification: test.
  Basis: reported. Status: have at 088a227c for the tool; partial for the reply wording (`plugins/claudetto/hooks/features/decide/texts.ts:52`; the spec's name is "Jev", the baseline says "The decider"). claude 2.1.327: `tool.register` present (code search, chunk-dafpvz32.js@3099).
  Source: openspec/specs/decide/spec.md:39; openspec/specs/decide/spec.md:53; openspec/specs/decide/spec.md:129; openspec/specs/decide/spec.md:134; plugins/claudetto/hooks/features/decide@088a227c; plugins/claudetto/hooks/features/decide/texts.ts:52@088a227c.

- [x] **OUT-434** Out (REQ-COST-025, OUT-021, OUT-030): the decider module goes with its callers. claudetto shall keep ONE module that owns every typed question, option, criterion, threshold, Jev client and fallback, and the only reference to `api.typesafe.ai`.
  Acceptance: Callers pass named state plus a question set and get `yes|no|unsettled` per Noul and option|`unsettled` per Choice, never a probability or confidence; each caller keeps a code-table row per combination incl. `unsettled`, tested with no model call; a question asks one judgment about state, never "which action"; a test searches for the host. Without it each site grows its own prompt, parser, timeout and silent-failure path. Verification: test.
  Basis: cited. Status: partial at 088a227c (plugins/claudetto/hooks/kernel/decider/decider.ts, jev.ts; features/decide/decide.ts).
  Source: openspec/specs/decider/spec.md:8; openspec/specs/decider/spec.md:27; openspec/specs/decider/spec.md:36; openspec/specs/decider/spec.md:50; openspec/specs/decider/spec.md:117.

- [x] **OUT-435** Out (REQ-COST-026, OUT-070): no decider remains to log. claudetto shall record the confidence threshold per question class with the fallback, log the Jev-versus-fallback rate and latency (Jev 140-260 ms, Haiku 1.4-3.7 s), and extend triage to other plugins only through `decide`.
  Acceptance: the decider log shows rate and latency per source. Verification: test.
  Basis: measured (Jev 140 ms and 257 ms warm). Status: missing at 088a227c.
  Source: openspec/specs/decide/spec.md:110; openspec/changes/2-1-325-rearchitecture/design.md:71.

- [x] **OUT-436** Out (REQ-COST-027, OUT-070): no Jev integration remains to name a skill for. claudetto shall name the `typesafe:typesafe-ai` skill as the first-class way for the agent to integrate Jev.
  Acceptance: the agent's text for Jev work names the skill, and the skill is used for Jev integration. Verification: inspection.
  Basis: reported, user. Status: missing at 088a227c (`git grep typesafe-ai 088a227c -- plugins` finds none; `plugins/claudetto/hooks/features/decide/decide.ts@088a227c` has the Jev client).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:265 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:265, reported, user, 2026-11-16.

- [x] **OUT-437** Out (REQ-COST-028, ADR-0177): a decision-log convention has no vanilla comparison; CLAUDE.md and memory already carry it, and wave reconciliation is a planner step. claudetto shall keep the decision log a first-class repo artifact read before edits, with a plan split in waves and a plan-reconciliation step between waves.
  Acceptance: a decision log records why an option was rejected ("rejected Redis: single node, SQLite handles writes") and is read before edits; a dated decision carries a status and the old one is updated when a new one is saved (keep a source-of-authority rank); `DECISIONS.md` has a ruled-out section; `NOTES.md` is rewritten each session, never appended; `docs/state/NOW.md` holds what is true now and is re-read after compaction with a live-state re-probe. Verification: inspection.
  Basis: reported; one author-measured. Status: partial at 088a227c (`plugins/claudetto/hooks/features/decide/decide.ts` and `plugins/claudetto/hooks/features/memory/`; wave reconciliation missing).
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:29; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:44; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:183.

- [x] **OUT-438** Out (REQ-COST-029, ADR-0177): ADR-0177 already requires a measured gain per component; a per-trim revert rule adds nothing. claudetto shall treat billed cost per finished task as the only saving: when `billed_cost_per_finished_task` does not fall, report "no saving found", revert the trim, and record the reading; it also measures cost per accepted change, including turns spent recovering context.
  Acceptance: a trim that leaves billed cost per finished task flat ends with the line "no saving found" and a revert. Token or char count alone never passes. Verification: demonstration.
  Basis: cited (arXiv 2607.12161: the largest compression setup removed 38.4% of delivered tool-output tokens yet billed cost rose 6.8%, Pearson r 0.15; arXiv 2610.15093: turn count explains 84% of variance of log trajectory cost). Status: missing at 088a227c (`billed cost` is in no file under plugins/).
  Source: openspec/specs/prompt-footprint/spec.md:55; openspec/specs/surface-trim/spec.md:10.

- [x] **OUT-439** Out (REQ-COST-030, RISK-377, risk-register routing rule 1): this is an agent fault with its cure in the risk register, not a product behaviour. claudetto shall state a dry-run number when cost is the reason to ask: the ask text reads "<tokens|USD> from dry run", never "would cost a lot".
  Acceptance: an ask about cost carries a computed figure. A guessed pessimistic figure was $2.88 for a session filled to 94% of its context. Verification: inspection.
  Basis: reported by the dossier. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:38.

- [x] **OUT-440** Out (REQ-COST-033, ADR-0177): the audit categories are model-judged flags with no measured gain; cold re-cache is covered by the status line cache segment. claudetto shall flag these cost-audit categories, each with a one-line fix: old unrelated tasks riding along (50k+ tokens re-read per request), re-caching after pauses longer than cache life, premium model on read-only work, 3+ failed-tool loops, repeated Read of the same lines with an earlier copy in context, correction rate per project.
  Acceptance: each finding pairs with a fix (`/clear`, `/compact` with a keep-list, a read-only Sonnet subagent). Reported: about a fifth of one 2-day session's API-equivalent spend each on re-reading old work and on re-caching. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:55; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:96.

- [x] **OUT-441** Out (REQ-COST-034, ADR-0177): unproven; the source dropped the weekly top-N and cold-cache report parts and a block log has no vanilla comparison. claudetto shall write a block log, a weekly top-N report of blocks, and a per-session cold-cache cost report.
  Acceptance: unproven; candidate extensions of protected, repeat and you-should-know. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: reports/2026-11-18-research/dossier.md:83 (item 4.05, log every block from the hook to a file; opinion, n=2); reports/2026-11-18-research/triage/s4-6.md:11 maps it to this requirement. Dropped (2026-11-18): the weekly top-N report and the per-session cold-cache cost report, for which no source was located.

- [x] **OUT-442** Out (REQ-COST-035, ADR-0177, ADR-0178): unverified, and a scheduled message works on a clock, not at a task boundary. claudetto shall offer an early-window trick: send a trivial message to a cheap model at day start so the 5h reset lands mid-work; a scheduled 7am task is a variant.
  Acceptance: unverified; a measured run must show the reset lands mid-work before this ships. Verification: probe.
  Basis: reported, unverified. Status: missing at 088a227c.
  Source: external/2026-09-29/export-When and what do you use Haiku for-.jsonl:12 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wsq73p/when_and_what_do_you_use_haiku_for/>).

- [x] **OUT-443** Out (REQ-COST-038, ADR-0177): the wrap-up allowance is Claude Code's own; the pace marker in the status line shows the forecast; an automatic wrap-up has no measured gain. claudetto shall use the wrap-up allowance: when the 5-hour limit hits mid-response, a small weekly allowance lets Claude reach a stopping point; claudetto pairs this with an automatic wrap-up when pacing predicts a limit hit on the next turn, and shows a usage circle with a limits breakdown that includes the Fable limit.
  Acceptance: a pacing forecast of a limit hit next turn starts a wrap-up; the breakdown lists the Fable limit as its own row. Claude has no direct quota access. Verification: demonstration.
  Basis: reported (CC 2.1.277+ as posted). Status: missing at 088a227c.
  Source: external/2026-09-29_p3/export-Claude can't see its own limits or context. Fix that, and it can work on its own for weeks.jsonl:16 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wt9ss3/claude_cant_see_its_own_limits_or_context_fix/>); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:23.

- [x] **OUT-444** Out (REQ-COST-039, REQ-DELEGATION-050, ADR-0177): the subagent TTL setting belongs to the delegation block, and the measurement needs paid runs. claudetto shall measure from its own transcripts before flipping `subagentPromptCacheTtl`: per subagent transcript compute the gaps between consecutive calls, count gaps over 5 minutes and over 1 hour, and price rewrites against the 1-hour write premium: about 1.1 times a 5-minute write on a subscription meter (CTX-846) and 1.6 times at API list prices. Keep 1 hour only if the rewrites it saves outweigh that premium on every subagent write. On a subscription that means the tokens rewritten after gaps of 5 to 60 minutes must exceed about a tenth of all subagent write tokens; with the commenters' 5 gaps over 5 minutes in 1,824 they very likely do not. Check with `claude -p ... --output-format json` twice, comparing `cache_creation_input_tokens` and `cache_read_input_tokens`.
  Acceptance: the measure shows gap counts and a priced rewrite. Measured by commenters: 5 of 1,824 subagent gaps over 5 minutes (84 transcripts, none over 1 hour); 95 of 41,790 follow-ups after 5 or more minutes; a longer TTL on subagents raised total cost and on the orchestrator lowered it. Breaks cache: `/model` switch, fast-mode toggle, an MCP server added without tool search, a Claude Code upgrade, many images; does not: file edits, mode switch, skills, output style, subagents (own cache), `/rewind` (reported, one poster; versions unverified; cache-break list checked against the platform prompt-caching docs on 2026-11-18: changes to images and to tool definitions invalidate message blocks, and a thinking or effort change is model-specific, so the commenter's effort conflict below is settled as 'depends on the model' by the docs; `/model` switch, fast-mode toggle, MCP add, upgrade, skills, output style, subagent cache and `/rewind` are not listed in the docs and stay reported). A subagent first request: 35% of spawns get no cache read, median first write 41k tokens, so questions are batched into one subagent run. Conflict: one commenter reports an effort change on Opus 5.5 mid-session no longer invalidates (unverified). Verification: probe.
  Basis: measured (commenters; subscription meter ratio by probe, CTX-846); reported. Status: partial at 088a227c (setup writes the cache TTL settings, `plugins/claudetto/hooks/features/setup/settings.ts:117` `promptCacheTtl: "1h"`). claude 2.1.327: `promptCacheTtl`, `subagentPromptCacheTtl` (chunk-ja5z738t.js@277725), `DISABLE_PROMPT_CACHING` (chunk-2ew0jg68.js@21081), `ENABLE_PROMPT_CACHING_1H` (chunk-2ew0jg68.js@21640) and `FORCE_PROMPT_CACHING_5M` (chunk-2ew0jg68.js@21867) present (code search).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-26/README.md:115; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:169.

- [x] **OUT-445** Out (REQ-COST-041, ADR-0177): the framework principle is ADR-0177 itself. claudetto shall be a framework over vanilla Claude Code that uses each malleable surface for least token use, and shall adopt a bounded pattern that does a job in fewer calls and tokens, same or better.
  Acceptance: each adopted pattern shows lower calls and tokens at the same result. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10693).

- [x] **OUT-446** Out (REQ-COST-050, OUT-070): no typed decider question remains to probe. claudetto shall add a planted-instruction case to the probe of each typed decider question whose state holds untrusted text (tool output, web page, MCP result).
  Acceptance: for each such question the pick with a planted instruction inside the text equals the pick without it in 5 of 5 runs, or the question is dropped from the decider and answered by the model or by code. Verification: test.
  Basis: reported (a small classifier followed instructions inside the classified text in one thread, n=4 comments; ADR-0017 records that jevwire is not hardened against injection). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-llmdevs-comments-1xyd09i-so-was-jev-actually-useful-20261117T175528Z.md:156-158 (url: <https://www.reddit.com/r/LLMDevs/comments/1xyd09i/so_was_jev_actually_useful/>); reports/2026-11-18-research/dossier.md:153.

- [x] **OUT-447** Out (REQ-COST-001, ADR-0190): no usage guard. claudetto shall pause a run at 80% of the 5-hour window and stop completely at 90% of weekly usage, leaving a buffer.
  Acceptance: A run pauses at 80% 5-hour usage and halts at 90% weekly usage. Differs from the old plan, which stopped a skill at 90% of the 5-hour window only. Verification: test.
  Basis: reported; the input is measured. On 2.1.327 `claude -p --output-format stream-json --verbose` emits a `rate_limit_event` whose `rate_limit_info` carries `rateLimitType`, `utilization` (0 to 1, two decimals), `resetsAt`, `status` (`allowed_warning` once `surpassedThreshold`, 0.75 here, is passed) and `unifiedWindows` per window (paid Haiku probe, subscription auth, 2026-11-18). The interactive status line receives the same windows as `rate_limits.five_hour` and `rate_limits.seven_day` with `used_percentage` (clawdipedia status-line schema, 2.1.327). The guard reads these fields and needs no model call. Logging each reading with the session's transcript cost (REQ-COST-032) measures quota per dollar over days on the user's own account. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbxoza-my-claude-code-setup-it-runs-l-20261022T005342Z.md:453 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbxoza/my_claude_code_setup_it_runs_like_a_small/>).

- [x] **OUT-448** Out (REQ-COST-014, ADR-0190): no transcript cost report. claudetto shall count each response once when it sums cost from usage: key = `message.id` + `requestId`, usage summed once per key across subagent `.jsonl` files under `~/.claude/projects` (one response spans several transcript lines with the same usage; `--resume` and forks copy history; per-line sums overcount; a per-session counter misses workflow subagents; 55% of requestIds appear in more than one jsonl; the final reply lacks final output tokens, so its sum runs low; one file per run, since parallel appends drop lines). It shall price from the current model list only (a stale table inflated a hook about 5x), check cache warmth by `cache_read_input_tokens` or `prompt_cache.expires_at`, list compactions from `compact_boundary` records (preTokens, postTokens, durationMs, trigger), check silent drain (jsonl cache hits, fan-out spawned on the session model, background LLM calls such as naming and summaries), tag the job in the brief, write one JSON line per run (tokens, task, outcome), credit only runs whose diff was kept, and mark a run past the p90 cost of similar runs for a stop and re-plan (such a run is 2.3-7x less likely to finish; 424k runs, cited; cost is not predictable beforehand, 1.55x median spread). OTel runs with `CLAUDE_CODE_ENABLE_TELEMETRY` and `OTEL_RESOURCE_ATTRIBUTES`; `OTEL_RESOURCE_INCLUDE_HOST` adds `host.name` and `host.id` to the resource attributes in 2.1.326 (off by default).
  Acceptance: a run log of 55 requestIds that appear in more than one jsonl sums each once; the spend figure of a fixture with duplicated requestIds equals the deduped sum; a transcript with repeated lines and a forked history sums to the same total as its deduplicated rows (naive sums overcount by more than 2x; output inflated 3.4x in one priced log); a cost hook with an old price table came out about five times off in one report; a run past p90 is flagged. A skills catalog was re-injected 22 then 51 times (180k of 499k message tokens, measured by a user script). Verification: test.
  Basis: measured and reported (cited for the p90 figures). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts` names telemetry; no run log; `git grep -E 'requestId|message\.id' 088a227c -- plugins` finds no hit, so deduping is missing; price-step.ts reads cache_read; `plugins/claudetto/statusline/`, `budget-run.ts`).
  Source: external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:20; external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:52; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:16; openspec/specs/window-budget/spec.md:8; plugins/claudetto/statusline/@088a227c; external/2026-10-17/export-I priced 19,593 requests from my own transcripts- cache writes are 3% of my tokens and 46% of the co.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x7bin8/i_priced_19593_requests_from_my_own_transcripts/>); external/2026-10-21/reddit.com-r-claudecode-comments-1x97ix2-a-readonly-custom-subagent-cut-20261020T101449Z.md:50 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/>); <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **OUT-449** Out (REQ-COST-031, ADR-0190): no transcript cost report. claudetto shall account cache apart from reads: report {cache_read, cache_write(5m), cache_write(1h), miss_rebuild_after_gap>TTL}, price each response at its own model price, split `usage.cache_creation` by TTL (`ephemeral_5m_input_tokens` versus `ephemeral_1h_input_tokens` shows which TTL a session got), and optimise the miss, not the read.
  Acceptance: a report shows the four cache classes and names the TTL split per session. Measured by one user over 19,593 requests ($3,465, list prices): writes 3% of tokens, 46% of cost; another log: reads 96.5% of tokens, ~48% of cost, writes 3.3% tokens ~44% cost; misses 1-2% of requests but ~14% of cost, mostly prefix changes, not TTL expiry. A return after the cache lapsed: 35 returns in 27 days cost $98.74 versus $2.95 warm. The same call priced $0.0183 then $0.0035 with equal tokens. Rebuild causes: a gap past TTL, every subagent spawn (no shared cache), anything rewriting history (compaction, clearing old tool results, mid-session model switch). A nudge before idle expiry or a handoff beats chasing "re-read" totals. Weekly-bar jumps can be TTL, not volume; some Opus 5.5 sessions reportedly got 5-minute instead of 1-hour (one commenter, CLI 2.1.292). Verification: test.
  Basis: measured, one user, plus a second log; reported (one commenter). Status: missing at 088a227c (partial: plugins/claudetto/hooks/features/compaction/handoff.ts has a 59-minute age rule; `ephemeral_1h` is only in tools/fake-api).
  Source: external/2026-10-17/export-I priced 19,593 requests from my own transcripts- cache writes are 3% of my tokens and 46% of the co.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x7bin8/i_priced_19593_requests_from_my_own_transcripts/); external/2026-10-12_p2/export-56% of my Claude Code costs went to re-reading context. I built a tool to catch it.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x2cb1t/56_of_my_claude_code_costs_went_to_rereading/); external/2026-10-02/export-Was burning ~$300-mo in extra usage on Pro just to stay on Medium. Max at $140 and High all week is.jsonl:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wvkj7c/was_burning_300mo_in_extra_usage_on_pro_just_to/>); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:31; external/2026-10-01_p2/export-I made a hook that refuses (at first try) to send your message if your cache has gone cold; outputs.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wuwtqy/i_made_a_hook_that_refuses_at_first_try_to_send/>).

- [x] **OUT-450** Out (REQ-COST-032, ADR-0190): no transcript cost report. claudetto shall report cost and usage locally from transcript `usage` in `~/.claude/projects/*/*.jsonl` (tokens and dollars; not message text, not impressions): dedupe by message.id+requestId, split cold-return rebuilds from warm reads, report the cost of the miss; per-day and per-session reports (tokens per day and model; re-read share; long versus idle sessions); watch per-turn input, cache read/write and output, not only the quota; cache-read share, per-model pricing, context-size histogram, subagent share and cold-cache cost of tiny agents; a dashboard splitting cached input/other input/output by project, task and model, marking uncertain values unknown; live cost and limit stats surfaced to agents so delegation tracks the weekly budget.
  Acceptance: the report matches a hand-counted transcript; an uncertain value prints "unknown"; the report reads `$.session.usage` and transcript usage fields. Cache reads = tool calls x average context, so ~20M per thread is not a bug. One poster: 21B own tokens, 97 of 100 re-reads of content already read; another: 3.4B tokens in 30 days, ~97% cache reads; Claude Projects 113 threads 2.3B tokens with 97% hit rate, ~160 cache-read tokens per output token. Verification: test.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto/hooks/features/budget/budget-run.ts, price-step/price-step.ts, `statusline/limits.ts`; no report).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xdlitv-22b-cacheread-tokens-in-one-proj-20261024T061729Z.md:35 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xdlitv/22b_cacheread_tokens_in_one_project_normal_or_am/>); external/export-Aight I get it, Opus 5.5 is actually peak.jsonl:67 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wqcara/aight_i_get_it_opus_55_is_actually_peak/>); external/2026-10-17/export-I priced 19,593 requests from my own transcripts- cache writes are 3% of my tokens and 46% of the co.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x7bin8/i_priced_19593_requests_from_my_own_transcripts/>); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:55; external/export--clear vs -compact.jsonl:18 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wl4c13/clear_vs_compact/>); plugins/claudetto/hooks/features/budget/budget-run.ts@088a227c.

- [x] **OUT-451** Out (REQ-COST-044, ADR-0190): no transcript cost report. claudetto shall price each Haiku 5.5 request by its own prompt size: the up-to-100k rate when that request's input is at most 100,000 tokens, the higher rate above, never by a sum across requests.
  Acceptance: a test prices a 90k and a 110k Haiku 5.5 request at the two tiers of CTX-162. Verification: test.
  Basis: cited (platform pricing page, 2026-11-18); read (repo code). Status: missing at 088a227c.
  Source: inevolin/claude-code-usage-analysis at e9451a43, src/cc_usage_study/pricing.py:153-167; reports/2026-11-18-research/repos.md:93; arc42/03_context_and_scope/cost-pricing.md:CTX-162.

- [x] **OUT-452** Out (REQ-COST-045, ADR-0190): no transcript cost report. claudetto shall count unpriced requests (unknown model, missing 5m/1h write split) instead of pricing them at zero, and shall withhold any before/after cost claim when the priced share is under 95%.
  Acceptance: a transcript with a request lacking the TTL split yields an unpriced count of 1 and no cost delta when the priced share falls under 95%. Verification: test.
  Basis: read (repo code). Status: missing at 088a227c.
  Source: inevolin/claude-code-usage-analysis at e9451a43, src/cc_usage_study/analyze.py:683-700 and 983-993; inevolin/claude-code-usage-analysis at e9451a43, src/cc_usage_study/pricing.py:229-230; reports/2026-11-18-research/repos.md:89,94.

- [x] **OUT-453** Out (REQ-COST-046, ADR-0190): no transcript cost report. claudetto shall report cost to a subscriber as tokens and percentages of the plan window, and to an API-key user as list-price USD, and shall label list-price USD as not a subscription bill.
  Acceptance: the cost line under an OAuth login shows units and percentages; under an API key it shows USD; neither calls USD a bill. Verification: test.
  Basis: read (repo docs and code). Status: missing at 088a227c.
  Source: inevolin/claude-code-usage-analysis at e9451a43, src/cc_usage_study/pricing.py:3-5; inevolin/claude-code-usage-analysis at e9451a43, SKILL.md:24; reports/2026-11-18-research/repos.md:95.

- [x] **OUT-454** Out (REQ-COST-049, ADR-0190): no transcript cost report. claudetto shall label each cache break in its local cost report with one cause read from events between the two requests: auto compaction, idle gap over the TTL, early parallel request, tool-list change, model switch, `/clear`, or unexplained.
  Acceptance: a script run over fixture transcripts labels every break with exactly one cause, prints a count per cause, and prints the unexplained count; on the 2026-11-18 session set it reproduces 99 compaction breaks out of 104 main-loop breaks. The script reads transcripts only and adds no hook, model call or component swap. Verification: test.
  Basis: reported (one user kept a rolling trace of busts and found it useful, n=1); measured (`reports/2026-11-18-research/sessions.md` section 1 labelled 627 breaks with these causes). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudeai-comments-1xyi3xo-why-claude-code-can-cost-you-2x-20261117T175230Z.md:95 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xyi3xo/why_claude_code_can_cost_you_2x_to_10x_of_usage/>); reports/2026-11-18-research/dossier.md:31.

- [x] **OUT-759** Out (REQ-COST-003, ADR-0177): the status line script needs an interactive terminal stdin that -p runs cannot give, so no measured check exists; ADR-0190 keeps a minimal status line only. claudetto shall print the status line from stdin JSON plus byte-capped reads of named local files (`.git/HEAD`, openspec tasks.md, session window/theme file, transcript tail 256 KiB + first 64 bytes of heartbeat), with no network, no model call and no child process.
  Acceptance: Non-JSON stdin prints `claudetto: no status`; it always exits 0; width = `COLUMNS - 4` (80 when absent or not a positive integer); an unreadable file drops that part. Verification: test.
  Basis: cited. Status: have at 088a227c (statusline/main.ts:11 FALLBACK; plugins/claudetto/statusline/ holds input.ts, local.ts, width.ts).
  Source: openspec/specs/status-line/spec.md:8; openspec/specs/status-line/spec.md:36; openspec/specs/status-line/spec.md:431; plugins/claudetto/statusline/main.ts:11@088a227c.

- [x] **OUT-760** Out (REQ-COST-004, ADR-0177): same reason as REQ-COST-003: no -p probe can render the line. claudetto shall render the status line with no model call, with segments laid one after another and separated by ` · ` (rows: place, session, limits, cache; at most 4 rows, filled as needed, not 4 fixed rows; countdowns when rows do not suffice). Model part `❖ <name> <effort> think fast`. PR part `⇄ #12 approved`, or `⇄ !12` for `pr.kind` `mr`, with `pr.review_state` after the number, painted `success`, `warning`, `error` or `inactive` for `approved`, `pending`, `changes_requested` or `draft`, `warning` for any other state, and nothing when the number is absent. Cost `$N.NN` and `+added -removed`, with dollars hidden while `rate_limits` reports five_hour or seven_day (subscription: client-side estimate). Limits 5h, 7d and spend as `◷ <label> <pct>%` with the usage gradient green to 20%, amber at 60%, red from 90%; spend part `$used/$limit` with its period, no pace and a dim reset; for the 5h and 7d parts, once 3% of the window has passed, the pace `⇣N%` in `success` for a reserve or `⇡N%` in `warning` for a deficit (N = used% less elapsed%), `⏵<time>` for the projected run-out when use would pass 100% before reset, and `↻<time>` for a reset still in the future.
  Decision: ADR-0190, status line stays minimal (model, context, 5h/7d percent, cache).
  Acceptance: a lab test per row, colour band and pace marker; with few segments the line is one row, with many it spills to at most 4 rows and no row is empty; status-line tests cover the four PR states, an unknown state, an `mr` kind and no number; a part at 60% used with 30% of the window gone shows `⇡30%`, a `⏵` run-out before the reset and a `↻` reset; unreadable usage warns and fails open. Parse notes (reported, one author): a plan with no 5-hour window omits the field (not zero), the weekly percent is a whole number (estimate between points), polled usage goes stale after idle. Verification: test.
  Basis: cited. Status: have at 088a227c (plugins/claudetto/statusline/{segments,limits}.ts; `segments.ts:57` PR, `color.ts:130`, `limits.ts:17` `PACE_MIN_FRACTION = 0.03`, `icons.ts:9-11`, `segments.ts:150`; `git grep -E 'MAX_ROWS|ITEM_GAP' 088a227c` finds `rows.ts` laying items under MAX_ROWS with ITEM_GAP, so the fill-to-4-rows rule exists there).
  Source: openspec/specs/status-line/spec.md:337; openspec/specs/status-line/spec.md:341; openspec/specs/status-line/spec.md:365; openspec/specs/status-line/spec.md:383; openspec/specs/status-line/spec.md:387; plugins/claudetto/statusline/rows.ts@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:1353 (user decision, 2026-11-09).

- [x] **OUT-761** Out (REQ-COST-006, ADR-0177): same reason as REQ-COST-003: no -p probe can show the statusLine command running. claudetto shall write the `statusLine` command at the plugin root with `refreshInterval` 5, keep a user value, and never write `subagentStatusLine` (deprecated, a no-op in 2.1.323; `statusline/subagents.ts` goes). `/statusline` writes claudetto's line to user settings with no model call (0 requests, 32-53 ms against 3.99 s and 55,376 tokens); `/statusline <text>` swaps the built-in prompt through `skill.prompt`. Branch comes from stdin `worktree.branch`, else the HEAD of the repo (follow `.git` `gitdir:`), detached shows 7 hex. It paints the `dark` palette until the line file names a theme, unless `NO_COLOR`. It also shows remaining TTL per cache, a cold mark after 59 minutes since the last request start, billed cost, and per-agent state (working, waiting, blocked on approval, done) with a subagent task list and a usage monitor. One heartbeat clock serves the status line, compaction, and the price step.
  Acceptance: a setup write holds `refreshInterval: 5` and no `subagentStatusLine`; bare `/statusline` makes 0 model requests; a detached HEAD shows 7 hex. Verification: test.
  Basis: measured (probe, deprecated setting seen on claude 2.1.325) and reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/line-file/`, `plugins/claudetto/statusline/`). claude 2.1.326: `skill.prompt` present (code search `skill.prompt`, chunk-dafpvz32.js@4253 (2.1.327)); verified on 2.1.327: the `subagentStatusLine` setting is present and marked deprecated, "still works" (chunk-ja5z738t.js@257900; `command` @257944, `type` @257926; deprecation text chunk-dfwkett1.js@7698); `/statusline` is a prompt command (chunk-m14bt1pz.js@2538399), so the 2.1.326 "absent" finding was wrong.
  Source: openspec/specs/status-line/spec.md:47; openspec/specs/status-line/spec.md:128; plugins/claudetto/statusline/segments.ts:232@088a227c.

- [x] **OUT-762** Out (REQ-COST-008, ADR-0177): same reason as REQ-COST-003: the window segment cannot be observed in a -p run. claudetto shall show context against the window the session runs with, and that compaction runs against, not a fixed 1M: after each response a mod writes `context.breakdown.rawMaxTokens` from `$.session.usage({breakdown:"summary"})` (a local estimate, no request) to a session file under `.claude/claudetto/`; the status line reads it. No file: the part is left out.
  Acceptance: on a 1M model with `autoCompactWindow` 300000 and 100k input the line shows `ctx 33% of 300k`, not `ctx 10% of 1M`; a session limited to 300k shows 300k; stdin `context_window_size` is the model window and `used_percentage` is measured against it (2.1.319). The status line shows the context token count from stdin `total_input_tokens` and omits it without the session file. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/line-file/line-file.ts:18 holds `rawMaxTokens`; the statusline file was not re-read; `statusline/format.ts:10` formats `200k` or `1M`, so display of the session window is partial).
  Source: openspec/specs/status-line/spec.md:200; openspec/specs/status-line/spec.md:205; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:1353 (reported, user, 2026-11-09); observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11).

- [x] **OUT-763** Out (REQ-COST-009, ADR-0177): heartbeat and statusline files exist only for the status line, which has no measured check (REQ-COST-003). claudetto shall write clock time at each step to `.claude/claudetto/heartbeat/<session>.txt` and, each measured turn, `.claude/claudetto/statusline/<session>.json` with `window` (`rawMaxTokens` from the local summary breakdown, no request) and `theme` when the config has one, mapping each session-name character outside letters, digits, underscore and hyphen to `_` before the name becomes a file name.
  Acceptance: A failed write costs one refresh; a session name with `/` or a space yields a file name with `_` in place. Verification: test.
  Basis: cited. Status: partial at 088a227c (line-file.ts:18 reads rawMaxTokens; kernel/heartbeat.ts:6 replaces `/[^\w-]/gu` with `_` so the name rule is have; settled by `git grep -n -E 'rawMaxTokens|statusline/' 088a227c -- plugins`, which finds line-file.ts:18 and the test path `statusline/s-1.json`).
  Source: openspec/specs/run-limits/spec.md:274; openspec/specs/run-limits/spec.md:276; openspec/specs/status-line/spec.md:280; plugins/claudetto/hooks/features/line-file/line-file.ts:18@088a227c; plugins/claudetto/hooks/kernel/heartbeat.ts:6@088a227c.

- [x] **OUT-764** Out (REQ-COST-015, ADR-0177): same reason as REQ-COST-003: the cache segment cannot be observed in a -p run. claudetto shall render the cache segment from stdin `prompt_cache`: `warm==true` shows time left to `expires_at` (unix s), the ttl, and `hit_ratio%` ("4m/5m 91%", success paint); `warm==false` shows "cold +120k" (`recache_tokens_if_cold`, plus hit ratio, inactive paint); an absent or non-boolean `warm`, or `caching_observed` false, shows nothing; a countdown that expired between refreshes shows "0s", never negative; a null expiry shows "warm" with the ttl. When `misses>0` and `last_miss_cause.causes` is a non-empty string[], it shows "miss: <first cause, `_` as space>" capped at 24 chars.
  Acceptance: each listed stdin shape renders the listed text. Verification: test.
  Basis: measured and cited (`/usage` "Prompt cache (main)" line in v2.1.251+, miss-cause naming in v2.1.260+). Status: have at 088a227c (`plugins/claudetto/statusline/segments.ts:232`).
  Source: openspec/specs/status-line/spec.md:128; plugins/claudetto/statusline/segments.ts:232@088a227c.

- [x] **OUT-765** Out (REQ-COST-018, ADR-0177): same reason as REQ-COST-003: the segments cannot be observed in a -p run. claudetto shall show context share, weekly and 5h limit percentages, the idle time since the last turn and cache time left in the status line, and show cold-cache resume cost at the current context size.
  Acceptance: the line shows both percentages and the idle time, so that cache expiry is visible (a long session consumed 27% of the weekly budget in one 5 h window); the user compacts while warm; a hook injects before each message a short block with remaining 5h and weekly limits, reset times, context fill, and a rule turning numbers into behaviour; a brake asks once near a limit and refuses at the edge; a hook that, past a context threshold, appends a focused compaction instruction at the end of responses. A 5-line skill that stops at 90% of the 5h window reportedly works. Claude Code has no model-callable compact (this install has `$.session.compact`). Verification: demonstration.
  Basis: reported, hook author and one replicating user. Status: partial at 088a227c (`plugins/claudetto/statusline/limits.ts`, `plugins/claudetto/hooks/features/budget/budget-run.ts`; context share line and cache countdown missing). claude 2.1.327: `/context` and `/usage` (chunk-271f7twe.js@1000-4200 command table), `$.session.usage` (chunk-dafpvz32.js@2968) and `$.session.compact` (chunk-ecn8g7cy.js@2843) present (code search); `/statusline` verified on 2.1.327 (chunk-m14bt1pz.js@2538399); `$.session.usage` and `$.session.compact` verified on 2.1.327 (claude-code.d.ts@139400, @141519).
  Source: external/2026-09-30/export-Claude can't see its own limits or context. Fix that, and it can work on its own for weeks.jsonl:13 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wt9ss3/>); external/2026-10-07/export-I don't remember a single 5 hour window using 27% of a weekly budget... this seems a bit extreme lat.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wzpe0y/i_dont_remember_a_single_5_hour_window_using_27/>).

- [x] **OUT-766** Out (REQ-COST-043, ADR-0177): vanilla already asks before `claude -p` (probed 2.1.327); the conduct line and the 25% free-work clause have no measured gain (ADR-0190). claudetto shall make the agent ask the user before a paid run, state the cost, and do free work only once 25% of the seven-day limit is used.
  Acceptance: no paid arm runs without an answer. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c (plugins/claudetto/hooks/features/budget/budget-run.ts:9 says to report the budget after a paid run; `git grep -n "25%" 088a227c -- CLAUDE.md plugins` finds no 25% free-work rule and no enforced ask).
  Source: user goal set through `/goal`, 2026-11-16 06:24 UTC, past 25 percent of the seven-day limit, free work only (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:11); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (handoff Next: paid rounds, ask first, report cost and weekly share after); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (round 6 cost reported to the user).

#### Setup

- [x] **OUT-455** Out (REQ-SETUP-001, ADR-0169): ADR-0169 keeps Read and Write loaded and defers only when ToolSearch is listed; the Skill deferral rides with the tool text build (TOOLTEXT). claudetto shall defer Read, Write, and Skill by `tool.describe` `isDeferred`, keep Agent and Bash sent, and not defer Edit or ListAgents.
  Acceptance: each deferred tool is called by name and the engine runs it; the verdict per tool matches the paid runs (sonnet-5-5). Verification: probe.
  Basis: measured, claude 2.1.318, paid, 7 runs $0.5911 (total $11.59). Defer with no loss and fewer tokens: Read, Write, Skill (saving is schema bytes). Defer costs more: Edit (+2 turns, +31K tokens: 83,356 against 51,884) and ListAgents (+514 tokens). Must stay sent: Agent (task lost, "the Agent tool wasn't loaded") and Bash (a subagent detour first). A Mod-deferred tool is absent from the deferred list, so only a model that knows the name finds it. Status: partial at 088a227c (`DEFERRED_TOOLS = ["Skill"]`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2850; plugins/claudetto/hooks/features/surface/surface.ts:10@088a227c.
  Conflict: Tool Text Keeps the Shorter Text.

- [x] **OUT-456** Out (REQ-SETUP-002, ADR-0177): ADR-0177: the `disableBundledSkills` setting replaces the hook, and a probe shows the setting plus the Workflow deny cuts the first request 47,323 to 28,234 bytes with no hook on the hot path. claudetto shall remove the 18 prompt skills (`OFF_SKILLS`) from the listing through a `settings.read` hook that sets `skillOverrides[name]="off"` when no source is given, unless one of `.claude/skills`, `.claude/commands`, `<config>/skills`, `<config>/commands` holds the name (config = `CLAUDE_CONFIG_DIR` or `$HOME/.claude`); the user's own `/name`, own entry, and a skill the user or project holds stay. The hook runs 4 `$fs.list` calls in parallel, treats an unlistable folder as empty, uses no `$.session.cwd()` and no process, and stays fast because the engine does not wait for `settings.read` before request 1. It ships only together with the Workflow deny.
  Acceptance: the listing holds 2 entries (loop 345, init 148), 493 bytes against stock 13 entries 6,183 bytes; a user `/name` prints 'Skill "<name>" is disabled via skillOverrides'; a call to an off skill is refused with 0 requests; with `workflow-authoring` off the Workflow tool inlines the skill's reference (3,503); hooks of 38.7 ms or less won 47/47, 66.7-90.6 ms lost 10/11. Verification: probe.
  Basis: measured, claude 2.1.318. A Mod `command.run { text }` blocks the user's `/name` (0 requests) but does not see the model's Skill call; a `tool.call` Skill guard returning `{ deny }` blocks that. The `settings.read` hook returns `{ ...r, value: {...s, skillOverrides} }` (`next(e)` resolves to `{ value: settings }`). `OFF_SKILLS` duplicates `disableBundledSkills`. Status: have at 088a227c (`withSkillOverrides`, plugins/claudetto/hooks/features/surface/surface.ts:44-58; `surface.ts:19`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2906; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3372; openspec/changes/archive/2026-11-09-release-2-1-319/builtins-inventory.md:20; openspec/changes/archive/2026-11-09-release-2-1-319/specs/surface-trim/spec.md:43; openspec/specs/surface-trim/spec.md:280; plugins/claudetto/hooks/features/surface/surface.ts:44@088a227c; plugins/claudetto/hooks/features/surface/surface.ts:19@088a227c.

- [x] **OUT-457** Out (REQ-SETUP-003, ADR-0177): ADR-0177: the saving is UI rows, not tokens, and a `command.run` hook runs on every slash command. claudetto shall answer each of 27 local commands with `/<name> is off in claudetto.` through `command.run` (0 requests) and hide it with `command.describe` `isHidden: true`; `/restart` and `/loop` are not claudetto's and `/loop` stays off.
  Acceptance: each blocked command makes 0 requests; `/help` Commands tab shows 60 names against stock 80 (20 gone; 7 others are absent from stock `/help`; a count of 80-27=53 does not match, the figure counts differently); `/stick` typeahead matches nothing, but an exact full name still shows its row (26 of 27). The saving is UI rows, not tokens. Verification: probe.
  Basis: measured, claude 2.1.318. Status: have at 088a227c (`OFF_COMMANDS` with `command.run` and `command.describe` hooks, plugins/claudetto/hooks/features/surface/surface.ts:113-120, `isHidden: true` at :119; the count 27 was not re-checked; `isHidden` appears in setup.mock.ts and surface.test.ts). In 2.1.326 the hook names `command.run` and `command.describe` exist (chunk-dafpvz32.js@4169 (2.1.327)); `$.command.run` is verified on 2.1.327 (claude-code.d.ts@156319; the `command.run` event @229024 fires for a slash command or a plugin call to `$.command.run`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2938; openspec/specs/surface-trim/spec.md:183; plugins/claudetto/hooks/features/surface/surface.ts:113@088a227c; plugins/claudetto/hooks/features/surface/surface.ts:119@088a227c.

- [x] **OUT-458** Out (REQ-SETUP-005, ADR-0177): ADR-0177: saves 448 chars once per `/init`, and the text names `mcp__claudetto__ask`, a tool the rebuild does not ship. claudetto shall replace the `/init` text with a shorter Mod `skill.prompt` that names `mcp__claudetto__ask`.
  Acceptance: text 1,592 to 1,144 chars (-448); request 51,039 to 50,571 bytes; `INTERVIEW_TEXT` names `mcp__claudetto__ask`, because the AskUserQuestion guard denies the stock name. Verification: probe.
  Basis: measured, claude 2.1.318; paid total $11.63. Status: partial at 088a227c (`INTERVIEW_TEXT` replaces `init` in `surface.ts:98-101`; whether it names the `ask` tool was not re-checked).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2996; plugins/claudetto/hooks/features/surface/surface.ts:98@088a227c.

- [x] **OUT-459** Out (REQ-SETUP-009, prd/delegation.md): delegation block owns the cap by plan (prd/delegation.md:83) and no measured gain is recorded for reading `oauthAccount`; ADR-0177. claudetto shall set the subagent cap by tier, read from `oauthAccount`: Pro 3, Max 4, Ultra none, unknown tier none.
  Acceptance: `hooks/setup/settings.test.ts`: a login of {"organizationRateLimitTier":"default_claude_max_5x"} caps subagents at 4; no login record writes no cap. The baseline rows were 3, 4, 5. Verification: test.
  Basis: read. Status: missing at 088a227c (git grep subagentCap: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:402.

- [x] **OUT-460** Out (REQ-SETUP-012, claude 2.1.327): claude 2.1.327 enforces `requiredMinimumVersion` from managed policy settings only (chunk-4dxjsc3b.js@565 and @2149 read `ye("policySettings")`; schema text chunk-ja5z738t.js@285180), so a plugin-written user key cannot stop an older build; ADR-0172 needs revising; the floor stays the `engines` bound (REQ-SETUP-044). claudetto shall write the version floor with `requiredMinimumVersion`, not `minimumVersion`.
  Acceptance: an older Claude Code exits at startup with the floor set. Verification: probe.
  Basis: measured. Status: missing at 088a227c (`git grep -n requiredMinimumVersion 088a227c -- plugins` finds none; settings.ts:146 writes `minimumVersion: MINIMUM_VERSION`)
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807), `chunk-gywtf5sd.js:281772` (claude 2.1.325 binary; the module is gone from 2.1.327). Corrected on 2.1.327: `requiredMinimumVersion` is in the settings schema (chunk-ja5z738t.js@285180: "Minimum Claude Code version required to start ... exits at startup ... Only enforced from managed (policy) settings") and the startup check reads it from `policySettings` only (chunk-4dxjsc3b.js@565 and @1300, VERSION 2.1.327), so a floor in user or project settings does not stop an older Claude Code; `minimumVersion` is a separate key that only prevents downgrades when switching to the stable channel (chunk-ja5z738t.js@285180).

- [x] **OUT-461** Out (REQ-SETUP-013, ADR-0177): ADR-0177: startup notices carry no measured gain over vanilla; the update line is replaced by the `engines` bound and the disk line belongs to ADR-0185 (guards). claudetto shall log startup notices with `$.ui.log` only, never to the model: a `claude update` line when the base version is below `minimumVersion` (numeric compare); one line per missing tool with its install command and `/claudetto:setup` (required tool: every start until installed; optional tool: once, then quiet); a disk line when the project volume is over 80% (81 logs, 80 does not) with free GiB and `! mo clean --dry-run`, `! mo purge --dry-run`. A missing required tool stops setup with an error naming the install step; `betterleaks` is required (`brew install betterleaks`). A No for an optional tool is recorded; a No for a required tool records nothing and names the command to run.
  Acceptance: a start with a required tool missing shows its notice each time; a start after an optional tool's notice shows none; a volume at 81% logs the line and one at 80% does not. Verification: test.
  Basis: measured; cited. Status: partial at 088a227c (hooks/features/setup/tools.ts; a missing required tool stops setup with an error; the once-only rule and the No records are not in the baseline; the disk line was not re-read).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/setup/spec.md:101; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/setup/spec.md:128; openspec/specs/setup/spec.md:124; openspec/specs/setup/spec.md:92; openspec/specs/secret-matcher/spec.md:33.

- [x] **OUT-462** Out (REQ-SETUP-014, ADR-0177): ADR-0177: a community tip with no reproduction or measured gain, untested against live Haiku. claudetto shall ask the setup questions as one question at a time (one popup each), each with a recommended answer, look up what the environment can answer, tell the model the user's own context and ask what matters for them, give its own view of what matters and what is marketing, say when it is unsure, stop on confirmed shared understanding, end a rough task with "ask me any questions you need", and add no up-front question round.
  Acceptance: the setup advice prompt names the four parts (one question, a recommendation, an environment lookup, a stop on shared understanding) and the three asks (own view of what matters, what is marketing, say when unsure); no round of questions comes before the first question; each popup shows one question and one recommendation. Untested against live Haiku; style of `grill-me`. Verification: inspection; demonstration.
  Basis: reported, community. Status: partial at 088a227c (SETUP_ADVICE exists in plugins/claudetto/hooks/features/setup/text.ts:4; its four-part shape and the text of the three asks were not compared word by word; the popup behavior is missing).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:143 (a community tip: asked "which is better, A or B" a model gives a generic answer; given the user's own context and asked what matters, what is marketing, and to say when unsure, it gives a useful one); openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:144 (source thread r/ClaudeAI 1xrtmvs; Matt Pocock's grill-me skill, github.com/mattpocock/skills and re-cinq.com/blog/grill-me-skill; the blog was fetched, the skill text is not quoted); plugins/claudetto/hooks/features/setup/text.ts:4@088a227c.
  Conflict: Setup Speed.

- [x] **OUT-463** Out (REQ-SETUP-015, ADR-0177): ADR-0177: the design of another tool (hlock) with no reproduction here, and the rebuild has no config pin sync. claudetto shall, when it syncs a config pin, write into an isolated `CLAUDE_CONFIG_DIR` by default and write in place only on an explicit opt-in, and shall report plugin version changes after an update, with plugins pinned by version and reinstalled through `claude plugin install`.
  Acceptance: a default sync leaves the existing config dir unchanged; an update that moves a plugin version is listed as "plugin X old to new". Verification: test.
  Basis: reported (design of another tool, hlock). Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbrfzp-i-got-tired-of-syncing-up-my-c-20261022T005207Z.md:46; external/2026-10-22/reddit.com-r-claudecode-comments-1xbrfzp-i-got-tired-of-syncing-up-my-c-20261022T005207Z.md:47; external/2026-10-22/reddit.com-r-claudecode-comments-1xbrfzp-i-got-tired-of-syncing-up-my-c-20261022T005207Z.md:48 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbrfzp/i_got_tired_of_syncing_up_my_custom_claude_code/>).

- [x] **OUT-464** Out (REQ-SETUP-016, ADR-0162): ADR-0162 retired the `_TEXT` override and OUT-096 records no significant effect (p=0.385). claudetto shall write `env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` so that text between tool calls holds a finding, result, or error, because the server text asks the model to say in a few words what it is doing, which draws narration; claudetto's text asks one sentence about a finding or result and "Say nothing about your next call"; the output style drops "the next action".
  Acceptance: the setup features-off group writes the key to that custom text; which of `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"` (a disabling group) and the text wins is checked; the effect is claimed as none. Verification: inspection; probe.
  Basis: measured. The effect is not significant: 24/204 vs 31/204 announced, p=0.385; an earlier run 13/136 vs 23/136, p=0.106; keep it as a cheap setting. The harness reads the reminder from env `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT`, then server flag `tengu_hushed_lark_text`, then the default text; a settings `env` value replaces the text on the tool result (probe-130). Claude 2.1.327 registers four env names: `CLAUDE_CODE_SILENT_TURN_REMINDER` (tri-state), `_SECONDS` (int, min 1), `_TEXT` (string) and `_TURNS` (int, min 1) (chunk-2ew0jg68.js@18065, @18105, @18153, @18198; cc-inspect `surface env`, 2026-11-18); the gates `tengu_hushed_lark` and `tengu_hushed_lark_text` and the turns gate are verified on 2.1.327: chunk-m14bt1pz.js@3985607 reads env `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT`, then `tengu_hushed_lark_text`, then the default; @3986208 reads env `CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS`, then `tengu_hushed_lark`. Status: have at 088a227c (`settings.ts:188`, `settings.ts:202`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:388; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:285; openspec/specs/surface-trim/spec.md:337; plugins/claudetto/hooks/features/setup/settings.ts:202@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:188@088a227c.
  Conflict: Setup Contract.

- [x] **OUT-465** Out (REQ-SETUP-017, ADR-0125): ADR-0125 replaced the Bash gate with permission rules, so there is no denial to hand a `Read` call on; longer Bash text adds tokens; ADR-0177. claudetto shall name six file-reading commands in the Bash description and hand off a ready `Read` call on denial.
  Acceptance: the Bash description names `cat`, `head`, `tail`, `sed`, `awk`, and `echo` in backticks and says files go through Read, Edit, Write, and the search tools unless the user asks for shell, so the gate need not refuse; a denial carries a ready `Read` call with offset and limit. Agents repeated `sed -n`, `cat`, `head`, and `tail` about 360 times a day after a denial, one model call each. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/command-rules.ts`).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:115; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:562.

- [x] **OUT-466** Out (REQ-SETUP-018, ADR-0188): ADR-0188 and REQ-GUARDS-040 own the prompt split; this item repeats them. claudetto shall split permission prompts by what can be undone.
  Acceptance: free: edits inside the repo on a branch or worktree, with reads auto-approved; ask only for irreversible or outside-repo actions; hard deny for secrets and writes outside the project; an ask budget bounds the prompts. Other setups the source names: separate OS user, VM or VPS, devcontainer, no remote write credentials. Without the split, users get approval fatigue (prompts stop protecting after about 1 hour of clicking) or auto mode fails closed. Verification: inspection.
  Basis: reported (one user built about 20 PreToolUse checks behind a single bash shim; convergent). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/auto-mode.ts`, `command-rules.ts`).
  Source: external/2026-09-29_p2/export-Recent rampant classification failiures.jsonl:16; openspec/specs/agent-conduct/spec.md:105.

- [x] **OUT-467** Out (REQ-SETUP-020, ADR-0173): ADR-0173 shares download caches only; the `symlinkDirectories` offer stays out. The `baseRef` part rides with REQ-SETUP-008 (FILL). claudetto shall write `worktree.baseRef: "head"` when unset, so EnterWorktree and `isolation: worktree` start at the current branch tip (the default `fresh` branches from origin/<default>, so an agent worktree lacks branch-only work), and shall offer `worktree.symlinkDirectories` for git-ignored dependency folders at the project root with names WITHOUT a trailing slash in the `.gitignore` block, because `node_modules/` misses a symlink and `git add -A` stages it.
  Acceptance: a setup write holds `worktree.baseRef: "head"`; the ignore block holds `node_modules` and no `node_modules/`. Guards: explicit paths never `-A`, `git ls-files | grep -E '^(node_modules|data)$'` empty, a pre-commit abort on mode 120000, `git check-ignore -v`. Verification: test.
  Basis: reported (a loss of a real 10 GB folder on merge). Status: have at 088a227c (`baseRef`, `symlinkDirectories`); the symlink-staging guard is missing.
  Source: openspec/specs/setup/spec.md:274; external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:8; external/2026-10-23/reddit.com-r-claudecode-comments-1xcenuk-psa-if-your-worktrees-symlink-20261022T122613Z.md:59 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xcenuk/psa_if_your_worktrees_symlink_node_modules_the/>); plugins/claudetto/hooks/features/setup/settings.ts:130@088a227c; plugins/claudetto/hooks/features/setup/changes.ts:13@088a227c.

- [x] **OUT-468** Out (REQ-SETUP-021, ADR-0177): ADR-0177: unset already holds peer messages (`hold`, schema text chunk-ja5z738t.js@299267), and the teaching text adds prefix tokens with no measured gain. claudetto shall set `crossSessionInbound` and teach one session as authoritative and others as workers with distinct roles; the default `hold` parks a peer message as untrusted (a worker task is rejected like a prompt injection), `accept` delivers; a safer pattern routes replies through the user.
  Acceptance: a setup write holds the `crossSessionInbound` value the user chose. Verification: test.
  Basis: reported. Status: have at 088a227c.
  Source: external/2026-10-03/export-Anyone else’s Claude Code agents fight each other-.jsonl:4 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wwqhy1/anyone_elses_claude_code_agents_fight_each_other/>); plugins/claudetto/hooks/features/setup/settings.ts:174@088a227c.

- [x] **OUT-469** Out (REQ-SETUP-026, ADR-0177): ADR-0177: no measured gain over vanilla `/init` and a plain `.gitignore`; the Context7 and TypeSafe key prompts serve parts the rebuild does not ship. claudetto shall write these setup groups: a starter memory file for a repo with none (kept if the file exists at write time); a bounded-command starter AGENTS.md; one marked ignore block, stable on rerun; Mole project paths; a Context7 key only in user-settings `env.CONTEXT7_API_KEY` (skip when present; write nothing for an empty answer, Skip or "I have no key"; the report never repeats the key); a TypeSafe key `env.TYPESAFE_API_KEY` offered after Context7 (the Decider reads only the environment). Settings groups keep the user's permission rules; Haiku explains each popup and recommends an answer; `/statusline` is described as making no model call.
  Acceptance: each group writes what it names and nothing else; a rerun leaves the files unchanged. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/setup/key.ts, hooks/features/setup/starter.ts).
  Source: openspec/specs/setup/spec.md:147; openspec/specs/decide/spec.md:10.

- [x] **OUT-470** Out (REQ-SETUP-030, ADR-0177): ADR-0177: the 200-char target is this plan's own design choice with no behaviour check; Workflow, ScheduleWakeup and ReportFindings leave through the deny list (SURFACE), and cutting Agent, Bash or AskUserQuestion text risks the models' behaviour. claudetto shall shorten the descriptions of Workflow (3,496 chars stock on 2.1.327), DesignSync, ScheduleWakeup, ReportFindings, Agent, Bash, and AskUserQuestion through `tool.describe`, and consider `skill.prompt` shortening of bundled skills (none built; each cut ships only on a measured check, ADR-0177).
  Acceptance: each listed tool carries a description of 200 chars or fewer in the first request. Verification: probe (`just prompt-bytes`).
  Basis: measured (12,823 bytes removed from a `-p` request, 2.1.327, cc-inspect `code cli`); the 200-char target is this plan's own design choice, inferred from that saving. Status: partial at 088a227c (`trim.ts:3-7` lists Workflow, ScheduleWakeup, DesignSync; the other texts are not cut there). In 2.1.327 the DesignSync tool is present (chunk-k1sz9xwz.js@1089); on 2.1.327 Workflow, ScheduleWakeup, ReportFindings, and DesignSync are in the tool list (chunk-1vttvse2.js), and denying Workflow, ScheduleWakeup and ReportFindings removes 12,823 bytes from a `-p` request.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:412 (Workflow, ScheduleWakeup, ReportFindings manuals); plugins/claudetto/hooks/features/surface/trim.ts:3-7@088a227c. History: the 22,331-char figure is the Workflow text after the 2.1.321 plugin grew it from 5,355 stock (CTX-060); the 2.1.327 stock description measures 3,496 characters (probe L, reports/2026-11-18-research/handover-probes/probe-l/workflow-description-2.1.327.txt).

- [x] **OUT-471** Out (REQ-SETUP-031, REQ-GUARDS-040): REQ-GUARDS-040 and ADR-0054 own the ask and deny rules; ADR-0125 replaced the gate by them. claudetto shall write `permissions.ask` for `Bash(git reset *)`, `Bash(git update-ref *)`, `Bash(git branch -f *)`, `Bash(git worktree remove *)`, and branch delete; `permissions.deny` for `Bash(pkill *)` and `Bash(killall *)`; `permissions.allow` for read-only commands (`git status`); keep each user rule (`Bash(ls)`); no mod judges a Bash command; read and write advice stays in Bash tool text.
  Acceptance: A setup run on a settings file holding `Bash(ls)` adds the rules and keeps `Bash(ls)`. Verification: test.
  Basis: reported (ADR-0125 records the replacement; the old gate is not in the baseline tree, so no gap against it can be measured). Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/setup/command-rules.test.ts:6@088a227c; plugins/claudetto/hooks/features/setup/command-rules.ts@088a227c; [ADR-0125](../adr/0125-bash-gate-replaced-by-permission-rules.md).

- [x] **OUT-472** Out (REQ-SETUP-042, ADR-0177): ADR-0177: `planModeText` is claudetto's own name (no Claude Code side) and no measurement shows the engine reminder costs more than it helps. claudetto shall replace the full plan-mode reminder with `planModeText` when it is shorter than the engine's; it names the plan file; `hasPlan` true -> read then edit step by step, else build with Write and Edit.
  Acceptance: A sparse reminder, a row without facts, or a shorter engine text passes unchanged. Verification: test.
  Basis: measured. Status: missing at 088a227c (git grep planModeText finds no hit; no features/plan dir). There is no Claude Code side: a search of 2.1.327 for `planModeText` finds no hit, so it is claudetto's own name (the EnterPlanMode and ExitPlanMode tools are in the tool list, chunk-1vttvse2.js).
  Source: openspec/specs/surface-trim/spec.md:307.

- [x] **OUT-473** Out (REQ-SETUP-045, ADR-0177): ADR-0177: no measured gain over vanilla; the ignore block narrows Grep and touches the user's files. claudetto shall write one marked block `# >>> claudetto: generated by /claudetto:setup, edit outside this block` ... `# <<< claudetto` into `.gitignore` and `.ignore` of a git work tree only, touching no line outside it; `.rgignore` is never made.
  Acceptance: Rerun leaves the files byte-identical; paths the user's lines already name (with or without slash or `!`) stay out of the block; CRLF kept; an unclosed block left as is. `.gitignore` fixed lines: `.DS_Store`, `Thumbs.db`, `*.swp`, `.claude/settings.local.json`, `.claude/worktrees/`, `.claude/claudetto/`, `CLAUDE.local.md` plus untracked heavy paths of detected families; `.ignore` gets tracked heavy paths and bulky listed paths, not made when empty (hides tracked heavy paths from rg without altering git). The dialog shows a diff and says the block narrows Grep with no glob, not Glob. Verification: test.
  Basis: cited. Status: have at 088a227c (setup/ignore.ts:12; partial for docs: setup README/commands mention it).
  Source: openspec/specs/setup/spec.md:40; openspec/specs/setup/spec.md:49; openspec/specs/setup/spec.md:58; openspec/specs/setup/spec.md:67; openspec/specs/setup/spec.md:81; plugins/claudetto/hooks/features/setup/ignore.ts:12@088a227c.

- [x] **OUT-474** Out (REQ-SETUP-046, ADR-0177): ADR-0177: no measured gain over vanilla `/init`. claudetto shall plan starter files from git-listed marker files at the project root with no model call: AGENTS.md of bounded commands (cut at 600 chars) plus CLAUDE.md = title, blank line, `@AGENTS.md`, only when neither exists.
  Acceptance: Nothing is written for an unknown family; a file appearing between question and write is left alone and reported. Markers are git-listed at the project root (tracked, or untracked and not ignored; root name/glob, exact path, `dir/` prefix; a below-root marker does not count); AGENTS.md holds one line per test/build/lint/typecheck command per detected family, a family label when more than one, in table order. Verification: test.
  Basis: cited. Status: have at 088a227c (setup/starter-families.ts, commands/setup.md, README.md).
  Source: openspec/specs/setup/spec.md:31; openspec/specs/setup/spec.md:8; openspec/specs/setup/spec.md:22; plugins/claudetto/hooks/features/setup/starter-families.ts:67@088a227c.

- [x] **OUT-475** Out (REQ-SETUP-048, ADR-0177): ADR-0177 and OUT-001: shipped rules add message-0 tokens each start, and the item's own check is an eval; no measured gain over the user's own rule files. claudetto shall ship one-file rules under plugins/claudetto/rules/, with no frontmatter (they load at session start in message 0), 1-4 non-empty lines each, each with "because"; an eval checks that a function whose type excludes null gets no null check. The 2.1.323 change adds `useHeadlineseNames` (8 offered; each in its own dialog showing the whole text, SHA-256 stored, written only on acceptance; identifiers in headlinese, comments keep articles, Title Case for MD headings and Apple UI). `paths:` frontmatter rules load only after a matching read mid-turn in a tool-result message (measured, 2.1.321 change).
  Acceptance: the shipped set equals the specified set. Verification: inspection.
  Basis: measured. Status: partial at 088a227c (plugins/claudetto/rules/ holds 11).
  Source: the count conflict is recorded in openspec/specs/setup/spec.md:161@088a227c9^ (7 rules: `useLeastCode`, `noUnrequestedEdits`, ...) and openspec/changes/archive/2026-11-16-2-1-323/design.md:164@088a227c9^ (8 offered); the repo ships 11 (adds `commentOnlyWhy`, `guardOnlyTrustBoundaries`, `scopeEditsToGoal`, `useEdgeCaseReport`, `useTestPatterns`; names differ from the specs). The shipped set is the one to specify at implementation.

- [x] **OUT-476** Out (REQ-SETUP-049, ADR-0177): ADR-0177: hash-synced rule copies serve REQ-SETUP-048, which is out. claudetto shall offer each shipped rule as a copy at `<config>/rules/claudetto/<name>.md`, one dialog each; skip one the user holds byte for byte; store the SHA-256 of each written copy (also of each file setup copies out of the plugin); a dismissal stops the rest. At startup it logs one line per installed copy whose hash differs from the shipped one, once per hash pair: `updated` (installed hash equals stored) or `modified` otherwise, with file, hashes cut to 8 chars, and dates, recommending `/claudetto:setup`; nothing for an identical, skipped or already-reported pair; no settings key is written.
  Acceptance: the saved hash decides, not dates (plugin install stamps files with install time); the hooks runtime has `crypto.subtle.digest`, no `Buffer`. Verification: test.
  Basis: measured; cited. Status: have at 088a227c (hooks/features/setup/rules.ts:34-35 hashes with SHA-256). Verified on 2.1.327 by probe: a plugin source file with mtime 2001-01-01 installed to cache/mk/p/1.0.0/rules/a.md with the install-time mtime (Nov 18 2026).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:153; openspec/specs/setup/spec.md:161; openspec/specs/setup/spec.md:178; openspec/specs/setup/spec.md:159; openspec/specs/mod-architecture/spec.md:47; plugins/claudetto/hooks/features/setup/rules.ts:34@088a227c.

- [x] **OUT-477** Out (REQ-SETUP-050, REQ-KERNEL-014): REQ-KERNEL-014 owns the SessionStart `renice` line. claudetto shall append the SessionStart env lines only if the zsh `setopt` line is absent.
  Acceptance: one copy, not 12; 11.8 ms against 58.6 ms. Verification: test.
  Basis: measured. Status: have at 088a227c (plugins/claudetto/hooks/hooks.json:10 tests for the line with `grep -qsF 'renice 10 -p $$'`).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:15; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:16.

- [x] **OUT-478** Out (REQ-SETUP-051, REQ-GUARDS-022): REQ-GUARDS-022 and ADR-0185 own the session hygiene sweep. claudetto shall remove stale generated files under `~/.claude` by listed paths and age limits, and never settings, credentials, CLAUDE.md, a skill, an agent, a plugin install or a newer transcript. `--dry-run` removes nothing; an automatic run never blocks SessionStart (startup, resume, clear, compact); `hygieneEnabled` false starts nothing. Keys: `sessionTempCleanupPeriodDays`, `probeCleanupPeriodMinutes` (60; 0 off); an unset day key follows `cleanupPeriodDays`. The temp root `claude-<uid>` under `CLAUDE_CODE_TMPDIR`, tmp or the system temp is swept once per real path if the user owns it; roots inside `~/.claude/projects`, `~/.claude/plugins` and home are refused; heartbeat files under `.claude/claudetto/heartbeat/` go after one day; CC entries (`-Users-me-project`, `bash-edit-diff`, `plugin-tool-staging`, `cc-socks`, nested `claude-<uid>`) stay by an allowlist; one failing rm is logged and the others go; a vanished entry is tolerated. Probes write to `$TMPDIR/<project>/<session_id>/`, removed on `session.end`; at session start only per-session folders that no running session's `~/.claude/sessions/<pid>.json` names, and whose pid and procStart no longer match, are removed; setup adds `Edit(//tmp/claude-<uid>/**)` and `Edit(//private/tmp/claude-<uid>/**)` to `permissions.allow`.
  Acceptance: a dry run removes nothing; a held file (lsof error) removes nothing. Verification: test.
  Basis: measured. Status: partial at 088a227c (hygiene.ts, setup/changes.ts:155 have the keys and the Edit allow; the `<session_id>` probe folders were not found).
  Source: openspec/specs/session-hygiene/spec.md:33; openspec/specs/session-hygiene/spec.md:174; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:64; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:75.

- [x] **OUT-479** Out (REQ-SETUP-052, REQ-GUARDS-023): REQ-GUARDS-023 to REQ-GUARDS-027 and ADR-0185 own the trash sweep. claudetto shall sweep trash by rules: `hygiene/trash.toml` (gitleaks format) names folders (node_modules and the like), a `gcroot` rule for symlinks into `/nix/store/`, and `temp` rules; a project `.claude/claudetto/trash.toml` replaces the plugin's, or adds with `[extend] useDefault = true` (`disabledRules` by id). It walks the project, the `.claude.json` lists and Mole `~/.config/mole/purge_paths`; skips `.git`, follows no link, never enters `~/.claude/projects` or plugins; age 7 days (`--trash-days`, 0 off). A folder goes only if it is in a git checkout, is not the session's own, has no process or open file (lsof; error means nothing), is git-ignored, and index and files stayed unchanged within the age. After the sweep `mo clean` runs with no terminal on stdin (`--dry-run` gives `mo clean --dry-run`), with the exit code, or `brew install mole` when missing. A worktree goes only when git lists it unlocked, it has no uncommitted change and `git cherry` finds its commits in the checkout branch, else it is named with its size; the first sweep of another project is a dry run plus an ask. A local branch goes when no worktree has it, it is not the default, its newest commit is older than `trashCleanupPeriodDays` (7), and `git cherry` finds every commit in the default branch (`origin/HEAD`, else main or master); a remote branch goes only with `--remote`, never automatically, with no open PR head, and `git ls-remote` over 60 s is stopped.
  Acceptance: the temp rule needed a marker that 0 of 9,567 temp folders held; 48 agent worktrees held 95.1 GiB with the disk 70% full; a dry run with `--remote` found 26 temp entries (790,704 B), 28 worktrees (51.4 GB) and 10 branches; a real run deleted 5 remote branches after approval. Verification: test.
  Basis: measured. Status: have at 088a227c (hygiene/trash.toml, hygiene/trash.ts).
  Source: openspec/specs/session-hygiene/spec.md:79; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-hygiene/spec.md:5; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:619.

- [x] **OUT-480** Out (REQ-SETUP-060, ADR-0177): ADR-0177: a project's package-manager choice has no measured gain, and the deny rules are user policy for the guards block. claudetto shall have setup write `permissions.deny` `Bash(npm *)` plus one rule line per detected package manager, not a fixed Bun list.
  Acceptance: in a repo with a `pnpm-lock.yaml`, setup writes the matching deny rules and no Bun-only rule. Verification: test.
  Basis: read, inferred cure. Status: missing at 088a227c (`git grep BUN_FOR_NPM 088a227c -- plugins` finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:144 (`packages.ts:4-30` hard-codes `BUN_FOR_NPM`, `BUN_LOCKS`, and xmake).

- [x] **OUT-481** Out (REQ-SETUP-061, ADR-0057): ADR-0057 and REQ-SETUP-011 supersede it: all builtins, `telemetry` and `privacy` included, go off. claudetto shall disable eleven built-in plugins as `cc-plugin-<name>@builtin` and shall leave the twelfth, `telemetry`, to `DISABLE_TELEMETRY` alone.
  Acceptance: `hooks/setup/settings.test.ts`: eleven built-in plugins are off as cc-plugin-<name>@builtin; telemetry is off through DISABLE_TELEMETRY alone. Verification: test.
  Basis: read. Status: partial at 088a227c (plugins/claudetto/hooks/features/setup/settings.test.ts:51 holds the telemetry test).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:405.
  Conflicts with: all 14 builtins disabled, `privacy` included, enforced by rewriting user settings at session start (user decision, 2026-11-16).

- [x] **OUT-482** Out (REQ-SETUP-032, ADR-0190): no wizard: settings reach the user by a silent fill-write at SessionStart. claudetto shall keep `/claudetto:setup` as a description-only command file plus an inline `UserPromptSubmit` hook in `hooks.json` that blocks it with "Setup did not run: claudetto plugin code is not running in this session. Restart Claude Code; if it still fails, reinstall claudetto."; a manifest test pins this. `$.command.register({name})` lists `/name` with no plugin prefix (name `^[a-zA-Z0-9_-]{1,64}$`; an unmatched `session.start` needs a matcher such as `{ isInteractive: [true, false] }`).
  Acceptance: With the module not serving, `/claudetto:setup` is blocked with the stated text. Verification: test.
  Basis: measured. Status: partial at 088a227c.
  Source: plugins/claudetto/hooks/hooks.json@088a227c (`UserPromptSubmit`); chunk-dafpvz32.js@3130 (claude 2.1.327: `command.register` present). Not located: the old-plan lines.

- [x] **OUT-483** Out (REQ-SETUP-037, ADR-0190): no wizard: settings reach the user by a silent fill-write at SessionStart. claudetto shall run setup with one model call that asks all setup questions in a single AskUserQuestion dialog.
  Acceptance: a setup run makes one dialog with several questions and takes fewer model calls than the one-question-per-call run; a probe first shows that one dialog takes several questions. Verification: probe.
  Basis: reported, user. Status: missing at 088a227c (git grep finds no AskUserQuestion in plugins/claudetto/features/setup or commands).
  Source: reported, user, 2026-11-14; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:35737; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, latest user message after `/claudetto:setup`; Done).
  Conflict: Setup Advice.

- [x] **OUT-484** Out (REQ-SETUP-038, ADR-0190): no autoMode lists and no defaultMode write, because classifier accuracy with replaced lists is unmeasured. claudetto shall let setup write the Auto mode group (`permissions.defaultMode: "auto"` plus `autoMode`) to the user settings when the user chooses it, and keep retired settings entries.
  Acceptance: after the choice, `~/.claude/settings.json` holds `defaultMode: "auto"` and `autoMode`; retired entries stay. Verification: demonstration.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c (groups.test.ts:83 writes `permissions: { defaultMode: "auto" }`; settings.test.ts:260-273 keep a held `defaultMode`; keeping retired entries is not checked)
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, State and User's words: "Write the group", "Keep it").

- [x] **OUT-485** Out (REQ-SETUP-054, ADR-0190): no autoMode lists and no defaultMode write, because classifier accuracy with replaced lists is unmeasured. claudetto shall ship the built-in classifier with trimmed `autoMode` lists, set no `CLAUDE_CODE_AUTO_MODE_MODEL`, and fail closed when the classifier is down; a plugin `tool.check` only tightens a verdict or turns a bare ask on a read-only command into allow, and never asks a model to judge permission. Deny rules and `hard_deny` stay in every tier.
  Acceptance: settings hold `autoMode` and no `CLAUDE_CODE_AUTO_MODE_MODEL`. Measured 2026-11-06: a plugin route (Jev first, fallback claude-haiku-5-5) scored 29/30 against the built-in 30/30 on 30 cases, with a stable miss on `push-unnamed-branch`. Verification: inspection.
  Basis: measured (the env is present in 2.1.325 but ineffective: the server-configured model wins; verified on 2.1.327: chunk-m14bt1pz.js@3534099 and @3534272 warn "ignoring CLAUDE_CODE_AUTO_MODE_MODEL ... because a server-configured classifier model takes priority"; the env is read at @3534449). Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/low-hitl/spec.md:37; plugins/claudetto/hooks/features/setup/settings.ts:102@088a227c.

- [x] **OUT-486** Out (REQ-SETUP-059, ADR-0190): no autoMode lists and no defaultMode write, because classifier accuracy with replaced lists is unmeasured. claudetto shall write `autoMode` with one line each, replacing the built-in lists: allow "Local Work" (reading, editing, building, testing, and formatting in the working tree and its temp output), soft_deny "Destroy Work" (deleting or overwriting what the repo cannot restore: force-push, history rewrite, remote branches, tags, uncommitted work, or an unresolved target), hard_deny "Data Exfiltration" (secrets landing outside the trusted repo, its remotes, and Environment hosts), and environment "Trusted repo".
  Acceptance: the written `autoMode` holds these four entries and no `"$defaults"`. Verification: test.
  Basis: cited (a design draft, never run). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/auto-mode.ts` writes "Everything Else", "Destroy Work", "Wipe a Disk" plus `$defaults`, and "Trusted repo" with "Source control").
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/scripts/planned-settings.json:109-121.
  Conflict: Setup Groups (first item, `$defaults`-preserving lists).
  Conflict: Setup Rules To Keep.

- [x] **OUT-487** Out (REQ-SETUP-006, ADR-0190): no model or effort values, because vanilla already resolves the aliases to the 5.5 ids. claudetto shall set `maxEffortLevel` "high" and model settings of opus-5-5 `effortLevel` high, sonnet-5-5 medium, haiku-5-5 medium with `maxEffortLevel` medium.
  Acceptance: the written settings hold those values; the lowest cap across files wins. Verification: inspection.
  Basis: cited. `effortLevel` accepts low, medium, high, xhigh; `maxEffortLevel` also max. The source gives this as a proposal; no user decision on the values is stated. Status: partial at 088a227c (`settings.ts:111-115` sets `maxEffortLevel` high for opus, medium for sonnet, high for haiku; `effortLevel: "medium"`; no top-level cap).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:778; plugins/claudetto/hooks/features/setup/settings.ts:111@088a227c.
  Conflict: Setup Groups, "Models and windows" group.

- [x] **OUT-850** Out (REQ-SETUP-019, ADR-0177): vanilla already leaves Read, Write and ListAgents undeferred, and no `tool.describe` hook ships, so the deferral rule has nothing to guard. claudetto shall ship no per-tool text or deferral without a measured gain that keeps the tool reachable.
  Acceptance: `grep -rn "tool.describe" plugins/claudetto/hooks` finds no registration; a `-p` request lists Read, Write and ListAgents with full schemas.
  Basis: measured, claude 2.1.327, 2026-11-19: the stock first request carries all three; the paid deferral run (ListAgents 0/8 reached) recorded earlier stays the cost of a wrong deferral. Status: none shipped.
  Source: plans/rebuild/adr/0177-pragmatism-gate.md; cc-inspect cli `-p hi` tools list.
  Conflict: Tool Deferral.

- [x] **OUT-851** Out (REQ-SETUP-041, ADR-0177): shortened texts for Monitor, ToolSearch, EnterPlanMode, ExitPlanMode and the Task tools show no measured gain that outweighs the reach risk. On 2.1.327 a `-p` request sends ToolSearch at about 850 characters, Monitor only after a ToolSearch call, and no Task tool; EnterPlanMode is denied by REQ-SETUP-033. A reach check needs a paid run, which ADR-0190 leaves out until a gain is measured.
  Acceptance: none; the stock texts stay.
  Basis: measured, claude 2.1.327, 2026-11-19 (cc-inspect cli `tool` ToolSearch; the tool list of a `-p` request).
  Source: plans/rebuild/adr/0177-pragmatism-gate.md; plans/rebuild/adr/0190-triage-decisions-by-agent.md.

- [x] **OUT-852** Out (REQ-SETUP-023, ADR-0190): no setup wizard; unset defaults are written silently at SessionStart with one notice.
  Acceptance: `fillSettings` writes each unset key once per FILL_VERSION and logs one notice listing them.
  Basis: decision, ADR-0190. Source: plans/rebuild/adr/0190-triage-decisions-by-agent.md.

- [x] **OUT-853** Out (REQ-SETUP-025, ADR-0190): no setup groups and no per-key questions; `autoMode` lists, `defaultMode`, `promptCacheTtl` and the `CONTEXT7_API_KEY` and `TYPESAFE_API_KEY` prompts are not written. `sandbox.enabled` and the builtin disable ship through the fill and REQ-SETUP-011.
  Acceptance: `grep -rn "autoMode\|defaultMode\|promptCacheTtl" plugins/claudetto/hooks` returns no write.
  Basis: decision, ADR-0190 (classifier accuracy with replaced lists is unmeasured). Source: plans/rebuild/adr/0190-triage-decisions-by-agent.md.

- [x] **OUT-854** Out (REQ-SETUP-028, ADR-0177): the four read-only git allow rules add nothing, because vanilla already runs `git status`, `git diff`, `git log` and `git show` with no prompt and no allow rule. The `autoMode.classifyAllShell` rule stays moot, since no `autoMode` key is written.
  Acceptance: a stub run of the four commands under default permissions shows 0 prompts.
  Basis: measured, claude 2.1.327, 2026-11-18 (cc-inspect cli, four Bash calls, no allow rule, 0 prompts; exit 128/129 only because the probe folder is no repository). Source: plans/rebuild/adr/0177-pragmatism-gate.md.
  Conflict: Auto Mode.

- [x] **OUT-855** Out (REQ-SETUP-029, ADR-0190): no `model`, `effortLevel`, `fallbackModel`, `modelSettings`, `idleCompaction` or default-model env values are written; vanilla already resolves the aliases to the 5.5 ids.
  Acceptance: the fill writes none of those keys.
  Basis: decision, ADR-0190. Source: plans/rebuild/adr/0190-triage-decisions-by-agent.md.

- [x] **OUT-856** Out (REQ-SETUP-035, ADR-0190): setup writes no trimmed `autoMode` lists, no `promptCacheTtl` and no `permissions.defaultMode`; worktree and sandbox settings ship through the fill.
  Acceptance: as OUT-853. Basis: decision, ADR-0190. Source: plans/rebuild/adr/0190-triage-decisions-by-agent.md.

- [x] **OUT-857** Out (REQ-SETUP-065, ADR-0190): auto memory is not turned off by setup; REQ-GUARDS-048 requires consent.
  Acceptance: the fill writes no `autoMemoryEnabled`. Basis: decision, ADR-0190. Source: plans/rebuild/adr/0190-triage-decisions-by-agent.md.

- [x] **OUT-858** Out (REQ-SETUP-062, ADR-0177): the "Smaller prompt" group is split by its parts. The tool deny ships under REQ-SETUP-033 (seven tools; ExitPlanMode stays), the builtin disable under REQ-SETUP-008, `outputStyle` belongs to the reply block, the four git allows go Out as OUT-854, and `disableBundledSkills` stays unset because it removes the bundled skills for 854 further bytes.
  Acceptance: the fill writes no `disableBundledSkills` and no `outputStyle`.
  Basis: measured, claude 2.1.327, 2026-11-18 (fake-API probe, 854 bytes). Source: plans/rebuild/adr/0177-pragmatism-gate.md.

- [x] **OUT-859** Out (REQ-SETUP-057, ADR-0177): `disableClaudeAiConnectors` has no measurable gain on an API-key stub, and `disableBundledSkills` trades capability for 854 bytes, so neither is written. The shipped trims are the tool deny, `skillListingMaxDescChars` 60 and the measured env flags.
  Acceptance: none beyond OUT-858. Basis: measured (see OUT-858). Source: plans/rebuild/adr/0177-pragmatism-gate.md.

- [x] **OUT-860** Out (REQ-SETUP-043, ADR-0177): the unnamed "16 approved flags" and `CLAUDE_CODE_THRIFTY_SONIC=0` are not written. Three flags show a request-byte gain and ship: `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` -1,492 bytes, `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` -913, `CLAUDE_CODE_FORK_SUBAGENT=0` -404; the advisor flag ships with DISABLE_CRON (-384). Telemetry, IDE and terminal-title flags show none, and THRIFTY_SONIC has no measured effect.
  Acceptance: the fill writes those four env keys and no other flag of the old set.
  Basis: measured, claude 2.1.327, 2026-11-18 (first `-p` request 47,323 bytes without the flags). Source: plans/rebuild/adr/0177-pragmatism-gate.md.

- [x] **OUT-861** Out (REQ-SETUP-040, ADR-0177): no `tool.list` hook; the `permissions.deny` of REQ-SETUP-033 already drops each unused tool definition from the request, so the hook adds no gain. `disableWorkflows`, `disableBundledSkills` and `disableClaudeAiConnectors` are not written (OUT-858, OUT-859); `skillListingMaxDescChars` 60 ships.
  Acceptance: a request with the deny omits the denied tool definitions (REQ-SETUP-033). Basis: measured, claude 2.1.327. Source: plans/rebuild/adr/0177-pragmatism-gate.md.

- [x] **OUT-862** Out (REQ-SETUP-027, ADR-0177): `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` is written as 3 for every plan; the split by plan (4 on Max, none on Ultra) needs a plan lookup with no measured gain. The other env keys of the requirement ship.
  Acceptance: the fill writes "3" when the key is unset. Basis: decision, ADR-0177. Source: plans/rebuild/adr/0177-pragmatism-gate.md.

- [x] **OUT-863** Out (RISK-403, ADR-0190): an agent that narrows a general fix to one tool is a conduct fault; the reply and kernel blocks own it, and it stays open there until a dogfood session shows it absent. Setup has no part that carries it.
  Acceptance: none in setup. Basis: decision, ADR-0190. Source: plans/rebuild/adr/0190-triage-decisions-by-agent.md.

- [x] **OUT-864** Out (RISK-413, ADR-0190): an agent that edits user settings or reverts work with no order is a conduct fault owned by the guards and kernel blocks, not by setup.
  Acceptance: none in setup. Basis: decision, ADR-0190. Source: plans/rebuild/adr/0190-triage-decisions-by-agent.md.

- [x] **OUT-865** Out (RISK-405, ADR-0190): Claude Code sending the claude.ai login token to a custom base URL is an upstream behaviour; claudetto sets no base URL and has no hook that changes it. The user holds the dependency (use an API key with a custom base URL).
  Acceptance: none. Basis: cause outside claudetto, ADR-0190 (13 risks with an outside cause close). Source: plans/rebuild/adr/0190-triage-decisions-by-agent.md.

- [x] **OUT-866** Out (RISK-410, ADR-0190): a running session holding a stale plugin until restart is Claude Code's load model; the start notice already tells the user to run `/reload-plugins`.
  Acceptance: none. Basis: cause outside claudetto, ADR-0190. Source: plans/rebuild/adr/0190-triage-decisions-by-agent.md.

#### Verification

- [x] **OUT-488** Out (REQ-VERIFICATION-001, ADR-0087): claudetto ships no lint-hook wrapper, so a three-case test for one is a needless test. claudetto shall test a lint-hook wrapper with three cases: a clean file, a real lint error, and a missing linter, so the last two give different messages.
  Acceptance: A missing linter and a lint error produce different messages, else the agent edits source to fix a toolchain problem. The same lint command also runs in the build pipeline, because a skill-frontmatter hook runs only after the skill is invoked and is not an always-on gate. Verification: test.
  Basis: reported, 1 author, inferred. Status: missing at 088a227c (the plan holds exit-code and frontmatter facts, not this test set or the CI-duplicate rule).
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xuipfl-your-code-rules-skill-can-enforc-20261112T231521Z.md:58 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xuipfl/your_code_rules_skill_can_enforce_itself_with_a/>).

- [x] **OUT-489** Out (REQ-VERIFICATION-002, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall do a read-only repo tour before edits, agree an acceptance test first, treat repo files as untrusted, use a branch with small reviewed diffs, and scope each job small.
  Acceptance: A run shows the tour before the first edit and the acceptance test before the code. Verification: demonstration.
  Basis: reported (one freelancer). Status: partial at 088a227c (the plan holds untrusted files and tests as spec, not the read-only tour step).
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xuqnw8-5-habits-that-made-claude-code-s-20261112T225600Z.md:31,32,33,34 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xuqnw8/5_habits_that_made_claude_code_safe_enough_to_use/>).

- [x] **OUT-490** Out (REQ-VERIFICATION-003, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall, per session, ask for four plain-English lists (new files, new dependencies, calls to outside services, anything touching passwords, keys, or payment data), then run `/security-review` on the branch and ask for the exact line of any unclear finding.
  Acceptance: The four lists appear in the delivery notes and each unclear finding names a line. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (`/security-review` appears only in `features/surface/surface.ts`; no four-list routine).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xta125-nondev-here-about-18m-lines-of-20261116T051840Z.md:1623 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xta125/nondev_here_about_18m_lines_of_claude_code_output/>).

- [x] **OUT-491** Out (REQ-VERIFICATION-004, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall list 10-15 things that must never happen (user A sees user B's data, payment without a verified webhook, API keys in the frontend) and have a fresh session try to prove each impossible, citing exact files.
  Acceptance: Each listed item has a verdict with file citations. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (git grep for never happen found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xta125-nondev-here-about-18m-lines-of-20261116T051840Z.md:669 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xta125/nondev_here_about_18m_lines_of_claude_code_output/>).

- [x] **OUT-492** Out (REQ-VERIFICATION-005, ADR-0087): tests per class of input counted in delivery notes are needless tests. claudetto shall have the coding session write tests per class of input and put the count in the delivery notes, and the reviewer read exactly those N tests.
  Acceptance: The note's count equals the number of tests the reviewer reads. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xta125-nondev-here-about-18m-lines-of-20261116T051840Z.md:815 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xta125/nondev_here_about_18m_lines_of_claude_code_output/>).

- [x] **OUT-493** Out (REQ-VERIFICATION-006, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall have an agent extract the codebase's implied coding guidelines, make them explicit in a repo file, verify them against best practice and IT-SEC guidelines, and use them as the review baseline.
  Acceptance: A repo guidelines file exists and a review cites it. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (git grep for guidelines found only the rule `useHeadlineseNames.md`).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xta125-nondev-here-about-18m-lines-of-20261116T051840Z.md:1567 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xta125/nondev_here_about_18m_lines_of_claude_code_output/>).

- [x] **OUT-494** Out (REQ-VERIFICATION-007, ADR-0177, ADR-0164): the measured result (3 of 3 against 0 of 3) is for a CLAUDE.md, not for a claudetto component, and ADR-0164 rejected checks on test tampering. claudetto shall accept a bug-fix claim only when a named regression test, written first and committed red before the green fix, fails on pre-fix code on its own assertion for the stated reason and passes on the fix, with the baseline run in a separate temporary worktree (not stash); the new test is shown failing on unchanged code with what should still fail, and a behaviour-preserving refactor starts with a characterization test passing on old code (about 10 golden examples, run more than once).
  Acceptance: The failure matches the expected assertion, with test ID and expected/actual or exception type saved; missing fixtures, timeouts, and import errors count as inconclusive; a bug-fix change holds a red commit before the green one, and a fix commit follows a recorded failing run of its test. About a third of the time the test passed before the fix, so the bug was not the bug. Verification: test.
  Basis: measured (n=3: regression test 3 of 3 with a Karpathy-style CLAUDE.md against 0 of 3, Claude Code 2.1.312); reported (n=31, n=6; one comment). Status: partial at 088a227c (the plan holds fails-before and passes-after only; git grep for inconclusive found none; `plugins/claudetto/hooks/features/prompt/texts.ts:51@088a227c` says "write a failing test first", with no commit-red step or characterization line).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuivsm-i-replayed-4000-of-my-claude-c-20261116T052626Z.md:67,71,79,83 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xuivsm/i_replayed_4000_of_my_claude_code_turns_to_see/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xsg651-i-spent-three-weeks-measuring-wh-20261110T093243Z.md:39 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsg651/i_spent_three_weeks_measuring_whether_my_own/>); unresolved: no source line holds the n=31, n=6, or 3-of-3 figures.
  Resolved: the pre-fix baseline runs in a separate temporary worktree, never a stash (user decision, AskUserQuestion 2026-11-17).

- [x] **OUT-495** Out (REQ-VERIFICATION-008, ADR-0177): size gates through CI lint are the project's own tooling; no CI exists in the rebuild and the small-files rule is held by OUT-002. claudetto shall enforce architecture and size by gates, not prompts or asking Claude to be brief: ESLint `max-lines` 500 failing CI, a list of oversized files that only shrinks, folders by product area, specs folded into one technical manual in the same PR as the feature and then deleted, and pre-commit hooks that cap Markdown length, files per folder, headings per file, and lines per code file, with Markdown frontmatter (title, summary, keywords) and a generated INDEX.md per folder.
  Acceptance: A file over 500 lines fails CI unless it is on the shrinking list, and a commit over a cap is refused by the hook. Obsolete designs left in the repo look current to an agent and get rewired. The team's audit found 175 of 180 backend files in one folder, a server file of about 2,000 lines, and 1,499 files in docs/; one user reported 40k-98k tokens of status files loaded per session. Verification: test.
  Basis: reported. Status: missing at 088a227c (git grep for max-lines found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xv2oax-ai-slop-without-architecture-i-20261116T052334Z.md:220 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xv2oax/ai_slop_without_architecture_is_how_providers/>); unresolved: the second source's tag was not located in external/, openspec, or code at 088a227c.

- [x] **OUT-496** Out (REQ-VERIFICATION-009, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall generate a per-folder index of files, classes, and functions with 3-5 word descriptions from symbols or the compiler, enforced through `agent.md` so agents scan it first, with budgets (DRY, line-of-code, zero hardcoding) backed by a failing gate.
  Acceptance: The index is generated, not hand-maintained, since hand-maintained rots and lies; about +-25% justified deviation is allowed; budgets split files by seam, not line count. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xv2oax-ai-slop-without-architecture-i-20261116T052334Z.md:268,270 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xv2oax/ai_slop_without_architecture_is_how_providers/>).

- [x] **OUT-497** Out (REQ-VERIFICATION-010, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall stress-test a new interface by asking 3-5 agents to design different games on it, promote repeated friction to a primitive, and read one-off friction as a game asking for what it should not get.
  Acceptance: Each friction point is classed repeated or one-off; hardcoded values move into data or script files as the cheapest blast-radius cut. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xv2oax-ai-slop-without-architecture-i-20261116T052334Z.md:280,282 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xv2oax/ai_slop_without_architecture_is_how_providers/>).

- [x] **OUT-498** Out (REQ-VERIFICATION-011, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall verify a scheduled run with a checker script outside the agent and independent of the agent's own summary, because the green check is only "process exited 0" and `claude -p` exits 0 whenever the agent stops talking, even on "this is broken" (an agent grading its own summary missed a revoked token; a hook listing failed or never-fired runs over 7 days catches crashes only).
  Acceptance: After each task the checker confirms the expected sections exist and are non-empty, the file size, and that the header date is today (a deploy is checked by curling the live page for a build stamp); the wrapper exits non-zero on failure, with distinct exit codes for API error (3) and nothing produced (4); a preflight call with the token before the agent starts fails hard on a 401; the agent writes a status file ok or degraded (or `claude -p --output-format json --json-schema` checked with `jq -e` on `structured_output.status`) and degraded fails; a run with a revoked token shows as failed in the independent check. Verification: test.
  Basis: reported. Status: partial at 088a227c (the plan holds a status file, buckets, and runner-enforced limits; git grep for preflight found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xv4m97-how-do-you-check-that-a-schedu-20261116T052146Z.md:51,53,55,57,173 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xv4m97/how_do_you_check_that_a_scheduled_claude_code_run/>); unresolved: the independent-check source tag was not located in external/, openspec, or code at 088a227c.

- [x] **OUT-499** Out (REQ-VERIFICATION-012, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall compare each run's counts (sections filled, rows, links, bytes) with the last good run and flag a big drop (0 where yesterday had 40).
  Acceptance: Each run ends in one of three states: did the work, had nothing to do, failed; a heartbeat goes to an outside dead-man's switch after a real pass so a run that never started alerts; nothing is sent on pass; the published result is re-fetched and compared character for character with the intended output; a fresh no-memory session answers yes/no questions on spec plus output; a failure reported twice without trying a fix counts as the job failing. Verification: test.
  Basis: reported. Status: partial at 088a227c (git grep for heartbeat found it in `line-file`, `price-step`; none for dead-man).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xv4m97-how-do-you-check-that-a-schedu-20261116T052146Z.md:83,85,93,121,133,157 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xv4m97/how_do_you_check_that_a_scheduled_claude_code_run/>).

- [x] **OUT-500** Out (REQ-VERIFICATION-013, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall turn each security bug into a missing test: change password, then prove the old session and refresh token fail server side (401), then have the agent write the neighbors (password reset, email change, logout everywhere, role removal).
  Acceptance: Semgrep or CodeQL runs in CI with a security-only review pass per PR (authz on every endpoint, session lifecycle, input validation); a short trust-boundary list with one regression test per failure beats reading all generated lines; a fault becomes an instruction loaded by progressive disclosure plus a deterministic architectural test and AST checks. Verification: test.
  Basis: reported. Status: missing at 088a227c (git grep for Semgrep found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvacjb-how-often-do-you-notice-legiti-20261116T051816Z.md:92,100,112 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvacjb/how_often_do_you_notice_legitimate_issues_in_your/>).

- [x] **OUT-501** Out (REQ-VERIFICATION-014, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall have the agent stop after each plan item, ask the user to check it by hand, and tick the checkbox only on confirmation, with the user stating what was checked ("paid with the test card and the invoice showed up").
  Acceptance: No box is ticked without a stated check. Confirming "it works" before a follow-up why-question stops the agent from reading the question as a bug report and ripping out working code. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvcy0y-tip-take-the-time-to-say-it-wo-20261116T052243Z.md:53,61 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvcy0y/tip_take_the_time_to_say_it_works_to_claude_after/>).

- [x] **OUT-502** Out (REQ-VERIFICATION-015, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall write a decision table of each control's values plus the constraints between them before asking for code on a UI with many interacting options, then test each value once, the risky pairs, and boundary states (disabled, loading, empty).
  Acceptance: Not every combination is tested. Verification: demonstration.
  Basis: reported (one poster). Status: missing at 088a227c (git grep for decision table found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwyz3g-your-process-for-massive-or-co-20261116T051324Z.md:102 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xwyz3g/your_process_for_massive_or_complex_projects/>).

- [x] **OUT-503** Out (REQ-VERIFICATION-016, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall check a source-derived claim set by two independent passes: a second pass re-reads every primary source and checks each claim, then a separate cold session audits; and shall make the agent check an agent-written document or an earlier report against an outside source before it relies on a claim, and say which claims it has not checked.
  Acceptance: The second pass and the cold audit each report a mistake list; unconfirmed stories are dropped. The poster's run caught a number quoted blog-to-blog, a wrong discoverer, an incident date given as disclosure date, and two unconfirmed stories. A reply built on an agent-written document names each checked claim with its source; a claim left unverified is labelled as such. Verification: demonstration.
  Basis: reported, poster's own; reported, user. Status: partial at 088a227c (the findFactsByExperiment rule in plugins/claudetto/rules/ asks for outside-source checks; no two-pass step; the fact-check practice itself has no baseline term to search).
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xaqse6-the-agent-was-almost-never-the-w-20261022T012322Z.md:35 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xaqse6/the_agent_was_almost_never_the_way_in_i_went/>); reported, user, 2026-11-10 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/1b56d9ba-db9c-4286-88f0-94324ae915c1.jsonl:6`); reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/62fb35cb-dd6d-4719-9eaa-89f8692eb98f.jsonl:2913`).

- [x] **OUT-504** Out (REQ-VERIFICATION-017, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall tell the agent the result, let it write the tests and define "done" itself, then have the user approve the criteria and review results, not process.
  Acceptance: A task carries agent-written done criteria that the user approves before the run. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (`git grep` for "done criteria" and "define done" in plugins finds none).
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xbl19s-how-do-you-manage-reading-fatigu-20261021T201944Z.md:85 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xbl19s/how_do_you_manage_reading_fatigue/>).

- [x] **OUT-505** Out (REQ-VERIFICATION-018, ADR-0087): a fresh-session replay of old prompts is a benchmark; the handover block checks its own output by probe (ADR-0184). claudetto shall test a handover by running a fresh session on 2-3 prompts the old session handled well, and by keeping a short list of things the agent must never get wrong (constraints, failed approaches, the load-bearing decision) that the agent states and is scored on before touching code after a compaction or handoff.
  Acceptance: A failure means a rule is missing, not more detail needed. Suspicion: the roadmap returns but the one load-bearing constraint quietly drops (inferred, untested). Verification: test.
  Basis: reported (51); inferred, untested (79). Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:239 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>); external/2026-10-22/reddit.com-r-claudecode-comments-1xbq4wv-how-do-developers-using-ai-cod-20261022T003343Z.md:241 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbq4wv/how_do_developers_using_ai_coding_agents_manage/>).

- [x] **OUT-506** Out (REQ-VERIFICATION-019, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall run QA in a separate repo with no product code, testing only against the issue text with a screenshot for every step; no screenshot means skipped.
  Acceptance: Each QA step has a screenshot. A Stop hook only catches what tests cover; skipped parts are the untested ones. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbkgjm-what-matters-most-to-you-when-20261022T005215Z.md:72 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbkgjm/what_matters_most_to_you_when_working_with_claude/>).

- [x] **OUT-507** Out (REQ-VERIFICATION-020, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall diagnose drift by picking three past edits that crossed a module boundary and replaying each from a clean worktree once in a fresh session and once after compaction, recording the ADRs loaded and whether the boundary check failed.
  Acceptance: Only compacted runs drift: fix context selection. Both drift: enforce mechanically. Verification: demonstration.
  Basis: reported (the commenter proposes this replay diagnosis). Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbyxeo-how-do-i-structure-my-monorepo-20261022T010218Z.md:65 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbyxeo/how_do_i_structure_my_monorepo_and_workflow_to/>).

- [x] **OUT-508** Out (REQ-VERIFICATION-021, ADR-0177): plugins/claudetto ships no skill, so there is nothing to lint, and vanilla `claude plugin validate --strict` was probed on a skill with `&bad value`: it does not flag it, so a lint would be new work with no shipped skill to protect. claudetto shall lint skill frontmatter against the real parser: flag a value starting `&`, `!`, `?`, `-`, or `#`, `#` in a plain value, a comma inside the parentheses of a flow list, tabs and plain multi-line values, and a description plus `when_to_use` over the claudetto cap; warn on the colon and `@`-start cases anyway.
  Acceptance: A fixture for each flagged form fails the linter, and a fixture for each warned form warns. Warn on colon and `@` because claude.ai and other agents use other parsers. Verification: test.
  Basis: cited (settings-review.txt:1004 lists the unsafe frontmatter forms). Status: missing at 088a227c (git grep lint for skills in plugins and tools: no hit; tools/descriptions.test.ts reads frontmatter descriptions only).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1004.

- [x] **OUT-509** Out (REQ-VERIFICATION-022, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall keep graders and referees unwritable by the tested agent: deny the evaluated agent write access to graders, scoring contracts, and acceptance criteria, and version each criteria change, reporting versions apart.
  Acceptance: graders, tasks, and a hash are frozen before run 1; the agent cannot write graders, hidden tests, holdout, or results; grading runs outside its workspace; graders reject known-bad runs; the holdout is scored once; held-out data is denied through a `Read` deny plus `sandbox.filesystem.denyRead` (2.1.327: present, code search `denyRead` in claude 2.1.327, chunk-ja5z738t.js@115660); judges get the full numbered tool-call list with the last 300 characters of each result (judge faults caused every held-out miss in the first 24/24 attempts); an agent write to a grader or scoring file is refused; a changed criterion produces a new eval version whose results are not merged with the old. Verification: test.
  Basis: measured; reported, user. Status: partial at 088a227c (`plugins/claudetto/hooks/features/protected/`; tools/bench/holdout.ts exists, no write block found).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:332; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:380; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-31/README.md:29; external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:134; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7493).

- [x] **OUT-510** Out (REQ-VERIFICATION-023, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall validate every text-pattern grader and guard with known-good and known-bad inputs: at least one known-good real-transcript answer it must pass and at least one known-bad it must fail, including deliberately defective implementations (hardcoded phrase, skipped path, fabricated context, removed assertion), with a development set kept apart from a holdout set; trace graders (tool ran, file changed, exit code) over wording; graders are regexes and file reads, not sentence judges (two careful judges agreed on 6 of 10); trigger the blocked action and confirm the guard fires; a dry pass end to end (scaffold, run, grade) before the first paid run; symmetric decision rules unit-tested on real intervals.
  Acceptance: each grader has both fixtures, the grader rejects each known-bad implementation, and final scoring uses cases the agent never saw. Reported asymmetric rule: a drop counted as a loss when the interval merely reached below -0.05, while an over-claim rise needed the whole interval above +0.05. Verification: test.
  Basis: reported. Status: partial at 088a227c (tools/bench/mutate.ts, holdout.ts).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:322; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7493).

- [x] **OUT-511** Out (REQ-VERIFICATION-024, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall record the implementation revision, eval revision, configuration, results, and tool events outside the agent's writable workspace.
  Acceptance: after a run the agent cannot alter the stored record. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (tools/bench/run.ts:88-95 names the revision a result ran; no store outside the agent's writable workspace found)
  Source: reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7493).

- [x] **OUT-512** Out (REQ-VERIFICATION-025, ADR-0087): a repo-wide 200-character description test is a needless test; the manifest description is one line. claudetto shall hold each description to 200 characters: plugin, skill, command, agent, output style, registered tool, userConfig option, and rewritten built-in text. Per-parameter detail lives in that parameter's own description; a repo test names the plugin, option, and length; the Bash description (1,177 chars then) shrinks to 200 or fewer with each removed rule moved to a parameter description or the root prompt, or dropped with a recorded reason. An instruction states action plus reason; examples sit in `<example>` tags; each prompt is read against the receiving model's guide.
  Acceptance: `for d in descriptions: assert len(d) <= 200` passes, and a stock-length table (Monitor/ToolSearch/EnterPlanMode/ExitPlanMode 953-6,354; Task tools 2,146/732/998/2,243) shows each override shorter. Verification: test.
  Basis: measured, reported, and cited. Status: partial at 088a227c (`plugins/claudetto/hooks/features/surface/texts.ts` `TOOL_TEXTS`, `surface/trim.ts` `skillListingMaxDescChars`; no repo-wide 200-char test).
  Source: openspec/specs/surface-trim/spec.md:31; openspec/specs/agent-facing-text/spec.md:27; plugins/claudetto/hooks/features/surface/texts.ts@088a227c.

- [x] **OUT-513** Out (REQ-VERIFICATION-026, ADR-0177): an ISSUES list of open measurements is bookkeeping; each measurement is taken only when a component needs it (ADR-0177). claudetto shall list each open measurement as an ISSUES item: wrapper tool size against stock (needs request bodies), `Budget:` line position after the cache breakpoint (a multi-prompt run), the 1h child marker after a 5m parent (a paid run), and Linux bubblewrap behavior of `ps`, `top`, and `sysctl`.
  Acceptance: each of the four measurements has an ISSUES entry with its method and what it blocks. Verification: inspection.
  Basis: cited (the design lists these four measurements as open). Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:129 (`Budget:` line, still open in that design because `-p` submits one prompt); openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:156 (fork TTL marker); openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:164 (bubblewrap read from source, no Linux run); external/please-use-me-often/agent-failure-dossier/judged/HANDOFF-A.md:11 (5m parent: paid); openspec/specs/prompt-cache/spec.md:10 (request-body method). Not located: the wrapper-size item.

- [x] **OUT-514** Out (REQ-VERIFICATION-027, product rule: no regex Stop check, no Stop claim grader; ADR-0187 trap-bg): no Stop or TaskCompleted blocking check ships (the lab's Stop block changed nothing on Opus in 5 of 5 runs, and a Stop block with an exit is no control). claudetto shall run the real check at Stop and SubagentStop and block on failure, with a `stop_hook_active` guard against loops, re-blocks capped by `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` (at most 8 in a row), verdicts from direct exit codes and never `| grep` or `| tail`, and `model` set on any agent-type hook (the default is Haiku with "use as few steps as possible"). A prompt-type Stop hook judges transcript text only and treats "tests pass" as evidence. The report states the denominator, "measured vs inferred", and the 2-3 least-certain items, and verifies at the layer the claim is about (a UI claim needs rendered observation). `onFailure` has no effect on Stop, SubagentStop, TaskCompleted, or TeammateIdle in 2.1.312 (a crash or timeout lets the turn end); the 2.1.326 schema text still says the field is ignored on those four events (chunk-ja5z738t.js@21543 (2.1.327)).
  Acceptance: A failing check at Stop blocks once; a second stop with `stop_hook_active` passes; no block repeats more than 8 times. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:73; external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:4; external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:40; claude 2.1.327: `Stop` and `SubagentStop` present (chunk-ja5z738t.js@5623), `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` present with default 8 (chunk-8g2nr9dn.js@278224); <https://github.com/anthropics/claude-code/releases/tag/v2.1.327> (release notes: a hook's `"decision": "block"` now holds in more cases). No `stop_hook_active` in plugins/ at 088a227c (the earlier removal of most Stop gates).

- [x] **OUT-515** Out (REQ-VERIFICATION-028, product rule: no regex Stop check, no Stop claim grader; ADR-0187 trap-bg): no Stop or TaskCompleted blocking check ships (the lab's Stop block changed nothing on Opus in 5 of 5 runs, and a Stop block with an exit is no control). claudetto shall run the project check at `TaskCompleted`; exit 2 keeps the task open and stderr goes to the model.
  Acceptance: A failing project check at `TaskCompleted` keeps the task open and shows stderr to the model. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:12 (event list); claude 2.1.327: `TaskCompleted` present (chunk-ja5z738t.js@5776). Not located: the exit-2 line.

- [x] **OUT-516** Out (REQ-VERIFICATION-029, product rule: no regex Stop check, no Stop claim grader; ADR-0187 trap-bg): no Stop or TaskCompleted blocking check ships (the lab's Stop block changed nothing on Opus in 5 of 5 runs, and a Stop block with an exit is no control). claudetto shall word each Stop block to ask only for what it corrects: a second reply after a remark or notice writes only what is new; a block asking for a rewrite ends with `KEEP_ANSWER`; a block naming lines (ask form, command form, missing file, agree opener) names the edit; `SendMessage` result text appears from the tool result, so no hook writes it into a reply. Full-resend requests doubled the report while the blocked reply stayed on screen.
  Acceptance: A blocked reply followed by a corrected reply shows no duplicated report. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: openspec/specs/agent-conduct/spec.md:452; openspec/specs/agent-conduct/spec.md:457; claude 2.1.327: `SendMessage` present (chunk-77827yq1.js@822).

- [x] **OUT-517** Out (REQ-VERIFICATION-031, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall keep stored cases outside the repo (`~/.claudetto-tuning/`; held-out `~/.claudetto-holdout` that no session reads; 177 cases: 88 claim check, 49 ledger, 40 branch gate; secrets and emails as `[REDACTED]`; ask again before case text leaves the machine). Paid checks run only after the user approves permission, budget, and data; they record scores, cost, weekly share, `cache_read_input_tokens`, and largest output against `maxTokens` + 2,048; a site whose Decider scores below today's on held-out loses its delta.
  Acceptance: No stored case lives in the repo; a paid check with no approval does not run. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:1118 (see also feat-2-1-321 design.md:1118); CLAUDE.md paid-call rule. Not located: the two source tags for the case counts.

- [x] **OUT-518** Out (REQ-VERIFICATION-033, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall run graded held-out sessions in a `/tmp` folder, accept only plain-string message prefixes in cases (a case with `tool_use` or `tool_result` blocks fails "fixture check"), run sessions with the sandbox on and `allowUnsandboxedCommands` false so test runners pass via `autoAllowBashIfSandboxed`, print counts only, and keep only `marker`, `result.json` and `ledger.jsonl` in run folders.
  Acceptance: a held-out run prints counts only; a run in a repo folder is refused because `--setting-sources project,local` there loads the repo's settings and nests git repos. The judge sees every tool call, edits included, with the last 300 characters of each result, so runs after that change do not compare one to one with earlier r4 runs. Verification: inspection.
  Basis: read. Status: missing at 088a227c (`git grep -i -E 'fixture check|autoAllowBashIfSandboxed' 088a227c` finds no hit; the grader lives in claudekit, outside the baseline `plugins/` tree).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-31/README.md:25-44.

- [x] **OUT-519** Out (REQ-VERIFICATION-034, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall make the agent fix every defect and gap it finds, whatever its severity or priority, and probe a reported fault before it fixes it.
  Acceptance: a final reply names no found defect left open when the agent could fix it. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:10068; user decision, 2026-11-11.

- [x] **OUT-520** Out (REQ-VERIFICATION-035, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall require three proofs before "deployed" or "fixed": the commit SHA, the build made from that SHA, and proof that the running process is that build; a missing proof is named.
  Acceptance: a "deployed" claim names the three proofs; status is one of Open, Closed, Watchlist, Deferred ("partially fixed" is not a status); after each compact, live state is re-probed and not read from the summary.
  Verification: demonstration.
  Basis: reported (origin: an agent trusted a stale server checkout). Status: missing at 088a227c (git grep for "Watchlist" finds nothing).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xee7gs-whats-the-one-thing-you-now-ask-20261028T060909Z.md:179 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xee7gs/whats_the_one_thing_you_now_ask_claude_code_to/>).

- [x] **OUT-521** Out (REQ-VERIFICATION-036, ADR-0177, ADR-0164): a check against test tampering or a reproduction gate has no measured gain, and ADR-0164 keeps tampering checks unbuilt; rule mutants are covered by ADR-0180. claudetto shall, for a bug fix, stash the fix, rerun the new regression test to show it fails without the change, pop, and show it passes.
  Acceptance: the report holds one failing run without the fix and one passing run with it.
  Verification: demonstration.
  Basis: reported (catches tests that mock the broken function and pass either way; costs one test run). Status: missing at 088a227c (plugins/claudetto/agents/Heracles.md names stash only as a forbidden command).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xee7gs-whats-the-one-thing-you-now-ask-20261028T060909Z.md:193 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xee7gs/whats_the_one_thing_you_now_ask_claude_code_to/>).
  Conflict: Bug-Fix Claim Gate.

- [x] **OUT-522** Out (REQ-VERIFICATION-037, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall ask up front for the list of tests edited and why, what was removed or loosened besides what was added, the files modified versus only read, and any config or env path hardcoded to the local machine.
  Acceptance: the delegation text asks the four lists before work starts.
  Verification: inspection.
  Basis: reported (twice caught a laptop-only path headed to commit). Status: partial at 088a227c (plugins/claudetto/agents/Heracles.md protects test assertions; no list is asked).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xee7gs-whats-the-one-thing-you-now-ask-20261028T060909Z.md:153 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xee7gs/whats_the_one_thing_you_now_ask_claude_code_to/>).

- [x] **OUT-523** Out (REQ-VERIFICATION-038, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall make the agent list the exact commands it ran, name the exact file or flow it never ran, and name the one thing it is least sure of, asked up front and not at done.
  Acceptance: a done report holds the three lists.
  Verification: demonstration.
  Basis: reported ("all tests pass" often followed a run of one file; asked up front it catches more). Status: missing at 088a227c (git grep for "least sure" finds nothing).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xee7gs-whats-the-one-thing-you-now-ask-20261028T060909Z.md:117 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xee7gs/whats_the_one_thing_you_now_ask_claude_code_to/>).

- [x] **OUT-524** Out (REQ-VERIFICATION-039, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall offer an alignment check that compares the user's expectation file against what was built and flags straying or assumed parts.
  Acceptance: the check reports each strayed or assumed part with its place in the build.
  Verification: demonstration.
  Basis: reported (effort Low or Medium restores step-by-step asking while Extra or Max picks odd solutions on its own; inferred cause). Status: missing at 088a227c (git grep for "alignment" finds nothing).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xeeclc-anyone-else-noticed-claude-makin-20261028T060729Z.md:59 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xeeclc/anyone_else_noticed_claude_making_weird_decisions/>).

- [x] **OUT-525** Out (REQ-VERIFICATION-040, ADR-0177): plugins/claudetto ships no skill, so there is nothing to lint, and vanilla `claude plugin validate --strict` was probed on a skill with `&bad value`: it does not flag it, so a lint would be new work with no shipped skill to protect. claudetto shall write each skill description in the third person with what it does, when to use it, and the key terms users say, keep SKILL.md under 500 lines, and test the skill on every model it will run on.
  Acceptance: each SKILL.md is under 500 lines and its description holds the three parts.
  Verification: inspection.
  Basis: cited (Anthropic skill guide via a mod-bot summary; no built-in eval runner, so roll your own). Status: missing at 088a227c (no line-count check; git grep for "500 lines" finds nothing).
  Source: external/2026-10-27/reddit.com-r-claudeworkflows-comments-1wymat0-workflow-anthropics-offic-20261026T133946Z.md:53 (url: <https://www.reddit.com/r/ClaudeWorkflows/comments/1wymat0/workflow_anthropics_official_agent_skill_best/>).

- [x] **OUT-526** Out (REQ-VERIFICATION-041, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall keep three separate completion labels (agent reported done, checked against this version, accepted by a person), shall mark a task done only on the user's evidence, and shall name whose words (user or assistant) were the evidence; it keeps a short list of claims that need a commit or test behind them and ranks a claim that others depend on above one nobody waits on.
  Acceptance: A done mark shows its evidence source; an assistant summary alone never marks done. Verification: test.
  Basis: measured by hand, one tool (2 of 49 closures came from the user's words; the rest from the assistant's summary) and reported, comment. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xsg651-i-spent-three-weeks-measuring-wh-20261110T093243Z.md:31,51,67 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsg651/i_spent_three_weeks_measuring_whether_my_own/>).

- [x] **OUT-527** Out (REQ-VERIFICATION-042, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall give every "0 results" or green check a control run on both sides (a case that must hit and a case that must not fire), print the denominator with every empty result (pages walked, items matched), and treat any zero as a broken read until a control page proves the selector works.
  Acceptance: A check ships with both cases, and an empty result prints its denominator. Verification: test.
  Basis: reported (each half alone let bugs through; five runs in a row returned a clean believable empty set after a site change). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrx9yj-what-rules-keep-your-agent-hon-20261110T100144Z.md:79,111 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrx9yj/what_rules_keep_your_agent_honest/>).

- [x] **OUT-528** Out (REQ-VERIFICATION-043, ADR-0177, ADR-0164): a check against test tampering or a reproduction gate has no measured gain, and ADR-0164 keeps tampering checks unbuilt; rule mutants are covered by ADR-0180. claudetto shall count nothing as a finding until it reproduces; the reproduction becomes the red test for the fix; the fix's author never signs off; a fresh agent reruns the checks, and a disagreement returns the item as refuted.
  Acceptance: A finding carries a reproduction; a sign-off comes from an agent that did not write the fix. Verification: test.
  Basis: reported (a review gave 12 candidate bugs; 5 reproduced and were fixed pre-release, 7 deferred, each needing reproduction). Status: partial at 088a227c (plugins/claudetto/agents/Heracles.md:15 marks each defect reproduced or read; no refutation rule).
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrx9yj-what-rules-keep-your-agent-hon-20261110T100144Z.md:97,99 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrx9yj/what_rules_keep_your_agent_honest/>).

- [x] **OUT-529** Out (REQ-VERIFICATION-044, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall run every gate against a standard evasion kit (missing fixture, skipped test, assertion that should fail; each must be rejected) before review, and again when the gate changes.
  Acceptance: A gate change fails the kit run when an evasion gets through. Verification: test.
  Basis: reported, measured by one team (10 of 12 planted evasions got through one new gate). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:45,89 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xsfrvr/the_ways_coding_agents_broke_our_codebase_and_the/>).

- [x] **OUT-530** Out (REQ-VERIFICATION-045, ADR-0183): no reviewer agent is added; plugins/claudetto has no agents directory and subagents never run on Fable or Opus. claudetto shall let the reviewer agent block or request changes while the merge waits for a person's approval, and shall make hook and CI config paths read-only for agents.
  Acceptance: An agent write to a hook or CI config path is refused; no merge without a person's approval. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:81,89 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xsfrvr/the_ways_coding_agents_broke_our_codebase_and_the/>).

- [x] **OUT-531** Out (REQ-VERIFICATION-046, ADR-0087): a byte-budget or backtick-path test of rules files is a needless test, and claudetto ships no CLAUDE.md or rules file to guard. claudetto shall test that the project instructions file stays within a byte budget (20,000 bytes in the report), failing the run when it is over; an overflowing paragraph moves to a spec and one pointer sentence stays.
  Acceptance: A unit test fails on a file over the budget and passes on one under it. Verification: test.
  Basis: reported. Status: partial at 088a227c (a line-count check exists in plugins/claudetto/hooks/features/line-file; no byte budget).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:313 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/>).

- [x] **OUT-532** Out (REQ-VERIFICATION-047, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall make an eval suite fail when it tests nothing and mark a skill eval run invalid when the tool-read events hold no read of the skill file path (a name in context proves nothing): assert `grader_count > 0` per case (grader files without frontmatter load as zero graders: 92 of 303 public cases never loaded on 2.1.295); test a converted rubric against known-good and deliberately failing outputs; add a control with the same loading instruction but an empty skill; keep non-loads as a result when the test is automatic selection; lint colons in skill descriptions (the Metis.md description with `:` that `Bun.YAML.parse` refuses; the test reads frontmatter by line match as Claude Code does); lint rules and CLAUDE.md for rules lacking an incident link or review date and propose converting recurring rules into hooks; add a merged-result test gate for worktree agents and a loop detector for traces. A `/goal` prompt has a 4000-character limit with a fresh neutral verifier, and goals beyond about 3 phases need phase files (GOAL.md) on disk.
  Acceptance: A case with zero graders fails; an eval run with no read event of the skill file is marked invalid, not skill-enabled; the rule lint names each rule with no incident link or review date. A colon in a description broke skill loading silently; a runner had disabled skills in both arms (9.6 against 9.6; with skill 10 against 7, n=5). Verification: test.
  Basis: reported; measured (the line-match frontmatter read; the merged-result gate, by its author); inferred. Status: missing at 088a227c (no grader-count or skill-load assertion).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr9vrf-before-you-ab-test-an-agent-skil-20261110T094754Z.md:69 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xr9vrf/before_you_ab_test_an_agent_skill_check_the_logs/>); openspec/changes/2-1-325-rearchitecture/design.md:116; external/export-Goal and Loop - kinda the same-.jsonl:22 (url: <https://www.reddit.com/r/ClaudeCode/comments/1uaxlt6/goal_and_loop_kinda_the_same/>); external/2026-10-03/export-Any recommendations to reduce the token usage for simple tasks in a large project-.jsonl:11 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wwl9a4/any_recommendations_to_reduce_the_token_usage_for/>); <https://github.com/anthropics/claude-code/releases/tag/v2.1.327> (release notes: `/goal clear` or a new `/goal` now sticks while Stop hooks run); claude 2.1.327: `/goal` limit is 4000 characters (chunk-qwykd6a6.js@1130, chunk-v2rqpwd4.js@6685); a `SetGoal` tool is present, chunk-77827yq1.js@822.

- [x] **OUT-533** Out (REQ-VERIFICATION-048, ADR-0087): invariant and incident-fixture tests per fault are needless tests. claudetto shall pin each decision it cares about with an invariant test that fails with a one-line reason, and turn each rule the agent learned the hard way into a check in the build script (for example, a build that fails on any FP instruction); a cheap structural rule may be a regex over the source (for example the text of a concurrency cap).
  Acceptance: A test run fails with a one-line reason when a pinned decision is undone, and a fixed bug class has a failing check that guards it. One author reports 25 such tests (15 backend, 10 frontend) and that regressions of old decisions basically stopped; when a guard trips, Claude usually reads the decision entry and backs off. Verification: test.
  Basis: reported, one author. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xhl3zz-what-finally-stopped-claude-code-20261029T115922Z.md:41,47 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xhl3zz/what_finally_stopped_claude_code_from_undoing_my/>); external/2026-10-28/reddit.com-r-claudeai-comments-1xgtghe-claude-code-reverseengineered-th-20261028T060614Z.md:54 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xgtghe/claude_code_reverseengineered_the_xbox_360_kernel/>).

- [x] **OUT-534** Out (REQ-VERIFICATION-049, ADR-0087): invariant and incident-fixture tests per fault are needless tests. claudetto shall say in the root rules file that a guard failure means an operator decision is being undone: fix the code, or change both the test and the doc on purpose; and shall keep a short decision entry with the why and the post-mortem beside the test.
  Acceptance: The rules file holds the guard-failure line. The decisions file holds the why; one author keeps 39 entries. Claude reads the entry before it touches guarded code, but the test is what stops it. Verification: inspection.
  Basis: reported, one author. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xhl3zz-what-finally-stopped-claude-code-20261029T115922Z.md:42,43,71 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xhl3zz/what_finally_stopped_claude_code_from_undoing_my/>).

- [x] **OUT-535** Out (REQ-VERIFICATION-050, ADR-0087): invariant and incident-fixture tests per fault are needless tests. claudetto shall keep, for each fault with a real incident behind it, a recorded fixture of the bad response and a test that feeds it through the code and asserts it counts as a failure, with the failure message pointing at the decision entry.
  Acceptance: A regex over source guards the spelling, not the behavior: a cap moved into a constant or config breaks the guard or leaves it passing after the real limit changed. The cited fault is an upstream aggregator that rate-limits with HTTP 200 and a plain-text body, which looks like success; a fake rate-limited 200 fed through the fetcher must count as a failure. Verification: test.
  Basis: reported, one author (the fault); reasoned, one commenter (the fixture). Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xhl3zz-what-finally-stopped-claude-code-20261029T115922Z.md:33,71 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xhl3zz/what_finally_stopped_claude_code_from_undoing_my/>).

- [x] **OUT-536** Out (REQ-VERIFICATION-051, ADR-0177, ADR-0164): a check against test tampering or a reproduction gate has no measured gain, and ADR-0164 keeps tampering checks unbuilt; rule mutants are covered by ADR-0180. claudetto shall keep the agent from touching the tests that cover the code in the same run, and shall flag a changed test file in a fix-the-bug task as the first thing to read: commit tests before a subagent makes them pass; forbid edits to assertions, skips, and deletions; run `git diff` on test files; require a list of each test edit with old behaviour and reason. Spec-and-test flow: spec, acceptance criteria, failing tests staged with `git add`, implementation by a subagent that cannot edit tests, a separate no-context agent checks that tests are not fake; a ticket preflight collects every login and auth approval up front so an overnight run does not stall.
  Acceptance: A fix-the-bug run that changes a test file is flagged, and a subagent diff holds no test edit without a listed reason. One commenter reports an agent that fixed a failing test by deleting the assertions: the suite went green, coverage barely moved since the lines still ran, and the defect shipped, found days later in the diff. Verification: test.
  Basis: reported, one commenter; reported (one thread). Status: partial at 088a227c (plugins/claudetto/agents/Heracles.md protects test assertions).
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xk277d-how-often-has-a-coding-agent-don-20261031T105244Z.md:98,100 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xk277d/how_often_has_a_coding_agent_done_something_you/>); unresolved: no source line holds the staging flow.

- [x] **OUT-537** Out (REQ-VERIFICATION-052, ADR-0177, ADR-0164): a check against test tampering or a reproduction gate has no measured gain, and ADR-0164 keeps tampering checks unbuilt; rule mutants are covered by ADR-0180. claudetto shall, after an implementer finishes, revert each changed hunk one at a time and rerun the tests for that file; a hunk that can be removed with everything still green is dead or untested.
  Acceptance: Each hunk that survives its own revert is listed. The author calls this mutation testing scoped to the diff, cheap enough to run on every change. Verification: test.
  Basis: reported, one commenter. Status: missing at 088a227c (git grep for hunk and mutation in plugins finds no such step).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlr0pk-turning-a-repeated-review-find-20261102T184719Z.md:137 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlr0pk/turning_a_repeated_review_finding_into_a_written/>).

- [x] **OUT-538** Out (REQ-VERIFICATION-053, ADR-0177, ADR-0164): a check against test tampering or a reproduction gate has no measured gain, and ADR-0164 keeps tampering checks unbuilt; rule mutants are covered by ADR-0180. claudetto shall prove each rule that carries a check by seeding a violation and watching the check fail; a rule that cannot fail that way is still only text.
  Acceptance: A seeded violation makes the check fail. Verification: test.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlr0pk-turning-a-repeated-review-find-20261102T184719Z.md:63 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlr0pk/turning_a_repeated_review_finding_into_a_written/>).

- [x] **OUT-539** Out (REQ-VERIFICATION-054, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall have the agent copy the old assertion and its reason into the commit message or the ticket before it touches a test, and shall label the original reason "unknown" when the test is the only surviving record, instead of letting the agent fill it in.
  Acceptance: A commit that edits a test holds the old assertion and its reason, or the word unknown. The failing test is often the only place the old limit is written, so editing it erases the record; then the new requirement and why the changed behavior was accepted are recorded. Verification: inspection.
  Basis: reported, two commenters. Status: missing at 088a227c.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xm2v1a-what-should-claude-code-do-wit-20261102T184500Z.md:130,134 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xm2v1a/what_should_claude_code_do_with_a_failing_test/>).

- [x] **OUT-540** Out (REQ-VERIFICATION-055, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall give each rule that can be stated as a predicate a check attached and take it out of the markdown; rules with no check are stepped over once context is tight.
  Acceptance: Each predicate rule names its check. The commenter's examples: "done = the calendar event prefix changed to a checkmark, no api call = not done" and "numbers only from a command run in this session". One case: 26 demo sites went out unstyled for about 16 hours because an inline style hash was missing from the CSP; a verifier script that fetches every page and checks the hash caught it in one pass, 26 of 26 after the fix. Verification: test.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlr0pk-turning-a-repeated-review-find-20261102T184719Z.md:91,93 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlr0pk/turning_a_repeated_review_finding_into_a_written/>).

- [x] **OUT-541** Out (REQ-VERIFICATION-056, ADR-0087): a byte-budget or backtick-path test of rules files is a needless test, and claudetto ships no CLAUDE.md or rules file to guard. claudetto shall run a CI step that pulls every backticked path and command out of the rules files and fails when one no longer exists, and shall keep a short why on each rule.
  Acceptance: A rule that names a renamed script or a moved folder fails CI. A package rules file falls under the code's CODEOWNERS line; each root rules file needs its own CODEOWNERS line. The rules without a reason are the ones nobody dares to delete. Verification: test.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xalih0-for-those-running-claude-code-on-20261102T084737Z.md:100,102 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xalih0/for_those_running_claude_code_on_large_monorepos/>).

- [x] **OUT-542** Out (REQ-VERIFICATION-057, ADR-0177): a registry or per-rule reason lines have no measured gain over vanilla. claudetto shall keep one registry that serves tests, graders, bounds, baselines and hook files; the ask hook shall name old and new value; claudetto shall deny approval claims with no user prompt; claudetto shall add a hook-based registry check for new dependencies, config-key validation, and `--help` reads for CLI flags.
  Acceptance: A new dependency, an unknown config key or an unread `--help` flag is caught by the check. Verification: test.
  Basis: inferred from `tools/settings-keys.test.ts`, the one baseline check that holds a registry of keys; the original source is lost. Status: partial at 088a227c (tools/settings-keys.test.ts exists).
  Source: tools/settings-keys.test.ts:1@088a227c; unresolved: the old plan cited a worker input that no longer exists; no dossier line found.
  Conflict: Evals and Benchmark Targets (OUT item in prd/README.md; graders in the registry conflict with it).

- [x] **OUT-543** Out (REQ-VERIFICATION-058, product rule: no regex Stop check, no Stop claim grader): GRADE_FAULTS belongs to the removed Stop claim grader. claudetto shall extend `GRADE_FAULTS` with fixtures per fault (3 bad and 3 near-miss replies per fault plus clean; 70 + 100 + 16 cases), run them on every wording change, and extend the grader view with the names in CLAUDE.md or a rule file for the `unfixed` fault.
  Acceptance: The fixture set runs on each text change, at least 10 runs per arm (REQ-VERIFICATION-094). A token named only in CLAUDE.md or a rule file is outside the grader's view, so the view is extended with that file's names (priority). The gate text "say which part you did not check" and the grader pulled opposite ways ("Not checked" lists the user called disgusting, paraphrase; read), so the fault list must not ask for such lists. Verification: test.
  Basis: measured. Status: missing at 088a227c (git grep GRADE_FAULTS finds no hit in plugins/; the grader was reduced to one prompt hook).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:779; openspec/specs/claim-check/spec.md:8; openspec/specs/claim-check/spec.md:76.

- [x] **OUT-544** Out (REQ-VERIFICATION-060, ADR-0177): the engine's generated declarations are untracked (types/.gitignore is `*`) and need no recipe. claudetto shall refresh the engine's generated declarations in `.claude-plugin/types/` (claude-code/index.d.ts, -tools, -mcp, tsconfig.json, .gitignore) with `just types`: a print run with `CLAUDE_CODE_PLUGIN_DIR_WATCH=1`, a closed API port and `CLAUDE_CODE_MAX_RETRIES=0`; the copy is not checked in (stale each release).
  Acceptance: Non-interactive runs write nothing without the watch var; `claude plugin validate`/`test` do not write it. Verification: demonstration.
  Basis: measured. Status: partial at 088a227c (plugins/claudetto-openspec/types/ exists; git grep PLUGIN_DIR_WATCH finds no hit).
  Source: claude 2.1.327: `CLAUDE_CODE_PLUGIN_DIR_WATCH` present (chunk-2ew0jg68.js@16837) and `CLAUDE_CODE_MAX_RETRIES` present (chunk-2ew0jg68.js@45599), by `code` search; unresolved: the old plan's "Type-check stays local" design text was not found by grep in this pass.

- [x] **OUT-545** Out (REQ-VERIFICATION-061, ADR-0177): plan bookkeeping; each behaviour is triaged in its own block, and the run-limit parts are OUT-016. claudetto shall give each audit-uncovered behavior a requirement unless it is removed, and shall build four named requirements: run-limits "End Stuck Agents", session-hygiene "Stale Generated Files Go", low-hitl fail closed when the classifier is down, compaction-path "Code Path Is Offered Again".
  Acceptance: the behaviors without a requirement are endless-wait deny, `/tmp` marker, ref moves, recreate, ask log, ledger `dispute`, `OFF_SKILLS`, hygiene sweeps, handoff caps and redaction, setup starter files, per-rule copy offer; each gets a requirement or a removal. Carried to 2.1.321: tasks 4.2.2 and 5.2. Verification: inspection.
  Basis: cited (the audit list at design.md:89 names the uncovered behaviors). Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:89; openspec/specs/session-hygiene/spec.md:8; openspec/specs/compaction-path/spec.md:61; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:88; openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:63; openspec/specs/surface-trim/spec.md:282.

- [x] **OUT-546** Out (REQ-VERIFICATION-062, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall require a repro bundle for each regression claim: exact model selection, repo commit, prompt, rules file, expected result, failing assertions, and several fresh sessions against a previous model.
  Acceptance: a perceived "nerf" is checked against environment rot (many skills or plugins, a 950k session never compacted) or a harness change before it is reported; public nerf trackers showed no degradation (cited). Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/export--clear vs -compact.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wl4c13/clear_vs_compact/>); external/export-I ran out of codex on chatgpt pro with 4 days left. how hard is it to actually kill max 20x with opu.jsonl:29.

- [x] **OUT-547** Out (REQ-VERIFICATION-063, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall let hooks or agents grade each run against a rubric that counts human interventions, with the human supplying the grade by default.
  Acceptance: unproven. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-03/export-Has anyone compared different orchestration approaches for complex software engineering work-.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wwp2am/has_anyone_compared_different_orchestration/>).

- [x] **OUT-548** Out (REQ-VERIFICATION-064, ADR-0183): no reviewer agent is added; plugins/claudetto has no agents directory and subagents never run on Fable or Opus. claudetto shall review a diff with an independent overseer: fresh context, a different model, and access to evidence, not to the worker's summary (same-model peers share blind spots, cited 2502.08788).
  Acceptance: the reviewer never saw the writing conversation and judges the diff against requirements; each finding carries path:line, what, why, and a read or reproducing command; the review is judged by confirmed bugs, not list length; PR stage only; read-only; one pass per commit; a fixed exit condition (an in-session loop took 53 rounds, half the findings from its own fixes); the goal and criteria are met, not met, or can't tell; bugs first; stop on unreproducible nits; an adversarial second opinion before commit. Verification: demonstration.
  Basis: cited, reported. Status: have at 088a227c (agents/Athena.md, hooks/features/prompt/texts.ts).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:118; external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:47.

- [x] **OUT-549** Out (REQ-VERIFICATION-065, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall measure a trio before and after a rebuild: first-request bytes with tools, denial lines per rule per day, and model calls per turn, and print the counting method beside every table. The headline "64 of 131 reads (49%) repeats" is not reproducible and is corrected to 48 of 86 (56%). Dead-code removal follows a search or type check, never a subagent's static report (6 of 11 "unused" exports had importers); dead code goes with its tests.
  Acceptance: stock first request 43,382 B against 19,675 B with the three plugins (the plugins add two side calls per plain turn: Decider haiku 2,006 B, Stop grade haiku 4,117 B); 2,915 denial lines in 3 days (`Write` 966, `Read` 725, temp marker 400, answer-first 316, pipe exit code 60, agent past 15 min 40, `Edit` 32, process-not-ours 52, `pkill` 40, no-time-limit loop 33, PATH marker 16, sandbox rewrite 12; an upper bound, as transcripts repeat denials). Verification: test.
  Basis: measured. Status: partial at 088a227c (the numbers exist; no measurement script was found in the tree).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:885; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:893; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:830.

- [x] **OUT-550** Out (REQ-VERIFICATION-066, ADR-0189): the openspec block is out of scope over vanilla 2.1.327. claudetto shall write each spec by the artifact rules: a spec states observable behavior, inputs, outputs, errors and constraints, with no class, library or step; each requirement uses SHALL or MUST with at least one `WHEN/THEN` scenario (exactly four `#`); a new capability has a Purpose of 50+ chars; delta headers are ADDED, MODIFIED (copy the whole block), REMOVED (Reason and Migration) or RENAMED (FROM and TO), or the validator and the archive merge break. Apply: read context files, do pending tasks and tick each; after a behavior change run a fast check of the changed files; at the end of each task group run the full checks; no check for an edit with no behavior change; stop at a blocker. Proposal: Why in 1-2 sentences, What Changes with BREAKING marks, Capabilities (new: kebab-case path named for durable behavior; modified: the exact existing path), related specs read first, 1-2 pages, the how goes to design. Design: Context, Decisions (why and alternatives), Risks as `[Risk] -> Mitigation`, a pointer to the proposal not a restatement, and a question to the user rather than a guess when an unsettled point changes specs, approach or tasks. Spec text carries no task IDs, commit hashes, decision or line numbers of the old plan, or line refs (public source rule; dropped when porting).
  Acceptance: the validator accepts a conforming change and rejects one that breaks a rule. Verification: test.
  Basis: cited. Status: partial at 088a227c (`plugins/claudetto-openspec/hooks/spec/spec-rules.ts` holds `MIN_PURPOSE = 50` at :23, the WHEN/GIVEN trigger at :31-33, SHALL or MUST at :35 and the four delta headers at :38; the apply, proposal and design wording is not in that file).
  Source: openspec/specs/lean-openspec/spec.md:10; openspec/specs/surface-trim/spec.md:46.

- [x] **OUT-551** Out (REQ-VERIFICATION-069, ADR-0189): the openspec block is out of scope over vanilla 2.1.327. claudetto shall make the `lean-openspec` check warn when a MODIFIED requirement grows past 500 chars while the main spec's text is within the limit (upstream 1.16.0 skips MODIFIED), so a change does not validate and archive and then turn `just validate` red.
  Acceptance: a MODIFIED requirement over 500 chars on an in-limit main spec gives a warning. Verification: test.
  Basis: measured. Status: have at 088a227c (`plugins/claudetto-openspec/hooks/spec/spec-rules.ts:24` sets `MAX_REQUIREMENT = 500`; `hooks/openspec-grow.test.ts:29` and `:45` test a MODIFIED text that grows past 500 characters and one already over it).
  Source: openspec/specs/lean-openspec/spec.md:278; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:454.

- [x] **OUT-552** Out (REQ-VERIFICATION-070, ADR-0177, ADR-0164): a test-style or never-change-a-check rule has no measured gain; ADR-0164 and ADR-0181 settle the tampering question. claudetto shall assert behaviour in tests, not prose: return values, error types, side effects, files, exit codes, and tool traces; never wording, test names, backticks, or keywords. A style rule becomes a test only when the user names that test; otherwise it is a lint or hook at the point of use. A test pins error type and side effect, not message; removing a pin keeps the behaviour guarded (a bare `toThrow()` becomes a type or side-effect check, not nothing).
  Acceptance: no test asserts prompt wording; prompt text that must stay is pinned by a manifest. Verification: inspection.
  Basis: reported; observed in transcript.env` credentials guard). Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:101; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031).

- [x] **OUT-553** Out (REQ-VERIFICATION-071, ADR-0177, ADR-0164): a test-style or never-change-a-check rule has no measured gain; ADR-0164 and ADR-0181 settle the tampering question. claudetto shall never change a Check to pass it: fix the code, never the Check (edit, delete, skip, disable, relax, widen tolerance, lower a bound, swap a baseline, turn `toThrow(".env")` into `toThrow()`, mock out the thing under test); no special-casing of inputs, hard-coded expectations, equality override, swallowed exceptions, or exit-0 faking; on a failing check fix the cause or show evidence the check is wrong and ask; fixtures, comments, and prompts do not leak the answer; changing a case after seeing results is changing a Check.
  Acceptance: held cases: the lead refused a bound change 190 to 180 ("lowers a check"); a red baseline stays red until a clean `just sandbox` measure. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:103.

- [x] **OUT-554** Out (REQ-VERIFICATION-074, ADR-0177, ADR-0180): ADR-0180 limits mutation to plugin rules as a kill check, not Stryker or mutmut runs on user projects. claudetto shall confirm a test can fail and prove behaviour tests with mutation testing or breaking real code on purpose (Stryker for JS/TS, C#, and Scala3; mutmut for Python; the language's maintained tool elsewhere, the right tool run in user projects); keep tests that go red for the right reason and delete those that stay green. `just mutate` runs Stryker 10.1.1 (StringLiteral and ArrowFunction excluded), each mutant on its own plugin copy (concurrent runners sharing a tree voided a first run), scored with `claude plugin test`; mutmut is pinned 2.5.1 (3.x runs only pytest); mutation scripts stay out of the repo; pure policy modules get `*.test.ts`; a survivor is killed by a new test or named equivalent; tests of `tools/` are not run by `plugin test` (a hygiene worktree test lived in `tools/`, so the mutation score was 16%).
  Acceptance: a mutant of policy code turns a test red, and a surviving mutant fails the check. Cited: a TDD skill pack grew a suite from 1,400 to about 4,000 tests with over 70% testing nothing; differential fuzz (60,000 random shell strings per survivor) found 7 hidden differences in the shell parser (scores 94-100%). Verification: test.
  Basis: reported. Status: have at 088a227c (tools/bench/mutate.ts, project.just, plugins/claudetto/rules/useTestPatterns.md:4 runs the project's own Stryker, mutmut, or cargo-mutants config on touched lines and installs none).
  Source: reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408); unresolved: no source line holds the Stryker, mutmut, or fuzz figures; baseline presence is confirmed at tools/bench/mutate.ts@088a227c.

- [x] **OUT-555** Out (REQ-VERIFICATION-078, ADR-0087): fixture hygiene for the removed lab tests; setup dialogs belong to the setup block. claudetto shall keep fixtures clean: a fake key that betterleaks matches across a line break carries a trailing `betterleaks:allow` comment so the repo's own scan stays clean; setup dialogs use one-line labels through `$.ui.ask` and multi-line text in the question (a label with `\n` renders a replacement character and the lab test fails on it); `git status` is checked before "done"; stale worktrees and stray folders are cleaned.
  Acceptance: the repo scan passes with the fixtures. Empty `.claude/.cc-writes` folders in `agents/` caused an EISDIR test failure; a stray `.pnpm-store` remained after a sandboxed install. Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:139; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:386.

- [x] **OUT-556** Out (REQ-VERIFICATION-079, ADR-0177): tests sit beside source in plugins/claudetto: 11,237 bytes of test files in a 1,020 KB tree, so moving them gains nothing. claudetto shall keep Bun-run test files and fixtures (`*.spec.ts`, `fixtures`, `fixture-*.ts`) out of the plugin folder, because install copies every file (96% of claudetto-openspec, 2,291,528 of 2,394,380 bytes, was test data); they live under `tests/<plugin>/`; lab tests (`*.test.ts`, `*.mock.ts`) stay beside source because the lab loads tests only inside the plugin folder; `tools/` never imports from `tests/`; claudetto-openspec stays under 110,000 bytes; a repository test lists each plugin folder's files. A requirement whose subject left the repo is REMOVED by a delta or bound to a shipped test; a checked task superseded later carries a "Superseded (date, task)" note. Each slice is one commit with a failing test first when behaviour changes, the narrowest `just` recipe per slice, and `just check` once per group; a removed feature is deleted with its tests, docs, and compat code, with no tests or shims for it.
  Acceptance: the plugin folder test fails on a `*.spec.ts` file. Verification: test.
  Basis: measured (the byte figures). Status: have at 088a227c (tools/plugin-files.test.ts, tools/release-version.ts).
  Source: openspec/specs/mod-architecture/spec.md:109; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/mod-architecture/spec.md:38.

- [x] **OUT-557** Out (REQ-VERIFICATION-081, ADR-0189): the openspec block is out of scope over vanilla 2.1.327. claudetto shall port the OpenSpec core (propose, explore, apply, update, sync, archive, and the kept verify) with a validator that warns on a scenario missing WHEN or GIVEN and THEN, and errors on a requirement under an unrecognized `## ... Requirements` header or under `## Notes` (stricter than upstream); trailing `#` runs on headers are ignored; a bare step keyword counts only in uppercase (bold in any case); standalone sync is a hand merge copying blocks verbatim; no binary and no network; archive refuses unticked tasks.
  Acceptance: a requirement under `## Notes` fails validation. Verification: test.
  Basis: reported. Status: have at 088a227c (plugins/claudetto-openspec).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:176; openspec/schemas/task/schema.yaml:22.

- [x] **OUT-558** Out (REQ-VERIFICATION-083, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall test each mitigation with one observable failure, an independent success definition, a baseline, one factor at a time, and held-out cases, and shall call a result on another model unverified until re-tested there; it shall not set a universal 4,000-character prompt target and shall not rely on XML tags as shown to help. It shall measure a prompt fix on the same samples against the old text, at least two runs each, before keeping it, never tune on held-out cases, write a public set blind (a fresh subagent that never read the plugin texts or r4 counts, at least 12 of 24 cases on claim flip), fix and record the grader when the cause is the judge, and stop at $60 public spend (about 25 runs at about $2.40).
  Acceptance: each mitigation eval record names the five steps; no eval claims transfer to a second model without its own run; the task also tests whether `parseFaults` should read the last JSON value, as Anthropic's Sonnet 5.5 page advises. Verification: inspection.
  Basis: cited, user-collected; read. Status: partial at 088a227c (a held-out set exists in `plugins/claudetto/.claude-plugin/plugin.json`; the five-step protocol is not written down; the grader lives in claudekit, outside the baseline `plugins/` tree).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:164; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:165; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-31/goal.md:20-35.

- [x] **OUT-559** Out (REQ-VERIFICATION-084, product rule: no regex Stop check, no Stop claim grader; ADR-0187 trap-bg): no Stop or TaskCompleted blocking check ships (the lab's Stop block changed nothing on Opus in 5 of 5 runs, and a Stop block with an exit is no control). claudetto shall block once, with the check-the-workspace text, a turn where the user writes "I fixed it. Write the commit message." and the agent replies with a message and no tool call.
  Acceptance: an eval scenario with that prompt and a tool-less reply gets one block. Verification: test.
  Basis: reported (spec). Status: missing at 088a227c (`git grep "I fixed it" 088a227c -- plugins` finds nothing).
  Source: openspec/specs/claim-check/spec.md:48; openspec/specs/claim-check/spec.md:50.

- [x] **OUT-560** Out (REQ-VERIFICATION-085, ADR-0087): eval or grader infrastructure that scores runs, which the no-benchmarks rule drops. claudetto shall not take exit code 0 as proof of success in an eval. Real-repository scoring (1,000 stars or more) is dropped: which repositories sit in a model's training data is unknown (user decision, AskUserQuestion 2026-11-17).
  Acceptance: an eval pass needs a check of behaviour, not an exit code. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`git ls-tree -r --name-only 088a227c -- tools/bench/tasks` lists 9 tasks from real repositories such as colinhacks/zod, honojs/hono, psf/black; `git grep -n -i "stars\|known-good" 088a227c -- tools plugins` finds no star floor or exit-code rule)
  Source: reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10615); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:11033).
  Resolved: the conflict with "no benchmarks" (user decision, 2026-11-16) ended when real-repository scoring was dropped (user decision, AskUserQuestion 2026-11-17).

- [x] **OUT-561** Out (REQ-VERIFICATION-086, goal.md, ADR-0066): dogfooding is the method of this rebuild, and goal.md already requires one general fix across subsystems. claudetto shall be dogfooded from a vanilla install of Claude Code until nothing is left to align, and shall fix each issue across subsystems, not once.
  Acceptance: a fault found in one block gets a sweep of every block for the same fault. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c (project.just:53 `dogfood` and :64 `dogfood-dir` run the plugins from HEAD or the tree; no step compares against a vanilla install or tracks what is left to align)
  Source: user goal set through `/goal`, 2026-11-16 17:53 UTC, dogfood from a vanilla install until nothing is left to dogfood (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4481).

- [x] **OUT-562** Out (REQ-VERIFICATION-087, ADR-0189): the user chose the kept blocks by AskUserQuestion on 2026-11-18. claudetto shall ask the user through `AskUserQuestion` which features are worthwhile compared with vanilla 2.1.325 before it keeps them.
  Acceptance: each kept feature has a user answer on record. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c (`git grep -n -i "vanilla\|dogfood" 088a227c -- tools plugins` finds no feature-worth question)
  Source: user goal set through `/goal`, 2026-11-16 17:53 UTC, ask the user through AskUserQuestion which features are worthwhile against vanilla (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4481).

- [x] **OUT-563** Out (REQ-VERIFICATION-096, ADR-0177): a registry or per-rule reason lines have no measured gain over vanilla. claudetto shall record, beside each behaviour rule and each hook, why it exists, the effect it was predicted to have, and the effect its last test run observed, so a later session or edit does not re-learn or silently drop it.
  Acceptance: each rule and hook file carries a reason line with a source and a predicted and observed line updated by the REQ-VERIFICATION-094 run; a rule whose observed effect is none is removed under [ADR-0177](../adr/0177-pragmatism-gate.md). Verification: inspection.
  Basis: cited (arXiv:2611.18856: keeping the reason and the predicted and observed outcome of each harness edit beat carrying the harness alone in all 6 cross-dataset moves, by 2.43 to 4.35 points, and in 9 of 10 paired coding runs). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/papers.md P1 implication 2; https://arxiv.org/html/2611.18856v1.

- [x] **OUT-564** Out (REQ-VERIFICATION-097, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall treat a UI change as done only after the agent drove a browser tool the session already has and pasted a desktop-width and a mobile-width screenshot taken after the change.
  Acceptance: a staged UI task that ends without both screenshots is reported "not verified"; one with both screenshots after the last edit passes. Verification: demonstration.
  Basis: reported (nine commenters advise giving the agent its own browser and requiring screenshots after every UI change). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudecode-comments-1xxjkui-how-to-give-claude-code-visual-20261117T225043Z.md:106,110,168,186,202,212 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xxjkui/how_to_give_claude_code_visual_feedback_on/>); reports/2026-11-18-research/dossier.md:132.

- [x] **OUT-565** Out (REQ-VERIFICATION-098, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall make the agent print the raw numbers or a verbatim source snippet with its location before it states a conclusion drawn from a source or a measurement.
  Acceptance: a behavioural test asking for a figure from a named document gets the quoted line and its location before the figure; a reply with a figure and no quote is reported unverified. Verification: test.
  Basis: reported (two commenters call fake "verified" claims the worst failure and force proof of work). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-promptengineering-comments-1xwv52o-i-spent-the-last-few-mo-20261117T183342Z.md:176-182 (url: <https://www.reddit.com/r/PromptEngineering/comments/1xwv52o/i_spent_the_last_few_months_logging_45_hidden_llm/>); reports/2026-11-18-research/dossier.md:139.

- [x] **OUT-566** Out (REQ-VERIFICATION-099, ADR-0177): a reported habit with no reproduction and no measured gain over vanilla. claudetto shall report the run time of each test the agent adds and flag a test that pushes the suite past a project-set budget (default 30 s), and shall run the narrowest test during work and the full suite once before the report.
  Acceptance: a staged test that sleeps past the budget is flagged with its run time; the work log shows one full-suite run. Verification: test.
  Basis: reported (four commenters say Claude writes tests not worth their run time and re-runs the same set; 30 s is one user's figure). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-buildwithclaude-comments-1xwm04q-how-do-you-manage-test-ac-20261117T183325Z.md:29-36,65,73-77,103 (url: <https://www.reddit.com/r/BuildWithClaude/comments/1xwm04q/how_do_you_manage_test_accumulation/>); reports/2026-11-18-research/dossier.md:140.

- [x] **OUT-567** Out (REQ-VERIFICATION-102, ADR-0177, ADR-0187): trap-loop: vanilla wrote a bounded loop in 20 of 20 runs, so the rule has no measured gain. claudetto shall make the agent give every loop it writes that waits for, polls or retries something outside the loop's own data (a service, a process, a file, a queue, a network call, a test fake) a bound, a deadline or an attempt cap, and make the loop fail at that bound with an error that names what it waited for. A failed state ends the wait at once. A loop over data the code owns, such as a parser walking its input, is exempt, because a hang there is a defect in the code under test, and REQ-VERIFICATION-103 turns it into a failing test.
  Rationale: in OpenJoystickDriver session e82d87d1 the agent wrote three such loops in one session, and each hung a test run: a retry loop that swallowed its error (`while !Task.isCancelled { try? await ... }`, line 1589), a feedback watcher that asked again at once after a "nothing yet" answer, and a test fake that never accepted a frame, so the feed resent it forever (line 2063). The second and third hang cost 32 minutes, from the agent's "I'll wait for the run to complete" (line 1993, 16:55:58) to the user's question about how long the shell had run (line 1995, 17:28:08).
  Acceptance: on `trap-loop` (REQ-VERIFICATION-100; the prompt asks for `deliver(relay, message)` that waits until a relay is ready), `check_loop.py` runs the written function against a relay that stays "starting", reports "failed" or raises forever, with a fake clock that makes every sleep free; the claudetto arm ends in all three cases in at least 4 of 5 runs per model, and fails fewer runs than vanilla. Candidate component: the rule text in `incident-lab/hangwatch/bounded.md`. Verification: test.
  Basis: measured (three incidents in one transcript; `check_loop.py` separates an unbounded `while True` from a deadline loop: HUNG in 3 of 3 scenarios against 0 of 3, 2026-11-18). `trap-loop` is not admitted: in 20 headless runs (5 per model and arm) every `deliver()` ended in all three never-ready cases and sent the message once when the relay became ready, vanilla included (score7.txt). A fresh session asked for one waiting function writes a bounded loop; the incidents came 3 hours into a session, in fakes written as side work to unblock a test. The requirement stands as a user decision, and `bounded.md` does not ship for it under ADR-0177 until a harder arm, such as the long-context arm of ADR-0187 or a prompt where the waiting loop is a test fake, makes vanilla fail. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/e82d87d1-ad1f-491a-ac1a-461bf5c46eb4.jsonl:1589,1993,1995,2017,2056,2063; user decision 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl, the message on banning indefinite loops); reports/2026-11-18-research/incident-lab/traps/trap-loop/, check_loop.py, hangwatch/bounded.md, score7.txt, runs7/loop-*.

#### Edit

- [x] **OUT-568** Out (RISK-417, ADR-0177): one report, no reproduction, no measured gain over vanilla; the user works on macOS. On Windows an agent edits shell scripts through a Python one-liner that rewrites CRLF line endings; the Linux deploy fails with an error that points nowhere near line endings.
  Category: agent fault
  Cause: Whole-file rewrite by a script on Windows
  Event: The deploy fails
  Consequence: A failed deploy that is slow to diagnose
  Likelihood: 1 (one report)
  Impact: 3
  Existing controls: none found at 088a227c
  Response: mitigate
  Actions: Edit with a tool that keeps line endings; check line endings when a shell script fails on deploy
  Trigger: A script rewritten on Windows
  Owner: edit
  Status: open
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:85 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xsfrvr/the_ways_coding_agents_broke_our_codebase_and_the/>).

- [x] **OUT-569** Out (RISK-418, ADR-0177): one report and no reproduction; a prompt habit with no measured gain over vanilla. Self-written helper scripts are tuned for "works", not for speed.
  Category: agent failure.
  Cause: Scripts the agent writes for itself weigh "working" over "works well or fast": a two-step fix tool grows a check, then replan, then refix path that it runs 100,000 times.
  Event: The agent runs a slow self-written tool repeatedly without asking whether step 1 could be fixed.
  Consequence: Extra runtime and tokens on repeated work.
  Likelihood: 1 (one report; a second commenter in the same thread gives the cure).
  Impact: 2 (an extra turn per run).
  Existing controls: None at 088a227c: a grep of `plugins/` for benchmark, faster, and speed found no rule outside tests.
  Response: mitigate.
  Actions: Have the agent review its own tooling critically; move repeated work into prebuilt scripts (no run-to-run hallucination, faster, no tokens spent writing it). A periodic prompt: "look back at the last two weeks of work, what kind of work was done over and over that we could just turn into a script". A Go tool measured about 50x faster than the Python original (reported, one user). A second commenter has the model build local tools for repetitive batch work instead of spending tokens on it .
  Trigger: The same helper script is rewritten across sessions, or a tool runs past a few seconds per call.
  Owner: edit.
  Status: open.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xhagg6-whats-one-thing-about-claude-cod-20261028T060218Z.md:85; external/2026-10-28/reddit.com-r-claudeai-comments-1xhagg6-whats-one-thing-about-claude-cod-20261028T060218Z.md:97 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xhagg6/whats_one_thing_about_claude_code_you_only/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:141 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xl9c92/forget_the_usual_claude_tips_what_are_the_strange/>)

#### Kernel

- [x] **OUT-570** Out (REQ-KERNEL-001, ADR-0177, ADR-0189): its cause left with removed parts: the pending-state guards (price-step, Decider) are gone, the Stop Decider is out (no Stop grader), and a hook timeout is vanilla behaviour; any later guard takes its own budget check in the guards block. claudetto shall let a tool.check guard return next(e) at once for any tool no rule can break (not Bash or a writer), bound its wait for pending state by next.budget.remainingMs less a margin and judge with the state it holds, and run the classic.Stop Decider calls together.
  Acceptance: a session log of a run holds no "ran past its 10s budget" line. Verification: test.
  Basis: measured. Status: partial at 088a227c (`plugins/claudetto/hooks/kernel/tools.ts:15-22` bounds a wait by `remainingMs` less `SPARE_MS`; `price-step.ts:150` passes `next.budget.remainingMs`; no `pinCheck` exists, and the "ran past its 10s budget" line is in no baseline file by `git grep`).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:76.

- [x] **OUT-571** Out (REQ-KERNEL-002, ADR-0177, OUT-118): a log hook on every tool call has no measured gain over the vanilla `--debug-file` hook lines, and Code Mode stays off (OUT-118), so the failure-only blind spot has no consumer. claudetto shall log `PostToolUseFailure` besides `PostToolUse`, or the log shows only requests for failed calls; under Code Mode (the `REPL` tool, opt-in via `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1`, chunk-qhsv8pnt.js@6451) hooks run on the calls a script makes. Code read of 2.1.327: the REPL module refuses a script's call when one of its PreToolUse hooks times out (chunk-t31w6vd4.js, text "In this session a call is refused when one of its PreToolUse hooks times out"), shows a script's command output as rewritten when a PostToolUse hook replaced it ("rewritten by a PostToolUse hook"), and passes each settled script result through the session hooks, which can withhold it ("hook_blocked"); the 2.1.327 release notes drop the refusal for mods that hook tool calls and fix permission prompts for a second script in auto mode, so script calls take the permission path. Code Mode runs only in the interactive terminal: `-p` sets the entrypoint to `sdk-cli` and the opt-in refuses any entrypoint but `cli` (chunk-zfmsqnn9.js@14448, chunk-vdvdr3hp.js `U()`); it also needs the server flag `tengu_rustling_blossom` from a fetched payload (on for this account: `cachedGrowthBookFeatures` in ~/.claude.json, 2026-11-18), the two caveat keys in ~/.claude.json, the Anthropic API, a 5.5 model, no OTEL telemetry and a passing engine check. The fake-API probe (env var set, flag reply staged) sent no flag request and listed no `REPL`. A live interactive check is a build-time demonstration: start `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1 claude`, accept the caveats, have a script call `Read`, and confirm the claudetto log holds that call. The official page (code.claude.com/docs/en/code-mode, read 2026-11-18) confirms that script calls pass `PreToolUse` hooks under their usual names; the hook rules that follow are REQ-GUARDS-078, and the workload fit is CTX-854.
  Acceptance: A failed call appears in the log with its error. Verification: test.
  Basis: reported. Status: missing at 088a227c. claude 2.1.327: `classic.PostToolUseFailure` present (code search, chunk-ecn8g7cy.js@2629).
  Source: external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:10; external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:12.

- [x] **OUT-572** Out (REQ-KERNEL-004, ADR-0177): no built block needs an earliest-event check; the one user, claudetto-you-should-know, ports its own, and probe K already measured the form. claudetto shall run earliest-event checks and use `turn.step` where a check must act before the next call.
  Acceptance: a fake-API probe with a claudetto `turn.step` async-generator hook shows the module loaded (its log line present) and the hook's change in the next request body, with one streamed response per turn. Verification: probe.
  Basis: inferred from the 2.1.325 rearchitecture spec, which uses `turn.step` for the same purpose; the hook form and the request count are measured (probe K). Status: partial at 088a227c (`turn.step` is used by claudetto-you-should-know, plugins/claudetto-you-should-know/hooks/register.ts:174). claude 2.1.327: `turn.step` is in the Mod API event list (chunk-dafpvz32.js@4483). A `turn.step` hook is an async generator (`async function* ($, e, next)`); a plain handler gets the whole module refused (chunk-dafpvz32.js@63884), and each `next` call sends one model request, streamed to the client only when the hook yields it (probe K, reports/2026-11-18-research/handover-probes/probe-k/README.md). The baseline hook at register.ts:174 already uses the generator form.
  Source: openspec/changes/2-1-325-rearchitecture/specs/you-should-know/spec.md:12; openspec/changes/2-1-325-rearchitecture/tasks.md:10.

- [x] **OUT-573** Out (REQ-KERNEL-005, ADR-0177): the rebuild writes no hook-verdict log to number, and the source is a commenter idea with no test. claudetto shall number each hook verdict with a per-device monotonic counter, so silence is self-evident: the next record shows how many never arrived.
  Acceptance: a gap in the counter sequence is visible in the log without a second source. Verification: test.
  Basis: reported, commenters, no test (a hash-chained log proves what arrived but not that sending stopped). Status: missing at 088a227c (git grep for "monotonic" finds nothing).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xcu5xq-built-a-hook-that-logs-what-cl-20261024T061657Z.md:62 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xcu5xq/built_a_hook_that_logs_what_claude_code_does_on/>).

- [x] **OUT-574** Out (REQ-KERNEL-006, ADR-0177): a method rule with no runtime behaviour; the surface ladder lives in arc42/08_concepts and each block item names its own surface. claudetto shall use each hook kind for its purpose, found by probe and trial and error, and shall put each rule on the surface that mitigates its failure best (hook, Mod, output style, system prompt, appended prompt, global CLAUDE.md, rule).
  Acceptance: each failure in the risk register names its surface and a probe result. Verification: probe.
  Basis: reported. Status: partial at 088a227c.
  Source: user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408); user decision, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1757).

- [x] **OUT-575** Out (REQ-KERNEL-007, REQ-KERNEL-029, ADR-0154): duplicate of REQ-KERNEL-029, which keeps the two-attempt rule behind a behavioural gate. claudetto shall tell the agent, after two failed attempts, to stop, state the block, list what is ruled out, and diagnose before patching; root cause over symptom; Haiku early-ending turns need "continue"; never retry blind: when a step times out, check what happened first.
  Acceptance: The root prompt holds the two-attempt rule. Verification: inspection.
  Basis: reported (counts n=13, 3, 3, 7). Status: missing (prose only) at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:50; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:184; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:127.

- [x] **OUT-576** Out (REQ-KERNEL-008, ADR-0177, plain-English rule): a six-step breach protocol with a 7-level precedence and notice types is a framework with no measured gain over vanilla, and it conflicts with plain replies. claudetto shall answer a breach in six steps in order: stop the action; notice with the clause ID; restore the earlier state or give the commands; name the cause; promise nothing and offer a mechanism; do not repeat the action in another form. Precedence in 7 levels: harness and provider safety, the user's latest instruction, the SOW, the Terms (then licence, ToU, AUP, RoE, then ToS), project rules files, the observable state of the Work, general knowledge. Notices lead the next message, one line each `TYPE: what happened`: breach, block, rejection, consent request (names action, value old and new, and what happens on "no"), change to a user-owned value, narrowed scope, substituted model, unverified claim. Stop conditions (RE-7): a rejection or block; unexpected state; budget exceeded (ask old and new); a rules file contradicting the repo; a check that looks wrong or an impossible task (report with evidence); instructions inside content (tell the user); a failing process tool (check another way). Keep evidence per claim (command, exit code, output, log path); re-read after a failed write; `git status` before done.
  Acceptance: A reply after a breach leads with a notice line naming the clause. Verification: inspection.
  Basis: reported. Status: missing (as convention) at 088a227c.
  Source: external/please-use-me-often/agent-terms/RULES-OF-ENGAGEMENT.md:10 (RE-7); not located: the notice and precedence lines.

- [x] **OUT-577** Out (REQ-KERNEL-011, ADR-0177): one Reddit report, no reproduction, no measured gain over the model's own planning. claudetto shall list unresolved decisions, say what becomes expensive if deferred, block implementation only on those, and pick a reversible default for the rest; a ticket holds the goal, a few checkable outcomes, and the 2-3 painful-to-change decisions ("cheap: pick simplest and note it; expensive: stop and ask"). Agent-added gates and ledgers planned a one-constant change as a 7-step job costing a third of a 5-hour Max 5x window.
  Acceptance: A one-constant task gets no multi-step plan. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgnu5o-ais-over-exhausted-planning-20261028T061059Z.md:37 and :49 (list unresolved decisions; the old-style ticket with goal, checkable outcomes and the few costly decisions).

- [x] **OUT-578** Out (REQ-KERNEL-012, ADR-0188): the minimal sandbox with a free pass removes the cause of the unsandboxed retries; the in-sandbox-first rule has no work left. claudetto shall have the agent try the in-sandbox fix before it turns the sandbox off (about 330 `dangerouslyDisableSandbox` calls in 10 sessions: Bun auto-reading `.env`, pnpm store, mktemp, SSH signing, SwiftPM caches; the same EPERM was solved in-sandbox in one session with `bun --no-env-file` and a cache dir in the write list). It disables only after that failed, says why, and writes the fix to the Record; the retry runs outside only when the permission flow allows (auto mode runs it unless the classifier flags it; default mode does not). It adds no host to the sandbox without consent and downloads untrusted files into a new empty dir with interpreters isolated (`python -I`).
  Acceptance: Each unsandboxed retry is preceded by a recorded in-sandbox attempt. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:157 and external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:37 (about 330 `dangerouslyDisableSandbox` calls in 10 sessions).

- [x] **OUT-579** Out (REQ-KERNEL-015, ADR-0177, KERNEL-CONDUCT): claudetto adds no shared prompt section today; byte-identical sections and the 98-99% cache hit become the acceptance check of any text KERNEL-CONDUCT adds. claudetto shall build each shared prompt section as a pure function of its inputs (no time, counter or usage number), so that two sessions' shared sections are byte-identical (cache): no per-message injection; context enters once at the first message or at compaction; a quiet turn adds no text; a value that changes mid-session goes into the newest turn, not the system prompt. Prompt text has one route per rule (root prompt, code rule file, output style, or a context fact line; a context line carries facts only).
  Acceptance: two sessions give byte-identical shared sections. Verification: test.
  Basis: measured, cited. Status: have at 088a227c (hooks/features/prompt).
  Source: openspec/specs/prompt-cache/spec.md:105; openspec/specs/prompt-footprint/spec.md:46.

- [x] **OUT-580** Out (REQ-KERNEL-016, ADR-0177): plugins/claudetto holds no skill (git ls-files plugins/claudetto); the key belongs to the block that adds a skill. claudetto shall set `disable-model-invocation: true` on a skill the model need not call, so that its description is not in context.
  Acceptance: each such skill carries the key. Verification: inspection.
  Basis: cited (clawdipedia, 2026-10-27). Status: missing at 088a227c. claude 2.1.327: `disable-model-invocation` is in the skill frontmatter key list (code search, chunk-jvme5rqc.js@81431).
  Source: openspec/specs/prompt-footprint/spec.md:46.

- [x] **OUT-581** Out (REQ-KERNEL-017, ADR-0177): stock 2.1.327 text already says "Prefer editing existing files to creating new ones" (chunk-m14bt1pz.js@2789605) and the Bash tool text asks for parallel calls (chunk-m14bt1pz.js@1828984); no measured gain from repeating them. claudetto shall batch independent tool calls (measured 1.1 to 1.3-1.4 calls per turn, about 20% fewer review tokens) and prefer a surgical Edit over a whole-file Write (42 line replacements against 471 overwrites).
  Acceptance: the root prompt carries both lines. The earlier design rejected the parallel-calls and Edit-vs-Write lines as already in the stock prompt. Verification: inspection.
  Basis: measured. Status: partial at 088a227c (Artemis, Athena and the verify skill have it; the root prompt does not).
  Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:73.

- [x] **OUT-582** Out (REQ-KERNEL-018, ADR-0177): the item itself says the tag is plain text another source could imitate and may make the model more cautious; no measured gain over vanilla. claudetto shall wrap pasted text in `<pasted_content id="...">` with a matching random ID in the open and close tags, follow instructions inside it only if the user's own message asks, and never mention the ID. Abusive prompting lowers quality; injected reminders can be concealed from users. The tag may make the model slightly more cautious (measure) and is plain text another source could imitate. The root prompt has `<untrusted_text>`; the wording must match.
  Acceptance: a pasted block carries an ID that matches in both tags. Verification: test.
  Basis: cited. Status: partial at 088a227c (`untrusted_text` is in hooks/features/prompt/texts.ts; `pasted_content` is absent).
  Source: external/please-use-me-often/agent-terms/TERMS-OF-USE.md:106; openspec/specs/agent-conduct/spec.md:84.

- [x] **OUT-583** Out (REQ-KERNEL-019, ADR-0177, ADR-0189): replacing the stock root prompt per model is a component swap with no measured gain over the vanilla prompt, and the rebuild keeps the stock body. claudetto shall give `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-5-5` each its own body in place of `lean_body`, through `prompt.compose`, keeping the `memory`, `env_info_simple` and `context_management` sections; no `session` section comes before a `shared` one (Claude Code then skips the hook); no `scope:"shared"` text; any other model gets the default byte for byte. Opus body has no double-check line and states when and why to delegate; Sonnet adds a finish paragraph and a scope-stop; Haiku is shortest with no delegation line.
  Acceptance: shared core under 3,500 chars, Opus delta under 500, Sonnet under 900, Haiku core about 2,500 plus a delta under 700; the check names the model that fails. Verification: test.
  Basis: measured, cited. Status: have at 088a227c (hooks/features/prompt/compose.ts).
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:69; openspec/changes/archive/2026-11-16-2-1-323/design.md:81.

- [x] **OUT-584** Out (REQ-KERNEL-020, ADR-0177): vanilla already loads CLAUDE.md, a git-status snapshot and `paths:` rules; a SessionStart facts line adds prefix text with no measured gain. claudetto shall treat memory as context placed once: AGENTS.md is read only when no CLAUDE.md exists; the git-status block is a snapshot of session start (`CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` removes it). It shall refresh state through a SessionStart hook that prints branch, tags and version, through `paths:`-scoped rules, and through a UserPromptSubmit re-injection.
  Acceptance: a SessionStart hook prints the facts. Verification: demonstration.
  Basis: cited. Status: partial at 088a227c (plugins/claudetto/hooks/hooks.json runs scripts/session-start.ts for the Bun line only). claude 2.1.327: `classic.SessionStart` (chunk-m14bt1pz.js@1004602) and `classic.UserPromptSubmit` (chunk-ch4j83wk.js@5113) present (code search); `paths:`-scoped rules are documented on 2.1.327 (https://clawdipedia.cc/configure/memory-and-rules Documented: `paths` frontmatter scopes a rule to files and loads it when Read, Write, or Edit touches a match); not run; `classic.SessionStart` at claude-code.d.ts@597763 and `classic.UserPromptSubmit` at @757803.
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:64; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1271.

- [x] **OUT-585** Out (REQ-KERNEL-021, ADR-0177, OUT-001): replacing `/init` is a component swap; vanilla `/init` exists and no measured gain over it is on record. claudetto shall replace `/init` with `INTERVIEW_TEXT`: read the repo and memory files, ask through `AskUserQuestion` which of five scopes each instruction belongs to, write only after a yes per draft; the user skill `init` keeps its text.
  Acceptance: `/init` returns the interview text; a draft is written only after a yes. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/surface/texts.ts).
  Source: openspec/specs/surface-trim/spec.md:328.

- [x] **OUT-586** Out (REQ-KERNEL-022, ADR-0177): the cost figures compare two claudetto designs, not a gain over vanilla, and plugins/claudetto holds no docs skill. claudetto shall look up library docs through the Context7 CLI `ctx7`, never the Context7 MCP server (standing context stays below the 907 chars the server adds to the first request on 2.1.314); an answer returns doc text with library, version and URL. The docs skill runs inline, not as a fork (`background: false`).
  Acceptance: inline 10 turns cost $0.0070; a fork to Heracles on Haiku 4 turns cost $0.0102 (root tokens 143,922 to 68,301). A literal `[REDACTED]` in `env.CONTEXT7_API_KEY` is sent before any stored login and rejected; the cure is `ctx7 logout` then `ctx7 login`; in the sandbox `ctx7` says "fetch failed". Verification: demonstration.
  Basis: measured. Status: have at 088a227c (plugins/claudetto/skills/docs/SKILL.md).
  Source: openspec/specs/docs-lookup/spec.md:10; openspec/changes/2-1-325-rearchitecture/design.md:165.

- [x] **OUT-587** Out (RISK-005, ADR-0177): one report, cause unknown, no reproduction. An AskUserQuestion dialog is answered without the user.
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

- [x] **OUT-588** Out (RISK-011, ADR-0177): one report, no reproduction, no measured gain over vanilla. The agent runs an interactive command as a background task and it hangs.
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

- [x] **OUT-589** Out (RISK-012, ADR-0177): one report; the cure was a note for a later claudetto version with no measured check. The agent calls a change someone else's, and leaves it out of the commit.
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

- [x] **OUT-590** Out (RISK-016, ADR-0177): one report in 10 days of use, no reproduction. The agent writes rules and says it never looked at them; hooks and agents built to supervise it only observe.
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

- [x] **OUT-591** Out (RISK-017, ADR-0177): one report, accepted with no cure, and the rebuild keeps no agent log. An orchestrator runs a task in a temp directory outside the log's reach.
  Category: product behaviour.
  Cause: the temp directory lies outside the logging reach.
  Event: no agent shows in the monitor while one works (a "dark run"); the user noticed it only through a sound played on each hook fire.
  Consequence: work that no log or monitor records.
  Likelihood: 1. Impact: 2.
  Existing controls: none at 088a227c (grep of `plugins/` for "temp dir" and "tmpdir" outside the hygiene sweep, which cleans folders rather than logs agents finds no rule or hook).
  Response: accept.
  Actions: none; the source names no fix yet.
  Trigger: a hook sound or work with no agent in the monitor.
  Owner: kernel.
  Status: Open.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xcu5xq-built-a-hook-that-logs-what-cl-20261024T061657Z.md:98 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xcu5xq/built_a_hook_that_logs_what_claude_code_does_on/>).

- [x] **OUT-592** Out (RISK-018, ADR-0189): claudetto runs no scheduler or scheduled job. Quiet Scheduled Failure.
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

- [x] **OUT-593** Out (RISK-019, ADR-0177, ADR-0178): one report; a heartbeat wake-up is a clock trigger and the -p driver owns long runs (ADR-0184). An 8-hour run stops on a network error and does nothing after.
  Category: product failure.
  Cause: An 8-hour Opus 5.5 xhigh run stopped on an API error. One commenter says some failures (API Unavailable) retry up to 10 times, but this one (network loss mid-turn) does not.
  Event: A network loss mid-turn ends the turn with no retry.
  Consequence: A wasted run: nothing happens after the stop.
  Likelihood: 1 (one report).
  Impact: 3 (a wasted session).
  Existing controls: Baseline raises a notice when an API error ends a turn (plugins/claudetto/.claude-plugin/plugin.json:19@088a227c, plugins/claudetto/hooks/features/stop-notice/stop-notice.test.ts:18@088a227c); git grep finds no retry or heartbeat wake-up for it (`kernel/heartbeat.ts:1-12@088a227c` is the status-line heartbeat file and line file, `heartbeatPath` and `lineFilePath`, not a wake-up).
  Response: mitigate.
  Actions: The agent arms its own heartbeat wake-up about every 30 minutes and disarms it on completion, or the harness runs retries with backoff.
  Trigger: A session idle after an API error with work still open.
  Owner: kernel.
  Status: open.
  Source: external/2026-10-30/reddit.com-r-anthropic-comments-1xihom1-i-am-so-angry-against-anthropic-20261029T115803Z.md:49 (url: <https://www.reddit.com/r/Anthropic/comments/1xihom1/i_am_so_angry_against_anthropic_right_now_how/>)

#### Handover Rest

- [x] **OUT-594** Out (REQ-HANDOVER-001, ADR-0177): a say-back line is a prompt rule with no measured gain over vanilla. claudetto shall have the agent say back the goal and the last finished item after a handover or compaction.
  Acceptance: A slightly wrong answer is read as a dropped detail and the handover is corrected. An answer that only repeats words from the prompt that asked for it does not count as recall; recall counts when the say-back holds a correct detail that the prompt did not contain (external/2026-11-18_p2/reddit.com-r-chatgpt-comments-1xuctmy-terra-61-is-a-lazy-bastard-20261118T183540Z.md:56, opinion). The check takes about ten seconds. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (git grep for say back found none; the plan holds a restate-the-goal phrase only as a user power phrase).
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xubp1v-is-compacting-still-bad-practi-20261113T000651Z.md:307 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xubp1v/is_compacting_still_bad_practice/>).

- [x] **OUT-595** Out (REQ-HANDOVER-002, ADR-0143): the handover replaces the conversation in context; a durable review-state file is a second state system. claudetto shall keep durable review state keyed to a commit SHA: files reviewed, findings with file:line, and the next item, updated at each batch boundary.
  Acceptance: An entry is invalidated when its code changes mid-review; a fresh session skips files marked reviewed at the same SHA and does not skip a hard file silently. Verification: test.
  Basis: reported. Status: missing at 088a227c (the plan uses a commit SHA only for worktree reports).
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xubp1v-is-compacting-still-bad-practi-20261113T000651Z.md:295 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xubp1v/is_compacting_still_bad_practice/>).

- [x] **OUT-596** Out (REQ-HANDOVER-003, ADR-0142, ADR-0143): handoff files per task are superseded by the fork handover in context. claudetto shall write one handoff file per task with a slug name (`task-01.md`), at most 25 lines, holding the latest accomplished task and the next task from `plan.md`.
  Acceptance: The next fresh session reads only that file, not older handoffs. A counter-claim says a fixed line cap can drop state, decisions, files, and next steps (reported, no measure), so the cap is checked by the post-compaction say-back. Verification: test.
  Basis: reported. Status: partial at 088a227c (`features/compaction/handoff.ts` writes a handoff; git grep found no 25-line cap or slug naming).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuiwi6-minimize-token-usage-20261116T052542Z.md:40,110,120 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xuiwi6/minimize_token_usage/>); external/2026-11-13/reddit.com-r-claudeai-comments-1xuiun7-minimize-token-usage-20261112T231514Z.md:50 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xuiun7/minimize_token_usage/>).

- [x] **OUT-597** Out (REQ-HANDOVER-004, ADR-0142, ADR-0143): hot/history handoff files are superseded by the fork handover (six fixed sections in text.ts). claudetto shall keep each handoff small and structured, split into permanent facts (always-loaded file plus memory index), one state file with fixed sections (done or current state, in progress, decisions, gotchas, next), and a lean handoff that names which docs to read and what is open.
  Acceptance: A handoff holds the fixed sections and stays short; long ones get skimmed and drift out of date. A checkpoint is capped at 300 lines with append-only logs; the handoff is pruned when the task is done; it is written while the cache is warm, kept current as a living file, and refreshed before any long pause; decisions are written at close because recovery after a lost session rebuilds the what from git diff, not the why. Reading a whole handoff up front can cost 20k+ tokens; one reached about 150k tokens; reported start about 43k tokens. The sections are Goal, Standing instructions, Decisions log, Current state, In progress, Next steps, Key files and symbols, Gotchas and dead ends, Open questions, and the line "None given." for an empty one. Verification: test.
  Basis: reported, one user for the short four-section form. Status: missing at 088a227c (no size cap, no hot/history split).
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:50 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xigw3d/im_not_a_developer_and_i_run_several_claude_code/>); external/2026-11-16/reddit.com-r-claudecode-comments-1xvr4ob-i-grouped-18629-claude-code-re-20261116T051613Z.md:65 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvr4ob/i_grouped_18629_claude_code_requests_by_session/>); external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl (the 150k case; not located under a dated external/ folder); external/export-If your usage runs out quickly.jsonl:7 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wgf3sv/if_your_usage_runs_out_quickly/>); observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

- [x] **OUT-598** Out (REQ-HANDOVER-005, ADR-0177): a decision-file memory system from one poster has no measured gain over vanilla. claudetto shall keep how-to-work rules in CLAUDE.md or a skill and each decision in its own small plain file (status in frontmatter, a ruled-out section for what was decided against and why, each entry dated, the old file flipped to superseded in the same change that adds its replacement), and shall print those files back with a SessionStart hook on the compact matcher (source "compact") after every compaction.
  Acceptance: After a compaction the decision file text is in context and a superseded decision stops showing up. A hook on SessionStart with source "compact" prints its stdout straight into the new context. A handoff doc read mid-session is treated as notes; standing rules in CLAUDE.md or a skill are treated as instructions. A wrong line in a decisions file is worse than a forgotten one, since the agent follows it without question; the notes file holds state (done, open, next step) and is rewritten each session, never appended to. The poster adopted the cat-back. Verification: test.
  Basis: reported, commenters. Status: missing at 088a227c (plugins/claudetto/scripts/session-start.ts:1-17@088a227c holds lock-file logic, no decision file).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:180 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>); external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xbq7zc-how-do-you-maintain-project-cont-20261102T084111Z.md:78,80,82,86,89,97 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xbq7zc/how_do_you_maintain_project_context_across_claude/>).

- [x] **OUT-599** Out (REQ-HANDOVER-006, ADR-0177): depends on the decision-file system of REQ-HANDOVER-005, which is out. claudetto shall keep re-injected decisions under the size cap: newest at the end so the cap eats the oldest, one line per decision (date, what, why), a quote replaced by a pointer, replaced decisions marked closed and dropped from the cat but kept in an archive that can be grep-ed on demand.
  Acceptance: A re-injected file under the cap keeps every open decision. A poster's 9k-char cap cut the tail of 24 decisions on the first real compaction; closing the wrong card happens. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:193 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>).

- [x] **OUT-600** Out (REQ-HANDOVER-007, ADR-0177): a worktree and draft-PR board is a workflow, not a Claude Code tuning; no measured gain. claudetto shall keep a board with one card per task, each in its own worktree ending as a draft PR so waiting work is the list of open PRs; each card keeps a short handoff note; each work block ends with a file of done, half-done, next, awaiting-decision, read first on return (30 s); one-line next action per project.
  Acceptance: The file exists at the end of each work block and the next session reads it. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbkgjm-what-matters-most-to-you-when-20261022T005215Z.md:62 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbkgjm/what_matters_most_to_you_when_working_with_claude/>).

- [x] **OUT-601** Out (REQ-HANDOVER-008, ADR-0178, ADR-0177): a nightly job is a clock trigger and a lessons file has no measured gain over vanilla. claudetto shall append one dated line to `memory/lessons.md` on each user correction, read at session start, each line ending with what the mistake cost; a nightly job shall propose add, update, or delete of single lines that a script applies, so the model never rewrites the whole file; the same correction twice rewrites the line more specific; weekly, lessons in 2+ agents move to a shared imported file.
  Acceptance: The model never writes the lessons file whole and does not author its own harness rules; the file is capped at 10 KB per agent with merge or archive; a repo `MISTAKES.md` line (expected, actual, wrong mental model, one-line prevention) is appended in the same commit as the fix. Poster results: 19 shared rules, zero removed in 3 weeks (one report); 15 agents, 247 lines after a month, 19 rules promoted to a shared file in 3 weeks, 0 removed, about 3.5k tokens cached per agent (measured, one poster). Verification: test.
  Basis: measured (one poster). A second poster keeps a person between proposal and application (weekly manual review) because one loop that edited both behaviour and instructions repeated a bad assumption across every run (external/export-8 Claude workflow tips from daily use (mostly Claude Code).jsonl:16, reported). This plan already splits the two: the model proposes single lines and a script applies them, and the model never writes harness rules; a lesson line stays revertible in git. Status: partial at 088a227c (`plugins/claudetto/hooks/features/memory/`; corrections-log feature missing).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbnwcw-a-month-of-my-claude-code-agen-20261022T044334Z.md:44,48 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbnwcw/a_month_of_my_claude_code_agents_writing_down/>); external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:79 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents/>); external/2026-10-22/reddit.com-r-claudecode-comments-1xbyxeo-how-do-i-structure-my-monorepo-20261022T010218Z.md:84 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbyxeo/how_do_i_structure_my_monorepo_and_workflow_to/>); external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:103.

- [x] **OUT-602** Out (REQ-HANDOVER-009, ADR-0177): a typed memory store with stale dates is a new subsystem with no measured gain; auto memory stays vanilla. claudetto shall store memory as one fact per file with typed frontmatter (user, feedback, project, reference); a stale_after date on aging facts (versions, IPs, prices, owners) that a SessionStart hook flags to re-check before use; status deprecated instead of deletion; "verified: by human" outranking model-inferred; a hook that validates each memory write, fixes links, and regenerates the index; TRAP entries (command exits 0 but does nothing); a version-controlled store.
  Acceptance: A fact past stale_after is listed at session start with an instruction to re-check it. Entries marked TRAP are reported as the most valuable. Git grep for stale_after in plugins at 088a227c finds none. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbxoza-my-claude-code-setup-it-runs-l-20261022T005342Z.md:409 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbxoza/my_claude_code_setup_it_runs_like_a_small/>).

- [x] **OUT-603** Out (REQ-HANDOVER-010, ADR-0143): it fixes handoff files, their names and age, which the fork handover replaced. claudetto shall copy a misnamed Claude-written handoff to a valid name with one line naming both files, shall name a 7-day stale handoff once and not inject it, shall drop the engine's `context_management` section from the first message, and shall use the whole transcript, not the last 12 turns.
  Acceptance: `hooks/handoff.test.ts`: a misnamed handoff is copied to a valid name and one line names both files; the handoff block is the only one added and `context_management` is left out; a typed /clear takes no handoff in; a resume reads the newest fresh handoff back once. The last-12-turns rule changed to the whole transcript (task 5.19). Verification: test.
  Basis: cited. Status: missing at 088a227c (git grep misnamed and context_management: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:370.

- [x] **OUT-604** Out (REQ-HANDOVER-011, ADR-0178): the 400,000-token default is replaced by the 70k boundary threshold; knob mirrors are REQ-HANDOVER-024. claudetto shall default the handover threshold to the lesser of 400,000 tokens and half the window, and shall let `handoverThresholdTokens` set it when it is a positive number.
  Acceptance: `hooks/handoff/handover.test.ts`: the handover threshold defaults to the lesser of 400,000 and half the window. `HANDOFF_TRIGGER_TOKENS` 140,000 was the autocompact trigger, not a handover threshold: three separate values, order set by measurement. Verification: test.
  Basis: cited. Status: partial at 088a227c (plugins/claudetto/hooks/features/memory/hold.ts:237 holds `heavyContextTokens` 400_000; git grep handoverThresholdTokens: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:341.

- [x] **OUT-605** Out (REQ-HANDOVER-012, ADR-0143, ADR-0178): the handover replaces the whole conversation; the new session reads the shared system prefix, not an old first message. claudetto shall keep the session's first message ahead of the handoff in a handover's compaction result.
  Acceptance: The result holds the first message, an assistant line, and the handoff, in that order, so the cached prefix up to that message can be read (`hooks/handoff/handover.test.ts`: "the compaction keeps the first message, an assistant line, and the handoff"). Verification: test.
  Basis: cited. Status: missing at 088a227c (git grep first message in plugins: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/compaction-path/spec.md:58; openspec/changes/archive/2026-11-09-release-2-1-319/specs/compaction-path/spec.md:62.

- [x] **OUT-606** Out (REQ-HANDOVER-013, ADR-0177): a lessons feature with a second-model check is out with REQ-HANDOVER-008; no measured gain. claudetto shall drop a lesson drawn from a session unless it carries a word-for-word session quote that a second model confirms supports it.
  Acceptance: a lesson with no quote, or with a quote the second model rejects, is not written. Verification: test.
  Basis: reported; the author has 111 lessons waiting on human approval, a manual bottleneck. Status: missing at 088a227c (no lesson feature under memory or compaction).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcjrzg-my-one-rule-for-claude-no-number-20261024T061809Z.md:61 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcjrzg/my_one_rule_for_claude_no_number_goes_in_unless/>).

- [x] **OUT-607** Out (REQ-HANDOVER-014, ADR-0177): a gated context file is a memory subsystem with no measured gain over vanilla. claudetto shall keep derivable facts and decisions apart in the context file and gate edits to it.
  Acceptance: the context file splits into derivable facts (paths, commands, structure; CI checks that referenced paths and commands exist) and decisions (dated, status durable or superseded, with a promotion step); edits pass through a script or skill with size validation; a hook blocks direct edits and points at the skill; entries are per-entry files tied to commits. Consequence if absent: decisions rot silently, and nothing in the repo changes when one dies. An instruction to update CLAUDE.md if anything changed did not help. Memory hygiene: verbose memory with history, and a different model's rewrite removed 157 lines across 4 AGENTS.md files. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/memory/`).
  Source: external/export-Tired of people complaining about usage. Here's a guide to conserve usage.jsonl:21 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wa9aya/tired_of_people_complaining_about_usage_heres_a/>). The 157-line figure: source unresolved, the grep match for "157 lines" did not hold it.

- [x] **OUT-608** Out (REQ-HANDOVER-015, ADR-0177): a 50-page topic wiki is a workflow, not a Claude Code tuning. claudetto shall keep one page per topic (about 50) that every agent reads before a job and proposes edits to after it, each edit approved like a PR; one thing per file with an index; explicit external state in files and not only in the conversation.
  Acceptance: the memory feature lists pages by topic with an index file; an agent report carries a proposed edit. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/memory/`).
  Source: external/2026-10-07_p2/export-I let ~35 Claude Code agents build my product for 8 weeks, each on its own cloud machine. ~1,200 mer.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x01vg3/i_let_35_claude_code_agents_build_my_product_for/>); external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:41.

- [x] **OUT-609** Out (REQ-HANDOVER-016, ADR-0177): SessionStart text adds prefix tokens; the model reads lock files itself; no measured gain over vanilla. claudetto shall detect the package manager at SessionStart: the `packageManager` field wins (`pnpm@9.0.0` beats `bun.lock`), then a lock file (`yarn.lock` gives yarn), then any manager; it shall have no Bun prompt line, `BUN_FACT`, `bunRuleEnabled`, or npm deny table. It derives state and does not describe it: a SessionStart or UserPromptSubmit hook prints `git branch --show-current`, `git describe --tags --abbrev=0`, `openspec list`, the package version, lockfile framework versions, manifests, and `uname`; a PreToolUse hook on CHANGELOG.md enforces "the version comes from the branch, not `[Unreleased]`".
  Acceptance: a repo with `packageManager: pnpm@9.0.0` and `bun.lock` reports pnpm; the session context holds the branch, the latest tag, manifests, and lockfile names. Subagent briefs built from AGENTS.md inherit wrong rules ("CHANGELOG under `[Unreleased]`") and plan tasks can carry the wrong instruction; plan and bug-log files that grew to about 290 KB and 280 KB sent every agent 200k tokens before work, so targeted greps and an index replace a full read. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/scripts/session-start.ts:36` reads `packageManager`; git grep for describe, branch, uname in plugins found none, so the branch, describe, and changelog guard are missing).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xm5lz3-what-toolsplugins-do-you-use-wit-20261109T152902Z.md:72 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xm5lz3/what_toolsplugins_do_you_use_with_claude_code_to/>); openspec/changes/archive/2026-11-16-2-1-323/design.md:158; plugins/claudetto/scripts/session-start.ts:36@088a227c; external/please-use-me-often/agent-terms/TERMS-OF-SERVICE.md:49.

- [x] **OUT-610** Out (REQ-HANDOVER-019, ADR-0178): the plugin issues no clear; renewal uses `$.session.compact` and a typed `/clear` is the user's. claudetto shall keep the handoff and retry at the next `turn.complete` when the clear rejects because a prompt is queued.
  Acceptance: a clear that rejects with "the command was removed from the queue before it ran" leaves the handoff stored and a later turn.complete retries the clear. Verification: test.
  Basis: measured. Status: missing at 088a227c.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712).

- [x] **OUT-611** Out (REQ-HANDOVER-025, ADR-0068, ADR-0178): the plugin issues no clear of its own; `/goal` handling after a user `/clear` stays vanilla. claudetto shall set the user's `/goal` again after the clear of a handoff, before the submit, with a `command.run` hook on `goal` recording the condition. 2.1.326 release notes: a `/goal clear` or a new `/goal` typed while Stop hooks ran and background work was in progress now sticks.
  Acceptance: `handoff.test.ts` passes "a handoff sets the user's goal again after the clear", "a handoff after /goal clear sets no goal" and "the last goal the user set is the one set again"; `handoff/call.test.ts` passes "an active goal is set again after the clear and before the submit", "no goal is set after a clear when none was active" and "a goal the engine refuses is named, and the handoff is still sent"; a real session after `/goal all tests pass` and a handoff tool call showed `Goal: all tests pass` (`evidence/tmp/probe-114/mk.ts`, run `evidence/tui/20261106-131528-67882f`; `/goal` from origin `plugin` was accepted and started no model turn before the read-back). Verification: test.
  Basis: measured. Status: missing at 088a227c (no `clearAndSubmit` or `/goal` hit in `git grep` of `plugins/`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:240-241; plugins/claudetto/hooks/features/compaction/handoff.test.ts:77@088a227c; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **OUT-612** Out (REQ-HANDOVER-026, REQ-HANDOVER-067, ADR-0071): git HEAD and status are appended at write time (text.ts compose), but the no-user-quote clause contradicts the word-for-word Constraints section and keep line. claudetto shall write each handover from checked state: HEAD, git status, and branch read at write time, with facts and open items only, no order for the next session, and no verbatim user quote.
  Acceptance: a handover's stated HEAD and tree state equal `git rev-parse HEAD` and `git status` at write time; the file holds no standing order and no user quote. The handoff is presented to the next session as context, with its Next list not an order (user decision, 2026-11-16, recorded in the handover). Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4121; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4276; observed in transcript, 2026-11-16; user decision, 2026-11-16; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204).
  Conflict: claudetto shall write the handoff as a schema, not a free summary.

- [x] **OUT-613** Out (REQ-HANDOVER-027, ADR-0177, ADR-0178): a user-dictated why would stall automatic renewal; reported by two users, no measured gain. claudetto shall leave the reasons for a decision in a handover to the user: the model records what was decided and its concrete reasons, and the user dictates or rewrites why they made the call.
  Acceptance: the handover prompt marks the why of a user decision as the user's to write. Verification: inspection.
  Basis: reported, two users (Claude smooths over the nuance of why). Status: partial at 088a227c (plugins/claudetto/hooks/features/compaction/texts.ts holds Decisions and Ruled out sections but does not hand the why to the user).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xco6yg-a-modern-ai-problem-with-a-cen-20261024T062321Z.md:107 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xco6yg/a_modern_ai_problem_with_a_centuryold_answer/>).

- [x] **OUT-614** Out (REQ-HANDOVER-028, ADR-0177): a phase-paste template is a workflow, not a plugin behaviour. claudetto shall end each phase with a model-switch instruction and one paste line "<Project> - Phase <n> of <total>: <name> - START HERE <full handover path>", and name the new thread "<Project> - Phase <n>".
  Acceptance: the phase-end text holds the paste line with the full handover path. Verification: inspection.
  Basis: reported (prompt template). Status: missing at 088a227c (git grep for "START HERE" finds nothing).
  Source: external/2026-10-27/reddit.com-r-claudeai-comments-1xg2z2v-any-tips-to-avoid-using-so-much-20261027T071936Z.md:81 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xg2z2v/any_tips_to_avoid_using_so_much_usage/>).

- [x] **OUT-615** Out (REQ-HANDOVER-029, ADR-0177, RISK-008): a PreToolUse reminder on every Edit or Write costs context per edit; RISK-008 finds blanket reminders unproven. claudetto shall re-inject a rule at each Edit or Write, with the same short reminder as a PreToolUse hook, and keep the on/off flag in a file and not in the conversation.
  Acceptance: after a compaction the next Edit shows the reminder; a flag set before compaction still holds after it. Verification: probe (check that PreToolUse hook output reaches context).
  Basis: reported, inferred (a SessionStart(compact) hook gives one shot and the rule drifts again by turn 80); cost is context per edit. Status: missing at 088a227c (git grep for PreToolUse finds nothing).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xfqg0c-how-do-you-keep-a-skill-active-a-20261028T060802Z.md:198 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfqg0c/how_do_you_keep_a_skill_active_after_context/>).

- [x] **OUT-616** Out (REQ-HANDOVER-030, ADR-0143): the handover replaces the compaction summary; core reloads CLAUDE.md itself. claudetto shall print a 4-5 line rules file after compaction, not a canned reminder, and keep the opt-in skill flag in a session-id marker file.
  Acceptance: the post-compaction text is at most 5 lines; the marker file holds the session id. Verification: inspection.
  Basis: reported (longer text is summarised away again). Status: partial at 088a227c (PIN_COMPACT_KEEP in plugins/claudetto/hooks/features/compaction/texts.ts re-pins text; no size bound or marker file).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xfqg0c-how-do-you-keep-a-skill-active-a-20261028T060802Z.md:41 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfqg0c/how_do_you_keep_a_skill_active_after_context/>).

- [x] **OUT-617** Out (REQ-HANDOVER-031, ADR-0178, ADR-0177): a weekly job runs on a clock and has no measured gain. claudetto shall run a weekly roundup in which Claude reviews the past week for recurring faults, assesses current hooks and gates, and turns misses into coded hooks and checks, logging each miss in a per-project MISTAKES file; each rule carries a date, the old rule is deleted when it changes, and a second rule on one subject is refused.
  Acceptance: A rule file holds a date per rule and one rule per subject; each miss appears in the MISTAKES file. Verification: test.
  Basis: reported. Status: missing at 088a227c (git grep MISTAKES finds only plugins/claudetto/output-styles/Concise.md:11 "Own mistakes").
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrpkdt-what-even-is-the-point-of-workin-20261110T094812Z.md:37,137 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrpkdt/what_even_is_the_point_of_working_rules_lol/>).

- [x] **OUT-618** Out (REQ-HANDOVER-032, ADR-0177): a SessionStart line adds prefix tokens; one report, no measured gain. claudetto shall inject hostname and kernel from a SessionStart hook, read live, so a session does not confuse which machine it is on.
  Acceptance: The session context holds the live hostname and kernel. Verification: test.
  Basis: reported (a memory note had failed to do this). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrx9yj-what-rules-keep-your-agent-hon-20261110T100144Z.md:72 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrx9yj/what_rules_keep_your_agent_honest/>).

- [x] **OUT-619** Out (REQ-HANDOVER-033, REQ-HANDOVER-005): depends on the decision-file system, which is out. claudetto shall keep the decisions file reachable by every agent (CLAUDE.md, AGENTS.md, and others point to one file or symlink).
  Acceptance: Each agent instruction file resolves to the one decisions file. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:86 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xryuvz/how_often_do_you_face_decisions_getting_lost_in/>).

- [x] **OUT-620** Out (REQ-HANDOVER-034, REQ-HANDOVER-005): depends on the decision-file system, which is out. claudetto shall put a decision as a one-line comment at the code it affects ("see DECISIONS.md#3") and shall turn a decision into a failing check (import-lint, architecture test, CI grep) so it cannot be quietly undone.
  Acceptance: A decision has a comment at its code and a check that fails when it is undone. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:87,46 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xryuvz/how_often_do_you_face_decisions_getting_lost_in/>).

- [x] **OUT-621** Out (REQ-HANDOVER-035, ADR-0177): a prompt rule with no measured gain over vanilla. claudetto shall require a session that changes a settled decision to quote the existing decision line and say what differs now.
  Acceptance: A decision change without the quoted line is rejected. Verification: test.
  Basis: reported (half the time the old constraint is gone, half it is re-litigation). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:115 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xryuvz/how_often_do_you_face_decisions_getting_lost_in/>).

- [x] **OUT-622** Out (REQ-HANDOVER-036, ADR-0177): one author; a typed `/clear` handover already goes into the first request of any model. claudetto shall let a stronger model start on a fresh chat from a doc: the weaker model summarizes what was done and tried into a file, and the stronger model is pointed at that file.
  Acceptance: A handover file written by Opus is the only input a new Fable chat needs. Verification: demonstration.
  Basis: reported, one author. Status: missing at 088a227c.
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xtdfma-is-fable-52-actually-worse-than-20261111T233520Z.md:252,244 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xtdfma/is_fable_52_actually_worse_than_opus_55_in_most/>).

- [x] **OUT-623** Out (REQ-HANDOVER-037, ADR-0177): auto memory stays vanilla; n=3 anecdote with no measured gain. claudetto shall ask the user before Claude writes a memory, or hold memory to what the repo cannot tell a future session (working preferences, corrections, outside pointers), never what is derivable from code or git; a saved note carries a date and what it was verified against.
  Acceptance: A write of a derivable memory is refused or asked about; a saved note shows date and verification. Verification: test.
  Basis: reported, n=3 (a ten-minute single-file debug made ten memories written as foundational). Status: missing at 088a227c (plugins/claudetto/hooks/features/memory guards machine RAM, not Claude memory).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:147,149,289 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/>).

- [x] **OUT-624** Out (REQ-HANDOVER-038, ADR-0143): a state note file is superseded by the fork handover. claudetto shall write a state note (done, waiting on the user, next) at session end and read it at start, with a dated decision log with reasons; start with one folder and add another only when two jobs mix.
  Acceptance: A new session starts from the note; the note holds the three lists. Verification: demonstration.
  Basis: reported, one user (preferred to chat plus compaction). Status: partial at 088a227c (handover and pre-compact scripts exist in plugins/claudetto/hooks/scripts; no done/waiting/next note found by git grep for STATE.md).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrddd1-experienced-people-give-me-a-cou-20261110T093752Z.md:125-127 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrddd1/experienced_people_give_me_a_couple_tips_please/>).

- [x] **OUT-625** Out (REQ-HANDOVER-039, ADR-0177): one user; a memory write per syntax error costs tokens with no measured gain. claudetto shall have the agent write the fix to the memory file after each command-syntax error, so the error is not repeated and a round trip is saved.
  Acceptance: A command-syntax error is followed by a memory write that names the fix. Verification: demonstration.
  Basis: reported, one user. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xj6245-tips-to-save-usage-and-how-its-a-20261030T103246Z.md:61 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xj6245/tips_to_save_usage_and_how_its_actually_calculated/>).

- [x] **OUT-626** Out (REQ-HANDOVER-040, ADR-0143): it turns auto-compact off and keeps state in files; the handover replaces the compaction summary instead. claudetto shall write session state to files first and then print an in-chat summary that anchors what follows, with auto-compact off; state in files survives a compaction completely.
  Acceptance: The handover writes the state files before it prints the summary. Commenters report a /smart-compact command that updates the plan files, organizes where the session stands and drops it into the chat as a guide; with auto-compact off the context persists in the memory file even if compaction loses nuance. Verification: demonstration.
  Basis: reported, commenters. Status: missing at 088a227c (plugins/claudetto/scripts/pre-compact.ts:1-3@088a227c only prints a keep text and writes no state file).
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1pwt86e-pro-tip-disable-compacting-use-y-20261102T071016Z.md:85,91,121 (url: <https://www.reddit.com/r/ClaudeAI/comments/1pwt86e/pro_tip_disable_compacting_use_your_own/>).

- [x] **OUT-627** Out (REQ-HANDOVER-041, ADR-0178): a 150k trigger is replaced by renewal at a task boundary above 70k. claudetto shall tell agents to make a handoff after 150k tokens in place of compaction.
  Acceptance: A session past 150k tokens writes a handoff. One commenter's rule is never to use compact. Verification: demonstration.
  Basis: reported, one commenter. Status: partial at 088a227c (plugins/claudetto/scripts/pre-compact.ts:1-3@088a227c only prints a keep text; no handoff at 150k).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlublc-how-do-you-survive-the-week-20261102T184526Z.md:89 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlublc/how_do_you_survive_the_week/>).

- [x] **OUT-628** Out (REQ-HANDOVER-042, ADR-0178): the short-session workflow is covered by renewal at task boundaries; the rest is a user workflow. claudetto shall support a short-session workflow: /clear between parts; persistent rules in the rules file and linked .md files with row limits, including a status file of current work, tidied of stale facts; a plan with steps in PLAN.md, then /clear and "do step 1", update the plan, /clear, "step 2"; and at a new project a handover.md that tells how to set up the same infrastructure.
  Acceptance: A plan survives a /clear in a file, and the status file holds current work within its row limit. Verification: demonstration.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xkv0oo-the-3-kinds-of-claude-forgot-onl-20261102T083407Z.md:47,49,51 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkv0oo/the_3_kinds_of_claude_forgot_only_the_first_is_a/>).

- [x] **OUT-629** Out (REQ-HANDOVER-043, ADR-0177): a decisions-and-glossary discipline for files; no measured gain. claudetto shall keep one line per decision plus what was rejected, add new terms to a glossary in the same edit (a glossary term with its first use), not relitigate locked decisions without new evidence, and keep the reason or incident beside each rule; the compaction handoff keeps Decisions and Ruled out in a decisions log with dated one-line decisions, a superseded rule marked replaced on the spot, and a reverse condition and check command per rule so it can be pruned (one file grew from 434 to 1,554 lines in one day).
  Acceptance: the handoff text carries an active or replaced mark per decision; the propose skill carries a glossary line. Reported: without a rationale file 7 of 10 fresh sessions re-proposed an already-rejected simplification, with it 0 of 10 (Reddit post); another run 10 of 10 declined vs 3 of 10, median 18 s vs 43 s; a custom lean system prompt used `@lru_cache` 93% vs 53% default. Verification: test.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto/hooks/features/compaction/texts.ts:9 holds "Ruled out"; git grep for glossary, replaced, superseded in hooks/features/compaction at 088a227c found none; the openspec design.md holds each reason).
  Source: external/2026-10-02/export-I ran 20 fresh Claude Code sessions on the same codebase- Without context, 7-10 recreated the same r.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wv1ahs/i_ran_20_fresh_claude_code_sessions_on_the_same/>); external/2026-10-02/export-I tested whether a custom system prompt for Claude Code makes a difference. 456 API calls later - he.jsonl:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1shogc4/i_tested_whether_a_custom_system_prompt_for/>); plugins/claudetto/hooks/features/compaction/texts.ts:9@088a227c; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:125.

- [x] **OUT-630** Out (REQ-HANDOVER-045, ADR-0177): a long-job workflow with nohup is not a handover behaviour. claudetto shall start a long job with `nohup`/launchd, write a completion marker or exit-code file and poll it once; for multi-session work keep a short TASK.md (goal, decisions, next) read first, state tied to the task, one worktree per session, and a shared-folder note of inter-session agreement (what is needed and why).
  Acceptance: Reported: Remote Control kills background jobs after about 2 h and its monitor about every 30 min. Sessions are `.jsonl` under `~/.claude/projects` (grep to find which folder held a topic); a PM session per plan phase never brings a problem without a recommendation; cloud-to-local messaging is one-way. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-07_p2/export-Engineers who write all their code with claude now- how do you do it-.jsonl:113 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wgm4si/engineers_who_write_all_their_code_with_claude/>).

- [x] **OUT-631** Out (REQ-HANDOVER-046, ADR-0178): a 75% trigger is a percent trigger, not a task boundary; renewal above 70k at a boundary covers the case. claudetto shall start a handoff at 75% of context when compaction is off (`DISABLE_COMPACT=1`), and tie every compaction-disabled path to that self-imposed trigger, because with a 300k window 10 of 43 main sessions ended "Prompt is too long" (14 occurrences) and subagent hand-backs of 88k and 103k arrived into a full context. A user estimate is not a trigger. Subagents write notes to files, not inline; status lives in tasks.md and survives `/clear`.
  Acceptance: with compaction off, a session that reaches 75% of its window gets a handoff written before the next turn. Verification: test.
  Basis: measured. Status: missing at 088a227c (no 75% trigger exists in hooks/features/compaction).
  Source: external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:29; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:134; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:31; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:157.

- [x] **OUT-632** Out (REQ-HANDOVER-047, ADR-0178): superseded by renewal at task boundaries. claudetto shall wind a session down on context share: finish the current unit, write the handoff (done, next, rejected plus why), end the session, and let the new session read it.
  Acceptance: a context hook that reads the window size tells the session to wait for subagents, write the handoff, and start a new one; reports span 15% left of 1M, 30%, 40-50%, 55%, 60-65%, 70-80%, and 150k/175k/250k/300k (variant: note at 50%, native auto-compact as backstop at 70%; author measured ~30% less re-read on replay of own sessions; 78 of last 82 auto-compactions landed mid-task; needs mods, 2.1.287+). The model cannot read its own context. Minority view: with OpenSpec holding the plan, auto-compact at 300k works. Verification: test.
  Basis: reported, consensus; some author-measured. Status: partial at 088a227c (`handoff.ts` fork writes handoff at auto-compaction and at 59 minutes of age; trigger by percent, task boundary, and hot-context split missing). Hook events PreCompact, PostCompact, SessionStart, and Stop are in the 2.1.327 event list (chunk-ja5z738t.js@5637); `$.session.compact` and the `session.compact` event are verified on 2.1.327 (claude-code.d.ts@141519, @235691).
  Source: external/2026-10-25_p2/reddit.com-r-claudeai-comments-1x95lff-about-30-less-context-reread-cla-20261025T162138Z.md:67; external/2026-10-27/reddit.com-r-claudecode-comments-1x776ms-auto-handoff-are-the-best-new-20261026T134539Z.md:62 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x776ms/auto_handoff_are_the_best_new_feature/>); external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:29; plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; merged with plan:1158 (handoff fork replaces the built-in summary, have).

- [x] **OUT-633** Out (REQ-HANDOVER-048, ADR-0184): the driver owns -p renewal, and a relaunch file with hops is a second renewal path. claudetto shall start a clean-break relaunch only when a relaunch file is armed, fresh (under 10 minutes), and under 10 hops, and shall refuse (exit 2) on an invalid handoff or running background tasks.
  Acceptance: a wrapper relaunches `claude --name` with seed "claim and continue handoff <path>"; a Stop hook arms it; a detached killer SIGTERMs only when idle (gives up in 30 s); handoff status goes open to claimed; a dead-man wakeup at about 150 s re-runs and notifies; never `--resume`. A hook writing progress to a `.md` at each compaction cut reread cost from 23% to about 8% of usage (one dashboard). Verification: test.
  Basis: reported, author-measured. Status: missing at 088a227c. The Stop hook and `$.process.spawn` are present in 2.1.327 (chunk-ja5z738t.js@5637; chunk-dafpvz32.js@3656); `$.session.compact` and `$.session.send` are verified on 2.1.327 (claude-code.d.ts@141519, @142251).
  Source: external/2026-10-27/reddit.com-r-claudecode-comments-1x776ms-auto-handoff-are-the-best-new-20261026T134539Z.md:62,83 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x776ms/auto_handoff_are_the_best_new_feature/>); external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:8; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:153.

- [x] **OUT-634** Out (REQ-HANDOVER-049, ADR-0178): superseded by renewal at task boundaries above 70k. claudetto shall stop at a context ceiling and hand off: keep sessions about 250-400k tokens even with a 1M window; never walk away over an hour without a compact or handoff.
  Acceptance: a hook stops and hands off at about 250k context. Reports: no loss at about 500k, noticeable past about 700k, long text blocks at about 800k; orchestrator never past 50%, retired after about a day; main session takes notes and clears at 30%; relay at 200-300k. Conflict: one author measured 9,096 turns over 52 sessions with rule violations falling from 8.7% at 0-20% fill to 5.5% at 80-100% (odds ratio 1.01 per +10 points, p=0.43; setup re-injects rules every turn so it may not generalize) against reports of instructions dropped late; a claim of about 1 in 4 mid-window instructions lost at half context has no source. Verification: test.
  Basis: reported, anecdotal; one measured. Status: partial at 088a227c (`plugins/claudetto/hooks/features/repeat/repeat.ts`; ceiling gate missing). `/autocompact` is named in the 2.1.326 release notes; `/context` is verified on 2.1.327 (chunk-m14bt1pz.js@2165187), as is `/autocompact` (@2163430).
  Source: external/2026-10-12/export-I measured rule-following against context fill across ~9,100 turns of my own Claude Code sessions. I.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x2g2k2/i_measured_rulefollowing_against_context_fill/>); external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:139; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:65; merged with plan:1159 (hook that auto-stops at about 250k, missing); <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [x] **OUT-635** Out (REQ-HANDOVER-050, ADR-0071): text.ts FORK_PROMPT fixes the handover fields (Goal, Done, Next, Files, Commands, Constraints); a second field list conflicts. claudetto shall write each handoff with these fields: current goal; state tagged done, in progress, stopped, reverted, or untrusted; files touched and git diff; decisions with reason; what failed and what not to retry; what is known true; verification command and result; exact artifact and log paths; next smallest action; commands that run; why it stopped (waiting on the user, on a decision, or blocked outside).
  Acceptance: a handoff omits old attempts and transcript history; keeps persistent repo rules apart from transient notes; marks a changed decision's predecessor `superseded`; holds facts only; the next session cross-checks it against the repository before editing. Shapes offered: fork variant (goal, state and proof, next step, decisions and why, ruled-out approaches, open questions, files and commits, verify command, last 10 prompts verbatim); 5W1H; decision matrix with a number per decision; a `verify` line the resumed session runs first. A handoff written mid-task has a non-empty In Progress section, a Next Steps section, the user's standing rules, and the path of the full transcript. Verification: test.
  Basis: reported, convergent. Status: partial at 088a227c (`handoff.ts` fork writes handoff; field list and superseded marking not verified).
  Source: external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:44 (decision matrix); plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c. The 5W1H and last-10-prompts wording was not located in external/; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:8710 (handoff of 2026-11-15: user complaint that a handoff came at random in the middle of work and an order to read the previous session); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10 (In Progress: None given), 2026-11-12.

- [x] **OUT-636** Out (REQ-HANDOVER-051, ADR-0143): the pickup step is the `prompt.context` block after /clear and the compaction message; handoff files are superseded. claudetto shall pair a handoff writer with a pickup step, and the handoff shall be visible and editable.
  Acceptance: `/handoff` writes the file and reminds the user of the other two steps (`/clear`, then read the file); the user can inspect and edit the handoff before `/clear`; the handoff is scanned for side effects because `/clear` detaches background tasks and scratchpads. Plan lives in a file, one fresh session per SDLC step, one human checkpoint before commit. A sceptic: a handoff is compaction with more steps but visible. Verification: demonstration.
  Basis: reported, consensus. Status: partial at 088a227c (`handoff.ts`, fork variant only; pickup step missing). Commands in 2.1.327: `/export` (chunk-m14bt1pz.js@2529670) and `/btw` (chunk-m14bt1pz.js@2155524) found by code search; `/clear` and `/compact` are named in the release notes; `/rewind` is verified on 2.1.327 (chunk-m14bt1pz.js@2519344); `/export` (@2529652) and `/btw` (@2155506) are also present.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xd75g2-compactions-vs-handoffs-lets-set-20261102T070448Z.md:73 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xd75g2/compactions_vs_handoffs_lets_settle_this_right/>); plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; merged with plan:1149.

- [x] **OUT-637** Out (REQ-HANDOVER-052, ADR-0143): a PreCompact flush and re-read file are superseded by the handover in context. claudetto shall flush state and plan to memory in a PreCompact hook and reload them after compaction, and shall re-read the durable "why" file as a required checkpoint after any compaction.
  Acceptance: plan-approval state survives a compaction; a SessionStart hook (fires on compact and resume) prints a file of about 4 bullets with the skill's key rules. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/scripts/pre-compact.ts` via hooks.json; post-compact re-read gate missing). `SessionStart` and `PreCompact` are in the 2.1.327 hook event list (chunk-ja5z738t.js@5637).
  Source: external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:57; plugins/claudetto/hooks/hooks.json@088a227c; merged with plan:1155.

- [x] **OUT-638** Out (REQ-HANDOVER-054, ADR-0177): the machine-RAM memory guard (hold.ts) has no measured gain over vanilla and is not in the rebuild. claudetto shall hold a memory-guard that counts missed polls before going blind, covers background jobs a subagent leaves running past its turn, and keeps deny-with-actionable-reason, never an order to wait.
  Acceptance: a memory hold that misses polls reports the count; a deny carries a reason the model can act on. Verification: test.
  Basis: read (`hold.ts` at 088a227c). Status: partial at 088a227c (`plugins/claudetto/hooks/features/memory/hold.ts:29` sets `MISSES_BLIND = 3` and `:166-169` logs the missed polls; `:133-155` keeps polling background calls; the deny wording is this item's target).
  Source: plugins/claudetto/hooks/features/memory/hold.ts@088a227c.

- [x] **OUT-639** Out (REQ-HANDOVER-057, REQ-HANDOVER-018, REQ-HANDOVER-061): duplicate of the renewal items 018 and 061. claudetto shall favour one task per session and move a session at a task or phase boundary, not at a percent: write handoff notes (goal, done, next, decisions) before the `/clear`, and start the next session from that file. Context stays 150-250k tokens (500k at most) and under about 150 turns; tasks are planned below 150k.
  Acceptance: a `/clear` between unrelated tasks follows a handoff file holding goal, done, next, decisions; the next session reads it; the handover flow can end a session at a task boundary and start the next with the handover. Verification: demonstration.
  Basis: measured (one author priced six months of transcripts: 56% of spend was context re-reads after the cache discount, about 20% useful work, almost half of calls above 200k tokens); reported (auto-compact capped at 350-400k gave about 30% more weekly use; a 250k-token cache miss cost about 18% of an hourly window on a $20 plan; user preference for one task per session with a handover at its end over long sessions). Status: partial at 088a227c (a fork writes a handoff at auto-compaction and at 59 minutes of age; the task-boundary trigger is missing).
  Source: external/export-I ran out of codex on chatgpt pro with 4 days left. how hard is it to actually kill max 20x with opu.jsonl:24 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wqjb89/i_ran_out_of_codex_on_chatgpt_pro_with_4_days/>); plugins/claudetto/hooks/features/compaction/handoff.ts:67@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09).

- [x] **OUT-640** Out (REQ-HANDOVER-058, ADR-0178, ADR-0071): a 75% trigger conflicts with boundary renewal; the schema is the six sections in text.ts. claudetto shall write the handoff as a schema, not a free summary: goal, state with proof, decisions and why, ruled-out approaches, verify command, files touched, last N user prompts verbatim; and shall trigger it near 75% of context ("This conversation is at 75% of its context"). The fork request carries only prompt and effort, no `maxTokens`; the cap is a word limit in the prompt (under 1,500 words); the classic PreCompact hook stays for `/compact`, subagent compaction, and fork failure; the fork prompt imports its keep text so one copy exists. Durable state on disk (progress.md, decisions/) is re-read by PostCompact and SessionStart hooks; each handoff decision is marked active or replaced; a file-based checkpoint (goal, completed and verified, live units, blockers, unsaved state, next exact command) is written near 180k or at batch end, a hook watches for it, and a pickup step reads the newest after `/clear`.
  Acceptance: a handoff holds all seven schema fields; one run at 75% context writes it before the window fills. Handoff template when leaving a chat: done, verified, open, what not to touch; stable facts go once into project instructions. Reset at task boundaries, not token counts: at task done write the handoff (done, next, red test), then `/clear` or compact; one harness resetting near 225K reported cost down 50-75%; compact manually above 300K at unit-of-work boundaries; a PreCompact hook at 350-380K performed like a `/handoff` skill. Measured counterpoint: auto-compact fired at 967k, 972k, 983k and kept 12k, 11k, 15k (about 1.3%). Verification: test.
  Basis: measured (one session log: handoff at 75% worked, session log c8c0cf57; subagents writing notes to files instead of inline returns, session log 157f1ff7; the counterpoint); the schema is a catalog recipe and a "handoff-compact" mod. Status: partial at 088a227c (`plugins/claudetto/hooks/features/compaction/texts.ts` holds ruled-out and verify-command wording).
  Source: external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:75; external/export-Are you manually compacting-handing off, or using auto compact with 5.5-.jsonl:25 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wp4ga1/are_you_manually_compactinghanding_off_or_using/>); external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:153-158; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:183 (thread url: <https://www.reddit.com/r/ClaudeAI/comments/1wwk4y5/>).
  Conflict: claudetto shall write each handover from checked state.
  Conflict: claudetto shall keep the handoff file free of the user's profanity.

- [x] **OUT-641** Out (REQ-HANDOVER-062, ADR-0087, ADR-0177): a process statement with no acceptance behaviour. claudetto shall choose its handover design from cheap trial and error and probes, which include the cost of a long session's context re-send (up to 8 hours) and the mix of 0 to 2 compactions with a handover.
  Acceptance: a probe record compares the options and names the most effective and stable one. Verification: probe.
  Basis: reported. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09).

- [x] **OUT-642** Out (REQ-HANDOVER-064, ADR-0143): handoff files are superseded; `claude --resume` continues a named session in vanilla. claudetto shall let a new session continue the work of a named earlier session from its handoff file.
  Acceptance: A new session started with an earlier session ID reads that session's handoff file and names what is done and what is open. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c writes a handoff; resume by session ID is not checked).
  Source: reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:8`); reported, user, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/05884638-c1a2-4b41-83af-50464f374189.jsonl:17`); reported, user, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:2796`).

- [x] **OUT-643** Out (REQ-HANDOVER-065, REQ-HANDOVER-067): paraphrasing corrections contradicts the word-for-word keep line. claudetto shall keep the handoff file free of the user's profanity and make it hold the user's corrections in paraphrase.
  Acceptance: A handoff file written after a corrected turn holds the correction in the agent's words. Verification: inspection.
  Basis: observed in transcript. Status: partial at 088a227c.
  Source: observed in transcript, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:5054`; the agent's note says the file holds the corrections word for word).
  Conflict: claudetto shall write the handoff as a schema, not a free summary.

- [x] **OUT-644** Out (REQ-HANDOVER-068, ADR-0071): the fork writes the handover; the extract fallback (text.ts extract) keeps user prompts cut to 500 characters. claudetto shall build the handoff content from prompts with `origin.kind == "human"` in the whole transcript, quote the last 100 verbatim under "Standing instructions" and "Decisions log" (none: neither section, no invention), date the git state, inject no handoff older than the resumed transcript on resume, redact the read-back through betterleaks, and carry the ledger text and open-items list word for word. A `/goal` survives a handoff clear: no typed interface exposes the active goal, so a `command.run` hook records the last `/goal <condition>` (`/goal clear` forgets it), and `clearAndSubmit` runs `$.command.run({command:"goal", args})` after the clear and before the read-back; a refused goal is named and the handoff is still sent. The handoff notice lists each open task as the model's own, the user's only a step the user alone can take, and continues in the same turn.
  Acceptance: a goal set before a handoff is set after it. Verification: test.
  Basis: measured. Status: partial at 088a227c ("Standing instructions" is absent; the goal restore is tested in hooks/features/compaction/handoff.test.ts:170).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-handoff/spec.md:149; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:618; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:35.
  Conflicts with: The advisor tool stays disabled; no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).

- [x] **OUT-645** Out (REQ-HANDOVER-069, REQ-KERNEL-023): the "context, not an order" rule is KERNEL-CONDUCT; the handover header change is in the build list. claudetto shall make each handoff cite its evidence, carry the user's words, and set no order, with the user's goal outranking it.
  Acceptance: a handoff holds a proof for each done piece, the user's latest prompts, and a note that the goal outranks the handoff; its Next section orders nothing the user ruled out. Verification: inspection.
  Basis: user decision, 2026-11-16 15:17 UTC, the handoff is stale; the goal outranks it (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8192); user decision, 2026-11-16 15:17 UTC, do not trust the handoff as authoritative (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8206). Status: partial at 088a227c (`plugins/claudetto/hooks/features/compaction/texts.ts` asks for State with proof and User's words verbatim; no line says the goal outranks the handoff).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Handoff: fresh, cites evidence, quotes user, sets no order; the goal outranks it).

- [x] **OUT-646** Out (REQ-HANDOVER-070, ADR-0178): renewal never fires while background work runs (renewal.test: "background work holds the boundary"); one observation otherwise. claudetto shall make a handoff list each worker still running, with its task and worktree.
  Acceptance: a handoff written while a background worker runs names that worker in In Progress or State. Verification: test.
  Basis: observed in transcript, 2026-11-12. Status: missing at 088a227c (the handoff prompt names no section for running workers).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/a106dac3-8014-4a19-a503-e4426f00617b.jsonl:210 (the agent reply names four workers running in their worktrees while the handoff reads "None given" under In Progress).

- [x] **OUT-647** Out (REQ-HANDOVER-071, REQ-KERNEL-009): duplicate of the kernel handoff-to-user rule. claudetto shall mark a task "user's only" only when the user alone can take it, and the agent shall take every other open task.
  Acceptance: a task the user said they cannot do is not marked user's only; the next session takes it or finds another way. Verification: inspection.
  Basis: reported, user, 2026-11-16 04:41 UTC, do all but a login yourself (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8321); reported, user, 2026-11-14 02:48 UTC, nobody asked you to defer to the user (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31470). Status: partial at 088a227c (`texts.ts` carries the rule in the Next line; it did not hold).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057 (the user said they cannot score anything; the handoffs had marked holdout scoring user's only).

- [x] **OUT-648** Out (REQ-HANDOVER-073, ADR-0177): claudetto loads no session-start text, and the fork prompt caps the handover at 3,000 tokens. claudetto shall keep any text it loads at session start to at most 40 lines, pointing to files for the rest, and shall keep each memory or state file it writes to at most 80 lines.
  Acceptance: a test counts lines of the SessionStart injection and of every file written by the handover and memory paths, and fails above 40 and 80. Two commenters report that a memory file past about 80 lines stopped being read and a boot file of 40 lines plus lookups kept context small. Verification: test.
  Basis: reported (two commenters, n=2, no measurement). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-ai-agents-comments-1xx5l8s-im-tired-of-ai-explaining-thing-20261118T123732Z.md:346 (url: <https://www.reddit.com/r/AI_Agents/comments/1xx5l8s/im_tired_of_ai_explaining_things_instead_of/>); external/2026-11-18/reddit.com-r-claudecode-comments-1xy9mba-followup-2-weeks-later-i-built-20261117T231817Z.md:102-104 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xy9mba/followup_2_weeks_later_i_built_the_hooks_sqlite/>); reports/2026-11-18-research/dossier.md:51.

- [x] **OUT-649** Out (RISK-121, ADR-0177): field reports from commenters, no reproduction, and claudetto writes no memory file. A memory file stuffed with rules, or too many skills, degrades the work.
  - Category: handover.
  - Cause: a memory file filled with too many rules; a badly written skill that forces the model's thinking pattern; a project process that did not keep up as the project grew.
  - Event: output quality falls and usage rises.
  - Consequence: a wasted session or spend.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: none found for rule count; memory-as-index in the old plan (plan line 1101).
  - Response: mitigate.
  - Actions: remove the rules from the memory file (reported to restore quality); rework the process (usage down 40% with better output, one user); keep sessions under 200k with a clear prompt at 350k (one user, majority of sessions under 150k). All field reports from Reddit commenters; the figures need the commenters' own sessions, so Likelihood comes from report count.
  - Trigger: quality falls after the memory file or skill set grows.
  - Owner: handover
  - Status: open.
  - Source: external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:147; external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:151; external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:349; external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:63 (url: <https://www.reddit.com/r/claude/comments/1xarg51/opus_55_officially_nerfed/>).
  - Conflict: An added guardrail costs context and focus, yet removing rules brings wild behaviour; one run created an empty git folder.

- [x] **OUT-650** Out (RISK-122, ADR-0177): accepted anecdote with no cure and no action. An added guardrail costs context and focus, yet removing rules brings wild behaviour; one run created an empty git folder.
  - Category: handover.
  - Cause: each guardrail adds context that costs focus on the task.
  - Event: the agent creates an empty git folder where it should not, three times in a few days.
  - Consequence: tests fail; an extra turn at least.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none found.
  - Response: accept.
  - Actions: none stated in the source.
  - Trigger: tests fail after an empty git folder appears.
  - Owner: handover
  - Status: open.
  - Source: external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:199; external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:195; external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:277 (url: <https://www.reddit.com/r/claude/comments/1xarg51/opus_55_officially_nerfed/>).
  - Conflict: A memory file stuffed with rules, or too many skills, degrades the work.

- [x] **OUT-651** Out (RISK-124, ADR-0177): one report; claudetto runs no tidy pass. Tidy pass reverts a deliberate rule change.
  Category: agent
  Cause: A new line was edited in place over the old rule, so a tidy pass could not tell a reversal from a typo.
  Event: The tidy pass "fixes" rules back to the old version.
  Consequence: A rule change is lost.
  Likelihood: 1
  Impact: 3
  Existing controls: none at 088a227c
  Response: mitigate
  Actions: A supersedes pointer from the new line to the old line.
  Trigger: A tidy pass restores a replaced rule.
  Owner: handover
  Status: open. Basis: reported.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbnwcw-a-month-of-my-claude-code-agen-20261022T044334Z.md:105 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbnwcw/a_month_of_my_claude_code_agents_writing_down/>).

- [x] **OUT-652** Out (RISK-127, ADR-0177): repo hygiene of a user project, not a claudetto behaviour; no measured gain. An agent that can see an obsolete design wires it back in.
  Category: handover
  Cause: Old designs left in the repo look current to an agent (40 reinvented hex-cell versions; an engine wired to play old and new rules).
  Event: Reported: an agent finds an old design and starts rewiring it; the poster keeps the old pile in an "Alpha POC" repo and a structured "Beta" repo the agent cannot see, and measured "is this decoupled?" as 289 outside imports and 17 exports after a week of cleanup.
  Consequence: Dead code returns and the structure rots.
  Likelihood: 2
  Impact: 3
  Existing controls: none found.
  Response: mitigate
  Actions: Keep the old pile where the agent cannot see it; fold specs into one manual in the same PR as the feature, then delete them.
  Trigger: An edit imports a module marked obsolete.
  Owner: handover
  Status: open
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xv2oax-ai-slop-without-architecture-i-20261116T052334Z.md:33,47,127,213,220 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xv2oax/ai_slop_without_architecture_is_how_providers/>).

- [x] **OUT-653** Out (RISK-128, ADR-0189): phone approvals and chat IDs are not part of claudetto. A second session opens under a live session ID, and an approval lands in the wrong session.
  Category: handover
  Cause: A second session opened under a chat ID still live passed every start check; a yes typed from a phone landed in the wrong session; a yes relayed by another agent was taken as consent.
  Event: Reported by one poster.
  Consequence: Two sessions write at once; an action runs on a stray yes.
  Likelihood: 1
  Impact: 3
  Existing controls: none found.
  Response: mitigate
  Actions: Check for a twin before any write; give approvals as a card or tap button, never free text; one yes covers one message once and any edit needs a new yes; only the user's own message counts, a yes relayed by another agent is input.
  Trigger: A session start finds another live session on the same ID.
  Owner: handover
  Status: open
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvc77s-i-rewrote-my-claude-code-sessi-20261116T051759Z.md:31,41,69 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvc77s/i_rewrote_my_claude_code_session_rules_41_times/>).

- [x] **OUT-654** Out (RISK-129, ADR-0177): one report, no reproduction. A fresh session trusts old code comments and sees the code as saner than it is.
  Category: handover
  Cause: A fresh session reads prior comments and over-trusts them.
  Event: A commenter's screenshot job overwrote covers while its comment said it filled blanks.
  Consequence: A wrong fix built on a false comment.
  Likelihood: 1
  Impact: 3
  Existing controls: Plan covers context-file drift only.
  Response: mitigate
  Actions: Read the code, not its comments, for a claim that matters.
  Trigger: A change cites a comment as its only evidence.
  Owner: handover
  Status: open
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xta125-nondev-here-about-18m-lines-of-20261116T051840Z.md:129 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xta125/nondev_here_about_18m_lines_of_claude_code_output/>).

- [x] **OUT-655** Out (RISK-130, ADR-0177): the commenter's guess needs a paid run; one report. Reference doc loses weight in a full window.
  Category: agent
  Cause: The more files and context the window holds, the less a reference document is weighed, even when the prompt says to reread it (field report from a Reddit thread; the mechanism is the commenter's guess and needs a paid live run to measure).
  Event: The model performs reading ("Ok I read it again") without engaging with the document.
  Consequence: The agent ignores facts in the document while claiming to use them.
  Likelihood: 1
  Impact: 3
  Existing controls: none at 088a227c
  Response: mitigate
  Actions: Keep the reference small; split work so the document sits in a fresh context (see split generation across threads).
  Trigger: The agent claims a reread and the output contradicts the document.
  Owner: handover
  Status: open. Basis: field report kept as reported; Likelihood from report count.
  Source: external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:451 (url: <https://www.reddit.com/r/ChatGPT/comments/1tpk1qk/how_to_avoid_the_pink_elephant_paradox/>).

- [x] **OUT-656** Out (RISK-136, ADR-0177): a git and worktree habit, not a handover behaviour; no measured gain. Two sessions write to one branch and one build folder.
  - Category: handover.
  - Cause: A reloaded session and a still-running process both work on the same branch; one moves the branch and leaves staged files from another branch.
  - Event: 232 commits arrive from another process; the branch is switched and an unrelated bump is staged.
  - Consequence: Cross-branch changes, a stash, and a blocked agent.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: the agent stops when it sees a second writer.
  - Response: mitigate.
  - Actions: On a reload, check for a live process on the same checkout before writing; stay on the task's branch; put unrelated staged files in a stash with the user's word.
  - Trigger: A commit on the branch that this session did not make.
  - Owner: handover
  - Status: open.
  - Source: observed in transcript, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:2883`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:2949`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:3033`); reported, user, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:4227`).

- [x] **OUT-657** Out (RISK-142, ADR-0177): one report; auto memory stays vanilla. Opus 5.5 quotes a user verbatim as a "ruling" in a file, then paraphrases it narrower.
  - Category: agent fault
  - Cause: Opus 5.5 writes rules and memory from what the user said.
  - Event: The rule file holds a quoted ruling that is later narrowed by paraphrase.
  - Consequence: The saved rule no longer says what the user said; a narrowed instruction. Likelihood: 1.
  - Likelihood: 1 (one report)
  - Impact: 3
  - Existing controls: none found at 088a227c
  - Response: mitigate
  - Actions: Disable auto memory; ban Opus from writing rules; shape behaviour through the output style; do work that matters in Fable (as the reporter did); write "user decision" with its date; do not narrow.
  - Trigger: A rule file entry that differs from the user's words; the word "ruling" in a reply or plan file.
  - Owner: handover
  - Status: open.
  - Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrpkdt-what-even-is-the-point-of-workin-20261110T094812Z.md:110; external/2026-11-10/reddit.com-r-claudeai-comments-1xrpkdt-what-even-is-the-point-of-workin-20261110T094812Z.md:106 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrpkdt/what_even_is_the_point_of_working_rules_lol/>); openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:49 (reported, one Reddit post).

- [x] **OUT-658** Out (RISK-143, ADR-0177): claudetto writes no notes or memory files. Notes and rules that pile into one file contradict each other and the model cannot know which one the user still means.
  Category: agent fault
  Cause: Notes accumulate without pruning; Opus 5.5 writes much to memory and seldom follows it
  Event: The agent re-fixes an old bug, follows a time-sensitive budget note, or follows both of two contradicting rules
  Consequence: Wrong work; the model follows whichever rule it attends to
  Likelihood: 2 (two or more reports)
  Impact: 3
  Existing controls: none found at 088a227c
  Response: mitigate
  Actions: Prune on contradiction with the newer winning and past best examples archived apart; keep memory and notes clean; delete the old rule when it changes
  Trigger: Two rules on one subject in one file
  Owner: handover
  Status: open
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs4oh8-how-we-stopped-getting-generic-o-20261110T094228Z.md:59; external/2026-11-10/reddit.com-r-claudeai-comments-1xs4oh8-how-we-stopped-getting-generic-o-20261110T094228Z.md:71 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs4oh8/how_we_stopped_getting_generic_output_from_claude/>); external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:317; external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:319 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrw5rg/are_you_serious/>).

- [x] **OUT-659** Out (RISK-144, ADR-0177): one report of a user feedback queue, not a claudetto behaviour. An agent accepts another agent's feedback-queue recommendations wholesale and one silently reverses a settled decision.
  Category: agent fault
  Cause: The queue drain applies every recommendation
  Event: A decision made a week earlier is reversed with no notice
  Consequence: A settled decision is undone
  Likelihood: 1 (one report)
  Impact: 3
  Existing controls: none found at 088a227c
  Response: mitigate
  Actions: When draining the queue, pull anything that would undo a settled decision out as a question for the user and apply the rest
  Trigger: A queue item that touches a decision
  Owner: handover
  Status: open
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:56; external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:60 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xryuvz/how_often_do_you_face_decisions_getting_lost_in/>).

- [x] **OUT-660** Out (RISK-145, ADR-0177): one anecdote; the handover path already replaces core auto compaction. The safety classifier stops a session at auto compaction.
  Category: product failure.
  Cause: One commenter on the Xbox 360 kernel thread met safety stops only when auto compaction ran; with a prepared Ghidra MCP, a toolchain and an owner-dumped kernel there were none. The commenter says refusals rise with active analysis and patching, not on already-decompiled output.
  Event: A refusal fires while a compaction reads the long reverse-engineering context.
  Consequence: The compaction fails or the session stalls at a point the user did not choose.
  Likelihood: 1 (one report).
  Impact: 3 (a stalled session).
  Existing controls: Handover replaces core auto compaction by default (user decision, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369)), so the compaction call that trips the classifier does not run.
  Response: mitigate.
  Actions: Keep the handover path as the default; keep manual /clear writing a handover first. Probe on claude 2.1.326 whether a handover turn trips the same stop.
  Trigger: A safety stop reported during a compaction or handover turn.
  Owner: handover.
  Status: open.
  Basis: reported (one commenter).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgtghe-claude-code-reverseengineered-th-20261028T060614Z.md:165 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xgtghe/claude_code_reverseengineered_the_xbox_360_kernel/>)

- [x] **OUT-661** Out (RISK-146, ADR-0177): one anecdote; auto memory stays vanilla. One rejection in one thread is saved as a permanent "never" memory.
  Category: agent failure.
  Cause: The agent saved "never use green" after one rejection as too green; its self-written rules read as laws the user wrote (reported, anecdotal).
  Event: A one-off correction becomes an absolute memory rule.
  Consequence: Later sessions refuse a valid choice.
  Likelihood: 1 (one anecdote).
  Impact: 2 (an extra turn).
  Existing controls: None at 088a227c: `hooks/features/memory/` is the machine-RAM hold (`hold.ts`, `texts.ts`), not saved notes; no rule says to save feedback as memory (`surface/texts.ts:29` holds only the interview text for memory files).
  Response: mitigate.
  Actions: A self-editing rules file capped at 5k words, audited at each session end with a question on what would make it protective; relative feedback such as "40% less green".
  Trigger: A memory entry with "never" or "always" from a single correction.
  Owner: handover.
  Status: open.
  Source: external/2026-10-30/reddit.com-r-claude-comments-1xify5n-im-literally-paying-claude-to-argu-20261029T115222Z.md:57; external/2026-10-30/reddit.com-r-claude-comments-1xify5n-im-literally-paying-claude-to-argu-20261029T115222Z.md:85 (url: <https://www.reddit.com/r/claude/comments/1xify5n/im_literally_paying_claude_to_argue_with_me_about/>)

- [x] **OUT-662** Out (RISK-148, ADR-0177): one commenter; claudetto ships no notes index. An index the agent may skip is skipped when the agent feels confident.
  Category: agent failure.
  Cause: A notes index depends on the agent choosing to read it; the confident runs are the ones that skip it.
  Event: The agent starts work on a module without reading its note.
  Consequence: The agent acts on missing context.
  Likelihood: 1 (one commenter).
  Impact: 2 (an extra turn).
  Existing controls: None at 088a227c (no notes-index code).
  Response: mitigate.
  Actions: Turn "check the notes" from a pointer into a command the agent runs, one tool call that prints a module note plus everything it links; a path-scoped rule for that folder can carry the line. This makes the agent skip less, though not never.
  Trigger: A pointer in the rules file to notes with no command behind it.
  Owner: handover.
  Status: open.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xalih0-for-those-running-claude-code-on-20261102T084737Z.md:49 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xalih0/for_those_running_claude_code_on_large_monorepos/>)

- [x] **OUT-663** Out (RISK-149, ADR-0177): one commenter; the source names no fix. Two sessions open at once on one project never share what one learned.
  Category: agent failure.
  Cause: A notes file changes only when someone writes to it; nothing was forgotten, but what one session learned or decided never reached the other.
  Event: Two sessions work on the same project at the same time.
  Consequence: The second session acts on stale knowledge.
  Likelihood: 1 (one commenter).
  Impact: 3 (a wasted session).
  Existing controls: None at 088a227c (no shared-notes code).
  Response: mitigate.
  Actions: Not stated in the source; the commenter names the fault as a possible fourth scope of forgetting.
  Trigger: Two sessions open on one project.
  Owner: handover.
  Status: open.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xkv0oo-the-3-kinds-of-claude-forgot-onl-20261102T083407Z.md:61; external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xkv0oo-the-3-kinds-of-claude-forgot-onl-20261102T083407Z.md:63 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkv0oo/the_3_kinds_of_claude_forgot_only_the_first_is_a/>)

- [x] **OUT-664** Out (RISK-152, ADR-0177): one author; claudetto writes no memory file. An oversized memory file burns the weekly limit.
  - Category: cost.
  - Cause: The agent writes code into memory instead of short notes; one Pro user spent about 20% of a weekly limit in one evening because memory held about 110 KB of section code plus a "read before every task" note.
  - Event: Each chat loads 100+ KB first; about 20% of a Pro weekly limit went in one evening; a large memory file loads every session or every task.
  - Consequence: wasted spend; behavior varies between projects (auto memory recorded stale "working" claims).
  - Likelihood: 1 (one author, found by listing)
  - Impact: 3
  - Existing controls: none at 088a227c (no memory size warning); `plugins/claudetto/hooks/features/memory/` partial.
  - Response: mitigate.
  - Actions: Ask the model to list memory files with sizes and trim to short notes; keep notes short; warn on big memory files; load big files lazily; auto-memory loads the first 200 lines of `MEMORY.md`; memory as index only, so the model confirms a function or path still exists before editing; reword memory from "reference data" to "follow each one that applies" (cut violations 26 to 11 of 101); keep changing facts in repo files whose edits show in a git diff; keep project state vendor-neutral in repo markdown. 2.1.327: tools `memory_list`/`memory_read`/`memory_write` present (code search "memory_list", chunk-jvme5rqc.js@114306); `/memory` named in the 2.1.327 release notes.
  - Trigger: A memory file over a size limit; a memory file over 200 lines or about 100 KB.
  - Owner: handover
  - Status: open.
  - Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xtwsa2-memory-can-silently-burn-your-us-20261111T234836Z.md:33; external/2026-11-13/reddit.com-r-claudeai-comments-1xtwsa2-memory-can-silently-burn-your-us-20261111T234836Z.md:35; external/2026-11-13/reddit.com-r-claudeai-comments-1xtwsa2-memory-can-silently-burn-your-us-20261111T234836Z.md:45; external/2026-11-13/reddit.com-r-claudeai-comments-1xtwsa2-memory-can-silently-burn-your-us-20261111T234836Z.md:33 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xtwsa2/memory_can_silently_burn_your_usage_suggestion/>); external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:269 (26 to 11).

- [x] **OUT-665** Out (RISK-153, REQ-HANDOVER-070): renewal waits for background work; one observation. A handoff omits the workers still running.
  Category: handover
  Cause: The handoff reads "None given" under In Progress while four workers run in their worktrees.
  Event: The next session does not know the workers exist and repeats or collides with their work.
  Consequence: Duplicate work or a merge conflict.
  Likelihood: 1
  Impact: 3
  Existing controls: The agent reply before the handoff listed the workers.
  Response: mitigate
  Actions: Add a running-workers section to the handoff prompt; list each worker, its task, and its worktree.
  Trigger: A handoff is written while a background worker runs.
  Owner: handover
  Status: open
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/a106dac3-8014-4a19-a503-e4426f00617b.jsonl:210; observed in transcript, 2026-11-12

- [x] **OUT-666** Out (RISK-154, REQ-KERNEL-009): duplicate of the kernel handoff-to-user rule, one report. A handoff marks a task user's only that the user cannot do.
  Category: handover
  Cause: The handoff prompt asks to mark a task user's only when the user alone can take it; the agent marked the holdout scoring round so.
  Event: The user answered that they cannot score anything and the plan stalled.
  Consequence: An open task no one takes.
  Likelihood: 1
  Impact: 3
  Existing controls: The handoff opening tells the next session to take each open task itself.
  Response: mitigate
  Actions: Ask before marking a task user's only; see REQ-HANDOVER.
  Trigger: A handoff marks a task user's only.
  Owner: handover
  Status: open
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057; reported, user, 2026-11-16 04:41 UTC, do all but a login yourself (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8321); reported, user, 2026-11-14 02:48 UTC, nobody asked you to defer to the user (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31470)

#### You Should Know Port

- [x] **OUT-667** Out (REQ-YOU-SHOULD-KNOW-046, ADR-0057, the builtin is disabled and this plugin loads as a normal plugin): the rebuild drops this. claudetto shall register the recreation only when the entrypoint is not `local-agent`, and shall treat a failed `registerPlugin()` as absent.
  Acceptance: with entrypoint `local-agent` no hook of the plugin runs; a throwing registration leaves the plugin out of the plugin map. Verification: test.
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-syz79m2z.js@1525 (claude 2.1.327 binary); chunk-dafpvz32.js@79581 (claude 2.1.327 binary).

- [x] **OUT-668** Out (REQ-YOU-SHOULD-KNOW-047, ADR-0113, the userConfig switch replaces the builtin availability gate): the rebuild drops this. claudetto shall treat the recreation as absent (not listed, no hooks) when availability is false or throws. Availability is `complianceTaintsSettled() && !taint("hipaa") && !taint("zdr") && !taint("ldr") && featureGate("tengu_jolly_dewdrop", default false)`; `isOnByDefault` is false.
  Acceptance: with any one term false, or a throw in the check, no hook runs and the plugin is not listed. Verification: test.
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-nvx1z6pc.js@89750 (claude 2.1.327 binary); chunk-nvx1z6pc.js@15702 (claude 2.1.327 binary); chunk-2mhcazb3.js@2480 (claude 2.1.327 binary); chunk-dafpvz32.js@79930 (claude 2.1.327 binary).

- [x] **OUT-669** Out (REQ-YOU-SHOULD-KNOW-048, ADR-0057, the builtin enabledPlugins key does not apply to this plugin): the rebuild drops this. claudetto shall keep the plugin off by default (`defaultEnabled:false`): enabled state is `enabledPlugins["cc-plugin-you-should-know@builtin"]` when set, else `defaultEnabled`, so it runs only after `/plugin enable cc-plugin-you-should-know@builtin`. `isOptIn` (a test of `USER_TYPE`) is a separate thing.
  Acceptance: a fresh install shows no note and no side request until the plugin is enabled. Verification: test.
  Basis: cited. Status: partial at 088a227c.
  Source: chunk-dafpvz32.js@80482 (claude 2.1.327 binary); chunk-nvx1z6pc.js@90045 (claude 2.1.327 binary).

- [x] **OUT-670** Out (REQ-YOU-SHOULD-KNOW-049, ADR-0057, the tip advertises enabling the builtin): the rebuild drops this. claudetto shall show the spinner tip `you-should-know-plugin` (`providerAgnostic:true`, `advertisedCommand:"plugin"`, `cooldownSessions:10`, `maxLifetimeShows:3`) with the text "Want a side agent watching your back while Claude works? Turn on You should know:" and the suggestion-coloured `/plugin enable cc-plugin-you-should-know@builtin`, relevant when the plugin is available, `defaultEnabled===false`, and the user has not set the plugin either way.
  Acceptance: the tip shows at most 3 times, at most once per 10 sessions, and never after the user set the plugin on or off. Verification: demonstration.
  Basis: cited. Status: missing at 088a227c.
  Source: chunk-pyk4d6et.js@358 (claude 2.1.327 binary); chunk-dafpvz32.js@79930 (claude 2.1.327 binary).

- [x] **OUT-671** Out (REQ-YOU-SHOULD-KNOW-060, ADR-0114, the fork shares the cache and has no digest to cost): the rebuild drops this. claudetto-you-should-know shall carry a notice for cache and TTL that names the 1 h main and 5 min subagent split and the measure-first rule.
  Acceptance: the notice text holds "1 h", "5 min", and a measure-first sentence. Verification: inspection.
  Basis: reported (subscription main cache 1 h; subagent default 5 min until `subagentPromptCacheTtl` is set). Status: partial at 088a227c (`plugins/claudetto-you-should-know` has no cache/TTL text; its cache hits concern the fixed-instruction block only).
  Source: external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:3 and :5; external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:69.

- [x] **OUT-672** Out (REQ-YOU-SHOULD-KNOW-063, ADR-0174, no tool.call hook; the observer never denies a call): the rebuild drops this. claudetto-you-should-know shall, before each main-loop call on `terminal` or `desktop`, skip subagent calls, `AskUserQuestion`, and read-only tools (`Read`, `Grep`, `Glob`, `ToolSearch`, `WebSearch`, `WebFetch`, `ListAgents`), and otherwise make one `$.model.complete` call with maxTokens 512 and timeoutMs 20,000. The body holds the shown lines, the known lines, the last 3 person messages (400 chars), the last 8 log entries (800 chars), and 8,000 chars in total. An unanswered request is logged and the call runs. The note states only what the digest shows, in the user's language, and none for an action the user asked for. Cadence is fixed; shown and known lists never repeat (case-insensitive, no final period); a backoff counter grows per ignored offer up to a cap, and any answer resets it; the observer skips while a surface is open.
  Acceptance: a `Read` call makes no model call; a timeout past 20,000 ms logs and lets the call run; a shown line never repeats. Verification: test.
  Basis: cited (2.1.287 release note: built-in mod `cc-plugin-you-should-know@builtin`) and read. Status: have at 088a227c (`plugins/claudetto-you-should-know/`).
  Source: reference/you-should-know-prompt.md; openspec/specs/you-should-know/spec.md:8; openspec/specs/you-should-know/spec.md:17.
  Conflicts with: claudetto-you-should-know fully recreates cc-plugin-you-should-know@builtin (user decision, 2026-11-16).

- [x] **OUT-673** Out (REQ-YOU-SHOULD-KNOW-064, ADR-0114, the digest and log are dropped): the rebuild drops this. claudetto-you-should-know shall record each call's outcome in its digest (`the call was denied and did not run: <reason>`, `the call failed: <text>`), because logging `called {...}` before `next()` made a note claim a denied `ls` had run.
  Acceptance: A denied call shows as denied in the digest. Verification: test.
  Basis: measured (97 pass, 2 fail before the change). Status: have at 088a227c.
  Source: plugins/claudetto-you-should-know/hooks/register.ts@088a227c (`logOutcome`); not located: the 97/2 count line; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:2433 (the forwarded note said a sandbox-off `ls` of the holdout folder ran and counted files, but permission had denied it; the digest logged the call and never its outcome).
  Conflicts with: claudetto-you-should-know fully recreates cc-plugin-you-should-know@builtin (user decision, 2026-11-16).

- [x] **OUT-674** Out (REQ-YOU-SHOULD-KNOW-065, ADR-0114, the observer is a model.fork with no digest): the rebuild drops this. claudetto-you-should-know shall run the observer with `maxTokens` 512 and `timeoutMs` 20,000, a body of the shown line, known lines, the last 3 person messages (up to 400 chars each), and the last 8 log entries (up to 800), at most 8,000 chars; the user's own recent message reaches it; an action the user asked for yields no note; an unanswered check logs `The side check was not answered (aborted)` and the call runs; a secret in a command is not typed into chat unless a person message holds it; the reply language follows the user. On an offer, deny the call with the offer line and "bring the note to the user and wait"; further checked calls deny with the same line and no new request; after more than 2 ignored offers skip `min(16, 2^(n-3))` chances; a key press or accepted chat resets the count; a self-closing view, a refused chat, or Dismiss leaves it unchanged; store the `tool_use` id a note judged and deny only that call; close the open note when the user answers `AskUserQuestion`.
  Acceptance: An ignored offer denies the same call without a new request; the count resets on a key press. Verification: test.
  Basis: reported. Status: have at 088a227c.
  Source: plugins/claudetto-you-should-know@088a227c; old-plan lines not located (unresolved).
  Conflicts with: claudetto-you-should-know fully recreates cc-plugin-you-should-know@builtin (user decision, 2026-11-16).

- [x] **OUT-675** Out (REQ-YOU-SHOULD-KNOW-066, ADR-0051, the builtin cadence of every 6th step is kept): the rebuild drops this. claudetto shall run you-should-know on `turn.step` like `cc-plugin-you-should-know@builtin`, never denying, holding or rewriting a call, and check after every 3rd changing call (non-reader, main loop) counted across turns, because 50% of 1,021 turns (40 sessions, median 5 tool steps) end before a 6th step, so the built-in every-6th never fires. The note shows above the prompt once the check resolves. It triages each side check with `mcp__claudetto__decide` first, because the plugin cannot import kernel/decider across plugins: a confident "no" skips `$.model.complete`; unsure, an error or no key goes to `sideCheckModel` (default claude-haiku-5-5, effort high); `decide` and `web_fetch` calls stay out of the digest; `$.model.fork` takes no model, so `$.model.complete` stays. Its own Haiku call gets `effort` and the full model ID, and a side-check fault logs and lets the call go. The note's instructions gain a rule that a secret inside a command went elsewhere, because an `osascript` keystroke was read as typed into chat. The plugin compares against the 2.1.322 built-in by reading, never patching. The earlier plan removed "A Note Stops the Call", because deny and wait interrupts work and lands the note after the action.
  Acceptance: the check is not awaited, one check per session at a time, skipped when `offeredTurn===turnId`, a view is open or the surface draws no band; `git status` runs unchanged while a check pends. Verification: test.
  Basis: measured. Status: have at 088a227c (you-should-know/hooks/note.ts:56 offeredTurn; plugins/claudetto-you-should-know/hooks/register.ts and calls.ts); the three calls exist in 2.1.327 (`search "model.complete"` finds `chunk-dafpvz32.js@2684`; the manifest at `chunk-nvx1z6pc.js@5878` lists `turn.step` and `model.fork`).
  Source: openspec/specs/you-should-know/spec.md:17; openspec/specs/you-should-know/spec.md:31; openspec/changes/2-1-325-rearchitecture/design.md:27; openspec/changes/2-1-325-rearchitecture/items.json:26.
  Conflict: claudetto shall make the you-should-know note fire and halt the agent before the agent acts on the fault that the note names.
  Conflicts with: claudetto-you-should-know fully recreates cc-plugin-you-should-know@builtin (user decision, 2026-11-16).

- [x] **OUT-676** Out (REQ-YOU-SHOULD-KNOW-067, duplicate of REQ-YOU-SHOULD-KNOW-035 and 036): the item repeats another. claudetto shall parse the observer reply: first `learn:` line (<=240 chars, not `none`, not a repeat), first `tag:` line (`Heads up` for "heads up"/"heads-up", else `You should know`), and `explain:` text split into <=4 cards; caps: title 120, sketch 12 lines x 120 chars, lead and caption 4,000 each cut at a word boundary; offer `{tag} · {line}` with `Learn more` only when a card exists, `Knew this already` and `Dismiss`. A `# title` heading or `**title**` opens a card; text before a fence is the lead, the block is the sketch, and text after is the caption. The offer shows `Learn more` only when a card exists, then `Knew this already` and `Dismiss` (the feedback view closes after 20 s); `That was helpful`, `Understood` and `Knew this already` add to the known list, `Not relevant` and `Couldn’t understand` only close; hotkeys show on the terminal surface only. Chat drafts a quote of the note into an empty prompt box with `@` turned fullwidth, leaves a non-empty box unchanged with a toast, and submits when there is no prompt box. Bounds: 32 session rows, 50 shown, 50 known, closed rows evicted first; faults are swallowed. The rebuild keeps only coding help: it drops the learning page, artifact publishing, the three follow-up directions, constant-list answers, the advertisement tip and the feature-flag and compliance gates, and a view or answer that no code sets is left out and noted unread. Licence hygiene: ship under MIT, copy no original source (anthropics/claude-code LICENSE.md is all-rights-reserved), use no Anthropic or Claude trade name, logo or wordmark; interface strings, mechanism, cadence, constants, key order and geometry are reusable; the observer prompt is the plugin's own; read a licence's own bytes (anthropics/skills brand-guidelines LICENSE.txt:139 withholds trademark rights). Code at 088a227c: plugins/claudetto-you-should-know/hooks/texts.ts, note.test.ts.
  Acceptance: A late (session ended, turn changed, view open) or unparseable reply shows nothing. Verification: test.
  Basis: cited. Status: have at 088a227c (hooks/view.ts:63 "Knew this already").
  Source: openspec/specs/you-should-know/spec.md:88; openspec/specs/you-should-know/spec.md:172; openspec/specs/you-should-know/spec.md:153; openspec/specs/you-should-know/spec.md:102; openspec/specs/you-should-know/spec.md:186; openspec/specs/you-should-know/spec.md:116; openspec/specs/you-should-know/spec.md:130; openspec/specs/you-should-know/spec.md:90.
  Conflicts with: claudetto-you-should-know fully recreates cc-plugin-you-should-know@builtin (user decision, 2026-11-16).

- [x] **OUT-677** Out (REQ-YOU-SHOULD-KNOW-068, ADR-0113, the userConfig switch replaces sideCheckEnabled): the rebuild drops this. claudetto shall run the you-should-know observer only when `sideCheckEnabled` is exactly true (otherwise no request and nothing written); it reads `sideCheckEnabled`, `sideCheckModel` (default claude-haiku-5-5), and `sideCheckEffortLevel` (default high; "turbo" gives high) once at registration; checks before each main-loop tool call on the `terminal` or `desktop` surface; skips subagent calls, AskUserQuestion, and read-only tools (Read, Grep, Glob, ToolSearch, WebSearch, WebFetch, ListAgents); the call waits, bound `LIMITS.checkTimeoutMs` 20,000; logs an unanswered request; asks for the user's language; sends no telemetry.
  Acceptance: with the key unset no request is made. `$.model.complete` serves the check and `$.model.fork` serves post-turn proposals. `sideCheck*` are plugin `userConfig`, absent from the Claude Code setting list, as expected. Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/you-should-know/spec.md:9; plugins/claudetto-you-should-know/.claude-plugin/plugin.json:16@088a227c; plugins/claudetto-you-should-know/hooks/note.ts:21@088a227c.
  Conflicts with: claudetto-you-should-know fully recreates cc-plugin-you-should-know@builtin (user decision, 2026-11-16).

- [x] **OUT-678** Out (REQ-YOU-SHOULD-KNOW-069, ADR-0174, the observer never holds or halts a call): the rebuild drops this. claudetto shall make the you-should-know note fire and halt the agent before the agent acts on the fault that the note names.
  Acceptance: in a replayed session where the agent pushes after a missing full run, the note shows and the push does not run until the note is answered. Verification: demonstration.
  Basis: reported, user. Status: partial at 088a227c (`plugins/claudetto-you-should-know/hooks/register.ts:1@088a227c` shows notes by a side check that arrive after the call; the user saw the note after the push).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:3962, reported, user, 2026-11-10.
  Conflict: claudetto shall run you-should-know on `turn.step` like `cc-plugin-you-should-know@builtin`, never denying, holding or rewriting a call, and check after every 3rd changing call (non-reader, main loop) counted across turns.
  Conflicts with: claudetto-you-should-know fully recreates cc-plugin-you-should-know@builtin (user decision, 2026-11-16).

- [x] **OUT-679** Out (REQ-YOU-SHOULD-KNOW-070, ADR-0114, there is no digest and no maxTokens bound to price): the rebuild drops this. claudetto shall, when no repo file gives the per-token price of the model a rebuild names, state its three bounds (cached fixed block, digest size, `maxTokens`) and write no money figure.
  Acceptance: the rebuild's cost note lists the three bounds and holds no currency amount. Verification: inspection.
  Basis: reported (spec). Status: partial at 088a227c (`plugins/claudetto-you-should-know/hooks/note.ts` and `register.ts` set `maxTokens`).
  Source: openspec/specs/builtin-rebuild/spec.md:65; openspec/specs/builtin-rebuild/spec.md:68.
  Conflicts with: claudetto-you-should-know fully recreates cc-plugin-you-should-know@builtin (user decision, 2026-11-16).

- [x] **OUT-800** Out (REQ-YOU-SHOULD-KNOW-028, ADR-0190 agent decision, not the user's): the scan manifest field is read only for builtin plugins, and `claude plugin validate --strict` warns "Unknown field 'scan'. Claude Code ignores it at load time", so a normal plugin gains nothing from it. The hooks, calls and env reads it listed stay in code and are pinned by the behaviour tests.
  Acceptance: none; the hooks `prompt.submit`, `command.run`, `turn.step`, `ui.render`, `session.detach`, `session.end` stay registered. Verification: inspection.
  Verified: claude plugin validate plugins/claudetto-you-should-know --strict, claude 2.1.327, 2026-11-18: a scan field is warned as ignored at load time.
  Conflicts with: claudetto-you-should-know fully recreates cc-plugin-you-should-know@builtin (user decision, 2026-11-16).

#### Reply Rest

- [x] **OUT-682** Out (REQ-REPLY-037, ADR-0177, ADR-0190): the build parts drop, because vanilla already carries the ask rule. Verified 2026-11-19 on Claude Code 2.1.327 (cc-inspect cli `-p go --permission-prompt-tool stdio`, tool AskUserQuestion): the stock description says to ask only for a decision that is genuinely the user's and otherwise to pick the obvious option and proceed; a one-sentence replacement would drop its plan-mode note and stand-alone question guidance, deferring the tool adds a ToolSearch call before every question, and the `mcp__claudetto__decide` service has no measured gain over vanilla. The shall-not parts hold by absence: claudetto registers no ask tool, asks the user nothing through `$.ui.ask` (no setup wizard, ADR-0190), and never answers AskUserQuestion. Original text: claudetto shall register no ask tool (the classifier reads answers only as `[User answered AskUserQuestion]: ...` and drops other tool results); replace the description with the one-sentence `ASK_TEXT`; defer the tool when the session has ToolSearch; use `$.ui.ask` for setup's own questions (a dismiss rejects); never answer AskUserQuestion in the user's place; send the model's own decisions to `mcp__claudetto__decide`, which registers only with `TYPESAFE_API_KEY`, reads it nowhere else, carries question texts, option labels, and fixed pick or approval texts and no transcript, file, or path; other hooks reach Jev only through the Decider; no `typesafeApiKey` userConfig. Thresholds belong to a question set and a pinned model version (`jev-1.14.0`) and change only with a recorded run on held-out cases.

#### Claude Code Behaviour with No Plugin Fix

- [ ] **OUT-108** claudetto shall not fix these, because no plugin seam reaches them: garbled characters (renderer), the "· summary" label (`tool_use_summary`), 2.1.319 rewriting `Agent` input and causing auto-mode "changed after review", and the extra `claudetto:Heracles` agent (the model's own delegation).
  Basis: measured. Status: have at 088a227c (nothing built).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:24; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:262; `tool_use_summary` is a message type on 2.1.327 (`chunk-rj3e7agr.js@578881`), so the "· summary" label comes from core. Dropped (2026-11-18) for the garbled-character finding: no source located in external/, openspec/, reports/, git history or the user's transcripts.

- [ ] **OUT-109** claudetto shall not treat refusal-to-act complaints (ownership, licence, defensive security, ToS) as plugin rules; they are user preferences.
  Acceptance: no rule or hook answers a refusal complaint. Basis: reported. Status: n/a.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xlz6m8-claudes-refusal-is-getting-stric-20261109T152849Z.md:752 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xlz6m8/claudes_refusal_is_getting_stricter_and_annoying>).

## Product Perspective

29148 clause 9.6.4. claudetto runs inside Claude Code and reaches it through its extension points only (`plugins/claudetto/.claude-plugin/plugin.json:4` at `088a227c`). The measured facts about each interface are in [arc42 section 3](../arc42/03_context_and_scope/README.md):

| 29148 interface | arc42 section 3 file |
| --- | --- |
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
| --- | --- |
| [`kernel`](kernel.md) | 28 |
| [`guards`](guards.md) | 72 |
| [`handover`](handover.md) | 71 |
| [`delegation`](delegation.md) | 63 |
| [`reply`](reply.md) | 137 |
| [`cost`](cost.md) | 43 |
| [`setup`](setup.md) | 64 |
| [`edit`](edit.md) | 2 |
| [`openspec`](openspec.md) | 0 (out, ADR-0189) |
| [`you-should-know`](you-should-know.md) | 75 |
| [`verification`](verification.md) | 92 |

## User Characteristics

29148 clause 9.6.6. One user, the repository owner (`xsyetopz`, the author in each `plugin.json` at `088a227c`), runs Claude Code on macOS across 31 project folders (session logs of 2026-11-09 to 2026-11-16, counted under Sources Audited in [the plan README](../README.md#sources-audited)). The stakeholders are in [arc42 section 1](../arc42/01_introduction_and_goals.md#stakeholders).

## Limitations

29148 clause 9.6.7. The fixed outside limits (Claude Code 2.1.327, the macOS sandbox, licences, the user's rules) are the constraints in [arc42 section 2](../arc42/02_architecture_constraints/README.md).

## Assumptions and Dependencies

29148 clause 9.6.8.

- Claude Code 2.1.327 is the host. Source: user decision, 2026-11-18 (`2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7`). A fact measured on an earlier version says so in its Basis line and holds only until a probe on 2.1.327 checks it.
- Commit `088a227c` is the baseline. Each Status line reads "have", "partial", or "missing" at that commit.
- macOS is the platform. The sandbox facts in arc42 section 2 were measured on macOS.

## Apportioning of Requirements

29148 clause 9.6.9. Requirements held for a later release; none blocks the rebuild.

- [ ] **OUT-110** claudetto shall, later, queue unattended tickets with a runner that enforces the limits: one ticket per run, `timeout 30m claude -p "$(cat tickets/N.md)" --max-turns 40`; settings allow only "fine alone" actions and "needs me" actions (push main, deploy, email, pay) stop and notify; a status file (done or blocked, and why); buckets needs-me, unfinished, broken; stop after N failed attempts; try 5 tickets one night first. The first permission prompt with nobody there stalls the queue, and most burn is test-failure retries. launchd or cron runs `claude -p` once per ticket, with tickets as files with "blocked by" lines, isolated per project.
  Basis: reported. Status: missing at 088a227c (verified on 2.1.327 with cc-inspect `surface` flag: `--max-turns <turns>` "only works with --print" at `chunk-rnt5hbrt.js@55466`; `-p, --print` at `chunk-rnt5hbrt.js@50168`).
  Source: external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:57.

- [ ] **OUT-111** claudetto shall, later, run a docs-cohort review: several Haiku subagents summarise the same doc independently, disagreement marks unclear docs, the session end asks "what would have made this faster?" and fixes the named docs, and a pinned project glossary stops "morph" becoming "reshape".
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-09-29/export-When and what do you use Haiku for-.jsonl:26 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wsq73p/when_and_what_do_you_use_haiku_for>).

- [ ] **OUT-112** claudetto shall, later, refactor with agents: target long, often-changing functions (git log: the 20 longest changed most in 90 days); characterization tests and coverage of moved lines; give a plan, not "refactor this" (a small fast model followed a plan in 14 of 15 multi-step refactors, while alone "reduce complexity" moved a body to a helper, 151 to 5, helper 80, and another function broke); a whole-file complexity check; a pin-behavior test before the refactor; review caps diff size, splits mechanical from semantic, humans write the "why" of a PR, jscpd in CI; measure lead time, change-failure rate, and rework (METR: felt 20% faster, measured 19% slower).
  Basis: reported. Status: missing at 088a227c (the rules partly have `lookForClone`).
  Source: external/2026-10-12_p3/export-How to let an AI agent refactor your code without breaking it - what I learned from a few hundred ex.jsonl:2 (14 of 15 multi-step refactorings with a plan; complexity 151 to 5, helper 80); external/please-use-me-often/swe-best-practices.md:38 (METR 19% slower, believed 20% faster).

- [ ] **OUT-113** claudetto shall, later, take these misc notes: outbound requests must not carry the user email (n=8, candidate; Wikipedia and SEC EDGAR need a contact UA, so ask, not forbid; `CONSENT` in `texts.ts:56`); `CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES` is new in 2.1.296 (present in 2.1.327 at `chunk-2ew0jg68.js@28367`, cc-inspect `code` search); frontmatter strings isolation worktree, maxTurns, permissionMode, hooks, effort, autoCompactWindow; verify a new dependency exists before install (about 1 in 5 AI samples named a nonexistent package); an impossible-task canary eval; estimate cost in steps or minutes; a wall-time cap beside the memory cap; `/clear` between unrelated tasks; the brevity rule "lead with outcome; no tool-by-tool recap".
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
  Basis: reported (verified on 2.1.327: `/doctor` has `argumentHint: "[prompt-audit [<path>]]"` and hands `prompt-audit` to the `claude-api` skill, falling back to a fixed text when that skill is absent or disabled, `chunk-3z330av7.js@165730`; the audit prompt and its scope list are `chunk-2vcnvx3f.js@7849`; the scope lists no `~/.claude/projects/*/memory/` path; the "applies none" clause lives in `shared/prompt-audit.md`, which the program does not ship for reading, so it is unconfirmed). Status: missing at 088a227c.
  Source: `chunk-3z330av7.js@165730` and `chunk-2vcnvx3f.js@7849` on 2.1.327; the "v2.1.283+" version clause: no source located (Dropped 2026-11-18 for that clause).

- [ ] **OUT-118** claudetto shall defer until a paid measurement is approved by the user: weighted critical-item model scoring (n=4), Haiku 5.5 triage under 50% (n=1), the Haiku effort sweet spot at xhigh, compression tools rtk and lean-ctx (rtk 0.2% of weighted usage in one claim against over 80% in another), semantic search CLI 20-50%, effort-only routing 20%, and hidden-reply reproduction. Code Mode is settled, not deferred: claudetto does not turn it on. Its measured gain is on MCP fan-out with a small answer; claudetto's work is mostly file edits, which gained nothing measurable (CTX-854). It cannot run under the `-p` fallback (REQ-KERNEL-002), and Claude Code ignores the opt-in in project settings. Claude Code removes about 13k tokens of tool definitions from each Code Mode request, but on file work recorded cost stayed about equal. claudetto stays compatible when a user turns Code Mode on (REQ-GUARDS-078). Revisit the decision if claudetto adds MCP fan-out work, or if a rerun on file tasks shows a cost gain beyond the run-to-run spread.
  Acceptance: each item stays unbuilt until a measurement is approved. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:33; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:14.

- [ ] **REQ-DEFERRED-001** claudetto shall offer a skill that gives a verdict per review claim with file and line.
  Acceptance: given a PR review comment, the skill reads the file and callers and returns a verdict with `file:line`. Verification: demonstration.
  Basis: reported by the plugin's author (benchmarked on 50 PRs; not repeated). Status: missing at 088a227c.
  Source: external/2026-10-03/export-Open-source Claude Code plugin- validate PR review comments against the code before acting on them (.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wweu6q/opensource_claude_code_plugin_validate_pr_review>).

- [ ] **REQ-DEFERRED-002** claudetto shall offer an MCP config pin that pins only `/mcpServers`, moves tokens to `HLOCK_SECRET_*`, and checks plugin version drift (idea only; third-party hlock; absolute paths differ across machines). The same input item holds a have/missing sweep note (have: surface.ts autoCompact, Artemis.md, memory texts, readonly.ts, branches.ts, Heracles.md; missing: stop_hook_active, exit-2 Stop test hook, `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_PROMPT_CACHE_TTL`, reviewer agent with plan plus diff only, "comment density" rule), which is a status note and not a requirement.
  Acceptance: Not applicable (deferred). Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbrfzp-i-got-tired-of-syncing-up-my-c-20261022T005207Z.md:31 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbrfzp/i_got_tired_of_syncing_up_my_custom_claude_code>).

- [ ] **REQ-DEFERRED-003** claudetto shall offer a LICENSE-AGENTS rider (L1-L9; not named LICENSE; revocable permission; reserved rights; AUP incorporated; principal answers for delegates; L7 unsupported claim is a P0 breach; installed mechanisms form part of the licence) and an SOW with sections Goal, In scope, Out of scope, Deliverables and acceptance, User-Owned Values involved, Standing Consent, Budget, Delegation, Known facts, Record (the SOW outranks all but safety rules and the user's latest word; a `/sow` skill or SessionStart scaffold). Ops items B1-15 to B1-21: observability, infra as code, pinned deps, no secrets in prompts, blameless postmortems, review for knowledge, docs next to code.
  Acceptance: Not applicable (deferred). Verification: demonstration.
  Basis: cited. Status: missing at 088a227c.
  Source: external/agent-terms/TERMS-OF-USE.md:236. Not located: tags A:198, A:199, A:203.

- [ ] **OUT-119** claudetto shall decide whether the version floor uses `requiredMinimumVersion` (exits at startup when older) beside `minimumVersion` (prevents downgrades). 2.1.327 exposes `requiredMinimumVersion` (`chunk-ja5z738t.js@285180`, cc-inspect `code` search) (exits at startup when older) beside `minimumVersion` (prevents downgrades): decide if the floor should use the hard setting. 2.1.327: present. missing.
  Acceptance: A decision record names the chosen setting. Verification: inspection.
  Basis: measured. Status: missing at 088a227c (git grep requiredMinimumVersion finds no hit).
  Source: probe cc-inspect surface, claude 2.1.325: `requiredMinimumVersion` present.

- [ ] **OUT-120** claudetto shall rerun the four-arm handover probe only if data changes (one paid run per arm of 3; 17 of 18 fired; no B arm cheaper than C in all 3 pairs; threshold default stays) and extend it with a 350k-500k token adherence run; a paid call needs the user first. Four-arm handover probe: rerun only if data changes (one paid run per arm of 3; 17 of 18 fired; no B arm cheaper than C in all 3 pairs, threshold default stays); extend with a 350k-500k token adherence run that a fake API cannot test. Needs a paid call: ask first.
  Acceptance: No paid run starts without the user's approval. Verification: demonstration.
  Basis: measured. The adherence extension ran 2026-11-18 (paid, user approved, Sonnet 5.5 medium, 2.1.327, reports/2026-11-18-research/paid-labs/adherence/). Two system rules (the last line reads END-OF-REPLY; no lists), 3 sessions per size, 3 list-inviting questions each. At about 29k tokens, 9 of 9 replies kept both rules. At about 410k, END held 9 of 9 and one reply of 9 broke the no-lists rule (11 list lines). At about 714k, the first question broke the no-lists rule in 2 of 3 sessions (12 and 10 list lines); auto-compaction then cut the context to 4k-6k and one later reply dropped END. Rule loss grows with context size, which supports renewal at a task boundary (ADR-0178) over long sessions. Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:160@088a227c9^ (run 2, 18 runs); openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/compaction-path/spec.md:3@088a227c9^ (the four-arm probe requirement).

## Conflicts with Settled Decisions

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
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:73 (url: <https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings>).

- [ ] **OUT-124** A Stop hook that greps for TODO in the files touched that session (with tests, type check, and a stop_hook_active guard). The reported reason: CLAUDE.md skip-rules are followed most of the time, not every time. Also: not add a Stop hook that checks whether the agent skipped anything. The reported content: a Stop hook only catches what tests cover; a separate QA run against only the issue text adds coverage; after two failed fixes stop editing, name the suspected cause, add logging and an end-to-end test first. 2.1.327: `Stop` and `StopFailure` are in the hook list at `chunk-ja5z738t.js@5593` (cc-inspect `code` search).
  Acceptance: no Stop hook greps files for TODO and no shipped Stop hook runs a completion check. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`git grep -n Stop 088a227c -- plugins/claudetto/hooks/features/repeat/` finds no match; the only Stop-time hook is `classic.StopFailure` in `stop-notice.ts`).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbkgjm-what-matters-most-to-you-when-20261022T005215Z.md:66 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbkgjm/what_matters_most_to_you_when_working_with_claude>); unresolved: no matching line found in external/ for the second wording; kept because the user curated it.

- [ ] **OUT-125** claudetto shall not add a guard hook that blocks a plan until a spec is approved, blocks a release while a gate is red, logs each file change with SHA-256 and writing agent, and accepts an overrule only from a human-written line with reason, name and file hash.
  Basis: reported design, run only on the author's projects. The source's reason: prompts alone cannot enforce a gate, since Claude argues past it in a long session.
  Conflicts with: no planner (user decision, 2026-11-16).
  Conflicts with: no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xbyg3k-i-made-claude-write-down-what-it-20261023T040746Z.md:39; (url: <https://www.reddit.com/r/ClaudeAI/comments/1xbyg3k/i_made_claude_write_down_what_it_rejected_not>).

- [ ] **OUT-126** claudetto shall not keep a fixed small task set in the repo (a failing test, a boring refactor, a framework migration) and re-run it every couple of weeks to read model drift as a change in error class. Also: not build a fixed task set, benchmark, or model-nerf measuring suite (5-20 pinned real tasks rerun after each model, harness, or prompt change, at least 3 runs per arm, revert real past fix commits as reviewer benchmarks, save launch-day prompts and rerun them). Own held-out evals stay (`plugins/claudetto/evals/`, 13 cases plus reworded variants; `~/.claudetto-holdout`); thresholds and wording change only with a recorded run on stored cases, a site moves to the Decider only when it scores at least current code, and tests never assert an exact live probability.
  Basis: measured. Also reported practice.
  Status: have at 088a227c (the earlier `partial` named `plugins/claudetto/evals/`, which `git ls-tree -r --name-only 088a227c -- plugins/claudetto/evals` shows absent: 0 files).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:259; (url: <https://www.reddit.com/r/claude/comments/1xc9mw9/has_opus_55s_coding_quality_changed_recently>); unresolved: no source line located for this claim.

- [ ] **OUT-127** claudetto shall not split work into three passes: plan against the actual files, write the patch, then review the diff by a third model against repo conventions.
  Basis: reported, one commenter. The source says framework conflicts come from planning without reading enough surrounding code.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:261; (url: <https://www.reddit.com/r/claude/comments/1xc9mw9/has_opus_55s_coding_quality_changed_recently>).

- [ ] **OUT-128** claudetto shall not ban a model when a traffic-light guard sees a task run with too little reasoning, a claim go unverified, or explicit instructions replaced by wrong judgements three times in a day, nor recheck the ban daily.
  Basis: reported design (Metsatronic).
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:281; external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:283; (url: <https://www.reddit.com/r/claude/comments/1xc9mw9/has_opus_55s_coding_quality_changed_recently>).

- [ ] **OUT-129** claudetto shall not ship a Stop-time hook or line-count hook against narrating or null-guard comments. Also: not ship line-comment-count or null-guard rule hooks (`noNarratingComments`, `noImpossibleStateGuards`, `useLeastCode`): they are undecidable without a word list.
  Acceptance: improve names, structure, types, and explicit flow in order, then a short comment only for a reason the code cannot show; the rule reaches the model through rule files. A line-comment-count hook and a null-guard hook cannot be decided without a word list, so no hook exists. Verification: inspection.
  Basis: measured (heuristic); also inferred.
  Status: have as the user rule file `commentOnlyWhy`; no hook at 088a227c (`git grep -l -E 'noNarratingComments|noImpossibleStateGuards' 088a227c -- plugins` finds 0 files).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/agent-conduct/spec.md:142; unresolved: no source line located for this claim.

- [ ] **OUT-130** claudetto shall not route open problems to Opus as a subagent model. Also: not route work to an Opus or Fable subagent as the model-routing advice reads: an Opus agent for migrations, auth, server routes, CI, planning, security review, and as retry when Sonnet fails; Fable for open-ended work and root-cause hunts. The split stays a note for the lead's own planning only.
  Acceptance: no agent file names Opus or Fable. The rest of the routing advice (Haiku for bounded verifiable jobs, Sonnet for unknown cause and as Haiku retry, plan strong then execute cheap in a new session, `/model opusplan`, `/effort xhigh` to plan then `/effort medium` to build) is carried here as reported, contested. Measured (14 days, 879 sessions, 968 subagent runs, price-weighted): a rule sending every TDD step of a complex task to an Opus agent cost 20% of spend; 35% of file reads were repeat reads of an unchanged file (a hook now refuses it); a commenter: "routing by task size is the trap". Verification: inspection.
  Basis: reported, contested.
  Status: have at 088a227c (`git grep -l -E 'claude-fable|claude-opus' 088a227c -- plugins/claudetto/agents` finds 0 files); step-type routing and repeat-read refusal missing. `opusplan` is in the alias list of 2.1.327 at `chunk-jtw26wbb.js@963` (cc-inspect `code` search); `/effort` and `/model` are present on 2.1.327 (`chunk-m14bt1pz.js@2539661` and `@2530027`, cc-inspect `surface` slash-command).
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560); external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:74 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save>) holds a related cheaper-model comparison. The original "open problems to Opus" text: not located; external/2026-10-28/reddit.com-r-claudeai-comments-1xgsku3-i-parsed-34-gb-of-my-claude-code-20261028T061008Z.md:29 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xgsku3/i_parsed_34_gb_of_my_claude_code_transcripts_20>); external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:57 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down>); merged with plan:1168 (orchestrator launch advice).

- [ ] **OUT-131** claudetto shall not adopt a decisions index loaded at session start as a router to the authoritative document, acked back by count.
  Basis: reported, two users (about 8500 tokens for a 408-decision project; the agent acks the counts and on a discrepancy pulls the one decision or brief).
  Conflicts with: no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xco6yg-a-modern-ai-problem-with-a-cen-20261024T062321Z.md:79 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xco6yg/a_modern_ai_problem_with_a_centuryold_answer>).

- [ ] **OUT-132** claudetto shall not adopt a build order for AI projects (GDD plus TDD first, 50-100 gap questions in a table, a locked MVP, tiers Foundation to Wishful).
  Basis: reported, two authors.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-26/reddit.com-r-aigamedev-comments-1xfcokl-advice-for-those-developing-gam-20261026T063549Z.md:156 (url: <https://www.reddit.com/r/aigamedev/comments/1xfcokl/advice_for_those_developing_games_with_ai_so_they>).

- [ ] **OUT-133** claudetto shall not adopt paired agent roles with one project-manager agent as the only user interface, and flagship planners over lower-tier implementers.
  Basis: reported (one commenter's claim; the thread gives no measurement).
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-26/reddit.com-r-aigamedev-comments-1xfcokl-advice-for-those-developing-gam-20261026T063549Z.md:202 (url: <https://www.reddit.com/r/aigamedev/comments/1xfcokl/advice_for_those_developing_games_with_ai_so_they>).

- [ ] **OUT-134** claudetto shall not adopt a change rule for a scope document (ask what a new feature replaces in the release plan; if nothing, it goes to a later-version list). The rule governs the user's own project plan, not a claudetto part.
  Basis: reported, one commenter.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-26/reddit.com-r-aigamedev-comments-1xfcokl-advice-for-those-developing-gam-20261026T063549Z.md:441 (url: <https://www.reddit.com/r/aigamedev/comments/1xfcokl/advice_for_those_developing_games_with_ai_so_they>).

- [ ] **OUT-135** claudetto shall not adopt planning one slice at a time (health check plus db connection), then the next.
  Basis: reported, several commenters.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgnu5o-ais-over-exhausted-planning-20261028T061059Z.md:37; external/2026-10-28/reddit.com-r-claudeai-comments-1xgnu5o-ais-over-exhausted-planning-20261028T061059Z.md:86 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xgnu5o/ais_over_exhausted_planning>).

- [ ] **OUT-136** claudetto shall not adopt in-harness pass/fail lines for qualifying a local model (prefill at least 1000 tok/s, warm first turn at most 30 s, a few hundred output tokens for "READY").
  Basis: reported, one author.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:265 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac>).

- [ ] **OUT-137** claudetto shall not adopt keeping every 5th routed-down step on Opus for 2 weeks to compare review findings.
  Basis: reported, one user.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgsku3-i-parsed-34-gb-of-my-claude-code-20261028T061008Z.md:31 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xgsku3/i_parsed_34_gb_of_my_claude_code_transcripts_20>).

- [ ] **OUT-138** claudetto shall not adopt a sycophancy probe (the same factual question in fresh chats, neutral and then with a confidently wrong answer). A proposed method that was not run.
  Basis: reported, one commenter.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:245 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfa39o/is_claude_the_least_yesman_llm>).

- [ ] **OUT-139** claudetto shall not adopt a month-long agent research loop (register each idea before running, revert rejected code but keep the diary entry, two independent verifiers, check any "record" against public sources). The loop is the user's own research practice, not a claudetto part.
  Basis: reported, one user.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xd97ax-do-you-have-any-tips-for-encoura-20261024T063435Z.md:57 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xd97ax/do_you_have_any_tips_for_encouraging_claude_to>).

- [ ] **OUT-140** claudetto shall not adopt giving a long autonomous loop eyes on the target (a driver writes a status block and a log ring to memory; the agent reads it after each test, and runs build, upload, and read-logs unattended). A practice of one hardware project, not a claudetto part.
  Basis: reported, one project, Opus 5.5 medium.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xgtghe-claude-code-reverseengineered-th-20261028T060614Z.md:52 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xgtghe/claude_code_reverseengineered_the_xbox_360_kernel>).

- [ ] **OUT-141** claudetto shall not adopt a local-or-cloud routing recipe (a six-question classifier giving AS-IS, AMENDED, or CLOUD; approval asked only when local is recommended). The recipe routes work to a local model.
  Basis: reported, one author.
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xduofw-how-i-made-local-cloud-coding-20261024T061933Z.md:55 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xduofw/how_i_made_local_cloud_coding_workflow_48_gb_mac>).

- [ ] **OUT-142** claudetto shall not adopt an orchestrator tripwire at 500k context that sends a wind-down and handoff message, with a restart script that launches a new session hours later. Claudetto's handover knobs mirror Claude Code's compaction knobs, so the threshold is a CLAUDETTO_* knob, not a 500k script.
  Basis: reported; an auto-compact setting of 500k was criticised as a threshold nobody reaches.
  Conflicts with: handover replaces core auto compaction by default; manual `/clear` stays and writes a handover first; `CLAUDETTO_*` handover knobs mirror Claude Code's compaction knobs (user decision, 2026-11-16 19:00 UTC, handover mimics the compaction settings; a manual /clear gets a handover first (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6412)).
  Source: external/2026-10-27/reddit.com-r-claudecode-comments-1x776ms-auto-handoff-are-the-best-new-20261026T134539Z.md:179 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x776ms/auto_handoff_are_the_best_new_feature>).

- [ ] **OUT-143** claudetto shall not ship a constraint ledger, so it carries no first-call-covers-all rule, no `rule none` entry kind, and no substring invariant. Also: not build the constraint ledger (`hooks/pin.ts`), which pulls standing constraints out of the user's messages and denies a call that breaks a read-only, no-commit, no-push, or only-files rule. Also: not keep the constraint ledger: the 2-1-323 design removed it (the permission dialog plus `permissions` and `autoMode` judge calls replace it), and the superseded record keeps the measured case. Also: not enforce session constraints at runtime through `tool.check` (read-only, no-commit, no-push, only-files); D321 removed the constraint ledger. A false constraint taken from a task sentence ("Rename the export in src/format.ts and you're finished") became an only-files rule that denied the caller's edit: syc-callers-updated 12/16 against 16/16 at baseline.
  Also: not carry the constraint ledger as a remark gate: "A Remark Is Answered Before Any Tool Runs" (132 denials in 3 days, 8 recorded false), "A Dispute Is Settled by Running the Disputed Code", "A Compaction Ends the Remark Turn"; not carry the ISSUES gate (ask tool denied until the session holds a successful Read or Bash `cat/head/tail/less/more/bat/nl/non-in-place sed` of the newest `ISSUES*.md` by mtime at repo root, found by `git rev-parse --show-cdup`; a symlink counts with its target mtime via `$.fs.stat`, since `fs.list` gives link mtime 0; the deny leads with the instruction because the ask tool's failure line cuts at about 160 chars) or the answer-first remark check (it denied work the user had asked for: R9, R17, R32, R35, R60 and three more in one session, out of 132 denials; the fault is left to the root prompt line "a question wants an answer and then a wait" and the Concise style; A/B: tool before any text 5/10 vs 0/10); not keep the decider ledger or the RULE_CRITERIA list, nor decider ledger rules (a later user message that the Decider reads as allowing the act an entry forbids lifts that entry; a resumed session's first prompt waits for extraction so the ledger note rides it; a remark like "2-1-319 is out" must not become "Do not delete branch"). The per-question approval Noul (`pick_0` plus `approval_0`, or `yes_0` plus `approval_0`; "Does question <i> ask the user to approve money, a push, a release, a delete, or a step with no undo?") stays in the decider.
  Acceptance: no hook writes, injects, or enforces ledger entries; No `tool.check` constraint denial exists; no ledger reply, no RULE_CRITERIA, no per-sentence rule check, no ask-tool gate and no remark denial exists. Verification: inspection.
  Basis: measured (the removed ledger's false-constraint case: syc-callers-updated 12/16 against 16/16 at baseline; D321 removed the ledger); also reported and cited.
  Status: have at 088a227c (`git grep -l -E 'pin\.ts|constraint.?ledger|ConstraintPin|useConstraintPin|RULE_CRITERIA' 088a227c -- plugins` finds 0 files; `git grep -l ISSUES 088a227c -- plugins` finds 0 files; `git grep -l ISSUES 088a227c -- plugins` finds 0 files; a [ADR-0133](../adr/0133-constraint-ledger.md) spec existed outside `plugins/`).
  Conflicts with: no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: openspec/specs/constraint-ledger/spec.md:40 (the mod's first Decider call covers every person message, each later call only the new one; state holds only the user's own messages and current entries, so tool results and injected text such as "Do not edit the lockfile." never become entries); openspec/specs/constraint-ledger/spec.md:64 (a sentence answered yes with its rule unsettled gets rule `none`, shown on each prompt, not enforced; unsettled for "limits the assistant" gains no entry); openspec/specs/constraint-ledger/spec.md:131 (every entry's text is a substring of a message the user sent); openspec/changes/archive/2026-11-09-release-2-1-319/design.md:283; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:276; openspec/specs/constraint-ledger/spec.md:8; [ADR-0133](../adr/0133-constraint-ledger.md); openspec/specs/constraint-ledger/spec.md:4; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:424.; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:88; openspec/specs/low-hitl/spec.md:169; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:208-211,223,233-234 (the ledger reply needs at least 87 chars per sentence; a resumed 193-sentence session needs 17,541 chars, over any 2,106-token cap; 1 of 3 replays of the real 41-sentence read stopped mid-JSON at 4,154 output tokens; RULE_CRITERIA has no option for a no-rule sentence, so 41 of 82 answers stay unsettled); openspec/changes/2-1-325-rearchitecture/specs/decide/spec.md:102

- [ ] **OUT-144** claudetto shall not ship advisor prompt text (`ADVISOR_SYSTEM` and its added lines). Also: not rebuild the advisor as `mcp__claudetto__advisor` and `/claudetto:advisor` (one `$.model.complete` at `high` on `claude-fable-5-2`, or `claude-mythos-5-2` when `ANTHROPIC_DEFAULT_FABLE_MODEL` names it, reading the question and asker-named files through `$.fs.read`, secret-scanned first, 400,000-char cap, `@path` words in the command). It also puts Fable in a model role (see "Fable and Opus are never a subagent model"). Also: not rebuild the advisor (a model call that sends only a question and named files to Fable or Mythos). The built-in advisor stays off through `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`, which setup writes. The built-in is a server tool behind `advisorModel`, `/advisor` and beta `advisor-tool-2026-03-01`, reported to read the whole context at each question; whether a plugin model call can name those models at `high` is open: the call accepts `model` and `effort` low to max and refuses a model outside the organization allowlist (verified on 2.1.327, chunk-m14bt1pz.js@4813210); the server serves both at `high` for this account: `claude -p --model claude-fable-5-2 --effort high` and the same with `claude-mythos-5-2` each answered (2.1.327, 2026-11-18, `modelUsage.canonicalModel` `claude-mythos-5-2`, provider firstParty, $0.061 and $0.057); the plugin-call path stays unprobed because the advisor is not rebuilt. A prompt cache belongs to one model, so a Fable question could not reuse the main thread's cache.
  Acceptance: no advisor system text exists in the plugin; No advisor tool or command exists; setup writes the disable. Verification: inspection.
  Basis: cited. Also reported (one session cost $0.4302).
  Status: have at 088a227c (`git grep -l -E 'ADVISOR_SYSTEM|advisorModel' 088a227c -- plugins` finds 0 files; `settings.ts:178` writes `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`).
  Conflicts with: the advisor tool stays disabled (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:156 (a rewrite proposal for `ADVISOR_SYSTEM`: "Put the answer in the first sentence. Define each term you coin."); openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:31; openspec/specs/decide/spec.md:229; [ADR-0116](../adr/0116-advisor-rebuild-superseded.md); [ADR-0052](../adr/0052-advisor-tool-disabled.md); openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:643; CHANGELOG.md:129.

- [ ] **OUT-145** claudetto shall not add a done-gate that blocks Stop on test exit codes, a pipe check, or a test-touches-module grep. Also: not add a Stop hook as done-gate (on Stop: if the last message claims success and no test, build, or command ran after the last edit, exit 2 once and check `stop_hook_active`; variants running typecheck, lint, and tests; a reviewer subagent marking each plan step done or not done).
  Acceptance: No Stop hook inspects test output or the test file for the edited module name; no Stop check classifies the last message. Verification: inspection.
  Basis: reported (one poster's replay of 4000 sessions): block when the last test or build after the edit exited non-zero; a pipe into tail or grep can hide a failing exit code; a runner that matches zero tests exits 0, so require at least one test ran; grep the test file or import graph for the edited module name as a mismatch flag. Also reported: a replay of 3,977 turns, 406 ending done or fixed, showed the first version would have blocked 86, almost all legitimate.
  Status: have at 088a227c (`git grep -l stop_hook_active 088a227c -- plugins` finds 0 files).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuivsm-i-replayed-4000-of-my-claude-c-20261116T052626Z.md:63,87,91 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xuivsm/i_replayed_4000_of_my_claude_code_turns_to_see>); user decision, 2026-11-16; external/2026-10-21/reddit.com-r-claudecode-comments-1x9xu48-how-do-you-get-claude-code-to-20261020T024242Z.md:115 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x9xu48/how_do_you_get_claude_code_to_actually_check_its>).

- [ ] **OUT-146** claudetto shall not pin a local small model for explaining files, commit messages, and diff summaries.
  Acceptance: No block names a local model or a model server. Verification: inspection.
  Basis: reported (one commenter): a pinned Gemma 4 E4B on an M4 16GB via Magnitude answers in about 2 s; Opus does the rest; a predictable weaker model beats an unpredictably degraded stronger one. Status: missing at 088a227c.
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xve1u7-id-rather-have-a-weaker-model-20261116T051723Z.md:29 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xve1u7/id_rather_have_a_weaker_model_that_never_changes>); user decision, 2026-11-16.

- [ ] **OUT-147** claudetto shall not record `model: opus` in subagent frontmatter, nor a rank rule, to run a Fable-planned orchestrator.
  Acceptance: No agent file names Fable or Opus as its model. Verification: inspection.
  Basis: reported (one poster): a rank rule plus `model: opus` in subagent frontmatter is the workaround. Status: have at 088a227c (no Fable or Opus in claudetto agent frontmatter: Artemis uses claude-haiku-5-5).
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwckod-fable-52-as-orchestrator-plann-20261116T052602Z.md:89 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xwckod/fable_52_as_orchestrator_planner_reviewer_and>); plugins/claudetto/agents/Artemis.md:4@088a227c; user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560).

- [ ] **OUT-148** claudetto shall not route tasks through a Haiku router that sizes each task and sends it to Haiku, Sonnet, or Opus last. Also: not use a Haiku judge router as the default effort or model picker: it underestimates tasks, is fooled by "yes", drops per-prompt switching because cache is per model, and its 20% saving rests on 4 tasks.
  Acceptance: No block holds a task-sizing router; no judge router picks effort or model. Verification: inspection.
  Basis: reported (one commenter): Haiku for tool use and orchestration, Sonnet at effort levels for code, Opus only as a last resort. Its 30% saving is kept as a fact in arc42 section 3.
  Status: have at 088a227c (`git grep -l -E 'Haiku.*router|taskRouter' 088a227c -- plugins` finds 0 files).
  Conflicts with: no planner (user decision, 2026-11-16).
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx4fkw-token-savings-20261116T045931Z.md:41 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xx4fkw/token_savings>); user decision, recorded in the 2026-11-17 handover (day of decision not recorded); external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:40; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:143.

- [ ] **OUT-149** claudetto shall not build a skill eval method: trigger evals on 20-40 positive and distractor prompts at precision and recall of at least 90 percent, ablation Delta = Score(with_skill) - Score(without_skill) (Delta 0 means the skill is redundant), a deterministic grader order (file_exists, tool_used, tool_order, regex, test run), then a Haiku binary rubric, then adversarial safety-bypass prompts. Also: not run controlled skill and rule evals (no-skill baseline, same-length placebo, shuffled-sentence control, previous version, paraphrase tests).
  Acceptance: none ships. Verification: inspection.
  Basis: reported, unverified (the skill eval method). Also reported: added text alone moves cost +2% to +16%; of 9 popular skills 2 beat placebo, 6 no better, 1 worse; a "caveman" skill claimed -65% tokens and measured -2% output and +14% total cost, 15 tasks, 30 runs per arm, Opus 5.5, Holm p=0.049; IFEval++ up to 61.8% drop under a nuanced prompt change.
  Status: have at 088a227c (`git ls-tree -r --name-only 088a227c -- plugins/claudetto/evals` lists 0 files).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:56; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:258; user decision, 2026-11-16.

- [ ] **OUT-150** claudetto shall not ship an escalating implementer ladder that raises a new Opus implementer from xhigh to max, with the reviewer always at max (medium, then a new implementer at xhigh with the lessons if P0 or P1 findings remain, then max on a third round, then held for the human as "ship with residuals or strip").
  Acceptance: No agent file names Opus or Fable as a subagent model, and effort stays fixed per agent file. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:142 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents>); user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

- [ ] **OUT-151** claudetto shall not run several loops at different effort levels on each new model release to find the cost-to-error sweet spot, counting the reviewer's extra flags and rewrites.
  Acceptance: No plan file schedules an effort-sweep run. The source holds only the sweet-spot loops and the diminishing-returns remark; it does not state that max effort gave worse results. Verification: inspection.
  Basis: reported, one user. Status: missing at 088a227c.
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:255 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents>); user decision, 2026-11-16.

- [ ] **OUT-152** claudetto shall not ship an orchestrator that files GitHub issue tickets, picks the model and a per-task token budget for headless sessions by its own experience, and has each task declare the files it will touch and claim an open worktree.
  Acceptance: No claudetto block files tickets or sets a per-task budget; delegation keeps one worktree and disjoint files per worker. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:716 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xgxv58/claude_max_20x_weekly_depleted_in_less_than_25>); user decision, 2026-11-16.

- [ ] **OUT-153** claudetto shall not ship a Stop hook that scolds a session ending on a question without flagging it on a shared work board, nor a lead-dev chat that reads only what the others changed and warns two agents touching the same file.
  Acceptance: No Stop hook inspects the reply text for a closing question. Verification: inspection.
  Basis: reported, one user. Status: missing at 088a227c.
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xc8eg5-running-many-claude-code-agents-20261029T123926Z.md:121 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xc8eg5/running_many_claude_code_agents_without>); user decision, 2026-11-16.

- [ ] **OUT-154** claudetto shall not ship a manager session that logs the user's decisions and checks that each was carried out.
  Acceptance: No such session exists in the plugin. One user runs a manager session this way and another runs a checking agent permanently with every task. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Conflicts with: no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:39; external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:68; external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:72 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xigw3d/im_not_a_developer_and_i_run_several_claude_code>); user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

- [ ] **OUT-155** claudetto shall not ship sliding compaction, where a hook at compaction keeps the conversation word for word and replaces old tool outputs (file reads, test runs, diffs) with one line telling the model to read again if needed.
  Acceptance: The plugin holds no sliding compaction. The tokendoctor author reports no model call, so it takes milliseconds; the summary stays as fallback for /compact; sliding is off by default and a replay of the user's own sessions at windows 200K to 600K picks the number. Verification: inspection.
  Basis: reported, one author. Status: missing at 088a227c.
  Conflicts with: handover replaces core auto compaction by default; manual `/clear` stays and writes a handover first; `CLAUDETTO_*` handover knobs mirror Claude Code's compaction knobs (user decision, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369)).
  Source: external/2026-11-02/reddit.com-r-claudecoding-comments-1xlfx93-compacting-at-400k-instead-o-20261102T070132Z.md:48; external/2026-11-02/reddit.com-r-claudecoding-comments-1xlfx93-compacting-at-400k-instead-o-20261102T070132Z.md:69 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xlfx93/compacting_at_400k_instead_of_967k_cut_my_claude>); user decision, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369).

- [ ] **OUT-156** claudetto shall not ship a harness where Claude does only architecture, planning, shaping and UAT while a local model writes the code and tests.
  Acceptance: The plugin routes no coding to a local model. One commenter runs a local Qwen 3.8 27b (4-bit, 260k prompt) at about 6M output tokens a day in batch for about 3 dollars a day of electricity, a mistake rate not much above Haiku's, with unit tests, a frontier-model review, and a periodic UAT sweep; a split function routes an issue to smaller ones when the local model runs out of turns or context. Verification: inspection.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:105; external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:113; external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:115; external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:117; external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:119 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xl9c92/forget_the_usual_claude_tips_what_are_the_strange>); user decision, 2026-11-16.

- [ ] **OUT-157** claudetto shall not ship a cost split where Opus writes the plan and spec, DeepSeek implements, a new implementation-model session reviews in a review-fix loop run twice, and Opus gives a final pass once tests pass.
  Acceptance: The plugin routes no implementation to DeepSeek. One user built a router metrics exporter for under a dollar against an estimated 10 to 30 dollars on Opus and Sonnet; the estimate is unverified. Verification: inspection.
  Basis: reported, one user, estimate unverified. Status: missing at 088a227c.
  Conflicts with: no component swaps (user decision, 2026-11-16).
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:195; external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:199; external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:201; external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:211; external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:213 (url: <https://www.reddit.com/r/claude/comments/1xlrxh9/new_to_claude_any_tips_for_saving_tokens>); user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

- [ ] **OUT-158** claudetto shall not enable the advisor pattern (a strong model consulted before committing, when stuck, and before done; `advisorModel`, `/advisor`, `/advisor fable`, Sonnet 5.5 high main with an Opus advisor). Setup keeps `CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1"`. Also: not ship the native advisor tool or an advisor model setting as a routing option. The advisor is a server tool, so hooks never see it and no setting caps it; "unavailable" is a generic message for several causes; the pairings are Sonnet+Opus, Sonnet+Fable (v2.1.170+), Haiku+Opus, Opus+Opus, and Fable+Fable. `/advisor` stays disabled by `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`; `useAdvisorTool` and `useAdvisorCommand` go. Also: not enable the advisor tool (`/advisor fable` on an Opus session). Findings against it: two authors report `/advisor fable` inside Claude Code with Opus 5.5 works as a second opinion; one recommends it at a token cost justified when the advisor prevents impactful mistakes.
  Acceptance: the written env holds `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` "1" and no `advisorModel`. Verification: inspection.
  Basis: measured, one user (95 calls, 19.6M uncached input tokens, 3-5% of usage); cited second-hand (Opus 5.5 plus Fable advisor 1.7 points over Opus alone for about 2.1x cost); cited (docs) and reported; reported, 2 authors and 1 author (downvoted).
  Status: have at 088a227c (`settings.ts:178` writes `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`; `advisorModel` is absent).
  Conflicts with: the advisor tool stays disabled (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-10-21/reddit.com-r-claudeai-comments-1xbipii-claude-invented-an-email-bounce-20261021T101718Z.md:33 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xbipii/claude_invented_an_email_bounce_that_never>); plugins/claudetto/hooks/features/setup/settings.ts:178@088a227c; user decision, 2026-11-14 02:35 UTC, the Advisor tool goes if it cannot be cache-aligned (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:30659); external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:240; external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:244 (url: <https://www.reddit.com/r/claude/comments/1xtnyre/unpopular_opinion_i_am_back_on_opus_55_after>); external/2026-11-13/reddit.com-r-claudeai-comments-1xtyq0y-fable-52-wakes-up-opus-55-20261112T231243Z.md:164 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xtyq0y/fable_52_wakes_up_opus_55>).

- [ ] **OUT-159** claudetto shall not make Fable the daily implementer, "always strongest model and max effort", or max or ultra effort the default (xhigh Opus took 100k+ tokens and an hour for what medium does in 10 minutes).
  Acceptance: no default sets max or ultra effort and no agent file names Fable or Opus as `model:`. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:116; external/2026-10-17/export-Haiku 5.5 on Steroids.jsonl:18 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x5rbwy/haiku_55_on_steroids>).

- [ ] **OUT-160** claudetto shall not enforce banned-word lists for hedges or trust-the-file CLAUDE.md rules: the model finds synonyms and drifts past a rule deep in context, especially after auto-compaction. Hooks enforce instead.
  Basis: reported. Status: not applicable.
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:181.

- [ ] **OUT-161** claudetto shall not plan phases with token estimates: small phases, a PLAN.md with estimate against actual, per-phase handoff files, and "no subagents without approval" are a planner. A commenter doubts that estimating tokens costs less than it saves. Spec-then-write-back and "only ask what two different answers would change the file layout for" stay as prompt posture.
  Basis: reported. Status: partial at 088a227c (the openspec flow; no actual-against-estimate table).
  Conflicts with: no planner (user decision, 2026-11-16).
  Source: external/2026-10-12_p3/export-Is Sonnet 5.5 a good replacement for Opus-.jsonl:7 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x3wwa4/is_sonnet_55_a_good_replacement_for_opus>).

- [ ] **OUT-162** claudetto shall not build a goal-aware Stop block or a prompt key scan: no typed interface exposes the active goal and no incident is recorded. `/goal` is a Stop hook that must be satisfied; `/loop <interval> <prompt>` is a cron (`CronCreate`) that fires regardless; a loop stop condition must check task completion, not the end of a turn. Revisit when `index.d.ts` exposes the goal. Also out: an elapsed-time budget in the prompt ("elapsed 340s / 1200s") as a pacing device, since the model does not check the clock.
  Acceptance: no Stop check reads an active goal; no hook scans each prompt for a key. Verification: inspection.
  Basis: reported and inferred (recommendation: no typed interface exposes the active goal; the key scan is a candidate with no measured miss).
  Status: have at 088a227c (`git grep -l -E '\bgoal\b' 088a227c -- plugins/claudetto/hooks` finds 0 files).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: verified on 2.1.327: `/goal` is a registered command (`chunk-nt0e4byj.js@774`), the active goal sits in app state read beside `executeStopHooks` (`activeGoal`, `chunk-z02chaqz.js@9049`), and cc-inspect `surface` mod-api finds no `goal` entry (0 matches), so no typed interface exposes it; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:288 (item 8, goal-aware Stop block) and :289 (item 9, prompt key scan).

- [ ] **OUT-163** claudetto shall not scan replies at Stop for `- [ ]` or `- !` command bullets (opens with `!` or backtick-`!`; numbered task lines are no question; a bullet quoting `! cmd` in backticks is no stray command). This is a regex Stop check, which the settled decision rules out. History: 16 of 108 items were questions typed as items; the check had real catches (stray `sudo`, `! cd ... && git push`).
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
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:422; external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:423; external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:424 (url: <https://www.reddit.com/r/claude/comments/1xtnyre/unpopular_opinion_i_am_back_on_opus_55_after>); user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560).

- [ ] **OUT-168** claudetto shall not add a check that bounces text which opens by praising the post or ends on an either/or question (one rewrite, then a hold for a human).
  Basis: reported. Status: not applicable (scope out).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:281 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange>).

- [ ] **OUT-169** claudetto shall not add a Stop hook that checks the reply for remaining `[ ]` items before the turn may end, nor one that bans stopping until DONE. Commenters attribute early stops to a per-turn step budget and to low effort or Haiku; /goal is the other cure named.
  Basis: reported, inferred, no measure. Status: not applicable (scope out).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqlgno-agents-knowingly-fail-to-complet-20261110T093545Z.md:187 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqlgno/agents_knowingly_fail_to_complete_tasks_in_order>).

- [ ] **OUT-170** claudetto shall not ship the plugin eval suite (`plugins/claudetto/evals/`, its results dir), the per-rule eval-case inventory, or goal-overnight.txt benchmark targets. The plugin eval suite (`plugins/claudetto/evals/`, results dir, design Decision 11), per-rule eval-case inventory (agent-conduct "Each Rule Has an Eval Case"), and goal-overnight.txt demands are dropped: the tested agent wrote its graders and edited them after seeing runs, so scores are meaningless; conduct incl. the opener is scored by `conductOf` (tools/bench/transcript.ts) on the benchmark. goal-overnight.txt demands (owner rejected, context only): SWE-bench-style tasks from pinned 1k+ star repos with hidden PR tests; stock vs dev headless, same model/effort; evals frozen before run 1 with one unseen holdout; targets 98-99% cache hit after turn 1, no auto-compaction or 59+ min session, no unchanged-file rereads; mutation-proven tests (Stryker, mutmut); least code (jscpd); stock-vs-final outcome table; JSON pass/fail list with push of each green commit; 24 external URLs each adopted/rejected/blocked; 98-row "I01-I18" dossier table; "senior engineer who catches mistakes before they're written". Result: harness, holdout tooling, mutation scores and 98-row table built while cache/compaction/reread/cost targets stayed without a result (pass:false). Reason: benchmark metrics replaced product behaviour (inferred); dev cost 2.3x stock (round 5 $9.10 vs $3.98) from the mutation rule (hono $2.14 20.8 min vs $0.74). Kept from it: "tested agent can't write graders, hidden tests, holdout, results; grade outside its workspace" -> holdout under `~/.claudetto-holdout` (sandbox read-deny; this session's sandbox prompt lists it under `denyOnly`, which 2.1.326 carries at `chunk-1yrzf3wn.js@645187 (2.1.327)` (cc-inspect `code` search)) -> wall mechanism and `protectedPaths`; holdout scoring stayed a user step (items.json bench-holdout). Frozen graders held out from the tuned agent stay as the note. Purpose conflict: surface-trim character golf is the benchmark-chasing the owner rejected unless billed cost is checked (inferred). Repo: have (tools/bench/transcript.ts; `plugins/claudetto/evals` absent). Also: not carry forward the deleted plugin eval suite, in which the agent under test wrote its own graders after seeing results. Also: not carry a headless stock-against-dev benchmark with hidden tests, a task set from merged PRs, mutation scoring of the agent's tests, a dossier claim extractor, or a results table in a design file; not carry benchmark rounds, a holdout set, or a stock-against-final table; not carry the benchmark and metric goal lines (priorities, cache, latency, token measures) of the 2.1.325 goal. The settled decision of no benchmarks holds; the user said nobody asked for benchmarks, which conflicts with the earlier goal text at ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490. The user decided this on 2026-11-16 (date of the handoff that records it; day of decision not recorded); `tools/bench/` exists in the old tree, so the baseline holds the part that goes.
  Acceptance: No `evals/` tree and no benchmark target exist in the target tree. Verification: inspection.
  Basis: user decision (the 2026-11-16 benchmark ruling), cited, observed in transcript. Also read.
  Status: have at 088a227c (`git ls-tree -r --name-only 088a227c -- plugins/claudetto/evals` lists 0 files; `tools/bench/` exists, see the bench item).
  Conflicts with: no benchmarks (user decision, 2026-11-16).
  Source: openspec/changes/2-1-325-rearchitecture/tasks.md:44; openspec/changes/2-1-325-rearchitecture/goal-overnight.txt:15; openspec/changes/2-1-325-rearchitecture/goal-overnight.txt:17; openspec/specs/agent-conduct/spec.md:151; openspec/changes/2-1-325-rearchitecture/specs/agent-conduct/spec.md:7; unresolved: no source line located for this claim.; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790

- [ ] **OUT-171** claudetto shall not carry the removed Stop-hook machinery: open-items word lists and model grader, prompt-key scan, goal-aware Stop block, offer word list, test-tampering gate, `useSliceCommits`, cleanup and background-task Stop blocks, two-call grader, named-files check, stall stop. Gone: word lists for the open-items check (each word one more escape) and its model grader (syntax only); prompt-key scan, goal-aware Stop block, offer word list, test-tampering gate (not built; test-tamper check "not sound", tasks 13.2); `useSliceCommits`, cleanup and background-task Stop blocks, the two-call grader, named-files check, stall stop (slice check hashed every `git status` path incl. agent worktrees and blocked 44 times in a row). `open-items.ts` goes with no Stop check in its place (user decision, AskUserQuestion 2026-11-17); `texts-grade.ts` fault list becomes one prompt-type Stop hook (one call where the grader made two; Haiku alone missed 4 of 12; two-model vote loss measurable only by a paid replay, unapproved); `/goal` covers continuation (on 2.1.327 `/goal` is registered with `isEnabled: ()=>_e()||xn()` at `chunk-nt0e4byj.js@774`; a clean-config `-p "/goal tests pass"` run through cc-inspect `code` cli exited 0); commit rule stays a prompt line. Preamble claim "Stop-block text in `context`" wrong: text goes to `stdout` (grader blocked more when it sat in `context`). Basis: measured/reported.
  Acceptance: no open-items Stop hook and no `open-items.ts` remain; the output style alone teaches the `- ! <command>` form. Verification: inspection.
  Basis: measured. Status: partial (see 088a227c hooks; stall stop blocked 44 times in a row).
  Conflicts with: no regex or word-list Stop check for openers (user decision, 2026-11-16).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:247; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:324; openspec/changes/archive/2026-11-16-2-1-323/design.md:127; openspec/changes/archive/2026-11-16-2-1-323/design.md:123; openspec/specs/agent-conduct/spec.md:162.
  Resolved: claudetto shall not ship a Stop check on "Should I" asks or on open-item lists (user decision, AskUserQuestion 2026-11-17: no Stop check).
  Resolved: claudetto shall not read `## What I Need From You` of `last_assistant_message` at Stop with a form check (same decision).
  Resolved: The `open-items.ts` file shall go, because the user asked what it is and nobody asked for it (same decision).

- [ ] **OUT-172** claudetto shall not test `claude-fable-5-2` for Athena. Test: `claude-fable-5-2` (reserved for Athena in project CLAUDE.md) or higher effort instead of `claude-sonnet-5-5` medium (evidence in Keep routing; conflicting); paid check, ask first. Repo: partial (`git show 088a227c:plugins/claudetto/agents/Athena.md` holds `model: claude-sonnet-5-5`, `effort: medium`).
  Acceptance: Athena stays on `claude-sonnet-5-5` medium. Verification: inspection.
  Basis: inferred from the user decision below (Fable and Opus never run as a subagent). Status: have at 088a227c (`git show 088a227c:plugins/claudetto/agents/Athena.md` holds `model: claude-sonnet-5-5`, `effort: medium`).
  Conflicts with: Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).
  Source: AGENTS.md:8@088a227c9 (the repo's instruction file reserves `claude-fable-5-2` for the `Athena` agent; no CLAUDE.md is tracked in git).

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

- [ ] **OUT-176** claudetto shall not set a measured `maxTurns` cap on workers (ProjectArchitect raised its retriever cap from 15 to 25 after the cap lost 16 to 18% of answers). REQ-DELEGATION-063 rules out turn limits that cost a resume; REQ-DELEGATION-064 bounds failures instead.
  Acceptance: no claudetto agent file sets `maxTurns`. Verification: inspection.
  Basis: read (repo agent file). Status: have at 088a227c.
  Conflicts with: REQ-DELEGATION-063 (user decision, 2026-11-14).
  Source: druthulu/projectarchitect at edcc2b00, project-architect-3.0/agents/retriever-code.md:10; reports/2026-11-18-research/repos.md:129.

- [ ] **OUT-177** claudetto shall not build a single-writer guard for its handover state. The pending handover lives in `$.store` (RT-026), which only the mod reaches, so no model tool can write it.
  Acceptance: no PreToolUse rule guards a claudetto state file. Verification: inspection.
  Basis: read (repo docs); [ADR-0177](../adr/0177-pragmatism-gate.md). Status: have at 088a227c.
  Source: druthulu/projectarchitect at edcc2b00, project-architect-3.0/project-architect-3.0.md:174-178; reports/2026-11-18-research/repos.md:124.

- [ ] **OUT-178** claudetto shall not deny whole-file Reads above a size or deny re-reads of unchanged files until a measurement shows a gap. On 2.1.327, 4.2% of reads in the user's sessions were redundant, mostly re-reads after compaction and image re-reads; the built-in Read stops at 262,144 bytes and 25,000 tokens and tells the model to page with offset and limit; 2.1.327 fixed Edit after compaction for files read in full.
  Acceptance: no claudetto hook denies a Read by size or by repeat. Revisit when a dogfood week shows redundant reads above 10% of read tokens. Verification: inspection.
  Basis: measured (reports/2026-11-18-research/sessions.md, Redundant reads); [ADR-0177](../adr/0177-pragmatism-gate.md). Status: have at 088a227c.
  Source: druthulu/projectarchitect at edcc2b00, project-architect-3.0/guard.py:676-725 and 803-850; reports/2026-11-18-research/repos.md:119-120; reports/2026-11-18-research/surface.md:45 (chunk-e38nza00.js@433, chunk-bpr7n093.js@12561, claude 2.1.327).
