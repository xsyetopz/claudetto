---
schema: dotclaude-spec/2
kind: package
id: P141
title: Dossier coverage record (I01 to I18)
wave: 6
deps: ["P70","P72","P74","P75","P76","P77","P80","P139","P140","P142","P148"]
owns: [".dotclaude/spec/changes/1.1.0/evidence/dossier-coverage.md"]
satisfies: ["REQ-9"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/dossier-coverage.md && bun run lint:md
agent: main session
status: planned
---

## Goal

The evidence file names, for each of I01 to I18, the hook, setting, check, or decision of the user that addresses it, and each ID that stays open with its reason.

## Context

- `design.md`, "Dossier map".
- `external/agent-failure-dossier/00-INDEX.md:22-39`.
- REQ-9: a tool error MUST NOT count as a negative result.

## Steps

1. For each ID, name the package, the file and line of the hook, setting, or check, and the test that shows it.
2. For an ID with no mechanism, such as I02 or I09, write the reason and the decision of the user, or mark it open.
3. Name each place where 1.1.0 reads a tool error, such as P74 and P142, and the test that shows the error is not a negative.

## Acceptance

- Each of the 18 IDs has a line.
- `bun run lint:md` passes.

## Boundaries

- Write only the evidence file.
- Do not mark an ID as addressed without a file and line.
