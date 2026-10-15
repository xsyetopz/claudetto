# Fault Register of dotclaude 1.0.0

This register lists the faults of dotclaude 1.0.0 that `claudetto` 0.1.0 must not carry over.
The source is `external/cc-2.1.299/scratch/v110/findings.md` (session `7af09a94`, 2026-10-14).
The 138 review findings are in a linked part, [Review Findings](faults-review.md).

Evidence tags:

- `binary (strings.txt:N)`, `docs (docs/x.md:N)`, `run`, `logs`, and `inference`, as in `findings.md`.
- A `kg` cite is the `id` of a node in the dossier `external/cc-kg/2.1.299/nodes.jsonl`.
  Each Claude Code fact has a `kg` cite.
- Paths that start with `src/` or `tools/` are relative to the repository root, at commit `efa073ce` or later, because `src/` has no later commit.
- Paths that start with `scratch/` or `notes/` are relative to `external/cc-2.1.299/`.

## Counts by Source

| Source | Entries in this file | Review rows | Total |
| --- | --- | --- | --- |
| dotclaude | 33 | 138 | 171 |
| Claude Code | 11 | 0 | 11 |
| User settings | 2 | 0 | 2 |
| Total | 46 | 138 | 184 |

- One fault is in both lists: S9 is review row 100 (`spec` F3).
  So dotclaude has 170 distinct faults, and the register has 183.
- The `reportNote` count of `injected-instructions.md` is evidence for S2, not a separate entry.
- Review rows 99 (`spec` F2) and 101 (`spec` F4) have more evidence in `close-out.md`, and the register counts them once, as review rows.
- The ids S, U, L, C, W, and N come from `findings.md`.
  This register gives the ids E (section E), O (section Other), and V (the user input of session `7af09a94`).
- 9 items are not faults. The section "Not Faults" lists them.

## dotclaude

### Prompts and Behavior

| Id | Fault | Cause | Evidence |
| --- | --- | --- | --- |
| S1 | The guard denies the whole command when one part prints a file. | `src/plugins/dotclaude/slices/guard/adapters/mod.ts:125-137`, `domain/reads.ts:131-149` | `run` (`scratch/v110/scripts/printdeny.py`): 369 hits in 37 session files, 325 `is_error` |
| S2 | The report-now note comes on each tool call of a subagent over the bound. | `src/plugins/dotclaude/slices/handoff/adapters/mod.ts:121-131`, `limits.ts` | `run` (`reportnote.py`): 48 of 157 subagents. `logs (injected-instructions.md)`: 303 hits in 17 transcripts |
| S3 | The handoff prompt goes in as the plugin, and the classifier denies the next spec calls as Instruction Poisoning. | `src/plugins/dotclaude/slices/handoff/adapters/mod.ts:151-163` | `logs (281d7047:8-11, 85)`, `binary (strings.txt:331832)`, `kg` `permission-form:autoMode` |
| S11 | The main session pushes decisions and commands to the user, stops with no reason, and takes a question as a go-ahead. | The 1.0.0 prompts, and a review step that asks the agent to approve its own work (`inference`) | `run` (`asks.py`): 26 of 760 blocks say a decision is the user's. `logs (281d7047:103, 119, 153)` |
| U1 | The agent asks questions in plain text. | The 1.0.0 prompts | `run`: 7 blocks end with `?` and 8 offer work, against 23 `AskUserQuestion` calls |
| U3 | Apology, preamble, and padding. | The 1.0.0 prompts and styles | `logs (7f9af63f:7)`. No count, because a text match for tone is not reliable (`inference`) |
| L3 | Each session starts with a raw JSON build stamp in the transcript. | `src/kernel/stamp.ts:24` | `logs`: 9 sessions, and again after each options reload (`7f9af63f:891`) |
| N9 | The prompt slice sets `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1`, which equals the default on the 5.5 models. | `src/plugins/dotclaude/slices/prompt/slice.ts:62` | `docs (docs/env.md:389)`, `kg` `env:CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`, `prompt-text:section:lean_body` |
| N10 | The env sets `CLAUDE_CODE_TODO_REMINDER_MODE=off` (not in the docs) and `CLAUDE_CODE_DISABLE_CFC_PROMPT=1`, which keeps the Chrome tools. | `src/plugins/dotclaude/slices/prompt/slice.ts:64`, `trim/slice.ts:11` | `binary (strings.txt:333662, 329123)`, `kg` `env:CLAUDE_CODE_TODO_REMINDER_MODE`, `env:CLAUDE_CODE_DISABLE_CFC_PROMPT`, `skill:claude-in-chrome` |
| E3 | `headsUpNote` says "The person gave a heads-up" when a side model wrote the topic. | `dcc-plugin-you-should-know` `notice.ts:197` | `logs (injected-instructions.md)`: 8 hits |
| E4 | `nestedText` puts file text into a tool result. | `dcc-plugin-agents-md` `agents.ts:147` | `logs (injected-instructions.md)` |
| E5 | 7 dotclaude texts are over the P160 budgets, and the first request is 16,632 tokens. | System prompt entries 0-6 (5,562 chars), `skill_listing` (7,134 chars), `agent_listing_delta` (3,180 chars) | `logs (context-budget.md)` |

### Context and Status Line

| Id | Fault | Cause | Evidence |
| --- | --- | --- | --- |
| S10 | The status line divides by a 300k window, but Claude Code gives the percentage against the model window. | `src/kernel/budget.ts:14, 20-23`, `src/plugins/dotclaude/slices/statusline/segments.ts:90-95` | `run` (`statusLine.command` capture): `context_window_size` 1000000. `binary (strings.txt:324264, 332626)`. `kg` `statusline-field:context_window.context_window_size`, `statusline-field:context_window.used_percentage`, `env:CLAUDE_CODE_MAX_CONTEXT_TOKENS`, `env:CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `env:DISABLE_COMPACT` |
| L1 | Sessions end with "Prompt is too long", because no compaction runs. | `src/plugins/dotclaude/slices/prompt/slice.ts:54, 61, 65` set the 300k window and `DISABLE_COMPACT=1` | `logs (7f9af63f:1100, d9133bf3:1050-1095, ef21d7f2:1308-1325)`: 10 rows in 3 sessions. `kg` `env:CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `setting:autoCompactEnabled`, `env:DISABLE_COMPACT` |
| U8 | No handover at 91 percent. | The handoff design | `logs (7f9af63f:789)`. The hint fired at 63 percent, and the file was not written (`7f9af63f:1085`) |

The L1 fault is older than 1.0.0.
The 0.28.x logs have 14 "Prompt is too long" stops in 10 of 43 sessions (`external/agent-failure-dossier/08-session-log-corpus.md`).

### Spec

| Id | Fault | Cause | Evidence |
| --- | --- | --- | --- |
| S9 | A `verify:` field can hold prose, and the shell runs it. | `src/plugins/dotclaude/slices/spec/adapters/verify.ts:80`, `domain/front.ts:26, 38` | `run`: 15 of 172 package files hold prose, 1 event with exit 127 |
| U9 | A change cannot go back to planning. | `src/plugins/dotclaude/slices/spec/domain/states.ts:71-79`, `plan.ts:42` | `logs (7f9af63f:299, d87f7ed2:901)` |
| E1 | `verify` reads the dirty files only after the command, so a file dirty before the run counts as a change. | `spec/adapters/verify.ts:87-93` | `logs (close-out.md)`: 5 `verify` runs gave exit 1 |
| E2 | `merge` needs a clean main checkout and has no `--in` option. | `spec` CLI | `logs (close-out.md)` |
| E6 | Spec calls are 30 percent or more of the tool calls. | The spec process | `logs (spec-redesign.md)`: 10 of 14 sessions |

### Setup, Sandbox, and Worktrees

| Id | Fault | Cause | Evidence |
| --- | --- | --- | --- |
| S5 | A commit in the sandbox cannot sign, because the `Read(~/.ssh/**)` deny becomes a sandbox `denyRead`. The user's git signing config is also a cause. | `src/plugins/dotclaude/slices/prompt/slice.ts:138` | `run` (isolated config, `git commit`): exit 128. `binary (strings.txt:323200)`. `kg` `setting:sandbox`, `permission-form:Read(~/x)` |
| S6 | `bun install` fails with `EPERM` in the sandbox. | `src/plugins/dotclaude/slices/prompt/slice.ts:104-` sets `sandbox` with no `filesystem.allowWrite` | `run` (isolated config): EPERM with no `sandbox.filesystem`, 94 packages with `allowWrite` |
| U2 | The runtime paths are not git-excluded. | `src/plugins/dotclaude/slices/setup/adapters/cli.ts:39` is the only caller of `excludeRuntimePaths` | `run` (OpenJoystickDriver `git status`): `?? .claude/worktrees/` |
| W1 | An agent worktree has no generated types, so the type check fails there. | `plugins/dotclaude/.claude-plugin/types/.gitignore:1` ignores `index.d.ts` | `run` (`git check-ignore -v`, `ls`). `kg` `setting:worktree`, `hook-event:WorktreeCreate` |
| E7 | The guard refused `git checkout -- bun.lock`. | `guard` slice | `logs (close-out.md)` |
| O1 | `TESTED_VERSION` is "2.1.296". | `src/plugins/dotclaude/slices/setup/domain/facts.ts` | `logs (ef21d7f2:341)` |
| O2 | A review in a linked worktree is refused. | `spec` review | `logs (6c3752d7:142)` |

### Gate and Add-ons

| Id | Fault | Cause | Evidence |
| --- | --- | --- | --- |
| C1 | `just check` fails at `lint:md` on plugin output. | `.markdownlint-cli2.jsonc` does not ignore `.dotclaude/`, and the handoff writer emits MD028 and MD032 | `run` (`just check`, HEAD `76dc06d7`): 89 errors |
| C2 | One test fails: no type helper table for 2.1.299. | `src/plugins/dotclaude-lab/slices/schema/domain/build.ts:43` | `run` (`just test`): 2307 pass, 1 fail |
| C3 | `just validate` fails on a file that `openspec init` writes. | `tools/validate.ts` checks `.claude/` | `run` (`just validate`): 354 lines in `.claude/skills/openspec-explore/SKILL.md` |
| N1 | Two gating hooks of `dotclaude-sessions` have no `.catch`. | `src/plugins/dotclaude-sessions/slices/start-cost/slice.ts:21`, `usage/slice.ts:22` | `run` (`claude plugin validate`) |
| U5 | `dotclaude-sessions` is thin. | 2 commands only | `run` (`ls plugins/dotclaude-sessions/bin`). The log analysis needed 7 scripts |
| U7 | The YSK add-on gives false alarms, and its text says that the user did the action. | `dcc-plugin-you-should-know` | `logs (401e7c86:270, 50d08f2d:280, 7f9af63f:926, ef21d7f2:536)` |

## Claude Code

These faults come from Claude Code 2.1.299, its defaults, or its docs.
`claudetto` must work around them, and must not patch the binary.

| Id | Fault | Evidence |
| --- | --- | --- |
| S4 | A worktree starts from `origin/<default-branch>`, not from `HEAD`. dotclaude 1.0.0 does not set `worktree.baseRef`. | `binary (strings.txt:323216, 332614, 221237)`, `kg` `setting:worktree` |
| S8 | Claude Code removes an agent worktree that has only git-ignored files, because the clean check has no `--ignored`. | `binary (strings.txt:332617, 323340, 332620)`, `kg` `setting:worktree`, `tool:Agent` |
| U10 | The native build has no `Glob` and `Grep`, unless a CLI `--tools` or `--allowedTools` list names them. A `permissions.allow` rule does not. | `binary (strings.txt:331135, 337203)`, `run` (`init` event: 18 tools, 20 with the flag), `kg` `tool:Glob`, `tool:Grep`, `cli-flag:--allowedTools`, `cli-flag:--tools`, `env:CLAUDE_CODE_ENTRYPOINT` |
| N2 | The built-in YSK plugin has `defaultEnabled: false`, and the server flag `tengu_jolly_dewdrop` gates it. | `binary (strings.txt:338620, 356293)`, `kg` `builtin-plugin:cc-plugin-you-should-know`, `setting:enabledPlugins` |
| N3 | `docs/hooks.md:3872` says that `Setup` runs `command` and `mcp_tool` hooks. Only `command` hooks run. | `run` (`notes/hooks-4.md`), `docs (docs/hooks.md:1402)`, `kg` `hook-event:Setup`, `cli-flag:--init` |
| N4 | A plugin `settings` block applies only `agent` and `subagentStatusLine`, so a plugin cannot ship `env`, `permissions`, or `autoMode`. | `notes/plugins-2.md:24`, `kg` `file-format:plugin.json` |
| N5 | `$.session.identity()` works only for a mod that managed settings install. | `binary (types-2.1.299.d.ts)`, `notes/plugins-2.md:114`, `kg` `mod-namespace:session`, `file-format:managed-settings.json` |
| N6 | The default `claude-md-or-agents-md` loads only `CLAUDE.md` when both files exist. Project settings cannot change it. | `run` (`notes/rules-styles-2.md`), `docs (docs/memory.md:394)`, `kg` `file-format:AGENTS.md`, `builtin-plugin:cc-plugin-agents-md` |
| N7 | An `autoMode` list with no `$defaults` replaces the built-in entries, and only user, flag, and managed settings set `autoMode`. | `run` (`notes/permissions-5.md`: 72 `soft_deny` became 1), `binary (strings.txt:323562)`, `kg` `setting:autoMode`, `permission-form:autoMode` |
| N11 | A plugin agent type is `<plugin>:<name>`, so a plugin agent cannot replace a built-in agent. | `binary (strings.txt:332810, 333059, 331123)`, `docs (docs/sub-agents.md:716-729)`, `kg` `env:CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, `agent:Explore`, `agent:Plan`, `permission-form:Agent(name)`, `file-format:agents/*.md` |
| E8 | The `WebSearch` mode note (423 chars) has no switch except `CLAUDE_CODE_REMOVE_PROMPT_STRINGS`. | `logs (context-budget.md)`, `kg` `tool:WebSearch`, `env:CLAUDE_CODE_REMOVE_PROMPT_STRINGS` |

## Claude Code 2.1.300

These rows are the changes from 2.1.299 to 2.1.300 that touch `claudetto`.
The `kg` cites are rows of the delta `external/cc-kg/2.1.300/delta.jsonl`.
The inventory is `external/cc-diff-299-300/inventory.md`, and the live checks are `external/cc-diff-299-300/live/live-checks.md`.

| Id | Change | Effect on `claudetto` | Evidence |
| --- | --- | --- | --- |
| V1 | A hook's `updatedInput` is checked against the tool's input schema. Unknown keys are dropped, and a wrong type refuses the call. | No dotclaude 1.0.0 hook sends `updatedInput` (only the type in `src/kernel/node/hook-io.ts:16`). A `claudetto` rewrite must send the whole input with the right types. | `binary (strings.txt:333013)`, `run` (live check 2), `kg` `hook-event:PreToolUse`, `hook-event:PermissionRequest` |
| V2 | `$.model.fork` sends the transcript as the main thread last sent it, so a `session.compact` hook does not see the newest tool result in the fork. | The handover as compaction must keep the tail from the last tool use (`scratch/v110/handover-eval-300.md`). | `run` (runs `p4`, `p5`), `binary (types-2.1.300.d.ts:6979)` |
| V3 | Plugin `WorktreeCreate` and `WorktreeRemove` hooks now run for `--worktree`. | S4 and S8 can use a plugin worktree hook. dotclaude 1.0.0 has none. | `binary (strings.txt:358419)`, `kg` `hook-event:WorktreeCreate` |
| V4 | The `effort_cost_index` changed. Haiku `xhigh` is 2.03, and Opus `max` is 3.44. | The effort sweep runs on 2.1.300 only. | `binary (strings.txt:324694)`, `inventory.md` |
| V5 | New mod events `prompt.change` and `ui.view`. | Input for the YSK band and the handover UI. Not used yet. | `binary (types-2.1.300.d.ts:4246, 7164)`, `kg` `mod-event:prompt.change`, `mod-event:ui.view` |
| V6 | The prompt extract `cc-2.1.300/cc-extract-2.1.300/` is a copy of 2.1.299, and its rendered `system_block2.txt` is stale. | The `prompt` rebuild must use the live block, not the extract. | `run` (live check 1, `live/extract-check/system_block2.diff`) |
| V7 | An agent hook honors its `model`, and `SessionEnd` runs when a session with a background command is interrupted. | No change needed. An agent hook on `Stop` did not fire in `-p`. Two causes are possible: the `auto` permission mode, or the first run in a new config folder. Task 1.10 finds the cause and fixes it. | `run` (live checks 3 and 4) |

## User Settings

These faults are in `~/.claude/settings.json`, not in dotclaude.

| Id | Fault | Evidence |
| --- | --- | --- |
| N8 | `BASH_OUTPUT_MAX_CHARS` has no effect. The binary has 0 hits, and the name that acts is `BASH_MAX_OUTPUT_LENGTH`. No file in `src/`, `plugins/`, or `tools/` writes it. | `run` (`envsites.py`, `grep -c`), `kg` `env:BASH_MAX_OUTPUT_LENGTH` |
| V1 | `CLAUDE_CODE_MAX_CONTEXT_TOKENS` "150000" has no effect, because it acts only with `DISABLE_COMPACT`. The user set the 150k values as a workaround for 1.0.0. | `binary (strings.txt:324264)`, `kg` `env:CLAUDE_CODE_MAX_CONTEXT_TOKENS`, `env:DISABLE_COMPACT` |

## Not Faults

| Id | Why |
| --- | --- |
| S7 | Corrected: 32 worktree folders, not more than 150. |
| L2 | Vanilla compaction works at the target: 3 `auto` compactions at about 117k (`logs (7af09a94:369, 733, 1142)`). |
| L4 | Older evidence for L1, from the 0.28.x logs. |
| U6 | A feature request: status line colors with more meaning. |
| W2 | A stale manual worktree, not a product fault. |
| `ysk-api` | Design input from the 2.1.296 bundle. It needs a check against 2.1.299. |
| `history` | 24 local tags were deleted with user approval. |
| D | Design input from `external/agent-failure-dossier/`. |
| A | Design input from 7 arXiv abstracts. |

## Open Points for the User

The register does not decide these points.
None is open on 2026-10-14.

The user decided these points on 2026-10-14 (`external/cc-2.1.299/scratch/v110/findings-decisions-2.md`):

- S5: SSH commit signing in the sandbox is accepted.
- U10: `Glob` and `Grep` come back through the CLI flag.
- N5: `claudetto` uses `session.identity`.
- U8: handover is the default, with auto-handover and manual handover, and compaction is an opt-in config.
  The auto-handover needs a safety margin below the hard stop, and a check that the file exists before the clear.
- C1: lint ignores `.dotclaude/`.
- C2, C3, and N2 are explained to the user, and they stay faults or design input for the rebuild.
- N6: `cc-plugin-agents-md` stays off, because the core loader reads a `CLAUDE.md` symlink.
- N8: the setting `bashOutputMaxChars` is 16000, and the env line is removed (`scratch/v110/bash-output-length.md`).
- The "Prompt is too long" stops: the client blocks at 277,000 for a window of 300,000, and 1.0.0 checked only at the turn end (`scratch/v110/prompt-too-long.md`).
- YSK: the same flow and UI as the built-in, also in `-p`, and only for an account with `tengu_jolly_dewdrop` on.
