# Levers of Claude Code for Each Failure Pattern

This file records the findings of the session of 2026-10-26, so that each claim has data on disk when the session clears (the user, 2026-10-26).
The request: map what Claude Code has to fix the preamble and similar patterns: tool and skill descriptions, output styles, prompts and instructions, the global `CLAUDE.md` and `CLAUDE.local.md`, and global `.claude/rules/`, and apply the Five Ws pattern across them (the user, 2026-10-26).
The user's example of the preamble: "USER: Here's an apple. Eat it. AGENT: I'll take this apple, and I will be eating it."

## Facts of Each Lever

The source is cc-docs for Claude Code 2.1.310, read on 2026-10-26. Each row has the status [Documented].

| Lever | Fact | cc-docs page |
| --- | --- | --- |
| Output style | Applies to the main thread and to forks. Other subagents use their own prompt | `configure/output-styles` |
| Output style | It is an instruction, so nothing enforces it. "For actions that must always happen, use hooks" | `configure/output-styles` |
| Output style | Frontmatter: `name`, `description`, `keep-coding-instructions`, `force-for-plugin` (plugin styles only) | `configure/output-styles` |
| Output style | The built-in `Concise` style has a `turnReminder` | `configure/output-styles` |
| `CLAUDE.md`, rules | They arrive as a user message after the system prompt, as context, not as enforced configuration | `configure/memory-and-rules` |
| `~/.claude/rules/*.md` | Load before project rules. A rule with no `paths:` loads at launch, so it costs the same context as a `CLAUDE.md` line | `configure/memory-and-rules` |
| Rule frontmatter | `paths:` is the only key read. It loads the rule when `Read`, `Write`, `Edit`, or a Bash read touches a match | `configure/memory-and-rules` |
| `CLAUDE.md` size | A warning shows for a file over 200 lines | `configure/memory-and-rules` |
| `CLAUDE.local.md` | Appended after `CLAUDE.md` in the same folder | `configure/memory-and-rules` |
| Plugin | Claude Code does not load a root `CLAUDE.md` of a plugin. A plugin has no rules component | `extend/plugins/manifest` |
| Subagent | A non-fork subagent loads `CLAUDE.md` files unless `omitClaudeMd`. `Explore`, `Plan`, and the web-reading agent set it | `extend/subagents/runtime`, `extend/subagents/frontmatter` |

Facts of the repo:
- claudetto replaces 10 tool texts in `plugins/claudetto/modules/session/prompt/prompts.ts`: `Agent`, `Bash`, `Edit`, `Read`, `Skill`, `ToolSearch`, `Write`, `SendMessage`, `EnterWorktree`, and `ExitWorktree`.
- `claudetto-setup --claude-md` writes the global `CLAUDE.md` with a 20-line bound (`GLOBAL_CLAUDE_MD_MAX_LINES` in `plugins/claudetto/modules/setup/limits.ts`), and `--claude-md-rule LINE` adds a user line.
- On 2026-10-26, `~/.claude/CLAUDE.md` held only the 4-line setup header, and `~/.claude/rules/` had no files.

## The 16 Patterns

Patterns 1 to 10 come from a `claudetto:Scout` that read the stock 2.1.310 texts, the dossier files `00`, `01`, `02`, and `06` of `external/please-use-me-often/agent-failure-dossier/`, `prompt-examples.md`, and `.claudetto/research/G-1025p2.md`. Patterns 11 to 15 come from the issue list `I01` to `I18` of `00-INDEX.md` of that dossier.
Evidence of what the agent wrote is thin: two eval runs and the dossier quotes. Most evidence is stock instruction text.

| # | Pattern | Cause and evidence | Lever |
| --- | --- | --- | --- |
| 1 | Announcing the next action (the apple) | Stock `communication.txt:2` and `:12`. claudetto copied it: `plugins/claudetto/agents/main.md:107` (before this session) said "Before the first tool call, say in one sentence what you will do". It contradicted the `Concise` style | Agent body: delete. Style: lead with the outcome |
| 2 | Asking first about reversible work (`I13`) | `tests/claudetto/evals/bad-runs/blind-ctl-real-empty-average.json:21`, `blind-ctl-delete-obsolete-legacy.json:21`, `SF-S-16`, dossier `06-autonomy-and-consent.md:22-67`. `-p` has no `AskUserQuestion` | Agent body `<asking>`. The gate hook covers actions with no undo |
| 3 | A closing offer or a recap | Stock `communication.txt:15` contradicts `willow_tern.txt:14` | Style |
| 4 | Saying "done" with no check (`I04`) | Dossier `02-verification-and-honesty.md:40` and `:46`. Stock `doing_tasks` asks for a check only for UI work (`SF-S-21`) | Agent body `<verification>`, a Stop hook (proposed) |
| 5 | Flattery, and folding under pressure (`I06`) | Dossier `02-verification-and-honesty.md:153`, `:157`, `:161`. `swe-worst-practices.md` W5-18 | Style for the opening. Agent body `<conflicts>` for the position |
| 6 | Em-dashes and arrow chains | `request/system.txt` has 11 em-dashes on 9 lines (`SF-S-10`). Stock `willow_tern.txt` bans them | Style |
| 7 | Mannered prose and metaphors | `prompt-examples.md`, `prompting.md:43`, `G-1025p2.md` F19 | Style |
| 8 | Codenames that the reader does not know | Stock `communication.txt:4` warns about it | Style |
| 9 | Tests that pin wording (`I15`) | Dossier `06-autonomy-and-consent.md:126-169`, `01-grounding-and-memory.md:99`. `swe-worst-practices.md` W1-7 | A `paths:` rule for test files |
| 10 | Generic defaults over repo state (`I01`) | Dossier `01-grounding-and-memory.md:36-43` | SessionStart facts, `<project_state>` |
| 11 | Made-up keys and flags (`I08`) | Dossier `03-safety-and-trust-boundaries.md:81` | The "When" line of the docs skills, global `CLAUDE.md` |
| 12 | Over-engineering (`I09`) | Dossier `04-engineering-delegation-and-cost.md:17` | `<least_code>` already covers it |
| 13 | Changing a value that the user owns (`I14`) | Dossier `00-INDEX.md:35` | `PRECOMPACT_LINE`, global `CLAUDE.md` |
| 14 | Duplicate or orphaned background jobs (`I17`) | Dossier `07-measurement-and-environment.md:78` | The `Bash` tool text |
| 15 | Instructions that fade (`I02`) | Dossier `00-INDEX.md:23`, `01-grounding-and-memory.md:99-104` | A lint, a hook, or a test. The style reminder of each turn |
| 16 | Saying that work starts when the user approved only a plan | This session, 2026-10-26: after "lock the plan in", two replies ended with "Next, I start group 11", and the user said "but user did not tell you to start. yet another fault." No work started. `<default_to_action>` says "For a question or a new plan, answer and wait for the go-ahead", and the `Concise` line "End on what is next" pulled the other way (proposed) | Style: after a plan, end on the go-ahead that the user gives. Agent body `<default_to_action>` |

## The Five Ws per Lever

The Jev audit flagged a missing reason (`r4_reasons`) 25 times (`text-audit.md`). The `claudetto:Reviewer` of 2026-10-26 found the same gap in the "Should be" blocks of `stock-failures/`. So "Why" is the W that the texts leave out most.
The user chose a checklist per lever, not labeled fields (the user, 2026-10-26). Leave out a W that the text already makes clear.

| Lever | Ws | Example |
| --- | --- | --- |
| Tool text | What, When, When not | "Runs a command. Use `Read` for a file, because ..." |
| Skill description | What, When (the trigger) | "Use when a reply names a settings key" |
| Agent description | Who calls it, When | "Use proactively before work over more than one file set" |
| Agent body rule | What, Why, and When for a rule with a condition | "Delete X, because ..." |
| Rule file | Where (`paths:`), What, Why | `paths: ["**/*.test.*"]` |
| Output style | Who reads, What shape | "The user sees few tool calls, so ..." |
| Global `CLAUDE.md` | What, Why. Who is each agent that loads it | "Look up a key in the docs, because ..." |

## Decisions of the User

All on 2026-10-26, through `AskUserQuestion`:
1. Delete the preamble line of `main.md:107`. Keep the update on a finding.
2. `claudetto-setup` writes `paths:` rules into `~/.claude/rules/`, such as `tests.md` for test files.
3. Apply the Five Ws as a checklist per lever.
4. One `Concise` style for the TUI and `-p`.
5. The global `CLAUDE.md` gets the 3 "Yes" lines of the candidate table and the check line until a Stop hook exists (the user, 2026-10-26: "Your proposals are accepted.").
6. The removal of `@fission-ai/openspec` from `package.json` was an accident of the user. The dependency is back, at `1.15.0`.
7. The clone of `handover.ts` and `handover.test.ts` gets fixed in `0.4.0-alpha.1`, with no baseline change.
8. The status line gets 4 fixed rows, and shows the last reading of a missing limit window, dimmed with its age, until its `resets_at` passes. Jev picked both options in place of the user, each with confidence 0.98.

## Changes Made On 2026-10-26

- `plugins/claudetto/agents/main.md` `<communication>`: deleted the preamble sentence. The lines on short forms and on the opening of a reply to a correction moved to the style.
- `plugins/claudetto/output-styles/Concise.md`: patterns 3, 5, 6, 7, and 8, and a decision rule for a session with no `AskUserQuestion`.
- `TOOL_BASH` in `plugins/claudetto/modules/session/prompt/prompts.ts`: background-job ownership (pattern 14).

## What the Dossier Says about `CLAUDE.md`

The user pointed to these discussions on 2026-10-26. A `grep -i` for `claude.md` in `external/please-use-me-often/` found them.

| Source | Finding |
| --- | --- |
| `swe-best-practices.md:85` (B2-2, P0) | Keep a short, high-signal rules file: build and test commands, architecture boundaries, forbidden actions, conventions that the code does not show. At most 1 to 2 screens. Every line costs context and attention |
| `agent-failure-dossier/01-grounding-and-memory.md:90` | Output styles, `CLAUDE.md`, and `SKILL.md` hold for a few turns only (a Reddit thread) |
| `01-grounding-and-memory.md:101` | The backtick rule decayed, although it was in `CLAUDE.md` and in each subagent brief |
| `01-grounding-and-memory.md:104` | Each decayed rule stopped coming back only when a lint, a hook, or a test enforced it |
| `01-grounding-and-memory.md:111` | Claude Code docs: "bloated CLAUDE.md files cause Claude to ignore your actual instructions". Move hard rules into hooks |
| `01-grounding-and-memory.md:88` | The model admitted a `CLAUDE.md` protocol, then still missed a file |
| `02-verification-and-honesty.md:91` | "Do not delete the tests to make the tests pass" as a `CLAUDE.md` line with a backstory |
| `02-verification-and-honesty.md:152` | The top comment of a `CLAUDE.md` thread: "ask one clarifying question" before sprinting in the wrong direction |
| `05-appendices-and-limitations.md:29` | Mechanisms for `I02`: `CLAUDE.md`, rules, managed `claudeMd`, reinjection on `UserPromptSubmit`, and compaction that keeps feedback |

## Proposal for the Global `CLAUDE.md`

The global `CLAUDE.md` is the one text that reaches each agent: the main thread with any agent or style, each non-fork subagent unless `omitClaudeMd`, and a session with no claudetto. The agent body and the style reach only the main thread and forks.
A line belongs in it when each of these is true (proposed, from the facts above and the dossier table):
- It applies in any repo.
- An agent that does not get `main.md` or the style needs it, such as a `claudetto:Worker`.
- No lint, hook, test, or setting can enforce it, because a rule that a check can enforce decays as text (`01-grounding-and-memory.md:104`).
- No agent text already holds it.
- It fits the 20-line bound.

Candidates (proposed). A `grep -il` of `plugins/claudetto/agents/*.md` on 2026-10-26 found no agent text with a rule on user-owned values, docs lookup, a preamble, or dashes. `main.md`, `Worker.md`, and `Tester.md` hold a check rule.

| Candidate | Pattern | Global `CLAUDE.md`? |
| --- | --- | --- |
| Report results, not plans: no line that says what you will do next | 1 | Yes, a judgment rule |
| Ground a key, flag, or default in the repo or the docs of the installed version, not in memory, and name the source | 10, 11 | Yes, a judgment rule |
| A value that the user set stays, and a rejected option stays rejected, until the user changes it | 13 | Yes, also the gate can enforce known values |
| Call work done only after its check ran in this session | 4 | Better as a Stop hook. A line until the hook exists |
| Code items in backticks, no dashes as joins | 6 | No. A lint or a hook enforces it. The dossier shows that the text form decayed |
| Delete no test to make it pass | 9 | No. The `paths:` rule for test files holds it |

## Deletion of the Prose Tests

The rule: "when writing tests, any test that's about implementation prose rather than behaviour is to be wiped entirely. in terms of behaviour, AAA method will be applied where fit." (the user, 2026-10-26). It is in `.claude/rules/test-behavior.md`.
Four `claudetto:Scout`s classified each case as KEEP, PROSE, or MIXED (a behavior check with a wording check) on 2026-10-26. Three `claudetto:Worker`s, split by folder, checked each case again and acted on it. A MIXED case keeps its behavior check and the values that its message carries, and loses the check of the wording. The Worker reports of 2026-10-26 give the counts. `git status` and `git diff` show the edits.

Worker for `tests/tools/`, `tests/repo/`, and `tests/claudetto-browser/`:
- Deleted `tests/tools/version-pin.test.ts`, 3 cases of `tests/repo/architecture-page.test.ts`, and 1 case of `tests/tools/eval-compare/compare-run.test.ts`.
- Kept as behavior, against the Scout: `tests/repo/skill-tokens.test.ts` (a size bound against `SKILL_MAX_TOKENS`), `tests/tools/schema/spans.test.ts` (the output of `wrapCodeSpans` and `applyCodeSpans`), `tests/tools/sandbox/frontmatter.test.ts` (a carried log line), and `tests/repo/evals-private.test.ts` (a leak lint on names).
- Changed MIXED cases in 17 files to check values: exit codes, arm letters, counts, file paths, key names, and module names.
- One case failed after the edits: `tests/repo/hook-evals.test.ts` "lint: each hook of each plugin has its eval cases". Entries of `plugins/*/evals/hooks.json` name tests that the Worker for `plugins/claudetto/tests/` removed. That Worker got the fix.

Worker for `tests/claudetto/session/`, `agents/`, `styles/`, `spec/`, `evals/`, and the small folders:
- Deleted `session/prompt/tool-texts.test.ts` and its fixture `session/prompt/fixtures/tool-texts-2.1.309.json`, and the prose cases of `texts.test.ts`, `precompact.test.ts`, `skills/dedupe.test.ts`, `skills/find-docs.test.ts`, `surface/faults.test.ts`, `session/hygiene/notice.test.ts`, `styles/slice.test.ts`, `spec/minispec.test.ts`, `spec/skill.test.ts`, `spec/parity/main.test.ts`, and `agents/roster.test.ts`.
- Kept the `<security>` test of `main.md`, because the user asked to keep it (2026-10-25). It is the last case of `tests/claudetto/session/prompt/texts.test.ts`.
- Changed MIXED cases to check values in `plan-agents.test.ts`, `handover.test.ts`, `status.test.ts`, `switch.test.ts`, `authors.test.ts`, `settings-pin.test.ts`, `spec/minispec.test.ts`, and the two grader tests.
- The failing tests of its run need the OpenSpec CLI. A change that is not of this session removed `@fission-ai/openspec` from `package.json`, so `node_modules/@fission-ai` is missing.

Specs, designs, and tasks that name a deleted case (from the Worker reports, to update in this change):
- `openspec/specs/prompt-base/spec.md` "Rule Kept", and archive tasks 7.3 and 7.6.
- `openspec/specs/text-surfaces/spec.md`: "Negative Rule", "Shorter Than the Default", "Behavior Kept", and "Run the Free Check".
- `openspec/specs/session-hygiene/spec.md` "Notices Report a Change": the plural rule lost its test.
- `openspec/specs/minispec/spec.md` "Release with Several Capabilities".
- `openspec/specs/agent-roster/spec.md`: the "Use proactively" description.
- `openspec/specs/lean-surface/spec.md`.
- `openspec/specs/release-evidence/spec.md` "Tested Claude Code Version", and `research/tooling.md`, which names `version-pin.test.ts`.
- The change spec `plugin-architecture` "Architecture Page".
- Design D7 and D10 of the archive `release-0-3-0-alpha-2`.

## Review of the Dossier

A `claudetto:Reviewer` checked `prompt-examples.md` and `stock-failures/` on 2026-10-26.
- Each quote of the `Stock:` blocks matched the stock texts after unescaping. 3 line cites were off by one.
- It found 5 high, 8 medium, and 5 low defects, and 6 "Should be" rewrites with no reason. A `claudetto:Worker` fixed each one on 2026-10-26.
- After the fix, `grep -c` gave these counts of entries, `Strength: direct`, and `Strength: inferred`: `01-sections.md` 32, 17, 15. `02-tools.md` 29, 12, 17. `03-agents-skills.md` 28, 11, 17.

## Checks On 2026-10-26

These checks ran after the edits of this file, the prose-test deletion, and the clone merges.
- `just check`: lint (Biome), the Markdown lint, the type check, and `generate --check` passed. The tests gave 1370 pass and 130 fail.
- Each of the 130 failures needs the OpenSpec CLI. A change that is not of this session removed `@fission-ai/openspec` from `package.json` and `bun.lock`, so `node_modules/@fission-ai` is missing.
- `just lab`: 191 pass, 0 fail, after the fix of `plugins/claudetto/tests/ask.test.ts` to `toMatchObject({ questions: [STORE] })`.
- `bun run validate`: passed.
- `bunx jscpd --no-tips`: 1 new clone, `plugins/claudetto/tests/stubs/handover.ts:15` and `tests/claudetto/session/handoff/handover.test.ts:143`. The pair was at HEAD under `tests/claudetto/handoff/`, and another session moved the file. The baseline did not change.
- The gate denied a Bash script of a Worker, because the script text held an env-file name as prose. The Worker did the edits with `Edit`.

These checks ran after groups 11 to 14 of `tasks.md`.
- `just check`: each step passed. The tests gave 1514 pass and 0 fail. `dry` found 86 clones and none that is not in `.jscpd-baseline.json`, and the baseline did not change.
- `just lab`: 191 pass, 0 fail.
- `bun run validate`: passed. It gave 1 plugin directory warning for each of `claudetto` and `claudetto-browser`, `ICON_MISSING`, which does not change the result.
