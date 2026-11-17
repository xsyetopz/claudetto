# prompt-cache

## Prompt Cache

- [ ] **CTX-272** Subagent requests write the 5-minute cache tier unless `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` is set; the main session writes the 1-hour tier. `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h` (v2.1.242+) cut one team's subagent cache rewrites from about 8% of a week to under 2%; lean subagent context cut average tokens from about 400K to 80K on the same workflows.
  Acceptance: A log of subagent requests with the variable unset shows 5-minute writes; the team figures stay marked reported. Verification: probe.
  Basis: measured by one poster (14-day logs, 17,574 main-session requests): 41 requests sent over an hour after the previous one wrote about 225k tokens each (0.2% of requests, 15% of all cache writes); 278 requests after a 5-60 minute gap wrote about 5k each; every main-session write was 1 hour while 2,696 of 2,701 subagent requests (17.6M tokens) wrote to the 5-minute tier; a test (44k written, wait 5:45, all 44k rewritten with 0 read) confirmed the 5-minute expiry. A commenter says 5 minutes applies on an API key, Bedrock, Vertex, Foundry, or a subscription in overage, and FORCE_PROMPT_CACHING_5M forces it. The team figures are reported by commenters.
  Status: n/a (fact); no SUBAGENT_PROMPT_CACHE_TTL use at 088a227c (git grep found none). Variable present in claude 2.1.326 (code search `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`; settings text at chunk-m33vdkhs.js@275804: "Unset = automatic (5 minutes unless ENABLE_PROMPT_CACHING_1H=1)" and the variable "takes precedence"); the logs and the v2.1.242+ figure are not re-run in 2.1.326.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvr4ob-i-grouped-18629-claude-code-re-20261116T051613Z.md:81,83,87,89,93 (url: https://www.reddit.com/r/ClaudeCode/comments/1xvr4ob/i_grouped_18629_claude_code_requests_by_session/); external/2026-11-16/reddit.com-r-claudecode-comments-1xuqnnc-i-tested-anthropics-one-agent-20261116T051736Z.md:133,245 (url: https://www.reddit.com/r/ClaudeCode/comments/1xuqnnc/i_tested_anthropics_one_agent_with_skills_beats_a/).

- [ ] **CTX-273** Resetting context at 225K tokens at task end cut cost 50-75% for one poster; on one commenter's logs a warm turn at 800k costs about 2x a turn at 200k, but a cold re-write at 800k costs about 22x a warm turn.
  Acceptance: The saving is mostly on cold turns. Verification: inspection.
  Basis: reported (own logs; 24/7 agents, cache reads fell and writes stayed flat).
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuwp92-having-agents-reset-context-ar-20261116T051550Z.md:2,109,113 (url: https://www.reddit.com/r/ClaudeCode/comments/1xuwp92/having_agents_reset_context_around_225k_tokens/)

- [ ] **CTX-274** A keepalive read costs about a tenth of input price while a cache rebuild costs more, so keepalive usually wins.
  Acceptance: The claim stays reported and marked against the plan's "keep-warm costs more than it saves for idle waits (inferred)". Verification: inspection.
  Conflict: The plan line "keep-warm costs more than it saves for idle waits (inferred)" (outside this chunk) says the opposite; this item is one commenter's arithmetic, kept reported.
  Basis: reported (one commenter's arithmetic); contradicts an inferred plan line.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx5405-broken-prompt-caches-cost-me-1-20261116T050923Z.md:86 (url: https://www.reddit.com/r/ClaudeCode/comments/1xx5405/broken_prompt_caches_cost_me_106_across_57_claude/)

- [ ] **CTX-275** A 666-subagent session stalled at a cache barrier with every agent idle; the commenter's tool showed the real cost was wall-clock time, not tokens.
  Acceptance: Cost of a barrier is counted in time as well as tokens. Verification: inspection.
  Basis: reported (one commenter).
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx4fkw-token-savings-20261116T045931Z.md:52 (url: https://www.reddit.com/r/ClaudeCode/comments/1xx4fkw/token_savings/)

- [ ] **CTX-276** Tool output is the hidden token cost: a full test run or big grep is pasted once and resent with every later turn.
  Acceptance: One noisy command can cost more than all prompts; a saving is judged by per-request tokens before and after (a logging proxy or /context), not the percent bar. Verification: inspection.
  Basis: reported.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuiwi6-minimize-token-usage-20261116T052542Z.md:124 (url: https://www.reddit.com/r/ClaudeCode/comments/1xuiwi6/minimize_token_usage/)

- [ ] **CTX-277** Token tips from one thread: per-task fresh sessions with handoff files, disable unused connectors and plugins (each loads tool definitions into context; /context shows the cost, /mcp switches a server off), exact file paths instead of "find where X happens"; a counter-claim says an arbitrary handoff line limit can drop state, decisions, files and next steps.
  Acceptance: The counter-claim to a fixed handoff cap is kept beside the cap. Verification: inspection.
  Basis: reported, no measure.
  Status: n/a (fact).
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xuiun7-minimize-token-usage-20261112T231514Z.md:31,40,50,68,76 (url: https://www.reddit.com/r/ClaudeAI/comments/1xuiun7/minimize_token_usage/)

- [ ] **CTX-278** One user measured weighted tokens (cached at 1/10, 1-hour cache writes counted): 117M to hit 100% of weekly Fable usage this week against 230M in prior weeks, so the allowance was cut about half.
  Acceptance: The figure stays marked measured by one commenter, one account. Verification: inspection.
  Basis: measured, one account.
  Status: n/a (fact).
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xusayn-fable-52-uses-so-much-usage-it-20261113T000416Z.md:79,80,81,83 (url: https://www.reddit.com/r/ClaudeCode/comments/1xusayn/fable_52_uses_so_much_usage_its_basically/)

- [ ] **CTX-279** Native advisor calls use the full conversation at the advisor's model rate on top of the main model's usage; they count toward plan limits, except a Fable advisor bills to usage credits on plans where Fable usage does.
  Acceptance: The billing note is kept against the settled decision that the advisor tool stays disabled. Verification: inspection.
  Conflict: dedup/chunks/ctx-6.md:51 says one commenter reports that a Fable advisor does not draw down the separate Fable usage; this item says a Fable advisor bills to usage credits. Resolved by docs: on plans where Fable usage bills to usage credits, Fable as the advisor bills the same way, and Claude Code applies it only after the one-time consent (code.claude.com `advisor`, section "Fable advisor and usage credits", read 2026-11-17); the commenter's claim is contradicted.
  Basis: reported, one poster citing docs (not verified here). The gap text said all native advisor calls bill to usage credits; the source limits that to a Fable advisor.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwckod-fable-52-as-orchestrator-plann-20261116T052602Z.md:87 (url: https://www.reddit.com/r/ClaudeCode/comments/1xwckod/fable_52_as_orchestrator_planner_reviewer_and/); user decision, recorded in the 2026-11-17 handover (day of decision not recorded) (advisor tool stays disabled).

- [ ] **CTX-280** A 16-PR benchmark found a reported workflow at 1.81x cost against the baseline with no gain on any task and worse on 2.
  Acceptance: The figure stays marked measured by the poster, one benchmark. Verification: inspection.
  Basis: measured, one benchmark.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwckod-fable-52-as-orchestrator-plann-20261116T052602Z.md:93 (url: https://www.reddit.com/r/ClaudeCode/comments/1xwckod/fable_52_as_orchestrator_planner_reviewer_and/)

- [ ] **CTX-281** Running `/doctor prompt-audit` cut token use by 37% over 14 sessions in the last month for one commenter.
  Acceptance: The figure stays reported, verified against the docs before use. Verification: inspection.
  Basis: reported, one user.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwo8zq-what-claude-code-plugins-actua-20261116T051709Z.md:109,111 (url: https://www.reddit.com/r/ClaudeCode/comments/1xwo8zq/what_claude_code_plugins_actually_save_tokens/)

- [ ] **CTX-282** The Haiku router cut like-for-like API cost about 30% month over month for one user at $15-35 a day.
  Acceptance: The figure stays reported, no baseline shown. Verification: inspection.
  Basis: reported, one user.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx4fkw-token-savings-20261116T045931Z.md:48 (url: https://www.reddit.com/r/ClaudeCode/comments/1xx4fkw/token_savings/)

- [ ] **CTX-283** Haiku 5.5 input over 100,000 tokens bills the whole request at five times ($0.10 to $0.50 per million input; $0.50 to $2.50 output).
  Acceptance: The price-step guard withholds a result that would cross 100,000 tokens. Verification: test.
  Basis: cited (the dossier row names the guard; the price page was not re-read here). The plan states the rule as fact in two places and as unverified in a third.
  Status: have at 088a227c (HAIKU_PRICE_STEP = 100_000, "five times").
  Source: external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:24; plugins/claudetto/hooks/features/price-step/price-step.ts:15,16@088a227c.

- [ ] **CTX-284** Routing by a complexity index (Sonnet medium below 15, Sonnet high below 30, Opus medium at 30 or more) moved one project from 98% Opus to 83% Opus, 15% Sonnet, 2% Fable.
  Acceptance: The index stays one user's reported rule, set against the plan's routing by wrong-answer cost. Verification: inspection.
  Basis: reported, one user, one project. Review and research on Opus medium; web research on Sonnet medium.
  Status: n/a (fact).
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xtskai-i-switched-opus-to-medium-and-20261111T235140Z.md:69,80 (url: https://www.reddit.com/r/ClaudeCode/comments/1xtskai/i_switched_opus_to_medium_and_only_ask_fable_for/)

- [ ] **CTX-285** Hard failure rates across model runs: on the adjudicator step Opus scored 59, 98, 65, 53 over four runs (medium, low) while Fable 5.2 low scored 98 twice at about 45% more cost per run.
  Acceptance: One run proves nothing; a step needs more than one run before a model is chosen. Verification: inspection.
  Basis: measured by one author, n=2-4 runs per cell, a 4 h, about US$100 pipeline of 15 agents on law documents. Score is the weighted share of critical items; a model is cut if it lands more than 5 points below the reference. Cheaper models fail by silently omitting items, so "escalate when unsure" fails. Even the best runs missed the same 3 of 9 critical items. A cheap second reader flagged 22 of 43 top-model decisions as unsupported. Moving mechanical steps to cheaper models kept the total at about US$99 against US$103.
  Status: n/a (fact).
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xujhrk-realworld-test-opus-vs-fable-vs-20261112T231215Z.md:27,36,44,45,46 (url: https://www.reddit.com/r/ClaudeAI/comments/1xujhrk/realworld_test_opus_vs_fable_vs_sonnet_vs_haiku/)

- [ ] **CTX-286** `/usage` reported "98% of your usage came from subagent-heavy sessions". An "82% of usage from subagent-heavy sessions" warning needs a baseline: the same work in one session. Alternative: a few long-lived agents each owning one part with checkpoints (Codex experience). Usage warnings (reported): "82% of your usage came from subagent-heavy sessions"; 56% of 6 months of usage was re-reading conversation; the Projects feature can pin threads to Sonnet; Anthropic support is an AI agent; Ultracode low scope often runs only xhigh with 1-2 subagents (disputed); a Codex plugin `openai/codex-plugin-cc` exists for Codex reviews (cited via commenters); a repo with 1,652 PRs a month had 0.2-0.7% reverts and about one fix round per PR; human-in-the-loop review is only as good as the visible reasoning (cited secondhand, the Anthropic study not read).
  Acceptance: The figure stays one session's, set beside the plan's 82%. Verification: inspection.
  Basis: measured (session log c8c0cf57); reported
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:158; external/2026-10-22/reddit.com-r-claudecode-comments-1wy8sbd-use-of-subagents-or-not-20261022T122101Z.md:75 (url: https://www.reddit.com/r/ClaudeCode/comments/1wy8sbd/use_of_subagents_or_not/); unresolved: no source line located for this claim.

- [ ] **CTX-287** Models predict their own cost poorly, correlation about 0.39.
  Acceptance: Kept beside the 1000x and 30x spread. Verification: inspection.
  Basis: cited (arXiv 2604.22750).
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:169.

- [ ] **CTX-288** Max effort scored below xhigh on Sonnet 5.5. Max effort is reported to underperform xhigh (ultracode runs at xhigh); max is reported to write worse code and overthink; ultracode on Opus 5.5 spent two days over-engineering and never finished one task.
  Acceptance: Kept beside the Opus 5.5 effort scores. Verification: inspection.
  Basis: reported (catalog Cat 27:26). reported anecdotes.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:148; external/2026-10-25/reddit.com-r-claude-comments-1xclxdw-opus-55-is-so-good-remember-to-use-20261024T141513Z.md:514 (url: https://www.reddit.com/r/claude/comments/1xclxdw/opus_55_is_so_good_remember_to_use_xhigh_effort/).

- [ ] **CTX-289** Claude Code allows at most 20 background subagents at once.
  Acceptance: a 21st launch is refused. Verification: demonstration.
  Basis: measured. Status: have.
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9309).

- [ ] **CTX-290** The gate denies `sed -n`, `cat` reads and heredocs in Bash; reads go through `Read` and writes through `Write`. `just typecheck` hits EPERM in the sandbox; `bun check --no-pretty --threads 7` runs. `just test` has 2 baseline failures from `/bin/ps` denial.
  Acceptance: the commands fail as stated. Verification: demonstration.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

## Prompt Cache

- [ ] **CTX-291** Fork subagents inherit the full conversation and reuse the parent's prompt cache; non-fork subagents have a separate cache and reload the CLAUDE.md hierarchy and git status on each spawn.
  Basis: reported.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:125 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/).

## Prompt Cache

- [ ] **CTX-292** Subagent cost is the cold start, not the model: brief plus tool definitions plus reads are written to cache (the expensive token type) and re-read each turn, and files the planner read are read again, so a cheaper model helps less than expected. Use subagents only for genuinely parallel bounded jobs with a brief naming files, never nested; repo-in-head work stays in the main session.
  Basis: reported, one poster, no number.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1wy8sbd-use-of-subagents-or-not-20261022T122101Z.md:63 (url: https://www.reddit.com/r/ClaudeCode/comments/1wy8sbd/use_of_subagents_or_not/).

## Prompt Cache

- [ ] **CTX-293** Hypothesis from a commenter, untested: a cached prefix is readable only once the first response has started, so five subagents launched at once each pay the full write of the same system prompt and tools; start one first and the rest a few seconds later to turn the shared part into reads; check logs for equal write counts.
  Basis: reported hypothesis, untested.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1x97ix2-a-readonly-custom-subagent-cut-20261022T122153Z.md:82 (url: https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/).

## Prompt Cache

- [ ] **CTX-294** `promptCacheTtl`, main thread: the default already writes 1h on this login (16,833 tokens); "5m" writes 16,959 as 5m; "1h" changes nothing for the main thread. Subagents default to 5m (9,135 tokens written). `subagentPromptCacheTtl` "1h" works at $0.0366 against $0.0229, about 1.6x a 5m write, and pays only if the same subagent prefix is read again after more than 5 minutes
  Basis: measured, one run each, haiku main, sonnet subagent, 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:807; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:810.

- [ ] **CTX-295** The API reads tools, then system, then messages. CLAUDE.md, auto memory, unscoped rules, and the skill listing sit in the messages, not the system prompt. CLAUDE.md goes in once, in the first user message, and is resent as cached prefix at 5-10 percent of input, plus a full write after a miss, `/clear`, or `/compact`
  Basis: cited, clawdipedia.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:866.

- [ ] **CTX-296** Prompt caching refreshes the cache at no added cost each time cached content is used ("The cache is refreshed for no additional cost each time the cached content is used"), and the lifetime runs from the start of each request. Session age never cools the cache; an idle gap of the TTL or longer does.
  Acceptance: the docs page text matches. Verification: inspection.
  Basis: cited.
  Source: platform docs, prompt-caching page, section "How prompt caching works" (URL and retrieval date not stated by the old plan; the quote was not re-fetched in this pass; external/please-use-me-often/agent-failure-dossier/ and openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:38 hold only a Reddit summary of the prices); platform docs prompt-caching page, "How prompt caching works", read 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).

## Prompt Cache

- [ ] **CTX-297** Effort and model switch against the cache conflict: an effort switch keeps the cache on Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1 (a docs quote posted by a commenter, two commenters) while a mod author measured 56-100% rewrites on Fable 5.1 and older Opus, and others report that changing effort or model mid-session invalidates. Per-message effort change (beta) is the single-turn route. Over about 80k requests cache reads were about 76% of cost and output about 8%; effort mostly changes the tool-call count. Unverified until measured.
  Basis: reported and cited, in conflict. Status: not applicable.
  Source: unresolved: no source line located for this claim.

- [ ] **CTX-298** Prefix cache mechanics: a change earlier in the request (MCP tool list, rewritten instruction file, changed system prompt, timestamp, tool order) invalidates everything after; editing a past prompt or `/rewind` still hits up to the edit; read costs 0.1x, write 1.25x (5m) or 2x (1h). First-request prefix is identical across sessions (dev 16,333 bytes); 98.6% of root and 98.9% of subagent requests hit at 98% or more over 3 days; misses follow compaction, model switch, and gaps over 1 h or 300 s. Events that keep the prefix on 2.1.316 (measured): a skill or command added, an output style change, a Shift+Tab permission mode cycle, a file read then edit, an MCP toggle with tool search on, a subagent spawn, a rewind, a `/compact` request.
  Basis: measured, cited, and reported. Status: not applicable.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:129.

- [ ] **CTX-299** Cache TTL facts: a subscription main conversation has 1 h while inside plan usage and 5 min once on usage credits; subagents, workflows, compaction, and session titles always have 5 min; `promptCacheTtl` or `CLAUDE_CODE_PROMPT_CACHE_TTL` sets it (v2.1.242+); `ENABLE_PROMPT_CACHING_1H` and `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` set the 3 fake-API markers to ttl 1h; the bucket shows in `claude -p "hello" --output-format json` as `ephemeral_1h_input_tokens` against `ephemeral_5m_input_tokens`; a model switch mid-session reads the full history with no hits. A thread claims a 5m default with 1h per request, API 5m against subscription about 1h, and leaves it unresolved; the docs quote says the 1 h main and 5 min subagent split holds. `promptCacheTtl` is missing from setup (only `subagentPromptCacheTtl` is written).
  Basis: measured (2.1.319) and cited. Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts:118` writes `subagentPromptCacheTtl` only).
  Source: plugins/claudetto/hooks/features/setup/settings.ts:118@088a227c; external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:31.

- [ ] **CTX-300** `/advisor` reads the full transcript on each call, uncached (one commenter: about $4 for a 500k call), and the prompt cache is keyed to model, so Fable never reads the main cache. The built-in Learning output style teaches as you go (unverified). Each advisor tool call triggers a full uncached read of the whole history per decision (docs link, not opened). The advisor stays disabled. /advisor handoff makes the other model re-read context, paying a cache write again when the last call is over five minutes old; one poster logged per request on a Max 20x account that subagent progress summaries alone cost 10 to 13% of a week with no off switch. An advisor saves only when the handoff is small, cached, and rare.
  Basis: reported. Status: have at 088a227c (the setting only: `plugins/claudetto/hooks/features/setup/settings.ts:178`). reported. reported. Status: not applicable (outside fact).
  Status: have at 088a227c (the setting only: plugins/claudetto/hooks/features/setup/settings.ts:178); the advisor stays disabled
  Source: plugins/claudetto/hooks/features/setup/settings.ts:178@088a227c; external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:33; openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:130; external/2026-10-01_p2/export-PSA- you don't need Fable for everything. Set it as your -advisor instead.jsonl:3 (url: https://www.reddit.com/r/ClaudeAI/comments/1wv4cux/psa_you_dont_need_fable_for_everything_set_it_as/); external/2026-11-10/reddit.com-r-claudeai-comments-1xrh0co-sonnet-with-opus-advisor-20261109T152503Z.md:162-164 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrh0co/sonnet_with_opus_advisor/).

- [ ] **CTX-301** On 2.1.316 `DISABLE_PROMPT_CACHING=1` removes every `cache_control` marker (three per request otherwise) and `CLAUDE_CODE_ATTRIBUTION_HEADER=false` removes the `x-anthropic-billing-header` block from system. Both are present on 2.1.326 (`CLAUDE_CODE_ATTRIBUTION_HEADER` is a str); `DISABLE_PROMPT_CACHING` also has _FABLE, _HAIKU, _MYTHOS, _OPUS, and _SONNET variants (cc-inspect `surface` env, 2026-11-17).
  Acceptance: a request body shows no `cache_control` under the first and no billing block under the second. Verification: probe.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/specs/prompt-cache/spec.md:82; openspec/specs/prompt-cache/spec.md:86; openspec/specs/prompt-cache/spec.md:96; external/2026-11-03/reddit.com-r-claudeai-comments-1xksgor-things-that-quietly-break-your-p-20261102T140513Z.md:62 (url: https://www.reddit.com/r/ClaudeAI/comments/1xksgor/things_that_quietly_break_your_prompt_cache_in/); cc-inspect `surface`, claude 2.1.326, 2026-11-17.

## Prompt Cache

- [ ] **CTX-302** A main conversation on a subscription writes a 1-hour cache (measured 2.1.319); `subagentPromptCacheTtl: "1h"` puts `"ttl":"1h"` on subagent and side requests, not the main loop. The setting is present on 2.1.326 (checked: `code` search `subagentPromptCacheTtl` in 2.1.326 finds its schema entry).
  Acceptance: a request body shows the 1h marker on a subagent request after the setting is set. Verification: probe.
  Basis: measured. Status: have at 088a227c (`promptCacheTtl` setup group).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:131; openspec/specs/subagent-prompts/spec.md:112; external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:69; chunk-m33vdkhs.js@275526 (claude 2.1.326 binary).

## Prompt Cache

- [ ] **CTX-303** Task 18.26 weights input by price: read x0.1 + 1h write x2 + 5m write x1.25 + input. Clause (c), plugin at or below base, was reworded with the user because the plugin first request is 46% of base size (7.57k against 16.55k tokens; its absolute read is 5.6k against 11.2k). Result on 18.23: plugin 18760 [17801, 19931] against base 25415 [25127, 25649]; per-session cost-weighted input is 26% and 33% less than base, with bootstrap intervals that do not overlap. Per-session cache-read share: plugin sessions with no Stop block read less than base (18.23: 81.7% against 82.6% mean; 18.23b: 78.2% against 83.1%); blocked plugin sessions read more (84.2%, 85.1%). The first-request read share is higher for the plugin (72.2%, 74.6% against 67.4%) only because of that smaller first request (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:327; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-26/README.md:100-123; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-26/README.md:161-162.

- [ ] **CTX-304** In 59 of 60 plugin sessions after the first, the whole 5,624-token static prefix (tools and system) is read on request 1, and the write (about 1,940-1,948) is only messages and env. A Stop block writes 150 tokens against an exact tail of 152 (18.23, 24 blocks; the chars/4 estimate undercounts by 18); in 20c8 the write is 648 against an exact 650 (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-26/README.md:150-171.

- [ ] **CTX-305** Paid rerun with fix commit `55ba1d49` (defer only when ToolSearch is in session tools), 5 sessions (a 6th skipped to stay under 300k; 273,110 tokens, $0.145 list): turn-1 lost 0 on 5/5 rows (read about 8,430-8,444), against 3,901-3,929 lost on 33/33 rows before. This confirms that the break is a property of a `--tools` list without ToolSearch. Limits: 5 rows, empty sandboxes (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-26/README.md:175-199.

- [ ] **CTX-306** Env vars `CLAUDE_CODE_NORMALIZE_PREFIX_CACHE` (and `_VERIFY`), `CLAUDE_CODE_SUBAGENT_CACHE_EVICT` and `CLAUDE_CODE_RESUME_CACHE_WARM` exist in the 2.1.319 binary with no page on their effect and were not tested. `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` removes the mid-conversation cache marker (docs). `CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL` has the enum `5m` with no source for its effect. The `cache-keepalive-2026-09-03` beta and `/v1/messages/cache_touch` (subscriber login only) touch the cache every 30 s (cited: docs, cc-inspect).
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-26/README.md:139-141.

## Prompt Cache

- [ ] **CTX-307** Cache reads on Opus 5.5 bill at 5% of normal input price on the API, per the prompt-caching docs link a commenter cites; a second commenter claimed 60% off (that is, 40% of the price) and was corrected. How Pro counts cache reads against limits is unpublished.
  Conflict: Cache read costs 10% of fresh input. Resolved by docs: both hold per model; a cache read costs 10% of base input, 5% on Opus 5.5 and Sonnet 5.5, 2.5% on Fable 5.2, Mythos 5.2, Fable 5.1 and Mythos 5.1 (platform.claude.com `models/haiku-5-5/overview`, note under "How it compares", read 2026-11-17).
  Basis: reported, conflicting between commenters; one cites the docs, not fetched.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xdlitv-22b-cacheread-tokens-in-one-proj-20261024T061729Z.md:86; external/2026-10-27/reddit.com-r-claudeai-comments-1xdlitv-22b-cacheread-tokens-in-one-proj-20261026T133020Z.md:86 (url: https://www.reddit.com/r/ClaudeAI/comments/1xdlitv/22b_cacheread_tokens_in_one_project_normal_or_am/).

- [ ] **CTX-308** In the author's meter fits a cache read counts about 1% of a fresh input token against the subscription meters, with a separate rate per model.
  Basis: measured fit, one poster.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xdk3cn-heads-up-headless-claude-p-eat-20261024T061525Z.md:151 (url: https://www.reddit.com/r/ClaudeCode/comments/1xdk3cn/heads_up_headless_claude_p_eats_your_5hour_limit/).

- [ ] **CTX-309** Cache reads per thread are about tool calls times average context (130 calls at 150k is about 20M), so the two levers are calls per thread and context size, not a leak.
  Basis: inferred arithmetic.
  Source: external/2026-10-27/reddit.com-r-claudeai-comments-1xdlitv-22b-cacheread-tokens-in-one-proj-20261026T133020Z.md:84 (url: https://www.reddit.com/r/ClaudeAI/comments/1xdlitv/22b_cacheread_tokens_in_one_project_normal_or_am/).

- [ ] **CTX-310** A measured fixed baseline of about 80k tokens (system prompt, tools, plugin skill lists) is re-paid on every turn while project instructions are only 1-2k; plugin and skill name+description lists load every turn even when unused, so trim to the core.
  Basis: reported, self-audit by Claude.
  Source: external/2026-10-27/reddit.com-r-claudeai-comments-1xdlitv-22b-cacheread-tokens-in-one-proj-20261026T133020Z.md:55 (url: https://www.reddit.com/r/ClaudeAI/comments/1xdlitv/22b_cacheread_tokens_in_one_project_normal_or_am/).

- [ ] **CTX-311** Claim: the cache is good for an hour, so a task resumed after two hours pays the full re-read; one poster adds "never above High effort".
  Basis: reported, one poster.
  Source: external/2026-10-27/reddit.com-r-claudeai-comments-1xg2z2v-any-tips-to-avoid-using-so-much-20261027T071936Z.md:153 (url: https://www.reddit.com/r/ClaudeAI/comments/1xg2z2v/any_tips_to_avoid_using_so_much_usage/).

- [ ] **CTX-312** Running an Opus-low subagent under an Opus-medium parent is "not often worth it" because the cache is lost.
  Basis: reported, one commenter, unmeasured.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1x7i9v1-i-went-from-exhausting-claude-c-20261026T064441Z.md:97 (url: https://www.reddit.com/r/Anthropic/comments/1x7i9v1/i_went_from_exhausting_claude_codes_weekly_limits/).

## Prompt Cache

- [ ] **CTX-313** One user reports that on the 5-minute cache tier a message sent after a 5:45 wait rewrote all 44k tokens with 0 read, and that at 150k context on Opus one cold message costs about 0.75 dollars against 0.03 dollars warm. The user also says the status line JSON has prompt_cache with expires_at since 2.1.251, so a countdown can sit there.
  Acceptance: The figures hold as one user reports them; the 2.1.251 field is not checked against 2.1.326. Verification: probe.
  Basis: reported, one user. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-03/reddit.com-r-claudeai-comments-1xksgor-things-that-quietly-break-your-p-20261102T140513Z.md:80 (url: https://www.reddit.com/r/ClaudeAI/comments/1xksgor/things_that_quietly_break_your_prompt_cache_in/).
