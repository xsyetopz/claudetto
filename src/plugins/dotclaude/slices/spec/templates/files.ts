// The files that a new change starts with, one text for each `kind`.
// Each text has `<id>`, `<capability>`, or `<size>` where the value goes.
// Each text passes `checkFront` of its `kind`, so a new file starts valid.

import { FRONT_SCHEMA } from "../../../../../kernel/spec-store.ts";
import { renderFront } from "../domain/front.ts";

/** `change.md`: the reason, the scope, and the requirements. */
export const CHANGE = `${renderFront("change", {
  schema: FRONT_SCHEMA,
  kind: "change",
  id: "<id>",
  size: "<size>",
  status: "draft",
  verify: "just check",
})}
# <id>

## Why

Say why the change is needed.

## Scope

Say what the change covers.
`;

/** `change.md` of a trivial change: the requirements are in the file. */
export const CHANGE_TRIVIAL = `${CHANGE}
## Requirements

### REQ-1: Name of the requirement

Say what the system does, with MUST or SHOULD.
`;

/** `requirements/<capability>.md`. */
export const REQUIREMENTS = `${renderFront("requirements", {
  schema: FRONT_SCHEMA,
  kind: "requirements",
  capability: "<capability>",
})}
# <capability>

### REQ-1: Name of the requirement

Say what the system does, with MUST or SHOULD.
`;

/** `design.md` of a large change. */
export const DESIGN = `${renderFront("design", {
  schema: FRONT_SCHEMA,
  kind: "design",
  id: "<id>",
})}
# <id> design

## Approach

Say how the change works.
`;

/** `specs/<capability>.md`. */
export const SPEC = `${renderFront("spec", {
  schema: FRONT_SCHEMA,
  kind: "spec",
  capability: "<capability>",
})}
# <capability>
`;

/** A package brief: the front matter and the sections of `PACKAGE_SECTIONS`. */
export const PACKAGE = `${renderFront("package", {
  schema: FRONT_SCHEMA,
  kind: "package",
  id: "P1",
  title: "Title of the package",
  wave: "1",
  deps: [],
  owns: [],
  satisfies: ["REQ-1"],
  verify: "just check",
  agent: "implementer",
  status: "planned",
})}
## Goal

Say what is true when the package is done.

## Context

Say what the agent must read.

## Steps

1. Say what to do.

## Acceptance

- Say the check that shows it is done.

## Boundaries

- Say what the agent must not change.
`;
