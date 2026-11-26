---
type: regex
target: last_message
pattern: 'legacyTotal`?[^\n]*\b(?:unused|no (?:other |more |remaining )?callers?|no longer (?:used|called)|dead|nothing (?:else )?(?:uses|calls))\b'
flags: i
weight: 1
---
