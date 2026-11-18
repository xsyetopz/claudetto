# tools

## Tools And Output

- [ ] **CTX-172** Monitor costs 8 chars in the deferred list; loaded through ToolSearch it is the largest tool: description 6,354 plus schema 1,040 chars (about 2.7k tokens). Workflow 3,480 plus 1,775, ScheduleWakeup 3,396 plus 1,392, Agent 3,227 plus 1,942.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1995.

- [ ] **CTX-173** A `tool.describe` hook replaces Monitor's description (6,354 to 14 chars) and not its schema (1,040 stays). Correction: the "Tool descriptions: No" row of the `prompts/other/override` table is out of date.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1999.

- [ ] **CTX-174** On `--resume` the request takes its system prompt from the last `prompt_snapshot` attachment in the transcript (a hand edit reaches the model: 8,363 equals 8,350 plus 13). Tool descriptions in the snapshot do not (live text is used). A `prompt_render_point` after the snapshot (cause `set_model_system_prompt`) makes a fresh render. The gate is off when `CLAUDE_CODE_SIMPLE` is set or `systemPromptSnapshot` is false. A system-prompt Mod change reaches an old session only after a render point.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2008.

- [ ] **CTX-175** Deny `Monitor` removes the built-in from the tool and deferred lists and leaves a Mod-registered `monitor` callable as `mcp__<plugin>__monitor` (it answered "MONRESULT-PROBE echo hi"), with no name collision.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2066.

- [ ] **CTX-176** Stream-json and `-p` probes found no Mod that removes a tool. `dis1` (`tool.describe` `isDeferred` plus extra fields) sends 10 tools (21,763 bytes) against 12 (29,295); a null answer is skipped; ToolSearch still loads all. `dis2` (`permissions.deny` of eight tools) sends 9 (16,877) and ToolSearch finds none. EnterPlanMode and ExitPlanMode are not in the `-p` tool set. Emptying a deferred tool's text still saves 7,532 bytes.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2608.

- [ ] **CTX-177** A Mod `settings.read` hook that adds `permissions.deny` (Workflow, ScheduleWakeup, ReportFindings, Cron*, EnterPlanMode, ExitPlanMode) does not remove the tools in claude 2.1.318: permission rules do not come from the hooked merge (the engine raised only 2 merged reads). `permissions.deny` in a settings file written by `claudetto:setup` stays the only removal route. The same hook route works for `skillOverrides` (6,183 to 493 bytes, no `command.run` or Skill guard needed).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2926.

- [ ] **CTX-178** Remove routes rm0-rm11 for bundled skills: stock 13 skills 6,183 bytes. `disableBundledSkills` true leaves 1 skill (`plugin-authoring`) 347 bytes. Deny `Agent(<each of 6 types>)` leaves the Agent tool sent (3,227). Mod `command.describe` `isHidden`, `disableModelInvocation`, `permissions.deny` `Skill(dataviz)`, and a project `SKILL.md` do not remove a bundled skill. `skillOverrides` (user-invocable-only, name-only, off) does: 10 skills 2,471 bytes; `/name` still works for user-invocable-only. The Mod has no skill listing switch.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2570.

- [ ] **CTX-179** `skillOverrides` removal checked for the 18 prompt skills in 36 runs: 18 of 18 `/<name> x` printed 'Skill "<name>" is disabled via skillOverrides' with 0 requests. 18 of 18 model Skill calls were refused: 11 with "disabled for model invocation in skillOverrides settings", 7 (batch, deep-research, debug, verify, insights, team-onboarding, run-skill-generator) with "cannot be used with Skill tool due to disable-model-invocation" (the stock flag fires first).
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3236.

- [ ] **CTX-180** 22 of 88 slash commands are type prompt. `batch` spawns research subagents and one general-purpose worktree agent per unit; `simplify` 4 agents; `security-review` parallel sub-tasks; `deep-research` a Workflow; `debug` suggests claude-code-guide; `code-review` says do NOT spawn subagents except at max level; `keybindings-help` refuses a user call.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2559.

- [ ] **CTX-181** A Mod tool on `$.ui.ask` answers in the TUI (`mcp__inv__ask` 256 bytes against stock AskUserQuestion 5,360 bytes). `tool.describe` `isDeferred` moves AskUserQuestion behind ToolSearch.
  Basis: measured, claude 2.1.318, probe a1.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2556.

- [ ] **CTX-182** `permissions.deny` removes AskUserQuestion (and EnterPlanMode, ExitPlanMode) from the request and ToolSearch in the TUI too, but then `ui.ask` fails because it is a `tool.call` of AskUserQuestion through every hook except the calling one ("no tool named AskUserQuestion"). Stock `-p` never offers AskUserQuestion.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2886.

- [ ] **CTX-183** `tool.describe` trims (stock to Mod bytes): Agent 5,246 to 2,498; Bash 3,715 to 2,657; Read 1,919 to 1,409; Edit 964 to 845; Write 639 to 594; EnterWorktree 4,034 to 1,309; ExitWorktree 2,526 to 895; SendMessage 5,698 to 2,294; Skill 1,803 to 622; TaskStop 810 to 520; WebFetch 1,101 to 909; WebSearch 882 to 761; NotebookEdit 1,644 to 1,306. All 20 schemas go from 53,780 to 39,418. ToolSearch loads the Mod text for deferred tools. `tool.register` cannot recreate these 13 (no worktree switch, task stop, server-side search, or notebook editor; an Agent rebuilt on `$.agent.spawn` loses fork, notices, and SendMessage resume).
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2660.

- [ ] **CTX-184** Deferral by Mod: `tool.describe` `isDeferred:true` moves Read out of the first request (11 tools, 29,295 to 27,376 bytes), but the engine does not add it to the "deferred tools are now available" list. `ToolSearch select:Read` loads it (`defer_loading:true`); Read called with no ToolSearch first still runs. Sent tools stock: Agent 5,246, Bash 3,715, Edit 964, ListAgents 1,151, Read 1,919, ReportFindings 2,177, ScheduleWakeup 4,886, Skill 1,803, ToolSearch 1,440, Workflow 5,355, Write 639.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2836.

- [ ] **CTX-185** Write and Edit "read first" guard ("File has not been read yet") fires only when the model is in `nLn`'s list of 4.x and older models (claude-opus-4-6, haiku-4-5, opus-4-5, opus-4-1, opus-4-0, sonnet-4-5, sonnet-4-0, 3.x) or the path is not allowed without a prompt. Both arms overwrote `a.txt` without Read. NotebookEdit always enforces it (errorCode 9). In the TUI ($0 probe): the guard is skipped when the file has no read state, is not `.ipynb`, the model is not in `nLn`'s list, and a Read decision is "allow" for the path. An unread Write or Edit inside the workdir after a "Do you want to overwrite" dialog succeeds; an unread Write outside the workdir fails "File has not been read yet. Read it first before writing to it." On 5.x models the guard binds only where Read is not auto-allowed and for `.ipynb`. The prompting case needs an interactive session to answer the dialog; `-p` has no dialog, so the TUI probe above is the evidence.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2711; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2712.

## Tools And Output

- [ ] **CTX-186** `taskOutputMaxChars` has no effect in 2.1.318 (schema: "Deprecated: no longer has any effect"). `bashOutputMaxChars` defaults to 30000 and is clamped 4000-128000, so the Gemini line that gives default 131072 and a working `taskOutputMaxChars` is wrong
  Basis: measured, binary.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:894; openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:29.

- [ ] **CTX-187** Bash output past the cap goes to a file and Claude gets a 2,000-char preview plus the path. The head-and-tail preview (1,500-char tail) is behind server gate `tengu_quiet_pike`, default false, so no setting turns it on and the model sees no tail (D5: the model reported a wrong last line). One 30000-line output costs 23,768 cache-write tokens against 8,168 at cap 4000, about 15,600 prompt tokens
  Basis: measured, haiku-5-5, one run each.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:902.

- [ ] **CTX-188** Over 22 transcripts of this repo (7,449 Bash results): characters p50 850, p90 4,494, p95 6,869, p99 13,291, max 26,105. 12% exceed 4,000, 1.4% exceed 12,000, none exceed 30,000. A 12000 cap keeps about 98.6% inline (near 4,350 tokens); 4000 would send 12% to a file and a second Read
  Basis: measured, this repo.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:925.

- [ ] **CTX-189** `respondToBashCommands` false (default true) adds the bash-stdout block to history and sends no request after a `!` command, saving a whole model request (cached prefix read plus reply). The output still rides every later request The 2.1.322 binary (read with strings) runs a "! " command through the Bash tool with userTypedShellDispatch, and shouldQuery follows respondToBashCommands (default true). So the Budget line's only carrier, prompt.submit, never rides a "! " command.
  Basis: read from the binary `processBashCommand`. read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:831; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:832; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:797.

- [ ] **CTX-190** `bashOutputMaxChars` 12000 and 4000 both gave a `<persisted-output>` notice with a 2,235-char preview on `seq 1 5000` (23.3 KB); the default kept 23,892 chars whole. The preview does not follow the cap
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1376.

## Tools And Output

- [ ] **CTX-191** `MAX_MCP_OUTPUT_TOKENS` order: the variable, then server flag `tengu_velvet_ibis.mcp_tool`, then 25,000. Over the limit the result is saved to the session tool-results folder as `mcp-<server>-<tool>-<ms>` and only a notice (about 1,293 chars) enters context; the cut at limit x 4 chars with "[OUTPUT TRUNCATED...]" runs only when `ENABLE_MCP_LARGE_OUTPUT_FILES` is false, with images or documents, or with no session files. The 10,000-token screen warning is display-only and fixed. Separate unchanged limits: 50,000 chars before a text result goes to a file, per-tool `_meta` `maxResultSizeChars` up to 500,000, error text over about 11,000 chars keeps first and last 5,000. Fake-API table: 30,000 and 45,000 chars kept whole by default, saved at 10000. User decision: 10000
  Basis: measured, fake API, read from binary.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1149.

## Tools And Output

- [ ] **CTX-192** `permissions.deny ["ScheduleWakeup"]` is -4,887 chars (-1,771 tok); `ReportFindings` -2,178; `ListAgents` -1,152; all three -8,217 (-2,977 tok). `--disallowedTools` gives the same bytes
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1620.

## Tools And Output

- [ ] **CTX-193** agent-browser can cost more tokens than Playwright MCP unless the agent passes `snapshot -i` (interactive elements only). The maintainer gives this as the way to cut context sharply. One commenter reports 88% token efficiency against native Playwright.
  Basis: reported (maintainer claim); the 88% figure is reported with no stated basis.
  Source: external/2026-10-23/reddit.com-r-nextjs-comments-1qbz5sf-vercels-agentbrowser-an-alternativ-20261022T143652Z.md:37; external/2026-10-23/reddit.com-r-nextjs-comments-1qbz5sf-vercels-agentbrowser-an-alternativ-20261022T143652Z.md:51; external/2026-10-23/reddit.com-r-nextjs-comments-1qbz5sf-vercels-agentbrowser-an-alternativ-20261022T143652Z.md:59 (url: <https://www.reddit.com/r/nextjs/comments/1qbz5sf/vercels_agentbrowser_an_alternative_to/>).

- [ ] **CTX-194** Claude Code retries overloaded responses, timeouts, and dropped connections up to 10 times with backoff and shows a "Retrying in Ns · attempt x/y" spinner line. While retrying, check the status page and switch with /model, since capacity is tracked per model. With no retry line, suspect a stale connection: quit, then run `claude --continue`.
  Basis: reported by one commenter, not measured. On 2.1.327 the spinner strings are `will retry in N · check your network` for a stalled reply (chunk-wr3rwknv.js@17592) and `next try in N · attempt a/b` (chunk-wr3rwknv.js@18744, auto-mode check), not `Retrying in Ns · attempt x/y`; the count of 10 retries was not located, and `CLAUDE_CODE_MAX_RETRIES` is the env override (chunk-2ew0jg68.js@45599). The 2.1.326 release notes say the retry notice now reads "retrying…" during the next attempt and that `claude -p` now shows output while it retries an overloaded request.
  Source: <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes); external/2026-10-25/reddit.com-r-claudeai-comments-1x8fi7z-claude-code-getting-stuck-for-15-20261024T140704Z.md:79 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x8fi7z/claude_code_getting_stuck_for_15_minutes_with_no/>).

## Tools And Output

- [ ] **CTX-195** `TaskStop` of another task is not covered by the gate's owner check: Claude Code looks a task up in this session's task registry and otherwise answers "No task found with ID". The 2.1.326 binary holds that lookup and message (chunk-1vttvse2.js@45168 (2.1.327): `taskRegistry.get`, then name resolution, then the error); the message there also adds "Did you mean" and running-teammate hints. The task named the old module `chunk-kj840p5h.js@36960` with no binary version, and that module is not in 2.1.325. A path reached through `cd`, a variable, or a glob is compared as written (read).
  Basis: reported, task text.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:331; chunk-1vttvse2.js@44058, @44889 (claude 2.1.327 binary).

## Tools And Output

- [ ] **CTX-196** An agent's own background tasks are the running tasks whose id its own tool results print: `Bash` prints "Command running in background with ID: <id>", and `Monitor` prints "Monitor started (task <id>, ...". A synchronous subagent's background command ends at its final response (`backgroundEndsWithFinalResponse`) (read).
  Basis: reported, task text.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:407.

## Tools And Output

- [ ] **CTX-197** Task 18.42 probes of the folders each tool makes: pdm makes `.pdm-build`, Mix makes `_build` and `deps`, Flutter makes an `ephemeral` folder, Clojure makes `.cpcache`, LuaRocks makes `lua_modules`, vcpkg makes `vcpkg_installed` and `buildtrees`, sbt makes `target`, `project/target`, `.bsp`, and `.scala-build`, direnv makes `.direnv`. A `result` symlink from nix-build points into /nix/store and Bazel makes only symlinks into `~/Library/Caches/bazel`; the walk does not follow links, so neither has a rule, and the nix gcroot rule is the only one for them. Nix was not run (the install needs sudo and an APFS volume); its facts come from docs and source (measured, except Nix).
  Basis: measured, Nix from docs and source.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:399; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:401.

## Tools And Output

- [ ] **CTX-198** Task 18.5, 2.1.319, `claude-sonnet-5-5`, 60 sessions per arm (6 tasks x 10, two identical launches pooled): sessions that called `Read` with no offset on a file of 20,000 bytes or more were 2/60 (Wilson 0.009-0.114) for base and 50/60 (0.720-0.907) for the plugin. Such calls that landed were 2/60 against 22/60 [0.26, 0.49] (p < 0.0001); heavy-file tasks landed 2/40 against 9/40 (p = 0.0476); control tasks (files the guard does not name) 0/20 against 17/20 attempts and 0/20 against 13/20 landed. The guard worked (33 whole reads denied; every landed heavy read carried `limit` 50, 60 or 80). The prediction of fewer attempts with the plugin failed. Likely cause (hypothesis): the plugin denied Bash reads 62 times ("Use Read to read a file, not the shell"), which steered the model to `Read` (`Read` 132 calls against 14, Bash 79 against 86). Cost $5.41 against $1.19, 4.54M against 2.50M tokens, largest session 227,848 against 119,822 (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:305; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-5/README.md:24-40.

- [ ] **CTX-199** Task 18.6, 60 sessions per arm on the same tasks: output tokens base 21,897 (mean 364.9), plugin 62,980 (mean 1,049.7), plugin with `maxTestOutputChars` 0 50,738 (mean 845.6); Mann-Whitney p < 0.0001 for each pair (nocut against change p < 0.0001, permutation 0.0003). Bug fixed 60/60, 58/60, 50/60 (the nocut 50/60 not examined; base against change Fisher p = 0.4958). Input plus cache tokens 3.60M, 4.68M, 5.02M (change 7% less than nocut, untested); cost $2.04, $2.29, $2.29; cut markers 6/60, because the model often pipes `bun test` through `head` or `tail`. The prediction of fewer output tokens with the cut failed, and the cause of the extra output is unexamined (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:306; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-6/README.md:22-35.

- [ ] **CTX-200** Task 18.7, 8 cases x 4 rounds = 32 sessions per arm, with Read, Write, Skill and ListAgents deferred: change arm 24/32 against base 32/32 (Fisher p = 0.0048, $1.33 total). Read, Write and Skill reached 24/24 in both arms; 23 of 24 change sessions loaded the tool through ToolSearch first (the exception called Read after a Bash with no ToolSearch and it worked); no session replaced the tool with Bash. ListAgents reached 0/8 against 8/8 (p = 0.0002), because none of the 8 sessions made a call: the model never learned a deferred ListAgents exists and answered from context. With no agent running, "tool not needed" and "tool not found" look the same. Not measured: SendMessage, Workflow, ScheduleWakeup, ReportFindings, other models, interactive sessions (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:307; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-7/README.md:20-45.

- [ ] **CTX-201** Task 18.18, after ListAgents left `DEFERRED_TOOLS`: the change arm called it 8/8 (18.7: 0 calls) but reached 0/8 against base 8/8 (Fisher p = 0.0002), because the answer-first gate in `hooks/pin.ts` denied the call. Task 18.21 added `LOOKUPS` (ListAgents, Read, Grep, Glob), which pass on question turns, and reached 8/8 against 8/8; cost $0.39, then $0.26. The deferral hid the tool first, and then the gate denied it (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-18/README.md:1-30; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-21/README.md:6-25.

- [ ] **CTX-202** Compound Bash line "bun test ...; cat src/lib.ts": the plugin arm spent a denied `cat` plus a retry (4.07 turns, 5.00 calls, 1.00 denial per session, against base 3.07 turns). Fix `hooks/gate/read-split.ts`, a `tool.call` hook on Bash: for a line ending in "; cat <file>" (also `&&` or newline) it reads the file with `$.tool.call` Read through the same hooks and permission check, runs the rest of the line alone, and appends the Read text to the Bash result stdout. Run 1 put the text in context: turns 3.97 against 3.00, output 692.2 against 355.8 (1.95x), Stop blocks 0.43 per session. Run 2 (stdout, 60 sessions, 30 per arm, $2.61): turns 3.43 against 3.13 (1.096x), job-op calls 4.20 against 4.47 (0.94x), raw calls 3.07 against 3.13, denials 0.00, fixed 30/30 against 30/30, output 551.8 against 378.3 (1.46x, misses the 1.25x target), Stop blocks 0.33 per session, because 10 of 30 plugin sessions got the unseen block (918.9 output tokens, 4.30 turns) while the other 20 matched base (368.3, 3.00). Job-op counting: a Bash call counts once per `;`, `&&` or newline part, because raw calls reward packing a read into Bash and "test; cat" is two jobs under the user's Bash rule (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-23/README.md:3-38; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:324.

## Tools And Output

- [ ] **CTX-203** `CLAUDE_ENV_FILE` is sourced into each Bash shell (probe nice `10 9 9`); CPU: default 26-27M, `nice -n 10` 23.7M, `taskpolicy -c utility` 5.3M, `background` 0; `CARGO_BUILD_JOBS` and `GOMAXPROCS` default to all CPUs. 2.1.326: present (CLAUDE_ENV_FILE; binary string search).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:405; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:215.

- [ ] **CTX-204** Cache and token measures: first-request plugin cache-read share 72-77% against base 67%; plugin first request 7.57k against 16.55k tokens; cost-weighted input 17,270-18,760 against 25,415-25,773; first request 43,382 to 19,675 B.
  Basis: measured 2.1.319.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:830; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:869.

- [ ] **CTX-205** betterleaks 1.10.0: about 40 ms warm scan, 0.41 s on 5 MB; the defaults miss OAuth `oat01` tokens, a lone AWS secret key, a URL password and an `Authorization` bearer; config precedence is `-c`, then `BETTERLEAKS_CONFIG`/`GITLEAKS_CONFIG`, then inline `BETTERLEAKS_CONFIG_TOML`; there is no versioned Homebrew formula.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:89; openspec/specs/secret-matcher/spec.md:14.

- [ ] **CTX-206** Shellfirm port: 42/42 old-gate catches, 3/39 flags; 586 commands stricter, about 9 looser; of 1,122 upstream fixtures, 648 positives hit, 20 are Windows, 7 unparsable, 28 skipped.
  Basis: measured 2026-11-06.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:71; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:73; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:187.

- [ ] **CTX-207** CC subagent and mod facts: `tool.describe` events carry no thread; `engines["claude-code"]` gates install; `plugin validate` type-checks a TypeScript hooks module; the `tool.list` event exists; `subagentStatusLine` is removed (cited; in the 2.1.326 binary it is "deprecated in favor of mods and will stop working in a future release", so it is not removed there); plugin `settings.agent` is deprecated; 44 mod events; 33 classic events. 2.1.326: present (tool.list, tool.describe, `engines["claude-code"]`; binary string search); 2026-11-18 on 2.1.327: `engines` is a manifest field (chunk-ja5z738t.js@57798) and plugin diagnostics carry `engine-range-invalid` and `engine-range-exempt` ("an installed copy would not load here", chunk-dfwkett1.js@28092), which supports a load gate; the install-refusal path was not read. Mod event count is corrected: the 2.1.327 declarations list 159 events, 33 classic and 126 others (cc-inspect `surface` mod-api, counted by hand), not 44. `plugin validate` type-checks only modules named in hooks.json `modules`, and reports type errors as warnings (CTX-694).
  Basis: cited, observed.
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:27; openspec/changes/archive/2026-11-16-2-1-323/design.md:30; external/2026-11-16/reddit.com-r-claudecode-comments-1xvw576-claude-code-21323-experimental-20261114T144303Z.md:23 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvw576/claude_code_21323_experimental_code_mode_claude/>).

- [ ] **CTX-208** Mods (in-process hooks) arrived in 2.1.287; `claude plugin test` fires real hook events with no session, model or network.
  Basis: reported.
  Source: external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:84.

- [ ] **CTX-209** Opus 5.5 plan-level cost: users on Pro and Team report that they do not reach the weekly limit in 2-3 hour non-stop runs.
  Basis: reported.
  Source: external/export-Is Claude Pro actually worth $20 just for one month for heavy coding-.jsonl:28 (a Pro user: 2-3 hours non-stop without exhausting the 5-hour limit) and external/export-Holy shit, it refuses to eat usage.jsonl:34 (20x user, no weekly rise). The weekly limit on Pro and Team in 2-3 hour runs is corrected to these two reports; no Team report was located.

- [ ] **CTX-210** Agent-browser 0.39.1 reads 3 pages in 46.0k, 32.5k and 9.7k against raw HTML 392k, 248k and 318k bytes, in 0.7-3.4 s, and needs no sandbox (daemon socket); curl with an extractor gives 35.5k, 21.4k and 7.0k; an httpbin 403 gives an empty `cf-mitigated`, a challenge gives `cf-mitigated=challenge`.
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:88; openspec/changes/2-1-325-rearchitecture/tasks.md:21.

- [ ] **CTX-211** One page, one question, four routes (2026-11-17; page `github.com/anthropics/claude-code/releases/tag/v2.1.326`, question "what does it say about MCP"): raw HTML 210,462 bytes; a stdlib extract of the whole page 50,766 characters and of its `markdown-body` 47,387; `grep -n MCP` over the extract 21 lines in 2,946 bytes; claudetto `web_fetch` (registered tool) with `maxChars: 60000` put the whole page in context, about 12.2k tokens by Claude Code's own warning; agent-browser 0.39.1 `read` 51,270 bytes in 3.25 s with the site navigation kept; `@playwright/cli` 0.1.24 `open` 452 bytes (the 90,949-byte snapshot goes to `.playwright-cli/page-*.yml`), `snapshot` 91,252 bytes, `find "MCP"` 31 matches in 14,142 bytes, mostly repeated ancestor nodes.
  Basis: measured; token figures other than the warning are bytes (no API key for a token count; the warning gives about 4 characters per token on this page).
  Source: lead session `0342617c`, 2026-11-17 (commands `curl`, `agent-browser read`, `node_modules/.bin/playwright-cli open|snapshot|find`); the user's paste of the `web_fetch` warning at ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:15487.

- [ ] **CTX-212** Claude Code 2.1.327 caps an MCP tool result at 25,000 tokens (`MAX_MCP_OUTPUT_TOKENS`, else a server-side value, else 25000; `chunk-vxavegfm.js@768`), cuts text past the cap with a notice, and saves only cut images to a file; its "Large MCP response" line is a UI warning above 10,000 estimated tokens (`Ns=1e4`, `chunk-n9wersv3.js@45197`). A large Bash output is instead saved to a file with a 2 KB preview ("Output too large ... Full output saved to", `chunk-bwkc74bx.js@7110`). A claudetto tool registered through `$.tool.register` reaches the model as MCP (`mcp__claudetto__web_fetch`), so it gets the cap and no file.
  Basis: measured (code read, 2.1.326).
  Source: cc-inspect `search` on 2.1.326 at the offsets named; lead session `0342617c`, 2026-11-17.

- [ ] **CTX-213** agent-browser 0.39.1 cannot start inside Claude Code's Bash sandbox on macOS: `read <url>` printed "Daemon process exited during startup with no error output" (also with `--debug`); the same command outside the sandbox read the page. The auto-mode classifier first refused the unsandboxed retry ("[Unauthorized Access]"); the user called that a false alarm and approved the run.
  Basis: measured, 2026-11-17, sandboxed and unsandboxed runs of one command.
  Source: lead session `0342617c`, 2026-11-17; user approval at ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:15578.

- [ ] **CTX-214** verdict-cli (`tuandm/verdict-cli`, npm 0.1.1) is a persistent headless Chromium for UI verification, not page reading: ARIA snapshots with `@e` refs, `snapshot -i` (interactive only), `snapshot -D` (diff against the previous snapshot), `chain` for batched commands, encrypted auth profiles with a `handoff` to a shown window for SSO, MFA or CAPTCHA. Its README claims about 75 tokens per call against about 1,500 for Playwright MCP.
  Basis: reported (a user report from the field, kept as reported; the figure comes from the author's own account and plan, and a run needs the live API and a paid session).
  Source: <https://raw.githubusercontent.com/tuandm/verdict-cli/HEAD/README.md> (read 2026-11-17); suggested by the user at ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:15487.

## Tools And Output

- [ ] **CTX-215** `sleep` chains are blocked in a Bash call; the agent waits with `run_in_background` or an `until` loop with a timeout.
  Acceptance: a `sleep 240; cat file` call is refused; an `until` loop with a timeout runs. Verification: probe.
  Basis: measured on 2.1.327: a foreground Bash call `sleep 240; echo hi` returns `Blocked: sleep 240 followed by: echo hi. To wait for a condition, use Monitor with an until-loop ... use run_in_background: true` with errorCode 10 (cc-inspect cli, 2026-11-18); the check is in chunk-8vhagegy.js@113545 and runs only for a foreground call with no wall cap. The `until` loop half of the acceptance rests on that message text and was not run. Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (Ruled out: sleep chains for waiting); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (hono dev run took 1,369 s, including a `sleep 240; cat` poll); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (handoff, Ruled Out).

- [ ] **CTX-216** Claude Code 2.1.327 lists 97 tools with no MultiEdit (2.1.325 listed 95), and `Edit` takes one `old_string` per call.
  Acceptance: `cc-inspect surface tool` lists the tools of the installed build and none is named MultiEdit. Verification: probe.
  Basis: measured; re-measured on 2.1.327: `surface tool` lists 97 tool names and none is MultiEdit (cc-inspect surface, 2026-11-18). The 95 count was the 2.1.325 figure. Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:2433 (cc-inspect `surface tool` result in the handoff).

- [ ] **CTX-217** A `tool.describe` event carries only `tool`, `description`, `isDeferred` and `provider`, and its answer is cached per session until `$.ui.invalidate`, so one text serves every thread that sends the tool and a hook cannot answer the main thread and a subagent differently. Whether the engine sends a subagent the `Bash` schema at all was not run, since that needs a paid session.
  Basis: measured (read of `ToolDescribeInput` and the `tool.describe` doc in `.claude-plugin/types/claude-code/index.d.ts` lines 4494 to 4507 and 14482 to 14509; no model call).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:772.

- [ ] **CTX-218** Search exclusions and read size: `Grep` honors `.gitignore` and `.ignore` except for files its `glob` matches; `Glob` lists ignored and hidden files by default; a `Read` deny hides a path from both; `Read` refuses a file over 262,144 bytes or 25,000 tokens. The plan keeps setup's ignore blocks, corrects their stated scope, and makes no mod and no `CLAUDE_CODE_GLOB_NO_IGNORE` change.
  Basis: measured (named as probe 2.11 of `ISSUES-2026-11-04-1500.md`; the probe text was not read here).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/feature-map.md:61.

- [ ] **CTX-837** On 2.1.327 the Bash tool appends `< /dev/null` to a command unless the command holds a heredoc (`<<word`) or an input redirect; then the command inherits an open stdin. A program that reads stdin for want of a file argument (`wc -l` with an empty variable) blocks until the 120-second timeout moves it to the background.
  Acceptance: `timeout 8 wc -l` returns 0 at once alone, and exits 124 after 8 seconds when the same command also holds a `cat <<'E'` heredoc. Verification: probe.
  Basis: probed (Bash tool, claude 2.1.327, 2026-11-18); read (chunk-m14bt1pz.js@3706491: `$Rt` heredoc test, `Moo` and `Ooo`). Status: n/a (host behaviour).
  Source: chunk-m14bt1pz.js@3706491 (claude 2.1.327, cc-inspect `code search` "< /dev/null", 2026-11-18); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e/subagents/agent-ac34edb36528989f5.jsonl:24-26.

- [ ] **CTX-838** The project folders under `~/.claude/projects` begin with `-`, so a bare glob such as `ls */` or `ls -S */*.jsonl` there passes them to the program as options and fails ("unrecognized option"); a variable taken from that output is empty. With CTX-837 this left a subagent of this project waiting 122 seconds on `wc -l $f`.
  Acceptance: `cd ~/.claude/projects; ls */` fails with "unrecognized option"; `ls ./*/` lists. Verification: probe.
  Basis: probed (2026-11-18, reproduced by the main session as well). Status: n/a.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e/subagents/agent-ac34edb36528989f5.jsonl:24-26; probes in session ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl.

- [ ] **CTX-854** Code Mode pays off on tool fan-out with a small answer, mostly MCP calls, and not on file work. A public benchmark on 2.1.326 (6 tasks, 4 models, 2 runs per task and mode, 96 runs, auto mode, medium effort) measured these changes with Code Mode on:
  - Totalling 120 records fetched through MCP: 84-94% less conversation growth in all 8 pairs; 62-77% fewer tokens processed; 23-28% of the recorded cost; 20-41% of the time.
  - Reading and judging the same records: 65-83% less conversation growth.
  - File work (find broken links; change an API at 36 call sites): conversation growth rose in 14 of 16 pairs, and repeat runs differed by up to 216%. Recorded cost on Opus 5.5 was about equal ($0.33-0.39 on against $0.32-0.33 off for links; $0.26-0.36 against $0.28-0.35 for the API change). With Code Mode off, every model already wrote one script for the file tasks.
  - Every session started 13,055-13,106 tokens smaller. `/context` shows built-in tool definitions at 3.6k against 16.3k, and the deferred tool lists gone.
  - Inside a script the tool-call count grows: one Opus 5.5 link check ran 1,174 tool calls, and one Haiku 5.5 run ran 344 failing shell calls.
  The user reports the same split from other users. The benchmark's own caveats hold: 2 runs per cell, synthetic tickets with repeated wording that suit a sentence-count script, one effort level, and a clean configuration.
  Acceptance: none (context). claudetto does not turn Code Mode on (OUT-118). It stays compatible when a user turns it on (REQ-GUARDS-078).
  Basis: reported, third-party measurement (published scripts, transcripts and `/context` dumps; not rerun here). Read: the official page lists the same requirements and limits. The 2.1.327 reason list in chunk-g2wcp8ss.js holds no plugin or mod reason, although the page still lists "doesn't yet work with the plugin" and "an installed mod" (Differs). Status: n/a (host behaviour).
  Source: external/2026-11-18_p2/reddit.com-r-claudeai-comments-1xymddk-i-benchmarked-claude-codes-code-20261118T181709Z.md:37-43,74,80-82 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xymddk/i_benchmarked_claude_codes_code_mode_across_4/>); github.com/Bicameral-AI/claude-code-mode-benchmark@deee7585 results/README.md (tables "Tokens Processed by Kind of Work", "Task Context and Requests", "Fixed Context", "Opus 5.5") and archive/claude-code-2.1.325/results/context/C0-opus-off-20261116-172859.md, C0-opus-on-20261116-172924.md; <https://code.claude.com/docs/en/code-mode> (read 2026-11-18); chunk-g2wcp8ss.js reason switch (claude 2.1.327, cleaned module, 2026-11-18); user report, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl).
