#!/bin/bash
# Replays the propose request on the dogfood session: the session forked with tools off, the prompt as the user turn.
# Usage: bash replay.sh <arm a|b|o> <rep> <out-dir>
arm=$1 rep=$2 out=$3
here=$(cd "$(dirname "$0")" && pwd)
D=/private/tmp/claude-501/df
mkdir -p "$out"
bun "$here/prompt.ts" "$arm" "$D/cfg/plugins/store/claudetto-you-should-know_inline-c6364fcb3207.json" > "$out/prompt-$arm.txt" || exit 1
cd "$D/repo" && DISABLE_AUTOUPDATER=1 CLAUDE_CONFIG_DIR=$D/cfg "${CLAUDE_BIN:-$HOME/.local/share/claude/versions/2.1.327}" -p --resume 64d48dd8-950b-4465-ad38-8c5416b7e020 --fork-session \
	--model claude-sonnet-5-5 --tools "" --output-format json < "$out/prompt-$arm.txt" > "$out/$arm-$rep.json" 2>"$out/$arm-$rep.err"
python3 -I -c "import json,sys; o=json.load(open(sys.argv[1])); print(sys.argv[2], 'cost=%.4f' % o.get('total_cost_usd',0), repr(o.get('result','')[:300]))" "$out/$arm-$rep.json" "$arm-$rep"
