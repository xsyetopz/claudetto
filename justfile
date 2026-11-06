set positional-arguments

# `claude plugin validate` and `claude plugin test` otherwise report to the API and to Datadog at each start, which a check needs neither of.
export DISABLE_TELEMETRY := "1"

# OpenSpec reports each command unless this is 0 (`@fission-ai/openspec` `dist/telemetry/index.js`).
export OPENSPEC_TELEMETRY := "0"

# List recipes
default:
    @just --list

# Lint, type-check, test, validate, and run the hook lab
check: lint test validate lab

# Run the `bun test` files of the tools and the openspec fixtures, optionally one file or with `-t RE`; the plugins' lab files run in `lab`
# Each argument is a `./` path; a bare `tools` is a name filter that also matches the lab file `hooks/setup/tools.test.ts`.
test *args:
    env -u CLAUDE_CODE_SESSION_ID bun test ./tools ./plugins/claudetto-openspec/hooks/fixtures.spec.ts ./plugins/claudetto-openspec/hooks/upstream.spec.ts ./plugins/claudetto/hooks/secrets.spec.ts "$@"

# Lint code, Markdown, clones, and the branch's commit messages
lint:
    bunx biome check --error-on-warnings
    bunx markdownlint-cli2
    bunx jscpd --no-tips plugins tools
    @if git rev-parse -q --verify origin/main >/dev/null; then bunx commitlint --from "$(git merge-base origin/main HEAD)" --to HEAD; fi

# Write the installed Claude Code's hook declarations where the engine itself puts them beside a mod, for `typecheck`.
# claudekit renders them against the fake API at no cost; the plugin reads only its own copy.
types:
    bun claudekit/bin/claudekit.ts template types
    mkdir -p plugins/claudetto/.claude-plugin/types/claude-code
    cp claudekit/types/claude-code.d.ts plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts
    printf '*\n' > plugins/claudetto/.claude-plugin/types/.gitignore

# Validate the three manifests, the marketplace, and the OpenSpec change
validate:
    claude plugin validate --strict plugins/claudetto
    claude plugin validate --strict plugins/claudetto-you-should-know
    claude plugin validate --strict plugins/claudetto-openspec
    claude plugin validate --strict .claude-plugin/marketplace.json
    bunx openspec validate --all --strict

# Run each plugin's mod tests against stubbed events
# Regenerate the gate rules from the pinned shellfirm release and the patch.
vendor-rules:
    bun scripts/vendor-rules.ts

lab:
    claude plugin test plugins/claudetto
    claude plugin test plugins/claudetto-you-should-know
    claude plugin test plugins/claudetto-openspec

# Print the prompt bytes and context lines from fixed inputs (task 1.3); PLUGIN defaults to this tree's core plugin
prompt-bytes plugin="plugins/claudetto":
    bun tools/prompt-bytes.ts "{{plugin}}"

# Time each hook of a plugin from a fake-API session's debug log (task 1.10)
hook-latency plugin="plugins/claudetto":
    bun tools/hook-latency.ts "{{plugin}}"
