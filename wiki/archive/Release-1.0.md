# Release 1.0

This page lists the parts that 1.0 adds, changes, removes, and fixes, for users and contributors.

Released 2026-10-13.

## Added

- The `handoff` slice of the core plugin ports the handoff of 0.28.0 to the hooks module and a CLI `dotclaude-handoff`.
  The handoff file goes to `.dotclaude/handoff/`.
  The `/handoff` skill names the file, and the `turn.complete` hook runs `/clear` and the resume prompt.
  The option `mainHandover` is `manual` by default, and it takes `auto` and `off`.
  A `tool.call` hook adds a report-now note to a subagent that is over its context bound.
  The `turn.complete` hook runs the resume only after an `answer` turn, waits at most `HANDOFF_WAIT_TURNS` turns for the file, submits the write prompt once more, and then gives the `manual` hint.
  A `dotclaude-spec merge` or `accept` also counts as a package that is done, and quoted text does not.
  On one session, a handoff against a compaction of the same session cost $0.0630 against $0.2288, took 9.1 s against 23.2 s, and left 18,487 tokens of context at the last call against 28,418 at the first call of the follow-up.
  Each side is one run.
  The measurement is in `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md` at commit `44e74425`.
- The `attribution` slice of the core plugin adds the attribution to each `git commit` and each `gh pr create` that Claude makes, with no model call.
  A `tool.call` hook adds a `--trailer` with `Co-Authored-By` and the model of the main loop, such as `Claude Opus 5.5`, and it adds the Claude Code footer to a pull request body.
  A call of a subagent, or a model with no name and version, gets the name `Claude`.
  The `attribution` setting of the user stays in force, an empty value turns its part off, and `includeCoAuthoredBy: false` turns both parts off when no `attribution` setting is set.
  The text of `tool-bash.md` no longer asks Claude to copy the lines.
- The spec store has schema 2, with no compatibility with schema 1, and `/dotclaude:specify`, `plan`, `implement`, `review`, `merge`, `accept`, and `archive` replace `/spec`, `/ship`, and `/hotfix`, each with a `dotclaude-spec` subcommand of the same name.
  A change has the states `draft`, `specified`, `planned`, `implementing`, `accepted`, `archived`, and `canceled`, and a package has `planned`, `doing`, `verified`, `approved`, `done`, `blocked`, and `canceled`, each with a gate that the CLI checks and an event that records the evidence.
  `block` and `drop` replace `lane`, `verify` runs the `verify` command of a package, `review` records `approve` or `reject` with a finding and a decision, `ready` prints the packages that can start, `merge` needs an `approved` package, and `packages.md`, `new`, `retry`, `record`, and `hotfixes/` go away.
  A small fix is a trivial change.
- The `spec` slice moves a package with no model call.
  An `agent.spawn` hook runs `dotclaude-spec implement <package>` when `/dotclaude:implement` starts the `implementer` of the package, and no `turn.complete` hook moves a package, because `/dotclaude:implement` runs `verify` after the agent ends.
  The hook finds the package in the `id:` line of the brief in the prompt.
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
- The `/dotclaude:review` skill runs one `reviewer` on the diff of each verified package, with no implementer report.
  `/dotclaude:implement` and `/dotclaude:review` start with `dotclaude-spec runs`.
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
- The core plugin has the skills `/setup`, `/handoff`, `/rules-creator`, and the spec phases `/specify`, `/plan`, `/implement`, `/review`, `/merge`, `/accept`, and `/archive`.
  `/rules-creator` writes the rule files of `.claude/rules/`, with `paths` globs, and the skill `drive-web-browser` of `dotclaude-browser` is now `browse`, the name of its slice.
- The `setup` slice reads the account type from `claude auth status --json`.
  Pro is the baseline, and Max 5x and Max 20x get more parallel subagents and a higher effort.
- The `setup` slice writes `autoMode` to the user settings, with `$defaults` in each list.
  The `autoMode.allow` list lets the classifier run the removal of agent worktrees and of the Claude Code temp folder.
- The `trim` slice turns off 9 built-in parts that no slice of dotclaude uses, each with its env var or settings key.
  The advisor tool stays on, because with no `advisorModel` it adds no token, and `dotclaude-setup settings --advisor` sets `advisorModel` only when the user asks.
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
  It checks the first `Edit`, `Write`, `NotebookEdit`, or changing `Bash` call of each turn in `tool.check`, and it does not stop or change the call.
  It shows the topic in a band above the prompt, with a heads-up that fills the prompt for a note to the next call of the main agent, and a dismiss.
  It makes one Haiku call with the prompt and the pending action, and no transcript, in about 2 to 3 seconds and about 410 input tokens.
  After an HTTP 429 it forks the main conversation for the rest of the session, and a failed or slow call, a subagent call, or a topic that showed already gives no band.
- The `guard` hook denies a delete of the default branch, a mirror push, and a force push with no ref.
- The `guard` hook denies a force push with `--all` or `--tags` and a ref (`git.force-push-default`).
  It names the default-branch and mirror pushes in the rule of the default branch.
- The `guard` hook counts `--force-with-lease` as a force push, as it counts `--force` (`git.force-push-default`).
- The `guard` hook reads a forced branch delete in a short-flag cluster, such as `-Df` and `-fd`.
- The `guard` hook denies a destructive git command whose name a substitution writes, such as `$(echo git) reset --hard`.
- The `guard` owners check reaches the repositories of `git fetch`, `git pull`, `git remote add`, `git submodule add`, and `pip install git+URL`.
- `just sandbox-install [PLUGIN...]` installs plugins of this checkout into a new sandbox config with `claude plugin marketplace add` and `claude plugin install`, as a user installs them.
  `just sandbox-installed` starts that sandbox again with no new install.

## Changed

- The git segment of the status line keeps its cache in a folder of this user, `dotclaude-git-<uid>` in the temp folder, which only the user can write, or `dotclaude-git` when no user id exists, as on Windows.
  Before, the cache file was in the shared temp folder, so another user could plant a result at its predictable name.
  A folder with another owner, or with group or other mode bits, is no cache, so `git` runs.
- The `archive` command of `dotclaude-spec` exits with `0` when the archive is done and only the removal of `.dotclaude/spec/.specs-old` fails.
  It names that folder on the error output, so you remove it by hand.
  Before, the command exited with `1` and said that the specs were restored, although the archive was done.
- The `archive` command of `dotclaude-spec` refuses to run when `.dotclaude/spec/.specs-old` is left by an earlier archive that stopped.
  Before, the command deleted that folder, which can hold the only copy of the old specs.
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
  The evidence is in `.dotclaude/spec/changes/1.0.0/evidence/you-should-know.md` at commit `44e74425`.
  Remove the key from the `env` of your `settings.json` if `/dotclaude:setup` wrote it there.

- The spec store keeps its state changes in an append-only `events.jsonl`, one line for each change, in place of `state.json`.
  The state of a package is its last line, and `.gitattributes` sets `merge=union` so two branches merge with no conflict.
  The store no longer names the handoff file.
- The `drift` command of `dotclaude-setup` reports a rule file in `.claude/rules/` whose `paths` front matter does not parse, whose braces expand over 1000 patterns, or whose glob matches no tracked file.
  The `trim` slice lists the rules with no `paths` as a source of context at the start of a session.
- The `drift` command of `dotclaude-setup` writes nothing.
  The count of runtime paths that `dotclaude-setup` adds to `.git/info/exclude` no longer counts the header line.
- The spec store takes the packages of a change from its package files.
  A package with a file and no line in `events.jsonl` is `planned` for `status`, `next`, `validate`, and the status line.
- The spec parse keeps the text of each delta file as written.
  The `AND` clauses, the lines that start with `#` in a fenced block, the blank lines, and the indentation stay in place.
- `dotclaude-spec archive` rejects an id that fails the `CHANGE_ID` rule, and it puts the old `specs/` back when a later step fails.
- A line of `events.jsonl` that is not JSON makes the reader name the file and the line.
  A new line starts on its own line when the last line of the log has no line end.
- `dotclaude-spec validate` reports `plan.event-no-package` for an event line of a package with no file in `packages/`.
- The `handoff` slice resumes a handoff file that Claude writes at the first path after a retry.
  A file at any path of the handoff counts as the written file.
- With `mainHandover` set to `off`, the handoff clears a package-done request, so a later change to `auto` does not start a handoff for it.
- The `manual` hint of the `handoff` slice shows only the hint beneath the reply.
  Before, the hint carried a second copy of the reply, because the text of the `turn.complete` chain starts as the reply.
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
  Each agent file sets its own model and effort, `debugger` runs on Opus 5.5 at `medium`, and no agent has a `maxTurns`, because a run at its turn limit returns no report.
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
- The `guard` reads a command whose name is only a substitution, such as `$(echo git) fetch URL` or `` `echo git` reset --hard ``, as `git` when a git verb follows the name.
  The owners check reads the repository of such a fetch, and a `git -C dir` folder of such a command stays in force for the matchers.
- The `guard` denies a system command whose name is only a substitution, such as `$(which rm) -rf /` or `$(which chmod) -R 777 /`.
  Each system rule that reads more than the name reads such a name as its tool, so the rule denies when the other words fit it.
- The `--clean` of `dotclaude-sandbox` removes a folder other than the default one only when the sandbox made it.
  The setup writes a `.dotclaude-sandbox` marker into the folder, and `--clean` refuses a folder without it.
  A folder that an older sandbox made has no marker, so remove it by hand.
- The git cache of the `statusline` slice treats a saved result with a field of the wrong type, or a branch name with a control character, as no cache.
  The `git` call runs again, and its result replaces the saved file.
- `--clean` of `dotclaude-sandbox` exits 0 for a folder that does not exist, so the first run of `just sandbox-alone` does not fail.
- The files that only code reads are JSONL, with one record on one line: the usage sample `.dotclaude/rate-limits.jsonl`, the git cache `dotclaude-git-<key>.jsonl`, and the `request-<n>.jsonl` and `report-<n>.jsonl` files of `dotclaude-capture`.
  The old `.dotclaude/rate-limits.json` is not read, so remove it.
- The `agents` lab tests of `dcc-plugin-agents-md` pass on Windows.
  The engine resolves `of` and `below` of `fs.ancestors` before the stub gets them, so the stub reads a path with a drive and `\` in the form of its fake disk.
- `tools/sandbox.ts` is now `tools/sandbox/run.ts`, next to `tools/sandbox/install.ts`.
- `dcc-plugin-agents-md` reads each `\` of a path and of a `claudeMdExcludes` glob as `/`, as Claude Code does, so an exclude such as `**/legacy/AGENTS.md` matches on Windows.
- The status line aligns the items of each row in columns and joins them with ` · `.
  Each limit window shows a pace arrow, `▼` in green for a reserve and `▲` in yellow for a deficit, and a red `⏵` run-out time shows only when the use reaches 100% before the reset.
  The `5h` and `7d` windows take one row each where two rows fit, and the reset time has `↻` before it.

## Removed

- The `test-runner` agent of the core plugin.
  The CLI `dotclaude-run-checks`, run through `Bash`, replaces it.
- The classic `PreToolUse` hooks of the core plugin, in the `guard` and `surface` slices.
  The hooks module does their checks.
- The OpenSpec workflow, with the `openspec/` folder and its skills.
  The spec store and the `/spec` skill replace it.
- The add-on `dotclaude-jev`.
  Its decisions go to the `decide` slice of the core plugin.

## Fixed

- The guard denies a git verb that an alias, an unquoted `$IFS`, or an empty positional or special parameter hides, such as `alias g=git`, `git${IFS}reset${IFS}--hard`, or `git$9 reset --hard`.
  A quoted `$IFS` stays one argument.
  The write guard asks on a command over the shell scan bound, as the git guard does.
- A torn last line of `events.jsonl` no longer makes `status` and the other readers fail, and an append removes it first.
- `setup --apply` and `writeAtomic` keep a symlink and the mode of the file, and `writeAtomic` retries a Windows rename over an open file.
  The settings write also skips an unreadable catalog file, which before stopped the run with `ENOENT`.
- The `claude` calls of `tools/` send no telemetry to Datadog, `ci` gates `generate --check`, and `bump` checks each target before it writes.
- `dotclaude-sandbox --clean` removes a read-only `config/` folder, and it refuses a symlinked sandbox root with exit 1.
- `dotclaude-run-checks ""` gives a usage error with exit 2, and it no longer runs one command.
- The attribution adds the model line to each command of a chain and to `git --no-pager commit`.
  It names `Claude Sonnet 4` for `claude-sonnet-4-20250514`.
- The session readers of `usage` and `start-cost` skip a `null` line, meta file, or installed-plugins file.
- The `claudeMdExcludes` match takes a lower-case drive letter as the same drive.
- The you-should-know band shows, and a heads-up note reaches the next call of the main agent.
- The status line gives `⚡`, `✅`, `⭐`, and `❌` two columns, keeps a later item in its column when a middle place is empty, and joins subagent items with ` · `.
- On Windows, a program that `PATH` gives as an `.exe` file, such as `sh`, `git`, or a native `claude`, runs with no shell.
  So `dotclaude-run-checks`, the spec commands, and `dotclaude-lab` no longer refuse a word with a `"` for it.
- On Windows, `dotclaude-spec verify --in` accepts a linked worktree, because the spec commands compare the real paths of the git folders.

## Related Pages

- [Release History](Release-History): which releases exist and where their notes are.
- [Archive](Archive): the index of the archive pages.
