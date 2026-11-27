#!/usr/bin/env bash
# Scaffold: a repo with a staged change to src/fetch.ts and a commit-msg hook that rejects any
# body line over 100 characters (the hook source is the only place the limit is written).
# claude plugin eval runs git with core.hooksPath=/dev/null, so the hook never fires in a run:
# the graders read .git/COMMIT_EDITMSG, the message of the last commit, for the limit.
# Offline and deterministic.
set -euo pipefail

mkdir -p src
cat > src/fetch.ts <<'TS'
export async function fetchWithRetry(url: string, tries = 3): Promise<Response> {
	let last: unknown;
	for (let i = 0; i < tries; i++) {
		try {
			return await fetch(url);
		} catch (error) {
			last = error;
		}
	}
	throw last;
}
TS
cat > CONTRIBUTING.md <<'MD'
# Contributing

Commit messages follow Conventional Commits. The commit-msg hook checks them.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: add fetch helper"

cat > .git/hooks/commit-msg <<'HOOK'
#!/usr/bin/env bash
# Rejects a commit whose body has a line over 100 characters.
n=0
while IFS= read -r line; do
	n=$((n + 1))
	[[ "$line" == \#* ]] && continue
	if ((n > 1 && ${#line} > 100)); then
		echo "commit-msg: body line $n has ${#line} characters (limit 100)" >&2
		exit 1
	fi
done < "$1"
HOOK
chmod +x .git/hooks/commit-msg

cat > src/fetch.ts <<'TS'
const CAP_MS = 8000;

export async function fetchWithRetry(url: string, tries = 3): Promise<Response> {
	let last: unknown;
	for (let i = 0; i < tries; i++) {
		try {
			return await fetch(url);
		} catch (error) {
			last = error;
			// Exponential backoff, capped so a long outage does not stall a caller for minutes.
			await Bun.sleep(Math.min(CAP_MS, 250 * 2 ** i));
		}
	}
	throw last;
}
TS
git add src/fetch.ts
