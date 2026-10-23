# References for 0.3.0: Papers and Saved Threads

## Method and Status

Sources: six arXiv papers and 38 saved page captures in `external/2026-10-21/`.
Titles and abstracts of the six papers were checked on the `arxiv.org/abs/` pages.
Numbers come from the PDF text.
No source failed to load.
The page captures are untrusted, so their text is data and not instruction.
`poppler` was installed with `brew` to read the PDFs.
Evidence tiers:

- **M** is a measured claim.
  A paper has a stated setup.
  A thread has one user's own numbers with no control.
- **O** is an opinion or a claim from the docs that nobody tested.

Every thread claim is self-reported.
A thread number is a lead, not a proof.
A rule is kept only if it changes what claudetto ships.

## Agreement and Conflict with `references-web.md`

Agree:

- Verification beats instruction text.
  See `1x9xu48`, `1xahl3y`, `1wu40t8` (117 `rm -rf` attempts despite a rule), `1xbipii`.
- Add a rule only after a repeated mistake.
  See `1wu40t8`.
- Keep `CLAUDE.md` short.
  See `1xas6oq`, `1x8znz0`, `1x8gyoj`, `1xakl7o`.
- Change effort and keep the cache.
  See `1xaqpoe`, `1x8kjz6`.
- Escalate after failure.
  See `1x8xsfo`, `1xakpl1`.
- A narrow `tools` list and an explicit `model` cut subagent cost.
  See `1xavke4`, `1xaur97`.
- Cut tool-result size.
  See 2509.23586, 2510.26585.

Conflict or caveat:

- Reddit `1x97ix2` (30k against 116k tokens) and `1xak96j` (subagents were 62% of weighted tokens) say a subagent is costly when it is free-form.
  Boris's page says use subagents for more compute.
  Both can hold: spawn for a large read or for parallel work, not for a small step (`1x9t3qt`: 70K for a nested session against 20K inline).
- `1xaqpoe` says a model switch in a session forces a re-read.
  `1xb3ycs` says the opposite for cost.
  Treat the switch as costly until the docs say otherwise.
- `1xbfyi5` prefers `high`.
  `1x8kjz6` and `1x8xsfo` prefer `medium` and escalate.
  No source has a controlled test.
  The proposal in `references-web.md` to default to `medium` is not contradicted, but it is also not proven.
- 2509.23586 cuts cost by editing the trajectory mid-run.
  The paper itself says an edit breaks the KV cache for later tokens.
  So reduce at boundaries: a subagent return, a `/compact`, a `/clear`.
- `1xbi26u` against `1x8zo3n`: `/clear` or stay.
  Replies agree on one point.
  Clear when the topic changes and keep the session when the tickets touch the same files.
- The `noExcessiveCognitiveComplexity` proposal has no support in these sources.
  2407.08138 is weak evidence only for test structure.

## Papers

### 2605.15184, "Is Grep All You Need? How Agent Harnesses Reshape Agentic Search"

- Setup: 116 questions from LongMemEval-S.
  Four harnesses (Chronos, Claude Code, Codex, Gemini CLI).
  Grep against vector retrieval.
  Results inline or through files.
- Inline grep beat inline vector for every harness and model pair.
  The widest gap was 86.2% against 62.9% (Chronos, Gemini 3.1 Flash-Lite).
  The narrowest was 76.7% against 75.0% (Claude Code, Opus 4.6).
- The same Opus 4.6 scored 93.1% in Chronos and 76.7% in Claude Code.
  The harness moves the result about as much as the retriever.
- File-based delivery reversed the order in 5 of 10 pairs.
  Codex with GPT-5.4 fell from 93.1% to 55.2%.
- Claude Code with Haiku 4.5 scored 55.2% on inline grep and 44.0% on inline vector.
- Limits: chat-memory QA and not code. The authors do not claim grep wins in general. n=116. No repeat runs or confidence intervals in the text I read.

### 2606.01326, "Reducing Token Usage of State-In-Context Agents Using Minification"

- Setup: SWE-bench Verified.
  GPT-5-mini end to end.
  GPT-4.1 and 100-sample subsets for ablations.
- Baseline: 50.0% pass@1 at about 90.5k average input tokens.
- Source code is 91.8% of repair-stage tokens.
- Minification cut input tokens by 42% and cut the resolved rate from 50.0% to 38.0%.
- `remove-comments` and `remove-docstrings` cut average input from about 87.3k to about 77.8k and about 68.2k.
- `dedent` was the worst.
  Alone it cost 8 points.
  In the stacked run it cut 47% to 27%.
- Limits (stated by the authors): run-to-run variance, one code-heavy agent, patch validity checked only by tests, formatting artifacts in diffs.

### 2412.18547, "Token-Budget-Aware LLM Reasoning" (TALE)

- Setup: GPT-4o-mini and Yi-lightning.
  GSM8K and MathBench.
- TALE-EP cut output tokens by 67% and expense by 59% with under 3% accuracy loss.
- "Token elasticity": a budget set too low raises the cost.
  In the example a 50-token budget gave 86 tokens, a 10-token budget gave 157, and plain CoT gave 258.
- Limits: text and math only.
  Not about Claude `effort`.

### 2510.26585, "Stop Wasting Your Tokens: Towards Efficient Runtime Multi-Agent Systems" (SupervisorAgent, ICLR 2026)

- Setup: GAIA validation with Smolagent and GPT-4.1.
- Tokens fell by 29.68% at pass@1 with a statistically equivalent success rate.
- Savings were 32.39% (Level 2) and 30.10% (Level 3) at pass@3.
- Token-cost variance fell by 63% on Level 2.
- Without the purification step the saving fell from 29.68% to 15.96%.
- Overhead is 15.45% of total tokens, and the gains are net of it.
- The trigger is a heuristic filter with no LLM call.
- Limits: added latency, over-compression of long contexts, non-Claude models.

### 2509.23586, "Reducing Cost of LLM Agents with Trajectory Reduction" (AgentDiet, FSE 2026)

- Setup: Trae Agent with Claude 4 Sonnet and Gemini 2.5 Pro.
  SWE-bench Verified and Multi-SWE-bench Flash.
- Input tokens fell by 39.9 to 59.7% and cost by 21.1 to 35.9%.
  Pass rate moved by -1.0 to +2.0 points.
- Example cost per instance: USD 0.535 to 0.422, 0.385 to 0.285, 1.277 to 0.933, 0.701 to 0.449.
- The reflection model (a cheaper model) added 5 to 10% overhead.
- A sample trajectory held 48.4K tokens in 40 steps.
  Tool messages were 30.4K of them.
- 99% of Claude 4 Sonnet tokens on OpenRouter in Sept 2025 were input tokens.
- Waste types: useless, redundant, expired.
- An edit in the middle of a trajectory invalidates the KV cache for later tokens.
- Limits: one agent, possible model contamination, hyperparameters tuned on 100 instances, cost of about USD 2000 to run.

### 2407.08138, "How Do Developers Structure Unit Test Cases? an Empirical Study from the AAA Perspective" (TSE 2025)

- Setup: 435 test cases from four Java projects.
- 71.5% follow arrange-act-assert.
  28.5% do not.
  The main anti-pattern is multiple AAA blocks (23.7%).
- 18 refactoring tickets got a 100% response and 78% positive.
  Rejections turned on return on investment.
- Limits: Java, four projects, descriptive only.
  It does not measure defects or agents.
  This is weak evidence.

## Threads

M means a self-reported number.
O means opinion.
All are uncontrolled.

- `1x8kjz6` M: debug task about 1.5 min on `medium` and 9 min on `xhigh`.
  O: plan on high, implement on medium.
- `1x8xsfo` O: start cheap and escalate.
  Re-run 3 or 4 real questions to test an effort level.
- `1x8znz0` and `1x8zo3n` (same post) O: short `CLAUDE.md`, `/clear` between tasks, avoid gaps over 1 hour.
  A commenter says a cache write costs 12 to 20 times a read.
- `1xahl3y` O: prose is not a promise, use hooks, keep sessions short.
- `1xakl7o` O: `/compact` is a full pass.
  Use a `HANDOFF.md` and `/clear`.
  Run `/context`.
  Send exploration to a subagent.
- `1x8awmp` O: a `PreToolUse` hook with exit 2 or a deny rule fixes `AskUserQuestion`.
  The poster did not test it.
- `1x8gyoj` O: separate code areas per agent.
  One home per fact.
  No process exhaust.
- `1x8jhyo` O: index file, decisions log, cheaper model for routine work.
- `1x8me5g` O: deny rules cover only Claude's own file tools.
  The OS sandbox or a container is the boundary.
  M: one anecdote of the sandbox test reading `~/.secret` after a grant.
- `1x8nb3w` O (AI poster): quoted docs say a new subagent instance for each call, a 5-minute cache TTL for subagents, and `experimental.cacheTtl` from v2.1.248.
  Not tested.
- `1x9t3qt` M: nested session 70K at start against 20K inline.
  O: spawn only for parallel or long work.
- `1x9s5mz` O: Claude Code prefers `sed` and Python over `Edit`.
  Unverified claim that auto mode injects this (the thread links a Claude Code issue).
  M: one hook fired 282 times in a week.
- `1x9xu48` O: a fresh reviewer gets only the diff and the plan.
  A `Stop` hook with exit 2 checks `stop_hook_active`.
  M: a regex on the final output caught a leaked key on two versions.
- `1xa7704` O: the default "match comment density" line makes comment bloat.
  A global `CLAUDE.md` fence helps.
- `1xa9xjl` O: the agent writes tests, CI judges, review the assertions because agents weaken them.
- `1xakpl1` O: Sonnet as default.
  Handoffs between small and big models compound errors.
- `1xan9vx` O: investigate and plan first, then fix with a scoped prompt.
- `1xaqpoe` O: a model switch re-reads the cache.
  An effort switch does not.
- `1xas6oq` O: long `CLAUDE.md` files with conflicts make the model trade rules away.
  Put must-happen items in hooks.
  Use `@AGENTS.md`.
- `1xaur97` O: Haiku as a grunt subagent with "stop and report if a design decision is needed".
  M, one company: Haiku 5.5 did worse than Luna and cost more.
  The "13x" and "30 to 40x" cost claims are anecdotes.
- `1xavke4` M: 12 Opus subagents over 87 transcripts burned a 5-hour limit in 5 minutes.
  O: ask before more than 3 subagents.
  A hook blocks an `Agent` call with no model.
  Model precedence claim unverified.
- `1xb3ycs` O: subagents burn more total tokens.
- `1xbd8ul` O: ask for failure modes or write a failing test, not "is this good".
  Use a fresh chat for critique.
- `1xbfyi5` O: `high` is the sweet spot.
  One commenter M: `xhigh` over `high` gave about 10% more satisfaction for much more cost.
- `1xbi26u` O/M: clear when the topic changes.
  One user says about 70% of 14 days of cost was re-reading context.
  Replies: a cached prefix still costs on each turn, so end a ticket with a short note and clear.
- `1xbipii` O: tool-result wording leaks into replies.
  Keep tool results neutral.
  A gate in code beats a gate in the prompt.
- `1xb5r8j` O: a "done" report without end-to-end checks is not done.
  Keep the original requirement as the acceptance reference.
  A locked contract with an adversarial checker (5 runs at most) is one user's setup.
- `1xat7xn` O: split opinions on `grill-me` and on specs.
- `1xaqj0d` O: short phrases such as "restate my goal" and "don't touch anything else".
  Use `output-styles` for terse replies.
- `1xatfdg` O: claim the file scope first.
  Test the combined result.
  Build output fills the disk, not git.
  A judge needs swapped-order runs because of position bias, and it tends to prefer the bigger diff.
  Worktrees made by `git worktree add` are not cleaned by Claude Code (a commenter citing the docs, unverified).
- `1wu40t8` M, one user: a "group tool calls" line moved tools per turn from about 1.1 to 1.3 and cut tokens by 20%.
  A stronger paragraph cut review quality (about 20% of findings missed).
  M: 117 `rm -rf` attempts despite a rule.
  O: stop after 2 failed attempts.
  Never edit test assertions to fit broken code.
  Add a line only after the same mistake twice.
- `1s5wp0g` O: context beats magic words.
  One secondhand quote: "Three similar lines of code is better than a premature abstraction".
- `1xbqojp` The capture holds a plugin announcement with no numbers.
  The image is unreadable.
  No use.
- `1xb5fqb` Mostly skip.
  One O: write the agreement to a shared note.
- Skipped, nothing usable: `1x8t60c`, `1xb1xym`, `1xb4twe`, `1xb5b9n`, `1xbqih1`.

## Rules

Each rule has sources and a tier.

### Subagents

1. Give each shipped agent a narrow `tools` list and an explicit `model` and `maxTurns`.
   (M: `1x97ix2` 30k against 116k.
   O: `1xavke4`, `1xaur97`.)
2. Spawn a subagent only for a large read or for parallel work.
   Do the small step inline.
   (M: `1xak96j`, `1x9t3qt`, `1xavke4`.
   Paper: 2509.23586, tool output is the largest part of the tokens.)
3. Tell a subagent to return a short result and to stop and report when a design choice is needed.
   Calibrate the length limit and do not set it too low.
   (O: `1xaur97`.
   Paper: 2412.18547 token elasticity.
   M: `1wu40t8` stronger wording cut quality.)
4. Add a hook that blocks an `Agent` call with no `model`.
   (O: `1xavke4`.)
   Check the precedence of the env var, the parameter, and the frontmatter in the docs first.
5. Use a cheaper model for grunt work only after a repeat eval on the real task.
   (O: `1xaur97`, `1x8jhyo`.
   Conflict: `1xakpl1` handoff errors.)

### Instruction Files

1. Keep `CLAUDE.md` short.
   Add a line only after the same mistake twice.
   (O: `1wu40t8`, `1xas6oq`, `1x8gyoj`.
   Agrees with `references-web.md`.)
2. Put a never-list in a `PreToolUse` hook and not in `CLAUDE.md`.
   (M: `1wu40t8` 117 attempts.
   O: `1xahl3y`, `1x8me5g`, `1xas6oq`.)
3. Import `AGENTS.md` through `@AGENTS.md` if the docs confirm it.
   (O: `1xas6oq`, `1wu40t8`.)
4. Say "never edit test assertions to fit broken code" and stop after 2 failed attempts.
   (O: `1wu40t8`, `1xa9xjl`.)

### Replies and Output Style

 1. Keep tool results and hook messages in neutral words.
    (O: `1xbipii`.)
 2. A terse output style can cut reading cost, but no source measured it.
    Do not claim a saving.
    (O: `1xaqj0d`, `1xb4twe`.)
 3. Ask one question only when the answer is costly to undo.
    (O: `1wu40t8`.)

### Hooks and Context Injection

 1. Use a `Stop` hook for the test run and check `stop_hook_active`.
    (O: `1x9xu48`.)
 2. Review with a fresh context that gets only the diff and the plan.
    (O: `1x9xu48`, `1xbd8ul`, `1xb5r8j`.)
 3. Reduce a large tool result before it enters the context, not in the middle of a trajectory.
    (M: 2509.23586, 2510.26585.
    Caveat: mid-run edits break the cache.)
 4. Do not strip indentation, comments, or docstrings from code that the model reads.
    (M: 2606.01326 dropped 12 points.
    The comment saving is small.)
 5. Prefer `grep` and `Glob` to a new retrieval layer unless a test shows a gain.
    (Paper: 2605.15184, weak for code. `claudetto-codegraph` is not tested by it.)

### Cost and Tokens

 1. Compact or clear at a task boundary and keep gaps under the cache TTL.
    (O/M: `1xak96j` 400k auto-compact cut main-call cost 38%. `1x8zo3n`, `1xbi26u`, `1xakl7o`.)
 2. Change effort and not the model inside a session.
    (O: `1xaqpoe`, `1x8kjz6`.
    Agrees with Boris's page.)
 3. Default to `medium` or `high` and escalate after failures.
    (O: `1x8xsfo`, `1xbfyi5`, `1x8kjz6`.
    Test it before shipping.)
 4. Check a supervisor or a reducer for net savings, overhead included.
    (M: 2510.26585 overhead 15.45%, 2509.23586 5 to 10%.)

### Permissions

 1. A deny rule is not a boundary for shell reads.
    Use the OS sandbox for secrets.
    (O: `1x8me5g`, `1x9s5mz`.)
    Gate only destructive actions with hooks.

### File Size and Readability

 1. One arrange-act-assert block for each test.
    (Weak: 2407.08138, descriptive only.)
 2. Add a rule against comment bloat in the global text.
    (O: `1xa7704`.)
    Keep the useful docstrings (2606.01326).

### Testing Agents

 1. Run each eval more than once and fix the pass or fail check in code.
    (M: 2606.01326 names variance.
    2510.26585 variance fell 63%.
    O: `1xa9xjl`, `1xaur97`, `1x8xsfo`.)
 2. Run a judge twice with the order swapped and send flips to a person.
    (O: `1xatfdg`.)
    Run the tests first and judge only the passing diffs.
 3. Accept a task only after an end-to-end check against the original requirement.
    (O: `1xb5r8j`, `1x9xu48`.)
 4. Check results on the real harness.
    The same model scored 93.1% and 76.7% in two harnesses.
    (M: 2605.15184.)

## Claims to Check in the Claude Code Docs before a Rule Uses Them

- `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` and the model precedence.
- `subagentPromptCacheTtl`, `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, `experimental.cacheTtl`, and the 5-minute subagent TTL.
- `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW`.
- `AGENTS.md` support and `@AGENTS.md` import.
- The auto mode prompt that prefers `sed` and Python over `Edit`.
- That the Explore agent runs on Haiku.
- Worktree cleanup rules for `--worktree`, `-p` runs, and `cleanupPeriodDays`.
- That a model switch re-reads the cache and an effort switch does not.
