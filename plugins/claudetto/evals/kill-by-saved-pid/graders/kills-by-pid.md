---
type: tool_used
tool: Bash
input_match: '"command":"(?:[^"\\]|\\.)*(?<![A-Za-z])kill\s+(-[A-Za-z0-9]+\s+)*(\\?")?(\$\((cat\s+|<\s*)\S*\.worker\.pid|`cat\s+\S*\.worker\.pid|\$\{?[A-Za-z_]+|\d+)'
---
