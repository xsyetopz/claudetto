# Design parts 2

This file holds decisions D17 to D19, D29, and D30 of `design.md`.
Source for D17 to D19: `research/architecture.md`.
Source for D29: `research/sembr.md`.
Source for D30: `research/paper-2609-32616.md`.

## D17 Plugin and marketplace layout

0.28.0 follows the layout in the plugin docs (plugins reference and marketplace pages), and keeps none of the old structure.
The repository root is the marketplace root.
Target tree:

```text
.claude-plugin/marketplace.json        dotclaude and the add-ons (D24)
plugins/dotclaude/
  .claude-plugin/plugin.json           manifest, userConfig for per-user switches
  agents/*.md                          role agents, the source of model, effort, maxTurns
  skills/<name>/SKILL.md               setup (OpenSpec step only), with its own scripts/
  hooks/hooks.json                     modules (one path) and classic hooks
  hooks/register.mjs                   composition root: literal on() lines, top-level $ functions
  tests/<feature>.test.ts              hook lab, one file for each feature
  output-styles/dotclaude.md
  settings.json                        keys that Claude Code accepts in a plugin: agent, subagentStatusLine
  bin/                                 only a tool that the model calls by name
  types/index.d.ts                     only when a feature uses $.state
  lib/                                 pure shared code, imports only lib/, budget.mjs
  features/<feature>/                  guard prompt context statusline setup sembr reads adherence
    rules.mjs  limits.mjs              pure logic and the bounds of this feature
    cli.mjs                            optional entry for a classic hook or bin
plugins/dotclaude-jev/ dotclaude-browser/ dotclaude-docs/ dotclaude-codegraph/   add-ons, same shape, smaller
tests/<plugin>/ tools/ evals/ schemas/ wiki/ openspec/ external/
tools/limits.mjs                       repository bounds (D35: no baseline file)
evals/                                 suites in the format of `claude plugin eval` (D9)
```

In this change, `lib/` means `plugins/dotclaude/lib/`.
Rules: component paths in manifests start with `./`, stay inside the plugin root, and exist.
Entry names equal manifest names.
`claude plugin validate` passes on the marketplace and on each plugin.
Task 2.8 closed the import question: a hooks module may import a file inside the plugin by relative path (`research/probes.md`, 2.8).
The module graph follows these rules:

1. A module file imports by relative path inside the plugin, and no import leaves the plugin, because the cache copy has no file outside it.
1. A handler with `$` calls may sit in a feature file that the module imports.
   `claude plugin validate` lists those calls under the module (probe P1, task 2.27).
1. No file in the graph has a `node:` import, because the module runs with no Node.
1. `on()` event names are string literals, and `import()` is not used.

Probe P1 (task 2.27) passed, so the glue of a feature sits in its folder (`research/probes-3.md`).
`CLAUDE.md` at a plugin root does not load, so no plugin has one.

## D18 Separation of concerns, size bounds, and bound tiers

One concern for each file.
Each normal file has 300 lines or fewer, and each test file has 500 lines or fewer.
`FILE_MAX_LINES` and `TEST_FILE_MAX_LINES` are in `tools/limits.mjs`, because only tests read them.
One test walks the repository and fails on a file over its bound.
The existing 300-line rule for `.md` files becomes the general rule.
Generated files (`schemas/`, lock files) are excluded by name in the same test.

Bounds have three tiers:

1. Shared runtime bounds are read by two or more parts, or the wiki snippet carries them.
   They stay in `lib/budget.mjs`: `CONTEXT_WINDOW` and `USAGE_LEVELS`.
1. Feature bounds are read by one feature.
   They go in `features/<name>/limits.mjs`, or in the own module of an add-on.
   Examples: the guard timeouts, `SUBAGENT_CONTEXT_MAX`, `REPORT_MAX_WORDS`, `CONTEXT_NOTICE_AT`, `RESULT_MAX_CHARS` (8,000), `GRAPH_CONTEXT_MAX`, and the byte budget of each prompt variant.
1. Repository bounds are read only by tests and tools.
   They go in `tools/limits.mjs`: the file size bounds, `START_TOKENS`, `AGENT_DESCRIPTION_MAX_CHARS`, and the eval bounds.
   `just measure` prints its numbers and compares them with `START_TOKENS`, and writes no file (D35).

The `AGENTS` list is dropped.
`agents/*.md` frontmatter is the official source of `model`, `effort`, and `maxTurns`, and the pin test reads it.
`userConfig` is for a per-user choice that the module reads as `options`, not for a pinned bound.
Setup and the status line cannot read `options`, so their bounds stay in `budget.mjs`.
Probe P2 (task 2.28): install shows a dialog even when each option has a default, and the defaults reach `options`.
So a plugin adds a `userConfig` option only for a choice that the user makes, because each plugin with options costs one dialog at install.

Module size trigger: when `hooks/register.mjs` passes 250 lines, the next feature becomes an add-on plugin with its own module.
One module holds all `$` calls of a plugin, and the 0.27.0 module has 91 lines for 2 hooks.

Dependency rule:

1. Entry points are `hooks/register.mjs`, `features/*/cli.mjs`, skill scripts, and the status line.
   They import their own `features/<name>/` and `lib/`.
1. A feature imports `lib/` and its own folder, and never another feature.
   Shared code moves to `lib/`.
1. `lib/` imports only `lib/`.
1. `tools/` and `tests/` may import `plugins/`, and `plugins/` never imports them.
1. A plugin imports nothing from another plugin.

Test T1 (task 3.14) parses the `import` lines and enforces the rule, with no new dependency.

## D19 Runtimes

- What needs Python uses Python (a Python file, with the standard library or a pinned requirement).
- Runtime JavaScript is `.mjs` on Node 22.18 or later, with `node:` modules only.
  The `.test.ts` hook-lab files are the one exception, because `claude plugin test` requires that name.
- A file in the import graph of the hooks module has no `node:` import.
  Only a `cli.mjs` entry for a classic hook or a `bin/` tool may use `node:`.
  Test T1 fails on a `node:` import in the graph of `hooks/register.mjs`.
- Repository tooling that does not ship (tests, `tools/`, evals) uses Bun.
- The old rule that the `um` command of `dotclaude-modder` runs on Bun is removed, with the plugin (D20).
- A task lists the current files by runtime and moves any that break the rule.

## D29 Semantic line breaks

Source: `research/sembr.md`.
Claude fuses sentences on one line in files, commits, and chat, although `CLAUDE.md` forbids it.
dotclaude fixes the text before it is written, with no model token.
It does not use a `PostToolUse` rewrite.
A rewrite after the write makes the next `Edit` fail with "File has been modified since read" and adds an `edited_text_file` diff to the next request (**inferred** from bundle text, not run).
Task 2.14 found no such failure for a `Stop` fixer, and probe (a) below decides the case for a line-break rewrite.

Parts:

1. A `sembr` formatter in plain Node in `lib/`.
   It only splits after a sentence end (`.`, `!`, `?`) that a space and a new sentence follow, and it never joins lines.
   It skips front matter, code fences, inline code, link targets, URLs, tables, headings, link definitions, and a line that ends in a hard break.
   It does not split after `e.g.`, `i.e.`, `etc.`, `vs.`, a single capital letter, or a version number, because a missed split is better than a wrong one.
   It keeps the list indent and the quote prefix of a split line.
1. A silent `PreToolUse` command hook (entry `features/sembr/cli.mjs`) rewrites `updatedInput` for `Write` and `Edit` of `.md` and `.mdx` paths.
   For `Edit` it changes `new_string` only, and only when `new_string` starts and ends at line bounds of the file.
   A `new_string` that is a fragment of a line stays unchanged, and so do table rows and inline-code spans.
   It prints no `additionalContext` and no `systemMessage`, and it sets no `permissionDecision`, so the normal permission flow stays (a write still prompts, and `gh pr create` still asks before it publishes).
1. A `tool.call` handler on `Edit` in the hooks module repairs a cross-sentence `old_string`.
   Claude Code checks `old_string` before the classic hook runs, so the classic hook cannot do it (task 2.29 follow-up).
   When the `old_string` is not in the file and its split form is, the handler splits `old_string` and `new_string` and calls `next`.
   It costs no model token.
1. The same hook type on `Bash` rewrites the quoted-heredoc forms of `git commit` and `gh pr create`, and no other form.
   It never touches the subject line, the title, or a trailer.
   It rejects the rewrite and returns the command unchanged when any output line equals the heredoc delimiter, because a split cannot end the heredoc early.
1. No `Stop` hook counts chat lines (D35).
   The hook only wrote its counts to the `sembr-chat.jsonl` log, which was a state file.
   The eval measures the share of fused chat lines from the run trace instead.
1. The output style gets a `<reply_format>` block as the chat fallback.
   It gives the reason (the user reads the source of a reply in diffs and logs), one wrong example, and one right example.
1. A `session.append` rewrite of the chat reply with door `response` ships only when probe (c) shows that the display uses the rewritten row.

Probes, first (tasks 2.29 to 2.31):

- (a) A later `Edit` whose `old_string` comes from the unwrapped text of the model after a rewrite.
- (b) `updatedInput` in auto mode, and that the normal permission flow runs when the hook sets no `permissionDecision`.
- (c) `session.append` with door `response`: does the display, the stored row, or both change, and does the cache prefix stay stable.
  Result (task 2.31): both change, the hook fires once for each content block, and the next turn read about 200 fewer cached tokens in one run, so task 18.11 measures the cache cost first.

A failed probe changes the route here, and the hook does not ship in the failed form.
Alternative: `markdownlint-rule-sembr` as a gate.
Rejected for the runtime, because it needs four packages and a block costs tokens, but it may serve as a dev-only check in `just check`.

## D30 Hold correct work under an unsupported claim

Source: arXiv 2609.32616 (**confirmed**, `research/paper-2609-32616.md`).
In that paper, agents in Claude Code damage correct finished work after a false accusation.
The accusation can come from the user, from a subagent report, or from project context.
The harm is a rollback, a deletion, or a reversal that the agent makes after it says "you're right".
Three interventions cut the harm of GPT-5.6-Sol and MiniMax-M3: I1 an evidence rule in the session, I2 a gate on irreversible calls, and I3 the gate armed by a live signal (**confirmed**, Table 4).
D30 follows D27 and D28: a claim is checked against evidence, whether the model or the user makes it.
A claim with no check in the workspace is a claim, not a fact, and a program checks it where it can.

Parts, in the order of D1:

1. Evidence line, from I1.
   One line in the output style and in each prompt variant (D15): before the model reverts, deletes, or undoes finished work, it shows a new check in the workspace that proves the work wrong.
   When it cannot reach the evidence, it keeps the work and asks for the evidence.
   The cost is about 50 tokens in the cached prefix (**inferred**).
   The paper gives no I1 text, so the wording is ours and the eval tunes it.
1. Subagent rule.
   Each agent body keeps the work and reports to the parent when a claim has no workspace evidence.
   The parent states a user accusation as "the user claims" in the task text.
1. Gate, from I2 and I3 (not built, D35).
   The gate needs a flag that a `UserPromptSubmit` hook sets and a `PreToolUse` hook reads, and that flag is a state file.
   Task 18.12 found it not needed.
   The text below is the design that D35 rules out.
   A `UserPromptSubmit` hook sets a flag when the prompt matches an accusation pattern.
   A `PreToolUse` hook then asks the user, or denies in auto mode, before one irreversible call: `git reset --hard`, `git checkout --`, `git revert`, `rm`, or a `Write` that shrinks a file.
   The hook tells or asks and blocks only an irreversible call, and it never blocks a normal edit.
   The flag comes only from `UserPromptSubmit`, so the gate sees a user accusation only.
   The subagent-report and `CLAUDE.md` channels rely on the evidence line and the agent rule (I1), which task 7.9 measures.
   The hook fires only with the flag, because the guard of 0.27.0 asked 56 times with no real risk (D28).
   The cost is 0 tokens when it does not fire, and about 40 to 60 tokens when it does (**inferred**).

Open items, recorded:

- The paper tests Claude-Opus-5 and Claude-Sonnet-5, and the mapping to Opus 5.5 and Sonnet 5.5 is **inferred**.
  Haiku 5.5 has no data.
  The eval runs all three, with Opus 5.5 first, because Opus-5 over-rides recovered evidence most.
- The paper has no I1 text, no false-positive rate of the gate, and no token cost.
  The eval sets the gate rules and measures its false-positive rate on a warranted-accusation control case, where the accusation is true and the work must be fixed.
- Rates in the paper are worst-case, because its tasks hide the evidence.
  A real claim is often checkable, and then the right action is to check.
- Compaction is off, so a resumed session gets its claims from `--resume`, memory files, and subagent reports.
  The eval cases cover those channels.

Measures: the wrongful-revert rate, the false-confession rate, and the warranted-fix rate (spec `eval-suite`).

## D32 Usage awareness (removed by D35, facts kept)

Source: the 2.1.295 bundle strings (`external/cc-2.1.295/strings.txt`), read 2026-10-09.

- A usage limit is a 429 that ends the turn with `You've hit your session limit · resets <time>`, or `weekly limit` for the 7-day window (**confirmed**).
  The client does not retry it for a subscription (**inferred**), so the model gets no last turn and the work stays where the last tool call left it.
- The usage warning goes to the user only, from the server header `anthropic-ratelimit-unified-*-surpassed-threshold` at 70% or more (**confirmed**).
  No hook input and no mod event carries `rate_limits`, and only the status line input has them (**confirmed**).
- With compaction off, the window is `W = CONTEXT_WINDOW - min(max output, 20K)`.
  The client warns at `W - 20K` (260K) and blocks before the request at `W - 3K` (277K) with `Prompt is too long` (**confirmed**).
- `StopFailure` fires instead of `Stop` when an API error ends the turn, with `error` and `last_assistant_message`, and Claude Code ignores its output (**confirmed**).

The first 0.28.0 work had two layers: one-time notes at each level, and a hook record of a hard stop.
Both layers keep state.
The usage notes read the state file of the status line (`lib/usage-state.mjs`), because only the status line input has `rate_limits`.
The one-time rule used a marker file for each session.
The handoff carry across `/clear` and the stop records used files in `${CLAUDE_PLUGIN_DATA}`.
Rule D35 removes all of them, with the usage notes for the 5-hour and 7-day windows.

What remains is the stateless context note of D27:
a `UserPromptSubmit` hook reads the usage of the last request in the transcript and gives `additionalContext` at a prompt at or above a level.
It keeps no marker, so it repeats at each such prompt.
At or above `CONTEXT_NOTICE_AT` (60%) it gives the figure, the tokens left before the client block, and the rule to continue in small slices.
At or above `CONTEXT_HANDOFF_AT` (80%) it also gives the handoff steps:
finish the edit, leave no file half-edited, tick each task whose check passed, put the decisions of the chat in the design, and name `/clear` and the resume command.
The checkboxes of `tasks.md` and the commits hold the state, and no `Status <date>:` note exists (D35).
The user, Claude, and Jev chose the 60% and 80% levels on 2026-10-09 (Jev confidence 0.35, a weak signal).
80% is 240K, which leaves room for a 20K handoff below the 260K warning.
A `PostToolUse` route does not exist, because without a marker it would fire at each tool call.
So one long turn can pass a level with no prompt, and the Risks list records that.

Rejected: a figure at each turn below the first level (a token cost at each turn), the handoff text in the output style (a cost in each request), and a separate `handoff.md`.
Dropped: the router step-down under usage pressure (task 20.3), because the router is gone.

## D33 Three-column status line (request of the user 2026-10-09)

The user asked for a status line of 3 columns with the model, the context, the OpenSpec change and its tasks, the 5-hour and 7-day windows, the Fable 5.1 weekly window, and what fills the context, like `/context` and `/usage`.
The user chose Unicode glyphs over pure ASCII.
Rule D35 limits the line to the status input, the usage cache, and the `/context` table, and it keeps no state.

| Column | Row 1 | Row 2 | Row 3 |
| --- | --- | --- | --- |
| Left | `◆` model, effort, `∴` | `▤` OpenSpec change, else `▣` folder | `✓` done/total, `⎇` branch |
| Middle | `◧` context meter | `⊛` system and tools, `☰` memory | `✦` skills and agents, `❝` messages, `◇` free |
| Right | `5h` window | `7d` window | `✧` Fable window |

Facts from the 2.1.295 bundle (investigator, 2026-10-09, spot-checked):

- The status input has `context_window` totals only, and `rate_limits` has only `five_hour`, `seven_day`, and `spend_limit` (**confirmed**).
- `/context` counts each category with the count-tokens API, and estimates locally when the count fails (**confirmed**).
  A script cannot rebuild the system prompt and the tool definitions (**inferred**).
- `/usage` caches `GET /api/oauth/usage` in `cachedUsageUtilization` with `fetchedAtMs`, and the client rejects a copy older than 1 hour (**confirmed**).
  A `limits` row with `kind` `weekly_scoped` and `scope.model.display_name` is a model pool, and the cache of the user has one for `Fable` (**confirmed**).
- `/context` writes its Markdown table into the transcript as a `user` record (**confirmed** 2026-10-09).

The breakdown cells of the middle column come only from the newest `/context` table in a bounded tail of the transcript, read at each call.
When the table is not in the tail, only the meter and the free tokens show.
The estimate from the first `usage` and the start attachments is removed, because it needed a state file (D35).
The Fable cell and the reset credits come from the usage cache with one accepted shape (D35 item 3).
The 3 columns need about 130 columns, so a narrower terminal keeps the row packing of 0.28.0.
