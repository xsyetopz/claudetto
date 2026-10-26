---
paths:
  - "tests/**"
  - "plugins/*/tests/**"
---

`tests/` has one folder for each plugin, and `tests/claudetto/<module>/` holds the unit tests of each module of the core plugin.
`tests/repo/` holds the tests of the rules of the repository, `tests/tools/` the tests of `tools/` and `dev/`, and `tests/support/` the helpers.
The hook lab tests are in `plugins/claudetto/tests/`, and no other folder of `plugins/` holds a test.
`tools/check.ts` fails for a test file that runs 0 cases.
