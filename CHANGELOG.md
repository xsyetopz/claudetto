# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.
The [Release History](https://github.com/xsyetopz/claudetto/wiki/Release-History) page of the wiki has the notes of older releases.

## [Unreleased]

## [0.2.0] - 2026-10-18

This release cuts `claudetto` to the parts that Claude Code does not do already:
the `.ts` source under `src/` (without `lab/`) goes from 33,219 lines to 10,232 lines.
Run `/claudetto:setup` again after the update, because it cleans the settings of 0.1.0.

### Added

- The `ground` slice denies a `Write` or `Edit` of a plan file, and a `ProposeGoal` call, when the text cites a `file:line` or a convention that the source does not hold.

### Changed

- **Breaking:** `claudetto` has these slices: `decide`, `ground`, `guard`, `handoff`, `prompt`, `sembr`, `setup`, `statusline`, and `styles`.
- **Breaking:** `claudetto-sessions` is one `sessions` skill with the scripts `audit` and `replay`.
  The `awareness`, `start-cost`, and `usage` slices are gone, because `/context`, `/usage`, `/insights`, and `/status` give the same facts.
- **Breaking:** `guard` keeps the deny of a `Bash` command that only prints a file, and it names the `Read` call to use.
  `handoff` keeps the compact answer and `/handoff`, and reads `openspec/changes/` in place of `minispec/changes/`.
- **Breaking:** `prompt` is rebuilt on the short prompt of Claude Code 2.1.302 (`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`).
  It answers `lean_body` with one tailored text, so the per-model variants are gone, and `surface` is merged into it.
- **Breaking:** `setup` merges the settings snippet and the cleanup of 0.1.0:
  the `hook.claudetto-*` git config pairs, the rule texts of the 0.1.0 policy, and the `CLAUDE.md` block.
  The `trim` slice is merged into it, and `setup` no longer installs the commit and push hooks.

### Removed

- **Breaking:** the slices `agents`, `asks`, `attribution`, `checks`, `corrections`, `gc`, `minispec`, `policy`, `reads`, `repostate`, `turngate`, `usercheck`, and `worktree`.
  The `minispec` CLI and skills, the `gc` skill, the custom agents, and `claudetto-run-checks` go with them.
- **Breaking:** the `testJudge` option, with the `asks` slice.
- **Breaking:** the add-on `claudetto-you-should-know`.
- **Breaking:** the recipes `just measure`, `just usage`, and `just start-run`.

## [0.1.0-alpha.1] - 2026-10-15

This release restarts dotclaude 1.0.0 as `claudetto`, with no compatibility with dotclaude 1.0.0.
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
- The decision API of the `decide` slice is off until you turn it on.
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

- The `rules`, `stamp`, and `spec` slices of dotclaude 1.0.0, and its old `handoff` slice.
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
  https://github.com/xsyetopz/claudetto/compare/claudetto--v0.2.0...HEAD
