# Skills, Commands and Subagents Catalog (Candidates)

Retrieval date for every URL: 2026-11-21. Scope: `plugins/claudetto` (harness) and
`plugins/claudetto-spec` (spec-driven development). Research only; nothing here is built.

Evidence labels: **measured** (a number from a run, with n), **reported** (someone's claim,
no data), **design** (our reasoning). A label names the strongest evidence for the candidate
itself, not for the genre. ADR-0177 applies: a cure ships only with a reproduction and a
measured gain over vanilla, so every "reported" or "design" candidate stays unbuilt until its
eval case is run.

## 1. Engine facts that bound the catalog

Each fact comes from a clawdipedia page read this session.

- Skills and slash commands are one mechanism. `.claude/commands/` still works and "acts like
  a skill"; a plugin skill is `/<plugin>:<skill>`
  (https://clawdipedia.cc/extend/skills-and-commands.md).
- `disable-model-invocation: true` makes a skill only the user can start. `context: fork` runs
  it in a subagent; `agent:` picks the type (default `general-purpose`). `disallowed-tools`
  removes tools while the skill runs. Unknown keys are ignored without an error
  (https://clawdipedia.cc/extend/skills-and-commands/frontmatter.md).
- The listing line is `- name: description`, cut at `skillListingMaxDescChars` (default 1,536;
  the user's setting is 60). A skill without `description` falls back to the first body line
  cut at 100 characters (same page). Design: with a 60-character cap, the trigger must sit in
  the first 60 characters of each description.
- The listing budget is `floor(window * bytesPerToken * 0.01)` characters by default; the
  window defaults to 200,000 and `bytesPerToken` is 3 for newer models
  (https://clawdipedia.cc/extend/skills-and-commands.md, "Skill listing budget").
- `disableBundledSkills: true` removes the bundled skills, including `/code-review`,
  `/verify`, `/simplify`, `/debug`, `/batch`, `/run`, `/loop`. Plugin and project skills are
  not affected (https://clawdipedia.cc/extend/skills-and-commands/bundled-skills.md).
  Consequence: the user holds no bundled reviewer, but ADR-0177 measures against vanilla, and
  vanilla includes the bundled one.
- Subagent descriptions count toward context; the interactive screen warns above 15,000
  tokens for all non-built-in agents (https://clawdipedia.cc/extend/subagents.md).
- A plugin agent cannot set `permissionMode`, `hooks`, `mcpServers` or `initialPrompt`; Claude
  Code ignores each with a log line
  (https://clawdipedia.cc/extend/subagents/frontmatter.md).
- Built-in agent types are `Explore`, `Plan`, `general-purpose`, `statusline-setup`,
  `claude-code-guide`; a user agent of the same name replaces one
  (https://clawdipedia.cc/extend/subagents/runtime.md). The claudetto hook
  `hooks/delegation/offer.ts` already hides every built-in except `fork`, so Artemis, Athena
  and Heracles are the only offered types.

## 2. Empirical base (not candidates)

- SkillsBench (arXiv 2602.12670, v4 abstract read): 87 tasks, 8 domains, 18 model-harness
  configurations, matched no-skill and curated-skill runs. Average pass rate 33.9% to 50.5%
  (+16.6 points); per-configuration gains +4.1 to +25.7. "Focused Skills with at most three
  modules outperform larger or exhaustive bundles." Measured.
  https://arxiv.org/abs/2602.12670. A search summary (not the abstract) adds that
  self-generated skills fell 8.1 to 11.5 points below the no-skill baseline and that
  v1-v3 showed negative deltas on 16 of 84 tasks; I did not verify those two figures.
- "Agent Skills Can Be Harmful" (arXiv 2608.11888, abstract page read): paired skill versus
  no-skill runs on SkillsBench and SWE-Skills-Bench give 307 skill-induced failures: 125
  functional, 182 efficiency regressions; 67 are excessive verification and 30 heavy
  implementation pipelines. Failures come mostly from relevant-looking skills, and
  efficiency loss is not explained by prompt length alone. Measured. The page does not state
  n of skills or tasks. https://arxiv.org/abs/2608.11888
- Anthropic, "Steering Claude Code" (2026-06-18): procedures belong in skills, deterministic
  actions in hooks, side tasks in subagents; "Use a skill when you want the procedure to play
  out inside the main thread so you can see and steer each step." Reported (vendor guidance,
  no data). https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more
- Anthropic, best practices: a custom reviewer agent with `tools: Read, Grep, Glob` is
  "enforced by Claude Code rather than requested in a prompt"; `model: haiku` suits simple
  subagent work; a spec review prompt should keep "skip style" because a reviewer asked to
  find problems "will always find something". Reported (vendor guidance).
  https://code.claude.com/docs/en/best-practices
- Florian Bruniaux's guide: "Choose the smallest interface": deterministic command to CLI or
  script, reusable instructions to a skill, separate context and role to an agent, a
  lifecycle response to a hook. Reported. README of
  https://github.com/FlorianBruniaux/claude-code-ultimate-guide
- Earlier reports in this folder: Dot-Quick's plan check (checker other than author passed 3
  of 3 versus 1 of 3, author admits tiny sample), a user's logs (built-in general-purpose
  subagent about 20% of tokens, 1,237 subagents), the 840-implementation study (only
  requirement citations caught invented requirements), Spec Kit about 2x OpenSpec's tokens
  (one author). See `dossiers.md` and `sdd-frameworks.md`.

## 3. Sources read this session

Counts are the sources' own statements. None of the six Claude Code lists gives outcome data
for any listed skill, command or agent.

| Source | What it holds | Outcome data |
| :- | :- | :- |
| hesreallyhim/awesome-claude-code | 276 entries; Skills section has about 15 | none |
| davila7/claude-code-templates | 918 skills, 422 agents, 288 commands | none; PR scan |
| VoltAgent/awesome-claude-code-subagents | 161 subagents, 10 categories | none |
| ykdojo/claude-code-tips | 45+ tips; `dx` plugin, 9 skills | none |
| FlorianBruniaux/claude-code-ultimate-guide | guide, 5 `/ccguide:` commands | none |
| feiskyer/claude-code-settings | 12 skills, 3 agents | none |
| VoltAgent/awesome-agent-skills | "1497+" skills, official vendor skills | none |

Notes: davila7 says every PR is scanned by NVIDIA SkillSpector (a safety scan, not a
quality result). VoltAgent's subagent list routes by model tier (`opus`, `sonnet`, `haiku`)
and read-only tools for reviewers, a convention without a measurement. The hesreallyhim
list says its picks emphasise "code quality, security, and originality"; no tests.

## 4. Candidates: claudetto

Format: name, kind, what, sources, evidence, eval case ("vanilla" = Claude Code plus the
model with bundled skills on, per ADR-0177).

### Keep (exists)

- **Artemis**, agent (exists). Haiku, `Read, Grep, Glob`, returns path:line excerpts.
  Source: https://code.claude.com/docs/en/best-practices (haiku for simple subagent work,
  tool limit enforced). Evidence: reported.
  Eval: same 10 lookup questions on a fixture repo; vanilla `Explore` versus Artemis; compare
  correct path:line hits, tokens, and count claims not produced by a tool.
- **Athena**, agent (exists). Sonnet medium, read-only sweep of a change for defects and
  slow paths. Source: best-practices reviewer example above. Evidence: reported.
  Eval: a diff with k seeded defects; vanilla `/code-review` versus Athena; recall of
  seeded defects, false findings, tokens, n=3 runs per arm.
- **Heracles**, agent (exists). Default read-run-edit agent replacing `general-purpose`.
  Source: runtime page (general-purpose is `tools:["*"]`). Evidence: design.
  Eval: five multi-step edit tasks; `general-purpose` versus Heracles; task pass rate and
  tokens, n=3 per arm.

### New candidates

- **review**, command (fork skill, `disable-model-invocation: true`, `context: fork`).
  Review the current diff in a fresh context, bugs only, no style. A fork keeps the
  reviewer free of the author's reasoning. The diff arrives through a shell-injection block
  so the reviewer agent stays read-only (design; unverified that `agent:` resolves a plugin
  agent name, probe first). Sources: best-practices ("reviews the diff in a fresh subagent
  that never saw your conversation"; "skip style"), feiskyer `github-review-pr` (parallel
  subagents, adversarial re-read at head SHA, findings with file:line; no data),
  https://github.com/feiskyer/claude-code-settings. Evidence: reported.
  Eval: `review-seeded-defects`: fixture diff with 5 seeded defects and 3 benign changes;
  arms: vanilla `/code-review`, plugin `/claudetto:review`; n=3; passes when recall is no
  lower, false findings are no higher and tokens are lower. Strongest counterargument: the
  bundled `/code-review` already does this, so the only claim is cost and the plugin's
  conventions; if the run shows parity, drop it.
- **audit-instructions**, command. Check CLAUDE.md, rules and skills for stale, duplicated
  or unverifiable lines against the repo. Sources: ykdojo `/dx:review-claudemd` and
  feiskyer `instruction-reflector` agent (no data); dossier: "audit skills, agents.md and
  memory against current models" (one comment). Bundled `/doctor prompt-audit` does a
  version of it. Evidence: reported.
  Eval: a seeded CLAUDE.md (3 stale commands, 2 duplicates, 2 unverifiable claims); vanilla
  `/doctor prompt-audit` versus command; seeded issues found. Likely parity; watchlist.

### Rejected or deferred

- **handoff** (ykdojo `/dx:handoff`; feiskyer `handoff`), command. Duplicates
  `hooks/handover/` (clear, compact, renewal) and built-in `/compact`. ADR-0177: built-ins
  win ties. Evidence: reported. Rejected.
- **half-clone, quarter-clone** (ykdojo tip 21), skills. Context shrink; `/clear`,
  `/compact` and checkpoints cover it. Evidence: reported. Rejected.
- **grill-me** (feiskyer), command. One-question-at-a-time interview with a recommended
  answer and a glossary. Overlaps the `spec` skill's Clarify step and AskUserQuestion.
  Evidence: reported. Rejected for harness; the idea lives in `spec`.
- **deep-research** (feiskyer), skill. Orchestrates `claude -p` subprocesses. Overlaps
  Artemis and subagent fan-out; one user logged 1,237 subagents mostly on Opus (cost
  anecdote). Evidence: reported. Rejected.
- **commit** (bundled; many list entries). Duplicates `hooks/git/instructions.ts`,
  `hooks/git/trailer.ts` and the repo's commit-msg hook. Evidence: design. Rejected.
- **batch, loop** (bundled), skills. 5 to 30 worktree agents per run; cost grounds, same as
  the per-task-subagent rejection in `sdd-frameworks.md` (Superpowers 2.5x cost report).
  Evidence: reported. Rejected.
- **simplify** (bundled). Reuse and efficiency review; fold into `review` only if its eval
  shows a gap. Evidence: design. Deferred.
- **debug, verify, run** (bundled). `/debug` toggles debug logging; `/verify` and `/run` are
  generated per project. The repo's `just verify` and CLAUDE.md state the check. Evidence:
  design. Rejected.
- **caveman** (hesreallyhim list, token compression by "caveman speak"). Overlaps the output
  style; the list entry carries no measurement. Evidence: reported. Rejected.
- **skill-creator** (feiskyer; Anthropic `anthropics/skills`). Eval loop and description
  tuning. `plugins/claudetto/evals/README.md` already documents the with/without run.
  Evidence: reported. Rejected.
- **ab (A/B recipe command)**. Dossier suggests shipping an A/B recipe; the evals README is
  the recipe. Evidence: design. Rejected as a skill; stays documentation.
- **161 VoltAgent specialists, 422 davila7 agents** (language, domain, business roles).
  Each description is listing text; the docs warn at 15,000 tokens for all non-built-in
  agents; the models already know the domains; no list reports a gain. Evidence: reported.
  Rejected.
- **test-integrity snitch agent** (dossier anecdote). A model judging tests is weaker than
  a count: no_human reports 44 attempts stopped in 65 days by a mechanical guard (one board,
  reported). `claudetto-spec/hooks/check/tamper.ts` already does this. Evidence: reported.
  Rejected.
- **github-fix-issue, gha, github-review-pr** (feiskyer, ykdojo). Tied to `gh` and a
  project's CI; the `gh` CLI is the interface. Evidence: reported. Rejected.
- **codex-skill second opinion** (feiskyer). Cross-vendor dependency. The supporting number
  (checker other than author, 3 of 3 versus 1 of 3) is n=3 and by the author's own account
  tiny. Evidence: measured (n=3, weak). Rejected; the principle is used by `review`.

## 5. Candidates: claudetto-spec

- **spec**, skill (exists). Clarify, spec, red, green, check; `spec_check` deferred tool;
  Stop gate in `hooks/check/stop.ts`; tamper count in `hooks/check/tamper.ts`.
  Sources: `sdd-frameworks.md` (840-implementation study: citations alone caught invented
  requirements; Spec Kit about 2x OpenSpec's tokens, one author, GPT-5.2), ykdojo tip 34
  (write tests, see them fail, commit, then implement). Evidence: measured (the study's
  figures come through a summary; the repo's own runs live under `evals/`).
  Eval: the 13 existing cases in `plugins/claudetto-spec/evals/` (feature cases, contradiction
  canaries, `trivial-*` negative twins, `ambiguous-headless`), n=3, with and without plugin.
- **spec-review**, command (fork skill, `disable-model-invocation: true`). Compare the diff
  with `specs/*.md`: every requirement implemented, every listed scenario tested, gaps only,
  "skip style". `spec_check` proves a test cites an ID; it cannot show that the test or the
  code satisfies the sentence, which is the gap this fills. Source: best-practices "Review
  against your spec" (SPEC.md reviewer prompt and `reviewer` agent). Evidence: reported.
  Eval: `spec-review-hollow-test`: a spec of 3 requirements; one test cites its ID and
  asserts `true`, one scenario has no test, one requirement is unimplemented. Arms: the
  `spec` skill alone versus `spec` plus `/claudetto-spec:spec-review`; n=3; passes when all
  three gaps are named with IDs and no style findings appear. Counterargument: the Check
  step plus test run may already catch these; run the eval first.
- **spec-init**, command. Scaffold `specs/<capability>.md`. The skill already says "edit the
  capability's existing spec file, or add one" and `references/FORMAT.md` holds the format.
  Evidence: design. Rejected (overlap).
- **spec-check**, command. Wrapper for `spec_check` plus the test command. Duplicates the
  deferred tool and the Stop gate. Evidence: design. Rejected.
- **tdd**, skill (ykdojo tip 34). Same loop as Red and Green in `spec`. Evidence: reported.
  Rejected (overlap).
- **bugfix**, skill (Spec Kit's bug extension: `/speckit-bug-assess`, `-fix`, `-test`). A bug
  fix is changed behaviour: a failing reproduction test citing the requirement, then the fix.
  Extend the `spec` description rather than add a skill, and measure first.
  Evidence: design. Rejected as new; eval `bugfix-repro-first`: a bug report on a fixture,
  `spec` plugin versus vanilla, passes when a failing test is staged before the fix.
- **adopt/brownfield** (spec from existing code; OpenSpec is said to suit existing
  codebases). A one-off task that vanilla handles by prompt; no data. Evidence: reported.
  Rejected.
- **EARS or 16-criteria templates** (Kiro). Review overhead, rejected in `sdd-frameworks.md`;
  at most three scenarios per requirement stays. Evidence: reported. Rejected.
- **constitution or steering skill**. CLAUDE.md holds project rules (`sdd-frameworks.md`).
  Evidence: design. Rejected.

## 6. Recommended set

Target was roughly 4 to 8 per plugin. The evidence supports fewer, and two of the three
counts below sit under the target on purpose: SkillsBench favours "at most three modules",
the harmful-skills study attributes 307 failures to loaded skills, ADR-0177 requires a
measured gain, and no source read reports an outcome for any listed skill or agent.

| Plugin | Item | Kind | Status | Reason it made the cut |
| :- | :- | :- | :- | :- |
| claudetto | Artemis | agent | keep | read-only haiku search; tool limit enforced |
| claudetto | Athena | agent | keep | read-only review sweep, separate context |
| claudetto | Heracles | agent | keep | default agent after built-ins are hidden |
| claudetto | review | fork command | eval first | user disabled bundled `/code-review` |
| claudetto-spec | spec | skill | keep | the only item with measured support |
| claudetto-spec | spec-review | fork command | eval first | fills the gap `spec_check` cannot |

Totals: claudetto 4 (3 exist, 1 conditional), claudetto-spec 2 (1 exists, 1 conditional).
Watchlist, not in the set: `audit-instructions`, `simplify`, `bugfix`.

Design rules for any item that ships:

- First 60 characters of `description` carry the trigger (the user's listing cap).
- A command that has side effects or spends a subagent sets `disable-model-invocation: true`
  (best-practices "Put team procedures in skills").
- One eval case per item with a no-plugin arm; negative twins for any auto-invoked skill.

## 7. Overlap with existing hooks

| Candidate | Existing hook | Verdict |
| :- | :- | :- |
| handoff | `hooks/handover/` (clear, compact, renewal) | duplicate |
| commit | `hooks/git/` (instructions, trailer) | duplicate |
| test-integrity agent | `claudetto-spec/hooks/check/tamper.ts` | duplicate |
| spec-check | `claudetto-spec/hooks/check/stop.ts`, `spec_check` | duplicate |
| built-in agents | `hooks/delegation/offer.ts` hides them | a new agent adds listing text |

## 8. Counts by evidence label (candidates in sections 4 and 5)

Counted from the `Evidence:` lines of sections 4 and 5, 28 candidates in all:

- reported: 18
- design: 8
- measured: 2 (`spec`, whose figures come through a summary of the 840-implementation
  study, and the codex second opinion, n=3 and weak)

No candidate has a measured gain over vanilla on this repo yet; that is what the eval
cases in sections 4 and 5 produce.

## 9. Not fetched or not verified

- SkillsBench's self-generated-skill deltas and the 16-of-84 negative-task figure came from a
  search summary; the abstract page did not state them.
- The "Agent Skills Can Be Harmful" page gave counts but not n of skills, tasks or success
  rates.
- Superpowers, `anthropics/skills`, Anthropic's multi-agent research post and the Fable
  field guide were listed by hesreallyhim but not opened.
- Unknown without a probe: whether `agent: Athena` resolves a plugin agent from a plugin
  skill, and whether a `disable-model-invocation` skill still adds a listing line.
