---
status: accepted
date: 2026-11-04
---

# Disable Agent View

## Context and Problem Statement

`disableAgentView` removes background agents (`claude agents`, `--bg`, `/background`, the daemon). It does not remove teams, and it equals `CLAUDE_CODE_DISABLE_AGENT_VIEW=1`. Each background session is a whole new session with its own context. `teammateMode` takes `auto`, `tmux`, `iterm2`, or `in-process`; teams are already off unless `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. The source found no use of background sessions: no `~/.claude/jobs`, no transcript with `SESSION_KIND` bg, no `claude agents`, `--bg`, or `/background` in `history.jsonl` (891 lines).

## Considered Options

- `disableAgentView` true. It saves 48 tokens.
- Leave it unset.
- Set `teammateMode` (proposed unset, because teams are already off).

## Decision Outcome

Chosen: `disableAgentView` true; `teammateMode` stays unset. The user's reason (the cost of Agent Teams) pointed to true.

## Consequences

Background sessions are unavailable. No evidence of use was found in the user's history.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1793; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1885; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:786; user decision, 2026-11-04.
