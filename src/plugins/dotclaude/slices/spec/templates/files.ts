// The files that `dotclaude-spec new` writes for each size.
// Each template has `<id>` where the id of the change goes.
// Each template passes the checks of `dotclaude-spec validate`, so a new change starts valid.

/** `change.md` of a trivial change: the reason and the tasks. */
export const CHANGE_TRIVIAL = `# <id>

## Why

Say why the change is needed.

## Tasks

- [ ] T1 Say what to do.
  Verify: say the command or the test that shows it is done.
`;

/** `change.md` of a medium or large change. */
export const CHANGE = `# <id>

## Why

Say why the change is needed.

## Scope

Say what the change covers.

## Tasks

- [ ] T1 Say what to do.
  Verify: say the command or the test that shows it is done.
`;

/** The delta file of one capability. The delta parser allows no prose outside a section, so the user renames the file to the capability and edits the requirement. */
export const DELTA = `# Capability

## ADDED

### Requirement: Name of the requirement
The system SHALL say what it does.

#### Scenario: Name of the scenario
- **WHEN** say what happens
- **THEN** say what the system does
`;

/** `design.md` of a large change. */
export const DESIGN = `# <id>: design

## Context

Say what is true now.

## Decisions

Say what the change does, and why.

## Risks

Say what can go wrong.
`;

/** The first package of a large change. */
export const PACKAGE = `---
id: P01
deps: []
owns: ["src/"]
verify: just check
agent: implementer
---

# P01 Name of the package

## Goal

Say what the package builds.

## Context

- Say which files the agent reads, with \`file:line\` references.

## Steps

1. Say the first step.

## Acceptance

- Say the check that must pass.

## Boundaries

- Change only the paths of \`owns\`.
`;

/** The list of packages of a large change. */
export const PACKAGES = `# <id> packages

## Wave 1

- [ ] P01 Name of the package.
`;

/** The record of a hotfix. */
export const HOTFIX = `# Hotfix: <text>

Date: <date>
`;
