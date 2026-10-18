---
name: sessions
description: Reads the `~/.claude/` setup and past transcripts with `bun` scripts and no model call. `audit` lists settings, plugins, hooks, and start-up bytes. `replay` counts what a hook module denies on past tool calls. Use for what `/context` and `/usage` do not give.
disable-model-invocation: true
allowed-tools: Bash(bun ${CLAUDE_SKILL_DIR}/audit.ts *) Bash(bun ${CLAUDE_SKILL_DIR}/replay.ts *)
---

<task>
Report facts about the Claude Code setup of the user or about past sessions.
Claude Code has built-in views for the live session: `/context`, `/usage`, `/insights`, `/hooks`, `/permissions`, `/plugin`, `/skills`, `/memory`, and `/status`.
Use these scripts only for what those views do not give.
Both scripts change no file and make no model call.
</task>

<procedure>
Run `audit` for the setup.
It prints JSON.
`--home` is the `~/.claude/` folder, `--project` is the project folder, and `--managed` is the managed settings file.
All are optional.

```bash
bun ${CLAUDE_SKILL_DIR}/audit.ts
bun ${CLAUDE_SKILL_DIR}/audit.ts --home ~/.claude --project .
```

The output has these keys:

- `settings`: the keys that each layer (`managed`, `user`, `project`, `local`) sets.
- `plugins`: the `enabledPlugins` of the layers.
- `hooks`: the count of hook groups for each event, for each layer.
- `bytes`: the size of each `CLAUDE.md`, each rule (`onMatch` holds the rules with `paths:`, which load only on a match), and the listing line of each skill and agent (`name` and `description`) that loads at the start of a session.

`audit` skips skills and agents that plugins ship, `CLAUDE.md` files of parent folders, and `@` imports.

Run `replay` to run a hook module on each tool call in the transcripts of `~/.claude/projects/`, and to count the denies.
The module exports `check(event, prior)`, sync or async.
`event` has the shape of a `PreToolUse` input, with `transcript_path` and `tool_use_id`.
`prior` is the list of the transcript rows before the call, in the same file.
A result with `deny`, `decision: "block"`, or `permissionDecision: "deny"` counts as a deny.

```bash
bun ${CLAUDE_SKILL_DIR}/replay.ts HOOK_MODULE.ts
bun ${CLAUDE_SKILL_DIR}/replay.ts HOOK_MODULE.ts PROJECTS_DIR
```

The output has `calls`, `denies`, and each deny with the file, the tool, and the reason.
</procedure>

<report>
Copy each figure from the output.
Do not compute, round, or convert a figure.
For `replay`, give `denies` and `calls` as printed, and list the denies so that the user can judge which ones are false.
</report>
