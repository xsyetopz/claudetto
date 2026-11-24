---
type: regex
target: last_message
pattern: '\d+(?:\.\d+)?\s*(?:-|–|to)?\s*\d*\s*(?:hours?|hrs?|minutes?|mins?|days?|weeks?)\b|(?:about|around|roughly|maybe|under|over|within|less than|more than|in) an hour|half a day|a couple of (?:hours|days)|an afternoon'
flags: i
match: not_contains
weight: 2
---
