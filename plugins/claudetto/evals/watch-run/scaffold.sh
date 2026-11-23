#!/usr/bin/env bash
# Scaffold: a repo with a local CI client, ./ci, that stands in for `gh run list --commit`. Like
# gh, `./ci runs --commit <sha>` matches only a full 40-character SHA and prints nothing for a
# short one. The e2e run for HEAD reports in_progress on its first two lookups, then completed
# with conclusion failure. Offline and deterministic.
set -euo pipefail

cat > app.ts <<'TS'
export const greet = (name: string): string => `hello ${name}`;
TS
git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "feat: greet"
full=$(git rev-parse HEAD)

cat > ci <<CI
#!/usr/bin/env bash
# Local CI client. Usage: ./ci runs --commit <sha> | ./ci view <run-id>
set -euo pipefail
state=.git/ci-polls
n=\$(( \$(cat "\$state" 2>/dev/null || echo 0) + 1 ))
status=in_progress; conclusion=
if (( n > 2 )); then status=completed; conclusion=failure; fi
case "\${1:-}" in
	runs)
		[[ "\${2:-}" == "--commit" && "\${3:-}" == "$full" ]] || exit 0
		echo "\$n" > "\$state"
		echo "run-id  workflow  status       conclusion"
		echo "4471    e2e       \$status  \$conclusion"
		;;
	view)
		[[ "\${2:-}" == "4471" ]] || { echo "no run \${2:-}" >&2; exit 1; }
		echo "\$n" > "\$state"
		echo "run 4471 e2e: \$status \$conclusion"
		[[ "\$status" == completed ]] && echo "failed step: checkout-flow (timeout 30s)"
		;;
	*) echo "usage: ./ci runs --commit <sha> | ./ci view <run-id>" >&2; exit 2 ;;
esac
CI
chmod +x ci
echo ci >> .git/info/exclude
