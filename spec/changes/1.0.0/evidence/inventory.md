# P01d Inventory of built-in parts that a switch turns off

This report lists the built-in parts of Claude Code `2.1.296` that a setting, an env var, or a mod event can turn off or make smaller.
It gives the cost at the start of a session where the measurement exists.
It does not decide which parts dotclaude turns off.
That decision belongs to P21.

## Measured starts

Two headless starts ran in fresh sandbox folders.
Both use the model `claude-haiku-5-5` and the prompt `Reply with OK.`

Start A has no switch.
The folder has no `settings.json`.

Start B has the switches of the command below.
It sets the env vars on the command line.
It sets the settings in `config/settings.json`, which holds `disableBundledSkills`, `disableWorkflows`, `disableArtifact`, `disableAgentView`, `autoMemoryEnabled`, `includeGitInstructions`, `disableClaudeAiConnectors`, `syncClaudeAiSkills`, and `syncClaudeAiPlugins`.

```bash
just sandbox --dir <folder A> --model claude-haiku-5-5 -p "Reply with OK."
CLAUDE_CODE_DISABLE_CRON=1 CLAUDE_CODE_DISABLE_WORKFLOWS=1 \
  CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1 CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 \
  CLAUDE_CODE_DISABLE_ARTIFACT=1 CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1 \
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 DISABLE_TELEMETRY=1 \
  CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 CLAUDE_CODE_DISABLE_ATTACHMENTS=1 \
  CLAUDE_CODE_DISABLE_WEB_FETCH=1 \
  just sandbox --dir <folder B> --model claude-haiku-5-5 -p "Reply with OK."
bun plugins/dotclaude-sessions/bin/dotclaude-start --compare A.jsonl B.jsonl
```

The first request of start A is 19,147 tokens.
The first request of start B is 12,830 tokens.
The difference is -6,317 tokens.

The output of `--compare`:

```text
Base db1be31b-d50d-4b6a-a49e-864b9a599b0b, other 1afd5c01-59a8-49a3-b9ff-1a25e9add58a

First request tokens: base 19,147, other 12,830, difference -6,317

Difference by source (chars of the records, other minus base)
     -9,499  base   38,842  other   29,343  built-in
     -6,641  base    6,641  other        0  built-in or user (no plugin prefix)
     -2,868  base   13,253  other   10,385  system prompt
       -808  base    1,399  other      591  other attachments
       -546  base      546  other        0  plugin dotclaude-sessions
       -224  base      224  other        0  plugin dotclaude-browser
       -179  base      179  other        0  plugin dotclaude-docs
        -29  base    2,403  other    2,374  MCP server dotclaude-jev
```

Start B has no skill of the plugins `dotclaude-sessions`, `dotclaude-browser`, and `dotclaude-docs`.
The compare cannot show which switch removes them.
So the -6,317 tokens is the cost of the whole set, not of one switch.

## Limit of the measurement

- The compare measures the set of switches in start B only.
  No single switch has a measured token cost.
  The brief allows four headless sessions, and this package used three.
  P21 must measure each switch alone before it turns the switch off.
- A switch marked "not measured" has no token figure.
  Only the telemetry row and the `CLAUDE.md` row have an estimate, and each gives its method.
- Start A ran in a new folder.
  An earlier start in the shared default sandbox folder had a `settings.json` with the keys of the settings snippet, so that start is not a clean baseline and it is not used.

## Switches

The source column names a line of `external/cc-2.1.296/strings.txt` (`strings`), a key of `schemas/claude-code-settings.json` (`schema`), or a line of the mod API types (`types`).
The default is the default of Claude Code `2.1.296` as the name and the source show it.
Each env var was found in the binary by name.
The effect of each env var is inferred from its name and its message text.
It is not confirmed by a single run.

| Part | Switch | Default | Measured cost at the start | Source |
| --- | --- | --- | --- | --- |
| Workflow tool | `CLAUDE_CODE_DISABLE_WORKFLOWS=1`, or `disableWorkflows` | On | Combined: built-in -9,499 chars. Alone: not measured. | strings 180590, schema 338 |
| Bundled skills | `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1`, or `disableBundledSkills` | On | Combined: built-in or user -6,641 chars. Alone: not measured. | strings 210339, schema 273 |
| Attachments | `CLAUDE_CODE_DISABLE_ATTACHMENTS=1` | On | Combined: other attachments -808 chars, and no skill listing. Alone: not measured. | strings 211199 |
| Auto memory | `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, or `autoMemoryEnabled: false` | On | Combined: system prompt -2,868 chars, with the memory section. Alone: not measured. | strings 239406, schema 989 |
| Simple system prompt | `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1` | Off | Combined: part of the system prompt -2,868 chars. Alone: not measured. | strings 241080 |
| Artifact | `CLAUDE_CODE_DISABLE_ARTIFACT=1`, or `disableArtifact` | On | Combined, not isolated. Alone: not measured. | strings 241552, schema 342 |
| Cron | `CLAUDE_CODE_DISABLE_CRON=1` | On | Combined, not isolated. Alone: not measured. | strings 231961 |
| Explore and Plan agents | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | On | Combined, not isolated. Alone: not measured. | strings 214857 |
| Built-in agents | `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` | On | Not measured. The scope of the name is not verified. | strings 209175 |
| WebFetch tool | `CLAUDE_CODE_DISABLE_WEB_FETCH=1` | On | Start A lists no WebFetch tool, so the switch had nothing to remove there. | strings 207031 |
| Agent view | `CLAUDE_CODE_DISABLE_AGENT_VIEW=1`, or `disableAgentView` | On | Not measured. | strings 225836, schema 330 |
| Background tasks | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` | On | Not measured. | strings 244625 |
| Advisor tool | `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` | On | Not measured. | strings 228308 |
| Fast mode | `CLAUDE_CODE_DISABLE_FAST_MODE=1`, or `fastMode: false` | On | Not measured. | strings 159058 |
| CFC prompt | `CLAUDE_CODE_DISABLE_CFC_PROMPT=1` | On | Not measured. | strings 173647 |
| Proactivity | `CLAUDE_CODE_DISABLE_PROACTIVITY=1` | On | Not measured. | strings 145355 |
| File checkpointing | `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING=1` | On | Not measured. No request text. | strings 147703 |
| Thinking | `CLAUDE_CODE_DISABLE_THINKING=1` | On | Not measured. It changes the model reply, not the start. | strings 223382 |
| Git status | `includeGitInstructions: false` | On | Not measured. | schema 155 |
| Claude.ai connectors | `disableClaudeAiConnectors: true` | Not verified | Not measured. | schema 262 |
| Claude.ai skills and plugins | `syncClaudeAiSkills: false`, `syncClaudeAiPlugins: false` | Not verified | Not measured. | schema 125, 129 |
| Claude.md files | `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` | On | Combined, not isolated. The sandbox project has no `CLAUDE.md`, so the estimate is zero. | strings 162125 |
| Telemetry | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, `DISABLE_TELEMETRY=1`, `DISABLE_GROWTHBOOK=1` | On | Estimate: zero tokens. These switch calls, not the request. | strings 172546, 161639, 230216 |
| System prompt section `memory` | mod event `prompt.section` with `name: "memory"` | Mod API | Not measured. | types 4029 |
| Attachment by type | mod event `prompt.attachment` with a type | Mod API | Not measured. | types 4062 |
| Agent offer | mod event `agent.offer`, with `isOffered: false` | Mod API | Not measured. | types 3963 |
| Tool description | mod event `tool.describe` | Mod API | Not measured. | types 4074 |

## Assumptions

- The measure counts tokens of the first request only.
  A later request can differ.
- `CLAUDE_CODE_DISABLE_*` names are the env vars that the binary holds.
  Their effect follows the name and the message text in the binary.

## Outside the brief

- The shared default sandbox folder `dotclaude-sandbox` in the temp folder holds the transcripts and the settings of earlier work.
  The brief says to run `just sandbox-clean` at the end.
  That command removes the whole folder, so this package did not run it.
  The first start of this package ran in that folder and wrote one transcript there, the session `345965d4-a311-4797-bf0c-c6c93e2768f2`.
