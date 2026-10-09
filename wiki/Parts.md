# Parts

This page lists each part of dotclaude 0.28.0, its file, its bound, and the need that it serves.
The bounds are in three tiers ([Plugin layout](Plugin-Layout#bound-tiers)).
Tests pin the copies of a bound in code and config.
Every path below is under `plugins/dotclaude/`.

## Core plugin

| Part | File | Bound | What it does |
| --- | --- | --- | --- |
| Hooks module | `hooks/register.mjs` | `POLICY_TIMEOUT_MS` (5,000 ms), `POLICY_FILE_MAX_CHARS` (2,000) in `lib/budget.mjs` | Holds the `tool.check` guard and the handlers of the prompt, drift, surface, and line-break features. See [Guards](Guards) and [Claude mods](Claude-Mods). |
| Auto-mode guard | `features/guard/cli.mjs` | `POLICY_TIMEOUT_MS` | A classic hook for auto mode only, because the classifier can allow an ask of the module. It gives the `rm` ask and keeps no state. See [Guards](Guards#the-auto-mode-guard). |
| Output style | `output-styles/dotclaude.md` | The first request, `FIRST_REQUEST_LOW_BYTES` to `FIRST_REQUEST_HIGH_BYTES` | The forced style. See [Prompt surface](Prompt-Surface). |
| Prompt variants | `features/prompt/` | The first request, `FIRST_REQUEST_LOW_BYTES` to `FIRST_REQUEST_HIGH_BYTES` | One system prompt variant for each model. See [System prompt](System-Prompt). |
| Surface cuts | `features/surface/` | none | Cuts attachments, agent lines, and tool descriptions by id. See [Prompt surface](Prompt-Surface#attachment-cuts-of-the-hooks-module). |
| Plugin settings | `settings.json` | none | An empty object. A plugin may set only `agent` and `subagentStatusLine`, and dotclaude sets neither. |
| Setup skill | `skills/setup/SKILL.md`, `skills/setup/scripts/openspec.mjs` | none | Sets up OpenSpec only, after your yes. It changes no Claude Code setting. See [Install](Install) and [OpenSpec](OpenSpec). |
| Status line | `features/statusline/cli.mjs`, `features/statusline/subagent-cli.mjs` | `USAGE_LEVELS` and `features/statusline/limits.mjs` | Model, effort, context, cache, the usage windows, and the place. It keeps no state. See [Status line](Status-Line). |
| Context bound | `features/context/`, `features/reads/` | `limits.mjs` of the context feature | See [Context bound](Context-Bound). |
| Adherence checks | `features/adherence/cli.mjs` | `features/adherence/limits.mjs` | A classic `PreToolUse` hook with no model call. It asks before `git stash`, `git reset`, and a git checkout or restore of a path, asks before a change to an existing line of a test or limits file, denies a Markdown write or commit message with a code item outside a code span, and denies new text that claims an approval of the user when no prompt of the user gives it. |
| Line breaks | `features/sembr/`, `lib/sembr.mjs` | none | See [Semantic line breaks](Semantic-Line-Breaks). |
| Stop prompt hook | `hooks/hooks.json` | none | A claim-check `prompt` hook on `Stop` only. See [Stop prompt hooks](Stop-Prompt-Hooks). |
| Drift check | `features/drift/` | none | See [Drift check](#drift-check). |
| Hook lab | `tests/*.test.ts` | none | Tests of the module with stubbed events. Run with `just lab`. |

The skill file paths and the lab path come from the repository layout, and `just check` validates them.

## Agents

The five agents are in `agents/`.
The frontmatter of each file is the source of its model, effort, and `maxTurns`.
See [Agents](Agents) for the roster and the pins.

The [settings snippet](Settings-Snippet) sets `CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-5-5`, so a subagent with no model of its own runs on Sonnet 5.5.
It turns off the built-in agents, sets `CLAUDE_CODE_FORK_SUBAGENT=0`, and caps concurrent subagents at 5.
It sets `maxEffortLevel` to `max`, which is no cap.
dotclaude has no router, so the frontmatter of each agent file is the only source of the model and effort of a subagent.
See [Plans and models](Plans-and-Models).

## Settings snippet values

| Key | Value | Reason |
| --- | --- | --- |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | 300000 | The window of a session. |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | 300000 | The window that `/context` shows and warns against. Without it, Claude Code 2.1.292 uses 200K for Opus 5.5. |
| `DISABLE_COMPACT` | 1 | No compaction, and no `/compact`. |
| `autoCompactEnabled` | false | No automatic compaction. |
| `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | 1 | The short built-in prompt. |
| `autoMemoryEnabled` | false | No auto memory. |
| `CLAUDE_CODE_DISABLE_FAST_MODE` | 1 | Fast mode stays off. |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | 5 | The concurrency cap. |
| `model` | `claude-opus-5-5` | The main model. The snippet has no advisor. |
| `enableArtifact`, `enableWorkflows` | false | Removes the Artifact and Workflow tools from each request. |
| `permissions.deny`: `ScheduleWakeup`, `ReportFindings` | | Removes two more unused tools. `/code-review` then gives its findings as text. |
| `promptCacheTtl` | `5m` | The cache time to live. |
| `promptSuggestionEnabled`, `awaySummaryEnabled` | false | No background requests. |

The snippet has no `effortLevel`.
The [Settings snippet keys](Settings-Snippet-Keys) page lists each key with its reason and default.

## Optional plugins

| Plugin | Files | What it does |
| --- | --- | --- |
| `dotclaude-codegraph` | `hooks/hooks.json`, `bin/`, `features/graph/` | Command hooks that sync the `codegraph` index and add the callers of a searched symbol to `Grep` and `Glob` calls. See [Code graph](Code-Graph). |
| `dotclaude-jev` | `hooks/hooks.json`, `hooks/register.mjs`, `features/jev/` | The `second_opinion` tool, and a Jev pick added to `AskUserQuestion`. See [Second opinion](Second-Opinion). |
| `dotclaude-docs` | `skills/docs/` | The `docs` skill, which gets library docs with a pinned `ctx7`. See [Library docs](Library-Docs). |
| `dotclaude-browser` | `hooks/hooks.json`, `hooks/register.mjs`, `features/search/`, `skills/` | The `drive-web-browser` skill, a `backend` option, and a `WebSearch` replacement that runs the headless browser. See [Browser](Browser). |

## Related pages

- [Guards](Guards)
- [Settings snippet](Settings-Snippet)
- [Development](Development)

## Drift check

The `session.start` handler of the hooks module compares the active settings with the [settings snippet](Settings-Snippet).
It appends one note to the conversation only when it finds a difference, and the note asks Claude to tell the user.
It changes no setting.
A module cannot add context at `session.start` in another way, so the note is a row from `$.session.append`.

| Difference | Line of the note |
| --- | --- |
| A built-in plugin of the snippet is not `false` in `enabledPlugins` | Names each plugin and the setting that turns it off, in one line. |
| A skill of the listing has the source `syncedSkills` | Gives the count and names `syncClaudeAiSkills`. |
| The Claude Code version is not 2.1.295 | Gives the version and the tested version. |
| A section id of the system prompt is not an id of Claude Code 2.1.295 and has no colon | Names the id. dotclaude keeps the section as Claude Code made it. |
| The policy source of the settings has a key | Reports that the guard is seated, and names the dotclaude parts that it skips: the model variants (`prompt.compose`) and the `context_management` text (`prompt.section`). |
| `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set | Reports that the `model` and `effort` of the agent files do not apply. |

- A fact that cannot be read gives no line, so a failed read cannot make a false report.
- `data.mjs` holds the plugin list, the tested version, and the section ids, and tests pin the plugin list to the snippet.
- The prompt sections come from a `prompt.compose` call with the `bare` trait, so the prompt hooks of dotclaude do not run in it.

## Skills

A skill that changes the computer of the user, such as an install, is user-invoked only (`disable-model-invocation: true`), and has no listing line.
Today that is `setup`, the only skill of the core plugin.
Any other skill of the plugin can be invoked by the model, and its description has 100 characters or fewer.
`skillOverrides` does not apply to a plugin skill on 2.1.293, so the full listing line is the cost.
`tests/dotclaude/skills.test.mjs` checks the form of each skill and that the skill has a row in this page.
