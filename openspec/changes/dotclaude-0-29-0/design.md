# Design

## Context

See `proposal.md` for the reasons, and `research/issues.md` for the user decisions of 2026-10-11.
dotclaude 0.28.0 shapes Claude Code 2.1.296 through one mod module (`hooks/register.mjs`), command hooks, the output style, the agent files, and a settings snippet in the wiki.
The rules of the archived 0.28.0 design, such as D35, do not bind 0.29.0.
These rules stay: no patch of the binary, documented extension points only, the Rule of Least Power, and a test for each behavior.

The research ran on 2026-10-11 against the 2.1.296 bundle in `external/cc-2.1.296`, the sources in `external/`, and `external/dossier/` (gitignored).
Facts that the research did not verify are marked "not verified", and a task checks each one before the code depends on it.

What dotclaude can change and what stays fixed (bundle, and `research/mods-api.md` and `research/replace-levers.md` of 0.28.0):

| Surface | Route | 0.28.0 | Fixed part |
| --- | --- | --- | --- |
| Main system prompt | `prompt.compose`, `prompt.section` | yes | sections that no event names |
| Subagent prompt | agent body, `agent.spawn` task prompt | yes | built-in agent bodies |
| Tool descriptions | `tool.describe` | yes | `input_schema` |
| Attachments | `prompt.attachment` | 4 types | the other types pass through |
| Agent listing | `agent.offer` | yes | other lines |
| Skill listing | none found | no | the listing text |
| Compact prompt | `session.compact` exists | no | not verified |
| Built-in tool on or off | `permissions.deny`, env vars | some | a mod cannot remove a tool |
| Tool errors, plan-mode text, deny wrapper | none | no | fixed |

## Goals / Non-Goals

**Goals:**

- Each subagent run ends with a report.
- Each hook passes its eval before a release.
- Each fix is in the text or the hook that causes the defect, with a test of the behavior.
- One source for each shared part, and a test that fails when a copy differs.
- The same commands and paths work on Windows, Linux, and macOS.
- Each new figure in the status line comes from Claude Code data, not an estimate.

**Non-Goals:**

- The items of D10.
- A change to the compact prompt.
  The route is not verified, and the handoff of D19 replaces compaction.

## Decisions

### D1 Report-now note that the agent follows

In 0.28.0 the note goes out as `PostToolUse` `additionalContext` (`features/context/rules.mjs:61`), and the model reads it next to the tool result.
The prompt tells the model to treat tool-result text as data, and in the session of 2026-10-11 two investigators said that they ignored the note for that reason.

In 0.29.0 the note goes out as a message to the subagent, not in a tool result (`research/mod-api-probes.md`, items 4 and 5):
a `turn.step` hook of the hooks module counts the requests and reads the usage of each subagent by its `agentId`, and at the bound it calls `$.session.send({ to: { agentId }, text })`.
The subagent gets the text as a `user` row from the coordinator, and in the probe 2 of 2 subagents stopped and reported ("I stopped early as the coordinator asked").
The sample is two Haiku 5.5 agents of one session, so task 4.10 runs the probe again on each model of the roster.

1. The note names its source (dotclaude), and states the turn count, `maxTurns`, the turns left, and the context figure as facts.
2. Each agent body and the subagent block of each variant say that a message from the coordinator comes from dotclaude and that its facts are true.
3. The note gives no word count other than `REPORT_MAX_WORDS`.
   The delegation text tells the main session to give no larger word count in a task prompt.
4. A probe agent with `maxTurns` 8 checks the result in the hook lab and in one sandbox run.
5. The hand-back is checked against `REPORT_MAX_WORDS`, and the cap is set again from the size of measured reports with a table.
   Reports of about 7,000 characters reached the main session, and one agent grouped table rows to fit 400 words.

No fallback acts at the cap: `SubagentStop` does not fire at `maxTurns`, and the parent gets a note that the agent stopped with no report (`research/probes.md`, 1.2).
A module `classic.SubagentStop` fired only at the final stop of a resumed agent, not at its first stop at the cap (`research/mod-api-probes.md`, item 8).
So the report comes before the cap, from the note and a `TURNS_LEFT_AT` that leaves the turns of a full report.
On 0.28.0, probe 1.1 and two investigators of 2026-10-11 ignored the old note as tool data, and one stopped at 31 turns with no report.
In the `vegaspro` session, two investigators followed the note at turn 29 of 31, but with 2 turns left their reports were partial, and of about 600 and 850 words against the cap of 400.
Both called the run "Turn limit reached" with one turn left, so the note states the turns used and the turns left.

### D2 `maxTurns` from measured runs

Count the turns of the agent runs in the transcripts of the user with `dotclaude-sessions`, set each value at the 90th percentile plus the report turns, and record the figures in the wiki.
`TURNS_LEFT_AT` moves from 2 to the turns of a full report, and a test keeps it below the smallest `maxTurns`.

### D3 Status line rows by component

Row 1 is session usage, row 2 is weekly usage and place, and row 3 is context.

```text
Opus 5.5·high │ 5h ▰▰▱▱ 40% −3 ↻2h10 │ $4.10 $1.20/h │ cache 3:12 94%
7d ▰▱▱▱ 20% +4 ↻Mon │ Fable 12% │ credits 2 │ dotclaude-0-29-0 3/40 │ main
ctx ▰▱▱▱ 10.5k/300k │ sys 3.2k tools 3.8k mcp 0.4k agents 0.4k mem 1.7k skills 0.9k msg 0.1k │ free 266k
```

The `/context` parts come only from the newest `/context` table in the transcript tail.
The status input has no part figures, and `/context` gets them from a `count_tokens` call, so an estimate would not be Claude Code data.
The parser gets the rows that 0.28.0 skips: MCP tools, MCP server instructions, custom agents, and the compact buffer.
The `/usage` facts come from `rate_limits` of the status input and from `cachedUsageUtilization` of the Claude Code config.
A task maps each `/usage` item of 2.1.296 to a source or drops it.
The resize slowness of the terminal is measured before and after this change (task 12.8), because the status line is a candidate cause.

### D4 Unknown tool names

Claude Code makes the "No such tool available" error itself.
Each variant and agent body gets one tool-name line.
Neither `PreToolUse` nor `PostToolUseFailure` fires for `bash`, and the error text gives the fix (`call Bash instead`, probe 1.3).
So no hook is added, and the wiki records that the error text and the prompt line are the only routes.

### D5 Active change after clear

`SessionStart` gives `source` `clear` and accepts `additionalContext`, and no hook output runs `/clear`.
On `source` `clear`, the context feature gives the newest active change in `openspec/changes/` and its open tasks, capped at `CLEAR_NOTE_MAX_BYTES`.
It reads files of the user and writes none.

### D6 Prompt audit

The audit of 2026-10-11 found a changelog example that disagrees with `CLAUDE.md` (`features/prompt/shared.mjs:40`), a narration rule in the output style against the pre-tool sentence of the Opus 5.5 variant, ask-first lines (`shared.mjs:30`, `:41`, `:68`, dossier I13), long sentences, and an unsourced `Read` stub claim (`features/reads/rules.mjs:83`).
The fixes go into the rebuilt prompt of D17.
One list of user decisions replaces the ask-first lines, and each narration rule names its part of the turn.
The skills and the hook messages of the add-on plugins get the same audit.

### D7 Output style key

The style has `force-for-plugin: true`, and Claude Code picks a forced plugin style before it reads `outputStyle`.
A plugin `settings.json` cannot set `outputStyle`.
The user reported the gap as a defect, so the snippet sets `outputStyle: "dotclaude:dotclaude"`, after a sandbox check of what `/config` shows.

### D8 No main-session cache key

With no `promptCacheTtl`, Claude Code gives a subscription 1 hour and an API key 5 minutes.
The snippet key forces 5 minutes on a subscription, so the key goes.
`subagentPromptCacheTtl` stays unset, as in 0.28.0.

### D9 Built-in inventory with the picks of the user

A `tools/` script lists the built-in tools, skills, plugins, and attachment types from the bundle, and a test compares the list with the inventory page of the wiki.

| Call | Items | Switch |
| --- | --- | --- |
| On | `EnterPlanMode`, `ExitPlanMode`, `LSP` | none |
| Off | `SendFile`, `SendUserFile`, `Projects`, `DesignTool`, `DesignSync`, `SendFeedback`, `NotebookEdit`, `RemoteTrigger`, `ProposeSkills`, `ProposeGoal`, `PushNotification`, `SendMessage` | `permissions.deny` or env var |
| Off, checked by capture | `EndConversation` | `permissions.deny` |
| Off | `Task*` tools, cron, `ScheduleWakeup` | env var or `permissions.deny`, with no eval gate |
| Deferred | Jev tool | D16 |

Each turned-off item gets a gate check in the bundle and a start-cost capture.
The two `Push` keys of `/config` stay unset, because they send to the devices of the user and default to off.
Auto-dream (`autoDreamEnabled`), the silent-turn and total-tokens reminders, the token-usage attachment, and the memory extraction are not verified, and the inventory task checks each one.

### D10 Ideas not in scope

- Keepalive ping: each ping spends usage with no user present, and Claude Code has `idleCompaction` and `ScheduleWakeup` for idle work.
  The wiki records the reason for a later review.
- Bun bridge for other mods: a mod can run `$.process.run(['bun', helper])`, but each call starts a new Bun process with a 30-second default timeout and runs outside the sandbox.
  No route passes a process handle to another mod, and dotclaude needs no Bun process in its mod.
- Subagents as peer sessions (`SendFile`, `SendMessage`, agent teams): each peer costs a full start of about 12K tokens and shares no cache.

### D11 Bun, TypeScript, and workspace layout

The port to `.ts` comes after the cut of D25, so only the code that stays moves.
Mods load `.ts` files, and Bun 1.4.3 runs `.ts` files with no build step.
`bun check` checks the types against `tsconfig.json`, passes the TypeScript 7.0.2 conformance suite, and needs no `typescript` package (Bun 1.4.3 release notes, 2026-10-10).
Bun runs each process that dotclaude starts: the classic hooks, the status line, the skill scripts, `tools/`, and the tests through `bun test`.
`bun install` with `bun.lock` replaces pnpm and `pnpm-lock.yaml`.
Outside the hooks module graph, code uses the Bun API where Bun has one, and a `node:` module only where the map of D28 gives none.
The code uses erasable syntax only, with no `enum`, no `namespace`, and no parameter properties, and each relative import names its `.ts` extension.
The hooks module graph keeps no `node:` import, no `bun:` import, and no use of the `Bun` global, because Claude Code loads the module in its mod runtime and not as a Bun process.
Whether that runtime gives `Bun` is not verified (task 2.16).
Classic hooks live in `hooks/<event-type>/<hook-name>.ts`, and `hooks.json` comes from the generator.
Commands run through `just` recipes that call Bun scripts with `Bun.$`, not shell-only syntax, and paths come from `node:path`, `import.meta.dir`, and `Bun.fileURLToPath`.
The hooks module graph is the exception: the mod runtime has no path API and no `node:path`, and the types of Claude Code join paths with `/`, as in `${$.plugin.root}/hooks/weights.bin`.
So a file in that graph joins paths with `/`, which Windows also accepts.
CI runs `just check` on Windows, Linux, and macOS.

Trade-offs:

- `bun check` has no language server, so an editor that shows type errors brings its own server.
- A user without Bun cannot run dotclaude, so `configure` and the wiki install page name the requirement.

### D12 Generator

Each text that a plugin ships comes from one source folder `src/`, outside `plugins/`, which does not ship.
The texts are the prompt sections, the agent bodies, the output style, the skill files, the tool texts, `hooks.json`, the plugin `settings.json`, the settings snippet, and the wiki tables.
`src/` holds each repeated rule and each copied limit once.
`just generate` writes the plugin files, and the check fails when a generated file differs from its source.
Generated files carry a header that names the source, and the size bounds skip them by name.
A generated JSON file has no header and is on the list of generated files, because a `$comment` key fails `claude plugin validate --strict` in `plugin.json` and logs an error at each start in `hooks.json`.
Code stays hand-written `.ts` in `plugins/`, and a generated file holds no logic.

### D25 Cut before the port

The 0.28.0 workspace has 119 runtime files (12,041 lines) and 97 test files (11,301 lines).
After group 1, the answer of the user was to cut code before the port, and to fix the faults of `external/agent-failure-dossier/` in the prompts, the agent bodies, and the output style, not with regex checks (`research/issues.md`).

| Part | Files | Call |
| --- | --- | --- |
| Approval-claim check | `features/adherence/approval.mjs` | cut, a prompt rule replaces it (task 5.7) |
| Code-span check | `features/adherence/spans.mjs` | cut, the output style rule stays |
| Code that only these two checks use | found by the import graph | cut |
| Tests that check the words of a message, a prompt, or a doc (dossier I15) | listed in `research/cut.md` | cut |
| `Stop` prompt hook | `hooks/Stop.prompt.txt` | D15 decides |
| File-print deny, guard rules, `sembr` rewrite | `features/reads/`, `features/guard/`, `features/sembr/` | move into the hooks module (D26) |
| Asks on git commands, protected files, and changes that can hide a defect | the rest of `features/adherence/` | move into a `tool.check` hook of the module, which can ask (`research/probes.md`, 2.2) |

`research/cut.md` lists each file and test with its call, and the user reviews it before any delete.

### D26 Tool checks in the hooks module

A `tool.call` hook of the hooks module can deny a call: the model gets the reason as a `tool_use_error`, and the tool does not run (`research/probes.md`).
A classic `PreToolUse` hook starts a Bun process for each matched call, and the hooks module runs in process.
So each check that denies or rewrites a tool call moves into `hooks/register.ts`, and its logic stays in a feature with no `node:` or `bun:` import.
A `tool.call` hook cannot ask the user: a return of `{ ask }` is skipped as the wrong shape, and the call runs (task 2.1).
A module `classic.PreToolUse` hook fires, but its `permissionDecision: 'ask'` shows no prompt, and the call runs (`research/mod-api-probes.md`, item 7).
A module `tool.check` hook can ask: in the mode that asks, the user gets the permission prompt, and in auto mode, auto mode decides as it does for the ask of a permission rule (`research/probes.md`, 2.2).
So each ask moves into a `tool.check` hook of `hooks/register.ts`.
Classic hooks stay only for what the module cannot do: the `SessionStart` clear note, the notify script, the goal check, the status line, and the `PostToolUse` subagent context note (`hooks/PostToolUse/context.ts`) until task 4.1 moves it to a `turn.step` hook.

### D13 Skills redone, and `configure`

The dotclaude skills are redone and renamed.
`configure` replaces `setup`, and the user invokes it.
It sets up the global `~/.claude`, the repository `.claude`, and the outside tools after install.
A script computes each change, `configure` shows the diff, and it writes only after the user confirms that diff.
It writes no backup file, and the diff is the record.
This replaces the 0.28.0 rule that no code writes a user settings file.

The 0.28.0 `setup` applied no settings, its merge replaced `availableModels` and dropped `statusLine` fields, its status line path held the plugin version, it wrote that path into the committed project settings, and it picked Mythos with no question.
So `configure`:

- merges by key and keeps each value of the user that dotclaude does not own, and shows a changed value of the user in the diff;
- points the status line to a stable launcher in `~/.claude` that finds the newest installed copy of the plugin, because a user `statusLine` with `${CLAUDE_PLUGIN_ROOT}` does not run (probe 1.15);
- writes no path of one machine into a project file that git tracks;
- asks the user for each model and account choice, and gives the evidence, such as the model catalog.

### D14 Picker

A mod tool whose `tool.call` hook calls `$.ui.ask` with `multiSelect` shows a picker inside the tool call, and returns the picks as one string joined by `", "` (probe 1.10).
With nothing ticked, `$.ui.ask` throws, so the tool catches it and returns an explicit empty list.
The `Type something` row gives one free-text note for the question.
A note for each item through the `n` key needs a mod pane in `configure`, which is not probed.

### D15 Hook evals and the `Stop` hook

The `Stop` hook of 0.28.0 is a prompt hook on Sonnet 5.5.
It makes one extra request of about 6,914 input tokens at each turn, also on a one-word reply (probe 1.8), and when it blocks, the session gets the raw evaluator prompt with a literal `$ARGUMENTS`.
In the `vegaspro` session of 2026-10-11, it blocked the opener "Agreed.", and the same opener passed on the next stop (likely because `stop_hook_active` was true, not verified).
Each hook gets an eval of its allow path, its block path, the exact text that the session and the user see, its cost for each turn, and its false-block rate on correct messages.
A block text with instructions for an evaluator, or text that conflicts with the block reason, fails the eval.
The `Stop` hook becomes a command hook if its eval passes, else it goes.

The transcripts show three more hooks with faults:

- The approval-claim guard blocks a future decision and a claim with a source in a project file.
  D25 cuts it, and a prompt rule replaces it.
- The read guard checks only a single command, so a compound command with a read passes.
  It splits the command on `;`, `|`, and `&&` and checks each part, and it gets eval cases first.
- The code-span hook blocked implementers on identifiers in prose.
  D25 cuts it.

### D16 Jev tool and its `AskUserQuestion` hook

`withPicks` (`plugins/dotclaude-jev/features/jev/ask.mjs:64-65`) adds a note to the question text, and the answers come back keyed by that text.
The hook keeps the question text unchanged, puts the note in an option description, and skips multi-select questions.
A hook-lab test reproduces the loss first.
The Jev tool is deferred with or without `TYPESAFE_API_KEY`.

### D17 Core prompt and tool descriptions

The vanilla core prompt of 2.1.296 is 804 tokens in `-p` mode, and the dotclaude sections are 1,922 tokens.
The core prompt is rebuilt from the simple system prompt (`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`), and each dotclaude rule stays only when an eval shows its value.
The built-in tool descriptions are trimmed to their definitions through `tool.describe`.
No session of 2.1.296 has `Grep` or `Glob`, although the prompt and the agent files name them.
The bundle shows why (`external/cc-2.1.296/strings.txt`, byte offsets):
a gate that is on by default removes both tools unless the launch opts in to them (21380780), the shell embeds `ugrep` 7.8.4 and `bfs` (1334107, 1348782), and the built-in prompts then say "Use `grep` via Bash" and "Use `find` via Bash" (21381180, 23191506).
So `grep` and `find` through `Bash` is the search route of 2.1.296, not an agent fault.
The opt-in is a launch flag only: a `--tools` list or an `--allowedTools` rule that names `Grep` or `Glob` (29255562).
Task 1.13 measured it at 1,553 tokens at each start, and the user picked `grep` and `find` through `Bash` as the route of 0.29.0, with no opt-in.
The prompt, the `tools:` list of each agent, the `Bash` description, and the read guard then name that route, and none names a tool that the session does not have.

When the project has a code graph, a question about code goes to `codegraph` first: `callers`, `callees`, and `impact` for a symbol, and raw `grep` and `Read` are the fallback for text and for files that the graph does not hold.
On 0.28.0, the main session of the apply session ran 94 `grep`, `find`, `sed`, and `cat` commands and no `codegraph` command, and 3 of its 26 subagents used it, although the `SessionStart` note of `dotclaude-codegraph` named it.
The add-on keeps its note, and the core prompt and the agent bodies say to use the code graph when the session has one, with no import of the add-on.
The start budget is set again from a capture after the cuts.

### D18 to D24, and D27

See `design-parts-2.md`: the agent suite, the handoff, the goal command, the notifications, the snippet, the lab fixes, the research dossier, the semi-auto handoff at a context level, and the Bun API map.

## Risks / Trade-offs

- [The probe of D1 fails with the new note] → Raise `TURNS_LEFT_AT`, because `SubagentStop` cannot act at the cap (probe 1.2).
- [A later Claude Code version stops `$.command.run` from running `/clear`] → The `manual` switch of D27 still works, and the hook lab of each release checks the route.
- [The Sonnet and Opus roster costs more] → The pilot of D18 measures it, and the user decides before the release.
- [A trimmed JSONL fails to resume] → The handoff loads as a prompt.
- [The move to `.ts` breaks a mod load] → The hook lab runs each module before a live session, and the 0.28.0 tag is the rollback.
- [Row 3 is too long] → "Fit to width" drops the smallest parts first.
- [A turned-off built-in tool costs quality] → An item that can cost quality stays on until an eval shows no loss.
- [The prompt rebuild loses a rule] → The variant tests check each kept rule, and the eval checks each variant.

## Migration Plan

Skills have new names, and the CHANGELOG lists each old and new name.
`configure` applies the snippet after the user confirms the diff, so the user does not copy keys by hand.
Rollback is the 0.28.0 tag of each plugin.

## Open Questions

- Task 1.17 finds the open parts of the mod API: `-p` mode, a note to a running subagent, and the classic events in the module.
- Task 12.8 finds the cause of the slow resize.
