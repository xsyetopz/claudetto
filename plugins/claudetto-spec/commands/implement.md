---
description: Implement the reviewed spec: failing tests citing requirement IDs, then code, then spec_check and the test run.
argument-hint: "[requirement IDs or note]"
disable-model-invocation: true
---

# Implement

Scope: $ARGUMENTS (empty: every requirement in `specs/` without a test citing its ID).

Read the specs in `specs/*.md` as they are now, with the code and tests they name, in one command that starts with `pwd` and `cat`s every file (Edit works on a file it showed, so never Read one again, and its absolute paths start with the directory `pwd` printed); the user may have edited them since they were written. The spec is the source of truth: implement it as written.

## Red

In one turn, write tests in the project's own framework, citing the requirement ID in each test name, and end it with one command that runs and stages them (`<test command>; git add <files>`), to see them fail before any implementation.

## Green

- Implement without editing staged tests or the spec.
- A requirement that narrows another (a cap, a limit, an exception) governs the inputs it names; the broader one covers the rest. This is the usual shape of a reviewer's edit, not a conflict.
- If no implementation can satisfy two requirements, or a staged test cannot pass honestly, change nothing: stop and report the conflict naming the requirement IDs.

## Check

- In the turn that makes the code edits, after them, call `spec_check` once and run the project's test command once; calls in one turn run in order, so both see the edits, and neither runs earlier or again.
- Then reply with both results.
