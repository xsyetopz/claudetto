# SDD Framework Sources

Raw fetch summaries behind sdd-frameworks.md, one section per source.

## Source: https://github.com/Fission-AI/OpenSpec

Fetched 2026-11-20 with WebFetch; the text is the tool's summary, not the page.

### OpenSpec: Summary

**What it is:** A spec layer for AI coding assistants. Humans and the AI agree on what to build before any code is written. The page describes it as "fluid not rigid" and "iterative not waterfall."

#### Workflow
1. **Explore (optional):** `/openspec-explore` is a thinking partner that reads your code and helps shape a plan.
2. **Propose:** `/openspec-propose <name>` creates a change folder with a proposal, spec deltas, design, and a task checklist. You review the plan before implementation.
3. **Apply:** `/openspec-apply-change` works through the tasks and checks them off.
4. **Archive:** `/openspec-archive-change` moves the change into a dated archive folder and updates the specs.

#### File Layout
- `openspec/changes/<change-name>/` holds each in-flight change with `proposal.md` (why and what), `specs/` (requirements), `design.md` (technical approach), and `tasks.md` (checklist).
- `openspec/changes/archive/` holds completed changes, named by date.
- `openspec/specs/` holds the current source-of-truth specs.

#### Spec Format
- Plain Markdown with no special syntax to learn.
- Requirements use a `### Requirement:` heading and state behavior with the keyword SHALL.
- Each requirement has one or more `#### Scenario:` blocks written as WHEN/THEN bullets.
- The page's example shows an `## ADDED Requirements` section. It does not document MODIFIED or REMOVED delta sections, so verify those in the docs.

#### Profiles
- **Default:** `explore`, `propose`, `apply`, and `archive`.
- **Expanded:** adds new-change, continue-change, ff-change, verify-change, bulk-archive-change, and onboard.
- Switch with `openspec config profile`, then run `openspec update` to apply.

#### CLI Commands (from the page)
- `openspec init`: set up a project.
- `openspec update`: refresh installed skills and agent instructions.
- `openspec install`: upgrade the standalone CLI.
- `openspec config profile`: choose a profile.
- `openspec config set telemetry.enabled false`: opt out of telemetry.
- Install via curl/PowerShell scripts, npm, or Homebrew (npm needs Node.js 22.20.0+).

#### Validation Rules
The page does not describe validation rules or a validate command.

#### Stores (Beta)
Stores let teams keep planning in a separate repo, shared across code repos. Use cases include cross-repo features, shared requirements owned by a platform team, and planning before code exists.

#### Why Lighter Than Spec-Kit
The page says Spec Kit is "thorough but heavyweight," with rigid phase gates, a lot of Markdown, and Python setup. It positions OpenSpec as lighter and more flexible, letting you revise any artifact at any time. This is the project's own comparison, not an independent one.

## Source: https://github.com/github/spec-kit

Fetched 2026-11-20 with WebFetch; the text is the tool's summary, not the page.

**Workflow phases and commands**

- **Spec-Driven Development (core):** `/speckit-constitution`, `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge`. Repeat implement and converge until convergence reports `Converged`. The page mentions clarification, checklists, and consistency analysis but gives no commands for them.
- **Bug fixing (extension, `specify extension add bug`):** `/speckit-bug-assess`, `/speckit-bug-fix`, `/speckit-bug-test`. The final verdict is `verified`, `partial`, or `failed`.
- **Idea assessment (extension, `specify extension add assess`):** `/speckit-assess-intake`, `-research`, `-define`, `-shape`, `-decide`. The decision is `go`, `needs-clarification`, or `kill`. A `go` decision hands off a summary from `decision.md` to `/speckit-specify`.

**File layout and formats**

- Bug reports go in `.specify/bugs/<slug>/`.
- Assessment artifacts go in `.specify/assessments/<slug>/`. They are described as Markdown.
- The repo root lists `templates/`, `presets/`, `extensions/`, `workflows/`, `bundles/`, `integrations/`, `scripts/`, `tests/`, and `.specify/memory/`. The page does not say what these contain or what formats they use. It also doesn't mention YAML or JSON.

**Constitution**

The page gives only an example prompt ("principles focused on code quality, testing, and maintainability") and says a project constitution is established once per project. It does not define the constitution's structure or contents.

**Templates**

Templates can be adapted through presets or overridden for a single project. The page does not describe their structure.

**Task structure and test-first rules**

The page does not describe how tasks are structured or whether any test-first rules apply.

**Criticisms and limitations**

The page mentions no criticisms of Spec Kit. It notes that catalog listings are not audits or endorsements, so community source code should be reviewed before installing or running it. The detailed documentation lives on linked pages that are not included here.

## Source: WebSearch: spec-driven development criticism spec kit openspec kiro token overhead markdown drift 2026

Fetched 2026-11-20 with WebSearch; the text is the tool's summary, not the page.

Web search results for query: "spec-driven development criticism spec kit openspec kiro token overhead markdown drift 2026"

Links: [{"title":"Spec Driven Development: Why the Future of AI-Assisted Software Development Starts with the Specification - JAVAPRO International","url":"https://javapro.io/2026/10/21/spec-driven-development-why-the-future-of-ai-assisted-software-development-starts-with-the-specification/"},{"title":"Spec Driven Development Is Wasting Tokens","url":"https://medium.com/it-chronicles/is-your-safe-choice-burning-your-budget-1cfddf8782e4"},{"title":"Spec-Driven Development in 2026: Guide + Tool Comparison","url":"https://codemyspec.com/blog/spec-driven-development"},{"title":"Spec Kit vs Kiro vs OpenSpec: SDD Tools","url":"https://levelop.dev/blog/spec-driven-development-tools-compared"},{"title":"Spec-Driven Development: Spec Kit, Kiro, OpenSpec Compared","url":"https://juliantellez.com/blog/what-spec-driven-development-is"},{"title":"Spec-driven development","url":"https://en.wikipedia.org/wiki/Spec-driven_development"},{"title":"Spec Kit vs OpenSpec vs BMAD vs Superpowers (2026)","url":"https://specroot.io/notes/spec-kit-vs-openspec-vs-bmad/"},{"title":"Spec-Driven Dev Tools: Spec Kit vs Kiro vs Tessl","url":"https://particula.tech/blog/spec-driven-development-tools-spec-kit-vs-kiro-vs-tessl"},{"title":"OpenSpec Review: Spec-Driven Dev Without the Ceremony — andrew.ooo","url":"https://andrew.ooo/posts/openspec-spec-driven-development-review/"},{"title":"Spec-Driven Development vs Plan Mode","url":"https://instil.co/blog/spec-driven-development-is-dead-long-live-plan-mode"}]

The search found a lot of 2026 criticism of spec-driven development (SDD). Most of it is about two things: token and review overhead, especially with Spec Kit, and specs drifting out of sync with the code.

**Token and time overhead**
- **Benchmark (Medium, about 8 months old):** Using GPT-5.2 and GPT-5.2-Codex, total token usage came in at approximately 57,740 for OpenSpec versus 120,947 for Spec-Kit in one test. In a second test, total usage reached 91,729 tokens for OpenSpec and 181,040 for Spec-Kit, nearly double. The author also reports that Spec-Kit required autonomous bug-fixing rounds to correctly implement streaming status, while OpenSpec delivered a correct implementation on the first pass.
- **Instil, "Spec-driven development is dead. Long live plan mode":** On the spec-kit projects I ran, the cost ran several multiples of the equivalent plan-mode flow for the same scope of work. The post points to a long-running report of excessive token usage where Pro-tier users were burning through limits in under an hour on the GitHub spec-kit issue tracker. It also says Scott Logic ran the same exercise and reported their spec-kit run was around ten times slower than iterative prompting, and that Prezi's engineering team reached the same conclusion.
- **Levelop hands-on test:** adding a single feature to an existing app ran around 90 minutes from prompt to a complete spec, plan, and task breakdown, plus another half hour of agent execution.
- **JAVAPRO (October 2026):** Spec Kit's initial setup takes around 30 minutes, and token consumption is considerable due to the detailed Markdown documents.
- **Hacker News comment (April 2026):** Kiro and Spec Kit have too many stages and waste tokens.

**Too much markdown and over-specifying**
- Birgitta Böckeler (Thoughtworks) tried the tools on real work. Kiro turned a small bug into four user stories with sixteen acceptance criteria. Spec Kit produced so many repetitive markdown files that she concluded "I'd rather review code than all these markdown files". She also found agents still ignored the spec in places.
- Particula Tech: Spec Kit draws the loudest criticism because it generates excessive, repetitive markdown that produces review overload. The same piece calls Kiro the lightest of the three tools, at three markdown files.
- The harshest take quoted is an r/ChatGPTCoding thread calling SDD "a form of technical masturbation". There's also a dev.to post saying a single hand-written instructions file did the job instead of OpenSpec.

**Drift between specs and code**
- CodeMySpec: The dominant community complaint is manual spec drift. It describes the pattern as spec-first-then-drift: the tools generate a disciplined spec to launch a session, then let the code become the source of truth again the moment generation starts.
- Levelop: Spec Kit and Kiro produce static specs, while OpenSpec is semi-living because archived changes update the source of truth.
- Julian Tellez cites a June 2026 paper that still lists specs silently falling out of sync with code as a failure current approaches don't fully solve.
- An EPAM preprint found that when Gemini was given a Kiro-format spec directly, the output was almost unusable, so specs don't carry over cleanly between agents.

**Defenses and counterpoints**
- JAVAPRO argues SDD isn't waterfall because the specs co-evolve with the implementation. It still agrees the overhead isn't worth it for every task.
- JAVAPRO also notes Kiro's "Steering Hook" mechanism that checks spec compliance on every file save – a continuous validation that neither Spec Kit nor OpenSpec offer.

Overall, opinion is fairly consistent across sources: Spec Kit is seen as the heaviest on tokens, OpenSpec as lighter (it was about half the cost in the one benchmark), and none of the three tools fully prevents drift.


REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.

## Source: https://github.com/obra/superpowers

Fetched 2026-11-20 with WebFetch; the text is the tool's summary, not the page.

**Superpowers workflow**

1. **Brainstorming** activates before any building. The agent asks questions to draw out what you want and why, then plays back its understanding for correction. Small changes get agreed in chat. Projects get a written design document, shown in chunks.

2. **Using git worktrees** starts after design approval. It creates an isolated workspace on a new branch, runs project setup, and verifies a clean test baseline.

3. **Writing plans** breaks work into tasks of about 2-5 minutes each. Every task includes exact file paths, complete code, and verification steps. The page says the plan should be clear enough for "an enthusiastic junior engineer with poor taste, no judgement, no project context."

4. **Executing plans** has two options:
   - *Subagent-driven development* dispatches a fresh subagent per task, with a review after each. The page calls this the most thorough option.
   - *Executing plans* runs every task inline in one session, with one review of the whole branch at the end. The page calls this the cheapest option.

5. **Test-driven development** enforces RED-GREEN-REFACTOR: write a failing test, watch it fail, write minimal code, watch it pass, then commit. The page states that it "Deletes code written before tests."

6. **Requesting code review** runs between tasks and reports issues by severity. Critical issues block progress. Subagent-driven development uses two review stages: spec compliance, then code quality.

7. **Verification before completion** checks that a fix is actually working. The philosophy section puts it as "Evidence over claims - Verify before declaring success." The page gives few details on this skill.

8. **Finishing a development branch** verifies tests, then offers merge, PR, keep, or discard options, and cleans up the worktree.

**What makes it effective (per the page):**
- Skills trigger automatically, and the agent checks for relevant skills before any task.
- Design is agreed before code is written.
- Small tasks with explicit verification reduce drift.
- Test-first discipline and review gates catch problems early.
- The agent can run autonomously for "a couple hours at a time without deviating from the plan."

**Costs and tradeoffs:**
- Up-front time goes into design and plan sign-off before implementation starts.
- Review-heavy modes cost more than inline execution. Subagent-driven development is the most thorough but not the cheapest.
- The page notes that a session can misbehave by "burn[ing] more tokens than you'd expect," and it provides a diagnosing skill for this.
- The page gives no quantitative figures for time or token cost.
- Each agent harness requires a separate install.

## Source: https://specroot.io/notes/spec-kit-vs-openspec-vs-bmad/

Fetched 2026-11-20 with WebFetch; the text is the tool's summary, not the page.

### Strengths and weaknesses

The page covers test-first enforcement, subagent review, token cost, file counts, and drift for only some tools. Where it is silent, I say so.

#### Spec Kit
- **Strengths:** Each feature goes through a fixed pipeline with checks between steps (clarification, checklists, consistency analysis). The bundled workflow pauses twice for human approval of the spec and the plan. It has the broadest agent support listed (38 integrations) and the largest community (147,175 stars).
- **Weaknesses:** Critics call it heavyweight, and one OpenSpec user says it "generates way too much boilerplate to review." One commenter says it "waste[s] tokens." Each feature's folder is kept as history by default, so nothing updates a whole-system view.
- **Test-first, subagent review:** Not covered.
- **File count:** A folder per feature with a spec, plan, and tasks.
- **Drift:** No default handling. Teams keep the folder as history, keep `spec.md` living, or let discoveries flow back.

#### OpenSpec
- **Strengths:** Lightweight and process-agnostic. Each change's delta merges into one current spec when archived, which suits existing codebases. It has a validate command and a standalone CLI, and the page credits it with 30+ agents.
- **Weaknesses:**
  - A team found it produced documentation that was hard to review and did not scale.
  - Its requests for hierarchical specs and cross-repo specs were closed or remain open, and a request to repair a change after it is applied was closed as not planned.
  - A tracker issue (#2139) reports that requirements written by agents grew from 1.8 to 5.0 SHALLs on average within about a month.
  - Stakeholders cannot easily read specs without raw markdown or cloning the repo.
  - One BMAD user says it under-defines what you are building.
- **Test-first, subagent review:** Not covered.
- **File count:** A folder per change with a proposal, design, tasks, and spec deltas. One user logged 347 changes in 24 days.
- **Token cost:** Not covered, though it is described as lighter than Spec Kit.
- **Drift:** Deltas merge into the current specs on archive, but the page does not describe checks for drift after merge.

#### BMAD
- **Strengths:** It scales planning to the size of the change and brings in product, architecture, UX, and testing roles. Its README says small changes go straight to build.
- **Weaknesses:** Users reported "massive overscoping" and said it felt "far too heavy." Those comments date from December 2025, before the current sizing approach.
- **Test-first, subagent review, token cost, drift:** Not covered beyond a retro on each epic.
- **File count:** Briefs, a PRD, architecture, and epics when the work needs them.

#### Superpowers (obra)
- **Strengths:** It is the only tool the page describes as enforcing tests first, with subagents building task by task and review between tasks. A human must approve the design before building. It is a plugin, installable in Claude Code from Anthropic's marketplace.
- **Weaknesses:**
  - One user reports a test run went from 40 minutes to 8 hours and produced lower-quality output (local AI, single account).
  - A Claude Code user's own logs showed about $361 per merged ticket with Superpowers versus $143 without it. The user noted their briefs were already detailed and that the data was not a controlled study.
  - Some find it "way too opinionated."
- **Drift:** Design documents stay as dated files, and no step merges them into a description of the whole system.
- **File count:** A dated design document and a plan per piece of work.

#### GSD
- **Strengths:** Research, planning, and execution run in fresh-context subagents, which keeps the main session lean.
- **Weaknesses:** Users report heavy token use. One hit the 5-hour limit in about 30 minutes, and another estimates roughly 4x token use in exchange for traceability and an autonomous mode.

#### Kiro
- **Strengths:** Specs are built into the editor, with steering files covering product, stack, and structure. It produces three files per spec.
- **Weaknesses:** Specs are described as detailed on implementation but thin on business context. One user says it does not separate customer requirements from design details. Closed source.
- **Drift:** A user reports that a spec's git history shows when it changed, not whether the code it references has diverged.

#### Research findings
- In an 840-implementation study, Spec Kit and OpenSpec both passed all functional tests. Only citations to requirements let invented requirements be caught automatically.
- In a study of Spec Kit on five repositories, the spec, plan, and task files barely changed judged quality. Letting the agent read the repository at each step did.
- In interviews with 21 practitioners, almost none used an SDD tool as published.

#### Cross-cutting gaps
- **Drift:** The page names drifting specs as one of the three most common complaints. No tool has a built-in check for code diverging from its spec after the work merges.
- **Token cost:** Evidence exists only for GSD and Superpowers, and it is anecdotal.
