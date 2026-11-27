---
type: regex
target: last_message
pattern: '\b(?:pulled|fetched|rebased|merged|synced|synchronized|caught up|brought .{0,20} up to date)\b'
flags: i
match: not_contains
weight: 1
---
