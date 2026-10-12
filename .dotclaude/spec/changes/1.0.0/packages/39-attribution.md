---
id: P39
deps: [P33]
owns: ["src/plugins/dotclaude/slices/attribution/", "tests/dotclaude/attribution/", "src/plugins/dotclaude/slices/surface/texts.ts/tool-bash.md"]
verify: just check, just lab, and one commit and one PR body in just sandbox that carry the attribution
agent: implementer
---

# P39 Attribution

## Goal

Each commit and each pull request that Claude makes carries the attribution of Claude Code, at 0 model tokens.
A hook adds it, so it does not depend on prompt text.

## Context

- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-13.
- The snippet sets `attribution.commit` and `attribution.pr` (`src/plugins/dotclaude/slices/prompt/slice.ts`).
- The `trim` slice sets `includeGitInstructions: false`, so the git text of Claude Code, which tells Claude to add those lines, is not in the prompt.
  `surface/texts.ts/tool-bash.md` tells Claude to copy the lines of the system-reminder, but no system-reminder holds them.
  No commit of the 189 commits from `dotclaude-1-0-0` to `p15` carries a `Co-Authored-By` trailer.
- The `sembr` slice already rewrites the quoted heredoc of `git commit` and `gh pr create` in a `Bash` `tool.call` hook (`slices/sembr/domain/rewrite.ts`).
- `git commit --trailer "<line>"` adds a trailer to a message from `-m`, `-F`, or a heredoc.
  With the default `trailer.ifexists` of `addIfDifferentNeighbor`, the same trailer next to itself is not added again.
- The text of the attribution names a model.
  The snippet names `Claude Opus 5.5`, but a subagent can run on Sonnet or Haiku.

## Steps

1. Find out, with sources: whether a `tool.call` handler can read the resolved `attribution` settings and the model of the session or of the subagent that makes the call (`src/kernel/ports.ts`, the binary facts in `external/cc-2.1.296/`), and what Claude Code writes when `attribution` is not set.
   Write the findings to `.dotclaude/spec/changes/1.0.0/evidence/attribution.md`.
2. The `attribution` slice of the core plugin, on `tool.call` for `Bash`:
   - A `git commit` call that makes a commit gets `--trailer "<attribution.commit>"`, unless its message already holds that line.
   - A `gh pr create` call with a `--body` gets the `attribution.pr` line at the end of the body, unless the body already holds it.
   - An empty `attribution.commit` or `attribution.pr` turns that part off, as in Claude Code.
   - If the hook can read the model of the call, the line names that model.
     Otherwise it uses the setting as it is, and the evidence file says so.
   - A call that the hook cannot parse runs unchanged.
3. Remove the attribution rule from `tool-bash.md`, because the hook does the work.
4. Tests: a lab test for `-m`, `-F`, a heredoc, `--amend`, a message that already holds the line, an empty setting, `gh pr create` with a body, and a call that is not a commit.
5. Docs: one line on the slice in `src/wiki/dotclaude/Architecture.md`, and a `CHANGELOG.md` entry under `[Unreleased]`.

## Acceptance

- `just check` and `just lab` pass.
- In `just sandbox`, one commit and one PR body made by Claude carry the attribution lines.
- No prompt text is added.

## Boundaries

- Do not rewrite the history of a branch to add trailers to old commits.
- Do not install a git hook in the repository of the user.
- Do not add an env var.
