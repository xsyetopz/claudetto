# Proposal

## Why

dotclaude 0.29.0 is a major fix release.
0.28.0 shipped faults because its plan did not match the needs of the user.
The user decisions and the issues of the planning session of 2026-10-11 are in `research/issues.md`, and the research is in `external/dossier/` (gitignored).
The rules of the archived 0.28.0 design, such as D35, do not bind 0.29.0.

The faults that the session found:

- Subagents stop at `maxTurns` with no report.
  The report-now note comes with a tool result, which agents treat as data, and a brief that asks for more words wins over the note.
- The `Stop` hook is a prompt hook on Sonnet 5.5.
  It makes one extra request at each turn, and when it blocks, the session and the user get its whole evaluator prompt with a literal `$ARGUMENTS`.
- The Jev hook adds a note to the text of each `AskUserQuestion` question, and the answers of two multi-select questions came back empty.
- The snippet forces `promptCacheTtl: "5m"`, so a subscription loses the 1-hour cache that Claude Code gives it with no key.
- The snippet denies each recursive `rm`, so an agent cannot delete its own temp folders.
- The snippet does not set `outputStyle`, so `/config` does not show `dotclaude:dotclaude`.
- The dotclaude core prompt is 1,922 tokens, against the 804 tokens of the 2.1.296 core prompt that it replaces.
- With the snippet, the `Bash` description is longer than vanilla, and agents often run `grep` through `Bash` in place of `Grep`.
- Agents call tools with a wrong name, such as `bash`.
- `just sandbox --settings` fails with a relative path, the drift note fires on `--settings`, and `just capture` cannot run in the agent sandbox.
- The terminal is slow when it resizes (cause not verified).
- No eval covers the hooks, so the `Stop` and Jev defects reached a release.
  The approval-claim guard and the read guard also block correct work or miss compound commands.
- `setup` applied no settings, the merge dropped values of the user, the status line path breaks at each plugin update, and `setup` picked a model with no question.
- An `Agent` call with no type reaches the denied `general-purpose` agent, so read-only work ran on an agent that can write.
- No session of 2.1.296 has `Grep` or `Glob`, although the prompt and the agent files name them.
- The 0.28.0 wiki was not published, and its tags were moved.
- The workspace has copied code and rule text, shell-only commands, and paths that do not work on Windows.
- The apply session of 2026-10-11 reached 274,644 tokens, near the client block at about 277K, and stopped in the middle of a task.
  Compaction is off, and 0.28.0 cut the context note, so nothing told the session to hand off.
- Sessions asked in plain text and went on, agreed with an objection before a check, wrote files before the go of the user, and deferred checks that they could run themselves (0.28.0, `research/issues.md`).
- The main session of the apply session ran 94 `grep`, `find`, `sed`, and `cat` commands and no `codegraph` command, and 3 of its 26 subagents used `codegraph`.
  The code graph of `dotclaude-codegraph` was there, and the prompt names only `grep`, `find`, and `Read`.

Facts of 2026-10-11 that shape the work:

- With the snippet, a session starts at about 12K tokens, against 18.3K for vanilla 2.1.296 (`-p` captures, `external/dossier/cc-2.1.296/tool-costs.md`).
- Mods load `.ts` files, and Bun 1.4.3 runs `.ts` files with no build step.
  `bun check` passes the TypeScript 7.0.2 conformance suite and needs no `typescript` package (Bun 1.4.3 release notes, 2026-10-10).
- A mod cannot remove a built-in tool, and `permissions.deny` removes a tool.
- A mod tool can show a multi-select picker with `$.ui.ask` (probe 1.10).
- A mod can submit a prompt with `$.prompt.submit` and run a command with `$.command.run` (bundle), and `turn.step` gives the usage of each request.
  Whether `$.command.run` can run `/clear` is not verified.

## What Changes

Foundation:

- **BREAKING** Code is cut before the port: the regex checks on prose (the approval-claim check and the code-span check) and the tests that check wording go, and prompt rules replace them.
- The tool checks that deny or rewrite a call move from classic `PreToolUse` hooks, which start a new process for each call, into the hooks module.
- **BREAKING** dotclaude moves fully from Node.js and pnpm to Bun 1.4.3.
  Bun runs the classic hooks, the status line, the skill scripts, `tools/`, and the tests (`bun test`).
  `bun check` runs the type check, and `bun install` installs the dev dependencies.
  The code uses the Bun API where Bun has one, such as `Bun.file`, `Bun.spawn`, and `Bun.$`, in place of the `node:` module.
  To use dotclaude, a user installs Bun 1.4.3 or later.
- **BREAKING** The code that stays moves from `.mjs` to `.ts`, with types that TypeScript 7.0.2 checks and no build step.
- **BREAKING** The workspace gets a new layout, with one source for each shared part and idiomatic paths and commands on Windows, Linux, and macOS.
  Classic hooks live in folders by event: `<event-type>/<hook-name>.<ext>`.
- A generator makes each text that a plugin ships from one source folder `src/`, which does not ship: prompt sections, agent bodies, the output style, skill files, tool texts, `hooks.json`, settings, the snippet, and wiki tables.
  A test fails when a generated file differs from its source.
- **BREAKING** The dotclaude skills are redone and renamed.
  A `configure` skill replaces `setup`: it sets up the global `~/.claude`, the repository `.claude`, and the outside tools after install, and it writes only after the user confirms a diff.
- Each dotclaude hook gets an eval of its allow path, its block path, the text that the user and the session see, its cost for each turn, and its false-block rate.

Model surface:

- The core prompt is rebuilt from the simple system prompt of Claude Code, with each dotclaude rule kept only when an eval shows its value.
- The built-in tool descriptions are trimmed to their definitions, and the prompt names `grep` and `find` through `Bash`, and `Read`, as the route for search and reads (the pick of the user after the probe).
  When the project has a code graph, a question about code (a symbol, its callers, or the impact of a change) goes to `codegraph` first, and raw reads are the fallback.
- The report-now note comes through a trusted channel, agrees with any brief, and `maxTurns` comes from measured runs.
- The `Stop` hook is fixed, replaced by a command hook, or removed, by its eval.
- A pragmatic suite of dotclaude agents, each with one or two purposes, replaces the built-in agents, with quality first, then savings, then speed.
  It includes a research role that can write notes, and a call with no agent type reaches a dotclaude agent, not a denied built-in.
- The search route of the prompt, the agent tool lists, and the read guard follow the tools that 2.1.296 really gives, which a bundle probe finds.
- The tool names are exact in each prompt and agent body.
- Prompt rules, not regex hooks, cover the turns with the user: a question that blocks the work goes through `AskUserQuestion` and the session stops, a reply to an objection gives the result of a check, a write waits for the go of the user, and a check that the user asks for runs in the same turn.

Tools and settings:

- Each built-in tool of 2.1.296 has a recorded on or off call, from the picks of the user.
  On: plan mode and `LSP`.
  Off: `SendFile`, `SendUserFile`, `Projects`, `DesignTool`, `DesignSync`, `SendFeedback`, `NotebookEdit`, `RemoteTrigger`, `ProposeSkills`, `ProposeGoal`, `PushNotification`, `EndConversation` (deny, then a capture checks it), the `Task*` tools, cron, and `ScheduleWakeup`.
- The Jev tool is deferred, and its `AskUserQuestion` hook keeps the question text and skips multi-select questions.
- A lighter `AskUserQuestion` equivalent is a mod tool with `$.ui.ask`, which returns an empty list when nothing is ticked.
- A notify script on hook events replaces `PushNotification`, and notifications are on.
- The snippet drops `promptCacheTtl`, sets `outputStyle`, lets agents delete their own temp folders, and sets only switches with a traced effect.

Session features:

- **BREAKING** The status line has 3 rows by component: session usage, weekly usage, and context with each `/context` category.
- A handoff replaces compaction: a trimmed Claude Code session JSONL, with a continuation prompt and the OpenSpec state.
- At a context level, the main session hands off, and the work continues after `/clear` (semi-auto, design D27).
  With `mainHandover` at `auto` (the default), the mod clears and submits the continuation prompt, like compaction, if a probe shows that it can.
  With `manual`, the user runs `/clear` and continues.
- After `/clear`, the session gets the active OpenSpec change, its open tasks, and the newest handoff.
- A goal command uses the open tasks of the active OpenSpec change as its stop condition.

Lab and docs:

- The sandbox resolves a relative `--settings` path, the drift check reads `--settings`, and the capture can count a saved request.
- The wiki is rebuilt, with a Claude Code research dossier for each version in prose, where each version page shows its changes against the version before it.

Not in scope, with the reasons in the design:

- A cache keepalive ping.
- A Bun bridge for other mods.
- Subagents as peer sessions (`SendFile`, `SendMessage`, agent teams).
  Each peer session costs a full start of about 12K tokens and shares no prompt cache.

## Capabilities

### New Capabilities

- `generator`: the one source of the shared plugin parts, the generated files, and the test that they match.
- `configure`: the post-install skill for `~/.claude`, the repository `.claude`, and the outside tools, with its confirmed writes and its picker.
- `handoff`: the trimmed session JSONL, its continuation prompt, and its link to OpenSpec.
- `goal`: the goal command that stops on the open tasks of the active OpenSpec change.
- `hook-evals`: the eval that each dotclaude hook passes before a release.
- `notifications`: the notify script on hook events.
- `research-dossier`: the wiki dossier of each Claude Code version and its changes against the version before it.

### Modified Capabilities

- `plugin-layout`: Bun 1.4.3, TypeScript, the workspace layout, hooks by event folder, and the platform rules.
- `commands`: the renamed skills, `configure` in place of `setup`, and the handoff and goal entries.
- `status-line`: three rows by component.
- `context-bound`: the trusted report-now note, the main-session handoff level, and the change note after `/clear`.
- `agent-definitions`: the roster, `maxTurns` from measured runs, the exact tool names, and the rule copies from the generator.
- `model-router`: the model and effort of each role in the new roster.
- `system-prompt`: the core prompt from the simple prompt, exact tool names, and the decisions that belong to the user.
- `prompt-surface`: the trimmed tool descriptions and the new start budget.
- `settings-profile`: `outputStyle`, no `promptCacheTtl`, the temp-folder rule, and traced switches only.
- `vanilla-surface`: the tool inventory with the calls of the user.
- `second-opinion`: the deferred Jev tool and the fixed `AskUserQuestion` hook.
- `eval-suite`: the hook evals and the prompt evals.

## Impact

- The files that the cut keeps in `plugins/`, `tests/`, and `tools/` move to `.ts` and to the new layout, and `research/cut.md` lists the rest.
- `plugins/dotclaude/skills/` and the add-on skills get new names, so a user who calls an old name must use the new one.
- The status line looks different.
- `wiki/` is rebuilt, and `external/dossier/` stays out of the repository.
- `CHANGELOG.md`: entries under `[Unreleased]`, and then `just bump minor`.
- User machines: dotclaude needs Bun 1.4.3 or later on `PATH`, and it does not need Node.js.
- `package.json` (`packageManager`, `engines`), the lockfile, `CLAUDE.md`, and the wiki install page change to Bun.
- User machines: `configure` writes `~/.claude/settings.json` and the repository `.claude` only after the user confirms each diff.
