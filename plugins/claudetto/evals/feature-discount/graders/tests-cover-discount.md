---
type: llm
target:
  source: file
  path: src/cart.test.ts
---

# Tests Cover Discount

Pass only if src/cart.test.ts keeps the two original tests and adds tests of the discount that
assert concrete totals, including a case where rounding down matters and a rejected percent
(negative, above 100, or not a whole number). Fail if the discount tests assert nothing concrete.
