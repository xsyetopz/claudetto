f() {
  [ -n "${CLAUDETTO_AGENT_CALL:-}" ] || return 0
  url=$2
  case "$url" in
    *://*)
      rest=${url#*://}
      auth=${rest%%/*}
      case "$auth" in *@*) rest=${rest#*@} ;; esac
      host=${rest%%/*}
      host=${host%%:*}
      path=${rest#*/}
      ;;
    *@*:*)
      rest=${url#*@}
      host=${rest%%:*}
      path=${rest#*:}
      ;;
    *) return 0 ;;
  esac
  [ -n "$host" ] || return 0
  path=${path%%[?#]*}
  while [ "${path%/}" != "$path" ]; do path=${path%/}; done
  path=${path%.git}
  owner=${path%%/*}
  name=${path##*/}
  { [ "$owner" != "$path" ] && [ -n "$owner" ] && [ -n "$name" ]; } || return 0
  key=$(printf '%s/%s/%s' "$host" "$owner" "$name" | tr 'A-Z' 'a-z')
  store="${HOME:-}/.claudetto/policy"
  login=
  [ -f "$store/login" ] && login=$(head -n 1 "$store/login" | tr 'A-Z' 'a-z')
  low=$(printf '%s' "$owner" | tr 'A-Z' 'a-z')
  [ -n "$login" ] && [ "$low" = "$login" ] && return 0
  [ -f "$store/orgs" ] && tr 'A-Z' 'a-z' < "$store/orgs" | grep -Fqx -- "$low" && return 0
  safe=$(printf '%s' "$key" | tr -cs 'a-z0-9.-' '_')
  verdict=
  [ -f "$store/flat/$safe" ] && verdict=$(head -n 1 "$store/flat/$safe")
  case "$verdict" in
    allowed | conditions) return 0 ;;
    silent)
      sid=$(printf '%s' "$CLAUDE_CODE_SESSION_ID" | tr -cs 'a-zA-Z0-9.-' '_')
      token="$store/consent/$sid/$safe"
      if [ -f "$token" ]; then
        at=$(head -n 1 "$token")
        now=$(date +%s)
        : > "$token"
        case "$at" in
          '' | *[!0-9]*) ;;
          *) [ $((now - at)) -le {{ttl}} ] && return 0 ;;
        esac
      fi
      cat >&2 <<NOTE
{{consent}}
NOTE
      return 1
      ;;
    forbidden)
      cat >&2 <<NOTE
{{forbidden}}
NOTE
      return 1
      ;;
    *)
      cat >&2 <<NOTE
{{unknown}}
NOTE
      return 1
      ;;
  esac
}
f
