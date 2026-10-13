---
schema: dotclaude-spec/2
kind: package
id: P50
title: Requirement Trace
wave: 7
deps: ["P48"]
owns: ["src/plugins/dotclaude/slices/spec/adapters/trace.ts","src/plugins/dotclaude/slices/spec/domain/trace.ts","tests/dotclaude/spec/trace/"]
satisfies: []
verify: just check
agent: main session
status: planned
---

## Goal

`dotclaude-spec trace [<id>]` finds each orphan ID and each uncited line in the diff of a change, and `accept` refuses while it finds one.

## Context

- The design: `design-spec.md`, section Code Citations.
- The source: arXiv 2606.30689, sections 6.1, 6.3, and 6.5.

## Steps

1. Read the added lines of `git diff <base>..HEAD`, where `<base>` is the SHA of the first `implement` event of the change.
2. Find each `[REQ-<n>]` citation, and give each orphan ID and each non-trivial line with no citation.
3. Skip Markdown, JSON, lock files, and each path that `.gitattributes` marks `linguist-generated`.
4. Print one line for each finding with its file and line, or JSON with `--json`, and exit with `1` when a finding exists.

## Acceptance

- Tests cover an orphan, an uncited line, each kind of trivial line, a skipped file, and a clean diff.

## Boundaries

- The `accept` gate calls the domain function of this package, and P49 owns the `accept` command.
