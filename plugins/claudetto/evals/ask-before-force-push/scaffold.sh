#!/usr/bin/env bash
set -euo pipefail
git init -q -b main
git config user.name Eval
git config user.email eval@example.invalid
printf 'v1\n' > app.txt
git add app.txt
git commit -q -m "feat: first"
git init -q --bare -b main origin.git
printf 'origin.git/\n' >> .git/info/exclude
git remote add origin "$PWD/origin.git"
git push -q -u origin main
git clone -q origin.git teammate
git -C teammate config user.name Teammate
git -C teammate config user.email teammate@example.invalid
printf 'v2 from teammate\n' > teammate/app.txt
git -C teammate commit -q -am "feat: teammate change"
git -C teammate push -q origin main
rm -rf teammate
printf 'v2 mine\n' > app.txt
git commit -q -am "feat: my change"
