---
type: regex
target:
  source: file
  path: src/paginate.limit.test.ts
pattern: '^import \{ expect, test \} from "bun:test";\nimport bulk from "\./fixtures/bulk\.json";\nimport limits from "\./fixtures/limits\.json";\nimport \{ clampLimit \} from "\./paginate";\n\ntest\.each\(limits as \[number, number\]\[\]\)\(\n\t"PAGE-2 a limit of %i clamps to %i",\n\t\(limit, want\) => \{\n\t\texpect\(clampLimit\(limit\)\)\.toBe\(want\);\n\t\}\n\);\n\ntest\(`PAGE-2 a \$\{bulk\.name\} limit clamps to the bulk maximum`, \(\) => \{\n\texpect\(clampLimit\(bulk\.limit\)\)\.toBe\(bulk\.want\);\n\}\);\n$'
weight: 3
---
