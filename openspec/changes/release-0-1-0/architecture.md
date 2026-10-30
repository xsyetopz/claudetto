## Components

One plugin, `claudetto`, on Claude Code `2.1.314`: the mod (`plugins/claudetto/src/register.ts`), static files (agents, the output style, the `setup` command), and one setup CLI. Each row names the decision of `decisions.md` that backs it and the source the rebuild reads. A source is read, not copied: `0.4.0-alpha.2` is not a known-good baseline.

| Component | Job | Surface | Decision | Rebuild source |
| --- | --- | --- | --- | --- |
| `setup` | Merge one settings snippet into `~/.claude/settings.json`, keeping each value the user set | `src/tiers/setup.ts`, `just setup`, `/claudetto:setup` | G1, D2, D4, D13, D14, D18 | `src/tiers/` today, `archive/plugins/claudetto/modules/setup/` at `13db1836` |
| `openspec-init` | Run `openspec init` in the project when setup runs there and the CLI is present | `$.command.run` or the setup CLI | D3 | `archive/plugins/claudetto/modules/spec/` (read for the adapter only) |
| `statusline` | A `statusLine` and `subagentStatusLine` command that reads stdin JSON only | `bin/claudetto-statusline`, setting `statusLine` | G3 | `archive/plugins/claudetto/modules/statusline/`, `/tmp/ccx/report-statusline.md` D1 to D4 and D7 |
| `version-floor` | Warn once at `SessionStart` when the running version is under `2.1.314` | `classic.SessionStart` | D13 | none |
| `hygiene` | Remove stale claudetto work files and stale program-generated files under `~/.claude/` | a CLI and `classic.SessionStart` | D11 | `archive/plugins/claudetto/modules/session/hygiene/` |
| `finish` | `/goal <cmd>` and the `tasks.md` loop | a command | D9 | `archive/plugins/claudetto/modules/work/finish/` |
| `Hermes` | Web research agent whose pages stay out of the main window | `agents/Hermes.md` | D6 | `archive/plugins/claudetto/agents/Hermes.md` |
| `docs-lookup` | A light Context7 integration, or our own if none is light enough | to be chosen in `design.md` | D15 | none; `find-docs` is not restored |
| `prompt-trim` | Cut every surface claudetto reaches: the session prompt, tool texts, agent and skill texts, the output style, and hook output, each read by `just capture` and `just inventory` before and after. `session/prompt` itself is rebuilt only if a reading shows it costs little | `prompt.compose`, `prompt.section`, `tool.describe`, static files | D12, D21 | `archive/plugins/claudetto/modules/session/prompt/` |
| `summary` | The compaction summary on Haiku 5.5, at `high` | `src/summary.ts` | D16 | `src/summary.ts` today |
| `classifier-trim` | Read the size of the classifier request per rung, free, then pick the smallest rung that decides like A | `tools/capture/`, `autoMode` lists, `CLAUDE_CODE_AUTO_MODE_*` env | D10, D20 | `docs/prompt/machinery.md`, the `2.1.314` binary |
| `auto-mode-ab` | A paid A/B of the built-in classifier run locally (A) against claudetto's own mode (C) and the smallest trim rungs (B) | `tools/evals/` | D17, D19, D20 | `tools/evals/`, `src/jev/` |

Kept as they are: `Artemis`, `Athena`, `src/handoff.ts`, `src/read-back.ts`, and the other modules of `src/`. Out by decision: `Zeus`, `Hephaestus`, `Apollo` (D6), the OpenSpec workflow skills, the preset source, and `bin/minispec` (D3), `ground`, `protect`, and `notes` (D9).

## Data and Interfaces

- Settings snippet: one object that `src/tiers/merge.ts` merges, with a key the user set kept as is. It adds to today's snippet:
  - `$schema` (the published settings schema `$id`).
  - `minimumVersion: "2.1.314"` (D13).
  - `workflowSizeGuideline: "unrestricted"`, `workflowKeywordTriggerEnabled: false`, `enableWorkflows: false`, `enableArtifact: false`, `remoteControlAtStartup: false` (D2). All five are keys of `docs/keep/settings/claude-code-settings.schema.json`.
  - `permissions.deny` with the six `Agent(...)` rules of D4.
  - `env` with the 16 flags of D18 (D4's `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` and D2's `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1` among them) and `CLAUDE_CODE_THRIFTY_SONIC=0`, marked unofficial in code (D14).
  - `statusLine` and `subagentStatusLine`, each a command at the plugin root.
- `~/.claude.json` is never written. `autoInstallIdeExtension` lives only there, and its env twin `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` reaches the same end through `settings.json` (`/tmp/ccx/report-settings.md:213`). Claude Code rewrites `~/.claude.json` while it runs, so a second writer could lose either side's change.
- Status line input: the stdin JSON of `2.1.314`, and no file read, no network, no model call.
- A/B rows: one row per case and arm, with the verdict, the expected verdict, and the tokens, written under `tools/evals/`.

## Constraints

- No patch of the Claude Code binary or its npm package (`AGENTS.md`). Reading it for evidence is allowed.
- Nothing is removed, renamed, or turned off unless `decisions.md` names it (G7).
- A paid step runs only on approval, with its cost given as a share of the weekly limit. The seven-day window read 83% used on 2026-10-30.
- A source file has at most 300 lines and a test file at most 500.
- `just check` passes at the end of each task group.
- A fresh session stays below the 13.8k-token baseline, read with `just capture` before and after (G6).

## Decisions

- A1: Setup stays a CLI and a command, not a skill. Why: a CLI costs no prompt characters. Alternative: the old `setup` skill, whose description sat in every session.
- A2: Setup writes `settings.json` only. Why: every D2 item has a `settings.json` key or an env twin, and `~/.claude.json` has a concurrent writer. Alternative: edit `~/.claude.json` for `autoInstallIdeExtension`, rejected for the lost-write risk.
- A3: The version floor is two parts, `minimumVersion` and a `SessionStart` warning. Why: the plugin manifest has no floor field, and `requiredMinimumVersion` is managed-only (D13). Alternative: refuse to load, which no plugin surface allows.
- A4: `openspec init` runs only when the `openspec` CLI is on `PATH`, and setup reports when it is not. Why: the CLI is absent on this machine today. Alternative: vendor the CLI, which D3 rules out with `bin/minispec`.
- A5: The Jev-first auto mode is not wired in this release until the D19 reading exists. Why: D17. Alternative: ship it behind a flag, which still ships an unmeasured permission path.
- A6: The status line is rebuilt, not restored. Why: the stdin fields changed by `2.1.314`, and the report lists defects of the old one. Alternative: copy the archive, which carries the defects.
- A7: The classifier trim is measured in characters for free before any paid run, and the paid A/B reads each rung's regression against A, so the pick is the lowest characters for the least regression. Why: D20 asks for the fewest characters at the least regression, and size is free to read while regression is not. Alternative: cut by reading the prompt, which gives no regression figure.
