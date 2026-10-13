# Release 0.27

This page records the notes of the `0.27` release.

Released 2026-10-07.

0.27.0 is a breaking release.
The core plugin is built again from an empty tree.
It uses only the documented extension points of Claude Code 2.1.292.
These are a settings profile, a forced output style, one hooks module, agents, and skills.
The [Design](https://github.com/xsyetopz/dotclaude/wiki/Design) page gives the source of each decision.

## Migration from 0.26

- Install Node.js 22.18 or later.
  The scripts and hooks no longer run on Bun.
- Update, restart Claude Code, and run `/dotclaude:setup`.
  Setup removes `includeGitInstructions: false`, `autoCompactWindow`, and `advisorModel`.
  It also removes the 0.26 `subagentStatusLine` and its stub.
  It removes the 0.26 block in `<config dir>/CLAUDE.md`.
  These settings work against the new profile.
  Setup makes a backup of each file before it writes.
- The plugin options are gone.
  So the `/config` entries of dotclaude have no effect.
- Handoff notes from 0.26 in `.claude/handoffs/` stay readable.
  No hook writes new ones.

## Added

- Compaction is off: `autoCompactEnabled: false` and `DISABLE_COMPACT=1`.
  `DISABLE_COMPACT=1` also turns off `/compact`.
- The context window is 300K tokens by `CLAUDE_CODE_MAX_CONTEXT_TOKENS=300000`.
  Claude Code honors that variable only together with `DISABLE_COMPACT`.
  At the limit the session stops, and the user runs `/clear`.
  `CLAUDE_CODE_AUTO_COMPACT_WINDOW=300000` makes `/context` and the context warnings use the same window.
  Without it, Claude Code 2.1.292 uses 200K for Opus 5.5 there.
- Auto memory is off: `autoMemoryEnabled: false`.
- The forced `dotclaude` output style, with `keep-coding-instructions: false`.
  It works together with `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1`.
  The style replaces the built-in coding instructions and the 0.26 spec injection.
  The prompt cache holds it.
- The sandbox is on, with network access only to GitHub and the package registries.
- `templates/managed-settings.json` for users who want the compaction, memory, and sandbox keys enforced.
  Setup prints the copy command and does not run it, because it needs `sudo`.
  With it, the built-in guard `sec-default` loads.
  It skips the `context_management` text of the module.
- OpenSpec is a first-class integration.
  Setup checks the `openspec` CLI.
  It offers the install and `openspec init --tools claude`.
  The status line shows the active change with its task count.
- The profile turns off the tools that it does not use.
  So their schemas leave each request.
  The tools are `enableArtifact: false`, `enableWorkflows: false`, and deny rules for `ScheduleWakeup` and `ReportFindings`.
  `/code-review` then gives its findings as text.
  In the sandbox, `/context` at the start of a session fell from 32k to 8.1k tokens.
  The modder plugin was trimmed in the same run.
- The hook lab: `just lab` runs `claude plugin test plugins/dotclaude`.
  It loads the hooks module and fires stubbed `tool.check` events.

## Changed

- Permissions ask only before dangerous commands.
  The rules are native, and there is no `Bash` parser.
  The dangerous commands are force pushes, history rewrites, piped shells, `sudo`, publishes, public `gh` writes, and SQL drops.
  Read-only git and the usual build and test commands are allowed.
- One hooks module replaces the 0.26 command hooks.
  It asks before a recursive `rm` outside the project.
  It also asks before the first call to a GitHub repository of another owner with an AI policy.
  It keeps a deny of the engine and fails open.
  With `DISABLE_COMPACT` set, its `prompt.section` handler replaces the `context_management` section of the system prompt.
  That section says that the system summarizes prior messages.
  The handler replaces it with text that says compaction is off.
  The built-in guard `sec-default` skips this handler on a machine with managed settings.
  It also skips it on a Team or Enterprise login.
- In auto mode, the classifier can allow an ask of the module.
  So one classic `PreToolUse` hook, `hooks/auto-mode-guard.mjs`, asks again for the same calls.
  It runs only in auto mode.
  It runs only for commands that its `if` filters match.
  It needs Node.js.
- The scripts and hooks of the core and `dotclaude-jev` plugins run on Node.js 22.18 or later, not on Bun.
  Setup changes a `bun` status line command to `node`.
  The `um` command of `dotclaude-modder` stays on Bun, because it uses the YAML parser of Bun.
  The `allowed-tools` of the `second-opinion` skill allow only `node` with `jev.mjs`.
  They do not allow each `bun` command.
  The `drive-web-browser` skill and the Browser page give `npm install -g agent-browser`.
- A prompt audit against Opus 5.5 removed two numeric reply caps.
  It removed them from the output style and from the `reviewer` agent.
  It also removed the `Reason:` line of the old spec format from the Jev note.
  The modder skill says that a `/clear` also removes what is not in `MODLOG.md`.
- `/dotclaude:handoff` is user-invoked only.
  It writes a note that primes the next session.
  The note holds the goal, the constraints, the decisions, the rejected approaches, and the proof.
- `maxEffortLevel` is `xhigh`.
  The profile sets no effort level.
  So each model keeps its default.
- The status line is one file.
  It shows the context against the 300K window.
  It is yellow at 75% and red at 90%.
- The add-on plugins work without the core plugin.
  `dotclaude-browser` is skill-only.
  `dotclaude-jev` gives its own session note.
- `dotclaude-modder` has one skill, `mod-any-game`, and no session note.
  The 8 other skills are step files in `references/`.
  Claude reads them only at their step.
  So the plugin adds one skill listing to each session, not nine.
  The rules of the session note are in the skill.
- `includeGitInstructions` stays at its default.
  The profile sets `attribution.commit` and `attribution.pr`.

## Removed

- The operating spec, its SessionStart and SubagentStart injection, and `lib/terms.mjs`.
- The compaction fork, the cold-cache note, and each hook that tells the user to run `/clear`.
- The `Bash`, edit, secret-redaction, spawn, and attribution guards.
  The dependency on `betterleaks` goes too.
- The CodeGraph augment, the `sembr` rewrap, the long-run note, the setup notice, and the Stop prompt hook.
- The Ponytail integration and the `minimal-code` rule.
  The output style has its own rule to write the least code that does the task.
- All plugin options, the `Concise` output style, and the `contribute` skill.
- The agents `translator`, `docs-writer`, `digest-writer`, `eval-designer`, `fuzz-engineer`, `infra-engineer`, and `reverse-engineer`.
- The evals in `plugins/dotclaude/evals/` and `tools/compaction-report.mjs`.
- `advisorModel` and `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`.
  The advisor tool adds its instructions to each request.
  Each advisor call reads the whole context again.
- The `reverse-engineer` agent of `dotclaude-modder`.
  The `reverse-engineer-binary` skill in [xsyetopz/skills](https://github.com/xsyetopz/skills) replaces it.

## Related Pages

- Previous: [Release 0.26](Release-0.26)
- Next: [Release 0.28](Release-0.28)
- [Archive](Archive): the index of the archived pages.
