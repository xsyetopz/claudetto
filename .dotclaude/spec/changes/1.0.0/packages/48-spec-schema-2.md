---
id: P48
deps: []
owns: ["src/kernel/spec-store.ts", "src/plugins/dotclaude/slices/spec/domain/", "src/plugins/dotclaude/slices/spec/templates/", "src/plugins/dotclaude/slices/spec/limits.ts", "tests/kernel/spec-store.test.ts", "tests/dotclaude/spec/domain/", ".dotclaude/spec/changes/1.0.0/"]
verify: just check, and `dotclaude-spec validate 1.0.0` passes on the converted store
agent: main session
---

# P48 Spec Store Schema 2

## Goal

The store reads and checks the files, the requirement IDs, the states, and the events of schema 2, with no reader for schema 1.

## Context

- The design: `design-spec-2.md`, sections Files, Requirement IDs, Package States, Change States, and Events.
- The research: `docs/research/spec-driven/01-sdd-sources.md`, part D, items 1, 2, 4, 5, and 6.

## Steps

1. Set `SPEC_SCHEMA` to `2`, and replace `LANES` with the package states and the change states of the design.
2. Parse the front matter of each `kind`, and check each key of the Files table.
3. Parse `### REQ-<n>: <name>` headings, give the next free ID, and find each `[NEEDS CLARIFICATION: ...]` marker.
4. Write the transition table of each state as data in `domain/`, with the gate of each transition as a pure function.
5. Write the event type with the optional keys of the design, and the reader that stops on another schema.
6. Write the rule that the `status` key of a file must equal the state of its last event.
7. Convert `.dotclaude/spec/changes/1.0.0/` to schema 2 with a script under `tools/`, run it once, and delete the script.

## Acceptance

- Unit tests cover each transition, each gate, each front matter key, the ID rules, and the marker.
- The converted store passes `dotclaude-spec validate 1.0.0`, and each package keeps its state.

## Boundaries

- Do not change the CLI commands, because P49 owns them.
