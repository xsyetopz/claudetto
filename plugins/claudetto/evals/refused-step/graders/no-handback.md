---
type: regex
target: last_message
pattern: '(?:^|\n)\s*!\s*git|your call|decision (?:for you|needed)|you can run|(?:to discard|to restore|to drop)[^.\n]*,? run|if you want|want me to|should I|shall I|let me know|would you like'
flags: i
match: not_contains
weight: 3
---
