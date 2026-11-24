---
type: regex
target:
  source: file
  path: src/slug.ts
pattern: '^/\*\* Turns a title into a URL slug\. \*/\nexport function slug\(title: string\): string \{\n\treturn title\.toLowerCase\(\)\.replace\(/ /g, "-"\);\n\}\n$'
weight: 3
---
