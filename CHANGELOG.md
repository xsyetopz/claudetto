# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.
The [Release History](https://github.com/xsyetopz/dotclaude/wiki/Release-History) page of the wiki has the notes of older releases.

## [Unreleased]

### Added

- The `handoff` slice of the core plugin ports the handoff of 0.28.0 to the hooks module and a CLI `dotclaude-handoff`.
  The handoff file goes to `.dotclaude/handoff/`.
  The `/handoff` skill names the file, and the `turn.complete` hook runs `/clear` and the resume prompt.
  The option `mainHandover` is `manual` by default, and it takes `auto` and `off`.
  A `tool.call` hook adds a report-now note to a subagent that nears its context bound or its `maxTurns`.
  The `turn.complete` hook runs the resume only after an `answer` turn, waits at most `HANDOFF_WAIT_TURNS` turns for the file, submits the write prompt once more, and then gives the `manual` hint.
  A `dotclaude-spec merge` also counts as a package that is done, and quoted text does not.
  On one session, a handoff against a compaction of the same session cost $0.0630 against $0.2288, took 9.1 s against 23.2 s, and left 18,487 tokens of context at the last call against 28,418 at the first call of the follow-up.
  Each side is one run.
  The measurement is in `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md`.
- The `attribution` slice of the core plugin adds the attribution to each `git commit` and each `gh pr create` that Claude makes, with no model call.
  A `tool.call` hook adds a `--trailer` with `Co-Authored-By` and the model of the main loop, such as `Claude Opus 5.5`, and it adds the Claude Code footer to a pull request body.
  A call of a subagent, or a model with no name and version, gets the name `Claude`.
  The `attribution` setting of the user stays in force, an empty value turns its part off, and `includeCoAuthoredBy: false` turns both parts off when no `attribution` setting is set.
  The text of `tool-bash.md` no longer asks Claude to copy the lines.
- The `dotclaude-spec` commands `ready` and `merge` do two steps of `/ship` with no model call.
  `ready <id>` prints the packages that can start, with no overlap of `owns` between them, and `merge <package> <branch>` needs the package in `review`, commits the lane files, merges the branch, runs `just generate`, sets the lane `done`, and commits `plugins/` with the lane files.
  `lane` also sets the checkbox of the package line in `packages.md`, `validate` reports a checkbox that does not agree with the lane, and `record` writes the empty sections of a hotfix record.
- The `spec` slice moves the lane of a package with no model call.
  An `agent.spawn` hook runs `dotclaude-spec lane <package> doing` when `/ship` starts the `implementer` of the package, and a `turn.complete` hook runs `lane <package> review` when that subagent ends.
  The hooks find the package in the `id:` line of the brief in the prompt, and run `lane` in the folder of the main session at the spawn, where `lane` works.
- The plugin `dotclaude-sessions` answers the typed commands `/dotclaude-sessions:usage` and `/start-cost` with a `command.run` hook.
  The hook runs the CLI and shows its output with no model turn.
  Arguments that need a shell go to the skill.
- The CLI `dotclaude-run-checks` of the new `checks` slice runs a batch of check commands in order, with no model turn.
  For each command it prints the exit status, the time, the counts of passed, failed, and skipped tests (`bun test`, `vitest`, `jest`, `pytest`, `cargo test`, `go test`), and the failure lines.
  The full output goes to a log file in `.dotclaude/checks/`, and the exit status is 1 when any command fails.
  A command of plain words runs with no shell, and a command with shell syntax runs through `sh -c`.
- The workflow `claude.yml` answers an `@claude` mention with `anthropics/claude-code-action`.
- The workflow `eval-new-claude-code.yml` runs `just eval` one time for each release of `anthropics/claude-code` that is higher than the version of `ci.yml`.
  Both workflows need the secret `CLAUDE_CODE_OAUTH_TOKEN`, and they skip when it is empty.
- The `handoff` slice gives a subagent a report note at 4 turns left.
  The note tells the subagent to commit its work first, and then to report.
  In a subagent, the `guard` hook denies a git command that changes the shared checkout or `refs/stash` (`git.shared-checkout`).
- The `/ship` skill runs one `reviewer` on the diff of each package, with no implementer report.
  Each wave starts with `dotclaude-spec runs`.
  It counts the runs against the tier cap that `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` sets, and against the `five_hour` and `seven_day` windows.
  The status line writes `.dotclaude/rate-limits.json` atomically.
- The `dotclaude-setup settings --apply` command writes `autoMode.hard_deny` rules to the user settings only.
  The rules come from the catalog in `src/kernel/policy/`, and `$defaults` stays in place.
  The command puts `system.privilege` in `soft_deny`.
- The `guard` hook denies the literal destructive forms of git, the system, and the disk in every session.
  A stopped agent stops, and it asks the user to run the exact command with `!`.
- The `guard` hook reads a command substitution inside a git command, so it denies `git $(echo reset) --hard`, `git $(echo reset)--hard`, and `bash -c "git $(echo reset) --hard"`.
  The shell reader keeps the source text of the substitution in its word.
- The shared prompt names `dotclaude-run-checks`, and it tells the agent to quote each command.
  The CLI exits 2 when an argument starts with `-`.
  The summary of a passing command shows its output when the output has at most 10 lines.
- The `decide` slice of the core plugin asks Jev for each decision that facts settle.
  The CLI `dotclaude-decide` calls the TypeSafe API.
  When the TypeSafe client fails, for example with no key, an invalid key, or no balance, the decision goes to a small Claude model through `$.model.complete`.
- The `prompt` slice gives each model its own system prompt variant.
  It adds a block to the end of each subagent task prompt, and it sends a `context_management` section without compaction.
- The `surface` slice shortens the descriptions of the tools `Agent`, `Bash`, `ListAgents`, and `Read`.
  It drops some built-in agent types from the agent listing and from dispatch.
- The `sembr` slice rewrites a Markdown file on `Write` and `Edit`, so each sentence starts on its own line.
  In `Bash`, it rewrites the quoted text of `git commit` and `gh pr create` in the same way.
- The output style `dotclaude:Concise` is based on the built-in Concise style.
- The core plugin has the skills `/setup`, `/spec`, `/hotfix`, `/ship`, `/handoff`, and `/rules-creator`.
  `/rules-creator` writes the rule files of `.claude/rules/`, with `paths` globs.
- The `setup` slice reads the account type from `claude auth status --json`.
  Pro is the baseline, and Max 5x and Max 20x get more parallel subagents and a higher effort.
- The `setup` slice writes `autoMode` to the user settings, with `$defaults` in each list.
  The `autoMode.allow` list lets the classifier run the removal of agent worktrees and of the Claude Code temp folder.
- The `trim` slice turns off 10 built-in parts that no slice of dotclaude uses.
  Each part has its env var or settings key.
- The `stamp` slice of the core plugin appends the dotclaude version and the short build SHA to each session at its start, as a `system` notice.
  The SHA comes from `installed_plugins.json`, or from `git` when the plugin root is a dotclaude checkout, else it is `unknown`.
  The notice costs no model token.
  A resume on the same build adds no notice, and a resume on a new build adds one.
- The `dotclaude-usage` report shows the build of each session, and the cost of each build.
  A session with no stamp row shows `unknown`.
- The add-on plugin `dcc-plugin-agents-md` loads `AGENTS.md` files where Claude Code loads `CLAUDE.md`, in place of the built-in `cc-plugin-agents-md`.
  It loads the file of the user folder, `AGENTS.md`, `.claude/AGENTS.md`, and `AGENTS.local.md` in each ancestor of the working directory, and the files of `permissions.additionalDirectories` under `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`.
  A nested file loads once in a session, when Claude reads or changes a file in its folder, or when the user mentions such a file, and it loads again after a compaction.
  It skips a file that a `CLAUDE` file already loads, and `claudeMdExcludes` applies to it.
  The files of the start cost 17 tokens less than the same text in `CLAUDE` files, and each nested file costs 7 tokens more, because Claude Code puts a prefix before the context of a hook.
- The opt-in add-on plugin `dcc-plugin-you-should-know` shows one thing that the user should know before Claude changes something, in place of the built-in `cc-plugin-you-should-know`.
  It checks the first `Edit`, `Write`, `NotebookEdit`, or changing `Bash` call of each turn in `tool.check`, shows a topic as a toast, and does not stop or change the call.
  It makes one Haiku call with the prompt and the pending action, and no transcript, in about 2 to 3 seconds and about 410 input tokens.
  After an HTTP 429 it forks the main conversation for the rest of the session.
  A failed or slow call, a call of a subagent, and a topic that showed already give no toast.
- The `guard` hook denies a delete of the default branch, a mirror push, and a force push with no ref.
- The `guard` hook denies a force push with `--all` or `--tags` and a ref (`git.force-push-default`).
  It names the default-branch and mirror pushes in the rule of the default branch.
- The `guard` hook counts `--force-with-lease` as a force push, as it counts `--force` (`git.force-push-default`).
- The `guard` hook reads a forced branch delete in a short-flag cluster, such as `-Df` and `-fd`.
- The `guard` hook denies a destructive git command whose name a substitution writes, such as `$(echo git) reset --hard`.
- The `guard` owners check reaches the repositories of `git fetch`, `git pull`, `git remote add`, `git submodule add`, and `pip install git+URL`.

### Changed

- The git segment of the status line keeps its cache in a folder of this user, `dotclaude-git-<uid>` in the temp folder, which only the user can write.
  Before, the cache file was in the shared temp folder, so another user could plant a result at its predictable name.
  A folder with another owner, or with group or other mode bits, is no cache, so `git` runs.
- The `archive` command of `dotclaude-spec` exits with `0` when the archive is done and only the removal of `.dotclaude/spec/.specs-old` fails.
  It names that folder on the error output, so you remove it by hand.
  Before, the command exited with `1` and said that the specs were restored, although the archive was done.
- The `lane` command of `dotclaude-spec` appends its line to `events.jsonl` instead of rewriting the whole log.
  Two lane commands at the same time no longer lose a line.
- The `archive` command of `dotclaude-spec` refuses to run when `.dotclaude/spec/.specs-old` is left by an earlier archive that stopped.
  Before, the command deleted that folder, which can hold the only copy of the old specs.
- The `lane` command of `dotclaude-spec` moves a package from `planned` to `review`, so a package whose `doing` hook failed can still move on.
- The `Bash` filter of the sync hook in `dotclaude-codegraph` matches each `git` global option in one way only.
  A `git` command with thousands of `--git-dir` options no longer takes seconds to test.
- The git segment of the status line keeps the result of `git status` for 3 seconds, so `git` does not run at each refresh of 1 second.
- The status line reads `workspace.current_dir`, `workspace.project_dir`, and `cwd` only when each is a string that is not empty.
- The `stamp` slice writes no stamp when the transcript exists but is over the 4 MiB read bound, so a resume of a long session adds no row.
- The `dotclaude-usage` options `--runs` and `--window` take a whole number of at least 1, as `--days` does.
  Another value exits 2 with a message.
- The `dotclaude-sandbox` option `--dir` refuses a value that starts with `--`, so `--dir --clean` exits 1 and does not take `--clean` as the folder.
- The `dotclaude-capture` option `--port` takes a whole number from 1 to 65535.
  Another value exits 2 with a message.
- The `prompt` slice of the core plugin no longer sets `CLAUDE_CODE_ATTRIBUTION_HEADER=0`.
  With that value, a `$.model.complete` call from a hook carries no billing block and no identity block of Claude Code, and a subscription refuses it with HTTP 429.
  The evidence is in `.dotclaude/spec/changes/1.0.0/evidence/you-should-know.md`.
  Remove the key from the `env` of your `settings.json` if `/dotclaude:setup` wrote it there.

- The spec store keeps its lane changes in an append-only `events.jsonl`, one line for each change, in place of `state.json`.
  The lane of a package is its last line, and `.gitattributes` sets `merge=union` so two branches merge with no conflict.
  The store no longer names the handoff file.
- The `drift` command of `dotclaude-setup` reports a rule file in `.claude/rules/` whose `paths` front matter does not parse, whose braces expand over 1000 patterns, or whose glob matches no tracked file.
  The `trim` slice lists the rules with no `paths` as a source of context at the start of a session.
- The `drift` command of `dotclaude-setup` writes nothing.
  The count of runtime paths that `dotclaude-setup` adds to `.git/info/exclude` no longer counts the header line.
- The spec store takes the packages of a change from its package files.
  A package with a file and no line in `events.jsonl` is `planned` for `lane`, `status`, `next`, `validate`, and the status line.
- The spec parse keeps the text of each delta file as written.
  The `AND` clauses, the lines that start with `#` in a fenced block, the blank lines, and the indentation stay in place.
- `dotclaude-spec archive` rejects an id that fails the `CHANGE_ID` rule, and it puts the old `specs/` back when a later step fails.
- `dotclaude-spec lane` refuses a move out of `done`, and a move to the lane that the package has.
  A refused move exits with status `1`, and it adds no line to `events.jsonl`.
- A line of `events.jsonl` that is not JSON makes the reader name the file and the line.
  A new line starts on its own line when the last line of the log has no line end.
- `dotclaude-spec validate` reports `plan.event-no-package` for a lane line of a package with no file in `packages/`.
- The `handoff` slice resumes a handoff file that Claude writes at the first path after a retry.
  A file at any path of the handoff counts as the written file.
- With `mainHandover` set to `off`, the handoff clears a lane `done` request, so a later change to `auto` does not start a handoff for it.
- The `manual` hint of the `handoff` slice shows only the hint beneath the reply.
  Before, the hint carried a second copy of the reply, because the text of the `turn.complete` chain starts as the reply.
- The `turn.complete` lane hook of the `spec` slice runs `lane <package> review` in the folder of the spawn.
  Before, it ran in the folder of the ended subagent, which is a linked worktree, so `lane` refused the move.
- The `slices/` and `kernel/` files of each plugin are TypeScript (`.ts`), and `bun check` type-checks them with `noUncheckedIndexedAccess`.
- The core hooks module is `hooks/register.ts`.
  The check that denies a `Bash` command that only prints a file runs in its `tool.call` hook, and the checks that ask before an edit run in its `tool.check` hook.
  So a `Bash`, `Write`, or `Edit` call no longer starts a Bun process for these checks.
- The print check denies a print of a file over 4 MiB by its size, because the hooks module cannot read a file that large.
- The add-on step of `setup` checks the Bun version for `dotclaude-sessions` and `dotclaude-lab`, and names Bun 1.4.3 when it is older.
  It checked Node.js 22.18 before, but the bins of these plugins run on Bun.
- The write ask for code in another language, such as `ruby -e` or `python3 -c`, counts a path that the code names only when the same code has a write word (`File.write`, `json.dump`, `os.remove`, an open mode `"w"`, or a `>` redirect).
  A command such as `ruby -e 'YAML.load_file(".github/workflows/check.yml")'` that only reads the path no longer asks.
- The `asks` slice never asks for a read.
  A new file gets no ask.
  A change to a protected file asks unless every changed part is on the safe list of its kind.
  The safe list of each kind is:
  - A test file: a format or comment change, a move of lines, a rename of a test title, and an added line that holds no control flow, skip, focus, timeout, or hidden test.
  - A limits file: a change that keeps every bound and changes no other code.
  - A lint config or a runner config: a format or comment change, a move with the same content, an added key with the strictest value, an added entry in a list of rules or files, a raised level or threshold, and a strict flag that goes to `true`.
    A new `select`, `include`, or `only` key asks.
    A config in JavaScript or TypeScript gets the same check on its tokens.
  - A CI file: a format or comment change, a move of lines, a change of a `name` key, and an added step or job with no risky key or failure-hiding command.
  - A hook file: a format change, an added hook, and a change of `description`.
  - A hook script: a format or comment change, an added blank line or comment, a stricter `set` line in a shell script, and a `"use strict"` line in a JavaScript or TypeScript file.
  - A settings file: a format change, an added `deny` or `ask` rule, a removed `allow` rule, and a plugin that goes on in `enabledPlugins`.
  Every other change asks.
  A format that the code cannot read asks.
  A shell edit in place, such as `sed -i`, of a protected file asks, because the text after the edit is not known before the command runs.
- The status line is rebuilt.
  It shows numbers and Unicode icons, a color scale, and a change segment with the count of done packages.
  `NO_COLOR` turns off the colors and keeps the icons.
- The settings snippet lists its top-level keys in the property order of the settings schema.
  The keys of `env` are in alphabetical order.
- The core plugin has six agents: `debugger`, `implementer`, `investigator`, `planner`, `researcher`, and `reviewer`.
  Each agent file sets its own model and effort.
- dotclaude writes its own files to `.dotclaude/`.
  The `setup` slice adds the runtime paths of `.claude/` that git does not ignore to `.git/info/exclude`.
- dotclaude uses the worktrees of Claude Code.
  No file in `src/` runs `git worktree add`.
- The `dotclaude-usage` report prices each call by the model version, from the pricing page of 2026-10-13.
  It adds the Mythos models and the two prompt tiers of Haiku 5.5, and the cache read of Sonnet 5.5 is $0.10.
  A version that is not in the table gets the prices of the newest version of its family.
- The `prompt` memory section no longer names the plan and task tools, which the `prompt` slice denies.
  The text of `tool-agent.md` tells Claude to always set `subagent_type`, because `Agent(general-purpose)` is denied.
- The `prompt` section of the environment no longer describes fast mode, because the `trim` slice turns fast mode off.
- The `prompt` slice denies `Read` of `.env.development`, `.env.dev`, `.env.staging`, `.env.stage`, `.env.test`, `.env.prod`, `.env.qa`, and `.env.preview`.
  The `.env.example`, `.env.sample`, and `.env.template` files stay readable.
- The `START_SYNC_TIMEOUT_MS` bound of `dotclaude-codegraph` is 6000 ms, in place of 8000 ms.
  On Windows the sync also gets `TREE_GRACE_MS`, so the session start stays at least 1 s under its 10 s hook timeout.
- The `dcc-plugin-you-should-know` check sends only the newest 10 topics of the `<seen>` list, so the input stays bounded.
- The `TREE_CHANGE` match of `dotclaude-codegraph` accepts a `git` command with global options before its verb.
  So a command such as `git -C dir commit` syncs the index.
- The `guard` owners check asks again at each call that reaches a repository with a policy file.
  Before, it asked once for each repository in a session.
- The `guard` owners check keeps a repository whose policy files are all missing for the session, so it does not read them again.
  A failed read of a policy file is not kept, and the next call reads it again.
- The shell reader of the core plugin no longer reads the text of an unquoted heredoc body as a command.
  The substitutions in that body are still commands, so a destructive command in one is denied.
- The `guard` owners check reads the repository of a `git` command with options before its verb, such as `git -C dir fetch URL` or `git -c k=v pull URL`.
  It also reads an install of `git+URL` with `pip3`, which the check missed before.
- The `--clean` of `dotclaude-sandbox` removes a folder other than the default one only when the sandbox made it.
  The setup writes a `.dotclaude-sandbox` marker into the folder, and `--clean` refuses a folder without it.
  A folder that an older sandbox made has no marker, so remove it by hand.
- The git cache of the `statusline` slice treats a saved result with a field of the wrong type, or a branch name with a control character, as no cache.
  The `git` call runs again, and its result replaces the saved file.

### Removed

- The `test-runner` agent of the core plugin.
  The CLI `dotclaude-run-checks`, run through `Bash`, replaces it.
- The classic `PreToolUse` hooks of the core plugin, in the `guard` and `surface` slices.
  The hooks module does their checks.
- The OpenSpec workflow, with the `openspec/` folder and its skills.
  The spec store and the `/spec` skill replace it.
- The add-on `dotclaude-jev`.
  Its decisions go to the `decide` slice of the core plugin.

## Older Releases

| Series | Releases |
| --- | --- |
| [0.28](https://github.com/xsyetopz/dotclaude/wiki/Release-0.28) | 0.28.0 |
| [0.27](https://github.com/xsyetopz/dotclaude/wiki/Release-0.27) | 0.27.0 |
| [0.26](https://github.com/xsyetopz/dotclaude/wiki/Release-0.26) | 0.26.0 |
| [0.25](https://github.com/xsyetopz/dotclaude/wiki/Release-0.25) | 0.25.1, 0.25.0 |
| [0.24](https://github.com/xsyetopz/dotclaude/wiki/Release-0.24) | 0.24.0 |
| [0.23](https://github.com/xsyetopz/dotclaude/wiki/Release-0.23) | 0.23.2, 0.23.1, 0.23.0 |
| [0.22](https://github.com/xsyetopz/dotclaude/wiki/Release-0.22) | 0.22.3, 0.22.2, 0.22.1, 0.22.0 |
| [0.21](https://github.com/xsyetopz/dotclaude/wiki/Release-0.21) | 0.21.0 |
| [0.20](https://github.com/xsyetopz/dotclaude/wiki/Release-0.20) | 0.20.8, 0.20.7, 0.20.6, 0.20.5, 0.20.4, 0.20.3, 0.20.2, 0.20.1, 0.20.0 |
| [0.19](https://github.com/xsyetopz/dotclaude/wiki/Release-0.19) | 0.19.1, 0.19.0 |
| [0.18](https://github.com/xsyetopz/dotclaude/wiki/Release-0.18) | 0.18.1, 0.18.0 |
| [0.17](https://github.com/xsyetopz/dotclaude/wiki/Release-0.17) | 0.17.1, 0.17.0 |
| [0.16](https://github.com/xsyetopz/dotclaude/wiki/Release-0.16) | 0.16.1, 0.16.0 |
| [0.15](https://github.com/xsyetopz/dotclaude/wiki/Release-0.15) | 0.15.1, 0.15.0 |
| [0.14](https://github.com/xsyetopz/dotclaude/wiki/Release-0.14) | 0.14.1, 0.14.0 |
| [0.13](https://github.com/xsyetopz/dotclaude/wiki/Release-0.13) | 0.13.1, 0.13.0 |
| [0.12](https://github.com/xsyetopz/dotclaude/wiki/Release-0.12) | 0.12.1, 0.12.0 |
| [0.11](https://github.com/xsyetopz/dotclaude/wiki/Release-0.11) | 0.11.1, 0.11.0 |
| [0.10](https://github.com/xsyetopz/dotclaude/wiki/Release-0.10) | 0.10.2, 0.10.1, 0.10.0 |
| [0.9](https://github.com/xsyetopz/dotclaude/wiki/Release-0.9) | 0.9.0 |
| [0.8](https://github.com/xsyetopz/dotclaude/wiki/Release-0.8) | 0.8.2, 0.8.1, 0.8.0 |
| [0.7](https://github.com/xsyetopz/dotclaude/wiki/Release-0.7) | 0.7.0 |
| [0.6](https://github.com/xsyetopz/dotclaude/wiki/Release-0.6) | 0.6.2, 0.6.1, 0.6.0 |
| [0.5](https://github.com/xsyetopz/dotclaude/wiki/Release-0.5) | 0.5.1, 0.5.0 |
| [0.4](https://github.com/xsyetopz/dotclaude/wiki/Release-0.4) | 0.4.0 |
| [0.3](https://github.com/xsyetopz/dotclaude/wiki/Release-0.3) | 0.3.0 |
| [0.1 and 0.2](https://github.com/xsyetopz/dotclaude/wiki/Release-0.1-0.2) | 0.2.0, 0.1.0 |

[unreleased]:
  https://github.com/xsyetopz/dotclaude/compare/dotclaude--v0.28.0...HEAD
