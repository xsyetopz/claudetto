## Components

The release keeps the surface order of `0-3-0/architecture.md`: a settings value first, then a plugin file, then a mod hook, and a model call never.

| Component | Goal | Surface | Change |
| --- | --- | --- | --- |
| `guard` | G1 | mod `tool.check` on each tool, `classic.PermissionRequest`, static `deny` rules | The gate answers each prompt: `allow` when no danger gate matches, and the prompt stays when one matches (D1). |
| `setup` | G2, G3, G5, G6, G19 | user `settings.json`, `~/.claude/CLAUDE.md`, the shell rc file, `bin/claudetto-setup`, skill `setup`, `plugin.json` `userConfig` | The snippet of D2, the inventory, `merge` or `replace`, the plan option, the sensitive Jev key (D4), the choices of D20, the memory files of D21, and the `claude-demo` alias. |
| `prompt` | G2, G4, G5, G14, G15 | `agents/*.md`, `output-styles/`, skill descriptions, mod `tool.describe`, `prompt.context`, `prompt.attachment`, `prompt.compose` | The routing block, the roster of D6 with the built-in agents off (D21), the context line of D5, the text audit of D7, and `Concise.md` for the reply format only. |
| `finish` (new, with `goal`) | G12, G13 | mod `tool.call` on `tasks.md`, `Stop` | A box needs a passed check, and a deferring reply sets a note (D8). |
| `notes` (new) | G3 | mod hooks and `ui.render` at `AbovePrompt` | Notes from counters and a tagged line, with no model call (D9). |
| `handoff` (handover) | G10, G16 | mod `turn.complete`, `prompt.submit`, `$.command.run`, `$.prompt.submit` | A code-built handoff, `/clear`, and a resume, or a compaction, by the measured table of D12. |
| `hygiene` | G7, G11 | mod `session.start`, `tool.call`, `$.ui.log` | Only removals are reported, one ledger file, and authorship context on `git status` and `git diff` (D11). |
| `ground` | G8 | mod `tool.call` | The sources of the agent that writes, also in a subagent (D10). |
| `spec` | G8, G20 | `bin/minispec`, skills `propose`, `apply`, `verify` | Dots become hyphens, no `handoff.md` in a change folder (D14), the `Next:` line, and the commands of D22 on one model. |
| `statusline` | G16 | status line command | The usage gradient and the `rate_limits` file (D15). |
| Release pins | G8 | `tools/limits.ts`, CI, `README.md`, `schemas/`, fixtures, `src/wiki/` | 2.1.309 (D17). |

`reply`, `dry`, and `goal` go as slices (D16).
`claudetto-browser` and `claudetto-docs` get only the version bump and the kernel copies that a test keeps equal.

## Data and Interfaces

- `~/.claude.json` key `oauthAccount`: setup reads only `billingType`, `organizationType`, `organizationRateLimitTier`, `userRateLimitTier`, `seatTier`, and `hasExtraUsageEnabled`.
  No email, name, or UUID leaves the file.
- `claudetto-setup --inventory`: one JSON object with `plan`, `plugins`, `builtinMods`, `mcpServers`, `userSkills`, `claudeAiSkillsSync`, `settingsKeys`, and `conflicts`.
- `claudetto-setup --mode merge|replace`: `merge` is the merge of `0-3-0`, and `replace` writes the snippet and keeps a backup next to the settings file.
- `<tmp>/claudetto/ledger/<project key>.jsonl`: one line per edit, with the path, hash, session, and agent.
- `.claudetto/handoffs/`: the only place of a handoff.
- `slices/handoff/limits.ts`: the trigger bounds and the path table of D12.
- `$.command.run` queues a slash command until the session is idle (`extend/mod-api/tool-command-config.md:44`), and `$.prompt.submit` submits a prompt as a typed one (`extend/mod-api/turn-prompt.md:29`).
- `$.ui.log`: the user sees it, and the model does not.
- `~/.claude/CLAUDE.md`: the origin line between `<!-- claudetto setup -->` and `<!-- /claudetto setup -->`, which Claude Code strips before injection, and the rules of the user below it.
- A pinned npm import such as `"yaml@2.9.1"` in a CLI adapter, which Bun installs from its cache (D23).

## Constraints

- No patch of the Claude Code binary. An undocumented, experimental, or gated lever needs a pin test (D24, `CLAUDE.md`).
- A setting or env var of Claude Code comes before a `CLAUDETTO_` env var.
- A shared runtime bound changes only in `kernel/budget.ts`, a slice bound only in `slices/<s>/limits.ts`, and a repository bound only in `tools/limits.ts`.
- Each add-on plugin imports nothing from another plugin.
- The paid runs come last, in one ask with the cost and the weekly share (D18).
- `notes`, `finish`, and the handover make no model request of their own.
- Each key of the snippet keeps a source row.

## Decisions

### A1: Archive `0-3-0` Before This Change

`0-3-0` has each task done, so its specs go to `openspec/specs/` first, and this change writes MODIFIED deltas against them (the user, 2026-10-23).
Alternative: keep `0-3-0` open and write ADDED requirements in new paths, which leaves two versions of each requirement.

### A2: The Gate Settles the Engine Prompts That Lose Nothing

The prompts of the reports come from the engine: the gate does not see `Monitor` or MCP tools, and the engine asks for a read outside the working folder.
The user, 2026-10-23: "let every non-dangerous and safe command through, and only ask/deny commands that would either destroy user's OS install, or cause database/git problems".
So the gate answers each prompt in the process of Claude Code, with no model call.
Alternatives: `defaultMode: "bypassPermissions"` (it adds a startup dialog, and a mod `ask` must still reach a person), `additionalDirectories` (paths only), or `allow` rules for each MCP server.

### A3: Notes with No Model Call

The built-in mod `cc-plugin-you-should-know` runs `$.model.fork` for each check (binary 2.1.309).
claudetto turns it off, and `notes` uses rules on hook events and a tagged line that the model writes in its own turn, with the rules first (the user, 2026-10-23).
Alternative: a `$.model.complete` call on Haiku, which is still a request.

### A4: Setup Asks, Then Writes

Setup reports the inventory and asks `merge` or `replace`, so no user key goes without a choice.
The default stays `merge`, because it loses nothing and is easy to change later.

### A5: `IS_DEMO` Is a Shell Alias

`IS_DEMO` hides the email and the organization, and in 2.1.309 it also skips the trust, MCP approval, API key, and bypass dialogs (binary `chunk-f3syffrp.js`).
So setup offers the alias `claude-demo` for `IS_DEMO=1 claude`, the plain `claude` keeps each dialog, and no settings file gets `IS_DEMO`, because the user wants a shell alias (the user, 2026-10-23).

### A6: Token Goal by Measure

The goal of 10k tokens is a release gate (the user, 2026-10-23), checked in `/context` of a fresh session twice: in `just sandbox` with copies of the global files of the user, and on the real config after setup.
The cuts come in this order: the claude.ai skills, user skills that copy a claudetto skill, unused MCP servers (the user decides), the main body, and the tool texts.

### A7: Handover or Compaction by Measure

Sessions last hours or days (the user, 2026-10-23), so the cost of a long context repeats on each request.
A handover writes a short handoff in code and starts a fresh context, and a compaction is one model call over the long context.
Neither path wins each case by reason alone, so a table picks the path for each case, and paired runs set its values, because one path must do the same or better for less cost than the other (the user, 2026-10-23).
Alternative: one fixed path, which pays the higher cost in the cases where the other path is cheaper.

### A8: One Model, Thin Views, Least Code

Each slice parses a fact once in `kernel/`, each command builds one object, and one printer writes it as JSON or text (the user, 2026-10-23).
A task that adds lines names the behavior that needs them.
Alternative: one output path for each command, which is the shape that grew `minispec` apart from OpenSpec.

### A9: npm Packages by Place

A CLI adapter imports a pinned package that Bun installs from its cache, the hooks module imports none until a hook lab probe shows that the mod runtime resolves it, and no package needs an install script (D23).
Alternative: own code for each job, which costs more lines than a maintained package.

### A10: Pinned Levers

An undocumented, experimental, or gated lever of Claude Code is allowed when it saves cost or time with no loss, and its pin test fails on an update that drops it (D24, `AskUserQuestion` answer, 2026-10-23: "Undocumented, pinned").
Alternative: documented levers only, which leaves the cheaper levers of the program unused.
