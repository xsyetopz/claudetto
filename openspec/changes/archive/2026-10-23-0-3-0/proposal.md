## Why

claudetto 0.2.0 costs time, tokens, and trust on Claude Code 2.1.306, as `prd.md` records.
`0.3.0-alpha.1` rebuilds it on a minimal base, and it keeps only the parts that have evidence (`architecture.md`, decision A7).

## What Changes

- **BREAKING** Each session runs as the plugin agent `claudetto:main`, set by the plugin `settings.json` key `agent`.
  Its short body replaces the default system prompt body and the session sections (A9).
  Mod hooks replace or drop each default text that stays: the environment message, reminders, tool descriptions, the lists of agents and skills, and the attribution text.
  Undocumented and experimental levers are in scope when a test pins them (A12).
- **BREAKING** The section rewrites of the `prompt` slice go: `prompt.compose`, `prompt.section`, `transforms/`, and the 53 texts in `prompts/`, except the texts that the main agent and the hooks still use.
- New claudetto subagents, each with its own `model`, `effort`, `tools`, `maxTurns`, and `omitClaudeMd: true`.
  An `agent.offer` hook and `Agent(<name>)` denies hide `general-purpose`, `Explore`, `Plan`, `claude`, and `statusline-setup` (A2, A3).
- `/claudetto:setup` sets `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` from the plan tier: Pro 2, Max 5x 4, Max 20x 6 (A11).
- **BREAKING** The 170 `ask` rules go, the 92 `rm` rules with them.
  A `tool.check` gate on `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write` takes their place.
  It allows each action with no prompt, except an action that loses bytes for good, tampers with the system, or sends a secret to the network (A4, A5, D4).
  Static `deny` rules keep the same gate when mods do not load.
- **BREAKING** Auto mode is off (`permissions.disableAutoMode: "disable"`), so no classifier call runs (A1).
- **BREAKING** The snippet writes no `sandbox` key, and setup removes the 0.2.0 `sandbox` keys.
- The snippet drops the keys with no effect or a repeated effect (findings, faults 41 and 42), and adds the levers with a measured saving, such as `totalTokensReminder: "off"` and the tool denies of `research/claude-code.md`.
- The prompt texts stop telling Claude to wait for an agent, stop allowing a skipped check, and name `AskUserQuestion` for a decision.
- **BREAKING** The add-on plugin `claudetto-codegraph` goes, and setup offers no code-intelligence tool (A6, A10).
- `decide` stays, and Jev also decides the gate `ask` of a loss for good (D4).
- The slices `advise`, `goal`, and each control with no incident stay only with evidence, and the others go (A7).
- claudetto ships no output compressor, and no lower output cap without a paired measurement (A8).
- **BREAKING** MiniSpec comes back in place of OpenSpec: the step skills `claudetto:propose`, `claudetto:apply`, `claudetto:verify`, and `claudetto:archive`, and one small `minispec` command on the same `openspec/` file layout (D10).
  The 7 OpenSpec skills and the `bunx @fission-ai/openspec` init go.
- New: an edit ledger in the state of the session tells the edits of the agent apart from the edits of the user or a formatter, and a cleanup at session start removes the temp folders, the scratch pads, and the clean worktrees of ended sessions (D12, the user, 2026-10-22).
- `just generate` writes no build header into the files that a skill copies into a user project (findings, fault 40).

## Capabilities

### New Capabilities

- `prompt-base`: the main agent `claudetto:main`, its body, its tools, and the text that claudetto adds over it.
- `agent-roster`: the claudetto subagents, the hidden built-in agents, the default for a call with no type, and the cap for each plan.
- `permission-gate`: what claudetto allows, asks, and denies for `Bash`, `Read`, `Grep`, `Edit`, and `Write`, with and without mods.
- `settings-levers`: each key that the snippet writes, with its source and its saving, and the keys that it must not write.
- `setup`: how `/claudetto:setup` merges the snippet, reads the plan tier, and removes the keys of 0.2.0.
- `lean-surface`: the rule that each shipped slice, hook, text, and plugin has an incident, a measured saving, or a user need, and the list of the parts that go.
- **BREAKING** Skills get verb names (D11): `claudetto:dry` is `claudetto:dedupe`, `claudetto-lab:eval-compare` is `claudetto-lab:compare-evals`, `claudetto-sessions:sessions` is `claudetto-lab:replay-hooks`, and `claudetto-docs:docs` is `claudetto-docs:find-docs`.
- `minispec`: the spec workflow of claudetto, its file layout, its command, and its size bounds.
- `session-hygiene`: the edit ledger, and the cleanup of the temp folders and worktrees of ended sessions.
- `release-evidence`: the measures of `prd.md`, how they run, and how many repeat runs each eval gets.

### Modified Capabilities

None. `openspec/specs/` is empty (`openspec list --specs`: `No specs found.`).

## Impact

- Code: `src/plugins/claudetto/slices/` (`prompt`, `guard`, `setup`, a new `agents` slice, and the slices on trial), `src/plugins/claudetto-codegraph/` (removed), `src/kernel/` only where a slice bound moves.
- Generated files: `plugins/`, `.claude-plugin/marketplace.json`, and the plugin `settings.json`, through `just generate`.
- Tests: `tests/claudetto/<slice>/`, `tests/claudetto-codegraph/` (removed), and the pin tests of the snippet (`tests/claudetto/settings-pin.test.ts`).
- Docs: `src/wiki/` (the setup, permissions, agents, and add-on pages), and `CHANGELOG.md` under `0.3.0-alpha.1`.
- Users: the user settings change on the next `/claudetto:setup`.
  A user who wants auto mode or the sandbox sets it again after setup.
- Paid runs: the before and after measures need sandbox sessions, and each one needs the approval of the user (`CLAUDE.md`).
