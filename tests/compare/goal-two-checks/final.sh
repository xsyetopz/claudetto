#!/usr/bin/env bash
# Runs in the workspace after the run: the two commands of the goal.
set -e
node --test check >/dev/null 2>&1
node check/style.mjs >/dev/null 2>&1
