---
schema: dotclaude-spec/2
kind: package
id: P72
title: Release state as a hook (I01)
wave: 3
deps: []
owns: ["src/plugins/dotclaude/slices/release/","tests/dotclaude/release/"]
satisfies: ["REQ-9"]
verify: just test tests/dotclaude/release && just lab
agent: implementer
status: planned
---

## Goal

Claude gets the release state of the repository from a hook, not from a prompt rule: the version of the manifests, whether its tag exists, and the CHANGELOG section that takes new entries.

## Context

- The I01 row of `external/agent-failure-dossier/00-INDEX.md`: "Inject the derived project state deterministically (hook or script)".
  Its section is in `01-grounding-and-memory.md`.
- The rule of `CLAUDE.md`: entries go under the version of the manifests when it has no tag, else under `[Unreleased]`.
- The tag format: `<plugin>--v<version>`, such as `dotclaude--v1.0.0`.

## Steps

1. Read the I01 section, and cite it in the header comment of `slice.ts`.
2. At `SessionStart`, in a repository with a `CHANGELOG.md`, add one line of context: the version, the tag state, and the section for new entries.
   Find the version and the tags with `$.fs` and `$.process.run` on `git tag --list`.
3. On an `Edit` or `Write` of `CHANGELOG.md`, add a note when a new entry goes under a section whose version has a tag.
4. A repository with no manifest or no `CHANGELOG.md` gets nothing.
5. Tests: a tagged version, an untagged version, no `CHANGELOG.md`, and an entry under a tagged section.

## Acceptance

- `just test tests/dotclaude/release` and `just lab` pass.

## Boundaries

- No model call, and no deny.
- Do not run `git tag` with an argument that changes a tag.
