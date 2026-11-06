# Feature map

Baseline: `62e2fe96`, checked out at `/tmp/claudetto-baseline`, Claude Code `2.1.318`. Lines are non-test source lines under `plugins/claudetto/src/` from `wc -l`. Tests are `test(` and `it(` lines in `__tests__`. "Lab" means a file under `plugins/claudetto/tests/` that `claude plugin test` runs. Behavior comes from five read-only inventories of the baseline, run 2026-11-04, and the ISSUES entries named in the last column.

Owners, in the order `design.md` tries them: **native** (a Claude Code setting or built-in behavior), **mod** (an `on(...)` hook in the hooks module), **settings hook**, **skill**, **remove**. Every fate is proposed until the check in the last column has run.

## claudetto: prompt and tool text

| Feature | Observed behavior | Baseline | Owner | Fate | Deciding check |
| --- | --- | --- | --- | --- | --- |
| Root prompt | `prompt.compose` replaces the main-loop system prompt with one shared section | `root-prompt`, 64 lines, lab only | mod | keep | Byte budget of `prompt-footprint` |
| Tool texts | `tool.describe` swaps in a shorter text for 10 tools | `tool-describe`, 220, 16 tests | mod | keep while each text beats the stock size | Decided by probe 2.7 on `2.1.318`: `Bash` 882 bytes against 1,269 stock, `Edit` 243/362, `Read` 286/794, `ToolSearch` 234/963, `Write` 196/240 (`ISSUES-2026-11-04-1500.md`, "Probe 2.7"); `surface-trim` "A Tool Text Ships Only While It Beats the Stock Text" reruns it on each Claude Code update |
| Unused built-in tools | Stock `-p` request sends `Workflow`, `ScheduleWakeup`, `ReportFindings`, and `ListAgents` in full, 13,646 of 28,358 tool bytes, with 5 calls among them in 1.8's transcripts | none | mod | defer each by `isDeferred: true` from the `tool.describe` hook | Task 2.13 (`ISSUES-2026-11-04-1500.md`, "Task 2.13"): the first request fell from 43,834 to 30,184 bytes, and `ToolSearch` still loaded `ScheduleWakeup` |
| Called built-in tools | `Agent`, `Bash`, `Edit`, `Read`, `Skill`, `ToolSearch`, and `Write` are called in 1.8's transcripts | stock or `tool-describe` text | native | keep sent in full | Task 2.13 call counts |
| Plan-mode text | `prompt.attachment` shortens the plan-mode reminder | `plan-mode`, 40, lab | mod | keep | Decided by probe 2.7: 1,179 bytes against the stock 3,796 on `2.1.318` (`ISSUES-2026-11-04-1500.md`, "Probe 2.7") |
| `/init` interview | `skill.prompt` replaces the built-in `/init` text | `init-interview`, 35, lab | mod | keep | Lab case |
| Code rules | Five user rules, one sentence each, `useLeastCode`, `noUnrequestedEdits`, `noImpossibleStateGuards`, `useEdgeCaseReport`, `noNarratingComments`, copied by setup to `rules/claudetto/<name>.md` with one dialog each; each loads on the first file tool | rule files, setup copy, installed-file hash check (5.32) | native rule files | keep, split one rule per file at the user's direction | Already observed loading (`ISSUES-2026-11-04-0934.md`, "Item 3: what the instruction files put into context"); a fake-API probe (`/tmp/probe-rules/run.ts`) showed `rules/claudetto/` and `rules/claudetto/deep/` read recursively, and a `paths: "**/*"` rule loading after a project file `Read`, not before |
| General rules | Setup writes 3 lines into the user's `CLAUDE.md` | `general-rules`, 41, lab | remove | merge into the code rules or root prompt | Overlap read: four routes carry rules; one route per rule |
| Bun rule | `SessionStart` context tells the model to use `bun` | `bun-rule`, 40, lab | mod | keep as a fact line; the rule moves to the root prompt | Data-rule clash, `ISSUES-2026-11-04-0934.md`, "Item 6: hooks and tools against claudetto's blocks" (delta: `surface-trim` ADDED "A Bun Repo Is Told It Uses Bun") |
| Output style | `claudetto:Concise` | style file | native | keep | none |
| Agents | `Artemis`, `Metis`, `Heracles` | agent files | native | keep | `subagent-prompts` |

## claudetto: setup and status

| Feature | Observed behavior | Baseline | Owner | Fate | Deciding check |
| --- | --- | --- | --- | --- | --- |
| `/claudetto:setup` | No-model command: diffs the tier snippet against user settings, asks per key group, writes kept keys, starter files, ignore blocks, `ast-grep` install | `setup-command` 856 + `settings-commands.ts` 282, 20 tests | mod | keep, one implementation; it keeps writing the tier keys to a settings file | Lab case per group. Decided in `-p` by probe 2.1: a `settings.read` hook changed only `disableBundledSkills`; `model`, `effortLevel`, `outputStyle`, `permissions`, `env`, and `enabledPlugins` kept the file values (`ISSUES-2026-11-04-1500.md`, "Probe 2.1"). The interactive half is open (delta: `tier-profiles` MODIFIED "Setup Asks What to Keep") |
| Setup CLI | `bun src/tiers/setup.ts`, same snippet, own starter and ignore code | `tiers/` 1,920, 133 tests | remove the duplicate paths | the snippet tables stay, the CLI and duplicate starter code go | Overlap read; `tierSnippet` stays the single source |
| Settings tables | `automode`, `sandbox`, `keys`, `refused`, `deny`, `builtins`, `threshold`, `cuts` | about 1,450 lines, 50 tests | data for setup | merge into one settings-table module, with the `sandbox` table cut to the five keys of the "Sandbox" group; keep the fault checks, the refused keys, and `NEVER_DENY`, which the merge must not drop | `low-hitl`, `surface-trim`, `tier-profiles` scenarios (delta: `low-hitl` MODIFIED "Let the Sandbox Settle Shell Commands") (delta: `tier-profiles` REMOVED "One Row per Tier") (delta: `low-hitl` ADDED "Setup Replaces the Built-in Lists") |
| `/statusline` | Writes claudetto's status line with no model call; with text it passes to the built-in, or answers a denial text when `permissions.deny` holds `Agent(statusline-setup)` (`status-line/hooks.ts:6-22`) | `status-line` 48, 3 tests | mod | merge into setup; bare writes the status line, and with text `skill.prompt` replaces the built-in text with the edit text, with no pass-through and no denial text (task 5.26) | `status-line` scenarios (delta: `status-line` ADDED "`/statusline` With Text Uses an Edit Text") (delta: `status-line` REMOVED "`/statusline` With Arguments") |
| Status line | Reads stdin JSON, prints rows (branch, PR, OpenSpec, model, context, limits, cache) | `statusline/` 1,066, 76 tests, `bin/` | native `statusLine` command that setup writes, with `refreshInterval` 5, keeping a user's own `statusLine` whole; `subagentStatusLine` from the plugin's root `settings.json`, the one key besides `agent` a plugin may set (`plugins/components.md`, "Default settings") | keep | `status-line` scenarios (delta: `status-line` MODIFIED "Setup Writes Both Lines") |
| Version floor | Logs "run `claude update`" below `2.1.318` | `version-floor`, 33, lab | mod | keep; the snippet's `minimumVersion` guards updates only | Decided by probe 2.2: `minimumVersion: "9.0.0"` gave no warning on `2.1.318`, and the docs scope it to updates (`ISSUES-2026-11-04-1500.md`, "Probe 2.2") |
| Missing tool | Logs an `ast-grep` install line once per version | `missing-tool`, 49, lab | setup | merge into setup | none |
| Worktree base | Tells the model to fast-forward a worktree that lacks the checkout's tip | `worktree-base`, 130, lab | native `worktree.baseRef: "head"` | remove, setup writes the key | Decided by probe 2.3 for agent worktrees: the default based on `origin/main`, `"head"` on the unpushed tip and probe 2.3a for `EnterWorktree`: default on `origin/main`, `"head"` on the unpushed tip (`ISSUES-2026-11-04-1500.md`, "Probe 2.3") |
| Context7 key | Sets `CONTEXT7_API_KEY` from an option | `context7`, 37, lab; `skills/docs` | native settings `env` | remove the block, keep the skill; setup writes `env.CONTEXT7_API_KEY` when the user gives a key | Decided by probe 2.4: a dummy key in settings `env` reached the session's `Bash`, and ctx7 sent it and replied `Invalid API key`, while the control listed React (`ISSUES-2026-11-04-1500.md`, "Probe 2.4") |
| Decide (Jev) | Registers `mcp__claudetto__decide` when a TypeSafe key exists; posts questions to `api.typesafe.ai` | `decide`, 517, 19 tests | mod | recommended: keep the tool, threshold `probabilities[choice]` at 0.75, 5 s per try, no retry on a missed deadline (`specs/decide/spec.md`); the user says yes or no (3.2) | Sends only the model-written question, option labels and descriptions, and fixed approval texts (`ask.ts:42-72`). typesafe.ai documents code that calls Jev, not Jev as the agent's model (`docs.typesafe.ai/introduction/coding-agents.md`); thresholds follow `patterns/probability-routing.md`. Live call 2026-11-04: status 200 twice, 1,814 ms cold and 157 ms warm, and `confidence` matching the docs' Choice formula `(p_max − 1/n)/(1 − 1/n)` on 2, 3, and 4 options (warm calls 152–262 ms over 10), so the baseline's 0.5 floor needs `p_max` 0.75 with 2 options and 0.625 with 4; the docs advise thresholding `probabilities[choice]` instead (`confidence.md`, `patterns/probability-routing.md`). `Brainwires/jevwire` 0.6.6 calls Jev from hooks, fails open, and never allows (read at `7089374`). The 10 s hook budget does not count `$.http.fetch` waits, and the fetch caps at 30 s, so the baseline's worst case is 39 s on one call ("Probe: hook budget against Jev calls"). The classifier shares the Jev client (`ISSUES-2026-11-04-1500.md`, "Jev") |
| Model row notice | Logs when a reply came from a model off the tier row | `model-row` 24, no test | mod | remove with the window row store (delta: `tier-profiles` REMOVED "A Model Off the Row Is Shown") | Follows `window` |

## claudetto: safety and permissions

| Feature | Observed behavior | Baseline | Owner | Fate | Deciding check |
| --- | --- | --- | --- | --- | --- |
| Content gate | `tool.check` tightens the verdict: parsed shell words, root and disk wipes, system writes, secret reads, git loss, force push, protected files, uploads, piped downloads | `gate`, 4,677 lines in 46 files, 27 tests plus lab | mod | rewrite to the rules native settings cannot express | Probe 2.8: deny rules stop the plain form of every rule, and miss `sh -c` and `bash -c` bodies, `git -C`, command substitution, `export -p`, and redirects or `tee` into `/etc` (`ISSUES-2026-11-04-1500.md`, "Probe 2.8"). `ask` rules and `autoMode` wait on task 2.8a. Fixtures include the false positive in `ISSUES-2026-11-04-0934.md`, "The gate reads a `\.env` in code text as an env-file read" (delta: `low-hitl` REMOVED "Protected Files Are Gated by a Hook") |
| Repeat-denial stop | Denies a call after 2 denials of the same input; a new non-meta user prompt clears the count (`denied.ts:59`) | gate `denials.ts` | mod | keep | `permission-policy` "Denied Calls Stop" (delta: `permission-policy` MODIFIED "A Repeat Denial Counts Only Since the Last User Message") |
| Retry after denial | `PermissionDenied` returns `retry` below 2 | gate `denied.ts` | mod | keep | Same |
| Run-limit hold in the gate | Gate hook denies identical failures and heavy-context calls | gate `block.ts:83`, `:99` | mod | move to the run-limits owner | One owner per responsibility |
| Own classifier | `PreToolUse` sends non-read calls to Haiku or Sonnet, optionally Jev first; off by default | `classify`, 549, 23 tests | remove | removed 2026-11-06: 5.29 shipped the built-in classifier with setup's trimmed `autoMode` lists (30 of 30 verdicts against the Mod route's 29 of 30, which allowed `git push origin main` when the user named `feature/typo`, 4 of 4 runs; `ISSUES-2026-11-04-1500.md`, "Task 5.29: route A against route B on 30 cases") | `just eval --classifier` results at the baseline (`tasks.md` 3.1) (delta: `low-hitl` MODIFIED "Choose the Classifier Model by Measurement") (delta: `permission-policy` REMOVED "The Classify Block Reasons before Its Verdict") |
| Confine | Wraps every `Bash` in a macOS sandbox profile; off by default | `confine` 86 + `profile.sb` + `bin/`, 33 tests | the "Sandbox" group in `hooks/setup/settings.ts` | replace: setup writes a short `sandbox` block for the built-in sandbox (goal item 3, `design.md`, "Sandbox (goal item 3)"); no own profile, proxy, or prefix | The user (2026-11-06): "perhaps using built-in sandbox is worth keeping, just heavily customizing it." and "less re-inventing the wheel. more use of CC's own built-ins that way"; then "we want least friction, so having to manually add domains is fucking annoying. we want least annoying and nagging sandbox. "just block the truly destructive stuff and let the rest pass free"". The baseline's confine code is not carried (delta: `low-hitl` MODIFIED "Let the Sandbox Settle Shell Commands") (delta: `prompt-footprint` REMOVED "The Sandbox Settings Share Is Measured") |
| Read guard | Denies a whole read of lock, minified, map, and build files | `read-guard`, 86, 4 tests | mod | keep | Lab case. Native `Read` refuses only above 262,144 bytes or 25,000 tokens, and a 58,522-byte `bun.lock` falls under the byte cap and, by an unmeasured estimate, the token cap, so the name rule covers what the native caps let through (`ISSUES-2026-11-04-1500.md`, "Probe 2.11") (delta: `surface-trim` ADDED "A Whole Read of a Heavy File Is Denied") |
| Auto mode rules | Setup writes `autoMode` lists | `automode`, 378, 23 tests | native settings | keep as data | `low-hitl` |

## claudetto: session lifecycle

| Feature | Observed behavior | Baseline | Owner | Fate | Deciding check |
| --- | --- | --- | --- | --- | --- |
| Subagent cap and rate | `agent.spawn` denies past the cap or start rate | `run-limits` | mod | keep | `run-limits` scenarios |
| Identical failures, heavy calls | Counted in run-limits, enforced in the gate | `run-limits` + gate | mod | one owner | Same |
| Stall at Stop | Third Stop block with no file change logs and asks for one line | `run-limits` | mod | change: the first Stop block after a stretch with no file change ends the turn with `preventContinuation`, so a `/goal` pauses after one check and `/goal clear` stays the user's choice (task 5.16) | Lab cases for no write, write each stretch, `Bash`-only and read-only progress, denied write, a user's own Stop hook, and claudetto's own block (delta: `run-limits` ADDED "A Stop Loop with No Progress Ends the Turn") (delta: `window-budget` REMOVED "A Stop Loop with No Progress Is Ended") |
| Background tasks at Stop | Adds the running task list as context | `run-limits` | mod | keep | `run-limits` "Background Tasks at Stop" |
| Background process cleanup | Claude Code waits on, deadlines (600,000 ms default), and kills the shells it tracks and their children; a `nohup` child of an exited shell outlives the session | none | `AGENTS.md` rule: record the pid, stop it with `kill <pid>` | no mod; `/clear` and interactive end wait on 2.10a | `ISSUES-2026-11-04-1500.md`, "Probe 2.10" |
| Search exclusions and read size | `Grep` honors `.gitignore` and `.ignore` except for files its `glob` matches; `Glob` lists ignored and hidden files by default; a `Read` deny hides a path from both; `Read` refuses over 262,144 bytes or 25,000 tokens | setup's ignore blocks (`starter/ignore/`, 280) | native tools; setup writes the blocks | keep the blocks, correct their stated scope; no mod, no `CLAUDE_CODE_GLOB_NO_IGNORE` change | `ISSUES-2026-11-04-1500.md`, "Probe 2.11" |
| Open items at Stop | Blocks a stop on bullets under an "open" heading that name no blocker; no switch | `run-limits/open-items.ts`, 37, 7 lab tests in `tests/run-limits/open-items.test.ts` | mod | keep, add a switch and fixtures, replace the word lists with verifiable blockers (`specs/run-limits/spec.md`) | Probe table in `ISSUES-2026-11-04-0934.md`, "Item 1: how the Stop check reads a reply" |
| Budget line | `prompt.submit` context "Budget: context X% left…" when the band changes; an instruction at 90% weekly | `run-limits` | mod | keep the fact line, move the instruction to the root prompt | Data-rule clash entry (delta: `window-budget` MODIFIED "The Weekly Share Slows the Session") |
| Window rows | Store per-turn and window rows for 7 days | `window`, 656, 49 tests | mod | remove the row store; the handover drops its `asCompaction` wrapper, and the classifier spend write follows decision 3.1 | Rows have no shipped reader (`tools/window-report.ts` is unshipped); two shipped dependents: `classify/block.ts:16-20,82-83` and `compaction/block.ts:6,30` (`ISSUES-2026-11-04-1500.md`, "Inventory reconciliation") (delta: `window-budget` REMOVED "Window Rows Are Recorded") (delta: `window-budget` REMOVED "Report from Many Turns") (delta: `window-budget` REMOVED "The Classify Block's Spend Is Counted") |
| Handoff tool and writer | `mcp__claudetto__handoff`, `/claudetto:handoff` command, compaction-time writer, resume read-back that skips a handoff older than 7 days or already taken, context note | `handoff`, 652, 3 tests plus lab | mod | keep, sole handoff writer | `session-handoff` |
| Handover fork and cheap summary | Fork for a handoff at a token threshold; optional Haiku summary | `compaction`, 406, lab | mod | merge into handoff; cheap summary by measurement | `compaction-path`. `handoverThresholdTokens` (400,000) is separate from the autocompact trigger (140,000, written as `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`) and from `heavyContextTokens` (400,000); the measurement sets their order (`design.md`, "Handoff has one writer") |
| Price step | Replaces a tool result that would push a Haiku request past the 100,000-token price step | `price-step`, 195, 7 tests | mod | keep | `tier-profiles` scenario |
| Heartbeat | Writes a timestamp each step for the status line's hooks-off check | inside `price-step`, 5 | mod | keep with the status line | `status-line` |
| Bounded output | Cuts long runner output, keeps the full text in a file | `bound-output`, 223, 7 tests | mod | keep | Lab case |
| Hygiene | Startup sweep of stale temp folders, handoffs, outputs, heartbeats | block 52 + `hygiene/` 537 + `bin/`, 36 tests | mod running a child process | keep, smaller | `session-hygiene` |
| Secret redaction | Redacts secrets in code-built handoffs | `shared/secrets`, about 700 | betterleaks, `hooks/secrets.ts` | replace: betterleaks scans every tool result and each handoff (goal item 1) | `design.md`, "Secret matcher" |

## claudetto-you-should-know

| Feature | Baseline | Owner | Fate | Deciding check |
| --- | --- | --- | --- | --- |
| Side-check observer, the whole contract in `specs/you-should-know/spec.md` | 1,257 lines in 21 files, 41 tests | mod | rebuild with fewer modules: drop the `blocks/` layer, `Ports`, and the duplicate `closed` | The 42-test lab passes against the rebuild, and the gaps the inventory found get tests |

## OpenSpec workflow

| Feature | Baseline | Owner | Fate | Deciding check |
| --- | --- | --- | --- | --- |
| `openspec init` in setup | `tiers/openspec.ts`, runs the upstream CLI | setup | drop: claudetto-openspec's skills ship with its plugin | design "claudetto-openspec replaces upstream OpenSpec" |
| Upstream CLI and skills | `@fission-ai/openspec` 1.16.0, core profile skills | claudetto-openspec | replace by `plugins/claudetto-openspec` | `specs/lean-openspec/spec.md`; bytes against 1.4 (95,443 skill bytes, core) in 4.3 |

## Repo tooling

| Area | Baseline lines | Fate | Note |
| --- | --- | --- | --- |
| `claudekit/` | 14,081 | removed | The user removed it from the plugin on purpose (2026-11-04); task 17.13 took it out of this repo, and its future is the cc-inspect plugin's. The evidence its runs produced is in `evidence/`. `just types` now has the installed Claude Code write the declarations (`design.md`, the `just types` paragraph) |
| `tools/` | 10,509 | keep what `just check` and the evals call | Reread per recipe |
| `docs/` | 4,795 | rewrite for 0.4.0 | |
| `tests/` (repo level) | 2,963 | keep what covers a kept feature | |

## Decisions of the user, 2026-11-05

The user answered section 3 of `tasks.md` in one message on 2026-11-05. Each row quotes or restates that message.

| Task | Decision | What follows |
| --- | --- | --- |
| all | The baseline's ways and mannerisms are not retained. | The rebuild carries the baseline's tested logic, not its texts or habits. Each text shipped to the model is written new and passes the measured-text rule |
| 3.1 | The classifier's fate is chosen by measurement: either a severely trimmed built-in classifier is kept, or a Mod replaces it with Jev and a `claude-haiku-5-5` fallback and turns the built-in classifier off, whichever costs less | Task 5.29 measures both routes and ships the cheaper one; the baseline's `classify` is not carried |
| 3.2 | Yes, with a wider scope: `decide` becomes a general decision tool for Claude, shaped by what typesafe.ai and external repos show Jev can do and is for | Task 5.10 rebuilds `decide` from those sources and `specs/decide/spec.md` |
| 3.4 | Models stay `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`, and no other | The allocation among the three is the agent's to measure; no other model id is written anywhere |
| 3.5 | Notifications become standard | Task 5.30 ships the notification hook, on by default |
| 3.6 | The user does not know; the agent decides from fetched sources, maintained repos, and Claude Code's own plugin and mod authoring | Task 3.6a builds the table from versioned docs; 5.31 ships the rule the table supports |
| 3.7 | Deleting `GOAL.md` and `goals/` is approved | Both are already gone from the working tree and from git |

## Model allocation A/B for task 3.4, 2026-11-06 (decided)

Measured in `/tmp/claudetto-baseline` with `bun --env-file=<repo .env> tools/evals/cli.ts --allocation --run --case KEY --arm ARM --runs 1`, one session per call (a call of 4 sessions on `I13` took 445,085 tokens, over the 300,000 cap, so later calls ran one session each, at most 126,026 tokens). 8 fixed cases, 3 runs per case per arm, 24 sessions per arm, 96 in all, 6,019,138 tokens and $5.81. The run numbers are repeated calls, not distinct seeds. Logs: `/tmp/probe-34/out.txt`, `/tmp/probe-34/out2-*.txt`, `/tmp/probe-34/prior.txt`. Dollars are `total_cost_usd` of each session, rounded to cents per call, so totals are within a few cents.

| Arm (option) | Main model | Pass | Pass rate | Total | Price per accepted task | Tokens |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `control` (stock) | `claude-opus-5-5` | 22 of 24 | 91.7% | $1.64 | $0.075 | 1,470,062 |
| one subagent model (a) | `claude-opus-5-5`, `CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5` | 21 of 24 | 87.5% | $1.77 | $0.084 | 1,635,678 |
| `Artemis` on haiku (b) | `claude-opus-5-5`, `Artemis.md` names haiku | 21 of 24 | 87.5% | $1.73 | $0.082 | 1,557,038 |
| `opusplan` (c) | `opusplan` | 18 of 24 | 75.0% | $0.67 | $0.037 | 1,356,360 |

Per case, passes of 3: `I12` 3/3/3/1, `I13` 1/0/0/0, `W5-15` 3/3/3/2, the other five cases 3/3/3/3 (order control, a, b, c).

Reading:

- (a) and (b) cost the same as `control` within noise ($0.075 to $0.084 per accepted task, and their tokens match `control` per case). The cases are small single-agent edits, so a subagent was probably rarely or never spawned; the transcripts were not kept, so this is a hypothesis. This A/B shows no saving for (a) or (b), and no loss beyond one fewer pass in each, which is within noise at 24 sessions.
- (c) is the only arm that moves the price: 50.7% less per accepted task than `control` ($0.037 against $0.075) and 51% less total, at 16.7 points lower pass rate (18 against 22). It lost on `I12` twice, `I13`, and `W5-15`. `opusplan` runs the Sonnet-class model outside plan mode, so this is a main-model effect, and a 6-case sample where `control` itself passed `I13` once.
- The 50 to 70% savings claim of `goals/RESEARCH.md`, section 5, could not be read: `goals/` is deleted (3.7) and no copy is in the repo or git. Against the 50 to 70% range as quoted in `tasks.md`, only (c) reaches the low end, and it pays in pass rate.

Recommendation (the user decides): do not ship (a) or (b) as a cost measure, since this A/B finds no cost effect for them; if the user wants the saving, it comes from the main model, so offer `opusplan` as an opt-in and not as the fresh-install default, because it fails 3 more of 24 tasks than `control`. A subagent-heavy fixture would be needed to test (a) and (b) fairly.

Decision (the lead's, 2026-11-06, under the user's "nobody asked the user to decide. you keep going."): the fresh-install default stays the stock main model, not `opusplan`, because (c) lost 4 passes of 24 for its 50.7% saving. Setup keeps its existing `CLAUDE_CODE_SUBAGENT_MODEL` (`claude-sonnet-5-5`, settings-review A3), and `Artemis` names no model of its own, since (a) and (b) measured no cost effect here. `opusplan` stays a choice the user can set. Open measurement: these cases spawned few or no subagents (unmeasured, the transcripts were not kept), so a fixture that makes subagents run is needed to measure (a) and (b) fairly.
