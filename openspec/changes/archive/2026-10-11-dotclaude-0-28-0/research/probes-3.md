# Probe results of task group 2, part 3

Earlier results: [probes.md](probes.md) and [probes-2.md](probes-2.md).

## 2.11 Attribution without the git instructions (done)

Four sandbox sessions, run by the user in a terminal (Bash needs it), each told to commit `a.txt` and to write a PR description to `pr.md`.
Script and logs: `/tmp/claude-501/p211/` (`run.sh`, `result.txt`, `<arm>.log`).
Each arm has the 0.27.0 profile with `attribution.commit` and `attribution.pr` set.

| Arm | `includeGitInstructions` | Added | Commit trailer | PR footer |
| --- | --- | --- | --- | --- |
| `control` | unset | nothing | `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` | `🤖 Generated with [Claude Code](...)` |
| `off` | `false` | nothing | none | none |
| `line` | `false` | a `prompt.section` line with the trailer and the footer | `Co-Authored-By: Probe Line <line@example.com>` | `PROBE-LINE-PR` |
| `hook` | `false` | an `attribution.text` handler | none | none |

- The `attribution` setting reaches the model only through the git instructions.
  With `includeGitInstructions: false`, both texts are gone.
- A line in the system prompt brings both back, word for word.
  So the prompt variants of task 8.4 carry the attribution line, and the profile can set `includeGitInstructions: false`.
- The `attribution.text` handler loaded (`events: attribution.text`), but Claude Code never called it in the run.
  So it is not an alternative when the git instructions are off.
- The session model was Sonnet 5.5, while the profile trailer names Opus 5.5.
  The trailer text is fixed in the setting, so the prompt line must take the model name from the session, or name no model.

## 2.27 Probe P1 `$` calls in a handler of an imported feature file (done)

Two scratch mods in `$TMPDIR/p227/` (`/private/tmp/claude-501/p227/`), each with `hooks/hooks.json` `{"modules":["./mod.mjs"]}` and the same `$.session.cwd()` call in a `tool.call` handler.
Variant A defines the handler in `hooks/mod.mjs`.
Variant B has `hooks/mod.mjs` with `import { handler } from "./features/x/handler.mjs"` and `on("tool.call", handler)`, and the handler and its `$` call sit in `hooks/features/x/handler.mjs`.
Both modules import no `node:` module (design D19).
Commands: `claude plugin validate A`, `claude plugin validate B`, `claude plugin test A`, `claude plugin test B`.

| Check | A (in module) | B (in feature file) |
| --- | --- | --- |
| `validate` result | `Validation passed with warnings` (name case, author only) | same |
| `validate` `hooks:` line | `./mod.mjs hooks: tool.call` | same |
| `validate` `calls:` line | `./mod.mjs calls: $.session.cwd` | `./mod.mjs calls: $.session.cwd` |
| `validate` extra line | `gating hook without .catch: tool.call` | same |
| `test` handler ran | yes, `{"deny":"cwd undefined"}` | yes, same |

- Question 1: `claude plugin validate` passes for B, with the same output as A.
- Question 2: the `calls:` list of B includes the `$` call from the imported file.
  The line is attributed to `./mod.mjs`, the module, not to the feature file.
  So the engine follows the module graph and merges the calls of all imported plugin files.
- Question 3: the test API has no `e.uses`.
  The `$` of a test has the keys `tool,command,config,telemetry,prompt,skill,attribution,agent,session,turn,ui,classic`.
  The result of `$.tool.call` is only `{"deny":...}` or `{"result":...}`, and `(out).uses` is `undefined`.
  `index.d.ts` has no test field for used capabilities (`grep` of `uses`, `capabilit`, `called` finds none).
  Only `validate` reports the calls.
- A test handler for `tool.call` must return `{result}` or `{deny}`.
  A handler that returns `{context}` or nothing is reported as `skipped: returned neither { result } nor { deny }` in A and B alike.
- In the test, `on("session.cwd", () => ({ value: "/w" }))` gave `cwd.value` as `undefined` in both variants.
  The test stub shape for `session.cwd` needs a closer look, but it does not differ between A and B.

Verdict: pass.
Glue (handlers with `$` calls) may sit in feature files that the module imports.
The 250-line module trigger of design D18 does not apply for this reason.
Limit: a tool that lists `$` calls per file gets no per-file detail, since `validate` names the module only.

## 2.26 Does Claude Code give the model a measured context figure? (done, answer: not by default)

Sources: bundle `~/.local/share/claude/versions/2.1.293` (read with `strings` and `grep -o`), and the public docs.
The docs pages `code.claude.com/docs/en/context-window` and `/docs/en/env-vars` do not name any text that tells the model its context use.
Neither page mentions `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` or `CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT`.
Both are undocumented (**confirmed** for these two pages, not for the whole docs site).
The bundle has two attachments with a token figure.

| Attachment | Text sent to the model | Figure | When |
| --- | --- | --- | --- |
| `total_tokens_reminder` | `<total_tokens>N tokens left</total_tokens>` | A budget that counts down, not the context | Default mode `padded-countdown`, on by default |
| `token_usage` | `Token usage: used/total; remaining remaining` | The context: last request size, window size, rest | Only with env `CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT` |

- `total_tokens_reminder` is built by `wWt(mode, n)`.
  The setting `totalTokensReminder` is marked `@internal`, defaults to `padded-countdown`, and the env var `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` overrides it.
  The start budget is `totalTokensReminderBudget`, default 15000000 (env `CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET`).
- Seen in transcripts: the attachment is in every subagent transcript of session `157f1ff7`, one per tool round (for example `<total_tokens>14989165 tokens left</total_tokens>`).
  The same block shows in this probe's own context.
- That figure is a task budget, so it does not state the context size or the percent used (**confirmed**).
  Other modes: `countdown` gives the live remaining context-window tokens (a measured figure), `fixed` gives 5000000, `infinite` gives `Infinite`.
  Only `countdown` would give the model a context figure, and it is not the default.
- `token_usage` is built by `BPr`.
  It returns nothing unless the env var is truthy.
  It takes `used` from the usage of the latest assistant message and `total` from the window of the model.
  No transcript of the 14 sessions holds a `token_usage` attachment (**inferred** from the type counts of `157f1ff7`, not from all rows).
- Low-context warning: no `context_window_warning` string exists in the bundle.
  The auto-compact warning is for the user in the UI, and was not seen as model text (**inferred**, not searched in full).
- So the claim for D27 is: by default the model gets no measured context figure.
  Two caveats are needed.
  The `total_tokens_reminder` is a figure of a different kind, and the two opt-in switches above can add a measured one.

## 2.17 open item: why 64 to 66 requests at `maxTurns: 60` (cause found)

Cause: the coordinator resumed the stopped subagent with `SendMessage`, and the resumed run got new turns (**confirmed** by the rows, the rule behind it is **inferred**).
Transcripts: `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-dotclaude/157f1ff7-05d4-4d04-abf2-b7b6f4c4dda7/subagents/`.
Unique `message.id` counts are the request counts.

| Run | Requests | Requests before the first coordinator message | After it |
| --- | ---: | ---: | ---: |
| `a18891ec` | 64 | 60 | 4 |
| `a590cc10` | 65 | 60 | 5 |
| `abac1ea0` | 66 | 60 | 6 |

- Each of the three runs stopped at exactly 60 requests, so `maxTurns` held.
  Then a user row appears with `The coordinator sent a message while you were working: You stopped at the turn limit ...`.
  The run went on for 4 to 6 requests and ended with a report.
- `abac1ea0` has a second later row (`[SYSTEM NOTIFICATION - NOT USER INPUT]`, a background-task event) after request 65.
  That row does not add a turn by itself (**inferred**).
- The other four runs of the session (`a0d6c853` 40, `aa628972` 36, `ae5fd456` 16, `afeab571` 23 requests) stayed below 60.
- Ruled out in the three runs, counts by kind:
  - Stop or SubagentStop hook block rows: 0 (no row text with `stop hook` or `hook feedback`).
  - `max_turns_reached` attachments: 0 in the files (the string `max_turns` is absent).
  - Compaction rows (`isCompactSummary`, `compact_boundary`): 0.
  - API retries: none seen, each `message.id` has 1 to 6 rows (one per content block), and ids are unique per request.
- Not verified: the bundle rule that gives a resumed run a new turn count.
  **Inferred** from the data: the turn counter restarts on a resume.
- Effect for the design: `maxTurns` bounds one run, not the sum over resumes.
  A coordinator that answers "You stopped at the turn limit" with `SendMessage` buys up to about `maxTurns` more requests.

Scratch plugin `p231`: `/tmp/claude-501/p231/plugin/` (`hooks/hooks.json`, `hooks/mod.mjs`, `hooks/post.mjs`, `agents/probe.md`).
Logs: `/tmp/claude-501/p231/logs/` (2.31) and `/tmp/claude-501/p231/logs2/` (2.32).
Sessions: `/tmp/claude-501/p231/sbx-{rewrite,control,sub}/config/projects/`.
All runs used `claude-haiku-4-5`.
`TMPDIR` in the sandbox is `/tmp/claude-501`.
The debug log shows `hooks module p231@inline loaded (worker, environment 4, tier user); events: session.append`.

## 2.31 Rewrite of a `response` row with `session.append` (done)

The module handles `session.append` with `{ door: "response" }`.
It writes one JSON file for each call with `$.fs.write` and a counter, then replaces `OK` with `REWRITTEN` and a period and a space with a period and a line break.
The control arm runs the same module with the same logging and no rewrite.
Prompt: write "OK. I will read the file.", read a file, end with "OK. The file is read.", remember a secret word.
Turn 2 uses `--resume` and asks to quote the previous final message and the secret word.

- A first try changed `e.message.content[i].text` in place and called `next(e)`.
  The row was stored unchanged.
  The rewrite works only when the hook passes a new object: `next({ ...e, message: { ...e.message, content } })`.
- Display and storage both change.
  `result` of `--output-format json` was `REWRITTEN.\nThe file is read.` (control: `OK. The file is read.`).
  The stored `.jsonl` rows hold `REWRITTEN.\nI will read the file.` and `REWRITTEN.\nThe file is read.`.
  The control rows hold the original text.
- The model reads the stored rewrite.
  In turn 2 it quoted `REWRITTEN.\nThe file is read.` and the secret word.
- The hook fires once for each content block, not once for each response.
  One tool turn gave 5 calls: `thinking`, `text`, `tool_use`, `thinking`, `text`, each with `blocks: 1`.
  Turn 2 of the same session gave 2 more (`thinking`, `text`).
  The counter restarts in a new process, so the turn-2 files overwrote files 1 and 2 of turn 1.
  The `thinking` and `tool_use` rows reach the hook too, so a handler must pass them on unchanged.
- All calls had `door: "response"` and `origin.kind: "model"`.
  The main loop has no `agentId`.
- The next request prefix is not fully stable.
  Usage of turn 2 (`cache_read_input_tokens` / `cache_creation_input_tokens`):

| Arm | Turn 1 read / create | Turn 2 read / create |
| --- | --- | --- |
| `rewrite` | 16985 / 6154 | 11439 / 427 |
| `control` | 16929 / 6087 | 11633 / 151 |

- In the control, turn 2 reads 11633, which is the whole cached prefix of the last turn-1 request (11383 + 250).
  In the rewrite arm, turn 2 reads only 11439, which is the cache of the first turn-1 request, and creates 276 more tokens.
  The difference is the rewritten row that comes before the tool call.
  The cause is **inferred**: the request of turn 1 may have carried the original text of that row, and the stored row differs.
  I did not capture the request bodies.
- One run for each arm, so the figures show the direction and not a measure.
  A rewrite that is stable for each row (the same text in the request and in storage) was not tested.

## 2.32 Classic `PostToolUse` hook in a subagent (done)

The plugin has `agents/probe.md` (tools `Read`, model `haiku`, `maxTurns: 4`) and a command hook on `Read` that logs stdin and returns `additionalContext`.
The main session spawned `p231:probe` to read one file.

- The hook ran inside the subagent.
  `posttooluse.log` has one line, for the subagent `Read`, and none for the main session.
- Fields of the hook input: `session_id`, `transcript_path`, `cwd`, `prompt_id`, `permission_mode` (`default`), `agent_id` (`a9fc0133ce76b89d3`), `agent_type` (`p231:probe`), `hook_event_name`, `tool_name`, `tool_input`, `tool_response`, `tool_use_id`, `duration_ms`.
- `transcript_path` is the path of the main session `.jsonl`, not of the subagent.
  The subagent transcript is `<session>/subagents/agent-<agent_id>.jsonl` with `agent-<agent_id>.meta.json`.
- The subagent transcript has `hook_success` (stdout with the JSON) and `hook_additional_context` attachments with the text `Probe marker: say the word ZEBRA in your report.`.
  They come right after the `Read` tool result and before the next assistant row.
  So the `additionalContext` reached the subagent conversation as a stored attachment.
  That it is in the next request is **inferred** from the order of the rows and from the main-session run below.
- The report of the subagent did not say ZEBRA.
  Haiku ignored the marker, so a marker is context and not an order.
- In an earlier 2.31 run the main session `Read` hook output did reach the model: the control answer had `ZEBRA` in it.
  In the later runs it did not say it again.
- The subagent model was `claude-haiku-4-5-20251001`, so `CLAUDE_CODE_SUBAGENT_MODEL` of the profile did not override the agent file.
  This was seen only in this one run.
- A `session.append` hook in the same module saw the subagent rows (calls 5 to 8) with `agentId: a9fc0133ce76b89d3`.
  So a module can tell a subagent row from a main row.

Scratch plugin, scripts, and logs: `/tmp/claude-501/p229/` (`plugin/`, `run.sh`, `a.sh`, `logs/<run>.{json,debug,hook.jsonl}`, `sbx/project/`).
The hook is a classic command hook on `Write|Edit|Bash`.
It splits after a `.`, `!`, or `?` and a space, before a capital, onto a new line in `content` (`.md` paths), `new_string` (`.md` paths), and the `command` of `gh pr create` / `git commit`.
It prints only `hookSpecificOutput.updatedInput` and sets no `permissionDecision` and no `additionalContext`.
The model was `claude-sonnet-5-5`, run through `tools/sandbox.mjs` with `-p --output-format json`.
`gh` was a stub on PATH that logs to `logs/*.gh` and creates nothing.
The repository was not changed.

## 2.29 Later Edit after a rewrite (done)

Each run was two steps in one session (`--resume <session_id>`, `acceptEdits`).
Step 1: Write a 5-sentence, one-line paragraph to a `.md` file.
The hook rewrote it to 5 lines in every run (`logs/a<N>w.hook.jsonl`).
Step 2: ask the model to Edit, with no Read first.

| Run | Edit `old_string` | Result | Hook ran on Edit |
| --- | --- | --- | --- |
| 1, 2, 3 | one phrase inside one sentence | Edit succeeded | yes |
| 4, 5 | two fused sentences (as the model wrote them) | Edit failed, file unchanged | no (no hook log) |
| 6, 7 | two fused sentences, model free to Read | first Edit failed, model Read the file, saw the lines, retried with `\n` | yes (on the retry) |

- An `old_string` inside one sentence never failed (3 of 3).
- An `old_string` that crosses a sentence end failed on the first try in 4 of 4 runs.
  The model reads its own `Write` text from context, so it uses the fused form.
- The exact tool error text is not in the logs (the JSON result holds only the model paraphrase "isn't in the file").
  So the "String to replace not found" wording is **inferred**.
- The Edit hook did not run for a failed Edit (no hook log in runs 4 and 5).
  So Edit validation runs before `PreToolUse` (**inferred** from the missing log).
- After a failure the model did one of two things.
  With my prompt "do not Read first" (runs 4, 5) it stopped and asked the user, and it blamed an outside change ("you, another session, or a hook").
  Without that limit (runs 6, 7) it did a Read, matched the line breaks, and succeeded in 4 turns.
  It then told the user the file is now one sentence per line, and offered to restore one line.
- The "File has been modified since read" failure did not appear.
  The hook acts before the write, so the stored file and the Read state agree.
- Verdict: the rewrite is safe for edits inside one sentence.
  A cross-sentence `old_string` costs one failed call and one Read.
  The 4 and 5 runs show the no-Read case ends with a question to the user.
  The hook needs a recovery path or a note in the output style (**inferred**, not run: an Edit hook that splits `old_string` the same way, when it does not match the file but its split form does).

## 2.30 `updatedInput` and the permission flow (done)

Settings from `sbx/config/settings.json`: no `defaultMode`, `allow` has no `Write`/`Edit`, `ask` has `Bash(gh pr create *)`, sandbox is on with `gh *` excluded.
No rule was added.
Modes: `default` and `auto` (from `claude --help` choices).
`acceptEdits` runs in 2.29 are a third mode.

| Tool | Mode | Hook rewrote | Permission flow seen | Ran |
| --- | --- | --- | --- | --- |
| Write `.md` | default | yes | denied in `-p`, `permission_denials[0].tool_input.content` holds the REWRITTEN text | no |
| Write `.md` | auto | yes | no denial, file has 3 lines | yes |
| Write `.md` | acceptEdits | yes | no denial | yes |
| Edit `.md` | default | yes | denied, `tool_input.new_string` holds the REWRITTEN text | no (file unchanged) |
| Edit `.md` | auto | yes | no denial, file has 3 new lines | yes |
| Bash `gh pr create` (quoted heredoc) | default | yes | denied (`ask` rule), `tool_input.command` holds the REWRITTEN heredoc | no (no `.gh` log) |
| Bash `gh pr create` (quoted heredoc) | auto | yes | denied, rewritten command shown | no (no `.gh` log) |

- With no `permissionDecision`, the rewritten input goes through the normal flow.
  The ask is evaluated on the rewritten input, and the denial record shows the rewritten input.
- In auto mode the Write and Edit passed with no denial.
  I did not see whether a classifier approved them or whether auto mode needs no prompt for a file in the project.
  So "auto mode asks for a write" is not shown, only that the rewrite applies there.
- The `ask` rule for `gh pr create *` held in auto mode, and the stub `gh` never ran.
  The match used the rewritten command, and the same prefix also matches the original (**inferred**: I did not run a rule that matches only one form).
- I ran each cell once.
  Hook logs: `logs/b_<w|e|b>_<default|auto>.hook.jsonl` hold the `in` and `out` of the hook.

## Outside the brief

- The debug file has no line that quotes the Edit error, so the exact text needs a run with a capture of the tool result.
- A hook that splits `old_string` too would fix the cross-sentence failure but can make a valid match fail on a file written before the hook.

## 2.29 follow-up: repair of a cross-sentence `old_string` (done)

Question of the user: can a hook repair an `Edit` whose `old_string` spans two sentences after a split write, at no token cost?
Scratch plugins: `/tmp/claude-501/p229b/` (classic hook) and `/tmp/claude-501/p229c/` (mod), each with the split `Write` hook of 2.29.
Each run writes a 4-sentence line to `notes.md`, then resumes and asks for one `Edit` of `Beta is second. Gamma is third.` with no `Read`.
Model: `claude-sonnet-5-5`, mode `acceptEdits`.

| Route | Runs | Edit result | Hook call logged |
| --- | ---: | --- | --- |
| Classic `PreToolUse` on `Edit`, log only | 1 | failed, `String to replace not found in file.` | no |
| Classic `PreToolUse` on `Edit`, split `old_string` | 1 | failed, same text | no |
| Control: classic hook, `old_string` that matches | 1 | succeeded | yes |
| Mod `tool.call` on `Edit`, split `old_string` | 3 | succeeded in 3 of 3 | yes, `rewrote: true` |

- Claude Code checks `old_string` before the classic `PreToolUse` hook, so a classic hook cannot repair it.
- The mod `tool.call` handler runs before that check.
  It reads the file with `$.fs.read`, and when the `old_string` is missing but its split form is in the file, it splits `old_string` and `new_string` and calls `next`.
- The input keys of `e` are flat: `replace_all`, `file_path`, `old_string`, `new_string`, `tool`, `tool_use_id`.
- The repair costs no model token and adds no prompt text.
  It changes nothing when the original `old_string` matches, so a file written before the hook keeps its normal match.
- `claude plugin validate` passes with the warning `gating hook without .catch: tool.call{tool=Edit}`.
