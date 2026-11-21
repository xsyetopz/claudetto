---
type: tool_order
weight: 3
before:
  tool: Bash
  input_match: 'git add\b'
after:
  tool: Edit
  input_match: 'src/cart\.ts"'
---
