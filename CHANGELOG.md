# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.
The [Release History](https://github.com/xsyetopz/dotclaude/wiki/Release-History) page of the wiki has the notes of older releases.

## [Unreleased]

## [0.28.0] - 2026-10-09

### Added

- `just typecheck` runs `tsc --noEmit` on the lab tests and on the core hooks module, and `just check` runs it after the lint.
  The lab tests use the types of the mods API in place of `any`.
- The `WebSearch` hook of `dotclaude-browser` runs `agent-browser` with the newest CloakBrowser binary in `~/.cloakbrowser/` when one is present, because plain headless `agent-browser` got a bot check from DuckDuckGo.
  The `backend` option `cloakbrowser` now needs that binary and no longer denies each search.
- The status line has 3 columns when the terminal has about 130 columns.
  The left column shows the session, the middle column shows the context, and the right column shows the 5-hour, 7-day, and Fable windows.
  A narrower terminal keeps the row packing.
  After the user runs `/context`, the middle column shows the exact rows of the newest table, and the messages are the total minus them.
  Before that, it shows only the free tokens.
  The Fable window comes from the usage cache of Claude Code, and it is hidden when that cache is older than 1 hour.
- The status line has segments for the context, the cache, and each usage limit with its pace and reset credits.
- The add-on plugin `dotclaude-codegraph` gives Claude the code graph of a project from the CodeGraph CLI `codegraph`.
  It works without the core plugin, and it runs only in a project that has a `.codegraph/` index.
  At session start, it syncs the index and adds one line that names `impact` and `callers`.
  At a `Grep` or `Glob` call for a name, it adds the definition and the callers of that name.
  After an edit, a write, or a git command that changes the tree, it syncs the index in the background.
  Install it with `claude plugin install dotclaude-codegraph@dotclaude`, and install the CLI and run `codegraph init` yourself.
- The add-on plugin `dotclaude-docs` gets current library docs with the Context7 CLI `ctx7`.
  It works without the core plugin and with no key.
- The add-on plugin `dotclaude-sessions` measures your sessions, for each user of Claude Code.
  `dotclaude-start` gives the start of a session by source: the built-in parts, each plugin, each MCP server, `CLAUDE.md` and memory, the output style, and the system prompt.
  `dotclaude-start --compare BASE OTHER` gives the difference between a start without a plugin and a start with it.
  `dotclaude-usage` gives the model calls of each run, the context that each call reads again, and the skills that the period did not use.
  Its header says `API-equivalent at list prices, not a subscription bill`.
  The skills `start-cost` and `usage` tell Claude to run them.
- The add-on plugin `dotclaude-lab` is for plugin authors.
  `dotclaude-sandbox` runs Claude Code in a config apart from yours, and `--check-frontmatter` fails when the debug log names an unknown frontmatter field.
  `dotclaude-capture` logs the requests of Claude Code through a local proxy and sizes the first one, `dotclaude-schema` writes the JSON Schema of `settings.json`, and `dotclaude-eval-compare` runs `claude plugin eval` on two plugin folders.
  The skill `eval-compare` tells Claude how to compare the plugin arms.
- `dotclaude-browser` answers each `WebSearch` call with a search in the headless browser.
- `dotclaude-jev` adds a second-opinion tool that asks TypeSafe Jev about a decision.
  With no `TYPESAFE_API_KEY`, the plugin registers no tool, so it costs no tokens.
  The retries of the client end before the 45 s kill of the hooks module, and each bound is in `features/jev/limits.mjs`.
  The question gives each option at least one fact for it and one fact against it, and no lean of the user, the notes, or the team.
  The question of `AskUserQuestion` always goes to you with the pick of Jev, also when Jev is sure, and Claude never skips it.
  The fallback result tells Claude to answer from its own check and to tell you that no second opinion was available.
  The error text of the API that goes to Claude is cut to 200 characters (`ERROR_BODY_MAX`).
- The core plugin has one route for the system prompt.
  The rules that every model shares are system prompt sections in `features/prompt/shared.mjs`, and `prompt.compose` puts them before the model notes.
  The output style holds only the role, the tone, and the format, because Claude Code sends an output style as a message in the conversation and not in the system prompt.
  A kept eval trace showed the style as an `output_style_instructions` attachment, and with the rules in it the plugin arm scored like the no-plugin baseline on `facts-release-scope` and `report-count`.
  The prompt variants hold only the text of one model, such as the step line of Haiku 5.5, and the block that a subagent gets at spawn.
  The Sonnet and Haiku variants no longer repeat the verification rule, and the Fable variant no longer repeats the extras rule, because the shared sections hold both.
  Mythos 5.1 gets the Fable variant, because one prompting guide covers both models.
  The evidence line tells Claude to run a new check before it undoes finished work because of a claim of fault, also when the user tells it to delete the work.
  The `doing_tasks` section tells Claude that a manifest version with no tag is the release in progress, so its changelog entries go in the section of that version.
  The `counts` section tells Claude to copy each count from a tool output and to look first for a project command that prints it.
  The `Bash` tool text tells Claude to end commit messages and pull request text with the attribution text of the session.
- The source of the wiki in `wiki/` is grouped in folders.
  The page names and the page URLs are unchanged, because a GitHub wiki addresses a page by its bare name.
- The hooks module cuts the prompt surface with the handlers `prompt.attachment` and `tool.describe`.
  They shorten the `sandbox_instructions` and `auto_mode` texts and the descriptions of large tools, and they defer `AskUserQuestion` and `ListAgents`.
  With `sandbox.allowUnsandboxedCommands` set to `true`, the short sandbox text keeps the rule that a run outside the sandbox needs an approval.
  The short `Agent` tool text does not name `SendMessage`, because the output style tells Claude to start a new subagent for more work.
- A subagent that reaches its context bound gets a message to report now.
- A subagent with 2 turns left before its `maxTurns` gets a message to report now, in the same note as the context message when both apply.
- Hooks check the rules of a project that code can check.
  They ask before `git stash`, `git reset`, and a `git checkout` or `git restore` of a path.
  They ask before a change to an existing line of a test file or a limits file.
  They deny a Markdown write or a commit message with a code item outside a code span.
  They deny text that claims an approval of the user when no prompt of the user gives one.
  They also ask before an edit of a lint or type-check config, a check runner config, a CI file, or a hook file (`hooks/hooks.json`, `hooks/register.mjs`, a `hooks/*.txt` text, `.claude/hooks/`, a script that a `hooks.json` command names, the inline `hooks` of `plugin.json`, `.husky/`, and `.pre-commit-config.yaml`), the keys `hooks`, `permissions`, `disableAllHooks`, `enabledPlugins`, and `sandbox` of `.claude/settings*.json`, the linter sections of `pyproject.toml` and `setup.cfg`, a check script of `package.json`, and a check recipe of a `justfile` or `Makefile`, and before an added skipped or focused test (`.skip`, `.only`, and `.todo`) or an added inline lint suppression.
  A `Bash` write to such a file also asks, and so does a `Bash` write to a test file, a limits file, a settings file, or a recipe file (`sed -i`, `perl -i`, `>`, `>>`, `tee`, `cp`, `mv`, `install`, `rm`, `unlink`, `truncate`, `ln -f`, `git checkout --`, `git restore`, `git rm`, `git mv`, and `find` with `-delete` or `-exec rm`).
  A `Bash` write that only adds to a test file or a limits file gets no ask, the same as a `Write` of a new file.
  A path under `/dev` or under a variable other than `CLAUDE_PROJECT_DIR` or `HOME` gets no ask.
  A path under `~` or outside the project root gets the ask for a lint config, a runner config, a CI file, a hook file, a settings file, and a recipe file, and not for a test file or a limits file.
  A `Bash` write to `pyproject.toml`, `setup.cfg`, or `package.json` gets no ask.
  Each ask reason is written for you and says why the change can hide a defect.
- A `Read` rule hook denies a `Bash` command that only prints a file (`cat`, `sed`, `head`) and gives the `Read` call instead.
- Semantic line breaks: a written Markdown file and the quoted heredoc of `git commit` and `gh pr create` get one sentence on each line.
- A prompt hook on `Stop` blocks one time a message that calls a part done when no passing check shows it.
  It also blocks one time a message that starts with agreement, praise, thanks, or an apology in place of the state, in any language, or that changes an earlier answer with no evidence.
  It also blocks one time a message that says the agent raised a bound, weakened or skipped a test, or edited a check or a config so that a check passes, when you did not ask for it.
  It never runs on `SubagentStop`.
  Sonnet 5.5 judges the message, and the prompt asks for the JSON answer first, because an evaluator that wrote prose made Claude Code send the hook prompt back to the session as feedback.
  The prompt also tells the session agent to send its report again when the prompt comes back to it as `Stop hook feedback`.
- A drift check at `SessionStart` tells Claude about these differences:
  a built-in plugin that is on again, a synced claude.ai skill, a Claude Code version other than the tested one, a system prompt section that dotclaude does not know, an env var that overrides the `model` and `effort` of the agents, and managed settings that seat the guard of Claude Code.
- `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json` hold the settings schemas of Claude Code 2.1.296, and `dotclaude-schema` of the plugin `dotclaude-lab` builds them.
  The version is in the standard `$comment` keyword at the root of each file, such as `Extracted from Claude Code 2.1.296`.
  It is in no file name and in no made-up key, so the `$schema` link stays the same after an update.
  The generator puts the code items of each description in single backticks, so an editor shows them as code.
  The generator takes the last definition before the schema for a reused short name, so `hooks` and `sandbox.credentials.sigv4` carry no wrong shape.
- The core plugin has a `settings.json` at its root, which holds only keys that Claude Code reads from a plugin.
  Today it sets no key.
  A test checks it against the generated schema and fails on a key that a plugin must not set.
- The `setup` skill does one thing: the OpenSpec steps.
  It checks the `openspec` CLI, offers the install, and runs `openspec init --tools claude`, `openspec config set delivery skills`, and `openspec update` after you agree.
  It changes no Claude Code setting.
- The format of the evals is the suite format of `claude plugin eval`, which Claude Code owns.
  The 14 cases are in `plugins/dotclaude/evals/`, because the command reads cases only from a folder inside the plugin.
  `just eval` runs them with no published report and a cost limit.
  The first run on 2026-10-09 scored 1 on the plugin arm in 13 of 14 cases (`wiki/evals/Evals-0.28.0.md`).
  The graders on `Edit` and `Write` now match the protected path only after `file_path`, and the `Bash` graders match whole words only.
- The output style and the agents `debugger`, `implementer`, `reviewer`, and `test-runner` tell Claude to read a tool, a command, or a convention from the project before it chooses one.
  The files to read are the build and task files of the project, the config files of its tools, and `CLAUDE.md`, in any language, and Claude names the file that it read.
  A subagent saw `biome.json` and chose Prettier, although the project runs `biome ci`.
- The output style tells Claude that background work of a stopped subagent still runs, so Claude waits for its notification and does not start the same work again.
  It also tells Claude that a check that fails, such as a process list that the sandbox stops, shows nothing about the state that it checks.
- For contributors: the `description` and the `Stop` prompt of `hooks.json` come from `description.txt` and `Stop.prompt.txt` next to it, with one sentence on each line.
  `just hook-text` writes them into `hooks.json`, and a test fails when the two differ.
- `just eval` and `just eval-variant` run under a lock (`tools/lock.mjs`), so a second eval run cannot start while one is in progress.
- The output style tells Claude to copy each count in a report from a tool output, and the eval case `report-count` checks it.
  A count of lines or items in a file or an output is a computed count, so Claude runs a command of the project or `grep -c` to get it, and it adds no count of its own next to a copied count.
- The output style tells Claude to read the scope of the work from the state of the project: the branch, the tags, the version, and the open plans.
  For example, a changelog entry for a version that is bumped and not tagged goes in the section of that version, and the eval case `facts-release-scope` checks it.
- The output style and the `implementer` agent tell Claude that a test checks what the code does, such as a decision, an exit status, a file, or a value that a message carries, and not the words of a message, a doc, or a comment.
  When the user gives a rule about text, Claude follows it when it writes, and does not make a test of it.
  The `reviewer` agent looks for tests of prose, a raised bound, a skipped test, and an edited lint or CI config.
- The output style has a `<blocks>` section, and the block of each subagent has a short form of it.
  A failing check, a lint rule, a test, a bound, a hook, and a permission rule each stop the work for a reason.
  Claude changes the work to fit the block or asks you, and it does not raise a bound, weaken or skip a test, or edit a check, a config, or a hook so that a check passes, unless you ask.
- The agents `debugger` and `implementer` say what to do when a check fails: fix the code, or report the failure with the evidence.
  The `debugger` agent no longer changes a test, and it reports a test that it thinks is wrong to the parent.
- `dotclaude-browser` tells Claude to ask you before it passes a blocked page and before `--auto-connect`.
  With the `cloakbrowser` backend and no binary, Claude tells you and does not switch to plain `agent-browser`.
- The skills `docs` and `eval-compare` tell Claude to stop and tell you when it reaches the bound of 3 `ctx7` calls or the cost bound of a run.
  Claude does not raise the bound or fill the gap from memory.

### Changed

- The eval cases guard a protected file with a file-state `regex` grader (`kept-<path>`) on its final content, and not with a `Bash` text grader, because command text cannot tell a write from a read.
  `just eval` always passes `--keep-temp`, so each run keeps its sandbox and `trace.jsonl`.
- `just eval` and `just eval-variant` stop before the first run when they run in the Bash sandbox of Claude Code, such as with `! just eval`.
  In the sandbox, the model calls of the runs go through its proxy, and runs stopped on a model call until the 600 s timeout of the case.
- The git ask and the write ask also read a quoted heredoc as commands when a loop, `xargs`, or a shell runs its lines, such as `bash -c "$c"` in a `while read` loop, `| sh`, `source /dev/stdin`, or `sh -c "$(cat)"`.
  They also read a here-string given to a shell, and a git subcommand from a variable or from `xargs` gets the git ask.
  Before, a `git stash` in the brief of the `test-runner` script got no ask.
- The git ask and the write ask read code in any language that a program other than the shell runs, such as `python3 - <<'EOF'`, `node -e '...'`, or a heredoc written to a file that `python3` then runs.
  They have no parser for the language, and they read the words of the code, so `os.system("git stash")` gets the git ask, and a protected path that the code names gets the write ask.
- The git ask and the write ask read the script file that a command runs, such as `python3 x.py` or `bash run.sh`, except in a test run.
  A shell script is read as shell, and a file in another language gives an ask only for the commands in it.
- `dotclaude-eval-compare` adds no `--scaffold` and no `--allow-tools Bash,Write,Edit`, because each one runs the scripts or the tools of a suite as the user.
  Add them in the options for suites that you trust.
  `just eval-variant` adds both for the suite of this repository.
  The `eval-compare` skill no longer grants `Bash(dotclaude-eval-compare *)`, so Claude Code asks you before each run.
  A bound in the form `--max-cost-usd=N` is kept, and no second bound is added.
- With the `backend` option `cloakbrowser`, a `WebSearch` that falls back to the built-in tool gives Claude a notice with the reason, such as a bot check.
  The notice tells Claude to tell you.
- The `drive-web-browser` skill loads the `agent-browser` guide through the new bin `dotclaude-browser-guide`, which cuts the guide at 40,000 characters and names the command for the rest.
  A timeout or a failed run gives its reason, and only a missing binary gives the install text.
- The eval cases `destructive-ask`, `big-file-subagent`, and `library-docs` no longer name the graded behavior in the prompt.
  `destructive-ask` now asks the agent to free disk space in a project whose large files are a customer export and a database, and it no longer needs a question, because a report with no delete is also correct.
  `report-count` no longer names its script in `tasks.md`.
- The wiki has the shape of the Claude Code docs: an overview, a quickstart, a reference page for each plugin, `Hooks`, `Troubleshooting`, and `Undocumented-Reads`, which gives the source of each read of undocumented data and how it breaks.
  The old release pages are in `wiki/archive/`.
- CI runs `just check` with Claude Code 2.1.296, and `just lab` runs the lab of each plugin that has a `tests/` folder.
  The repository has `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue and pull request templates, and `dependabot.yml`.
- Each plugin manifest has `$schema`, `keywords`, and `homepage`, and its description is the same text as in the marketplace.
  The `backend` option of `dotclaude-browser` lists its values, `agent-browser` and `cloakbrowser`.
- The lab bins take flags in place of custom env vars: `dotclaude-sandbox --dir DIR` (also `--clean` and `tools/start-run.mjs`) and `dotclaude-capture --upstream URL`.
  `dotclaude-sandbox` finds `claude` on `PATH` only, and the capture proxy reads `ANTHROPIC_BASE_URL` when `--upstream` is not set.
- For contributors: the sandbox, the request capture, the settings schema, the start measure, and the usage report moved from `tools/` into `dotclaude-lab` and `dotclaude-sessions`.
  `just sandbox` gives `--plugin-dir` for each plugin of the checkout, and `DOTCLAUDE_SANDBOX_PLUGINS` is removed.
  `dotclaude-sandbox` makes each `--plugin-dir` absolute, because `claude` runs in the sandbox project and skips a relative folder.
  `just measure` passes the start bounds of `tools/limits.mjs` to `dotclaude-start`, and the usage report no longer reads `verdicts.jsonl`.
  `just debug-agents` runs `dotclaude-sandbox --check-frontmatter`.
- For contributors: the tests are in one folder for each feature, such as `tests/dotclaude/guard/`, in place of file names with a shared prefix.
- When the headless browser of `dotclaude-browser` fails or gets no search results, such as a bot check, the built-in `WebSearch` answers the call.
  Before, the hook denied the call, and a session could end with no answer.
- The size bounds that equaled the current file size are gone (`STYLE_MAX_BYTES`, `VARIANT_MAX_BYTES`, and `SKILL_DESCRIPTION_MAX_CHARS`), and size targets in `tools/limits.mjs` replace them: `CLAUDE.md` at most 6 KB, skill metadata of 150 to 300 bytes for each skill, and skill bodies of 2 KB to 8 KB.
  The skill metadata of all skills has a target of 5 KB to 8 KB and a ceiling of 15 KB, and the first request has a target of 8 KB to 16 KB.
  A size above a high bound fails, and a size below a low bound is reported.
- The output style is shorter.
  It asks for reports that start with the result, name each item exactly, give numbers before and after a change, and say which claims are not verified.
- dotclaude is tested on Claude Code 2.1.296, and the minimum version is 2.1.296, because the settings schemas are of that version.
  The `intro` section of the system prompt has one text since 2.1.295, and `CLAUDE_CODE_INTRO_FRAME` is gone.
- The core plugin has five agents: `debugger`, `implementer`, `investigator`, `reviewer`, and `test-runner`.
  Each agent has a `maxTurns` value, a `model`, and an `effort` in its frontmatter, and `web-researcher` is merged into `investigator`.
- The core plugin follows the plugin layout of the Claude Code docs.
  `hooks/register.mjs` is the one hooks module, `features/<name>/` holds the code of each part, and `lib/` holds the shared code.
- Each file has 300 lines or fewer, and each test file 500 lines or fewer.
  A test fails on a file over its bound.
- Runtime JavaScript in `plugins/` is `.mjs` on Node.
  A test fails on another script type, except the hook-lab `.test.ts` files.
- For contributors: `just measure` sizes the start of a session and prints the figures, `just capture` logs and sizes the requests of Claude Code, and `just schema` writes the settings schemas.
  `just start-run` captures and measures the start of a clean sandbox session in one command, `just debug-agents` fails when the debug log names an unknown frontmatter field, `just eval-variant REF` runs the eval cases on the checkout and on a variant at a git ref, and `just eval` takes eval options such as `--case NAME`.
  `just eval-variant` copies the results of the variant arm to `plugins/dotclaude/evals/results/variant-REF-TIMESTAMP/` before it removes the worktree.
- For contributors: pnpm installs the pinned toolchain (Biome, markdownlint-cli2, and TypeScript) from `pnpm-lock.yaml`, `.node-version` pins Node 22.18, and `just lint` and CI also lint the Markdown.
- For contributors: the repository has no Bun.
  The tests run with `node --test` (`just test` or `pnpm test`), the scripts of `tools/` run on Node, and `pnpm` installs the `yaml` parser that the eval-case test reads `case.yaml` with.
- `just schema` reads Claude Code 2.1.296 only.
  The tables of older versions are removed, because each build renames the minified helpers.
  The schema check of a definition now reads the object and record helpers from the table, so a lazy record such as `env` keeps its `object` type.
- Each `catch` in `plugins/` now names the error that it expects, such as `ENOENT` or `SyntaxError`, and passes the others on.
  A classic hook that crashes still lets the call go on, and it writes the error to stderr.
  The guard of `dotclaude` no longer keeps an empty list of GitHub owners for the session after a failed `gh` call, and it asks `gh` again at the next check.
- Windows: `codegraph`, `openspec`, and `claude` start through `cmd.exe` when they are `.cmd` files.
  An argument with `%`, `!`, `"`, a line break, or an end `\` is refused there, because `cmd.exe` expands `%` before it reads quotes.
  A missing `codegraph` adds no session line, `dotclaude-sandbox` sets `USERPROFILE` for the child, and `readTail` returns `null` for a folder.
- CI runs `just ci`, which is `just check` without the type check, because Claude Code writes `.claude-plugin/types/` only when an interactive session loads the plugin.

### Removed

- The `dotclaude-modder` plugin left the marketplace, because dotclaude is a set of general software-engineering roles.
  Uninstall it with `claude plugin uninstall dotclaude-modder@dotclaude`.
- dotclaude uses no proprietary format.
  A format is proprietary when dotclaude defines it and no surface of Claude Code reads or defines it.
  dotclaude takes only what Claude Code provides: settings, env vars, hooks and the other documented extension points, and the files that Claude Code owns.
  A feature that must write its own file so that a later call reads it back is not built.
  The next entries list what this rule removed against 0.27.0.
  There is no migration, no compatibility shim, and no reader for an old file.
- The settings profile is gone: `templates/settings.json`, the setup merge of it into your settings, the diff, `--apply` for settings, and `--with <item>` with its eval-gated items.
  Setup also lost the backup of each written file, the migration of 0.26 keys, the CVP gate, the `--move-managed` option, the managed drop-in `templates/managed-settings.json` and its `sudo cp` command, the language server hints, and the launcher stub of the status line.
  `lib/never-set.mjs` is gone, and a test holds the list of keys that must stay unset.
  A plain settings snippet in the wiki (`wiki/settings/Settings-Snippet.md`) replaces the profile, and you copy the keys that you want into your own settings.
- The file of project rules for the Tier 2 checks, the router with its table of models and efforts, and the router `PreToolUse` hook are gone.
  The `model` and `effort` of each agent are in its frontmatter.
- The status line no longer shows a burn rate, the slow-read cache, or the estimates of the memory, skills, and agents parts, because each one needed a state file.
- The usage state file and the notes at a usage limit are gone.
- The context markers, the handoff carry after `/clear`, and the stop records are gone, and the next session start no longer names a stop.
- The `handoff` skill and the notes in `.claude/handoffs/` are gone.
- The main-session context note is removed, because compaction is off and the output style covers it.
- The guard keeps no per-session state file.
  The classic hook for auto mode is gone, and the hooks module asks for a GitHub repository of another owner.
- The `rm` ask is now `ask` permission rules for a recursive `rm` in the settings snippet, with the sandbox.
  The `rm` parser and its classic hook are gone.
  The `git` ask, which now also reads `timeout`, `env -i`, `nice`, and `xargs` before `git`, and the file-print deny share one shell reader, `lib/shell.mjs`.
- Auto-fix at `Stop`, `DOTCLAUDE_AUTOFIX`, and the `autofix` item are gone.
- The `sembr-chat.jsonl` log of chat lines is gone.
- `sembr` runs only in the hooks module: `tool.call` handlers on `Write`, `Edit`, and `Bash` replace the classic `PreToolUse` hook `features/sembr/cli.mjs`.
  The classic hooks `reads`, `adherence`, and `context` share one stdin reader and one `hookSpecificOutput` builder in `lib/hook-io.mjs`.
- `tools/baseline.json` is gone, and `just measure` writes no file.
- The eval harness is gone: `tools/eval/`, `evals/`, and `just eval`.
  The `adherence` suite and the other cases go with it.
- The copies of the schemas of Claude Code 2.1.293 and 2.1.294 are gone, and the `x-claude-code-version` key is gone from the schema files.
- Files from earlier versions stay on your machine, and no code of dotclaude deletes them.
  You can delete each one.
  - `<config dir>/settings.json.dotclaude-backup-<time>` and the same name for `<config dir>/CLAUDE.md`, `.claude/settings.json`, and `.claude/settings.local.json`, where `<config dir>` is `~/.claude` or `CLAUDE_CONFIG_DIR`.
    Setup 0.27.0 wrote them next to a file before it changed the file, and it kept the newest three for each file.
  - `<config dir>/dotclaude/statusline.mjs`, the launcher stub of the status line.
    A `statusLine` setting that runs it prints nothing now, because the script it looks for is gone.
    Remove that setting or set the status line again.
  - `<config dir>/dotclaude/subagents.mjs`, the launcher stub of 0.26 that setup 0.27.0 removed only when it ran.
  - `${CLAUDE_PLUGIN_DATA}/auto-mode-guard/<session id>.json`, the guard state of the classic hook of 0.27.0.
    The hook wrote it into the system temp folder, in `auto-mode-guard/`, when `CLAUDE_PLUGIN_DATA` was not set.
  - `.claude/handoffs/<slug>.md` in a project, the notes of the `handoff` skill of 0.27.0 and the hooks of 0.26.
  - `/Library/Application Support/ClaudeCode/managed-settings.json` on macOS, `/etc/claude-code/managed-settings.json` on Linux, and `C:\Program Files\ClaudeCode\managed-settings.json` on Windows.
    Setup 0.27.0 only printed the `sudo cp` command for it, so the file exists only if you ran that command.
    Delete it with `sudo rm`, and the drift check stops reporting a seated guard.
  - `~/.universal-modder/` (or the folder in `UM_HOME`) and `%LOCALAPPDATA%\universal-modder`, the backups, downloads, and knowledge cache of the removed `dotclaude-modder` plugin.
  - The keys that setup 0.27.0 merged into your settings stay in your settings files.
    Keep or remove each one yourself.

## Older Releases

| Series | Releases |
| --- | --- |
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
