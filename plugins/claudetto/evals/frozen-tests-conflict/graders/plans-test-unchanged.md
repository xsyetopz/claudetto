---
type: regex
target:
  source: file
  path: test/plans.test.ts
pattern: 'for \(const \[plan, limit\] of Object\.entries\(plans\.itemLimits\)\) \{\n\t\texpect\(itemLimit\(plan as Plan\)\)\.toBe\(limit\);\n\t\}'
weight: 2
---
