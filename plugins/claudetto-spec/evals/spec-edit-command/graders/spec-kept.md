---
type: regex
target:
  source: file
  path: specs/cart.md
pattern: '^# Cart\n\n## DISC-1 Percentage discount\n\n`applyDiscount\(total, percent\)` returns the total minus `percent` percent, in integer cents rounded down; `percent` is a whole number from 0 to 100\.\n\nGiven a total of 999 cents\nWhen a 10 percent discount applies\nThen the total is 899\n\nGiven a total of 1000 cents\nWhen a 7 percent discount applies\nThen the total is 930\n\n## DISC-2 Discount cap\n\nA percent above 50 applies as 50\.\n\nGiven a total of 999 cents\nWhen a 60 percent discount applies\nThen the total is 499\n\n## DISC-3 Smallest charge\n\nA discounted total of a cart worth at least 1 cent is never below 1 cent\.\n\nGiven a total of 1 cent\nWhen a 50 percent discount applies\nThen the total is 1\n\nGiven a total of 0 cents\nWhen a 50 percent discount applies\nThen the total is 0\n$'
weight: 2
---
