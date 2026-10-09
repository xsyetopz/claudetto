# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.
The [Release History](https://github.com/xsyetopz/dotclaude/wiki/Release-History) page of the wiki has the notes of older releases.

## [Unreleased]

### Added

- The `WebSearch` hook of `dotclaude-browser` runs `agent-browser` with the newest CloakBrowser binary in `~/.cloakbrowser/` when one is present, because plain headless `agent-browser` got a bot check from DuckDuckGo.
  The `backend` option `cloakbrowser` now needs that binary and no longer denies each search.
- A `Bash` command whose output has no limit, such as `cat F | grep x`, `jq . F`, `git log`, or `rg x`, is denied.
  The reason gives the bounded form, such as `| head -n N`, `grep -m N`, `git log -n N`, or `Read` with `offset` and `limit`.
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
- `dotclaude-browser` answers each `WebSearch` call with a search in the headless browser.
- `dotclaude-jev` adds a second-opinion tool that asks TypeSafe Jev about a decision.
  With no `TYPESAFE_API_KEY`, the tool sends Claude to the `reviewer` agent.
  The question gives each option at least one fact for it and one fact against it, and no lean of the user, the notes, or the team.
- The core plugin gives a prompt variant for each model, with an evidence line and an attribution line.
  The evidence line tells Claude to run a new check before it undoes finished work because of a claim of fault.
  The attribution line tells Claude to end commit messages and pull request text with the attribution text of the session.
- The hooks module cuts the prompt surface with the handlers `prompt.attachment` and `tool.describe`.
  They shorten the `sandbox_instructions` and `auto_mode` texts and the descriptions of large tools, and they defer `AskUserQuestion` and `ListAgents`.
- A subagent that reaches its context bound gets a message to report now.
- A subagent with 2 turns left before its `maxTurns` gets a message to report now, in the same note as the context message when both apply.
- The main session gets a note at each prompt while its context is at or above 60% of the window.
  The note tells the model to continue in small slices, and it gives the tokens left before the client block.
  At 80% of the window, the note tells the model to hand off: tick the tasks in the OpenSpec change, write the decisions to `design.md`, and name the command that continues the work.
  The note keeps no state, so it repeats at each prompt at or above a level.
- Hooks check the rules of a project that code can check.
  They ask before `git stash`, `git reset`, and a `git checkout` or `git restore` of a path.
  They ask before a change to an existing line of a test file or a limits file.
  They deny a Markdown write or a commit message with a code item outside a code span.
  They deny text that claims an approval of the user when no prompt of the user gives one.
- A `Read` rule hook denies a `Bash` command that only prints a file (`cat`, `sed`, `head`) and gives the `Read` call instead.
- Semantic line breaks: a written Markdown file and the quoted heredoc of `git commit` and `gh pr create` get one sentence on each line.
  At `Stop`, a hook counts the chat lines that have more than one sentence.
- A prompt hook on `Stop` blocks one time a message that calls a part done when no passing check shows it.
  It never runs on `SubagentStop`.
- A drift check at `SessionStart` tells Claude about these differences:
  a built-in plugin that is on again, a synced claude.ai skill, a Claude Code version other than the tested one, a system prompt section that dotclaude does not know, an env var that overrides the `model` and `effort` of the agents, and managed settings that seat the guard of Claude Code.
- `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json` hold the settings schemas of Claude Code 2.1.295, and `tools/schema.mjs` builds them.
  The version is in the standard `$comment` keyword at the root of each file, such as `Extracted from Claude Code 2.1.295`.
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
  No run of the new suite has passed yet, so dotclaude has no eval gate until one does.
- The output style and the agents `debugger`, `implementer`, `reviewer`, and `test-runner` tell Claude to read a tool, a command, or a convention from the project before it chooses one.
  The files to read are the `package.json` scripts, the `justfile`, the config files of the tools, and `CLAUDE.md`, and Claude names the file that it read.
  A subagent saw `biome.json` and chose Prettier, although the project runs `biome ci`.

### Changed

- The size bounds that equaled the current file size are gone (`STYLE_MAX_BYTES`, `VARIANT_MAX_BYTES`, and `SKILL_DESCRIPTION_MAX_CHARS`), and size targets in `tools/limits.mjs` replace them: `CLAUDE.md` at most 6 KB, skill metadata of 150 to 300 bytes for each skill, and skill bodies of 2 KB to 8 KB.
  The skill metadata of all skills has a target of 5 KB to 8 KB and a ceiling of 15 KB, and the first request has a target of 8 KB to 16 KB.
  A size above a high bound fails, and a size below a low bound is reported.
- The output style is shorter.
  It asks for reports that start with the result, name each item exactly, give numbers before and after a change, and say which claims are not verified.
- dotclaude is tested on Claude Code 2.1.295, and the minimum version is 2.1.295, because the settings schemas are of that version.
  The `intro` section of the system prompt has one text in 2.1.295, and `CLAUDE_CODE_INTRO_FRAME` is gone.
- The core plugin has five agents: `debugger`, `implementer`, `investigator`, `reviewer`, and `test-runner`.
  Each agent has a `maxTurns` value, a `model`, and an `effort` in its frontmatter, and `web-researcher` is merged into `investigator`.
- The core plugin follows the plugin layout of the Claude Code docs.
  `hooks/register.mjs` is the one hooks module, `features/<name>/` holds the code of each part, and `lib/` holds the shared code.
- Each file has 300 lines or fewer, and each test file 500 lines or fewer.
  A test fails on a file over its bound.
- Runtime JavaScript in `plugins/` is `.mjs` on Node.
  A test fails on another script type, except the hook-lab `.test.ts` files.
- The guard allows `rm -rf` of a shell variable that the same command sets to `$(mktemp -d)` or to a path under `$TMPDIR`.
- For contributors: `just measure` sizes the start of a session and prints the figures, `just capture` logs and sizes the requests of Claude Code, and `just schema` writes the settings schemas.

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
  A plain settings snippet in the wiki (`wiki/Settings-Snippet.md`) replaces the profile, and you copy the keys that you want into your own settings.
- The file of project rules for the Tier 2 checks, the router with its table of models and efforts, and the router `PreToolUse` hook are gone.
  The `model` and `effort` of each agent are in its frontmatter.
- The status line no longer shows a burn rate, the slow-read cache, or the estimates of the memory, skills, and agents parts, because each one needed a state file.
- The usage state file and the notes at a usage limit are gone, so the context note has only the context levels.
- The context markers, the handoff carry after `/clear`, and the stop records are gone, and the next session start no longer names a stop.
- The `handoff` skill and the notes in `.claude/handoffs/` are gone.
  The context note tells the model to tick the tasks in the OpenSpec change and to write its decisions to `design.md`.
- The guard keeps no per-session state file.
  The classic hook for auto mode gives only the `rm` ask, and it no longer asks for a GitHub repository of another owner.
  The hooks module still asks for that repository.
- Auto-fix at `Stop`, `DOTCLAUDE_AUTOFIX`, and the `autofix` item are gone.
- The `sembr-chat.jsonl` log of chat lines is gone.
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

## [0.27.0] - 2026-10-07

0.27.0 is a breaking release.
The core plugin is built again from an empty tree on the documented extension points of Claude Code 2.1.292:
a settings profile, a forced output style, one hooks module, agents, and skills.
The [Design](https://github.com/xsyetopz/dotclaude/wiki/Design) page gives the source of each decision.

### Migration from 0.26

- Install Node.js 22.18 or later, because the scripts and hooks no longer run on Bun.
- Update, restart Claude Code, and run `/dotclaude:setup`.
  Setup removes `includeGitInstructions: false`, `autoCompactWindow`, `advisorModel`, the 0.26 `subagentStatusLine` and its stub,
  and the 0.26 block in `<config dir>/CLAUDE.md`, because they work against the new profile.
  It makes a backup of each file before it writes.
- The plugin options are gone, so the `/config` entries of dotclaude have no effect.
- Handoff notes from 0.26 in `.claude/handoffs/` stay readable, and no hook writes new ones.

### Added

- Compaction is off: `autoCompactEnabled: false` and `DISABLE_COMPACT=1`, which also turns off `/compact`.
- The context window is 300K tokens by `CLAUDE_CODE_MAX_CONTEXT_TOKENS=300000`,
  which Claude Code honors only together with `DISABLE_COMPACT`.
  At the limit the session stops, and the user runs `/clear`.
  `CLAUDE_CODE_AUTO_COMPACT_WINDOW=300000` makes `/context` and the context warnings use the same window.
  Without it, Claude Code 2.1.292 uses 200K for Opus 5.5 there.
- Auto memory is off: `autoMemoryEnabled: false`.
- The forced `dotclaude` output style, with `keep-coding-instructions: false`,
  together with `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1`.
  It replaces the built-in coding instructions and the 0.26 spec injection, and the prompt cache holds it.
- The sandbox is on, with network access only to GitHub and the package registries.
- `templates/managed-settings.json` for users who want the compaction, memory, and sandbox keys enforced.
  Setup prints the copy command and does not run it, because it needs `sudo`.
  With it, the built-in guard `sec-default` loads and skips the `context_management` text of the module.
- OpenSpec is a first-class integration.
  Setup checks the `openspec` CLI, offers the install and `openspec init --tools claude`,
  and the status line shows the active change with its task count.
- The profile turns off the tools that it does not use, so that their schemas leave each request:
  `enableArtifact: false`, `enableWorkflows: false`, and deny rules for `ScheduleWakeup` and `ReportFindings`.
  `/code-review` then gives its findings as text.
  In the sandbox, `/context` at the start of a session fell from 32k to 8.1k tokens, with the trimmed modder plugin.
- The hook lab: `just lab` runs `claude plugin test plugins/dotclaude`,
  which loads the hooks module and fires stubbed `tool.check` events.

### Changed

- Permissions ask only before dangerous commands, with native rules and no Bash parser:
  force pushes, history rewrites, piped shells, `sudo`, publishes, public `gh` writes, and SQL drops.
  Read-only git and the usual build and test commands are allowed.
- One hooks module replaces the 0.26 command hooks.
  It asks before a recursive `rm` outside the project,
  and before the first call to a GitHub repository of another owner with an AI policy.
  It keeps a deny of the engine and fails open.
  With `DISABLE_COMPACT` set, its `prompt.section` handler replaces the `context_management` section of the system prompt,
  which says that the system summarizes prior messages, with text that says compaction is off.
  The built-in guard `sec-default` skips this handler on a machine with managed settings or a Team or Enterprise login.
- In auto mode, the classifier can allow an ask of the module, so one classic PreToolUse hook, `hooks/auto-mode-guard.mjs`, asks again for the same calls.
  It runs only in auto mode, only for commands that its `if` filters match, and needs Node.js.
- The scripts and hooks of the core and `dotclaude-jev` plugins run on Node.js 22.18 or later, not on Bun.
  Setup changes a `bun` status line command to `node`.
  The `um` command of `dotclaude-modder` stays on Bun, because it uses the YAML parser of Bun.
  The `allowed-tools` of the `second-opinion` skill allow only `node` with `jev.mjs`, not each `bun` command.
  The `drive-web-browser` skill and the Browser page give `npm install -g agent-browser`.
- A prompt audit against Opus 5.5 removed two numeric reply caps from the output style and the `reviewer` agent, and the `Reason:` line of the old spec format from the Jev note.
  The modder skill says that a `/clear` also removes what is not in `MODLOG.md`.
- `/dotclaude:handoff` is user-invoked only.
  It writes a note that primes the next session: the goal, the constraints, the decisions, the rejected approaches, and the proof.
- `maxEffortLevel` is `xhigh`, and the profile sets no effort level, so each model keeps its default.
- The status line is one file, and it shows the context against the 300K window, yellow at 75% and red at 90%.
- The add-on plugins work without the core plugin.
  `dotclaude-browser` is skill-only, and `dotclaude-jev` gives its own session note.
- `dotclaude-modder` has one skill, `mod-any-game`, and no session note.
  The 8 other skills are step files in `references/` that Claude reads only at their step,
  so the plugin adds one skill listing to each session, not nine.
  The rules of the session note are in the skill.
- `includeGitInstructions` stays at its default, and the profile sets `attribution.commit` and `attribution.pr`.

### Removed

- The operating spec, its SessionStart and SubagentStart injection, and `lib/terms.mjs`.
- The compaction fork, the cold-cache note, and each hook that tells the user to run `/clear`.
- The Bash, edit, secret-redaction, spawn, and attribution guards, and the dependency on `betterleaks`.
- The CodeGraph augment, the `sembr` rewrap, the long-run note, the setup notice, and the Stop prompt hook.
- The Ponytail integration and the `minimal-code` rule.
  The output style has its own rule to write the least code that does the task.
- All plugin options, the `Concise` output style, and the `contribute` skill.
- The agents `translator`, `docs-writer`, `digest-writer`, `eval-designer`, `fuzz-engineer`, `infra-engineer`, and `reverse-engineer`.
- The evals in `plugins/dotclaude/evals/` and `tools/compaction-report.mjs`.
- `advisorModel` and `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`.
  The advisor tool adds its instructions to each request, and each advisor call reads the whole context again.
- The `reverse-engineer` agent of `dotclaude-modder`.
  The `reverse-engineer-binary` skill in [xsyetopz/skills](https://github.com/xsyetopz/skills) replaces it.

## Older Releases

| Series | Releases |
| --- | --- |
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
  https://github.com/xsyetopz/dotclaude/compare/dotclaude--v0.27.0...HEAD
