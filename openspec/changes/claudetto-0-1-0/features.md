# Features of dotclaude 1.0.0

This list marks each feature of dotclaude 1.0.0 for `claudetto` 0.1.0.
The marks are "carry over", "rebuild", and "leave behind".

- "Carry over": `claudetto` keeps the behavior, and fixes the review rows of the feature.
- "Rebuild": `claudetto` keeps the goal, but not the design.
- "New": dotclaude 1.0.0 does not have the feature.
- "Leave behind (proposed)": only the user approves this mark.
  Until the user approves it, the feature stays in scope.

Sources:

- The ids S, U, L, C, E, N, and O are in [the fault register](faults.md).
- The review rows are in [Review Findings](faults-review.md).
- "Scope" is the scope of the user in `external/cc-2.1.299/scratch/v110/findings.md:183-189`.
  The decisions of the user from 2026-10-14 are in `external/cc-2.1.299/scratch/v110/findings-decisions-2.md`.
  It starts from the vanilla 2.1.299 binary, overrides what gives token efficiency and cost reduction with little or no loss of intelligence, disables the parts that use context, and uses a minimal SDD framework from the industry.
- The feature of each slice comes from the first comment of its `slice.ts` in `src/plugins/<plugin>/slices/<slice>/`.

## Status Line

| Feature | What it does | Mark | Reason |
| --- | --- | --- | --- |
| `statusline` (`dotclaude-statusline`) | The `statusLine` and `subagentStatusLine` commands and their segments | Rebuild | S10: it divides by a 300k window, and Claude Code gives `used_percentage` against the model window. The 2.1.299 input also has `rate_limits`, `prompt_cache`, `effort`, and `cost`. U6 asks for colors with more meaning. 5 review rows |

## Core Plugin `dotclaude`

| Feature | What it does | Mark | Reason |
| --- | --- | --- | --- |
| Kernel (`src/kernel/`) | Shared shell parser, paths, budgets, spec store, and stamp | Rebuild | S10 (`budget.ts:14`), 10 review rows, with the shell parse holes of kernel F1 and F2. The spec store goes with `spec` |
| `agents` | Six agents: `debugger`, `implementer`, `investigator`, `planner`, `researcher`, `reviewer` | Rebuild | Scope: multi-agent orchestration with the root model as the orchestrator. S2 and S11. `implementer` depends on `spec`. 6 review rows |
| `asks` | The ask before a call that discards work, skips a test, adds a lint suppression, or changes a protected file | Carry over | Hooks and gates held where prompt fixes failed (`findings.md`, section D). 2 review rows |
| `attribution` | The attribution lines of `git commit` and `gh pr create` | Carry over | No fault in the register. 5 review rows |
| `checks` (`dotclaude-run-checks`) | A batch of check commands with no model turn | Carry over | Scope: it saves model turns. 6 review rows |
| `decide` (`dotclaude-decide`, `second_opinion`) | A second opinion from Jev through the TypeSafe API, or from a small Claude model | Carry over | The user: "Jev is an opt-in integration that is claudetto's 'decision API'". Opt-in resolves the third-party concern. 5 review rows |
| `guard` | The deny of a `Bash` command that only prints a file, and the AI-policy ask for another owner's GitHub repository | Rebuild | S1: it denies the whole compound command (369 hits). E7. The user about the AI-policy ask: "probably not needed", so the rebuild leaves it behind. 2 review rows |
| `handoff` (`dotclaude-handoff`, `/handoff`) | The handover file, `/clear`, the resume prompt, and the report-now note for subagents | Rebuild | The user: handover is the default and is cheaper than compaction, with auto-handover and manual handover. Compaction becomes an opt-in config. The auto-handover needs a safety margin below the hard stop (1.0.0 stopped at 270k to 277k) and a check that the file exists before the clear. The user: a light, compaction-like flow that writes the handover, clears, and prompts in one step, with a UI like the UI of compaction. The mods API has the parts: `$.session.usage`, `$.model.fork` (cached prefix), `$.command.run`, `$.prompt.submit`, and a `session.compact` skip (`findings-decisions-2.md`, Fourth Set). On 2.1.300 the auto handover can be the compaction: a `session.compact` hook returns the first user message, the handover, and the tail from the last tool use, so it works in plain `-p` with no `/clear` (V2, `scratch/v110/handover-eval-300.md`). S2, S3, U8, and L1. 4 review rows |
| `prompt` | The system prompt variant of each model, the subagent block, and `context_management` without compaction | Rebuild | Scope: override for token efficiency. L1 (`DISABLE_COMPACT`), N9, N10, E5, and prompt F1 to F3 |
| `rules` (`/rules-creator`) | A user-invoked skill that writes rules files | Leave behind | Jev, by the user's grant (2026-10-14): drop, confidence 0.92, and 0.77 twice with neutral wording. Scope: each skill in the listing uses context (E5: `skill_listing` 7,134 chars). No fault in the register asks for it. 3 review rows |
| `sembr` | The rewrite that puts each sentence of a Markdown file, commit, or PR text on its own line | Carry over | No fault in the register. The repository rules ask for semantic line breaks. 2 review rows |
| `setup` (`dotclaude-setup`, `/setup`) | The settings snippet, the git excludes, and the drift check at `session.start` | Rebuild | U2, O1, and C2. N4: a plugin cannot ship `env`, `permissions`, or `autoMode`, so setup must write them. The locked decision is generator style. 8 review rows |
| `spec` (`dotclaude-spec` and 7 skills) | The spec store, its CLI, and the skills `specify`, `plan`, `implement`, `review`, `accept`, `merge`, `archive` | Rebuild | Scope: a minimal SDD framework from the industry. S9, U9, E1, E2, E6 (spec calls 30 percent or more of tool calls in 10 of 14 sessions), O2, and S11 (the review step asks for self-approval). The user: a lightweight SDD like OpenSpec, Spec Kitty, and SpecKit, tailored to Claude Code and tuned for the Claude 5.1 and 5.5 models. MiniSpec per D4: skills, templates, and the `minispec` CLI. The user (2026-10-15): "minispec, if like openspec, has its own binary, too". 8 review rows |
| `stamp` | A `system` notice with the version and the build SHA at each session start | Leave behind | Jev, by the user's grant (2026-10-14), with neutral wording: the core does not keep it (keep 0.20). Jev split between drop and a move to `dotclaude-sessions` (0.41 and 0.40), so the sessions rebuild decides whether it records the version itself. L3: the user sees raw JSON in each session. Its only reader is `dotclaude-sessions`. 3 review rows |
| `styles` | The output style `dotclaude:Concise` | Carry over | U3 asks for less padding, and the style keeps the coding instructions. 7 review rows |
| `surface` | Shorter or deferred descriptions of built-in tools, and the drop of built-in agent types | Carry over | Scope: token efficiency. N11: a plugin agent cannot replace a built-in agent, so the drop is the way. 1 review row |
| `trim` | The settings and env entries that turn off built-in parts | Rebuild | Scope: disable the parts that use context. N10: `CLAUDE_CODE_DISABLE_CFC_PROMPT` keeps the Chrome tools. Each switch needs a check against 2.1.299. 3 review rows |

## Add-on Plugins

| Feature | What it does | Mark | Reason |
| --- | --- | --- | --- |
| `dcc-plugin-agents-md` | The `AGENTS` files at start, on a read or an edit, and on a mention | Leave behind | The user: "keep it off". A run showed that Claude Code reads a `CLAUDE.md` symlink to `AGENTS.md` without a plugin (`notes/rules-styles-2.md`). N6 and E4. 7 review rows |
| `dcc-plugin-you-should-know` | A check before the first change of a turn, with a band above the prompt | Rebuild | The user: the same flow and UI as the built-in, also in `-p`, and only for an account with the flag `tengu_jolly_dewdrop` on (N2, `strings.txt:356293`). U7: it needs a fix for the false alarm about cut handover files: the side agent has no tools and sees only the preview of a persisted output, so the mod checks a file claim with `$.fs` before the band shows it. A mod reads the flag from `cachedGrowthBookFeatures` (`scratch/v110/handover-eval.md`). E3. 7 review rows |
| `dotclaude-browser` (`browse`, `search`) | A browser guide skill, and a `WebSearch` handler with a choice of backend | Rebuild as an add-on | The user: keep the CloakBrowser part as an add-on for specific purposes. Browser F1 is blocking: a `WebSearch` deny rule does not apply. Browser F3 and F4. Scope does not name it. 8 review rows |
| `dotclaude-codegraph` | The `codegraph` sync at start, after an edit, and after a `git` command | Rebuild | The user: a CLI and a lightweight skill by default, and an opt-in MCP server through `bunx` that claudetto installs and sets up. Scope: less context for exploration. No fault in the register. 6 review rows |
| `dotclaude-docs` | The `docs` skill, which gets library docs with `ctx7` | Rebuild | The user: as `dotclaude-codegraph`, a CLI and a lightweight skill by default, and an opt-in `context7` MCP server. No fault in the register. 6 review rows |
| `dotclaude-lab` `capture`, `eval-compare`, `sandbox` | A logging proxy, an eval comparison, and Claude Code in a separate config | Carry over | Scope: "little or no loss of intelligence" needs measurement. The repository rules use the sandbox. 5 review rows for the plugin |
| `dotclaude-lab` `schema` (`dotclaude-schema`) | The JSON Schema of `settings.json` and `managed-settings.json` from the installed bundle | Rebuild | C2: it has no type helper table for 2.1.299. The 2.1.299 schemas and their builder are in `external/cc-kg/2.1.299/schemas/` and `external/cc-kg/tools/schemas/`. The 2.1.300 schemas are in `external/cc-kg/2.1.300/schemas/`, from `external/cc-kg/tools/schemas-2.1.300/`. Only `format` notes changed, from zod 4.6.2 |
| `dotclaude-sessions` (`start-cost`, `usage`) | The commands `dotclaude-start` and `dotclaude-usage` | Rebuild | U5: thin. N1: gating hooks without `.catch`. The user wants subscription and usage awareness, and the user wants `session.identity` (N5), which needs a managed-settings install. 8 review rows |

## New in `claudetto`

| Feature | What it does | Mark | Reason |
| --- | --- | --- | --- |
| `gc` | A garbage collector for the outputs of Claude itself: it records each file and dir that Claude makes during the work, and it removes each one that nothing uses | New | The user (2026-10-15): "think of it like having a GC for claude's own outputs", and not a plugin GC. On 2026-10-15 the disk was at 97%: `$TMPDIR` held 165 GB, of which 158 `mktemp -d` dirs from the runs of Claude and its agents held 66.5 GB, and `/private/tmp/claude-501` held 9 GB of task output. The outputs: `mktemp` dirs, worktrees, copies of repos, sandbox config dirs, scratch files, and task output. The roots are the outputs that a live session, a running job, or a worktree in use still needs. The sweep runs by age and by size, at `SessionStart` or `SessionEnd`, and with a command. `SessionEnd` runs on SIGINT (V7). Not designed yet |
