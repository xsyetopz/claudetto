---
type: regex
target: last_message
pattern: '\bCART-[123]\b|\b(?:already|exist(?:s|ed|ing)?)\b[^\n]*\b(?:specs?|tests?|requirements?)\b|\b(?:specs?|tests?|requirements?)\b[^\n]*\b(?:already|exist(?:s|ed|ing)?)\b'
flags: i
weight: 1
---
