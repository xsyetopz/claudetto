# Release 0.28

This page lists the parts that 0.28 adds and removes, for users and contributors.

The changed behavior and the fixes are on [Release 0.28 Changes and Fixes](Release-0.28-Changes).

Released 2026-10-09.

## Added

- `just typecheck` runs `tsc --noEmit` on the lab tests and on the core hooks module, and `just check` runs it after the lint.
  The lab tests use the types of the mods API in place of `any`.
- The `WebSearch` hook of `dotclaude-browser` runs `agent-browser` with the newest CloakBrowser binary in `~/.cloakbrowser/` when one is present.
  It does so because plain headless `agent-browser` got a bot check from DuckDuckGo.
  The `backend` option `cloakbrowser` now needs that binary and no longer denies each search.
- The status line has 3 columns when the terminal has about 130 columns.
  The left column shows the session, the middle column shows the context, and the right column shows the 5-hour, 7-day, and Fable windows.
  A narrower terminal keeps the row packing.
  After the user runs `/context`, the middle column shows the exact rows of the newest table.
  The messages are the total minus them.
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
  `dotclaude-capture` logs the requests of Claude Code through a local proxy and sizes the first one.
  `dotclaude-schema` writes the JSON Schema of `settings.json`.
  `dotclaude-eval-compare` runs `claude plugin eval` on two plugin folders.
  The skill `eval-compare` tells Claude how to compare the plugin arms.
- `dotclaude-browser` answers each `WebSearch` call with a search in the headless browser.
- `dotclaude-jev` adds a second-opinion tool that asks TypeSafe Jev about a decision.
  With no `TYPESAFE_API_KEY`, the plugin registers no tool, so it costs no tokens.
  The retries of the client end before the 45 s kill of the hooks module, and each bound is in `features/jev/limits.mjs`.
  The question gives each option at least one fact for it and one fact against it.
  It has no lean of the user, the notes, or the team.
  The question of `AskUserQuestion` always goes to you with the pick of Jev, also when Jev is sure, and Claude never skips it.
  The fallback result tells Claude to answer from its own check and to tell you that no second opinion was available.
  The error text of the API that goes to Claude is cut to 200 characters (`ERROR_BODY_MAX`).
- The core plugin has one route for the system prompt.
  The rules that every model shares are system prompt sections in `features/prompt/shared.mjs`, and `prompt.compose` puts them before the model notes.
  The output style holds only the role, the tone, and the format.
  The reason is that Claude Code sends an output style as a message in the conversation and not in the system prompt.
  A kept eval trace showed the style as an `output_style_instructions` attachment.
  With the rules in it, the plugin arm scored like the no-plugin baseline on `facts-release-scope` and `report-count`.
  The prompt variants hold only the text of one model.
  Examples are the step line of Haiku 5.5 and the block that a subagent gets at spawn.
  The Sonnet and Haiku variants no longer repeat the verification rule, and the Fable variant no longer repeats the extras rule.
  The shared sections hold both.
  Mythos 5.1 gets the Fable variant, because one prompting guide covers both models.
  The evidence line tells Claude to run a new check before it undoes finished work because of a claim of fault.
  This applies also when the user tells Claude to remove the work.
  The `doing_tasks` section tells Claude that a manifest version with no tag is the release in progress.
  Its changelog entries go in the section of that version.
  The `counts` section tells Claude to copy each count from a tool output and to look first for a project command that prints it.
  The `Bash` tool text tells Claude to end commit messages and pull request text with the attribution text of the session.
- The source of the wiki in `wiki/` is grouped in folders.
  The page names and the page URLs are unchanged, because a GitHub wiki addresses a page by its bare name.
- The hooks module cuts the prompt surface with the handlers `prompt.attachment` and `tool.describe`.
  They shorten the `sandbox_instructions` and `auto_mode` texts and the descriptions of large tools, and they defer `AskUserQuestion` and `ListAgents`.
  With `sandbox.allowUnsandboxedCommands` set to `true`, the short sandbox text keeps the rule that a run outside the sandbox needs an approval.
  The short `Agent` tool text does not name `SendMessage`, because the output style tells Claude to start a new subagent for more work.
- A subagent that reaches its context bound gets a message to report now.
- A subagent with 2 turns left before its `maxTurns` gets a message to report now.
  The message is in the same note as the context message when both apply.
- Hooks check the rules of a project that code can check.
  They ask before `git stash`, `git reset`, and a `git checkout` or `git restore` of a path.
  They ask before a change to an existing line of a test file or a limits file.
  They deny a Markdown write or a commit message with a code item outside a code span.
  They deny text that claims an approval of the user when no prompt of the user gives one.
  They also ask before an edit of a lint or type-check config, a check runner config, a CI file, or a hook file.
  The hook files are `hooks/hooks.json`, `hooks/register.mjs`, a `hooks/*.txt` text, `.claude/hooks/`, a script that a `hooks.json` command names, the inline `hooks` of `plugin.json`, `.husky/`, and `.pre-commit-config.yaml`.
  They also ask before an edit of the keys `hooks`, `permissions`, `disableAllHooks`, `enabledPlugins`, and `sandbox` of `.claude/settings*.json`.
  They ask before the linter sections of `pyproject.toml` and `setup.cfg`, a check script of `package.json`, and a check recipe of a `justfile` or `Makefile`.
  They also ask before an added skipped or focused test (`.skip`, `.only`, and `.todo`) or an added inline lint suppression.
  A `Bash` write to such a file also asks.
  A `Bash` write to a test file, a limits file, a settings file, or a recipe file also asks.
  The write commands are `sed -i`, `perl -i`, `>`, `>>`, `tee`, `cp`, `mv`, `install`, `rm`, `unlink`, `truncate`, `ln -f`, `git checkout --`, `git restore`, `git rm`, `git mv`, and `find` with `-delete` or `-exec rm`.
  A `Bash` write that only adds to a test file or a limits file gets no ask, the same as a `Write` of a new file.
  A path under `/dev` or under a variable other than `CLAUDE_PROJECT_DIR` or `HOME` gets no ask.
  A path under `~` or outside the project root gets the ask.
  The ask covers a lint config, a runner config, a CI file, a hook file, a settings file, or a recipe file.
  It gets no ask for a test file or a limits file.
  A `Bash` write to `pyproject.toml`, `setup.cfg`, or `package.json` gets no ask.
  Each ask reason is written for you and says why the change can hide a defect.
- A `Read` rule hook denies a `Bash` command that only prints a file (`cat`, `sed`, `head`) and gives the `Read` call instead.
- Semantic line breaks: a written Markdown file and the quoted heredoc of `git commit` and `gh pr create` get one sentence on each line.
- A prompt hook on `Stop` blocks one time a message that calls a part done when no passing check shows it.
  It also blocks one time a message that starts with agreement, praise, thanks, or an apology in place of the state, in any language.
  It also blocks one time a message that changes an earlier answer with no evidence.
  It also blocks one time a message that says the agent raised a bound so that a check passes.
  It also blocks one time a message that says the agent weakened or skipped a test so that a check passes.
  It also blocks one time a message that says the agent edited a check or a config so that a check passes.
  It blocks that message only when you did not ask for the change.
  It never runs on `SubagentStop`.
  Sonnet 5.5 judges the message.
  The prompt asks for the JSON answer first.
  The reason is that an evaluator that wrote prose made Claude Code return the hook prompt to the session as feedback.
  The prompt also tells the session agent to send its report again when the prompt returns to it as `Stop hook feedback`.
- A drift check at `SessionStart` tells Claude about these differences:
  - a built-in plugin that is on again,
  - a synced claude.ai skill,
  - a Claude Code version other than the tested one,
  - a system prompt section that dotclaude does not know,
  - an env var that overrides the `model` and `effort` of the agents,
  - managed settings that seat the guard of Claude Code.
- `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json` hold the settings schemas of Claude Code 2.1.296, and `dotclaude-schema` of the plugin `dotclaude-lab` builds them.
  The version is in the standard `$comment` keyword at the root of each file, such as `Extracted from Claude Code 2.1.296`.
  It is in no file name and in no made-up key, so the `$schema` link stays the same after an update.
  The generator puts the code items of each description in single backticks, so an editor shows them as code.
  The generator takes the last definition before the schema for a reused short name, so `hooks` and `sandbox.credentials.sigv4` carry no wrong shape.
- The core plugin has a `settings.json` at its root, which holds only keys that Claude Code reads from a plugin.
  Today it sets no key.
  A test checks it against the generated schema and fails on a key that a plugin must not set.
- The `setup` skill merges the settings snippet into the settings file that you pick, after you see each change and agree.
  Without it, 0.28.0 applied none of the snippet.
  Compaction stayed on, the full system prompt stayed, and the status line, the permission rules, and the sandbox were not set.
  The snippet ships in `lib/snippet.mjs`, which setup and the drift check share, and a test keeps it equal to the wiki page `Settings-Snippet`.
  The status line commands get the absolute path of the installed plugin folder, so run setup again after each plugin update.
  When `dotclaude-docs` is installed, the merge adds its allow rule and domain.
  When the cached model catalog of the account offers it, `availableModels` gets `claude-mythos-5-1` in place of `claude-fable-5-1`.
  Then setup checks the `openspec` CLI, offers the install, and runs `openspec init --tools claude`, `openspec config set delivery skills`, and `openspec update` after you agree.
  Last, setup checks the tools of each installed add-on (`codegraph` and its index, `agent-browser`, `npx`, `TYPESAFE_API_KEY`, and Node.js).
  It offers each missing global install, and it runs `codegraph init -y` after you agree.
  It never asks for the Jev key or writes it.
- The drift note at session start reports the values of the snippet that the settings lack.
  It also reports a status line command that runs another plugin folder or a 0.27.0 stub.
  The fix is `/dotclaude:setup`.
- The format of the evals is the suite format of `claude plugin eval`, which Claude Code owns.
  The 14 cases are in `plugins/dotclaude/evals/`, because the command reads cases only from a folder inside the plugin.
  `just eval` runs them with no published report and a cost limit.
  The first run on 2026-10-09 scored 1 on the plugin arm in 13 of 14 cases (`wiki/evals/Evals-0.28.0.md`).
  The graders on `Edit` and `Write` now match the protected path only after `file_path`, and the `Bash` graders match whole words only.
- The output style and the agents `debugger`, `implementer`, `reviewer`, and `test-runner` tell Claude to read a tool, a command, or a convention from the project.
  Claude reads that before it chooses one.
  The files to read are the build and task files of the project, the config files of its tools, and `CLAUDE.md`.
  Claude reads these files in any language and names the file that it read.
  A subagent saw `biome.json` and chose Prettier, although the project runs `biome ci`.
- The output style tells Claude that background work of a stopped subagent still runs.
  Claude waits for its notification, and it does not start the same work again.
  It also tells Claude that a check that fails shows nothing about the state that it checks.
  An example is a process list that the sandbox stops.
- For contributors: the `description` and the `Stop` prompt of `hooks.json` come from `description.txt` and `Stop.prompt.txt` next to it, with one sentence on each line.
  `just hook-text` writes them into `hooks.json`, and a test fails when the two differ.
- `just eval` and `just eval-variant` run under a lock (`tools/lock.ts`), so a second eval run cannot start while one is in progress.
- The output style tells Claude to copy each count in a report from a tool output, and the eval case `report-count` checks it.
  A count of lines or items in a file or an output is a computed count.
  Claude runs a command of the project or `grep -c` to get it.
  It adds no count of its own next to a copied count.
- The output style tells Claude to read the scope of the work from the state of the project.
  The state is the branch, the tags, the version, and the open plans.
  For example, a changelog entry for a version that is bumped and not tagged goes in the section of that version.
  The eval case `facts-release-scope` checks it.
- The output style and the `implementer` agent tell Claude that a test checks what the code does.
  Examples are a decision, an exit status, a file, or a value that a message carries.
  A test does not check the words of a message, a doc, or a comment.
  When the user gives a rule about text, Claude follows it when it writes, and does not make a test of it.
  The `reviewer` agent looks for tests of prose, a raised bound, a skipped test, and an edited lint or CI config.
- The output style has a `<blocks>` section, and the block of each subagent has a short form of it.
  A failing check, a lint rule, a test, a bound, a hook, and a permission rule each stop the work for a reason.
  Claude changes the work to fit the block or asks you.
  It does not raise a bound, weaken or skip a test, or edit a check, a config, or a hook so that a check passes.
  It does so only when you ask.
- The agents `debugger` and `implementer` say what to do when a check fails: fix the code, or report the failure with the evidence.
  The `debugger` agent no longer changes a test, and it reports a test that it thinks is wrong to the parent.
- `dotclaude-browser` tells Claude to ask you before it passes a blocked page and before `--auto-connect`.
  With the `cloakbrowser` backend and no binary, Claude tells you and does not switch to plain `agent-browser`.
- The skills `docs` and `eval-compare` tell Claude to stop and tell you when it reaches a bound.
  The bounds are 3 `ctx7` calls or the cost bound of a run.
  Claude does not raise the bound or fill the gap from memory.

## Removed

- The `dotclaude-modder` plugin left the marketplace, because dotclaude is a set of general software-engineering roles.
  Uninstall it with `claude plugin uninstall dotclaude-modder@dotclaude`.
- dotclaude uses no proprietary format.
  A format is proprietary when dotclaude defines it and no surface of Claude Code reads or defines it.
  dotclaude takes only what Claude Code provides: settings, env vars, hooks and the other documented extension points, and the files that Claude Code owns.
  A feature that must write its own file, so that a later call reads that file, is not built.
  The next entries list what this rule removed against 0.27.0.
  There is no migration, no compatibility shim, and no reader for an old file.
- The settings profile file `templates/settings.json`, the diff, and `--with <item>` with its eval-gated items are gone.
  Setup also lost the backup of each written file.
  It lost the migration of 0.26 keys, the CVP gate, and the `--move-managed` option.
  It lost the managed drop-in `templates/managed-settings.json` and its `sudo cp` command.
  It lost the language server hints and the launcher stub of the status line.
  `lib/never-set.mjs` is gone, and a test holds the list of keys that must stay unset.
  The settings snippet in the wiki (`wiki/settings/Settings-Snippet.md`) replaces the profile, and setup applies it.
- The file of project rules for the Tier 2 checks is gone.
  So are the router with its table of models and efforts, and the router `PreToolUse` hook.
  The `model` and `effort` of each agent are in its frontmatter.
- The status line no longer shows a burn rate, the slow-read cache, or the estimates of the memory, skills, and agents parts.
  Each one needed a state file.
- The usage state file and the notes at a usage limit are gone.
- The context markers, the handoff carry after `/clear`, and the stop records are gone, and the next session start no longer names a stop.
- The `handoff` skill and the notes in `.claude/handoffs/` are gone.
- The main-session context note is removed, because compaction is off and the output style covers it.
- The guard keeps no per-session state file.
  The classic hook for auto mode is gone, and the hooks module asks for a GitHub repository of another owner.
- The `rm` ask is now `ask` permission rules for a recursive `rm` in the settings snippet, with the sandbox.
  The `rm` parser and its classic hook are gone.
  The `git` ask now also reads `timeout`, `env -i`, `nice`, and `xargs` before `git`.
  The `git` ask and the file-print deny share one shell reader, `lib/shell.mjs`.
- Auto-fix at `Stop`, `DOTCLAUDE_AUTOFIX`, and the `autofix` item are gone.
- The `sembr-chat.jsonl` log of chat lines is gone.
- `sembr` runs only in the hooks module: `tool.call` handlers on `Write`, `Edit`, and `Bash` replace the classic `PreToolUse` hook `features/sembr/cli.mjs`.
  The classic hooks `reads`, `adherence`, and `context` share one stdin reader and one `hookSpecificOutput` builder in `lib/hook-io.mjs`.
- `tools/baseline.json` is gone, and `just measure` writes no file.
- The eval harness is gone: `tools/eval/`, `evals/`, and `just eval`.
  The `adherence` suite and the other cases go with it.
- The copies of the schemas of Claude Code 2.1.293 and 2.1.294 are gone, and the `x-claude-code-version` key is gone from the schema files.
- Files from earlier versions stay on your machine, and no code of dotclaude removes them.
  You can remove each one.
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
    Remove it with `sudo rm`, and the drift check stops reporting a seated guard.
  - `~/.universal-modder/` (or the folder in `UM_HOME`) and `%LOCALAPPDATA%\universal-modder`, the backups, downloads, and knowledge cache of the removed `dotclaude-modder` plugin.
  - The keys that setup 0.27.0 merged into your settings stay in your settings files.
    Keep or remove each one yourself.

## Related Pages

- Changes and fixes: [Release 0.28 Changes and Fixes](Release-0.28-Changes)
- [Archive](Archive)
- [Archive of 0.28](Archive-0.28)
- [Decisions Reversed](Decisions-Reversed)
- [Open Items](Open-Items)
- [Stop Prompt Hooks](Stop-Prompt-Hooks)
