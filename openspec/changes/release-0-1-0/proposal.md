## Why

The restart removed features the user never agreed to drop, and setup writes less than the plans asked for. This change restores or rebuilds each area by the user's decisions, and squeezes every surface claudetto reaches. The reasons are in `prd.md`, and each decision is in `decisions.md`.

## What Changes

- Setup writes `$schema`, `minimumVersion: "2.1.314"`, the five `/config` disables of D2, the six `Agent(...)` denies of D4, the 16 `env` flags of D18, `CLAUDE_CODE_THRIFTY_SONIC=0` (D14), `statusLine`, and `subagentStatusLine`. It still writes only `~/.claude/settings.json`.
- Setup runs `openspec init` in the project when the CLI is on `PATH` (D3).
- A new status line, rebuilt on the stdin JSON of `2.1.314` (G3).
- A one-time warning at `SessionStart` when Claude Code is older than `2.1.314` (D13).
- Restored and rebuilt: `session/hygiene`, widened to stale generated files under `~/.claude/` (D11), `work/finish` (D9), and the `Hermes` agent (D6).
- A light docs lookup through Context7 or our own (D15).
- The compaction summary runs on Haiku 5.5 at `high` (D16).
- **BREAKING**: The classifier request is cut down rung by rung. Each rung is read in characters for free, and its regression is read in a paid A/B against the built-in classifier run locally. The `autoMode` lists and `src/automode/faults.ts` follow the readings (D20).
- A paid A/B of claudetto's own auto mode, Jev first and then `claude-haiku-5-5` at `high` or `claude-sonnet-5-5` at `medium`, against the built-in classifier. Nothing is wired before the reading (D17, D19, D36).
- Every surface claudetto reaches is cut and read before and after: the prompt, tool texts, agent and skill texts, the output style, and hook output (D21).
- Version `0.1.0` in every manifest.

## Capabilities

### New Capabilities

- `openspec-init`: setup sets up OpenSpec in a project.
- `status-line`: a status line and a subagent status line from stdin JSON only.
- `version-floor`: the minimum Claude Code version, kept by setting and warned about at start.
- `session-hygiene`: removal of stale claudetto files and stale generated files under `~/.claude/`.
- `finish-loop`: `/goal <cmd>` and the `tasks.md` loop.
- `research-agent`: the `Hermes` web research agent.
- `docs-lookup`: a light lookup of library docs.
- `building-blocks`: each surface change as one source module on a shared core, so the plugin is easy to extend and maintain.

### Modified Capabilities

- `tier-profiles`: the snippet gains the keys above, and the Haiku summary call runs at `high`.
- `surface-trim`: the 16 `env` flags, the six agent denies, and the five `/config` disables.
- `low-hitl`: "Choose the Classifier Model by Measurement" becomes the A/B of D19 and D20, and the classifier request is trimmed by reading.
- `prompt-footprint`: the budget covers every surface of D21, read by `just capture` and `just inventory`.

## Impact

- Code: `plugins/claudetto/src/tiers/`, `src/automode/`, `src/summary.ts`, new modules for the status line, the version floor, hygiene, and finish, `agents/Hermes.md`, `tools/capture/`, `tools/evals/`.
- User settings: `/claudetto:setup` writes more keys to `~/.claude/settings.json` and keeps each value the user set.
- Manifests: `0.1.0` in the four files `just claude-version` and `tools/manifests.ts` read.
- Cost: the A/B runs only on approval, with its share of the weekly limit given first. The seven-day window read 83% used on 2026-10-30.
