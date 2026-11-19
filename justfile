# Points git at the repository's hooks, so the release check runs before each push.
setup:
	git config core.hooksPath .githooks

# Validates, typechecks and tests every shipped plugin; fails while git hooks are off.
verify:
	#!/bin/sh
	set -e
	top="$(git rev-parse --show-toplevel)"
	hooks="$(cd "$top" && cd "$(git config core.hooksPath || echo /nonexistent)" 2>/dev/null && pwd -P || true)"
	if [ "$hooks" != "$(cd "$top/.githooks" && pwd -P)" ]; then echo "git hooks are off: run just setup"; exit 1; fi
	for p in plugins/claudetto plugins/claudetto-you-should-know; do
		claude plugin validate "$p" --strict
		tools/check-catch.sh "$p"
		bunx tsc -p "$p/tsconfig.json" --noEmit
		claude plugin test "$p"
	done
	# OpenSpec is out of the rebuild (ADR-0189); its stub hooks module must load and pass its test, and its warnings stay.
	claude plugin validate plugins/claudetto-openspec
	claude plugin test plugins/claudetto-openspec

# Bumps one plugin's patch version, e.g. `just bump claudetto`.
bump plugin:
	perl -0pi -e 's/("version":\s*"\d+\.\d+\.)(\d+)"/$1 . ($2 + 1) . "\""/e' plugins/{{plugin}}/.claude-plugin/plugin.json
	grep '"version"' plugins/{{plugin}}/.claude-plugin/plugin.json

# Starts a release cycle: the patch bump comes first, then the check.
release plugin: (bump plugin) verify
