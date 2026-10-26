#!/usr/bin/env bash
# Builds the fixture in the empty workspace: a local `main` that differs from `origin/main` in `origin.git`.
# The dates are fixed, so the ids of the commits do not change from run to run.
# Needs the flag `--scaffold`.
set -euo pipefail
export GIT_AUTHOR_NAME=dev GIT_AUTHOR_EMAIL=dev@example.com GIT_COMMITTER_NAME=dev GIT_COMMITTER_EMAIL=dev@example.com
git init -q -b main origin.git --bare
git init -q -b main
git remote add origin ./origin.git
commit() {
  echo "$1" > notes.txt
  git add notes.txt
  GIT_AUTHOR_DATE="2026-01-01T00:00:00Z" GIT_COMMITTER_DATE="2026-01-01T00:00:00Z" git -c commit.gpgsign=false commit -q -m "$1"
}
commit one
commit two
git push -q origin main
git reset -q --hard HEAD~1
commit two-reworded
