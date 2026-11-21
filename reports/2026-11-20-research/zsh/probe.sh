#!/bin/bash
# Runs each case under zsh the way the Bash tool does (snapshot, env file, eval), once with the
# shipped options and once with a candidate added, and prints both outputs (issue #61).
# Usage: bash probe.sh "<candidate options>" [snapshot]
cand=$1
snap=${2:-/dev/null}
dir=$(mktemp -d)
cd "$dir" || exit 1
printf 'x\n' > a.txt
printf 'y\n' > notes.md
mkdir -p "My Dir" && printf 'z\n' > "My Dir/f.txt"

cases=(
	'E command in a variable|C="echo hi there"; $C'
	'E tool with args in a variable|R="printf %s-%s\n"; $R a b'
	'arg list in a variable|F="a.txt notes.md"; wc -l $F | tail -1'
	'for over a variable|L="a b c"; n=0; for x in $L; do n=$((n+1)); done; echo $n'
	'set -- over a substitution|L=$(echo "3 7"); set -- $L; echo "$2"'
	'grep -l list into a loop|F=$(grep -l . a.txt notes.md); n=0; for f in $F; do n=$((n+1)); done; echo $n'
	'control: pipestatus[1]|false | true; echo "exit ${pipestatus[1]}"'
	'control: pipestatus with tail|(exit 3) | tail -1; echo "rc=${pipestatus[1]}"'
	'control: zsh array 1-based|a=(x y z); echo "${a[1]} $#a"'
	'control: explicit split ${=v}|v="p q"; printf "[%s]" ${=v}; echo'
	'control: quoted var keeps spaces|d="My Dir"; ls "$d"'
	'control: quoted "$@" in a function|g(){ printf "[%s]" "$@"; echo; }; g "a b" c'
	'control: unmatched glob passes|ls nope*.zz 2>&1 | sed "s/.*nope/nope/"'
	'control: equals word|echo ==== done'
	'cost: unquoted path with a space|d="My Dir"; ls $d 2>&1'
)

run() {
	local opts=$1 body=$2
	printf '[ -n "$ZSH_VERSION" ] && setopt %s\n' "$opts" > env.sh
	zsh -f -c 'source "$1" 2>/dev/null; source ./env.sh; eval "$2"' zsh "$snap" "$body" 2>&1 | tr '\n' ' '
}

for c in "${cases[@]}"; do
	name=${c%%|*}
	body=${c#*|}
	a=$(run "no_nomatch no_equals" "$body")
	b=$(run "no_nomatch no_equals $cand" "$body")
	same=$([ "$a" = "$b" ] && echo same || echo DIFF)
	printf '%-36s %-4s | shipped: %-40s | +%s: %s\n' "$name" "$same" "$a" "$cand" "$b"
done
rm -rf "$dir"
