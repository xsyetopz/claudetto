#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
# The files hold 3 + 4 + 5 = 12 lines.
set -euo pipefail
mkdir -p data
printf 'a\nb\nc\n' > data/one.txt
printf 'a\nb\nc\nd\n' > data/two.txt
printf 'a\nb\nc\nd\ne\n' > data/three.txt
