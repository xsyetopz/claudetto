---
type: llm
target: trace
focus: the last run of the test command and its output
---

# Tests Pass

Pass only if the trace shows a test run (bun test) after the last change to src/cart.ts or
src/cart.test.ts, and that run reports zero failures. Fail if no test run follows the last edit
or the last run reports a failure.
