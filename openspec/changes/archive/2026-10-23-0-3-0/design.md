## Context

The why and the scope are in `prd.md` and `proposal.md`, the components and decisions A1 to A12 in `architecture.md`, and the behavior in `specs/`.
The faults are in `.claudetto/0.3.0-findings.md` (cited as "fault N") and `research/sessions.md` (cited as "F N").
The docs facts are in `research/claude-code.md` and `research/vanilla-inventory.md`, and the outside evidence is in `research/references.md` and `research/references-web.md`.
The baseline `just docker check` of 0.2.0 passed on 2026-10-21 (`Ran 1347 tests across 164 files`, `0 fail`, `.claudetto/baseline-check.log`).
The user wrote: "If you have to trim down Claudetto's files and architecture, do so freely." and "both documented/undocumented/experimental get taken advantage of when they heavily trim and optimise our workflows."
(2026-10-21).
Scope of the session data: claudetto 0.2.0 was loaded in 3 sessions, and about 190 other sessions ran a setup of the user that copies claudetto designs (`research/sessions.md`, "Scope Warning").
So a group B fault shows a design risk, not a proven 0.2.0 fault.

## Decisions

### D1: Agent Roster

The `agents` slice ships these plugin agents (proposed values, an eval confirms each before `0.3.0`):

| Agent | Task | `model` | `effort` | `tools` |
| --- | --- | --- | --- | --- |
| `scout` | Read-only search over many files, returns paths and lines | `claude-haiku-5-5` | `low` | `Read`, `Grep`, `Glob` |
| `worker` | One planned edit step with its check, the default for a call with no type | `claude-sonnet-5-5` | `medium` | `Read`, `Edit`, `Write`, `Grep`, `Glob`, `Bash`, `Monitor` |
| `reviewer` | A fresh review that gets only the diff and the plan | `claude-sonnet-5-5` | `high` | `Read`, `Grep`, `Glob`, `Bash` |
| `researcher` | Web research to a report file | `claude-sonnet-5-5` | `low` | `WebSearch`, `WebFetch`, `Read`, `Write` |

- Task 10.2 confirmed `claude-haiku-5-5` for `scout`: 8 of 9 runs correct in the asked form against 9 of 9 on Sonnet, at 6.9% of the cost (`evidence.md`).
- Each agent has `omitClaudeMd: true` and a one-line description with its trigger.
- Each body says: return a short result with paths, stop and report a block, and do not go on with work that a failed check gates (faults 3 and 33, F13).
- No `maxTurns`: turn limits left work half done in 24 sessions (F02).
- `reviewer` is on Sonnet: an Opus `reviewer` made 54% of the cost, $433.76 of $799.26 (F16).
  A call can still pass `model` for one review.
- No `isolation: worktree` by default: the worktree guard refused 9.2% of the subagent `Bash` calls (F01).
- Why a narrow list: a custom agent with one tool started at about 30k tokens against 116k for `general-purpose` (`research/references-web.md`).
- Why no `planner`: the main session plans, and rule 2 of `research/references.md` says to delegate only a large read or parallel work.
- Alternatives: one generic agent (rejected, it is `general-purpose` again), and `$.agent.register` (rejected in A2).

### D2: Built-In Agents

`agent.offer` returns `{isOffered: false}` for the agents with the provider `{plugin: "engine"}`.
The snippet denies `Agent(general-purpose)`, `Agent(Explore)`, `Agent(Plan)`, `Agent(claude)`, `Agent(claude-code-guide)`, and `Agent(statusline-setup)`, and sets `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` and `CLAUDE_CODE_FORK_SUBAGENT=0`.
A `tool.call` hook on `Agent` gives a call with no `subagent_type` the type `claudetto:worker`.
It is not `agent.spawn`, because the permission step treats such a call as `general-purpose`, and the deny and `agent.offer` refuse it before `agent.spawn` (stub run of task 4.2, `evidence.md`).
Why both routes: the hook works from the plugin, and the denies work when mods do not load (A3).

### D3: Subagent Cap from the Plan

`claudetto-setup` reads `oauthAccount.organizationRateLimitTier` from `~/.claude.json` and maps it to the cap in `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`.
`default_claude_max_20x` maps to `6` (seen on this machine). `default_claude_max_5x` maps to `4`, and a Pro tier maps to `2` (proposed names, not seen yet).
An unknown tier writes no cap, and setup names the tier.
`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` goes from the snippet, and an agent that must not start agents has no `Agent` tool (fault 17).
Alternative: a `session.start` hook with `$.env.set` (rejected for now, because it is not known whether Claude Code reads the cap after start).

### D4: Permission Gate

- One `tool.check` hook on `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write` decides by the spec `permission-gate`.
  It parses the command with the shell parser in `src/kernel/shell/`, which 0.2.0 already has.
- `ask` results use `decider: "person"`, so the dialog has no "always allow" row (A5).
- `.catch` returns `ask` with `decider: "person"` and the name of the gate.
- Static `deny` rules keep the gates for secrets, `/`, `~`, `$HOME`, and the disk commands when mods do not load.
- The snippet writes no `ask` rule, because an `ask` rule applies before each `allow` (A4).
- The gate allows by default and stops only a call that loses bytes for good or tampers with the system (the user, 2026-10-21: "does that deletion ACTUALLY erase the file from its byte existence, making it truly unrecoverable?
  dangerous!").
  A delete of a committed file that `git` tracks is allowed, because `git checkout` brings it back.
  A delete with no copy (`rm` of a file with no commit, `shred`, `srm`), `git clean -f` with untracked files, `git push --force`, and `git reset --hard` with changes that are not committed get `ask`, so the user can still approve one.
  A disk wipe (`mkfs`, `dd of=/dev/…`, `diskutil erase…`), system tampering (`csrutil`, `spctl --master-disable`, `nvram`, `sudo`, writes to `/System`, `/usr`, or `/Library`), and a read of a secret get `deny` (spec `permission-gate`).
- A command that the parser cannot read, such as `eval`, `base64 | sh`, or a script that the session wrote, gets `ask`.
- Jev decides each `ask` of a loss for good before a person sees it (the user, 2026-10-22: "ask Jev. that's what claudetto's jev integration is supposed to do").
  When `TYPESAFE_API_KEY` is set, the gate sends Jev one `yes` question with the command, each target, and its `git` state as text, and no file.
  A confident yes (`P(yes)` at or above `1 - APPROVAL_MAX`) gives `allow`, and the reason names Jev and `P(yes)`.
  Any other answer, no key, a failure, or a timeout gives the `ask` with `decider: "person"` as above.
  The gate makes one try, bounded by `ATTEMPT_TIMEOUT_MS` of `slices/decide/limits.ts`, so a slow API costs at most one try.
  The command and the paths go to the TypeSafe API, as the questions of `AskUserQuestion` do.
  Why: a person sees only the deletes that Jev is not sure of, and Jev costs one small request where a Haiku check costs a model call (question Q1).
- The Trash rewrite is dropped: Jev decides in its place.
  `tool.check` could not do it anyway, because only `tool.call` rewrites a call (`research/probes.md` batch 13).
- The print guard goes: it cost a retry each time (F09), and it failed by itself (F41).
- When a gate refuses, the reason gives the exact command for the user to run with `!` (F24).
- Why not the sandbox: it broke Swift builds and `openspec init` (faults 1 and 2, F05, F18, F38).
- Alternative: a `PreToolUse` command hook (rejected, because it starts a process for each call and cannot set `decider`).

### D5: Auto Mode Off

The snippet sets `permissions.disableAutoMode: "disable"` and `permissions.defaultMode: "default"`.
With the gate of D4, the hook allows each call that no gate matches, so the mode never asks.
Why: the cost is in the context, not in money.
On a direct Pro, Max, or Team connection, the server checks are at no charge (`auto-mode-classifier-billing`), but auto mode adds a `safeguards` field of 1,750 characters, or 16,286 with the rules of the user, and an `auto_mode` reminder of 485 characters that comes back in the session (`research/probes.md` batch 12).
The reminder tells the model to read and edit with `cat` and `sed` through `Bash`, which goes around the `Read` and `Edit` hooks.
Task 10.3 measured the `safeguards` field: it does not count in `usage.input_tokens` (13,732 tokens without auto mode and 13,731 with it, `research/probes.md` batch 14).
So the cost of auto mode in the context is the reminder only, and the reasons above for this decision stay.
Behind a proxy, each `Bash` call also costs a classifier request of 142,739 characters (`research/probes.md` batch 12).
The classifier also denied and looped in 29 real calls (F03, F28).
The same key also removes the auto mode nag: the tip `auto mode handles these prompts for you`, with its row "Yes, and switch to auto mode", shows in a permission dialog only when the mode is `default` or `acceptEdits` and auto mode is available.
`disableAutoMode` makes auto mode not available (bundle of 2.1.306, functions `dVt`, `EG`, and `verifyAutoModeGateAccess`).
A prompt that a hook or an `ask` rule causes also never shows the tip.
The alpha test confirms that the tip does not show.
Risk: a hook `allow` does not clear an `ask` or `deny` rule of the user, so setup lists each `ask` rule of the user that still prompts.

### D6: Parts That Go

| Part | Evidence | Replacement |
| --- | --- | --- |
| `claudetto-codegraph` | faults 18, 46, 47, F17, and the user (2026-10-21) | none |
| `prompt` rewrites of the system sections | fault 44 | the body of `claudetto:main` (A9). The other built-in texts get rewrites (A16) |
| memory texts | fault 20, memory is off | none |
| `goal` (1,206 lines) | fault 28, fault 49, and the user, 2026-10-21 ("goal is primitive") | a small claudetto goal: a `Stop` command hook that runs one check command and blocks the stop until it exits `0`, with no model call. A Mod API `command.run` hook on `goal` answers in place of the built-in `/goal`, because a plugin skill cannot replace it and no setting turns it off (`research/probes.md` batch 13), and `modelProposedGoals: "disabled"` stops goal proposals (`docs/configure/settings/agents-and-remote.md:35`, undocumented) |
| `advise` | fault 32, and "advisor is expensive" (the user, 2026-10-21) | none: `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` also turns off the built-in advisor (`docs/configure/env-vars/tools-and-bash.md:60`) |
| `decide` | fault 31, off with no key, 1,162 lines | stays in the core plugin, rebuilt smaller (D7): Jev answers `AskUserQuestion` and the gate `ask` of a loss for good (D4). Off with no key, as now |
| `command.describe` hook | fault 30, the menu is not in the context | none |
| print guard | F09, F41 | none |
| `agent.spawn` rule text | fault 33 | the agent bodies |
| `bashOutputMaxChars: 16000` | F10: 319 outputs went to files and 2.12M characters were read again | the default `30000` |
| controls with no incident | fault 24 | none |
| `claudetto-sessions` and `claudetto-lab` | the user, 2026-10-22: "claudetto-sessions/lab are no longer needed since the claude-code-docs's plugin will come with an mcp that will take care of sessions+CC binary handling itself" | the MCP of the `cc-docs` plugin. The repository tools of `claudetto-lab`, such as `claudetto-sandbox`, move to `tools/`, so `just sandbox` and the paid runs keep working |

`/loop` stays off (`CLAUDE_CODE_DISABLE_CRON=1` and `disableBundledSkills: true`), because a background command and `Monitor` cover a wait, and `/loop` is a schedule, not an end condition.

The verdict for each other part is in `architecture.md`, "Verdict for Each 0.2.0 Part".
`handoff` is used (F35: 182 calls in the setup of the user), and its fork cost is measured first (fault 25).
`handoff` must not cut the result of a Haiku agent at its 100,000-token trigger (F06).
`statusline` gets its refresh measured (fault 19), and its command must not point at a versioned plugin folder (F19).

### D7: Readability Bounds

`biome.json` turns on `complexity/noExcessiveCognitiveComplexity` with `maxAllowedComplexity: 15`.
A file line bound goes into `tools/limits.ts`, and a test fails above it.
The 20 functions above 15 (fault 27) are fixed, or they go with their slice.
Why 15: the readability guide of the user sets 10 as the goal and 15 as the review point (fault 27).

### D8: Prompt Base and Levers

- The first main request of 2.1.306 is 46,208 characters with no setting, and 49,666 with the 0.2.0 plugin (`research/probes.md` batches 1 and 4).
  The levers that need no mod give 12,640 characters (`mainfloor`, batch 7), and a mod that shortens the tool texts gives 8,371 (`descfloor`).
- The main agent `claudetto:main` replaces all of `system[2]`, so the sections of the default body do not render (batch 8, `comp`).
- Each part of the messages except the prompt of the user is an attachment that `prompt.attachment` can rewrite or drop (batch 8, `att`).
  The `environment` attachment gets the shell facts of D9, and the parts that no rule needs go.
- `tool.describe` gives each kept tool an ASD-STE100 text that keeps each rule that the model needs, and it defers each tool that a session seldom uses.
  `ToolSearch` stays loaded, because it cannot be deferred (batch 6, `floor`).
- The snippet writes the `Lever` column of `research/replace-matrix.md`, and nothing more.
- The snippet also keeps the handoff keys of task 3.4: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `autoCompactWindow`, `modelSettings`, and `CLAUDE_CODE_PROMPT_CACHE_TTL` (the user, 2026-10-22).
- The snippet also writes `statusLine` and `subagentStatusLine`, because the `statusline` slice has no other way to show its line (proposed).
- The snippet also writes `worktree` with `baseRef: "head"` of the matrix row "Worktree isolation", so that an agent worktree starts at the local commits (proposed).
- The keys of the snippet are in the order of the settings schema of `claude-code-docs`, and the `env` names are in the order of its `configure/env-vars` pages (the user, 2026-10-22).
- A lever that cuts a capability is not a saving (the user, 2026-10-21: "minimal does not mean reduced capabilities.").
  So the snippet does not set `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`, although it saves 1,375 characters (batch 11, `bgoff`), because D9 needs background commands.
- The size bar is the same as for MiniSpec: the first version is cut until no cut keeps the tests green, then a test pins the measured size, and a change can lower it only.

### D9: Text of `claudetto:main`

The body is the minimal base of A9, and each line maps to a fault or a test:

- Ask each decision with `AskUserQuestion`, and not in prose (fault 10, F04).
- Go on with independent work while an agent runs (fault 11).
- Run a long command in the background and wait with `Monitor`, not `sleep` (F11).
- Give the user the exact `!` command when a gate stops an action (F24).
- Do the agreed work with no new request for approval (F23).
- macOS has no `timeout`, and zsh fails on a glob with no match (F29, F33).
  Proposed: set the shell facts in the env message with `prompt.context`, not in the body.

### D10: MiniSpec in Place of OpenSpec

- Why: OpenSpec puts 7 skills into this repository, with 115,816 bytes of skill bodies and 2,014 characters of descriptions at each session start.
  The `minispec` of 0.1.0 had a prompt of 12,500 bytes (`src/wiki/claudetto/slices/Spec.md`).
  0.2.0 measured the gap and kept OpenSpec with no reason on record ("Later steps must trim the text or accept the size", `0-2-0/evidence.md`).
- Goal: MiniSpec is OpenSpec with less code and less text, and the same or better behavior for each part that the CLI workflow needs.
  There is no size goal that the plan picks.
  The bar is behavior, and the size is the least code that meets the bar.
- Scope comes from use: `Bash` calls of `openspec <command>` in the 173 sessions of `~/.claude/projects` that call OpenSpec.

  | Command | Calls | MiniSpec |
  | --- | ---: | --- |
  | `validate` | 169 | keeps it |
  | `instructions` | 49 | the skill points to the template file and `config.yaml`, which give the same text with no code |
  | `list` | 44 | keeps it |
  | `archive` | 36 | keeps it, with the merge of the delta specs |
  | `status` | 32 | keeps it, with the ready artifacts and the task counts of `countTasks` (`src/kernel/change.ts`) |
  | `new change` | 18 | keeps it |
  | `init` | 62 | goes: the first `new change` makes the folders |
  | `config set`, `config profile`, `config list`, `config path`, `config` | 12, 7, 5, 3, 4 | goes: MiniSpec has no global config |
  | `schema validate`, `schema fork` | 10, 3 | goes: the three presets are data of the slice |

  The commands with no calls in the table (`view`, `store`, `doctor`, `workset`, `feedback`, `completion`, `templates`, `schemas`) go.
- Shape: four user skills, one for each step, as OpenSpec has `/opsx:propose` and the rest: `claudetto:propose`, `claudetto:apply`, `claudetto:verify`, and `claudetto:archive` (D11).
  The presets `task`, `story`, and `epic` are templates.
  Each skill has `disable-model-invocation: true`, so the four skills add no description to the request (`research/probes.md` batch 13, `goalproj`).
- Bar for "same behavior": a parity test runs MiniSpec and `@fission-ai/openspec@1.14.3` on the same fixtures for each kept command, and compares the exit codes, the files that each writes, and the facts that each prints.
  A difference fails the test, unless the plan names it as better, with its reason.
- Bar for "better": no `init` run, no change of the global config, and no skill text at session start.
  OpenSpec `init` broke in the sandbox (faults 1 and 2), and its global config gave each workflow twice (`delivery: both`, `src/wiki/claudetto/slices/Spec.md`).
- Size: the first version that passes the parity test is cut down with a rewrite pass and the `claudetto:dry` skill, until no cut keeps the test green.
  Then a test pins the measured lines of code and bytes of text, so a later change can lower them and cannot raise them without a new behavior that the plan names.
- Layout: the files stay in the OpenSpec layout (`openspec/changes/<name>/`, the same delta headers), so `handoff` and `statusline` do not change, and a user can still run OpenSpec on the same files.
  This is the choice that is easiest to change later.
- Goes: the `bunx @fission-ai/openspec` init, the copy of the schemas, and the change of the global OpenSpec config.
- Differences from OpenSpec: the parity test (`tests/claudetto/spec/parity.test.ts`) allows only the differences below, each by its id.
  The facts that it compares are the exit code, the files that the command writes and removes, and these facts that it prints.
  `new change` compares the `Created` and `Schema` lines.
  `list` compares `name`, `completedTasks`, `totalTasks`, and `status`.
  `status` compares `changeName`, `schemaName`, `isComplete`, the apply requirement, and each artifact with `id`, `status`, `requires`, `outputPath`, and `missingDeps`.
  `validate` compares each item with `id`, `valid`, and the issues, and the totals.
  `archive` compares the printed lines, except the proposal warnings.
  The other keys and lines of OpenSpec are out of the bar: `root`, `planningHome`, `actionContext`, `nextSteps`, `lastModified`, `durationMs`, the `Next:` line, and the proposal warnings.
  `status --json` of MiniSpec adds `template`, `instruction`, `context`, `rules`, `apply`, and `tasks`, because the skill `propose` reads them in place of `openspec instructions`.
  - `empty-project`: `new change` works in a project with no `openspec/` folder, with no copied schema, and writes no `openspec/config.yaml`.
    The reason is the bar "better": OpenSpec fails there with `Schema 'story' not found`, and it writes a global-style `config.yaml` that the user did not ask for.
  - `task-lines`: a task is a line that starts with `- [ ]` or `- [x]`, as in `countTasks`.
    OpenSpec also counts indented lines, the bullets `*` and `+`, and numbered lines.
    The reason is that `handoff` and `statusline` share `countTasks`, so the three read the same count, and the presets write only the `- [ ]` form.
  - `messages`: the text of an error differs, and the exit code is the same.
    The reason is that the text of MiniSpec names the next step for the model and uses no `✖ Error:` prefix.
  - `no-tip`: the message for a change with no delta leaves out the tip about `openspec change show`, because MiniSpec has no such command.
  - Without an id, because OpenSpec needs a prompt or a global state that the parity test cannot run:
    `archive` with open tasks and no `--yes` stops with exit `1` in place of a prompt,
    the default schema is `story` in place of `spec-driven`,
    the schema lookup has no user folder under `XDG_DATA_HOME`,
    and `validate` runs the delta checks only: the checks of a delta file outside `specs/<capability>/spec.md`, of an orphan requirement, of the scenarios that a `MODIFIED` block drops, of the keys of `.openspec.yaml`, of the task file format, of a duplicate in `REMOVED` or `RENAMED`, and of a name in two sections are not in MiniSpec,
    the message for a `SHALL` in a header only and the hint for an empty scenario header are shorter,
    and `archive` prints no warning for a `REMOVED` name that is missing.
    Task 8.3 also cut the warning for a long requirement, the check of a duplicate name in one section (`archive` still fails a duplicate `ADDED` name), the nested capability ids such as `specs/a/b/spec.md`, and the `**Key**:` fallback of the requirement text.
    The reason for each is use: the 173 sessions call none of them, and task 8.3 cuts the rest.
- This change, `0-3-0`, stays on OpenSpec until MiniSpec lands, so the plan does not move in the middle of its work.

### D11: Command Names

Each skill name is a verb or starts with a verb, as the bundled skills of Claude Code do (`simplify`, `verify`, `update-config`, cc-docs `extend/skills-and-commands/bundled-skills`).
The plugin name is the prefix, as `/opsx:` is for OpenSpec.
The user approved this table (2026-10-22).

| 0.2.0 | 0.3.0 | Reason |
| --- | --- | --- |
| `claudetto:dry` | `claudetto:dedupe` | The name says what it does. "dry" is jargon. |
| `claudetto:spec` | `claudetto:propose`, `claudetto:apply`, `claudetto:verify`, `claudetto:archive` | The steps of `/opsx:*`, at no start cost (D10). |
| `claudetto-lab:eval-compare` | `claudetto-lab:compare-evals` | The verb comes first, as in `update-config`. |
| `claudetto-sessions:sessions` | `claudetto-lab:replay-hooks` | The replay moves into `claudetto-lab` (`architecture.md`). |
| `claudetto-docs:docs` | `claudetto-docs:find-docs` | The name of the Context7 skill `find-docs`. |
| `claudetto:setup`, `claudetto-browser:browse` | no change | They are verbs. |

`claudetto-docs` is the lightweight integration of Context7: the same `ctx7` CLI and service as the official skill `find-docs`, at less cost (the user agreed, 2026-10-22).
In the setup of the user, the official skill and its rule cost 2,191 characters in each session (876 of description and 1,315 of `~/.claude/rules/context7.md`), and `claudetto-docs` costs 155.
On a call, the bodies are 6,907 and 2,071 characters.
`claudetto-docs` pins `ctx7@0.6.1`, turns off its telemetry, and allows only its `library` and `docs` commands.
Risk: a user with both sees two skills that do the same work.
So when setup finds the official skill `find-docs` or a Context7 rule, it names both with their sizes and tells the user to remove one, and it deletes nothing.
Risk: a pinned `ctx7` breaks when Context7 changes its CLI, so a test runs the pinned version.

### D12: Session Hygiene

The user, 2026-10-22, approved for `0.3.0-alpha.1`: a hidden record that shows which edits an agent made, and a cleanup of the temp files, locks, worktrees, and scratch pads of Claude Code, at no token cost and with no large file.

- Gap: Claude Code sends `edited_text_file` when a file that the model read changes outside the model, and an edit result has `userModified` (cc-docs `reference/transcript-format`).
  Both live in memory only, cover only files that the model read, count a `Bash` edit of the agent (`biome format --write`, `sed`) as a change of another person, and give no answer at report time.
- The ledger is in `$.state`, the named values of the session (cc-docs `extend/mod-api/nouns-and-gates`), so it has no file and ends with the session.
  The hash is FNV-1a with 64 bits in plain JavaScript, because the mod runtime has no `node:` or `Bun` API.
- The agent gets a line only when a file of the ledger changed after its last edit, so a session with no outside change pays 0 tokens.
- Cleanup runs in `session.start`, because all `session.end` hooks together get 1.5 seconds.
  A session is live when a file of `~/.claude/sessions/` names its `sessionId`, which Claude Code removes at exit (cc-docs `how-it-works/sessions-and-storage`).
  The age is `cleanupPeriodDays` of Claude Code, so claudetto adds no setting.
  `claude purge` does not clean the scratchpad in the temp folder (same page).
- Measured on the machine of the user, 2026-10-22: `/tmp/claude-501` holds 39,040 entries and 568 MB.
  20,855 of them are `fswatch-probe-*` folders, made from 2026-10-19 to 2026-10-22, each with its `probe` file.
  The settings watcher of Claude Code makes them with `mkdtemp(join(tmpdir, "fswatch-probe-"))` for a probe of at most 1,500 ms, and deletes them in a `finally` block (`claude-code-docs/captures/2.1.307/strings.txt`).
  The cause of the leak is not proven: a process that ends during the probe skips the `finally` block (proposed).
  So cleanup removes a probe folder older than one hour (the user, 2026-10-22), and `research/fswatch-probe-issue.md` is a draft report for the user to post.
- A worktree goes only when its session ended, it is clean, and its branch is merged, by the same rule as the delete gate of D4.
- Choice of task 12.1 (`evidence.md`, "State of a Subagent and Cost of a `git` Hash"):
  `$.state` is one value for the session, so a subagent loop reads the ledger that the main loop wrote, and the reverse.
  The ledger does not snapshot around a `Bash` call, because that costs about 91 ms for each call on a tree of 1,246 changed files.
  A `Bash` edit of the agent shows as a change of "the user or a tool", which the line says.
- Where the ledger lives in code (task 12.2): `classic.PostToolUse` on `Edit` and `Write` writes it, because that event runs only after a call that succeeded and `tool.call` on `Edit` and `Write` has a hook of `ground` already.
  `classic.UserPromptSubmit` reads it and adds the line as `additionalContext`.
  A subagent edit stays in the ledger with the agent type, and its line goes to the main agent at the next prompt.
  A subagent gets no line at its own next turn (open).
- Where the cleanup lives (task 12.3): one `sh` script (`slices/hygiene/domain/cleanup.ts`) that `session.start` runs after it returns, so a test runs the same script on a fake tree.
  A worktree is live when a session file has a `cwd` in it, and it is old when it is older than `cleanupPeriodDays`, because a subagent worktree has no session file of its own (open: the spec has no age rule for a worktree).

## Risks / Trade-Offs

- [A mod hook does not load when the server flag `tengu_plugin_hooks_modules` is off] -> the main agent, the static `deny` rules, and the `Agent(<name>)` denies do not need mods.
- [An undocumented key or env var changes in a later Claude Code] -> each one has a test that pins its effect on a capture, and the changelog names it (A12).
  The 21 levers with no effect in a stub run have a pin on the name in the bundle only, so a later Claude Code that keeps the name and drops the effect passes (`evidence.md`, task 7.2).
- [The tier names for Pro and Max 5x are not seen] -> an unknown tier writes no cap, and setup names the tier.
- [Haiku on `scout` misses sites] -> an eval with 3 runs or more compares `scout` with a Sonnet `scout` before `0.3.0`.
- [No `maxTurns` lets an agent loop] -> the eval counts the turns of each agent, and a limit comes back only for a loop that the eval shows.
- [The user loses auto mode or the sandbox] -> the changelog names both, and the user can set them again.
- [Cutting `advise` and `goal` removes a feature that the user uses] -> the changelog names each cut, and the built-ins cover `goal` and `advise`.
- [Closed: the output style does not apply when the session runs as `claudetto:main`] -> the stub probe `styleagent` shows that the style text and its reminder stay in the request when `agent` is set (`research/probes.md`).
  So the writing rules stay in the style file.

## Open Questions

- Q1: Is the gate of D4 cheaper than a Haiku check for the calls that it cannot read?
  `0.3.0-alpha.1` has no Haiku check, because a parser decides most calls at no cost, and a Haiku check is easy to add later.
  The alpha test logs each `ask` of the gate, with its reason, and the count of prompts in each session.
  The cost of the gate is those prompts, the time of the user for each, and the tokens of each refused call and its retry.
  The cost of a Haiku check is the count of the calls that the gate cannot read, times the tokens of one check request, times the Haiku price, plus its latency.
  A Haiku check goes into `0.3.0-alpha.2` only when it costs less than the gate, and when it allows no call of a labelled set of dangerous calls.
  Answer (task 11.1, 2026-10-22): 6 everyday sessions on Sonnet made 0 gate asks, so the gate cost 0 prompts, and a Haiku check would add cost with no prompt to save.
  5 sessions with risky tasks made 4 asks, one for each dangerous call, and no ask for a safe call.
  `0.3.0-alpha.2` gets no Haiku check.
  The method and the limits are in `evidence.md`, "Gate Asks in the Alpha Sessions".
