# Probe results of task group 2, part 2

The results of tasks 2.1 to 2.10 are in [probes.md](probes.md).

## 2.16 Cost of a model or effort switch on the prompt cache (done)

Task: Sonnet 5.5 reads six files one at a time (7 requests, step 0 to 6).
The `turn.step` hook switches from step 3 on.
Figures are from the transcript usage records (`cache_creation_input_tokens` / `cache_read_input_tokens`), runs `CACHE0` (control), `CACHE1` (effort switch), `CACHE2` (model switch).

| Step | Control | Effort `medium` to `high` at 3 | Model Sonnet to Opus at 3 |
| --- | --- | --- | --- |
| 0 | 7195 / 7027 | 7194 / 7027 | 7195 / 7027 |
| 2 | 2616 / 16838 | 2616 / 16837 | 2616 / 16838 |
| 3 | 2616 / 19454 | 2616 / 19453 | **22070 / 0** (Opus) |
| 4 | 2616 / 22070 | 2616 / 22069 | 2616 / 22070 |
| 5 | 2659 / 24686 | 2659 / 24685 | 2659 / 24686 |

- Effort switch: no cache cost. The request after the switch reads 19453 tokens, the control reads 19454.
  So `output_config.effort` is not part of the cache prefix on Sonnet 5.5.
- Model switch: the first request on the new model reads 0 and writes 22070 tokens, which is the whole prefix.
  The cache is per model, so the cost is one full rebuild: 22070 tokens at the write price, in place of 19454 at the read price plus 2616 written.
  From the next step the new model reads its own cache again (22070 at step 4).
- The Opus cache was cold for this prefix, and read 0 even for the system and tool part.
  A prefix that is already warm for the new model would read from it, but the router cannot count on that.
- The step input kept `in=claude-sonnet-5-5/medium` on each step, so the hook must set the switch on every step after the first one, as in 2.4.
- Switch rule proposed for D13: set effort at any step with no cache rule.
  Switch the main-loop model only when the saving pays back one rebuild of the prefix, which means at the first step of a turn after the prompt changed anyway, or when at least about 10 steps of cheaper work are ahead.
  Never switch back and forth inside one turn, because each switch costs one rebuild.
- Status: done for Sonnet 5.5 and Opus 5.5 (one run each). Not measured: Haiku 5.5 as target, and the price of a rebuild in money.

## 2.21 with the unix-socket keys

- With `sandbox.network.allowUnixSockets: ["/tmp/claude-501"]` in the agent session, the `srt-mux` socket error is gone.
- The Bash call in the sandbox session then fails with `sandbox-exec: sandbox_apply: Operation not permitted`.
  macOS does not let a process in a Seatbelt sandbox apply a second Seatbelt profile.
- So a sandbox session that runs Bash must start outside the agent sandbox: the user runs it with the `!` prefix or in a terminal.
  Tasks 2.11 and 14.3 use this route.

## 2.2 Guard fallbacks (done)

Probe: `probe23`, a user-tier module with a `prompt.section` word (`KESTREL-23`) and a `tool.check` that returns `allow` for a Read of `secret.txt`, and a project deny rule `Read(./secret.txt)`.
Logs: `$TMPDIR/sbx-23-target.log`, `sbx-23-usersetting.log`, `sbx-23-guardoff.log`.

- `target.json`: `hooks module cc-plugin-sec-default@builtin loaded (native, environment 2, tier prepend)`, and `probe23: prompt.section bypassed by cc-plugin-sec-default (tier user)`.
  The model did not see the probe word.
- `target.json` with `enabledPlugins["cc-plugin-sec-default@builtin"]: false` in user settings: the guard still loads at tier `prepend`, and `plugin.register: probe23 ... judged by cc-plugin-sec-default`.
  So the key in user settings is ignored.
- `guard-off.json` (managed `enabledPlugins` sets the guard to `false`, no `prependPlugins`): no `loaded` line for the guard, and `plugin.register: probe23 ... judged by core alone`.
  The log still says `cc-plugin-sec-default@builtin seated outermost: this machine has managed settings`, but no module of it runs.
  The probe word reached the request, and the model quoted `KESTREL-23`.
  dotclaude still loads at tier `prepend` from `extraKnownMarketplaces`, with no `prependPlugins` entry.
- In each run the model did not call Read on `secret.txt`, because it saw the deny rule, so the `tool.check` path was not exercised here (task 2.3 forces the call).

## 2.12 Listing cost of a skill form (done, and D5 must change)

Probe: user skills in an `--add-dir` folder, one at a time, with `skillOverrides` in the sandbox settings.
The skill has a 190-character description.
Evidence is the first request of each headless run: input plus cache tokens in the transcript, and the listing text in the capture (`messages[1]`, "The following skills are available").
A run without a skill is the base: 14,604 tokens.
Two base runs differ by 1 token, so the noise is about 4 tokens.

| Form | Tokens over base | Listing line |
| --- | ---: | --- |
| plain skill | +61 | `- name: description` |
| `skillOverrides` `name-only` | +17 | `- name` |
| `disable-model-invocation: true` | +6 (noise) | none |
| `skillOverrides` `off` | -4 (noise) | none |
| `.claude/commands/` file | +65 | `- name: description`, same as a skill |

- A plugin `commands/` file is listed like a skill, with its full description.
  A command costs the same as a plain skill.
- A skill with `disable-model-invocation: true` is not in the listing, so its cost is 0.
- **`skillOverrides` does not apply to a plugin skill.**
  A plugin skill with the key `zq-nameonly`, the key `zqprobe:zq-nameonly`, and the value `name-only` or `off` stayed listed in full in three runs.
  The same keys worked for user skills in the same runs.
  The bundle explains it: `BR(e)` returns `"on"` when `e.source === "plugin"`.
- So a plugin skill has two forms only: full listing line (about 60 tokens for 190 characters), or `disable-model-invocation: true` (0 tokens, and the model cannot invoke it).
  Design D5 says that the model-invocable skills of the plugin are `name-only` in `skillOverrides`.
  That cannot work for a plugin skill, so D5 changes.
  The listing cost of a model-invocable plugin skill is the length of its description.
  Keep that description short.
- Not tested: the `/context` view (headless `/context` was not needed, the request body is the source).

## 2.13 Off switches for `anthropic-skills:*`, `computer-use`, and the Task tools (done, with one open item)

Synced skill key form (bundle evidence, not run, because the sandbox has no synced skill):

- The schema is a map from skill name to `on`, `name-only`, `user-invocable-only`, or `off`.
  The lookup is by exact name, so there is no wildcard form for `anthropic-skills:*`.
- A synced skill has the name `anthropic-skills:<n>` and the bare name `<n>`.
  The code looks up the full name first, then the bare name (`MZ`, `YIe`).
  The bare name is reserved, and does not work, when a local or plugin skill has the same name.
  So the safe key is `anthropic-skills:<n>`.
- Open: a live check needs an account with synced skills.
  The way to stop the sync is `syncClaudeAiSkills: false`, which the schema describes.

`computer-use`:

- It is opt-in.
  `Mo(name)` for `computer-use` is true (off) unless the project config key `enabledMcpServers` holds `computer-use`.
  Other servers are on unless `disabledMcpServers` holds them.
- In 7 sandbox runs on 2.1.293, no `computer-use` tool or server was in the request.
  So the default needs no off switch.
- Documented levers: do not put `computer-use` in `enabledMcpServers` (`/mcp` writes it), add `mcp__computer-use` to `permissions.deny`, and for a fixed rule the managed `deniedMcpServers` (schema text: "Enterprise denylist of MCP servers").
  Not run: the `deny` rule and `deniedMcpServers` on a server that is on, because the server needs the `cu-desktop` binary.
- So task 6.6 needs no `computer-use` key.
  A `deniedMcpServers` entry is a guard if a user enables it.

Task tools:

- In a headless run, only `TaskStop` is in the deferred list.
  `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` appear only in an interactive session, or with `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` (bundle `YW()`).
- With that variable, the deferred list has `TaskCreate TaskGet TaskList TaskStop TaskUpdate`.
  With `permissions.deny` of those five names and `TodoWrite`, the list has none of them.
  Total input of the first request: 14,591 tokens without the deny and 14,560 with it, a saving of 31 tokens.
- The Task tools are deferred, so they cost only their names until the model loads one.
  A deny rule is a small saving of about 30 tokens, and it removes the model's task list.
  The CLAUDE.md `TodoWrite` rule in `off-switches.md` stays: do not set `CLAUDE_CODE_ENABLE_TASKS=0`.
- The hook tier line (`tier prepend`) was not logged for these runs, because they had no debug file.
  The base runs of the same session agree within 4 tokens, so the drop-in state did not change between them.

## 2.17 What `maxTurns` counts (done, 64 to 66 requests still open)

Probe: `zqprobe:zq-agent`, Haiku 5.5, tools `Read`, `maxTurns: 3`, 12 small files.
Both runs logged `hooks module dotclaude@dotclaude loaded (... tier prepend)`.

- Sequential reads, one Read per turn: the subagent transcript has 3 unique `message.id` values (3 requests), 3 `Read` calls, and no fourth request.
  The parent got "no report", because the subagent was cut before it called `SubagentHandback`.
- Parallel reads: turn 1 has 6 parallel `Read` calls, turn 2 has 6 more, and turn 3 has the text and `SubagentHandback`.
  That is 3 requests, 12 reads, and a finished run.
- So one turn is one model request, and parallel tool calls in it count once.
  The run stops before the request that would be number `maxTurns + 1`.
  The handback call needs a turn of its own, so a run that does work in every turn gets no report at the limit.
  Set `maxTurns` with at least one spare turn for the handback.
- Bundle: the loop compares `turnCount + 1` with the limit after each tool round, then adds a `max_turns_reached` attachment.
- Open: why the earlier investigator runs made 64 to 66 requests at `maxTurns: 60`.
  The probe agent made exactly the limit, so the unit is not the cause.
  The likely causes are a Stop-hook block (it adds a turn at the same check) or requests that the count does not include, such as a retry.
  A check needs the transcript of one of those runs and its hooks.

## 2.18 Cache of subagent starts (done)

Probe: the same agent type, a prompt of one line, Haiku 5.5.
The figures are `cache_read_input_tokens` and `cache_creation_input_tokens` of the first request of each subagent.
Each run logged `tier prepend`.

| Case | Start 1 (read / created) | Start 2 (read / created) | Gap |
| --- | ---: | ---: | ---: |
| cold (no run in 5 minutes) | 0 / 2,315 | not run | |
| sequential, prompts alike, warm | 1,561 / 672 | 2,233 / 0 | 3.0 s |
| parallel, prompts differ, warm | 1,561 / 677 | 1,561 / 676 | 0.003 s |
| parallel, prompts alike, new text | 1,561 / 682 | 1,561 / 682 | 0.6 s |
| staggered, prompts alike, new text | 1,561 / 682 | 2,243 / 0 | 6.2 s |
| staggered, prompts differ | 1,561 / 676 | 1,561 / 677 | 2.8 s |

- A cold start of this agent creates 2,315 tokens and reads none.
  A warm start reads a shared prefix of 1,561 tokens (the tools and the static system block).
  The rest (about 676 tokens: the dynamic system blocks and the prompt) is new for each start.
- A start reads the part after the prefix only when an earlier request wrote the same text.
  Then the whole 2,233 or 2,243 tokens are read.
- Two parallel spawns do not share that part: both create it (682 tokens each, 0.6 s apart).
  A gap of 6.2 s, with the first request finished, did share it, but only for alike prompts.
  A prompt that differs by one word breaks the sharing at 2.8 s.
- The window between 0.6 s and 6.2 s is not found, and a delay cannot help when the prompts differ.
  A delay only helps a spawn that repeats the same prompt, which is rare.
- For design: the saving to plan for is the shared 1,561-token prefix (tools and static block), and it holds only within the cache time.
  Keep the agent prefix identical across agent types if sharing across types matters, because the prefix includes the tool list.
- The earlier figure of 28 of 31 starts with 0 read (`subagent-usage.md`) matches a cold start.
  This probe adds that a start within 5 minutes of a same-type start reads the shared prefix.
  The investigator prefix is larger than this probe prefix (8.3K to 17.2K created), so the figures do not scale to it.

## 2.9 `prompt.attachment` with `{text:null}` (done)

Probe: a user-tier module (`--plugin-dir`, id `<name>@inline`) with one `prompt.attachment` handler.
It logged `type` and text length of each attachment, and returned `{text:null}` for `sandbox_instructions`, `auto_mode`, `skill_listing`, `agent_listing_delta`, `environment`, and `session_context`.
Run: headless sandbox session, Haiku 5.5, prompt "Reply with the single word OK", dotclaude at tier `prepend` with the guard seated (debug log lines checked on the runs with `--debug-file`).
The handler ran under the seated guard, because `prompt.attachment` is not on the guard list.
Evidence: the two saved requests (baseline `request-...-79.json`, cut `request-...-240.json`) and `count_tokens` through `tools/capture.mjs --count`.

Types seen in the baseline run, with chars: `hook_success` 1184, `sandbox_instructions` 6246, `environment` 708, `model` 126, `output_style_instructions` 4353, `deferred_tools_delta` 1050, `agent_listing_delta` 1998, `skill_listing` 1281, `session_context` 518.
A later run added `date` 27 and `remote_session_change` 543.
`auto_mode` did not appear in any run, also not with `--permission-mode auto` in `-p`.
So the `auto_mode` cut is untested (179 tokens in the interactive auto-mode capture of `capture.md`).

| Type | Left the request | Saving (tokens) |
| --- | --- | ---: |
| `sandbox_instructions` | yes | 2,650 |
| `agent_listing_delta` | yes | 728 |
| `skill_listing` | yes | 473 (1,281 chars, 9 skills of the sandbox) |
| `environment` | yes | 294 |
| `session_context` | yes (the `gitStatus` user block) | 167 |
| `auto_mode` | absent in baseline | untested |

- Full request: 14,693 tokens before, 10,450 after, so the five cuts saved 4,243 (41,863 to 30,809 chars).
- The per-part figures are from the `count_tokens` report of the baseline request, by section.
  The sum of the five is 4,312, and the 69 gap is wrapper text that the cut also removed or the count rounded.
- The engine rebuilds the `role: "system"` attachment message without the nulled types.
  The `hook_success`, `model`, `output_style_instructions`, `deferred_tools_delta`, and MCP-failure texts stayed.
- The log of the cut run lacked the last two types, because the log writes raced.
  The request shows both gone.
- Hazard: `SURF`-style code words in the prompt also appear in the proxy files of other agents.
  Pick the request by model, tool count, and first user message.

## 2.19 `tool.describe` with `isDeferred: true` (done for the loaded built-ins of a `-p` session)

Probe: a `tool.describe` handler returned `{...r, isDeferred: true}` for the tools named in a control file, one run per tool, then a batch.
Loaded built-ins in the `-p` sandbox session: `Bash`, `Agent`, `Skill`, `Read`, `ToolSearch`, `ListAgents`, `Edit`, `Write`.
`AskUserQuestion` is not offered in `-p` (the handler never saw it, also with `--tools "default,AskUserQuestion"`).
So its saving comes from the interactive capture of `capture.md`.
Natively deferred in the same session: `CronCreate`, `CronDelete`, `CronList`, `DesignSync`, `EnterWorktree`, `ExitWorktree`, `Monitor`, `NotebookEdit`, `PushNotification`, `RemoteTrigger`, `SendMessage`, `TaskStop`, `WebFetch`, `WebSearch`.
Evidence: the `tools` array of each saved request, and `count_tokens` of the baseline, the `Skill` run, and the `ToolSearch` run.

| Tool | Engine defers it | Saving (tokens) |
| --- | --- | ---: |
| `Bash` | yes, removed from `tools` | 1,456 |
| `Agent` | yes | 1,209 |
| `Skill` | yes (count 14,693 to 14,070, exact) | 623 |
| `Read` | yes | 608 |
| `ToolSearch` | sent with `defer_loading: true`, counted 0 (14,693 to 14,159) | 535 |
| `ListAgents` | yes | 405 |
| `Edit` | yes | 348 |
| `Write` | yes | 236 |
| `AskUserQuestion` | not testable in `-p` | 1,682 (interactive capture, not re-measured) |

- Batch of seven (all but `ToolSearch`): the request had `ToolSearch` and the placeholder only, so the saving is about 4,885 tokens, the sum of the seven rows.
  The model then called `ToolSearch` with `select:Read` and next `Read`, so a deferred tool works at the cost of one extra request.
- The engine does not add a deferred built-in to the deferred-name list of the `deferred_tools_delta` text.
  The list still has the 14 native names only (the text was identical in the `Bash`, `ListAgents`, and `Write` runs).
  The model found `Read` by guessing the name, so a mod that defers a built-in should say its name in an own text or accept the guess.
- All tools deferred: the API refuses with `400 At least one tool must have defer_loading=false`.
  The `ALL` run failed with it.
  `count_tokens` gave the same 400 for the batch request, although the live batch run answered.
  Keep one tool loaded, and `Bash` or `Read` is the likely choice for the eval.
- `ToolSearch` deferred alone is accepted and shown with `defer_loading: true`, but a model that has the deferred names needs it.
  Treat it as kept loaded.
- Kept loaded: none by the engine, except that at least one must stay.

## 2.20 Custom `$.tool.register` tool against `AskUserQuestion` (open: built-in side not measurable in `-p`)

Probe: `session.start` calls `$.tool.register({name:"ask", description, inputSchema})`, a `tool.call` hook on `mcp__pk__ask` returns `{result:"blue"}`, and `tool.describe` defers `AskUserQuestion`.
The custom tool is `mcp__pk__ask`, with a 1-sentence description and a schema of `question` and `options`.
Evidence: saved requests of the `-p` runs and `count_tokens` of each.

| Variant | Tokens in the request | Note |
| --- | ---: | --- |
| baseline (no probe tool) | 14,693 | no `AskUserQuestion` in `-p` |
| `ask` registered, default placement | 14,783 | `isDeferred` is true by default: only the name (+10 tokens) joins the deferred list |
| `ask` registered with `isDeferred: false` | 14,889 | the tool entry costs 120 tokens (277 chars) |
| built-in `AskUserQuestion` | 1,682 | interactive capture of `capture.md`, loaded |

- The model called the custom tool in both runs.
  Deferred: `ToolSearch` with `select:mcp__pk__ask`, then the call (2 extra requests).
  Loaded: the call at once.
  Both answered "blue" from the hook.
- A registered tool is deferred when `isDeferred` is left out, so a small tool costs a name only.
- The saving against the built-in is about 1,560 tokens loaded (1,682 less 120) and about 1,670 deferred, so it passes the 1,000-token bound.
  This rests on the 1,682 figure of an interactive session, which this `-p` probe could not repeat.
- Not tested: that the custom tool gives the user a dialog.
  The built-in draws its own UI, and a `tool.call` result string has none, so the custom tool needs `$.ui.ask` or a similar call to reach the user.
  The `d.ts` documents an `AskUserQuestion` dialog call (`index.d.ts` near line 2406), which the next probe should use.
- Open: re-run in an interactive session (a pty run or the user's terminal) with `AskUserQuestion` loaded, once with the built-in and once with `ask` plus the deferral, and count both.
- Keep the custom tool for the eval: yes on size, with the dialog gap as the condition.

## 2.3 Guard options from managed settings

Probe and deny rule as in 2.2. The prompt asks the model to call Read on `secret.txt` once.

- `mods-only.json` (`allowManagedModsOnly: true`), log `$TMPDIR/sbx-23-modsonly.log`:
  `plugin.register: probe23 (user, probe23@inline), judged by cc-plugin-sec-default: refused ... (allowManagedModsOnly)`.
  `dotclaude-jev` and `dotclaude-modder` are refused the same way, and `dotclaude (prepend)` is admitted.
  The probe word did not reach the request, and the Read was denied by the rule.
- `override-deny.json` (`allowModsToOverrideDenyRules: true`), logs `sbx-23-override*.log`:
  a path deny (`Read(./secret.txt)`) is enforced in the input check of Read ("Read tool validation error"), before `tool.check`, so no mod can override it.
  A whole-tool deny (`WebFetch`) removes the tool from the session, so no call reaches `tool.check`.
  A content deny (`WebFetch(domain:example.com)`) reaches `tool.check`, and the log says `tool.check WebFetch ...: deny -> allow by plugins dotclaude, cc-plugin-sec-default, probe23: probe23 approves WebFetch`.
- Control with `target.json` restored and the same content deny, log `sbx-23-control.log`: `WebFetch tool permission denied`, and the model got "WebFetch denied access to domain:example.com."
  So the user-mod `allow` beats a deny rule only with `allowModsToOverrideDenyRules: true`.
- 2.3 is done.

## No managed settings (question of the user after 2.3)

Both managed files moved aside by the user, fresh sandbox `$TMPDIR/sbx-nomanaged`, log `sbx-23-nomanaged.log`.

- `cc-plugin-sec-default@builtin not seated: no managed settings and not a Team or Enterprise organization (none)`.
- dotclaude loads from `--plugin-dir` at tier `user` (`dotclaude@inline`), because no managed key locks its name.
- The user-tier `prompt.section` hooks of dotclaude and of `probe23` both reach the request: captured requests 553 to 555 have "Compaction is off" and `KESTREL-23`.
- With no guard, a user mod turns a deny rule into an allow: `tool.check WebFetch ...: deny -> allow by plugins dotclaude, probe23: probe23 approves WebFetch`.
  So without managed settings, each installed mod with a `tool.check` hook can override the deny rules of the profile.
- The run asked for `--model claude-haiku-5-5`, but requests 553 to 555 went to `claude-sonnet-5-5` (cause not checked).

More results: [probes-3.md](probes-3.md).
