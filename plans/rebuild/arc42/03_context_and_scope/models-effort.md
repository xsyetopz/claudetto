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
  Source: external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:121 (Opus 5.5 high is the new xhigh) and external/export-Token optimization from Anthropic- choosing the right effort level to the task.jsonl:9. The article "Spending your effort" itself was not found; the article claim is Dropped (2026-11-18): no source located in external/, openspec/, reports/, git history or the user's transcripts.

## Models And Effort

- [ ] **CTX-727** A poster on the 20x plan (confounded) used about 5 of 7 weekly days on Opus medium, 3.5 days with 45% done on Opus low, 6.25 days with 95% done on Sonnet low (inferred: low effort causes retries). One build per approach with hidden tests: consensus that a detailed prompt beats skill packs on Opus 5.5 (opinion, no repeat runs). A vendor audit skill at high effort exhausted three 5-hour windows in about 10 minutes (second-hand, kept as reported; the burn rate needs a paid run, subagent cache about 5 min against main about 1 h, second-hand); a two-pass audit (cheap architecture map, then one file at a time) cuts cost.
  Acceptance: the cited posts state the figures. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/export-What am I missing by only using sonnet when it comes to coding-.jsonl (url: <https://www.reddit.com/r/ClaudeAI/comments/1wpxt1c/what_am_i_missing_by_only_using_sonnet_when_it/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkrwiv/i_tried_running_the_cloudflare_securityaudit/>). Not located: the line numbers and the skill-pack build comparison.

## Models And Effort

- [ ] **CTX-728** Task 3.1a, 120 sessions per arm, passed/failed and cost: built-in 120/0 ($2.14), suite 120/0 ($1.06), haiku 120/0 ($0.03), sonnet 114/6 ($0.25, all six failures push-after-no-push). Total $3.48, 13.7M tokens (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:66.

## Models And Effort

- [ ] **CTX-729** Hybrid setup: Fable in the main feed does architecture, a local Qwen3.8 inside the Claude Code terminal does about 60% of implementation, and session limits are rarely hit.
  Basis: reported (a user report from the field, kept as reported; the figure comes from the author's own account and plan, and a run needs the live API and a paid session). Status: not applicable (outside fact).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:167 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/>).

## Models And Effort

- [ ] **CTX-730** One commenter says to use max effort, not xhigh, for research-style discussion, for better sourcing and thoroughness.
  Basis: reported (one commenter; the original poster uses xhigh and will trial max). Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claude-comments-1xnxqdv-opus-55-is-a-perfect-model-for-wor-20261105T084439Z.md:354,358 (url: <https://www.reddit.com/r/claude/comments/1xnxqdv/opus_55_is_a_perfect_model_for_work_but_i_cant/>).

- [ ] **CTX-731** One commenter guesses that medium effort on Opus 5.5 gives "like 85-90%" of the quality of high for far fewer tokens on everyday back and forth, and says high makes sense for complex reasoning or code that must be bulletproof.
  Acceptance: Resolved 2026-11-18 as reported by one Reddit commenter. Opus 5.5 was measured on the same 12 lookup tasks (paid run, 2.1.327, 3 runs each): medium and high each answered 36 of 36, at a median $0.0449 and $0.0430 per task and 7.15 s and 7.25 s, so on Opus high costs about the same as medium. The Sonnet 5.5 analogue was measured (paid run, 2.1.327, 12 graded code-lookup tasks, 3 runs each, reports/2026-11-18-research/paid-labs/README.md): medium and high each answered 36 of 36 correctly, with high at 1.8x the median cost. On lookup tasks medium loses no accuracy; harder reasoning tasks were not graded.
  Basis: reported, one commenter, no measurement. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh65oe-opus-55-high-vs-medium-20261028T060145Z.md:37 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xh65oe/opus_55_high_vs_medium/>).

- [ ] **CTX-732** Sonnet 5.5 at high effort consumed about 1.9x the tokens of medium, as shown by Claude itself and the poster's own test, so Opus may be cheaper per task than Sonnet at high; another commenter disputes this for their use case.
  Acceptance: Resolved 2026-11-18, measured (paid run, Sonnet 5.5, 2.1.327, 12 code-lookup tasks, 3 runs each, reports/2026-11-18-research/paid-labs/README.md). High used a median of 54.7k tokens per task against 39.4k at medium (1.39x, cache reads included) and cost 1.8x the median ($0.0169 against $0.0093), with equal accuracy (36/36 each). The 1.9x figure matches the cost ratio, not the token ratio. Opus 5.5 on the same tasks cost a median $0.0449 at medium and $0.0430 at high, about 2.5x Sonnet at high, so Opus is not cheaper per task than Sonnet high on lookups. Sonnet pays for high effort (1.8x) and Opus does not (about 1x).
  Basis: reported, one user (disputed by another). Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-28/reddit.com-r-claudecode-comments-1xhechu-is-sonnet-55-medium-worth-it-20261028T060702Z.md:101; external/2026-10-28/reddit.com-r-claudecode-comments-1xhechu-is-sonnet-55-medium-worth-it-20261028T060702Z.md:93 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xhechu/is_sonnet_55_medium_worth_it/>).

## Models And Effort

- [ ] **CTX-733** claudetto shall treat these relayed benchmarks as directional: Haiku 5.5 high found 44 of 48 files vs Opus 45 for $0.44 vs $6.17 (one user, 6 tasks); Haiku xhigh 3x cost for same files; Haiku flagged 30 correct sentences as errors; Sonnet medium ~15 points below high at 48% cost; Opus xhigh +1.4 points for 2.5x high; Opus low much worse for defect search; Fable advisor +1.7 points for 2.1x; Haiku subagents -15 F1 vs Sonnet subagents on judgment. Personal benchmark (25 tasks, 1-3 runs, small): Opus 5.5 100% ~$0.09/task 27 s; Sonnet 5 100% $0.11 61 s; Opus 5 100% $0.19 47 s; Fable 5.1 100% $0.26 41 s; Haiku 4.5 76% $0.10 78 s; low effort ~20% cheaper ~30% faster with no loss. Opus 5.5 guide (cited by poster): 5.5 medium matched/beat Opus 5 high; default effort medium; Anthropic removed >80% of Claude Code system prompt for Opus 5-class with no coding-eval loss. Terminal Bench: Sonnet 5.5 70.6 vs Opus 5.5 66.4; AA run Opus high 64.2% $3.88 vs Sonnet xhigh 61.5% $5.30. DEFLATE (single run, medium): Opus passed 4055 tests 507 MB/s 10m18s $2.08; Sonnet 447 MB/s 3m41s $0.52. Haiku 5.5 86-question: Haiku 84.7, fastest 3.5 s, weak on tool calling/safety; 18/18 made-up bugs, tomlkit 3/3, cachetools 3/3, humanize 0/3; 37% of tasks flip across identical runs. Small bug fixes (30 runs, hidden tests, 5 setups): all passed, Opus ~16x Haiku cost; harder bug gap shrank, Sonnet won. Fable 5.2 (2026-11-09): up to 30% faster, fast mode up to 2.5x; one comparison Fable 74% at $0.062 vs Opus 68% at $0.028. Effort opinions: medium daily, high for review/blueprint, xhigh overthinks, max overthinks easy tasks; Anthropic docs say highest settings can cause worse, longer outcomes (unverified). Mythos/CVP: Opus 5.5, Sonnet 5.5, Fable 5.x reported excluded, Mythos 5.1 by email, same draw as Fable; not priced for this account except Athena (project CLAUDE.md). Releases/tiers as posted (Fable 5.5 market 44%, "Opus 5.5 = Fable 5.1 at ~60% cost") are not pricing sources. Harness effect: GPT-5.6 Terra 79% in Codex vs 47% via Claude Agent SDK (reported). Models: verified on 2.1.327 (`surface` model): ids `claude-opus-5-5` (chunk-pmhjgtb5.js@2208), `claude-sonnet-5-5` (@1622), `claude-haiku-5-5` (@1894), `claude-fable-5`, `-5-1`, `-5-2` (@2366, @1732, @1786) and `claude-mythos-5`, `-5-1`, `-5-2` (chunk-jtw26wbb.js@583, @601, @621) are present, and the `[1m]` forms exist for Opus 5.5 and Sonnet 5.5 (chunk-18d5r2hb.js@271909, @272031).
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

- [ ] **CTX-847** On claude 2.1.327 the effort sent in `output_config.effort` resolves as follows:
  - Within one settings file, `modelSettings.<model>.effortLevel` wins over the top-level `effortLevel`. A file with `effortLevel` high and a saved low for Opus 5.5 sent low.
  - Across files, the higher-precedence file wins. A project `modelSettings` low plus a `--settings` `effortLevel` high sent high.
  The docs give medium as the default effort for Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.2. They also say Claude Code saves levels for supported models. REQ-SETUP-006 already writes per-model levels, so it needs no extra step; a top-level `effortLevel` written alone would lose to a level saved in the same file. A thread reports a fifth level, `max`, for Opus 5.5. The docs accept `max` in `maxEffortLevel` but not in `effortLevel`.
  Acceptance: a setup change that writes effort writes it per model in `modelSettings`. Verification: probe.
  Basis: measured (four probe arms, cc-inspect cli on a fake API, 2026-11-18); cited (clawdipedia configure/settings/model and configure/models-and-providers/effort-thinking-and-fallback, Claude Code 2.1.327). Status: n/a (Claude Code behaviour).
  Source: reports/2026-11-18-research/surface-probes/settings-probes.md; <https://clawdipedia.cc/configure/settings/model>; external/2026-11-18/reddit.com-r-claudeai-comments-1xzaylf-what-is-the-difference-in-effort-20261118T120449Z.md:69 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xzaylf/what_is_the_difference_in_efforts_for_opus_55/>); reports/2026-11-18-research/dossier.md:160.

- [ ] **CTX-848** One-task comparison at medium effort measured with ccusage (reported, n=1 task, one user): Fable 5.2 $4.27 and 3.86M tokens, Sonnet 5.5 $1.98 and 6.66M, Opus 5.5 $5.15 and 11.94M; the poster's score was 3.82 of 5 for Fable and 3.36 for Opus. All models waited for approval before a commit and before using the screen. This conflicts with three comments that Fable 5.2 costs more usage than Opus 5.5, thinks for about 20 minutes on one import and burns quota fast; the thread data shows Fable cheaper per task but slower, so cost and latency need separate measurement in plan-window units (REQ-COST-046).
  Acceptance: no routing rule cites either side as fact; a rule that picks Fable or Opus for the root session cites a measurement in plan-window percent on claudetto's own task. Verification: inspection.
  Basis: reported (n=1 task; comments n=4). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudecode-comments-1xyp4h6-mildly-interesting-oneshotprom-20261117T224734Z.md:36-37,50-53,67-90 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xyp4h6/mildly_interesting_oneshotprompting/>); external/2026-11-18/reddit.com-r-claudecode-comments-1xxikj2-fable-52-is-lazy-and-makes-swe-20261117T183133Z.md:94; reports/2026-11-18-research/dossier.md:162,163.

- [ ] **CTX-851** Claude Code 2.1.327 keeps every earlier thinking block in context. Whenever a request has thinking on, it sends the context edit `{type: "clear_thinking_20251015", keep: "all"}` (`nNn({hasThinking})`, chunk-m14bt1pz.js@1895932, called at @3281600). The value is fixed in code, for every thinking model, with no setting or environment variable to change it. A user report says Fable 5.2 "context poisons itself": a wrong idea in its thinking stays in context and steers later turns. The mechanism is real and applies to all models, not only Fable. The fix in claudetto's control is to end the context, not to edit it: renewal at task boundaries (ADR-0178) and short-lived workers (REQ-DELEGATION-065) drop old thinking, and a review runs in a fresh subagent whose context holds none of the author's thinking. The same report and its thread add three things the plan already covers: a model that says "you're right, I overstated" when challenged, without checking (REQ-REPLY-045, OUT-166); a model that asks again a question it has already recorded as answered (REQ-HANDOVER-068 carries decisions forward; within a session the answer is in context); and one user who keeps context under 400,000 tokens and reports no drift (CTX-445). One user's three-way refactor (Fable 5.2, Opus 5.5, a third-party model) found Fable introduced more regressions at higher cost (n=1, one user's account, kept as reported) and does not change routing: Fable and Opus stay root-session models (CTX-733, CTX-848).
  Acceptance: no claudetto prompt or hook tries to remove thinking blocks from context; handover and worker design are the only answer to thinking carried across turns. Verification: inspection.
  Basis: code read (claude 2.1.327, cc-inspect `code search` "clear_thinking" and "nNn({", 2026-11-18); reported (Discord thread, n=1 per claim). Status: n/a (Claude Code behaviour).
  Source: chunk-m14bt1pz.js@1895932 and @3281600 (claude 2.1.327); user-pasted Claude Discord log, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:4010).

## External Sweep, 2026-11-18

- [ ] **CTX-860** A cited 65-day analysis of more than 43,000 Claude Code invocations reports that 39% of Fable 5 calls got zero thinking tokens, with a median of 123. On claude 2.1.327 a model in adaptive thinking mode decides its own thinking per request (OUT-093), so a low thinking count is the model's choice at that effort, not a client budget; effort is the lever claudetto sets.
  Basis: reported (third-party, a quoted post; method not shown).
  Source: external/export-It's time to cancel your subscriptions - Anthropic is silently nerfing Claude's reasoning budget whi.jsonl:2.

- [ ] **CTX-861** Effort-ladder measurements. Three Opus 5.5 agents fixed one bug round in parallel worktrees: xhigh 88 min, high 67, medium 44; medium broke an unrelated part, high fixed everything, xhigh also caught two wrong premises in the orchestrator's instructions. One enterprise user's evals put xhigh about 10% more satisfying than high at much higher cost. Haiku 5.5 at max used 285 requests and about $1.50 against 54 requests and $0.21 at high with no correctness gain. Sonnet 5.5 at max thought for 300K tokens without output on one batch run. One commenter's 13 effort and role variants found xhigh best. This supports REQ-DELEGATION-047: high by default, xhigh for planning and for escalation on faulty or ambiguous instructions, no max, and a Haiku ceiling of high.
  Basis: measured (third-party, single tasks or small tests, numbers shown) except the 13 variants and the 300K run, which are reported.
  Source: external/2026-09-29/export-opus 5.5 usage is honestly great. ~7 agents nonstop since sunday reset, 76% left (20x).jsonl:22; external/2026-10-21/reddit.com-r-claudeai-comments-1xbfyi5-what-are-your-experiences-with-t-20261021T101643Z.md:90; external/2026-10-11/export-Is Haiku 5.5 good enough to be your main coding agent, not just the cheap one- I ran a small control.jsonl:58; external/2026-10-17/export-Is it just me, or does Claude Code take hours to finish a task when prompt contains to self-review-.jsonl:4; external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xckkpr-are-superpowers-skills-and-sdd-s-20261102T084956Z.md:269.

- [ ] **CTX-862** Ultracode is an orchestration prompt, not an effort level; one commenter estimates it would have used 40-50x the tokens of a normal run against a stated 3.5x, and another cites a video in which the same prompt cost $48 at max and $348 with Ultracode. claudetto does not turn Ultracode on by default (REQ-DELEGATION-047, CTX-286, CTX-288).
  Basis: reported (third-party estimate and a cited comparison; figures not shown).
  Source: external/2026-10-17/export-Don't use Ultracode.jsonl:14; external/2026-10-17/export-Hey is it me or does ultracode use lesser tokens than max.jsonl:13.

- [ ] **CTX-891** Browser work routed to a cheap subagent: one user defines a `browser-runner` agent in `~/.claude/agents`, sends all browser work there from the global CLAUDE.md, and uses Haiku to read pages and find elements and Sonnet for clicks and forms, because repeated rereads of page content pile up against the weekly limit even on cache hits. Matches the plan's cheap-model routing for read-heavy work (Fable and Opus never subagents).
  Basis: reported (one user, no counts).
  Source: external/2026-11-18_p2/reddit.com-r-claude-comments-1xufj43-claude-in-chrome-save-tokens-20261118T183349Z.md:40.
