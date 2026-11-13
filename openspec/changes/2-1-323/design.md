# Design: Lean Rebuild on Claude Code 2.1.323

## Context

claudetto 2.1.322 answers each fault with a mod, a gate, or a text:

- about 30 mods;
- a 5,779-char `ROOT_PROMPT`;
- 21 rewritten tool texts;
- a Bash gate of about 3,400 hand-written lines and 5,646 generated ones;
- a two-model Stop grader;
- a per-prompt constraint ledger.

The session audits (`research/sessions.md`, `research/issues-2026-11-09.md`) show what this costs:

- denials in the hundreds, most of them in subagents;
- Stop loops that ask the agent to commit files it did not write;
- `HooksError` path spam;
- "What I Need From You" sections that repeat one bullet up to 46 times;
- compaction every 140–150k tokens.

Claude Code 2.1.323 now does much of this itself (`research/cc-2-1-323.md`, `research/surface-trim.md`). The probes in `research/probes.md` settled what the mod API can do on the installed build:

- A `prompt.compose` mod sees `e.model` and can replace the whole default body per model. It cannot touch the billing line, the identity line, or the system-role message in `messages[]`. Sections carry the scope `shared` or `session`, and every `shared` section must come before every `session` one. On a lean model the one `shared` section is `lean_body`.
- `prompt.compose` does not reach a built-in subagent, which runs its own 2,683-byte prompt.
- A plugin agent's body replaces the default subagent text. The engine still appends about 1,294 bytes of notes.
- `tool.list` removes tools for the main thread and for subagents. `next(e)` resolves to `{ value: ToolInfo[] }`.
- `agent.spawn` can rewrite the subagent's `model` and `prompt`.
- No classic hook input carries `model`.
- `engines["claude-code"]` refuses an install from git or a remote source. A local-folder or `--plugin-dir` plugin only gets a note.
- The default `system[2]` is 5,893 bytes for Opus, 5,630 for Sonnet, and 8,471 for Haiku. The tool schemas in each request total about 28.6 KB.

## Goals

- Cut every part of claudetto that a 2.1.323 built-in does, and move each remaining job to its cheapest surface.
- Give each model its own system prompt, written to that model's official guidance.
- Redesign the subagents around agent frontmatter, so that each body is the agent's whole prompt.
- Rewrite the model-facing texts from the originals: keep, rewrite, or drop each line, with the reason recorded in `research/text-audit.md`.
- Fix the named defects at their causes: path spam, the uncoloured status line, the Bun-only rules, files acting as folders, the Stop loops, and the What I Need form.

## Non-Goals

- Support for Claude Code below 2.1.323. Users update Claude Code first.
- Compatibility shims for removed options, mods, or settings. A removed path is deleted together with its tests and docs.
- Patching the Claude Code CLI binary or its npm package.
- Rewriting the kept plugins `claudetto-openspec` and `claudetto-you-should-know` beyond the folder moves and the version floor.

## Decisions

### 1. The Version Floor Comes From `engines`

Each `plugin.json` sets `engines["claude-code"]: ">=2.1.323"`. The runtime warning (`version-floor` "Warn Once at Start") and every other runtime version check go.

Reason: Claude Code enforces the floor for marketplace installs (probe 3). A local-folder install only gets a note, which is what a developer checkout wants.

### 2. The Order of Surfaces

A job goes to the first surface that can do it:

1. a settings key;
2. a classic hook;
3. a skill;
4. an output style;
5. a rule file;
6. a mod.

Reason: a setting or a classic hook costs no mod code, keeps working under `--safe-mode`, and is checked by Claude Code itself. Community tests (`research/reddit-1.md`) find that rule packs and skills rarely beat a placebo, so a text ships only where a check shows it helps.

### 3. One System Prompt per Model

A `prompt.compose` mod reads `e.model` and changes the shared `lean_body` section for `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`. It starts from the default body and keeps the `session` sections (memory, environment, context management), because they carry live session facts.

| Model | Change to the default body (from `research/model-guidance.md` and `research/text-audit.md` §9) |
|---|---|
| Opus 5.5 | Shared core. No double-check or verification lines. Delegation rewritten as when to delegate, with the reason. |
| Sonnet 5.5 | Shared core, plus the finish paragraph and the scope-stop paragraph. |
| Haiku 5.5 | Shortest core, because Haiku degrades on a long prompt. The default Haiku-only paragraphs are trimmed to what the core lacks. No delegation lines. |

Any other model gets the default body unchanged.

The shared core is under about 3,500 chars and is rewritten from `ROOT_PROMPT`. `ROOT_PROMPT` and its `scope: "shared"` text go.

Reason: probe 1 showed a per-model swap with no default text left over. Anthropic's per-model pages advise against several lines claudetto sends to every model.

### 4. Subagents Are Agent Files

Each of `search`, `plan`, `sweep`, and `work` sets `model`, `effort`, `tools`, and `maxTurns`. Its body is its whole prompt, written to its model's guidance.

| Agent | Model | Effort | Tools |
|---|---|---|---|
| `search` | `claude-haiku-5-5` | low | Read, Grep, Glob |
| `plan` | `claude-fable-5-2` | medium | Read, Grep, Glob |
| `sweep` | `claude-fable-5-2` | high | Read, Grep, Glob |
| `work` | `claude-opus-5-5` | medium | all |

- The `plan` and `sweep` bodies are written to Fable guidance: a literal reader, a report for a low-context reader, and no absolute "never". They leave out the ownership line, which adds 70–80% output tokens and unrequested changes (`research/text-audit.md` §9.5).
- Built-in agents are turned off through `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` and `permissions.deny Agent(<name>)`. Spawn caps come from `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, and `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`.
- The `delegation.ts` deny goes. It refused every non-`claudetto:` or foreground `Agent` call.
- The memory hold stays as a mod. Its spawn denial gains a retry hint.

Reason: probe 5 showed that the body replaces the default subagent text. Probe 1 showed that `prompt.compose` does not reach subagents, so their prompts have to live in the agent files. The community consensus and the Discord data favour Fable for planning and review. The choice of models is a hypothesis until a paid A/B run, which waits for approval.

### 5. The Bash Gate Becomes Settings

`tool.check/useBashRules/` goes. Setup writes the replacements:

- `permissions.ask` for branch moves, `git worktree remove`, and branch deletes;
- `permissions.deny` for `pkill` and `killall`;
- `permissions.allow` for read-only commands;
- `sandbox.filesystem.denyRead` and `denyWrite` for walls;
- `autoMode` lists.

`switch.ts` survives as a classic `PreToolUse` command hook, with its protected list taken again from 2.1.323. The vendored shellfirm rules, their fixtures, and the licence go. The read and write advice stays in the Bash tool text and is not enforced by a denial.

Reason: the sandbox, `permissions`, and `autoMode` are Claude Code's own gates. The claudetto gate caused most denials in the audits and all of the path spam. Before the delete, a replay of the fixtures against the new settings measures the gap (task 2.1).

### 6. The Stop Hooks Shrink

`useSliceCommits` goes, along with the Stop blocks for cleanup and background tasks, the grader, the named-files check, and the stall stop. In their place:

- `open-items.ts` becomes a classic Stop command hook. It reads `last_assistant_message`, checks only the What I Need form, and never blocks twice with the same text.
- The fault list from `texts-grade.ts` becomes one prompt-type Stop hook.
- The commit rule stays as a line in the prompt.

Reason: the slice check hashed every path in `git status`, including agent worktrees, and blocked up to 44 times in a row. `/goal` covers continuation. A prompt-type Stop hook makes one model call where the grader made two. The loss of the two-model vote is measured in a paid replay, which waits for approval.

### 7. The Constraint Ledger Goes

`useConstraintPin` and `useAskFix` go. `PIN_COMPACT_KEEP` becomes a classic `PreCompact` hook text.

Reason: the ledger made a model call on every prompt and denied tool calls on a model's reading of old messages.

### 8. Compaction Keeps Its Default Window

Setup stops writing `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` and `autoCompactWindow: 300000`.

Reason: together they compacted every 140–150k tokens (`research/sessions.md`).

### 9. An Absent Path Is an Answer

Each `$.fs.stat` and `$.fs.exists` call that survives treats ENOENT as "absent" and logs nothing:

- `useSetup/rules.ts:93`;
- `surface.ts` `namesIn`;
- `claudetto-openspec/hooks/fs.ts`;
- the `hygiene/` roots and sweep.

Only operands that a command takes as paths are resolved. `gate.mock.ts` goes with the gate. Mocks that remain report absent paths as absent.

### 10. The Status Line Paints Before the Theme Is Known

`statusline/main.ts` paints the `dark` palette until the line file names a theme, unless `NO_COLOR` is set. `statusline/subagents.ts` and `subagentStatusLine` go, because 2.1.323 made the key a no-op.

### 11. The Package Manager Is Detected

A classic `SessionStart` hook names the project's package manager once. It reads the `packageManager` field first, then the lock files, and works for any manager. The Bun line in the prompt, `BUN_FACT`, `bunRuleEnabled`, and the npm deny table go.

Reason: the Bun rules were hard-coded for one manager and enforced through denials.

### 12. The Naming Rule

Setup offers a `useHeadlineseNames.md` rule, named like the other shipped rules:

- Identifiers are headlinese: no articles, as in `testDeadPlayerTakesNothing`.
- Comments keep their articles (the user's answer in this session).
- Titles use Title Case where the platform convention asks for it: Markdown headings in docs, and Apple HIG labels in Apple UI code.

The dossier holds no source for this rule (`research/user-dossier.md` R-N1, R-N2). The user's statement in this session is the source.

### 13. Files Acting as Folders

A cluster of three or more files that share a prefix becomes a folder after the trim:

- `claudetto-openspec/hooks/spec*` becomes `spec/`;
- `validate*` becomes `validate/`;
- `useSetup/ignore*` merges into one `ignore.ts`;
- `hooks/texts*` becomes `texts/`, if three files remain.

Load paths in `register.ts`, `bunfig.toml`, and `project.just` follow the moves.

### 14. The Texts Are Rewritten From the Originals

Each line of `ROOT_PROMPT`, `Concise.md`, the tool texts, the gate texts that survive, and the agent bodies is kept, rewritten, or dropped, as `research/text-audit.md` records. Answers settled in this session:

- A disputed claim is checked, and then the corrected fact is stated, or the reply is kept with the check shown.
- The agent looks for a credential in the repo's `.env` files, then in the environment.
- The agent does not announce its first tool call.
- `Concise.md` loses the `sudo` example. The What I Need bullet form becomes `- ! <command>` in every text.
- `<consent>` drops "a sent message" from its list of acts that others see, because that makes Fable hold routine requests.

### 15. What Stays as a Mod

These stay as mods:

- the decider and the `decide` tool;
- `price-step`;
- `/reply`;
- the memory hold;
- the slim surface (tool deferral and command hiding; no setting hides a slash command);
- the line file;
- the Budget line;
- `sandbox-git.ts`, retested on 2.1.323;
- the `claudetto-openspec` tool;
- `claudetto-you-should-know`.

`/advisor` and the setup starter files wait on probes: the built-in `/advisor` gate, and `/init` compared with `starter-families.ts`.

## Risks and Trade-Offs

- **Local installs skip the floor.** A local-folder or `--plugin-dir` install below 2.1.323 still loads, with a note. This is accepted, because only developers load claudetto that way.
- **The settings may not cover the gate.** `permissions` and `autoMode` may let through what the vendored rules denied. The fixture replay (task 2.1) measures the gap before the delete.
- **The grader replacement may miss more.** One prompt-type Stop hook may catch fewer faults than the two-model vote (`grade.ts` records that Haiku alone missed 4 of 12). Measuring it is a paid replay that waits for approval.
- **The model choices are unmeasured.** Per-model prompts and the Fable agents rest on vendor guidance and community reports. An A/B run is paid and waits for approval.
- **A model switch rewrites the prompt.** Switching model mid-session swaps the body, so the prompt cache is rebuilt. Changing the model already invalidates the cache (`research/reddit-1.md`, Harness).
- **A subagent type may still run the default prompt.** `prompt.compose` was not probed on a subagent that uses the lean prompt path, so such a type may keep the default body.
- **Users lose options.** Removed `userConfig` options stop applying, and setup rewrites settings. The release notes list each removal.
