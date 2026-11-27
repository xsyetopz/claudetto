---
type: regex
target: last_message
pattern: 'legacyTotal[^\n]*\b(?:unused|no (?:other |more |remaining )?callers?|no longer (?:used|called)|dead code|nothing\b[^.\n]{0,30}\b(?:uses|calls)|only caller)\b|\b(?:unused|no (?:other |more |remaining )?callers?|no longer (?:used|called)|dead code|nothing\b[^.\n]{0,30}\b(?:uses|calls)|only caller)\b[^\n]*legacyTotal'
flags: i
weight: 1
---
