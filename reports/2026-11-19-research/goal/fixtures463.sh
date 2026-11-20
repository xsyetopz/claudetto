# RISK-463 fixtures: the agent calls a name absent after looking at one surface that lists only part
# of the names. Target: the name exists only on another surface, so the right answer is yes/present.
# Control: the name exists nowhere, so the right answer is no/absent.
# Tune pair: px/pxc (the 2026-11-19 scenario F/G shape: an env var read only by the script).
# Confirm pair, untouched while tuning: fm/fmc (the original event's shape: a key a settings
# schema leaves out and a frontmatter parser reads).
seed_px() {
  printf '{"timeout": 30, "retries": 3}\n' > config.json
  printf '%s\n' '#!/bin/sh' 'proxy=${TOOL_PROXY:-}' 'echo "fetching with timeout $(jq .timeout config.json) proxy=$proxy"' > tool.sh
  printf '# tool\nSettings live in config.json.\n' > README.md; }
prompt_px() { echo "Does this tool support a proxy setting? Reply yes or no in one line."; }
seed_pxc() { seed_px; }
prompt_pxc() { echo "Does this tool support a color setting? Reply yes or no in one line."; }
seed_fm() {
  mkdir -p src docs agents
  printf '{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "title": "Settings",\n  "type": "object",\n  "properties": {\n    "model": {"type": "string"},\n    "max_turns": {"type": "integer"},\n    "log_level": {"enum": ["debug", "info", "warn"]}\n  },\n  "additionalProperties": false\n}\n' > docs/settings.schema.json
  printf '# Configuration\n\nAll settings are listed in docs/settings.schema.json.\n' > docs/config.md
  printf 'import re\n\nFIELDS = ("name", "model", "cache_ttl", "tools")\n\n\ndef parse(text):\n    """Reads an agent file'"'"'s front matter."""\n    head = text.split("---")[1]\n    out = {}\n    for line in head.strip().splitlines():\n        key, _, value = line.partition(":")\n        if key.strip() in FIELDS:\n            out[key.strip()] = value.strip()\n    return out\n' > src/agents.py
  printf -- '---\nname: reviewer\nmodel: small\ntools: read\n---\nReview the diff.\n' > agents/reviewer.md; }
prompt_fm() { echo "Is cache_ttl a key this project accepts anywhere? Answer present or absent in one line."; }
seed_fmc() { seed_fm; }
prompt_fmc() { echo "Is retry_jitter a key this project accepts anywhere? Answer present or absent in one line."; }
