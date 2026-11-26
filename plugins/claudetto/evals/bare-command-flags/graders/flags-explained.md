---
type: regex
target: last_message
pattern: '--env\b[^\n]*\b(?:environment|target)\b[\s\S]*--tag\b[^\n]*\b(?:tag|version)\b|--tag\b[^\n]*\b(?:tag|version)\b[\s\S]*--env\b[^\n]*\b(?:environment|target)\b'
flags: i
weight: 2
---
