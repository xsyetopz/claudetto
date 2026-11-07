# 5.17 mon22/24/25 on the shipped plugin in the TUI. Usage: zsh mon.sh NAME '<monitor input json>'
name=$1; input=$2
call() { printf '{"match":{"hasTools":true},"reply":{"blocks":[{"type":"tool_use","name":"%s","input":%s}],"stop":"tool_use"}}' "$1" "$2"; }
S="[$(call ToolSearch '{"query":"select:mcp__claudetto__monitor","max_results":5}'),$(call mcp__claudetto__monitor "$input"),{\"match\":{\"hasTools\":true},\"reply\":{\"blocks\":[{\"type\":\"text\",\"text\":\"Done.\"}]}}]"
cd /tmp/probe-tui && NOESC=1 ROWS=40 COLS=160 WAIT=${WAIT:-4} bun tui.ts $name "watch it" "NEVERMATCH" '\x0c' "$S" '{"permissions":{"defaultMode":"default","allow":["Bash","Monitor","mcp__claudetto__monitor"]}}'
