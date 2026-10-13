---
schema: dotclaude-spec/2
kind: package
id: P54
title: Safe Import Change in a Test File
wave: 10
deps: []
owns: ["src/plugins/dotclaude/slices/asks/","tests/dotclaude/asks/"]
satisfies: []
verify: just check && just lab
agent: main session
status: doing
---

## Goal

The `asks` guard does not ask on an edit of a test file that only adds names to an import (the user, 2026-10-13).

## Context

- `asks/domain/testdiff.ts`: "No line may change or go away", so a changed import line asks.
- A sandbox session of P51 stopped on `import { add } from "./math.ts"` to `import { add, mul } from "./math.ts"`, because a headless run cannot answer an ask.

## Steps

1. Add to the safe changes of a test file: an import line that keeps each name and module of the line before it, and only adds names.
2. Keep the ask for an import that removes or renames a name, changes the module, or adds a mock, such as `mock.module`.

## Acceptance

- Tests cover the safe import change in TypeScript, JavaScript, and Python, and each kind of change that still asks.

## Boundaries

- Do not change the other safe changes of `testdiff.ts`.
