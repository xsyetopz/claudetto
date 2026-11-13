# claudetto Surface Inventory at 2.1.322

Read on 2026-11-13 by a search agent. Line counts come from Grep counts. Character counts are estimates (est.). A row marked inferred was named from file names, not read. `surface-trim.md` holds the per-module verdicts.

## Plugins

| Plugin | Ships |
|---|---|
| `plugins/claudetto` | 12 `userConfig` options, `settings.json` (`subagentStatusLine`, which 2.1.323 removed), classic `hooks.json` (a SessionStart `renice`/`GOMAXPROCS` env shell and a UserPromptSubmit setup notice) plus `modules: ["./register.ts"]`, 1 command (`/claudetto:setup`, a 3-line stub), 1 skill (`docs`, Context7), 1 output style (`Concise`, about 4.3k chars est.), 4 agents, 7 one-line rules, the status line (about 1,240 lines), the hygiene CLI (about 1,250 lines), and about 30 mods |
| `plugins/claudetto-openspec` | 1 deferred tool (`openspec`), 6 skills (11–22 lines each), and about 3,300 lines of spec model, validator, and archive code |
| `plugins/claudetto-you-should-know` | an opt-in side check (`sideCheckEnabled`, off by default) that rebuilds `cc-plugin-you-should-know@builtin`, about 1,100 lines |

## Mods in `plugins/claudetto/hooks/` (Source Lines, Tests Excluded)

| Module | Job | Lines |
|---|---|---|
| `register.ts`, `chain.ts`, `options.ts`, `tools.ts` | wiring and helpers | 179, 46, 25, 52 |
| `texts.ts` | `ROOT_PROMPT` (about 6.3k chars est.), 21 `TOOL_TEXTS`, `AGENT_TEXT`, `ASK_TEXT`, plan-mode text, `INTERVIEW_TEXT`, Stop texts | 278 (about 22k chars est.) |
| `texts-gate.ts`, `texts-pin.ts`, `texts-grade.ts` | gate denials, decide and advisor specs, pin notes, grader | 189, 42, 59 |
| `cleanup.ts`, `verify.ts`, `secrets.ts` | cleanup check, Stop verify, secret scan (inferred) | 136, 126, 138 |
| `decider/*` | Jev decider, fallback, redaction | about 627 |
| `agent.spawn/useMemoryHold` | holds spawns below 20% free memory | 399 |
| `classic.SessionStart/useHygieneSweep` | temp, build trash, and worktree sweep | 192 |
| `classic.Stop/useSliceCommits/slices.ts` | blocks Stop while session files are uncommitted | 217 |
| `classic.Stop/useStopChecks/*` | open items, register, named files, grader, stall stop | 548 |
| `classic.StopFailure/useStopNotice` | notification on API-error stop | 24 |
| `command.run/useSetup/*` | setup and `/statusline` | about 2,040 |
| `command.run/useAdvisorCommand`, `useReplyCommand` | `/advisor`, `/reply` | 21, 66 |
| `prompt.submit/useConstraintPin/*` | pins user constraints, including across compaction | 289 |
| `session.measure/useLineFile/*` | status-line session file and heartbeat | 47 |
| `settings.read/useSlimSurface/surface.ts` | hides 27 commands and 18 skills, rewrites 21 tool descriptions, replaces `/init` and the plan-mode text, adds `BUN_FACT`, denies whole reads of lock files | 276 |
| `tool.call/useAdvisorTool` | `mcp__claudetto__advisor` (Fable with files) | 136 |
| `tool.call/useAskFix`, `useSandboxGit` | stray ask form, sandbox git (inferred) | 29, 52 |
| `tool.call/useBudgetRun/*` | heavy-call cap, identical-failure refusal | 98 |
| `tool.call/useClaudettoAgents/delegation.ts` | withholds built-in agents, rewrites the Agent and AskUserQuestion descriptions | 104 |
| `tool.call/useDecideTool/*` | `mcp__claudetto__decide` (needs `typesafeKey`) | 209 |
| `tool.check/useBashRules/*` | Bash gate in 24 files, plus vendored shellfirm rules (1,063 lines) and fixtures (about 4,580) | about 2,616 source |
| `turn.step/usePriceStep` | withholds a result that would push a Haiku request past 100k | 186 |

Tests and mocks under `hooks/` total about 14k lines.

## Text Sent on Every Turn or to Every Agent

- `ROOT_PROMPT`, about 6.3k chars (est.), through `prompt.compose` `scope: "shared"`.
- `Concise` output style, about 4.3k chars (est.), main thread only.
- 21 `TOOL_TEXTS`, `AGENT_TEXT`, and `ASK_TEXT`, which replace the stock text when shorter.
- `BUN_FACT` at SessionStart in a Bun repo.
- `PIN_NOTE` per prompt, plus the compaction instruction.
- `SILENT_TURN_REMINDER` (about 170 chars).
- Agent bodies: `work` 6, `plan` 3, `search` 4, and `sweep` 4 prose lines.

## Setup Writes (`useSetup/settings.ts`, `MINIMUM_VERSION = "2.1.323"`)

- Turns off `disableBundledSkills` and 11 `cc-plugin-*@builtin` plugins. Denies 8 tools through `permissions.deny`. Sets `outputStyle: "claudetto:Concise"`.
- Sets `model: claude-opus-5-5`, `effortLevel: medium`, and `fallbackModel: [claude-sonnet-5-5]`. Effort ceilings in `modelSettings`: opus `high`, sonnet `medium`, haiku `high` (haiku also gets a 200k compaction window).
- Sets `autoCompactWindow: 300000`, `idleCompaction: false`, `subagentPromptCacheTtl: "1h"`, and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50.0000`.
- Sets `bashOutputMaxChars: 8000` and `MAX_MCP_OUTPUT_TOKENS=10000`.
- Turns off about 28 feature keys and 17 env keys, including `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, `CLAUDE_CODE_FORK_SUBAGENT=0`, and `MAX_SUBAGENT_SPAWN_DEPTH=1`.
- Writes the sandbox block and `statusLine`.

## Overlaps With Built-ins Already Visible

- `OFF_SKILLS` through `skillOverrides` duplicates `disableBundledSkills: true`.
- The `delegation.ts` agent withholding duplicates `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` and `permissions.deny Agent(name)`.
- The tool hiding duplicates `permissions.deny`, and from 2.1.323 also the `tool.list` mod event.
- The advisor tool and command duplicate the built-in advisor, which setup turns off with `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.
- The run limits overlap `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS`, and agent `maxTurns`.
- The Bash gate overlaps the sandbox, `permissions`, and `autoMode`.
- Hygiene overlaps `cleanupPeriodDays` and Claude Code's own temp cleanup.

## Agent Frontmatter

| Agent | Model | Effort | Tools |
|---|---|---|---|
| `plan` | `claude-sonnet-5-5` | none | Read, Grep, Glob |
| `search` | `claude-sonnet-5-5` | none | Read, Grep, Glob |
| `sweep` | `fable` | `high` | Read, Grep, Glob |
| `work` | none | none | all |
