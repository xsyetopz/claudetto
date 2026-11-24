---
status: accepted
date: 2026-11-25
---

# The Status Line Is a Command That Draws Rows

## Context and Problem Statement

ADR-0190 kept the status line minimal (REQ-COST-004 option a): one pinned line, written through `$.ui.status`. On claude 2.1.329 that call draws `⚠ claudetto: …` and nothing else, so the line carries no figure. Claude Code's own channel for a rich line is the `statusLine` setting: a command that reads a JSON object on stdin and prints one row per line, with the width in `COLUMNS`. A `statusLine` in a plugin's root `settings.json` is not applied on 2.1.329; one in the user settings file is. Which side draws the line, and where does each figure come from?

## Considered Options

- Keep the pinned `$.ui.status` line (ADR-0190).
- Ship a command, `plugins/claudetto/bin/claudetto-statusline`, and set the user's `statusLine` to it at session start, never over a status line the user wrote.

## Decision Outcome

The second option, because only the command channel draws on 2.1.329 and it carries the rows of the rebuild's earlier status line (REQ-COST-004): phase, model with effort and `think`, the context bar, `Pace:`, `Session:`, `Project:` and `Account:` rows, the `⚑ waiting on you` row, and one row per running subagent.

- A figure is drawn only when a real source reports it. stdin supplies model, effort, thinking, `context_window`, `cost`, `rate_limits` (`five_hour`, `seven_day`, `spend_limit`), `prompt_cache`, `session_name`, `workspace`, `pr` and `worktree`; the branch is read from `.git/HEAD`. A missing or null field leaves its segment out; nothing is estimated.
- The phase, the prompt the session waits on the person for, and the running subagents are not on stdin. `registerLive` writes them from the hook events (`turn.start`, `turn.complete`, `tool.check`, `tool.run`, `agent.spawn`, `agent.report`, `session.end`) to `<config dir>/claudetto/status/<session_id>.json`, and the command reads that file. A write that fails is logged and never fails a hook.
- Pace is the used percent over the elapsed percent of the fixed 5h and 7d windows, computed from `resets_at`; the spend limit has no fixed span and gets no pace.
- The dollar estimate shows only when `rate_limits` reports no window, since a subscription's figure is the window's.
- Tokens saved against a vanilla run are not drawn: no counter measures them, and a number from the line's own arithmetic would be a guess.
- At session start `wireStatusLine` sets the user's `statusLine` when the user has none, or when it is claudetto's own command (it names `claudetto-statusline`) for another plugin root. A status line the user wrote stays as it is.
- Each row stays within `COLUMNS` minus 4. A row that does not fit swaps clock times for countdowns, then is cut with `...`.

Supersedes the minimal-status-line part of ADR-0190. The rest of ADR-0190 and the `/statusline` command text stand.

## Consequences

- A user who has their own `statusLine` sees none of this; the plugin leaves it alone and says nothing.
- A permission prompt the person denies leaves `waiting on you` shown until the next tool run or turn event, since the hooks see no denial event.
- The command starts a Bun process each time the line refreshes; it reads two small files and prints.
- The plan phase of ProjectArchitect's line has no source here, so the phase is the hook-observed working or idle.

Source: ADR-0190; ADR-0177; REQ-COST-004.
