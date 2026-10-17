# Design: the surfaces of Claude Code 2.1.302

This file continues [`design.md`](design.md) with the decisions that come from the inventory of 2.1.302.

## Inventory

The source is `external/cc-diff-301-302/data/inv-2.1.302.json`, which `external/cc-diff-301-302/tools/inv.py` reads from the bundle.
The count of names that the tracked files of `src/` use came from `$TMPDIR/surf/cov.py` on 2026-10-17:

| Surface | In 2.1.302 | claudetto uses |
| --- | --- | --- |
| Settings keys | 184 | 47 |
| Env vars on the docs page (`external/cc-2.1.302/docs/env.md`) | 422 | 37 |
| Hook events | 33 | 10 |
| Mod engine events | 47 | 22 |
| Mod op events | 64 | 33 |
| Mod namespaces | 21 | 20 |
| Status line keys | 42 | 32 |
| CLI flags | 66 | 16 |

Most unused names are for enterprise, providers, and the terminal.
The unused names that change cost, context, or quality are in D18.
Tasks 7.6 and 7.7 write one row for each name, so that no name is missed.

## Decisions

### D18. The snippet keeps a default when the default fits each account

- `promptCacheTtl` goes out of the snippet.
  The schema says: "Unset = automatic: 1 hour on a Claude subscription within its usage limits, 5 minutes on an API key".
  The snippet set `5m` for each account with no recorded reason (from `3dbe21d1`), so a subscription lost its free 1-hour cache, and a session of 2026-10-17 wrote 28.4k tokens again after a break.
  Jev picked `unset` at confidence 0.89.
- `subagentPromptCacheTtl` stays unset until a measure (task 7.9).
  A 1-hour write costs 2 times the base input and a 5-minute write 1.25 times, so `1h` pays only when enough helper writes follow a gap over 5 minutes.
  Jev picked `measure-first` at confidence 0.67.
- `cc-plugin-you-should-know@builtin` stays off in `enabledPlugins` (`slices/prompt/slice.ts:119`), because D31 turns off its feature flags and D1 rewrites `claudetto-you-should-know` in its place.
- `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` stays unset.
  The docs say that the 5.x models get the shorter prompt by default.
- `idleCompaction`, `skillListingBudgetFraction`, `skillListingMaxDescChars`, `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`, `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` (default 10), and `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` keep their defaults, and their rows in task 7.7 give the reason.
  The skill listing of a fresh session is 1.1k tokens, under the default budget of 1% of the window.
  A cap of 10 helpers fits the default tool concurrency of 10.

### D19. Setup asks for the plan when Claude Code does not give it

`claude auth status --json` gives `subscriptionType: "max"` and no tier.
Claude Code sets `CLAUDE_CODE_RATE_LIMIT_TIER` only from the auth snapshot of a background session (`external/cc-2.1.302/strings.txt`, "Consumed bg auth snapshot"), so it is unset in a normal shell.
No documented surface gives the tier: the mod API and the status line have the rate limit percentages only.
So `accountOf` (`slices/setup/domain/tiers.ts:43`) gave `pro` for the Max 20x account of the user, and setup wrote `effortLevel: high` and a cap of 2.
Setup now uses `CLAUDE_CODE_RATE_LIMIT_TIER` when it is set, and else asks Max 5x or Max 20x when the account is `max`.
Jev picked `env-then-ask` at confidence 0.36, close to `ask-once` at 0.47, and both give the same result where the env var is unset.

- Alternative: Max 5x picks for each `max` account with no tier.
  Rejected, because a Max 20x account still gets the wrong cap.
- Alternative: infer the tier from the window percentage and the session cost.
  Rejected, because it needs a session first, and the windows change.

### D20. Main model and effort by plan

| Account | Model | `effortLevel` |
| --- | --- | --- |
| Pro | Opus 5.5 | `medium` |
| Max 5x | Opus 5.5 | `high` |
| Max 20x | Opus 5.5 | `high` |
| API key | Opus 5.5 | `high` |

The user put quality before speed (2026-10-17), and chose `high` on Max to slow the weekly use.
For Pro, the evidence does not support Sonnet:

- Anthropic: Opus 5.5 defaults to `medium`, and Sonnet 5.5 starts at `medium` for well-specified agentic coding and at `high` for harder work (`platform.claude.com/docs/en/build-with-claude/effort`).
- Third-party indices: Opus `low` costs about the same as Sonnet `high` and scores the same or a little lower, and Opus `medium` scores higher for 20% to 50% more per task.
  One coding table gives Opus `medium` 57.6% at $2.94 and Sonnet `high` 43.0% at $1.94 (`digitalapplied.com`, `aivy.com.au`, `lindy.ai`).
- The dossiers: "Opus medium is faster, better, and overall cheaper than Sonnet High" (`external/2026-09-29_p2/`), and "Sonnet high is only slightly better than Opus low, but it cost 30% more" (`external/2026-09-29/`).
  Some users disagree for coding back and forth, so the sweep of task 11.4 checks it.

A second opinion (Jev) picked `keep` (Opus with `high` on Pro and `xhigh` on Max) at confidence 0.33.
The user chose `high` on Max, and `medium` on Pro is the default of Opus 5.5.

### D21. The helpers keep D3 until an effort sweep

Jev picked Sonnet `high` for the implementer at confidence 0.33, close to Opus `medium` at 0.42.
Anthropic asks for an effort sweep on own evals in place of settings from an earlier model.
So D3 stays, and task 11.4 runs the implementer cases on Sonnet `high`, Opus `low`, and Opus `medium`, and changes D3 only when an arm wins on passes at a cost that the weekly limit can carry.

### D22. The turn gate judge sees the end of each command

The judge reads one line for each call, and `targetOf` (`slices/turngate/domain/calls.ts:37`) gives only the first line of a command, cut to 160 characters.
So a check at the end of a heredoc or an `&&` chain is not in the summary, and the gate blocked two correct claims on 2026-10-17.
The target becomes the first line and the last line of the command, each cut to 80 characters, joined by ` … `.
An exit of `ok` for a chain that ends in the check shows that the check passed.
Jev picked `head-tail` at confidence 0.20, over the last line of the output at 0.15 and both at 0.38.
The head-tail is the smallest change that fixes both failures, and the output can be added later if a session shows a need.

### D23. The handoff goes to the project root

`HANDOFF_DIR` is the relative path `.claudetto/handoffs` (`src/kernel/paths.ts:31`), so the write follows the folder of the shell.
On 2026-10-17 a session in `minispec/changes/release-0-2-0/` wrote its handoff into that change folder, where the Markdown lint sees it.
The `.git/info/exclude` of this checkout ignores it, but a fresh clone has no such line.
The handoff path now resolves against `CLAUDE_PROJECT_DIR`.
Jev picked `project-root` at confidence 0.74.

- Alternative: the git root of the current folder.
  Rejected, because a resume from the project root may not find the file, and a folder outside git has no root.

### D51. Setup writes no block in the global `CLAUDE.md`

- Facts: the block of `/claudetto:setup` has five parts, `claude-md-base.md`, `claude-md-codegraph.md`, `claude-md-docs.md`, `claude-md-browser.md` and `claude-md-note.md` in `slices/setup/prompts/`, with `222` words in total, and it loads on each turn of each project.
- The Claude Code 101 lesson of the Anthropic Academy says the global file "applies across all your projects", and is the place for "your personal preferences".
  It says to start with no file, so that it stays "compact and focused on only the necessary information".
- Each part already has a surface that loads only when it applies:
  - Code graph: `codegraph install` (codegraph `1.6.0`) writes the MCP server entry, the permissions, and its own short block between `<!-- CODEGRAPH_START -->` and `<!-- CODEGRAPH_END -->` in `~/.claude/CLAUDE.md`.
    The MCP server instructions reach the main agent, and the block reaches the subagents, which do not get the MCP instructions.
    Its source says that subagents used codegraph in "~1 of 9 runs" with no block, and "consistently with it" (`dist/installer/instructions-template.d.ts`, vendor measure).
    The block is conditional ("in repositories indexed by…"), so a project with no index gets no false claim.
  - Library docs and browser: the descriptions of the `docs` and `browse` skills.
  - Working rules: the system prompt of D17.
- Decision: setup writes no global block.
  It moves each rule to the surface above, and on its next run, it removes the block between its own markers, after the user's yes (D10).
  Text outside the markers stays.
- Setup runs `codegraph install --target claude --location global` after the user's yes, in place of its own code graph text.
  Its rule "Do not run `codegraph install`" (`slices/setup/skills/setup/SKILL.md:61`) goes, and so does the contradiction between `claude-md-codegraph.md` ("run `codegraph init -y` first") and the `codegraph` skill ("Do not run `codegraph init` yourself").
- Each part of `claudetto-codegraph` that `codegraph install` already gives (the skill text, the `SessionStart` line) is measured against the install alone, and removed when it adds nothing.
- A rule that a subagent needs goes into the prompt of that agent, because a subagent gets the instructions file but not the `SessionStart` context or the MCP instructions.
- The `andrej-karpathy-skills` repository (MIT) is a model for the rewrite of D17, not text to copy.
  It holds four principles in `358` words, each with a short test, such as "Every changed line should trace directly to the user's request".
  This supports goals with a test in place of long rule lists, which agrees with the user's note that narrow coding instructions can give worse results.

### D52. Title Case for Markdown headings, by a check

- Each Markdown heading uses Title Case.
  Articles, coordinating conjunctions, and prepositions of any length stay in lower case, but not as the first or the last word, and inline code does not change (Chicago style).
  So the label of D36 is "What I Need from You".
  APA style capitalizes each word of four letters or more, and claudetto does not follow it.
- A hook after a `Write` or `Edit` of a `.md` file reads its headings, and only on a fault returns the headings in the right form to the model.
  It costs no tokens when the headings are right.
- This repository adds a custom rule to `.markdownlint-cli2.jsonc`, and one pass fixes each heading that is wrong now.
  The list of minor words is in one file, which the hook and the rule share by a copy that a test pins.
- Not in the system prompt or the output style, because both load on each turn, and a rule with no check is followed less reliably.
  The output style also shapes replies, not files.
- Jev: `hook-plus-lint (confidence 1.00)`, against a line in the system prompt and against a line in the output style.

### D56. A reply button on each message of Claude

- The user asked for a Discord-style reply: pick a message of Claude, and answer it with that message quoted.
- The mods API of 2.1.302 has what this needs, with no change to Claude Code:
  - `AssistantMessage` is a render site with the message id and its text, in the terminal, the Desktop app, and the VS Code extension (`plugins_mods_reference.md:235`).
  - A `ui.render` hook keeps the drawing of Claude Code when it puts the result of `await next(e)` among its own children (`plugins/mods/interface.md`, read on 2026-10-17).
  - A `Button` and the `ui.press` event take the press, and `$.prompt` has `fill` (`plugins_mods_reference.md:208`).
- Decision: a small mod adds a `Reply` button under each message of Claude.
  A press fills the prompt with the first lines of that message as a `>` quote and puts the cursor after it, so the user types the answer.
- Not verified: what `$.prompt.fill` does with text that the user has already typed, and whether a terminal user can reach the button with no mouse.
  Task 2.4 reads both from the docs and the bundle first, and adds a `/reply` command with a `Select` of the last messages when the button cannot be reached by keys.
