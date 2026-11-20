#!/bin/sh
# Reproduce every number in ../sessions.md. Output goes to ./output/. Data: ~/.claude/projects (live; numbers drift as sessions grow).
cd "$(dirname "$0")" && mkdir -p output
python3 -I cache.py > output/cache.txt
python3 -I sessions_subagents.py > output/sessions_subagents.txt
python3 -I reads.py > output/reads.txt
python3 -I tools_replies.py > output/tools_replies.txt
python3 -I ttl1h.py > output/ttl1h.txt
