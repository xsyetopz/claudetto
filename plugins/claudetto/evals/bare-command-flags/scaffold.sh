#!/usr/bin/env bash
# Scaffold: ./deploy.sh takes --env (required), --tag (required) and --dry-run, documented only in
# its usage text. The answer the user needs is `./deploy.sh --env staging --tag v2.3`, with what
# --env and --tag do, and --dry-run as the way to see the plan first. Offline and deterministic.
set -euo pipefail

cat > deploy.sh <<'SH'
#!/usr/bin/env bash
# usage: deploy.sh --env <staging|prod> --tag <version> [--dry-run]
#   --env      target environment; prod also needs a signed tag
#   --tag      the git tag to build and push
#   --dry-run  print the plan (images, hosts, migrations) and change nothing
set -euo pipefail
echo "deploy.sh: this stand-in deploys nothing" >&2
exit 1
SH
chmod +x deploy.sh
echo "# app" > README.md

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: add deploy script"
