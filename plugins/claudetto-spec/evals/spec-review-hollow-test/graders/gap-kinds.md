---
type: llm
focus: last_message
weight: 1
---

# Gap Kinds

PASS if the reply reports STOCK-2 as a test that cites the ID but asserts nothing about it (for example `expect(true)`), STOCK-3 as a scenario without a test (the release-too-many scenario), and STOCK-4 as a requirement with no implementing code, and does not report STOCK-1 as a gap.
FAIL if any of those three is missing or mislabelled, or STOCK-1 is reported as a gap.
