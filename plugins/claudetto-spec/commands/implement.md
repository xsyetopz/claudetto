---
description: Implement the reviewed spec: failing tests citing requirement IDs, then code, then spec_check and the test run.
argument-hint: "[requirement IDs or note]"
disable-model-invocation: true
---

# Implement

Scope: $ARGUMENTS (empty: every requirement in `specs/` without a test citing its ID).

Read the specs in `specs/*.md` as they are now; the user may have edited them since they were written. The spec is the source of truth: implement it as written.

## Red

1. Write tests in the project's own framework; cite the requirement ID in the test name.
2. Run them and see them fail.
3. `git add` the test files in a call of their own, and confirm they are staged before writing implementation.

## Green

- Implement without editing staged tests or the spec.
- A requirement that narrows another (a cap, a limit, an exception) governs the inputs it names; the broader one covers the rest. This is the usual shape of a reviewer's edit, not a conflict.
- If no implementation can satisfy two requirements, or a staged test cannot pass honestly, change nothing: stop and report the conflict naming the requirement IDs.

## Check

- Load `spec_check` through ToolSearch (deferred) and call it.
- Run the project's test command.
- Report both results.
