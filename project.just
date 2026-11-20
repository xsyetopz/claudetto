# Each shipped plugin type-checks against the types Claude Code writes into it and runs its
# tests under `claude plugin test`, so the root tsconfig and `bun test` leave plugins/ out.

shipped := "plugins/claudetto plugins/claudetto-you-should-know plugins/claudetto-spec"

# Type-check each shipped plugin with its own tsconfig.
project-typecheck:
    #!/usr/bin/env bash
    set -euo pipefail
    for p in {{ shipped }}; do
        if [[ ! -d "$p/.claude-plugin/types" ]]; then
            echo "$p/.claude-plugin/types is missing: Claude Code writes it when a session loads the plugin, so start one session with --plugin-dir $p first" >&2
            exit 1
        fi
        bun check -p "$p"
    done

# Validate each plugin and fail on a gating hook without .catch.
project-lint:
    #!/usr/bin/env bash
    set -euo pipefail
    for p in {{ shipped }}; do
        claude plugin validate "$p" --strict
        tools/check-catch.sh "$p"
    done

# Run each plugin's tests under Claude Code's test runner.
project-test:
    #!/usr/bin/env bash
    set -euo pipefail
    for p in {{ shipped }}; do
        claude plugin test "$p"
    done

# The plugin checks CI runs after the language checks.
project-verify: project-typecheck project-lint project-test

# Bump one plugin's patch version, e.g. `just bump claudetto`.
bump plugin:
    perl -0pi -e 's/("version":\s*"\d+\.\d+\.)(\d+)"/$1 . ($2 + 1) . "\""/e' plugins/{{ plugin }}/.claude-plugin/plugin.json
    grep '"version"' plugins/{{ plugin }}/.claude-plugin/plugin.json

# Start a release cycle: the patch bump comes first, then the check.
release plugin: (bump plugin) verify
