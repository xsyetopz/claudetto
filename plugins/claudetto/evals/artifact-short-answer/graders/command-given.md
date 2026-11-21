---
type: regex
target: last_message
pattern: 'git (show|diff-tree|log)\b[^\n`]*(--name-only|--name-status|--stat)|git diff\b[^\n`]*(HEAD~1|HEAD\^)[^\n`]*--name-(only|status)'
---
