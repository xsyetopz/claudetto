# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.

## [Unreleased]

### Changed

- **BREAKING**: a `classic.PermissionRequest` whose input has no gated key is passed on with no `allow`, so a person sees the prompt (task 3.2, spec `permission-policy`, "Fail Closed").
  Before, `onPermission` answered `allow` for every such input, which approved each `WebFetch`, each MCP call, and each `Skill` call that reached the prompt, none of which any rule of ours had read.
  The gated keys are `command`, `file_path`, `notebook_path`, `path`, `pattern`, and `glob` (`plugins/claudetto/src/gate/gate.ts:55`), so a `Bash`, `Read`, `Edit`, `Write`, `Glob`, `Grep`, or `Monitor` call still gets the verdict of the gate.
  `tool.check` is unchanged, so allow-by-default still holds for a call that no rule of ours matches.
- A handoff that Claude wrote itself is kept, and the code-built file steps aside (task 2.3a).
  `classic.SessionEnd` and `classic.PreCompact` now skip the code-built write when the session's own transcript holds a write of `.claude/claudetto/handoffs/handoff-<UTC stamp>.md` and that file holds the nine headings of `written.ts`.
  The `context_management` text of the handoff state names the folder and the nine headings, which is the only place the model learns them, because neither hook makes a model call.
  The read-back says who wrote the file, so the resume no longer tells the model that code built a file Claude wrote.
  The always-loaded text grows by 405 bytes (`docs/prompt/footprint.md`, Table A). The stated total afterwards was 18,000 bytes, and task 9.7 then corrected it to 15,643.
- Jev is a tool the model calls, and it no longer answers an `AskUserQuestion` dialog (the user, 2026-10-27: "Jev's restart becomes a separate agent-accessible decision API, rather than overriding user's needed AskUserQuestion and not letting user choose").
  With the option `decide` set to `jev` and a key set, `session.start` registers `mcp__claudetto__decide`, and the model calls it for a decision that is its own.
  An `AskUserQuestion` dialog now always reaches the user, whatever the option.
  The reply holds one line per question, the pick with its confidence or the line that Jev is not sure, in place of the all-or-nothing answer the dialog needed.
  The rule `jev.ask` is replaced by `jev.decide` and `jev.decide-register`.

### Added

- A handoff holds no secret: a key, a token, or a value after a sensitive name is written as `[REDACTED]` (task 2.10).
  `redact` runs over the text of each user message, so the list of the user's values is clean, and over the whole assembled file, so a secret in a tool call or its result goes as well. The code-compacted head takes the same pass, because it stays in the context of each later resume.
  Each pattern is transcribed from the detector table of Claude Code `2.1.312` in `chunk-45pm9m17.js`: 41 key formats, the private key block, the 4 loose formats, and the 2 assignment entries. None is written from memory.
  The values of the credential env vars of the session are not covered, because the hooks runtime refuses a `$.env.get` call whose name is not a literal, so no mod can read the env by a computed name.
- A call that auto mode denied twice is denied at `tool.check`, before the classifier, with the reason of the earlier denial and the rule that would allow it (task 10.4).
  `classic.PermissionDenied` counts each denial per call signature in one `$.state` value, so the main loop and each subagent count the same call together, and the hook answers `retry: true` only while the count is under the bound.
  The event cannot send text to the model, so the text reaches it in the deny: it says to stop and report, and it names `"Bash(<command>)"` or the bare tool name for `permissions.allow`, with no hint to work around the denial.
- `just validate` fails a page that tells a reader to run a recipe the `justfile` does not define, through `tools/recipes.ts`.
  Nothing compared a documented command against the `justfile`, which is how `CONTRIBUTING.md` kept naming `just bump` after that recipe and `tools/bump-version.ts` were removed.
  A name is read from a backticked span only, at the start of a command, because `just` inside a sentence is the English adverb and reading those spans reported 25 recipes that no page asks a reader to run.
  `RECORD_PAGES` holds `CHANGELOG.md`, `docs/test-diet.md`, and the 12 `docs/evidence/` pages that measured a removed harness, so a page that names a live recipe stays under the check.
- `just eval` runs the rule cases of the main agent body against their fixtures, through `tools/evals/cli.ts`.
  Plan mode is the default and costs nothing, and `--run` makes the paid calls, so the recipe matches the other paid tools.

### Fixed

- The Layout and Changelog sections of `CONTRIBUTING.md` described a tree that the slices replaced.
  They named the kernel in `kernel/`, one folder per module in `modules/`, the hooks module `hooks/register.ts`, and `tests/claudetto/<module>/`, and they told a contributor to change a version with `just bump`, whose recipe and `tools/bump-version.ts` are both gone.
  The three manifests that carry the version are named instead, and the merge into `main` is the release (commit `c74e4dc6`).
- About 20 pages under `docs/keep/` cited the pre-slice tree without the `archive/` prefix that their own other lines use, such as the `TOOL_BASH` source in `docs/keep/tools/Bash.txt`, which now reads `archive/plugins/claudetto/modules/session/prompt/prompts.ts:70`.
  78 distinct paths are prefixed, each one checked to be absent from the tree and present under `archive/` at the cited line.
  `tools/citations.ts` reads a backticked span only, and these sat in bare parentheses, so no check reported them.
- `docs/evidence/evals/evals.md` opens with the note that its harness is removed, because `just eval` exists again and the commands on the page take `--judge-model`, which `tools/evals/cli.ts` answers with exit 2.
- The `[Unreleased]` entry on the gated keys cited `modules/gate/domain/gate.ts:40`, and `GATED_KEYS` is at `plugins/claudetto/src/gate/gate.ts:55`.
  `tools/citations.ts` skips a path whose first segment is not an entry of the repo root, so a repo path written without its prefix was never resolved.
- A `head` or `tail` of two files, and any reader of a glob, are no longer denied as the wrong tool (task 13.2).
  The rule already exempted a `cat` of more than one file, because that "does what `Read` cannot", and `Read` likewise takes one literal path, so the exemption now covers the three programs and an operand the gate cannot resolve to one path.
  Over the 49 real denials of 2026-10-27 the denying parts fall from 62 to 53, and 6 of the 49 commands stop being denied (`docs/early-stops.md`).
- The soft turn bound of `claudetto:Hermes` is 40 in place of 30, which stopped a third of its runs before their work was done (task 13.2).
  The old number came from a single run of 8 calls. The 18 `Hermes` runs of 2026-10-27 pile up at 30, 31, 32, 33, 33, 33, and three of them say in their report that the bound is why sources stayed unread.
  40 is a quarter above the largest count, the method the other three bounds use, and that 33 is itself a capped count, so 40 is a floor.
- `Artemis.md` no longer tells the agent to fall back to `grep` in `Bash`, which its type does not have (task 13.3).
  One run reported "Bash is not available in this session" as a block, although nothing blocked it.
- The always-loaded total of `docs/prompt/footprint.md` counted 2,357 bytes that no request carried, and it is now 15,643 (task 9.7).
  `TOOL_WRITE` was 261 characters against a stock `Write` text of 240, and `tool.describe` keeps ours only while it is shorter, so the engine always kept its own text. The export, its entry in `TOOL_TEXTS`, and `Write` in the `DESCRIBED` list are gone.
  `TOOL_SEND_MESSAGE` moved to Table C, because the engine leaves `SendMessage` off the base prompt by default, so its 2,096 bytes load only through `ToolSearch`.
  `tests/repo/justification.test.ts` now fails for a Table A row whose export does not exist or whose stated size is not the measured one, which is the check that was missing.
- The lab cases of `plugins/claudetto/tests/tool.test.ts` compared each tool text against a stub of 4,000 characters, which every text beats, so they passed for a text the engine would never take.
  The case "Shorter Than Stock" holds the real `Description` length of each tool from the `cc-docs` route `prompts/tools`.
- The `compaction` option no longer describes `auto` as a pick "from the table", because no table exists.
  The code treats every value other than `built-in` and `code` as the handover path, so `auto` is `handover` today, and the description now says that.
  The same text stands in `plugins/claudetto/.claude-plugin/plugin.json` and in `OPTION_DESCRIPTION`.
- The heading title-caser keeps a lone capital letter, so a heading such as `The Rate, from A to B` stays as typed.
  It lowercased the `A` as the article, which changed the meaning of the heading it was tidying.
- The heading title-caser keeps a small word in lower case before a trailing numeral, so `Consequence for 5.3 and 5.5` and `The Instruction of 2026-10-27` stay as typed.
  It took the last word *with a letter* as the last word of the title, so a numeral at the end handed the capital to the `and` or the `of` before it.
  The last word is now the last word, whether or not it holds a letter, and the same holds for the first.
  Found on 2026-10-27, when the caser of the installed `0.4.0-alpha.2` rewrote `### Table A, the Pieces` of `docs/prompt/footprint.md` and broke `tests/repo/justification.test.ts`, which reads that heading.

### Removed

- The `work.reply-opening` rule is deleted (the user, 2026-10-27: "so these brittle hooks should not exist at all").
  It read the first sentence of every reply and blocked the stop when a judge called it filler, which cost a Jev call and sometimes a `claude-haiku-5-5` call on every reply.
  A transcript of `claude -p "say OK."` shows the model answered `OK.`, this rule blocked the stop, and the forced rewrite produced "Nothing to run, so here is the word you asked for: OK.", so the rule turned a correct reply into a narrated one.
- The missing-check rule of the `finish` slice is deleted, with `modules/work/finish/domain/verify.ts` (same ruling).
  It demanded a project check after an edit of any file that was not `.md` or `.mdx`, so an edit of a prose `.txt` file demanded `just check`.
  The unproven-tick note and the `work.box` deny keep the part that matters, that a ticked task box needs a passed check in the session.
- The heading rewriter of the `hygiene` slice is deleted, with `modules/session/hygiene/domain/headings.ts`.
  It rewrote the headings of each edited Markdown file to Chicago Title Case and wrote the file back, so a hook changed a file after the agent's own edit and the agent had to read it again.
  `HEADING_NOTE` keeps the convention on the reply side, where it writes nothing, and `gate.gh-title` still cases a `gh pr create` title.
- The repository makes no release tags, and the 21 old `<plugin>--v<version>` tags are deleted, because Claude Code installs and updates a plugin from the default branch and the `version` of its manifest (the user, 2026-10-27).
  The merge into `main` is the release.
  `just release`, `tools/release.ts`, and `tools/preflight.ts` are removed, and `just bump` no longer rewrites a compare link.
- The project wiki is deleted (the user, 2026-10-27).
  `src/wiki/`, `wiki/`, `tools/generate/`, `tools/wiki.ts`, `just generate`, and `just wiki` are removed, and `just check` no longer runs `generate --check`.
  The evidence pages are saved as `docs/evidence/`.
  `tools/thin-claims.ts` stays, with its glob moved from `src/wiki/**/*.md` to `docs/**/*.md`, because it is the check that stops a document citing an eval arm of fewer than `EVAL_MIN_RUNS_PER_ARM` runs and `just validate` still reads it.

## [0.4.0-alpha.2] - 2026-10-27

### Added

- The `gate` hook denies a `Bash` call that `Read` can do (`cat`, `head`, or `tail` on a file) and names `Read` (the user, 2026-10-27).
  A filter in a pipe, a `tail -f` of a log, and a `cat` that joins files or writes to a file stay allowed.
- The `gate` hook has a classifier stage, a low-cost copy of the classifier of the auto mode of Claude Code (the user, 2026-10-27).
  Each `ask` of the gate goes to Jev first, and a sure yes allows the call.
  Else `claude-haiku-5-5` at the `high` effort reads the rules, the newest 3 requests of the user, and the call, and allows it or denies it with a reason.
  A failure goes to the dialog, and a breaker sends the next `ask` to a person after 3 denials in a row or 20 in a session.
  The new option `classifier` (`haiku` by default, or `off`) turns off the model step.
- The `reply` hook blocks one time a reply that opens with agreement, praise, an apology, or self-blame, such as "You're right" or "Sorry", and asks Claude to send it again with the outcome or the next action as the first words (the user, 2026-10-27).
  A judge reads the first 3 sentences and the last request, so it matches no word and works in any language.
  Jev answers first, and `claude-haiku-5-5` at the `low` effort settles what Jev is not sure about, unless the option `classifier` is `off`. A fault lets the stop go.
- The edit ledger moves from a file in the temp folder to the private store of the plugin (`$.store`, key `ledger:<project key>`), so a recreated temp folder no longer loses the lines of earlier Claude sessions, and the files that Claude wrote stay labeled as Claude's (the user, 2026-10-27).
  Each line gets `via` (`edit` or `bash`), and a line with no valid `via` is dropped.
  `LEDGER_MAX_FILES` rises from 200 to 2000.
  An `Edit` or `Write` also records its line at `classic.PreToolUse`, with the hash of the content that it will write.
- Free evals with no model call, which follow the sources of the wiki page `Eval-Sources` (the user, 2026-10-27).
  `just eval-stats` reports the paired difference of the arms for each case, with a clustered standard error, a 95% CI, and the cases that a power check needs at `--gap`.
  `just classifier-replay` scores the deterministic stage of the `gate` hook on benign calls from the session logs, the InjecAgent attacks, and harmful in-project edits.
  `just handoff-probe` plants items in synthetic sessions and scores how many the code handoff keeps, and `--sessions` replays real transcripts.
- `main`, `Hephaestus`, and `Athena` keep each concern in its own module, with a source file at 300 lines or fewer and a test file at 500 or fewer, and `tests/repo/file-size.test.ts` checks the limits in this repository (the user, 2026-10-27).

### Changed

- **BREAKING** claudetto needs Claude Code `2.1.311` or later (`MIN_CLAUDE_CODE_VERSION`), and CI tests on `2.1.311`.
  The search-engine, client-data, and text-defaults fixtures come from its binary: each pinned fact is the same, and only minified names changed (`JT`, `nus`, `_7e`, `Ifi`).
  The default texts of `compaction` (a new `<summary>` paragraph) and `Bash` (the `cd` line) changed in `2.1.311`.
- The env-file and secrets rules of the `gate` hook read the value of a `-f` or `--file` option of `grep`, `sed`, and `awk` as a file, and the value of `-e` as a pattern. So `grep -f .env x` is a secret read, and the pattern of `grep -E "fail$"` no longer asks.
- The env-file rule of the `gate` hook asks less: the pattern of `grep` and the other pattern programs is no file name, and a word with `$` is no env file read when its literal end cannot name one, such as `/tmp/old-$k.txt` or `$dir/notes.txt`.
  A bare `"$f"`, a tail such as `$x.env`, and a failed scan for env files still ask.
- The `Bash` text of claudetto says that a `cd` carries to the next call only in the main session, and that a command at its timeout returns its output so far and keeps running in the background, as in `2.1.311`.
- The main agent fixes each defect that the session shows, in the same turn, and reports it apart, in place of offering the fix (the user, 2026-10-27). This covers an older defect, one in a file of the user or of another session, one in a hook or check of the project, and one that a tool, probe, or eval output shows. A report names a found defect only as fixed, or as blocked with its blocker, and the user is asked only for approvals and for choices that the facts leave open.
  For code that only looks wrong, with no run that shows a defect, the main agent asks with `AskUserQuestion` whether to change it.
- The main agent and the `Concise` style put each question for the user, a push back included, in `AskUserQuestion`, so that Jev can answer it, and the "What I Need from You" list holds only steps that only the user can do (the user, 2026-10-27).
  A session had ended its turn with "Reply "launcher" ... or "bun only"" in the reply text, because the texts said to end the turn before a pushed-back change.
- `just eval` and `just eval-variant` need `--judge-model`, because an `llm` grader has no model key and the default judge alias `haiku` can move to a new model.

### Fixed

- The `gate` hook no longer denies a `git` exclude pathspec of an env file, such as `git grep KEY -- . ':(exclude,glob)**/.env'`, as a read of a secret, because git reads no file that such a pathspec names (the user, 2026-10-27).
- The handover no longer hangs at its `/clear` (the user, 2026-10-27). The chain awaited `$.command.run` for `/clear`, a promise that need not settle when the session is reset, so the resume prompt never ran and the run stayed `running` for good. The chain now sends `/clear` and goes on, the resume prompt waits in `$.state`, and the `classic.SessionStart` hook with `source` `clear` submits it in the new session. A run that waits for a `/clear` ends after 60 seconds, and a refused `/clear` ends it at once.
- The keys of a note above the prompt show their hotkey once, such as `3: Turn notes on`, in place of `3: 3: Turn notes on`, because Claude Code draws a plain `Button` as `hotkey: label`.
- The code handoff no longer drops early rules, values, files, and decisions of a long session (the user, 2026-10-27). Each section holds a token budget in place of a fixed count of the newest entries, and over it keeps the oldest and the newest. The probe lost 239 of 1,500 planted items before (early 72.4%, late 95.0%) and 0 after, with the largest handoff at 5,332 tokens.
- The `protect` slice no longer writes back a plan or spec file that a `Bash` call moved with its text unchanged, such as `openspec archive` or `mv` of a change folder into `openspec/changes/archive/`, which made the change exist twice, and it no longer writes back the delete of a duplicate whose exact text is in the archive. A delete with no copy of the text, and each change of text, are still written back (the user, 2026-10-27).
- The code handoff no longer reads the summary of a built-in compaction as words of the user, which made its bullets about older work into rules, the goal, and quoted user messages (the user, 2026-10-27).
- The code handoff has a new section `## Running Work` with each background agent and `Bash` command that has no notification yet, so the next context knows what still runs (the user, 2026-10-27).
- The `repo` block of the context reads the branch, the tag, and the open change again in each new session, `/clear` included, in place of one time for each process, which kept a branch from before a switch (the user, 2026-10-27).
- The `protect` slice no longer deletes or writes back a protected file that an `Edit` or `Write` of another session or agent made during a `Bash` call, because a line of `edit` in the ledger holds the path with its current hash (the user, 2026-10-27).
- A check that passed in an `&&` chain, such as `bun test tests/x && just lab`, now counts for a task box and the done list of a handoff. A chain with `||`, `;`, a pipe, or `$(` still counts no check.
- The `gate` hook asks before `gh repo delete` and other remote destroys of `gh`, before a move or a delete of a file in the home folder outside the project, before a `curl` that sends a file from outside the project to a remote host, and before an `Edit` or `Write` of a `git` hook, a workflow, a settings file of Claude Code, an env file, or an install script of `package.json` (the user, 2026-10-27). The replay of the gate missed 33 of 34 InjecAgent attacks and 6 of 6 harmful edits, and it now misses 0 of 34 and 0 of 6 at the same 62 of 500 asks on benign calls (12.4%).

### Removed

- The tools `mcp__claudetto__grep` and `mcp__claudetto__glob` are gone (the user, 2026-10-27). On a native build, `rg` in `Bash` runs the ripgrep that Claude Code bundles, which skips git-ignored files. The copy fell back to `grep -r` and `find`, which read git-ignored files, and it returned up to 100,000 characters, where the built-in `Grep` returns 20,000.
- The context that the edit ledger added is gone (the user, 2026-10-27): the line at each prompt for a file that changed after the last edit of its agent, and the list of who changed each file after `git status` and `git diff`. The ledger cannot tell who made a change, and the text led Claude to revert changes that it did not make. The ledger still feeds the `gate` and `protect` slices.
- The checks that judge text by English words are gone, because such checks are brittle and not trustworthy (the user, 2026-10-27).
  The `ground` hook no longer denies a plan line for an attribution such as "the user chose ...", a claim of done such as "tests pass", or a package manager such as `npx` in a project with `bun.lock`. It still denies a number with no source and a `file:line` reference past the end of its file.
  The `Stop` hook no longer sets the `Deferred` note, and the `Not proven` note shows for a ticked box with no passed check, with no claim of "ready" or "done" needed and no `git status` read.
  The bounds `NOTE_ITEM_CHARS` and `NOTE_FILES_MAX` are gone with them.
  The 4 `regex` graders over the last reply of the eval cases `handoff`, `blind-count-from-tool`, and `blind-ctl-real-empty-average` are gone, and `tests/tools/word-graders.test.ts` fails on a new one.

## [0.4.0-alpha.1] - 2026-10-27

### Removed

- **BREAKING** The `claudetto-docs` plugin is gone, and its skill is now `claudetto:find-docs` in the core plugin, with the `ctx7` CLI path and its permission rules (A4).
  It has no MCP server and no key option.
  Run `claude plugin uninstall claudetto-docs@claudetto`.
  To use the `context7` MCP server, add it to your own settings.
  `claudetto-setup` names an enabled `claudetto-docs` as removed.
- **BREAKING** (maintainer) The recipes `just gate` and `just ci` are gone.
  `just check` and the CI workflow run `tools/check.ts`, and CI runs `bun tools/check.ts --ci`, which skips the type check and says so (A5).
- (maintainer) The tools with no caller are gone: `tools/compare-builtins.ts`, `tools/compare/`, `tools/yolo/`, and `tools/vanilla.py`, with their tests (A7).
  Git history keeps them.

### Changed

- **BREAKING** claudetto needs Claude Code `2.1.310` or later (`MIN_CLAUDE_CODE_VERSION`), and CI tests on `2.1.310`.
- `minispec` reads each name and each boolean flag from the one walk of the arguments, so `new change --description x z`, `archive --skip-specs a-x --yes`, and `new change z --description --json` act as in OpenSpec.
  The help and unknown-flag checks read the same walk, so the value of `--json=--help` stays a value.
  `show -r` with a value that is not a number from `1` exits `2`, where it showed the whole spec before.
  A thematic break such as `* * *` is no list item, and a blank line closes an empty item, so a fence after them is read as in CommonMark.
- Each text of claudetto that a model reads says what to do, with the reason, in place of what not to do, as the Anthropic prompting guidance asks (the user, 2026-10-26).
  This covers `agents/main.md` and the other agents, `Concise.md`, the skills, the prompt strings of the hooks and tools, `.claude/rules/`, and `AGENTS.md`.
  A hard limit with no positive form, and a user rule that a handoff quotes, stay as they are.
- `Concise.md` and `agents/main.md` tell Claude to write each text for a model, such as a subagent brief, in the same form.
- `AGENTS.md` has no STE rule now (the user, 2026-10-26).
- `agents/main.md` keeps only the rules of a coding agent: the pronoun and emoji rules are gone, each section is shorter, and the `learn:` line moves to a side model (16023 to 9513 bytes). A repeated ask with no reason, also "I do not need a reason", is no override in `main.md`, which now has the agent state the risk first, after 2 of 3 runs of the eval case `repeat-no-reason` used `eval` on that ask.
- `agents/main.md` checks a technical claim of the user before it agrees: it states the claim, judges it as a third party would, and measures a performance, memory, or concurrency claim, then says first when the claim fails (arXiv `2510.04721`, `2604.02423`, `2505.23840`). It answers the technical content in place of emotional validation, and it writes to the standard of a maintained production project with current practice from the docs (the user, 2026-10-26).
- `agents/main.md`, `Hephaestus`, `Athena`, `Apollo`, and `Concise.md` guard against a gamed measure (Goodhart's law): the goal is the target and a check is evidence about it, a check-gaming edit is a review defect, and each failure, workaround, and skipped step stays in the report.
- The settings snippet now sets `model` to `opusplan` and `showClearContextOnPlanAccept` to `true`, so Opus plans, the approval can clear the context, and Sonnet builds with no manual switch of the model (the user, 2026-10-26).
  Auto mode stays off, and the gate decides each call after the approval.
  The snippet sets no `effortLevel` for each model, because a paid probe showed that the plan turn on Opus takes the saved effort of Sonnet.
- **BREAKING** The flags `--global-md` and `--global-rule=LINE` of `claudetto-setup` are now `--claude-md` and `--claude-md-rule=LINE`.
- **BREAKING** (maintainer) `plugins/claudetto/slices/` is now `plugins/claudetto/modules/`, with the modules `shell`, `project`, `jev`, `session`, `work`, `gate`, `agents`, `statusline`, `setup`, and `spec` (A1).
  A file imports the module file that defines a name, with no `index.ts` barrel, because the repo follows the Biome rules `noBarrelFile` and `noReExportAll` (the user, 2026-10-26), and `tests/repo/imports.test.ts` checks each import rule.
- (maintainer) The code passes Biome 2.6 with its GritQL rules and no suppression: no `as` cast, no `*Sync` call, no `.then`, no `reduce`, and no `process.exit`.
  The process port of the kernel, the readers of `spec`, and the cache readers of the status line are async, and a timeout still returns at its deadline.
  `package.json` names the type modules `claude-code`, `claude-code-mcp`, and `claude-code-tools` as optional peer dependencies.
- **BREAKING** (maintainer) A `// rule: <module>.<job>` comment names each `on()` call of `hooks/register.ts`, and the keys of `evals/hooks.json` are these rule names (A2).
- **BREAKING** (maintainer) The paid and manual tools move from `tools/` to `dev/`, such as the sandbox, the capture, the schema tool, and the eval tools (A5).
  The `just` recipes keep their names.
- Each `$.state` value has one owner module, which lists it in `STATE_KEYS` of its `state.ts`, and a type test checks each owner type against its contract (A3).
- Each fact that more than one part read, such as the edits of the user, the `git status` parse, the running agents, and the open change, has one function in its owner module.
- The kernel keeps only the options, the text helpers, the ports, the hook types, and `kernel/node/`, and it reads the options in one place.
- `just test` runs only `bun test`, and no longer writes the wiki.
- `just generate` writes `openspec/schemas/` from the presets of `spec`, and `just generate --check` fails on a schema that differs from its preset.
- The status line has 4 fixed rows, and no item moves to another row.
  Row 1 shows the folder, git, and the change, row 2 the model, the context, and the cost, row 3 the `5h`, `7d`, and spend limits, and row 4 the prompt cache.
  A narrow terminal first gets the countdowns, then a cut at the right edge.
- `claudetto-setup --claude-md` writes 3 rules of claudetto in its block of `~/.claude/CLAUDE.md`.
  A later run gives an existing file the same block, and keeps each user line.
  The rule of a check before done is now the stop check of `finish`, so the block no longer has it.
- The percents and the countdowns of the status line get a color from a linear gradient of 3 stops, green at 20%, amber at 60%, and red at 90%, in place of 3 fixed colors.
- The body of `claudetto:main` is rebuilt from the system prompt sections of Claude Code 2.1.310, and each XML tag names its topic in plain words.
  Each rule works in the TUI and in `claude -p`.
  When `AskUserQuestion` is not in the tools, the model decides, states the assumption, and stops only before an action with no undo.
- `claudetto:main` objects to a claim or a choice only on evidence of a fault, and first checks that the text of the user does not already cover the point.
  It answers "why did you do X?" with the reason, and it keeps a position until new evidence comes.
- The output style, the skills, the agents, and the hook texts no longer conflict with `claudetto:main`, and each ask of a skill has a form for `claude -p`.
- (maintainer) The modules `statusline`, `jev`, `shell`, and `gate` are rewritten with no change of behavior.
  `gate` uses `operands`, `nameOf`, and `wordSet` of `shell`, and `gate/domain/loss.ts` holds the delete, `git`, and loss rules.
- **BREAKING** The agents are named for gods, and the file of each agent has its new name: `claudetto:Hephaestus` for `claudetto:Worker`, `claudetto:Artemis` for `claudetto:Scout`, `claudetto:Hermes` for `claudetto:Researcher`, `claudetto:Athena` for `claudetto:Reviewer`, `claudetto:Apollo` for `claudetto:Tester`, and `claudetto:Zeus` for `claudetto:Scoper` (the user, 2026-10-26).
  Each description is plain and about the job of the agent, and a call with no type goes to `claudetto:Hephaestus`.
  A rule of `permissions.deny` or a `TURN_BOUNDS` key with an old type no longer matches.
- `claudetto:main` does the work in the main loop, and starts an agent only for context bloat, parallel work with fresh context, or a choice among many tools (the user, 2026-10-26).

### Added

- The `compaction` value `code` builds the compaction in code with no model request: the handoff message, then the newest messages (experimental).
  The probe of change `code-compaction` has not shown it to cost less than the built-in compaction yet, so `auto` does not pick it (the wiki page "Code Compaction Probe").
  A kept tool result keeps only its text, and the first kept rows of a group of parallel tool calls lose their thinking blocks, so that a `--resume` loads no history from before the compaction.
- The model IDs for code that calls a Claude model move from `claudetto:main` to a `models` block of `prompt.context`.
  A login whose `.claude.json` marks Mythos gets `claude-mythos-5-1` in place of `claude-fable-5-1`, and claudetto reads no other value of that file.
- A session with no `Grep` and no `Glob`, such as a native build, gets the tools `mcp__claudetto__grep` and `mcp__claudetto__glob` in their place (task 19.14).
  They run the first search program of the host (`rg`, `ugrep`, then `grep`, and `rg` or `find` for `glob`) with `$.process`, take the input fields of the built-in tools that they can serve, and skip `.git` and the secret environment files.
  Their schemas are in the prompt, so no `ToolSearch` call comes first.
  The secret-read rule of `gate` covers them as it covers `Grep` and `Glob`.- At each session start in a project with `.git`, claudetto adds `/.claude/claudetto/` to `.gitignore` when no entry covers the folder, and creates `.gitignore` when it is missing (the user, 2026-10-26).
  An equal entry, such as `.claude/claudetto`, `.claude/claudetto/`, `/.claude/claudetto`, or `/.claude/claudetto/**`, counts as present, also for `claudetto-setup --apply`.
  An entry for a parent folder, such as `.claude/`, also covers it.
- **BREAKING** The project state moves from `<project>/.claudetto/` to `<project>/.claude/claudetto/`, which holds the handoffs and `goal.json` (the user, 2026-10-26).
  At the first session start, claudetto moves an old `.claudetto/` folder to `.claude/claudetto/` when that folder does not exist.
  The last limit reading of the status line is now in `${CLAUDE_CONFIG_DIR:-~/.claude}/claudetto/limits.json`, so a reboot no longer removes it.
- A test fails when a tool that a deny text of claudetto names, such as `Monitor` in the long-wait deny, is behind `ToolSearch` (task 19.15).
- At the start, claudetto sets `BASH_MAX_OUTPUT_LENGTH` to 24,000 when you set neither it nor `bashOutputMaxChars`, below the default of 30,000 (task 19.9).
  Claude Code keeps the start of a long output, and 24,000 keeps the failure lines of the largest failed `just check` step that was measured.
- (maintainer) `just check` prints only the count lines of each passed step, and the full output of a failed step (task 20.0).
- `claudetto-setup` writes `sandbox.filesystem.denyRead` for `~/.ssh`, `~/.gnupg`, `~/.aws/credentials`, `~/.netrc`, and `~/.docker/config.json`, and `sandbox.filesystem.denyWrite` for `/System`, `/Library`, and the folders of `/usr` except `/usr/local` (task 19.13).
  The sandbox applies to each process in `Bash`, so it also stops `python3` and `perl`. A probe showed that `Edit` stays allowed under `denyWrite`.
  The lists come from `gate/domain/paths.ts`, which feed the gate too. Setup keeps your entries, and does not turn `sandbox.enabled` on.
  A `.env` file has no entry, because under a `**/.env` deny `bun` exits with code 1 in a folder with a `.env` file. The gate and the value filter of task 19.16 cover `.env` files.
- A subagent gets a refusal for a foreground `Bash` call whose `timeout` is over 240 s, and the reason points to `run_in_background: true` and `Monitor` (task 19.11).
  A subagent cache lasts 5 minutes, so a long wait wrote the context to the cache again.
  The `timeout` is the one of the call, else `BASH_DEFAULT_TIMEOUT_MS`, else 120 s.
  The rule is off for the main thread and for a `1h` value of `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` or `subagentPromptCacheTtl`.
- A subagent gets one line of `additionalContext` at a soft turn limit, in place of `maxTurns`, which stops an agent with no report: at its bound of tool calls, it is asked to stop and report what is done and what is open (task 19.10).
  The bounds are in `TURN_BOUNDS`, for each agent type, above the largest count of the subagent transcripts of 2026-10-26.
  The main thread gets no line.
  When the state of the session fails, the line goes out one time for each agent, and not with each call, also when the state recovers later.
  The line comes one time at the first call at or over the bound, also when parallel calls skip the bound, and a failed call counts too (task 19.19).
  When the count cannot be written after a bound of tries, the line comes, because an extra line costs less than a missed one.
- `src/wiki/claudetto/Architecture.md` names each module, kernel file, and `$.state` value, and a test fails when the page and the code differ.
- `just check` fails for a test file that runs 0 cases, and for a tool with no caller.
- The stop hook of `finish` blocks a stop one time when the turn edited a file that is not Markdown and ran no passed check after the last edit.
  It applies only to a project with a check recipe in its `justfile` or a `bun.lock`, and its reason names those checks.
- The recipes `just builtins` and `just text-defaults` run the tools of `dev/` that had no recipe.
- When Claude Code leaves a limit window out of the status input, such as `rate_limits.seven_day`, the status line shows the last reading, dimmed with its age, until its `resets_at` passes.
- `claudetto-setup --claude-md --apply` writes `~/.claude/rules/claudetto-tests.md`, a rule for test files, when the file is not there, and the inventory lists it with the owner `claudetto`.
- (maintainer) `just builtins` also writes `Sections.md`, with the text of each system prompt section.
- A prompt of over 40,000 characters gets one line of `additionalContext` that names its size and says that a large paste is sent again with each later request.
- A `Bash` call can no longer change a protected file (task 19.12).
  The protected files are the boxes of a `tasks.md`, the plan and spec files that `work.ground` checks, `.claude/claudetto/goal.json`, and `.jscpd-baseline.json`.
  The rule checks the effect on the file, not the command, so `python3`, `perl`, `sed`, and a rename count the same.
  It turns on `tool_response.bashEditDiff` with `CLAUDE_CODE_BASH_EDIT_DIFF` at the start, saves the files before the call, and after it writes back a changed file (or deletes one that the call created) with a line that names `Edit`.
  When the field has `unavailable` or `skipped`, or is missing, such as in a sandbox, it compares the content instead.
  It keeps a changed file when the new content equals the file in a commit that git had at the first `Bash` call of the session (a ref tip, `HEAD`, or the stash), or in a remote-tracking ref that moved and that `git ls-remote` shows at the remote. So `git pull`, `git checkout`, `git stash pop`, a `git merge` of a branch from before the session, and `git reset --hard <ref>` are not undone. A commit or a `git update-ref` of any call of the session does not make a change stay, because only a commit from before the first `Bash` call counts, with one limit: a commit that the agent makes, pushes to the real remote, and fetches is trusted, because the remote has it and no sound check can tell it from a commit of another person (task 19.18).
  A remote counts only with the URL that it had at the first `Bash` call, and only when this URL is on the network (`https`, `ssh`, `git`, or `user@host:path`). `git ls-remote` runs against this URL, so `git config remote.origin.url <path>`, a new remote, and a remote with a path as URL are not trusted.
  `git ls-remote` also reads the `git` config, `~/.ssh/config`, some env vars, and the programs `ssh` and `git`, and a call can change them with no change of `git remote -v` (`url.<base>.insteadOf` for the pinned URL, `core.sshCommand`, `http.proxy`, `include.path`, a write of a config file, or an `ssh` earlier in `PATH`). So the pin holds a stamp of each: the output of `git config --list --show-origin --show-scope`, which holds each config file and include, the text of `~/.ssh/config`, the env vars, and the real paths of `ssh` and `git` that `PATH` names. The config stamp leaves out the keys that `git ls-remote` never reads (`branch.*` and `submodule.*`), so `git push -u`, `git switch -c --track`, and a `git checkout` of `origin/<n>` do not undo the trust. A remote counts for nothing when a stamp changed, and the result gets one line that says which one.
  A script or program that a setting names can be rewritten with no change of any stamp, so claudetto gives no trust to the remote of its transport: an `ssh` remote when `~/.ssh/config` has an `Include`, a `Match exec`, a `ProxyCommand`, `ProxyJump`, `LocalCommand`, `KnownHostsCommand`, or `ControlPath` line (a value of `none` is no block), or when `core.sshCommand`, `GIT_SSH`, or `GIT_SSH_COMMAND` is more than `ssh` with `-4`, `-6`, `-v`, `-q`, `-i <file>`, or `-p <port>`, or when the file of `ssh` is under the home folder or the project, a `git://` remote when `core.gitProxy` or `GIT_PROXY_COMMAND` is set, and each remote when the file of `git` is under the home folder or the project. A credential helper, `core.askPass`, and `GIT_ASKPASS` give a program the credentials only and cannot change the refs, so an `https` remote with none of the other blocks keeps its trust.
  The pin is taken at `session.start` when the folder has a `.git` entry, else at the first `Bash` call, so an `Edit` of `.git/config` before the first `Bash` call cannot change it, and a write to the pin keeps the first pin when two writes race. Limits: the content of a script, of the `ssh` or `git` file, and of a file that `/etc/ssh` or an `ssh` option names is not read, a program in a folder that the user can write but that is not under the home folder or the project (such as `/usr/local/bin` on an Intel Mac) is not seen as writable, a `ControlPath` socket and the CA files of `http.sslCAInfo` are not read, and an `Edit` of a config file before `session.start` ends is not seen.
  When git gives no commits at the first `Bash` call, no commit is trusted for the session, a `git pull` or `git checkout` of a protected file is undone, and the result of that call gets one line that says so.
  A `git merge` of a branch that a call of the session made is undone, because its commits are not from before the first `Bash` call.
  A protected file that a call deletes is written back, unless `git checkout`, `git switch`, or `git pull` removed it: the new `HEAD` is from before the session or a moved remote ref that the remote has, and the index equals this `HEAD`. So `git symbolic-ref`, `git update-ref --no-deref HEAD`, and `git reset --soft` after an `rm` do not make the delete stay. `git read-tree` alone does not make it stay, because it leaves `HEAD` as it was. `git read-tree` after a move of `HEAD` with `git update-ref --no-deref HEAD` or `git symbolic-ref`, and `git reset --mixed`, to a commit from before that lacks the file do make it stay. `git reset --mixed` also moves the branch ref, which `git checkout` does not, so the end state is not the same (accepted). A staged change of the user makes the delete of a real `git checkout` get written back (fail-safe).
  A new `tasks.md` or spec that `git pull`, `git checkout`, or `git merge` brings in from a commit from before the session stays. A new `tasks.md` that a call writes is deleted only when it has a checked box, and a new spec or other protected file that a call writes is deleted.
  The text is hashed as it is and with `\r\n` changed to `\n`, with no filter, so a tick that a checkout brings stays also when `core.autocrlf` changed the line ends. Each `git` call runs with `--no-replace-objects`, so `git replace` cannot make a commit of the agent look known. After the pin, each `git` call runs by the real path that `git` had at the pin, and `sh` and `rm` always run by `/bin/sh` and `/bin/rm`, so a program that a call puts earlier in `PATH` is not run. No commit is trusted at the undo in four cases: `PATH` names another `git` than the pinned file, `PATH` has no `git`, the pinned `git` is a file that a call can write (under the home folder or the project, or a path that is not absolute), and the pin has no `git` path. The last case happens when the first `git` call finds no repo or fails, when `git config --list` fails, when `~/.ssh/config` is over the size bound, or when the lookup or the stamp of `git` fails. A `git pull` or `git checkout` of a protected file is then undone. When `rm` cannot delete a protected file that a call created, the model gets a line that names the file.
- The model no longer sees a value of an env file (task 19.16).
  A rule on each tool, also `mcp__claudetto__grep` and `mcp__claudetto__glob`, replaces each value of 8 or more characters and its base64 form in the result with `[value of KEY]`.
  A value of 4 to 7 characters is replaced as a whole word when its key name holds `KEY`, `TOKEN`, `SECRET`, `PASS`, `PWD`, `AUTH`, `CREDENTIAL`, or `PRIVATE`, so `PORT=8080` and `DEBUG=true` stay visible (task 19.20).
  The env files of the project are found at any depth with `rg --files --hidden --no-ignore`, else `find`, up to 1,000 files. When a bound is hit, the result gets one line that says that some values are not masked.
  A value stays replaced after `mv` or `rm` removes its file. A value of 12 or more characters also stays replaced after a reload of the mod in the same session, because `$.state` keeps a slow hash of it with its length and key, and no value. `$.state` is in the memory of Claude Code with no file, so the record keeps the first 32 bits of the rolling hash, and a result of 30,000 characters gets about 0 false finds. A shorter value is kept only in the memory of the mod.
  When the record bound is hit, the result gets one line that says that some values are not masked, and hashes that were not saved are saved again on the next call.
  A short value goes from the memory when its file still exists and no longer holds it, so an edit does not fill the memory.
  When the memory of short values is full, the result gets a line that says a short value may show after its file is gone.
  A result with many near matches gets one slow check, and each other near match is replaced with no check and with one line that says so, so that a long result stays fast.
  A value that a program changes first, such as reversed, split, or hex, is not found.
- **BREAKING** `minispec validate` gives an ERROR, not an INFO, when the archive would refuse a delta, so `validate` stops what `archive` stops (OpenSpec issue #1112).
  A change that passed `validate --strict` before can fail now.
- `minispec validate` gives a WARNING for a scenario with no `WHEN` or `GIVEN` step, or no `THEN` step (OpenSpec issue #2078), for a requirement that another open change also modifies, removes, or renames (OpenSpec issue #1669), and for a duplicate task number or a number out of order in `tasks.md` (OpenSpec issue #311).
- `minispec archive --yes --json` puts `openTasks`, the count of open tasks, in the JSON when `tasks.md` has an open task (OpenSpec issue #2006).
- A `MODIFIED` block can declare a scenario rename with the bullets `- RENAMED SCENARIO FROM: ...` and `- RENAMED SCENARIO TO: ...`, so `validate` and `archive` do not count the old scenario as dropped (OpenSpec issue #1697, PR #1843).
  The archive removes the bullets from the main spec, and the skills `propose` and `update` name the form.
- `minispec status` marks an artifact `done` only when each `##` section of its template has text (OpenSpec issue #1084).
- `minispec` follows the surface of OpenSpec 1.15.0 for the commands that it keeps.
  The schema `spec-driven` reads as the preset `story`, an unknown flag exits `2` (the flags `-r`, `--requirement`, and `-y` are known), and `-h`, `--help`, and `help` print the usage with exit `0`, and `--version` prints the version.
  The new flags are `validate --archived`, `status --all`, `show --no-scenarios`, and `new change --goal`, and `new change` prints a `Next:` line.
  A flag with its value after `=`, such as `--sort=name`, reads as the flag and its value, and `-r=1` reads as `-r 1`.
  A flag value that starts with `--` and holds `=`, such as `--description "--x=y"`, stays whole.
- (maintainer) The parity tests pin OpenSpec 1.15.0, and each difference from it is a named entry of `DIFFERENCES` with its OpenSpec issue number.

### Fixed

- `claudetto-setup` with `--exclude-md`, `--deny-mcp`, `--off-plugin`, or a tool or skill turned off no longer also merges the whole settings snippet, because an exit code of `0` no longer counts as no action.
- `claudetto-decide` with `--image` prints its note on stderr again when it scales an image.
- (maintainer) `just schema` reads the settings schema of Claude Code `2.1.311`, which has a plugin manifest schema before it in the bundle.

- A line of 4 or more spaces and a fence run no longer opens a code fence at the top level of a spec, so the requirements after it stay visible (OpenSpec issue #2130).
  A fence in a list item still opens at the indent of the item content, and a backtick fence with a backtick in its info string opens no fence.
- A closing run of `#` on a section title, such as `## ADDED Requirements ##`, no longer hides the section (OpenSpec issue #2145).
- `minispec validate` gives the ERROR `Duplicate requirement in specification` for a main spec with a repeated requirement (OpenSpec issue #2132).
- A broken `openspec/config.yaml` fails with `Cannot parse <file>` and exit `1`, and no stack trace.
  OpenSpec 1.15.0 warns and goes on (OpenSpec issue #1892).
- The gate judges the program that runs, not the word that the text spells (a paid eval trace of 2026-10-26 let `G=/Applications/Xcode.app/Contents/Developer/usr/bin/git; $G push --force-with-lease=main:cab2a44 origin main` through).
  A program word `$NAME` or `${NAME}` takes the last literal value that the same command assigned (`NAME=v`, `export`, `readonly`, `declare`), and a program with no known value asks.
  A `git -c alias.X=...` call with the verb `X` is judged as the git call or, for a `!` body, the shell command that the alias runs.
- The gate now reads the forms of the same bypass that it missed, and asks when the text holds too little to read them: `$D/git` with `D` assigned, `bash -c "$c"` and `eval` of built text, aliases from `~/.gitconfig`, `.git/config`, `GIT_CONFIG_*`, and `git config alias.X ...`, `-calias.X=...` with no space, an alias that calls another alias, and an assignment in a branch, loop, function, or subshell that may not have run.
  A `git` verb that is no command and no alias asks. When `git` cannot give its commands, a short fixed list stands in.
  The gate also fills the known variables of each argument (`X=--force; git push $X`), splits an unquoted value into words, and treats `unset`, `printf -v`, and `getopts` as a change of the variable.
  It also asks for `NAME+=x`, for a name that a loop or a function reads and the text assigns again anywhere, and for `declare -n`, `typeset -n`, and `local -n`, and a `-i`, `-l`, `-u`, `-a`, or `-A` flag or a bare `local NAME` makes the value unreadable.
  It also follows a copy `Y=$X`, splits a word such as `"a b"$X` only at the value, and reads the `git` aliases again when an `include` file changes (task 19.21).
  A `git` alias from the config is known only when the whole text is one plain `git` call, with no env prefix, no wrapper, no other command, and no `-C`, `--git-dir`, `--work-tree`, `--config-env`, or `-c` other than `-c alias.X=...`. In each other text, a verb that is not built in asks, so `git co main && git pull` asks and `git co main` does not (the user, 2026-10-26).
  In a project with an env file, a command asks when an operand comes from `$(...)`, backticks, `xargs`, or a variable with no known value, unless the gate can read the operand in full, such as a literal heredoc in `git commit -m "$(cat <<'EOF' ... EOF)"`. A command that takes only names, such as `echo`, stays as it is (the user, 2026-10-26).
  The gate also denies `cp`, `mv`, and `ln` of a secret file, asks for a `<` read of a target that it cannot read, and asks for a `git -c` key that can run a program, such as `core.pager`, and for a program env var, such as `GIT_SSH_COMMAND`, with a value other than `true`, `false`, `:`, or `cat` (the user, 2026-10-26).
  It reads the `git` aliases again when the text of a config file changes, also when a rewrite keeps the mtime and the size (`touch -r`).
  It does not read a `git` config file over 1 MB, and then it asks for a `git` verb that is not built in.
- The gate now asks for `git stash`, `git stash apply` or `pop` with no `--index`, and `git reset` with no path when the edit ledger shows a change of the user or of another session, because these verbs change the whole work tree (task 19.22).
- The gate now denies a read of `prod.env`, `.env-prod`, `.env_prod`, and `.envrc`, which the name test missed. A read of `.env.example` is still allowed (task 19.16).
- The gate now denies a glob that can match a secret file (`cat .e*`, `cat .*`, `Grep` with `glob: "*.env"`) and a `~user` path (`cat ~root/.ssh/id_rsa`), asks when a read program takes its file from `$(...)`, backticks, or `xargs` and the text holds a secret name, checks `notebook_path` of `NotebookEdit`, and reads a `<` redirect from the folder that a `cd` set.
- With an empty `TMPDIR`, the gate now reads the edit ledger at `/tmp`, where the cleanup writes it.
- The gate no longer denies a script that calls a method `.env(...)`, such as `` $`cmd`.env(env) `` of Bun, as a read of a `.env` file.
- The status line keeps the last limit reading in one file for each `CLAUDE_CONFIG_DIR`, so a reading of one account does not show for another.
- The task parse of a change now reads a `tasks.md` with CRLF line ends.
- The main thread again gets the security-testing policy of Claude Code.
  `claudetto:main` turns off the `intro` section, which holds that policy, and now has the same text in a `<security>` block.
- A handoff no longer takes a slash command, such as `/clear`, or a local command note as the task or as the last words of the user. A command with arguments counts as `/name args`.
- `claudetto-decide ask` now keeps a `state` that is an object, and the mod now sends the state of `AskUserQuestion` to Jev as an object with one named field for each question.
  Before, the CLI changed an object `state` to an empty string, and the mod sent one joined text.
- The status line now shows the context window in effect, for the main row and for each subagent row, not the window of the model.
  It reads `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, then `autoCompactWindow` of `modelSettings.<model>`, then the top-level `autoCompactWindow`, from the local, project, and user settings in that order. The percent and the handoff mark are of that window, so 120k tokens show as `40% of 300k`.
- A finished subagent now has a claudetto row, with `✓ done`, `✗ failed`, or `stopped` in place of the clock. Before, it kept the default row.

## [0.3.0-alpha.2] - 2026-10-23

### Removed

- **BREAKING** The `reply` slice is gone, so Claude Code no longer shows a `Reply` button under a message (D16, the user, 2026-10-23).
- **BREAKING** The `dry` slice, the command `jscpd-config`, and the file `jscpd.local.json` are gone (D16).
  The skill `dedupe` runs `jscpd` with the `.jscpd.json` of the project, and `just dry` runs `bunx jscpd --no-tips`.
- **BREAKING** `claudetto-setup` no longer removes the keys of 0.1.0 and 0.2.0, because `snippet-0.2.0.json` is gone (D16).
  To update from one of these versions, run the setup of `0.3.0-alpha.1` first.
- **BREAKING** The `compaction` value `handoff` is gone.
  Use `auto`, `handover`, or `built-in`.
- The settings snippet no longer holds the deny rules `Bash(rm -rf /*)` and `Bash(rm -rf ~/*)`, and `claudetto-setup` removes them from your settings (D2).
  The `*` also matched a delete in the temp folder, such as `rm -rf /tmp/x`.
  `guard` still denies a delete of `/`, `~`, and `$HOME`.
- A change folder of `minispec` no longer gets a `handoff.md`, because each handoff goes to `.claudetto/handoffs/` (D13, the user, 2026-10-23).

### Added

- A handover replaces the compaction summary (D12, the user, 2026-10-23).
  Code writes the handoff with no model call from the open change, its next task, the decisions and ruled-out options of `decide`, the passed checks, and the values of the user.
  Then it runs `/clear` and sends the handoff as the next prompt.
  A handover starts at the end of a turn with no running agent, when the context passes 150,000 tokens (`HANDOVER_CONTEXT_TOKENS`), when the open change moves to its next task group, or when the session is older than 8 hours.
  After a pause longer than the cache TTL, `claudetto` offers the handover when you send the next prompt, and it holds the prompt until after the resume.
  The held prompt comes back marked as your newest prompt.
  In a session that you resumed, the pause counts from the last answer of the transcript (`seconds_since_last_response` of `SessionStart`), so a resume after a short pause gets no offer.
  `/resume` opens the old session, and the automatic compaction of Claude Code stays as the safety net.
  `PATH_TABLE` in `slices/handoff/limits.ts` maps each case to `handover`, `compact`, or `handoff-then-compact`.
  From the paired runs of task 11.6, a move to the next task group with up to 75,000 tokens of context runs `/compact`, and each other case runs a handover.
  `/compact` gets the facts of the handover as its instructions, so the summary keeps the task, the decisions, and your values.
  The first request after a handover runs on `haiku`, which passed as often as `sonnet` at 5 to 10 times less cost (task 11.7).
- With a Jev key, Jev also answers the handover offer, from the size of the context, the idle time, and the open task (task 10.15, the user, 2026-10-23).
  You see the dialog only when Jev is not sure.
- Jev answers from the hooks with `$.http.fetch` (see "Changed").
- The core plugin ships six subagents in three categories (D6, the user, 2026-10-23).
  Inspectors: `claudetto:Scout` (Haiku, a read-only search), `claudetto:Scoper` (Sonnet, a split of a task into file sets and steps), `claudetto:Reviewer`, and `claudetto:Researcher`.
  Modifier: `claudetto:Worker`.
  Tester: `claudetto:Tester` (Haiku, runs the checks and lists each failure with file and line).
  `agents/main.md` has a routing block that sends `Scoper` first for work over more than one file set, `Worker`s in parallel on separate file sets, `Tester` after each group of `Worker`s, and `Reviewer` before a part is reported.
- The model sees the plan usage and plans its agents by it (D25).
  When the band of the 5-hour or the weekly share changes, the `prompt` slice adds one usage line to the next request.
  The bands are green below 40%, amber from 40% to 80%, and red above 80% (`kernel/budget.ts`).
  The body of `claudetto:main` plans the agents of one group up to the subagent cap at green, 2 at amber, and 1 at red.
  An API key has no rate limits, so it gets no usage line.
- At red for the 5-hour share, the `guard` gate asks before an `Agent` call while another agent runs, and before `just sandbox`, `just sandbox-alone`, `just eval`, `just eval-tune`, and `just eval-variant`.
  The ask goes to the gate log with the decider `person`.
  The weekly share never sets the gate, because it falls only at its weekly reset (D25).
- Each tick of a box in a `tasks.md` adds a cost line to the context, and each handoff holds one.
  The line gives the cost of the session and the change of each plan share since the first reading.
  The skill `apply` ends its report with these figures.
- The slice `finish` holds the old `goal` slice and two new hooks, with no model call (D8).
  The `box` hook denies a tick of a `tasks.md` box that has no passed check in the session, and it names the task id.
  The `Stop` hook sets a note for a reply that lists work as not done or for later with no named block, or that says "ready" or "done" with uncommitted changes or an unchecked box.
  It also blocks a stop up to `GOAL_BLOCKS_MAX` (5) times in a row when the turn ticked a box and the file still has an open box.
  The block applies only in a session that ran `/claudetto:apply`, and it waits while an agent runs.
- The slice `notes` shows one line above the prompt for 2 prompts, from hook counters and a `learn:` line at the end of a reply, with no model call (D9).
  The `learn:` block is removed from the shown reply, the transcript, and `-p` output while the reply streams. Only a lowercase `learn:` line with no indent and outside a code fence starts it.
  A note comes from the same deny or ask three times, a check command that fails three times with the same test, a background task in flight for 30 minutes, a file that you changed before Claude edits it, and the `Stop` hook of `finish`.
  Key `1` puts the note in the prompt box, key `2` turns notes off, and key `3` turns them on again.
- `guard` has gates for a loss in a database or in infrastructure (X1).
  They cover the clients `psql`, `mysql`, `mariadb`, `sqlite3`, `sqlcmd`, `duckdb`, and `clickhouse-client` with SQL that drops, truncates, or deletes with no `WHERE`, `dropdb`, `redis-cli` with `flushall` or `flushdb`, `prisma migrate reset`, `rails db:drop`, and `rake db:drop`.
  For infrastructure, they cover `terraform destroy` and `tofu destroy` (also `apply -destroy`), `pulumi destroy`, `kubectl delete namespace`, and the `aws`, `gcloud`, `gsutil`, and `az` commands that delete a bucket, a disk, a volume, an instance, or a database.
- `guard` asks before `git add -A`, `git add .`, and `git commit -a` when the work tree holds a change of the user, and before `git stash` and `pkill -f` from a subagent (X2, X4).
  It denies `git add` of a secret file, a bare `printenv` or `env`, and an upload of a secret file with `curl -d @` or `-F` (X12).
- `guard` answers a second `Monitor` with the command of a running one with a short refusal that names the task (X8).
- The edit ledger is one file for the project, `<tmp>/claudetto/ledger/<project key>.jsonl`, and it holds the changed files of each `Bash` call (D11).
  After `git status` and `git diff`, Claude gets the files that this session, another session, or you changed.
- `ground` reads the messages of the agent that makes the call, counts an `AskUserQuestion` answer and the handoff text as sources, and skips the numbers of `#### Scenario:` blocks, test files, and fixtures (D10).
- Each title is in Chicago Title Case (the user, 2026-10-23).
  The output style `Concise` asks for it in a reply heading, a hook sets it in each Markdown heading after `Write` or `Edit`, a `finish` note names a reply heading in the wrong case, and `guard` sets it in the `--title` of `gh pr create` and `gh issue create`.
  A code span stays as typed, and a commit subject stays in sentence case.
- `claudetto-setup --inventory` prints the plan, plugins, built-in mods, MCP servers, skills, rules, and OpenSpec installs as JSON with no identity (D4).
  `--mode merge|replace` writes the snippet, and `replace` first copies the old file to `<file>.<ms>.bak`.
  `--off-tool`, `--off-skill`, `--off-plugin`, and `--deny-mcp` turn one item off, `--exclude-md` writes `claudeMdExcludes`, and `--local-notes` writes a `CLAUDE.local.md` template with its `.gitignore` line (D20, D21).
  `--global-md` writes a `~/.claude/CLAUDE.md` of 20 lines or fewer, and `--remove-openspec` removes an OpenSpec install, because `minispec` replaces it.
  `--demo-alias` writes the shell alias `claude-demo` for `IS_DEMO=1 claude` after your yes (the user, 2026-10-23).
- The key `TYPESAFE_API_KEY` and the tier `plan` are plugin options, and the key has `sensitive: true`, so Claude Code keeps it in secure storage.
  The hooks read the key from the options, and an exported `TYPESAFE_API_KEY` still works.
- The settings snippet sets `syncClaudeAiSkills` and `syncClaudeAiPlugins` to `false`, `ENABLE_CLAUDEAI_MCP_SERVERS` to `false`, `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` to 2048, `disableAgentView` to `true`, and `idleCompaction` to `false`.
  It turns off the built-in mod `cc-plugin-you-should-know`, and caps `maxEffortLevel` at `high` for Opus 5.5 and `medium` for Sonnet 5.5 (D2).
  Run `/claudetto:setup` again to get these keys.
- The `prompt.context` block gives the plan, branch, latest tag, open change, shell, and `grep` engine (D5).
  The `tool.describe` hook defers each tool that fewer than 10% of 292 counted sessions use, such as `EnterWorktree`, `ExitWorktree`, `LSP`, and `Workflow` (D20).
  The tools of the agent roster, `ToolSearch`, `SubagentHandback`, and `StructuredOutput` are never deferred.
- The skills `explore`, `update`, and `sync` are in the core plugin with `disable-model-invocation: true`, and the command `minispec sync <name>` merges the delta specs with no archive (D20).
- `minispec` gets the commands `instructions`, `show`, `schemas`, and `schema validate`, text views for `status` and `list`, the flags `--specs`, `--archived`, `--all`, and `--sort` of `list`, `--specs`, `--all`, and `--changes` of `validate`, `--skip-specs`, `--no-validate`, and `--json` of `archive`, and `--description` and `--json` of `new change` (D22).
  `minispec status` prints a `Next:` line, and the skills `propose`, `apply`, and `verify` end with the command that follows.
- The status line colors the context, 5-hour, and weekly values green below 40%, amber from 40% to 80%, and red above 80%, with dim labels and reset times, and it writes the last `rate_limits` to `claudetto-rate-limits.json` in the temp folder (D15).
- `claudetto-docs` adds the Context7 MCP server `context7` (`https://mcp.context7.com/mcp`), next to the CLI `ctx7`.
  The option `CONTEXT7_API_KEY` is optional and `sensitive`, so Claude Code keeps it in secure storage and sends it only in the `Context7-API-Key` header of that server.

### Changed

- **BREAKING** `guard` answers each permission prompt of Claude Code: it allows a call that no danger gate matches, in the main agent and in each subagent (D1).
  A `tool.check` hook with no tool matcher and a `classic.PermissionRequest` hook run the same gates, so `-p` runs behave as the interactive ones.
  The prompts for `Monitor`, MCP tools, paths outside the project, and shell variables are gone.
  A gate that matches shows the prompt to a person, and a `deny` rule of the engine still wins.
  The gate reads the commands inside `eval`, `sh -c`, and `bash -c`.
- **BREAKING** The agent names are in UpperCase: `claudetto:Scout`, `claudetto:Worker`, `claudetto:Reviewer`, and `claudetto:Researcher` (D6, the user, 2026-10-23).
  The lowercase names are gone, so update each `Agent(...)` rule that names one.
  `Reviewer` and `Researcher` run at `medium` effort, and a call with no type still goes to `claudetto:Worker`.
- **BREAKING** The `compaction` option has the values `auto` (default), `handover`, and `built-in` (D12).
- `decide` and `guard` call Jev from the mod with `$.http.fetch` in place of a `claudetto-decide` child process for each question (D16, task 10.15).
  `claudetto-decide` stays for image and `box` questions and for the calls of Claude.
  The retry on 429 and 529 and the bound `ATTEMPT_TIMEOUT_MS` (12,000 ms) stay, with a `$.clock` race, because `HttpInit` has no timeout.
- The thresholds of Jev come from the TypeSafe docs (`confidence.md`, `primitives-noul.md`).
  A choice is sure at `confidence` 0.5 or more, with no second margin over chance.
  A yes or no answer is a yes from `P(yes)` 0.7 and a no up to 0.3, and anything between shows the dialog.
  The `guard` gate allows a call at `P(yes)` 0.8 or more, because a false yes there loses files.
- `claudetto-setup` writes `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` as 3 for Pro, 4 for Max 5x, and 5 for Max 20x, in place of 2, 4, and 6 (D4).
  The Max 20x sessions of the user hit "Concurrent subagent limit" 14 times at 6.
  It also sets `statusLine.refreshInterval` to 5 seconds, from 1.
- `/claudetto:setup` recommends off for `EnterWorktree` and `ExitWorktree`, because `isolation: "worktree"` of `Agent` works with both off (D20).
- The `Concise` output style holds only the reply format, and its behavior rules moved to `agents/main.md` (D21, the user, 2026-10-23).
  The rule "Run each free check yourself" replaces the line that let a free check go unrun.
- The texts that Claude reads say what to do and give the reason in one clause, and keep their behavior in fewer words (D7, the user, 2026-10-23).
  The plan mode text names `claudetto:Scout` in place of `Explore`.
- A Haiku session starts its handoff at 90,000 tokens, from 100,000, and the snippet sets its `autoCompactWindow` to 132,000, from 144,444, so that it stays under the price step of 100,000 tokens (D2).
- The status line colors with the bands of `kernel/budget.ts` in place of the old levels of 75% and 90%, and the theme code is gone (D15).
- `claudetto` now targets Claude Code 2.1.309 (`MIN_CLAUDE_CODE_VERSION`, the CI, the issue templates, and the schemas in `schemas/`) (D17).
- `minispec new change` maps each `.` of a name to `-` and prints the name that it used (D14).

### Fixed

- The status line keeps the task count of the openspec change in a narrow terminal, because the compact form of the change segment leaves out the change name.
- The status line finds the openspec change when Claude Code starts in a folder below the project root, because it looks for `openspec/changes` in each parent folder.
- `minispec` gives the same result as OpenSpec 1.14.3 for five inputs (D22).
  `validate` reports a duplicate requirement in `ADDED`, and the refusals that `archive` would give for a missing `MODIFIED` requirement and an existing `ADDED` requirement.
  It reports a `### Scenario:` that is not a level-4 heading, and `archive` leaves a spec as it is for a `REMOVED` requirement that does not exist.
- The cleanup at session start names only what it removed, with a correct plural, and a handoff path is relative to the project (task 4.1).

## [0.3.0-alpha.1] - 2026-10-22

### Removed

- **BREAKING** The add-on plugin `claudetto-codegraph` is gone, with its skill `codegraph` and the command `claudetto-codegraph-check` (faults 18, 46, 47, and F17).
  `/claudetto:setup` no longer offers `codegraph install`, and `claudetto-setup --addons` is gone.
  Run `claude plugin uninstall claudetto-codegraph@claudetto` to remove it.
  An index in `.codegraph/` of a project stays, and the `codegraph` CLI works without the plugin.
- **BREAKING** The `advise` tool and the `--advisor` flag of the compare runs are gone.
  The snippet sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` to `1`.
- **BREAKING** The add-on plugins `claudetto-sessions` and `claudetto-lab` are gone, with the skills `sessions` and `eval-compare` (D6, the user, 2026-10-22).
  The MCP server of the `cc-docs` plugin covers sessions and the Claude Code binary.
  Run `claude plugin uninstall claudetto-sessions@claudetto` and `claude plugin uninstall claudetto-lab@claudetto` to remove them.
  The repository tools of `claudetto-lab` moved to `tools/`: `tools/sandbox/`, `tools/capture/`, `tools/schema/`, and `tools/eval-compare/`.
  The recipes `just sandbox`, `just capture`, `just schema`, and `just eval-variant` keep their names and arguments.
  The `replay` entry point `slices/ground/adapters/check.ts` of the core plugin is gone with its only caller.
- **BREAKING** The skill `patch` and the command `claudetto-patch` are gone.
- **BREAKING** The `sembr` slice is gone, so a `Write` or an `Edit` of a Markdown file is no longer rewritten.
- **BREAKING** `/goal` has no stops: `--max-turns`, `--budget`, `--until`, and `--stall` are gone.
  Use `/goal clear` to stop a goal.
- The print guard, the `command.describe` hooks, the text that a subagent spawn added to its prompt, and the shorter memory texts are gone (D6).
  29 built-in commands are no longer turned off.
- The `ProposeGoal` deny is gone.
  The snippet sets `modelProposedGoals` to `disabled`.
- **BREAKING** The settings snippet no longer writes `sandbox`, the `permissions.ask` and `permissions.allow` rules, `model`, `availableModels`, `bashOutputMaxChars`, `DISABLE_UPGRADE_COMMAND`, or `feedbackSurveyRate` (D8).
  Each key of the snippet now comes from a row of the replace matrix or a decision of the design, and a test fails on a key with no source.
- **BREAKING** `claudetto-setup` no longer offers the Docker socket in `sandbox.network.allowUnixSockets`, or `docker *` in `sandbox.excludedCommands`.
- `claudetto-setup` no longer removes `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, because the snippet sets it again.
- **BREAKING** `claudetto-browser` has no CloakBrowser, no `backend` option, and no `WebSearch` handler (the user, 2026-10-22).
  The built-in `WebSearch` answers each search, because each search engine gives the plain headless browser a bot check.
  The skill `browse` drives `agent-browser` with its own Chrome, and it reads a page with `WebFetch` when the page needs no JavaScript, login, or click, because `WebFetch` puts fewer tokens in the context.
  For a page that needs the browser, it reads one element with `get text <selector>`, and stops a long output with `--max-output`.
  `claudetto-browser` now tells the agent to install `agent-browser` with `bun add -g agent-browser`, and then to run `agent-browser install`.
- The `prompt.compose` and `prompt.section` rewrites of the system sections are gone (fault 44).
- The `Agent` description no longer sends a short task to a fork, and no longer tells Claude to wait for a delegated search and do nothing else (faults 37 and 10).

### Added

- The core plugin ships four subagents: `claudetto:scout` (Haiku, read-only search), `claudetto:worker` (one planned edit step, the default for a call with no type), `claudetto:reviewer` (a fresh review of a diff against its plan), and `claudetto:researcher` (web research to a report file) (D1, D2).
  Each has `omitClaudeMd: true` and no `maxTurns`.
  The engine agents are hidden, and the snippet denies `Agent(general-purpose)`, `Agent(Explore)`, `Agent(Plan)`, `Agent(claude)`, `Agent(claude-code-guide)`, `Agent(statusline-setup)`, and `Agent(fork)`.
- The `spec` slice is MiniSpec: the command `minispec` (`new change`, `list`, `status`, `validate`, and `archive`) on the OpenSpec layout, with the presets `task`, `story`, and `epic`, and the skills `claudetto:propose`, `claudetto:apply`, `claudetto:verify`, and `claudetto:archive`.
  A parity test runs it against `@fission-ai/openspec@1.14.3` (D10).
- The gate logs each `ask` with its tool, target, reason, and decider to `claudetto/gate/<session>.jsonl` in the temp folder (task 5.2).
- `claudetto-setup` names the official Context7 skill `find-docs` and a Context7 rule in `~/.claude/` and in the project, with the characters that each adds to a session, next to the 155 of `claudetto-docs:find-docs` (D11).
  It deletes neither, so you keep the one that you want.
- A test runs the pinned `ctx7@0.6.1 --help` and checks the `library` and `docs` commands that the skill `claudetto-docs:find-docs` runs.
- Each session runs as the main agent `claudetto:main`, through the key `agent` of the plugin file `settings.json` (A9).
  Its body holds the tailored rules of 0.2.0 and the rules of D9: decisions go to `AskUserQuestion`, independent work goes on while an agent runs, and a long command waits with `Monitor`.
  The body stays when the mod hooks do not load.
- A `prompt.context` block `context_management` carries the text of the compaction state.
- At session start, claudetto removes each `fswatch-probe-*` folder older than one hour from the temp folder of Claude Code, and logs the count.
  Claude Code leaves these folders behind (anthropics/claude-code#104170), and the session does not wait for the cleanup.
- At session start, claudetto also removes the session folders and claudetto files of ended sessions that are older than `cleanupPeriodDays`, and each worktree in `.claude/worktrees/` that is older than `cleanupPeriodDays` and keeps no work.
  A worktree stays when a session file has its `cwd` in it, when it has a changed, untracked, or git-ignored file outside the folders that a tool makes again, such as `node_modules` and `dist`, or when it has a commit that no other branch or remote has.
- The settings snippet denies `sudo`, `doas`, `su`, `rm -rf $HOME`, the disk erase, SIP, Gatekeeper, `nvram`, and keychain delete commands, and an `Edit` or `Write` in `/System`, `/Library`, and the system folders of `/usr`.
  So the gate stays when hooks do not load, such as with `disableAllHooks: true`.
  Run `/claudetto:setup` again to get the rules.

### Renamed

Each skill name is a verb or starts with a verb (D11).
`claudetto:setup` and `claudetto-browser:browse` keep their names.

| 0.2.0 | 0.3.0 | Note |
| --- | --- | --- |
| `claudetto:dry` | `claudetto:dedupe` | The folder is `skills/dedupe/`. The `dry` slice, the command `jscpd-config`, and `just dry` keep their names. |
| `claudetto:spec` | `claudetto:propose`, `claudetto:apply`, `claudetto:verify`, `claudetto:archive` | The steps of `/opsx:*`, with no description at session start. Each step runs `minispec` in place of `openspec`. |
| `claudetto-docs:docs` | `claudetto-docs:find-docs` | The name of the Context7 skill `find-docs`. The `Skill(...)` rule of the snippet names the new skill, so run `/claudetto:setup` again. |
| `claudetto-lab:eval-compare` | `compare-evals` | The skill is gone with `claudetto-lab`. The tool is `tools/eval-compare/` and keeps its path. |
| `claudetto-sessions:sessions` | `claudetto-lab:replay-hooks` | The skill is gone with both plugins (D6). |

### Fixed

- `claudetto-schema` now reads the keys of the gated features, such as `useAutoModeDuringPlan`, `autoMode`, and `voiceEnabled`, so `schemas/` has the 171 keys of Claude Code 2.1.307 in the order of the docs schema.

### Changed

- **BREAKING** The `guard` slice is one permission gate: a `tool.check` hook on `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write`.
  It lets a call run, asks only before a loss for good (a delete of a path with uncommitted work, a `git reset --hard` over changes, a force push), and denies `sudo`, a disk erase, a write to a system folder, and a read of a secret (D4).
  The `ask` of a delete or of local `git` work goes to Jev first when the `decide` option is `jev` and the key is set, and a person sees the dialog otherwise.
  The dialog has no "always allow" row.
- `/goal` is one check command that the `Stop` hook runs, and `/goal`, `/goal status`, and `/goal clear` answer with no model turn.
- The `prompt` slice gives shorter `tool.describe` texts for `Agent`, `Bash`, `Edit`, `Read`, `Skill`, `ToolSearch`, and `Write`, defers `ListAgents` and `Workflow`, and leaves out the attachments `goal_status` and `tool_hosts_notice`.
- `claudetto` now targets Claude Code 2.1.307 (`MIN_CLAUDE_CODE_VERSION`, the CI, the issue templates, and the schemas in `schemas/`).
  The facts that name 2.1.303 to 2.1.305 are not checked again on 2.1.307.
- The output style `Concise` sends each decision to `AskUserQuestion` (fault 8).
  Its "What I Need from You" list holds a task for the user, so a turn that needs nothing ends on what is next.
- Biome bounds the cognitive complexity of each function at 15, and a test bounds each `.ts` and `.py` file of `plugins/`, `tools/`, and `tests/` at 400 lines (`MAX_FILE_LINES`, D7, fault 27).
- The settings snippet sets `permissions.disableAutoMode` to `disable` and `permissions.defaultMode` to `default`, so auto mode and its classifier calls are off (D5).
  It also turns off the commands `/feedback`, `/extra-usage`, and `/install-github-app`, the feedback survey and drafts, error reports, spinner tips, and the IDE extension auto install.
- The keys of the settings snippet are in the order of the settings schema, and its `env` names are in the order of the `configure/env-vars` pages of `claude-code-docs`.
  The snippet names the settings schema of `claude-code-docs` in `$schema`.
- Each control on the `Controls` page names the source of its incident, and no control records `none recorded` (fault 24).
- **BREAKING** `claudetto-setup` removes the keys of 0.2.0 that 0.3.0 does not set, such as the 170 `permissions.ask` rules, `sandbox`, and `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`, and lists each removed key (faults 4, 12, 13, and 41).
  A value that you changed or added stays, and a list loses its 0.2.0 entries only when it has all of them.
  Setup also removes all of `autoMode`, because auto mode is off and its rules do nothing (fault 15), and the `UserPromptSubmit` hook `codegraph prompt-hook` (fault 18).
  Copy `autoMode` and `sandbox` before you run setup if you want to set them again.
- `claudetto-setup` writes `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` from the plan of the login in `.claude.json`: `2` for Pro, `4` for Max 5x, and `6` for Max 20x (fault 17, D3).
  For another plan, and in the project settings, it writes no cap and says why.
  The snippet no longer sets the fixed cap `2`.

## [0.2.0] - 2026-10-21

This release cuts `claudetto` to the parts that Claude Code does not do already, so the `.ts` source under `src/` (without `lab/`) goes from 33,219 lines to 11,288 lines, it needs Claude Code 2.1.305 or later, and `/claudetto:setup` must run again after the update, because it cleans the settings of 0.1.0.

### Added

- The `decide` option is `jev` by default, and with `TYPESAFE_API_KEY` set, Jev answers each `AskUserQuestion` call with no dialog when it is sure about each question (D66, the user, 2026-10-20).
  The kind gate (`facts`, `preference`, `project`) is gone, a multi-select question goes to the user, and one unsure question shows the normal dialog with the sure picks as notes.
  Approvals stay with you: each request also asks Jev if a question asks for approval of money, a push, a release, a delete, or a step that cannot be undone, and a yes or an unsure answer shows the dialog with no note on that question, at no extra call.
  The answer that Claude gets names Jev, the pick, and the confidence, and the text of the tool tells Claude to put the deciding facts in the question.
- On macOS, `/setup` offers the Docker socket in `sandbox.network.allowUnixSockets` of `.claude/settings.local.json` for a project that uses Docker, because the sandbox blocks the socket and `docker` fails with `permission denied` (D43).
- The `goal` slice replaces the built-in `/goal` with checks that run a command, read a file, or ask a small model, with the steps of a plan file, a budget, and a stall rule, and it turns off `ProposeGoal` and the `goal_status` attachment, and `/goal` shows the goal engine's own description, while the `advise` slice, with the `advisor` option `claudetto`, gives the tool `advise` in place of the built-in advisor, with the model, the effort, and the bounds that the user sets, and `/setup` sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.
- The `ground` slice denies a `Write` or `Edit` of a plan file when the text cites a `file:line` or a convention that the source does not hold, and the `spec` slice ships the OpenSpec schemas `task`, `story`, and `epic`, and a `config.yaml` template of the project rules, in the `spec` skill.
- The `reply` slice adds a `Reply` button under each message of Claude, which puts that message in the prompt as a `>` quote at the cursor (D56), and the `dry` slice adds `jscpd-config`, which merges `jscpd.local.json` and its `extends` chain, the skill `dry`, and `just dry` in `just check`, with `.jscpd-baseline.json`, so a new clone fails the check.
- The `patch` slice (D64) keeps one patch in `.claudetto/patches/<agentId>/` of the main checkout after each `Edit` and `Write` of a subagent in a worktree, and `claudetto-patch` lists and lands it with `git apply --check` first, `--3way` only on request, and no auto-resolve.
- `just release-check` fails while a row of `findings.md` is open (D38) and is not part of `just check`, and `setup` offers `codegraph install --target claude --location global` when `claudetto-codegraph` is enabled (D51).
- The settings snippet sets `CLAUDE_CODE_PROMPT_CACHE_TTL=1h`, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`, `DISABLE_EXTRA_USAGE_COMMAND`, `DISABLE_UPGRADE_COMMAND`, and `DISABLE_INSTALL_GITHUB_APP_COMMAND`, has 25 exact git `ask` rules that name the destructive flags, such as `git push* --force` and `git reset* --hard`, and adds `permissions.ask` rules for `docker run`, `create`, `compose run`, and `compose up` with a mount or `--privileged` (D43).
- `claudetto-setup --apply` appends `/.claudetto/`, `/.jscpd.json`, and `/.claude/settings.local.json` to the `.gitignore` of a project with `.git/`, under a comment header, adds no duplicate line, and changes nothing in a project with no `.git/`.
- The option `--image <path>` of `claudetto-decide` adds a PNG or JPEG picture to the verbs `yes`, `pick`, `ask`, and `box`, and it repeats (D1, D2, D8).
  The command reads the first bytes of each file to check its type, not its name, and it exits with code 2 before any request for a file that is not a PNG or JPEG, or that is over 16 MiB (`IMAGE_BYTES_MAX`, D4), or whose size is over 1568 px or under 280 px on a side.
  On macOS, the command first scales a picture that is too large with `sips` into a copy, leaves the original as it is, and prints one line on stderr (`SCALE_TIMEOUT_MS`, D4).
  Elsewhere the message has the `sips` and ImageMagick commands to scale it.
  A request with a picture is multipart, with the header `TypeSafe-Danger-Zone-Images: true`, and a request with no picture and no `box` question keeps the JSON body that it had (D1).
  The `--state` option stays text, so a path in it is never read as a file, and the `decide` hook sends no picture (D6).
- The verb `box` of `claudetto-decide` asks Jev for the box of one target in a picture, with the model `jev-1.14.0` (D3, D5, D7).
  It needs at least one `--image`, prints the four fractions and the confidence, adds the pixels of the first picture when its size is readable, and prints the raw answer with `--json`.
  A box can come back when the target is absent, so the confidence matters.
  Images are a preview feature of the TypeSafe API, so their format and limits can change.
- The classic hook `PreModelSwitch` of the `handoff` slice asks the user to confirm a typed `/model` command when the prompt cache is warm (D47).
  The question has the new model, the size of the context, the cache time to live, and the `estimated_cache_write_usd` that Claude Code gives to the hook.
  The hook asks only when `source` is `command` (a typed `/model`), because `ask` is a refusal for any other `source`, and that switch goes on with no message.
  A switch on a cold cache goes on with no message too, and the question has no cost sentence when the hook input has no number for the tokens or the cost.
  The hook needs Claude Code `2.1.251` or later, and `claudetto` already needs `2.1.305`.

### Changed

- The default of the `advisor` option is now `claudetto`, so the tool `advise` is on, and the default of `advisorEffort` is now `low`.
  The system prompt asks for an answer of at most 10 short lines.
  On `advice-audit-web` with 10 runs for each arm, `advise` with `effort` `low` and this prompt named 4.9 of the 6 faults in `FINDINGS.txt`, against 4.8 for the built-in advisor.
  It sent about 2000 tokens in and got about 1200 tokens out for a call, against about 23300 and 5200 for the built-in advisor, and it cost about 0.37 USD per 10 runs against 2.02 USD.
  The slice sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` at `session.start`, so that Claude sees one advisor, and `claudetto-setup` sets it too.
  The session cost still leaves out the `opus` calls of `advise`, but the compare script now measures them from the debug log.
  Set `advisor` to `builtin` to keep the built-in advisor.
- The skill `dry` runs `jscpd-config --run`, which sets `BUN_TMPDIR` from `TMPDIR` itself, so the scan needs no env prefix and no prompt, and the ask rule for a git delete refspec is `Bash(git push* :* *)`, because Claude Code read `Bash(git push* :*)` as a literal prefix that matched nothing.
- The settings snippet sets `sandbox.allowUnsandboxedCommands` to `false`, so a command that fails in the sandbox is not run again outside it with no prompt.
- `claudetto` now targets Claude Code 2.1.305 (`MIN_CLAUDE_CODE_VERSION`, the CI, the issue templates, and the schemas in `schemas/`).
  The facts about the compaction formula, the output reserve, and `bashOutputMaxChars` hold on 2.1.303 to 2.1.305.
  The hook fields, the events, the tools, and the prompt section ids are the same as in 2.1.304.
  The schemas in `schemas/` gain `attributionProject`, `attributionProjectPolicy` (managed settings only), and `sandbox.allowNestedUserNamespaces`, and the descriptions of `allowedMcpServers` and `allowManagedPermissionRulesOnly` changed.
  No plugin sets these keys.
  Claude Code 2.1.305 changed the resolver of the auto-compact window, and no live check shows whether it still caps Opus 5.5 at 200K.
  The `autoCompactWindow` key of the snippet still wins first, so the snippet stays as it is.
  No plugin calls `$.agent.spawn`, whose `{ deny }` result is also the refusal of the engine past a Stop or a host limit.
- **Breaking:** `claudetto` has these slices: `advise`, `decide`, `dry`, `goal`, `ground`, `guard`, `handoff`, `patch`, `prompt`, `reply`, `sembr`, `setup`, `spec`, `statusline`, and `styles`, and `claudetto-sessions` is one `sessions` skill with the scripts `audit` and `replay`, and the `awareness`, `start-cost`, and `usage` slices are gone, because `/context`, `/usage`, `/insights`, and `/status` give the same facts.
- **Breaking:** `guard` keeps the deny of a `Bash` command that only prints a file and names the `Read` call to use, and it fails closed, so a crash or timeout denies a print command.
- **Breaking:** `handoff` keeps the compact answer and reads `openspec/changes/` in place of `minispec/changes/`, a handoff after the cache TTL is written with no model call while a warm cache still forks, and the done list holds only checked tasks of `tasks.md` and checks whose last run passed (D47, D48).
- A second compaction updates the earlier handoff instead of nesting it, with its open items and the words of the user in one quote block, and the handoff file joins the quote blocks that a blank line splits (`MD028`).
- **Breaking:** `prompt` is rebuilt on the short prompt of Claude Code 2.1.302 (`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`), it answers `lean_body` with one tailored text, so the per-model variants are gone, and `surface` is merged into it, and it hides 29 commands, leaves out 1 attachment kind, and takes no agent type, because a setting or Claude Code already covers 18 commands, 4 attachments, and one agent type, and it turns off 2 more plugins (`tools/builtins/verdicts/`).
- The system prompt and the `Concise` style add a least-code rule, the pushback tiers, a missing tool as a step that the agent installs, the next action with no apology after a correction, and the check rule of the prompt audit, which the `story` schema of the `spec` skill also holds.
- The system prompt tells Claude to remove each file and folder that it made outside the project, such as a scratch folder in the temp folder, before it ends the task, and to name what stays (D44).
- The `Concise` output style ends a turn that needs the user with a short numbered "What I Need from You" list, with a `! just sandbox` example, and a turn that needs nothing gets no such list (D36).
- **Breaking:** `setup` merges the settings snippet, the `trim` slice, and the cleanup of 0.1.0 (the `hook.claudetto-*` git config pairs, the rule texts of the 0.1.0 policy, the `CLAUDE.md` block, the 0.1.0 key `env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, and the ten 0.1.0 `permissions.ask` git rules, which it removes only when all ten are present), and `setup` no longer installs the commit and push hooks.
- The status line shows the percent of the effective window, such as `40% of 300k`, and it shows the real `display_name`, `used_percentage`, `context_window_size`, the subagent model and window, the cache TTL and hit ratio, fast mode, spend dollars, and `⇥` percent left to the handoff (D65), and a Haiku subagent row shows the Haiku window, the handoff notice names its size and mode (warm fork or cold write), and `--help` of `claudetto-setup`, `claudetto-statusline`, `claudetto-codegraph-check`, and the `replay` script of `sessions` prints the usage.
- `claudetto-browser` tells the agent to install `agent-browser` with `npm install -g agent-browser`, and `sembr` puts each Markdown heading in Title Case in place.
- In the repository, `just validate` pins the line count of each part and fails on a short file, a folder with one file, a hook slice with no `controls` (in the generated `wiki/rationale/Controls.md`), and an eval case that checks only the reply, the generator formats its output with `Biome`, a `markdownlint` rule checks Title Case, and the old name `dotclaude` is gone outside the wiki.
- `claudetto` no longer sets `CLAUDE_CODE_FORK_SUBAGENT`, so forking is the user's own setting, and the `Agent` text names no `fork` type, because a session that sets the gate to `0` offers none, and a stopped subagent is resumed only within 5 minutes.
- The `prompt` slice now replaces the shared `lean_body` section with `prompt.compose`, because Claude Code 2.1.302 and later send only the session sections through `prompt.section`, so the tailored text never reached the model, and a subagent gets the rule to remove what it made outside the project (D44).
- When the install of a missing tool cannot run, the system prompt tells Claude to make the result with a tool that is there, such as `python3`, and to say so, and a different defect that was there before the task stays out of scope and goes in the follow-up, also when its test fails, because the eval of 2026-10-20 showed that the old texts made the plugin arm score lower (`missing-tool-is-a-step-hard`, `scope-followup-hard`).
- The result of the `advise` tool no longer has the token counts, so the model reads only the model name and the advice.
  The adapter shows the counts to the user with `$.ui.log`, once for each answered reply.
- The `bunx @fission-ai/openspec` commands of the `spec` skill now pin the version `1.14.3`, the version that the tests use.
- The `proposal` instruction of the `task` preset now gives the reason for no capability, and says what to do when the change alters behavior: tell the user that it is a `story`.
- The `apply` instruction of the `epic` and `task` presets now has the check rule of `story`: a fast check of the changed files after a change of behavior, the full checks at the end of each task group, and no check for an edit that changes no behavior.

### Removed

- The pages about Claude Code itself (`src/wiki/claude-code/`) are out of the wiki, because they are not about `claudetto`, and the wiki now links the [Claude Code docs](https://xsyetopz.github.io/claude-code-docs/) site, which has an optional MCP server and a skill (`bunx skills add xsyetopz/claude-code-docs-skills`).
- **Breaking:** the slices `agents`, `asks`, `attribution`, `checks`, `corrections`, `gc`, `minispec`, `policy`, `reads`, `repostate`, `turngate`, `usercheck`, and `worktree`, with the `minispec` CLI and skills, the `gc` skill, the custom agents, and `claudetto-run-checks`, and the `testJudge` option with the `asks` slice, the add-on `claudetto-you-should-know`, and the recipes `just measure`, `just usage`, and `just start-run`.
- **Breaking:** the `second_opinion` tool, its fallback model, and the `decide` value `claude` (values are now `off` and `jev`), the `/handoff` command and its session-start registration, and the `claudetto-codegraph` hooks (sync at session start, after an edit, and after git) and `--mcp` of `claudetto-codegraph-check`, because `codegraph` syncs its own index.
- Repository checks: the file line caps, the part line pins, the prompt text size pins, the prose-in-code `biome` rule, and the `title-case` markdownlint rule, with their bounds in `tools/limits.ts`, because they made code split and grow instead of stay small (the user, 2026-10-19).

### Fixed

- The `advise` tool no longer lets a tool result close its `<tool_result>` block, it marks an error result with `error="true"`, and it unsets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` when the option changes to `builtin` in the same process.
- The `advise` tool now sends the advisor the recent tool results (file reads and command output), newest first, in `<tool_result>` blocks that the prompt marks as data.
  Before, the advisor saw no tool result and said that it had not seen a file that Claude had read.
  The bounds are `RESULTS_BYTES` and `RESULT_BYTES` in `slices/advise/limits.ts`.
- A `/goal` condition such as "`cmd` exits 0" no longer makes a `judge` check that cannot pass, so the goal does not stop by `stall` when the command exits 0.
  A span after `returns`, `with`, or `code` is a value, so it is not a `run` check.
- The `ground` slice no longer denies a number in the name of a standard (`ISO 8601`, `RFC 3339`), a number that the source writes with `_` (`1_000_000`), a binary size in bytes (`16 MiB` and `16,777,216`), a total of a table column or a difference of two cells of a row, or the word `npm` in a sentence that is no command.
  On the transcripts of 2026-10-21, 8 of 53 checked plan writes got a false deny, and 0 of 53 do now.

- `claudetto-schema` resolves a lazy reference to a name that the settings module imports in the module that exports it.
  Without it, the 2.1.304 bundle gave `hooks` no `type` and no `additionalProperties`.
- The eval judge `report-says-nothing-broken` of `false-alarm-sum` has a rubric with no overlap, so a reply that says `I could not find a cause` and that the tests pass is a pass.
- The verb `ask` of `claudetto-decide` now exits with code 2 for `--state` or `--json`, because it ignored them.
  An `--image` path that is a directory now gets the message "is a directory, not a file", not "does not exist".
- `/goal` rejects an `--until` date, or a date and time, that is not after now, so the goal does not stop at the first turn.
  `HH:MM` still moves to the next day.
- `/goal resume` resets a `--budget N%` goal.
  The budget counts the growth of each plan limit since the start or the resume, and a limit whose window restarts counts from 0.
- `guard` asks the person before `git push <remote> :<branch>` or `+:<branch>`, a delete refspec, also inside `bash -c`, `$(...)`, and `eval`.
  The ask rule `Bash(git push* :* *)` is removed, because Claude Code 2.1.304 warns on its inner `:*`.
- On Linux, `claudetto-setup` adds `docker *` to `sandbox.excludedCommands` of the user settings, for all projects, and `Bash(docker *)` to `permissions.allow` of `.claude/settings.local.json` in a Docker project, because Claude Code ignores `sandbox.network.allowUnixSockets` there.
  The user settings hold the entry because Claude Code reads `excludedCommands` only from trusted settings when `allowUnsandboxedCommands` is `false`.
  The `Setup` wiki page gives the accepted risk of the open Docker socket on macOS and of `docker *` outside the sandbox on Linux.
- `guard` asks the person before a `docker` command that runs or creates a container, also with global options before the verb (`docker -H x run`) and inside `bash -c` or `$(...)`, so that on Linux the call does not run outside the sandbox with no prompt.
- The `permissions.ask` rules of the snippet also cover `docker compose create` with a mount or `--privileged`.

## [0.1.0-alpha.1] - 2026-10-15

This release restarts the earlier name of the project as `claudetto`, with no compatibility with version 1.0.0 of the earlier name.
The [Overview](https://github.com/xsyetopz/claudetto/wiki/Overview) page of the wiki tells what changes.

### Added

- `claudetto` needs Claude Code 2.1.302 or later.
- The `handoff` slice replaces compaction with a handoff:
  a fork writes the handoff file, and the next session starts from it.
  It has a manual handoff command, a ground check of the values of the handoff, and the `compaction` option.
  The handoff files are in `.claudetto/handoffs/`.
  The handoff text ends with the last 3 prompts of the user, word for word, and the files that the session changed, which come from the messages and not from the model.
- The `prompt` slice gives one prompt variant for each model, built from the live block of Claude Code 2.1.302.
  The first request is smaller by about 2,000 to 2,500 tokens for each model.
- The `minispec` slice and CLI: a lightweight spec workflow with `new`, `list`, `show`, `status`, `validate`, and `archive`.
- The `gc` slice records the outputs of a session and sweeps them at session start, at session end, and with a dry-run command.
- The `worktree` slice adds the `WorktreeCreate` and `WorktreeRemove` hooks, which start from `HEAD` and copy the files that `.worktreeinclude` names.
- The status line shows the context against the model window, the distance to the handoff, and the prompt cache.
  It has a subagent status line and colors that follow the `theme` key.
- Setup writes the sandbox keys for the package caches and the SSH signing key, and `worktree.baseRef`.
- The checks of the `checks` slice run as one batch with one result.
- The `attribution` slice sends the attribution reminder of Claude Code, which `includeGitInstructions: false` turns off,
  to the main loop after each change of the lines and after a compaction, and to each new subagent.
- `/claudetto:setup` installs a `commit-msg` hook of git through `GIT_CONFIG_*` keys in `env`, so it runs only in the shells of Claude Code.
  The hook stops a commit without the commit line of the session.
  Setup also writes `hook.claudetto-attribution.enabled=true` and `hook.commit-msg.enabled=true`, so a repository config cannot turn the hook off.
  Git 2.54 or later is necessary, and an older git skips the hook.
- The `attribution` slice denies a bypass of the hook beside a commit: `--no-verify`, `-n`, `-c core.hooksPath`, `-c hook.*`, `--config-env` of hook keys,
  a change of a `GIT_CONFIG_*` variable, `env -u`, `env -i`, and `git commit-tree`.
- After `gh pr create` or `gh pr edit`, the `attribution` slice checks the body for the pull request line and tells Claude to add it with `gh pr edit --body-file`.
  It denies the GitHub MCP `create_pull_request` and `update_pull_request` without the line.
  The wiki page `Commit-Check` documents the check.
- `/claudetto:setup` writes the `claudetto` part of a `CLAUDE.md` file at the user, project, or local scope, between marker comments.
- The `policy` slice: before Claude sends work to a GitHub repository that the `gh` login does not own, and that is not in an organization where the login has the role `admin`, Claude reads the AI policy files of the repository, of the `.github` repository of the owner, and of the parent of a fork, and records a verdict with the `ai_policy` tool.
  The verdict must quote a found file.
  The gate covers `git push`, `gh` writes, GitHub MCP writes, and network client writes to a GitHub repository.
  Edits, commits, builds, and pushes to the own fork are never stopped, and a pull request from a fork goes to the gate of its parent.
  When the check fails, only these actions stop.
  The files are found by name: the agent and contribution files, the templates, and each file with `AI` or `LLM` in its name, from the places that the projects of `melissawm/open-source-ai-contribution-policies` use.
  The `aiPolicy` option turns the gate off.
- The AI policy asks before each push, pull request, or write to a repository with the verdict `silent`, and does not remember the answer.
- `/claudetto:setup` adds a git `pre-push` hook (git 2.54 or later) that checks a push of Claude from a script, an alias, or a subshell.
  The hook checks only a push from a `Bash` call of Claude, which `CLAUDETTO_AGENT_CALL` marks, so a `!` push of the user passes.
- The AI policy denies a push command that skips or changes the `pre-push` hook, and a command that sets or removes `CLAUDETTO_AGENT_CALL`.
- A script, a build, or an interpreter that runs in a checkout of another owner with no verdict `allowed` or `conditions` gets blank `GH_TOKEN` and `GITHUB_TOKEN`.
  This is a soft barrier, and only the sandbox of Claude Code, which the user turns on, is a hard barrier.
- `/claudetto:setup` tells the user when git is older than 2.54 or is missing.
- `/claudetto:setup sandbox` writes a hard stop to `.claude/settings.local.json` of a checkout of another owner with no verdict `allowed` or `conditions`.
  The stop turns the sandbox of Claude Code on, allows no command outside it, sets `failIfUnavailable`, and denies `github.com` and `*.github.com`.
  `--remove` takes out only the changes that the command recorded.
- After a verdict `silent` or `forbidden` in a checkout with no hard stop, the reply of the `ai_policy` tool tells Claude to suggest `/claudetto:setup sandbox`.
- `/claudetto:setup sandbox` checks the prerequisites of the sandbox before it writes the hard stop.
  On Linux and WSL2 these are `bwrap` and `socat`, and a test run of `bwrap`, which AppArmor can stop.
  When one is missing, it writes nothing and gives the install command for the package manager that it finds.
  The skill runs that command only after the user approves it.
  On Linux and WSL2 the seccomp filter helper of `@anthropic-ai/sandbox-runtime` is also required, and `sandbox.network.allowAllUnixSockets: true` is refused, because without the filter a sandboxed command can reach the `ssh-agent` socket or a Windows program.
  The test run uses the `bwrap` that Claude Code uses (`sandbox.bwrapPath`, else `PATH`), and on AppArmor restriction the message gives the profile for its real path.
  The check of the native build reads the running `claude` from `CLAUDE_CODE_EXECPATH`, and the `claude` on `PATH` only when that env var is not set.
  On WSL1, it writes nothing and tells why.
- The drift notice of `/claudetto:setup` shows in the transcript with `$.ui.log` and is not sent to the model.
  In an eval run, the model added the notice to its reply of the task.
- The wiki page [Engine Facts](https://github.com/xsyetopz/claudetto/wiki/Decisions-Engine) gives the facts of Claude Code behind these choices, so that a contributor does not replace them.
- The `claudetto-docs` add-on docs give the `claude mcp add` command for the `context7` MCP server.
- The `claudetto-docs` add-on docs give the `Authorization` header of `CONTEXT7_API_KEY`.
- The `claudetto-codegraph` add-on gives the command that adds its MCP server.
  `claudetto-codegraph-check --mcp` prints the commands that add and remove it.
- The `claudetto-sessions` add-on gives one note when the weekly rate limit reaches 80 percent.
- The `claudetto-sessions` commands show the account of a managed install.
- The `claudetto-sessions` add-on keeps the plugin version of each session, and the usage report counts the sessions by plugin version.
- The `setup` skill gives the shell alias that starts Claude Code with `--allowedTools Glob,Grep`.
- `just sandbox-linux` runs one live session of Claude Code on `haiku` in a Linux container, and checks that a sandboxed `Bash` call cannot reach a Unix socket (D51).
  The login of the host goes to the container on stdin, and no file of the host gets it.
- `just docker` runs a recipe of the `justfile` (default `check`) in a container with at most 4 CPUs,
  so that the checks do not take each CPU of the host.
- The `usercheck` slice: after a permission check denies a call, the `Stop` hook blocks one time a reply that has no `!` command, and it names the denied calls.
  It finds a `!` command from the Markdown syntax of the reply, so it works in each language, and it makes no model call.
- The `asks` slice asks before a call of `bunx`, `npx`, `pnpm dlx`, `yarn dlx`, `bun x`, or `npm exec` that runs a check tool that is not in `node_modules`, such as `bunx eslint` or `npx tsc`.
  The call downloads the tool, and it checks nothing of the project.
  A download of another tool, such as `npx create-vite`, gets no ask.
  For `tsc`, the reason states the installed `bun --version` and names `bun check` for Bun 1.4.3 or later (D56).
- The `turngate` slice checks the end of each turn and of each subagent.
  It blocks a stop while a background task runs, with no model call.
  A judge on Sonnet then reads the last prompt of the user, the end of the earlier reply, the reply, and a summary of the tool calls.
  It blocks a claim with no check after the last edit, a promise of work that the turn did not do, an opener that is an apology or an agreement, a step that the agent gives to the user with no block (`defer`), and a change of position with no new evidence (`cave`).
  It judges each reply that is not empty, also in a turn with no tool calls.
  A `tool.check` hook denies a `Bash` command with a lone `&` and no `wait`, with `nohup`, `setsid`, or `disown`, or with a stop of processes by a pattern, because Claude Code does not track such a process.
  The judge reads the reply in its own language, it blocks at most 2 times in a turn, and the block text holds only the reason.
  The `judge` option turns the judge off.
  One judge call used about 800 input tokens and 11 to 68 output tokens.
- The `corrections` slice adds the last 5 list items of `.claudetto/corrections.md` to the context of each prompt that the user writes.
- The `reads` slice keeps a rejected call rejected, denies a read of an unchanged range that is in the context, and asks for a new read after a rejected write.
- The `repostate` slice gives the git state at the start of a session.
  It asks before an edit of `[Unreleased]` in `CHANGELOG.md` when the manifests name a version with no tag, and before a package command that names a package that the registry does not have.
  It marks a served model that differs from the requested model with `$.ui.status`.
- Each agent has a `maxTurns`, and `just validate` fails on an agent with an `effort` below `medium`.

### Changed

- Each plugin has a new name: `claudetto` and `claudetto-<name>`.
- Each message of a slice to Claude or to the user is a `.md` file in the `prompts/` folder of the slice, and `just generate` writes `prompts.ts` from it.
  A `{{name}}` is a parameter at run time, and a `{{NAME}}` gets the value of a bound of the slice.
- Biome flags a text of more than `CODE_TEXT_MAX_CHARS` characters in the code of a plugin or of the kernel, so a message cannot go back into the code.
  The rule counts characters, not words, so it works for each written language.
- The parts of the transforms, the policy rules of the kernel, and the refusals of `runProgram` are `.md` files in `prompts/` folders.
- The description of each plugin is `src/plugins/<plugin>/description.md`.
- A hook lab test imports the texts of its slice from `../prompts.ts`.
- `just test` runs `just generate` first, because many tests import the generated copy in `plugins/`.
- The decision API of the `decide` slice is on when `TYPESAFE_API_KEY` is set, and `decide` set to `off` turns it off.
- The guard denies only a command part that only prints a file.
  It asks before a call that discards work, weakens a test, or changes a protected file.
- The `Bash` text of the `surface` slice copies the timeouts, the background line, and the `# Machines` section from the built-in text.
- `bashOutputMaxChars` is 16000.
- The `verification` section of the prompt tells Claude to try a check before it gives the check to the user.
  When a block stops the check, Claude gives the exact `!` command in the same reply, and the command writes to a new file that Claude reads after the run.
  The `Concise` output style asks for the command that verifies each claim that is not verified.
- The `Concise` output style is a short `<reply_style>` block of 705 bytes that says what to do, not what to avoid.
  It keeps `keep-coding-instructions: true`, because a model with no prompt variant gets its coding rules only from that field.
  Claude and the user work for one result, code that is right.
  The tone of Claude is free, and the tone of the user is not a topic.
  Strong words of the user about a problem tell Claude the severity of the problem.
- The `doing_tasks` section of the prompt tells Claude to do the `tasks.md` of a MiniSpec change in order, to write the test of each task before its code, and to mark a task done only after its check passes.
- A fix of a defect that no test covers starts with a test that fails on the defect.
  The test goes into the tests of the project, or into a new file for the test runner of the language when the project has no tests, and not into `$TMPDIR`.
  The test is a part of the fix, so Claude adds it with no offer.
  The style evals allow a new test after the original test of the covering file, and the skipped export test stays as it was.
- Claude decides an extra and does not offer it to the user.
  The order is Jev, then the small Claude model of `second_opinion`, then Claude from the facts of the project, then the user.
  Claude checks each answer before it uses it, and it chooses the approach that still works when the project grows.
  The user chooses from options that Claude gives with the need that each one fits.
  When the answer of the user does not settle it, Claude chooses the option that is easiest to change later.
- The `verification` section tells Claude to find the checks of the project before the first claim, and to run each check that covers the change.
- After a block of the turn gate, Claude gives the result first and then only the new facts, because the user already read the reply before it.
- The judge `plain-reply` of the style evals passes a last sentence that names an extra as a fact, or that asks for an input that only the user has.
- The `claudetto-browser` add-on uses CloakBrowser only when you select it, and it follows the `WebSearch` permission rules.
  Only the `cloakbrowser` backend answers `WebSearch` with a browser search, and the default backend passes each call to the built-in `WebSearch`.
  The browse skill allows only the `agent-browser` subcommands of its guide.
- The `claudetto-codegraph` add-on ships its skill and no MCP server, and it runs one sync at a time.
- The `claudetto-docs` add-on pins `ctx7` 0.6.1, uses the version of the project, and allows only the read subcommands.
- The `claudetto-you-should-know` add-on runs only when Claude Code turns its gate on.
- The eval comparison of the `claudetto-lab` add-on fails an arm that exits 0 with no valid result, and it names the arm and the reason.
  It also fails an arm whose baseline score is at the maximum on each case, because then no gain can show.
- The prompts have no prohibition list.
  A test finds a paragraph with 3 or more prohibitions.
- The sandbox tool of the `claudetto-lab` add-on fails when the debug log shows no loaded plugin.
- `start-run` is a repository tool in `tools/start-run.ts`, not a part of the `claudetto-lab` add-on.
- The usage report of the `claudetto-sessions` add-on counts turns and calls apart, and it names the Claude Code versions of the transcript.
- `claudetto-start` exits 0 when the start cost is in the bound, 1 when it is over, and 2 when the transcript has no request.
- `sembr` finds sentence ends with `Intl.Segmenter`, so it works for Polish, Russian, Japanese, and other languages, and it has no English abbreviation list or capital-letter rule.
- `claudetto-run-checks` decides pass or fail from the exit code only, and it shows the last lines of the output of a failed check, in place of the lines that match an English failure word.
- The `claudetto-you-should-know` check asks the side model for a topic `id`, and it finds a repeated topic by that `id` and not by the words of the topic.
  A reworded topic, or a topic in another language, no longer shows twice.
- The handoff digest keeps `key: value` lines with labels in each script, such as `Nazwa użytkownika: ola`.
- The evals that checked English phrases in the final message (`verification-claim`, `accusation-warranted`, `false-alarm-sum`, and the three agent evals) use `llm` graders.
- `minispec validate` checks the structure of a requirement and no longer needs the words `SHALL` or `MUST`, so a spec in any language is valid.
- `minispec archive` needs the flag `--yes` and asks no question, because a `[y/N]` answer depends on a language.
- A `minispec` change name can use letters and digits of any script.
- The git segment of the status line reads the exit code of `git` and no longer reads its message, so it works with any language of `git`.
- The ask for a changed check reads what a `package.json` script or a `justfile` or `Makefile` recipe runs, and no longer matches the words `lint`, `test`, and `check` in its name.
- The ask for a weaker config matches the documented key names of the tools (`fail_under`, `ignorePatterns`) and no longer matches a part of a key.
- The `prompt` slice writes a debug log line for each anchor of a transform that finds nothing, so a change of the built-in text after an update of Claude Code is visible.

### Removed

- The `rules`, `stamp`, and `spec` slices of the earlier name of the project (version 1.0.0), and its old `handoff` slice.
- The `dcc-plugin-agents-md` plugin.
- The AI-policy ask of the guard, which the `policy` slice replaces.
- The counts of passed, failed, and skipped tests in `claudetto-run-checks`, because they came from English words in the output of each test runner.
- The text fallback of the subagent id in the usage scan of `claudetto-sessions`, which read `agentId:` from the text of a tool result.
- Each setting and env entry that equals the default of Claude Code.
- The trim entries that had no effect on the request: `disableAgentView`, `CLAUDE_CODE_REMOVE_PROMPT_STRINGS`, and `CLAUDE_CODE_DISABLE_CFC_PROMPT`.
- The support of native Windows.
  The plugins run on Linux, macOS, and WSL.
  The code that only native Windows reaches is gone, such as the `cmd.exe` launch of a `.cmd` program, `taskkill`, and `run-tree.ts` of `claudetto-codegraph`.
  The guards keep the Windows paths, such as `C:\Windows`, because a command on WSL can start a Windows program.
  CI runs on Ubuntu and macOS.

### Fixed

- The `asks` slice no longer asks before an edit that only adds lines to a test file that exists, such as a new test above an old test or an `assert.equal(…)` call.
  The old check had a list of safe added lines for each language, so an added line such as `assert.deepEqual(…)` asked.
  In the `dontAsk` mode of the evals, this ask was a denial of the test that comes before a fix.
  A small judge model, `haiku`, now reads the added lines in any language, and asks when an added line makes a test weaker.
  When the model gives no verdict in 15 seconds, the call asks, and the reason tells Claude that a new test in a new test file needs no check.
  The eval case `test-judge` fixes a defect that no test covers, so the new test goes into the test file that exists.
  The same diff again in a session uses the kept verdict and makes no new model call.
  The plugin option `testJudge` (title "Test Judge") turns the judge off.
- The shared prompt now names `claudetto-run-checks` by its path under the plugin root, such as `<root>/bin/claudetto-run-checks`.
  The bare name failed with `command not found` (exit code 127) in a sandbox that blocks the read of the shell snapshot, which carries the `bin/` folders of the plugins in `PATH` (D57).
- A signed commit works in the sandbox through the ssh-agent:
  setup allows the folder of `SSH_AUTH_SOCK`, and the sandbox still does not read the private key.
- The handoff of a compaction in the middle of a turn no longer claims a result or an error for the tool calls whose results the fork cannot see.
  It marks each such call `RAN`, not `DONE`, because a `DONE` call can have failed.
- With the default backend, `WebSearch` no longer spends about 7 seconds on a browser search that each search engine blocks.
- A CloakBrowser search result now has only the results of the page (`#links`), without about 1,000 characters of menus of regions and dates.
- The CloakBrowser search finds a bot check from the missing results element (`#links`), and not from English text of the page, so it works in each language.
- The shell parser of the kernel reads the forms that it did not read before.
- An unknown model id is not shown as a known model.
- The semantic breaks of list items, quotes, and CRLF line endings.
- A `git` error in the status line shows as an error, not as an empty field.
- A failed `codegraph` run shows its error, not a missing CLI.
- The `claudetto-sessions` reports name a model that has no price and do not count its cost.
- An error in a `claudetto-sessions` command goes to the debug log, and the session goes on.
- The capture tool of the `claudetto-lab` add-on removes each credential from the error texts of a `count_tokens` call.
- A `count_tokens` reply with no whole `input_tokens` shows as an error, not as `NaN`.
- The guard and the asks read the global options of `git` from one list in the kernel.
- The `usercheck` slice reads a `~~~` fence as a code block.
- The `claudetto-you-should-know` check reads `git -C`.
- `WorktreeRemove` treats an ignored file as a copy only when its hash still equals the hash at the copy, so it keeps a changed copy.
- The `gc` slice keeps at most `GC_RECORDS_MAX` records.
- `claudetto-schema --version` without `--bundle` must match the installed Claude Code version, or the command fails and names it.
- The handoff passes the compaction on to Claude Code when a step of the handoff fails.
- The status line reads the `compaction` option of the plugin.
- `bump-version` takes `--root`, and `minispec` writes the local date.
- The usage scan of `claudetto-sessions` reads the subagent id from `toolUseResult.agentId`.
- The `prompt` slice allows `Glob` and `Grep` in `permissions.allow`, so a session that trim gives these tools can use them with no prompt.
- Setup adds `CLAUDE.local.md` to the git exclude file.
- The worktree hooks use the file and hash API of Bun, not `node:crypto` and the sync `node:fs` calls.
- Setup allows the sandbox to read only the `.pub` file of the signing key, adds its files to the git exclude file, and names the stale ssh-agent socket folders in its drift report.
- The `asks` slice knows `bun check`, `bun test --check`, `bun run --check`, and `bun build --check` as check commands, so an edit of a script that runs one gets an ask.
- The text of the `reviewer`, `implementer`, `debugger`, and `planner` agents tells them to run the check that a script or a recipe of the project names, and not to download a tool with `bunx` or `npx`.

## Older Releases

| Series | Releases |
| --- | --- |
| [1.0](https://github.com/xsyetopz/claudetto/wiki/Release-1.0) | 1.0.0 |
| [0.28](https://github.com/xsyetopz/claudetto/wiki/Release-0.28) | 0.28.0 |
| [0.27](https://github.com/xsyetopz/claudetto/wiki/Release-0.27) | 0.27.0 |
| [0.26](https://github.com/xsyetopz/claudetto/wiki/Release-0.26) | 0.26.0 |
| [0.25](https://github.com/xsyetopz/claudetto/wiki/Release-0.25) | 0.25.1, 0.25.0 |
| [0.24](https://github.com/xsyetopz/claudetto/wiki/Release-0.24) | 0.24.0 |
| [0.23](https://github.com/xsyetopz/claudetto/wiki/Release-0.23) | 0.23.2, 0.23.1, 0.23.0 |
| [0.22](https://github.com/xsyetopz/claudetto/wiki/Release-0.22) | 0.22.3, 0.22.2, 0.22.1, 0.22.0 |
| [0.21](https://github.com/xsyetopz/claudetto/wiki/Release-0.21) | 0.21.0 |
| [0.20](https://github.com/xsyetopz/claudetto/wiki/Release-0.20) | 0.20.8, 0.20.7, 0.20.6, 0.20.5, 0.20.4, 0.20.3, 0.20.2, 0.20.1, 0.20.0 |
| [0.19](https://github.com/xsyetopz/claudetto/wiki/Release-0.19) | 0.19.1, 0.19.0 |
| [0.18](https://github.com/xsyetopz/claudetto/wiki/Release-0.18) | 0.18.1, 0.18.0 |
| [0.17](https://github.com/xsyetopz/claudetto/wiki/Release-0.17) | 0.17.1, 0.17.0 |
| [0.16](https://github.com/xsyetopz/claudetto/wiki/Release-0.16) | 0.16.1, 0.16.0 |
| [0.15](https://github.com/xsyetopz/claudetto/wiki/Release-0.15) | 0.15.1, 0.15.0 |
| [0.14](https://github.com/xsyetopz/claudetto/wiki/Release-0.14) | 0.14.1, 0.14.0 |
| [0.13](https://github.com/xsyetopz/claudetto/wiki/Release-0.13) | 0.13.1, 0.13.0 |
| [0.12](https://github.com/xsyetopz/claudetto/wiki/Release-0.12) | 0.12.1, 0.12.0 |
| [0.11](https://github.com/xsyetopz/claudetto/wiki/Release-0.11) | 0.11.1, 0.11.0 |
| [0.10](https://github.com/xsyetopz/claudetto/wiki/Release-0.10) | 0.10.2, 0.10.1, 0.10.0 |
| [0.9](https://github.com/xsyetopz/claudetto/wiki/Release-0.9) | 0.9.0 |
| [0.8](https://github.com/xsyetopz/claudetto/wiki/Release-0.8) | 0.8.2, 0.8.1, 0.8.0 |
| [0.7](https://github.com/xsyetopz/claudetto/wiki/Release-0.7) | 0.7.0 |
| [0.6](https://github.com/xsyetopz/claudetto/wiki/Release-0.6) | 0.6.2, 0.6.1, 0.6.0 |
| [0.5](https://github.com/xsyetopz/claudetto/wiki/Release-0.5) | 0.5.1, 0.5.0 |
| [0.4](https://github.com/xsyetopz/claudetto/wiki/Release-0.4) | 0.4.0 |
| [0.3](https://github.com/xsyetopz/claudetto/wiki/Release-0.3) | 0.3.0 |
| [0.1 and 0.2](https://github.com/xsyetopz/claudetto/wiki/Release-0.1-0.2) | 0.2.0, 0.1.0 |

[unreleased]:
  https://github.com/xsyetopz/claudetto/compare/claudetto--v0.4.0-alpha.2...HEAD
