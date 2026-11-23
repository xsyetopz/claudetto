---
type: llm
focus: last_message
weight: 1
---

# Gap Kinds

PASS if the reply reports STOCK-1 as having no test, STOCK-3 as a test that asserts nothing the requirement states (it checks only a type), STOCK-5 as missing the test for the failing-restock scenario, and STOCK-6 as having no implementing code, and reports none of STOCK-2, STOCK-4, STOCK-10 and STOCK-11 as a gap.
FAIL if any of the four is missing or mislabelled, or a covered requirement is reported as a gap.
