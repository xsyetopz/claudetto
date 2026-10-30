set positional-arguments

# List recipes
default:
    @just --list

# Run the test suite with `bun test`. A file argument runs that file in place of all of them, and an option goes to bun test (-t RE). A test run is not a Claude Code session, so the session id does not reach the commit hook of the session
test *args:
    env -u CLAUDE_CODE_SESSION_ID bun test "$@"

# Lint the code (Biome), the Markdown (markdownlint-cli2), and the file lengths (at most 300 lines of source and 500 of a test)
lint:
    bun run lint
    bun run lint:md
    bun tools/file-lines.ts
    bun tools/no-narration.ts

# Type-check each `.ts` file of the tree against the vendored Claude Code types (`bun check`, erasable syntax only)
typecheck:
    bun check

# Check that no agent file declares a tool the runtime withholds from it, check that no sibling files form a cluster that should be a folder, check that every exported declaration carries a JSDoc block that adds a fact, check that no text is written as a `join("\n")` over an array literal or as an escaped `\n` between its words where a multiline template literal would show its shape, check that the generated Gitleaks rules still match the vendored config, check that the four manifests that declare the version of this project all declare the same one, then validate the plugin manifest and the marketplace that lists it. Each check reads the code that ships; the prose checks of `docs/` are gone. `--strict` makes a manifest warning a failure, such as an unrecognized field. The plugin-directory checks it prints, such as the missing listing icon, count only under `--profile directory`, which stays off because this change submits nothing to the catalog
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

# Print the Claude Code version and key count of the vendored settings schemas, which are what the checks read a settings key against. `--fetch` downloads both again from `clawdipedia.cc`, and `--upstream` compares the vendored copies with the published ones. Neither is in `just check`, because both reach the network
settings-schema *args:
    bun tools/settings-schema.ts "$@"

# Print the supported Claude Code version and every line that declares it. A version argument moves all of them to it (`just claude-version 2.1.315`). The readings in the comments, such as "read against `2.1.312`", are left as they were taken, because each backs the line above it
claude-version *args:
    bun tools/claude-version.ts "$@"

# Regenerate `plugins/claudetto/src/secrets/gitleaks/rules.ts` from the vendored Gitleaks config. `--fetch` downloads the config and its licence at the pinned ref first, `--fetch --ref TAG` at another, and `--upstream` compares the digest of the vendored copy with the original and names the newest release
gitleaks-rules *args:
    bun tools/gitleaks/run.ts "$@"

# Run the hook lab: the tests of each plugin's mod, with stubbed Claude Code events and no model call
lab:
    claude plugin test plugins/claudetto
    claude plugin test plugins/claudetto-you-should-know

# The full local gate: lint, the type check, the tests, plugin validation, and the hook lab. Sequenced here, with no runner script and no lock, until a need for either shows
check: lint typecheck test validate lab

# Merge the settings snippet of this login's plan tier into `~/.claude/settings.json`, keeping each value you set. Extra arguments go to `plugins/claudetto/src/tiers/setup.ts` (--settings PATH aims at another file, --dry-run prints the report and writes nothing)
setup *args:
    bun plugins/claudetto/src/tiers/setup.ts "$@"

# Score the first request of a session in characters, free and with no model call: `claude -p` against a local fake Messages API (--arm plain|plugin, --settings FILE, --tools N)
capture *args:
    bun tools/capture/run.ts "$@"

# Score the rule cases of the main agent body against their fixtures, free and with no model call unless `--run` is among the arguments; plan mode is the default and prints the sessions it would start; extra arguments go to `tools/evals/cli.ts` (--run makes the paid calls, --case KEY one case, --arm ARM one arm, --runs N runs per arm, --model NAME, --budget USD the cap on the round)
eval *args:
    bun tools/evals/cli.ts "$@"

# Check each recorded total of the prompt-size inventory against a reading taken now, free and with no model call. It is not in `just check` because it spawns `claude` once per row, so run it by hand after a change to a shipped prompt surface: an agent file, the output style, the deny list, the main agent body, or a tool description. It exits 1 naming each row that moved by more than the 12-character run-to-run variance of the instrument
inventory:
    bun tools/capture/inventory.ts

# Price the compaction threshold against this login's own transcripts, free and with no model call; extra arguments go to `claudekit/compaction-cost/main.ts` (--sweep FROM,TO,STEP, --charge TURNS, --summary MODE, --thresholds LIST, --seed N, --root DIR)
compaction-cost *args:
    bun claudekit/compaction-cost/main.ts "$@"

# Plan the paid compaction-threshold probe, free and with no model call unless `--run` is among the arguments; extra arguments go to `claudekit/probe/main.ts` (--run makes the paid calls, --report reads the forks a past round saved under --dir and reports them for free, --runs N forks per arm and 11 by default, the citable floor of 10 and one spare, so a fork lost to a transient API failure does not cost the round its citability and a second loss in the same arm is run again, --model M, --alt-threshold T the candidate against the shipped 140000, --sizes A,B base sizes in tokens, --max-total-usd U the cap on the round, --dir D)
compaction-probe *args:
    bun claudekit/probe/main.ts "$@"

# Price one compaction in window points and dollars from the recorder's own rows, free and with no model call unless `--run` is among the arguments; extra arguments go to `claudekit/compaction-price/main.ts` (--run makes the paid calls, --steps N, --threshold T the tokens a step compacts at and with no --threshold the run calibrates it from one extra step, --model M, --dir D, --cheap-summary turns the plugin's own summarizer handler on so two runs price it against the engine's compaction)
compaction-price *args:
    bun claudekit/compaction-price/main.ts "$@"

# Measure what the agent status-line summarizer costs and whether either workaround stops it, free and with no model call unless `--run` is among the arguments; each arm needs a pty, because a summary needs an interactive session; extra arguments go to `claudekit/summary-cost/main.ts` (--run makes the paid calls, --runs N per arm, --dir D)
summary-cost *args:
    bun claudekit/summary-cost/main.ts "$@"

# Run the local proxy that answers the agent status-line summarizer itself, so a session that forks subagents pays nothing for its status labels; it prints the `ANTHROPIC_BASE_URL` to run `claude` with, and it forwards every other request to the API unchanged; extra arguments go to `claudekit/summary-cost/proxy.ts` (a path writes the JSONL log there, --pass only counts and pays)
summary-proxy *args:
    bun claudekit/summary-cost/proxy.ts "$@"
