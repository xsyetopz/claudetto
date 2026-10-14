---
schema: dotclaude-spec/2
kind: package
id: P40
title: `dcc-plugin-agents-md`
wave: 4
deps: []
owns: ["src/plugins/dcc-plugin-agents-md/","tests/dcc-plugin-agents-md/","the dcc-plugin-agents-md entry of .claude-plugin/marketplace.json","src/wiki/add-ons/Agents-Md.md","evidence/agents-md.md"]
satisfies: []
verify: just check && just lab
agent: implementer
status: done
---

## Goal

A new add-on plugin, `dcc-plugin-agents-md`, gives `AGENTS.md` the same support as `CLAUDE.md`, in each place where Claude Code loads `CLAUDE.md`.
It replaces the built-in `cc-plugin-agents-md`, which stays off, and it costs no more tokens than the same text in `CLAUDE.md`.

## Context

- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-13.
- The built-in `cc-plugin-agents-md` of Claude Code 2.1.296 (bundle `~/.local/share/claude/versions/2.1.296`, near byte 223044334):
  - Its setting `instructionFiles` has the values `claude-md`, `claude-md-or-agents-md` (default), `claude-md-and-agents-md`, and `managed-only`.
  - It loads `AGENTS.md` and `.claude/AGENTS.md` only.
    It has no `AGENTS.local.md`, no `~/.claude/AGENTS.md`, and no `--add-dir` folders.
  - It loads nested files on `tool.call` for `Read` and on `prompt.mention`, and not for a `Bash` read such as `cat`.
  - It dedupes by path and by the same trimmed text.
  - Each module ends with "(c) Anthropic PBC.
    All rights reserved.", so this package copies no code of it.
- The places of `CLAUDE.md` (<https://code.claude.com/docs/en/memory>):
  managed policy, `~/.claude/CLAUDE.md`, `CLAUDE.md` or `.claude/CLAUDE.md` in each ancestor of the cwd, `CLAUDE.local.md`, nested folders on demand, and `--add-dir` folders with `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`.
  `@` imports resolve relative to the file, nest to 4 hops, and need approval outside the project.
  `claudeMdExcludes` excludes files by absolute-path glob.
  At compaction, the root files are read again from disk, and the nested files load again on demand.
- The mods API (`plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`): `prompt.context` (line 4182) edits the blocks and `instructionFiles`, `tool.call` (3962), `prompt.mention` (4217), `fs.ancestors` (7093), and `fs.read` (7059).
- An add-on imports nothing from another plugin (`.claude/rules/plugin-imports.md`).

## Steps

1. Find out, with sources, and write the findings to `.dotclaude/spec/changes/1.0.0/evidence/agents-md.md`:
   - whether an `instructionFiles` entry that a plugin adds in `prompt.context` gets the same label, cache, compaction, and `@` import handling as a `CLAUDE.md` file
   - whether `claudeMdExcludes` applies to it
   - the token cost of one `AGENTS.md` at the start and on each later turn, measured with `just measure` or `dotclaude-capture`
2. The plugin, for each place of `CLAUDE.md`, loads the matching file:
   - `~/.claude/AGENTS.md`
   - `AGENTS.md` and `.claude/AGENTS.md` in each ancestor of the cwd, in the order of `CLAUDE.md`
   - `AGENTS.local.md`
   - nested folders, when Claude reads or changes a file there with `Read`, `Edit`, `Write`, or a `Bash` read, or mentions it
   - `--add-dir` folders, under `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`
   - `@` imports in an `AGENTS` file, with the rules of `CLAUDE.md`, if step 1 shows that Claude Code does not resolve them
3. No file loads twice: a file that a `CLAUDE` file links to or imports, or that has the same text as a loaded file, is skipped.
   `claudeMdExcludes` applies to the `AGENTS` files too.
4. Tests: a lab test for each place, the skip of a link, an import, and the same text, an excluded file, and a nested file read with `Bash`.
5. Docs: a wiki page of the add-on, the add-on list in `AGENTS.md`, `README.md`, and `src/wiki/dotclaude/Architecture.md`, and a `CHANGELOG.md` entry under `[Unreleased]`.

## Acceptance

- `just check` and `just lab` pass.
- In `just sandbox`, with `cc-plugin-agents-md@builtin` off, one session loads each supported `AGENTS` file once.
- The text of an `AGENTS` file costs no more tokens than the same text in `CLAUDE.md`, by the measure of step 1.

## Boundaries

- Do not copy code or text of the built-in plugin.
- Do not import from another plugin.
- Do not add an env var.
- Do not write or change a file of the user.
