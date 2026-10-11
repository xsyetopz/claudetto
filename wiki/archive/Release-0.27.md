# Release 0.27

Released 2026-10-07.

0.27.0 is a breaking release.
The core plugin is built again from an empty tree on the documented extension points of Claude Code 2.1.292:
a settings profile, a forced output style, one hooks module, agents, and skills.
The [Design](https://github.com/xsyetopz/dotclaude/wiki/Design) page gives the source of each decision.

## Migration from 0.26

- Install Node.js 22.18 or later, because the scripts and hooks no longer run on Bun.
- Update, restart Claude Code, and run `/dotclaude:setup`.
  Setup removes `includeGitInstructions: false`, `autoCompactWindow`, `advisorModel`, the 0.26 `subagentStatusLine` and its stub,
  and the 0.26 block in `<config dir>/CLAUDE.md`, because they work against the new profile.
  It makes a backup of each file before it writes.
- The plugin options are gone, so the `/config` entries of dotclaude have no effect.
- Handoff notes from 0.26 in `.claude/handoffs/` stay readable, and no hook writes new ones.

## Added

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

## Changed

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

## Removed

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
