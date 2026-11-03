# Proposal

## Why

Release `0.2.0` has eight defects, each reported by the user on 2026-10-31.

- The status line shows no branch in a plain checkout. `branchText` in `plugins/claudetto/src/statusline/segments.ts` reads only `worktree.branch`, which Claude Code sends for a worktree session alone. The line also shows nothing about an open OpenSpec change. `/statusline` reports nothing to write, because the settings already hold claudetto's command. The defect is in the renderer, not in setup.
- `/loop` does not exist. Typing it gives "No commands match", because `disableBundledSkills: true` removes the bundled skill and `ScheduleWakeup` is denied. `docs/surfaces.md:128-133` still tells a user how to get `/loop` back, and `docs/keep/skills/loop.txt` describes it.
- A SwifterKit session on `0.2.0` told the user to turn off SIP (System Integrity Protection) to run a probe dext, although no step needed it. The same session guessed the meaning of the user's acronym `FAFA`. After the user defined it, the closing "Assumptions I made" list still gave the old guess, and the reply said "I've redefined FAFA", crediting the user's definition to itself. No rule in `plugins/claudetto/agents/main.md` covers any of the three. The session also had no method for getting unstuck: `<asking>` and `<scope>` send an unclear route or a block to the user as a question, instead of an experiment or a lookup.
- Handoff files have no single layout. `.claude/claudetto/handoffs/` holds ten files with four file-name forms (`handoff-2026-10-31T08-18-35.md`, `handoff-20261028T160024Z.md`, `handoff-20261030T-9-2.md`, `0-1-1-status-line.md`) and three heading sets: the nine sections, an older ten-section set, and the code-built `Recent Turns` and `Files Touched`. The `context_management` text names the nine headings but not the title, the file name, or the heading level.
- `agents/main.md` holds task-specific rules that do not belong in a session prompt: "Run a paid model call or eval only on approval" (line 65, added on 2026-10-27 in `66d6f8b7` and reworded in `747f48b2`, both by Claude sessions in this repository), "a UI change needs a browser run", the `<=300`-line file limit, the `just` tool name, and this repository's "names no task or plan" comment rule. The paid-run line made the session ask for approval before cheap runs that the user never gated.
- The four subagent bodies in `plugins/claudetto/agents/` are flat lists of lines with no sections. `main.md` uses XML sections.
- The `agent` setting makes the root prompt an agent type, `claudetto:main`, and one session spawned it 28 times as a subagent, each running a prompt written for the main thread (`ISSUES.md`).
- An empty session reads 12k tokens. `/context all`, run on 2026-10-31 in this repository with Claude Code `2.1.316`, gives: system prompt 4.6k, system tools 5.8k, skills 786, memory files 550, custom agents 289, MCP instructions 36, messages 10. The reading does not show how much of each row claudetto owns. A free capture (`just capture --shipped --interactive`, fake Messages API) gives 42,752 characters for the first request without the plugin and 43,356 with it. Most of the gap is the engine's sandbox block, 8,207 against 11,470 characters, which grows with claudetto's sandbox settings.
- The cheap compaction summary gives up on long sessions. The user saw "Cheap summary reached its cap of 4048 output tokens, thinking included, so it is cut and the engine compacts". The Haiku call runs at effort `high` within 2,000 tokens plus 2,048 of thinking room (`blocks/compaction/summary.ts`, `shared/thinking.ts`), while the summary itself is about 1,000 tokens. How the thinking and the text split the cap is unmeasured.
- The weekly limit of 3.20B tokens ran out in five days (2026-10-27 to 2026-11-02, `ISSUES.md`). Cache reads are 96.8% of it: each call re-reads the whole context. Compaction ran 7 to 39 times per long session, and each one is a full-context call on the session's own model. Stop hook loops and classifier denials each cost a turn at full context. Paid probe rounds took 25.5% of the main-thread tokens, and one paid run cost 3.4 times its estimate.
- The agent breaks the conduct the prompts ask for, recorded in `ISSUES.md` on 2026-11-02. It reads remarks and rhetorical questions as tasks, adds work no task names, stops at "not verified" when a free check exists, hands the user work it can do, ends replies with offers, answers its own defect with an apology and a retrospective, writes narrating comments, and opens with agreement after the user names a fact. The prompts say "correction", which frames that event as social. A Stop-time judge of the opener was built and removed, so the rule has no check.
- The classifier and gate deny work the user approved: a reason that says the rule does not apply still ends in a denial, an authorized secret is not credited, a nested `claude` in `tmux` is called "Rewire the Agent", and the engine's classifier denies with no reason.
- The `tasks.md` loop of the `finish` block blocked ten stops after the user ended the session, repeating a block the agent had declined. The user never asked for the loop.
- The handoff block reads each handoff back after every `/clear`, a typed one too, so each handoff nests the one before.
- The garbage collector has one age for all kinds and no off switch, and its sweep picked the newest handoff by file time while resume picks it by name. The dev tools leave every `mkdtemp` root behind: about 3.2 GiB in 1,292 folders under `/tmp` on 2026-11-02.
- The interactive first request reads 39,711 characters against 42,129 without the plugin, and a free capture measures each lever, such as 3,917 for deferring `AskUserQuestion`.
- Snippets the user collected on context cost hold false claims, such as `.claudeignore` and a `CLAUDE.md` edit that breaks the cache. Nine lines of claudetto's prompts say what to avoid where a positive form keeps the same fact.

## What Changes

- The status line shows the branch of a plain checkout, read from `.git/HEAD`. It also shows the progress of each open OpenSpec change, read from `openspec/changes/*/tasks.md`. Both are file reads, bounded in size and count, with no child process and no network. **BREAKING** for the spec: "Stdin Only" becomes "Bounded Local Reads".
- `docs/surfaces.md` stops offering `/loop`, and `docs/keep/skills/loop.txt` is deleted. The `ScheduleWakeup` deny stays.
- `agents/main.md` is rewritten to `external/please-use-me-often/xml-prompting-guide.md`, from `drafts/main.md`: tags named for what they hold, prose sections, and rules that say what to do with their reasons. `<finding_out>` makes "fuck around and find out" (FAFO) the method: hypothesis, prediction, check, with project facts first, then primary sources. When truly stuck, as with `sudo`, the session gives the exact `! <command>` and finishes the rest. `<claims_and_evidence>` labels each statement by its support and makes a fact from the user that contradicts the last reply replace the earlier reading, credited to the user. `<harness_messages>` quotes the literal harness forms. `<actions_and_consent>` keeps every security control on and assumes neither consent nor refusal. `<security_work>` is decided by ownership and authorization. Every task-specific line is deleted, the paid-run approval line included, with nothing in its place. This repository's paid-run rule moves to `AGENTS.md` as a cost report after the run. The draft measures 5,985 characters under the user's cap of at most 6,000. Each rule gets an eval case in `tools/evals/main-rules.ts`.
- The root prompt moves from `agents/main.md` and the `agent` setting to a `prompt.compose` hook, which reaches the main loop only. `agents/main.md`, the `agent` setting, and the `agent-offer` block are removed, and setup removes the `agent` key it wrote.
- The code rules leave `main.md` for `drafts/code-rules.md`, which `claudetto:setup` offers to write to `~/.claude/rules/claudetto-code.md`. They add: guard only at a trust boundary, and name the edge cases handled.
- The subagent bodies and `output-styles/Concise.md` follow FAFO and the same guide: `Hephaestus` no longer ends its task on a failing check or a hook message, and "What I Need from You" hands over `! <command>` lines.
- One handoff layout. Code holds one template, with a fixed title, a fixed file name, and the nine `##` headings. The `context_management` text shows that template, and the code-built fallback fills the same nine headings.
- Each subagent body gets `<role>`, `<doing_the_work>`, `<harness_messages>`, `<when_blocked>`, and `<report_format>`, in prose. No rule is lost.
- The cheap summary's cap log gains the reply's text length. One real compaction measures the thinking's share, and the effort or the thinking room changes to a value the user names.
- The empty-session reading is attributed row by row to the engine, the repository, or claudetto. The parts claudetto owns are cut, and each cut is measured with `/context all` and `just capture`.
- A handover replaces most compactions. A main reply that starts with `# Handoff` compacts the conversation to the first message, an assistant line, and the handoff, with no summarizer request and no restored file. At a turn's end with the context at `handoverTokens` (default the smaller of 400,000 and half the window), one fork writes the handoff from cache, and the handover waits for the user. A declined fork is not asked again before the next compaction, and the turn after a handover does not fork again. Mid-turn overflow stays with the engine.
- A paid probe is counted on the fake Messages API first and reported after. A probe stops its own processes by recorded pid only.
- **BREAKING** The `finish` block and its `tasks.md` loop are removed. The built-in `/goal` keeps a session working to a condition.
- The handoff becomes a tool the agent calls at the end of its tasks. The plugin clears and submits the handoff once; a typed `/clear` gets no read-back.
- The `classify` block asks for the reason before the verdict. The classifier credits a named secret for a named use and a nested `claude` session, and the repeat-denial refusal names a denial that had no reason. The `classify` block's spend is counted in the window report.
- Hygiene keeps the handoff that resume reads and gets one retention key per kind in `userConfig`, with 0 for off, plus `hygieneEnabled`. It finds Claude Code's temp root instead of assuming it. The dev tools remove their own scratch, and a dev-only `just gc` backs them up. The request does not grow.
- The session prompt and the output style gain rules with eval cases: classify each message first, change only what the task names, run a free check before a claim, end on the result, report an own defect as a bug report, comment only for a reason, name the content event instead of "correction", and name the prose forms to avoid. The Stop-time opener judge stays removed.

## Capabilities

### New Capabilities

- `agent-conduct`: the guide-based structure of the session prompt, the FAFO method, and the behavior rules that come from observed failures: sources, evidence, a user's fact that contradicts the last reply, harness messages, defects, consent, security controls, security work, task-specific rules, the code rules file, message classification, task scope, free checks, reply endings, own-defect reports, comments, prompt wording, and prose forms.
- `subagent-prompts`: the structure of each subagent body.

### Modified Capabilities

- `status-line`: "Stdin Only" becomes "Bounded Local Reads". Two new requirements cover the branch of a plain checkout and the OpenSpec task progress.
- `session-handoff`: "Handoff Content" and "Claudetto Names the Nine Sections" now require one template, used by both writers. "Handoff before a Clear" and "Read Once" move to a handoff tool, and a typed `/clear` gets no read-back. Core's `context_management` section is removed.
- `permission-policy`: the classifier reads the user's words in every form the harness delivers them, `AskUserQuestion` answers and approvals of named tasks included. "Rewire the Agent" covers instruction surfaces only, and a nested `claude` session is not one. The gate reads a search pattern as text. The `classify` block reasons before its verdict, a named secret for a named use is credited, and a denial with no reason is named as such.
- `tier-profiles`: the snippet pins `default` and every family alias to the row's full model IDs, because this account's Default is Opus 5 and sessions from 2026-10-27 to 2026-10-30 ran on it. A response on a model off the row is shown to the user.
- `window-budget`: a Stop loop with no progress is ended, the weekly share slows the session, the window rows are recorded, the share rate matches the meter, and the `classify` block's spend is counted.
- `prompt-footprint`: adds an empty-session reading that is attributed by owner, with a measured fall, and a per-setting split of the sandbox block's claudetto share.
- `compaction-path`: "Default Path" hands over before it compacts, through a handoff reply or a fork at idle, with no repeat fork and no loop. "Paid Runs Need Approval" is removed for "A Paid Run Is Counted Free First", and a probe stops only its own processes.
- `finish-loop`: "`tasks.md` Loop" and "Bounded Loop" are removed with the `finish` block.
- `session-hygiene`: "Stale Claudetto Files Go" keeps the handoff that resume reads. New requirements cover the retention per kind, the temp root, guarded roots, and no growth of the request.

## Impact

- `plugins/claudetto/src/statusline/` (`segments.ts`, `rows.ts`, `main.ts`, and a new reader module) and their tests.
- `plugins/claudetto/src/blocks/handoff/handoff.ts`, `block.ts`, `read-back.ts`, and their tests and labs.
- `plugins/claudetto/src/blocks/compaction/handover.ts`, `block.ts`, and `tests/compaction/handover.test.ts`; the `handoverTokens` option in `plugin.json`.
- `plugins/claudetto/src/blocks/finish/`, `src/blocks/classify/prompt.ts`, `src/automode/rules.ts`, and the repeat-denial guard.
- `plugins/claudetto/agents/*.md`, `plugins/claudetto/output-styles/Concise.md`, `tools/evals/main-rules.ts`, `tools/evals/conduct/`, `tools/limits.ts`, and the `claudetto:setup` skill.
- `plugins/claudetto/src/blocks/compaction/summary.ts` and its tests.
- `AGENTS.md`, for the paid-run rule, the pid-only kill rule, the user's models, and the prompt guides, and claudetto's sandbox settings in `plugins/claudetto/src/sandbox/sandbox.ts`.
- `claudekit/api/fake.ts`, `claudekit/session/argv.ts`, `claudekit/summary-cost/pty.py`, and `claudekit/compaction-cost/bill/replay.ts`.
- `docs/surfaces.md`, `docs/prompt/footprint.md`, `docs/types.md`, `docs/keep/skills/loop.txt`, `README.md`, `CHANGELOG.md`, and `ISSUES.md`.
- `plugins/claudetto/src/hygiene/`, `src/blocks/hygiene/block.ts`, `src/blocks/confine/`, `bin/claudetto-confine`, the hygiene keys in `plugin.json`, the `mkdtemp` users in `claudekit/` and `tools/`, a new `claudekit/gc/`, and `just gc`.
- No new dependency.
