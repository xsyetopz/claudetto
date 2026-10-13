# Release 0.11

This page records the notes of the `0.11` release.

Released 2026-09-29.
Subagents moved to Sonnet 5.5, and the context bounds got tighter.
Cost data from 2026-09-28 and 2026-09-29 drove the new bounds.
A version in parentheses marks a later patch of this line.
An entry with no version comes from 0.11.0.

> **Note:** This line requires Claude Code 2.1.284 or later.
> Claude Code 2.1.284 is the first release with Sonnet 5.5.
> After you update, run `claude update` if needed.
> Restart Claude Code.
> Then run `/dotclaude:apply-settings-profile` again.

## Added

- Version notice: session start tells the user when Claude Code is older than 2.1.284.
  It reads `claude --version` of the running binary and says to run `claude update`.

## Changed

- Main compaction point: the settings profile compacts at 150k tokens, not 200k.
  The system prompt, the session notes, and the status line use the same handoff point.
  From 2026-09-28 to 2026-09-29, main-conversation calls past 150k were 13% of the cost.
- Subagent bound: Claude Code refuses a subagent tool call past 100k tokens of context, not 150k.
  - With the 150k bound, 34 of 69 `implementer` runs still passed 100k.
    Subagent calls from 100k to 150k were 9% of the cost.
  - `code-reviewer`, `security-reviewer`, and `plan-reviewer` keep 150k.
    A split review loses the view across files, and it writes that view to the cache again.
  - The injected context budget and the subagent status line row show the bound of each agent.
- `implementer` slices: the system prompt and the `implementer` description ask for one small slice for each `implementer`.
  Larger work goes to new agents.
- Sonnet 5.5 (`claude-sonnet-5-5`): replaces Sonnet 5 everywhere, at the same prices.
  - This covers the `implementer`, `docs-writer`, and `mechanical-worker` agents.
    It covers the profile's `CLAUDE_CODE_SUBAGENT_MODEL` and `availableModels`.
    It also covers the managed drop-in and the default `allowed_models`.
  - Applying the profile again removes `claude-sonnet-5` from `availableModels`.
  - A user who set `allowed_models` must replace `claude-sonnet-5` with `claude-sonnet-5-5`.
- `mechanical-worker`: runs at `medium` effort, not `low`.
  Anthropic recalibrated the effort levels of Sonnet 5.5 and gives `medium` as the start for well-specified agentic coding.
  At `low`, the agent sometimes reported a change as done with no check.
- `test-runner`: runs on Haiku 4.5, not Sonnet 5 at `low` effort.
  It runs one command and copies the failure lines.
  That task needs no judgment.
  Haiku costs half as much per token.
  It starts without `CLAUDE.md`.
  It starts without the CodeGraph MCP tool.
  Its report copies each error line exactly.
- Sonnet 5.5 reminder (0.11.0, 0.11.1): the reminder for `implementer`, `docs-writer`, and `mechanical-worker` has more rules.
  - A real check must come before a report that a code change is done.
    A syntax-only check, or a command that did not start, does not count.
  - The agent writes only in the files that the brief names.
    It puts scratch files in the system temp folder.
    It reports defects outside the brief instead of fixing them.
  - In one user test of 35 bug-fix tasks, both models fixed 34.
    Sonnet 5.5 wrote outside its assigned folder 4 times and Opus 5.5 0 times.
- Model docs (0.11.1): `docs/models.md` and the dossier page that is now [Usage Evidence](Usage-Evidence) gave this reason.
  Version 0.20.0 removed `docs/models.md`.
  They also give the reported cost data.
  Sonnet 5.5 costs less for each task than Opus 5.5 only at `low` and `medium` effort.
  This is why the Sonnet 5.5 agents stay at `medium`.

## Fixed

- CHANGELOG link (0.11.1): the `[unreleased]` compare link at the end of the CHANGELOG starts from the latest release, not 0.8.1.
  `just bump` now moves it to the new version.

## Related Pages

- Previous: [Release 0.10](Release-0.10)
- Next: [Release 0.12](Release-0.12)
- [Archive](Archive): the index of the archived pages.
