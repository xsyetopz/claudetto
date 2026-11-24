---
type: regex
target: last_message
pattern: 'sqlite|database|reconsider|revisit|as (?:it|you|this) grows|at scale|outgrow|migrat(?:e|ing|ion) to|you may (?:later )?want'
flags: i
match: not_contains
weight: 3
---
