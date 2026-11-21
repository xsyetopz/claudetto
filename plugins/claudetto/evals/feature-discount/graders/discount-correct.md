---
type: llm
target:
  source: file
  path: src/cart.ts
weight: 3
---

# Discount Correct

Pass only if src/cart.ts exports a way to apply a percentage discount to the cart total such that:
the percent is an integer from 0 to 100 and other values are rejected (thrown error or equivalent);
the result is integer cents rounded down (for example 999 cents at 10% gives 899, 1 cent at 50% gives 0);
0% leaves the total unchanged and 100% gives 0. Fail if any of these is wrong or missing.
