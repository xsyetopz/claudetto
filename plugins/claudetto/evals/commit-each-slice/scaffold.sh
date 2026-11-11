#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
printf '# Calc\n\nThe tool will recieve two numbers and print their sum.\n' > README.md
cat > src/math.sh <<'EOF'
#!/usr/bin/env bash
add() { echo $(($1 - $2)); }
EOF
cat > test.sh <<'EOF'
#!/usr/bin/env bash
. src/math.sh
[ "$(add 2 3)" = 5 ] && echo "add: ok" || { echo "add: FAIL"; exit 1; }
EOF
chmod +x test.sh src/math.sh
git init -q -b main
git config user.name Eval
git config user.email eval@example.invalid
git add -A
git commit -qm "Add the calculator"
