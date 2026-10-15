# Proposal: `claudetto` 0.1.0

## Why

dotclaude 1.0.0 has 170 distinct faults ([faults.md](faults.md)).
The worst ones end sessions ("Prompt is too long" at 270k to 277k tokens, L1 and U8), deny good commands (S1, 369 hits), and spend tool calls on the spec process (E6).
Claude Code 2.1.299 and 2.1.300 add the extension points that fix these faults without a patch of the binary: the Mod API, `session.compact`, `$.model.fork`, and plugin worktree hooks.
The user locked a clean restart as `claudetto` 0.1.0 on 2026-10-14, with no compatibility with dotclaude 1.0.0.

## What Changes

- **BREAKING**: The product becomes `claudetto` 0.1.0.
  The core plugin is `claudetto`, and each add-on is `claudetto-<name>`.
  The first tag is `0.1.0-alpha.1`.
  No setting, file, or command of dotclaude 1.0.0 stays compatible.
- **BREAKING**: The minimum Claude Code version is 2.1.300, because the handover depends on the `session.compact` behavior of 2.1.300 (V2).
- The build stays generator-style: a small hand-written source in `src/`, and generated shipped files in `plugins/`.
  Each feature uses the decision ladder of the user: the Mod API, then a classic hook, then a built-in part of Claude Code, then nothing.
- Handover replaces compaction as the default, with an auto handover and a manual handover.
  Compaction becomes an opt-in profile.
- The `spec` slice and its binary go.
  MiniSpec, a lightweight SDD workflow built from skills, Markdown files, and the `minispec` CLI, replaces them.
  The CLI follows <https://clig.dev/> and keeps no event log.
  Its file layout is near the layout of OpenSpec, and it keeps the state of a change across a handover.
- The guard, the status line, the prompt, the trim, the setup, and the agents are rebuilt to fix their faults.
- `asks`, `attribution`, `checks`, `decide`, `sembr`, `styles`, and `surface` carry over with the fixes of their review rows.
- New: `gc`, a garbage collector for the outputs of Claude itself.
- **BREAKING**: These 1.0.0 features are left behind:
  - `rules` (Jev pick, by the grant of the user)
  - `stamp` in the core (Jev pick with neutral wording; the sessions add-on decides whether it records the version)
  - `dcc-plugin-agents-md` (the user: "keep it off")
  - the AI-policy ask of the guard (the user: "probably not needed")
- The YSK add-on, the browser, codegraph, docs, lab, and sessions add-ons are rebuilt as add-ons.
  Each add-on still works without the core plugin.

The marks and their reasons are in [features.md](features.md).

## Capabilities

### New Capabilities

- `plugin-generator`: the generator-style build, the decision ladder, the version pin, and the rule that no plugin imports another plugin.
- `handover`: the auto handover as compaction, the manual handover, and the opt-in compaction profile.
- `prompt-profile`: the system prompt override for each model and the subagent block.
- `context-trim`: the switches that turn off built-in parts, and the shorter or deferred tool descriptions.
- `status-line`: the main and subagent status lines from the Claude Code input.
- `role-agents`: the role agents and their model and effort values.
- `safety-asks`: the ask before a call that discards work, weakens a test, or changes a protected file.
- `command-guard`: the deny of a command part that only prints a file.
- `commit-attribution`: the attribution lines of `git commit` and `gh pr create`.
- `check-runner`: a batch of check commands that runs with no model turn.
- `decision-api`: the opt-in second opinion through Jev or a small Claude model.
- `semantic-breaks`: the rewrite of Markdown, commit, and PR text to semantic line breaks.
- `settings-setup`: the settings profile, the git excludes, and the drift check.
- `minispec`: MiniSpec, the lightweight spec-driven workflow with the `minispec` CLI, which works with the handover.
- `output-style`: the concise output style.
- `output-gc`: the record and the sweep of the outputs of Claude.
- `ysk-notice`: the YSK add-on with the built-in flow, also in `-p`, gated on `tengu_jolly_dewdrop`.
- `browser-addon`: the browser guide and the opt-in `WebSearch` backend.
- `codegraph-addon`: the codegraph CLI and skill, and the opt-in MCP server.
- `docs-addon`: the `ctx7` CLI and skill, and the opt-in `context7` MCP server.
- `lab-tools`: the logging proxy, the eval comparison, the sandbox, and the settings schema builder.
- `session-awareness`: the start cost, the usage, and the subscription and rate-limit awareness.

### Modified Capabilities

None.
`openspec/specs/` is empty.

## Impact

- `src/`: each slice of each plugin, and `src/kernel/` (shell parser, budgets).
  The spec store in `src/kernel/spec-store.ts` goes.
- `plugins/`: regenerated, with new plugin names, and a new `.claude-plugin/marketplace.json`.
- `tools/`: the generator, `validate.ts` (the C3 exemption is not decided), and the version tables of the schema builder (C2).
- `tests/`: one folder for each `claudetto` plugin.
- `wiki/`: new pages for `claudetto`.
  The historical dotclaude pages will be removed (the user, Sixth Set).
- Users: a managed-settings install is needed for `session.identity` (N5).
  A `session.compact` hook does not run where an organization manages Claude Code.
- Dependencies: no new runtime dependency.
  `codegraph`, `ctx7`, `agent-browser`, and CloakBrowser stay external and opt-in.
