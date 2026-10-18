# Design: How 0.2.0 Is Built and Released

This file continues [`design.md`](design.md) with the build mode and the bar of a stable release.
The user set both on 2026-10-17: "0.2.0 must implement it solo, because of the faults 0.1.0-alpha.1 has", and "0.2.0 must be created as a *stable* release, so every possible fucked-up surface right now must be addressed directly."

## Decisions

### D37. One Session Builds 0.2.0, with No Subagents

- The main session does each task itself.
  It starts no subagent, no agent team, and no background agent, and it uses no worktree.
- The reason is in the facts of `design-handoff.md`.
  The turn caps, the report note, the stop gate, and the guard of `0.1.0-alpha.1` stopped or misled the helpers of 2026-10-17, and the fixes of those faults are part of this change.
- A step that the plan gives to "a reviewer" or "a helper" is done by the main session, or by a new session that the user starts, which reads only the diff.
- Background shell commands stay, such as `just docker check`, with a timeout.
- Group 3 of `tasks.md` goes first: the handoff path, the stop gate, and the guard parser.
  One session with no helpers goes through many compactions, and each one writes and reads a handoff, so the rest of the build runs on the fixed handoff.
- The rules of `design-evidence.md` for parallel subagents apply to the texts that claudetto ships, not to this build.

### D38. Stable Means No Open Fault on Any Surface

- A surface is each part that a user meets: each hook of each plugin, each slice, each add-on plugin, the setup and its snippet, the status line, the output styles, the agents, the skills, the MCP tools, the `bin/` commands, the evals, the wiki, the `CHANGELOG.md`, and the repository tools (`just generate`, `just bump`, `just docker`).
- `findings.md` has one row for each surface: its faults with a source (a transcript line, a test, or a run), the task that fixes each one, and the check that shows the fix.
  A surface with no fault gets a row with the check that shows it works.
- The release has no "known issues" section.
  A fault is fixed, or its surface is removed, before the tag.
- No state of `0.1.0-alpha.1` is read at run time, and the setup of `0.2.0` cleans the keys of 0.1.0 that it finds, and nothing else of the user (the user, 2026-10-18).
  The cleanup removes the git config pairs, the `autoMode` rule texts, the `CLAUDE.md` block, `promptCacheTtl: "5m"`, `env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1"`, and ten `permissions.ask` rules, only with the value that 0.1.0 wrote.
  The setup of `0.2.0` writes its snippet fresh, and the `CHANGELOG.md` says to run `/claudetto:setup` again.
- The version is `0.2.0`, with no pre-release suffix.
- The tag waits for the user's yes after the last gate, because a tag and a push are seen by others.

- Alternative: `0.2.0-beta.1`, then `0.2.0`.
  Rejected, because the user asks for a stable release now.
