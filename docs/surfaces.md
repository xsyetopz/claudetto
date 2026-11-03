# Surfaces of Claude Code and What Turning Them Off Costs

Claudetto is for the CLI and the TUI only: it turns off every surface that Claude Code allows to turn off and that a terminal session does not need, such as the bundled skills, claude.ai sync, artifacts, and design.
This page holds the measurement first and the key inventory second, because a key is worth writing only when a reading shows what it changes.
Every number is a reading on Claude Code `2.1.317`.

## How the Numbers Are Taken

`just capture` runs `claude -p "hi"` in an empty folder against a fake Messages API on `127.0.0.1` and counts the characters of the first request. No provider is reached and no model is called. `just capture --help` lists the flags. `just inventory` re-reads three rows against the constants of `plugins/claudetto/src/deny.ts` and `plugins/claudetto/src/cuts.ts` with 12 characters of slack per row.

- The unit is characters of the JSON that the run sent, counted by `JSON.stringify` of each part. It is not tokens, and a shorter request is not a saving by itself: only the bill decides.
- The working folder path is part of the request. The harness uses a 34-character folder under `/tmp/claudetto-capture-`, and an `--interactive` run uses 42.
- The key of the run is fake, so a surface that a login gates may be absent from a reading.
- `--arm plain` loads no plugin. `--arm plugin --shipped` loads `plugins/claudetto` with the settings that setup writes.

## The Baseline

`just capture --arm plain` reads 46,084 characters: `system` 5,935 (three blocks of 74, 62, and 5,799), `tools` 29,512 for 12 tools, and `messages` 9,984.

| Tool | Characters |
| --- | --- |
| `Workflow` | 5,355 |
| `Agent` | 5,246 |
| `ScheduleWakeup` | 4,886 |
| `Bash` | 3,715 |
| `ReportFindings` | 2,177 |
| `Read` | 1,919 |
| `Skill` | 1,803 |
| `ToolSearch` | 1,440 |
| `ListAgents` | 1,151 |
| `Edit` | 964 |
| `Write` | 639 |
| `DeferredToolPlaceholder` | 204 |

The other built-in tools are deferred: the request holds `ToolSearch` and `DeferredToolPlaceholder`, and the model loads a schema on demand. An `--interactive` run of the same arm holds 13 tools and 53,916 characters.

## The Deny List

A `permissions.deny` entry for a tool name takes the tool's whole definition out of the request. Each row is `just capture --arm plain --deny NAMES` against the baseline. A definition travels with a comma, so each saving is one more than the tool's own characters.

| Deny | Total | Change | Tools | `tools` |
| --- | --- | --- | --- | --- |
| nothing | 46,084 | | 12 | 29,512 |
| `Workflow` | 40,728 | -5,356 | 11 | 24,156 |
| `ScheduleWakeup` | 41,197 | -4,887 | 11 | 24,625 |
| `ReportFindings` | 43,906 | -2,178 | 11 | 27,334 |
| all three | 33,663 | -12,421 | 9 | 17,091 |

`system` and `messages` do not move in any of the rows, and the combined row is the sum of the three. `plugins/claudetto/src/deny.ts` holds these readings, and `plugins/claudetto/src/__tests__/deny.spec.ts` checks the arithmetic, so a name without a reading cannot enter the list.

- `Workflow` is Dynamic Workflows, which this project does not use.
- `ReportFindings` renders code-review findings in a host UI.
- `ScheduleWakeup` schedules a resume of `/loop` dynamic mode. `CLAUDE_CODE_DISABLE_CRON` is set beside it, and no code of `plugins/claudetto/src` calls it.
- `DesignSync` is a deferred tool, so its deny saves only its 12-character name in the deferred list (46,072 total). A deny of `Artifact`, `RemoteTrigger`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, or `mcp__computer-use` reads 46,084, the same as the baseline, so a deny of an absent tool stays out of the list.

### Never Deny

`denyFaults` of `plugins/claudetto/src/deny.ts` fails a list that holds one of these. Each is `just capture --arm plain --deny NAME`:

| Deny | Total | Change | Why |
| --- | --- | --- | --- |
| `ToolSearch` | 84,020 | +37,936 | every deferred tool loads (23 tools, `tools` 67,844) |
| `Skill` | 54,804 | +8,720 | the `Workflow` definition takes the workflow guidance, 5,355 to 22,310 characters |
| `Bash` | 45,677 | -407 | the shell goes, and `Grep` and `Glob` arrive in its place; the capability is not worth the saving |

## The Tool Texts

The `tool.describe` hook of `plugins/claudetto/src/blocks/tool-describe/block.ts` sends claudetto's own description for ten tools, and only while it is shorter than the description the harness computed for that session, so a text of ours cannot make a request larger. `texts.ts` holds the texts and `tools.ts` holds the stock readings and the rule. `deadTexts` names a text that is not shorter than stock, and `alwaysLoadedChars` counts a text only for a tool the harness sends upfront.

The hook also moves `Agent`, `AskUserQuestion`, `ListAgents`, and `Skill` behind `ToolSearch` by answering `isDeferred`. The shipped arm's first request holds six tools, read with `just capture --arm plugin --shipped` and the same with `--interactive`:

| Tool | Stock (`plain`) | Shipped (`plugin`) | Description of ours |
| --- | --- | --- | --- |
| `Bash` | 3,715 | 3,489 | 882 |
| `Read` | 1,919 | 1,409 | 286 |
| `ToolSearch` | 1,440 | 697 | 234 |
| `Edit` | 964 | 845 | 243 |
| `Write` | 639 | 594 | 196 |
| `DeferredToolPlaceholder` | 204 | 204 | untouched |
| total | 8,881 | 7,238 | |

The `Description of ours` column is the length of the string in `texts.ts`. The six shipped definitions are 7,245 characters with their commas. Texts exist as well for `Agent` (519), `AskUserQuestion` (779), `ListAgents` (256), `Skill` (246), and `SendMessage` (2,954), which reach a request only through `ToolSearch`.

## The Two Switches

`plugins/claudetto/src/builtins.ts` writes two settings, and both ship through `tierSnippet` and the capture harness.

- `disableBundledSkills: true` takes the bundled skill listing out of the request.
- `enabledPlugins` sets twelve built-in plugins to `false`: `cc-plugin-<name>@builtin` for `agents-md`, `telemetry`, `plugin-authoring`, `mods-guide`, `tips`, `mermaid`, `responsive-mode`, `diff`, `you-should-know`, `easel`, `claude-platform`, and `claude-test`. `cc-plugin-sec-default` is left alone: it declares `enabledFromTrustedSettingsOnly` and `enabledFromPolicyOnly`, so a user `false` does not decide it (`docs/gates.md`). `cc-plugin-privacy` has no row, because a `false` for it reads 46,084 on the `plain` arm, the same as the defaults.

Read with `just capture --arm plain --settings FILE`:

| Settings of the run | Total | `tools` | `messages` |
| --- | --- | --- | --- |
| defaults | 46,084 | 29,512 | 9,984 |
| `disableBundledSkills` alone | 57,113 | 46,467 | 4,058 |
| deny of `Workflow`, `ScheduleWakeup`, `ReportFindings` | 33,663 | 17,091 | 9,984 |
| `disableBundledSkills` with that deny | 27,737 | 17,091 | 4,058 |
| the twelve plugins off | 45,816 | 29,512 | 9,716 |

`disableBundledSkills` alone raises the request by 11,029: `Workflow` inlines the workflow guidance that the skill listing no longer carries, so `tools` grows by 16,955 while `messages` falls by 5,926. With `Workflow` denied the growth has nowhere to land, so the two belong together. The twelve plugins off take 268 out of `messages`.

In the shipped arm, removing `disableBundledSkills` from the shipped settings reads 30,601 (5,322 more than the 25,279 of the whole), and removing `enabledPlugins` reads 25,547 (268 more).

## The Shipped Arm

`just capture --arm plugin --shipped` reads 25,279 characters: `system` 5,352 (blocks of 74, 62, and 5,216), `tools` 7,245 for 6 tools, and `messages` 12,039. That is 20,805 under the baseline. The same arm with `--interactive` reads 32,993, because the sandbox block, 6,675 characters of the first system message, appears only there.

Each piece removed from the shipped settings alone, read with `just capture --arm plugin --settings FILE` against the 25,279 whole:

| Piece removed from the shipped settings | Total | Piece adds or saves |
| --- | --- | --- |
| nothing | 25,279 | |
| `outputStyle` | 23,122 | the style adds 2,157 |
| `agent` | 23,489 | `agents/main.md` adds 1,790 over the default body it replaces |
| `sandbox` | 18,059 | the sandbox settings add 7,220 |
| `permissions.deny` | 32,938 | the deny list saves 7,659 |
| `disableBundledSkills` | 30,601 | saves 5,322 |
| `enabledPlugins` | 25,547 | saves 268 |

### Shipped Cuts

`plugins/claudetto/src/cuts.ts` records each piece as a row read alone, so rows interact and do not match the table above. `tests/claudetto/cuts.test.ts` and `just inventory` hold the sum to the whole fall of 20,805 (46,084 less 25,279), with 1,805 characters of interaction that no row explains. A negative row is a piece the tree adds.

| Row | Characters |
| --- | --- |
| `deny list` | 7,065 |
| `deferred tool denies` | 24 |
| `tool texts` | 9,547 |
| `built-in surface` | 5,590 |
| `docs skill` | -71 |
| `compaction pair` | 0 |
| `idleCompaction off` | 0 |
| `main agent body` | -1,790 |
| `auto memory off` | 2,138 |
| `agent listing` | -718 |
| `handoff context` | -940 |
| `handoff tool listing` | -235 |
| `output style` | -1,844 |
| `autoMode lists` | 0 |
| `sandbox block` | -7,220 |
| `setup command listing` | -48 |
| `handoff command listing` | -61 |
| `workflow switches` | 5,333 |
| `git instructions` | 612 |
| `explore and plan agents` | 911 |
| `built-in agent denies` | 570 |
| `cron and fork switches` | 103 |
| `context management section` | 285 |
| `unexplained residual` | 1,805 |

Two rows depend on another: `built-in surface` needs the deny list, since with `Workflow` offered `disableBundledSkills` raises the request, and `auto memory off` and `context management section` read only with `agents/main.md` moved aside, because the body replaces the section they remove.

`risingCuts` of `cuts.ts` is empty: a row whose bill rose is reverted, and a row with a `cost` records a replay of the bill.

## Settings against Request Size

Read with `just capture --arm plain --settings FILE`, one key each, against the 46,084 baseline:

| Setting | Total | Change |
| --- | --- | --- |
| `autoMemoryEnabled: false` | 43,946 | -2,138 |
| `includeGitInstructions: false` (`CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` reads the same) | 44,771 | -1,313 |
| `attribution: false` | 45,445 | -639 |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | 45,173 | -911 |
| `CLAUDE_CODE_DISABLE_CRON=1` | 45,700 | -384 |
| `CLAUDE_CODE_FORK_SUBAGENT=0` | 45,688 | -396 |
| `sandbox.enabled: true` | 54,653 | +8,569 |
| the same with `allowUnsandboxedCommands: false` | 53,150 | -1,503 against the row above |
| the same with five `denyRead` paths | 53,306 | +156 |

`docs/prompt/variants.md` holds the prompt variants, and `docs/prompt/footprint.md` splits the interactive request by owner. Sandbox settings cost 8,569 in the request and stay: the sandbox is a security control, and `denyRead` is the only layer that stops a child process from reading `~/.ssh`.

## Compaction Keys

The key names are in the `2.1.317` binary (`strings "$(readlink -f "$(command -v claude)")" | rg -F NAME`). `plugins/claudetto/src/threshold.ts` holds the arithmetic, read from the `2.1.317` program, and `plugins/claudetto/src/__tests__/threshold.spec.ts` checks it.

| Key | Kind | Value |
| --- | --- | --- |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | env | `50.0000` |
| `autoCompactWindow` | setting | `300000` |
| `idleCompaction` | setting | `false` |
| `CLAUDE_CODE_SLEEP_COMPACT`, `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS`, `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `autoCompactEnabled`, `precomputeCompactionEnabled` | env or setting | unset in the tree |

The three keys written move the first request by 0 characters, so they are bill levers and not request levers. The shipped settings also write `precomputeCompactionEnabled: false`.

- The compaction point is `min(floor(E * pct / 100), E - 13000)`, where `E` is the window less `min(maxOutputTokens, 20000)`, and the percentage applies only while it is above 0 and at most 100. The harness blocks at `E - 3000`, so a smaller window moves the block as well.
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` of `50.0000` with `autoCompactWindow` of `300000` compacts at 140,000 prompt tokens. The same percentage with the Haiku window of `200000` compacts at 90,000, which stays under the 100,000-token price step. `autoCompactWindow` of `173000` alone also reaches 140,000, but it moves the block down to 150,000 beside it, so the pair ships.
- `just compaction-cost --thresholds 140000,224999` replays the local transcripts: a 140,000 trigger bills 13.7% below 224,999, with 284 compactions against 166. It is a replay, not a live run.
- The same command reads 21 gaps over one hour among 49,971 gaps between requests. An idle compaction buys a small prompt only after the cache expires, so `idleCompaction` stays `false`, and `CLAUDE_CODE_SLEEP_COMPACT` is the same bet.
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW` sets one window for every model, and the Haiku row needs a second one, so only the per-model settings route fits.
- `autoCompactEnabled` stays unset: the handoff hangs off the compaction the harness runs, so a user who turned it off gets no handoff.

## Refused Keys

`plugins/claudetto/src/refused.ts` lists ten keys that no snippet may name, even as `false`, and `tests/claudetto/refused.test.ts` fails on a snippet that holds one. Each name is in the `2.1.317` binary.

| Key | Kind | What it would take away |
| --- | --- | --- |
| `disableAllHooks` | setting | every hook, claudetto's own included |
| `disableSkillShellExecution` | setting | the inline shell step of a skill or command |
| `disableSideloadFlags` | setting | `--plugin-dir`, which the lab and the capture use |
| `disableCommandPluginSources` | setting | the plugin source of slash commands |
| `DISABLE_LOGIN_COMMAND`, `DISABLE_LOGOUT_COMMAND` | env | `/login` and `/logout` |
| `DISABLE_DOCTOR_COMMAND` | env | `/doctor` |
| `DISABLE_AUTOUPDATER`, `DISABLE_UPDATES` | env | the updater |
| `DISABLE_UPGRADE_COMMAND` | env | `/upgrade`, the way to change the plan |

`tools/capture/run.ts` sets `DISABLE_AUTOUPDATER`, `DISABLE_TELEMETRY`, and `DISABLE_ERROR_REPORTING` in the environment of its own throwaway `claude -p` child so that an update does not move a reading. That writes nothing into a user's settings.

## Not Written, with the Reason

Each name is in the `2.1.317` binary.

- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`: the framework uses background runs and `Monitor`.
- `CLAUDE_CODE_DISABLE_ATTACHMENTS` and `CLAUDE_CODE_DISABLE_FILE_MENTIONS`: `@file` mentions are part of the CLI.
- `CLAUDE_CODE_DISABLE_CLAUDE_MDS`: it saves 1.27 characters per character of memory file, but it drops the user's and the project's instructions.
- `DISABLE_PROMPT_CACHING`: a cache read is the cheapest input there is, so turning caching off raises cost.
- `bashOutputMaxChars` and `bashEditDiffEnabled`: no reading prices either, and `bashEditDiffEnabled` changes a field that `PostToolUse` Bash hooks read.
- `CLAUDE_CODE_DISABLE_FAST_MODE=1` is set, so `/fast` cannot turn fast mode on in a claudetto session.
