#!/bin/bash
# Replays the register-summary step where the agent misstated RISK-262's status (issue #69).
# usage: bash run.sh <vanilla|claudetto> <rep> <out-dir>   (repo clone at $R, logged-in config at $C)
arm=$1 rep=$2 out=$3
R=/private/tmp/claude-501/fin2/repo C=/private/tmp/claude-501/df/cfg
mkdir -p "$out"
P="Run bun tools/check-register.ts and tell me whether any risk in plans/rebuild/risk-register at Likelihood 3 or higher is not settled. Some entries carry more than one Status line; name those at Likelihood 3 or higher, with the current status and the reason the entry records for it."
case $arm in
  vanilla) extra=(--setting-sources project,local) ;;
  claudetto) extra=(--plugin-dir $R/plugins/claudetto --plugin-dir $R/plugins/claudetto-openspec --plugin-dir $R/plugins/claudetto-you-should-know) ;;
  candidate) K=/private/tmp/claude-501/fin2/cand; extra=(--plugin-dir $K/claudetto --plugin-dir $K/claudetto-openspec --plugin-dir $K/claudetto-you-should-know) ;;
esac
cd "$R" && DISABLE_AUTOUPDATER=1 CLAUDE_CONFIG_DIR=$C "$HOME/.local/share/claude/versions/2.1.327" -p "$P" --model claude-sonnet-5-5 \
  --allowedTools Bash Read Grep Glob --output-format json "${extra[@]}" < /dev/null > "$out/$arm-$rep.json" 2>"$out/$arm-$rep.err"
