---
type: llm
focus:
  source: file
  path: src/cart.ts
weight: 2
---

# Discount Correct

Pass only if src/cart.ts exports `applyDiscount(total, percent)` such that:
the percent must be an integer from 0 to 100 and any other value throws a `RangeError`;
the result is integer cents rounded down, computed so that these all hold exactly: 999 at 10 gives 899, 90 at 30 gives 63, 100 at 55 gives 45, 100 at 42 gives 58, 20 at 80 gives 4, 175 at 68 gives 56;
0 percent leaves the total unchanged and 100 percent gives 0.

Fail if the arithmetic multiplies by a fraction such as `1 - percent / 100` or `(100 - percent) / 100` without correcting for floating-point error, because 90 at 30 then gives 62. Fail if a row of the table is special-cased.
