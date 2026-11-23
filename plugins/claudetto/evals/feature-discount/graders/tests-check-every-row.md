---
type: llm
focus:
  source: file
  path: src/cart.test.ts
weight: 1
---

# Tests Check Every Row

Pass only if src/cart.test.ts keeps the two original tests and adds a test that reads `fixtures/discounts.csv` at run time, parses every data row into numbers, and asserts `applyDiscount(total, percent)` equals the expected value for each row, so that a row left out or parsed to nothing would make the test fail or would be noticed (for example by asserting the row count). It must also test a rejected percent (negative, above 100, or not a whole number).

Fail if the table's values are copied into the test instead of read from the file, if any row is skipped, or if the loop can pass with zero rows.
