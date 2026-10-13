# Release 0.10

This page records the notes of the `0.10` release.

Released 2026-09-28.
This release adds a status line, public documentation, and more usage checks.
It makes every message to Claude follow strict ASD-STE100.
A version in parentheses marks a later patch of this line.
An entry with no version comes from 0.10.0.

## Added

- Stale-cache notice (`usage_notes` option): shows in the main conversation when the user sends a prompt after the prompt cache expired.
  The context is 100k tokens or more.
  - It says that this turn reads the whole context uncached.
    It also says that a `/compact` now does the same.
    It suggests a handoff note and `/clear` for new work.
  - The TTL is 1 hour, or 5 minutes with `CLAUDE_CODE_PROMPT_CACHE_TTL=5m` or `FORCE_PROMPT_CACHING_5M=1`.
  - The message goes to the user only.
    It adds nothing to the context.
- `Bash` guard, co-author line: denies a `git commit` whose message has a Claude `Co-Authored-By` line when the `attribution` setting (or `includeCoAuthoredBy: false`) leaves that line out.
  Claude Code adds the line anyway in some sessions ([#4287](https://github.com/anthropics/claude-code/issues/4287), [#93007](https://github.com/anthropics/claude-code/issues/93007)).
- Status line (0.10.0, 0.10.1):
  - The main line shows the folder, the git state, the model and effort, and the context against the 200k handoff point.
    It also shows the cache expiry and hit ratio, the usage limits, and the pull request.
    Colors change at 75% and 90%.
  - It uses two rows: where the session works, then what it uses.
    A row that is too wide continues on the next row.
    Past three rows, parts drop by priority.
    A limit at 75% or more stays.
  - It also shows the folder below the project, added directories, the worktree, the `--agent` name, the vim mode, and the session name.
    It also shows cache misses with the last cause, the spend limit, lines added and removed, and the session time.
  - The plugin sets `subagentStatusLine`.
    Each subagent row shows its context against the 150k subagent budget.
    Claude Code leaves `${CLAUDE_PLUGIN_ROOT}` empty in that command.
    So it runs a stub in the config directory that session start writes.
  - A plugin cannot set `statusLine`.
    So `/dotclaude:apply-settings-profile` offers it through `apply-statusline.mjs`.
    That script writes a stub that session start keeps pointed at the current plugin version.
  - The `statusLine` setting has `refreshInterval: 60`, so the clock and cache expiry of an idle session keep updating.
    To add it to an existing install, run `/dotclaude:apply-settings-profile` or `apply-statusline.mjs --apply` again.
- Nested-instructions hook (`nested_instructions` option): when a `Bash` command reads files in a subdirectory with its own `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md`.
  The hook adds that file to the context.
  It adds the file once for each session or subagent.
  Claude Code loads these files only for the `Read` tool ([#90450](https://github.com/anthropics/claude-code/issues/90450)).
- Usage report: shows the prompt cache hit rate and the advisor share of cost.
- Open-task check (`task_check` option): when Claude ends a turn with tasks pending or in progress.
  A `Stop` hook sends it back once to update the task list.
  The same set of open tasks blocks only once.
- `just sandbox`: runs Claude Code with the checkout as its plugin in a separate config directory.
  It skips onboarding and the trust dialog.
  It gives the login token to `claude` in its environment only.
  - `docs/sandbox.md`, now the [Sandbox](Sandbox) page, tells people and AI agents how to test in it.
  - `just sandbox-clean` removes it, and `just usage` runs the usage report.
- Public docs (0.10.1): `docs/`, from `docs/README.md`, is now this wiki, from [Home](Home).
  Each page tells what a part of dotclaude does and why.
  Each page links to the dossier for the evidence.
  The parts are hooks, models, agents and skills, working rules, the settings profile, the status line, and development.
- `explain-dotclaude` skill (0.10.1): when the user asks why Claude or dotclaude did, blocked, or asked about something, Claude answers from the documentation.
  The answer gives the reason, its source, and how to change it.

## Changed

- Message style: every message that goes to Claude follows strict ASD-STE100 and the prompting best practices of Claude.
  The messages are hook output, guard reasons, agent and skill prompts, and the system prompt.
  - Each message gives the reason, says what to do, and puts code items in backticks.
  - A guard that finds more than one problem writes each reason as its own sentence.
  - `AGENTS.md` has the rule for new messages.
    Agent rules that had no reason now give one.
- Tests: check what dotclaude does, not how its messages read.
  They check the decision, the file effects, and the facts that a message carries (paths, IDs, numbers).
  So a reworded message no longer breaks a test.
- Dossier: uses the official prompt-caching facts.
  An effort change keeps the cache on Opus 5.5 and Fable 5.1.
  `/model` loses it.
  A 1-hour cache write costs 2x the input price.
- Subagents: learn that Claude Code refuses their writes to `.md` files whose names start with `report`, `summary`, `findings`, or `analysis` ([#44657](https://github.com/anthropics/claude-code/issues/44657)).
- Usage-note levels: the levels (75% and 90%) moved to `hooks/lib/_budget.mjs` as `USAGE_LEVELS`.
  The status line shares them.
- README (0.10.1): a short overview that links to the documentation.
  The hook details, options, settings profile, and development notes moved to `docs/`.
- Cache misses (0.10.2): the main status line counts only misses that something broke, for example a change of model, tool, or system prompt.
  It does not count misses from idle time past the cache lifetime (`ttl_expired_5m`, `ttl_expired_1h`).
  They break nothing.
  The stale-cache notice already covers them.

## Removed

- Headroom support: Headroom compresses tool output with loss.
  - In this repository it dropped words from text that Claude read as exact.
  - Its saving is small against a cached context.
    All agents needed its retrieval tool.
  - The agents, `/dotclaude:setup-integrations`, and the session-start notice no longer name it.
  - To remove it from a setup, run `headroom unwrap claude` and `claude mcp remove headroom`.
    Then take `headroom wrap` out of the `claude` shell function.

## Fixed

- Usage report: it left out advisor calls, because the `usage` of the call does not count them.
  It now adds each `advisor_message` in `usage.iterations`.

## Related Pages

- Previous: [Release 0.9](Release-0.9)
- Next: [Release 0.11](Release-0.11)
- [Archive](Archive): the index of the archived pages.
