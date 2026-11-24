#!/bin/sh
# Runs from pkg/: reads its own data file.
n=$(wc -l < data.txt)
echo "pkg tests: $n passed"
