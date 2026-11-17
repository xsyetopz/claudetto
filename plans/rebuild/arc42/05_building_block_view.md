# Building Block View

## Handover

- [ ] **BB-001** The nine handoff sections cite samzilverberg/claude-handoff (MIT) as their origin, and the code-built fallback cites who96/claude-code-context-handoff (MIT).
  Basis: cited. Status: missing at 088a227c (`git grep -il 'samzilverberg\|who96' 088a227c` finds nothing over the baseline tree; the rebuild shall carry both credits).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-handoff/spec.md:170,174.

- [ ] **BB-002** Feature `compaction` (`session.compact`, `model.fork`, `turn.complete`) writes its own handoff in place of the core summary. It compacts by session age since session start or since the last compaction (`handoff.ts:67-83`), which the cache semantics do not support, and forks a handoff only on `e.trigger === "auto"` with no `agentId` (71 lines); `session.compact` is registered only there and in `repeat.ts:170`, which listens for trigger `plugin`.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/compaction/handoff.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/compaction/handoff.ts:48@088a227c; plugins/claudetto/hooks/features/compaction/handoff.ts:74@088a227c; plugins/claudetto/hooks/features/compaction/handoff.ts:87@088a227c; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031).

- [ ] **BB-003** Feature `memory` (`tool.check`, `agent.spawn`, `session.usage`) holds a call under memory pressure, plus a session tree.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/memory/hold.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/memory/hold.ts:245@088a227c; plugins/claudetto/hooks/features/memory/session-tree.ts:72@088a227c.

## Baseline Inventory

- [ ] **BB-004** Inventory at 2.1.322 (measured, inferred): 12 `userConfig` options, about 30 mods, status line about 1,240 lines, hygiene CLI about 1,250, `useSetup` about 2,040, Bash gate about 2,616 + vendored shellfirm rules (1,063) + fixtures (about 4,580), tests and mocks about 14k lines; `ROOT_PROMPT` about 6.3k chars and `Concise` about 4.3k go on each turn. Overlaps: agent withholding vs env key and `Agent(name)` deny, tool hiding vs `permissions.deny`, run limits vs spawn-depth and `maxTurns`, hygiene vs `cleanupPeriodDays` (present in claude 2.1.326, checked with `grep -c -a cleanupPeriodDays ~/.local/share/claude/versions/2.1.326`: 15 lines; default 30 and min 1 were read in 2.1.325 and are unverified in 2.1.326).
  Basis: measured. Status: have at 088a227c (inventory of the baseline; counts not re-run).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:9; openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:37.

## claudetto-openspec Plugin

- [ ] **BB-005** claudetto-openspec is an OpenSpec MCP tool plus skills that replace upstream openspec: ONE registered `openspec` deferred tool from `$.tool.register` answering status, validate, and archive in-process, with no executable, node shim, PATH, network, or telemetry (archive runs `mv`, `mkdir -p`, `rm`, `rmdir`, since `$.fs` cannot move a folder). It reads and writes the upstream `spec-driven` layout (`openspec/specs/<cap>/spec.md`; `changes/<name>/` with `.openspec.yaml`, proposal, design, tasks, `specs/` deltas; archive in `changes/archive/YYYY-MM-DD-<name>/` local date), passes upstream `openspec validate --strict`, reads `x-` keys and nested capability paths, and preserves unused keys. A result is bounded to 12,000 chars, whole lines, ends with a count of lines not shown, and a first line past the limit is cut. Skills cover only the workflows used (apply 10 Skill plus 5 slash, explore 7, propose 6, update 6, verify 3, archive 2; sync folded into archive); at 088a227c `plugins/claudetto-openspec/skills` holds 7 folders (apply, archive, explore, propose, sync, update, verify). The validator keeps upstream verdicts except named fixes for upstream defects: validate passes a delta archive refuses (#1112), merges files validate rejects (#2173), exit 0 on an unknown section (#2195), `archive --yes` skips open tasks (#2006, #1652), apply ignores validation warnings (#2166), a renamed scenario reads as dropped (#1697); also retirement with a `leftovers` check, namespace folder, archive lock, local-date name, Purpose carry-over (#1413, unless it hides or splits the spec), preamble kept, and a spec.md or directory link leaving the tree refused. Apply stops on any error or warning and copies each unticked task with its blocker (`! <command>`, denial, open question) when pausing; apply stops only after every step the agent's tools can take, and a physical step is asked as a command. Explore writes no code; propose uses kebab-case and invents no behavior; update edits only `changes/<name>/`; verify reads and edits nothing (critical, warnings, notes). Size: skills 7,415 B vs 95,443; about 2,500 lines vs upstream src 51,803. Port: 763 verdict pairs from upstream 1.16.0 vitest (22 files; 645 returned, 118 threw), 743 pass wired, each counted passed, diverged (named), or excluded with reason.
  Acceptance: status, validate, and archive answer with no executable; each skill holds its stated rules. A `status` with many open tasks hit about 11,400 tokens; Claude Code warns past 10,000. Verification: test.
  Basis: measured. Status: have at 088a227c (plugins/claudetto-openspec/hooks: openspec.ts, status.ts, validate/, spec/; `git ls-tree` of skills lists 7 folders). `$.tool.register` is present in claude 2.1.326 (`grep -c -a -F tool.register ~/.local/share/claude/versions/2.1.326`: 21 lines). The upstream issue numbers were not located in a source line.
  Source: openspec/specs/lean-openspec/spec.md:129; openspec/specs/lean-openspec/spec.md:8; openspec/specs/lean-openspec/spec.md:90; openspec/specs/lean-openspec/spec.md:290; openspec/specs/lean-openspec/spec.md:292; openspec/specs/lean-openspec/spec.md:127; plugins/claudetto-openspec@088a227c; plugins/claudetto-openspec/hooks/register.ts:15@088a227c; plugins/claudetto-openspec/skills (7 folders)@088a227c.
  Conflict: claudetto-openspec ships about 3,300 lines of spec model, validator, and archive code, with 6 skills of 11-22 lines.

- [ ] **BB-006** claudetto-openspec ships about 3,300 lines of spec model, validator, and archive code, with 6 skills of 11-22 lines.
  Basis: measured (counted). Status: have at 2.1.323 inventory; at 088a227c the skills folder holds 7 folders.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:10.
  Conflict: claudetto-openspec is an OpenSpec MCP tool plus skills that replace upstream openspec (6 skills and about 3,300 lines here; 7 skill folders and about 2,500 lines there).

- [ ] **BB-007** claudetto-openspec holds the presets epic (prd, architecture, proposal, specs, design, tasks, review), story (proposal, specs, design, tasks, review) and task (proposal, tasks only; refuses behavior changes: "needs story preset, tell user and stop"). Epic and story `apply.requires: [review]`, review requires tasks; task applies from tasks. Review is a checklist, "a check, not a persona": agreement (each capability has spec, each requirement a scenario, design covers each requirement, no clarify marker) plus, for epic, PM (goal and requirement both ways), Architect (design follows architecture, dependencies and migrations named), QA (each scenario runnable, each error and edge case has one), plus Gaps. Without presets every bug fix pays full ceremony. The target drops `schemas/*` generated copies (two-path setup, tools/generate removed).
  Acceptance: Epic and story `apply.requires: [review]`; review requires tasks; task applies from tasks; review is a checklist, "a check, not a persona". Verification: inspection.
  Basis: cited. Status: missing at 088a227c (`git grep -il epic 088a227c -- plugins/claudetto-openspec` finds nothing; openspec uses upstream spec-driven).
  Source: openspec/specs/lean-openspec/spec.md:74.

- [ ] **BB-008** claudetto-openspec refuses an archive for an unticked task (no override; upstream #2006, #1652; the refusal names the task and leaves the tree unchanged), a folder holding changes but not a change (`not_a_change`, #1846), `.openspec-archive.lock` (`archive_locked`), a capability dir or spec.md linking out of the specs tree, or an existing target (`archive_target_exists`, same-day); it retires a capability only when `.openspec.yaml` sets `retire_capabilities: true`, the delta removes every requirement, and the spec holds nothing else (#1302).
  Acceptance: Text: `Archive of <name> refused, nothing changed: <why>`; the tree stays unchanged. Verification: inspection.
  Basis: cited. Status: have at 088a227c (validate/archive.ts:80, archive-merge.ts:14,90).
  Source: openspec/specs/lean-openspec/spec.md:63; openspec/specs/lean-openspec/spec.md:54; openspec/specs/lean-openspec/spec.md:81; plugins/claudetto-openspec/hooks/validate/archive.ts:80@088a227c.

- [ ] **BB-009** claudetto-openspec validate runs the SAME merge as archive (RENAMED, REMOVED, MODIFIED, ADDED) so a delta archive would refuse fails (#1112 reports INFO and passes); it allows only `specs/<cap>/spec.md` and ADDED/MODIFIED/REMOVED/RENAMED sections (#2173, #2195); a MODIFIED requirement growing past 500 chars when main text is at most 500 warns (strict fails), with no warning if already over 500; and with no change it checks every active change and main spec in one strict pass (Purpose at least 50 chars, a requirement, SHALL/MUST, a scenario), replacing `bunx openspec validate --all --strict` in the justfile.
  Acceptance: Each fix only fails what upstream passes. Verification: inspection.
  Basis: measured. Status: have at 088a227c (plugins/claudetto-openspec/hooks/validate/validate*.ts, openspec-grow.test.ts).
  Source: openspec/specs/lean-openspec/spec.md:22; openspec/specs/lean-openspec/spec.md:36; openspec/specs/lean-openspec/spec.md:276; openspec/specs/lean-openspec/spec.md:136.

## Kernel

- [ ] **BB-010** The hook entry `plugins/claudetto/hooks/hooks.json`: `SessionStart` runs renice and caps build jobs and memory (`CARGO_BUILD_JOBS`, `GOMAXPROCS`, `GOMEMLIMIT`), then runs `scripts/session-start.ts`. `UserPromptSubmit` blocks `/claudetto:setup` when the plugin code is not loaded. `PreCompact` runs `scripts/pre-compact.ts`.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/hooks.json` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/hooks.json:5@088a227c; plugins/claudetto/hooks/hooks.json:19@088a227c; plugins/claudetto/hooks/hooks.json:29@088a227c.

- [ ] **BB-011** `hooks/register.ts` is a mod that chains features through `kernel/chain.ts`. The price step is registered outermost, so it bounds what every later hook adds.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/register.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/register.ts:46@088a227c.

- [ ] **BB-012** `kernel/` holds `chain`, `decider` (with `jev`), `shell/` (`shell-words`, `program-at`, `readonly`, `verdict`, `shell-state`), `secrets`, `settings`, `tools`, `note`, `heartbeat`, `absent`, `texts`.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/kernel` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/kernel/chain.ts:1@088a227c; plugins/claudetto/hooks/kernel/decider/jev.ts:1@088a227c; plugins/claudetto/hooks/kernel/shell/shell-state.ts:1@088a227c.

## Guards

- [ ] **BB-013** Feature `hygiene` (`settings.read`, `env.get`) runs `bin/claudetto-hygiene` (temp, branch, and trash sweep), capped at 10 minutes per run.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/hygiene/hygiene.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/hygiene/hygiene.ts:6@088a227c (`SWEEP_TIMEOUT_MS = 600_000`).

- [ ] **BB-014** Feature `line-file` (`session.measure`) writes the compaction window and theme for the status line. The status line reads `hooks/limits/line-file.ts` (`.claude/claudetto/statusline/<session>.json`, written on `session.measure`) with `readLine` capped at 1024 bytes, six engine themes in `PALETTES`, and the subagent line reading the theme under stdin `cwd`.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/line-file/line-file.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/line-file/line-file.ts:5@088a227c; plugins/claudetto/hooks/register.ts:60@088a227c; observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11).

- [ ] **BB-015** Feature `protected` (`tool.check`) denies writes the sandbox would refuse in a project folder. The list was measured on 2.1.323.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/protected/protected.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/protected/protected.ts:11@088a227c; plugins/claudetto/hooks/register.ts:106@088a227c.

- [ ] **BB-016** Feature `repeat` (`process.run`, `session.end`) points back to an earlier long output in place of sending it again.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/repeat/repeat.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/repeat/repeat.ts:58@088a227c; plugins/claudetto/hooks/features/repeat/repeat.ts:180@088a227c.

- [ ] **BB-017** Feature `secrets` (`session.cwd`, `session.root`) is a secret scan.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/secrets/scan.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/secrets/scan.ts:1@088a227c.

- [ ] **BB-018** Feature `temp-cleanup` (`session.end`) removes the session's temp files.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/temp-cleanup/cleanup.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/temp-cleanup/cleanup.ts:49@088a227c.

- [ ] **BB-019** Feature `web` (`process.run`) is a `web_fetch` tool.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/web/texts.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/web/texts.ts:7@088a227c.

## Delegation

- [ ] **BB-020** Feature `agent-model` (`agent.spawn`) sets the model from the agent file.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/agent-model/model.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/agent-model/model.ts:5@088a227c.

- [ ] **BB-021** Feature `delegation` (`agent.offer`, `tool.describe`, `tool.call`, `tool.register`) holds agent routing texts and caps.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/delegation/delegation.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/delegation/delegation.ts:7@088a227c; plugins/claudetto/hooks/features/delegation/delegation.ts:11@088a227c.

- [ ] **BB-022** Agents at 088a227c: `Artemis` (search; `claude-haiku-5-5`, effort high), `Athena` (review; `claude-sonnet-5-5`, effort medium), `Heracles` (edit; `claude-sonnet-5-5`, effort medium), `Metis` (plan; `claude-sonnet-5-5`, effort medium). Open repo-side question: repo instructions list `claude-fable-5-2` and `claude-mythos-5-2` as the models for Athena, yet Athena.md sets Sonnet 5.5.
  Acceptance: `git show 088a227c:plugins/claudetto/agents` shows it; the four `agents/*.md` files hold these `model:` and `effort:` lines. Verification: inspection.
  Basis: measured. Status: have at 088a227c.
  Source: plugins/claudetto/agents/Artemis.md:4@088a227c; plugins/claudetto/agents/Athena.md:4@088a227c; plugins/claudetto/agents/Heracles.md:4@088a227c; plugins/claudetto/agents/Metis.md:4@088a227c.

## Reply

- [ ] **BB-023** Feature `prompt` (`prompt.compose`) is the root prompt; Haiku gets no delegation block.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/prompt/texts.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/prompt/compose.ts:8@088a227c; plugins/claudetto/hooks/features/prompt/texts.ts:35@088a227c.

- [ ] **BB-024** Feature `reply` (`command.run`, `ui.selection`, `prompt.fill`): `/reply` quotes part of a reply.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/reply/reply.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/reply/reply.ts:39@088a227c.

- [ ] **BB-025** Feature `stop-notice` (`ui.notify`) notifies when an API error ends a turn.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/stop-notice/stop-notice.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/stop-notice/stop-notice.ts:10@088a227c.

- [ ] **BB-026** The `Concise` output style.
  Acceptance: `git show 088a227c:plugins/claudetto/output-styles/Concise.md` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/output-styles/Concise.md:1@088a227c.

- [ ] **BB-027** 11 rule files are copied to `~/.claude/rules/claudetto/`: `commentOnlyWhy`, `findFactsByExperiment`, `guardOnlyTrustBoundaries`, `lookForClone`, `scopeEditsToGoal`, `useBlockLanguage`, `useEdgeCaseReport`, `useHeadlineseNames`, `useLeastCode`, `useOneObviousWay`, `useTestPatterns`.
  Acceptance: `git show 088a227c:plugins/claudetto/rules` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/rules/commentOnlyWhy.md:1@088a227c (`git ls-tree`: 11 files).

## Cost

- [ ] **BB-028** Feature `budget` (`prompt.submit`, `session.messages`) holds context and weekly budget notes.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/budget/budget-run.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/budget/budget-run.ts:73@088a227c.

- [ ] **BB-029** Feature `decide` (`model.complete`, `http.fetch`) is an MCP `decide` tool that asks a model for a choice; questions are keyed by index.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/decide/decide.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/decide/decide.ts:1@088a227c; plugins/claudetto/hooks/register.ts:120@088a227c.

- [ ] **BB-030** Feature `price-step` (`turn.step`) bounds a Haiku request below its 5x price tier.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/price-step/price-step.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/price-step/price-step.ts:15@088a227c; plugins/claudetto/hooks/features/price-step/price-step.ts:102@088a227c.

- [ ] **BB-031** The status line (`statusline/`, `bin/claudetto-statusline`) draws rows, segments, limits, and colour; colour is off under `NO_COLOR`.
  Acceptance: `git show 088a227c:plugins/claudetto/statusline/color.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/statusline/color.ts:82@088a227c; plugins/claudetto/statusline/rows.ts:1@088a227c.

## Setup

- [ ] **BB-032** Feature `setup` (`command.run`, `skill.prompt`, `tool.register`): `/claudetto:setup` writes settings, starters, ignore blocks, rules, and auto-mode rules.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/setup/setup.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/setup/setup.ts:214@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:102@088a227c.

- [ ] **BB-033** Feature `surface` (`tool.describe`, `tool.list`, `prompt.attachment`) trims tool descriptions and defers tools; `Read`, `Write`, and `ListAgents` stay loaded.
  Acceptance: `git show 088a227c:plugins/claudetto/hooks/features/surface/surface.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/surface/surface.ts:9@088a227c.

- [ ] **BB-034** The `/claudetto:setup` command.
  Acceptance: `git show 088a227c:plugins/claudetto/commands/setup.md` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/commands/setup.md:1@088a227c.

- [ ] **BB-035** Repo state at 088a227c: setup groups write `promptCacheTtl` and `subagentPromptCacheTtl` "1h", `bashOutputMaxChars` 8000, `MAX_MCP_OUTPUT_TOKENS` "10000", `CLAUDE_CODE_SUBAGENT_MODEL` Sonnet, the model pins, `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` "1", and `showThinkingSummaries` false. The `claudetto` plugin holds the statusline (limits, cold), the price-step and budget features, and the four agents.
  Acceptance: `setup/settings.ts` lines 117-202 hold each key; each key name is present in claude 2.1.326 (`grep -c -a <key> ~/.local/share/claude/versions/2.1.326`: promptCacheTtl 5, subagentPromptCacheTtl 5, bashOutputMaxChars 4, MAX_MCP_OUTPUT_TOKENS 5, CLAUDE_CODE_SUBAGENT_MODEL 19, CLAUDE_CODE_DISABLE_ADVISOR_TOOL 4, showThinkingSummaries 10). Verification: inspection.
  Basis: measured. Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/setup/settings.ts:117@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:167@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:202@088a227c.

- [ ] **BB-036** `surface.ts` hides 27 commands and 18 skills and rewrites 21 tool descriptions. Setup turns off 11 `cc-plugin` builtins and about 28 feature keys. `PIN_NOTE` is sent per prompt; `SILENT_TURN_REMINDER` text is about 170 chars.
  Basis: measured (counted; the 170 chars is an estimate).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:31; openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:48; openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:49; openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:54; openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:58; plugins/claudetto/hooks/features/surface/surface.ts@088a227c.

## You Should Know

- [ ] **BB-037** `claudetto-you-should-know` runs a side check every few steps that shows a note above the prompt. Tool calls are logged, but none is held.
  Acceptance: `git show 088a227c:plugins/claudetto-you-should-know/hooks/register.ts` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto-you-should-know/hooks/register.ts:36@088a227c; plugins/claudetto-you-should-know/hooks/register.ts:174@088a227c; plugins/claudetto-you-should-know/hooks/hooks.json:1@088a227c (no `PreToolUse` hook).

- [ ] **BB-038** `claudetto-you-should-know` is about 1,100 lines.
  Basis: measured (counted).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:11.

## Verification

- [ ] **BB-039** `tools/` holds bench, fake-api, claim-check-*, mutate-command, prompt-bytes, release-version, and assorted repo tests. A `handover-probe` tool is not in the `088a227c` tree: only `CHANGELOG.md` and `budget-run.test.ts` name it.
  Acceptance: `git show 088a227c:tools` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: tools/bench/run.ts:1@088a227c; tools/fake-api/fake.ts:1@088a227c; tools/mutate-command.ts:1@088a227c; tools/prompt-bytes.ts:1@088a227c; tools/release-version.ts:1@088a227c; CHANGELOG.md (`git grep handover-probe 088a227c`).

- [ ] **BB-040** `tests/claudetto` and `tests/claudetto-openspec` hold the end-to-end specs.
  Acceptance: `git show 088a227c:tests` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: tests/claudetto/secrets.spec.ts:1@088a227c; tests/claudetto-openspec/upstream.spec.ts:1@088a227c.

- [ ] **BB-041** claudetto holds these measured baseline figures: Stryker `just mutate` at 6eb97120 68.00% (2,422/3,562), per-folder delegation 100, prompt 94.74, hygiene 16.28, web 30.77, later hygiene 96.12, web 98.08, protected 94.62, surface 80.72; mutmut 91% (74/81, 7 equivalent survivors named in design.md); the agent's own tests stock 78.0/71.8/72.4% vs dev 84.0/89.4/78.3%; jscpd 0 clones in 277 files at 2026-11-16 (earlier: 1 exact 7-line clone in 262 files, 0.02%); plugin source 12,506 lines at b4191bcf vs 12,610 at merge-base 6f81c479; base 13,389 -> 13,373 lines; about 17.5k counting 45k generated types and evals results; 2 skills, 4 agents, 3 hooks, about 183 always-on tokens; `claude plugin test plugins/claudetto-you-should-know`: 97 pass 2 fail before, 99/99 after (2a47bb6e); `just check` exit 0 with 1022 tests, labs 1045/97/41/1009.
  Acceptance: Each figure is reproduced by its command. Verification: inspection.
  Basis: measured. Status: have at 088a227c (tools/mutate-command.ts).
  Source: openspec/changes/2-1-325-rearchitecture/items.json:106; openspec/changes/2-1-325-rearchitecture/design.md:183; openspec/changes/2-1-325-rearchitecture/items.json:114; openspec/changes/2-1-325-rearchitecture/goal-overnight.txt:17.

## Whole Repository

- [ ] **BB-042** The `docs` skill.
  Acceptance: `git show 088a227c:plugins/claudetto/skills/docs/SKILL.md` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: plugins/claudetto/skills/docs/SKILL.md:1@088a227c.

- [ ] **BB-043** 79 hyphenated source files exist (`find plugins tools -name '*-*.ts'`), which the rebuild turns into real directories.
  Acceptance: `git show 088a227c:plugins` shows it. Verification: inspection.
  Basis: cited. Status: have at 088a227c.
  Source: probe: `find plugins tools -name "*-*.ts" | wc -l` on the `088a227c` tree printed 79 (2026-11-17).

## Mods and Plugins That Stay

- [ ] **BB-044** The mods that stay at D323: Decider and the `decide` tool, `price-step`, `/reply`, the memory hold, the slim surface, the line file, the Budget line, `sandbox-git.ts` (retest on 2.1.323), the `claudetto-openspec` tool, and `claudetto-you-should-know`. `/advisor` and the starter files wait on probes.
  Basis: reported. Status: have at 088a227c (hooks/features/*; `sandbox-git.ts` is not in the tree).
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:198; openspec/changes/archive/2026-11-16-2-1-323/design.md:204.

## Components by Lifecycle

- [ ] **BB-045** Components are placed by lifecycle: one owner per failure at one lifecycle point; a component imports only `kernel/`; guards run in one chain per event and each answers or passes; classic shell hooks only where a mod cannot act. The layout is `hooks/kernel/` and `hooks/features/<name>/` with one register entry each.
  Basis: reported. Status: have at 088a227c (hooks/kernel, hooks/features).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:107.

- [ ] **BB-046** The rebuild shape: handoff by `$.model.fork`; `claudetto-you-should-know` ported from the 2.1.325 built-in on `turn.step`, never blocking; one Decider (Jev) with a configurable model fallback (`claude-haiku-5-5`, high; `deciderModel`, `deciderEffortLevel`; `settle.ts` and `questions.ts` deleted); vanilla tools, plan mode, workflows, built-in plugins and connectors trimmed, with own web tools (`web_fetch` is curl plus an extractor, agent-browser as fallback; the built-in WebFetch leaves the tool list, WebSearch stays); the root prompt (director model) at or under the lean prompt length; an output style of 1,356-1,373 chars built from the built-in Concise and Proactive; every description at most 200 chars; one testing rule (`useTestPatterns`); `claudetto-openspec` at OpenSpec 2.0.0 core; behaviour tests in Arrange-Act-Assert with real `claude` sessions for runtime behaviour; `protected-switch` as a `tool.check` mod; `StopFailure` as `classic.StopFailure`.
  Basis: reported. Status: have at 088a227c (hooks/kernel, hooks/features, kernel/settings.ts `deciderModel`, rules/useTestPatterns.md).
  Source: openspec/changes/2-1-325-rearchitecture/proposal.md:12; openspec/changes/2-1-325-rearchitecture/design.md:107.

## setup

- [ ] **BB-047** At baseline `settings.ts:146` writes `minimumVersion`, not `requiredMinimumVersion`; `settings.ts:114` sets Haiku `autoCompactWindow` to 100000; `settings.ts:178` handles the advisor.
  Acceptance: the lines hold those keys. Verification: inspection.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).

## delegation

- [ ] **BB-048** At baseline `hooks/runs.ts` writes the run log and reuses `isRecord`, `lineOf`, `pathOf` and `WRITING_TOOLS` from `handoff/transcript.ts`.
  Acceptance: the exports exist. Verification: inspection.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

## kernel

- [ ] **BB-049** At baseline `Concise.md` says to ask through the popup before assuming anything the request leaves open, which conflicts with `texts.ts:16`; a manifest test pins the older line.
  Acceptance: both lines exist. Verification: inspection.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

- [ ] **BB-050** At baseline the root prompt names the opener it forbids (`hooks/features/prompt/texts.ts:15`) and the reply judge `SHIPPED_REGISTER` in `decider/questions.ts` is unwired since `16ecb31b`.
  Acceptance: the lines exist. Verification: inspection.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).
