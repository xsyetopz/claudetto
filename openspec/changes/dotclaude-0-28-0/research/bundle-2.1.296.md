# Bundle of 2.1.296 (task 27.3)

Source: the binary `~/.local/share/claude/versions/2.1.296`, read with `strings -n 8` into `external/cc-2.1.296/strings.txt` (git ignores it).
The binary was read and never run for this comparison or changed.
The same file of 2.1.295 was used only to find what changed.
The minifier renames identifiers, so the comparison uses sets of names and the text of each definition, with short identifiers masked.
The offsets are byte offsets in the 2.1.296 file.
The type declarations of the mods API are a zstd asset inside the binary.
They were decoded from the asset of each binary and compared (`diff` of the two files).
The copy in `plugins/dotclaude/.claude-plugin/types/` is written by the engine only when a session loads the mod, so `just lab` does not rewrite it.

## Mods API items that dotclaude uses

The event definitions of `tool.call`, `tool.describe`, `prompt.attachment`, `agent.offer`, `prompt.submit`, `session.start`, `tool.check`, `session.append`, `prompt.compose`, `prompt.section`, `prompt.context`, `turn.step`, `command.run`, `config.set`, and `session.receive` are the same as in 2.1.295.
The `agent.spawn` definition differs only in a renamed helper.
The list of 110 `domain.name` strings (events and `$` calls) is the same.
The `ui.status` call (check and run) is the same.

The type declarations differ in three places:

- `autoCompactWindow` is new in the agent spawn options (`agent.spawn`).
  It is a token count from 100000 to 1000000 and it only lowers the window of the agent.
  dotclaude does not set it.
- The text of `$.mcp.connect` says that a server which the plugin manifest lists joins the session at its start.
  So listing a server defers nothing, and to hold its tools back a plugin refuses their calls at `tool.check`.
  dotclaude has no `$.mcp.connect` call.
- The reason `unlisted` of `$.mcp.connect` also comes where the host of the session runs the plugin servers itself.

Behavior changes in the bundle that touch these items:

- `$.process.run`: the cwd and the held turn of a served call now come from the calling agent (the context builder `_me` takes `cwd` and `turnHeld` from the served call).
  The run handler is `process.run: run(n, r) => ... {signal: r.signal, cwd: r.cwd}` in both versions, so only the source of `r.cwd` changed.
  The one use in `plugins/dotclaude/hooks/register.mjs` (the policy `gh` call) is in a hook of the calling agent, so it runs in the cwd of that agent.
  dotclaude serves no `$` method to another plugin.
- `prompt.submit`: the fix of Esc is in the engine (the hook result is not let through unchecked).
  The text of the refusal for a call that waits on the held turn is the same.
  dotclaude has no `prompt.submit` hook.
- `session.start`: the fix for plugins that load late is in the engine.
  The `session.start` hook of dotclaude does not depend on it.
- A `$` call from a hook of a module that was reloaded or removed is refused with `refused: the hooks module that made the call is no longer loaded (it was reloaded or removed)`.
  The text has 2 hits in 2.1.296 and 0 in 2.1.295.
  This is the refusal of `$.agent.register` in the release notes.
  dotclaude has no hook that calls `$` after an `await` past a reload on purpose, and its `tool.register` call is in `dotclaude-jev` at the start.
- MCP tool descriptions: the default limit is 4,096 characters (`vxn=4096`, was `LRn=2048`).
  The limit after tool search stays 16,384 (`Gns=16384`).
  `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` still overrides both.
  The same function (`Px`) cuts server instructions and the description of a `$.tool.register` tool.
  The Jev tool description (about 3,200 characters) is now under the default limit.
- `Read` takes the new input `allow_large` (a boolean).
  It lifts the size and token limit for one call when the context has room.
  The tool lists it in `decidingInputFields`.
- The `Agent` frontmatter and the `--agents` definitions take `autoCompactWindow`.
  `--debug` names an unknown frontmatter field (release notes).
  Task 27.4 decides what dotclaude does with both.
- Status line: `cost.total_api_duration_ms` and the `prompt_cache` fields are in the input.
  `features/statusline/input.mjs` has the offsets.
  The cost of Sonnet 5.5 cache reads is $0.10 per million tokens (release notes).

## System prompt sections

The ids in the section list of the bundle are the same as in 2.1.295.
All 33 ids of `ENGINE_SECTIONS` in `features/drift/data.mjs` are in the 2.1.296 bundle, so the data needs no change.
The bundle also has `env_info_static`, `memory_static`, and `user_pays`, which `ENGINE_SECTIONS` does not list.
No capture has shown them, so they stay out until one does.
The `intro` section says "You are an agent working with the user toward their goals, using your own judgment along the way."
`CLAUDE_CODE_INTRO_FRAME` and the old text are not in the bundle.
The `AskUserQuestion` text has the plan mode note only when the tool list has `EnterPlanMode` and `ExitPlanMode` (the check is `lrr`).
The saving of the `DEFERRED_TOOLS` entry was measured earlier and is not measured again (task 27.1 captures the first request).

## Context limits

The client blocks a request at the window minus `min(maxOutputTokens, 20000)` minus 3000 tokens.
This is the basis of `CONTEXT_BLOCK_MARGIN` (23,000).
`CLAUDE_CODE_AUTO_COMPACT_WINDOW` wins over the `model-default` clamp of 200K.
`claude-opus-5-5` is in the list `unclampedButBilledPast200k`, so without the variable the window is 200K.
The settings schema clamps `bashOutputMaxChars` to 4000-128000.

## Hooks

- The classic hook events and the settings schema are the same as in 2.1.295 (the schema work is task 27.2).
- `onFailure` takes `"continue"` (the default) or `"block"` on `command` and `http` hooks.
  A failure is a hook that could not start, timed out, exited with a code other than 0 or 2, or printed JSON that is not valid.
  With `"block"` the failure counts as exit code 2.
  It is ignored for async hooks and on `Stop`, `SubagentStop`, `TaskCompleted`, and `TeammateIdle`.
  The block text has `; blocking because onFailure is "block"`.
- `claude plugin validate` accepts `"onFailure": "block"` on a `PreToolUse` `command` hook in `hooks.json`.
  It rejects `"onFailure": "maybe"` with `expected one of "continue"|"block"`.
  Both were run on a copy of `plugins/dotclaude` in a temporary folder.
- `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` limits personal hooks and plugins that are not attested.
  Without the variable nothing changes.
- The managed settings fixes of the release notes (a `PreToolUse` hook with `"continue": false`, `updatedMCPToolOutput`) apply to managed settings only.

## Claims of the earlier notes that still hold

- A `tool.call` hook that denies after the tool ran gives `<tool> ran, and a plugin withheld its result: <reason>`.
  dotclaude denies only in `tool.check`, before the tool.
- A mod call while the hooks worker reloads is refused only for a hook that has a `.catch`.
  The guard hook has no `.catch` on purpose (`hooks/register.mjs`).
- `config.set` is denied with `config.set denied by a hook`.
  dotclaude registers no `config.set` hook.
- The normalizer of the `Grep` input (`FAt`, offset 21947588) moves `-l` and `-c` to `output_mode`, and renames `file_path` to `path`.
  It does not touch `pattern`, and `symbolOf` in `plugins/dotclaude-codegraph/features/graph/rules.mjs` reads only `tool_input.pattern`.
  Whether `PreToolUse` sees the input before or after the normalizer is not verified, and the result is the same in both cases.
- `Edit` refuses a file that changed since the read with `File has been modified since read`.
  The release notes add that `Edit` refuses a file that is not valid UTF-8 and has non-ASCII text.
- The built-in plugin ids in `OFF_PLUGINS` are all in the bundle.

## Result for dotclaude

- No break: no key, event, section id, or env var that dotclaude uses is gone.
- Changed in code: `TESTED_VERSION` is 2.1.296, and the code comments cite 2.1.296 where the fact was checked.
- Open: the decisions of tasks 27.4 (`autoCompactWindow`, `allow_large`, the `--debug` check) and 27.5.
- Not verified: the type files in `.claude-plugin/types/` still say 2.1.295 until a session loads the mod.
