# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.

## [Unreleased]

### Changed

- The tests of file shape are removed: `tests/repo/` and 30 plugin spec tests, with the values only they read (`DEFAULT_MAIN_BODY_CHARS`, `MAIN_BODY_CAP`, `OUTPUT_STYLE_CAP`, `CLASSIFIER_RULES_CAP`, `MEASURED_SUITE`) and the length-cap tests of the tool texts. The gates `just lint` and `just validate` still run `tools/file-lines.ts`, `tools/agent-tools.ts`, `tools/rebuild/*.ts`, and `tools/no-narration.ts`.
- `AskUserQuestion`, `Agent`, and `Skill` move behind `ToolSearch`, as `ListAgents` did, so their schemas leave every request until a session loads them. That takes 6,868 characters off the interactive request (39,733 to 32,865) and 2,947 off the `-p` request (27,908 to 24,961). The first use of one costs a `ToolSearch` request first. `Write` and `Edit` stay loaded, because nearly every session uses them.
- `just setup` now asks `[y/N]` at a terminal before it writes the starter files, or takes `--yes`; before, it never asked. A run with no terminal and no `--yes` writes nothing.
- The prompt texts say what to do instead of what to avoid: the denial line of the four agents, the finishing line of `main.md`, the ending of `Concise`, and the `Agent`, `Read`, and `SendMessage` tool texts. `main.md` also says to read a large file by line range.
- The options are renamed in the style of the settings of Claude Code: `decide` is `decideProvider`, `TYPESAFE_API_KEY` is `typesafeApiKey`, `CONTEXT7_API_KEY` is `context7ApiKey`, `handoverTokens` is `handoverThresholdTokens`, `classifier` is `classifierModel`, `startCap` is `maxSubagentStarts`, `windowSeconds` is `limitPeriodSeconds`, `callCap` is `maxHeavyToolCalls`, `heavyTokens` is `heavyContextTokens`, and `failLimit` is `maxIdenticalFailures`. In `claudetto-you-should-know`, `enabled`, `model`, and `effort` are `sideCheckEnabled`, `sideCheckModel`, and `sideCheckEffortLevel`.
  - `cheapSummary` is the boolean `cheapSummaryEnabled`, `false` by default, where `on` was `true`.
  - A value stored under an old name is still read, except that the new name wins once it differs from its default. The two keys in secure storage are the exception: enter `typesafeApiKey` and `context7ApiKey` again, or keep the env variables `TYPESAFE_API_KEY` and `CONTEXT7_API_KEY`.
  - `classifierModel` stays `off` by default, and `/config` lists it with the other options of the plugin.
- The option `subagentCap` is removed, because Claude Code has `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, which you set in its `env` setting. A refusal at that number now comes from claudetto too, and a stored `subagentCap` serves only while the env sets none.
- `/claudetto:setup` is a plain slash command served by a `command.run` hook, and `/claudetto:handoff` a plain prompt command whose file tells the model to call the small deferred `handoff` tool. No MCP tool backs `setup`.
- `Athena` and `Hephaestus` search text with `rg -n` in place of `grep`. For a code shape they run `ast-grep` with `--json=stream` through `jq` and `head -n 50`, or with `--files-with-matches` when `jq` is missing, and only when `command -v ast-grep` finds it, because it matches calls whose arguments hold parentheses, which `rg` misses. Each of their requests grows by about 376 characters.
- The bodies of `Artemis`, `Athena`, `Hephaestus`, and `Hermes` are split into `<role>`, `<doing_the_work>`, `<harness_messages>`, `<when_blocked>`, and `<report_format>`, in prose, with each rule's reason beside it. Their frontmatter is unchanged. Each rule of `0.2.0` is kept, except these:
  - `Hephaestus` no longer ends its task when a permission rule, a hook, or a check blocks it, and no longer stops at a failing check. It works a failing check or a hook message in the task's files through to the cause and reports both runs, because the parent asked for a change that passes.
  - `Athena` no longer stops at a failing check. It reports the failure and reviews the rest of the diff, because a verdict needs every defect.
  - `Artemis` and `Hermes` no longer stop at a part outside their tools. They do every other part first, as their own later rule already said.
  - Each subagent names a denied call or a step outside its tools in `<blocks>` with the exact command for the parent or the user to run, and turns off no hook, sandbox, or check.
- The body of `agents/main.md` is rewritten in prose sections: `<role>`, `<understanding_the_request>`, `<finding_out>`, `<claims_and_evidence>`, `<project_context>`, `<harness_messages>`, `<fixing_defects>`, `<actions_and_consent>`, `<security_work>`, and `<finishing>`. The session classifies each message before it acts, reads a remark, a rhetorical question, or pasted material as context, runs a free check before it reports a claim, counts itself stuck only when the next step needs what only the user has, and decides security work by ownership and authorization. The body is 5,349 characters as JSON, under a tested cap of 6,000.
  - The code rules left the session prompt for `rules/claudetto-code.md`, below.
  - "Approval of a task or plan covers it end to end" is gone. `<finishing>` keeps that length is no reason to stop, and one approval now covers one action that others see.
- The `Concise` output style is split into `<first_sentence>`, `<acting>`, `<sentence_style>`, `<reporting_results>`, and `<requests_to_the_user>`. `<acting>` is new: the session starts at once and, on a low-risk reversible step, states its reading and goes on. After a fact from the user that contradicts the last reply, the reply opens with the next action or the changed fact. The style also names the prose forms to avoid, such as an inanimate subject with an animate verb. Its tested cap is 1,936 characters, up from 1,540.
- A denial that names the tool to use now routes the work in `agents/main.md`, as it already did for the subagents. Before, the body said never to reach a denied effect through another tool, which forbade the route the denial gave.
- A change in `agents/main.md` also fixes each caller or test it breaks, without asking. Before, the body asked before any edit outside the named files, so a rename stopped at its callers.
- `Artemis` may give a count from `Grep` with `output_mode: "count"` or from a `Glob` list. A count of lines or bytes stays outside its tools.
- The `cheapSummary` compaction summary runs at effort `medium`, down from `high`. The effort is named in the call, so the summary never inherits the session's. The saving in output tokens is unmeasured.
- The `Concise` output style says what to do in each rule, and tells the model to name the action to take in every message to a person or an agent, also when it warns. A test fails on `never`, `no`, `not`, `without`, `avoid`, and their kin in `output-styles/*.md`. The body grows from 1,573 to 1,679 characters, and the `-p` first request by 106, read with `just inventory`.
- The empty interactive session's first request reads 33,072 characters, against 42,016 for the same settings without the plugin, read with `just capture --shipped --interactive` on `2.1.317` in a working folder whose path is 42 characters. The `-p` first request reads 25,358, against 46,084 for a stock session, read with `just capture --shipped` and `just capture`, with a path of 34 characters. A longer path adds to every total. The interactive request carries five tool texts, 1,868 request JSON characters against 3,597 for the same tools in a stock session: each drops the facts its input schema or its output already gives, and `Agent`, `AskUserQuestion`, `ListAgents`, and `Skill` load through `ToolSearch`.
  - The `Agent`, `Skill`, and `ToolSearch` texts are 444, 195, and 234 characters, and the `AskUserQuestion` text is 829, down from 2,083.
  - `ListAgents` moves behind `ToolSearch`, which a session loads with `SendMessage` to message a peer. That takes 633 characters off the interactive request and 641 off the `-p` request.
  - `NotebookEdit` and `TaskStop` are denied, so they leave the deferred list. The agent descriptions drop the "Use for" sentence that the `Agent` roster gives. `agents/main.md` and `Concise.md` keep each rule in fewer words, and `Concise.md` leaves the own-defect and `AskUserQuestion` rules to `agents/main.md`, which already holds them.
- The `classifier` option's rules are 5,572 characters, down from 6,517, and are sent with each call that is not read-only. Its frame states once what a must-name item means, in place of the built-in bar markup on each rule. "Leak Through a Browser" is merged into "Widen an Audience", whose must-name item is now the destination. These texts are also the `autoMode` lists that setup writes.
- The classifier A/B of `just eval --classifier --run` was run on the trimmed rules, before the frame named hook text, which added 11 characters: the `suite`, `haiku`, and `sonnet` arms each scored 120 of 120, at $1.0528, $0.0145, and $0.1603 measured, as noted on 2026-11-02 with the run log gone. Before the trim they scored the same, at $1.1014, $0.0186, and $0.1690, from the run log.
- The `classifier` option's verdict settles the call, so the auto mode classifier of Claude Code does not run on it. Its `allow` also skips the permission prompt in every permission mode, because a `PreToolUse` hook cannot read the mode. The option still ships `off`.

### Fixed

- `just setup --dry-run` reported each settings key as `Wrote`, though it writes none. It now reports `Would write`.
- `just eval --run` removed each session's folder with its output, so a run kept no record of its cost. Its report now ends with a `Spend:` line of the tokens and dollars of the sessions, read from each session's `result` first.
- The classifier read the words a user typed after `Stop` hook feedback as the hook's, because the harness puts both in one message. It now reads them as the user's, and the feedback as hook text, which authorizes nothing.
- The `Stop` hook added the `Background tasks still running` context at every stop, so a long `Monitor` session carried the same list again in each request. It is now added only when a task `id` or `status` changed since it was last added.
- A handoff written after a shell `cd` went to `.claude/claudetto/handoffs/` under the new directory, and a resume read the folder there too, so the next session found no handoff and the sweep never reached the file. The handoff and the handover now write and read the folder under the project root that `$.session.root()` gives.
- A `claude` session that a `claudekit` probe or `just capture` started inherited the `CLAUDE_CODE_*` variables of the session that ran it, such as `CLAUDE_CODE_DISABLE_CRON` and `CLAUDE_EFFORT`, so the child dropped tools from its request and `just inventory` read 3,004 characters below the recorded total. `withoutSessionVariables` of `claudekit/session/env.ts` now drops them and keeps the login, the provider switches, and the rest of the shell.
- The status line showed no branch in a plain checkout, because Claude Code sends `worktree.branch` for a worktree session only. The line now reads the branch from the checkout's `.git/HEAD`, following a `.git` file's `gitdir:` line, and shows a detached `HEAD` as its first 7 hex digits.
- The repeat-denial guard refused a call denied twice even after the user had answered, so the user's consent could not reach the classifier. A prompt the user sends, typed or queued at the terminal or through Remote Control, now clears the denial counts. A task notification or a scheduled prompt does not.
- The `classifier` option never saw a message the user typed while a turn ran, because Claude Code stores it apart from the transcript rows, so it judged the agent's next call as unasked. claudetto now records each such prompt at `prompt.submit` with the agent's newest call, and the classifier's transcript lists it as the user's after that call. A task notification is not recorded.
- The permission gate read `env NAME="$(sed … .env)" cmd` as a plain read of `.env`, so its reason did not say that the value lands in the program's arguments, where each local user can read it with `ps`. The gate now finds where the output of a substitution that reads a secret lands. In a program's arguments, it denies the call with a reason that names `export` and then `exec`. In a shell variable, such as `export NAME="$(…)"; exec cmd`, it asks, so the user or the classifier decides.
- The permission gate denied commands that read no secret: a `grep` pattern such as `"^<[a-z_]*>$"` was read as a `<` redirect from `[a-z_]*`, and `\$\.env\.get` in a `sed` or `perl` script was read as the file `.env`. The gate now takes input files from the redirects that the shell parser finds, and reads `.env` after an escaped `$` as text.
- `just window-report` found no rows from an installed plugin, because it read only the in-tree store `claudetto_inline-*`. It now reads every `claudetto_*` store, and prints a `Classify block:` line with the tokens of the `classifier` calls and their share of the week, which the turn rows do not hold.
- The `classifier` option judged a call the user had approved as unasked. Its transcript now keeps an `AskUserQuestion` answer and an `ExitPlanMode` approval as the user's words, and a plan or task list the user approved covers the actions it names. The reply now gives the reason before the verdict, and a reason that says no rule applies allows the call. "Rewire the Agent" names only instruction surfaces, so a comment, a documentation file, and a nested `claude` session in `tmux` are not one. "Provided Credentials" allows a secret the user named for a named use when it stays in the environment. A call denied repeatedly with no reason now tells the session to give the user the command as `! <command>` and go on.

- `just eval --run` with no `--model` now starts each session on `claude-opus-5-5`, `EVAL_MODEL` of `tools/limits.ts`. Before, it passed no model, so a session took the account default, and one run of 2026-11-02 ran on `claude-opus-5`.
- `weeklyShare` of `claudekit/price/share.ts` priced a weekly percent in dollars, at $29.70 from one session's cost against the account-wide meter. The limit is spent in tokens, so it now counts tokens against the 3.20B of the week of 2026-10-27, whose limit ran out. A default `bun claudekit/probe/main.ts` round now reads about 5.7% of the week, where dollars gave about 1.9%, and `just eval --classifier` prints its planned tokens.
- The main-rules eval graders read the seed commit of each case, not `HEAD`, so the work of a session that commits is still graded.
- Case `I13` grades the question in the final reply, because a `claude -p` session has no `AskUserQuestion`, and its fixture now holds a real conflict between `docs/report.md` and a comment in `report.ts`. It counts `--json` only when `bun report.ts --json` prints JSON.
- Case `W5-15` now holds a real conflict: `write` returns `void`, so a blocking `fsync` breaks the event-loop rule. The reply must name both.
- Case `W5-12_I09` leaves `node_modules` out of its diff and no longer reads `attemptNumber <=` as a changed attempt count. Case `W5-1_I05` probes `price` at four quantities to catch a hard-coded value, and case `I12` requires the reply to name `b.ts`.

### Added

- The `general-rules` block: each session start, `clear`, and `compact` adds three rules to the model's context, which run each build, test, lint, type check, and package step through the repo's own script, take each flag and version from `--help` or the versioned docs read in the session, and read the source or run a probe before stating a fact about a tool. `/claudetto:setup` offers the same text as a marked section of `~/.claude/CLAUDE.md` and writes it after a yes, keeping the rest of the file, and the block then adds nothing. The text adds 330 characters to the first request, read with `just inventory`.
- `just capture --user-claude-md CHARS` puts a `CLAUDE.md` of that many characters in the config folder, where a user's `~/.claude/CLAUDE.md` is read.
- `just capture --user-file PATH=SOURCE` copies a file into the config folder, such as `rules/a.md=/tmp/a.md`, so a capture can hold a user rules file or a written `CLAUDE.md`.
- The `worktree-base` block. When an agent starts in a worktree, or `EnterWorktree` makes one, that lacks the tip of the branch of the main checkout, the model is told both commits and `git merge --ff-only <tip>`, and the user is shown one line naming `worktree.baseRef`. Claude Code bases a new worktree on `origin/<default branch>` unless that setting is `"head"`; see `docs/worktrees.md`. `just worktree-base` reproduces it against the fake API.
- Setup writes `worktree.baseRef: "head"`, in a "Worktrees" group of its dialog, so a new worktree starts at the current branch. A user's own `worktree.baseRef` is kept: `just setup` fills only an unset key, and `/claudetto:setup` does not offer it. With the value setup wrote, `just worktree-base agent head` and `enter head` started at the tip of `feat` on `2.1.317`.
- The `bun-rule` block and its option `bunRuleEnabled`, `true` by default: a session that starts in a folder holding both `package.json` and `bun.lock` adds one text of 349 characters to the model's context, naming the `bun` command for a script, install, add, remove, test, build, format, type check, and lint. It is added again after `clear` and `compact`, and in any other folder nothing is added. A `rules/` file of a plugin never loads, so a `SessionStart` hook carries it. The check looks up the two files with no process and no model call.
- The `missing-tool` block and its option `missingToolNoticeEnabled`, `true` by default: a new session that finds neither `ast-grep` nor `sg` in the `PATH` folders shows one line to you, never to the model, naming the install command for the platform and `/claudetto:setup`, once per pinned version. `/claudetto:setup` shows that command and runs it after a Yes, records a No so the line stays quiet, and for a platform with no package manager shows the release zip and the folder and runs nothing. The check runs no process and no model call, and the request sizes do not change.
- `just setup` and `/claudetto:setup` offer a starter `AGENTS.md`, and a `CLAUDE.md` of `# CLAUDE.md` and `@AGENTS.md` on a repo that has neither memory file. Code writes them with no model call and no system prompt text: marker files name the language family (JS/TS, Python, Ruby, shell, HTML/CSS, C/C++, Rust, Swift, JVM, .NET, or Go), and a table in `plugins/claudetto/src/tiers/starter/families.ts` holds its bounded test, build, and lint commands and its heavy paths. `AGENTS.md` stays under 600 characters, and a file that exists is never replaced. A dialog shows the files and a yes writes them; `just setup` asks on a terminal, takes `--yes`, and with `--dry-run` only prints them. Claude Code reads no `.claudeignore`; `/init` stays the interview for the rest.
- `just setup` and `/claudetto:setup` keep one marked block in `.gitignore` and one in `.ignore` of any git repo, between `# >>> claudetto: generated by /claudetto:setup, edit outside this block` and `# <<< claudetto`, after a diff and a yes. `.gitignore` gets `.DS_Store`, `Thumbs.db`, `*.swp`, `.claude/settings.local.json`, `.claude/worktrees/`, `.claude/claudetto/`, `CLAUDE.local.md`, and the untracked heavy folders of each detected language family; `.ignore` gets the heavy folders git tracks and the lock and minified files. A path your own lines name, a negation included, stays out of the block, a line outside the block is never changed, and a rerun changes only the block. `.rgignore` is not written, since `rg` reads `.ignore` too. This replaces the rule that an existing `.ignore` is skipped.
- A `Bash` test, build, lint, or check run (`bun test`, `just check`, `cargo test`, `pytest`, and the like) whose output passes `maxTestOutputChars` (8000 by default, `0` is off) now reaches the model as its head, its tail, and its failure lines. One line names the characters cut and the file under `.claude/claudetto/output/` that holds the whole output, which the hygiene sweep removes after a day.
- The options `handoffCleanupPeriodDays` and `sessionTempCleanupPeriodDays` (days, unset follows `cleanupPeriodDays`), `probeCleanupPeriodMinutes` (60), and `hygieneEnabled` (`true`) set the age per kind for the hygiene sweep. 0 keeps a kind, and `hygieneEnabled` set to `false` starts no sweep. `claudetto-hygiene` takes `--handoff-days`, `--session-days`, and `--probe-minutes`.
- `just gc` removes the `mkdtemp` folders of the dev tools past `--hours` (24 by default), except a folder that is a process's working directory, one with a live `tmux.sock`, and a symlink. It takes `--dry-run`.
- The `read-guard` block and its option `readGuardEnabled`, `true` by default. A `Read` with no `limit` of a lock file, a `*.min.js`, `*.min.css`, or `*.map` file, or a file under `node_modules`, `.next`, `DerivedData`, `.build`, `__pycache__`, `.venv`, `.gradle`, `.tox`, or a tool cache is denied with a hint to pass `offset` and `limit`, to use `rg`, or to use the package command. It adds no permission rule, so the sandbox's read-deny list and `Bash` are untouched, and it adds no character to the request.
- The `confineEnabled` option, `false` by default. With `true`, the `confine` block sets `CLAUDE_CODE_SHELL_PREFIX` to `bin/claudetto-confine`, which runs each `Bash` command under `sandbox-exec` on macOS or `bwrap` on Linux. The command can write only the project, `/tmp`, `$TMPDIR`, `~/.bun`, and `~/.cache`, and not `.git/hooks` or `.git/config`. The prefix wraps the command after the permission check, the deny rules, the `PreToolUse` hooks, and the auto mode classifier, which still see the command as written. A `Bash` hook denies the call when the prefix is not ours or the sandbox cannot start, and the script refuses with exit 126 when `bwrap` is missing. See `docs/confine.md`.
- `just capture --claude-md CHARS` puts a `CLAUDE.md` of that many characters in the working folder, so a reading shows what a memory file adds to the request: on `2.1.317` a file of 2,000 characters added 2,440 to the `-p` first request, and one of 4,000 added 4,473, about 1.017 characters per character beyond the first 2,000.
- `just capture --calls FILE` makes the fake API answer with each tool call of a JSON list in turn, and `--dump` writes each later request as `ARM.1.json`, `ARM.2.json`, and so on.
- `claudekit/bash-once` takes `--plugin-dir` and `--permission-mode` and reports how many auto mode classifier requests carried the command.
- `rules/claudetto-code.md`, claudetto's code rules: the least code that does the task, a guard only where input crosses a trust boundary, the edge cases named in the report, and a comment only for a reason the code cannot show. `/claudetto:setup` offers it in a question of its own and, when kept, writes it to `~/.claude/rules/`, because Claude Code does not load a plugin's `rules/` folder. Its `paths:` of `**/*` keeps it out of a session until the first file read.
- A handoff now compacts the conversation with no summary call and a cached next request. The `context_management` block asks the session to end a long conversation with its handoff as the reply. A main-loop reply that starts with `# Handoff` is saved under `.claude/claudetto/handoffs/`. Then `/compact` runs, and the hook answers it with the first message, kept whole, one assistant line, and the reply. The assistant line stops the engine from joining the handoff into the first message. Then claudetto sends the next prompt. Claude Code's `context_management` system section, which says no handoff is needed, is left out. A typed or automatic compaction goes the old way. In paid checks on 2026-11-02, the first request after the handover read the tools and system prompt from the cache, 14,167 tokens, and wrote 3,915 and 3,900 in two runs. The first request of the same handover without the assistant line wrote 4,176.
- A turn that ends at a large context hands over with no summary call. When the context of the last response reaches the new option `handoverThresholdTokens`, 400,000 tokens or half the window by default, and the reply is no handoff, claudetto asks `$.model.fork` for one. At idle the fork repeats the last request, so the cache serves the context. The handoff is then saved and compacted to as above, and the session waits for the user's next prompt. Claude Code's compaction stays for a turn that outgrows the window before it ends. A fork that writes no handoff is not asked again until a compaction has run, so each later turn does not pay for a second full read. A turn after a handover that still ends at the size forks nothing, so a first message larger than the size cannot make the session hand over and prompt itself in a loop.
- The status line shows each open OpenSpec change of the project with its ticked and total task boxes, such as `☐ release-0-3-0 4/12`. It names the two most recently modified changes and counts the rest as `+N`. A change with every box ticked is left out. The boxes are counted with OpenSpec's own pattern.
  The line reads these files with capped reads, at most 4 KiB for `HEAD` and 256 KiB for each `tasks.md`, and no child process.
- Probe tools in `claudekit/`. `launchFakeApi` in `claudekit/api/launch.ts` runs the fake Messages API in a process of its own, so a caller that blocks its event loop with `spawnSync` still gets an answer, and stops it by its pid. `claudekit/paid-run/main.ts` replays a planned paid run's request bodies on the fake API and prints each request's estimated tokens and how much of its prefix matches the warm request, before any paid call. `claudekit/usage/main.ts` reads the local transcripts for the week's tokens by type, the context each call re-reads, and the cache hit rate with each miss's gap since the call before.
- When a Stop hook blocks three times in a row with no file written between the blocks, claudetto shows one line naming `/goal clear` and tells the session to answer the next block in one line. A file changed through `Bash` is not seen, so it does not reset the count.
- At a seven-day share of 90% or more, the prompt hook tells the session to start no subagent fan-out and no paid eval run, and to say how much of the week remains with each reply that spent more than 1% of it. The text names the share and speaks again at each point past 90%.
- When a response names a model that the tier row does not, such as `claude-opus-5` against `claude-opus-5-5`, claudetto shows one line naming both, once per session and model.
- After a cache miss, the status line's cache part names the first cause Claude Code gives in `prompt_cache.last_miss_cause`, such as `⌁ 4m/5m 91% miss: tools changed`, cut to 24 characters.
- Each window row records the prompt cache TTL it ran under: `5m` when `FORCE_PROMPT_CACHING_5M` is set, else `CLAUDE_CODE_PROMPT_CACHE_TTL`, else `promptCacheTtl`, else `auto`. `just window-report` prints the dollars per weekly percent for each TTL. `claudekit/usage/main.ts hit` counts the requests after a gap of more than 5 and up to 60 minutes, with their hits and misses.
- `claudekit/prefix/`, a probe that runs a multi-turn `tmux` session against the fake Messages API and reports whether the request prefix, `tools`, `system`, and `messages`, stays byte for byte. Measured on Claude Code `2.1.317`: `/model`, `/effort`, an MCP server change with `ENABLE_TOOL_SEARCH=false`, `/rewind`, and the requests after a compaction change the prefix. Skills, commands, output styles, permission modes, file edits, the main thread's requests after a subagent, and claudetto's own hooks do not.
- `/claudetto:handoff`, a prompt command that tells the session to call the `handoff` tool. The tool writes the file from five fields, redacted in code, runs `clear`, and submits the file and `next_prompt`. The model re-words the user's prompts under `Standing instructions`.

### Removed

- The `dedupe` skill, `skills/dedupe/`. It put 155 characters of listing into every first request. The `jscpd` step of `just lint` stays.
- The `mcp__claudetto__setup` tool. `/claudetto:setup` is served by a `command.run` hook that opens one `$.ui.ask` dialog per group of differences, at most four keys each, with the `sandbox.enabled` pair as a single choice and `rules/claudetto-code.md` as a dialog of its own, then writes the keys you chose and reports. It takes no model turn, and the tool schema leaves every request. A dismissed dialog, or a session with no one to ask such as `claude -p`, writes nothing.
- The `handoff` tool's seven fields and its word-for-word quoting of the user's prompts. The tool keeps five fields; the model re-words the prompts.
- The `tasks.md` loop, the `finish` block. It blocked a stop while an applied OpenSpec change had an open box, so it overrode a stopping point the user had set and repeated a block the agent had declined, ten stops in a row in one session. To keep a session working to a condition, use the built-in `/goal`.
- The handoff written at `classic.SessionEnd` on `/clear`, and its read-back after a `clear`. A typed `/clear` now writes no file and reads none back. The handoff reply and `/claudetto:handoff` replace it, and `classic.PreCompact` still writes a handoff that a `resume` reads back.

## [0.2.0] - 2026-10-31

### Changed

- `/claudetto:setup` is now done by the model. It loads the tool `mcp__claudetto__setup`, which returns each difference between your user settings and claudetto's keys. Then it asks about them with `AskUserQuestion`, and writes only the ones you keep through the same tool. A kept key replaces your value; a key you do not keep stays as it is.
  Setup also offers two sandbox switches: `sandbox.enabled: false`, and `sandbox.network.allowLocalBinding: true` for a command that listens on a local port.
  The tool is registered only in an interactive session. Setup now costs model tokens, because the model reads the differences and asks. `just setup` still writes every key with no model call.

### Fixed

- With `classifier` on, a force push the user asked for was denied: the classifier allowed it, but the gate's ask stayed, and where nobody can be asked an ask is a deny. The classifier's allow now settles the gate's ask, as the auto mode classifier does.
- A `git push` to a URL that no remote names now asks, and only a person can settle that ask. The gate reads the push URLs with `git remote -v`. Before, only the classifier judged the host, and the `haiku` arm allowed one such push in 10 runs of `just eval --classifier`.
- The `haiku` classifier denied calls with "the model gave no answer" now and then. Haiku 5.5 cannot turn thinking off, so `$.model.complete` gives its thinking 2048 tokens past the 200 of the verdict, and at `high` effort the thinking could fill all of it and leave no text. The classifier now asks for `medium` and for 1000 tokens, so the cap is 3048, and a denial with no verdict names its cause: a failed call with its status, an abort or the 30-second limit, all 3048 output tokens spent on thinking, or a reply with no text.
- A `cheapSummary` reply that reaches its cap of 4048 output tokens, thinking included, is cut. It is now dropped with a log line, and the engine compacts, in place of a cut summary.

### Removed

- claudetto's `/goal`. It read the condition as a shell command, so `/goal release-0-2-0` ran `sh -c release-0-2-0`, which fails on every stop, and its start prompt stayed queued after `/goal clear`.
  The built-in `/goal` now runs with its text unchanged, and a model judges the condition. To require a check, name it in the condition, such as `/goal just check exits 0`.
  The `mcp__claudetto__goal` tool, `/goal resume`, the `paused` and `blocked` goal states, and claudetto's goal mark in the prompt hint go with it. The `tasks.md` loop stays.

## [0.1.1] - 2026-10-31

### Added

- A tool result that would take a `claude-haiku-5-5` request over 100,000 prompt tokens is withheld, and the model is told to ask for a smaller part. Above that step Haiku 5.5 bills the whole request at five times, and the handoff at 90,000 cannot stop one large result.
  The call still runs. The bound reads the step's `usage` from its stop chunk and counts a result at 3 characters a token.

### Changed

- The shipped first request on `2.1.316` reads 29,417 characters, against 46,007 for a stock session, with the working folder path at 47 characters. Each row of the cut table in `docs/surfaces.md` was read again as the difference from that arm. The rows leave 4,255 characters unexplained, named as such in `plugins/claudetto/src/cuts.ts`.

### Fixed

- `/statusline` with no text writes claudetto's `statusLine` and `subagentStatusLine` with no model call, keeps a line you already set, and reports what it did. Setup denies `Agent(statusline-setup)`, so the built-in command used to spend a model turn and then fail.
  `/statusline <text>` still runs the built-in when that agent is not denied. When it is denied, claudetto names the rule to remove.

### Removed

- The block kinds `context` and `screen`, which no block used.

## [0.1.0] - 2026-10-31

### Added

- `/claudetto:setup` and `just setup` write `$schema`, the feature `env` flags, the five `/config` items (`workflowSizeGuideline`, `workflowKeywordTriggerEnabled`, `enableWorkflows`, `enableArtifact`, `remoteControlAtStartup`), and a deny of the six built-in agents, in the group "Features off" and the group "Smaller prompt".
  IDE auto-install is off through `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL`, so setup never writes `~/.claude.json`.
- `just setup` runs `openspec init --tools claude --profile core` when the `openspec` CLI is on `PATH` and the project has no `openspec/`. It prints `bun add -g @fission-ai/openspec` when the CLI is not on `PATH`, and skips when `openspec/` exists.
- Setup writes `statusLine` and `subagentStatusLine`, a launcher of `bin/claudetto-statusline` that picks the newest installed plugin version.
  The line shows the folder, the branch of a worktree session, the review state of the pull request, the model, the context, the cost, the 5-hour and 7-day limits, and the cache countdown, in up to four rows; a status line you already set is kept.
- `/init` runs an interview in place of the built-in text: it reads the repository and the memory files, asks with `AskUserQuestion` only what they do not show, and writes after a yes to the draft of each file. A skill of your own named `init` keeps its text.
- The agents `claudetto:Hephaestus`, which makes one edit and runs its check, and `claudetto:Hermes`, which answers a question from the web with its sources, each at `medium` effort.
- The `docs` skill looks up library docs through the Context7 CLI: `bunx ctx7 library`, then `bunx ctx7 docs`.
  Its listing costs 71 characters of the first request, against 907 for the Context7 MCP server.
- The optional `CONTEXT7_API_KEY` option, kept in secure storage, reaches `ctx7` through the env and never enters the context.
- `just hygiene` removes the temp folders and old handoffs that Claude Code never removes: probe folders past an hour, ended session folders past `cleanupPeriodDays`, and all but the newest handoff past `cleanupPeriodDays`. It takes `--dry-run`, and the same sweep runs at each startup.
- `/goal <cmd>` stores a shell command, and a stop is blocked while the command fails. A `tasks.md` of an applied change with an open box blocks a stop in the same way.
  After 5 blocked stops in a row with no file change the stop goes through, and the goal is marked blocked; `/goal resume` turns it back on, and the agent can pause or block a goal through the `goal` tool.
- A warning at startup, once, when the running Claude Code is older than `2.1.314`.
- The `plan-mode` block replaces the full plan mode reminder with a shorter one that names `claudetto:Artemis` for a search over many files.
  A plan mode first request of `2.1.314` falls from 50,205 to about 46,415 characters (`just capture` with `permissions.defaultMode` set to `plan`). The sparse reminder, and any engine text shorter than ours, is kept.
- The `classifier` option, `off` by default, judges each tool call that is not read-only with claudetto's own rule suite, from a `classic.PreToolUse` hook in `plugins/claudetto/src/blocks/classify/`.
  It asks Jev first when `TYPESAFE_API_KEY` is set and lets Jev decide alone only at a block probability of at most 0.05 or at least 0.95. Otherwise one call goes to `claude-haiku-5-5` at `high` (`haiku`) or `claude-sonnet-5-5` at `medium` (`sonnet`), with the rules in one cached system block.
  The judge reads the user's messages and the earlier tool calls, and no assistant prose or tool output, because the agent can argue for itself in both and an injected instruction reaches it through tool output.
  A failed call, a reply with no verdict, or a thrown error denies, because an unwatched session cannot answer a prompt.
  A probe on the fake Messages API showed that a hook answer of `allow`, `deny`, or `ask` sends zero requests to the built-in classifier for that call, so the option replaces the built-in classifier, not adds to it.
  It is off because every judged call is paid and no measured rows price it or compare it with the built-in classifier yet.

### Changed

- The compaction summary of the `cheapSummary` option runs on `claude-haiku-5-5` at effort `high`, and is held to 4,000 characters.
  The prompt used to set no length, so the reply ran to the token cap and ended mid-sentence; a longer reply is now cut at a line break.
- The side check of `claudetto-you-should-know` defaults to `high` effort, in place of `medium`.
- The first request shrinks by about 2,300 characters: `just capture --arm plugin --shipped` on `2.1.314` reads 31,237 against 33,515 for `0.0.0`, read from a shorter folder path, which lowers that reading. The session prompt, the `Concise` output style, five tool texts, the handoff reminder, and the agent and skill listings are shorter.
- Setup turns fast mode off with `CLAUDE_CODE_DISABLE_FAST_MODE=1` and leaves `EnterWorktree` and `ExitWorktree` allowed, so worktrees stay on.
- `/claudetto:setup` and `just setup` write claudetto's `autoMode` rule suite in place of the four built-in lists, in the dialog group now named "Sandbox and auto mode".
  On 2026-11-03, `just eval --classifier --run` scored the final suite 120 of 120 on each of the `suite`, `sonnet`, and `haiku` arms.
  With the suite, the built-in classifier's system block is 63,147 characters, against 140,015 with the built-in lists, read with `just capture --classifier` on `2.1.317`.
  The suite holds no fact of this repository, so the command no longer leaves `autoMode` out; `just setup` no longer writes this repository's `environment` facts.
  The fault check of `plugins/claudetto/src/automode/faults.ts` lets a list drop `$defaults` only when it is the measured suite list.

## [0.0.0] - 2026-10-30

### Changed

- **BREAKING**: every manifest declares `0.0.0`, which restarts the numbering (the user, 2026-10-30).
  The tree is a rebuild on `src` slices with the old tree in `archive/`, the project wiki is deleted, and all 21 release tags are deleted, so the old numbering described a tree that no longer ships.
  The six release sections of that numbering are removed from this file with the `## Older Releases` table, whose 30 links pointed at the deleted wiki.
  Their record stays in the git history and under `archive/`.
- **BREAKING**: a `classic.PermissionRequest` whose input has no gated key is passed on with no `allow`, so a person sees the prompt.
  Before, `onPermission` answered `allow` for every such input, which approved each `WebFetch`, each MCP call, and each `Skill` call that reached the prompt, none of which any rule of ours had read.
  The gated keys are `command`, `file_path`, `notebook_path`, `path`, `pattern`, and `glob` (`plugins/claudetto/src/gate/gate.ts:55`), so a `Bash`, `Read`, `Edit`, `Write`, `Glob`, `Grep`, or `Monitor` call still gets the verdict of the gate.
  `tool.check` is unchanged, so allow-by-default still holds for a call that no rule of ours matches.
- The supported Claude Code version is `2.1.314`, up from `2.1.312` (the user, 2026-10-30: "if using 2.1.314 items, bump to minimum 2.1.314 for the plugin").
  `/claudetto:setup` rests on readings taken from the `2.1.314` docs: that a `command.run` hook answering `{ text }` answers in place of the command and that omitting `context` leaves the model nothing to read, and that `$.fs.write` writes "to a file, creating it and its directories as needed", so the command needs no `mkdir` where `setup.ts` does.
  `MIN_CLAUDE_CODE_VERSION`, the `ci` workflow, `README.md`, and `CONTRIBUTING.md` all declare it, and `just claude-version` moves them together.
- `README.md` is rewritten for the `0.0.0` tree, in the conventional order: Features, Requirements, Install, Setup, What the Core Plugin Changes, Plugins, Configuration, Handoff, Update, Development, License (the user, 2026-10-30: "conventional README.md").
  The requirements are now Claude Code and `git` alone, because setup runs inside Claude Code, and `bun` and `just` are named as development tools.
  A `settings.read` hook that would answer the settings in place of a file was built and dropped on a measurement: `just capture --arm plugin` read 61,353 characters and 12 tool schemas with the hook and no settings file, against 31,861 and 9 with the file, and the engine logged `an answer without deniedMcpServers: unset for the reader`, so the readers that build the first request do not take its answer.
  A plugin's own `settings` key reaches only `agent` and `subagentStatusLine`, so a real settings file is the one measured way to deliver permissions, environment variables, and models.
- A handoff that Claude wrote itself is kept, and the code-built file steps aside.
  `classic.SessionEnd` and `classic.PreCompact` now skip the code-built write when a writing tool in the session's own transcript wrote a path under `.claude/claudetto/handoffs` (`wroteOwn`, `plugins/claudetto/src/handoff.ts:198`).
  The headings of the file are not read, so any write under that folder counts as Claude's own.
  The `context_management` text of the handoff state names the folder and the nine headings of `HANDOFF_SECTIONS` (`plugins/claudetto/src/handoff.ts:255`), which is the only place the model learns them, because neither hook makes a model call.
  The read-back says who wrote the file, so the resume no longer tells the model that code built a file Claude wrote.
- Jev is a tool the model calls, and it no longer answers an `AskUserQuestion` dialog (the user, 2026-10-27: "Jev's restart becomes a separate agent-accessible decision API, rather than overriding user's needed AskUserQuestion and not letting user choose").
  With the option `decide` set to `jev` and a key set, `session.start` registers `mcp__claudetto__decide`, and the model calls it for a decision that is its own.
  An `AskUserQuestion` dialog now always reaches the user, whatever the option.
  The reply holds one line per question, the pick with its confidence or the line that Jev is not sure, in place of the all-or-nothing answer the dialog needed.
  `session.start` declares the tool and `tool.call` serves it (`plugins/claudetto/src/register.ts:197`), with the names in `plugins/claudetto/src/jev/prompts.ts:8` and `:11`.

### Added

- `/claudetto:setup` writes the settings from inside Claude Code, so setup needs no checkout of this repository, no `bun`, and no `just` (the user, 2026-10-30: "it will ask what to keep, meaning the rest get discarded, upon lightweight setup command").
  It asks which of the three groups of `plugins/claudetto/src/tiers/groups.ts` to keep, through one `$.ui.ask` dialog, and writes only those keys: a group discarded writes none of its keys, and a value already set keeps the user's value.
  The keys are grouped because `$.ui.ask` takes two to four option labels and the snippet sets 13 top-level keys; `permissions.deny` sits with the two `builtinSnippet` switches in one group because `snippet.ts` ships it only with them.
  The command writes no `autoMode`, whatever the answer, because `autoMode.environment` is the readings of this repository (`plugins/claudetto/src/automode/environment.ts:1`, "the `autoMode.environment` facts of this project"): the `xsyetopz` remote, `plugins/claudetto/` as the product, and one macOS workstation.
  The auto-mode classifier reads those as the environment of whoever holds the settings file and decides from them whether a command runs without asking, so writing them into a stranger's settings would feed a permission decision facts that are false for that machine.
  Nothing measured is lost: the `allow`, `soft_deny`, and `hard_deny` lists are `$defaults` alone, and keeping all three groups reads the same 31,959 characters as the full snippet, because the classifier reads the key later and not in the first request.
  `just setup` still writes it, because it runs inside this checkout, and `tools/capture/settings.ts` now measures what the command writes rather than what `just setup` writes, since the figures are quoted in `README.md`.
  A `command.run` hook answers the command in code and returns `text` with no `context`, so the person reads the report and the model reads nothing of it: running it costs the session no tokens.
  That is measured and not reasoned: a `claude -p "/claudetto:setup"` run with `ANTHROPIC_BASE_URL` on the fake Messages API of `claudekit/api/fake.ts`, a throwaway `CLAUDE_CONFIG_DIR`, and `--plugin-dir` exited `0`, printed `claudetto: Nothing was chosen, so nothing was written.`, and left the fake API with zero requests on the messages route.
  The same run shows the headless path is safe: `$.ui.ask` rejects where there is no one to ask, and the hook answers that rejection with a line of its own rather than throwing, because a hook that throws is skipped and the body of `commands/setup.md` would go to the model as a prompt.
  What it does cost is its row in the command listing. `just capture --arm plugin --shipped` read 31,909 characters against 31,861 with no command, so the row is 48 characters, all in `messages`, and the description in `commands/setup.md` is one short sentence because the first wording of it read 31,961.
  A hook that throws is skipped, which would send the body of `commands/setup.md` to the model as a prompt, so a failed read or write is reported in `text` instead.
  `just setup` is unchanged and still does the same work from a checkout.
- Setup writes a `permissions.allow` list, which it had never written, so a read-only `git` call runs with no prompt and never reaches the auto-mode classifier (spec `low-hitl`, "Use Narrow Allow Rules" and "Settle Safe Calls before the Classifier").
  The list is `Bash(git status *)`, `Bash(git diff)`, `Bash(git log)`, and `Bash(git show)` in `plugins/claudetto/src/tiers/allow.ts`, and it costs the first request nothing, because settings are not prompt text: the arm reads 31,959 with the list and without it.
  Only `git status` takes the wildcard form, which "also matches the bare command" (`configure/permissions/rules`, `2.1.314`). The other three are the bare form, which holds no `*` and matches that text alone, because each takes `--output=<file>` and writes that file: in this checkout `git diff --output=F HEAD~1`, `git log -1 --output=F`, and `git show --output=F HEAD` each exited `0` and left `F` on disk, where `git status --output=F` exited `129` and wrote nothing.
  A rule cannot exclude a flag, so a wildcard over those three would pre-approve an arbitrary file write, which is not the read-only permission the list claims to grant. The cost is a prompt for a `git diff` that carries arguments.
  `git branch` is left out because it creates, renames, and deletes branches, and a package manager, an interpreter, and a test runner are left out because each runs code and no such rule is true of every machine.
  Two checks guard the list and are the "setup refuses a broad one" the spec asks for: `broadRules` catches a bare tool name, content of only wildcards, and a wildcard inside the first word of a `Bash` command, and `flagOpenRules` catches a wildcard over a command that is not known to refuse a file-writing flag. On a fault `tierSnippet` omits the `allow` key and `snippetFaults` names the rule, the way `autoMode` and `sandbox` faults are reported and never repaired.
  A user who already has an `allow` list keeps it whole and the report lists it as skipped, because `applyTier` never merges into a value the user set.
- `just window-report` prints the cost per rate-limit window, which `window/report.ts` could compose and no command reached (spec `window-budget`).
  `tools/window-report.ts` reads the store and prints `reportText`, one line per task and then the weight line.
  `weightOf` now refuses a number below `WEIGHT_MIN_ROWS` rows and reports "not measured" instead, on each side of the reading, because one row gave a confident-looking figure before.
  The floor is `2`, in `plugins/claudetto/src/window/limits.ts`, and it is the smallest value above a single reading: no source says how the whole-number lag of the window percentages spreads over rows, so `EVAL_MIN_RUNS_PER_ARM` was not borrowed for a different quantity.
  The constant sits with the plugin and not in `tools/limits.ts`, because the plugin ships without `tools/`.
- `tests/repo/prompt-budget.test.ts` holds the one byte budget that `specs/prompt-footprint/spec.md` fixes a number for, which nothing checked before: the body of `agents/main.md` against the 5,627 characters of the default body it replaces, failing with the piece, its size, and its budget as the spec asks.
  The budget is of the body after the frontmatter, because the frontmatter does not reach the prompt: the body is 5,574 characters where the whole file is 5,648, and `just capture --arm plugin --shipped` reads `system[2]` as 5,572 against 5,818 for `--arm plain`, so the replacement is a net 246 characters.
  No budget is invented for the other three pieces, since the spec records that no value is derived for them yet.
- `just claude-version` prints the supported Claude Code version with every line that declares it, and a version argument moves all of them (`just claude-version 2.1.315`).
  `tools/claude-version.ts` holds a fixed table of the four declaring sites and fails when a row does not match exactly once, rather than searching the tree, because the version also appears in readings such as "read against `2.1.312`" and rewriting one of those would claim a reading nobody took.
- A handoff holds no secret: a key, a token, or a value after a sensitive name is written as `[REDACTED]`.
  `redact` runs over the text of each user message, so the list of the user's values is clean, and over the whole assembled file, so a secret in a tool call or its result goes as well. The code-compacted head takes the same pass, because it stays in the context of each later resume.
  Each pattern is transcribed from the detector table of Claude Code `2.1.312` in `chunk-45pm9m17.js`: 41 key formats, the private key block, the 4 loose formats, and the 2 assignment entries. None is written from memory.
  The values of the credential env vars of the session are not covered, because the hooks runtime refuses a `$.env.get` call whose name is not a literal, so no mod can read the env by a computed name.
- A call that auto mode denied twice is denied at `tool.check`, before the classifier, with the reason of the earlier denial and the rule that would allow it.
  `classic.PermissionDenied` counts each denial per call signature in one `$.state` value, so the main loop and each subagent count the same call together, and the hook answers `retry: true` only while the count is under the bound.
  The event cannot send text to the model, so the text reaches it in the deny: it says to stop and report, and it names `"Bash(<command>)"` or the bare tool name for `permissions.allow`, with no hint to work around the denial.
- `docs/README.md` is an index of every page under `docs/`, with a link and one line each, grouped by folder, and a line that says what `docs/keep/` and `docs/dossier/` hold, because their names do not say it.
  It held three sentences and listed nothing, so the only way to find a page was to list the folder.
  Eighteen stale citations across seven pages are repaired with it: a path of the pre-restart tree now carries the `archive/` prefix at a line that was opened and checked, a path of a live file written without its prefix is spelled in full, and a sentence whose file is gone from both trees says what holds today instead of naming the file.
- `just eval` runs the rule cases of the main agent body against their fixtures, through `tools/evals/cli.ts`.
  Plan mode is the default and costs nothing, and `--run` makes the paid calls, so the recipe matches the other paid tools.
- `just validate` fails when the four manifests that declare the version of this project disagree, through `tools/manifests.ts`.
  Nothing compared them: `tests/repo/manifests.test.ts` tests the `userConfig` options and the source paths, and `claude plugin validate` checks the shape of each file and not the value inside it, so the prose of `CONTRIBUTING.md` was the only rule and it named three of the four.
  `package.json` is the reference, the marketplace version is read from under `metadata`, and a manifest with no string `version` is a fault on its own.
- Each plugin ships a listing icon, so `claude plugin validate --profile directory` now passes both with no warning at all (the user, 2026-10-30: "if you want to give it an icon, fetch a royalty-free svg somewhere that fits the plugin's idea").
  They are 1024 by 1024 PNG files at `plugins/claudetto/.claude-plugin/icon.png` and `plugins/claudetto-you-should-know/.claude-plugin/icon.png`, which is what the developer portal asks for: a square PNG or JPEG of 512 to 2048 px under 2 MB, with neither SVG nor WebP accepted.
  That rule is the `fix` advice of the validator's `ICON_MISSING` warning and goes unchecked locally, because the check on an icon it finds compares magic bytes against the file's own extension and reads no dimensions at all.
  The glyphs are Lucide `gauge` for the core plugin, whose thesis is that every value ships with its measurement, and Lucide `lightbulb` for the add-on, which raises one note.
  Lucide is ISC-licensed, which asks that the notice travel with the copies, so `docs/keep/lucide/` vendors the licence, the two glyphs as downloaded, the two composed sources, and the `rsvg-convert` commands that render them.
  Nothing of either drawing is redrawn: the composed file adds a `#17181a` square, a `#f2f2f2` stroke in place of `currentColor`, and a transform that centres the glyph at 640 px with a 192 px margin.
  Replacing either file later changes nothing in a catalogue: the same check states that the file "may become the listing icon only once: the first time the plugin is saved or submitted in the developer portal".

### Fixed

- The handoff that Claude writes is now told to redact a secret, which only the handoff that the hooks build was (spec `session-handoff`).
  `redact` runs over the file `handoff.ts` composes, so a key in a transcript never reached that file, while the nudge on `prompt.context` asked Claude for nine sections and said nothing about a secret, and a handoff is read back into every later session, so a key copied into one is read again each time.
  The line is "Write `[REDACTED]` in place of a key or a token", 48 characters, and `just capture --arm plugin --shipped` reads 31,959 against 31,909 without it, all 50 on the wire in `messages`, carried in the `handoff context` row of `plugins/claudetto/src/cuts.ts`.
- The deny list that setup writes is now behind its own guard at run time, which it was the only trimming key not to be (spec `surface-trim`, "No Deny for a Tool Whose Removal Raises the Request").
  `denyFaults` was called from `plugins/claudetto/src/__tests__/deny.spec.ts` and from nowhere else, so a name whose removal raises the request failed the test suite and would still have been written into a settings file by a build that skipped the tests.
  `snippetFaults` now reports it and `tierSnippet` omits the `deny` key on a fault, the way the `allow`, `autoMode`, and `sandbox` keys already behaved.
  The shared `cleanBlock` holds that one rule, "write the block when nothing faults it and no key at all when something does", so the rule is pinned by a test for both the clean and the faulted case rather than repeated in four places.
- A call the permission gate denies now tells the model to stop and report, with the rule that denied it (spec `permission-policy`, "Denied Calls Stop").
  That text existed only for a repeat auto-mode denial, so a direct gate denial said nothing and the model was free to retry or work around it.
  `stoppedText` wraps a gate denial in the new `DENY_GATED`, and both hook paths use it, `onCheck` and `onPermission` (`plugins/claudetto/src/gate/hooks.ts`).
  It names the gate's own rule and not an allow rule to add, because no `permissions.allow` rule lifts a denial of this gate.
  A denial the engine itself made still carries the engine's reason, since it is not ours to explain.
- The budget line no longer rides every prompt.
  `onSubmitBudget` added `Budget: context 62% left, five-hour 23.5% used, seven-day 41% used` to the `context` of every `prompt.submit` whenever the engine had usage to read, and the context figure moves every turn, so the line was paid for on every turn of every session.
  `specs/prompt-footprint/spec.md` forbids exactly that ("No Per-Message Injection": "The system MUST NOT add text on every user message"), and its Quiet Turn scenario asks for no text while the bands have not changed, so `budgetBand` now cuts each of the three readings to a step of 10 percent and the hook speaks only when that band differs from the one it last spoke for.
  The band is kept in `$.state` through `changeLedger`, as the other counts of `run-limits/` are, so two prompts submitted together cannot both read the old band and both speak.
  The exact percentages stay in the text: the band decides whether to speak, not what to say.
- `DEFAULT_EFFORT` of `claudetto-you-should-know` was `high` while the manifest declared `medium`, and both cited the same row of `docs/models.md:15`, which says `medium`.
  A `default` in the manifest reaches the hook as the option's value, so the code fallback never fired and the constant described a default nobody got.
  The constant is `medium` now, and `tests/repo/manifests.test.ts` pins the declared default, the declared model, and the declared effort list against the code, because nothing compared them before.
- `src/automode/automode.ts` and `src/sandbox/sandbox.ts` each imported `node:path`, which a hooks module has not got, so the first hook file to reach either of them stopped the whole module from loading: 125 of the 133 lab tests failed at once with `cannot import "node:path"`.
  Both held a byte-identical `join(configDir, "settings.json")`, and that one function now lives in `plugins/claudetto/src/settings-file.ts` as plain string work.
  Nothing caught this before, because no file the hooks module loaded had imported them yet.
- The Layout and Changelog sections of `CONTRIBUTING.md` described a tree that the slices replaced.
  They named the kernel in `kernel/`, one folder per module in `modules/`, the hooks module `hooks/register.ts`, and `tests/claudetto/<module>/`, and they told a contributor to change a version with `just bump`, whose recipe and `tools/bump-version.ts` are both gone.
  The four manifests that carry the version are named instead, and the merge into `main` is the release (commit `c74e4dc6`).
- About 20 pages under `docs/keep/` cited the pre-slice tree without the `archive/` prefix that their own other lines use, such as the `TOOL_BASH` source in `docs/keep/tools/Bash.txt`, which now reads `archive/plugins/claudetto/modules/session/prompt/prompts.ts:70`.
  78 distinct paths are prefixed, each one checked to be absent from the tree and present under `archive/` at the cited line.
  `tools/citations.ts`, which the Removed section of this release deletes, read a backticked span only, and these sat in bare parentheses, so no check reported them.
- The `[Unreleased]` entry on the gated keys cited `modules/gate/domain/gate.ts:40`, and `GATED_KEYS` is at `plugins/claudetto/src/gate/gate.ts:55`.
  `tools/citations.ts` skipped a path whose first segment is not an entry of the repo root, so a repo path written without its prefix was never resolved.
- A `head` or `tail` of two files, and any reader of a glob, are no longer denied as the wrong tool.
  The rule already exempted a `cat` of more than one file, because that "does what `Read` cannot", and `Read` likewise takes one literal path, so the exemption now covers the three programs and an operand the gate cannot resolve to one path.
  Over the 49 real denials of 2026-10-27 the denying parts fall from 62 to 53, and 6 of the 49 commands stop being denied (`docs/early-stops.md`).
- The soft turn bound of `claudetto:Hermes` is 40 in place of 30, which stopped a third of its runs before their work was done.
  The old number came from a single run of 8 calls. The 18 `Hermes` runs of 2026-10-27 pile up at 30, 31, 32, 33, 33, 33, and three of them say in their report that the bound is why sources stayed unread.
  40 is a quarter above the largest count, the method the other three bounds use, and that 33 is itself a capped count, so 40 is a floor.
- `Artemis.md` no longer tells the agent to fall back to `grep` in `Bash`, which its type does not have.
  One run reported "Bash is not available in this session" as a block, although nothing blocked it.
- Seven claims in this file named code that the restart had already removed, found by checking every path and identifier the `[0.0.0]` section asserts still exists.
  `HEADING_NOTE` and `gate.gh-title` are in no file of the tree, and `Chicago` is in none under `plugins/`, so the deleted heading rewriter has no replacement.
  `tools/thin-claims.ts` is gone and `just validate` does not run it, the nine-heading detection is `wroteOwn` and not a read of the file, `auto` resolves to `built-in` and not to `handover`, and `OPTION_DESCRIPTION` does not exist.
  The slice tree carries no dotted rule names at all, so `jev.ask`, `jev.decide`, and `jev.decide-register` named a registry of the old module tree, and the live names are cited instead.
  Five entries are removed with the code they described: the two on the heading title-caser, the one on the Table A total of `docs/prompt/footprint.md`, which that page no longer carries, the one on the lab cases of `plugins/claudetto/tests/tool.test.ts`, which lives only under `archive/`, and the one on the wording of the `compaction` option, which named `plugins/claudetto/src/compaction/compaction.ts:33` in a deleted file and `plugin.json:31`, a line that is now the `cheapSummary` description, while the Removed section already records that the whole option is gone.
  No check read a backticked identifier, so `tools/citations.ts` reported none of these: it resolved a `path:line` span only, and this release deletes it.
- The report of `/claudetto:setup` no longer opens with a plan tier, which was always the wrong one.
  It printed `Tier: claude_pro.` to every user, because a hooks module cannot reach `.claude.json` to read the login and the command composes from `SNIPPET_ROW`, whichever row that constant names.
  `tierReport` now takes the tier as `string | undefined` and prints no line for `undefined`, which is what the hook passes; `just setup` reads the login itself and still prints its own tier.
  Two cases of `tests/claudetto/tier/hooks.test.ts` hold `setupReport` to printing neither a `Tier:` line nor the tier of `SNIPPET_ROW` for any choice of groups, so the line cannot come back unnoticed.
- Setup now says what a discarded group would have done, which nothing read before.
  `KeyGroup.why` held one line for each of the three groups and no caller used it: the dialog of `$.ui.ask` shows labels with no descriptions, and a kept group is spelled out by the `Wrote` line of each of its keys, so a person who declined a group was told only its name.
  Each discarded line now carries it, and it costs no tokens, because the hook answers with `text` and no `context`.
  Two more cases of `tests/claudetto/tier/hooks.test.ts` hold every discarded group's `why` in the report and hold a kept group out of the discarded lines.
- Three gaps in the checks are closed, each of which let a shipped behavior change without a failure.
  `tests/claudetto/tiers.test.ts` now holds the guard that `tiers.ts:117` claimed was there and was not: every row of `TIERS` must give the snippet of `SNIPPET_ROW`, which is what makes the `command.run` hook safe to compose from one row while it cannot read the plan.
  `plugins/claudetto/tests/setup-command.test.ts` now answers the dialog instead of testing only the "nobody to ask" path, through a `tool.call` stub on `AskUserQuestion` keyed on the question the engine passed, and asserts the written path and the written keys.
  `plugins/claudetto-you-should-know/tests/call.test.ts` now covers the `none` reply, which opens no offer, and holds the plugin to `$.model.complete`: an answer is put beneath `model.fork` so that a fork would be recorded, rather than left out, because a missing answer throws and the check's own catch would swallow it.
- `docs/types.md` claimed the vendored types came from the version in `MIN_CLAUDE_CODE_VERSION`, which stopped being true when the minimum moved to `2.1.314`.
  The types on this machine were written by `2.1.312` and the engine rewrites that folder itself, so the two numbers are allowed to differ and the page now says so with the reason: `2.1.314` adds only the call `$.ui.place` and the event `ui.place` to the surface, and nothing here calls either.
  The page is not in the table of `tools/claude-version.ts`, which is why it drifted unchecked, and it stays out of it, because the version that wrote the declarations is not the version this project supports.
- `BARS` of `claudekit/probe/round/verdict.ts` scored two bars that the page defining the bars did not list, which that page asks never to happen ("so that a page of `docs/` and the requirement \"Decision Rule\" of `specs/compaction-path/spec.md` name the same list").
  `skipped` and `turns` were scored in code and absent from the table of `docs/evidence/code-compaction-probe.md`, "The Bars"; both rows are added there.
  The file's own header said it "reads them from there", which no code did, so it now says the list is transcribed and why nothing parses the Markdown at run time: a probe round must decide with no `docs/` read.
  Two cases in `claudekit/probe/round/__tests__/verdict.spec.ts` hold the two lists against each other in both directions, so the next bar added to either side fails the gate.
- Two of the new lab cases of `plugins/claudetto/tests/setup-command.test.ts` passed without driving what they named, found by a review of the commit that added them.
  "a run that writes a file still leaves the model nothing to read" asserted `out.context` alone and threw its writes away, which holds on the "nobody to ask" path too, so it would have passed with the dialog stub never reached; it now asserts the write as well, and a stub keyed on the wrong question makes it fail.
  "an answer naming no offered group writes nothing" asserted no write and the "Nothing was chosen" text, which the command prints for an unanswered dialog and for an unoffered answer alike, so neither assertion could tell the filter from a stub that never ran; it now holds the dialog itself, that it was raised once and that the label it answered with is not among the labels offered.
  The helper collects each dialog rather than each question text, and one case holds that the dialog really offers the groups the report speaks of.
- `docs/keep/lucide/README.md` and the icon entry of this changelog said `claude plugin validate --profile directory` enforces a square PNG or JPEG of 512 to 2048 px under 2 MB and takes neither SVG nor WebP, and it enforces none of that.
  The check on an icon it finds compares the file's magic bytes against its own extension and nothing else: a `.png` must open with the PNG signature, a `.jpg` with `FF D8 FF`, a `.svg` is merely parsed as text, and there is no dimension read and no byte count beyond a floor of 12, so a 256 px PNG, a 3000 px PNG, and an `icon.svg` all pass.
  The sizes are the `fix` advice of the `ICON_MISSING` warning, which the validator raises only when it finds no icon at all, so both pages now name the developer portal as what asks for them and say that the local check does not.

### Removed

- The nine checks of `tools/` that read prose rather than code are deleted, with their eight spec files, so `tools/` now holds only what the shipped plugin needs (the user, 2026-10-30: "clean up the mess that is `tools/` *ONLY* to what the plugin needs").
  They are `tools/always-loaded.ts`, `citations.ts`, `keep-pages.ts`, `md-table.ts`, `prompt-budgets.ts`, `pure-prompts.ts`, `recipes.ts`, `rule-scope.ts`, and `skill-flags.ts`.
  Each read a Markdown page and judged its wording, its table shape, or the paths it cited, so a change to a sentence failed `just check` while no shipped behavior had moved.
  `just validate` runs the seven that read code: the agent tools, the folder clusters, the JSDoc blocks, the text literals, the Gitleaks rules, the rebuild constants, and the four version manifests.
  What is lost with them: no check now compares a recipe named in a page against the `justfile`, resolves a cited `path:line`, or holds a prompt piece to a byte budget.
  The one budget that a spec fixes a number for is kept as a test instead, `tests/repo/prompt-budget.test.ts`, because a budget with a measured value is behavior and the rest were prose.
- The `compaction` option is gone, with `plugins/claudetto/src/compaction/compaction.ts` and its spec file (the user, 2026-10-30).
  It offered `auto`, `built-in`, and `code` in the plugin dialog while the `pathOf` that read it was imported by nothing but its own spec, so a person could set a value and nothing happened: `onCompact` (`compaction/hook.ts:34`) reads `cheapSummary` and never the path.
  An option in the dialog that no hook reads is worse than no option.
  The compaction of Claude Code is the one path that ships, which is what every probe round of `docs/evidence/code-compaction-probe.md` left in place by reporting no winner, and `tests/repo/compaction-default.test.ts` still fails when a verdict line stops saying that, which is the signal to build the code path and offer the option again.
  `tests/repo/manifests.test.ts` now pins the list of options the manifest declares, because no check can show that a hook reads a value: adding an option means changing that list, and whoever changes it has to name the hook that reads it.
- `docs/test-diet.md` is deleted (the user, 2026-10-30).
  It audited the test suite of the pre-restart tree: of the 209 test files it cited, 207 live only under `archive/`, and it named five `just` recipes that the `justfile` no longer defines.
  The audit and its numbers stay in the git history, and `docs/README.md` indexes the page no more.
- 15 pages under `docs/evidence/` are deleted, which is every page whose producer the restart removed and that reads nothing of the Claude Code binary (the user, 2026-10-30: "old docs means nothing that 0.0.0 restart and recent claude code binary searches have").
  They are the seven `docs/evidence/evals/` pages, both `docs/evidence/handoff-cost/` pages, `docs/evidence/usage-evidence/part-2.md`, `builtin-comparisons.md`, `jev-images.md`, `prompt-size.md`, and `sandbox-run-0.2.0.md`.
  Their producers are the `claude plugin eval` harness, `just eval-stats`, `just eval-variant`, `just classifier-replay`, `just handoff-probe`, `just sandbox`, `tools/compare-builtins.ts`, and the `claudetto-codegraph` add-on, none of which is in the tree.
  The 13 pages that stay either have a live producer under `claudekit/` or `tools/`, or read the installed binary, as `redaction.md` reads `2.1.312` and `probes-2.1.301.md` reads `2.1.301`.
  `RECORD_PAGES` of `tools/recipes.ts` loses eleven entries with them, and `docs/evidence/evidence.md` is rebuilt as an index of what is left, with the six live pages it had never listed.
  15 links into the deleted pages lost their link and kept their text, and the numbers stay in the git history.
- The `work.reply-opening` rule is deleted (the user, 2026-10-27: "so these brittle hooks should not exist at all").
  It read the first sentence of every reply and blocked the stop when a judge called it filler, which cost a Jev call and sometimes a `claude-haiku-5-5` call on every reply.
  A transcript of `claude -p "say OK."` shows the model answered `OK.`, this rule blocked the stop, and the forced rewrite produced "Nothing to run, so here is the word you asked for: OK.", so the rule turned a correct reply into a narrated one.
- The missing-check rule of the `finish` slice is deleted, with `modules/work/finish/domain/verify.ts` (same ruling).
  It demanded a project check after an edit of any file that was not `.md` or `.mdx`, so an edit of a prose `.txt` file demanded `just check`.
  Nothing replaces it: the tree carries no unproven-tick note and no `work.box` deny, so no hook now asks for a passed check behind a ticked task box.
- The heading rewriter of the `hygiene` slice is deleted, with `modules/session/hygiene/domain/headings.ts`.
  It rewrote the headings of each edited Markdown file to Chicago Title Case and wrote the file back, so a hook changed a file after the agent's own edit and the agent had to read it again.
  Nothing replaces it, so the tree now carries no heading-case rule: `Chicago` appears in no file under `plugins/`, and `plugins/claudetto/output-styles/Concise.md` states no heading convention.
- The repository makes no release tags, and the 21 old `<plugin>--v<version>` tags are deleted, because Claude Code installs and updates a plugin from the default branch and the `version` of its manifest (the user, 2026-10-27).
  The merge into `main` is the release.
  `just release`, `tools/release.ts`, and `tools/preflight.ts` are removed, and `just bump` no longer rewrites a compare link.
- The project wiki is deleted (the user, 2026-10-27).
  `src/wiki/`, `wiki/`, `tools/generate/`, `tools/wiki.ts`, `just generate`, and `just wiki` are removed, and `just check` no longer runs `generate --check`.
  The evidence pages are saved as `docs/evidence/`.
  `tools/thin-claims.ts` goes with them, so no check now stops a page citing an eval arm of fewer than `EVAL_MIN_RUNS_PER_ARM` runs; the floor survives as the constant in `tools/limits.ts` and as `CITABLE_MIN_RUNS` (`claudekit/probe/plan/floor.ts:13`), which the paid probe prints.
- Three places named a version that the restart removes.
  `.github/ISSUE_TEMPLATE/bug_report.yml` asked a reporter for a version "for example `claudetto` 0.28.0", a number from the numbering before the previous restart.
  `docs/surfaces.md` and `plugins/claudetto/src/builtins.ts` named the installed `0.4.0-alpha.2` as what a reading ran against, and the date of the reading is the provenance that stays true, so the version is dropped and the date kept.
- `CONTRIBUTING.md` told a contributor to add an entry under `[Unreleased]`, and `.github/pull_request_template.md` asked for one, while this file has no such section between releases.
  Both now say to open the section above the newest release.
- Eight citations in six pages under `docs/keep/skills/` named a line of this file that holds something else, which the collapse above surfaced.
  The numbers had drifted as entries were added at the top, and `tools/citations.ts` read whether a cited line exists and not whether it supports the sentence.
  Four of the eight also carried a claim the tree does not support: `commit.txt` and `commit-push-pr.txt` said setup installs a `commit-msg` hook and a `pre-push` hook of git, `init.txt` and `memory-types.txt` said `/claudetto:setup` writes a `CLAUDE.md`, and `claude-in-chrome.txt` said the repo ships its own browser plugin.
  Setup merges a settings snippet and installs no git hook, and the repo ships `claudetto` and `claudetto-you-should-know`.
  Each citation now names a file of this tree or of `archive/`, and the `drop` recommendation of the two commit pages rests on `docs/surfaces.md:3`, because the hook it named is not there.
  `docs/keep/skills/init.txt:12` is the same fault once more: it cited `README.md:117`, which is the `## Development` heading, for a claim that contradicted its own line 7. The main agent body does take its conventions from `@CLAUDE.md` (`plugins/claudetto/agents/main.md:23`), which is the real con, so the page now says that.
