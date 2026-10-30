## Problem

The `claudetto-restart` change (`openspec/changes/archive/2026-10-30-claudetto-restart/`) read the user's "No legacy compatibility will be retained" as an order to drop the old features. The user meant that the new tree carries no migration path from the old install. Nobody asked the user what the sentence meant, and nobody listed what would be removed before commit `199a3de8` (`refactor!: rebuild the tree on src slices`) deleted it.

The installed plugin (`0.0.0`, commit `a9f59d9a`) therefore ships 145 files where `0.4.0-alpha.2` (commit `13db1836`) shipped 392, and `/claudetto:setup` writes a settings file that misses what the plans asked for. Every removed file is still readable under `archive/plugins/claudetto/`.

Removed with no decision of the user:

| Area | `0.4.0-alpha.2` (`archive/plugins/claudetto/`) | `main` |
| --- | --- | --- |
| OpenSpec workflow | skills `propose`, `apply`, `verify`, `archive`, `sync`, `update`, `explore`; module `spec` (25 files); `bin/minispec`; the `epic`/`story`/`task` presets that `openspec/schemas/` is generated from | none; `openspec/schemas/` names a source that no longer exists |
| Status line | module `statusline` (17 files), `bin/claudetto-statusline`, `statusLine` and `subagentStatusLine` in setup | none |
| Setup | module `setup` (13 files): `$schema`, about 25 `env` flags, the OpenSpec adapter, the `CLAUDE.md` adapter, `bin/claudetto-setup` | `src/tiers/` writes no `$schema`, 2 `env` flags, no status line |
| Agents | `Apollo`, `Hephaestus`, `Hermes`, `Zeus` | `Artemis`, `Athena`, `main` |
| Session and work | modules `session` (42 files: handoff, hygiene, prompt facts) and `work` (36 files: ground, protect, notes, finish) | `src/handoff.ts`, `src/read-back.ts`, and no `work` |
| Other skills | `find-docs`, `setup` as a skill | `setup` as a command |

The user also set six settings by hand in `/config`, because setup did not: `workflowSizeGuideline: "unrestricted"`, `workflowKeywordTriggerEnabled: false`, `enableWorkflows: false`, `enableArtifact: false`, `autoInstallIdeExtension: false`, and `remoteControlAtStartup: false`. Setup does not deny the built-in agents either.

## Users

The owner of this repository, who installs claudetto from the `claudetto` marketplace on Claude Code `2.1.314` and works in the CLI only.

## Goals

- G1. `/claudetto:setup` and `just setup` write `$schema`, the `env` flags of the plan, the six `/config` disables above, the deny of the built-in agents, and the status line, and leave each value the user set.
- G2. Setup runs `openspec init` in the project. The workflow skills stay out (D3 of `decisions.md`).
- G3. The status line is back, rebuilt on the stdin fields of `2.1.314` with defects D1 to D4 and D7 of `/tmp/ccx/report-statusline.md` fixed.
- G4. Each other removed area is restored, rebuilt, or dropped by a decision of the user, recorded in `decisions.md`. Answered by D6, D9, D11, D12, and D15 of `decisions.md`.
- G5. Version `0.1.0` in every manifest, and a floor of Claude Code `2.1.314`. Answered by D13 of `decisions.md`.
- G6. A fresh session costs less than the measured 13.8k tokens of context, with the share of each part read by `just capture` before and after.
- G7. Nothing is removed, renamed, or turned off unless the user approved it by name in this change.
- G8. Auto mode asks Jev first and falls back to `claude-haiku-5-5` at `high` or `claude-sonnet-5-5` at `medium`, the one the A/B picks (D16 and D36 of `decisions.md`).

## Non-Goals

- A migration path from an old install (the real meaning of "No legacy compatibility").
- Patching the Claude Code binary or its npm package.

## Success Measures

- A clean reinstall from the marketplace, then `/claudetto:setup`, gives a `~/.claude/settings.json` that holds `$schema`, every planned `env` flag, the six disables, the agent denies, and `statusLine`, read back with `jq`.
- `just check` passes, and `claude plugin validate --strict` passes on `0.1.0`.
- `just capture --shipped` reads a first request below the `0.0.0` reading.
- `decisions.md` holds one line per removed area of the table above, each with the user's answer.
