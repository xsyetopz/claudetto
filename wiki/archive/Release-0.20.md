# Release 0.20

This page records the notes of the `0.20` release, with its patches up to `0.20.8`.

Released 2026-10-04 to 2026-10-05.
This release is a full reset on Claude Code 2.1.289.
It cut runtime JavaScript from 18,935 lines to 2,118 lines.
It adds a new status line, the `dotclaude-jev` plugin, the Terms of Use, and the CodeGraph augment.
A version in parentheses marks a later patch of this line.
An entry with no version comes from 0.20.0.

0.20.0 keeps the parts that serve a need that Claude Code does not cover.
It removes the rest.
Runtime JavaScript goes from 18,935 lines in 0.19.1 to 2,118 lines.
`tests/budget.test.mjs` bounds it at 3,000.
Run `/dotclaude:setup` again after you update.

## Added

### Reset Parts

- `docs/parts.md`, a page that lists each part, its event, its bound, and the need that it serves.
- The rule that runtime JavaScript (`hooks/`, `status-line/`, `skills/`, `plugins/`) stays within `RUNTIME_JS_LINES` (3,000) in `hooks/lib/_budget.mjs`.
  0.19.1 had no bound on it.
  Its runtime JavaScript grew to 18,935 lines.
  Much of it was a copy of what Claude Code 2.1.287 to 2.1.289 does itself.
  0.20.8 removed this bound (see Changed, 0.20.8).
- The plugin options `guard_agents` and `compaction_handoff`.
  `guard_agents` turns off the spawn rules.
  `compaction_handoff` turns off the handoff fork.
- A `Stop` check gate.
  It sends Claude back once when a turn edited files and no check ran after the last edit.
  The usage evidence shows that a rule in a prompt does not hold, and a hook does.
  It finds the check from the `justfile`, `package.json`, or `Makefile` of the project.
- A compaction instruction.
  The summary says that an unapproved plan or an open question stays open.
  The default summary text tells Claude to continue without asking.
  A model then acted on a plan that the user had not approved.
- A handoff fork on compaction.
  Before a compaction of the main conversation, a fork writes a handoff note to `.claude/handoffs/`.
  It adds the note to the compacted conversation, because users report that a handoff note beats a compaction.
  If the fork gives no note in 60 seconds, the compaction runs without it.
- Cold-cache notes.
  A resumed session with an expired prompt cache gets the cost advice.
  A prompt that comes more than 1 hour after the last turn gets it too.
  The reason is that 1.6% of the turns caused 80% of the cache writes.
  Those are the turns after more than 1 hour idle.
- Plan detection from the account in `.claude.json`, in `hooks/lib/_plan.mjs`.
  The cold-cache note uses a 5 minute cache time on the `api` plan.
  It uses 1 hour on other plans.
  A new or cleared session on the `api` plan gets a plan note.
  `skills/setup/scripts/settings.mjs` shows the plan.
  It takes `--plan <id>`, and it applies the per-plan `plans` overrides of the profile.
- The `backend` option of `dotclaude-browser`, which defaults to `agent-browser`.
  The value `cloakbrowser` runs `agent-browser` with the CloakBrowser binary through `--executable-path`.
  Use it for sites with bot detection.

### Status Line

- A status line with every 0.19 part, in less code.
  Each part has one shape: icon, bar, number.
  - One bar renderer, one icon set, and one color scale (`USAGE_LEVELS`) serve every percentage.
  - The rows are `core` (model, context, cache, limits), `place` (folder, branch, worktree, PR, loop), and `detail` (cache hit ratio and misses, limit pace, cost).
  - A `⚠` blinks for three cases.
    The first is a handoff due, at context 90% of the compaction point.
    The second is a cache that expires in two minutes or less.
    The third is a limit at 90%.
  - `⚠` also marks an effort that the rules do not allow for the model.
  - A second script shows the model and context of each running agent.
  - `/dotclaude:setup` writes two stubs in the config directory.
    It sets `statusLine` and `subagentStatusLine` to run them.
    A status line command gets an empty `${CLAUDE_PLUGIN_ROOT}`.
- Limit resets (0.20.1): the status line shows the limit resets that you can use, as `⟳2 by Oct 12 at 4am`.
  That text gives the count and the earliest expiry.
  - It reads them from the `cedar_ember` block of the `/usage` copy that Claude Code keeps in `.claude.json`.
    So it makes no network call.
  - A grant counts when it is not paused, has resets left, and is in its start to end span.
    Claude Code and CodexBar count a grant the same way.
  - While a usage window is at its limit, the reset part outranks the other parts.
- Extra usage (0.20.1): the status line shows the extra usage spend while extra usage is on.
  An example is `extra █░░░░ $12.50/$50`.
  With no monthly limit, it shows `extra $12.50`.
  It reads `extra_usage` from the same copy.

### Setup and Profile (0.20.4)

- The profile sets `cleanupPeriodDays` to 14.
  It sets `enableArtifact` to `false`.
  It sets `disableBundledSkills` to `true`.
  It sets `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` to `1`.
- `/dotclaude:setup` keeps the newest 3 backups of each file.
  It removes the older ones.
  It lists the memory files to review.
  It lists the LSP plugins for the language servers on `PATH`.
- The setup integrations reference covers the LSP plugins and the `ctx7` CLI for library docs.
  It has no MCP server.
  The `web-researcher` agent uses `ctx7` when it is on `PATH`, because it uses less context than a web search.
  When `ctx7` is rate-limited, the agent checks the limit with one call.
  Then it uses `WebSearch` and `WebFetch` until the reset.
- `/dotclaude:setup` gives the command that adds a Context7 API key to the shell profile.
  The user runs it outside Claude Code.
  Setup then checks that the key gives a tier other than `anonymous`.
- The README has a "Save weekly usage" section.
  The dossier ranks the community claims about usage.

### Rules, Notes, and Hooks (0.20.4)

- Each compaction note marks the earlier compaction note of the same session as `superseded`.
  The new note carries its open items.
  Before, each compaction left one more `in-progress` note.
- The CodeGraph augment: when a `Grep` call or a `Bash` `rg` or `grep` search looks for one symbol name in a project with `.codegraph/`.
  The hooks module adds the callers and callees of that symbol to the search result.
  - Claude ignored rules that told it to run `codegraph`.
    So the graph now comes with the search that Claude already runs.
  - The design follows the GitNexus hooks.
  - Before a lookup, the hook runs `codegraph sync` if files changed since the last index.
    Without the MCP server, the index does not update itself.
  - It never builds an index.
  - The plugin option `codegraph` turns it off.
- The minimal-code rules: session start tells Claude to build the minimum, with the idea of Ponytail.
  The plugin option `ponytail` turns them off.
- Usage habits in the working rules: a handoff note and `/clear` at a task boundary.
  `/btw` for a side question.
  A lower effort in place of a model change.
  A model change only after `/clear`.
- Line breaks in the working rules: in Markdown, comments, commits, and PRs, Claude starts each sentence on a new line.
  Claude does not break lines at a column.
  The rule follows [Semantic Line Breaks](https://sembr.org/).
  - Claude hard-wrapped prose at about 80 columns.
    That breaks reflow in editors and terminals, and it makes diffs larger.
  - A project style takes precedence.
  - Shorter wording of the other rules keeps the file within its 2,000-byte bound.
  - Claude Code 2.1.289 has no `CLAUDE_NO_WRAP` variable or `--no-word-wrap` flag.
    A plugin cannot change how the terminal wraps output.

### Jev Plugin

- The optional `dotclaude-jev` plugin (0.20.4): its `second-opinion` skill asks TypeSafe Jev, a decision model.
  It asks for a yes or no check, a pick from options, or a rating.
  Each answer has a probability.
  - Claude uses it for its own close calls.
    It still asks the user the questions that only the user can answer.
  - It also checks a technical decision of the user.
    When Jev finds that facts decide it and that it causes defects, Claude tells the user the facts once.
    Claude asks for a confirmation.
    The answer of the user is final.
  - It needs `TYPESAFE_API_KEY`.
- The `dotclaude-jev` plugin (0.20.8) adds a session note that sends each decision through the `second-opinion` skill.
  - The decisions are the close calls of Claude.
    They are the questions of the user that ask for a decision, a pick, or a rating.
    They are the technical decisions of the user, and each request for a second opinion.
  - Claude asks each question with options through `AskUserQuestion`.
    So the hooks module can add the pick of Jev.
  - Goals, preferences, and approvals stay with the user.

## Removed

- The delegation gate and note.
  Users report cost blow-ups from subagents.
  `maxTurns` bounds an agent without it.
- The agent budget hooks (`enforce-agent-budget`, `hand-off-capped-agents`, and the report caps).
  The `maxTurns` of an agent file does the same job.
- The model-switch, `ConfigChange`, `StopFailure`, and `TaskCompleted` hooks.
  `availableModels` and `CLAUDE_CODE_DISABLE_FAST_MODE` do the same job.
- The options `model_lock`, `model_plan`, `model_allowed`, and `usage_notes`.
  The other 0.19 options go too, except the guard options.
  The hooks that they controlled are gone.
- Fable 5.1 from `availableModels` and from the `Agent(model:fable*)` deny rule.
  The user chose to remove it.
  A subagent never runs on it.
- Nested instructions (`load-nested-instructions`).
  Claude Code 2.1.288 loads rules on `Write` and `Edit`.
  A `Bash` read of a directory does not load its `CLAUDE.md` yet.
- The restore after a compaction, the check for line breaks, and the scratchpad pruning.
  The 0.20.0 review found no need for them that Claude Code does not cover.
- `warn-instruction-size`.
  `/doctor` audits the instruction files.
- The skills `slices`, `explain`, and `polish`.
  `/goal` covers a large change.
  The 0.20.0 review found no need for the other two.
- The agent `mechanical-worker`.
  `implementer` does its work.
- The output styles `Explanatory`, `Learning`, and `Proactive`.
  Claude Code has built-in styles of those names.
- The `recognize-captcha` skill and the CloakBrowser launcher.
  CloakBrowser keeps most CAPTCHAs away.
  `agent-browser --executable-path` runs its binary.
- The AI policy catalog and its update script `scripts/update-ai-policies.mjs`.
  `scripts/count-tokens.mjs` goes too.
  They served features that 0.20.0 removed.
  The `contribute` skill still reads the policy of the project.
- The eval case `t4-slices`, because it tests the removed `slices` skill.
- The 0.19 profile `optional.json`, the setup scripts for migration and the managed lock, and the public docs pages for the removed parts.

## Related Pages

- Previous: [Release 0.19](Release-0.19)
- Next: [Release 0.21](Release-0.21)
- Changes and fixes: [Release 0.20 Changes and Fixes](Release-0.20-Changes)
- [Archive](Archive): the index of the archived pages.
