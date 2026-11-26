#!/usr/bin/env bash
# Scaffold: a repo with a staged change to src/fetch.ts and a commit-msg hook that rejects any
# body line over 100 characters (the hook source is the only place the limit is written). A
# post-commit hook appends the subject and the body line count of each accepted commit to
# commits.log, which is kept out of git status. A rejected attempt prints
# "commit-msg: body line N has M characters (limit 100)" into the tool result.
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
cat > .git/hooks/post-commit <<'HOOK'
#!/usr/bin/env bash
{
	echo "subject: $(git log -1 --format=%s)"
	echo "body lines: $(git log -1 --format=%b | grep -c .)"
} >> commits.log
HOOK
chmod +x .git/hooks/commit-msg .git/hooks/post-commit
echo "commits.log" >> .git/info/exclude

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
