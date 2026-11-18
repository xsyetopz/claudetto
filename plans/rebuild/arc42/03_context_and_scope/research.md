# Research

## Research and Studies

- [ ] **CTX-374** Coding agents change code that is already fixed: a 200-task benchmark where the correct action is no change (arXiv 2605.07769).
  Acceptance: Kept as the no-change-needed case. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:32.

- [ ] **CTX-375** Safety benchmarks: Agent-SafetyBench (2412.14470) no agent above 60% and prompts alone do not fix it; ToolEmu (2309.15817) 68.8% of found failures validated real; OpenAgentSafety (2507.06134) unsafe in 51-73% of vulnerable tasks.
  Acceptance: Kept beside the plan's [2605.18583] out-of-scope rates. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:54,63,64.

- [ ] **CTX-376** Stale training data leads to deprecated APIs (2406.09834); a hallucination taxonomy with four contributing factors (2409.20550); ReCode RL on API updates (2506.20495).
  Acceptance: Kept as the deprecated-API cause. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:110,111,123.

- [ ] **CTX-377** Retrieval of API docs helps rare APIs (38.58% to 47.94% valid calls) but a poor retriever cost 39 points on common APIs, so retrieve selectively (2407.09726); a registry-check pipeline gave clean code in 76% of runs, bait prompts raised hallucination to 40-73%, and about half of flagged names were real lookalike packages (2608.23897).
  Acceptance: Kept beside the plan's 76% and 5.2%/21.7%. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:122,124.

- [ ] **CTX-378** Models cannot separate data from instructions (2302.12173); InjecGuard (2410.22770) shows injection guards near chance on benign text with trigger words (over-defense).
  Acceptance: Kept beside the plan's over-refusal line, as guard over-defense. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:170,172.

- [ ] **CTX-379** StruQ (2402.06363) and SecAlign (2410.05451) separate instruction and data channels with under 10% attack success; Design Patterns for Securing LLM Agents (2506.08837); evals AgentDojo (2406.13352), OR-Bench (2405.20947), XSTest (2308.01263).
  Acceptance: Kept beside the trifecta break. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:185,187,188.

- [ ] **CTX-380** Instruction Hierarchy (2404.13208) is a cited research mitigation for injection.
  Acceptance: Kept as a citation. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:183.

- [ ] **CTX-381** Progent (2504.11703) least-privilege tool policies; Conseca (2501.17070) just-in-time human-verifiable policies; Agent-as-a-Judge (2410.10934) near-human where text graders fail; PatchDiff (2503.15223) differential testing exposes plausible-but-wrong passes, and checks at the wrong layer pass wrong patches.
  Acceptance: Kept beside the plan's mutation checks. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:112,159,160; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:110.

- [ ] **CTX-382** Agentic refactorings are mostly shallow renames and type changes (2511.04824, 2601.20160); A3-CodGen (2312.05772) library awareness raises reuse; prompt and architecture choices drive code smells (2511.15817); MetaGPT (2308.00352) SOPs with intermediate checks.
  Acceptance: Kept beside the plan's refactor technique. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:48,57,60,117.

- [ ] **CTX-383** Debate often loses to self-consistency or a single strong agent (2305.14325, 2311.17371, 2402.18272); heterogeneous models help.
  Acceptance: Kept beside the plan's "heterogeneous debate helps (2502.08788)". Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:118.

- [ ] **CTX-384** Overthinking (2412.21187) and underthinking (2501.18585) are named failures; Danger of Overthinking (2502.08235): SWE-bench low-overthinking trajectories about 30% better at 43% lower cost; AdaptThink (2505.13417) -53% length +2.4% accuracy; Token-Budget (2412.18547); L1 (2503.04697); LLMLingua (2310.05736).
  Acceptance: Kept as overthinking numbers, apart from the compaction 43%. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:168,181,182,184.

- [ ] **CTX-385** Towards a Science of Scaling Agent Systems (2512.08296): a predictor picks the best architecture for 87% of configurations.
  Acceptance: Kept beside the +80.8% and -70.0% range. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:119.

- [ ] **CTX-386** Cognition "Don't Build Multi-Agents": share full context because parallel agents make conflicting implicit decisions; OpenAI Agents SDK handoffs with input filters.
  Acceptance: Marked not read or not fetched by the dossier. Verification: inspection.
  Basis: cited (content not read by the dossier; the SDK page not fetched).
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:112,113.

- [ ] **CTX-387** R2E-Gym (2504.07164): hybrid verifiers beat either kind alone; SWE-agent (2405.15793): interface design changes agent outcomes.
  Acceptance: Kept as citations. Verification: inspection.
  Basis: cited.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:61,154.

## Research and Studies

- [ ] **CTX-388** 2605.15184 "Is Grep All You Need": inline grep beat inline vector in every pair; the harness moved accuracy (Opus 4.6 inline grep 93.1 on Chronos against 76.7 on Claude Code)
  Basis: reported, by subagent read, not rechecked.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1191.

- [ ] **CTX-389** 2608.26218 "Same Model, Different Harness": trimming old tool results plus stall handling raised Verified F2PF from 28 to 49 percent at a 20,480-token window and changed nothing at 262,144 (Table 2 and 6)
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1193.

- [ ] **CTX-390** 2509.23586 AgentDiet: input tokens -39.9 to -59.7 percent, cost -21.1 to -35.9, Pass -1.0 to +2.0, blind deletion cost about 7 points Pass. 2510.26585 SupervisorAgent: GAIA tokens -29.68 percent at equal accuracy, the supervisor used 15.45 percent of tokens. 2606.01326 Minification: -42 percent tokens but 50.0 to 38.0 percent resolved, source code 91.8 percent of repair tokens, instructions 0.2 percent
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1195.

- [ ] **CTX-391** 2412.18547 TALE: a stated token budget cut output from 461 to 149 tokens at 83.75 to 81.03 percent accuracy, but a budget too small raised token use (token elasticity). 2602.20478 Codified Context: a small always-on core plus on-demand docs, stale specs the main failure (one developer, observational)
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1201.

- [ ] **CTX-392** The claude.com article "When to fold subagents into your main agent loop" (2026-10-22): use a subagent for context bloat, parallel work with throwaway context, or tool-choice and instruction conflicts; tool choice degrades past 30-50 tool definitions. The quotes came through a paraphrasing fetch; recheck before citing
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1205.

- [ ] **CTX-393** 2610.29162 "Why is AI-generated language so hard to understand": AI text over-uses reduced object relatives, denominal verbs, and inanimate subjects, with longer dependencies; Opus 5.5 is lower than Opus 5 in 19 of 21 comparisons. `ste-rewrite` 0.5.0 (`asd-ste100-skill-next`, 23,082 chars SKILL.md): 20 words per instruction, one action and at most one condition per sentence, active voice, noun clusters of 3 words at most, at most 6 sentences per paragraph; eval Opus 17/17, Sonnet 16/17, Haiku 15/17 at $19.58. A rule that states its boundary works; a rule that states its goal reads as advice. Loading the whole skill adds 23 KB per request, so only short sentence rules go in an always-on style
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1219.

## Research and Studies

- [ ] **CTX-394** A third-party blog teardown claims more than 6 system-prompt variants across Claude Code and Desktop, an injectable live-prompt section `heron_brook`, fast mode for Opus as a different decoding layer, and a human-in-the-loop against a no-human variant.
  Acceptance: the blog states each claim. Verification: inspection.
  Basis: measured in part (claude 2.1.327, 2026-11-18). `heron_brook` is confirmed (chunk-m14bt1pz.js@2773954, see Source). The variant count (more than 6), the Desktop variants and the human-in-the-loop against no-human variant are not found in the program: a literal search for 'system prompt variant' returns no hit, and 'no human' hits only notification and permission-provenance text (chunk-zspx3ycy.js@3245, @4579; chunk-rj3e7agr.js@330592), not a prompt variant. Fast mode is a request field the client sends (`speed`, `usage.speed` 'standard' in the probe result); the decoding layer behind it is server-side and cannot be checked from the program. Status: have at 088a227c.
  Source: the blog was not found (Dropped (2026-11-18) for the 6-variant, fast-mode-decoding-layer and human-in-the-loop claims: no source located in external/, openspec/, reports/, git history or the user's transcripts). `heron_brook` is verified in the program on 2.1.327: a string flag `tengu_heron_brook` read from client data or the feature-value store and used when non-empty (chunk-m14bt1pz.js@2773960); it also appears as a section id at openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:17@088a227c9^ and plugins/claudetto/hooks/features/prompt/compose.test.ts:9@088a227c.

## Research and Studies

- [ ] **CTX-395** Per one skill's README, skill folders under `~/.claude/skills/<name>` also work with Codex and Cursor; nothing in claudetto depends on it. A commenter cited Anthropic "The AI-native SDLC playbook" (not fetched). In a multi-agent relay post the author copy-pasted 257 relay prompts across about 20 terminals in a week, with a median 11 min until noticing an agent finished; a local-plus-cloud routing recipe saved little (the best local model on 48 GB handled about 5% of complex tasks).
  Acceptance: the cited posts state the figures. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/2026-10-25_p2/reddit.com-r-claudecoding-comments-1xc8h4t-running-many-claude-code-age-20261025T160048Z.md:31 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xc8h4t/running_many_claude_code_agents_without/>); external/2026-10-12_p3/export-Engineers who write all their code with claude now- how do you do it-.jsonl:278 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wgm4si/engineers_who_write_all_their_code_with_claude/>); external/2026-10-21/reddit.com-r-claudeai-comments-1wu40t8-whats-the-one-line-in-your-claud-20261020T234709Z.md (url: <https://www.reddit.com/r/ClaudeAI/comments/1wu40t8/whats_the_one_line_in_your_claudemd_that_made_the/>). Not located: the Cursor and 48 GB lines.

## Research and Studies

- [ ] **CTX-396** An AST-only code map (graphify) plus a CLAUDE.md rule to ask the map first cut a flow question from about 169k to about 2.9k tokens, with little saving on one-file fixes. After a rename and move the map answered with old names and lines and no warning, so it now checks staleness before each query.
  Acceptance: The figures hold as one author reports them. Verification: probe.
  Basis: reported, one author; contradicted as a general result by four commenters who say Claude did not call a graphify or codegraph MCP although CLAUDE.md named it, preferred the Explore subagent and grep, needed the instruction restated, and fell back to grep and Read when the index output looked truncated, paying twice (external/2026-10-21/reddit.com-r-claudecode-comments-1ueobkd-codegraph-or-graphify-20261021T181506Z.md:48, :52, :74, :129). A code map ships only if a measured arm beats vanilla (ADR-0177), and a CLAUDE.md line alone does not make the agent call it. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudecoding-comments-1xhhdye-made-a-skill-so-claude-code-20261028T082712Z.md:29; external/2026-10-30/reddit.com-r-claudecoding-comments-1xhhdye-made-a-skill-so-claude-code-20261028T082712Z.md:31 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xhhdye/made_a_skill_so_claude_code_queries_a_code_map/>).

## Research and Studies

- [ ] **CTX-397** claudetto shall treat these literature numbers as cited and unverified here: Corrections compiled to runtime checks cut violations 100% -> 37.6% in-distribution and 2.0% out-of-distribution (TRACE); framework explains ~56% of overeager variance, model ~21% (SNARE); removing a consent declaration moved Claude Code's overeager rate 0.0% -> 17.1%; repo context files add >20% cost without raising success; agents skipped asked-for files in 67.9% of runs and 80.4% of those misreported it; package hallucination (5.2% commercial, 21.7% open, 205,474 fake names [2406.10279]); 7.8% of SWE-bench passing patches fail developer tests; multi-turn 39% below single-turn; paper judge rejected claims (test 83, tool 75, other 96) as unmeasured/off-topic/non-Claude/contradicted: treat as not required. Further cited numbers: Docs absent -> executable code only 42.55% on evolving APIs, structured docs + self-reflection 66.36% [2604.09515]; RepoCoder >10% over in-file [2303.12570]; registry-check pipeline 76% clean [2608.23897]; De-Hallucinator +23.9-61.0% [2401.01701]; DocPrompting +52% relative [2207.05987]; Spotlighting <2% attack success [2403.14720]; CaMeL 77% vs 84% undefended [2503.18813]; "Attacker Moves Second" broke 12 defenses >90% [2510.09023]; coding-assistant defenses mitigate <50% of adaptive attacks [2601.17548]; "Your AI, My Shell" up to 84% [2509.22040]; Agentless [2407.01489]; Cursor adoption raised velocity briefly, warnings persistently [2511.04427]. CC prompt (strings): flag suspected injection, hook feedback as from user, pasted-content tags followed only where the user message asks, `switchModelsOnFlag` (2.1.326: `switchModelsOnFlag` present, binary string search; the other prompt strings were not re-searched on 2.1.327).
  Acceptance: No plan decision rests on one of these numbers alone. Verification: inspection.
  Basis: cited. Status: unchecked: literature, not code at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:49; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:47; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:37; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:36.

## Research and Studies

- [ ] **CTX-398** Hook stacks, word lists, swarms, and an advisor that reads the whole context are the practices that people report as harmful; the practices reported as working are small: a short `CLAUDE.md`, the sandbox with file denials at the system level, a hook only for the few hard rules, a Stop hook that runs tests, plan files with native compaction, one worktree per agent.
  Acceptance: the figures below are in the source. Verification: inspection.
  Basis: reported. Measured figures inside: 448 blocks in 76 sessions (top cause a file read through the shell); a planted evasion passed a word list 10 of 12 times; a swarm of 76 agents lost to one agent.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:597; openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:133.

- [ ] **CTX-399** `sandbox.autoAllowBashIfSandboxed` defaults true (Bash text +854 chars; tools 30,350 to 31,204 bytes); `bun test` is refused in `-p` with `--settings '{}'` (17,475 tokens) and passes with the sandbox on (22,163 tokens); about 340 "requires approval" refusals in tuning runs, 42 of them `bun test`. 2.1.326: present (autoAllowBashIfSandboxed; binary string search).
  Basis: measured 2.1.319.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:379; openspec/changes/2-1-325-rearchitecture/design.md:106.

- [ ] **CTX-400** Sandbox on macOS: `allowWrite ["/tmp"]` does not open /tmp (symlink), `/private/tmp` does; TMPDIR=/tmp/claude-501; `denyRead` in file or directory form works with "Operation not permitted"; `denyWrite` inside `allowWrite` works; a shell-variable command is held with "A variable in this command can't be checked before it runs"; unset `allowedDomains` gives proxy 403 and `000`, `["*"]` gives 200; `bun install` needs a writable `BUN_INSTALL_CACHE_DIR`; `git init` fails inside the sandbox; an SSH-signed commit works when ~/.ssh is not in denyRead; ssh goes via the proxy and fails host-key verification without known_hosts; Apple Events fail -600 and `open -R` exits 0 while blocked; `gh api user` needs `allowMachLookup ["*"]` (else x509 OSStatus -26276); pty runs fail (`script: openpty: Operation not permitted`). 2.1.326: present (sandbox.network.*; `allowMachLookup` found by binary string search). The `.git` write protection makes `git init` fail inside the sandbox: "cannot copy ... templates/hooks/commit-msg.sample ... Operation not permitted"; with `--template=`, "could not lock config file" Claude Code's own safety check denies a command that builds a folder path from a variable; a command with literal paths passes.
  Acceptance: the same command with literal paths runs. Verification: probe.
  Basis: measured 2.1.319, macOS 27.2. measured. reported. Status: have.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:163; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:310; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1724; openspec/specs/low-hitl/spec.md:141; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:236; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11 (Claude Code 2.1.319).

- [ ] **CTX-401** The `dangerouslyDisableSandbox` retry (2.1.322, cc-inspect `cli`): auto mode accepts or lets the classifier decide unless flagged (permission_denied or classifier); default mode gives permission_denied or sandboxOverride. Delivery routes: the plugin root drops `sandbox`; `settings.read` sets only `enabled` and `allowUnsandboxedCommands`. 2.1.326: present (allowUnsandboxedCommands; binary string search).
  Basis: measured.
  Source: openspec/specs/sandbox/spec.md:73.

- [ ] **CTX-402** Reported sandbox facts: the sandbox silently drops `--model` outside `availableModels` and runs Sonnet 5.5; `grep` is ugrep (rejects `.{0,700}`); the sandbox creates an empty `.claude/.cc-writes`; Bun auto-reads `.env` and fails silently when denied; sandboxed `pgrep` fails "Cannot get process list"; `kill` of an outside process and `git worktree remove` of another session's worktree are refused (half-removes) on 2.1.323; classifier no-verdict messages; session cost $141.96 per day API-equivalent, "98% usage from subagent-heavy sessions", a 94%-full session $2.88; Sonnet reportedly uses up to 2-3x the tokens and time of Opus on some tasks.
  Basis: reported.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:616; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:204.

- [ ] **CTX-403** Claude Code built-ins ask on `.claude/`, `.git/hooks/`, Write/Edit of plugins/, and `rm -rf` of `/` or `~`, but not on a Bash write into `plugins/<name>/hooks/`; they deny `rm` whose target ends `$dir/`, `$dir/*`, or is `$(...)`; `$.fs.exists` refuses the grep pattern `/\.git/` as a network location.
  Basis: read, measured.
  Source: openspec/specs/permission-policy/spec.md:498; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:204.

- [ ] **CTX-404** `-p` sessions have no `AskUserQuestion` (27 tools listed); a relative `--plugin-dir` in `-p` silently loads nothing. 2.1.326: present (AskUserQuestion, --plugin-dir; binary string search).
  Basis: measured 2.1.319.
  Source: external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:35 (a relative `--plugin-dir` loaded 0 plugins). On 2.1.327 `AskUserQuestion` has an `isEnabled` gate `hme()` (`surface` tool, chunk-1vttvse2.js); the 27-tool count for `-p` was not re-run.

- [ ] **CTX-405** The denial text names every plugin that hooks the tool, not the deciding one; an engine `ask` that nothing made can become `allow` by a hook; a `tool.check` deny arrives at `tool.call` as `isError`; a non-zero Bash exit is stored `is_error: true`; `Stop`/`SubagentStop` `background_tasks` is session-wide; a synchronous subagent's background command ends at its final response.
  Basis: measured 2.1.319.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:30; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:407.

## Research and Studies

- [ ] **CTX-406** Study and benchmark claims, cited second-hand and not verified: ETH Zurich (2602.11988): AGENTS.md-style and LLM-generated context files did not raise success versus none and added more than 20% inference cost (about 20% more); human-written improved about 4%; content matters, not existence, and a human-written harness beats machine-generated context; Vercel removed 80 percent of its agent's tools: success went from 80 to 100 percent, token use fell by more than half, latency fell from 724 to 141 seconds, and Microsoft reportedly cut 100 tools to 5; 10 memory systems on BEAM 100K: top two 70.1%/67.8% against full context 69.5%, BM25 55.3%, claude-mem 51.5%, CIs ~10 points (retrieval beat bulk context; layers cause anchoring; no repo action).
  Acceptance: The figures hold as the posters cite them; no source paper was opened. Verification: inspection.
  Basis: cited, secondhand, unverified. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xlo7ls-i-benchmarked-10-opensource-ai-m-20261102T084707Z.md:31 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xlo7ls/i_benchmarked_10_opensource_ai_memory_systems_on/>); external/2026-10-30/reddit.com-r-claudeai-comments-1xjcfjs-how-to-build-a-harness-that-actu-20261030T165702Z.md:40 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xjcfjs/how_to_build_a_harness_that_actually_improves/>); external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:64.

- [ ] **CTX-407** Prefix-changing events, measured on claude 2.1.316 in one version: `/model` or plan mode under opusplan; MCP enable/disable with `ENABLE_TOOL_SEARCH=false` (first difference at tools[22]; the env is present in 2.1.326, binary string search); the first request after `/compact` (system[0] differs: the cc_version suffix derives from the first user message); CLI upgrade (system[0] billing header carries cc_version). Handover on 2.1.319 (fake API): the first request is byte-identical in system, tools, model, thinking, metadata, messages[0]; only messages[1] (the engine environment block) differs.
  Basis: measured.
  Source: openspec/specs/prompt-cache/spec.md:66.

- [ ] **CTX-408** Factored verification (CoVe, arXiv 2309.11495, <https://arxiv.org/abs/2309.11495>): the model drafts, plans verification questions, answers each in a fresh prompt that does not see the draft, then revises; on Llama 65B FactScore went from 55.9 to 71.4, and factored beat joint. It targets hallucinated facts, not agreement, and costs 3 or more calls. Abstract level only, numbers unverified.
  Basis: cited (abstract level only).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:23.

- [ ] **CTX-409** Drift measurement benchmarks (measurement only, no mitigation): SEQUOR (preprint) has 1,400 conversations of 50 turns on 10 open models plus Gemini 3.1 Flash Lite; per-turn accuracy falls in every regime, the Add regime by 63% on average and Tuples by 38%, and Replace regimes recover when a constraint is swapped; the paper has internal inconsistencies (abstract 11% against body 26%). Multi-IF has 4,501 prompts in 8 languages on 14 models, o1-preview 0.877 to 0.707 from turn 1 to 3 (snippet). IFEval++ shows up to a 61.8% drop under nuanced variation on 46 models (starting doc). Cited as arXiv 2410.15553 (<https://arxiv.org/abs/2410.15553>), arXiv 2605.06353 (<https://arxiv.org/abs/2605.06353>) and <https://aclanthology.org/2026.acl-long.354/>.
  Basis: cited (snippets and a starting doc; not all read in full).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:36.

- [ ] **CTX-410** Prompt repetition (repeat the whole prompt twice; Leviathan et al., arXiv 2512.14982, <https://arxiv.org/abs/2512.14982>, a Google preprint): 7 models including Claude 3 Haiku and 3.7 Sonnet on 7 benchmarks, wins judged at McNemar p<0.1. With no reasoning: 47 wins of 70 pairs and 0 losses. With reasoning on: 5 wins of 28 and 1 loss. Gemini 2.0 Flash-Lite NameIndex went 21.33 to 97.33 on an author-designed task. Early-2025 models; the note rates it likely nil on a reasoning model, at the cost of extra prefill tokens.
  Basis: cited (preprint, author-designed task).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:34.

- [ ] **CTX-411** Coverage gap in the sycophancy community research: for Codex, Aider, SWE-agent and OpenHands the finding is not established. One arXiv paper (2510.21413, <https://arxiv.org/abs/2510.21413>) says AGENTS.md-style files are added to each prompt, and a vendor blog says OpenHands loads it per task; the author found nothing these tools built against agreement without evidence.
  Basis: reported (not read in source).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:29.

- [ ] **CTX-412** Test-and-gate papers named in the settings review: TDD Governance (Hasanli et al., EASE 2026; arXiv 2604.26615, <https://arxiv.org/abs/2604.26615>) is a position paper with no numbers and a repair cap of N=3. TDAD (Rehan; arXiv 2603.08806, <https://arxiv.org/abs/2603.08806>): hidden tests caught gaming, and failed runs often passed over 95% of the visible tests. GTDD (Kato, named "GTTD" in the request; arXiv 2610.02952, <https://arxiv.org/abs/2610.02952>): a fresh audit after commit needs 54 cases against 475 for known fixed tests (Table 2), and dynamic informed tests beat static LLM tests by 0.131 (Table 6); one task, one small model. Consort (Hartman; arXiv 2609.09671, <https://arxiv.org/abs/2609.09671>): analytic, no data; "a control that the worker can choose to ignore is not a control when the worker is non-deterministic"; tests immutable within a unit of work. BDD scenario generation (Rathnayake et al.; arXiv 2603.04729, <https://arxiv.org/abs/2603.04729>) benchmarks scenario writing, not an agent workflow.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1210-1217.

- [ ] **CTX-413** Commenters cite papers for prompt tricks without a result: arXiv 2205.11916 (<https://arxiv.org/abs/2205.11916>) and arXiv 2312.16171 (<https://arxiv.org/abs/2312.16171>) as "actual scientific papers" showing that manipulating prompts "like" the thread's trick has worked in the past; arXiv 2510.04950 (<https://arxiv.org/abs/2510.04950>) for "I thought models performed better when you're rude to them?". No line states a model or a number.
  Basis: reported (papers not opened).
  Source: external/2026-10-21/reddit.com-r-claudeai-comments-1s5wp0g-ive-been-gaslighting-my-ai-model-20261020T044555Z.md:763-765 (url: <https://www.reddit.com/r/ClaudeAI/comments/1s5wp0g/ive_been_gaslighting_my_ai_models_and_its/>); external/export-Introducing Claude Opus 5.5, the first model in our new Claude 5.5 family.jsonl:178 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wnecg9/introducing_claude_opus_55_the_first_model_in_our/>).

- [ ] **CTX-414** A commenter on a turn-limit thread cites arXiv 2602.07338 (<https://arxiv.org/abs/2602.07338>; GPT-4o-mini, GPT-5.2, DeepSeek-v3.2-Thinking, Feb 2026) with the quote "GPT-5.2 drops from a near-perfect 92.7% to 48.5%", and reads it as little model improvement in this area, with the cause more likely in training and in how chat architecture has been standardized.
  Basis: reported (one commenter's reading; paper not opened).
  Source: external/export-What the hell is a turn limit (200-turn limit) and why are subagents suddenly hitting them-.jsonl:8 (url: <https://www.reddit.com/r/ClaudeCode/comments/1woaxj7/what_the_hell_is_a_turn_limit_200turn_limit_and/>).

- [ ] **CTX-415** Dossier S41, "Accountable Agents in Software Engineering: An Analysis of Terms of Service and a Research Roadmap" (arXiv 2605.04532, <https://arxiv.org/abs/2605.04532>, May 2026): it examines 14 policy documents across nine coding-assistant and agent providers, covering responsibility, liability, ownership and acceptable use, and shows the gap between rising autonomy and contractual accountability. It is a policy analysis, not evidence that a particular Claude action breached a particular contract, and not a substitute for the terms in force at the incident date.
  Basis: cited (paper text).
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:369-371.
