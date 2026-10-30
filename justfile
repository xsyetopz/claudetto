set positional-arguments

# List recipes
default:
    @just --list

# Lint, type-check, test, validate, and run the hook lab
check: lint typecheck test validate lab

# Run `bun test`, optionally on one file or with `-t RE`
test *args:
    env -u CLAUDE_CODE_SESSION_ID bun test "$@"

# Lint code, Markdown, file lengths, and comment narration
lint:
    bun run lint
    bun run lint:md
    bun tools/file-lines.ts
    bun tools/no-narration.ts

# Type-check against the vendored Claude Code types
typecheck:
    bun check

# Check agents, layout, JSDoc, literals, generated files, and manifests
validate:
    bun tools/agent-tools.ts
    bun tools/clusters.ts
    bun tools/jsdoc.ts
    bun tools/literals.ts
    bun tools/gitleaks/run.ts --check
    bun tools/rebuild/constants.ts
    bun tools/rebuild/own.ts
    bun tools/rebuild/silent.ts
    bun tools/manifests.ts
    claude plugin validate --strict plugins/claudetto
    claude plugin validate --strict plugins/claudetto-you-should-know
    claude plugin validate --strict .claude-plugin/marketplace.json

# Run each plugin's mod tests against stubbed events
lab:
    claude plugin test plugins/claudetto
    claude plugin test plugins/claudetto-you-should-know

# Show the vendored settings schemas (--fetch, --upstream)
settings-schema *args:
    bun tools/settings-schema.ts "$@"

# Show the supported Claude Code version, or move it with a version argument
claude-version *args:
    bun tools/claude-version.ts "$@"

# Regenerate the Gitleaks rules (--fetch, --ref TAG, --upstream)
gitleaks-rules *args:
    bun tools/gitleaks/run.ts "$@"

# Merge this plan tier's settings into `~/.claude/settings.json` (--settings PATH, --dry-run)
setup *args:
    bun plugins/claudetto/src/tiers/setup.ts "$@"

# Remove stale temp folders and old handoffs (--dry-run, --session ID, --days N)
hygiene *args:
    plugins/claudetto/bin/claudetto-hygiene "$@"

# Report window cost per task from recorded rows
window-report:
    bun tools/window-report.ts

# Measure the first request against a fake API (--help)
capture *args:
    bun tools/capture/run.ts "$@"

# Plan the eval sessions; --run makes paid calls (--case, --arm, --runs, --model, --budget)
eval *args:
    bun tools/evals/cli.ts "$@"

# Check the prompt-size inventory against a fresh reading
inventory:
    bun tools/capture/inventory.ts

# Price compaction thresholds from local transcripts (--sweep, --charge, --summary, --thresholds, --seed, --root)
compaction-cost *args:
    bun claudekit/compaction-cost/main.ts "$@"

# Plan the compaction-threshold probe; --run makes paid calls (--report, --runs, --model, --alt-threshold, --sizes, --max-total-usd, --dir)
compaction-probe *args:
    bun claudekit/probe/main.ts "$@"

# Price one compaction; --run makes paid calls (--steps, --threshold, --model, --dir, --cheap-summary)
compaction-price *args:
    bun claudekit/compaction-price/main.ts "$@"

# Measure the status-line summarizer cost; --run makes paid calls (--runs, --dir)
summary-cost *args:
    bun claudekit/summary-cost/main.ts "$@"

# Run the proxy that answers the status-line summarizer locally (LOG_PATH, --pass)
summary-proxy *args:
    bun claudekit/summary-cost/proxy.ts "$@"
