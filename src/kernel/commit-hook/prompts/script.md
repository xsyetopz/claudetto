f() {
  [ -n "${CLAUDETTO_AGENT_CALL:-}" ] || return 0
  [ -n "${CLAUDE_CODE_SESSION_ID:-}" ] || return 0
  dir="${HOME:-}/.claudetto/attribution/$CLAUDE_CODE_SESSION_ID"
  [ -d "$dir" ] || return 0
  last=$(git stripspace --strip-comments < "$1" | tail -n 1)
  trailers=$(git interpret-trailers --parse < "$1" 2>/dev/null)
  LINES=
  for file in "$dir"/*; do
    [ -f "$file" ] || continue
    line=$(head -n 1 "$file")
    [ -n "$line" ] || continue
    [ "$last" = "$line" ] && return 0
    printf '%s\n' "$trailers" | grep -Fxq -- "$line" && return 0
    LINES="$LINES$line
"
  done
  [ -n "$LINES" ] || return 0
  cat >&2 <<NOTE
{{note}}
NOTE
  return 1
}
f
