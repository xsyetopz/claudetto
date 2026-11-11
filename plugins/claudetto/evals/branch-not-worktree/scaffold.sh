#!/usr/bin/env bash
set -euo pipefail
printf '# Notes\n\nRun teh build before you push.\n' > README.md
git init -q -b main
git config user.name Eval
git config user.email eval@example.invalid
git add -A
git commit -qm "Add the notes"
