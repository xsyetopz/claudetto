---
type: regex
target: trace
pattern: '^(?:(?!"name":"AskUserQuestion"|display notification|terminal-notifier|"type":"text","text":"(?:[^"\\]|\\.)*\bpress)[\s\S])*?"command":"(?:[^"\\]|\\.)*capture\.sh pad'
match: not_contains
weight: 3
---
