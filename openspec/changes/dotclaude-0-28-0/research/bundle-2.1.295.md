# Bundle of 2.1.295 against 2.1.294 (task 21.2)

Source: `external/cc-2.1.294/strings.txt` and `external/cc-2.1.295/strings.txt` (`strings -n 8`, read only).
The binaries in `~/.local/share/claude/versions/` were read and never run or changed.
The method is the method of task 2.33 (`probes-4.md`): sets of names and the text of each prompt, because the minifier renames identifiers.
Three read-only agents did the comparison on 2026-10-08, and the main session checked the key claims with `grep -c` on both files.
The offsets are byte offsets in the 2.1.295 file, unless the line names 2.1.294.

## Settings schema

- Top-level keys: the same set.
  The user schema goes from 161 to 162 keys, because `forceLoginGatewayUrl` is no longer managed-only.
  Its 2.1.295 description says that it is also honored "from your own user settings" on a machine with no managed settings.
  The managed schema stays at 184 keys.
- `permissions`, `sandbox`, and `env`: the same text after the identifiers are normalized.
- The 2.1.294 schema files are current: a fresh build from the 2.1.294 bundle gives the same JSON.
- The generator cannot build 2.1.295 yet (task 21.1):
  - The type helpers are renamed: array `A` to `C`, enum `W` to `U`, const `R` to `T`.
    Checked: `disableAutoMode:()=>W(["disable"])` in 2.1.294 and `U(["disable"])` in 2.1.295.
    The other helpers (`o`, `H`, `v`, `u`, `pe`, `Ae`) are the same.
  - `findDefinition` in `tools/schema/types.mjs` expects the lazy wrapper `f(()=>`, and 2.1.295 uses `p(()=>`.
  - 2.1.295 reuses short names, so the first definition of a name can be the wrong one.
    `ma` is first an `update_settings` message, and the `permissions` definition comes later.
    The fix is to take the last definition before `{$schema:()=>`.
  - `tools/schema/managed.mjs` finds managed-only keys by the text "Honored only from admin-controlled", so it needs a test for the new `forceLoginGatewayUrl` text.
- The generator never emitted the structure of `hooks`, only its description, so the schema files do not show `onFailure`.

## `onFailure` on hooks

- New in 2.1.295.
  The text "exited with a code other than 0 or 2" has 0 hits in 2.1.294 and 2 in 2.1.295.
- Definition (offset 14337538): `onFailure` takes `"continue"` (the default) or `"block"`.
  A failure is a hook that could not start, timed out, exited with a code other than 0 or 2, or printed JSON that is not valid.
  With `"block"`, the failure counts as exit code 2, so the tool call, the permission request, or the prompt is blocked.
- Hook types: `command` (not with `async` or `asyncRewake`) and `http`.
  `prompt`, `agent`, and `mcp_tool` do not take it.
- Ignored on `Stop`, `SubagentStop`, `TaskCompleted`, and `TeammateIdle`, with a warning in the log.
- Block text: `[<hook>]: timed out; blocking because onFailure is "block"` or `failed; …`, then the stderr of the hook.
- The check reads only the hook object, so a plugin `hooks.json` hook gets it too (inferred from the code).
- `claude plugin validate` accepts the key in a plugin `hooks.json` (runs on a temporary copy of `plugins/dotclaude`, 2026-10-08):
  - `"onFailure": "block"` on a `PreToolUse` `command` hook gives `✔ Validation passed`.
  - `"onFailure": "maybe"` fails with `Invalid command hook (onFailure: Invalid option: expected one of "continue"|"block")`.
  - `"onFailure": "block"` on a `prompt` hook gives `✔ Validation passed`, so the validator does not reject the key on a type that ignores it.
- A command that cannot start counts as a failure.
  The catch path (offset 24024683 in `strings.txt`) returns `succeeded:false` and `blocked:false`, and the `onFailure` step then sets `blocked:true`.
  A missing `node` most likely gives exit 127 from the shell, which also counts as a failure (inferred, not verified).
- The only warning is a log line at level `warn`.
  There is no notice in the session and no count, so with `"block"` each guarded call is blocked until the hook can start again.
- The hooks docs: the first 100,000 of 257,591 characters have no `onFailure`, and the rest is not verified.

## Mod API

- Event definitions: the same 50, and the same 138 quoted `domain.name` strings.
- `tool.call`, `classic.PreToolUse`, and `agent.spawn` pin a new key, `requestMeta`.
  A hook can set only `claude/plugins` and `anthropic/sources` in it.
  `requestMeta` has 0 hits in 2.1.294 and 11 in 2.1.295.
  dotclaude does not use it.
- `tool.check` and `session.append`: the same pinned keys and return fields.
- A call made while the hooks worker reloads is now refused when a hook on that event has a `.catch`.
  The refusal text has 0 hits in 2.1.294 and 2 in 2.1.295.
  dotclaude is not affected: its guard hook has no `.catch` on purpose (`hooks/register.mjs:15`), and neither have the router handlers.
- A deep-freeze helper is new, with a depth limit of 100,000.
- `prompt.submit`, `prompt.context`, `prompt.edit`, and `turn.step`: the definitions differ only in renamed helpers, after short identifiers are masked.
  `turn.step` keeps `turnId`, `index`, `messageCount`, and `agentId`.
  `prompt.submit` keeps `text`, `wait`, `origin`, and `context`.
- `prompt.section`, `prompt.attachment`, `prompt.compose`, `prompt.fill`, `prompt.suggest`, `prompt.autocomplete`, and `prompt.mention`: no change seen, but the fields were not read one by one (not verified).
- `session.append`: new kit text (offset 11715787) says that a session pins `tool_use`, `tool_result`, `thinking`, and unknown blocks, and that a hook scrubs a tool result with a new `tool_result` of the same `tool_use_id`.
  A rewrite of a pinned block is put back and logged at level `warn`.
  The text has 0 hits in 2.1.294.
  dotclaude uses `$.session.append` only in `reportDrift`.
  Task 21.5 checks the `claude plugin test` fix with a run.
- A mod that denies after the tool ran: see the section on the claims of task 21.6 below.

## Classic hooks

- The same 33 events and the same input fields for each event.
- The `prompt` hook evaluator texts for `Stop` and for the other events are the same.
- The default model of a `prompt` hook changed only on a gateway.
- The new env var `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` limits the output of personal hooks and of plugins that are not attested.
  It has 36 hits in 2.1.295 and 0 in 2.1.294.
  Without the variable, nothing changes.

## Prompt surface

- System prompt section ids and attachment types: the same.
- The section list of the bundle also has 17 conditional ids that `ENGINE_SECTIONS` did not list: `task_continuity`, `fable_identity`, `tool_param_json`, `tengu_silent_harbor`, `bg-session`, `brief`, `focus_mode`, `act_dont_rederive`, `delivering_work_max`, `overcorrection`, `subagent_steer_delegation`, `opus5_reduced_delegation`, `tengu_slate_bittern`, `brook_heron`, `willow_tern`, `autonomy_append`, and `endconv_deferred_hint`.
  Each one is in 2.1.294 too, so none is new.
  A capture on 2026-10-09 showed `endconv_deferred_hint` (the deferred `EndConversation` tool), and the drift note named it as unknown.
  `ENGINE_SECTIONS` now lists all 17.
  `ENGINE_SECTIONS` and `OFF_PLUGINS` in `features/drift/data.mjs` still fit.
- The `intro` section now always says "You are an agent working with the user toward their goals, using your own judgment along the way."
  In 2.1.294, `CLAUDE_CODE_INTRO_FRAME` or the flag `tengu_ochre_wren` chose that text, and the default was "You are an interactive agent that helps users with software engineering tasks."
  The variable and the old text have 3 hits each in 2.1.294 and 0 in 2.1.295.
- `sandbox_instructions` and `auto_mode`: the same text, so the surface handlers still fit.
- `Bash` `run_in_background`: a new shorter branch.
  The `TOOL_TEXT.Bash` replacement is used only when it is shorter, so it still fits.
- `WebSearch`: the description lost ", including links as markdown hyperlinks", with the new env var `CLAUDE_CODE_WEBSEARCH_CITATIONS`.
- The `describe` strings of the tool input schemas: 6 of 2,461 changed, and none is in `Read`, `Edit`, `Grep`, or `Bash`.
- Env vars: `CLAUDE_CODE_INTRO_FRAME` and `CLAUDE_CODE_ARTIFACT_FIVE_CLASS_ASKS` are gone, and 7 are new.
  Each env var of `profile.json` is still in the bundle.
- Built-in plugins (11) and bundled skills (48): the same.
- Second pass (2026-10-08): identifiers outside string literals and `${}` expressions were normalized before the diff.
- Git instructions: the same.
  The text from `# Committing changes with git` to `# Other common operations` (offset 21789540, 5,873 bytes in both) and the `Git Safety Protocol` copies differ only in identifiers.
  The `TOOL_TEXT.Bash` `# Git` block in `features/surface/data.mjs` still fits.
- The sections that the variants replace: `intro`, `system`, `doing_tasks`, `actions`, `tools`, `tone`, and `lean_body` (`KNOWN_SECTIONS` in `features/prompt/select.mjs`), and `context_management` (`prompt.section`).
  The string literals of all eight are the same, except the default `intro` text above.
  The output-style text of `intro` is the same.
- Input schemas: the same for `Agent`, `EnterPlanMode`, `ExitPlanMode`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TaskStop`, `ToolSearch`, and `TodoWrite`.
  The runtime code of `Agent` changed (a cloud launch is refused with `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG`, and a new `narrowOnly` option), and dotclaude does not depend on it.
  The `describe` strings that are variables, such as the `description` and `prompt` of `Agent`, were not read one by one (not verified).
- `ListAgents` description: the same.
- `AskUserQuestion` description: the same text, but 2.1.295 leaves out the plan mode note when `EnterPlanMode` or `ExitPlanMode` is absent from the tool list.
  The exact condition is not verified.
  The 1,682-token saving in `DEFERRED_TOOLS` was measured on 2.1.294 and is not measured again.

## Result for dotclaude

- No break: no key, event, section id, or env var that dotclaude uses is gone.
- Required: the schema generator fix and the 2.1.295 schema files (task 21.1), and the version pins (task 21.3).
- Docs: the `intro` text in `wiki/Prompt-Surface.md` and `wiki/Parts.md`.
- `wiki/Prompt-Surface.md` and `wiki/Parts.md` need the new `intro` text (task 21.3).
- Open: the decision on `onFailure` for the guard hooks (task 21.4), and the items marked "not verified" above.

## Claims touched by the 2.1.295 notes (task 21.6)

Notes: the Claude Code `CHANGELOG.md`, section 2.1.295, matched by topic.
Offsets are byte offsets in `external/cc-2.1.295/strings.txt`.

- Deeply nested tool input cut short in a mod hook: holds, and `wiki/Guards.md` needs no edit.
  The module guard reads only `input.command` and `input.url` (`features/guard/rules.mjs`), which are shallow.
  The fix is the deep freeze of the Mod API section above.
  `wiki/Claude-Mods.md` got one sentence.
- A mod call during a hooks worker reload gets past a guard with `.catch`: holds.
  The docs say that a hook with no `.catch` is skipped when it fails (`/docs/en/plugins/mods/events`), so `wiki/Guards.md` is right that the module fails open.
  The refusal needs a `.catch`, and dotclaude has none.
  `wiki/Claude-Mods.md` got one sentence.
- A mod that denies after the tool ran: changed, in `wiki/Claude-Mods.md`.
  This closes the "no such text found" line above.
  The text `<tool> ran, and a plugin withheld its result: <reason>` is built at offset 24037968, for a `tool.call` hook that denies after `next`.
  The 2.1.294 file already has the two prefixes, and 2.1.295 adds one log line (offset 9182166).
  dotclaude denies only in `tool.check`, before the tool, and its `tool.call` hook on `Edit` never denies.
- `Edit` treats a changed file as fully read: changed, in `wiki/Auto-Fix.md` and `design-parts.md` (D7).
  Both got a sentence that the task 2.14 measure (2.1.293) was not repeated.
  The error text "File has been modified since read" is the same in 2.1.294 and 2.1.295, and the exact fix is not found in the bundle (not verified).
  The design (fix at `Stop`, in one batch) holds with either behavior.
- MCP tool descriptions cut at 16,384 characters: changed, in `wiki/Prompt-Surface.md` (new section).
  Offset 19527461 has `LRn=2048,Nns=16384`, and offset 23188699 has `_x(e=!1){return CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH??(e?Nns:LRn)}`.
  The tool search path calls `_x(!0)` (offset 50154775).
  In 2.1.294 there is one constant, `M8o=2048` (offset 20414052).
  The `$.tool.register` description of a mod gets both cuts (offset 23320727).
  The docs page `/docs/en/mcp.md` still says 2,048 for each tool description.
- `Grep` flags `-l`, `-c`, and `-r` against the codegraph hook: holds, with no code change.
  `symbolOf` in `plugins/dotclaude-codegraph/features/graph/rules.mjs` reads only `tool_input.pattern`.
  The normalizer at offset 21752830 moves `-l` and `-c` to `output_mode`, drops `-r`, and renames `file_path` to `path`, and it never touches `pattern`.
  Not verified: whether `PreToolUse` sees the input before or after the normalizer.
  The result is the same in both cases.
- `config.set` for `/model`, `/fast`, `/output-style`, and the auto-update channel: changed, in `wiki/Claude-Mods.md`.
  The mods reference lists `config.set` as "A `/config` row is about to change" with `{ deny: reason }`.
  The bundle denies with "config.set denied by a hook" (offset 34828678).
  The notes are the only source for the four callers, because the bundle does not name them one by one (not verified by a run).
  dotclaude registers no `config.set` hook.
