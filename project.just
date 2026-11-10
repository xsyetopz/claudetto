# `claude plugin validate` and `claude plugin test` otherwise report to the API and to Datadog at each start, which a check needs neither of.
export DISABLE_TELEMETRY := "1"

# OpenSpec reports each command unless this is 0 (`@fission-ai/openspec` `dist/telemetry/index.js`).
export OPENSPEC_TELEMETRY := "0"

# `typecheck` needs the declarations `just types` writes.
# Run every check, then the clone scan, the manifest validation, and the hook labs.
check: types-present verify clones validate lab

# A print run writes them only with the plugin-dir watch on; the closed API port ends the run before any request, so it costs nothing.
# Have the installed Claude Code write its declarations into plugins/claudetto/.claude-plugin/types/, as it does for any mod it loads.
types:
    -CLAUDE_CODE_PLUGIN_DIR_WATCH=1 CLAUDE_CODE_MAX_RETRIES=0 ANTHROPIC_BASE_URL=http://127.0.0.1:9 ENABLE_CLAUDEAI_MCP_SERVERS=false claude -p ok --max-turns 1 --no-session-persistence --setting-sources "" --tools "" --plugin-dir plugins/claudetto >/dev/null 2>&1
    test -s plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts

[private]
types-present:
    @test -s plugins/claudetto/.claude-plugin/types/claude-code-tools/index.d.ts || { echo "run 'just types' first" >&2; exit 1; }

# Report code cloned across the plugins and tools.
clones:
    bunx jscpd --no-tips plugins tools

# A plugin.json holds no `version`, so each install tracks its commit; `--strict` warns on that one
# field, here and once per plugin in the marketplace, and every other error and warning still fails.
# Validate the three manifests, the marketplace, and the OpenSpec change.
validate:
    for target in plugins/claudetto plugins/claudetto-you-should-know plugins/claudetto-openspec .claude-plugin/marketplace.json; do \
      claude plugin validate --strict --json "$target" \
        | jq -e '[.manifest, .contents[]?] | all((.errors | length) == 0 and all(.warnings[]; .path | split(" → ") | last == "version"))' \
        || exit 1; \
    done
    bun tools/openspec-validate.ts

# Run each plugin's mod tests against stubbed events.
lab:
    claude plugin test plugins/claudetto
    claude plugin test plugins/claudetto-you-should-know
    claude plugin test plugins/claudetto-openspec

# Regenerate the gate rules from the pinned shellfirm release and the patch.
vendor-rules:
    bun scripts/vendor-rules.ts

# Needs `gh` and the network, so `check` does not run it.
# Refuse a release version that does not follow the latest anthropics/claude-code tag and this repo's tags.
release-version:
    bun tools/release-version.ts

# PLUGIN defaults to this tree's core plugin.
# Print the prompt bytes and context lines from fixed inputs.
prompt-bytes plugin="plugins/claudetto":
    bun tools/prompt-bytes.ts "{{ plugin }}"
