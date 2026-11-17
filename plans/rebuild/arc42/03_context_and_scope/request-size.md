# request-size

## Request Size

- [ ] **CTX-658** Source lines fell from 17,382 to 10,209 (claudetto code 16,125 to 6,827; tests 14,402 to 8,292). Hook latency, session start to first API request: 574, 547, 567 ms at baseline against 466, 469, 515 / 467, 477, 495 ms; `session.start` mean 48.1 ms to 90.5 / 79.4 ms
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/footprint.md:44; openspec/changes/archive/2026-11-09-release-2-1-319/footprint.md:48; openspec/changes/archive/2026-11-09-release-2-1-319/footprint.md:84.

- [ ] **CTX-659** Paid first request 9,228 against 9,048 tokens (+180, +2.0%); the second request reads all of the first and writes 258-266 new tokens in both arms; total paid 74,249 tokens, about $0.004
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/footprint.md:107; openspec/changes/archive/2026-11-09-release-2-1-319/footprint.md:116.

## Request Size

- [ ] **CTX-660** The fake-API request converts to tokens at chars / 2.76, from matched paid haiku-5-5 pairs: base 47,381 chars / 17,193 tokens = 2.756; lean 2.773; claudetto 2.758 with connectors off. An earlier 2.25 was a mismatched pair. The vanilla baseline is 47,654 chars, 12 tools (tools 29,512, system 8,480, messages 9,662)
  Basis: measured, 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1246; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1249.

## Request Size

- [ ] **CTX-661** Paid whole-setup first requests (real login, connectors off): vanilla 17,194 tokens; claudetto plus both plugins plus Concise 13,925 (-3,269, -19 percent; tools -10,678 chars as Agent, ListAgents, and Skill move behind ToolSearch, system -3,132, messages +3,922); lean vanilla 11,844 (-5,349, -31 percent). claude.ai connectors add 2,757 tokens (16,682 against 13,925) and load as a race (one run of three)
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1260; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1264.

- [ ] **CTX-662** Per-key first-request deltas (chars; tokens = chars/2.76; fake API, 2.1.318): `includeGitInstructions` false -1,256 (-455 tok; same as `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS`, set one); `attribution` empty -582 (-211); `disableWorkflows` -5,609 (-2,032); `disableBundledSkills` alone +11,119 (+4,029) because the Workflow tool grows from 5,355 to 22,310, with `disableWorkflows` -11,192 (-4,055); `ultracode` +17,413 (+6,309; paid 23,458 against 17,193 tokens); `skillListingMaxDescChars` 200 -3,620 (-1,312); `skillListingBudgetFraction` 0.002 only -134; `autoMemoryEnabled` false -2,084 (-755), default on; `outputStyle` Explanatory +1,187, Learning +5,046 (+1,828), `claudetto:Concise` +2,130 (+772); `language` English +468; `totalTokensReminder` off -102; `disableAgentView` -133; `sandbox.enabled` +7,590 (+2,750 tok) with the escape text alone 1,486 chars (538 tok); `promptCacheTtl` 1h -255 chars and adds beta `extended-cache-ttl-2025-04-11` on an API key; `defaultMode` auto adds 0 chars, betas `dangerous-tool-use-2026-09-03` and `afk-mode-2026-01-31`, and costs a classifier of about 34.7k tokens per stage; `DISABLE_EXPLORE_PLAN_AGENTS` -905; `FORK_SUBAGENT` 0 -396, 1 -521; `DISABLE_CRON` -376
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1270.

- [ ] **CTX-663** No first-request change (0 chars) for `todoFeatureEnabled`, `disableSkillShellExecution`, `fileCheckpointingEnabled` false, `autoCompactEnabled` false, `promptSuggestionEnabled`, `awaySummaryEnabled`, `modelProposedGoals`, `fastMode` true, `bashEditDiffEnabled`, `isolatePeerMachines`. Their cost sits in later requests or extra calls
  Basis: measured, one-turn -p.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1316.

- [ ] **CTX-664** `ENABLE_TOOL_SEARCH=false` adds 27,321 chars (+9,899 tok) to the first request (verdict: never set false); `ENABLE_TOOL_SEARCH=true` adds 0. `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` adds the same 27,321 chars: the 11 deferred tools load up front, ToolSearch goes, betas shrink to three
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1333; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1496.

- [ ] **CTX-665** `CLAUDE_CODE_DISABLE_ATTACHMENTS=1` is -6,640 chars (-2,406 tok) but drops the environment block, the deferred list, and the agent and skill listings (verdict: never)
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1335.

- [ ] **CTX-666** `CLAUDE_CODE_SIMPLE=1` (bare mode) leaves 3 tools and is -44,126 chars (verdict: never for normal work)
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1337.

- [ ] **CTX-667** `--exclude-dynamic-system-prompt-sections` is -151 chars total and moves 2,388 chars from system to messages (cache sharing across machines is inferred); optional for `-p` scripts
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1338.

- [ ] **CTX-668** `viewMode` "focus" adds a "# Focus mode" system section, +449 chars (+163 tok); `defaultView` chat or transcript adds 0. Proposed: unset
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1349.

- [ ] **CTX-669** `skillOverrides` off for `simplify`, `loop`, and `claude-api` is -1,617 chars (-586 tok); "name-only" is -1,586 (-575 tok). Useful only if bundled skills stay on
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1352.

- [ ] **CTX-670** `workflowSizeGuideline` small is -73 chars and unrestricted -277. Proposed: unset, moot with `disableWorkflows` true
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1355.

- [ ] **CTX-671** `additionalDirectories` with one folder adds +61 chars; `blockWritesOutsideWorkingDirectories` true -27; `autoMemoryEnabled` false removes the auto memory text from the request, -2,084 chars (-755 tokens); `autoMemoryDirectory` -39 chars (-14 tokens), moot when memory is off; `totalTokensReminderAfterUserTurn` false -51 and Budget -2
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1360; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1282.

- [ ] **CTX-672** `includeCoAuthoredBy` false is -582 chars alone but 0 with `includeGitInstructions` false (the git switch already removes the attribution reminder). Deprecated; proposed: unset
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1362.

- [ ] **CTX-673** `modelSettings` `effortLevel` low gives 0 chars; `modelOverrides` maps the request model ID with 0 chars, for provider IDs only. Proposed: unset
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1365.

- [ ] **CTX-674** `autoMode.classifyAllShell` true gives the same betas as auto, 0 chars. Its cost is a classifier call per shell command, not measured; stderr says gateway classifier requests "are billed as before"
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1367; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1369.

- [ ] **CTX-675** Sandbox keys against sandbox-on 55,244 chars: `filesystem.disabled` -1,844 (-668 tok); `allowedDomains` plus `allowLocalBinding` -350; `allowWrite` plus `denyRead` +57; the others within 3 chars
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1370.

- [ ] **CTX-676** Flag `--tools=Bash,Read,Edit,Write` is -30,406 chars (-11,017 tok); `--task-budget 50000` adds `output_config.task_budget`, 0 chars; `--max-budget-usd 0.01` +39; `--max-turns 1` +0; `--append-system-prompt=16 chars` gives +50 (the identity line changes to "You are Claude Code, ... running within the Claude Agent SDK.")
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1630.

## Request Size

- [ ] **CTX-677** Undocumented codename env variables add system sections: `AMBER_ASTROLABE` +1,366 chars (autonomous, user away), `BASALT_COVE` +1,961 (Communicating), `BISON_CAIRN` +2,019 (Delivering work), `LARCH_CISTERN` +1,247 (Corrections), `WILLOW_TERN` +1,818 (Writing for the user), `SKILL_PROPOSALS` +551. All proposed unset
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1501.

- [ ] **CTX-678** `ATTACHMENTS_BY_PATH` adds `SendUserFile` +3,189 chars; `ENABLE_WRAP_UP` adds `WrapUp` +3,172; `BRIEF` and `PEWTER_OWL` add `SendUserMessage` and a second request per turn, +3,875 chars. Verdict: never
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1515.

- [ ] **CTX-679** Env `RESTRICTED` removes Bash, Workflow, the memory section, and the attribution reminder and adds Glob and Grep: -7,809 chars (-2,829 tok), never. `PEWTER_OWL_TOOL` adds `SendUserMessage` alone, +641
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1521.

- [ ] **CTX-680** `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` removes the agent listing (-1,544 chars) and also Explore and Plan. `DISABLE_BACKGROUND_TASKS` is -1,352 chars (removes `run_in_background` from Agent and Bash). It stays open, because handoff and Monitor use background tasks
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1525.

- [ ] **CTX-681** `SNAPPY_PELICAN` +860 chars (Agent effort lower or higher), `EXPERIMENTAL_AGENT_TEAMS` +526, `GORSE_PLOVER` +169 (Bash line), `ENABLE_FINE_GRAINED_TOOL_STREAMING` +319. All unset
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1532.

- [ ] **CTX-682** `DISABLE_CLAUDE_API_SKILL` -1,083 chars; `WEB_FETCH_AGENT` +1,967 (adds a web-fetch skill line); `DISABLE_WEB_FETCH` -9; `ENABLE_TODO_TOOLS` +39; `ENABLE_TOKEN_USAGE_ATTACHMENT` +41; `NEW_INIT` +27; `SAFE_MODE` -2,196 (memory section and statusline-setup line)
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1539.

## Request Size

- [ ] **CTX-683** Env fields only: `ENABLE_EXPERIMENTAL_ADVISOR_TOOL` adds beta `advisor-tool-2026-03-01`; `INLINE_TOOLS` adds `inline-tools-2026-09-15`; `DISABLE_INTERLEAVED_THINKING` drops `interleaved-thinking-2025-05-14`; `MAX_OUTPUT_TOKENS=4000` turns `max_tokens` 128000 into 4000; `DISABLE_PROMPT_CACHING` (and `_HAIKU`) removes all `cache_control` (never)
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1561.

- [ ] **CTX-684** The base request betas are `interleaved-thinking-2025-05-14`, `context-management-2025-06-27`, `claude-code-20250219`, `per-turn-control-2026-07-01`, `mid-conversation-tool-changes-2026-07-01`, `thinking-token-count-2026-05-13`, `advanced-tool-use-2025-11-20`, and `effort-2025-11-24`. Betas are fields, 0 chars
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1645.

## Request Size

- [ ] **CTX-685** --disable-slash-commands grows the Workflow tool text to 22,511 bytes (stock 3,502), so it is no trim lever.
  Basis: cited (the research file holds the number as a cited figure, not a run).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:65.

- [ ] **CTX-686** Stock inventory: 94 tools and 142 slash commands, of which 35 are prompt commands and 107 are local commands. A -p request sends 12 tools and defers 10.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:84-87,117,119.

- [ ] **CTX-687** autoMode lists are trimmed without $defaults. SOFT BLOCK is about 64 KB of the 139,286-byte classifier prompt (72 rules). Sonnet 5.5 and Opus 5.5 are refused as classifier models, and a server config outranks CLAUDE_CODE_AUTO_MODE_MODEL.
  Basis: measured and cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:173-174.

- [ ] **CTX-688** The Bash tool description is 1,267 chars in stock and says run_in_background "keeps running across turns and re-invokes you when it exits". The plugin's is 179 chars with no word on background. The parameter text is equal. The Bash text in a real session stays unmeasured. The tool-text survey below gives 3,041 chars for the stock Bash text; the two figures come from different measures and both stay.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:843.

- [ ] **CTX-689** Request parts: the init event lists 43 commands. The skill list is 5,907 chars with 12 entries in stock and 1,350 with the plugins. The agent list is 596 chars in stock and 0 with the plugin. Only skill-type commands add request chars.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:834.

- [ ] **CTX-690** First-request arm table (commit 1228c597): stock 43,382 bytes (system 5,977 chars, 12 tools, tool chars 28,429, message chars 8,129). Three plugins 19,675 (system 6,553, 8 tools, tool chars 8,154, messages 4,286). claudetto alone 18,496 (cuts 24,886). claudetto-openspec alone 44,676 (adds 1,294 over stock). you-should-know alone 43,373 (changes 9).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:887-895.

- [ ] **CTX-691** Tools the build does not load add 0 chars. A print request holds 25 tools in 73,587 chars; an interactive one holds 28 in 85,326. The three added are AskUserQuestion 5,196, EnterPlanMode 4,298, and ExitPlanMode 2,443 (the tool-text survey gives 4,333 and 2,464 for the two plan-mode tools, a different measure). A first run that typed only Enter exited at the trust screen ("workspace trust not accepted"). A tool that a setting or an account feature turns on is not measured. Built-in plugins (13 of 14) add 0 request chars with `-p`; `plugin-authoring` adds 268; only `init` among untouched slash commands adds request chars (67). Tools outside the default set (Glob, Grep, Task*) add 12,488 chars when `--tools` names them; the other 51 names load in neither mode. Measured on 2.1.321. 95 tools are present in 2.1.325; the cc-inspect `surface` tool list of 2.1.326 holds 97 names (2026-11-17).
  Basis: measured (2.1.321). Status: unchecked (requests not re-measured on 2.1.326; only the name count was).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:868; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:856; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:413; cc-inspect `surface` kind tool, claude 2.1.326, 2026-11-17.

- [ ] **CTX-692** Of 72 built-in tool names, 22 reach a -p request, by --tools name only. ToolSearch select: for 49 names answers "No matching deferred tools found". The pty run failed with "script: openpty: Operation not permitted", and the retry outside the sandbox was refused.
  Basis: measured in part.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:857.

- [ ] **CTX-693** After the rebuild the rebuilt script repeats the baseline within 11 bytes (19,686 against 19,675). Stock is 43,099 and HEAD is 19,392 (system 7,139 chars against 6,756; messages 3,595 against 4,297). With a passing grade HEAD makes 3 side calls, the third a 3,854-byte Decider call to claude-haiku-5-5 from classic.Stop/useStopChecks/register.ts:19. With "ok" both arms make 2, because the unparsed grade blocks before the register check. No session has run HEAD, so the denial count after is unmeasured.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:869.

- [ ] **CTX-694** Request size per model grew 2.1 to 2.8 KB against 2.1.322 because session sections stay. The Stop prompt hook adds an 11.6 KB request per turn. `claude plugin validate` in 2.1.325 type-checks every file in `hooks/` (command-hook scripts moved to `scripts/`) and the build ships no `cc-plugin-claude-platform@builtin`: 2.1.326 registers that plugin under the id `claude-platform` (chunk-wvm9g54y.js@0, claude 2.1.326 binary), and a code search for `cc-plugin-claude-platform` finds no hit;  the type-check of `hooks/` is unverified in 2.1.326.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:103 (task 10.2, probes.md); openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:235; cc-inspect `code` search, claude 2.1.326, 2026-11-17.

- [ ] **CTX-695** Default system prompt in 2.1.323: Sonnet 5.5 system was 298 bytes under --system-prompt and about 6.0k by default; Haiku 5.5 is 8,862; an agent body replaces the default (304 against 6,274 bytes); skills frontmatter is capped at 32.
  Basis: observed and cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:50-57.

- [ ] **CTX-696** The system prompt holds the cache boundary line __SYSTEM_PROMPT_DYNAMIC_BOUNDARY__.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:57.

- [ ] **CTX-697** A built-in subagent runs its own 2,683-byte prompt, which prompt.compose cannot reach.
  Basis: observed (probe 1).
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:25.

- [ ] **CTX-698** MAX_MCP_OUTPUT_TOKENS=2000 turns 40,000 chars into a 1,447-char error naming a saved file mcp-big-blob-<n>.txt, but 20,000 and 30,000 chars stay whole at that cap (the count_tokens stand-in answered 100, so the char-to-token ratio is not measured). At 60,000 chars both the default and a cap of 60000 give a 2,261-char persisted-output preview, so a file limit of its own sits above the token cap.
  Basis: measured in part.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:828.

- [ ] **CTX-699** Engine max_tokens for $.model.complete with effort set is maxTokens + 2048 (maxTokens 2106 gives 4154), output_config carries effort only, and there is no thinking field. Thinking and reply share it, and the docs do not say so.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:233.

- [ ] **CTX-700** $.model.complete takes claude-fable-5-2 and claude-mythos-5-2 at effort high (both answered "ok", 18 in and 22 out tokens, 18 in and 21 out tokens, 1.3 s each). The alias fable resolves to Fable or Mythos by ANTHROPIC_DEFAULT_FABLE_MODEL.
  Basis: measured (paid run, P241).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:867.

- [ ] **CTX-701** An agent file's model value is never checked at load: bogus-model draws only an autocompact catalog warning and is dispatched as written. The only load warning is "has invalid effort 'turbo'. Valid options: low, medium, high, xhigh, max or an integer". Dispatch lines show claude-opus-5-5 for opus. The path through an Agent call is read from docs, not run (these runs used the file as the main agent).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:864.

- [ ] **CTX-702** Measured on 2.1.319: first request tools 29,295 -> 7,633 bytes with the Mod; bare `-p` first request 18,065 vs baseline 36,902 (47,683 before deferring three tools); paid two-request session 9,228 vs 9,048 tokens; the second request cache-reads the whole first and writes 258-266 tokens; the prefix after handover differs only in `messages[1]` (engine-added environment block; not fixable, keep no code). With the plugin loaded the TUI starts in auto mode (the 2.1.326 release notes say sessions with no mode set now start in auto mode when the organization policy has not loaded); a compound command raised "Auto mode can't check actions" under the fake API (artifact).
  Basis: measured (2.1.319). Status: unchecked (2.1.319-era numbers; not re-measured on 2.1.326).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2609; openspec/changes/archive/2026-11-09-release-2-1-319/footprint.md:65; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:262; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Request Size

- [ ] **CTX-703** The poster measures the Opus-plans/Sonnet-executes plus code-graph plus 400K-context setup only by the usage meter: 50% extra weekly allowance lasted to day 4-5, 25% extra to day 2-3, and now to day 7, with about 60% savings credited to the combination. There is no A/B and the tasks are "comparable"; subagents self-report "1M+ tokens saved".
  Basis: reported, eyeballed, one author.
  Conflict: One user's internal audit found a code-graph token-saving tool cost as much as or more than it saved.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1x7i9v1-i-went-from-exhausting-claude-c-20261026T064441Z.md:150 (url: https://www.reddit.com/r/Anthropic/comments/1x7i9v1/i_went_from_exhausting_claude_codes_weekly_limits/).

- [ ] **CTX-704** One user's internal audit found a code-graph token-saving tool (trail/graft) cost as much as or more than it saved, and he removed it; the author of another post in the batch claims 30-40% savings by usage-meter eyeballing.
  Basis: reported, one audit, figures not given.
  Conflict: The poster measures the Opus-plans/Sonnet-executes plus code-graph plus 400K-context setup only by the usage meter.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xcacgy-claude-limits-20261026T064230Z.md:134 (url: https://www.reddit.com/r/Anthropic/comments/1xcacgy/claude_limits/).

- [ ] **CTX-705** One poster moved a 10-agent batch job from Opus to Sonnet and it used about as many tokens, only slower, so a saving is price per token, not token count. A same-task-both-ways run is proposed as the settle.
  Basis: reported, one test.
  Source: external/2026-10-27/reddit.com-r-claudeai-comments-1xb3ycs-stop-using-subagents-or-buying-5-20261026T132414Z.md:57 (url: https://www.reddit.com/r/ClaudeAI/comments/1xb3ycs/stop_using_subagents_or_buying_5x/).

- [ ] **CTX-706** A reviewer subagent checked every commit for two weeks: 86 runs, stopped exactly one (over a stale comment link), so the per-commit review cost was not repaid.
  Basis: reported, one user.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xdwquj-anthropics-new-guide-oct-22-argu-20261024T061351Z.md:100 (url: https://www.reddit.com/r/ClaudeAI/comments/1xdwquj/anthropics_new_guide_oct_22_argues_most_agents/).

- [ ] **CTX-707** One contributor reports about 7.4M Claude tokens spent on Ghidra labelling alone for one project.
  Basis: reported, single user.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:1475 (url: https://www.reddit.com/r/claude/comments/1xaiezw/title_has_anyone_actually_tried_the_viral_reverse/).

- [ ] **CTX-708** The REA skill prompt plus skill list cost about 150k tokens, its compat variant 50k or more; one Ghidra-launching request of 1M tokens killed 4 A40 GPUs on a local Qwen.
  Basis: reported, single user, 10 minutes.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:1700 (url: https://www.reddit.com/r/claude/comments/1xaiezw/title_has_anyone_actually_tried_the_viral_reverse/).

- [ ] **CTX-709** One user (reported) found Opus 5.5 never invoked the REA skill in any session and did the work without it; skill packs only make the model more prescriptive.
  Basis: reported, one user.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:553 (url: https://www.reddit.com/r/claude/comments/1xaiezw/title_has_anyone_actually_tried_the_viral_reverse/).

- [ ] **CTX-710** A commenter keeps main sessions on a default autocompact of 150k-240k, treats a starting context above 60k as a concern, and launches workers with about 11k starting context and a 100k autocompact limit.
  Basis: reported, one user, unmeasured.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xcacgy-claude-limits-20261026T064230Z.md:48 (url: https://www.reddit.com/r/Anthropic/comments/1xcacgy/claude_limits/).
