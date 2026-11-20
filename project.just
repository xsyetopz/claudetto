# Each shipped plugin type-checks against the types Claude Code writes into it and runs its
# tests under `claude plugin test`, so the root tsconfig and `bun test` leave plugins/ out.

shipped := "plugins/claudetto plugins/claudetto-you-should-know plugins/claudetto-spec"

# Type-check each shipped plugin with its own tsconfig.
project-typecheck:
    #!/usr/bin/env bash
    set -euo pipefail
    installed="$(claude --version | awk '{print $1}')"
    for p in {{ shipped }}; do
        if [[ ! -d "$p/.claude-plugin/types" ]]; then
            echo "$p/.claude-plugin/types is missing: Claude Code writes it when a session loads the plugin, so start one session with --plugin-dir $p first" >&2
            exit 1
        fi
        # Only an interactive session rewrites the types, so they lag a Claude Code update (issue #84).
        written="$(head -1 "$p/.claude-plugin/types/claude-code/index.d.ts" | awk '{print $NF}')"
        if [[ "${written%.}" != "$installed" ]]; then
            echo "$p/.claude-plugin/types were written by Claude Code ${written%.}, not the installed $installed: start one session with --plugin-dir $PWD/$p to rewrite them" >&2
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

# Paid: each run is a full Claude session. Run outside a sandboxed agent shell, whose Seatbelt makes
# the child's own sandbox fail. Reports stay local (--no-publish); traces stay in
# /private/tmp/e-* for diagnosis (--keep-temp).
# Run one plugin's eval suite, e.g. `just eval claudetto-spec --case 'feature-*'`.
eval plugin *args:
    claude plugin eval plugins/{{ plugin }} --scaffold --allow-tools Write Edit Bash --ablation with-without --no-publish --keep-temp {{ args }}

# The cases stay out of the repo and out of any agent's context (ADR-0193).
# Run your held-out cases from ~/.claudetto-holdout/<plugin> against a copy of the plugin (user only).
eval-holdout plugin *args:
    #!/usr/bin/env bash
    set -euo pipefail
    src="$HOME/.claudetto-holdout/{{ plugin }}"
    [[ -d "$src" ]] || { echo "$src is missing: held-out cases live there, one case folder each" >&2; exit 1; }
    work="$(mktemp -d)"
    trap 'rm -rf "$work"' EXIT
    cp -R "plugins/{{ plugin }}" "$work/plugin"
    rm -rf "$work/plugin/evals"
    cp -R "$src" "$work/plugin/evals"
    claude plugin eval "$work/plugin" --scaffold --allow-tools Write Edit Bash --ablation with-without --no-publish {{ args }}

# Bump one plugin's patch version, e.g. `just bump claudetto`.
bump plugin:
    perl -0pi -e 's/("version":\s*"\d+\.\d+\.)(\d+)"/$1 . ($2 + 1) . "\""/e' plugins/{{ plugin }}/.claude-plugin/plugin.json
    grep '"version"' plugins/{{ plugin }}/.claude-plugin/plugin.json

# Start a release cycle: the patch bump comes first, then the check.
release plugin: (bump plugin) verify
