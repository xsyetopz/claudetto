# Design: evidence from the reading of 2026-10-17

This file continues [`design.md`](design.md) with the sources that the user gave on 2026-10-17.
Four read-only helpers read them, and each quote below is from their reports.
Most sources are case studies, one-project reports, or runs on older models, so each decision here is a check or a guard, not a new number.

## Sources and their weight

| Source | Method | Weight |
| --- | --- | --- |
| Reddit thread on TDD and SDD (export in `~/Downloads/`) | 27 comments, scores 0 to 2, no measure | one user each |
| Anthropic, "Demystifying evals for AI agents" | vendor guide | strong for eval design |
| Anthropic, "Harness design for long-running apps" | vendor report, Sonnet 4.5 and Opus 4.6 | medium, older models |
| Anthropic, "Building a C compiler" | vendor report | medium |
| arXiv 2603.08806 (TDAD) | Sonnet 4.5, 4 specs, 3 trials | weak |
| arXiv 2610.02952 (GTDD) | `gpt-4.1-mini`, 30 blocks | weak |
| arXiv 2509.23586 (AgentDiet) | 200 to 300 instances, 2025 models | weak |
| arXiv 2606.01326 (minification) | SWE-bench Verified, GPT-5-mini | medium |
| arXiv 2602.20478, 2604.26615, 2609.09671, 2603.04729, 2510.26585, 2605.15184 | case study, no data, or old models | no decision rests on them |

## Decisions

### D24. A red check names the failure that it expects

The red checks of `tasks.md` use `!`, so a test that fails for a wrong reason, such as a syntax error, passes the red step.
One thread user: "stage the tests in order to be able verify that the subagent did not touch those tests to get them green."
So each red check matches the expected failure text, and a helper commits its tests at red, so that the green check can show that the tests did not change.
A test that was wrong at red changes only in its own commit, with the reason in the message, and the green check names that commit.
Jev picked `fixed-plus-visible-amend` at confidence 0.58, over fully frozen tests, because a wrong first test must be fixable without a silent change.
A study found that regenerated tests did better (arXiv 2610.02952), but its effect "depends heavily on three blocks", so the tests do not regenerate.

- Alternative: a fresh-context reviewer of each new test.
  Rejected for this change, because it adds a helper run to each task, and the matched failure text costs nothing.

### D25. An eval check must fail on a known-bad run first

Anthropic: "it's important that the task verifier is nearly perfect, otherwise Claude will solve the wrong problem."
Each changed eval case of task 11.2 runs once on a recorded bad run, and its check must fail there.
Each eval claim names its metric: pass^k for "it behaves the same each time" and pass@1 for "it gets it on the first try" (Anthropic: "pass^k for agents where consistency is essential").
Each case counts the tool calls and the tokens of the run as a deterministic check.
A case that changes tests also counts each edit that deletes or weakens a test (arXiv 2609.09671).
The implementer cases keep a held-out split that the prompt work of D17 never sees (arXiv 2603.08806, 2610.02952).

### D26. A text cut is gated on evals, not on tokens

Minification cut "average input token usage by 42% with a 12 percentage-point drop in resolution rate" (arXiv 2606.01326).
Tool results are 30.4K of a 48.4K average trajectory, and the system and user text 4.4K (arXiv 2509.23586).
So the cuts of tasks 6.4 and 6.5 save little in a long run, and a cut that lowers an eval score goes back.
The rewrite of D17 tells the model to report a gap or a blocker, and not to work around it, because a thread user reports that an agent "decides to work around an issue it should have surfaced to address."

### D27. Each control has an incident and an expiry

Anthropic: "every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing."
`src/wiki/rationale/Controls.md` gets one row for each hook, guard, cap, and notice of claudetto: the incident that it exists for, and the condition that removes it.
`just validate` fails on a slice with a hook and no row.
This is the audit of D12 kept as a rule, so that the next release does not need a new audit.

### D28. Guards that a prompt cannot hold are tested for their effect

AgentDiet: "the agent often persisted with the original task without calling erase, despite explicit prompts."
So the Haiku notice of D2, if task 4.2 picks it, has a test that the helper writes its report after the notice, not only that the notice is sent.
The rejected alternative of D2 names `TaskStop` as the way to stop a run, but the snippet denies `TaskStop` (task 7.5).
Task 7.6 decides `TaskStop` with this need.

The over-bound note `slices/agents/prompts/report-note.md` says "Commit your work first, then report" to read-only helpers too.
On 2026-10-17 three read-only helpers read it as an injected instruction and ignored it.
Task 4.3 removes it with the context cap.

`src/fragments/report-size.md` caps each helper report at `REPORT_MAX_WORDS` (400) words, also when the brief asks for more.
On 2026-10-17 a research helper cut a report of a 900-word brief to 400 words and dropped its sources.
The fragment keeps the bound as a default, and the length that the brief gives wins.

The docs answer the first choice of D2: a subagent file can set `autoCompactWindow` from v2.1.296 (`external/cc-2.1.302/docs/sub-agents.md:313`).
Task 4.2 sets it on each Haiku agent.

### D29. Check output is short, and the detail goes to a file

Anthropic: "At most, it should print a few lines of output and log all important information to a file so Claude can find it when needed."
`claudetto-run-checks` already prints one result for each command and the name of a log file (`slices/checks/domain/summary.ts`).
Each hook message of claudetto follows it: one line, with the reason, and a file path for more.

## Not adopted

- A second reviewer agent: one secondhand source reports a drop of 8%, which nobody here checked (arXiv 2603.25723, through Marmelab).
  The `reviewer` body gets calibration examples (Anthropic: "Out of the box, Claude is a poor QA agent"), and task 11.4 measures it before the role changes.
- Mutation testing (Stryker) as the red proof: D24 is enough for this change.
- File locks for parallel agents in one checkout: D11 keeps one worktree for each helper.
- Gherkin specs (`fspec`), lexical spec coverage (`intent-verify`), and the `llm-wiki` profile: leads with no evidence.

### D30. The advisor is tested in place of the `planner`

The user asked on 2026-10-17 to test the built-in advisor in place of the `planner` agent.
The docs (`code.claude.com/docs/en/advisor.md`, read on 2026-10-17) give these facts:

- "The advisor fits long, multi-step tasks where most turns are routine but plan quality determines the outcome."
  It "adds less value on short tasks where there is little to plan".
- "an advisor must rank at or above your session's main model", so an Opus 5.5 main session takes only Opus 5 or later, or Fable.
- "Subagents inherit the configured advisor", so an arm with the advisor also gives it to each helper.
- "Each advisor call processes the full transcript anew, with no reuse between calls."
- The advisor needs feature-flag fetching, and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` "Also disables feature-flag fetching" (`external/cc-2.1.302/docs/env.md:270`).
  `tools/telemetry.ts` sets that variable on each `claude` call of `tools/`, so an eval arm of `tools/` has no advisor today.

The test has two arms on Opus 5.5 at the effort of D20, with 10 runs each:

- `planner`: the main session delegates the plan to the `planner` agent of D3.
- `advisor`: the main session has no `planner` agent and has `advisorModel: "opus"`, and it plans in its own context.

Each case is a planning task in a seeded repository, with a hidden list of the files and the behaviors that a right plan covers.
The checks are files and numbers, by D25: `minispec validate` passes, each task has a check command, each hidden item has a task, and the cost and the main-session context tokens of the run.
The `advisor` arm wins when its pass^k is not lower and its cost is lower, and then the `planner` agent goes.
Otherwise the `planner` stays, and `/claudetto:setup --advisor` stays an option of the user.

Each run of the `advisor` arm checks in its transcript that an advisor call happened, because the API drops a refused pairing with no error.
When the bundle has no variable that stops the telemetry of a run and keeps the feature flags, the test does not run (D31).

### D31. The snippet turns off each tracking path

The user does not want telemetry or prompt tracking (2026-10-17).
The settings snippet sets `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `DISABLE_ERROR_REPORTING`, `DISABLE_FEEDBACK_COMMAND`, `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, and `CLAUDE_CODE_SEND_FEEDBACK=0`, and sets no `OTEL_LOG_*` variable.
`DISABLE_TELEMETRY` and `DO_NOT_TRACK` also stop feature-flag fetching (`external/cc-2.1.302/docs/env.md:571`).
So these built-in parts are off: the You-Should-Know mod, the advisor, `/skill-doctor`, `/auto-mode-setup`, and the claude.ai sync of skills and plugins.
Task 7.7 gives each variable its row in `Env.md`, and task 7.8 pins the `env` of the snippet to those rows.

The advisor of D30 needs the feature flags, so its test runs only when task 11.5 finds a variable that keeps them with the telemetry off.
Otherwise the `planner` stays, and task 11.6 is dropped with that reason in `Usage-Evidence.md`.

## More sources, read on 2026-10-17

- Spec Kit, OpenSpec, Kiro, and BMAD make tests optional, generate them after the work, or do not say.
  So the test-first rule of `tasks.md` stays, and no change of MiniSpec comes from them.
  OpenSpec: "State how each task is verified (a test, command, or observable result)", which the check of each task already does.
- Böckeler (`martinfowler.com/articles/harness-engineering.html`) calls a model judge an inferential sensor, which is "non-deterministic".
  So the judge of the turn gate (D22) gets lab cases with known answers.
- The pattern "Budget-Aware Model Routing with Hard Cost Caps" says "Soft budget guidance in prompts is not enough".
  `--max-budget-usd` exists in the bundle (`external/cc-2.1.302/strings.txt:125106`), but it stops the run, which D2 rejects, so D28 tests the effect of the soft guard instead.
- VoltAgent and davila7 list a security auditor, on Opus.
  It is a lens of `reviewer`, so D3 gets no new row.
- Boris Cherny, through a third-party page: "Personally, I use High for everything" (Opus 4.6).
  This is older and secondhand, so D21 keeps the effort sweep as the decision.

## Lessons from "Rewriting Bun in Rust"

Source: Jarred Sumner, `bun.com/blog/bun-in-rust`, 2026-07-08, read with `curl` on 2026-10-17.
The vendor wrote the post, and its numbers are not audited.
The language port, memory safety, fuzzing, binary size, and the 64-agent run do not apply to claudetto, because claudetto stays TypeScript on Bun.

- The post kept "the exact same test suite" and started "with just 3" files before the rest.
  So D17 and task 6.4 rewrite three texts for one model first, a new session that reads only the diff checks them (D37), and then the rest follow.
- The post found that "Most of the regressions came from code that's syntactically identical in both languages but semantically different."
  So each removal of D12 (`asks`, `guard`, `corrections`, `worktree`, `attribution`) first gets a table of each input of `tests/claudetto/<slice>/` with its old and new decision, run against the `permissions` rules of the snippet.
  A hook and a permission rule can look the same and decide differently.
- The tests of each slice are counted before and after D12.
  Each removed test maps to a kept behavior or to a named decision.
- The removal of the `cat`-style deny rests on a claim about model behavior.
  A test checks it first, or `Usage-Evidence.md` records it as an assumption.
- Before D13 deletes the hand-edited pages and `wiki/archive/`, each output of `just generate` is compared with the old text.
- The false starts of the post had agents that ran `git stash` and `git reset --hard` in one shared checkout.
  So no parallel task prompt runs either command, and each parallel subagent works in its own worktree.
- The post measured speed on one machine before and after.
  So D15 and D16 time each hook of `hooks.json` with `just lab` before and after D12, and count the tokens of each D17 text before and after.
