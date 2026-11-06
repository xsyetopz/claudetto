#!/bin/sh
# Lists the folders under $1 whose marker names this session; a folder found by name alone is never listed.
find "$1" -mindepth 2 -maxdepth 2 -name .created-by-claudetto -type f | while read -r m; do
	[ "$(cat "$m")" = "$CLAUDE_CODE_SESSION_ID" ] && dirname "$m"
done | sort
