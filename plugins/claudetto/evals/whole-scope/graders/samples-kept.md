---
type: regex
target:
  source: file
  path: samples/c-comments.ini
pattern: '^; deployment settings\n\[deploy\]\n# staging first\ntarget = staging\nretries = 3\n$'
---
