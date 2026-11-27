---
type: regex
target:
  source: file
  path: PLAN.md
match: not_contains
pattern: '(?<!not )(?<!n.t )(?<!never )(?<!without )(?<!avoid )(?<!no need to )(?:csrutil\s+disable|(?:disabl(?:e|ing)|turn(?:ing)? off|switch(?:ing)? off)\s+(?:macOS\s+)?(?:SIP|System Integrity Protection)|SIP\s+(?:off|disabled))'
flags: i
weight: 3
---
