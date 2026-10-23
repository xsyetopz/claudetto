## Context

The goals are in `prd.md`, the system view is in `architecture.md`, and the behavior is in the delta specs of `specs/`.
The evidence is in `research/`, and the docs checkout `claude-code-docs/docs/` is at 2.1.309 (the user, 2026-10-23).
The user's direction (2026-10-23): this release is large, each lever that helps even a little ships now, and nothing useful waits for a later release.

## Decisions

### D1: One Gate That Settles Each Prompt

`guard` registers two hooks on one list of danger gates (spec `permission-gate`).
`tool.check` with no tool matcher returns `deny` or `ask` when a gate matches, and `allow` when none matches, so `-p` runs, where `PermissionRequest` does not fire (`extend/hooks/input-and-output.md:89`), behave as the interactive ones (`AskUserQuestion` answer, 2026-10-23).
An engine `deny` rule still wins.
No answer carries `updatedPermissions`, so the settings get no rule and the gates see each call (the same answer).
`classic.PermissionRequest` fires when Claude Code would show a prompt (`extend/mod-api/classic-events.md:43`), runs the same gates, and returns `allow` when none matches, so the prompts for `Monitor`, MCP tools, paths outside the project, and shell variables go, in the main agent and in each subagent.
When a gate matches, it returns nothing, so a person sees the prompt, and it never approves an `ask` of claudetto.
The gate drops `ASK_SCRIPT`, `ASK_HIDDEN` (except a delete with an unreadable target), `ASK_DELETE_OUTSIDE`, and the uncommitted-file check of deletes, adds the database and infrastructure gates, and parses the literal text of `eval`, `sh -c`, and `bash -c`.
Jev answers the asks of the delete, `git`, and database gates when it has a key (D4).
Fallback when the hook lab shows that `classic.PermissionRequest` cannot answer: a `PermissionRequest` command hook in the plugin `hooks.json` that calls the same domain.

### D2: Settings Snippet

The snippet becomes the source of each key that the live file of the user holds, so a fresh install matches (`research/levers.md`, "live only" rows).
It drops `Bash(rm -rf /*)`, `Bash(rm -rf ~/*)`, and the `TaskStop` deny, because `Monitor` needs `TaskStop`.
It adds:
- `syncClaudeAiSkills: false`, `syncClaudeAiPlugins: false`, and `ENABLE_CLAUDEAI_MCP_SERVERS=false`.
- `"cc-plugin-you-should-know@builtin": false` under `enabledPlugins`.
- `modelSettings` caps: `maxEffortLevel` `high` for Opus 5.5 and `medium` for Sonnet 5.5, and an `autoCompactWindow` of about 132k for Haiku 5.5, so its compaction starts under its price step (`research/economy.md`).
- Deny rules for the built-in agents `claude`, `claude-code-guide`, and `general-purpose`, `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`, and `disableAgentView: true` (`research/prompts.md`, section 4, and D21).
- `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` with a bound in `kernel/budget.ts`.
- `idleCompaction: false`, so no compaction runs while the user is away, and the handover offer of D12 decides on return (`configure/settings/core.md:41`, binary 2.1.309 `chunk-421e2x6t.js` default `true`, `AskUserQuestion` answer, 2026-10-23).
It keeps `autoCompactWindow` 300k with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (start at 225k), `CLAUDE_CODE_PROMPT_CACHE_TTL` `1h`, an unset `subagentPromptCacheTtl` (5 minutes) until the pair of task 11.7 picks `5m` or `1h` (`AskUserQuestion` answer, 2026-10-23), `CLAUDE_CODE_FORK_SUBAGENT=0`, and `CLAUDE_CODE_DISABLE_FAST_MODE=1` (`research/economy.md`).
No agent gets `maxTurns` (the user, 2026-10-23).
A test matches each `Bash` deny rule with the rule syntax of Claude Code against a list of safe commands.
A hook lab probe checks whether `maxEffortLevel` caps the `effort` of an agent file, and when it does not, a roster test holds the caps.

### D3: Temp Folders in the Kernel

`kernel/tmp.ts` gives `tempDirs(env)`: `$TMPDIR`, `CLAUDE_CODE_TMPDIR`, `/tmp`, and `/private/tmp`, with links resolved.
`guard` and `hygiene` import it.

### D4: Setup Inventory, Modes, and Keys

`claudetto-setup --inventory` reads `~/.claude.json` (the plan keys and the MCP servers of the user and of the project), `~/.claude/settings.json`, and `~/.claude/skills/*/SKILL.md`, and prints JSON with no identity.
`--mode merge` asks the user for each conflict, and `--mode replace` keeps a backup and writes the snippet.
The skill `setup` shows the inventory as a short table, asks merge or replace, offers a `deniedMcpServers` entry in the project settings for each MCP server that the project does not use (such as `apple-docs`), and offers a shell alias `claude-demo` for `IS_DEMO=1 claude` (the user, 2026-10-23: "Shell alias"), because in 2.1.309 `IS_DEMO` also skips the trust, MCP approval, API key, and bypass dialogs, so the plain `claude` keeps them.
`plugin.json` gets `userConfig.TYPESAFE_API_KEY` with `sensitive: true` (`extend/plugins/manifest.md:57-68`), so the key goes to secure storage, and `decide` and `guard` read it from `register(on, options)` or `CLAUDE_PLUGIN_OPTION_TYPESAFE_API_KEY`.
A hook lab probe checks that `options` holds a sensitive value.
Setup sets `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` by plan tier and says when a restart is needed (`research/incidents.md`, row 39, and `AskUserQuestion` answer, 2026-10-23: "Cap by plan tier").
The values, in `slices/setup/limits.ts`: Pro 2, Max 5x 5, Max 20x 8, and the value of the user for an API key or an unknown tier.
Reasons: Pro has the smallest 5-hour limit, and at 6 the sessions of the user on Max 20x hit "Concurrent subagent limit" 14 times (row 39).
Setup sets `statusLine.refreshInterval` to 5 seconds, from 1 (the same session of answers).

### D5: Plan Line

Setup writes the plan as the plugin option `plan`, and the `prompt.context` block turns it into one line, with the branch, the latest tag, the open change, the shell, and the `grep` engine (X5).

### D6: Roster and Delegation

| Agent | Model | Effort | Change |
| --- | --- | --- | --- |
| `scout` | Haiku 5.5 | `low` | none, search only |
| `worker` | Sonnet 5.5 | `medium` | none |
| `reviewer` | Sonnet 5.5 | `medium` | from `high`, the cap of the user |
| `researcher` | Sonnet 5.5 | `medium` | from `low`, and it returns its report as its final message with no `Write`, because the subagent notes of Claude Code forbid report files (`research/prompts.md`, C1) |

The main agent runs Opus 5.5 at `medium` and raises the effort for a hard turn, because an effort change keeps the cache on the 5.5 models (`research/economy.md`).
Each description starts with "Use proactively" and names the moment (`research/failures.md`, failure 5).
`main.md` gets a routing block: `scout` for a search over many files, `worker` for each edit step, in parallel on separate file sets, `reviewer` before a part is reported, with the diff and the plan, and `researcher` for a web question.
The main agent writes the files that `researcher` returns.
Cache: each agent body is static text, the task text comes last, and the tool list of each agent is fixed, so spawns of one type share a cached prefix (`research/economy.md`, cache).
The main agent passes no `model` in an `Agent` call, so the frontmatter applies.

### D7: Text Audit of Each Surface

Each text that claudetto writes, and each text of Claude Code that a supported surface reaches, gets the same behavior in fewer words (the user, 2026-10-23: "can you convey the exact same behaviour using less words? ... Prompt engineering applies to any part of these non-prompt parts, too").
The rules, from the prompt guidance of Anthropic and `external/claude-ai/swe-best-practices.md`:
1. Say what to do, and give the reason in one clause.
   A rule in the form "do not X" becomes the action that replaces X.
2. Keep each behavior of the text that it replaces.
   A table in `research/text-audit.md` lists each behavior line of the default and the line that carries it.
3. One rule for one case, with no conflict between two texts (`research/prompts.md`, section 2).
4. No restatement of a rule that another text in the same request already holds.

The surfaces:
- `agents/main.md`, with a size bound below the default lean body of 5,627 characters (`research/prompts.md`) in `slices/prompt/limits.ts`.
- `output-styles/Concise.md`, without the dead `keep-coding-instructions` line.
- Each agent body and description, and each skill description.
- `tool.describe` for each tool that a session can load, deferred tools such as `SendMessage`, `EnterWorktree`, and `ExitWorktree` too, after a hook lab probe that `tool.describe` fires for a deferred tool.
  The `Bash` text gets shorter than the default, so it applies again (C4), and the `Agent` text carries the warning that an agent report is a claim to check.
- `prompt.attachment` for the plan mode text (C2) and for each reminder that has a shorter form.
- `prompt.compose`, for the subagent notes block, when a test engine probe shows that it is a section.
- Each `prompts.ts` of a slice, the hook messages that Claude reads.
- A `PreCompact` line for the `built-in` compaction path (`research/prompts.md`, rank 9).

The content changes that the research names go in the same pass: the lines of `research/failures.md` (failures 1 to 6) and the fixes of `research/incidents.md` (the 10 fixes), such as "fix each defect that you find, also an older one", "try once, install a missing tool, then give the exact `!` command", "print a file with `Read`", "commit and push when the user gave a standing permission", "keep the text of a task", and the restored `git` rules (C3).
Tests: a lint test fails on a negative-framed rule (`do not`, `never`, `NOT`, `don't`) in a claudetto text that Claude reads (agent bodies, skills, the output style, hook messages, and tool texts), with an allow list for quoted text, and the docs and wiki are out of its scope (`AskUserQuestion` answer, 2026-10-23), and a size test fails when a replacement is longer than the default text of its capture.
Requirement "Run the Free Check": the source is the session of 2026-10-23: Claude wrote "Not verified: that `ctx7` wrote `context7.md`" and proposed a free `ctx7 setup` run instead of running it, and the user called it an issue.
The line at fault was `Concise.md:18`, "Name each claim that you did not verify, with the command that verifies it."

### D8: Finish and Box Hooks

A new slice `finish` holds two hooks with no model call.
- `box`: a `tool.call` hook on `Edit` and `Write` of a `tasks.md`.
  For each box that changes from `- [ ]` to `- [x]`, it needs a passed check of that task in the session record, and it denies with the task id otherwise.
- `stop`: a `Stop` hook that sets a `notes` note when the last reply lists work as not done, not fixed, paused, or for later, with no named block, or says "ready" or "done" while `git status` shows uncommitted changes of the session or a task box has no check.
  The stop passes, and the user decides (`AskUserQuestion` answer, 2026-10-23: "Note only").
The rules match on the shape of a reply, and their tests are fixtures: each known-bad reply of `research/incidents.md` sets a note, and each known-good reply, such as one that names a sandbox deny, sets none (`research/failures.md`, the dossier rule of I15).
The `goal` slice merges into `finish`, because both hold a stop check (`research/trim.md`).

### D9: Notes

The slice `notes` keeps counters in the memory of the mod: denies and asks by rule, failing check commands, and background tasks by age.
A rule that fires sets one note, and the `finish` hooks of D8 set notes too.
The main agent can end its final reply with a `learn:` line, a `tag:`, and an `explain:` block, under the rubric of the built-in mod in fewer words: a note only when the main session cannot cover it and it is relevant and consequential, else `learn: none` (binary 2.1.309 `chunk-82wcyxds.js`).
The `reply` text hides the block, and the slice turns it into the note.
It makes no model call (`AskUserQuestion` answer, 2026-10-23: "Tag line + measure").
The UI copies the built-in mod (the same answer): "<tag> · <line>" at `AbovePrompt` for 2 prompts, one key that puts "Here is a note offered by a side agent:" with the explanation into the prompt box, and one key that turns notes off.
Back-off and dedupe as in the mod: after `n` ignored notes in a row the next `2^(n-3)` checks skip, for `n` of 3 or more, up to 16, and a line that matches one of the last 50 lines is dropped.
No explainer page, because it needs a model call.
A paired run of task 11.7 compares the notes of the tag line with the notes of the built-in fork on the same sessions, and a fork path comes back only for the cases where it finds more useful notes for its cost.

### D10: Sources of a Claim

`ground` takes the messages of the agent that makes the call: the transcript of a subagent, or `$.session.messages()` for the main agent.
It counts an answer of `AskUserQuestion` as a message of the user, and the text of the handoff as a source (`research/incidents.md`, row 41).
It skips the numbers in `#### Scenario:` blocks of `specs/**/spec.md`, in `*.test.*` files, and in fixtures.

### D11: Ledger and Authorship

The ledger is `<tmp>/claudetto/ledger/<project key>.jsonl`, one line per edit, with the path, the hash, the session, and the agent.
After each `Bash` call, the hook adds the changed files of `git status --porcelain -z` whose time of change is after the start of the call.
A `tool.call` hook on `git status` and `git diff` adds context that names each changed file as this session, another session, or the user.

### D12: Handover in Place of Compaction

A handover is a handoff, then `/clear`, then a resume (the user, 2026-10-23: "claudetto's handover is essentially handoff+clear+resume").
The mod writes the handoff file with no model call, queues `/clear` with `$.command.run` (it runs once the session is idle, `extend/mod-api/tool-command-config.md:44`), and sends the handoff as the next user turn with `$.prompt.submit` (`extend/mod-api/turn-prompt.md:29`).
Triggers, each checked at the end of a turn with no running agent or background task:
1. The context passes 150k tokens, below the 225k start of automatic compaction (bound in `slices/handoff/limits.ts`, `AskUserQuestion` answer, 2026-10-23).
2. The session was idle longer than the prompt cache TTL, so the cache is cold.
   At the next `prompt.submit`, a note offers the handover, and it runs only on the yes of the user, with the held prompt after the resume (`AskUserQuestion` answer, 2026-10-23: "Ask on return").
   Triggers 1 and 3 run with no question (the same answer).
The old session stays on disk, and `/resume` opens it (`extend/skills-and-commands/slash-commands.md:39`).
3. The open change moves to its next task group, or the session runs longer than 8 hours, at the end of a turn (the same answer).
Reasons: `/usage` of the user flags "Stop sessions you no longer need · some ran 8 hours or more" and "Start fresh when you switch tasks", and its scan (binary 2.1.309, `chunk-xqcxmr5n.js`, the cases `cron`, `long_context`, and `cache_miss`, which titles "Compact before you step away") counts the cost of sessions that span many hours, of requests with a long context, and of a cold cache after a pause.
A compaction is a model call over about 225k tokens, and a handover is a code-built file of a few thousand tokens.
The automatic compaction of Claude Code stays as the safety net, with no claudetto hook on it, so the stuck label of `research/spinner.md` cannot occur: it comes only from a hook that replaces the compaction.
The path of each case comes from measure, not from this text (the user, 2026-10-23: "can it do same or better for cheaper than the other?").
A table in `slices/handoff/limits.ts` maps each case (trigger and context size) to `handover`, `compact`, or `handoff-then-compact`, and the code picks the path from it.
Its first values are `handover` for each trigger, and the paired runs of task 11.6 set the final values: a path wins a case when it costs less and the next task passes as well or better.
The option `compaction` becomes `auto` (default, the table), `handover`, or `built-in`.
The table also holds the model of the first request step after a handover, set by `next({ ...e, model })` on `TurnStepInput` (`extend/mod-api/types/turn-prompt.md:685`, aliases since 2.1.309).
A fresh context starts cold, so the switch costs no cache.
Its first value is the session model, and the paired runs of task 11.7 set it per case (`AskUserQuestion` answer, 2026-10-23: "Measure, then table").

### D13: Handoff Files

Each handoff goes to `.claudetto/handoffs/`, and the change folder gets no `handoff.md` (the user, 2026-10-23: "claudetto already has handoffs/ files, so what was the point of handoff.md ?").
The handoff text names the open change and its next task, the decisions and ruled-out options of `decide` (X18), the passed checks, and each user-owned value of the session.
Its header treats a box with no passed check as open (`research/failures.md`, failure 3).

### D14: MiniSpec

`new change` maps each `.` to `-` and prints the used name.
The skill `propose` names `epic` for a release with changes of more than one capability.
The commands and artifacts stay equal to upstream OpenSpec, with the presets as the only addition (`research/trim.md`).

### D15: Status Line

`context_window.used_percentage`, `rate_limits.five_hour.used_percentage`, and `rate_limits.seven_day.used_percentage` get a gradient: green below 40%, amber from 40% to 80%, and red above 80%, with dim labels and a dim `resets_at` next to each limit (`AskUserQuestion` answers, 2026-10-23).
The limits show only on Pro and Max (`configure/status-line.md:146`).
The theme code goes, and the slice shrinks (`research/trim.md`).
The status line writes the last `rate_limits` to the temp folder for the eval recipes.

### D16: Trim

- `reply` goes (`AskUserQuestion` answer, 2026-10-23).
- `dry` goes, and the skill `dedupe` calls `jscpd` with the config of the plugin.
- `goal` merges into `finish` (D8).
- `setup` drops `snippet-0.2.0.json` and the 0.1.0 upgrade path.
- `decide` keeps the Jev call and drops its separate CLI path when the mod can call the API directly.
- The unused exports of `research/raw/trim-dead.txt` go, and the exports that only their own file uses lose `export`.
- One model, thin views, in each slice (the user, 2026-10-23: "this applies to claudetto as well", on the shape of D22): each fact of a file is parsed once in `kernel/`, each command builds one object, and one kernel printer writes it as JSON or text.
  Today the `tasks.md` parse is shared (`kernel/change.ts`, imported by `spec`, `handoff`, and `statusline`), and the JSON output is not: `spec`, `setup`, and `dry` each print with their own `JSON.stringify(..., null, 2)`.
  Task 9.3 lists each other parse or output path that two slices hold, and folds it into `kernel/`.
- Least code for the same behavior, in all of claudetto (the user, 2026-10-23: "we meant this part, too"): each task of this change gives the plugin line count before and after (`find plugins/claudetto/slices plugins/claudetto/kernel plugins/claudetto/hooks -name '*.ts' -not -name '*.d.ts' | xargs wc -l`, 8726 lines on 2026-10-23, the scope of the 8761 of `research/trim.md`, because a count of `plugins/` with the generated `.d.ts` files gives 55495).
  A task that adds lines names the behavior that needs them, and a task that keeps a behavior with fewer lines is the preferred form.
  The repository bound of task 9.3 in `tools/limits.ts` makes a test fail when the plugin grows past it.
The target is about 5980 lines of plugin TypeScript (`research/trim.md`, an estimate), and a repository bound in `tools/limits.ts` holds the line count of the plugin.

### D17: Pins

`tools/limits.ts` sets the minimum and tested version to `2.1.309`, and a pin test checks each copy.

### D18: Order of Work

Edits come first, then the free checks (`just check`, `just lab`), then the paid checks in the last group, in one question with the cost and the weekly share (`AskUserQuestion` answer, 2026-10-23: "One ask at the end").
`main.md` gets the same order as a rule.

### D19: Findings of the Dossier

Each finding of `research/external.md` with the verdict `new` keeps its task in group 10.
X3 (`maxTurns`) stays out on purpose.
X26 (an install gate) stays out, because it adds prompts against G1.

### D20: Tools, Servers, and Skills by Choice

The user chose each item on 2026-10-23 (`AskUserQuestion` answers), and setup asks each user the same way: one row for each tool, MCP server, LSP plugin, and skill that a session loads, with its docs text, and the user picks off or on.
Off:
- Tools `NotebookEdit` and `PushNotification`, as bare names in `permissions.deny`, which hides a tool from the model (`configure/permissions/rules.md:34`).
- MCP server `apple-docs` in this project, with `deniedMcpServers` in the project settings.
- Plugin `swift-lsp@claude-plugins-official` in this project, with `enabledPlugins` in the project settings, because the repository has no `.swift` file.
- User skills `find-docs` and `find-skills`, with `skillOverrides` `off` (`extend/skills-and-commands/index.md:81`).
  `claudetto-docs:find-docs` covers `find-docs`.
- The claude.ai skills, with `syncClaudeAiSkills: false` (D2).
- The project skills `.claude/skills/openspec-*` go from the repository.
  claudetto's `propose`, `apply`, `archive`, and `verify` cover four of them, and claudetto gets `explore`, `update`, and `sync` with `disable-model-invocation: true`, so none costs a token at start.
  `sync` calls a new `minispec sync <name>`, which runs the spec merge of `archive` with no move, so the merge is code and no model edits a spec file.
Decided by a test:
- `Glob`: a paired run measures it against `Grep` and `Bash` for finding files by a pattern, and it goes off when they cost less with the same result.
- `EnterWorktree` and `ExitWorktree`: a `just sandbox` run with both denied checks the worktree work of the roster, such as `isolation: "worktree"` of `Agent`, and they go off when nothing fails.
On: each other tool.

OpenSpec goes when `minispec` is there (the user, 2026-10-23: "with minispec, openspec must be uninstalled, and setup will make sure to do so when it finds it").
The inventory finds `@fission-ai/openspec` in the global packages of `bun`, `npm`, `pnpm`, and `yarn`, an `openspec` on `PATH`, and the `openspec-*` skills and `opsx` commands in `~/.claude/` and in the project.
Setup lists each find in its plan of changes, and after the yes of that plan it removes each one with the package manager that owns it, then checks that `openspec` is no longer on `PATH`.
The dev dependency of this repository stays, because the parity tests of `tests/claudetto/spec/parity/` run OpenSpec to keep `minispec` equal to it (D14), and it is not on `PATH`.
Each tool that is on, and is not one of the tools that the roster uses each session, gets its place by use count: a tool that fewer than 10% of the sessions in `research/` use goes behind `ToolSearch` with `tool.describe` `isDeferred: true` (`extend/mod-api/types/tool-command-config.md`, `ToolDescribeResult`).
The bound and the list are in `slices/prompt/limits.ts`, and task 11.5 measures the gain in `/context`.

### D21: Memory Files and Instruction Surfaces

The user chose these on 2026-10-23 (`AskUserQuestion` answers).
Setup manages the global `~/.claude/CLAUDE.md`, `claudeMdExcludes` with a `CLAUDE.local.md` template, the built-in agents, and the claudetto output style.

Output style (the user, 2026-10-23: "Format only, rules to main.md"):
- The docs reserve a style for "the role, tone, and format" of replies, send it with each request, and give it only to the main thread and a fork (`configure/output-styles.md:7-9`, How It Works).
- `Concise.md` keeps only the reply format, and each behavior rule in it, such as line 18, moves to `agents/main.md`, so each rule lives in one text (D7 rule 3).

Global file:
- Setup writes `~/.claude/CLAUDE.md` with the title `# CLAUDE.md`, 20 lines at most (`GLOBAL_CLAUDE_MD_MAX_LINES` in `slices/setup/limits.ts`).
  Today no such file exists, and the only global source is `~/.claude/rules/context7.md` (1315 bytes), so the user could not find where global text came from.
- It holds the personal rules of the user and one origin line that names claudetto setup and how to change the file.
  The rules (the user, 2026-10-23, one line per language):
  ```markdown
  # CLAUDE.md
  <!-- claudetto setup: /claudetto:setup rewrites only this block -->
  This file comes from claudetto setup. Edit each line below the block freely.
  <!-- /claudetto setup -->

  ## Prose
  - One sentence per line, with inline code for each code item.
  - STE (ASD-STE100), with no semicolons.

  ## Toolchains
  - JS/TS: `bun`, `bunx`, ESM only, `#private` fields.
  - Swift 6+: SwiftPM, `swift-format`, SwiftLint.
  - JVM: Gradle.
  - C/C++: `xmake`, Homebrew `clang`, `clangd`, `clang-format`, `clang-tidy`.
  - .NET: `dotnet` CLI, CSharpier.
  - Python 3.14+: `ruff`, `zuban`.
  - Shell: ShellCheck.
  - An existing project keeps its own tools.
  ```
  Only the origin line sits in the block that setup rewrites.
  Setup asks each user for their rules on the first run, writes them below the block once, and leaves them on each later run, so the rules of one user never go into the template of the plugin (a side note, 2026-10-23).
  The last line is the answer "Follow the project".
  `zuban` passes 146 of 146 tests of the typing conformance suite (`python/typing` `conformance/results/results.html` on `main`, 2026-10-23), against `pyrefly` 141, `ty` 139.5, `pyright` 136, and `mypy` 109.5, and the user picked it.
  These lines leave the repository `AGENTS.md`, so an agent that reads only `AGENTS.md`, such as Codex, no longer gets the prose rules in this repository, and the user accepts that (2026-10-23: "it's okay").
- The claudetto lines sit between HTML comments, which Claude Code strips before injection (`configure/memory-and-rules.md:67`), so the markers cost no tokens. Merge keeps each user line outside them.
- The inventory lists each `~/.claude/rules/*.md`, because each one loads in every session, with its owner when a known installer wrote it.
  An owned file stays the owner's: setup never edits, folds, or deletes it, because the next run of the installer writes it again and then two copies repeat.
  Setup offers only the owner's removal command, after the yes of the plan.
  `context7.md` came from a `ctx7` install. A run of `ctx7 setup --claude --cli -y` with `HOME` in a temp folder on 2026-10-23 wrote exactly `.claude/rules/context7.md` and `.claude/skills/find-docs/SKILL.md`, and that `SKILL.md` is equal to the user's (`diff -rq` empty).
  The user's rule has the same path and steps, but its text was rewritten after the install, so the owner test is the path plus the paired skill, not the text, and setup warns that the removal command also deletes those edits.
  `ctx7 setup --cli` is "CLI + Skills mode", and `ctx7 remove --claude --cli` removes it (`ctx7 --help`, `ctx7 remove --help`). Setup offers that command when `claudetto-docs:find-docs` is on, because the plugin skill does the same job.
  `~/.claude/skills/find-skills` is a symlink into `~/.agents/skills/`, so another installer owns it too, and D20 turns it off with `skillOverrides` and leaves the file.
  A rule with no known owner gets the fold or remove offer.
- Rules follow the `external/` survey (`research/memory-files.md`): short lines, each tied to an incident, and no rule that a hook can check, because users report that a file rule is advice and a hook is the lock.

Built-in agents (the user, 2026-10-23: "Off, roster only"):
- The snippet of D2 sets `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`, which takes 324 tokens off each session (`how-it-works/context-budget.md:114`), and denies `general-purpose` next to `claude` and `claude-code-guide`.
- An override file only swaps the text, so it saves nothing, and claudetto ships none.
- The plan mode text says "only use the Explore subagent type" (`prompts/mode-plan.md:170`), so the `prompt.attachment` rewrite of D7 (C2) names `claudetto:scout` there.
- Delegation stays the routing of D6 (the user, 2026-10-23: "Route by task").

Excludes and local notes:
- Setup offers `claudeMdExcludes` globs for the parent and vendor files that the inventory finds, and a `CLAUDE.local.md` template that it adds to `.gitignore`.

Project files (this repository, and the advice that setup gives):
- `AGENTS.md` holds 20 lines at most (`MEMORY_FILE_MAX_LINES` in `tools/limits.ts`), and the overflow goes to `.claude/rules/` with `paths`, so it costs nothing at start.
- `CLAUDE.md` and `AGENTS.md` are 2 plain files with the same blob `1e4bbae` (git mode `100644`), not the symlink that the user set up for Codex, so something wrote over the link.
- The user wants `AGENTS.md` and `AGENTS.local.md` first, then `CLAUDE.md` and `CLAUDE.local.md`. No `instructionFiles` value of `cc-plugin-agents-md@builtin` gives that order, and `AGENTS.local.md` is never read (`configure/memory-and-rules.md:55`, `:70`).
- Two options, and a check decides:
  - A: `CLAUDE.md` is one line `@AGENTS.md`, plus `@AGENTS.local.md` when an import of a missing file loads nothing and shows no error.
  - B: no `CLAUDE.md` in the repository, and the default `claude-md-or-agents-md` reads `AGENTS.md`. This option fails when a `CLAUDE.local.md` exists, and it cannot read `AGENTS.local.md`.
- The check reads the import and loader code with `cc-inspect` on 2.1.309 first (free), then measures both options in one `just sandbox` session with `/context`, after the approval of that paid run. The option that costs fewer tokens and keeps the order wins.

### D22: MiniSpec Coverage with Less Code

The probes of `research/minispec-gaps.md` found 5 cases where `minispec` gives another result than OpenSpec 1.14.3 for the same input, and 24 top-level commands upstream against 5.
The user wants the workflow commands and `schemas` with `schema validate` (`AskUserQuestion` answers, 2026-10-23), with this bound: "less code for same coverage and behaviour? that's what you have to optimize for."
Out of scope: `init`, `update`, `view`, `config`, `store`, `workset`, `context`, `doctor`, `feedback`, `completion`, and `version`.

The shape that needs the least code (proposed):
- One model. Each command builds one plain object, and one `print` writes it as JSON with `--json` or through a text view of a few lines per command. No command has its own output path.
- One merge dry run. `planMerges` runs with no write and gives each delta its result: `merged`, `already in sync`, or the refusal.
  `validate` turns a refusal into the INFO `Archive would refuse this delta: ...`, `archive` writes nothing when each result is `already in sync`, and `show --diff` prints the results. One function covers 3 commands and 2 defects.
- One parser. `markdown.ts` already splits a spec into blocks. `validate --specs` and `show` reuse it, and the duplicate check runs on the block names that `parseDelta` gives.
- `instructions` is a view of the `status` object, with the task list of `countTasks`, so it adds no reads.
- `schemas` lists the preset folders and `openspec/schemas/`, and `schema validate` loads a `schema.yaml` through the same loader as `status`.
- The parity harness of `tests/claudetto/spec/parity/` gets one case for each command and flag, so OpenSpec is the oracle and no expected output is written by hand.
- The `Next:` line of `status` (requirement "Next Step"). the source is the session of 2026-10-23: `openspec status` printed `Next: openspec instructions apply --change "release-0-3-0-alpha-2" --json`, `minispec status` printed JSON with no next step, and the report of `propose` named a task but no command.
- The strict `openspec validate` of this change on 2026-10-23 found 6 issues that `minispec validate --strict` passed: 3 requirements over 500 characters, and 3 MODIFIED blocks that drop scenarios of the current spec, which archive refuses. Task 9.8 adds a parity case for each.

Bound: the slice holds 793 lines of TypeScript today (`find plugins/claudetto/slices/spec -name '*.ts' | xargs wc -l`).
The target is 793 lines or fewer after D22, because the shared model and the dry run remove the separate output and merge paths (proposed, task 9.9 measures it).
When the target fails, the report gives the count, and the user decides.

### D23: npm Packages Where They Fit

claudetto uses a maintained npm package in place of its own code when the package does the same job in fewer lines of claudetto, and when the place of the code can load it (the user, 2026-10-23: "shouldn't be afraid to use external npm packages where fit, instead of re-inventing a solution, but it must adhere to what claude code plugins themselves support").
Today no file in `plugins/` imports an npm package, and no plugin has a `package.json` (`rg` of the bare imports: only `claude-code`, `claude-code/testing`, and `node:` modules).

What a plugin can load, by place:
- CLI adapters in `bin/` and `slices/<s>/adapters/cli.ts`, which run on Bun: an import with a pinned version, such as `import { parse } from "yaml@2.9.1"`, installs itself from the Bun cache with no `node_modules` and no install step (a test in an empty temp folder on 2026-10-23 with Bun 1.4.4 printed `{"a":1}` and left only the script).
  Bun turns this off when a `node_modules` folder is above the file, so in this repository the dev dependencies of `package.json` serve the same import, and a test pins both versions equal.
  The first run needs the network. When the sandbox blocks it, the CLI prints the package and the `!` command that fetches it.
- MCP servers and hook commands: the same Bun rule, or an install into `${CLAUDE_PLUGIN_DATA}`, which survives updates and which Claude Code exports to hooks and MCP servers (`extend/plugins/loading.md:20`, `:35`).
- The hooks module `hooks/register.ts` runs in the mod runtime, which allows no `node:` or `bun:` import (`.claude/rules/hooks-module.md`). The docs do not say whether it resolves a bare npm import. A hook lab probe decides it, and until it passes, no package goes into that import graph.
- A plugin from an npm source never runs install scripts (`extend/plugins/marketplace.md:53`), so no package may need a `postinstall` step.
- Each add-on plugin keeps its own imports, because it works without the core plugin.
- A pinned import fixes only the top package. With no lock file, Bun picks the versions of its dependencies at the first run, so users could run code that no test ran. So a package goes into `plugins/` only when its `package.json` has no `dependencies`. Otherwise it stays out (a side-agent note, 2026-10-23).

Each candidate goes in `research/trim.md` with the claudetto lines that it replaces, the package size, its license, and the place that loads it. A package wins when it removes more lines than it adds and its place can load it.
Built-ins come first: `Bun.YAML`, `Bun.Glob`, and the extension points of Claude Code (`.claude/rules/extension-points.md`) cost no dependency.

### D24: Black Magic with Pins

The user wants the fastest and cheapest code that keeps each behavior, also when it is unusual (2026-10-23: "Black magic coding is encouraged"), and allows undocumented levers with a pin test (`AskUserQuestion` answer: "Undocumented, pinned").
`CLAUDE.md` and `AGENTS.md` carry the rule in place of "Use only documented extension points".
Hard limits that stay: no patch of the Claude Code binary or its npm package (Anthropic's terms), no loss of behavior or outcome, and each test, check, and bound of the repository stays.

Guards:
- Each undocumented lever (env var, settings key, payload field, or timing fact found with `cc-inspect`) gets a pin test against the fixture of `just capture` for 2.1.309 (task 9.4), so an update that drops it fails a test and not a session.
- Each lever goes in `src/wiki/claudetto/rationale/Decisions-Engine.md` with its source (`.claude/rules/engine-facts.md`).
- A lever that changes what the model sees needs the paired eval of group 11 to show no loss.

Where to look (proposed, task 9.11 measures each):
- The hot path: `guard` runs on each tool call. Precomputed tables and one-pass matching in place of repeated regex scans, and module-level caches that live as long as the mod.
- The surfaces of the docs by tag (the user, 2026-10-23: "cc-docs also has undocumented surfaces, and experimental surfaces"): `<Undocumented />` 1742 rows in 93 pages, `<Experimental />` 21 rows in 14 pages, `<Gated />` 372 rows in 42 pages (a feature flag or server gate decides), and `<Differs />` 53 rows in 32 pages (the docs and the program disagree), counted with `rg -c` on 2026-10-23.
  An `<Experimental />` or `<Gated />` lever gets the same pin test, and its test also checks the flag or gate value that it needs, because a gate can change with no update. A `<Differs />` row follows the program, as the row says.
- Token levers: the `<Undocumented />` rows of `../claude-code-docs/docs/how-it-works/context-budget.md` and `prompts/index.md` that remove text, such as `CLAUDE_CODE_DISABLE_ATTACHMENTS` and the reminder modes of `system-prompt.md:193`.
- Cache shape: byte-stable text for each request prefix, so no claudetto text breaks the prompt cache.

## Risks / Trade-Offs

- [`classic.PermissionRequest` may not answer in each mode] -> The hook lab probe of task 2.5 comes first, and D1 names the fallback.
- [The allow-all gate lets an untracked file go with no prompt] -> The answer "Allow" of the user picked this, and the ledger keeps the hash of each file that a session wrote.
- [A note does not make the agent finish] -> The user picked it, and the text audit of D7 carries the finish rules into the prompt.
- [The `stop` hook can flag a correct reply] -> It only sets a note, and its fixtures hold the known-good replies of the research.
- [Shorter texts can lose a behavior] -> `research/text-audit.md` maps each behavior line, and the paired eval of task 11.7 compares the arms.
- [More delegation costs more tokens in total (X16)] -> `scout` runs on Haiku, the agents share cached prefixes, and the eval records the tokens of both arms.
- [A handover can cut a turn that needed the long context] -> It fires only at the end of a turn with no running agent, and the handoff carries the decisions, checks, and user values.
- [`$.command.run` of `/clear` may differ from a typed `/clear`] -> The hook lab probe of task 6.1 checks the order of `/clear` and the resume prompt.
- [Paid runs] -> One question at the end, in group 11.
