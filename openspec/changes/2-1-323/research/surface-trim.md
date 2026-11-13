# Surface trim: claudetto against Claude Code 2.1.323

## Method and labels

- Source read: every non-test, non-mock file under the five roots (counts from `wc -l`): `plugins/claudetto/hooks/` 15371 lines in 111 files (5646 of them generated), `plugins/claudetto/statusline/` 1238, `plugins/claudetto/hygiene/` 1252, `plugins/claudetto-you-should-know/hooks/` 1082, `plugins/claudetto-openspec/hooks/` 3025. A per-module row follows. Each module's job comes from its header comment and exports (all read); the modules named in the defect column were read in full around the cited lines.
- Built-in labels: observed = listed by `cc-inspect` `surface` or `code` against the installed 2.1.323 in this session. cited = a clawdipedia-docs page, whose index says Claude Code 2.1.319, so cited is one build behind. inferred = reasoned, no run; a hypothesis until a probe confirms it.
- Defect labels: read = `file:line` read in this session. audit = from the task brief, not re-measured here (the 235+ Read/Write-not-shell count in particular).
- No row below was probed by a run. The verdicts marked "needs probe" need a replay (named in the last section) before the code is deleted.

## Built-ins observed in 2.1.323 that the rows use

| Built-in | Source | Label |
|---|---|---|
| `permissions.allow`, `ask`, `deny`, `denyInsteadOfPrompting`, `blockReadsOutsideWorkingDirectories`, `blockFileToolReadsOutsideWorkingDirectories`, `blockWritesOutsideWorkingDirectories` | `surface` kind setting-key | observed |
| `sandbox.filesystem.{allowRead,allowWrite,denyRead,denyWrite}`, `sandbox.network.*`, `sandbox.credentials.*`, `sandbox.excludedCommands`, `sandbox.ripgrep.*` | `surface` kind setting-key | observed |
| `autoMode.{allow,soft_deny,hard_deny,environment,classifyAllShell}` | `surface` kind setting-key | observed |
| `modelSettings.*.{autoCompactWindow,effortLevel,maxEffortLevel}` | `surface` kind setting-key | observed |
| `worktree.{baseRef,bgIsolation,location,sparsePaths,symlinkDirectories}` | `surface` kind setting-key | observed |
| `statusLine.{command,padding,refreshInterval,type,hideVimModeIndicator}` | `surface` kind setting-key | observed |
| `subagentStatusLine`: schema text "Deprecated: no longer has any effect. Subagent rows always use the default look." | `code` search, `chunk-3dhh2g49.js:255110` | observed |
| Env: `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`, `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_SUBAGENT_EFFORT`, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` | `surface` kind env, name SUBAGENT | observed |
| Hook events: 33 classic events incl. `PreToolUse`, `PermissionDenied`, `PermissionRequest`, `Stop`, `StopFailure`, `SubagentStop`, `PreCompact`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch`, `WorktreeCreate`, `WorktreeRemove`, `TaskCreated`, `UserPromptExpansion` | `surface` kind hook-event | observed |
| Mod events/calls: `tool.list` (event and `$.tool.list`), `tool.call`, `tool.check`, `tool.describe`, `tool.register`, `agent.spawn`, `agent.offer`, `prompt.compose`, `prompt.attachment`, `command.run`, `command.describe`, `session.measure`, `turn.step`, `$.model.complete`, `$.fs.stat`, `$.fs.exists` | `surface` kind mod-api | observed (names only; signatures are in a compressed `.d.ts` that `code read` returned as binary, so no payload was read) |
| `/advisor` slash command, gate `isEnabled ()=>he()&&ux()` | `surface` kind slash-command | observed; whether the gate is on for this account is unchecked |
| Prompt-type Stop hook ("evaluating a stop-condition hook"), `/goal` as a session Stop hook | clawdipedia `prompts/hooks/hook-prompt-stop`, `prompts/skills/skill-goal` | cited |
| `cleanupPeriodDays` removes transcripts, not worktrees | clawdipedia `configure/settings/core` | cited |
| `ExitWorktree` refuses removal of a worktree with changes unless `discard_changes` | clawdipedia `prompts/tools` | cited |
| `agent` frontmatter fields, `disableBundledSkills`, `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, `permissions.deny Agent(name)` | task brief | cited by the brief, not re-read |

A discrepancy to know: the brief says `subagentStatusLine` is removed. It is still a settings key in 2.1.323, but a deprecated no-op (observed above), so the effect is the same: `plugins/claudetto/statusline/subagents.ts` and the key in `plugins/claudetto/settings.json` do nothing.

## Rows: `plugins/claudetto/hooks/` (paths relative to it)

Verdict words: drop; replace with X; move to classic hook; move to skill/style/rule; keep as mod; merge with Y.

| Path | Lines | Job | 2.1.323 built-in (source, label) | Verdict | Defects caused |
|---|---|---|---|---|---|
| `hooks.json` | 26 | Two classic command hooks: SessionStart renice and env caps, UserPromptSubmit guard that blocks `/claudetto:setup` when the plugin code is not loaded | Already classic hooks (observed events) | keep; already the cheap surface | none |
| `register.ts` | 179 | Wires every mod hook, wrap order, `session.start` registration of commands and tools | none | keep as mod; shrinks to the survivors | Its `checkGuards`/`callGuards` chains hold 5 and 13 guards, most dropped below |
| `options.ts` | 25 | Plugin option readers (`numberOption`, `switchOption`, `listOption`) | `plugin.json` options (inferred) | keep as mod | none |
| `chain.ts` | 46 | Composes guard handlers for one `tool.check`/`tool.call` | none | keep while 3+ guards remain; merge with `tools.ts` | none |
| `tools.ts` | 52 | `WRITERS` tool list, `deferred`, `fromAsync` helpers for the `es2023` typings | none | merge with `chain.ts`; drop `WRITERS` with `slices.ts` | none |
| `verify.ts` | 126 | Stop-grader helpers: `isPersonMessage`, lookup-tool list, history windows | none | keep `isPersonMessage` only; drop the rest with the grader | grader inputs of the Stop loops below |
| `cleanup.ts` | 136 | Stop block: lists worktrees/branches that stay (`CLEANUP_LEFT`) and background tasks still running (`STALE_TASKS`); `runOf` host runner | `TaskStop` tool, `WorktreeRemove` event (observed), `ExitWorktree` refuses with changes (cited), `worktree.*` keys (observed) | drop the two Stop blocks; move worktree removal to the hygiene sweep; keep `runOf` in `hygiene/` | Stop "not committed" loop family: block at `cleanup.ts:125,135` re-blocks while agent worktrees hold files (read) |
| `secrets.ts` | 138 | Runs `betterleaks` to find secrets before text leaves for Jev or the fallback model | none; `brew install betterleaks` is macOS-only | keep as mod, only while decider/advisor stay | none |
| `texts.ts` | 278 | Root prompt, tool texts, Stop-block texts, `/init` and plan-mode text | Output style or `CLAUDE.md` rule for prose (inferred) | split: `ROOT_PROMPT` to an output style (the plugin has `output-styles/`); keep tool texts as `tool.describe` | Bun-only rule at `texts.ts:17` ("in a bun repo, use `bun` and `bunx`, never `npm` or `node`"), read; `texts.ts:37` Bash text "Read a file with Read, never cat" feeds the Read/Write-not-shell denials, read |
| `texts-gate.ts` | 189 | Gate denial texts, Decider replies, advisor spec | none | shrinks with the gate; keep advisor/decide specs, rename `texts-tools.ts` | `gateWorktreeRemove` text at `texts-gate.ts:126` ("ask the user to remove this one"), read |
| `texts-grade.ts` | 59 | Stop grader faults and grading prompt | prompt-type Stop hook (cited) | drop with the grader; fold the fault list into one prompt-type Stop hook text | grader loops (see `grade.ts`) |
| `texts-pin.ts` | 42 | Constraint-ledger notes and `PIN_COMPACT_KEEP` | `PreCompact` event (observed) | keep `PIN_COMPACT_KEEP` as a classic `PreCompact` hook text; drop the rest | none |

### `agent.spawn/useMemoryHold/`

| Path | Lines | Job | Built-in | Verdict | Defects |
|---|---|---|---|---|---|
| `agent.spawn/useMemoryHold/admit.ts` | 105 | Rate, context, and repeat-failure ledger that denies a tool call | `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `MAX_SUBAGENT_SPAWN_DEPTH`, `MAX_SUBAGENTS_PER_SESSION` for spawn caps (observed); nothing for the per-tool failure ledger | replace spawn caps with the three env keys in settings `env`; drop the ledger (inferred low value, needs probe of how often it fired) | none found |
| `agent.spawn/useMemoryHold/hold.ts` | 101 | `agent.spawn` deny when free memory is short; `tool.check` hold under the limits | same env caps (observed) | keep as mod, merge with `memory.ts` and `admit.ts` into one `memory-hold.ts` | `hold.ts:27-30` denies every `agent.spawn` under memory pressure with no retry hint, including `work` subagents (read) |
| `agent.spawn/useMemoryHold/memory.ts` | 193 | Reads free memory, stops a process over a share | none | keep as mod (merge target) | none |

### `classic.*`

| Path | Lines | Job | Built-in | Verdict | Defects |
|---|---|---|---|---|---|
| `classic.SessionStart/useHygieneSweep/hygiene.ts` | 53 | Registers a `classic.SessionStart` hook that runs the hygiene script | classic `SessionStart` command hook (observed) | move to classic hook: a `hooks.json` entry that runs `hygiene/sweep.ts`; delete this registrar | none |
| `classic.SessionStart/useHygieneSweep/worktrees.ts` | 139 | Finds stale `agent-<hex>` worktrees under project roots | `worktree.*` keys (observed) do not prune; `WorktreeRemove` event (observed) | keep; merge into `hygiene/branches.ts`, the one worktree/branch owner | none |
| `classic.Stop/useSliceCommits/slices.ts` | 217 | Outermost Stop block: asks the agent to commit files it changed, by blob hash and `git status` | none auto-commits; the rule "commit each finished slice" is already in the Bash tool text (`texts.ts:37`) | drop; keep the sentence as a rule | Stop "not committed" loops: it hashes every path `git status` reports in the cwd repo, which includes agent worktree files and files of another source (`slices.ts` doc lines "paths ... that differ from `known`"), so each Stop re-blocks (read, header comments; loop count audit) |
| `classic.Stop/useStopChecks/grade.ts` | 131 | Two-model grader (haiku, sonnet) of the final reply for faults | prompt-type Stop hook (cited), `/goal` (cited) | replace with one prompt-type Stop hook carrying the fault list; the two-model vote is lost (needs probe: `grade.ts` doc says haiku alone missed 4 of 12) | each fault block can re-run Stop; `stall` guard exists only because of this |
| `classic.Stop/useStopChecks/named-files.ts` | 53 | Finds `! <command>` paths in the reply and checks they exist | none | drop | path spam: `$.fs.exists` on words that are no path, `stop.ts:92` catch comment confirms the engine refuses such words (read) |
| `classic.Stop/useStopChecks/open-items.ts` | 79 | Regex: reply lists open items or commands for the user | classic Stop command hook (observed event) | move to classic hook (pure regex over `last_assistant_message`) | none |
| `classic.Stop/useStopChecks/register.ts` | 25 | Decider call on the reply against register questions | prompt-type Stop hook (cited) | merge into the prompt-type Stop hook; drop file | none |
| `classic.Stop/useStopChecks/stop.ts` | 181 | Stop orchestration, stall stop, task notice, SubagentStop | `/goal` handles continuation (cited) | drop with the checks it orchestrates; the Budget `prompt.submit` hook inside it moves to `tool.call/useBudgetRun` | `stallStop` (`stop.ts:28,139`) ends the turn with `preventContinuation` when a block follows a stretch that wrote no file: a no-work turn is stopped, read |
| `classic.Stop/useStopChecks/turn.ts` | 79 | Turn record shared by guards and Stop | none | drop with `stop.ts` | none |
| `classic.StopFailure/useStopNotice/notify.ts` | 24 | Desktop notice on `StopFailure` | classic `StopFailure` plus `Notification` command hook (observed events) | move to classic hook: a command hook that calls `osascript`-free `notify` tool | none |

### `command.run/`

| Path | Lines | Job | Built-in | Verdict | Defects |
|---|---|---|---|---|---|
| `command.run/useAdvisorCommand/advisor.ts` | 21 | `/advisor <question>` sends `@path` files through the advisor tool | built-in `/advisor`, gated (observed; gate state unchecked) | replace with built-in `/advisor` if the gate is on for this account; else keep (needs probe) | none |
| `command.run/useReplyCommand/reply.ts` | 66 | `/reply` quotes paragraphs of the last reply into the prompt | none | keep as mod | none |
| `command.run/useSetup/auto-mode.ts` | 127 | The `autoMode` lists written by setup | `autoMode.*` (observed) | keep; it is data written into the built-in setting | none |
| `command.run/useSetup/changes.ts` | 116 | Merges ours into held settings; subagent cap group by plan | `CLAUDE_CODE_MAX_*` env (observed) | keep; merge with `engine.ts` | none |
| `command.run/useSetup/engine.ts` | 141 | Config dir, login file, file text read/write helpers | none | keep; merge with `changes.ts` | none |
| `command.run/useSetup/ignore-block.ts` | 118 | One marked block in an ignore file | none | keep; merge into one `ignore.ts` | none |
| `command.run/useSetup/ignore-plan.ts` | 53 | Lines of the `.gitignore` and `.ignore` block | none | keep; merge into `ignore.ts` | none |
| `command.run/useSetup/ignores.ts` | 54 | Edits and preview for the ignore block | none | keep; merge into `ignore.ts` | none |
| `command.run/useSetup/rules.ts` | 121 | Offers the code rule files into `.claude/rules` with hash and date report | rule files are the built-in (inferred) | keep; the rule files stay | path spam: `rules.ts:93` `dayOf` calls `$.fs.stat(path)` per rule with no `.catch` (read) |
| `command.run/useSetup/settings.ts` | 290 | `MINIMUM_VERSION = "2.1.323"`, `GROUPS` of settings keys, `STATUS_LINE`, `DENIED_TOOLS` | the settings keys themselves (observed) | keep; this is the one place the built-in keys are written; grows as rows above are replaced by keys | none |
| `command.run/useSetup/setup.ts` | 273 | `/claudetto:setup` flow and the `/statusline` rewrite | built-in `/statusline` prompt rewrite is a `skill.prompt` mod event | keep | none |
| `command.run/useSetup/starter-families.ts` | 260 | Table of build/test/lint commands per language family | built-in `/init` writes a memory file (inferred) | replace with `/init` (needs probe: `/init` output vs this table) | none |
| `command.run/useSetup/starter.ts` | 146 | Detects family and writes starter memory file | same | replace with `/init`; drop with `starter-families.ts` | none |
| `command.run/useSetup/steps.ts` | 226 | Dialog steps: starter, ignores, tools | none | keep trimmed to ignores and tools | none |
| `command.run/useSetup/text.ts` | 28 | Setup advice strings and `statuslineEdit` | none | merge into `setup.ts` | none |
| `command.run/useSetup/tools.ts` | 87 | `mo` (Mole) tool entry and `purge_paths` | none | keep | none |

### `decider/`

| Path | Lines | Job | Built-in | Verdict | Defects |
|---|---|---|---|---|---|
| `decider/fallback.ts` | 127 | Haiku fallback answers when Jev gives none | none (`$.model.complete` is the mod call, observed) | keep as mod only for the `decide` tool; merge the folder into `tool.call/useDecideTool/` | none |
| `decider/jev.ts` | 98 | `POST /v1/systemone` client with 429/529 retry | none | keep (same condition) | none |
| `decider/questions.ts` | 216 | Question sets and thresholds | none | trim to the `decide` set; drop the Stop, ask-fix, and branch-delete sets | none |
| `decider/redact.ts` | 30 | Redacts state through `secrets.ts` | none | keep | none |
| `decider/settle.ts` | 156 | Answers questions: Jev first, fallback second | none | keep | none |

### `prompt.submit/`, `session.measure/`, `settings.read/`, `turn.step/`

| Path | Lines | Job | Built-in | Verdict | Defects |
|---|---|---|---|---|---|
| `prompt.submit/useConstraintPin/pin-ledger.ts` | 82 | Reads the user's standing constraints into a ledger by model call | none | drop (a model call per prompt); the compaction keep-text survives as `PreCompact` | none found |
| `prompt.submit/useConstraintPin/pin-rules.ts` | 89 | `breaks()`: does a tool call break a ledger constraint | none | drop | would deny a tool call on a model's reading of an old message |
| `prompt.submit/useConstraintPin/pin.ts` | 118 | Hooks, `pinCall` denies `AskUserQuestion` under a no-questions constraint | `PreCompact` event (observed) | replace with a classic `PreCompact` hook that adds `PIN_COMPACT_KEEP`; drop the rest | none found |
| `session.measure/useLineFile/heartbeat.ts` | 15 | Paths of the heartbeat and line file | `statusLine.command` input has fields the file repeats (inferred) | keep as mod | feeds the colorless status line |
| `session.measure/useLineFile/line-file.ts` | 32 | `session.measure` writes the line file (theme, hooks alive) | `statusLine.command` JSON on stdin (observed key; stdin fields inferred) | keep as mod; merge with `heartbeat.ts` | status line is colorless until this file exists: `statusline/main.ts:50` `themeOf` returns `undefined` when `local.theme` is unset (read) |
| `settings.read/useSlimSurface/surface.ts` | 276 | Defers tools, hides built-in commands (`OFF_COMMANDS`), rewrites root prompt and tool texts, drops built-in agent offers | `disableBundledSkills`, `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, `permissions.deny Agent(name)` (brief); `tool.list` (observed) | keep as mod for tool deferral and command hiding (no setting hides a slash command; inferred); move prompt text to an output style | `surface.ts:1` comment records that deferred Read/Write sent the model to `cat`, whose gate then denied the call (read) |
| `turn.step/usePriceStep/price-step.ts` | 186 | Bounds tool-result size by model price band (Haiku 5.5 above 200k bills 5x) | none | keep as mod | none |

### `tool.call/`

| Path | Lines | Job | Built-in | Verdict | Defects |
|---|---|---|---|---|---|
| `tool.call/useAdvisorTool/advisor.ts` | 136 | `advisor` tool: question and files to a stronger model | built-in `/advisor` (observed, gated); no `advisor` tool in `surface` kind tool | keep as mod unless built-in `/advisor` covers it (needs probe) | none |
| `tool.call/useAskFix/ask-fix.ts` | 29 | Denies `AskUserQuestion` when a Decider call says yes | none | drop | denies a tool the model reaches only for user-held facts |
| `tool.call/useBudgetRun/budget-run.ts` | 35 | Adds the Budget line after a paid run | none | keep; merge three files into one `budget.ts` | none |
| `tool.call/useBudgetRun/budget.ts` | 36 | Budget text from usage | `statusLine` shows `rate_limits` to the user only | keep (merge) | none |
| `tool.call/useBudgetRun/result-note.ts` | 27 | Appends a note to a Bash result | none | keep (merge) | none |
| `tool.call/useClaudettoAgents/delegation.ts` | 104 | Routes `Agent` calls to claudetto agents; hides built-in offers; trims agent listing | agent frontmatter, `permissions.deny Agent(name)`, `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` (brief) | replace the deny with those settings; keep `tool.describe` and listing trim | `delegation.ts:45-47` denies every `Agent` call whose type is not the `claudetto:` form or that is foreground: built-in and fork subagents get a denial, read |
| `tool.call/useDecideTool/decide.ts` | 41 | `decide` tool entry; key lookup | none | keep as mod | none |
| `tool.call/useDecideTool/judge.ts` | 168 | Builds Jev requests from `AskUserQuestion`-shaped input | none | keep | none |
| `tool.call/useSandboxGit/sandbox-git.ts` | 52 | Pre-makes `.git/worktrees`, tells the agent to restart after `.git` appears, because the sandbox fixes its `.git` rules at start | `sandbox.filesystem.allowWrite` (observed) cannot override a built-in deny (inferred) | keep as mod; re-test on 2.1.323 (the comment was written against an older build) | none |

### `tool.check/useBashRules/`

This folder is 30 hand-written files plus 5646 generated lines. It rebuilds Bash permission checks, which `permissions.*`, `sandbox.filesystem.*`, and `autoMode.*` (all observed) do. Net verdict: drop the folder; the survivors are in the verdict column.

| Path | Lines | Job | Built-in | Verdict | Defects |
|---|---|---|---|---|---|
| `useBashRules/asked.ts` | 18 | Did the person tell the assistant to delete a branch (Decider) | `autoMode.soft_deny` entry (observed key) | replace with an `autoMode.soft_deny` line | none |
| `useBashRules/denials.ts` | 38 | Remembers denials; repeats them with text | `PermissionDenied` event (observed), `permissions.denyInsteadOfPrompting` | drop | the repeat text is part of the denial spam |
| `useBashRules/files.ts` | 237 | Flags/operands parser, `writesWhole` echo check, in-place editor table | `permissions.deny` on `Bash(cat *)` etc. (inferred) | drop; keep the Read/Write text in the Bash tool description | Read/Write-not-shell denials (audit: 235+ in one project); `GATE_READ_FILE`/`GATE_WRITE_FILE` in `texts-gate.ts:70,84` (read) |
| `useBashRules/gate.ts` | 43 | Builds walls and memory for the gate | none | drop | none |
| `useBashRules/kill.ts` | 128 | Denies broad kill and endless wait loops | `permissions.deny Bash(pkill *)`, `Bash(killall *)` (inferred; project rule says kill by pid) | replace with the two deny rules; drop wait-loop detection (Bash timeout is built-in, inferred) | none |
| `useBashRules/own.ts` | 128 | Host adapter: `exists`, `realPath`, `list`, `home`, past tool uses | none | drop with the gate | path spam: `own.ts:24-36` runs `$.fs.exists` and `$.fs.stat(path,{resolve:true})` on any word, and logs each failure via `$.ui.log` (read) |
| `useBashRules/ownership.ts` | 77 | What this session owns (branches, worktrees, processes) | `autoMode.soft_deny` (observed key) | drop | the worktree ownership feeds `processes.ts:154` |
| `useBashRules/packages.ts` | 84 | Denies npm/yarn/pnpm/deno when `bun.lock` exists; denies cmake/make/ninja/conan when `xmake.lua` exists | `permissions.deny` per project (observed key) | move to rule: setup writes `permissions.deny Bash(npm *)` and a rule line per detected package manager, not hard-coded Bun | Bun-only rules: `BUN_FOR_NPM`, `BUN_LOCKS`, `packages.ts:4-30`; denies a repo that holds both a Bun lock and another tool's files only when `has()` finds them (read) |
| `useBashRules/pipefail.ts` | 158 | Denies `git commit` after a pipe that loses a check's exit code | none | drop; keep `GATE_MASKED_EXIT` as a rule line | none |
| `useBashRules/processes.ts` | 197 | Owned processes and worktrees; `rm` of a temp base; `git worktree remove` gate | sandbox write scope (`sandbox.filesystem.*`, observed); `ExitWorktree` guard (cited) | drop; replace the worktree gate with `permissions.ask Bash(git worktree remove *)` | worktree gate: `processes.ts:154` denies removal of a worktree this session did not create and sends the user the job (`gateWorktreeRemove`, `texts-gate.ts:126`), read |
| `useBashRules/program-at.ts` | 86 | Finds the program word after wrappers | built-in Bash permission parser (inferred) | drop with the gate | none |
| `useBashRules/readonly.ts` | 47 | Turns an `ask` into `allow` for read-only commands | `permissions.allow` rules and sandbox `autoAllowBashIfSandboxed` (observed key) | replace with `permissions.allow` list written by setup | none |
| `useBashRules/recreate.ts` | 283 | Tracks removed paths to deny a recreate; path folding | none | drop (needs probe: no audit shows a recreate loss) | `realPath` calls run the `$.fs.stat` path spam |
| `useBashRules/refs.ts` | 35 | Asks before a branch moves to another commit | `permissions.ask Bash(git reset *)`, `git update-ref *`, `git branch -f *` | replace with three `permissions.ask` rules | none |
| `useBashRules/rules.generated.ts` | 17 | Index of the vendored shellfirm rules | `autoMode.hard_deny`/`soft_deny`, `permissions.ask|deny` (observed keys) | drop (needs probe: replay the 17 fixtures files against the settings) | none |
| `useBashRules/rules.generated/fixtures-01.ts` to `fixtures-16.ts` (16 files, 283 lines each = 4528) | 4528 | Test fixtures of the vendored rules, shipped in the plugin | none | drop with the rules | none |
| `useBashRules/rules.generated/fixtures-17.ts` | 11 | Same | none | drop | none |
| `useBashRules/rules.generated/fixtures-group-01.ts` | 20 | Same | none | drop | none |
| `useBashRules/rules.generated/fixtures-group-02.ts` | 20 | Same | none | drop | none |
| `useBashRules/rules.generated/fixtures-group-03.ts` | 4 | Same | none | drop | none |
| `useBashRules/rules.generated/rules-01.ts` | 283 | Vendored shellfirm regex rules | same as `rules.generated.ts` | drop | none |
| `useBashRules/rules.generated/rules-02.ts` | 274 | Same | same | drop | none |
| `useBashRules/rules.generated/rules-03.ts` | 271 | Same | same | drop | none |
| `useBashRules/rules.generated/rules-04.ts` | 235 | Same | same | drop | none |
| `useBashRules/rules.patch.json` | 35 | Patches to the vendored rules | same | drop | none |
| `useBashRules/rules.LICENSE` | 201 | Licence of the vendored rules | n/a | drop with the rules | none |
| `useBashRules/rules.ts` | 135 | `judge()`: the strictest verdict of a shell command; `systemPath` | `sandbox.filesystem.denyWrite` (observed) covers `.claude/` and `.git/hooks/` Bash writes (inferred from the sandbox note in this session's prompt) | drop | none |
| `useBashRules/shell-state.ts` | 144 | Shell tokenizer state | built-in Bash parser (inferred) | drop with the gate | none |
| `useBashRules/shell-words.ts` | 238 | Splits commands, finds `sh -c` and `eval` scripts | same | drop with the gate | none |
| `useBashRules/switch.ts` | 124 | Detects that `git switch/checkout/reset --hard` would change sandbox-protected files and stop half way | `sandbox.filesystem.denyWrite` is the cause (observed key); no setting removes it | move to a classic `PreToolUse` command hook; its protected list is hard-coded from build 2.1.319 (`switch.ts:1`), so re-derive it on 2.1.323 | none |
| `useBashRules/upstream.ts` | 116 | Words of a git command without options; texts rules read | none | drop with the gate | none |
| `useBashRules/verdict.ts` | 15 | `deny`/`ask` builders | none | drop (merge `fieldOf` into `chain.ts` if used) | none |
| `useBashRules/walled.ts` | 122 | Paths a call names (each word, `=` values, redirects, `cd` targets) against walls | `sandbox.filesystem.denyRead|denyWrite`, `permissions.deny Read(...)` (observed keys) | replace with those settings | path spam: names every word of a command as a path, and each feeds `$.fs.stat` in `own.ts` (read) |
| `useBashRules/watch.ts` | 163 | `tool.check`/`tool.call` entry points of the gate; denial memory | `PermissionDenied` (observed) | drop | its denial text for rules "does not name the rule" (own comment), the "unexplained denial" cluster |

## Rows: `plugins/claudetto/statusline/` (paths relative to it)

Built-in: `statusLine.command` and `refreshInterval` (observed keys). The script is already the cheap surface. Verdict for the folder: keep as the `statusLine.command` script; drop `subagents.ts`.

| Path | Lines | Job | Verdict | Defects |
|---|---|---|---|---|
| `statusline/bun-types.d.ts` | 1 | Types shim | keep | none |
| `statusline/color.ts` | 153 | Palettes per theme, `NO_COLOR` | keep; give a fixed default palette so color needs no line file | status line colorless until the line file exists (`main.ts:50` `colorOff(env) ? undefined : theme`, `undefined` before the first `session.measure`), read |
| `statusline/format.ts` | 102 | Token, window, clock text | keep | none |
| `statusline/hooks-off.ts` | 79 | Reads the transcript tail to tell hooks crashed | keep while mods stay; drop if the mod surface is trimmed to nothing | none |
| `statusline/icons.ts` | 22 | Glyph table | keep; merge with `format.ts` | none |
| `statusline/input.ts` | 34 | Safe readers of stdin JSON | keep | none |
| `statusline/limits.ts` | 25 | 5-hour and 7-day window constants, row cap | keep; merge with `format.ts` | none |
| `statusline/local.ts` | 182 | Reads project folder (`tasks.md`, theme) | keep | none |
| `statusline/main.ts` | 126 | Entry: `statusOf`, `statusWithFiles`, subagent lines | keep; delete the subagent export | the `FALLBACK` text and the theme default above (`main.ts:50`) |
| `statusline/rows.ts` | 66 | Items into rows with width fit | keep | none |
| `statusline/segments.ts` | 251 | One text per segment | keep | none |
| `statusline/subagents.ts` | 91 | `subagentStatusLine` rows | drop: key is a deprecated no-op (observed, `chunk-3dhh2g49.js:255110`); also remove `subagentStatusLine` from `plugins/claudetto/settings.json` | renders nothing the user sees |
| `statusline/width.ts` | 106 | Escape stripping, display width, safe text | keep | none |

## Rows: `plugins/claudetto/hygiene/` (paths relative to it)

Built-in: none for any of this (`cleanupPeriodDays` removes transcripts only, cited). The folder is a script a classic `SessionStart` hook runs; verdict for the folder: keep, run from `hooks.json`.

| Path | Lines | Job | Verdict | Defects |
|---|---|---|---|---|
| `hygiene/args.ts` | 51 | Parses sweep flags | keep | none |
| `hygiene/branches.ts` | 187 | Finds merged free branches and removes them | keep; absorbs `hooks/.../worktrees.ts` | none |
| `hygiene/mole.ts` | 18 | Runs Mole cache clean | keep | none |
| `hygiene/roots.ts` | 87 | Roots and logging helpers; the `~/.claude` guard | keep | none |
| `hygiene/sweep.ts` | 252 | The sweep: temp folders, project trash, build folders | keep | none |
| `hygiene/temp.ts` | 111 | Temp entries in batches | keep | none |
| `hygiene/trash.ts` | 284 | Loads and applies trash rules | keep | none |
| `hygiene/trash.toml` | 262 | The shipped trash rules | keep | none |

## Rows: `plugins/claudetto-you-should-know/hooks/` (paths relative to it)

Job of the plugin: a side model reads a digest of the work and shows a note with buttons; a noted call is denied once so the note reaches the person. Built-in: none (`/goal` and prompt-type Stop hooks act at Stop only; the note acts before a tool call; inferred). Verdict for all: keep as mod; it uses `ui.render`, `tool.call`, and `$.model.complete`.

| Path | Lines | Job | Verdict | Defects |
|---|---|---|---|---|
| `you-should-know/hooks/calls.ts` | 10 | Set of read-only tools that skip a note | keep; merge into `register.ts` | none |
| `you-should-know/hooks/hooks.json` | 4 | Module list | keep | none |
| `you-should-know/hooks/note.ts` | 292 | Parses model reply into offers and cards | keep | none |
| `you-should-know/hooks/press.ts` | 112 | Button press handling | keep | none |
| `you-should-know/hooks/register.ts` | 294 | Wiring | keep | `texts.ts` `stopFor` denies the noted call, a possible deny on a subagent call (unchecked) |
| `you-should-know/hooks/settings.ts` | 29 | Model/effort option choice | keep; `MODELS` is a fixed list, so it needs the three 5.5 ids only | none |
| `you-should-know/hooks/store.ts` | 110 | Persisted notes | keep | none |
| `you-should-know/hooks/texts.ts` | 78 | Observer instructions and bodies | keep | none |
| `you-should-know/hooks/view.ts` | 153 | Draws the note | keep | none |

## Rows: `plugins/claudetto-openspec/hooks/` (paths relative to it)

Job of the plugin: one `openspec` MCP tool that validates, archives, and reports status of OpenSpec changes, written without `node:fs` or a YAML library because the hooks module has neither (`yaml.ts` comment, `fs.ts` comment, read). Built-in: none; `$.tool.register` is mod-only (observed). The upstream `openspec` CLI could be called through `$.process.run` instead of the ~2300-line reimplementation (hypothesis, needs probe: install and exit codes of `openspec validate` against the 11 spec and validate files). Verdict for the folder until that probe: keep as mod.

| Path | Lines | Job | Verdict | Defects |
|---|---|---|---|---|
| `openspec/hooks/archive-merge.ts` | 133 | Merges a delta into the main spec at archive | keep; merge with `archive.ts` and `spec-merge.ts` | none |
| `openspec/hooks/archive.ts` | 153 | Archive flow, refusals | keep | none |
| `openspec/hooks/fs.ts` | 40 | `Fs` slice of `$.fs` | keep | none |
| `openspec/hooks/hooks.json` | 1 | Module list | keep | none |
| `openspec/hooks/layout.ts` | 49 | `init`, `create` change folders | keep | none |
| `openspec/hooks/main-specs.ts` | 32 | Reads main specs | keep; merge with `status.ts` | none |
| `openspec/hooks/memory-fs.ts` | 96 | In-memory fs for lab tests, shipped in the plugin | move out of `hooks/` to the test tree | none |
| `openspec/hooks/openspec.ts` | 179 | Tool call dispatch and input checks | keep | none |
| `openspec/hooks/register.ts` | 47 | Registers the tool | keep | none |
| `openspec/hooks/spec-audit.ts` | 154 | Line audit of a spec file | keep | none |
| `openspec/hooks/spec-lines.ts` | 58 | Line helpers | keep | none |
| `openspec/hooks/spec-merge.ts` | 138 | Merge of a delta plan into blocks | keep | none |
| `openspec/hooks/spec-plan.ts` | 171 | Parses a delta as a plan | keep | none |
| `openspec/hooks/spec-rules.ts` | 275 | Per-spec rules | keep | none |
| `openspec/hooks/spec-tree.ts` | 75 | Heading tree | keep | none |
| `openspec/hooks/spec.ts` | 149 | Spec reader | keep | none |
| `openspec/hooks/status.ts` | 59 | Change status | keep | none |
| `openspec/hooks/tasks.ts` | 186 | Task list checks | keep | none |
| `openspec/hooks/texts.ts` | 82 | Tool description and schema | keep | none |
| `openspec/hooks/validate-discover.ts` | 138 | Finds delta files | keep | none |
| `openspec/hooks/validate-issues.ts` | 207 | Issues of a delta file | keep | none |
| `openspec/hooks/validate-meta.ts` | 132 | `.openspec.yaml` markers | keep | none |
| `openspec/hooks/validate-nested.ts` | 53 | Nested change folders | keep | none |
| `openspec/hooks/validate.ts` | 256 | Validation of one change | keep | none |
| `openspec/hooks/yaml.ts` | 162 | Mini YAML reader | keep | none |

## Files-as-folders clusters (3+ files sharing a prefix) that survive the trim

| Cluster | Files after the trim | Verdict |
|---|---|---|
| `spec*` in `claudetto-openspec/hooks/` | `spec`, `spec-audit`, `spec-lines`, `spec-merge`, `spec-plan`, `spec-rules`, `spec-tree` (7) | survives; make it a `spec/` folder |
| `validate*` in `claudetto-openspec/hooks/` | `validate`, `validate-discover`, `validate-issues`, `validate-meta`, `validate-nested` (5) | survives; make it a `validate/` folder |
| `archive*` in `claudetto-openspec/hooks/` | `archive`, `archive-merge` (2) | below the 3-file line; fold into `spec/` or the folder above |
| `ignore*` in `useSetup/` | `ignore-block`, `ignore-plan`, `ignores` (3) | survives; merge into one `ignore.ts` |
| `texts*` in `claudetto/hooks/` | `texts`, `texts-gate`, `texts-pin` (3; `texts-grade` drops with the grader) | survives as a `texts/` folder only if the three stay; otherwise merge `texts-pin` into the `PreCompact` hook |
| `register*` | `hooks/register.ts`, `useStopChecks/register.ts`, `you-should-know/hooks/register.ts`, `openspec/hooks/register.ts` | four same-name files in four folders, not a prefix cluster; `useStopChecks/register.ts` drops |
| `memory*` | `useMemoryHold/memory.ts` and `openspec/hooks/memory-fs.ts` | one is a different job in a different plugin; no cluster |
| `rules*` in `useBashRules/` | `rules`, `rules.generated`, `rules.generated/`, `rules.patch.json`, `rules.LICENSE` | does not survive (dropped above) |
| `shell-*` in `useBashRules/` | `shell-state`, `shell-words` (2 files, plus `program-at`, `upstream`) | does not survive; the user's `shell-words*` is 2 files here |
| `pin*` in `useConstraintPin/` | `pin`, `pin-ledger`, `pin-rules` (3) | does not survive; reduced to a `PreCompact` hook |
| `open-items*` | `open-items.ts` is one file here (the cluster the brief names is `useStopChecks/` as a whole) | one file survives as a classic Stop command hook |
| `setup*` | `useSetup/` is already a folder (14 files, no 3-file prefix inside beyond `ignore*`) | keep the folder |
| `fixtures-*`, `rules-*` in `rules.generated/` | 20 files | drop |
| `statusline/` | no prefix cluster | none |
| `hygiene/` | no prefix cluster | none |

## Totals

| Part | Lines now | Dropped or replaced (verdict) | Remaining as mod or script |
|---|---|---|---|
| `useBashRules/` | 5646 generated + 3377 hand-written + 236 JSON/licence | all but `switch.ts` (124) moved to a classic hook | 124 (as a classic hook) |
| `useStopChecks/`, `useSliceCommits/`, `texts-grade.ts`, `verify.ts` | about 1067 | all but `open-items.ts` (79) and `texts-grade` text folded into one prompt-type Stop hook | about 79 plus one hook text |
| `useAskFix`, `useConstraintPin` (3 files) | about 318 | all but a `PreCompact` text | about 15 |
| `statusline/subagents.ts` | 91 | drop | 0 |
| `useSetup/starter*.ts` | 406 | replace with `/init` (needs probe) | 0 |
| Everything else | remainder | kept or merged | see rows |

(Totals are sums of the `wc -l` figures above; the useBashRules hand-written figure is the 15371 total of `plugins/claudetto/hooks/` minus other rows and was not re-added to the digit, so treat it as an estimate.)

## Needs probe before any delete

1. Replay `rules.generated/fixtures-*.ts` commands against the target `permissions`/`autoMode` settings in a `/tmp/probe-*` project with `cc-inspect` `code` action `cli`; the gap is the number of fixtures a setting does not ask or deny. Prediction: `ask` coverage is high for `git reset --hard`, `rm -rf`, `pkill`, and low for the generic regexes.
2. Run the four graders on the `grade.ts` replay set (12 replies, 30 clean) as one prompt-type Stop hook; prediction: more misses than the two-model vote (`grade.ts` says haiku alone missed 4 of 12). This costs paid model calls, so ask first.
3. Run `/advisor` in a session to see whether the built-in gate is on for this account.
4. Run `/init` in a scratch repo and compare to `starter-families.ts`.
5. On 2.1.323, repeat `sandbox-git.ts` and `switch.ts` scenarios (a `git switch` over `.claude/skills`, a `git worktree add` after the worktrees are gone) to see whether the sandbox still refuses.
6. Install the upstream `openspec` CLI in a scratch dir and diff its `validate` exit codes against the plugin's tool on the spec/validate tests.
