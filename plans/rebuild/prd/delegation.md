# Delegation Requirements

## Agent Tool Text

- [ ] **REQ-DELEGATION-001** claudetto shall tell the model in the Agent tool text to pass `name` to address a subagent by that name, and shall keep ListAgents with a trimmed text.
  Acceptance: the Mod Agent text holds "pass `name` to address it by that name" (+46 chars); the ListAgents text of 304 chars takes it from 1,151 to 674 bytes (-41%). Verification: inspection.
  Basis: measured, claude 2.1.318: the engine takes an undeclared Agent `name` (`registerName`) and stock models pass it unprompted; ListAgents cannot be rebuilt on `$.agent.list` because it omits local, cloud, and Remote Control sessions. Paid 5 runs $0.3810: stock $0.1031 (84,753 tokens) against mod2 $0.1244 (71,110 tokens), with more cache writes (19,892 against 12,069). Status: missing at 088a227c (`AGENT_TEXT` in plugins/claudetto/hooks/features/delegation/texts.ts holds no `name` line).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2818; plugins/claudetto/hooks/features/delegation/texts.ts:1@088a227c.

## Questions To The User

- [ ] **REQ-DELEGATION-002** claudetto shall defer AskUserQuestion and offer a small `ask` tool on `$.ui.ask`, guarded by a `tool.call` hook on AskUserQuestion that lets the call through only while `ask` runs.
  Acceptance: the first request sends 332 deferred bytes in place of 5,196 sent bytes (-94%); outside an `ask` call the guard returns `{ deny }`; a ToolSearch `tool.call` rewrite handles the keyword. Verification: probe.
  Basis: measured, claude 2.1.318. `permissions.deny` of AskUserQuestion fails `ui.ask`, because `ui.ask` is a `tool.call` of AskUserQuestion through every hook except the calling one ("no tool named AskUserQuestion"); so the route is Mod v2 (`tool.describe` `isDeferred:true` plus the guard). Losses: one question per call (stock up to 4) and no option preview; the build adds `multiSelect`. Status: partial at 088a227c (`delegation.ts` defers AskUserQuestion and cuts its description; no `ask` tool and no guard). The tool name AskUserQuestion is present in claude 2.1.326 (code search, chunk-85qjfjsd.js@313).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2886; plugins/claudetto/hooks/features/delegation/delegation.ts:17@088a227c.

## Fan-Out Order

- [ ] **REQ-DELEGATION-003** claudetto shall order fan-out by longest branch first, or cap fan-out to the cache window, so idle subagents do not re-pay cache at a barrier.
  Acceptance: A fan-out run shows no subagent idle past the cache window waiting on a barrier. Verification: probe.
  Basis: reported (one commenter). Status: missing at 088a227c (the plan caps children per parent with no ordering and no cache-window basis).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx5405-broken-prompt-caches-cost-me-1-20261116T050923Z.md:84 (url: https://www.reddit.com/r/ClaudeCode/comments/1xx5405/broken_prompt_caches_cost_me_106_across_57_claude/).

## Work Backlog

- [ ] **REQ-DELEGATION-004** claudetto shall keep a GitHub-issues backlog, bundle fixes into releases, and keep a control-room artifact with a sequencing dependency graph updated on each PR merge.
  Acceptance: The graph shows the next unblocked issue after each merge. Verification: demonstration.
  Basis: reported (one commenter). Status: missing at 088a227c (git grep for dependency graph found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwvu9e-the-harder-i-use-cc-the-larger-20261115T135618Z.md:52 (url: https://www.reddit.com/r/ClaudeCode/comments/1xwvu9e/the_harder_i_use_cc_the_larger_the_backlog_gets/).

## Subagent Contract And Receipt

- [ ] **REQ-DELEGATION-005** claudetto shall use a subagent only where one owner, one context, and one acceptance test make one session, never when the brief needs half the repo pasted; shall put in every subagent brief a small contract (objective, allowed files, forbidden files, input artifacts, expected output, stop condition); and shall require a return receipt: contract received, files read, files changed or explicitly not changed, commands run or checks run, result (`done`, `blocked`, or `needs-human`), a one-paragraph evidence, and a max output size. A subagent decides nothing: on an open choice, a brief contradiction, or anything destructive it stops and returns a `DECISION NEEDED` block, and the lead continues the same agent.
  Acceptance: Each delegation brief names the six contract fields. A subagent reply without a compact receipt is rejected (no receipt means a hidden full conversation); git grep for "receipt" in plugins at 088a227c finds none. The reply format is part of the order (one-line verdict, `file:line | severity | claim`, at most three proposals, about 40 lines); finished agents are not resumed; repo knowledge lives in the agent definition; the Stop hook produces or requires the summary artefact (diff stat, handoff file: done, half done, next, awaiting user decision). A subagent on a destructive step returns `DECISION NEEDED` and takes no action. Helpful for independent review, repetitive extraction, separate experiments, polluted mature sessions; wasteful for vague planning, broad implementation, "three agents think about the same thing". Verification: test.
  Basis: reported (a cheap worker that guesses costs more in rework than it saves). Status: missing at 088a227c. `SubagentStart`, `SubagentStop`, and `Stop` are present in claude 2.1.326 (code search, chunk-m33vdkhs.js@5196, @5212).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1ubfy7y-whats-really-the-big-deal-with-20261022T122113Z.md:67; external/2026-10-22/reddit.com-r-claudecode-comments-1ubfy7y-whats-really-the-big-deal-with-20261022T122113Z.md:75 (url: https://www.reddit.com/r/ClaudeCode/comments/1ubfy7y/whats_really_the_big_deal_with_subagentdriven/); external/2026-11-10/reddit.com-r-claudeai-comments-1xs1d5y-most-of-my-claude-code-tokens-we-20261110T093224Z.md:43 (url: https://www.reddit.com/r/ClaudeAI/comments/1xs1d5y/most_of_my_claude_code_tokens_went_to_subagents/).

## Read-Side Subagents

- [ ] **REQ-DELEGATION-006** claudetto shall use subagents as read-side context firewalls, not write-side implementers, and guard subagent cost: Read, Grep, and Glob only (the single-writer rule kills same-file conflicts), Agent in `disallowedTools` of custom agents to stop recursion, `maxTurns` plus a fixed return schema, a cheap model pinned to read-only agents, and default-deny Agent in CLAUDE.md with Explore and Plan whitelisted; one task per agent, short brief, 5-10 line report, split by area of code not by task, reviewers read-only, one agent owns tests, full suite once per tree from the main loop, agents never run git writes.
  Acceptance: Each custom agent lists Read, Grep, Glob, sets `maxTurns`, and disallows Agent. The pinned model is never Fable or Opus (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)). A fresh subagent has a cold cache and many tiny agents can cost more than inline; a fork carries all context (one fork burned 430k tokens); subagents were 44-47% of one user's spend; 99.0% of Sonnet and 81.3% of Opus tokens in one commenter's month ran inside subagents; broken caches cost $106 of about $2,500 (about 4%) over 57 runs, 41 of them idle subagents (tool author); a bounded fix goes by SendMessage to the same agent, after two review rounds use a fresh agent. A max-agents-per-wave cap and a per-subagent model rule are missing. Anthropic article (cited via poster): default to one model, one context, one tool loop; subagents only for measured context-bloat, parallel disposable-context work, or too many tools; tool choice degrades past 30-50 definitions. Verification: inspection and test.
  Basis: inferred (model-generated advice, unmeasured); reported and measured by authors. Status: missing at 088a227c (`plugins/claudetto/hooks/features/delegation/delegation.ts` is partial; no `disallowedTools` or per-wave cap found: git grep at 088a227c returned no file). In claude 2.1.326 the tool `Agent` and `/subtask` exist (code search, chunk-85qjfjsd.js@313; chunk-2n1m7p6b.js@22381) and `maxTurns` is a positive-integer key of the agent schema (chunk-bprgtdg6.js@298064).
  Conflict: Agent Files And Haiku Window.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:64 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/); external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:100; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:7; external/2026-11-10/reddit.com-r-claudeai-comments-1xrnt9w-cheap-judge-opus-only-on-the-unc-20261110T094216Z.md:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrnt9w/cheap_judge_opus_only_on_the_uncertain_cases_988/); external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:82.

## When To Delegate

- [ ] **REQ-DELEGATION-007** claudetto shall offload to a subagent only when the main session needs the conclusion, not the intermediate search history; delegate only where one spec buys much generation and an automatic validator keeps review cost from growing with output; work inline when it already holds the context and can finish in a few tool calls; stay single-threaded for tasks under about 5 minutes, sequential dependencies, and budget-bound work; and by context size, do small tasks inline under about 50k context (under about 5 tool calls) and prefer a subagent for self-contained work over 50k.
  Acceptance: the delegation guidance text states these conditions and a delegation check names which of conclusion or history the main session needs; offloading when intermediate context is needed later buys a 2.6-5.9x surcharge for nothing. One-shot subagents take small, well-defined charges; starting context stays under about 60k; workers start at about 11k with their own autocompact limit of 100k; five or six subagents at up to 100k each can drain a Max plan (user attributes to 24/7 running). Verification: inspection and test.
  Basis: reported and inferred; handoff overhead (write spec, wait, review) is roughly fixed per handoff; in one commenter's bench the lead read every branch, where the money went. Status: partial at 088a227c (`delegation.ts`; the 50k threshold and the rubric are missing).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:97 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/); external/2026-10-23/reddit.com-r-claudeai-comments-1xclm8k-does-delegating-save-claude-quot-20261023T025721Z.md:122; external/2026-10-23/reddit.com-r-claudeai-comments-1xclm8k-does-delegating-save-claude-quot-20261023T025721Z.md:131; external/2026-10-23/reddit.com-r-claudeai-comments-1xclm8k-does-delegating-save-claude-quot-20261023T025721Z.md:133 (url: https://www.reddit.com/r/ClaudeAI/comments/1xclm8k/does_delegating_save_claude_quota_i_measured_6/); external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:57; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:106; plugins/claudetto/hooks/features/delegation/texts.ts@088a227c (git grep: no rubric).

## Scoped MCP Servers

- [ ] **REQ-DELEGATION-008** claudetto shall scope MCP servers into a subagent's frontmatter instead of .mcp.json, so the main conversation never pays for the tool descriptions.
  Acceptance: No MCP server needed only by one subagent appears in .mcp.json. Verification: inspection.
  Basis: inferred (model advice). Status: unchecked (general practice; no baseline term to search).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:126 (url: https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/).

## Checking Worker Output

- [ ] **REQ-DELEGATION-009** claudetto shall tell the lead to check each subagent or reviewer finding and do what the subagent skipped before it reports, in the root <delegation> text and in Concise rule 3; and shall instruct a lead that spawns workers to answer for every mistake a worker makes, to fix each one as its report arrives, and to resolve each item of a report list in parallel through workers.
  Acceptance: both texts hold the check instruction and the eval case check-relayed-findings passes; after a worker report names a defect, the lead's next action fixes it or briefs a worker to fix it, and the lead's final report names no worker defect left open. Verification: test and demonstration.
  Basis: cited; reported. Status: partial at 088a227c (git grep for relayed found nothing; the lead prompt says "Finish what each report left" in plugins/claudetto/hooks/features/prompt/texts.ts:32@088a227c; accountability for worker mistakes is missing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:92 (task 8.11); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/c5883be2-6429-490e-ac16-a07683670cd6.jsonl:318, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:1510, user decision, 2026-11-12.

## Handoff By File Path

- [ ] **REQ-DELEGATION-010** claudetto shall tell the lead to name a spec file by path in a subagent prompt, so the subagent reads it, and not to read the file and paste it into the prompt; and shall have main write the work instructions to a file and point a fresh session at it, rather than have subagents chat with main.
  Acceptance: the delegation guidance text names the path form; a delegated job reads its instructions from a file, and the same job uses about 1/3 the tokens of the chat variant (one user, Opus 5.5 orchestrator). Verification: inspection and demonstration.
  Basis: reported, one commenter each, unmeasured (about half the cost of the paste step). Status: missing at 088a227c (git grep of texts.ts: no path rule).
  Source: external/2026-10-23/reddit.com-r-claudeai-comments-1xclm8k-does-delegating-save-claude-quot-20261023T025721Z.md:117 (url: https://www.reddit.com/r/ClaudeAI/comments/1xclm8k/does_delegating_save_claude_quota_i_measured_6/); external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:386 (url: https://www.reddit.com/r/ClaudeCode/comments/1xgxv58/claude_max_20x_weekly_depleted_in_less_than_25/); plugins/claudetto/hooks/features/delegation/texts.ts@088a227c.

## Subagent Calls

- [ ] **REQ-DELEGATION-011** claudetto shall tell the model to set `isolation:"worktree"` for committing agents.
  Acceptance: the Agent description says so; the hook passes `isolation` through unchanged; no agent definition sets `isolation` (a worktree holds the changes of a non-committing agent). Cause: agents committing in one tree block each other at pre-commit. In claude 2.1.326 a subagent isolated in a worktree refuses, in any repository, some Bash git commands that can rewrite branches shared with the checkout (release note). Verification: test.
  Basis: reported. Status: have at 088a227c (`plugins/claudetto/hooks/features/delegation/texts.ts:2@088a227c`). The `isolation` values `none` and `worktree` exist in a session launch schema of claude 2.1.326 (chunk-1rn7p4q1.js@7058); the Agent tool parameter itself is unverified in 2.1.326.
  Source: plugins/claudetto/hooks/features/delegation/texts.ts:2@088a227c; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Subagent Env Caps

- [ ] **REQ-DELEGATION-012** claudetto shall write the native subagent caps into settings `env`: `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (3 for claude_pro, 4 for default_claude_max_5x, read from `oauthAccount.organizationRateLimitTier` and `organizationType` in `$CLAUDE_CONFIG_DIR/.claude.json`, else `~/.claude.json`; no cap for Ultra default_claude_max_20x, an unknown plan, or an API key), `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` (the engine drops Agent from a subagent at that depth), and `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS=900000`. claudetto shall not write `CLAUDE_CODE_SCRIPT_CAPS`. A subagent is never spawned without explicit permission, and agent files pin the subagent model and allow no nested spawn.
  Acceptance: a settings write holds the three keys with these values per plan tier and no `CLAUDE_CODE_SCRIPT_CAPS`; with the cap at 1, 3 starts give 1 run and 2 errors naming the key; with `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS=3000` a hung request ends at 3 s against 25 s; a subagent at depth 1 has no Agent tool. Reported motive: 166 and 510 agents were spawned for an 8-page review under ultra effort, and one case exhausted 64 GB RAM; limits are per session (20 concurrent, 3 nesting levels; nothing counts across sessions). The depth question is answered: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` caps nested subagents (a probe on 2.1.325 was asked for; 2.1.326 not re-probed here). Verification: test.
  Basis: measured (claude 2.1.322, fake API, probes P220-P222); reported. Status: have at 088a227c (spawn depth, stall timeout, concurrent cap), partial (no `maxTurns`). The question whether claude has a depth env is answered: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` exist in claude 2.1.326 (code search, chunk-07n5vvax.js@33038; chunk-j1p9b5kw.js@341; the refusal text names the key at chunk-856xesd8.js@35454), as does `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` (chunk-cr3cxkm7.js@26718) and `CLAUDE_CODE_SUBAGENT_MODEL` (chunk-07n5vvax.js@44120).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:99; external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:22; external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:85; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:623; plugins/claudetto/hooks/features/setup/settings.ts:181@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:183@088a227c; plugins/claudetto/hooks/features/setup/changes.ts:108@088a227c; external/2026-11-10/reddit.com-r-claudeai-comments-1xphfvn-yo-claude-you-dont-need-166-agen-20261109T153055Z.md (url: https://www.reddit.com/r/ClaudeAI/comments/1xphfvn/yo_claude_you_dont_need_166_agents_for_this/); external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:56; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1912, reported, user, 2026-11-09.

## Subagent Cap Rules Beyond Env

- [ ] **REQ-DELEGATION-013** claudetto shall bound subagents by depth limit and per-parent fan-out (children per parent step) and not by a per-session running count, and shall guard across sessions: at most 4 running and 12 starts per 10 minutes across sessions; at 80% of the 5 h or weekly window ask, at 95% refuse; a prompt that re-reads 500k+ tokens asks "compact / send anyway / cancel"; in `claude -p` refuse with a reason; event-driven, no loop. A queue runs at most 6 parallel agents (`pool=6; while queue: start an agent when a slot frees`). A brief states the number and model of agents allowed, max turns, and a time budget, and the model is told the harness facts (subagents survive `/clear` and `/compact`; do not restart them); explore agents are capped to Haiku and at most 2 each; the main agent names model and effort per subagent and asks why before it starts a workflow or multi-agent pipeline. The strongest model goes only where judgment decides (architecture, integration, review, merges); mechanically verifiable work goes to Sonnet or Haiku.
  Acceptance: a fake session with 5 concurrent starts is refused with the count; a start at 96% of the weekly window is refused; the same start at 85% asks; a queue of more than 6 tasks never shows more than 6 live agents; the model text holds explicit agent-count and model rules. Verification: test and inspection.
  Basis: reported (one prompt made 394 subagent calls and 84M tokens in 10 minutes, 2 from the main conversation; 8 Fable 5.1 agents spent $100 extra-usage credit in under 5 minutes; "ignore cost, use as many agents as possible" turned a 5-minute job into a 40-agent chain; past 6-8 parallel agents one workload hit server-side rate limits and agents burned context on retries; an uncapped 19-agent Fable fan-out hit the session limit in about 45 minutes). Status: partial at 088a227c (setup env caps only; the cross-session counter, the pool cap and the justify-first rule are missing; the agent-model feature is partial).
  Source: external/2026-10-12_p2/export-Claude Code's subagent limits are per session, so I built a mod that counts across all of them.jsonl:2; external/2026-10-12_p2/export-Claude Code's subagent limits are per session, so I built a mod that counts across all of them.jsonl:14 (url: https://www.reddit.com/r/ClaudeCode/comments/1x3lx5o/claude_codes_subagent_limits_are_per_session_so_i/); openspec/specs/run-limits/spec.md:8; external/2026-10-01_p2/export-Zero Fable usage all week with my 200$ Max subscription. Then I topped up $100, got 8 Fable agents,.jsonl:1 (url: https://www.reddit.com/r/ClaudeCode/comments/1wv0r84/zero_fable_usage_all_week_with_my_200_max/); openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:21 (`CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`); plugins/claudetto/hooks/features/setup/settings.ts:181@088a227c; external/export-Opus 5.5 as a fleet orchestrator- early notes from a real workload.jsonl:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1wnmbqg/opus_55_as_a_fleet_orchestrator_early_notes_from/); external/2026-10-21/reddit.com-r-claudecode-comments-1x97ix2-a-readonly-custom-subagent-cut-20261020T101449Z.md:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/).

## Turn Caps

- [ ] **REQ-DELEGATION-014** claudetto shall set `maxTurns` in the frontmatter of each agent file, starting with Artemis, because an agent without `maxTurns` ran 400 tool calls and one with `maxTurns:5` stopped at 5 requests. The repeat guard stays: it withholds a result the loop already holds. Headless runs use `timeout 30m claude -p ... --max-turns 40`.
  Acceptance: each `plugins/claudetto/agents/*.md` holds `maxTurns`; a fake-API run with `--agents` stops at the cap. An earlier spec said each agent sets `maxTurns`; a later check found the files set none and a repeat guard replaced it. Verification: test.
  Basis: measured (probe, claude 2.1.325, fake API, `--agents`) and cited (a turn cap at P75 cuts cost 24-68%, arXiv 2510.16786); reported (subagents force-stopped at 200 tool calls, claude 2.1.280, Opus 5.5). Status: missing at 088a227c (`git grep maxTurns` finds nothing under `plugins/`); repeat guard have. `maxTurns` is still a positive-integer key of the agent schema in claude 2.1.326 (code search, chunk-bprgtdg6.js@298064).
  Conflict: Agent Files And Haiku Window.
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:108; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:185; external/export-What the hell is a turn limit (200-turn limit) and why are subagents suddenly hitting them-.jsonl:5 (url: https://www.reddit.com/r/ClaudeCode/comments/1woaxj7/what_the_hell_is_a_turn_limit_200turn_limit_and/); external/2026-10-07_p2/export-A year of all-Claude-Code dev work- where are the gaps in my workflow-.jsonl:13 (url: https://www.reddit.com/r/ClaudeCode/comments/1wzwfsn/a_year_of_allclaudecode_dev_work_where_are_the/); openspec/specs/subagent-prompts/spec.md:8.
  Conflict: Worker Resume.

## Shared Checkout Git Rules

- [ ] **REQ-DELEGATION-015** claudetto shall tell delegates to run no tree-changing git (`stash`, `pop`, `checkout`, `switch`, `reset`, `restore`, `clean`, `rebase`, `merge`) and no `git add -A` or `.`; to commit own paths with `git commit --only <paths>` or explicit staging; to assume the tree is dirty unless `git status` this session says clean; to re-read the target after a rejected, interrupted, or failed write; to kill only by saved pid and never `pkill -f`. Allowed: `status`, `log`, `diff`, `show`, `blame`, `branch --list`, `describe --tags`. Consent needed: `stash`, `checkout -- <path>`, `restore`, `switch`, `reset --hard`, `clean`, `rebase`, amend, `stash drop/clear`, branch delete, `push`, `tag`, PR open or merge, `gh release`, a default-branch commit, removing a worktree with changes. Prohibited: force-push to a shared branch. One worktree or window per parallel agent, committed before it starts, same slug for branch, folder, and tab; no shared dev-server port across worktrees; run acceptance on the merged result too.
  Acceptance: `Heracles.md` holds the `git commit --only` line and the re-read line; a stash or `-A` call by a delegate is denied. In claude 2.1.326 a subagent isolated in a worktree already refuses some branch-rewriting git commands in Bash (release note), and `ExitWorktree` refuses to remove a worktree while a background subagent or shell command may run in it unless `discard_changes` is passed. Verification: inspection.
  Basis: reported (n=2 conduct, n=3 tool; stash and pop restored 81 staged deletions; every branch passed and the merge failed the same six tests 5 of 5). Status: missing at 088a227c (`git grep -F 'git commit --only'` finds nothing under `plugins/`).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:37; external/please-use-me-often/agent-failure-dossier/judged/conduct.jsonl:43; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:73; external/please-use-me-often/agent-failure-dossier/judged/HANDOFF-D.md:13; external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:38; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:74 (url: https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/); https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Time Steer for Background Workers

- [ ] **REQ-DELEGATION-016** claudetto shall send a status-request steer to a background worker after about 30 minutes (1 hour at most) and stop a worker whose change leaves its brief; the sentence goes in the lead's prompt.
  Acceptance: the lead prompt text holds the 30-minute steer sentence. Verification: inspection.
  Basis: reported (an Opus 5.5 task of about 2 hours ran 6 hours; n=5, 3). Status: missing at 088a227c (run-limits count calls and context, not time).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs1d5y-most-of-my-claude-code-tokens-we-20261110T093224Z.md:31 (url: https://www.reddit.com/r/ClaudeAI/comments/1xs1d5y/most_of_my_claude_code_tokens_went_to_subagents/); external/please-use-me-often/agent-failure-dossier/judged/conduct.jsonl:23; openspec/specs/run-limits/spec.md:8.

## Delegation Pipeline Gates

- [ ] **REQ-DELEGATION-017** claudetto shall run delegation as gates: an issue or spec first, then a plan, the plan critiqued by a second agent before the build and corrected, implementation, then review by another agent against the original spec. The plan lists the files it expects to change and the implementer asks before it touches others. The lead splits work into non-overlapping slices itself. Briefs carry scope fences and a pre-merge gate reads the diff; a flagged judgment call of the owner is a blocker and the agent stops.
  Acceptance: Metis, Heracles, and Athena prompts name the gate order; a brief without a scope fence fails inspection; failure reasons are asked before the build (post-mortem framing: "project already failed, list top 3-5 reasons"); the critic gives three strongest counterarguments or a failing test, in a fresh chat; full context beats magic words; "you explained this yesterday" tricks invite fabricated history (reported consensus). Cited: sycophancy from preference data [2310.13548]; collapse grows with pressure, the correct answer often stays in the reasoning trace [2609.09090]; ClarifyGPT 70.96 -> 80.80 pass@1 [2310.10996]; Ambig-SWE up to 74% [2502.13069]; RL clarifier 41% fewer questions [2604.14624]; the top comment (367): "ask one clarifying question". Verification: inspection and demonstration.
  Basis: cited; reported (17 Sonnet agents: 12 PRs, 2 of about 15 needed rework, zero fence breaches; weakness: an agent flagged a judgment call and kept going). Status: partial at 088a227c (Metis, Athena, Heracles exist in plugins/claudetto/agents/; escalation ladder, retro agent, blind-reviewer role and the critic role missing or unchecked).
  Source: external/2026-10-25_p2/reddit.com-r-claude-comments-1wt0kox-is-it-me-or-sonnet-55-doesnt-make-20261025T160610Z.md:45 (url: https://www.reddit.com/r/claude/comments/1wt0kox/is_it_me_or_sonnet_55_doesnt_make_sense_at_all/); external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:49 (url: https://www.reddit.com/r/ClaudeAI/comments/1xkrwiv/i_tried_running_the_cloudflare_securityaudit/); external/2026-11-10/reddit.com-r-claudeai-comments-1xrtmvs-asking-claude-what-do-you-need-t-20261109T151940Z.md:60 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrtmvs/asking_claude_what_do_you_need_to_know_before/); external/2026-11-10/reddit.com-r-claudeai-comments-1xphfvn-yo-claude-you-dont-need-166-agen-20261109T153055Z.md:41 (url: https://www.reddit.com/r/ClaudeAI/comments/1xphfvn/yo_claude_you_dont_need_166_agents_for_this/); external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:173; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:47. The other arXiv ids: Source: unresolved, not located.

## Agent Message Form

- [ ] **REQ-DELEGATION-018** claudetto shall hold each agent message (Agent prompt or SendMessage) to the task, the inputs, the done-check, and only what the agent cannot find itself, one message per agent; shall have the lead brief each worker with the five Ws (who, what, where, when, why) in specific terms, so parallel workers do not drift apart; and shall write replies to a person in plain English.
  Acceptance: the delegation text states the five parts and tells the lead to include goal, files or area, limits, stop condition, and reason; measured plugin message 375 chars against 517 for base, Flesch-Kincaid 4.37 against 4.96. Verification: test and inspection.
  Basis: measured (plugin A/B) and observed in transcript (fresh `search` subagent about 5k tokens, `work` about 11k, cold start, 6 runs); user decision, 2026-11-12 (the five Ws). Status: have at 088a227c for the message form; missing for the five-Ws brief rule (`plugins/claudetto/hooks/features/delegation/texts.ts` holds no brief rule).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:325; plugins/claudetto/hooks/features/delegation/texts.ts@088a227c; openspec/specs/subagent-prompts/spec.md:28; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:1870, user decision, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:2755, user decision, 2026-11-12.

## Review Loop Caps

- [ ] **REQ-DELEGATION-019** claudetto shall give a review loop something checkable (a test or a checklist) and end it by a cap or by finding severity: one pass (list findings, fix, stop) or three passes with leftovers listed; iterate while a finding is P1 or P2 and stop when only P3 findings remain after a couple of rounds; cap a spec review loop at 3 revise cycles unless the user waives the cap, with each cold reviewer given a different lens, one told to find the fundamental flaw. The reviewer sees only the acceptance criteria and the diff, not the implementer's summary.
  Acceptance: the review prompt names the round cap and the inputs; a loop that reports only P3 findings ends without another round, and a loop with a P1 or P2 finding runs another round; a fourth spec-review cycle starts only after the user waives the cap; each reviewer prompt names its own lens. Verification: test and inspection.
  Basis: reported (a Sonnet 5.5 run at max effort overthought with 300k thinking tokens and no output; high or medium finished sooner; one heavy user for severity; one commenter for the 3-cycle cap, lens results mixed, a second model family with no project memory forces reading from documents). Status: partial at 088a227c (`plugins/claudetto-openspec/skills/verify/SKILL.md` exists; the exit rule was not read); missing for severity and the cycle cap.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xw2sit-ai-model-roles-in-a-project-20261116T051438Z.md:87 (url: https://www.reddit.com/r/ClaudeCode/comments/1xw2sit/ai_model_roles_in_a_project/); external/export-I analyzed 246 repos and 57 papers on agent harnesses. Here's what actually works.jsonl:14 (url: https://www.reddit.com/r/ClaudeAI/comments/1wpzynz/i_analyzed_246_repos_and_57_papers_on_agent/); external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:130 (url: https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents/); external/2026-10-25/reddit.com-r-claude-comments-1xclxdw-opus-55-is-so-good-remember-to-use-20261024T141513Z.md:361 (url: https://www.reddit.com/r/claude/comments/1xclxdw/opus_55_is_so_good_remember_to_use_xhigh_effort/).

## Review Gates

- [ ] **REQ-DELEGATION-020** claudetto shall run a review as gates, each a pair in sequence: one constructive reviewer (simplification, spec conformance) and one adversarial reviewer (what could go wrong), each able to fix.
  Acceptance: a review ends when only low and medium issues are fixed; a fix that touches the core is reviewed again; a fourth set stops the loop and reports a spec smell. Verification: inspection.
  Basis: reported, one commenter (2 sets usual, 3 an outlier). Status: missing at 088a227c (Athena is a single read-only reviewer: plugins/claudetto/agents/Athena.md:3).
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xclxdw-opus-55-is-so-good-remember-to-use-20261024T141513Z.md:371 (url: https://www.reddit.com/r/claude/comments/1xclxdw/opus_55_is_so_good_remember_to_use_xhigh_effort/).

## Fresh Reviewer Input

- [ ] **REQ-DELEGATION-021** claudetto shall run gates mechanically with no model tokens and review in a fresh context with a separate verifier: scripts, tests, and lint serve verifiable claims, and a different model that sees only the artifact (not the producer's reasoning) serves judgment; the adversarial reviewer runs in a fresh context, not inside a long one.
  Acceptance: an agent runs only when a gate fails and the output needs diagnosis; code is never reviewed in the session that wrote it (subagent or other-family model); the reviewer is told not to trust the first-pass conclusion, gets the diff, requirements, and relevant code but not the writer's explanation, and gives a concrete failure case per finding; the builder validates each finding before fixing; test suite first, spec second, spec-less LLM review last; a prompt-writer and checker run one write, one check, then stop; the reviewer's context holds no earlier turns of the session it reviews. A second LLM of the same family and context is weak evidence, and the author is the worst judge and inherits rationalisations from the conversation; an architect agent's plan is verified by executing it (run the DDL, replay the mutation sequence) before a panel's scores are trusted. Reported: one tool author found outside reviewers found 14 bugs while 10 tests were green; Opus 5.5 at high plans over-build (ClickHouse for a shortener, 256-shard Redis; simplicity lost 4 of 5). Verification: demonstration and inspection.
  Basis: reported; tool-author interest; one commenter, unmeasured (models nitpick more as context grows). Status: missing at 088a227c (no fresh-context reviewer hook found). `SubagentStop` and `TaskCompleted` are present in claude 2.1.326 (code search, chunk-m33vdkhs.js@5212, @5365).
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:120; external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:163 (url: https://www.reddit.com/r/ClaudeAI/comments/1xfa39o/is_claude_the_least_yesman_llm/); external/2026-10-12_p2/export-In-house benchmark- what agent is better for code-architect planning- Opus 5.5 high vs Fable 5.1 hig.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x3hmr1/inhouse_benchmark_what_agent_is_better_for/).

## Prompt-Sharpening Command

- [ ] **REQ-DELEGATION-022** claudetto shall offer a prompt-sharpening command that reads repo state through a named strong subagent and returns questions instead of acting.
  Acceptance: the command returns a list of questions and makes no edit. Verification: demonstration.
  Basis: inferred. Status: missing at 088a227c.
  Source: unresolved: no source holds this command; kept from the user's curation of the old plan.

## Required Delegation Check

- [ ] **REQ-DELEGATION-023** claudetto shall confirm, when the user's instruction requires a subagent or a named reviewer, that an Agent or Task call occurred before the reply.
  Acceptance: An instruction "use a reviewer" with no Agent call blocks the reply once. Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:193 (issue #42856; https://github.com/anthropics/claude-code/issues/42856); plugins/claudetto/hooks/features/delegation@088a227c (scope to verify).

## Delegate Contract Injection

- [ ] **REQ-DELEGATION-024** claudetto shall inject the Delegate Contract at `SubagentStart` as `additionalContext`, with one source text: bound by the Terms, report outcomes faithfully, done only after a real check with command and exit code, and a denied call means the user declined it and is not retried in any form. The agent bodies (2,720 chars) drop "report outcomes faithfully" and "a denied call means the user declined it" (two lines claude 2.1.312 drops); the limit is that it is still text.
  Acceptance: A subagent transcript begins with the contract text; no agent file or hook carries the two lines today. `texts-gate.ts:129` told the agent to run git writes with the sandbox off instead of finding the in-sandbox fix. Verification: test and inspection.
  Basis: reported; read. Status: missing at 088a227c (no `SubagentStart` hook or "faithfully" in plugins/). `SubagentStart` is present in claude 2.1.326 (code search, chunk-m33vdkhs.js@5196).
  Source: external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:28 (SA-2.3); external/please-use-me-often/agent-terms/DELEGATION-AGREEMENT.md:11 (DA-1.1); external/please-use-me-often/agent-terms/DELEGATION-AGREEMENT.md; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:119; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:147; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:33; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:281; openspec/changes/2-1-325-rearchitecture/design.md:286.

## Hand-Back Guard and Form

- [ ] **REQ-DELEGATION-025** claudetto shall refuse `SubagentStop` while the subagent's own jobs run (no hand-back while a started job runs, unless it hands over PID, log and lock), keep a registry of in-flight PIDs and locks, warn at turn N-2, and require the hand-back form: notices first (`BLOCKED`, `REJECTED`, `NEEDS-CONSENT`, `PARTIAL (turn limit)`, `UNVERIFIED`), then `Outcome`, `Changed`, `Evidence` (command to exit, n of N, log paths), `Not done`, `Running jobs handed over`, also written to the brief's report path. The principal audits each hand-back against diff, evidence, logs, `agent_transcript_path`, `toolsUsed`, and `resolvedModel`, and relays unverified items labelled; a delegate report is a Claim: verify it against artifacts or label it unverified. The brief form is `Task`, `Scope`, `Terms`, `User-Owned Values in play`, `Corrections so far (verbatim)`, `Rejections so far`, `User approvals that apply (verbatim, with scope)`, `Known facts`, `Budget` (keep the last 2 turns for hand-back), `Report`; approvals are quoted verbatim because a delegate's permission check sees only its own transcript (a runtime rule for briefs; the plan-file rule that the user is not quoted verbatim does not apply to it). Delegate only parallel, isolated or independent work. A delegate that meets a rejection, a block or a user-owned value stops and reports in the first line (background delegates cannot see the user). Each agent tries another route before it reports a block. Agent bodies are two plain paragraphs with no XML, frontmatter name, description, model and tools only. Heracles ends with what it did, what it checked and the result, and what is left, each defect marked reproduced (command and output) or read (`file:line`). Artemis ends with one `path:line` plus an excerpt per finding and names a needed write or command without running it. Metis lists steps, files, risks, and the check command and names what it could not find. Athena reports a defect as `path:line`, what, and why.
  Acceptance: A subagent with a live job cannot stop; a hand-back lacks no field of the form; each of the four agent files has two paragraphs, no tag, and the report line above. Reported: 10 turn-limit notices (60 and 80 turn) in 6 sessions left subagents of 116k to 266k tokens with no report (one ended `SubagentHandback` at 15 of 16 turns; a prose rule in the agent file failed in a live run); `handback-send-enforce` reminders fired 9 times in 7 sessions; the concurrent-subagent cap was hit in 2 sessions; a probe disproved "a background job dies with its subagent turn". Verification: test and inspection.
  Basis: measured; reported. Status: partial at 088a227c (the four agent files have the body form, `plugins/claudetto/agents/Heracles.md@088a227c`; the hand-back guard and registry are missing; `plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c`). `SubagentStop` is present in claude 2.1.326 (code search, chunk-m33vdkhs.js@5212). The DIRECTOR `texts.ts` "task, inputs, check" is the shorter brief.
  Source: external/please-use-me-often/agent-terms/DELEGATION-AGREEMENT.md:11; plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:33; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:119; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:281; openspec/changes/2-1-325-rearchitecture/design.md:286; openspec/specs/subagent-prompts/spec.md:28; openspec/specs/subagent-prompts/spec.md:49; plugins/claudetto/agents/Heracles.md@088a227c.

## Model Allowlist Hook

- [ ] **REQ-DELEGATION-026** claudetto shall ban an unlisted model with a hook so no unexpected Fable draw happens (one user stopped it this way; cause unconfirmed, an advisor spawn is suspected).
  Acceptance: A spawn naming an unlisted model is refused. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: unresolved: the old-plan source tag was not located in external/, openspec, or code at 088a227c.

## Subagent Task Size

- [ ] **REQ-DELEGATION-027** claudetto shall steer the lead to give side agents small, short slices of work, to send out many bounded workers each with one task slice, and to keep tasks that run 40 to 50 minutes in its own session.
  Acceptance: The delegation rule text names small short slices as the unit of a subagent task and names a long task as one the lead keeps or splits; a task with several independent slices gets one bounded worker per slice, each with a stated limit. Verification: inspection and demonstration.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/agents/Artemis.md` and `hooks/features/delegation` hold no task-size rule).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:9, user decision, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:10068, user decision, 2026-11-12.

## Subagent Handoff Thresholds

- [ ] **REQ-DELEGATION-028** claudetto shall make a subagent stop and write a handoff for the remaining work only when it works over 20 minutes or its context passes 30%, and the main agent shall spawn a fresh one; and shall cap a worker at 60 tool calls and hand off at 100K tokens (soft) and 150K tokens (hard), with each agent logging what it did and the result saved for the next agent, and restart by context pulled in, since one huge log can outweigh dozens of narrow searches.
  Acceptance: A worker that passes 60 tool calls or 150K tokens stops and hands off. An auto handoff at about 175K context (the subagent writes a handoff doc, terminates, the caller spawns a new one) cut weekly burn about 60% over several weeks (it shifts billing from cache writes to reads, not tokens); a stop at about 150 tool calls carries a HANDOFF block; a heartbeat ping about every 45 min keeps the 1-hour cache warm during tool calls over an hour (commenter doubt: may violate usage terms or burn quota, inferred); the extracted compact prompt travels as an in-branch `.md` so the summary travels with the branch. Verification: test.
  Basis: reported (one user burned an entire Max 20x weekly limit in 28 hours with Sonnet agents at 1M+ tokens before the cap). Status: missing at 088a227c. `SubagentStart` and `SubagentStop` are present in claude 2.1.326 (code search, chunk-m33vdkhs.js@5196, @5212).
  Source: external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:37; external/2026-11-10/reddit.com-r-claudeai-comments-1xs1d5y-most-of-my-claude-code-tokens-we-20261110T093224Z.md:45; external/2026-11-10/reddit.com-r-claudeai-comments-1xs1d5y-most-of-my-claude-code-tokens-we-20261110T093224Z.md:80 (url: https://www.reddit.com/r/ClaudeAI/comments/1xs1d5y/most_of_my_claude_code_tokens_went_to_subagents/).

## Cheap Model Jobs

- [ ] **REQ-DELEGATION-029** claudetto shall list Haiku-low jobs: change-log summaries capped at 20 words per entry, command output to a Markdown table, proofreading with TODO markers, and condensing of built-in webfetch.
  Acceptance: The delegation text names each job. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:39; external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:41; external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:42 (url: https://www.reddit.com/r/ClaudeAI/comments/1xsgul7/does_anyone_other_than_opus_and_fable_actually/).

## Task Shape Split

- [ ] **REQ-DELEGATION-030** claudetto shall split tasks by shape, not by repo size (a reading audit with a tight checklist suits a cheap model; interface-touching design does not), and shall price the verification step (the parent re-reading child output) separately.
  Acceptance: A delegation estimate lists the verification cost as its own line. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:286 (url: https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/).

## Strong Model Role Splits

- [ ] **REQ-DELEGATION-031** claudetto shall write spec docs on the stronger model and hand implementation to Opus, and shall ask Fable for a concrete review of a hard-to-use UI before Opus implements the suggestions.
  Acceptance: A spec is authored in a Fable main session and implemented by Opus. Verification: demonstration.
  Basis: reported, one comment. Status: missing at 088a227c.
  Conflict: Plan Strong Implement Cheap.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xs6tkq-for-those-of-you-who-use-fable-20261110T095324Z.md:192 (url: https://www.reddit.com/r/ClaudeCode/comments/1xs6tkq/for_those_of_you_who_use_fable_daily_what_does_it/).

- [ ] **REQ-DELEGATION-032** claudetto shall plan on Opus or Fable high, implement on a cheaper model (Sol on Copilot, else Haiku xhigh), and review on Opus medium.
  Acceptance: The role table holds the three steps and their models. Verification: inspection.
  Basis: reported, one comment. Status: missing at 088a227c.
  Conflict: Strong Model Role Splits (the item that implements on Opus).
  Source: external/2026-11-10/reddit.com-r-claudecoding-comments-1xs84wp-tldr-fable-52-high-vs-opus-5-20261110T095106Z.md:49 (url: https://www.reddit.com/r/ClaudeCoding/comments/1xs84wp/tldr_fable_52_high_vs_opus_55_xhigh_via/).

- [ ] **REQ-DELEGATION-033** claudetto shall keep a running list of problems Opus fails on and hand the whole list to Fable in one session (Fable for the hard 10%, Opus for the rest), with Opus designing, Sonnet developing, and Haiku doing QA by using the app without code access; routine edits stay off Fable.
  Acceptance: The list file exists and one Fable session receives all of it. Verification: demonstration.
  Basis: reported (one author says full-send Fable kills a weekly limit in 8 hours). Status: missing at 088a227c.
  Source: external/2026-11-13/reddit.com-r-aigamedev-comments-1xtallk-is-fable-52-and-improvement-ove-20261111T233500Z.md:265 (url: https://www.reddit.com/r/aigamedev/comments/1xtallk/is_fable_52_and_improvement_over_opus_55_for_game/).

## Dispatch Payload

- [ ] **REQ-DELEGATION-034** claudetto shall keep the coordinator out of the memory role: one short rules file that every worker reads at start; the coordinator sends only goal, inputs, and what done looks like; each worker writes status to a shared file or queue so a dropped task shows as a task with no status; a rule change deletes the old line.
  Acceptance: A dispatch payload is self-contained; a task with no status line is reported as dropped. Verification: test.
  Basis: reported, two commenters. Status: missing at 088a227c.
  Source: external/2026-11-11/reddit.com-r-claudeai-comments-1xsrfpg-opus-is-not-a-great-coordinator-20261110T172506Z.md:71 (url: https://www.reddit.com/r/ClaudeAI/comments/1xsrfpg/opus_is_not_a_great_coordinator/).

## Review Findings Through The Orchestrator

- [ ] **REQ-DELEGATION-035** claudetto shall send each cross-model review through the orchestrator to the builder, so a finding gets two chances to be rejected.
  Acceptance: A review finding reaches the builder only after the orchestrator passed it on; a rejection by either is logged. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:138 (url: https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents/).

## Cross-Session Review

- [ ] **REQ-DELEGATION-036** claudetto shall run a review agent over all sessions of one change before each handoff and before the final merge, to check that temporary measures were removed and no semantics or invariants were lost.
  Acceptance: The review reports each lost invariant and each leftover temporary measure; a medium Sonnet-class model is enough. Verification: demonstration.
  Basis: reported, one user. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xftq1a-using-fable-51-as-architect-opus-20261029T124053Z.md:50 (url: https://www.reddit.com/r/ClaudeAI/comments/1xftq1a/using_fable_51_as_architect_opus_55_in_claude/).

## Implementer Report

- [ ] **REQ-DELEGATION-037** claudetto shall have each implementer report end with a touch table (each file with its +/- line counts against the base commit, plus untracked files) and a contradictions section that logs every handoff premise the tree did not match.
  Acceptance: A report without both sections is incomplete. Verification: inspection.
  Basis: reported, one user. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xftq1a-using-fable-51-as-architect-opus-20261029T124053Z.md:100 (url: https://www.reddit.com/r/ClaudeAI/comments/1xftq1a/using_fable_51_as_architect_opus_55_in_claude/).

## Outside Review Of Risky Steps

- [ ] **REQ-DELEGATION-038** claudetto shall give a risky step (security, money, background jobs, data) a review by an outside model before the build and again after, and shall have a subagent log progress to a file and stop at about 80 tool calls so a fresh one resumes.
  Acceptance: A risky step carries two review records; a subagent stops near 80 tool calls and a successor resumes from its progress file. Verification: demonstration.
  Basis: reported, one user (Codex review and the 80-call stop). Status: missing at 088a227c.
  Source: external/2026-10-31/reddit.com-r-claude-comments-1xixg9h-is-the-consensus-currently-that-fa-20261031T082729Z.md:208; external/2026-10-31/reddit.com-r-claude-comments-1xixg9h-is-the-consensus-currently-that-fa-20261031T082729Z.md:202 (url: https://www.reddit.com/r/claude/comments/1xixg9h/is_the_consensus_currently_that_fable_51_is/).

## Lint At Stop And Diff Review

- [ ] **REQ-DELEGATION-039** claudetto shall run a mechanical check such as a dead-code linter in a hook that runs after edits or before the turn ends and blocks the stop until Claude cleans up, and shall run review as a separate subagent with a short checklist that reads only the diff.
  Acceptance: The stop is blocked while the linter reports. A commenter gives the reason: an implementer that reads a long rules doc drops the items near the end; text rules stay for judgment calls such as naming, architecture and what not to touch. Verification: test.
  Basis: reported, one commenter (low confidence). Status: missing at 088a227c (git grep for periphery, knip, dead code finds no such hook).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlr0pk-turning-a-repeated-review-find-20261102T184719Z.md:87 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlr0pk/turning_a_repeated_review_finding_into_a_written/).

## Worktree Environments

- [ ] **REQ-DELEGATION-040** claudetto shall give each worktree its own environment: docker compose -p <branch> for containers, network and volumes, with ports from a per-worktree .env or derived from the branch name; a fresh database per branch built from migrations and seed, never a shared one; a per-branch preview deploy where the host has one; and one deploy and test worker that owns the shared environment, reports results per commit SHA and takes submissions from a queue while agents keep doing local checks.
  Acceptance: Two worktrees run at once without a clash on containers, database or ports; only the final integration run on main stays serial. Verification: demonstration.
  Basis: reported, two commenters. Status: partial at 088a227c (plugins/claudetto/hooks/features/delegation/texts.ts:2@088a227c names isolation: "worktree"; no per-branch database or compose project).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlz2bs-how-do-you-manage-worktrees-wh-20261102T184347Z.md:105; external/2026-11-03/reddit.com-r-claudecode-comments-1xlz2bs-how-do-you-manage-worktrees-wh-20261102T184347Z.md:47 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlz2bs/how_do_you_manage_worktrees_when_your_agents_end/).

## Finding Validation

- [ ] **REQ-DELEGATION-041** claudetto shall require a repro per review finding (file, line, failing input) and drop findings without a failing test, ask only for material problems, severity-sorted, confidence >95%, and validate each review comment as a claim against file and callers (trace execution) with a verdict valid, partly valid, wrong or style, with `file:line`.
  Acceptance: Asked to find bugs it always will, so: identify first and fix one by one in a separate session; give a goal other than finding issues; adversarial review by another model; count alone is meaningless (a scan reported 467 leaked keys, real 1). Reported: filtering CodeRabbit kept 72 of 77 real bugs and removed 76 of 223 comments (noise items), F1 35.2% -> 40.4% on 50 PRs (cited, author-run). Advisor value is a fresh perspective on a long thread; a separate review session loses less bias but needs context. Verification: test.
  Basis: reported; cited (author-run). Status: partial at 088a227c (agents/*.md model and effort fields; features/agent-model/model.ts); the repro rule and verdicts are missing.
  Source: external/2026-10-03/export-Open-source Claude Code plugin- validate PR review comments against the code before acting on them (.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1wweu6q/opensource_claude_code_plugin_validate_pr_review/); external/2026-10-14/export-Does Claude Code find new bugs every time you ask it to review your code.jsonl:31 (url: https://www.reddit.com/r/ClaudeAI/comments/1x4ssct/does_claude_code_find_new_bugs_every_time_you_ask/).

## Junior Ticket Handoff

- [ ] **REQ-DELEGATION-042** claudetto shall hand delegated work over like a junior-developer ticket: small tickets end to end with clear acceptance criteria, each agent in its own area, a shared contract pinned before parallel work (one CLAUDE.md per important folder, API specs), and a scheduled housekeeping agent for dead code, oversized files, unused exports.
  Acceptance: each unrelated finding of the housekeeping agent becomes a ticket, not a drive-by fix; the PR is reviewed, not the prompts. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/please-use-me-often/swe-worst-practices.md:185 (weak match; the junior-developer wording was not located).

## Parallel Agent Collisions

- [ ] **REQ-DELEGATION-043** claudetto shall check each PreToolUse call for a collision with another agent on the same repo and send a mailbox notice to the other agents.
  Acceptance: unproven; hypothesis. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-02/export-What I learned using PreToolUse-PostToolUse hooks to coordinate several Claude Code agents on one re.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1wvocfg/what_i_learned_using_pretooluseposttooluse_hooks/).

## Agent Files and Haiku Window

- [ ] **REQ-DELEGATION-044** claudetto shall ship four agent files and no more: `Artemis` (`claude-haiku-5-5`, effort high with xhigh allowed, `autoCompactWindow` 100000, tools Read, Grep, Glob), `Metis` and `Athena` (`claude-sonnet-5-5`, medium, Read, Grep, Glob), `Heracles` (`claude-sonnet-5-5`, medium, all tools); no Fable or Opus in a frontmatter; no `omitClaudeMd`. Only Haiku gets a window: Haiku 5.5 bills input at $0.50 per MTok past 100,000 prompt tokens against $0.10 at or below (cache reads and writes count; about 5% of requests carried 73% of cost); `autoCompactWindow: 100000` gives a window of 80,000 (less a 20,000 reserve) and a trigger at 40,000, with a warning when the fixed prefix (about 147k) exceeds it.
  Acceptance: each file sets model, effort and tools as listed; no frontmatter names Fable or Opus. The 2.1.323 spec also has each agent set `maxTurns`; the repo drops it (see Source). `agents/Athena.md` frontmatter holds `model: claude-sonnet-5-5` (user decision, 2026-11-16, recorded in the handover). Verification: inspection.
  Basis: cited, hypothesis; reported (community advice relayed by the user; no source found for the Haiku effort; the schema accepts an integer from 100000 to 1000000 for `autoCompactWindow` that only lowers the inherited window, cited via cc-inspect). Status: partial at 088a227c (plugins/claudetto/agents holds the four files with the stated model, effort and window; CHANGELOG.md:108 says the agents set no `maxTurns`).
  Conflict: Turn Caps.
  Conflict: Read-Side Subagents.
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:89; openspec/changes/archive/2026-11-16-2-1-323/design.md:97; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:37; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5669; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6028; plugins/claudetto/agents/Artemis.md:4@088a227c; reported, user, 2026-11-13; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).

## Waiting With Monitor

- [ ] **REQ-DELEGATION-045** claudetto shall wait through a background Bash with completion notifications and `Monitor` for conditions (the harness blocks a bare `sleep`); watch through the built-in `Monitor`, with no own tool; the gate and the memory hold judge a Monitor `command` as Bash and deny no Monitor call for being built-in. Ask once, late, with one decision-ready brief ("push right": maximal prepared work before the human is involved). At heavy context a cap on tool calls per period holds the next call with one reason line. Probe discipline: a launcher that exits 0 proves no effect; score recall on answers; only the arm with `handoffOnBoundary` gets the hand-off ask.
  Acceptance: a Monitor call runs through the same checks as Bash. In claude 2.1.326 a Monitor watch that expires with no events and whose command wrote to stderr tells Claude so and names the file that holds the output (release note). Verification: test.
  Basis: reported. Status: partial at 088a227c (hooks/features/memory holds the memory guard; the repeat guard was not re-read).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:102; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:159; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Watch Background Tasks

- [ ] **REQ-DELEGATION-046** claudetto shall make the agent check each background shell or task it starts, and stop its own stuck task, without the user asking for progress.
  Acceptance: a background task that makes no progress is checked and stopped by the agent before the user asks. Verification: demonstration.
  Basis: reported, one user. Status: missing at 088a227c (`git grep -i background 088a227c -- plugins/claudetto/hooks/features/delegation` finds only a test of `run_in_background`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:1257, reported, user, 2026-11-09.

## Effort Selection

- [ ] **REQ-DELEGATION-047** claudetto shall choose effort by task: default medium; low for well-defined tasks and chat and for narrow retrieval subagents (not ones making codebase decisions); medium for real work and mechanical implementation from a step list, renames and small fixes (low or medium); high for planning, unfamiliar scoping, edge-case bug fixes and review, or when the goal is ambiguous or several answers are right; xhigh only for the planning turn, architecture, a first plan, or after high failed or a bug survived one attempt; max rarely; no Sonnet at xhigh or max. Medium with a redo at higher effort on failure beats xhigh or max; the same test failing twice escalates the stuck subtask.
  Acceptance: the delegation text names the effort per task kind and the escalation rule; effort rises when the model struggles, not before. One measured task: Sonnet 5.5 low scored 4.10/5 at 4.32 cents/pick and beat medium; Haiku xhigh reported best over high in a 13-test comparison; per-call cost for one user: low about 0.45 USD, medium 0.85, high 2.35; an easy debug took 1.5 minutes at medium and 9 at xhigh; max about 6x medium usage (one commenter). Max front-loads thinking (fewer tool loops) while max also over-engineers and writes tests of tests (contested). Verification: inspection.
  Basis: reported, contested; cited (thinking tokens are output tokens). Status: partial at 088a227c (agent files carry `effort:`, `plugins/claudetto/agents/Athena.md:5@088a227c`; no rule picks effort by task). `/effort` exists in claude 2.1.326 (release notes name `/effort <level>`).
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:93 (url: https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down/); external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:77; external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:81; external/2026-10-21/reddit.com-r-claudecode-comments-1xak96j-i-measured-87000-of-my-claude-20261020T074808Z.md:84 (url: https://www.reddit.com/r/ClaudeCode/comments/1xak96j/i_measured_87000_of_my_claude_code_api_calls_two/); plugins/claudetto/agents/Athena.md:5@088a227c; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Single Agent First

- [ ] **REQ-DELEGATION-048** claudetto shall use a single agent unless the task decomposes into low-shared-context parts: one worktree and disjoint files per worker, merge one at a time, acceptance tests on the MERGED result; each task owns files or folders and same-area tasks run in sequence; finished worktrees and branches are removed in the merge step after a check of ignored files (`du -sh`: 90 GB of Rust target dirs in 8 dirs); a fixed pool of named worktrees via `--worktree <name>`; a dev-ops agent runs larger tests once per batch; commit before an agent starts so recovery is deleting a folder; fan-out and turns are capped and workers journal; a different model reviews given artifacts, not summaries.
  Acceptance: merged-result tests run after each merge. Reported: per-branch green, merged failed the same 6 tests 5 of 5; a merge queue took 44 minutes. Fan-out cost: spawning a subagent costs 60-70k uncached tokens (one measurement), so 20 agents cost about 1.5M; about 71 verifier agents cost 4.7M tokens and gave 3 wrong headline findings while one narrow agent with 77k tokens was right; questions about own code, config, or data are answered by measuring, work is inline by default, never one verifier per finding, and a verifier gets the bare claim and is told to assume it false; a pre-spawn check (already shipped, defect still there, small enough alone) plus a spawn ledger (2 of 9 builders, about 17% of subagent tokens, went to shipped work). Open probe: whether children inherit hooks and permissions is unprobed (stated for 2.1.325; unverified in 2.1.326). In claude 2.1.326 `ExitWorktree` refuses to remove a worktree while a background subagent or shell command may still run in it, unless `discard_changes` is passed (release note). Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (the Heracles agent and `just` worktree recipes exist).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:752; external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:110; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Director Model

- [ ] **REQ-DELEGATION-049** claudetto shall run the lead as a director that manages subagents doing the work and holds them to the plan and the end goal: the lead owns objectives, priority, goal, plan, integration, continuity, and final verification; subagents split by context, not problem type; delegates bounded work to named workers with durable handoffs; a committing worker gets a worktree; each report is checked; routine choices are autonomous and genuine user decisions go through `AskUserQuestion`; direct work wins for probes and small fixes and workers take multi-file parallel slices; Haiku has no delegation; the root model is opus-5-5[medium]. The root prompt holds a director role line.
  Acceptance: a delegated task returns a handoff to the root; the root model reads opus-5-5[medium]; workers cost 62k-126k tokens and 159-350 s per 80-500 lines (measured). Each worker is named for a Greek deity and leaves a durable handoff file the root reads. Verification: demonstration and inspection.
  Basis: measured (the worker costs); reported, one practitioner (roles: the orchestrator writes briefs, reads summaries, and runs the full suite; the user's draft of the director line, offered as an idea to look into); user decision, 2026-11-14. Status: partial at 088a227c (agents/, features/delegation, features/agent-model); the baseline root prompt was not compared for the role line. `AskUserQuestion` is present in claude 2.1.326 (code search, chunk-85qjfjsd.js@313).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:96; external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:13; user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19, reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (goal; two parallel Heracles workers with handoff files, 0 denials).

## Delegation Against Direct Work

- [ ] **REQ-DELEGATION-050** claudetto shall test delegation against direct execution, keep subagents short, and end each subagent with a handoff inside its cache window.
  Acceptance: delegation shows no worse cost or result than direct work; no subagent outlives its cache window. Verification: probe.
  Basis: reported. Status: unchecked (cache window not measured in this pass).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408).

## Task Framing

- [ ] **REQ-DELEGATION-051** claudetto shall frame a task by naming the file, the decision already made, what not to touch, and how to verify (a one-line request makes the agent guess); a `/prompt` command spawns subagents to map code and write a file-and-line-specific prompt; anchors ("copy `middleware/throttle.py:18`"); alternatives are compared to stated constraints; a "report steps in order before changing code" line gives a cheap plan in auto mode (a commenter objects it adds tokens); ask one clarifying question, then proceed.
  Acceptance: a brief holds the four named parts. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: unresolved: no source line holds the framing text.

## Subagent Model

- [ ] **REQ-DELEGATION-052** claudetto shall set `CLAUDE_CODE_SUBAGENT_MODEL` to Sonnet and name no Opus or Fable subagent; Sonnet or Haiku serves as reader and file scout so the main chat stays small.
  Acceptance: setup writes `CLAUDE_CODE_SUBAGENT_MODEL` as `claude-sonnet-5-5`; no agent file names Opus or Fable as `model:`. In claude 2.1.326 a subagent model set in managed settings now overrides the user's own in Claude Desktop's Code tab, as in a terminal (release note). Verification: inspection.
  Basis: reported (a subagent one-liner credited with a lower plan tier: 89% weekly by day 5 fell under 25%); Sonnet is about 95% of subagent messages, so Opus-versus-Sonnet differences are confounded. Status: have at 088a227c (the Opus-per-call and escalate-to-Opus parts of the plan item conflict with the settled rule that Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)) and are not carried).
  Source: external/2026-10-12/export-the one-liner I add to almost every Claude Code prompt.jsonl:14 (url: https://www.reddit.com/r/ClaudeCode/comments/1x2dpvt/the_oneliner_i_add_to_almost_every_claude_code/); plugins/claudetto/hooks/features/setup/settings.ts:120@088a227c; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Agent Texts

- [ ] **REQ-DELEGATION-053** claudetto shall give the sweep agent body one added line for a low-context reader: "Write for a reader who has not seen your tool calls or the files you opened. Put the key points in the first sentences. Use plain words and the same word for the same thing. Define a term you coined." with no style limits.
  Acceptance: the sweep agent body holds this paragraph and no word-count limit. Verification: inspection.
  Basis: cited. Status: have at 088a227c (`plugins/claudetto/agents/Athena.md` holds a low-context line; `git grep -iE "low-context|not seen your tool" 088a227c` hits it).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:31; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:210.

- [ ] **REQ-DELEGATION-054** claudetto shall drop the sentence `run_in_background: false` from root `<delegation>` because the agent form already enforces it, state the delegation cost once in the agent text ("5k to 11k tokens before it works") with its brief form, and delete the duplicate in `<delegation>`.
  Acceptance: `<delegation>` holds no `run_in_background: false` sentence and the cost appears once. Verification: inspection.
  Basis: read, inferred. Status: partial at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:41` states "A worker spends 5k to 11k tokens before it works").
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:53; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:64; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:107.

- [ ] **REQ-DELEGATION-055** claudetto shall drop "Edit nothing" from the plan, search and sweep agent bodies because their tools already withhold edit, add the reason "a recalled count is a guess" to the search agent's "count only when Grep or Glob produced it", and say "Report only." in the verify skill in place of "Edit nothing".
  Acceptance: no read-only agent body says "Edit nothing"; the search body gives the reason. Verification: inspection.
  Basis: read. Status: partial at 088a227c (`git grep "Edit nothing" 088a227c -- plugins` finds nothing, so the first part is have; the reason sentence is not present, so the second part is missing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:209; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:210; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:246.

## Conflicts With Settled Decisions

- [ ] **REQ-DELEGATION-056** claudetto shall give the `sweep` agent file `model: fable` and `effort: high`; setup pins `ANTHROPIC_DEFAULT_FABLE_MODEL=claude-mythos-5-2` on a Mythos account; an `agent.spawn` mod drops `model` so agent files decide; no claudetto rule file carries `paths:` (it adds a reminder block; check open).
  Acceptance: The agent files hold the stated model and effort; no rule file carries `paths:`. Verification: inspection.
  Basis: inferred. Status: have at 088a227c. `agent.spawn` and `agent.offer` are present in claude 2.1.326 (code search, chunk-qg227pzf.js@3892, @3878).
  Source: plugins/claudetto/agents/@088a227c; plugins/claudetto/hooks/features/delegation/@088a227c. Not located: the old-plan lines for the sweep agent.
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).

- [ ] **REQ-DELEGATION-057** claudetto shall set the model on each subagent by step type: haiku for extraction and format work, sonnet for fan-out over many files or item-by-item checks, opus only for the judge or synthesis step, and a different-vendor model as a second review.
  Acceptance: Each agent file pins a model that matches its step type; no subagent inherits Opus by default. Verification: inspection.
  Basis: reported, no measure. Status: partial at 088a227c (plugins/claudetto/agents/Artemis.md:4 haiku, Athena.md:4 sonnet, Heracles.md:4 sonnet, Metis.md:4 sonnet; no judge agent on opus, no step-type rule).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrvnbi-what-is-the-best-way-to-learn-an-20261110T094238Z.md:65; external/2026-11-10/reddit.com-r-claudeai-comments-1xrvnbi-what-is-the-best-way-to-learn-an-20261110T094238Z.md:67 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrvnbi/what_is_the_best_way_to_learn_and_make_the_most/).
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).

- [ ] **REQ-DELEGATION-058** claudetto shall give each model a fixed role: Sonnet works from a brief, Haiku only cold-reads finished pages, and a fresh Opus reviews every release; routing is not worth its cost when the brief needed to avoid a domain trap equals the job.
  Acceptance: Each role maps to one model in the agent files. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:272; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:279; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:281 (url: https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/).
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).

## Unasked Workers

- [ ] **REQ-DELEGATION-059** claudetto shall make the agent start no planner, mapping, or inventory worker that the user did not ask for, and stop a worker at the user's order.
  Acceptance: no worker starts for work the user ruled out; a stop order ends each running worker. Verification: inspection.
  Basis: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c (no rule found).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057 (the user ordered the planner worker killed; the agent had stopped it with TaskStop).

## Return Check

- [ ] **REQ-DELEGATION-060** claudetto shall tell the agent to give an edit task the command that checks it, and to run that command when the report arrives, before it builds on it.
  Acceptance: AGENT_TEXT holds the rule. Verification: test.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

- [ ] **REQ-DELEGATION-061** claudetto shall write a run log line to `.claude/claudetto/runs.jsonl` for a subagent stop that was not blocked, after 3 root turns, with `rootEditedWithin3Turns`.
  Acceptance: the file gains a line per run. Verification: test.
  Basis: observed in transcript. Status: have.
  Source: observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

## Worker Limits

- [ ] **REQ-DELEGATION-062** claudetto shall launch no more than 20 concurrent subagents, Claude Code's cap, and queue the rest.
  Acceptance: a 21st worker waits for a free slot. Verification: demonstration.
  Basis: observed in transcript. Status: partial at 088a227c (`git grep -n -i concurrent 088a227c -- plugins` finds setup/changes.ts:108 writing CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS by plan tier; no queue that holds a 21st worker found).
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9309).

## Worker Resume

- [ ] **REQ-DELEGATION-063** claudetto shall not stop a worker on a turn limit that costs model calls to resume, and shall act and delegate instead of asking the user.
  Acceptance: a worker run has no turn limit that forces a resume; delegation asks no confirmation of the user. Verification: demonstration.
  Basis: reported, user, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: have at 088a227c (`git grep -n maxTurns 088a227c -- plugins` finds none, so no agent file sets a turn limit).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints: disable turn limits; nobody asked you to defer to the user).
  Conflict: Turn Caps.
