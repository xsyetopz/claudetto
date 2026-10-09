# Probe results of task group 2, Claude Code 2.1.293

Each probe is a scratch plugin in `$TMPDIR`, loaded with `--plugin-dir` in `just sandbox`, with a headless `-p` run.
The agent sandbox of the session that ran the probes blocks a local port, so `just capture` was not available to it.
Evidence is the debug log (`--debug-file`) and the transcript usage records of the sandbox config.

## Sandbox setup with the managed drop-in

- The managed drop-in of task 1.1 locks the name `dotclaude`.
  Claude Code ignores the `--plugin-dir` copy ("plugin is locked by managed settings").
- Fix used: with `CLAUDE_CONFIG_DIR` and `HOME` set to the sandbox, `claude plugin marketplace add <checkout>` and `claude plugin install dotclaude@dotclaude`.
  `claude plugin list` then shows "Read from: <checkout>/plugins/dotclaude".
  `tools/sandbox.mjs` does not do this yet.
- Bash in a sandbox session fails inside the agent sandbox, because the nested Bash sandbox cannot create its socket.

## 2.1 Route A (done)

- Id of a `--plugin-dir` load: `<name>@inline`.
- Log: `cc-plugin-sec-default@builtin not seated: managed prependPlugins does not list it`.
- Log: `prependPlugins names dotclaude@dotclaude, which is not an enabled managed plugin with a hooks module; skipped`, and a warning that managed settings do not name the source of its marketplace, so its module runs at tier `user`.
  The bundle text says the plugin is seated at the prepend tier only when managed `extraKnownMarketplaces` declares its marketplace as a local directory and the plugin is read in place.
  A GitHub install runs from a cache copy, so it stays at tier `user`.
- With the guard not seated, the `prompt.section` hooks of dotclaude (`context_management`) and of a user-tier probe (`env_info_simple`) both reached the request: the model quoted both texts.
- The classic `UserPromptSubmit` command hook of the probe ran.
- Section ids on Haiku 5.5 (`prompt.compose`): `lean_body`, `communication`, `pronouns`, `action_caution`, `session_guidance`, `env_info_simple`, `context_management`, `heron_brook`, `total_tokens`.
- Recorded in `wiki/Claude-Mods.md`, section "Route A".

## 2.4 `turn.step` model and effort (open: effort not proven by a run)

- Main loop: session model `claude-opus-5-5`, the hook set `claude-sonnet-5-5`, and the transcript records `claude-sonnet-5-5` for each request.
- Subagent: `agent.spawn` result is `{"model":"claude-sonnet-5-5","agentId":"..."}`.
  `turn.step` steps of the subagent carry that `agentId`, and the hook set `claude-haiku-5-5`, which the subagent transcript records.
- Step 0 only is not enough.
  Each step input carries the session model again (`in=claude-opus-5-5` at index 1), and a run with a rewrite at index 0 only sent index 1 to `claude-opus-5-5`.
  The router must rewrite every step.
- Effort: the debug log shows the rewritten effort reaching the hook chain, and the bundle passes `hookEffortValue` to the function that sets `output_config.effort`.
  The transcript does not record effort.
  Proof by a run needs `just capture` from a terminal outside the agent sandbox.

## 2.8 Layout of design D17 (done)

Probe: a scratch marketplace with one plugin, `hooks/register.mjs` that imports `../scripts/lib/x.mjs`, `types/index.d.ts` named in `plugin.json`, and `hooks/register.test.ts`.

- `claude plugin validate` passed on the marketplace and on the plugin.
- A `types` file must export types only, and must declare state in `declare module 'claude-code' { interface PluginState {...} }`.
  A bare `export {}` fails validation.
- `claude plugin test` ran `hooks/register.test.ts`, and the test that reads the imported mark passed.
- A live `--plugin-dir` load ran the module, and the model found the imported mark in its system prompt.
- So the hooks module can import from `scripts/lib/`, and D17 stays as it is.

## 2.7 Prompt hooks for the main session and a subagent (done)

Probe: `prompt.compose` adds a section, `prompt.section` adds text to `env_info_simple`, and `prompt.context` adds a block, each with a code word.
The main loop (Sonnet 5.5) and one `dotclaude:investigator` subagent (Haiku 5.5) each listed the words that they saw.

- Main session: all three words reached the request, and the model quoted each one.
  `prompt.compose` is honored: an added section with `scope: 'session'` reaches the request.
- Subagent: only the `prompt.context` word reached it.
  `prompt.compose` and `prompt.section` ran once in the run, for the main prompt only.
  A subagent's system prompt is its agent body and does not go through the composer.
- `prompt.context` blocks of the main session: `claudeMd`, `currentDate`.
- Evidence is the model's quote of each word, not a capture, because the agent sandbox blocks the capture port.
- Choice for design D15: the main session uses `prompt.compose`, so the `prompt.section` fallback is not needed.
  A subagent gets its per-model text from its agent body, or from `agent.spawn` (`prompt` is rewritable) or `prompt.context`.
  This changes D15, which picks the variant "at spawn for each subagent" through the composer.

## 2.10 Router fallback through a classic `PreToolUse` hook on `Agent` (open: effort not proven)

- A `hooks.json` command hook returned `updatedInput` with `model: "haiku"` and `effort: "low"`.
  The debug log says "modified tool input keys: [..., model, effort]".
- `agent.spawn` then saw `model=haiku`, its result was `claude-haiku-5-5`, and the subagent transcript records `claude-haiku-5-5`.
  So on the first-party API the `haiku` alias resolves to Haiku 5.5.
  Bedrock, Vertex, and Foundry were not tested, because this machine has no access to them.
- A full model id works in `agent.spawn`: a hook that set `claude-fable-5-1` gave a subagent that the transcript records as `claude-fable-5-1`.
- Not proven: that the subagent request carries the hook-set effort, and whether `maxEffortLevel: "max"` clamps it.
  Both need `just capture`.

## 2.21 to 2.25 status

- 2.21: `tools/sandbox.mjs` installs a locked plugin from its managed folder.
  A fresh sandbox (`DOTCLAUDE_SANDBOX=$TMPDIR/sbx-test`) added the marketplace, installed `dotclaude@dotclaude`, and loaded its hooks module.
  Bash in the sandbox session still fails with `EPERM` on the `srt-mux` socket, because the agent sandbox blocks a local listen.
  The managed `sandbox.enabled: true` with `failIfUnavailable: true` wins over a scratch `sandbox.enabled: false`, so the fix is `sandbox.network.allowLocalBinding: true` in the agent session, which the user sets.
- 2.21, in a capture session with `allowLocalBinding: true` set: Bash in the sandbox session still fails with `EPERM` on `listen '/tmp/claude-501/srt-mux-<pid>-2.sock'`.
  `allowLocalBinding` lets a TCP port bind, but not this unix socket.
  The bundle has `sandbox.network.allowUnixSockets` and `sandbox.network.allowAllUnixSockets`, and the next test is one of them in the agent session, which the user sets.
- 2.22 (done): with `target.json` installed, a fresh sandbox run logs `hooks module dotclaude@dotclaude loaded (worker, environment 1, tier prepend)` and `cc-plugin-sec-default@builtin seated by managed prependPlugins at position 2`.
  The captured Haiku 5.5 request has the dotclaude `context_management` text ("Compaction is off in this session").
- 2.23 (done): documented in `wiki/Sandbox.md` (Capture session).
  In a session with `ANTHROPIC_BASE_URL=http://127.0.0.1:8787` and `ENABLE_TOOL_SEARCH=true`, one sandbox run added 2 request files to the capture folder.
- 2.24: done, with the variants in `research/dropins/` and the general commands in `wiki/Managed-Drop-In.md`.
- 2.25: the procedure is in `research/surfaces.md`, and it waits for the user's runs.

## 2.14 A hook that changes a file (done)

- Probe plugin: a classic `PostToolUse` hook (matcher `Edit|Write`) that appends `// appended by hook` to the edited file, and a `Stop` hook that appends a line to `stopfile.txt`.
  Sandbox runs on Claude Code 2.1.293 with Haiku 5.5, debug logs `sbx-fix-1.log` to `sbx-fix-4.log`.
- Two `Edit` calls on `a.txt` in one turn, with no re-read between them: both succeeded.
  The debug log says "PostToolUse hook modified .../a.txt after Edit - re-synced readFileState".
  So Claude Code re-reads the file state after a `PostToolUse` hook, and the next `Edit` has no stale-file error.
- Claude Code adds this text to the context after the hook: "PostToolUse hook modified <file> after your edit (likely a formatter). Your next Edit will not fail with a stale-file error, but if its old_string targets a region the hook reformatted, Read the file first."
- A second `Edit` whose `old_string` was the line that the hook appended also succeeded, although the model never saw that line.
- `Stop` hook between two turns (`-c` for the second): the file changed on disk after turn 1.
  The `Edit` in turn 2 succeeded and the result says: "(note: the file had been modified on disk since you last read it - the edit applied cleanly, but the file contains other changes not in your context. Read it before edits that depend on surrounding content.)"
  So no `Edit` fails in either case.
- Result for D7: the claim "a changed file makes the next Edit fail" is false on 2.1.293.
  The rejected alternative (fix in `PostToolUse`) is not rejected for that reason.
  The remaining reasons are real: a fix after each edit costs time on every edit, and a changed region can break the next `old_string` match.
  Design change: reword the D7 "Alternative" line to say that the next `Edit` does not fail, but Claude Code warns that the file changed, and an `old_string` in a reformatted region needs a Read.
  The `Stop` design stays, and it gives one batch run and one block.
- Side finding: a `.env` file in the repository root made `bun tools/sandbox.mjs` exit 1 with no output, because the agent sandbox denies reads of `**/.env`.
  `bun --no-env-file` works around it.

## 2.15 `openspec update` after `delivery skills` (done)

- OpenSpec 1.14.1, with `XDG_CONFIG_HOME` set to a scratch folder so that the global config of the user is not changed.
- `openspec config set delivery both`, then `openspec init --tools claude --no-animation` in an empty scratch project.
  Files after init: 6 command copies `.claude/commands/opsx/{apply,archive,explore,propose,sync,update}.md`, 6 skills `.claude/skills/openspec-{apply-change,archive-change,explore,propose,sync-specs,update-change}/SKILL.md`, `openspec/config.yaml`, and two `.gitkeep` files.
- `openspec config set delivery skills`, then `openspec update`.
  Output: "Removed: 6 command files (delivery: skills)".
  A file list diff shows only the 6 command copies removed, and the 6 skills remain.
- So D11 holds: `openspec config set delivery skills` then `openspec update` removes the command copies.
- `openspec init` has no `--delivery` flag, so the order in setup is: init, config set, update.

## 2.4 effort part, capture run (done)

Setup: a probe plugin `probeR` (user tier) with a `turn.step` stream hook that sets `effort` for the main loop and for steps that carry an `agentId`.
Runs go from `/tmp` with `bun --no-env-file`, because the agent sandbox denies reads of the repository `.env`, and bun then exits 1 with no output.
Code word `EFFTASK1`, main model Sonnet 5.5, default effort `medium`, hook sets main `low` and subagent `high`.

- Capture `request-2026-10-07T21-25-56-236Z-67.json` (main, step 0): `output_config` is `{"effort":"low"}`.
- Capture `...-70.json` (subagent, `agentId` a72ad7d6575c56069, hook set `high`): `output_config` is `{"effort":"high"}`.
- Capture `...-74.json` (main, step 1): `{"effort":"low"}` again.
- Debug log lines: `step agent=main idx=0 in=claude-sonnet-5-5/medium out=claude-sonnet-5-5/low`, and the same line for the subagent with `out=.../high`.
- So the request field is `output_config.effort`, and `turn.step` changes it for the main loop and for a subagent by `agentId`.
- The input of every step shows the session effort (`medium`) again, so the router must rewrite every step, as for `model`.
- Runs `EFF1B` and `EFF1C` (hook sets `max` on both): the requests carry `xhigh`, see 2.10 below.
- Status: done.

## 2.10 effort and clamp, capture run (done)

A classic `PreToolUse` command hook on `Agent` returned `updatedInput` with `model` (alias) and `effort`.
Managed `maxEffortLevel: "max"` was in force (`50-dotclaude.json`).
The subagent request is the capture file with 2 messages and a system block of 4008 characters.

| Run | Hook `model` | Hook `effort` | Subagent request |
| --- | --- | --- | --- |
| `EFF2A` | haiku | xhigh | `claude-haiku-5-5`, `xhigh` (`...-174.json`) |
| `EFF2B` | haiku | max | `claude-haiku-5-5`, `xhigh` (`...-176.json`) |
| `EFF2C` | sonnet | xhigh | `claude-sonnet-5-5`, `xhigh` (`...-191.json`) |
| `EFF2D` | sonnet | max | `claude-sonnet-5-5`, `xhigh` (`...-183.json`) |
| `EFF2E` | opus | max | `claude-opus-5-5`, `xhigh` (`...-180.json`) |
| `EFF2F` | opus | xhigh | `claude-opus-5-5`, `xhigh` (`...-177.json`) |
| `EFF2G` | none | none | sonnet, effort `medium` (control, `...-169.json`) |

- The hook-set effort reaches the subagent request: `xhigh` is carried as set, on all three models.
- `max` is clamped to `xhigh` on all three models, for the `PreToolUse` route and for the `turn.step` route (`EFF1B`, `EFF1C`: set `max`, request `xhigh`).
- The managed `maxEffortLevel` was `max`, which the bundle treats as no cap (`l!=="max"` in the cap function), so the clamp does not come from it.
- The bundle has a second cap, `model_access.max_effort_level` per model from the account profile (first-party and gateway only).
  **Inference:** that account cap, or a model-level cap of `xhigh`, causes the clamp.
  The run does not tell which, and the cap may differ for another account.
- Model by model: every tested model allows `xhigh` and none allows `max` on this account.
  The router must treat `xhigh` as the top of the range, and must read the real cap at run time if it needs to know.
- Status: done for the hook route and the clamp result.
  Open: the exact source of the cap, which needs a run with a managed `maxEffortLevel` below `xhigh`, and a second account.

The results of tasks 2.16 and later are in [probes-2.md](probes-2.md).
