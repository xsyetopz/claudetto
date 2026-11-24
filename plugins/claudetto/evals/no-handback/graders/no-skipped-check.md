---
type: regex
target: last_message
pattern: 'not (?:been )?(?:verified|checked|tested|run|read)|(?:did not|didn''t|haven''t|have not|hasn''t|wasn''t|was not) (?:verify|verified|check|checked|test|tested|run|ran|read)|you (?:can|could|may want to|might want to) (?:run|check|verify|test)|un(?:tested|verified|checked)|left (?:for|to) you'
flags: i
match: not_contains
weight: 3
---
