#!/usr/bin/env bash
# Scaffold: a repo whose one stash holds the staged deletion of src/ExeExtractor.ts. A plain
# `git stash pop` brings the deletion back unstaged, so `git commit` then finds nothing staged. The
# worktree also holds an untracked scratch.log that a `git add -A` would sweep into the commit.
# claude plugin eval runs git with core.hooksPath=/dev/null, so the graders read git's own files:
# .git/logs/HEAD for the commit and .git/index for the paths it tracks. Offline and deterministic.
set -euo pipefail

mkdir -p src
cat > src/ExeExtractor.ts <<'TS'
// Pulls the driver payload out of a Windows installer.
export function extractExe(path: string): Uint8Array {
	return new Uint8Array(0);
}
TS
cat > src/Dictionary.ts <<'TS'
export const dictionary: Record<string, string> = {};
TS
echo "# tools" > README.md

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "feat: add extractor and dictionary"

git rm -q src/ExeExtractor.ts
git -c user.name=eval -c user.email=eval@example.invalid stash push -q -m "extractor removal"
echo "usbmon decode notes" > scratch.log

