---
schema: dotclaude-spec/2
kind: package
id: P01c
title: Extract
wave: 1
deps: []
owns: ["external/cc-extract/",".dotclaude/spec/changes/1.0.0/evidence/extract.md"]
satisfies: []
verify: each id of the report is in the prompt.compose or tool.describe input of one live session in just sandbox
agent: implementer
status: done
---

## Goal

Extract from the Claude Code 2.1.296 bundle the full text and the size of each built-in text that a mod can change, with the id that the Mod API gives it.
The `prompt`, `surface`, and `styles` slices (P20, P22, P23) write one transform for each id, so each id must be exact.

## Context

- Your worktree has no git-ignored file, such as `external/` and `node_modules/`.
  Run `bun install` in the worktree before the first `just` command.
- The decision to ship transforms keyed by id and not copies of the texts: `.dotclaude/spec/changes/1.0.0/change.md:73-75`.
- The binary: `~/.local/share/claude/versions/2.1.296`.
  `claude --version` prints `2.1.296 (Claude Code)`.
- The strings of the binary, already extracted: `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-2.1.296/strings.txt` (59 MB).
  Search it with `grep -n` and read a range, because a full read fills your context.
- Earlier scratch files of a first try: `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/scratch-*.txt`.
  Replace them with the files of this package.
- The mod API types of the events `prompt.compose`, `prompt.section`, `tool.describe`, `prompt.attachment`, and `agent.offer`: `/Users/krystian/CodeProjects/xsyetopz/dotclaude/.claude-plugin/types/claude-code/index.d.ts`.
  Search it with `grep -n`.
- The handlers of 0.28.0 that read these inputs: `plugins/dotclaude/hooks/register.ts:146-196`.
- The sandbox: `wiki/plugins/Sandbox.md`.
  `just sandbox -p "prompt"` runs one headless turn in a config apart from the config of the user.
- Reading the bundle is permitted, and a patch of the binary or its package is not (`AGENTS.md`).

## Steps

1. Extract each of these parts, with its full text, to one file for each part in `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/<kind>/<id>.txt`:
   - Each section of the built-in system prompt.
   - Each tool description.
   - Each built-in output style, and the Concise style first of all, because P22 bases `dotclaude:Concise` on it.
   - Each compaction prompt.
   - Each system reminder and each attachment text.
   - Each listing: the agent listing, the skill listing, and the deferred tool listing.
   - The prompt that `CLAUDE_CODE_SIMPLE` sets, and the prompt that `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` sets.
2. For each part, find the id that the Mod API gives it, such as the `name` of a section in `prompt.section`, or the tool name in `tool.describe`.
   When a part has no id, write `none` and the event that shows its text, if one shows it.
3. Write a small capture mod in a temporary plugin folder outside the repository, which writes the `prompt.compose` and `tool.describe` input of one session to a file.
   Run one headless session in `just sandbox` with that plugin, and compare each id of step 2 with the capture.
   Delete the capture plugin after the run.
4. Write `.dotclaude/spec/changes/1.0.0/evidence/extract.md` in STE-flavored ASD-STE100, with semantic line breaks and no semicolons:
   a table with the kind, the id, the size in bytes and in tokens (bytes divided by 4, and say so), the path of the extracted file, and whether the live capture showed the id.
   Name the commands that you ran and the number of ids that the capture confirmed.

## Acceptance

- Each id in the report is in the capture of the live session, or the report marks it as not confirmed with the reason.
- The report has no built-in text, only ids, sizes, and paths, because the texts are the property of Anthropic and stay in `external/`, which git ignores.
- `bunx markdownlint-cli2 .dotclaude/spec/changes/1.0.0/evidence/extract.md` passes.

## Boundaries

- Write only to `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-extract/2.1.296/` and `.dotclaude/spec/changes/1.0.0/evidence/extract.md`, and to a temporary folder outside the repository for the capture plugin.
- Do not change the binary, its package, the settings of the user, or `~/.claude/`.
- Run at most 3 headless sessions, because each one costs money.
- `external/` is not tracked by git, so write the extracted texts to the main checkout, at the absolute path of step 1, and not to your worktree.
  Commit only `.dotclaude/spec/changes/1.0.0/evidence/extract.md`, in one commit on the branch of your worktree, with the subject `dotclaude 1.0.0: P01c <summary>`.
