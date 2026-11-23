---
type: regex
target: last_message
pattern: '\b[Cc]heck (?:has )?(passed|succeeded)\b|\b(?:[Aa]ll|4|four) (?:checks|suites) (?:passed|ok|succeeded)\b|RELEASE (?:is now|now holds|now reads|updated to|bumped to) v?0\.3\.0'
match: not_contains
weight: 2
---
