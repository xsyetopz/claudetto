# models-effort

## Models And Effort

- [ ] **CTX-724** `showThinkingSummaries` on against off, two runs each at effort high: output 187 and 275 against 144 and 164 tokens; thinking 94 and 143 against 84 and 91. No separate charge, under $0.0001 per Haiku call; noise cannot be separated at n=2
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:814.

- [ ] **CTX-725** `alwaysThinkingEnabled` false cannot turn thinking off on the -5-5 models: the setting makes the config disabled, but the catalog capability `rejects_disabled_thinking` turns it back to adaptive. The same holds for `MAX_THINKING_TOKENS=0`, `--thinking disabled`, and a project file, on opus and sonnet. Only `CLAUDE_CODE_DISABLE_THINKING=1` removes the field, and the real API accepted a haiku-5-5 request without it (1 turn, 17,194 prompt tokens, 42 output, $0.00346)
  Basis: measured, paid.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1305.

## Models And Effort

- [ ] **CTX-726** An article "Spending your effort" and commenters say: Opus 5.5 high is the new xhigh and medium the default; Fable 5.1 low is cost-effective; thinking cannot be disabled, so start low and measure; lowering effort cuts thinking more reliably than prompt wording. Second-hand points of the Opus 5.5 prompting guide: drop "think carefully", name exact styles to ban, look around before acting.
  Acceptance: a read of the article and the guide confirms each point. Verification: inspection.
  Basis: reported (cited via link, not read). Status: have at 088a227c.
  Source: unresolved: the article "Spending your effort" and the guide were not found in external/ or openspec/.

## Models And Effort

- [ ] **CTX-727** A poster on the 20x plan (confounded) used about 5 of 7 weekly days on Opus medium, 3.5 days with 45% done on Opus low, 6.25 days with 95% done on Sonnet low (inferred: low effort causes retries). One build per approach with hidden tests: consensus that a detailed prompt beats skill packs on Opus 5.5 (opinion, no repeat runs). A vendor audit skill at high effort exhausted three 5-hour windows in about 10 minutes (unmeasured; subagent cache about 5 min against main about 1 h, second-hand); a two-pass audit (cheap architecture map, then one file at a time) cuts cost.
  Acceptance: the cited posts state the figures. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/export-What am I missing by only using sonnet when it comes to coding-.jsonl (url: <https://www.reddit.com/r/ClaudeAI/comments/1wpxt1c/what_am_i_missing_by_only_using_sonnet_when_it/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkrwiv/i_tried_running_the_cloudflare_securityaudit/>). Not located: the line numbers and the skill-pack build comparison.

## Models And Effort

- [ ] **CTX-728** Task 3.1a, 120 sessions per arm, passed/failed and cost: built-in 120/0 ($2.14), suite 120/0 ($1.06), haiku 120/0 ($0.03), sonnet 114/6 ($0.25, all six failures push-after-no-push). Total $3.48, 13.7M tokens (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:66.

## Models And Effort

- [ ] **CTX-729** Hybrid setup: Fable in the main feed does architecture, a local Qwen3.8 inside the Claude Code terminal does about 60% of implementation, and session limits are rarely hit.
  Basis: reported, n=1, unmeasured. Status: not applicable (outside fact).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:167 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/>).

## Models And Effort

- [ ] **CTX-730** One commenter says to use max effort, not xhigh, for research-style discussion, for better sourcing and thoroughness.
  Basis: reported (one commenter; the original poster uses xhigh and will trial max). Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claude-comments-1xnxqdv-opus-55-is-a-perfect-model-for-wor-20261105T084439Z.md:354,358 (url: <https://www.reddit.com/r/claude/comments/1xnxqdv/opus_55_is_a_perfect_model_for_work_but_i_cant/>).

- [ ] **CTX-731** One commenter guesses that medium effort on Opus 5.5 gives "like 85-90%" of the quality of high for far fewer tokens on everyday back and forth, and says high makes sense for complex reasoning or code that must be bulletproof.
  Acceptance: The fact holds on claude 2.1.326 (unverified in 2.1.326); this is a guess with no measurement, so a probe may only bound it. Verification: probe.
  Basis: reported, one commenter, no measurement. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh65oe-opus-55-high-vs-medium-20261028T060145Z.md:37 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xh65oe/opus_55_high_vs_medium/>).

- [ ] **CTX-732** Sonnet 5.5 at high effort consumed about 1.9x the tokens of medium, as shown by Claude itself and the poster's own test, so Opus may be cheaper per task than Sonnet at high; another commenter disputes this for their use case.
  Acceptance: The fact holds on claude 2.1.326 (unverified in 2.1.326); a probe compares tokens per task at medium and high. Verification: probe.
  Basis: reported, one user (disputed by another). Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-28/reddit.com-r-claudecode-comments-1xhechu-is-sonnet-55-medium-worth-it-20261028T060702Z.md:101; external/2026-10-28/reddit.com-r-claudecode-comments-1xhechu-is-sonnet-55-medium-worth-it-20261028T060702Z.md:93 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xhechu/is_sonnet_55_medium_worth_it/>).

## Models And Effort

- [ ] **CTX-733** claudetto shall treat these relayed benchmarks as directional: Haiku 5.5 high found 44 of 48 files vs Opus 45 for $0.44 vs $6.17 (one user, 6 tasks); Haiku xhigh 3x cost for same files; Haiku flagged 30 correct sentences as errors; Sonnet medium ~15 points below high at 48% cost; Opus xhigh +1.4 points for 2.5x high; Opus low much worse for defect search; Fable advisor +1.7 points for 2.1x; Haiku subagents -15 F1 vs Sonnet subagents on judgment. Personal benchmark (25 tasks, 1-3 runs, small): Opus 5.5 100% ~$0.09/task 27 s; Sonnet 5 100% $0.11 61 s; Opus 5 100% $0.19 47 s; Fable 5.1 100% $0.26 41 s; Haiku 4.5 76% $0.10 78 s; low effort ~20% cheaper ~30% faster with no loss. Opus 5.5 guide (cited by poster): 5.5 medium matched/beat Opus 5 high; default effort medium; Anthropic removed >80% of Claude Code system prompt for Opus 5-class with no coding-eval loss. Terminal Bench: Sonnet 5.5 70.6 vs Opus 5.5 66.4; AA run Opus high 64.2% $3.88 vs Sonnet xhigh 61.5% $5.30. DEFLATE (single run, medium): Opus passed 4055 tests 507 MB/s 10m18s $2.08; Sonnet 447 MB/s 3m41s $0.52. Haiku 5.5 86-question: Haiku 84.7, fastest 3.5 s, weak on tool calling/safety; 18/18 made-up bugs, tomlkit 3/3, cachetools 3/3, humanize 0/3; 37% of tasks flip across identical runs. Small bug fixes (30 runs, hidden tests, 5 setups): all passed, Opus ~16x Haiku cost; harder bug gap shrank, Sonnet won. Fable 5.2 (2026-11-09): up to 30% faster, fast mode up to 2.5x; one comparison Fable 74% at $0.062 vs Opus 68% at $0.028. Effort opinions: medium daily, high for review/blueprint, xhigh overthinks, max overthinks easy tasks; Anthropic docs say highest settings can cause worse, longer outcomes (unverified). Mythos/CVP: Opus 5.5, Sonnet 5.5, Fable 5.x reported excluded, Mythos 5.1 by email, same draw as Fable; not priced for this account except Athena (project CLAUDE.md). Releases/tiers as posted (Fable 5.5 market 44%, "Opus 5.5 = Fable 5.1 at ~60% cost") are not pricing sources. Harness effect: GPT-5.6 Terra 79% in Codex vs 47% via Claude Agent SDK (reported). Models: the model list is unverified in 2.1.326.
  Acceptance: No model choice rests on one number; the settled decision "Fable and Opus are never a subagent model" (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)) stands. Verification: inspection.
  Basis: reported. Status: unchecked: a relayed benchmark, not code at 088a227c.
  Source: external/2026-10-12/export-I tested Haiku 5.5, Sonnet 5.5 and Opus 5.5 as subagents on 6 real tasks.jsonl:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1x1nsaz/i_tested_haiku_55_sonnet_55_and_opus_55_as/); external/2026-10-02/export-100$ plan - holy sh-.jsonl:101; external/2026-10-02/export-100$ plan - holy sh-.jsonl:67 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wvdodf/100_plan_holy_sh/>).

- [ ] **CTX-734** Compaction cost: a handoff adds a 376-byte notice and one continuation request (23,588 B); the built-in compaction adds one request of +6,535 B over a normal turn; both carry `cache_control`; the summarizer request keeps `cache_control` on the parent's last message, same model and 12 tools, no `ttl` (5 m). Handover $0.043 against built-in $0.094 at 166k tokens (one run per arm, 2.1.319). The first request after built-in compaction read 5,819 and wrote 19,448 at 1 h; after a typed `/clear` it read 5,819 and wrote 7,101. A Haiku fork costs about $0.10 per million against $0.17 for `/compact`. No B arm was cheaper than C in 3 paired paid runs ($0.88-3.47 per run). Probe 5 had 5 compactions in one turn, $2.34, 64% cached input read. API compaction overshoots its trigger by up to 7,269 tokens. Real probes 1-4 never compacted because the model redirected large output to files.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:139; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:160; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:38; openspec/changes/2-1-325-rearchitecture/design.md:61; the 376 B, 23,588 B, and 6,535 B figures: unresolved, not found by grep.

- [ ] **CTX-735** Cache: turn 1 had a 49.6% hit (read 12,921, write 13,133, $0.1096) against turn 2 at 98.6% across `--resume` (Opus 5.5 medium, $0.1220); both write only a 1 h cache. Real sessions over 3 days: root 7,226/7,331 (98.6%), subagents 4,064/4,109 (98.9%) at or above 98%; 39 of 45 subagent misses under 50% follow `compact_boundary`, 5 a gap over 1 h; of 105 root misses 39 follow compaction, 5 a model switch, 8 a gap over 300 s. A top-level effort change mid-conversation re-wrote 81k of 101k cached prompt while a per-message change re-wrote nothing (Agent `effort` effect inferred). `CLAUDE_CODE_DISABLE_CRON=1` makes the `/loop` gate false. 40 sessions and 1,021 turns: median 5 tool steps, 50% end before step 6. Footprint: on 2.1.314 the first request's standing context was 907 chars of the MCP server. Haiku bills past 100k at 5x.
  Acceptance: rerun `probe-sub/cache.ts` over the same transcripts and get the same counts. Verification: probe.
  Basis: measured.
  Conflict: claudetto shall rely on these cache facts.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:129; openspec/changes/2-1-325-rearchitecture/design.md:131; openspec/changes/2-1-325-rearchitecture/design.md:27; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:57; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:145; openspec/specs/docs-lookup/spec.md:10 (907 chars); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (probe `/private/tmp/claude-501/probe-sub/cache.ts`, using `requestsOf`).

- [ ] **CTX-736** Prompt cache mechanics: the prefix cache is keyed on model, system prompt, project context, and history; read costs about 0.1x, a 5m write 1.25x, a 1h write 2x; every hit resets the TTL; any change earlier in the prefix (MCP reconnect reordering tools, effort or model switch) invalidates from that point; a subscription main session defaults to a 1h TTL (drops to 5m over plan limit), the API per-token 5m; editing a prompt via `/rewind` is a hit; advisor calls re-send full context uncached. Tip: `/compact` before a break longer than the TTL. Docs cited: code.claude.com/docs/en/prompt-caching. Posts disagree on whether Pro gets 5 m or 1 h; anthropics/claude-code#46829 tracks it (reported).
  Basis: cited, reported. 2.1.326: `CLAUDE_CODE_PROMPT_CACHE_TTL`, `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, `CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL` present (binary string search). Baseline: partial (59-minute age rule in `handoff.ts`; cache gate missing).
  Conflict: claudetto shall rely on these cache facts.
  Source: external/2026-10-11/export-How prompt caching works in Claude Code (and how to stop wasting tokens).jsonl:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1uih6w7/how_prompt_caching_works_in_claude_code_and_how/>); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:7; <https://code.claude.com/docs/en/prompt-caching> (not re-read); external/2026-10-11/export-How prompt caching works in Claude Code (and how to stop wasting tokens).jsonl:14 (url: <https://www.reddit.com/r/ClaudeAI/comments/1uih6w7/how_prompt_caching_works_in_claude_code_and_how/>).

## Models And Effort

- [ ] **CTX-737** Minimum Claude Code versions: Opus 5.5 2.1.280, Sonnet 5.5 2.1.284, Haiku 5.5 2.1.293, Fable 5.2 2.1.321.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:14.

- [ ] **CTX-738** An Opus orchestrator with Sonnet subagents on work larger than one context costs about a third less than one Opus session at about the same score. Haiku subagents under Opus medium cost 32% less at a pass rate about 4 points lower: on a coding set, Opus medium with Haiku medium scored 68.8% at $3.35, against Opus alone 72.1% at $4.78 and Opus low 63.0% at $1.84. It lies on the low-to-medium straight line, so it gains nothing over lowering effort.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:32; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:33; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:34; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:51.

- [ ] **CTX-739** Effort escalation: run at low or medium and re-run failures at high. Opus solved about 97% for $0.17-$0.24, against 95.3% at $0.29 all-high (about 40% saving). It needs a checker that fails bad work.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:35; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:53.

- [ ] **CTX-740** Defect-search F1 and cost: Haiku 0.577/$25; Opus with Haiku subagents 0.677/$47; Sonnet 0.760/$103; Opus with Sonnet subagents 0.831/$139; Opus medium/high 0.827/0.850 at $200/$236; Fable low/high 0.866/0.909 at $357/$563.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:41; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:50.

- [ ] **CTX-741** Coding scores: Sonnet medium 62.7%/$0.16, high 77.8%/$0.33; Opus low 74.8%/$0.35, medium 86.6%/$0.84, high 88.4%/$1.38, xhigh 91.1%/$4.11; Fable low 88.9%/$1.05, high 93.5%/$5.39. Work at Sonnet medium needs a high re-run on a failed check.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:52.

- [ ] **CTX-742** Opus on an SWE-bench Pro subset: low 87.4%/$0.11, medium 92.8%/$0.21, high 95.3%/$0.29, xhigh 96.7%/$0.74. Low is 34 points lower for defect search.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:27.

- [ ] **CTX-743** Advisor consult rate: Sonnet 5.5 at high consulted an Opus advisor on 0 of 20 SWE-bench Pro problems (3 and 4 of 20 at xhigh). Neither Haiku nor Sonnet called it on GPQA without a prompt. Opus at low consulted on 1 of 300 charts. The advisor stays disabled.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:54.

- [ ] **CTX-744** Fable 5.2 at high scored 1.9 points below Opus medium on DeepResearch Bench II at $4.82 against $1.69 per task. Fable medium beat low by 0.6, inside noise.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:55.

- [ ] **CTX-745** Fable as orchestrator cost 19% more than Opus at about the same score. Opus at low with an advisor scored 7 points lower than alone.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:28.

- [ ] **CTX-746** Raising `max_tokens` to 64,000 did not raise cost per solved task. Opus solved 57.6% at 16,384 against 75.6% at 64,000.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:56.

- [ ] **CTX-747** Pasted-claim check: Opus xhigh solved 96.5% against Fable high 96.3% at $0.75 against $1.39 per solved task. Opus high 95.5% at $0.30; Fable low 94.6% at $0.39. The AA index shows Fable low 54 at $3.10 ahead of Opus high 52 at $3.46.
  Basis: cited (relayed).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:63; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:64.

- [ ] **CTX-748** `effort_cost_index` per model, with high = 1.00: opus-5 low 0.67, medium 0.76, xhigh 1.60, max 1.70; fable-5 0.60, 0.77, 1.74, 1.91. Opus 5 max against xhigh used 397,761 against 397,827 tokens (n=2).
  Basis: reported (poster's measurement).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:16 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wjr89j/claude_code_ships_a_permodel_table_of_what_each/>.)

- [ ] **CTX-749** A 650-token rule set cut cost 51% (Opus) and 55% (Sonnet) at max, and 11% and 3% at medium (18 tasks, the author's own plugin).
  Basis: reported.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:17 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wtbj8x/i_benchmarked_a_30line_claude_code_plugin_on_opus/>.)

- [ ] **CTX-750** Explore follows the main model. `CLAUDE_CODE_SUBAGENT_MODEL=haiku` needs `_FORCE=1` to cover Explore and Plan.
  Basis: cited (docs).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:26 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x0kzbh/haiku_55_is_40x_cheaper_than_opus_55_your_explore/>.)

- [ ] **CTX-751** After a prompt rule, 97-98% of subagent tokens still went to Opus, and subagents re-read files the main agent had read (one user).
  Basis: reported, one user.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:27; external/2026-10-27/reddit.com-r-claudeai-comments-1xb3ycs-stop-using-subagents-or-buying-5-20261026T132414Z.md:49 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xb3ycs/stop_using_subagents_or_buying_5x/>).

- [ ] **CTX-752** Five orchestration methods with Opus 5.5: solo Opus did best, and a second-model reviewer caught a real issue (n=1).
  Basis: reported, one poster.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:29 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wt9g4q/i_tested_five_orchestration_methods_with_opus_55/>.)

- [ ] **CTX-753** Opus as fleet orchestrator: cap parallelism at 6-8, have subagents write to files and return a short summary, dispatch atomically with a self-contained brief, delete old rules instead of adding. Only hooks act as hard gates.
  Basis: reported (anecdote).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:32 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wnmbqg/opus_55_as_a_fleet_orchestrator_early_notes_from/>.)

- [ ] **CTX-754** A/B on a 3,012-file FastAPI repo (3 tasks, 2 runs each, tokens from JSON output): cost follows the number of turns, not how much is read. Session length moves the weekly number more than effort.
  Basis: reported (small study).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:62; external/2026-11-10/reddit.com-r-claudeai-comments-1xrzdu9-i-measured-what-actually-drives-20261110T093438Z.md:29 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xrzdu9/i_measured_what_actually_drives_claude_code_cost/>)

- [ ] **CTX-755** Terminal-Bench relayed: Opus 5.5 high 64.2% at $3.88 against Sonnet 5.5 xhigh 61.5% at $5.30.
  Basis: reported (benchmark relay).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:55 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wt3baa/sonnet_55_vs_opus_55_the_terminalbench_win_is_max/>.)

- [ ] **CTX-756** A cost-focused `Agent` description halved Fable subagent counts. Fable rarely delegates with a minimal subagent tool.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:85.

- [ ] **CTX-757** Fable report style: "# Communicating clearly" asks for key points first and plain words. Claude Code docs say "Describe the outcome, not the steps" and "Skip the verification reminders".
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:86; openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:87.

- [ ] **CTX-758** Haiku 5.5 moving from low to medium halved early stops and doubled output tokens. Its stock Claude Code prompt is the largest at 8,429 chars with 5 extra paragraphs.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:77; openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:78.

- [ ] **CTX-759** The docs give no prompt token limit. Long prompts hurt Haiku at low effort, a short end reminder helps, and Fable piles up stale cautions, so delete lines whose reason no longer holds.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-guidance.md:92.

- [ ] **CTX-760** Discord reports: one user removed over 80% of rules, moved the rest to mechanical checks, and set goals and a bar, with better output, less churn, and lower usage. Another said "no point in having 100k of prompt per turn for 10 words added". In a Reddit thread on Fable as coordinator, most put Fable on architecture and review and Sonnet or Haiku on routing.
  Basis: reported (not measured).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:763.

- [ ] **CTX-761** Fable 5.2 controlled results. OpenMarkAI: Fable 74% at $0.062 and 74 s against Opus 5.5 68% at $0.028 and 40 s. Arqium adjudicator: Fable low 98, 98 against Opus 59, 98, 65, 53, about 45% more per run. Round_Ad_5832, six repos with a seeded bug: Fable 2 of 2 against Opus 0 of 2, Opus 2.1x faster. klashnkoof: Opus xhigh 51 min $19 against Fable high 58 min $29. mod-bot: Fable high 45.3% against Opus xhigh 45.5% at about half the cost. PSA advisor: Opus high with a Fable advisor 90.1% at $2.92 against Opus xhigh alone 91.1% at $4.11. SatoshiReport: about 30 issues, reopens equal, Fable 2x cost.
  Basis: reported.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/fable-vs-opus.md:14; openspec/changes/archive/2026-11-16-2-1-323/research/fable-vs-opus.md:15; openspec/changes/archive/2026-11-16-2-1-323/research/fable-vs-opus.md:16; openspec/changes/archive/2026-11-16-2-1-323/research/fable-vs-opus.md:17; openspec/changes/archive/2026-11-16-2-1-323/research/fable-vs-opus.md:18; openspec/changes/archive/2026-11-16-2-1-323/research/fable-vs-opus.md:19; openspec/changes/archive/2026-11-16-2-1-323/research/fable-vs-opus.md:20; openspec/changes/archive/2026-11-16-2-1-323/research/fable-vs-opus.md:21.
