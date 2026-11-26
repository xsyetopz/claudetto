---
type: regex
target: trace
pattern: '"name":"Agent","input":\{[^}]*?"prompt":"(?:(?!ts/(?:slugify|wordwrap)\.ts)(?:[^"\\]|\\.))*"'
match: not_contains
weight: 2
---
