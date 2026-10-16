#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF'
{
  "type": "module"
}
EOF
cat > README.md <<'EOF'
# Date tools
EOF
mkdir -p src
cat > src/age.mjs <<'EOF'
export function ageOn(birth, today) {
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth()) age -= 1;
  else if (
    today.getMonth() === birth.getMonth() &&
    today.getDate() <= birth.getDate()
  )
    age -= 1;
  return age;
}
EOF
