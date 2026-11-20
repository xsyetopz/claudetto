#!/bin/bash
# Probe: which zsh-only forms trip the 2.1.327 rm-parse check. Each case asks Haiku to run one command verbatim with Bash allowed.
# usage: probe.sh <out-dir>
out=$1; mkdir -p "$out"; cd "$(mktemp -d)" || exit 1
i=0
while IFS= read -r cmd; do
  i=$((i+1))
  DISABLE_AUTOUPDATER=1 "$HOME/.local/share/claude/versions/2.1.327" -p "Run this exact command with the Bash tool once, unchanged, then reply with its output only: $cmd" \
    --model claude-haiku-5-5 --allowedTools Bash --setting-sources "" --output-format json < /dev/null > "$out/$i.json" 2>&1
  printf '%s\t%s\n' "$i" "$cmd" >> "$out/cases.tsv"
done <<'CASES'
f=a/b.ts; echo ${f:t:r}
f=a/b.ts; echo "$(basename "$f" .ts)"
x=(${(f)"$(printf 'a\nb')"}); echo $x
print -l a b
for f in a/b.ts; do echo ${${f:t}%.ts}; done
CASES
