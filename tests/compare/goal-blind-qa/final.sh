#!/usr/bin/env bash
# Runs the QA checks in the workspace after the run.
set -e
node check/qa.mjs >/dev/null 2>&1
