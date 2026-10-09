# Model and effort routing: research input

Date of research: 2026-10-07. Claude Code 2.1.293.
Docs were read with WebFetch (`code.claude.com` is blocked for `curl` in the sandbox, reachable with WebFetch).
Bundle citations: `S` = `external/cc-2.1.293/strings.txt`, form `S@<byte offset>` from `rg -b`.
The model catalog is one line (line 314727 of `S`, starts at byte 13118615), so catalog offsets are 13118615 plus the offset in the line.
Docs pages: sub-agents = https://code.claude.com/docs/en/sub-agents, model-config = https://code.claude.com/docs/en/model-config,
costs = https://code.claude.com/docs/en/costs, hooks = https://code.claude.com/docs/en/hooks, skills = https://code.claude.com/docs/en/skills.
Evidence is marked EVIDENCE (quoted source) or INFERENCE (my reading).

## 1. Models

### 1.1 Price per MTok (USD), from the baked catalog (S@13119261 to S@13120162)

| Model | in | out | cache write 5m | cache write 1h | cache read | Billed-more rule |
| :- | -: | -: | -: | -: | -: | :- |
| claude-haiku-5-5 (`haiku_55`) | 0.1 | 0.5 | 0.125 | 0.2 | 0.01 | Prompt above 100K tokens: in 0.5, out 2.5, write 0.625/1.0, read 0.05 (`long_prompt.above_prompt_tokens:1e5`) |
| claude-haiku-4-5 (`haiku_45`) | 1 | 5 | 1.25 | 2 | 0.1 | none |
| claude-sonnet-5-5 (`tier_2_10`) | 2 | 10 | 2.5 | 4 | 0.2 | none |
| claude-opus-5-5 (`tier_4_20_cache_read_0_20`) | 4 | 20 | 5 | 8 | 0.2 | none in the price table |
| claude-fable-5-1 (`tier_10_50_cache_read_0_25`) | 10 | 50 | 12.5 | 20 | 0.25 | none |

- EVIDENCE: the price rows are in S@13119261 (`tier_2_10`), S@13119756 (`tier_10_50...`, `tier_4_20...`, `haiku_45`), S@13120162 (`haiku_55` with `long_prompt`).
- EVIDENCE: only `haiku_55` has `long_prompt` (the schema at S@13138070 allows it on any entry, no other entry sets it).
- EVIDENCE: model-config says "Standard pricing applies to tokens beyond 200K with no premium", except "Haiku 5.5: Costs more per token when prompt exceeds 100K tokens".
- EVIDENCE: Haiku 5.5 announcement (`external/2026-10-07_p2/export-Introducing Claude Haiku 5.5- ...jsonl`): "Per token, it costs 90% less than Haiku 4.5 on tasks under 100,000 tokens ... On longer tasks, it's half the price."
  "It's also our first Haiku model with an adjustable effort setting."
  "pairs well with Claude Opus 5.5 and Sonnet 5.5 as a sub-agent on coding work."
- EVIDENCE: same post: "We're also halving the price of cache reads on Claude Sonnet 5.5".
  The 2.1.293 table already shows the lower figure (0.2), so the number above is post-halving.
- Ratio (INFERENCE from the table): output price Haiku 5.5 : Sonnet 5.5 : Opus 5.5 : Fable 5.1 = 1 : 20 : 40 : 100 under 100K tokens.
  Haiku 5.5 costs 0.05 of Sonnet 5.5 (matches design D12), but 0.25 of Sonnet 5.5 above 100K prompt tokens.
  Cache reads dominate a long agent loop, and there Haiku 5.5 is 0.01 (0.05 above 100K) against 0.2 for Sonnet and Opus.

### 1.2 Context window, output, effort, default effort (catalog entries)

| Model | Window | Max output | Effort levels | Default effort | Catalog offset |
| :- | :- | :- | :- | :- | :- |
| claude-haiku-5-5 | 1M native | 128K | low, medium, high, xhigh, max | medium | S@13121577 (13118615+2962) |
| claude-sonnet-5-5 | 1M native | 128K | low, medium, high, xhigh, max | medium | S@13126322 (+7707) |
| claude-opus-5-5 | 1M native, `[1m]` suffix | 128K | low, medium, high, xhigh, max | medium | S@13132486 (+13871) |
| claude-fable-5-1 | 1M native | 64K default, 128K upper | low, medium, high, xhigh, max | high | S@13134415 (+15800) |
| claude-haiku-4-5 | 200K | 32K, upper 64K | none (`capabilities:["context_management"]`) | none | S@13120927 (+2312) |

- EVIDENCE: capabilities `effort`, `max_effort`, `xhigh_effort`, `adaptive_thinking`, `rejects_disabled_thinking` on all four 5.x entries (same offsets).
  Thinking cannot be turned off on Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable (costs page, "Adjust extended thinking").
- EVIDENCE: model-config "Adjust effort level" table lists the same levels, and "Opus 5.5, Sonnet 5.5, and Haiku 5.5 default to `medium`".
- EVIDENCE ("billed past 200K"): S@21705588 `Hoo=new Set(["claude-sonnet-4-6","claude-opus-4-6","claude-opus-4-8","claude-opus-5","claude-opus-5-5"])` feeds field `unclampedButBilledPast200k` (S@21706475).
  S@21713097: for a model in this set with window under 1M, Claude Code clamps the shown window to a default (`source:"model-default"`) unless an auto-compact window is set.
  Sonnet 5.5 and Haiku 5.5 are not in the set.
  The model-config page says there is no price premium past 200K, so for Opus 5.5 this is a client-side window clamp.
  What the vendor bills past 200K for Opus 5.5 is NOT visible in the bundle (price table has no `long_prompt` for it).
  This matches the existing note in `plugins/dotclaude/lib/budget.mjs` (`CONTEXT_WINDOW`).
- EVIDENCE: `haiku_5_5_early_stopping_guidance` capability exists only on Haiku 5.5 (S@13121577 region).
  Design D12 already cites the Haiku 5.5 prompting guide: low and medium can skip checks.

### 1.3 Effort cost index (tokens per task, high = 1)

- EVIDENCE: baked `effort_cost_index` exists only for sonnet-5, opus-4-8, opus-5, fable-5, fable-5-1, mythos-5-1.
  Offsets in the catalog line: sonnet-5 7578, opus-4-8 12773, opus-5 13744, fable-5 15672, fable-5-1 16718.
- The 5.5 models have NO baked index in 2.1.293 (checked: the `effort_cost_index` offsets list above is complete).
  The catalog may be replaced by a remote one (`CLAUDE_CODE_MODEL_CATALOG`, `CLAUDE_CODE_MODEL_CATALOG_URL`, S@12991512), so a live session may show other figures.

| Model | low | medium | high | xhigh | max |
| :- | -: | -: | -: | -: | -: |
| sonnet-5 | 0.47 | 0.74 | 1 | 2.41 | 5.59 |
| opus-5 | 0.67 | 0.76 | 1 | 1.60 | 1.70 |
| opus-4-8 | 0.72 | 0.90 | 1 | 1.65 | 1.88 |
| fable-5-1 | 0.75 | 0.86 | 1 | 1.38 | 1.74 |

- EVIDENCE: UI text at S@44168094 uses it: "`{from} effort is ~Nx the estimated cost of <default> (the default).`" and for `max` a fixed warning (S@13372701): "May use excessive tokens resulting in long response times or overthinking. Use sparingly for the hardest tasks."
- EVIDENCE: community measurement of the table (`export-Claude Code ships a per-model table of what each effort level costs.jsonl`): n=2 tasks on Opus 5, medium to high x1.17 output tokens, xhigh and max near-identical (397,827 vs 397,761 output tokens).
  Table is per attempt, normalized per model, so it does not compare models and does not price retries.
- INFERENCE: for the 5.5 family use Sonnet 5 / Opus 5 rows as a prior only: low about 0.5-0.7, medium about 0.75, xhigh 1.6-2.4, max 1.7-5.6.
  A comment in `export-Opus 5.5 Medium is the best reasoning level.jsonl` says the app warns "5.5x the amount of usage" for max on Opus 5.5 (against 3.5x on Opus 5).
  This is a user report, not checked in the bundle.

### 1.4 Quota weight (5h and 7d windows)

- EVIDENCE (what is visible): window keys at S@20891284: `five_hour:"session limit"`, `seven_day:"weekly limit"`, `seven_day_opus:"Opus limit"`, `seven_day_sonnet:"Sonnet limit"`, `seven_day_overage_included:"Fable limit"`, `overage:"usage credit limit"`.
  So there are shared 5h and 7d windows plus model-family weekly sub-limits for Opus, Sonnet, and Fable.
- EVIDENCE: costs page: a session or weekly limit is "shared across all models, so the developer can't restore access by switching models"; after "You've hit your Opus limit" or "Sonnet limit", a model outside that family keeps working.
- NOT visible: any numeric weight per model for the 5h and 7d windows. No multiplier was found in the bundle.
  Best proxy is API list price (1.1) and the effort index (1.3).
- Community, unverified: Opus 5.5 at medium over a full 5h window used about 40% of a Max 5x window and 8% of the weekly (`export-Opus 5.5 Medium is the best reasoning level.jsonl`).
  An orchestrator kept running all night for 2% where older models took 25% (`export-Opus 5.5 at Medium is cheaper and faster than Opus4.6-Fable5.1 at high.jsonl`).
  Usage limits changed in mid-September: one user's Sonnet 5 task went from 2-3% to about 5% of the session (`export-Claude Code ships a per-model table...jsonl`).
  Treat all as anecdotes.

## 2. Every mechanism that sets model and effort

| Mechanism | Sets | Scope | Source |
| :- | :- | :- | :- |
| Subagent frontmatter `model` | alias (`sonnet`, `opus`, `haiku`, `fable`), full ID, or `inherit` | that subagent | sub-agents docs |
| Subagent frontmatter `effort` | low, medium, high, xhigh, max (by model) | that subagent; "Overrides the session effort level, but not `CLAUDE_CODE_EFFORT_LEVEL`" | sub-agents docs |
| Agent tool input `model` | enum `sonnet`, `opus`, `haiku`, `fable` only | one spawn | S@28697941; hooks docs list `model` as "Optional model alias" |
| Agent tool input `effort` | enum low..max | one spawn | S@28697941 (`effort:W(Dc)`); not in the hooks docs table |
| `CLAUDE_CODE_SUBAGENT_MODEL` | alias or ID, default for subagents | all subagents | model-config; S@12991912 |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` | forces one model over all | all subagents and workflow agents | sub-agents docs; S@6988513, S@7622773 ("Workflow agent model ... ignored: CLAUDE_CODE_SUBAGENT_MODEL_FORCE is set") |
| `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU,FABLE}_MODEL` | what an alias maps to | alias targets (also `opusplan`) | model-config |
| `ANTHROPIC_MODEL`, `--model`, settings `model`, `ANTHROPIC_DEFAULT_MODEL` | main model | session | model-config precedence list |
| `opusplan` alias | Opus in plan mode, Sonnet in execution | main session | model-config; S@6924855, S@11752058 (`opusplan-mode-reminder`) |
| Settings `effortLevel` | low, medium, high, xhigh (not max) | saved default | S@13599789 `effortLevel:W(["low","medium","high","xhigh"])`; model-config |
| Settings `modelSettings.<id>.effortLevel` / `.maxEffortLevel` | per model | saved default, per-model cap | S@13600303-S@13600715; model-config |
| Settings `maxEffortLevel` | cap | session, all sources | see 2.1 |
| `CLAUDE_CODE_EFFORT_LEVEL` | low..max, `ultracode`, `auto` | session, beats settings, `/effort`, and subagent frontmatter | model-config; sub-agents docs |
| `--effort`, `/effort <level>` | session effort | session | model-config |
| `ultrathink` keyword | deeper reasoning for one turn, no effort change | one turn | model-config; bundle `ultrathink_effort` attachment S@6263970 |
| `ultracode` setting or `/effort ultracode` | "plans a dynamic workflow"; community says it is xhigh plus "use workflows" | session | model-config; `export-Claude Code effort level and model selection - Claude.jsonl` |
| Skill frontmatter `model` | model for the rest of the turn, not saved; with `context: fork` sets the forked subagent's model | one turn | skills docs |
| Skill frontmatter `effort` | "Overrides the session effort level" while the skill is active | one turn | skills docs |

### 2.1 Is `maxEffortLevel: "max"` valid?

- YES. EVIDENCE: schema `maxEffortLevel:()=>W(Dc)` with `Dc=["low","medium","high","xhigh","max"]` (S@13599789, S@13372660); model-config: "Valid values: low, medium, high, xhigh, max. Requires Claude Code v2.1.283 or later".
- `max` as a cap means no cap. EVIDENCE: the resolver at S@16633674 skips values equal to `"max"` (`l!==void 0&&l!=="max"&&(...)`), and the per-model setting text says `"max" exempts it` (S@10685389).
- The cap clamps "an /effort or /model pick, --effort, CLAUDE_CODE_EFFORT_LEVEL, a model default" (S@10684872), across files the lowest wins, and managed org caps combine by taking the lower.
  Not confirmed in the bundle: that it also clamps an Agent-tool `effort` or a frontmatter `effort`.
  Hook-time `effort` values can be tested in the hook lab only if the CLI is run.
- A level a model does not support falls back to the highest supported at or below it (model-config).
  `max` on a model without `max_effort` becomes `high` (S@16639996 `B()`).
- The plugin template now sets `"maxEffortLevel": "xhigh"` (`plugins/dotclaude/templates/settings.json` line 26). Design D12 says `high`.
  With the user at `max`, the router must cap itself, since nothing else will.
- The top-level `effortLevel` setting cannot hold `max`.
  `max` is reachable only by env var, `--effort`, `/effort`, frontmatter, or Agent `effort`.

## 3. What a plugin can change at runtime, and what only statically

### 3.1 Resolution order (what wins)

- Subagent model, EVIDENCE sub-agents docs: (1) per-invocation `model` parameter, (2) frontmatter `model`, (3) `CLAUDE_CODE_SUBAGENT_MODEL`, (4) main model.
  `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` makes the env var win over all.
  The Agent tool schema text says the same (S@28697941): "Takes precedence over the agent definition's model frontmatter and the configured default subagent model."
  `subagent_type: "fork"` ignores both `model` and `effort`: forks inherit the parent's model and effort.
- Subagent effort, EVIDENCE S@28702566: after resolving the model, `We=Y?void 0:Lt; if(We!==void 0) s={...s,effort:We}` where `Lt` is the Agent input `effort`.
  So input `effort` replaces frontmatter `effort`.
  Then `subagentEffort = ly(model, state, agentDefinition.effort ?? inheritedEffort)` (S@28661891).
  `CLAUDE_CODE_EFFORT_LEVEL` (function `WN()`) still wins (sub-agents docs, and `Vw` at S@16639996 puts it first).
- INFERENCE, unresolved: in `Vw` the saved/explicit session choice (`KOn`) can sit before the agent value (`m=p??(p===null?S:void 0)??r??n??S`).
  The docs say frontmatter overrides the session level.
  Test with a live session before relying on frontmatter `effort` against an explicit `/effort`.
- Hidden experiment: S@28661891 has a feature-flag path (`tengu_harmonic_riddle`, env `CLAUDE_CODE_HARMONIC_RIDDLE`) that can lower a subagent's effort when the frontmatter has none.
  It is skipped when `e.effort!==void 0`, so an explicit frontmatter or Agent `effort` is safe from it.
- Main session: explicit choice (env, `--effort`, `/effort`), then settings, then model default (model-config).

### 3.2 Deterministic at runtime, per task

1. PreToolUse hook, matcher `Agent`, returning `hookSpecificOutput.updatedInput`.
   - EVIDENCE hooks docs: "Agent is a tool name" in the matcher list. `updatedInput` "Modifies the tool's input parameters before execution. Replaces the entire input object, so include unchanged fields alongside modified ones."
   - EVIDENCE hooks docs Agent schema: `prompt`, `description`, `subagent_type`, `model`. The bundle schema also has `effort`, `run_in_background`, `name`, `isolation`, `cwd` (S@28697941).
   - EVIDENCE: `updatedInput` is validated against the tool schema (S@8860949 "updatedInput failed schema for", S@9012264).
     So `model` must be one of the four aliases. A full ID such as `claude-haiku-5-5` would fail validation. INFERENCE.
   - EVIDENCE: the hook-returned input is what permission rules see (hooks docs), and it beats frontmatter because the input `model` and `effort` rank first.
   - Alias target: `haiku` maps to `claude-haiku-5-5` on first party (catalog `latest_per_family`, S@13136930 to S@13137445), to `claude-haiku-4-5` on Bedrock, Vertex, Foundry.
     The repo template sets `availableModels` with only `claude-haiku-4-5`. A route to Haiku 5.5 needs the ID in `availableModels` (INFERENCE: `availableModels` restricts picks, per model-config text at S@10657837).
   - NOT verified live: nobody ran an Agent `updatedInput` carrying `model` and `effort` in 2.1.293. The repo has no existing use (`rg updatedInput` found none in plugins/wiki).
     The hook lab (`just lab`) can test the hook output, but only a live session proves the CLI honors it.
   - The built-in Agent tool text tells the model: set `model` and `effort` "ONLY when the user ... explicitly ask" (S@28697941).
     The model will not set them itself, so the hook is the only route that varies them per task.
2. Skill frontmatter `model` and `effort`, per skill, for one turn (skills docs). Static per skill file, runtime only in the sense that the user or the model picks which skill runs.
   The repo removed all skills (commit 5cf4cb4 "remove all skills") and sets `disableBundledSkills`, so this route needs new skills.
   Model switches mid-session can break the main prompt cache (community, below).
3. `ultrathink` in the prompt: a hook (`UserPromptSubmit` `additionalContext`/prompt edit) could add it, but it does not change the effort level and community says it is mostly legacy.
   Not recommended as a router lever.
4. Hook `additionalContext` on `SubagentStart` or PreToolUse: only text, no model or effort control.
   EVIDENCE hooks docs: `SubagentStart` has "No blocking or decision control". No hook can set the main session model or effort (hooks docs: "Only SessionStart hooks can receive a model field"; effort is read-only as `$CLAUDE_EFFORT`).
   `PreModelSwitch` can only block a switch.
5. Mod events (`dotclaude-modder`): the plugin's `hooks/` and `um` are game-modding tools. `rg` for model/effort routing in it found only game-mod docs. No lever found.

### 3.3 Static only

- Agent frontmatter pins (`plugins/dotclaude/agents/*.md`), kept in step with `AGENTS` in `plugins/dotclaude/lib/budget.mjs`.
- Settings: `model`, `availableModels`, `effortLevel`, `modelSettings`, `maxEffortLevel`, `env` (`ANTHROPIC_DEFAULT_*`, `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_EFFORT_LEVEL`).
  `CLAUDE_CODE_EFFORT_LEVEL` in settings `env` would defeat per-subagent effort (it wins), so the router must not set it.
  `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` would defeat the hook, so keep it unset.
- The main-session model and effort change only by the user (`/model`, `/effort`) or by `opusplan`.

### 3.4 Cache and cost side effects (community, unverified in docs)

- `export-Claude Code effort level and model selection - Claude.jsonl`: changing effort mid-session invalidates the prompt cache (Fable 5.1 excepted, Opus "in beta"); subagents inherit session effort; subagent cache TTL is 5 minutes (`subagentPromptCacheTtl`, S@8655063; S@8823659 for the agent field).
  A hook that sets effort per spawn avoids the main-session cache break, since each subagent has its own cache. INFERENCE.
- costs page: "The subagent's own requests still draw on your usage."

## 4. Task taxonomy

Evidence strength: A = vendor docs or catalog, B = community measurement with numbers, C = anecdote.
No data exists yet for Haiku 5.5 on Claude Code tasks (released 2026-10-07; threads in `external/2026-10-07_p2/`). Rows with Haiku are proposals to measure (design D12).

| Task class | Proposed model, effort | Why | Evidence |
| :- | :- | :- | :- |
| Search and read (file lookup, grep, "where is X") | haiku-5-5 low or medium. Fallback sonnet-5-5 low | Cheapest by 20x on output and 20x on cache read. Keep the prompt under 100K tokens or the long-prompt rate (5x) applies | A (price, `long_prompt`, "pairs well ... as a sub-agent on coding work"); C (users: Haiku as "grunt worker" for exploration) |
| Run tests, build, lint and report failures | haiku-5-5 low. Needs no `effort` on 4.5 | Output is copied, not reasoned. Early-stopping risk is a pass condition (D12) | A; existing pin is haiku-4-5 (budget.mjs) |
| Web and docs lookup with sources | sonnet-5-5 medium (haiku-5-5 medium to measure) | Source quality matters more than price | B for Sonnet medium as default for daily work; C for Haiku |
| Bulk mechanical edit (fully specified rename, codemod) | haiku-5-5 medium to measure, else sonnet-5-5 low | Specified work, a test or grep verifies it | A (model-config: `low` fits "a small change like a rename"); C |
| Scoped implementation with a known check | sonnet-5-5 medium | Docs: medium "fits day-to-day engineering work with a clear scope, such as implementing a new feature". Sonnet high already costs about as much as Opus 5.5 at low or medium, so do not raise Sonnet above medium | A (model-config); B (`export-Sonnet 5.5 beats Opus 5.5 at coding and it's half the price--.jsonl`: Terminal-Bench Sonnet 5.5 70.6% vs Opus 5.5 66.4% at default; Opus high $3.88 for 64.2%, Sonnet xhigh $5.30 for 61.5%; a commenter on the AA suite says Opus 5.5 low is 1 point above Sonnet 5.5 medium at about 10% less cost) |
| Debugging, cause unknown | sonnet-5-5 high first, then opus-5-5 medium after two failed fixes. CONTESTED | Docs: `high` fits "fixing a bug in an existing codebase". One user says Sonnet 5.5 max is the best bug fixer, others say Sonnet max costs more and does worse than high | A (model-config); C (`export-I was underestimating Sonnet 5.5 ...jsonl`: "sonnet high first, only escalate to opus when the diff comes back wrong twice"; Sonnet high beat Opus high on an SVG task and was cheaper on 17 of 19 cases, n=1 run each) |
| Review of code, security, API design | opus-5-5 high. xhigh only for a trust-boundary audit | Fresh-context judgment; flawed review costs more than its tokens. `max` is for "finding security vulnerabilities" per docs, but prone to overthinking | A (model-config); B (`export-Which model & effort level combination do you use ...jsonl`: "Medium and/or High completely suffice") |
| Planning and architecture | opus-5-5 high (main session default medium) | Plan errors multiply downstream. Plan once, run cheaper models for execution | B (`export-Claude Code effort level and model selection - Claude.jsonl`: plan with the high model, execute with a cheaper one in a new session); C |
| Orchestration (the main session) | opus-5-5 medium | Vendor: Opus 5.5 at medium "matches or exceeds Opus 5 at high"; users report low usage | A (model-config); C (2% overnight; 40% of a 5h window on Max 5x) |
| Never by default | `max` on any model; `xhigh` on Sonnet 5.5 | Opus 5 index: xhigh to max only +6%, but Sonnet 5 jumps 2.41 to 5.59. Docs: "`max` may show diminishing returns and is prone to overthinking". Sonnet xhigh scored less than Opus high for more money | A (catalog index; model-config); B (Terminal-Bench cost figures above); C (users: max "sometimes worse") |

### 4.1 Signals a router can read deterministically in a PreToolUse `Agent` hook

All are fields of the hook input (`tool_input`) or the transcript the hook can read:

- `tool_input.subagent_type`: primary key (investigator, web-researcher, implementer, debugger, reviewer, test-runner, `Explore`, `Plan`, `general-purpose`, `fork`).
  `fork` ignores model and effort, so the hook must skip it.
- `tool_input.model` and `tool_input.effort` already present: user or CLAUDE.md asked for them (the tool text allows that), so leave them alone.
- `tool_input.prompt` length in characters: a proxy for context to carry. Above about 100K tokens a Haiku 5.5 route costs 5x per token, so route to Sonnet.
- `tool_input.description` and `prompt` keywords (rename, codemod, migrate, grep, list, find, run tests; root cause, flaky, regression, fails; review, audit, security, threat; plan, design, architecture).
  Keep the list short and exact, since a keyword match is the weakest signal.
- Count of file paths or globs in `prompt` (regex over `\S+\.\w{1,5}` and `/`): many paths plus "same change" suggests a bulk edit.
- `run_in_background`, `isolation: "worktree"`: a write-capable or long task, so do not drop to Haiku.
- Hook input `effort.level` (the session's current effort, hooks docs) and `$CLAUDE_EFFORT`: cap a subagent's effort at the session's, so a user who set low is not overridden upward.
- The subagent definition's tool list (read-only agents versus write agents): read-only plus `Bash`/`Grep` favors the cheap tier.
- Settings the router must read: `maxEffortLevel` (cap), `availableModels` (allowed ids), env `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` (if set, routing has no effect).
- Escalation signals across calls: a previous `SubagentStop`/failed result for the same `subagent_type` in the transcript, or two failed fixes. State must live in a file or the transcript, as hooks have no memory.

## 5. Open questions and risks

1. No live proof that Agent `updatedInput` with `model` and `effort` is honored in 2.1.293. A one-session test is required before building on it.
2. Unresolved: whether `CLAUDE_CODE_EFFORT_LEVEL` or an explicit `/effort` beats a hook-set Agent `effort` (INFERENCE from `Vw`: env wins; the explicit-session case is unclear).
3. Whether `maxEffortLevel` clamps Agent `effort` (not confirmed).
4. 5.5 `effort_cost_index` values are absent from the baked catalog. Only a measurement (design D12 evals) gives them. Remote catalog may differ.
5. Per-model quota weights are not visible. Use API list price as the proxy and measure `/usage`.
6. Haiku 5.5 quality on coding sub-agent work is unmeasured. Vendor says it fits sub-agent work, and Haiku 5.5 has an early-stopping guidance capability. Over-claim rate must gate the route.
7. `haiku` alias resolves to Haiku 4.5 on Bedrock, Vertex, and Foundry (catalog), and the template's `availableModels` lists only `claude-haiku-4-5`.
8. Budget copies: any pins change `plugins/dotclaude/lib/budget.mjs` first (`SUBAGENT_EFFORTS` has `haiku-4-5: []` and no `haiku-5-5` entry yet).
9. Hook-set `model` for `Plan` and built-in agents is untested too.

## 6. Sources

- Docs fetched 2026-10-07 with WebFetch: sub-agents, model-config, costs, hooks (offset 100000 to 200000), skills.
- Bundle `external/cc-2.1.293/strings.txt` (offsets above).
- Community (all under `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/`):
  `export-Claude Code ships a per-model table of what each effort level costs.jsonl`,
  `export-Claude Code effort level and model selection - Claude.jsonl`,
  `export-Opus 5.5 Medium is the best reasoning level.jsonl`,
  `export-Opus 5.5 at Medium is cheaper and faster than Opus4.6-Fable5.1 at high.jsonl`,
  `export-Which model & effort level combination do you use to get the most correct solutions while balancing.jsonl`,
  `export-Token optimization from Anthropic- choosing the right effort level to the task.jsonl` (comments only; the article is https://claude.dev/blog/spending-your-effort, not fetched),
  `2026-09-29/export-Sonnet 5.5 beats Opus 5.5 at coding and it's half the price--.jsonl`,
  `2026-09-29/export-Sonnet 5.5 may replace Opus 5.5 in your workflow.jsonl`,
  `2026-10-07_p2/export-I was underestimating Sonnet 5.5, but it turns out that for some tasks, it's an absolute beast.jsonl`,
  `2026-10-07_p2/export-Introducing Claude Haiku 5.5- ....jsonl`,
  `2026-09-29/export-When and what do you use Haiku for-.jsonl`.
- Repo: `plugins/dotclaude/lib/budget.mjs`, `plugins/dotclaude/agents/*.md`, `plugins/dotclaude/templates/settings.json`, `openspec/changes/dotclaude-0-28-0/design.md` (D12).
