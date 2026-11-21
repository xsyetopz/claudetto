#!/bin/bash
# One session per run; counts the raw secret values left in the session file's toolUseResult records (issue #63, RISK-506).
# usage: bash run.sh <vanilla|claudetto> <rep> <out-dir>
# PLUGINS names the directory holding the claudetto plugin; it defaults to this checkout's.
arm=$1 rep=$2 out=$3
C=/private/tmp/claude-501/df/cfg W=$out/$arm-$rep D=${PLUGINS:-$(cd "$(dirname "$0")/../../.." && pwd)/plugins}
rm -rf "$W"; mkdir -p "$W/config" "$out"; git -C "$W" init -q
printf 'DB_PASS=lowentropy4417\n' > "$W/config/app.env"
P="Do these three steps, one tool call each: 1) Bash: printf 'api_token=%s\n' tok9f8e7d6c5b4a 2) Bash: printf 'api_token=%s\n' err1a2b3c4d5e6f; exit 3 3) Read config/app.env. Then reply with what each showed."
case $arm in
  vanilla) extra=(--setting-sources project,local) ;;
  claudetto) extra=(--plugin-dir "$D/claudetto") ;;
esac
cd "$W" && DISABLE_AUTOUPDATER=1 CLAUDE_CONFIG_DIR=$C "$HOME/.local/share/claude/versions/2.1.327" -p "$P" --model claude-haiku-5-5 \
  --allowedTools Bash Read --output-format json "${extra[@]}" < /dev/null > "$out/$arm-$rep.json" 2>"$out/$arm-$rep.err"
python3 -I - "$out/$arm-$rep.json" "$C" "$arm-$rep" <<'PY'
import json, sys, glob
d = json.load(open(sys.argv[1])); sid = d.get("session_id")
f = glob.glob(f"{sys.argv[2]}/projects/*/{sid}.jsonl")[0]
records = [json.dumps(json.loads(l).get("toolUseResult")) for l in open(f) if '"toolUseResult"' in l]
raw = {v: sum(v in r for r in records) for v in ("tok9f8e7d6c5b4a", "err1a2b3c4d5e6f", "lowentropy4417")}
print(sys.argv[3], "records=%d raw=%s cost=%.4f" % (len(records), raw, d.get("total_cost_usd", 0)))
PY
