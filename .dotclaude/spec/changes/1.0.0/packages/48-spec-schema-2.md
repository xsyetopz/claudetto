---
id: P48
deps: []
owns: ["src/kernel/spec-store-2.ts", "src/plugins/dotclaude/slices/spec/domain/v2/", "src/plugins/dotclaude/slices/spec/templates/v2.ts", "src/plugins/dotclaude/slices/spec/limits.ts", "tests/kernel/spec-store-2.test.ts", "tests/dotclaude/spec/v2/"]
verify: just check
agent: main session
---

# P48 Spec Store Schema 2

## Goal

The model of schema 2 exists next to schema 1: the files, the requirement IDs, the states with their gates, and the events.
P49 switches the CLI to it, converts the store of this repository, and removes schema 1, so each package ends with `just check` green.

## Context

- The design: `design-spec-2.md`, sections Files, Requirement IDs, Package States, Change States, and Events.
- The research: `docs/research/spec-driven/01-sdd-sources.md`, part D, items 1, 2, 4, 5, and 6.

## Steps

1. In `src/kernel/spec-store-2.ts`, set the schema `2`, and define the package states and the change states of the design.
2. Parse the front matter of each `kind`, and check each key of the Files table.
3. Parse `### REQ-<n>: <name>` headings, give the next free ID, and find each `[NEEDS CLARIFICATION: ...]` marker.
4. Write the transition table of each state as data in `domain/`, with the gate of each transition as a pure function.
5. Write the event type with the optional keys of the design, and the reader that stops on another schema.
6. Write the rule that the `status` key of a file must equal the state of its last event.
7. Write the pure conversion of a schema 1 change to schema 2, which P49 runs on the store of this repository.

## Acceptance

- Unit tests cover each transition, each gate, each front matter key, the ID rules, and the marker.
- A test converts a fixture of schema 1 to schema 2, and each package keeps its state.
- The code of schema 1 has no change.

## Boundaries

- Do not change the CLI commands or the code of schema 1, because P49 owns the switch.
