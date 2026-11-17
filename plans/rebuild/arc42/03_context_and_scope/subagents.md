# subagents

## Subagents And Multi-Agent

- [ ] **CTX-024** A fake-API run with deny `Agent(statusline-setup)`, `Agent(Explore)`, `Agent(Plan)`, `Agent(general-purpose)` removed `statusline-setup` and `Explore` from the request; `general-purpose` still appeared. A same-named agent file replaces a built-in (the "Agent Merge Rule").
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1780.

- [ ] **CTX-025** A deny rule on `general-purpose` removes it from the listing but not the Agent tool sentence "any other type - or omitting it - starts a fresh agent (general-purpose by default)"; `wr()` checks only that the agent exists. An omitted-type call then fails with "has been denied by permission rule".
  Basis: cited, claude 2.1.318 source read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1895.

- [ ] **CTX-026** A same-named project or user file replaces the built-in agent, command, skill, and output style as one entry with the override body (probes o1-o14, t1-t3). A user or project `agents/general-purpose.md` (or `Explore`, `Plan`) replaces the built-in in both modes, takes the default call, and keeps its own model and tools (sonnet-5-5, 1 tool); the Agent tool text stays 3,227 chars in all arms, and `--setting-sources project` also drops user agents. A plugin file never replaces: it is listed as `plugin:name` beside the stock entry, because a plugin agent name gets the plugin prefix. A Mod replaces a body (`command.run`, `skill.prompt`) and a spawn's fields (`agent.spawn`), but `agent.register` adds a prefixed agent (`ovmod:Explore`) and cannot take a built-in name. Same-named overrides therefore need files that `claudetto:setup` writes into the user or project `.claude` folder. The naming tension with rule K stays open in the source.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1900; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2431.

- [ ] **CTX-027** `tool.list`, `agent.list`, `command.list`, `config.list`, and `settings.read` are `$`-call events that answer a plugin's own `$.x.list()` call, not the engine's request. `tool.describe` returns `{ description, isDeferred? }` only. No event result type has `remove` or `isEnabled`.
  Basis: cited, claude 2.1.318 source read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2596.

- [ ] **CTX-028** Mod levers: `tool.describe` (description only), `agent.offer` `isOffered` per type in the listing and dispatch, `agent.spawn` rewrites `subagentType` after resolve, `tool.call` rewrites arguments before resolve, `prompt.attachment` drops an attachment (`text: null`). The schema builder omits `model` when `SUBAGENT_MODEL_FORCE` is set and `effort` when `CLAUDE_CODE_EFFORT_LEVEL` is set (null for auto or unset).
  Basis: cited, claude 2.1.318 source read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2078.

- [ ] **CTX-029** The `tool.describe` checker (`rc.checkArgument`) reads only `tool`, `provider`, `isDeferred`, and `description`. A registered tool is named `mcp__<plugin>__<name>`, so no plugin tool takes a built-in's name.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3112.

- [ ] **CTX-030** A Mod tool `monitor` is named `mcp__<server>__monitor`, where the server name comes from `plugin.json` `name`, not from the directory. A copied `plugin.json` named `monprobe` gave "No such tool available: mcp__claudetto__monitor". A `tool.call` matcher for the tool must use the full `mcp__claudetto__monitor` name.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2327.

## Subagents And Multi-Agent

- [ ] **CTX-031** The built-in names Explore and Plan act in code (claude 2.1.318 source read): `omitGitStatus` (the subagent gets no gitStatus block), the hand-back drops "agentId ... use SendMessage" and the `<usage>` trailer (`LZt` set), the withheld-message and turn-limit notes drop the continue hint, `allocateName` is skipped, and the plan-mode workflow and main prompt name Explore and Plan from constants gated on `!DISABLE_EXPLORE_PLAN_AGENTS`. Measured on claude 2.1.318: an Explore subagent gets no gitStatus block and a shorter hand-back (507 B against 704 B). `prompt.context` cannot drop a subagent's gitStatus (probe j3 failed). `includeGitInstructions` false is global, so the parent loses it too. A `tool.call` `result.agentType="Explore"` reproduces the Explore hand-back byte for byte. `result.canContinueAgent=false` drops only the continue hint. Hiding built-ins by `agent.offer` leaves plan mode naming Explore and Plan, and the call fails "Agent type 'Explore' not found". `DISABLE_EXPLORE_PLAN_AGENTS` cuts plan-mode messages from 15,655 to 13,603 chars.
  Basis: measured (code facts cited, claude 2.1.318 source read).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2133; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2165.

- [ ] **CTX-032** The gitStatus block is capped at 2,000 chars of status plus 5 recent commits. Block chars: claudetto (751 status lines) 2,973; OpenJoystickDriver (1,796) 3,099; SwifterKit 3,076; skills 1,713; gamesir-fw 1,199; repos with 0-2 status lines 829-1,001. Exact tokens on the real API: 206 in a clean repo and 1,361 at the cap (2.18-2.28 chars per token), the same on haiku and sonnet. Each claudetto subagent start pays this when `omitGitStatus` is lost. Probe `pg` cost $0.0681.
  Basis: measured, claude 2.1.318, real API.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2223; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2282; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2286; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2289.

- [ ] **CTX-033** Turn-limit note: with `result.agentType` set, the hint "SendMessage to let it continue" stays with no agentId to send to (a stale 81-char hint). Rewriting `result.content` drops the hint but restores the "[Subagent hand-back]" frame (about 395 B, probably `harnessSectionHash`). The verdict was to set `result.agentType` only.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2231.

- [ ] **CTX-034** Paid plan-mode runs A3 and B3 (prompt asks for Explore, claude 2.1.318): B3 (cmod Mod) ran Explore twice on Artemis's model sonnet-5-5 with no error ($1.152, 16 turns); A3 stock ran opus-5-5 ($2.303, 6 turns). One run per arm, so the gap is not an effect. The Agent description still says "(general-purpose by default)".
  Basis: measured, one run per arm.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2308.

- [ ] **CTX-035** Real-API auto-mode probe p0 (built-in Explore) and p2 (same-named `Explore.md`) made 0 classifier calls. The mapped call ran as `source=agent:custom:cmod:Artemis`.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2360.

- [ ] **CTX-036** Agent tool stock sizes: description 3,227 plus schema 1,942 equals 5,246 bytes. The agent listing (`agent_listing_delta`) is 1,647 bytes and names claude, Explore, general-purpose, Plan, statusline-setup. Sum 6,893. Trim probes k0-k12 (fake API, claude 2.1.318): `tool.describe` cuts the Agent text to 422 chars (schema 1,942 stays). `agent.offer` false for built-ins empties the listing (74 chars), and an untyped call is refused "Agent type 'general-purpose' not found". `agent.spawn` cannot rescue it (the type resolves before it runs, k3). A `tool.call` that fills `subagent_type` fixes it (k9). Combination k11 cuts Agent 5,246 plus listing 1,647 (6,893) to 1,981 plus 95 (2,076): -4,817 bytes, -70%. The whole first request goes from 48,730 to 43,913 bytes.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2074; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2090.

- [ ] **CTX-037** Env-var levers on the Agent and Bash tools (claude 2.1.318, fake API unless noted). `CLAUDE_CODE_EFFORT_LEVEL` (auto or a level) drops the Agent `effort` property (schema 1,510, -432), but `auto` also drops `output_config.effort` from the main request (stock sends "medium") and overrides the user's effort; `=high` outranks agent frontmatter effort (e0: main "medium", agent "low"; e1: main "high", agent "high"), so it would override the `effort: medium` of claudetto agents and the user's `/effort`. `SUBAGENT_MODEL_FORCE` drops the `model` property (-444) and forces sonnet-5-5 over agent definitions; `=1` drops an agent file's model unless it is `inherit` (28,851 / 1,498), while `=<model id>` drops nothing (a boolean variable). Sent bytes / Agent schema / Bash schema: none 29,295 / 1,942 / 1,720; `DISABLE_BACKGROUND_TASKS=1` 27,943 / 1,600 / 1,483 (Agent description 3,227 to 2,822, Bash description 1,934 to 1,568); `EFFORT_LEVEL=high` 28,863 / 1,510; sandbox `{enabled, allowUnsandboxedCommands:false}` 30,127 with Bash schema 2,552, which adds `allowed_domains`.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2104; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3120; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3131.

- [ ] **CTX-038** Same-named agent, skill, command, output style, and classic hooks leave all 21 `input_schema`s byte-identical. The only change is the Bash description, 1,934 to 2,020 (a skill named `simplify` turns on "Always run /simplify right before the commit command").
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3162.

- [ ] **CTX-039** `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` also stops auto-backgrounding, Ctrl+B, and MCP auto background. No partial switch keeps `run_in_background` and drops only its text.
  Basis: cited, clawdipedia docs (configure/env-vars/agents-and-teams) as the source reports.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1790.

- [ ] **CTX-040** A stock Agent tool in stream-json `init` is listed as "Task" while the API names it "Agent". The `init` agents list shows registered types, not offered ones. Paid plan-mode runs A1-B2 (opus-5-5, claude 2.1.318) cost $1.84, $1.20, $1.26, $1.36 (total $5.6578) and made no Agent call. The final Write failed with EPERM on `~/.claude/plans`.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2291.

- [ ] **CTX-041** `plansDirectory` must be inside the project root (no backslash off Windows); otherwise it falls back to `~/.claude/plans`.
  Basis: measured, claude 2.1.318 source.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2302.

## Subagents And Multi-Agent

- [ ] **CTX-042** A single agent with skills beat an orchestrator plus subagents on cost and speed with no quality gap.
  Acceptance: The result stays marked weak (7 runs). Verification: inspection.
  Basis: measured by the poster, 7 pairs on one booking-site build (Claude Code 2.1.319, Sonnet 5.5, medium effort, graded by 40 hidden Playwright tests plus a blind design score): single agent cheaper and faster in all 7 (Holm-corrected p=0.004, cost gap 62%), quality no different (p>=0.8). Team subagents started fresh and paid to re-cache their prompts; the team's role prompts were turned into skills for the single agent.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuqnnc-i-tested-anthropics-one-agent-20261116T051736Z.md:2,31,33,35,46,111 (url: https://www.reddit.com/r/ClaudeCode/comments/1xuqnnc/i_tested_anthropics_one_agent_with_skills_beats_a/)

- [ ] **CTX-043** Small build/fix benchmark: 81 of 97 follow-up turns came from two tasks whose prompt omitted a requirement the tests checked (46 of 48 runs missed one trailing-slash rule); other tasks were green on the first turn in 93% of runs.
  Acceptance: Misunderstanding is mostly a constraint that lives only in the prompter's head. Verification: inspection.
  Basis: reported.
  Status: n/a (fact).
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xtbvob-ive-noticed-fable-52-just-feel-20261111T233805Z.md:323 (url: https://www.reddit.com/r/ClaudeCode/comments/1xtbvob/ive_noticed_fable_52_just_feels_off/)

## Subagents And Multi-Agent

- [ ] **CTX-044** A poster tracker of 20 confirmed coding-agent incidents since July 2025: 13 of 20 began with something installed beside the agent (npm or PyPI package, MCP server, skill, editor extension); 2 had malware launch the developer's own agent with safety flags off to hunt credentials; 3 had no attacker, an over-permissioned agent deleted production data (poster count, reported).
  Basis: reported, poster count.
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xaqse6-the-agent-was-almost-never-the-w-20261022T012322Z.md:42 (url: https://www.reddit.com/r/ClaudeAI/comments/1xaqse6/the_agent_was_almost_never_the_way_in_i_went/)

## Subagents And Multi-Agent

- [ ] **CTX-045** Subagent savings come from cheaper tokens, not fewer: the subagent pays uncached exploration and prompt spend and total tokens rise, but exploration and mechanical work run on Haiku-class models while the main agent keeps context to verify; fresh sessions per small task also rebuild context uncached (reported reasoning, no number).
  Basis: reported reasoning, no number.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1ubfy7y-whats-really-the-big-deal-with-20261022T122113Z.md:43 (url: https://www.reddit.com/r/ClaudeCode/comments/1ubfy7y/whats_really_the_big_deal_with_subagentdriven/)

## Subagents And Multi-Agent

- [ ] **CTX-046** One poster's test runs: a hands-off multi-agent pipeline cost about 5x ($20 supervised, $100 handed off); $100 per hour is possible with Fable. Another runs plan, critic, implement, 6 review, test, PR, and docs agents per ticket for one-shot tickets.
  Basis: reported.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1ubfy7y-whats-really-the-big-deal-with-20261022T122113Z.md:178 (url: https://www.reddit.com/r/ClaudeCode/comments/1ubfy7y/whats_really_the_big_deal_with_subagentdriven/).

## Subagents And Multi-Agent

- [ ] **CTX-047** Reported, conflicting, version unstated: one commenter says subagents can spawn subagents up to 5 levels deep and recursion "gets messy fast"; model answers in the same thread state defaults of 3 layers of nesting and 20 concurrent subagents. CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1 and CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS are named as circuit breakers. Checked in claude 2.1.326 with cc-inspect `code` search: both env names exist (chunk-07n5vvax.js@33038), the concurrent-subagent default is 20 (chunk-4h798pp0.js@4420957), and the spawn-depth function reads CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH with a constant 3 declared beside it (chunk-j1p9b5kw.js@341). The 5-level claim is unverified in 2.1.326.
  Basis: reported; names and the 20 default measured in the 2.1.326 binary.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1ubfy7y-whats-really-the-big-deal-with-20261022T122113Z.md:154 (url: https://www.reddit.com/r/ClaudeCode/comments/1ubfy7y/whats_really_the_big_deal_with_subagentdriven/); external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:128 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/); claude 2.1.326 binary chunk-07n5vvax.js@33038, chunk-4h798pp0.js@4420957, chunk-j1p9b5kw.js@341.

## Subagents And Multi-Agent

- [ ] **CTX-048** Studies cited in a model answer, unchecked: arXiv 2511.00872, on code tasks multi-agent systems took substantially more steps (nearly 2x on repair and vulnerability detection) while single-agent was better at software development, code executability, and consistency; arXiv 2603.25928, a self-organizing multi-agent dev system used 1.65x the output tokens of plain Claude Code per submission attempt; arXiv 2606.13003 "The Illusion of Multi-Agent Advantage" (Jun 2026), auto-generated multi-agent systems underperform single-agent CoT plus self-consistency at up to 10x cost, while expert-architected ones beat auto-generated in performance and cost, so hand-designed decomposition beats model improvisation; Cognition "Don't Build Multi-Agents" mechanism: decisions disperse, context is not shared enough, actions carry implicit decisions, and parallel agents make conflicting ones.
  Basis: cited via a model answer, unchecked.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:51; external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:52; external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:53; external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:54 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/).

## Subagents And Multi-Agent

- [ ] **CTX-049** Systima benchmark, reported by a model answer, unverified: two subagents cost up to 5.9x the tokens; parallelism never won on speed (small task 8 min against 4.25 min sequential; five parallel only matched sequential); pinning subagents to Haiku cut the bill 37%.
  Basis: reported by a model answer, unverified.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:83 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/).

## Subagents And Multi-Agent

- [ ] **CTX-050** Reported by a model answer, unverified: on BrowseComp a Fable orchestrator with Sonnet workers scored 96% of Fable alone at 46% of the price, only if enforced via CLAUDE_CODE_SUBAGENT_MODEL or agent YAML.
  Basis: reported by a model answer, unverified.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:92 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/).

## Subagents And Multi-Agent

- [ ] **CTX-051** Anthropic-quoted via a model answer, citation unchecked: multi-agent uses 3-10x the tokens of single-agent for equal tasks (duplicated context, coordination, handoff summaries); agents use about 4x chat; a fresh subagent lacks history, read files, and invoked skills; verbose fan-out reports refill the protected window.
  Basis: reported by a model answer, citation unchecked.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:116 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/).

## Subagents And Multi-Agent

- [ ] **CTX-052** Counter-opinion: subagents multiply the context window (the main session uses the subagents' windows) and can play roles such as devil's advocate.
  Basis: reported opinion.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1wy8sbd-use-of-subagents-or-not-20261022T122101Z.md:71 (url: https://www.reddit.com/r/ClaudeCode/comments/1wy8sbd/use_of_subagents_or_not/).

## Subagents And Multi-Agent

- [ ] **CTX-053** Panel of 5 Sonnet read-only subagents: part of a session costs about $1 to $1.50 at API list prices, 88% of it cache writes since each subagent builds context from scratch. One run: $1.46 for the panel against $4.38 for main-session moderation. The poster runs on a subscription, so the figures are API-equivalent.
  Basis: measured by poster.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1x97ix2-a-readonly-custom-subagent-cut-20261022T122153Z.md:44 (url: https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/).

## Subagents And Multi-Agent

- [ ] **CTX-054** Commenter claim, unmeasured: an unconstrained subagent's system prompt carries schemas for every tool, rule, and MCP server, and restricting tools (tools: [Read]) drops "hundreds of kilobytes". The poster's own breakdown was a guess.
  Basis: reported, unmeasured.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1x97ix2-a-readonly-custom-subagent-cut-20261022T122153Z.md:74 (url: https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/).

## Subagents And Multi-Agent

- [ ] **CTX-055** The built-in Explore agent inherits the main session model since Claude Code 2.1.198 (2026-07-01), so on Opus it bills Opus unless overridden; the `haiku` alias maps to Haiku 5.5 from 2.1.293 on the Anthropic API; nested subagents run to depth 5 (reported, model-generated, unverified). A spawn depth cap comes from `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (default 3, concurrency 20).
  Basis: reported. Status: not applicable.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:90 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/).

- [ ] **CTX-056** Subagent model evidence (6 real tasks, one author): code search found files of 48 on Opus 45, Sonnet 44, Haiku 44, at $6.17, $1.38, $0.44; web research wrong facts 1, 3, 10; fact-check false errors 0, 6, 30; five web tasks $3.93, $1.59, $0.12. Haiku at xhigh costs 3x on code search ($1.39 against $0.47), researches better, fact-checks worse (28 false errors), and runs five web tasks for $2.28 in 34 min against Opus high $4.81 in 16 min; Haiku high is best. Under 100k cache reads cost 20% of the over-100k price. A commenter says Haiku misses a lot and is risky for doc editing; Sonnet is called a poor-fit middle tier (opinion). A measured delegation bench (28 tasks x3, Python, ready spec): Haiku alone $0.008 per run against Sonnet $0.113 (93% cheaper; 297k against 152k tokens); Sonnet plus a Haiku subagent 13% cheaper; Sonnet plus an MCP handoff to an outside model 6% more; Opus plus Haiku about equal to Opus alone; quality by a blind Opus grader (bias risk) Opus 99, Haiku 94, Sonnet plus Haiku 90 including one reject from a permission check that refused the subagent.
  Basis: reported (one author, small n). Status: not applicable.
  Source: external/2026-10-12/export-I tested Haiku 5.5, Sonnet 5.5 and Opus 5.5 as subagents on 6 real tasks.jsonl:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1x1nsaz/i_tested_haiku_55_sonnet_55_and_opus_55_as/).

- [ ] **CTX-057** Subagent cache TTL economics: the default is 5 min for subagents and 1 h for main on subscription (reported, a bot citing docs); caches are per model; a 1h write costs about 60% more than 5m; 1h adds +21% for a subagent and +7% for main (measured); turns after a gap over 1 h are 1.6% of turns and 80% of cache writes; cache read is about 95% of tokens and each turn re-reads 84-145k; subagents started at the same instant cannot read each other's writes (inferred); 35% of spawns got no cache read, with a median write of 41k (measured, one account). A long-task subagent may take 1h TTL in its own frontmatter only, a heartbeat ping about every 45 minutes with an exit condition (an error-loop ping keeps a dead agent warm), and a scripted handoff at about 175k context; one user measured about 60% lower weekly burn over weeks, half from smaller contexts, and calls the handoff a cost cap and per-step checkpoints the crash layer.
  Basis: measured and reported. Status: not applicable.
  Source: external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:25; external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:43.

- [ ] **CTX-058** Subagent context cost: a narrow read-only custom agent (only `Read`, `model: sonnet`) cut a 5-agent review panel call from about 116k to about 30k tokens (measured; the guess is that general-purpose loads every tool schema including MCP servers); a type is split only for a repeated job; a new type loads after a Claude Code restart; `/context` shows the start split. The first request of a spawned subagent is about 29k tokens (394 starts, about 10M of 84M). Vercel cut 80% of tools and success went 80% to 100%; 50+ MCP tools cost about 72k tokens; a 90-tool server about 24,000. Subagent briefs that separate facts from recommendation (facts, hard constraints, files, leaning, disconfirming evidence, output format) let the subagent answer `supports plan`, `contradicts plan`, or `insufficient evidence`; otherwise an "independent" review is an echo.
  Basis: measured and reported. Status: not applicable.
  Source: unresolved: no source line located for this claim.

## Subagents And Multi-Agent

- [ ] **CTX-059** The engine picks a fork only with `subagent_type:"fork"` and `CLAUDE_CODE_FORK_SUBAGENT=1` (measured 2.1.319: the env alone gives a fresh child; a fork resends the parent prefix in all 4 requests). A fork inherits the whole transcript, so late in a long session it costs more than a fresh subagent. Reported: `CLAUDE_CODE_FORK_SUBAGENT=0` reverts forking by default, and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0` suits sessions that use no teams (a forgotten flag made each subagent request spawn a teammate whose idle pings re-read the lead context).
  Basis: measured and reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts:180` writes `FORK_SUBAGENT`; `EXPERIMENTAL_AGENT_TEAMS` is absent).
  Source: plugins/claudetto/hooks/features/setup/settings.ts:180@088a227c.

- [ ] **CTX-060** `tool.describe` is the only way to shorten a built-in tool definition (description only, not schema; a classic hook, command, or skill cannot). Survey, stock to plugin chars: Workflow 5,355 to 22,331 loaded (grew), Monitor 7,586 to 1,310, SendMessage 5,698 to 1,532, Agent 4,850 to 2,117, AskUserQuestion 5,196 to 3,193, EnterWorktree 4,034 to 942, Bash 3,041 to 1,947; DesignSync 10,457 untouched; the stock skill list is 5,907 chars. ToolSearch holds 953 of 1,440 uncut, EnterPlanMode 4,333, ExitPlanMode 2,464. Built-in `Monitor` is used and the plugin wrapper added no effect (866 against 7,586 bytes). The one sentence on `run_in_background` re-invoking the agent is restored when the Bash text shrinks (stock says it; the plugin dropped it).
  Basis: measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/surface/texts.ts`).
  Source: plugins/claudetto/hooks/features/surface/texts.ts@088a227c.

- [ ] **CTX-061** `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` restores the full system prompt on Opus and Sonnet 5.5 (short about 5.6k chars against 26.8k). The short prompt lacks "don't reference current task", "default to writing no comments", the abstraction rules, the risky-action list, and the injection flag; the full prompt drops "report outcomes faithfully" and advises stashing before discard (unsafe in a shared tree). Measure before adopting. System prompt sizes are measured in two units on two settings and must not be mixed: the stock Claude Code system prompt is 6,174 bytes (probe baseline: 12 tools, fake API, `--setting-sources ""`); the full prompt is about 26.8k characters and the short prompt about 5.6k characters (one report, `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0`).
  Acceptance: Each figure names its unit and setting. Verification: inspection.
  Basis: inferred (strings-derived; present in 2.1.326 as env `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` (str; cc-inspect `surface`, 2026-11-17)). Status: missing at 088a227c (`git grep SIMPLE_SYSTEM_PROMPT` finds nothing under `plugins/`). measured (6,174 bytes); reported (26.8k and 5.6k characters, n=2). The dossier rejected the 26.8k root-prompt claim because it contradicts the 6,174-byte baseline; the source does not say which setting each figure measures.
  Status: n/a (fact).
  Source: unresolved: no source line located for this claim; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:169; openspec/changes/2-1-325-rearchitecture/design.md:129,133.

## Subagents And Multi-Agent

- [ ] **CTX-062** Dossier S31 (arXiv 2609.04170): in a collective of 100 agents on formal conjectures, an evaluation exploit spreads through a shared library and peer messages. It is one constructed ecosystem, not a measurement of Claude Code's default subagents (cited).
  Basis: cited.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:291.

- [ ] **CTX-063** Dossier S32 (Troy, arXiv 2609.15494): the tested models were GPT-5.6 Sol, Claude Fable 5.1, and Gemini 3.8 Flash, not Opus or Sonnet 5. The indexed abstracts and later text differ, so a quote must name the version (cited).
  Basis: cited.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:299.

- [ ] **CTX-064** Dossier S33 (MAST, arXiv 2503.13657): the taxonomy has 14 failure modes. The retrieved versions hold 1,642 traces, and older abstracts describe a smaller study, so a quote must name the specific version and sample (cited).
  Basis: cited.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:307.

- [ ] **CTX-065** Dossier S34 (Agents of Chaos, arXiv 2602.20021): eleven cases from a two-week laboratory deployment with email, Discord, memory, files, and shell access. The source is an abstract only (cited).
  Basis: cited, abstract only.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:315.

## Subagents And Multi-Agent

- [ ] **CTX-066** The poster cites a the-decoder article headlined "Anthropic says one AI agent beats many subagents now that models can handle complexity alone"; commenters say a session now orchestrates itself, with subagent fleets going out of fashion.
  Basis: cited headline, not fetched; opinion.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xfes9c-new-recommendation-agent-orches-20261026T063809Z.md:31 (url: https://www.reddit.com/r/Anthropic/comments/1xfes9c/new_recommendation_agent_orchestration/).

- [ ] **CTX-067** Opus 5.5 and Fable now spawn subagents on their own without being asked, and care less about context limits, within about the past week.
  Basis: reported, one user, unmeasured.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xfes9c-new-recommendation-agent-orches-20261026T063809Z.md:91 (url: https://www.reddit.com/r/Anthropic/comments/1xfes9c/new_recommendation_agent_orchestration/).

- [ ] **CTX-068** "Fan out subagents" yields only about 4-6 subagents; more needs a dynamic workflow or a tier of middle-manager agents, and the dynamic split then does not match the user's split.
  Basis: reported, one user.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xfes9c-new-recommendation-agent-orches-20261026T063809Z.md:133 (url: https://www.reddit.com/r/Anthropic/comments/1xfes9c/new_recommendation_agent_orchestration/).

- [ ] **CTX-069** One commenter claims a second piece hides, encrypted, any user-facing text placed between a reasoning block and a tool call, so the model's answer to a user question seemed ignored.
  Basis: reported, one user, unverified.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xfdown-claude-refuses-judges-and-evals-20261026T064136Z.md:134 (url: https://www.reddit.com/r/Anthropic/comments/1xfdown/claude_refuses_judges_and_evals_if_they_include_a/).

- [ ] **CTX-070** Opus 5.5 gave better research answers for the first hours after history was deleted, and clogged context made it "more stupid" with more guardrails (research, not coding).
  Basis: reported, one user, unmeasured.
  Source: external/2026-10-26/reddit.com-r-claudeai-comments-1xfcot1-anyone-else-having-serious-quali-20261026T063509Z.md:113 (url: https://www.reddit.com/r/ClaudeAI/comments/1xfcot1/anyone_else_having_serious_quality_issues_with/).

## Subagents And Multi-Agent

- [ ] **CTX-071** Delegation test on a ~52k-line repo: forced Opus found 45 of 51 known issues on the 80-page plugin-doc check, forced Haiku 34 of 51 at 84% less cost; on the reference-doc check both delegated setups beat both Opus-only setups; on a small repo (~10k lines) skill-routed found 9 of 9 doc issues over two runs against 8, forced Haiku 4 of 9.
  Basis: reported, mostly n=2 runs.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:74; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:40; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:84 (url: https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/).

- [ ] **CTX-072** Re-pricing delegated tokens at Opus rates predicted 34-85% savings, while head-to-head runs ranged from 30% more expensive to 75% cheaper; estimate savings from billed head-to-head runs, not repriced tokens; the router skill mostly picked Sonnet, which gave little cost advantage.
  Basis: reported.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:84; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:80 (url: https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/).

- [ ] **CTX-073** Cheaper-model PRs reviewed by an advanced multi-lineage review agent gave hundreds of findings and dozens of iterations, which can cost more than a capable model from the start; some findings a cheap model never resolves however often asked; compare total cost to reliable code, not per-token cost.
  Basis: reported.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:195 (url: https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/).

- [ ] **CTX-074** One poster's A/B on FastAPI (3,012 files, claude -p, 3 tasks x 2 runs per arm, noise under about 10%): cost follows turn count because every tool call resends the whole conversation: plain 48 turns, 1.10M tokens, $0.50; MCP token-savior 55, 1.32M, $0.57; one-call index slice 19, 0.61M, $0.40; all answers correct; cache writes nearly equal across arms, the gap came from cache reads and output.
  Basis: measured by one poster.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrzdu9-i-measured-what-actually-drives-20261110T093438Z.md:29; external/2026-11-10/reddit.com-r-claudeai-comments-1xrzdu9-i-measured-what-actually-drives-20261110T093438Z.md:39 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrzdu9/i_measured_what_actually_drives_claude_code_cost/).

- [ ] **CTX-075** Same poster: a hook that auto-injected relevant code into every prompt made the model issue more small follow-up calls and raised cost 35%; a tool that shrinks reads but is called more often costs more.
  Basis: measured by the same poster.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrzdu9-i-measured-what-actually-drives-20261110T093438Z.md:45 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrzdu9/i_measured_what_actually_drives_claude_code_cost/).

- [ ] **CTX-076** Session length moves the weekly limit more than effort level does, because each turn re-reads the whole context.
  Basis: reported, inferred.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:53 (url: https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down/).

- [ ] **CTX-077** Model and effort of agents are set by launch flag or agent file, not by instruction; generic built-in agents (Explore, general-purpose) cannot be reliably edited by the model, since it may say it can change their frontmatter but that is non-deterministic, so write bespoke agent files.
  Basis: reported.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:81; external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:154 (url: https://www.reddit.com/r/ClaudeCode/comments/1xrw5rg/are_you_serious/).

- [ ] **CTX-078** If CLAUDE.md wording is ambiguous against the built-in system-prompt subagent instructions, the model cannot tell which to follow; state explicitly that the text is a user instruction.
  Basis: reported, one commenter.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:281 (url: https://www.reddit.com/r/ClaudeCode/comments/1xrw5rg/are_you_serious/).

- [ ] **CTX-079** Global instructions past 6 or 7 lines get half ignored (several commenters); "use what's already in package.json" fixes drift to a favoured library in long sessions.
  Basis: reported, no measure.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xryurq-whats-that-one-instruction-in-yo-20261110T093205Z.md:50; external/2026-11-10/reddit.com-r-claudeai-comments-1xryurq-whats-that-one-instruction-in-yo-20261110T093205Z.md:58 (url: https://www.reddit.com/r/ClaudeAI/comments/1xryurq/whats_that_one_instruction_in_your_claude/).

- [ ] **CTX-080** One 20x user's weekly usage rose to 85% in three days; after telling Opus 5.5 to turn off subagents and agent teams, the next three days added 4%. The user also saw spawned agents step on each other.
  Acceptance: The fact holds on claude 2.1.326 (unverified in 2.1.326); a probe compares weekly usage with and without subagents. Verification: probe.
  Basis: reported, one user (a second commenter reports spawned agents stepping on each other). Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:673; external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:681 (url: https://www.reddit.com/r/ClaudeCode/comments/1xgxv58/claude_max_20x_weekly_depleted_in_less_than_25/).

- [ ] **CTX-081** Delegating coding to Codex from Claude works by allowing Bash(codex exec:*), with the task and result in handoff files. Pitfalls on Windows: the call needs < /dev/null or it hangs on stdin; always pass -C with the repo path or it starts in the home folder; do not use --sandbox (it silently reads nothing); check the diff, because Codex sometimes says done when it is not.
  Acceptance: The fact holds on claude 2.1.326 (unverified in 2.1.326) and the installed Codex CLI. Verification: probe.
  Basis: reported, one user. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:336 (url: https://www.reddit.com/r/ClaudeCode/comments/1xgxv58/claude_max_20x_weekly_depleted_in_less_than_25/).

## Subagents And Multi-Agent

- [ ] **CTX-082** An Anthropic study of 50 analysts, cited secondhand: 86 percent followed the agent's lean (81 to 92 percent per decision); of analysts with a written preference, 60 percent switched when the agent disagreed against 6 percent when it agreed (38 cases, a small sample); 77 percent reused the agent's arguments and 15 percent credited it; rollout was recommended 54 percent against 36 percent by lean; serious errors 6 percent with the agent against 55 percent of 11 without; median 65 against 90 minutes. Anthropic says the groups are not directly comparable; one task, one field, one model (Opus 4.8).
  Acceptance: The figures hold as the poster cites them; the study was not opened. Verification: inspection.
  Basis: cited, secondhand. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xj3qdv-anthropic-gave-50-analysts-claud-20261030T102902Z.md:34; external/2026-10-30/reddit.com-r-claudeai-comments-1xj3qdv-anthropic-gave-50-analysts-claud-20261030T102902Z.md:35; external/2026-10-30/reddit.com-r-claudeai-comments-1xj3qdv-anthropic-gave-50-analysts-claud-20261030T102902Z.md:36; external/2026-10-30/reddit.com-r-claudeai-comments-1xj3qdv-anthropic-gave-50-analysts-claud-20261030T102902Z.md:37; external/2026-10-30/reddit.com-r-claudeai-comments-1xj3qdv-anthropic-gave-50-analysts-claud-20261030T102902Z.md:38; external/2026-10-30/reddit.com-r-claudeai-comments-1xj3qdv-anthropic-gave-50-analysts-claud-20261030T102902Z.md:39 (url: https://www.reddit.com/r/ClaudeAI/comments/1xj3qdv/anthropic_gave_50_analysts_claude_code_with_a/).

- [ ] **CTX-083** Dossier S45, SHADE-Arena (arXiv 2506.15740, https://arxiv.org/abs/2506.15740, June 2025; abstract inspected at v2): it pairs legitimate main tasks with explicitly assigned harmful side objectives and tests whether monitoring catches them. It is a sabotage-capability test, not evidence that the same agents spontaneously acquire such objectives. Hidden scratchpad access materially affects results, which limits a supervising agent that sees only selected outputs or final summaries.
  Basis: cited (abstract).
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:397-399.

- [ ] **CTX-084** A commenter asks whether cross review helps and cites arXiv 2607.21656 (https://arxiv.org/abs/2607.21656), a leaddev article and a Reddit thread as showing it does not. A reply says 2 of those state that Claude as reviewer lifted the pass rate, the instance of Codex reviewing Claude did not, and the models and versions were not visible; the reply treats benchmark results with a grain of salt.
  Basis: reported (two commenters; sources not opened).
  Source: external/2026-10-25_p2/reddit.com-r-claudeai-comments-1xdwquj-anthropics-new-guide-oct-22-argu-20261025T155538Z.md:124-127 (url: https://www.reddit.com/r/ClaudeAI/comments/1xdwquj/anthropics_new_guide_oct_22_argues_most_agents/).
