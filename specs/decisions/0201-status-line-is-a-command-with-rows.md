---
status: accepted
date: 2026-11-25
---

# The Status Line Is a Command That Draws Rows

## Context and Problem Statement

ADR-0190 kept the status line minimal (COST-004 option a): one pinned line, written through `$.ui.status`. On claude 2.1.329 that call draws `⚠ claudetto: …` and nothing else, so the line carries no figure. Claude Code's own channel for a rich line is the `statusLine` setting: a command that reads a JSON object on stdin and prints one row per line, with the width in `COLUMNS`. A `statusLine` in a plugin's root `settings.json` is not applied on 2.1.329; one in the user settings file is. Which side draws the line, and where does each figure come from?

## Considered Options

- Keep the pinned `$.ui.status` line (ADR-0190).
- Ship a command, `plugins/claudetto/bin/claudetto-statusline`, and set the user's `statusLine` to it at session start, never over a status line the user wrote.

## Decision Outcome

The second option, because only the command channel draws on 2.1.329 and it carries the rows of the rebuild's earlier status line (COST-004): phase, model with effort and `think`, the context bar, `Pace:`, `Session:`, `Project:` and `Account:` rows, the `⚑ waiting on you` row, and one row per running subagent.

- A figure is drawn only when a real source reports it. stdin supplies model, effort, thinking, `context_window`, `cost`, `rate_limits` (`five_hour`, `seven_day`, `spend_limit`), `prompt_cache`, `session_name`, `workspace`, `pr` and `worktree`; the branch is read from `.git/HEAD`. A missing or null field leaves its segment out; nothing is estimated.
- The phase, the prompt the session waits on the person for, and the running subagents are not on stdin. `registerLive` writes them from the hook events (`turn.start`, `turn.complete`, `tool.check`, `tool.run`, `agent.spawn`, `agent.report`, `session.end`) to `<config dir>/claudetto/status/<session_id>.json`, and the command reads that file. A write that fails is logged and never fails a hook.
- Pace is the used percent over the elapsed percent of the fixed 5h and 7d windows, computed from `resets_at`; the spend limit has no fixed span and gets no pace. (Replaced by CodexBar's delta; see the second amendment.)
- The dollar estimate shows only when `rate_limits` reports no window, since a subscription's figure is the window's.
- Tokens saved against a vanilla run are not drawn: no counter measures them, and a number from the line's own arithmetic would be a guess.
- At session start `wireStatusLine` sets the user's `statusLine` when the user has none, or when it is claudetto's own command (it names `claudetto-statusline`) for another plugin root. A status line the user wrote stays as it is.
- Each row stays within `COLUMNS` minus 4. A row that does not fit swaps clock times for countdowns, then is cut with `...`.

- Amended 2026-11-25: the rows carry no labels and drop `think`. They run turn (phase, model, effort, fast mode, a non-default output style, the `--agent` name, context, cache), place (project, branch, worktree, PR, session name, wall and API time, lines, dollars), limits (each window's bar, pace, run-out and reset on one row), activity (tool calls and their rate, the agent count, the lead's last call), tasks, machine, waiting, and one row per running or finished subagent with its tool calls. The hooks also write the tool count, each call's subject, and the task list from `TaskCreate`, `TaskUpdate` and `TodoWrite`. The colours are Claude Code's own theme keys for the `theme` setting, copied from the 2.1.329 theme tables, and fall to the theme's ANSI variant on a 16-colour terminal. The machine row reads `sysctl` (macOS) or `/proc/meminfo` (Linux), `ps` and Node's `os` in the command, which runs outside the Bash sandbox; a probe that fails leaves its figures out. GPU use has no source a status line can read in its time, so it is not drawn.
- Amended 2026-11-25: the limits row gives CodexBar's pace (steipete/CodexBar `UsagePace.swift`): the expected use is the elapsed share of the window, the delta is the use above it, `on pace` within 2 points, otherwise the points `deficit` (an error colour past 12) or `reserve`, and a run-out time only when it falls before the reset. The ratio pace above is replaced. `session.start` and `session.measure` record each window's use at the session's first reading as a baseline (0 for a window that resets later), and each measure records `/context`'s free local estimate by row; the context bar and each window's bar are split by them, the window into use before and since the baseline. A status line command takes no clicks, so a band above the prompt carries one chip per view with a reading, and a chip's press, its hotkey or `/breakdown [ctx|5h|7d]` opens a pane with the rows of `/context` in its colours, or the window's split, pace, outlook and reset. The `since` part counts every session on the account, since `rate_limits` is the account's. When the first reading comes after the first response, `before` holds that response's use.
  Status: accepted, 2026-11-25.
  Verified: claude plugin test plugins/claudetto -> 429 pass, 0 fail, on claude 2.1.329, 2026-11-25; the band and pane are mounted on the terminal surface, a chip press opens the pane, and `/breakdown 7d` opens it on the 7-day view.

Supersedes the minimal-status-line part of ADR-0190. The rest of ADR-0190 and the `/statusline` command text stand.

## Consequences

- A user who has their own `statusLine` sees none of this; the plugin leaves it alone and says nothing.
- The `statusLine` key sits in the user settings file, so Claude Code runs the command in every session, also in one where claudetto is not loaded or was removed. The command prints nothing, and the line stays blank, for a session without a state file; the `session.start` hook writes that file even when the usage read fails. Amended 2026-11-26.
- A permission prompt the person denies leaves `waiting on you` shown until the next tool run or turn event, since the hooks see no denial event.
- The command starts a Bun process each time the line refreshes; it reads a few small files, runs `sysctl` and `ps` (about 70 ms together, measured 2026-11-25 on macOS), and prints.
- The plan phase of ProjectArchitect's line has no source here, so the phase is the hook-observed working or idle.

## Amendment 2026-11-27: Rows Core Already Draws

ISSUES-part9.md and ISSUES-part10.md showed three rows that repeated what the screen already held, and a wait flag nobody could answer.

- The `⚑ waiting on you` row is recorded at `classic.PermissionRequest`, which fires only when a dialog opens. An `ask` verdict at `tool.check` goes to the mode's decider first, and auto mode's classifier settles most of them unasked, so the row named prompts that never reached the person.
- The row has no entry for the next prompt. The phase already reads `○ idle`, and the flag read as a step the user owed while a background shell or subagent was still working.
- Subagents get no row of their own; core's agent panel below the prompt lists them. The activity row keeps the running and finished counts.
- The chip band above the prompt is gone; it repeated the context and 7d rows. `/breakdown` still opens the pane.
- The context bar fills against the window /context measures (`rawMaxTokens`), which is the user's `autoCompactWindow` when that is below the model's limit. A 300k compaction window on a 1M model drew 2% of 1M where compaction runs at 300k.
- `wireStatusLine` writes the key when the user has none only until claudetto's command has been in the file once (the `statusLineWired` store key). After that a missing key means the user removed it (`/statusline delete`, ISSUES-part8.txt:150), and it stays removed.

Source: ADR-0190; ADR-0177; COST-004.
