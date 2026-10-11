set positional-arguments

# List recipes
default:
    @just --list

# Run the test suite on Node; a file argument runs that file in place of all of them, and an option goes to node --test (--test-name-pattern=RE)
test *args:
    #!/usr/bin/env bash
    set -euo pipefail
    opts=() files=()
    for a in "$@"; do if [[ $a == -* ]]; then opts+=("$a"); else files+=("$a"); fi; done
    if [ "${#files[@]}" -eq 0 ]; then files=("tests/**/*.test.mjs"); fi
    node --test --import ./tests/support/tmp-root.mjs --test-timeout=5000 ${opts[@]+"${opts[@]}"} "${files[@]}"

# Lint the code (Biome) and the Markdown (markdownlint-cli2)
lint:
    pnpm run lint
    pnpm run lint:md

# Type-check the lab tests and the core hooks module (tsc --noEmit)
typecheck:
    pnpm run typecheck

# Validate the plugin manifest, skills, and agents
validate:
    pnpm run validate

# Run the hook lab: the tests of each plugin hooks module, with stubbed Claude Code events
lab:
    #!/usr/bin/env bash
    set -euo pipefail
    for d in plugins/*/; do
        if [ -d "${d}tests" ]; then claude plugin test "${d%/}"; fi
    done

# Everything CI runs, plus the type check, plugin validation, and the hook lab
check: lint typecheck test validate lab

# Run Claude Code with the plugins of this checkout, in a sandbox config apart from yours; extra arguments go to claude
sandbox *args:
    node plugins/dotclaude-lab/bin/dotclaude-sandbox "$@" $(for d in plugins/*/; do [ -f "${d}.claude-plugin/plugin.json" ] && printf -- '--plugin-dir %s ' "${d%/}"; done)

# Remove the sandbox config and project
sandbox-clean:
    node plugins/dotclaude-lab/bin/dotclaude-sandbox --clean

# Log the requests of Claude Code through a local proxy and size each part of the first one; extra arguments go to the proxy (--port N, --out DIR, --no-count)
capture *args:
    node plugins/dotclaude-lab/bin/dotclaude-capture "$@"

# Size the start of a session by source from a transcript, and fail above the start bounds of tools/limits.mjs; extra arguments go to dotclaude-start (a .jsonl path, --compare BASE OTHER)
measure *args:
    node tools/measure.mjs "$@"

# Where your Claude Code usage went; extra arguments go to dotclaude-usage (--days N, --runs N, --json)
usage *args:
    node plugins/dotclaude-sessions/bin/dotclaude-usage --agents-dir plugins/dotclaude/agents "$@"

# Publish wiki/ to the GitHub wiki; the wiki repository exists only after its first page is made in the web UI
wiki:
    #!/usr/bin/env bash
    set -euo pipefail
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    git clone --quiet https://github.com/xsyetopz/dotclaude.wiki.git "$tmp"
    rsync -a --delete --exclude .git wiki/ "$tmp/"
    git -C "$tmp" add -A
    if git -C "$tmp" diff --cached --quiet; then echo "The wiki is up to date."; exit 0; fi
    git -C "$tmp" commit --quiet -m "Sync wiki from dotclaude $(git rev-parse --short HEAD)"
    git -C "$tmp" push --quiet origin HEAD

# Refresh the dotclaude marketplace, then update each plugin under plugins/ that you installed; restart Claude Code after
update:
    #!/usr/bin/env bash
    set -euo pipefail
    claude plugin marketplace update dotclaude
    for p in plugins/*/; do
        claude plugin update "$(basename "$p")@dotclaude"
    done

# Bump the version (major, minor, patch, or X.Y.Z) in both manifests and the CHANGELOG; add --dry-run to preview
bump level *flags:
    node tools/bump-version.mjs "$@"

# Tag each plugin under plugins/ at HEAD and push all tags in one atomic push; add --dry-run to preview
release *flags:
    #!/usr/bin/env bash
    set -euo pipefail
    tags=()
    for p in plugins/*/; do
        tags+=("$(claude plugin tag --dry-run "$p" | awk '/^Tag:/ {print $2}')")
    done
    printf 'Tags: %s\n' "${tags[*]}"
    if [[ "${1:-}" == --dry-run ]]; then exit 0; fi
    for p in plugins/*/; do claude plugin tag "$p"; done
    git push --atomic origin "${tags[@]/#/refs/tags/}"

# Write the settings schemas of the installed Claude Code to schemas/; extra arguments go to dotclaude-schema (--bundle FILE, --version X.Y.Z)
schema *args:
    node plugins/dotclaude-lab/bin/dotclaude-schema --out schemas "$@"

# Write the descriptions and the prompt hook texts of each hooks.json from the text files next to it
hook-text:
    node tools/hook-text.mjs

# Run the eval cases of the core plugin with `claude plugin eval`, on a path target so the checkout and not the installed copy is tested; extra arguments go to the eval (--case NAME). The run costs money, so --max-cost-usd bounds it, and a lock stops a second run while one is in progress. --keep-temp is always on, so each run keeps its sandbox and trace.jsonl (the eval prints "kept temp: /private/tmp/e-XXXX") to find the cause of a failed run
eval *args:
    node tools/unsandboxed.mjs
    node tools/lock.mjs claude plugin eval plugins/dotclaude --no-publish --scaffold --allow-tools Bash,Write,Edit --max-cost-usd 5 --keep-temp "$@"

# Run the eval cases on the checkout and on a variant at a git ref (in a temporary worktree), to compare the two plugin arms; extra arguments go to the eval
eval-variant ref *args:
    node tools/unsandboxed.mjs
    node tools/lock.mjs node tools/eval-variant.mjs "$@"

# Run one headless sandbox session with a debug log, and fail when the log names an unknown frontmatter field
debug-agents:
    node plugins/dotclaude-lab/bin/dotclaude-sandbox --check-frontmatter $(for d in plugins/*/; do [ -f "${d}.claude-plugin/plugin.json" ] && printf -- '--plugin-dir %s ' "${d%/}"; done)

# Capture and measure the start of a clean sandbox session: send one prompt, then type /exit; extra arguments go to the script (--port N, --dir DIR)
start-run *args:
    node tools/start-run.mjs "$@"
