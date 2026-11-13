# Probes on Claude Code 2.1.323

Labels: observed (ran here), cited (docs or type file, not run), inferred (reasoned from observations).

Harness, all under `/tmp/claude-501/` (`$TMPDIR`): `probe-harness/stub.ts` is a Bun fake Messages API that logs each request and answers `OK` over SSE; `probe-harness/run.sh` runs `claude -p` with temp `HOME` and `CLAUDE_CONFIG_DIR`, `ANTHROPIC_BASE_URL` at the stub, a fake API key, and `--debug-file`; `probe-harness/analyze.ts` summarizes requests. Runs and captured requests are in `probe-runs/<name>/`. Probe plugins are `probe-p1`, `probe-p3a`, `probe-p3b`, `probe-p4`, `probe-p5`. No paid call was made. The `claude plugin` commands ran against temp config dirs. Type file used: the 2.1.319 Mod API type file (`probe-dts/claude-code.d.ts`, cited; the newest published, no 2.1.323 copy).

Stub in `MODE=agent` answers the first request with an `Agent` tool call, so a real subagent request reaches the stub.

## 1. `prompt.compose` per-model swap

- Hypothesis: a `prompt.compose` mod can replace the whole body per `e.model`, and the stub sees different `system[2]` text per model.
- Prediction: opus and sonnet requests carry the mod's text; haiku (mod returns `next` unchanged) keeps the default; `scope` is `shared` or `session`; the subagent request does not carry the mod's body.
- Command: `run.sh p1-<model> <port> --model <model> --plugin-dir /tmp/claude-501/probe-p1`. Mod `probe-p1/hooks/register.ts` returns `{sections:[{id:"probe:body",text,scope:"shared"}]}` for opus (`OPUS-BODY: be terse.`, 20 bytes) and sonnet (`SONNET-BODY: be thorough.`, 25 bytes), `next(e)` unchanged for haiku. Manifest is `hooks/hooks.json` `{"modules":["./register.ts"]}`. `claude plugin validate` passed ("hooks: prompt.compose").
- Result (observed):
  - `system` bytes `[0]/[1]/[2]`: opus 74/62/20, sonnet 74/62/25, haiku 74/62/8469 (default). The mod sees `e.model` and `e.promptModel` (both equal the request model), `e.traits` (`lean,print,skills`), and `e.tools` (19 names, including deferred ones such as `NotebookEdit`).
  - A mod can replace the default body entirely: 0 bytes of default text remain in `system[2]`. Not replaceable by the mod: `system[0]` (billing header, 74 bytes) and `system[1]` (identity line, 62 bytes), and the system-role message in `messages[1]` (about 8.1 KB: environment, skills list, deferred tool names, agent types). The cached-prompt markers stay on `system[1]` and `system[2]`.
  - Section ids and scope on a lean model (opus, default): `lean_body` (shared, 1,229 bytes; holds the intro, the security notice, and `# Harness`), then session sections `pronouns` 357, `action_caution` 520, `session_guidance` 163, `memory` 2,142, `env_info_simple` 620, `context_management` 280, `act_dont_rederive` 277, `original_games` 265 (opus only). Haiku adds `heron_brook` 2,790 and `total_tokens` 49 and has no `original_games`. Sonnet is opus without `original_games`.
  - `scope` values: `shared` and `session` only (cited, `PromptComposeScope`); the mod's list needs every `shared` section before every `session` one (cited, type file comment: a list that breaks this skips the hook).
  - Subagent reach: with `MODE=agent` the general-purpose subagent request (`probe-runs/p1-agent/out/req-2.json`) had `system[2]` of the built-in subagent text (2,683 bytes, starts "You are an agent for Claude Code"), model `claude-sonnet-5-5`, header `cc_is_subagent=true`. The mod's body did not reach it. The mod's log shows two compose calls, both for `claude-opus-5-5`, none for the subagent model (observed). Inferred: compose runs for the main loop only for this subagent type. A `prompt.compose` on a subagent type that uses the lean prompt path was not probed.

## 2. Default `system` and tools

- Hypothesis: the default body is lean (about 5.6 to 5.9 KB) for opus and sonnet, larger for haiku.
- Prediction: sizes near the docs table (5,776 / 5,586 / 8,429 characters, cited for 2.1.316-ish).
- Command: `run.sh def-<model> <port> --model <model>`, then `analyze.ts --save`. Full texts: `/tmp/claude-501/probe-default/<model>.txt`; tool sizes: `<model>.tools.txt`.
- Result (observed): `system[2]` bytes include the memory path, which holds the config dir path, so sizes move by a few bytes with the temp path.

| Model | `system[0]` | `system[1]` | `system[2]` bytes | Tools in request |
|---|---|---|---|---|
| `claude-opus-5-5` | 74 | 62 | 5,893 | 12 |
| `claude-sonnet-5-5` | 74 | 62 | 5,630 | 12 |
| `claude-haiku-5-5` | 74 | 62 | 8,471 | 12 |

  Headings in `system[2]`, identical for all three, in order: `# Harness`, `# Session-specific guidance`, `# Memory`, `# Environment`, `# Context management`. Text before the first heading: the one-line "You are an agent working with the user..." intro and the `IMPORTANT: Assist with authorized security testing...` paragraph. The pronouns and action-caution paragraphs sit between `# Harness` and `# Session-specific guidance` with no heading.
  Per-model differences: sonnet = opus minus the final `original_games` paragraph (about 263 bytes); haiku = opus minus that paragraph, plus five unheaded paragraphs on reasoning effort, turns, asking, reversible edits, and blocked steps (2,790 bytes), plus a closing `<total_tokens>15000000 tokens left</total_tokens>` line.
  Tool list in the request (all three models): `Agent`, `Bash`, `Edit`, `ListAgents`, `Read`, `ReportFindings`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Workflow`, `DeferredToolPlaceholder`, `Write`. Others (`EnterWorktree`, `ExitWorktree`, `Monitor`, `NotebookEdit`, `SendMessage`, `TaskStop`, `WebFetch`, `WebSearch`) are deferred behind `ToolSearch` (19 names reach the compose hook, 22 reach `tool.list`). Schema bytes: `Agent` 4,866, `Bash` 3,055, `Edit` 966, `ListAgents` 1,159, `Read` 1,923, `ReportFindings` 2,181, `ScheduleWakeup` 4,923, `Skill` 1,811, `ToolSearch` 1,449, `Workflow` 5,399, `DeferredToolPlaceholder` 204, `Write` 639.
  Note: the earlier note in `cc-2-1-323.md` gave 6,274 / 8,862 bytes and 29,666 tool bytes; these runs used a fresh config dir with no `CLAUDE.md`, plugins, or user memory, and the tool bytes here sum to 28,575.
  Not in `system`: the environment, skills, and deferred-tool list ride in a system-role entry in `messages[]` (about 8.1 KB).

## 3. `engines` in `plugin.json`

- Hypothesis: `engines: {"claude-code": ">=9.0.0"}` makes 2.1.323 refuse the plugin; `">=2.1.323"` loads.
- Prediction: refusal on every load path.
- Commands and results (observed):
  - `claude plugin validate` on a plugin with `>=9.0.0`: exit 0, no engines complaint.
  - `claude -p --plugin-dir probe-p3a` (`>=9.0.0`): loaded; the compose marker `ENGINES-PROBE-MARKER` is in the request. Prediction failed for `--plugin-dir`.
  - Marketplace with a relative-path source (local folder), `plugin install probe-p3a@probe-mkt`: exit 0 with the note `"probe-p3a" needs Claude Code >=9.0.0, this is 2.1.323, but loads anyway because it's read from a local folder`. `plugin list` repeats the note.
  - Marketplace with a git source (`{"source":"url","url":"file:///tmp/claude-501/probe-gitsrc/p3a"}`), `>=9.0.0`: `Failed to install plugin ... "probe-p3a" was not installed: it needs Claude Code >=9.0.0, this is 2.1.323. Run claude update.` exit 1, nothing installed.
  - Same git source, `">=2.1.323"` (`probe-p3b`): installed, exit 0, enabled.
- Conclusion (observed): `engines` is enforced for installed copies from a remote or git source and not for a local-folder or `--plugin-dir` plugin; both give a note instead of a refusal. Cited by code search: strings `engine-range-invalid` and `engine-range-exempt` ("an installed copy would not load here"). An already installed copy that falls outside the range at load time was not probed.

## 4. `tool.list` mod event

- Hypothesis: a `tool.list` hook can remove built-in tools for main and subagents.
- Prediction: the filtered names vanish from `tools` in every request.
- First attempt failed: the hook treated `next(e)` as an array and threw (`tools.map is not a function`). `next(e)` resolves `{ value: ToolInfo[] }`, and `e` is `{}` (observed, `probe-p4`).
- Command: mod returns `{ value: r.value.filter(t => !DROP.has(t.name)) }` with `DROP = NotebookEdit, Workflow, Edit`; `MODE=agent` run with `--dangerously-skip-permissions`.
- Result (observed): debug log `tool.list: the session's 22 tools were raised in 73.9 ms; 3 removed, 0 added.` Main request tools went 12 to 10 (`Edit`, `Workflow` gone); the general-purpose subagent request went 7 to 6 (`Edit` gone). `NotebookEdit` (deferred) no longer appears in the request text (count 1 before, 0 after). Removal works for the main thread and a subagent. Not probed: whether a call to a removed tool by name is refused, and removal of an MCP tool.

## 5. `agent.spawn` and a plugin agent's prompt

- Hypothesis: `agent.spawn` can rewrite `model` and `prompt`; a plugin agent's body replaces the subagent system prompt.
- Prediction: subagent request model and first user message follow the rewrite; `system[2]` is the agent body plus engine notes.
- Command (a): mod returns `next({...e, model: "claude-haiku-5-5", prompt: "REWRITTEN-PROMPT say hi"})` for `general-purpose`. Result (observed): the subagent request went to `claude-haiku-5-5` with first message `REWRITTEN-PROMPT say hi` (the stub's call had `ORIGINAL-PROMPT say hi`). Default model without the hook was `claude-sonnet-5-5`, and `system[2]` was 2,683 bytes on sonnet and 2,734 on haiku (haiku adds the `<total_tokens>` line).
- Command (b): `probe-p5/agents/probe-agent.md` (frontmatter `name`, `description`, `model: claude-haiku-5-5`; body `AGENT-BODY-ONLY: reply tersely.`, 31 bytes), spawned as `probe-p5:probe-agent`. Result (observed): request model `claude-haiku-5-5`; `system[2]` 1,325 bytes: the 31-byte body, then about 1,294 bytes the engine appends (the note on agent messages and permission, the "Notes" list on absolute paths, emojis, colons before tool calls, and report files, and the `<total_tokens>` line). So the body replaces the default subagent text (which was 2,683 bytes with its own intro) but the engine's trailing notes stay. `system[0]` has `cc_is_subagent=true`; `system[1]` stays the Agent SDK identity line. Tools for the subagent: 7 (`Bash`, `Edit`, `Read`, `Skill`, `ToolSearch`, `DeferredToolPlaceholder`, `Write`).
- The spawn event input carries `parentModel` (read-only), `subagentType`, `provider`, `fork`, `background`, and `permissionMode` (cited; the dump in `probe-p5/spawn-*.json`).

## 6. Hook input: `UserPromptSubmit`, `PreToolUse`

- Hypothesis: no `model` field in the classic hook input.
- Prediction: confirmed absence.
- Command: `--settings probe-p6/settings.json` with command hooks `cat > file` for `UserPromptSubmit`, `PreToolUse`, `SessionStart`; `MODE=agent` run.
- Result (observed): keys of `UserPromptSubmit`: `session_id`, `transcript_path`, `cwd`, `prompt_id`, `permission_mode`, `hook_event_name`, `prompt`. `PreToolUse`: `session_id`, `transcript_path`, `cwd`, `prompt_id`, `permission_mode`, `effort: {level}`, `hook_event_name`, `tool_name`, `tool_input`, `tool_use_id`. `SessionStart`: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `source`. No `model` field in any. A hook cannot read the model from its input; the mod API (`$.session.model()`, `e.model` on `prompt.compose`) or `PreModelSwitch` and `PostModelSwitch` give it. The captured `UserPromptSubmit` was the second firing (the task-notification the subagent's completion injects as a prompt), which overwrote the first; the key set is the same. `agent_id` presence for a hook inside a subagent was not probed.

## Edge cases handled

- Fresh config dir and no `CLAUDE.md` or memory, so sizes are a floor, and the memory path adds a few bytes that vary with the temp path.
- First `tool.list` hook shape error found and fixed before recording the result.
- The default subagent model (`claude-sonnet-5-5`) differs from the parent's (`claude-opus-5-5`), which confounds a model comparison between main and subagent.
- Hook `cat > file` overwrote the first `UserPromptSubmit` capture.

## Left

- Compose on a subagent with the lean prompt path; `agent_id` in subagent hook input; a refused call to a removed tool; an installed-then-outdated `engines` plugin.
