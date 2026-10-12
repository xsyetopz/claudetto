// Fixtures of the Markdown formats of the spec store: one text for each format.
// The texts follow the shape of the real files of `.dotclaude/spec/changes/1.0.0/`.

export const SPEC_TEXT = `# Kernel Specification

## Purpose

The kernel holds the shared code.

## Requirements

### Requirement: Spec store reader
The reader SHALL give the state of one change.

#### Scenario: Known schema
- **WHEN** the file has schema 1
- **THEN** the reader gives the state

#### Scenario: Unknown schema
- **WHEN** the file has schema 2
- **THEN** the reader stops with an error that names the file

### Requirement: Lane names
WHILE a package is open, the lane SHALL be one of planned, doing, review, blocked.

#### Scenario: Lane is set
- **WHEN** the main session moves a package
- **THEN** the lane of the package changes
`;

export const DELTA_TEXT = `# Spec Store Specification

## ADDED

### Requirement: Change archive
The archive SHALL move a change to the archive folder.

#### Scenario: Archive moves the change
- **WHEN** the change is applied
- **THEN** the change is in the archive folder

## MODIFIED

### Requirement: Spec store reader
The reader SHALL give the state of one change, or an error.

#### Scenario: Known schema
- **WHEN** the file has schema 1
- **THEN** the reader gives the state

## REMOVED

### Requirement: Lane names

## RENAMED

- FROM: Old name
- TO: New name
`;

export const TASKS_TEXT = `# Tasks

- [ ] 1.1 Write the parser
  Verify: \`just test tests/dotclaude/spec/domain\`
- [x] 1.2 Write the rules
  Verify: \`just check\`
`;

export const PACKAGE_TEXT = `---
id: P02
deps: []
owns: ["src/plugins/dotclaude/slices/spec/domain/", "tests/dotclaude/spec/domain/"]
verify: just test tests/dotclaude/spec/domain
agent: implementer
---

# P02 Spec formats

## Goal

Write the pure domain code.

## Context

- The formats: \`.dotclaude/spec/changes/1.0.0/workflow.md:3-43\`.

## Steps

1. Write the parser.

## Acceptance

- The tests pass.

## Boundaries

- Change only the domain folder.
`;

/** Replaces one line of `PACKAGE_TEXT` whose text starts with `prefix`. */
export const withLine = (text: string, prefix: string, line: string): string =>
  text
    .split("\n")
    .map((l) => (l.startsWith(prefix) ? line : l))
    .join("\n");

/** A package text of `PACKAGE_TEXT` with its id, deps, and owns entries replaced. */
export const packageText = (
  id: string,
  deps: string[] = [],
  owns: string[] = ["src/x/"],
): string =>
  withLine(
    withLine(
      withLine(PACKAGE_TEXT, "id:", `id: ${id}`),
      "deps:",
      `deps: [${deps.join(", ")}]`,
    ),
    "owns:",
    `owns: [${owns.map((o) => `"${o}"`).join(", ")}]`,
  );

/** The value of a parse that must pass; a failed parse throws, so the test stops there. */
export const must = <T>(
  r: { ok: true; value: T } | { ok: false; errors: unknown[] },
): T => {
  if (!r.ok) {
    throw new Error(`the parse failed: ${JSON.stringify(r.errors)}`);
  }
  return r.value;
};
