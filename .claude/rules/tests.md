---
paths:
  - "tests/**"
  - "plugins/*/tests/**"
---

A test checks behavior: a decision, an exit status, a file, or a returned value.
Delete each test that checks the prose of the implementation, such as the wording of a prompt, a message, or a doc, instead of behavior (the user, 2026-10-26).
Write a behavior test in the Arrange-Act-Assert order where it fits: set up the input, make one call, then check the result (the user, 2026-10-26).
`tests/` has one folder for each plugin, with the unit tests of each module of the core plugin in `tests/claudetto/<module>/`, the tests of the repository rules in `tests/repo/`, the tests of `tools/` and `dev/` in `tests/tools/`, and the helpers in `tests/support/`.
The hook lab tests are in `plugins/claudetto/tests/`, the only folder of `plugins/` with tests, and `tools/check.ts` fails for a test file that runs 0 cases.
