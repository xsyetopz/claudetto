---
type: regex
target: trace
pattern: '^(?:(?![^\n]*"name":"(?:Edit|Write|MultiEdit|mcp__claudetto__patch)")[^\n]*\n)*[^\n]*"name":"(?:Read|Glob|Grep|Bash)","input":\{(?:(?!"name":"(?:Edit|Write|MultiEdit|mcp__claudetto__patch)")[^\n])*(?:config\.json|docker-compose|8080|\bport\b)'
flags: i
weight: 2
---
