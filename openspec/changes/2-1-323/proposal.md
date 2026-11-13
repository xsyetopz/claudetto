# 2-1-323: Lean Rebuild on Claude Code 2.1.323

## Why

claudetto grew a gate, a text, or a mod for each fault it met. By 2.1.322 it shipped about 30 mods, a 6.3k-char root prompt, 21 rewritten tool descriptions, and a Bash gate of about 2,600 lines. The session audits in `research/sessions.md` show what that costs users:

- 663 plugin denials in one project, 569 of them in subagents. The no-work gate stopped 5 delegated agents in one turn, and they committed nothing.
- 191 and 102 "What I Need From You" sections. One `! git config` bullet was repeated 46 times. The bullets handed users commands the agent could run, `sudo` with no TTY, and slash commands.
- Stop blocks that asked to commit agent-worktree files, 44 times in a row in one session.
- `HooksError … was not resolved` spam from `$.fs.stat` on Bash operands that are not paths (1,818 lines in one session).
- A status line with no colour until the first measured turn, and Bun rules baked into every repo.
- Compaction about every 140–150k tokens, because setup halves the window.

Claude Code 2.1.323 now does much of this work itself:

- the sandbox, permission rules, and auto mode;
- `/goal`;
- agent frontmatter (`model`, `effort`, `tools`, `maxTurns`, `isolation`);
- spawn limits;
- the `tool.list` mod event;
- per-request `prompt.compose` with the request's `model`;
- `engines["claude-code"]` (`research/cc-2-1-323.md`).

Anthropic's per-model prompting pages advise a different system prompt per model, and against several lines claudetto sends (`research/model-guidance.md`). Community tests find that most rule packs and skills do no better than a same-length placebo (`research/reddit-1.md`).

## What Changes

- **BREAKING**: every plugin requires Claude Code 2.1.323 through `engines["claude-code"]: ">=2.1.323"`. An older Claude Code does not load claudetto, and users update Claude Code first. Runtime version checks go.
- **BREAKING**: claudetto drops each mod, gate, and setting that a 2.1.323 built-in does, and moves each remaining job to the cheapest surface that can do it. In order: a setting, a classic hook, a skill, an output style, a rule file, and a mod only where nothing else can do the job. The full list is in `research/surface-trim.md`.
- **BREAKING**: one system prompt per model. A `prompt.compose` mod starts from the default lean body and applies a per-model text for `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`, each written to that model's official guidance. The shared `ROOT_PROMPT` goes.
- **BREAKING**: subagents are redesigned. Each agent file sets `model`, `effort`, `tools`, and `maxTurns`, and its body is its whole prompt. Fable 5.2 takes the planner and reviewer roles. Built-in agents are turned off through settings rather than a mod.
- Model-facing texts are rewritten from the originals: each line is kept, rewritten as a positive instruction with its reason, or dropped (`research/text-audit.md`).
- "What I Need From You" carries only a command the agent cannot run, and never `sudo`, a slash command, a token prompt, or a repeat.
- Stop checks cover only the session's own files, skip agent worktrees and the heartbeat file, and do not repeat an identical block.
- Hooks log nothing for an absent path, and treat only path operands as paths.
- The status line paints the default palette until the theme is known.
- Package-manager facts come from detection, for any manager. The Bun-only prompt line and the npm deny table go.
- A naming rule ships: headlinese identifiers, and Title Case where the platform convention asks for it.
- Each cluster of three or more files sharing a prefix becomes a folder.
- `subagentStatusLine` goes from `plugins/claudetto/settings.json`.

## Capabilities

### New Capabilities

- `model-prompts`: one system prompt per model through `prompt.compose`, starting from the default lean body.
- `naming-rule`: headlinese identifiers and platform-convention Title Case.

### Modified Capabilities

- `surface-trim`: drop what 2.1.323 does, and choose the cheapest surface for the rest.
- `subagent-prompts`: agent files with model, effort, tools, and turn limits; Fable for planning and review.
- `permission-policy`: no log for an absent path; only path operands are resolved; worktree and `/tmp` refusals narrowed.
- `agent-conduct`: the "What I Need From You" form, and no "Not checked" or "Slips" sections.
- `run-limits`: Stop checks scoped to own files, no identical repeat blocks.
- `status-line`: default palette before the theme is known.
- `setup`: package-manager detection, the naming rule file, no `subagentStatusLine`, compaction window left at its default.
- `version-floor`: `engines["claude-code"]` replaces runtime checks.
- `mod-architecture`: folder per file cluster.

## Impact

- Code: `plugins/claudetto/hooks/**`, `plugins/claudetto/agents/*`, `output-styles/Concise.md`, `rules/*`, `settings.json`, `.claude-plugin/plugin.json` for all three plugins, `statusline/*`, and `command.run/useSetup/*`.
- Users: Claude Code below 2.1.323 no longer loads claudetto. Setup rewrites settings, and removed `userConfig` options stop applying.
- Tests: tests for removed mods go with the mods. `gate.mock.ts` reports absent paths as absent.
- Research behind each decision: `openspec/changes/2-1-323/research/`.
