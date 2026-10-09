# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.
The [Release History](https://github.com/xsyetopz/dotclaude/wiki/Release-History) page of the wiki has the notes of older releases.

## [Unreleased]

### Added

- The eval suite `adherence` (`evals/adherence`) has 6 cases with a rule in `CLAUDE.md` and a task that tempts a break of it.
  The rules are of the kinds format, scope, approval, and process, and the oracle of each case names the rule that broke.
  Run it with `just eval --suite adherence`.
- A `Bash` command whose output has no limit, such as `cat F | grep x`, `jq . F`, `git log`, or `rg x`, is denied.
  The reason gives the bounded form, such as `| head -n N`, `grep -m N`, `git log -n N`, or `Read` with `offset` and `limit`.
- The profile sets `bashOutputMaxChars` to 4000, so a longer `Bash` output goes to a file, and Claude gets a preview and the path.
- The status line has 3 columns when the terminal has about 130 columns.
  The left column shows the session, the middle column shows the context and what fills it, and the right column shows the 5-hour, 7-day, and Fable windows.
  A narrower terminal keeps the row packing.
  The memory, skills, and agents parts are estimates from the start of the transcript, read one time for each session.
  After the user runs `/context`, they are the exact rows of its newest table, and the messages are the total minus them.
  The Fable window comes from the usage cache of Claude Code, and it is hidden when that cache is older than 1 hour.
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
- A router picks the model and the effort of each subagent from the task class.
  `DOTCLAUDE_ROUTER_ROUTE=classic` selects a `PreToolUse` hook for the same job.
  A model you name in the `Agent` call stays as it is.
  The table follows the eval report of 2026-10-09 and the Anthropic effort guide.
  `investigator`, `implementer`, `debugger`, and `test-runner` use Haiku 5.5, and `reviewer` uses Sonnet 5.5.
  The main loop keeps the model of your session, and the router changes only its effort, because an effort change keeps the prompt cache.
- The core plugin gives a prompt variant for each model, with an evidence line and an attribution line.
  The evidence line tells Claude to run a new check before it undoes finished work because of a claim of fault.
  The attribution line tells Claude to end commit messages and pull request text with the attribution text of the session.
- The hooks module cuts the prompt surface with the handlers `prompt.attachment` and `tool.describe`.
  They shorten the `sandbox_instructions` and `auto_mode` texts and the descriptions of large tools, and they defer `AskUserQuestion` and `ListAgents`.
- A subagent that reaches its context bound gets a message to report now.
- A subagent with 2 turns left before its `maxTurns` gets a message to report now, in the same note as the context message when both apply.
  The main session gets one note when its context or a usage limit of the account first reaches a level.
  At 60% of the context or 75% of a usage limit, the note tells the model to continue in small slices, and to do the handoff steps when it stops before the handoff.
  The context notice gives the tokens left before the client block, and the model starts a slice only when it fits with 20K tokens to spare for the handoff.
  At 80% of the context or 90% of a usage limit, or when the limit runs out within 15 minutes, the note tells the model to hand off: tick the tasks, write a status note, and name the command that continues the work.
  After `/clear`, the new session gets the handoff message of the old session one time.
  When a usage limit or a full context stops a turn, a stop record is written, and the next session start names the stop in one line and tells the model to examine the working tree.
- A `Read` rule hook denies a `Bash` command that only prints a file (`cat`, `sed`, `head`) and gives the `Read` call instead.
- Semantic line breaks: a written Markdown file and the quoted heredoc of `git commit` and `gh pr create` get one sentence on each line.
  At `Stop`, a hook counts the chat lines that have more than one sentence.
- A prompt hook on `Stop` blocks one time a message that calls a part done when no passing check shows it.
  It never runs on `SubagentStop`.
- Auto-fix at `Stop` runs the project formatters and linters once on the files that Claude edited.
  It is off by default, because a hook command runs outside the sandbox.
  Turn it on with `DOTCLAUDE_AUTOFIX=1`, which setup `--with autofix` writes after a question.
- A drift check at `SessionStart` tells Claude when the active settings differ from the profile.
- The status line has segments for the context, the cache, and each usage limit with its pace, burn rate, and reset credits.
- `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json` hold the settings schemas of Claude Code 2.1.295, and `tools/schema.mjs` builds them.
  The version is in the `x-claude-code-version` key and not in the file name, so the `$schema` link stays the same after an update.
  The generator puts the code items of each description in single backticks, so an editor shows them as code.
  The generator takes the last definition before the schema for a reused short name, so `hooks` and `sandbox.credentials.sigv4` carry no wrong shape.
  The profile points to it.

### Changed

- The size bounds that equaled the current file size are gone (`STYLE_MAX_BYTES`, `VARIANT_MAX_BYTES`, and `SKILL_DESCRIPTION_MAX_CHARS`), and size targets in `tools/limits.mjs` replace them: `CLAUDE.md` at most 6 KB, skill metadata of 150 to 300 bytes for each skill, and skill bodies of 2 KB to 8 KB.
  The skill metadata of all skills has a target of 5 KB to 8 KB and a ceiling of 15 KB, and the first request has a target of 8 KB to 16 KB.
  A size above a high bound fails, and a size below a low bound is reported.
- The output style asks for reports that start with the result, name each item exactly, and give numbers before and after a change.
  Three report examples and the wrong and right line examples are in `<example>` tags, so that Claude does not read them as instructions.
  The style is now at most 7,061 bytes.
- dotclaude is tested on Claude Code 2.1.295, and the minimum version is 2.1.295, because the profile points to the 2.1.295 schema.
  The `intro` section of the system prompt has one text in 2.1.295, and `CLAUDE_CODE_INTRO_FRAME` is gone.
- The profile sets `sandbox.allowUnsandboxedCommands` to `true`, so a command that fails in the sandbox can retry outside it after you approve the retry.
  The sandbox stopped only safe commands, such as `bun` and `gh`, and the guard and the `deny` and `ask` rules stop the dangerous ones.
- The profile now denies `EnterPlanMode`, `ExitPlanMode`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskStop`, and `TaskUpdate`, and sets `includeGitInstructions` to `false`.
  The eval of 2026-10-08 showed no loss for the items `plan-mode`, `task-tools`, and `git-instructions`, so they are no longer eval-gated.
  `telemetry`, `nonessential-traffic`, and `subagent-cache-1h` stay eval-gated.
- Setup no longer removes `includeGitInstructions: false`, because the profile sets it.
- The profile turns off the built-in plugins except `cc-plugin-plugin-authoring`, tips, the survey, feedback drafts, fast mode, agent view, Remote Control, claude.ai skill, plugin, and connector sync, and the `computer-use` server.
  It also sets the `env` entries of the forced-off list, and denies three built-in agents.
  The wiki page "Off switches" lists each part with its scope.
- `lib/never-set.mjs` holds the keys that the profile never sets, and a test fails when the profile sets one.
- Setup `--with <item>` adds an eval-gated item, which is off by default.
  The items are `plan-mode`, `task-tools`, `telemetry`, `nonessential-traffic`, `git-instructions`, and `subagent-cache-1h`.
- Setup writes no managed file and prints no `sudo cp` command.
  With `--move-managed`, it moves the keys of an old dotclaude managed file into user settings, and it prints the `sudo rm` command for you.
  `templates/managed-settings.json` is gone, and the profile holds its keys.
- The core plugin follows the plugin layout of the Claude Code docs.
  `hooks/register.mjs` is the one hooks module, `features/<name>/` holds the code of each part, and `lib/` holds the shared code.
- Each file has 300 lines or fewer, and each test file 500 lines or fewer.
  A test fails on a file over its bound.
- Runtime JavaScript in `plugins/` is `.mjs` on Node.
  A test fails on another script type, except the hook-lab `.test.ts` files.
- The profile sets `maxEffortLevel` to `max`, `enforceAvailableModels` to `true`, and `availableModels` to Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1.
  `subagentPromptCacheTtl: "1h"` is the gated item `subagent-cache-1h`.
  `claude-haiku-4-5`, `cleanupPeriodDays`, and `enableAllProjectMcpServers` left the profile.
  Setup removes `cleanupPeriodDays: 14` only after a question, and keeps any other value.
- Setup shows the diff of each file and writes only with `--apply`.
  In project scope, it writes a key that Claude Code ignores in project settings to local settings.
  The wiki page [Profile keys](https://github.com/xsyetopz/dotclaude/wiki/Profile-Keys) lists each key with its reason and default.
- The core plugin has five agents: `debugger`, `implementer`, `investigator`, `reviewer`, and `test-runner`.
  Each agent has a `maxTurns` value, and `web-researcher` is merged into `investigator`.
- The guard allows `rm -rf` of a shell variable that the same command sets to `$(mktemp -d)` or to a path under `$TMPDIR`.
- For contributors: `just measure` sizes the start of a session, `just capture` logs and sizes the requests of Claude Code, `just schema` writes the settings schemas, and `just eval` runs the eval suite (it costs money).

### Removed

- The `dotclaude-modder` plugin left the marketplace, because dotclaude is a set of general software-engineering roles.
  Uninstall it with `claude plugin uninstall dotclaude-modder@dotclaude`.

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
