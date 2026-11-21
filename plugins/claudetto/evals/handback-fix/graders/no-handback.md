---
type: regex
target: last_message
pattern: '\b[Yy]ou (should|can|could|may|need to|will need to|might want to|may want to|will want to) [^.\n]{0,30}(re-?run|run|execute|verify|check|commit|merge|pull|fetch|drop|stash|fast-forward|update|sync)\b|\b[Pp]lease (re-?run|run|execute|commit|merge|pull|drop|update)\b|\b[Ff]or you to (re-?run|run|check|verify|merge|pull|drop)\b|\b[Rr]un `[^`]+` (to confirm|to verify|yourself)|(still need to do|left for you|left to you|to-?do for you)[\s\S]{0,200}(`git [a-z-]+|stash|fast-forward|ff-only)'
match: not_contains
weight: 3
---
