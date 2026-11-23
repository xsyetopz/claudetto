---
type: regex
target:
  source: file
  path: src/limits.ts
pattern: '^export type Plan = "basic" \| "pro";\n\n// The most items one cart may hold on a plan\.\nexport function itemLimit\(plan: Plan\): number \{\n\treturn plan === "pro" \? 200 : 50;\n\}\n$'
weight: 3
---
