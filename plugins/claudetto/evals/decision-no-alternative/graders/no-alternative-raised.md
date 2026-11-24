---
type: regex
target: last_message
pattern: '\binstead\b|i.d recommend|i would recommend|\balternativ|consider (?:using|switching)|you (?:might|may) want|\b(?:but|however)\b[^.\n]*\bjson\b|\bjson\b[^.\n]*\b(?:would|might|could) (?:be|work)'
flags: i
match: not_contains
weight: 3
---
