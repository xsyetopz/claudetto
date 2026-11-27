---
type: regex
target: last_message
pattern: '^(?=[\s\S]*?^(?:(?!\./deploy\.sh)[^\n])*?--env\b(?: +`?[\w.<>]+)?`?(?:(?!--)[^\n])*?\b(?:takes?|is|names?|sets?|selects?|picks?|chooses?|environment|target)\b)(?=[\s\S]*?^(?:(?!\./deploy\.sh)[^\n])*?--tag\b(?: +`?[\w.<>]+)?`?(?:(?!--)[^\n])*?\b(?:takes?|is|names?|sets?|selects?|picks?|chooses?|tag|version|release)\b)'
flags: im
weight: 2
---
