## 1. Base

- [x] 1.1 Run `minispec archive 0-3-0 --yes`, and check that `openspec/specs/` has the 9 capabilities of `0-3-0` and that `minispec validate release-0-3-0-alpha-2 --strict` passes.
- [x] 1.2 Run `just bump 0.3.0-alpha.2`, and check that each manifest, `package.json`, and `.claude-plugin/marketplace.json` name `0.3.0-alpha.2` and that `CHANGELOG.md` has a `[0.3.0-alpha.2]` section.
- [x] 1.3 Check each docs fact of `design.md` against `../claude-code-docs/docs/` at 2.1.309, and each binary fact with `cc-inspect` on 2.1.309. Add a task to group 10 for each new lever.

Each task gives the plugin line count before and after, and names the behavior of each added line (D16).

## 2. Permission Gate (D1, D3)

- [x] 2.1 Add `kernel/tmp.ts` with `tempDirs(env)`, use it in `guard` and `hygiene`, and test "Same Folders".
- [x] 2.2 Remove `ASK_SCRIPT`, `ASK_DELETE_OUTSIDE`, the uncommitted-file check of deletes, and `ASK_HIDDEN` except a delete with an unreadable target, with the tests of "Delete by Recoverability" and "Unreadable Commands".
- [x] 2.3 Parse the literal text of `eval`, `sh -c`, and `bash -c` as a command, with the test of "Literal Shell Text".
- [x] 2.4 Add the database and infrastructure gates (X1), with a test for each command.
- [x] 2.5 Probe `classic.PermissionRequest` in the hook lab first. Then register `tool.check` with no matcher and the `classic.PermissionRequest` answer, or the `hooks.json` fallback of D1, with lab cases for `Monitor`, an MCP tool, `WebFetch`, a `Read` outside the project, a shell variable, and a claudetto `ask` that stays a prompt.

## 3. Settings and Setup (D2, D4)

- [x] 3.1 Rewrite the snippet by D2, each key with its source row, and add the dropped rules to the drop list. Test "Fresh Install", "Upgrade from Alpha 1", and the deny rule match test against safe commands.
- [x] 3.2 Probe in the hook lab whether `maxEffortLevel` caps the `effort` of an agent file, and add the roster test of the caps when it does not.
- [x] 3.3 Add `claudetto-setup --inventory`, with the tests of "Inventory", "Duplicate Skill", "Unused MCP Server", and "No Identity in the Output".
- [x] 3.4 Add `--mode merge|replace` with the backup file, and test "Conflicting Value" and "Replace".
- [x] 3.5 Add `userConfig.plan` and `userConfig.TYPESAFE_API_KEY` with `sensitive: true` to `plugin.json`, read the key in `decide` and `guard`, and probe in the hook lab that `options` holds it. Test "Max 20x", "API Key", and "Unknown Tier".
- [x] 3.6 Rewrite the skill `setup`: inventory table, merge or replace, conflicts, `deniedMcpServers` offer, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` by tier from `slices/setup/limits.ts` (Pro 3, Max 5x 4, Max 20x 5) with a test for each tier, `statusLine.refreshInterval` 5, and the `claude-demo` alias offer for `IS_DEMO=1 claude`, written to the rc file of the shell of the user after a yes, with a test of "Demo Alias".

- [x] 3.7 Add the inventory rows of D20 to `claudetto-setup --inventory` (each tool, MCP server, LSP plugin, and skill with its docs text) and an off-or-on question for each to the skill `setup`. Write the choices of D20: the `permissions.deny` names, `deniedMcpServers` and `enabledPlugins` in the project settings, and `skillOverrides`, with a test for each kind.

- [x] 3.8 Add the OpenSpec finds of D20 to the inventory and their removal to the apply step of setup, with tests of "Global Bun Install" and "Dev Dependency Stays" against stubbed package managers.

- [x] 3.9 Add the global `~/.claude/CLAUDE.md` of D21 to setup: title `# CLAUDE.md`, origin line, only the origin line between HTML comments, the rules of the user below them from a first-run question, `GLOBAL_CLAUDE_MD_MAX_LINES` 20 in `slices/setup/limits.ts`, and the `~/.claude/rules/*.md` inventory rows with their owners: the owner's removal command (such as `ctx7 remove --claude --cli`) for an owned file, and the fold or remove offer for the others. Test "New Global File", "User Lines Stay", "Over the Bound", and "Owned Rule Stays".

- [x] 3.10 Add `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` and the `general-purpose` deny of D21 to the snippet, and point the plan mode text of D7 at `claudetto:Scout`. Test that the snippet holds both, and that the plan mode attachment names no `Explore`.

- [x] 3.11 Add the `claudeMdExcludes` offer and the `CLAUDE.local.md` template with its `.gitignore` line to setup, with tests of "Parent File Excluded" and "Local Notes Ignored".

## 4. Hygiene and Ledger (D11)

- [x] 4.1 Report only removals in the cleanup, with a correct plural and a project-relative handoff path. Test "Removed Folders", "Nothing Removed", "Unknown Folder", and "Handoff Path".
- [x] 4.2 Move the ledger to `<tmp>/claudetto/ledger/<project key>.jsonl`, add the `Bash` change capture with its time bound in `slices/hygiene/limits.ts`, and test "Mine", "Changed After", and "Two Sessions".
- [x] 4.3 Add the `git status` and `git diff` context, with the tests of "User Edit" and "Other Session".

## 5. Grounding (D10)

- [x] 5.1 Read the messages of the agent that makes the call, and count an `AskUserQuestion` answer and the handoff text as sources. Test "Subagent Counts", "Number with No Source", and "Chosen Option".
- [x] 5.2 Skip the example values of spec scenarios, tests, and fixtures, with the test of "Spec Scenario".

## 6. Handover (D12, D13)

- [x] 6.1 Probe in the hook lab that `$.command.run("/clear")` and then `$.prompt.submit` run in that order, that the resume prompt reaches the fresh session, and that a `prompt.submit` hook can hold a prompt until the user answers the idle offer.
- [x] 6.2 Build the handoff in code with the open change, next task, decisions and ruled-out options of `decide`, passed checks, and user values, and write it only to `.claudetto/handoffs/`. Test "Box with No Check Is Open".
- [x] 6.3 Add the three triggers with their bounds and the path table of D12 in `slices/handoff/limits.ts`, and the option `compaction` with `auto`, `handover`, and `built-in`. Lab cases: each trigger, the yes and the no of the idle offer, each path of the table, a running agent that holds it back, and `built-in` that adds no hook.

## 7. Prompt, Roster, and Texts (D5, D6, D7)

- [x] 7.1 Add the plan, branch, latest tag, open change, shell, and `grep` engine to `prompt.context` with a size bound (X5), and test "Max 20x", "API Key", and "No Identity" of `prompt-base`.
- [x] 7.2 Probe in the hook lab that `agents/Scout.md` loads as `claudetto:Scout` and that an `Agent(claudetto:Scout)` deny rule matches it. Then set the 6 agents of D6 in `agents/*.md` with UpperCase names, remove the lowercase files, rename each reference in `plugins/`, `tests/`, and `src/wiki/`, add the routing block, the cost rule of D6, and the order rule of D18 to `main.md`, and add the roster test with "Haiku Work", "Name Loads", and "Deny Rule".
  The hook lab cannot load an agent file or run a deny rule, so the 2.1.309 bundle is the evidence: `Aun` (`chunk-kang00hq.js`, offset 2307205) names a plugin agent `[plugin, ...namespace, name].join(":")` with the frontmatter `name` as written or the file name, `F_t` (`chunk-223m6gtg.js`, offset 88103) keeps its case, and `oce` (`chunk-yaq48hnw.js`, offset 14836) matches an `Agent(x)` rule by exact `ruleContent === agentType`.
  "Name Loads" and "Deny Rule" run in the sandbox probe of task 11.4 because the user wants a sandbox probe (the user, 2026-10-23), and the lab test keeps "Haiku Work" and the file names.
- [x] 7.3 Capture the default text of each surface of D7 for 2.1.309, write `research/text-audit.md` with each behavior line and the line that carries it, and add the lint test and the size test.
- [x] 7.4 Rewrite the texts of each surface of D7 with the content of `research/failures.md` and `research/incidents.md`, until the tests of task 7.3 pass. Probe in the hook lab that `tool.describe` fires for a deferred tool first.
- [x] 7.7 Check the need of each `keep` and `carried` row of `research/text-audit.md` and `research/prompts.md` (D7 rule 2). Settle each row from evidence, and cut each row with no need from its text. Put only the rows that the evidence leaves open to `AskUserQuestion`, batched in the fewest calls of up to 4 questions each, so that Jev answers them when sure and few dialogs reach the user, and write each answer and its source in the row. The pronoun paragraph is cut (the user, 2026-10-23).
- [x] 7.8 Rewrite each quote of the user in the files of this change and in `src/wiki/` as you understand it, with the source as `(the user, date)`, and keep only the exact values that the user gave. `main.md` and the handoff text tell Claude to do the same (the user, 2026-10-23).
- [x] 7.5 Set the body bound in `slices/prompt/limits.ts`, and add a test that sums the text that claudetto adds to the first request. Derive the bound from the 10k-token goal of release gate G2, and remove the snapshot caps `MAIN_BODY_MAX_CHARS`, `TOOL_TEXTS_MAX_CHARS`, and `CONTEXT_BLOCKS_MAX_CHARS` of `tools/limits.ts`, because the user wants the long-term approach (the user, 2026-10-23).
  The three snapshot caps, `MAX_FILE_LINES`, and `MEMORY_FILE_MAX_LINES` are removed with their tests, because a custom size lint on prose is an arbitrary gate that checks no behavior (the user, 2026-10-23).
  No body bound and no sum test: the `/context` run of task 11.3 is the one size check (the user, 2026-10-23), so `PLAN_BLOCK_MAX_CHARS` and `REPO_BLOCK_MAX_CHARS` go too, and the `prompt-base` delta removes "Request Size Only Shrinks" and the pinned size of "Base without Mods".
- [x] 7.6 Cut `Concise.md` to the reply format of D21, move each behavior rule to `agents/main.md`, put the line of "Run the Free Check" there in place of `Concise.md:18`, update the copies in the 5 `evals/*/case.yaml`, search each other surface of D7 for text that lets a free check go unrun, and add a lint test that no surface holds the old line. Add an eval case "free-check-runs" with a claim that a temp-folder run verifies, and run it in task 11.7.

## 8. Finish and Notes (D8, D9)

- [x] 8.1 Add the slice `finish` with `box` and `stop`, merge `goal` into it, and add the fixtures of `research/incidents.md`: each known-bad reply sets one note, and each known-good reply sets none.
- [x] 8.2 Add the slice `notes` with "Rule Notes", "Learn Block", "Note Keys", "Back-Off and Dedupe", and "One Note at a Time", with lab cases and a test that its source has no `$.model` call.

- [x] 8.3 Add usage-awareness of D25: move the band bounds of D15 to `kernel/budget.ts`, add the usage line to `prompt` from `session.measure`, the parallel count by band to `main.md`, the gate at red to `guard`, and the cost report to the skill `apply` and the handoff. Lab cases: "Band Change", "Same Band", "API Key", "Second Agent at Red", "First Agent at Red", "Weekly Red", "Paid Recipe at Red", and "Handoff".

## 9. MiniSpec, Status Line, Trim, and Pins (D14 to D17)

- [x] 9.1 Map dots to hyphens in `minispec new change`, stop the write of `handoff.md` to a change folder, and add the preset line to the skill `propose`, with the tests of "Version Name" and "Bad Name".
- [x] 9.2 Add the gradient to the context, 5-hour, and weekly values of the status line with dim reset times, remove the theme code, and write `rate_limits` to the temp folder, with tests of the colors and the file.
- [x] 9.3 Remove `reply`, `dry`, `snippet-0.2.0.json`, the 0.1.0 upgrade path, and the dead exports of `research/raw/trim-dead.txt`, point the skill `dedupe` at `jscpd`, and add the line bound of the plugin to `tools/limits.ts` with its test. Apply "one model, thin views" of D16: list in `research/trim.md` each parse or output path that two slices hold (start with the 3 JSON printers of `spec`, `setup`, and `dry`), move each one to `kernel/`, and give the line count before and after.
- [x] 9.4 Set `2.1.309` in `tools/limits.ts`, CI, `README.md`, `CONTRIBUTING.md`, `schemas/`, the issue templates, and `src/wiki/`, capture the fixture with `just capture`, and add the test of "Stale Pin".
- [x] 9.5 Add `minispec sync <name>` from the merge code of `archive`, with a test that it changes `openspec/specs/` and leaves the change folder. Add the skills `explore`, `update`, and `sync` to `plugins/claudetto/skills/` with `disable-model-invocation: true`, and remove `.claude/skills/openspec-*`.
- [x] 9.6 Decide option A or B of D21: read the import and `AGENTS.md` loader code with `cc-inspect` on 2.1.309, and pick the option that the code shows. When the code leaves it open, task 11.9 measures both. Cut `AGENTS.md` to 20 lines with the overflow in `.claude/rules/` with `paths`, apply the option that wins, and add `MEMORY_FILE_MAX_LINES` 20 to `tools/limits.ts` with its test.
- [x] 9.7 Add the text mode and the `Next:` line of "Next Step" to `minispec status`, with a parity test against `openspec status` in `tests/claudetto/spec/parity/` for the checklist shape, and give the skills `propose`, `apply`, and `verify` an exact closing line with the command, with the tests of "Planning Done" and "JSON Only on Request".
- [x] 9.8 Fix the 5 defects of `research/minispec-gaps.md`: add a parity case for each first (`dup-added`, `mod-missing`, `add-exists`, `h3-scenario`, `rem-missing`, and from D22 `long-requirement` and `mod-drops-scenario`) and see it fail, then add the merge dry run of D22 and the duplicate check, and see each case pass.
- [x] 9.9 Add the commands of D22 on the shared model: text views for `status` and `list`, `list --specs --archived --all --sort`, `validate --specs --all --changes`, `show` with `--json --deltas-only --diff -r`, `instructions apply|<artifact>`, `archive --skip-specs --no-validate --json`, `new change --description --json`, `schemas`, and `schema validate`, with a parity case for each. Fix line 23 of `research/trim.md`. Report the line count of the slice against the 793 of today.
  The 793 of D22 stands, and the rewrite of task 10.13 cuts the slice to it, as the pick for goal 4 says (the user, 2026-10-23).
- [x] 9.10 Probe in the hook lab whether the mod runtime resolves a bare npm import in `hooks/register.ts`. Then list the npm candidates of D23 in `research/trim.md` (start with the kernel shell parser, 1005 lines, and the Markdown parser of `spec`), adopt each one that wins, and add a test that each pinned import in `plugins/` equals its version in `package.json` and names a package with no `dependencies`.
- [x] 9.11 Hunt the levers of D24: time `guard` per tool call in the hook lab before and after a table-driven rewrite, list each `<Undocumented />`, `<Experimental />`, and `<Gated />` row of the docs that removes tokens or time with no loss, starting with `context-budget.md` and `prompts/index.md`, and adopt each one with its pin test and its row in `Decisions-Engine.md`. Give the tokens and the time saved for each.

## 10. Findings (D19)

- [x] 10.1 X2: ask before `git add -A`, `git add .`, and `git commit -a` only when the ledger shows a change of the user, with tests for both cases.
- [x] 10.2 X4: ask before `git stash` and `pkill -f` from a subagent, with tests for a subagent and the main agent.
- [x] 10.3 X6: probe in the hook lab whether a second `Read` of an unchanged file returns the full text, and when it does, answer it from the ledger hash with a short result.
- [x] 10.4 X8: answer a second `Monitor` with the command of a running one with a short result that names the task, with a lab case.
- [x] 10.5 X12: deny `git add` of a secret file, a bare `printenv` or `env`, and an upload of a secret file with `curl -d @` or `-F`, with tests.
- [x] 10.6 X19 and X20: fail `just sandbox` and the paired eval when the loaded plugin or model differs from the arm, with tests of the recipe scripts.
- [x] 10.7 X21: cap the re-blocks of the `/goal` stop in `finish`, with a test.
- [x] 10.8 2.1.309 lever: probe `next({ ...e, model })` with an alias on `TurnStepInput` in the hook lab, and add the model column of the D12 table with a lab case for a step after a handover.
- [x] 10.9 2.1.309 lever: add `idleCompaction: false` to the snippet with its source row, and test "Fresh Install" with it.
- [x] 10.10 D20: count the sessions of `research/` that use each tool that is on, defer each tool under the 10% bound with `tool.describe` `isDeferred: true`, and add a lab case for a deferred tool and a roster tool.
- [x] 10.11 Chicago Title Case in each title, in all four places (the user, 2026-10-23): one line in the reply format of task 7.6, a hook that sets the case of each Markdown heading after `Write` or `Edit` of a `.md` file, a `finish` note for a reply heading in the wrong case, and a fix of the `--title` of `gh pr create` and `gh issue create` in `guard`. Commit subjects stay in sentence case. Put the shared title function in `kernel/`, and add lab cases for each place with the Chicago small words and a code span that stays as typed.
- [x] 10.12 D8 `loop`: block a stop when the turn ticked a box of a `tasks.md` that still has an open box, at most `GOAL_BLOCKS_MAX` times in a row, and give the loop line and the pause list of OpenSpec to the skill `apply`. Block only in a session that ran `/claudetto:apply`, and never while a subagent is `pending`, `running`, or `waiting`. Lab cases: "Tick with Open Task", "Last Task Ticked", "No Tick in Turn", "Cap Reached", "Tick Outside Apply", "Subagent Running", and the known-bad reply of `research/incidents.md` row 45.
- [x] 10.13 PRD goal 4, where the user wants the cut to reach the bound (the user, 2026-10-23): cut `plugins/claudetto/` to `PLUGIN_TS_LINES_MAX` (10,622) lines of `.ts` or fewer, from 15,633, with each test case and each behavior kept. `spec` goes to the 793 lines of D22, and task 9.9 stays open until it does. The lab tests share one stub helper. Report the lines of each slice before and after, and keep the bound and each test expectation as they are.
  After five cut passes left 15,322 lines (12,756 of code), the user picked a rewrite in alpha.2 with each feature kept (2026-10-23: "Rewrite now to 10,622"), and `spec` follows the same pick, so the 793 of D22 stands ("Follow the goal 4 pick").
  The rewrite left 13,942 lines, and the user changed the aim (2026-10-23: "0.2.0 is not baseline. just try to shrink without loss as much as possible", "don't count comments"), so the plugin keeps 12,857 lines that are not comments, against 9,321 at `28a37b9d`.
  The bound `PLUGIN_TS_LINES_MAX` and its test are removed, and the goal stays prose (the user, 2026-10-23).
- [x] 10.14 Fix the 7 other fails of `just docker check` of 2026-10-23, each with its cause: the name lint and the eval-case lint on the split lab tests of `finish` and `handover`, the 2 worktree eval tests, the bare import in `slices/notes/adapters/mod.ts`, and the 2 OpenSpec parity snapshots ("just now" against "16h ago", and the order of the schemas).
- [x] 10.15 Call Jev from the mod with `$.http.fetch` in `decide` and `guard` (D16), in place of a `claudetto-decide` child process for each question, and keep the retry on 429 and 529 and the bound `ATTEMPT_TIMEOUT_MS` with a `$.clock` race, because `HttpInit` has no timeout. Check the request and the thresholds against the live TypeSafe docs (`api.md`, `confidence.md`) with the skill `typesafe-ai`. `claudetto-decide` stays for image and `box` questions and for the calls of Claude. With a key, Jev also answers the handover offer of D12 from the context size, the cold cache, and the open task, and the dialog shows only when Jev is not sure. Lab cases: "Jev Picks", "Jev Unsure", "Timeout", "Rate Limit Retry", "No Key", and "Jev Takes the Handover Offer" (the user, 2026-10-23).

## 11. Release and Paid Checks (D18)

- [x] 11.1 Write the `CHANGELOG.md` entries under `[0.3.0-alpha.2]` and the wiki pages in `src/wiki/`, and run `just generate`.
- [x] 11.2 Run `just docker check`, and tick this task when it exits `0`.
- [x] 11.3 Ask the user once for the paid runs of tasks 11.4 to 11.9: a table with each run, its expected tokens and weekly share, the setting that it decides, and that setting's start value, then the total and the current weekly share. Rank the runs by expected saving, and let the user pick which to run.
  At a weekly share of 86%, the user picked 11.4, 11.5, 11.8, and 11.9, and left 11.6 and 11.7 for later (the user, 2026-10-23).
- [x] 11.4 One `just sandbox` session: `Monitor` on a temp log, `Read` of `/private/tmp/x`, `WebFetch`, a `cc-inspect` tool, and a delete in the temp folder, and a subagent `Write` of a plan file with a number that only its own `Bash` result holds, to find why `ground` misses a subagent's tool results in `$.session.messages({ agentId })` (the text audit worker of task 7.3 hit it). Record each prompt in `evidence.md`, and switch to the fallback of D1 when one shows.
  The same session spawns `claudetto:Scout` and shows its type in the transcript ("Name Loads"), then adds `Agent(claudetto:Scout)` to `permissions.deny` and shows that the spawn is denied ("Deny Rule", task 7.2).
  It also logs the section ids that a `prompt.compose` hook sees for a subagent request, to show whether the "Notes:" block, which `_rn` adds as separate parts (`chunk-kang00hq.js`, offset 2280608), can be replaced. The `subagent-notes` surface of task 7.4 waits for this result, because the hook lab has no real composition.
- [x] 11.5 Release gate G2: `/context` in a fresh session, with each category in `evidence.md`, measured twice: in `just sandbox` with copies of the global files of the user (`~/.claude/CLAUDE.md`, `rules/`, `skills/`, `settings.json`), and in one fresh session on the real config after setup. Both must show 10k tokens or fewer. Above that, add the next cut of architecture A6 to group 10 and measure again, and alpha 2 does not ship until both pass.
- [x] 11.6 Paired `just sandbox` runs of `handover`, `compact`, and `handoff-then-compact` for each case of the D12 table, from the same session state: tokens, plan share, and whether the next task passes. Set each case of the table to the path that costs less with an equal or better result, and record the order of `/clear` and the resume, the spinner label, and each result in `evidence.md`.
- [x] 11.7 Paired evals of "Delegation by Fit" and of the text audit arms, with tokens and plan share, the `CLAUDE_CODE_PROMPT_CACHE_TTL` pair (X7), the eval case "free-check-runs" of task 7.6, the `subagentPromptCacheTtl` pair of `5m` and `1h` in a delegation task, the session model against a cheaper model for the first step after a handover, and the `learn:` notes of `notes` against the built-in fork on the same sessions. Keep the cheaper value of each, and write each result in `evidence.md`.
- [x] 11.8 D20: a paired run of `Glob` against `Grep` and `Bash` for finding files, and one `just sandbox` run with `EnterWorktree` and `ExitWorktree` denied. Turn off each one whose test shows no need, and write the results in `evidence.md`.
- [x] 11.9 When task 9.6 left option A or B of D21 open: measure both in one `just sandbox` session with `/context`, apply the option that costs fewer tokens and keeps the order, and write the counts in `evidence.md`.
  Not run: task 9.6 settled option A from the loader code (`tests/support/memory-files.test.ts:8`).
