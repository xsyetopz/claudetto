set positional-arguments

# `claude plugin validate` and `claude plugin test` otherwise report to the API and to Datadog at each start, which a check needs neither of.
export DISABLE_TELEMETRY := "1"

# OpenSpec reports each command unless this is 0 (`@fission-ai/openspec` `dist/telemetry/index.js`).
export OPENSPEC_TELEMETRY := "0"

# List recipes
default:
    @just --list

# Lint, type-check, test, validate, and run the hook lab
check: lint typecheck test validate lab

# Type-check every plugin's TypeScript with Bun's checker, one core short of all of them
# The declarations come from `just types`, and Bun's own from `bun install`.
typecheck:
    test -s plugins/claudetto/.claude-plugin/types/claude-code-tools/index.d.ts || { echo "run 'just types' first" >&2; exit 1; }
    bun install --frozen-lockfile
    bun check --no-pretty --threads $(( $(getconf _NPROCESSORS_ONLN) - 1 ))

# Run the `bun test` files of the tools and the openspec fixtures, optionally one file or with `-t RE`; the plugins' lab files run in `lab`
# Each argument is a `./` path; a bare `tools` is a name filter that also matches the lab file `hooks/setup/tools.test.ts`.
test *args:
    env -u CLAUDE_CODE_SESSION_ID bun test ./tools ./plugins/claudetto-openspec/hooks/fixtures.spec.ts ./plugins/claudetto-openspec/hooks/upstream.spec.ts ./plugins/claudetto/hooks/secrets.spec.ts "$@"

# Lint Markdown, clones, and the branch's commit messages
lint:
    bunx markdownlint-cli2
    bunx jscpd --no-tips plugins tools
    @if git rev-parse -q --verify origin/main >/dev/null; then bunx commitlint --from "$(git merge-base origin/main HEAD)" --to HEAD; fi

# Have the installed Claude Code write its declarations into plugins/claudetto/.claude-plugin/types/, as it does for any mod it loads.
# A print run writes them only with the plugin-dir watch on; the closed API port ends the run before any request, so it costs nothing.
types:
    -CLAUDE_CODE_PLUGIN_DIR_WATCH=1 CLAUDE_CODE_MAX_RETRIES=0 ANTHROPIC_BASE_URL=http://127.0.0.1:9 ENABLE_CLAUDEAI_MCP_SERVERS=false claude -p ok --max-turns 1 --no-session-persistence --setting-sources "" --tools "" --plugin-dir plugins/claudetto >/dev/null 2>&1
    test -s plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts

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

# Refuse a release version that does not follow the latest anthropics/claude-code tag and this repo's tags (task 18.32); needs `gh` and the network, so `check` does not run it
release-version:
    bun tools/release-version.ts

# Print the prompt bytes and context lines from fixed inputs (task 1.3); PLUGIN defaults to this tree's core plugin
prompt-bytes plugin="plugins/claudetto":
    bun tools/prompt-bytes.ts "{{plugin}}"
