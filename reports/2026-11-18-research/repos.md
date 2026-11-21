# Repo research: claude-code-usage-analysis and ProjectArchitect

Date: 2026-11-18. Both repos shallow-cloned and read as text only; no script was run, no dependency installed.

| Repo | Commit | Read in full | Read in part |
|---|---|---|---|
| inevolin/claude-code-usage-analysis (cua) | e9451a4334172cc5c1f0efa84c50981b814cd0ea | README.md, FINDINGS.md, SKILL.md, pricing.py, analyze.py (cache, cost, rebuild, session, role code) | docs/reference.md (grep), checks.py (grep), simulate/validate/experiments/benchmark (not read) |
| druthulu/projectarchitect (pa) | edcc2b004fe033e2c9f4109f8dc558ee704497a0 | README.md, project-architect-3.0/project-architect-3.0.md, agents/pa-coder.md, agents/retriever-code.md | prices.py (cost_of, usage_fields), guard.py (whole_read_deny, reread_deny), handoff.py (header); statusline, savings, fit, ledger_cli, mod/*.ts, tests not read |

Paths: cua = `src/cc_usage_study/`; pa = `project-architect-3.0/`.

## Anthropic multipliers (confirmed)

Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching, WebFetch retrieved 2026-11-18 (first 100,000 of 167,602 characters read; the pricing note and `cache_creation` fields sat in that part).

- 5-minute write 1.25x base input; 1-hour write 2x; cache read 0.1x standard.
- Per-model read exceptions in the table footnote: Opus 5.5 and Sonnet 5.5 0.05x; Fable/Mythos 5.1 and 5.2 0.025x.
- `total_input_tokens = cache_read_input_tokens + cache_creation_input_tokens + input_tokens`; `cache_creation_input_tokens` equals `ephemeral_5m_input_tokens + ephemeral_1h_input_tokens`.

## Repo 1: exact formulas

### Cache hit rate

- `prompt_tokens = input_tokens + cache_creation_input_tokens + cache_read_input_tokens` (analyze.py:66-72). Same as the docs total.
- Hit rate = `cache_read_input_tokens / prompt_tokens`, summed over calls of one role (analyze.py:486-488, field `cache_read_share_of_prompt`; scorecard analyze.py:957-967 uses main only).
- This is token-share, not cost-share and not per-request. It ignores the 5m/1h split and the model's read multiplier.
- Per-request miss: `cache_read_input_tokens < 0.5 * previous_call.prompt_tokens` (analyze.py:528), main streams only (analyze.py:505-507).
- Miss label (analyze.py:529-542): `post_compaction_rebuild` if a compact_boundary lies between the two calls; else `ttl_expired_rebuild` if the timestamp gap exceeds the TTL; else `other_miss`.
- TTL guess: 60 min if the previous call has `cache_creation_1h_tokens > 0`, else 5 min (analyze.py:538).
- Rewritten tokens per miss: `input_tokens + cache_creation_input_tokens` of the missing call (analyze.py:545).
- Split parsing: `usage.cache_creation.ephemeral_5m_input_tokens` and `ephemeral_1h_input_tokens` (analyze.py:106-139). A flat/nested mismatch is flagged (analyze.py:123-131). `ttl_split_known` is false when the nested object is absent.

### Cost (list-price USD)

- Per call (pricing.py:231-238): `usd = (input*base + write_5m*w5 + write_1h*w1 + cache_read*hit + output*out) / 1_000_000`, with the row `(base, w5, w1, hit, out)` in USD per million tokens (pricing.py:28-58).
- Refuses to price (returns None, counted as unpriced) when the model is unknown or the TTL split is missing with nonzero writes (pricing.py:227-230; analyze.py:683-684). Fast mode with any cache tokens is unpriced (pricing.py:215-225).
- Haiku 5.5 tier is per request: prompt over 100,000 tokens uses the long row (pricing.py:56-58, 153-167).
- Price rows (base / 5m / 1h / hit / out), pricing.py:33-54:
  - claude-opus-5-5: 4 / 5 / 8 / 0.20 / 20 (hit = 0.05x)
  - claude-opus-5 and 4.5 to 4.8: 5 / 6.25 / 10 / 0.50 / 25 (hit = 0.1x)
  - claude-opus-4 and 4-1: 15 / 18.75 / 30 / 1.50 / 75
  - claude-sonnet-5-5: 2 / 2.5 / 4 / 0.10 / 10 (0.05x); claude-sonnet-5: 2 / 2.5 / 4 / 0.20 / 10
  - claude-sonnet-4, 4-5, 4-6: 3 / 3.75 / 6 / 0.30 / 15
  - claude-haiku-4-5: 1 / 1.25 / 2 / 0.10 / 5
  - claude-haiku-5-5: 0.10 / 0.125 / 0.20 / 0.01 / 0.50 up to 100k; 0.50 / 0.625 / 1.0 / 0.05 / 2.50 above
  - fable-5-2, mythos-5-2: 8 / 10 / 16 / 0.20 / 40 (0.025x); fable-5-1, mythos-5-1: 10 / 12.5 / 20 / 0.25 / 50
  - Only the multipliers were verified against the docs; the absolute prices were not re-checked here.
- Read multiplier by model: `cache_read_multiplier()` returns 0.05 for Opus 5.5 and Sonnet 5.5, 0.025 for Fable/Mythos 5.1 and 5.2, else 0.1 (pricing.py:128-150).
- Model id normalisation strips `[...]`, provider prefix, `@`, `:`, then longest-prefix match; unknown returns None (pricing.py:95-125).
- Dedup: key `(message.id, requestId)`, keep the row with the highest output_tokens, then a non-null stop_reason, then a known TTL split (analyze.py:279-284, 365-391, 408-420). `toolUseResult.usage` is a subagent rollup and is not added (analyze.py:20). `<synthetic>` and `isApiErrorMessage` lines are dropped (analyze.py:22).

### Where the formulas differ from the docs

1. Hardcoded 0.1 read multiplier. `_weight_usage` is called with `read_multiplier=0.1` for every model in `_five_hour_blocks` (analyze.py:576-583, 595). For Opus 5.5 and Sonnet 5.5 the docs say 0.05x, for Fable/Mythos 5.1/5.2 0.025x. `pricing.py` handles this, so the USD path (`_call_usd`) is right and the "api" weight in the 5h blocks is not. The README's `1 / 1.25 / 2 / 0.05 / 5` units are Opus 5.5 only (README.md:117).
2. Unknown TTL split. `_weight_usage` prices all writes at 2.0x and flags `assumed_1h_writes` (analyze.py:290-295). `_call_usd` refuses to price instead (analyze.py:683-684). The two paths disagree.
3. Hit rate ignores model-specific read price, so it cannot rank a 0.025x model against a 0.1x one.
4. Per-model prices are a dated snapshot (2026-11-13, pricing.py:3, 15). `FINDINGS.md:7` says reads are "0.025x to 0.1x", consistent with the docs.
5. The `ttl_expired_rebuild` TTL is inferred from the previous call's 1h tokens (analyze.py:538); the docs make TTL a per-breakpoint choice, so a mixed 5m and 1h call is classed as 60 min.

### Session and turn duration

- No duration metric exists. Per session it stores `first_timestamp` and `last_timestamp` (analyze.py:738-749); the only time arithmetic is the gap between consecutive main calls in `_rebuilds` (analyze.py:534-537) and 5h block bounds.
- 5h blocks: sorted main calls; a new block starts when `stamp >= previous_start + 5h` (analyze.py:556-566). This is an approximation of Anthropic's window, labelled as not the server meter (analyze.py:598-602).

### Subagent attribution

- Role = `subagent` when `isSidechain is True`, `agentId` is a string, or `subagents` is in the path (analyze.py:223-228). Each agent is its own stream `<sessionId>/agent-<agentId>` (analyze.py:231-241).
- Reported as separate blocks `main` and `subagent` (analyze.py:770-771, 829-830); `totals` sums both (analyze.py:821-828). Rebuild checks use main only (analyze.py:505-507, 510-511).
- No cost-per-subagent-type, no parent-to-child link, no delegation-savings figure. README.md:109 lists subagent cost as "not tested yet".

### Waste metrics

- Present: post-compaction rebuilds, TTL-expired rebuilds and rewritten tokens, other misses, compaction count with pre/post tokens (analyze.py:492-549, 835-836), single-request prompt size, entrypoint split (analyze.py:839).
- Absent: re-read detection, tool-output size, idle-gap histogram, time-to-first-token, wasted-USD from misses. The re-read and long-output advice in README.md:19 comes from live runs, not the analyzer.
- Live-run findings with numbers (README.md:119-168): a stale continue on a 97k-token session cost about 9.8x a fresh session against about 1.5x warm (5-minute cache, Opus 5.5); `/compact` before a break 2.5x, after 9.7x; 63% fewer raw tokens cost 25.2% more usage. Small n (1 to 5 runs), one model; the repo says so (FINDINGS.md:14-15).

### Subscriber quota versus API dollars

- Dollars are explicitly "list price, not a subscription bill" (pricing.py:3-5; analyze.py:651, 658). Anthropic has not published how 5h/weekly limits weight buckets (pricing.py:4-5; docs/reference.md:92).
- Subscriber view: cache-weighted units (price divided by a model's input price), shown as % or multiplier; the SKILL tells the agent not to report money (SKILL.md:24). A third-party attribution weight set `read 1 / input 10 / write 12.5 / output 50` times model factor haiku 1, sonnet 3, opus 5, fable 10 is kept only as a labelled hypothesis (pricing.py:79-92; analyze.py:299-317).
- Notes TTL differs by billing: 5 minutes on an API key, 1 hour on a subscription main thread; subagents, compaction and titles default to 5 minutes (README.md:9; docs/reference.md:73).
- Before/after claims refuse to print a cost delta when under 95% of calls are priced (analyze.py:~700, `PRICED_SHARE_MIN`; scorecard analyze.py:983-993), and the repo says raw prompt-token deltas mislead (FINDINGS.md:18).

## Repo 1: adopt / adapt / reject

| Idea | Verdict | Reason | Coverage |
|---|---|---|---|
| Dedup on `message.id` + `requestId`, keep most complete row, skip `toolUseResult.usage` (analyze.py:365-420, 20) | adopt | Counting streamed lines twice inflates cost; the rule is cheap. | covered: prd/cost.md:REQ-COST-014 (add the toolUseResult rollup exclusion) |
| Price the 5m and 1h write split separately; refuse to price when the split is missing (pricing.py:229-230) | adopt | Guessing a TTL misprices writes by 60%. | covered: prd/cost.md:REQ-COST-031 (add the refusal and an unpriced counter) |
| Per-model read multiplier 0.05 / 0.025 / 0.1 (pricing.py:128-150) | adopt | The docs footnote differs per model; one flat 0.1 misprices Opus 5.5 and Sonnet 5.5 by 2x. | covered: arc42/03_context_and_scope/cost-pricing.md:CTX-147; fix repo 1's own 5h-block bug by not copying line 578 |
| Miss classification: post-compaction, TTL-expired, other, with rewritten tokens (analyze.py:528-546) | adapt | Use a hit measure tied to cost, and the TTL from the record's split. The 0.5 threshold is an unvalidated heuristic. | covered: prd/cost.md:REQ-COST-031 (`miss_rebuild_after_gap>TTL`); arc42/12_glossary.md:TERM-006 defines prefix reuse as read(n) over read+creation(n-1), which is stricter than repo 1's share |
| Hit rate = read / prompt_tokens (analyze.py:486-488) | adapt | Add cost-weighted share and report it per model; keep TERM-006 for the quality gate. | covered: prd/cost.md:REQ-COST-040 (98-99% target; metric TERM-006) |
| Per-request Haiku 5.5 prompt tier (pricing.py:153-167) | adopt | Summing prompts across calls would price short calls at the long rate. | new (grep for tier found nothing in prd/cost.md; CTX-147 covers per-model reads only) |
| Unpriced calls counted, never zero; cost delta hidden under 95% priced share (analyze.py:683-700, 983-993) | adopt | Keeps a missing price from reading as a saving. | new |
| Subscriber vs API presentation: units and percentages for subscribers, list USD for API, never call USD a subscription bill (pricing.py:3-5; SKILL.md:24) | adapt | claudetto must show both; the bill label and the 5h approximation need the same disclaimer. | new (no explicit API-versus-subscriber reporting split found in prd/cost.md) |
| Third-party attribution weights (pricing.py:79-92) | reject | Unpublished, client-side, drifts with versions; repo 1 itself labels it a hypothesis. | covered by absence: arc42/03_context_and_scope/usage-quota.md |
| 5h blocks started at the first call (analyze.py:556-566) | reject | Approximation only; read `rate_limits` from the status line instead. | covered: arc42 usage-quota notes (CTX-076, CTX-108) |
| Main vs subagent stream split with separate TTL treatment (analyze.py:223-241; README.md:109) | adapt | Add per-agent-type cost and the 5-minute subagent TTL check. | covered: prd/cost.md:REQ-COST-039 |
| Compact before a break, `/clear` plus 3-line note after (README.md:15-16, 75-93) | adapt | Matches the measured miss cost; depends on TTL, so apply by TTL, not clock. | covered: adr/0100-compaction-model-on-expired-cache.md; arc42/03_context_and_scope/compaction.md |
| Idle compact minimum lowered to 100k (README.md:101) | adapt | Subscription only, interactive only; not measured live. | covered: arc42/03_context_and_scope/compaction.md:CTX-368, CTX-461 |
| Report absolute units beside every ratio (FINDINGS.md:14) | adopt | A ratio against a tiny baseline inflates. | covered: arc42/03_context_and_scope/reply-behaviour.md:CTX-823 (loosely); no REQ in prd/cost.md |
| Validate the model against live runs; label rows fit, prediction, explained (FINDINGS.md:16, 36) | adapt | Cheap honesty for any simulator claudetto builds. | new |
| Reconciliation checks over totals derived by different routes (checks.py; FINDINGS.md:34) | adapt | Catches grouping bugs in claudetto's cost report. | new |
| Skill that asks Claude to run the analyzer and only read the JSON (SKILL.md:12-24) | reject | Clone and `pip install` of third-party code; claudetto should ship its own transcript reader. | n/a |
| Simulator and validate modules (simulate.py, validate.py) | reject | The repo's own back-test shows the compaction model fails (README.md:191). Not read in full. | n/a |

Defect worth reporting to the repo owner: analyze.py:576-583 and 595 apply 0.1 read weight to all models.

## Repo 2: architecture and workflow

Product: a plan-driven agent team for subscribers. Phases with machine-checkable milestones, one fresh-context expert per task, coder and retriever helpers, a plan in the repository, a local ledger that prices requests and a statusline that shows savings (README.md:11-30; project-architect-3.0.md:3-8).

Marketing numbers (README.md:98-102: 459k to 547k vanilla average context against 47k to 69k) are the author's own measurements; I did not verify them. The comparison is against "real projects" in one long vanilla session, not matched tasks.

### Adopt / adapt / reject

| Idea | Verdict | Reason | Coverage |
|---|---|---|---|
| Whole-file Read denied above 20,000 chars; deny reason carries a 60-line outline and ends "Read the ranges you need" (project-architect-3.0.md:150-157; guard.py:676-725, 733-766) | adapt | Cuts the big-file read at the moment it happens; the outline stops a pure deny from looping. | covered in part: prd/guards.md:REQ-GUARDS-066 and adr/0112-web-read-route.md (web reads only); local-file case new |
| Re-read deny: second whole Read of an unchanged file is denied; fourth consecutive denial escapes; ranged reads pass; edits forget the path (guard.py:803-850) | adapt | Targets the repeat-read waste; the escape hatch stops dead ends. Needs its own measure of savings first. | new (grep hits only CTX-057 research notes, no REQ) |
| Context-threshold handoff: `min(config, 0.8 x window)`, finish in-hand work, write `TASK_PROGRESS.md`, commit only green, return `handoff` (handoff.py:87-88; pa-coder.md; project-architect-3.0.md:187-191, 645-646) | adapt | Fits claudetto's state-file handover; the commit-only-green rule is the useful part. | covered: prd/handover.md:REQ-HANDOVER-004 |
| Leaf agents set `omitClaudeMd: true` (retriever-code.md:7; project-architect-3.0.md:78-83) | adopt | Drops CLAUDE.md and memory index from a context that does not need them. | covered: prd/delegation.md:REQ-DELEGATION-044 |
| Per-agent `cacheTtl: 5m` for short-lived coders and retrievers, with the stated reason that a 1h write costs double (pa-coder.md frontmatter; retriever-code.md frontmatter) | adapt | Same economics as the docs multipliers; claudetto should decide it from measured subagent gaps. The `experimental:` frontmatter key was not checked against Claude Code docs. | covered: prd/cost.md:REQ-COST-039; arc42/03_context_and_scope/claude-code-surface.md:CTX-163 |
| Plan frozen at approval; a PreToolUse hook denies any writer except `plan_edit.py` (project-architect-3.0.md:174-178; pre_tool_use.py:1-11) | adapt | A protected file plus one writer script keeps the contract stable; claudetto needs the same for its state file. | new |
| Pointers not bodies: summary id, `file:line`, report id; plan names the `reads:` list (project-architect-3.0.md:65-69) | adopt | Smaller contexts and traceable claims. | covered in part: prd/guards.md:REQ-GUARDS-066 |
| Retriever reports written to `research/pending/` then adopted with an id; answer at most 40 lines (retriever-code.md; project-architect-3.0.md:156-159, 543-546) | adapt | Matches claudetto's path-and-outline return; the pending-then-adopt step adds moving parts. | covered in part: REQ-GUARDS-066 |
| Fixed-format briefs of at most 300 tokens; reports start with `done`, `question` or `blocked` (project-architect-3.0.md:230-257) | adapt | A scannable contract for subagent hand-backs. | new |
| Two coder failures with different causes returns `blocked` with the last error verbatim (pa-coder.md; project-architect-3.0.md:147-148) | adopt | A bounded retry rule prevents loops that burn quota. | new |
| Retriever `maxTurns` cap raised from 15 to 25 because the cap lost 16-18% of answers (retriever-code.md:10) | adopt | Measured evidence for choosing a cap; claudetto's Artemis should set one from data. | new |
| Machine-checkable milestone per phase; the gate, not anyone's say-so, decides (project-architect-3.0.md:57-58, 374-378) | adopt | Matches claudetto's verification stance. | covered in part: risk-register/handover.md (CTX-563 notes); no REQ found |
| Append-only history; supersede, never delete; moves to `docs/retired/` (project-architect-3.0.md:51-56) | adapt | Good for plans and rules; too heavy for task logs. | covered: prd/handover.md (append-only) |
| Rules as one file each with an index; `Rule candidate:` proposed at phase end and ratified at next plan approval (project-architect-3.0.md:431-454, 532-535) | adapt | Review gate on new rules stops rule sprawl. | new |
| Carry audit: zero-token walk of transcripts producing tables of reads, writes, results, noise per phase; flagged rows go to a judge (project-architect-3.0.md:200-211) | adapt | Same idea as claudetto's cost report; run it by script and do not spend a Fable-class agent on it. | new |
| Doctor warns about MCP servers that add instruction blocks to every session (project-architect-3.0.md:222-224) | adopt | Direct token cost, cheap check. | covered: arc42/03_context_and_scope/settings.md:CTX-016, CTX-228 |
| Explicit `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=3` so a harness default cannot break the chain (project-architect-3.0.md:139-143) | adapt | Pin the depth claudetto needs (likely 1). | covered: prd/delegation.md:REQ-DELEGATION-012 |
| CLAUDE.md of about 190 tokens of pointers, rules in a skill (project-architect-3.0.md:78-83) | adapt | Matches the aim of a small always-loaded file. | covered: arc42/08_concepts/instruction-files.md |
| Acceptance metrics: expert seed at most 40k, retriever seed at most 6k, zero prefix rewrites after session start (project-architect-3.0.md:653-656) | adapt | Gives numeric targets; claudetto should set its own from measurement. | covered in part: prd/cost.md:REQ-COST-040 (hit rate); seed-size targets new |
| Savings ledger vs a vanilla counterfactual, per family weights fitted to the live window (project-architect-3.0.md:583-593) | reject | Modelled; repo 1 shows a comparable model failing against live runs, and weights are unpublished. Keep measured request cost only. | covered by absence: arc42/03_context_and_scope/usage-quota.md |
| Expert/coder/retriever/auditor/curator/thinker hierarchy, three levels deep (project-architect-3.0.md:114-143) | reject | Each agent starts a context and pays a cache write; claudetto's decision is that the agent does the work itself. | covered (opposed): adr/0042-agent-does-the-work-itself.md |
| Memory curator and generation-start ceremony (project-architect-3.0.md:558-572) | reject | Spends model calls on housekeeping; a script for index size is enough. | covered: arc42/03_context_and_scope/rules-behaviour.md:CTX-479 |
| OpenRouter DeepSeek/GLM external coders, Windows toasts, installer migrations (README.md:29-30; project-architect-3.0.md:308-316, 466-523) | reject | Outside claudetto's scope and adds a second provider. | n/a |

## Top items for claudetto

1. Per-model read multiplier and the TTL-split refusal (repo 1): confirmed against docs; repo 1 loses it in its 5h-block weights, so claudetto must apply it in every cost path.
2. Unpriced counter and a priced-share gate on any before/after cost claim (repo 1).
3. Local-file whole-read and re-read guards with an outline in the deny reason (repo 2): the only waste class neither repo measures.
4. Single-writer protected plan or state file (repo 2).
5. Bounded retry (`blocked` after two different failures) and a measured `maxTurns` cap (repo 2).
6. API-versus-subscriber reporting split: units and percentages for subscribers, list USD labelled as not a bill for API users (repo 1; claudetto's own gap).

## Limits of this review

- Repo 1's simulate.py, validate.py, experiments.py and benchmark.py were not read; formula claims cover pricing.py and analyze.py only.
- Repo 2's statusline, savings, fit, ledger, hooks in TypeScript and tests were not read; its savings formula is cited from the documentation (project-architect-3.0.md:583-590), not from code.
- The docs page was read to character 100,000 of 167,602.
- Absolute USD prices in repo 1 were not re-verified; only multipliers were.
- Coverage marks come from keyword greps of `plans/rebuild`; "covered" means a matching requirement or note exists, not that it is implemented.
