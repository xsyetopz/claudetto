# Release 0.20 Changes and Fixes

This page records the changed behavior and the fixes of the `0.20` release.
The additions and the removals are on [Release 0.20](Release-0.20).

## Changed

### Reset

- **Model and effort rules.**
  Opus 5.5 takes `low`, `medium`, and `high`.
  Sonnet 5.5 takes `low` and `medium`.
  Haiku 4.5 takes no effort.
  `agent.spawn` denies a spawn that breaks the table.
  `tests/agents.test.mjs` keeps the agent files in step with it.
  The status line warns about the main session, because no hook event fires when its effort changes.
- `reviewer` and `debugger` run at `medium`, from `high`.
  In the 0.17.1 eval rerun, Sonnet 5.5 at `medium` passed 109 of 110 at $0.10 for each pass.
  At `high` it passed 107 of 110 at $0.12.
- The settings profile sets `maxEffortLevel` to `high`, from `xhigh`.
  The rules above allow no effort over `high`.
- The `Bash`, `Edit`, and secret guards are small.
  They are 3 files with 367 lines, in place of 14 files with 4,428 lines.
  They keep the asks for hard-to-undo commands, test deletion, generated files, and settings files.
  They keep the Betterleaks redaction.
  The large rule sets go.
  These are infrastructure, search, TLS, dependencies, proof escapes, and AI policy.
  The auto-mode classifier and the permission rules of Claude Code cover them.
- The working rules in `hooks/session-start/rules.md` are 1,442 bytes, from 4,300 bytes in 0.19.1.
  A test bounds them at 2,000.
  A standing prompt costs on every turn.
- `/dotclaude:setup` applies one profile (`recommended.json`) with one script, `settings.mjs`.
  It replaces the 0.19 profiles and scripts.
  The preview shows each setting that differs.
  A second run changes nothing.
- The only output style is `Concise`, because Claude Code has the other styles built in.
- `drive-web-browser` uses `agent-browser` by default, because it needs no extra binary.
  CloakBrowser is an opt-in for sites with bot detection.
- The status line bounds live only in `hooks/lib/_budget.mjs`.
  `status-line/shared.mjs` imports them.
- `refreshInterval` is `STATUS_REFRESH_SECONDS` (1) in `hooks/lib/_budget.mjs`.
  Slow reads run once per `STATUS_CACHE_MS` (5 s).
  These reads are `git status`, the compaction count, and the `/usage` copy.
  0.19 ran them on each run.
- `scripts/usage-report.mjs` runs again with its own helpers in `scripts/_usage-lib.mjs`.
- Each agent file has `maxTurns` (20 to 80).
  It replaces the 0.19 budget hooks.
  The setting bounds an agent with no hook.
  `implementer` takes the bulk changes of `mechanical-worker`.

### Status Line

- The status line has one row for each topic (0.20.2).
  - The first row is the session: model, context, and cache expiry.
  - The second row is the usage: each window, limit resets, and extra usage.
  - The third row is the place, and then the detail: cache hit ratio, cost, lines, and time.
- Each usage window shows its deficit or reserve in its own part (0.20.2).
  An example is `7d █████  99% ▲16%→3:41am ↻Oct 5 at 7am`.
  A pace thus never shows without its window.
  It drops only with its window.
- The cache hit ratio reads as `hit 96%` (0.20.2).
  Before, it had the `◷` icon of the cache expiry.
- A blinking `⚠` shows dim in its off frame (0.20.2).
  Before, a blank space showed.
  It looked like a gap after the separator.
- A status line group of one part shares its row with the next group (0.20.3).
  So the model does not stand alone on the first row when the context and the cache are not known yet.
- The status line code is in modules with one job each (0.20.3).
  `paint.mjs` holds the icons, colors, and bars.
  `format.mjs` holds the model names, times, and money.
  `parts.mjs` has one function for each part.
  `layout.mjs` builds the rows.
  `render.mjs` renders both status lines.
  `shared.mjs` is gone.
- The status line reads the `/usage` copy on each run (0.20.1).
  Before, it read the copy only when the status JSON had no usage windows.
  The windows of the status JSON still have priority.

### Documentation and Setup

- The documentation moved to the [GitHub wiki](https://github.com/xsyetopz/dotclaude/wiki) (0.20.6).
  The page source is in `wiki/`.
  `just wiki` publishes it.
  `docs/README.md` now only links to the wiki pages.
- The release archive of 0.1 to 0.19 is now one consolidated wiki page for each release line (0.20.6).
  [Release History](Release-History) is its index.
- The external sources of the old `docs/external/` are now in `external/`.
  Git ignores `external/` (0.20.6).
- The `/dotclaude:setup` profile sets the claude.ai skills `docs`, `docx`, `pdf`, `pptx`, and `xlsx` to `off` in `skillOverrides` (0.20.6).
  `disableBundledSkills` does not remove them, because they come from the claude.ai account.
  The claude.ai connectors, such as Claude Docs and alphaXiv, stay on.
- Plugin, agent, and skill descriptions and hook messages put code items in backticks (0.20.4).

### Terms of Use and Jev (0.20.8)

- Each note that dotclaude or one of its plugins gives to an agent is a clause of the dotclaude Terms of Use.
  The session start gives the `dotclaude_terms_of_use` block.
  Each note comes in a `dotclaude_terms` tag with its clause number and title.
  The tag names the hook that enforces the clause.
  The wiki page `Terms-of-Use` lists the 10 clauses.
- The Jev note is clause 10.
  The `dotclaude-jev` hooks module enforces it.
  - When `TYPESAFE_API_KEY` is set, the module runs one `jev.mjs ask` call for each `AskUserQuestion`.
  - Jev sorts each question into preference or facts, and picks from its options.
  - A question that facts decide shows the pick of Jev and its confidence to the user.
  - A question about a goal, a preference, or an approval stays as it is.
  - The module does not deny `AskUserQuestion`.
    A deny also blocked the questions that only the user can answer.
    Claude could then ask in plain text.
  - When Jev fails, the question passes unchanged.
- `just sandbox` loads each plugin in `plugins/`.
  So a sandbox test also covers `dotclaude-jev`.
  The `Sandbox` wiki page tells why a headless run denies a tool that `--allowedTools` does not list.
  It also tells how to give `gh` the login of the user.
- The 3,000-line bound on runtime JavaScript (`RUNTIME_JS_LINES` and `tests/budget.test.mjs`) is removed.
  The new rule is that runtime JavaScript does only the work that the latest Claude Code does not do.
  It uses the settings and extension points of Claude Code when they exist.

## Fixed

### Reset

- A model strip defect: `prefer-dotclaude-agents` removed the `model` that a spawn call gave.
  So the agent ran on another model than the call asked for.
  `agent.spawn` now denies a `model` that is not the one that the agent file fixes.
  The reason names the fixed model.
- `scripts/usage-report.mjs` runs again.
- `just sandbox` applies the setup profile and the status line again.
  It ran the removed `apply-statusline.mjs` and hid the error.

### Status Line

- The status line stubs that `/dotclaude:setup` writes run the newest plugin version in the plugin cache (0.20.3).
  Before, they ran the version that was current at setup.
  So a plugin update did not change the status line until setup ran again.
- A date and time in the status line read as `Oct 12 at 4am` on all systems (0.20.2).
  Some ICU versions, as on Linux and Windows, joined them as `Oct 12, 4am`.
  The test failed there.
- The 7d deficit or reserve did not show in a narrow terminal (0.20.2).
  It did not show while the 7d window was past the first usage level either.
  The 5h pace could also show without its window.

### Gates, Notes, and Setup

- The `Stop` check gate sends its reason as `additionalContext` (0.20.7).
  So Claude Code shows "Stop hook feedback", not "Stop hook error".
  0.20.0 used `decision: "block"` again, which Claude Code shows as an error.
- The check gate no longer asks for a check after an edit to a file outside the project (0.20.4).
  An example is a plan file in `~/.claude/plans/`.
- The check gate no longer counts an edit that failed (0.20.4).
  An example is a `Write` that a permission denied.
  Before, a denied `Write` sent Claude back for a check of a change that did not occur.
- Setup keeps a status line of another tool (0.20.4).
  It tells you how to replace it with `--status-line`.
  Before, it replaced the status line without a question.
- A resumed session with an expired cache and less than 100k tokens of context no longer gets the cold cache notice (0.20.4).
  This matches 0.19.
  The cache write of a small context costs little.
- The handoff pointer and the compaction note tell Claude to set a note to `done`.
  They do this only when each item in its Open section is done (0.20.4).
  Before, the pointer said to close a note when "the work" was complete.
  An agent then closed a note whose Open list still had items.
- The Context7 rate-limit check in `/dotclaude:setup` reads the status and the tier correctly (0.20.5).
  - Context7 refuses a key that is not valid with `HTTP/2 401`.
    It can show `context7-quota-tier: anonymous` for a valid key.
  - Before, setup told the user that the key was not valid when the tier was `anonymous`.
  - Setup also asks for a key only when `CONTEXT7_API_KEY` is not set.
- `/dotclaude:setup` suggests each curated LSP plugin of the `claude-plugins-official` marketplace whose language server is on `PATH` (0.20.5).
  - It reads the plugins from the marketplace manifest.
    So a new curated plugin shows with no dotclaude release.
  - Before, a fixed table of 6 plugins left out `csharp-lsp`, `jdtls-lsp`, `kotlin-lsp`, `lua-lsp`, `php-lsp`, and `ruby-lsp`.
  - For an installed plugin that is disabled, setup gives `/plugin enable`.
  - Before, setup counted an installed plugin as done, also when it was disabled.

### Attribution (0.20.8)

- Commits and pull requests of Claude get the git attribution again.
  - The `includeGitInstructions: false` setting of the profile removes the `Co-Authored-By` trailer and the pull request footer of Claude Code.
  - The 0.8 session note gave them back.
    The 0.20.0 reset removed it.
  - The session note reads the `attribution` and `includeCoAuthoredBy` settings, as Claude Code does.
  - Claude Code 2.1.289 gives no `model` to a `SessionStart` command hook.
    So the note tells Claude to write the name of its model in the trailer, such as `Claude Sonnet 5.5`.
  - The name then also follows a `/model` change.
- A repository with a remote of another owner gets no Claude attribution lines.
  - A repository is the user's own when it has no remote.
    It is also the user's own when each remote is on GitHub under the `gh` login.
    It is the user's own when each remote is under an organization where that login has the owner role.
  - GitHub records no organization creator.
    So the owner role (`admin`) stands for it.
  - A fork with an `upstream` of another owner is not the user's own.
  - In such a repository, the session note tells Claude to follow the AI policy of the project.
    It also tells Claude to use `/dotclaude:contribute`.
- The `Bash` guard checks the Claude attribution lines of `git commit` again.
  It did so before the 0.20.0 reset.
  - In a repository of the user, it denies a Claude `Co-Authored-By` line when the settings leave the trailer out.
    Claude adds the line from habit.
  - In a repository of another owner, it asks before a commit with a Claude attribution line.

## Related Pages

- Previous: [Release 0.20](Release-0.20)
- Next: [Release 0.21](Release-0.21)
- [Archive](Archive): the index of the archived pages.
