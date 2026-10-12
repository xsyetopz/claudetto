set positional-arguments

# List recipes
default:
    @just --list

# Run the test suite with `bun test`; a file argument runs that file in place of all of them, and an option goes to bun test (-t RE)
test *args:
    bun test "$@"

# Lint the code (Biome) and the Markdown (markdownlint-cli2)
lint:
    bun run lint
    bun run lint:md

# Type-check each `.ts` file and the core hooks module (`bun check`, erasable syntax only)
typecheck:
    bun run typecheck

# Validate the plugin manifest, skills, and agents
validate:
    bun run validate

# Run the hook lab: the tests of each plugin hooks module, with stubbed Claude Code events
lab:
    bun tools/lab.ts

# The full local gate: lint, the type check, the generated files, tests, plugin validation, and the hook lab
check: lint typecheck (generate "--check") test validate lab

# The gate of the CI `check` job: `check` without the type check, because CI has no `.claude-plugin/types/`
ci: lint test validate lab

# Run Claude Code with the plugins of this checkout, in a sandbox config apart from yours; extra arguments go to claude
sandbox *args:
    bun tools/sandbox.ts "$@"

# Run Claude Code with only the plugin folder PLUGIN, in a new sandbox config with no settings, apart from `just sandbox`; extra arguments go to claude (-p "prompt")
sandbox-alone plugin *args:
    bun plugins/dotclaude-lab/bin/dotclaude-sandbox --dir /tmp/dotclaude-sandbox-alone --clean
    bun plugins/dotclaude-lab/bin/dotclaude-sandbox --dir /tmp/dotclaude-sandbox-alone --plugin-dir "$@"

# Remove the sandbox config and project
sandbox-clean:
    bun plugins/dotclaude-lab/bin/dotclaude-sandbox --clean

# Log the requests of Claude Code through a local proxy and size each part of the first one; extra arguments go to the proxy (--port N, --out DIR, --no-count)
capture *args:
    bun plugins/dotclaude-lab/bin/dotclaude-capture "$@"

# Size the start of a session by source from a transcript, and fail above the start bounds of tools/limits.ts; extra arguments go to dotclaude-start (a .jsonl path, --compare BASE OTHER)
measure *args:
    bun tools/measure.ts "$@"

# Where your Claude Code usage went; extra arguments go to dotclaude-usage (--days N, --runs N, --json)
usage *args:
    bun plugins/dotclaude-sessions/bin/dotclaude-usage --agents-dir plugins/dotclaude/agents "$@"

# Publish wiki/ to the GitHub wiki; the wiki repository exists only after its first page is made in the web UI
wiki:
    bun tools/wiki.ts

# Refresh the dotclaude marketplace, then update each plugin under plugins/ that you installed; restart Claude Code after
update:
    bun tools/update.ts

# Bump the version (major, minor, patch, or X.Y.Z) in both manifests and the CHANGELOG; add --dry-run to preview
bump level *flags:
    bun tools/bump-version.ts "$@"

# Tag each plugin under plugins/ at HEAD and push all tags in one atomic push; add --dry-run to preview
release *flags:
    bun tools/release.ts "$@"

# Write the settings schemas of the installed Claude Code to schemas/; extra arguments go to dotclaude-schema (--bundle FILE, --version X.Y.Z)
schema *args:
    bun plugins/dotclaude-lab/bin/dotclaude-schema --out schemas "$@"

# Write each text that a plugin ships from its source in src/; add --check to name each generated file that differs from its source
generate *flags:
    bun tools/generate/index.ts "$@"

# Run the eval cases of the core plugin with `claude plugin eval`, on a path target so the checkout and not the installed copy is tested; extra arguments go to the eval (--case NAME). The run costs money, so --max-cost-usd bounds it, and a lock stops a second run while one is in progress. --keep-temp is always on, so each run keeps its sandbox and trace.jsonl (the eval prints "kept temp: /private/tmp/e-XXXX") to find the cause of a failed run
eval *args:
    bun tools/unsandboxed.ts
    bun tools/lock.ts claude plugin eval plugins/dotclaude --no-publish --scaffold --allow-tools Bash,Write,Edit --max-cost-usd 5 --keep-temp "$@"

# Run the eval cases on the checkout and on a variant at a git ref (in a temporary worktree), to compare the two plugin arms; extra arguments go to the eval
eval-variant ref *args:
    bun tools/unsandboxed.ts
    bun tools/lock.ts bun tools/eval-variant.ts "$@"

# Run one headless sandbox session with a debug log, and fail when the log names an unknown frontmatter field
debug-agents:
    bun tools/sandbox.ts --check-frontmatter

# Capture and measure the start of a clean sandbox session: send one prompt, then type /exit; extra arguments go to the script (--port N, --dir DIR)
start-run *args:
    bun src/plugins/dotclaude-lab/slices/sandbox/adapters/start-run.ts "$@"
