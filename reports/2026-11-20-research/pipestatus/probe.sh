#!/bin/bash
# Runs each case under zsh the way the Bash tool does (snapshot, env file, eval), once with the
# shipped env file line and once with the PIPESTATUS shim added, and prints both outputs (issue #82).
# Usage: bash probe.sh [snapshot]
snap=${1:-/dev/null}
dir=$(mktemp -d)
cd "$dir" || exit 1
shipped='[ -n "$ZSH_VERSION" ] && setopt no_nomatch no_equals sh_word_split'
# The shim under test, as hooks.json writes it: zsh has no PIPESTATUS, so a DEBUG trap copies
# $pipestatus into it with bash's 0-based keys before each command. It is a TRAPDEBUG function
# because zsh restores $pipestatus after one; a string trap's own commands overwrite it.
shim=$(cat <<'SHIM'
[ -n "$ZSH_VERSION" ] && TRAPDEBUG() { local -a s=("${pipestatus[@]}") k; k=({0..$(($#s-1))}); typeset -gA PIPESTATUS=("${(@)k:^s}"); }
SHIM
)

cases=(
	'[0] after a failing first command|false | true; echo "exit ${PIPESTATUS[0]}"'
	'[0] [1] of two|(exit 3) | (exit 4); echo "${PIPESTATUS[0]} ${PIPESTATUS[1]}"'
	'[2] of three|true | (exit 5) | (exit 6); echo "${PIPESTATUS[2]}"'
	'[0] with tail|(exit 7) | tail -1; echo "rc=${PIPESTATUS[0]}"'
	'[0] in a loop|for i in 1 2; do (exit $i) | cat; echo "i=$i rc=${PIPESTATUS[0]}"; done'
	'[0] in a function|f(){ (exit 2) | true; echo "f ${PIPESTATUS[0]}"; }; f'
	'bare, single command|(exit 4); echo "bare=$PIPESTATUS"'
	'[@] of two|(exit 3) | (exit 4); echo "all=${PIPESTATUS[@]}"'
	'control: pipestatus[1]|false | true; echo "exit ${pipestatus[1]}"'
	'control: $? after false|false; echo "rc=$?"'
	'control: $? of a pipeline|false | true; echo "rc=$?"'
	'control: set -e stops|set -e; false; echo "not reached"'
	'control: set -u with a pipe|set -u; false | true; echo "u ${pipestatus[1]}"'
	'control: exit code of the command|(false | true; exit 3); echo "rc=$?"'
	'control: zsh array 1-based|a=(x y z); echo "${a[1]} $#a"'
	'control: command in a variable|C="echo hi there"; $C'
	'cost: set -x trace lines|set -x; true; echo done'
)

run() {
	printf '%s\n' "$1" > env.sh
	zsh -f -c 'source "$1" 2>/dev/null; source ./env.sh; eval "$2"' zsh "$snap" "$2" 2>&1 | tr '\n' ' '
}

for c in "${cases[@]}"; do
	name=${c%%|*}
	body=${c#*|}
	a=$(run "$shipped" "$body")
	b=$(run "$shipped"$'\n'"$shim" "$body")
	same=$([ "$a" = "$b" ] && echo same || echo DIFF)
	printf '%-30s %-4s | shipped: %-28s | shim: %s\n' "$name" "$same" "$a" "$b"
done

loop='for i in {1..200000}; do :; done'
for arm in shipped shim; do
	[ $arm = shipped ] && printf '%s\n' "$shipped" > env.sh || printf '%s\n%s\n' "$shipped" "$shim" > env.sh
	s=$(date +%s%N 2>/dev/null || python3 -c 'import time;print(time.time_ns())')
	zsh -f -c 'source "$1" 2>/dev/null; source ./env.sh; eval "$2"' zsh "$snap" "$loop"
	e=$(python3 -c 'import time;print(time.time_ns())')
	echo "time 200k-iteration loop, $arm: $(( (e - s) / 1000000 )) ms"
done
rm -rf "$dir"
