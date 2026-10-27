set positional-arguments

# List recipes
default:
    @just --list

# Run the test suite with `bun test`; a file argument runs that file in place of all of them, and an option goes to bun test (-t RE). A test reads the generated pages, so run `just generate` first after a change of `src/wiki/`. A test run is not a Claude Code session, so the session id does not reach the commit hook of the session
test *args:
    env -u CLAUDE_CODE_SESSION_ID bun test "$@"

# Lint the code (Biome) and the Markdown (markdownlint-cli2)
lint:
    bun run lint
    bun run lint:md

# Type-check each `.ts` file and the core hooks module (`bun check`, erasable syntax only); a linked worktree first gets the Claude Code types of the main worktree
typecheck:
    bun tools/types.ts
    bun run typecheck

# Validate the plugin manifest, skills, and agents
validate:
    bun run validate

# Fail on a clone that `.jscpd-baseline.json` does not hold (`bunx jscpd --update-baseline` accepts the clones of the run)
dry:
    bunx jscpd --no-tips

# Run the hook lab: the tests of each plugin hooks module, with stubbed Claude Code events
lab:
    bun tools/lab.ts

# Run a recipe (default: check) in an OrbStack or Docker container with `DOCKER_CPUS` of `tools/limits.ts`; the repository is mounted, and `node_modules` is a volume of the container
docker *args:
    bun tools/lock.ts --name check bun dev/docker.ts "$@"

# The full local gate of `tools/check.ts` under the lock of the run: lint, the type check, the generated wiki, tests, plugin validation, the hook lab, and `dry`
check:
    bun tools/lock.ts --name check bun tools/check.ts

# Run Claude Code with the plugins of this checkout, in a sandbox config apart from yours; extra arguments go to claude
sandbox *args:
    bun dev/sandbox/run.ts "$@"

# Run Claude Code with only the plugin folder PLUGIN, in a new sandbox config with no settings, apart from `just sandbox`; extra arguments go to claude (-p "prompt")
sandbox-alone plugin *args:
    bun dev/sandbox/main.ts --dir /tmp/claudetto-sandbox-alone --clean
    bun dev/sandbox/main.ts --dir /tmp/claudetto-sandbox-alone --plugin-dir "$@"

# Install plugins of this checkout (default: claudetto) into a new sandbox config with `claude plugin install`, as a user installs them, then run Claude Code there
sandbox-install *plugins:
    bun dev/sandbox/install.ts "$@"

# Run Claude Code again in the sandbox config of `just sandbox-install`, with no new install; extra arguments go to claude (--continue)
sandbox-installed *args:
    bun dev/sandbox/main.ts --dir /tmp/claudetto-sandbox-install "$@"

# Run one live session of Claude Code in a Linux container, to check that the seccomp helper blocks a Unix socket in a sandboxed `Bash` call; the login of the host goes to the container on stdin, and the session costs money
sandbox-linux:
    bun dev/sandbox/linux/run.ts

# Remove the sandbox config and project
sandbox-clean:
    bun dev/sandbox/main.ts --clean

# Log the requests of Claude Code through a local proxy and size each part of the first one; extra arguments go to the proxy (--port N, --out DIR, --no-count)
capture *args:
    bun dev/capture/main.ts "$@"

# Publish wiki/ to the GitHub wiki; the wiki repository exists only after its first page is made in the web UI
wiki:
    bun tools/wiki.ts

# Refresh the claudetto marketplace, then update each plugin under plugins/ that you installed; restart Claude Code after
update:
    bun tools/update.ts

# Bump the version (major, minor, patch, or X.Y.Z) in both manifests and the CHANGELOG; add --dry-run to preview
bump level *flags:
    bun tools/bump-version.ts "$@"

# Fail while a row of findings.md of an openspec change (a change folder name or a findings.md path, required) has no passed check (D38). Run it before `release`, and not in `check`.
release-check change:
    bun tools/findings-check.ts "{{change}}"

# Tag each plugin under plugins/ at HEAD and push all tags in one atomic push; add --dry-run to preview
release *flags:
    bun tools/release.ts "$@"

# Write the settings schemas of the installed Claude Code to schemas/ and format them with Biome; extra arguments go to `dev/schema/main.ts` (--bundle FILE, --version X.Y.Z)
schema *args:
    bun dev/schema/main.ts --out schemas "$@"
    bunx biome format --write schemas

# Write the inventory of the built-in parts of Claude Code from the local folder `external/cc-<version>/` to `.claude/claudetto/builtins/`; extra arguments go to `dev/builtins.ts` (--check, --strict, --dir D, --out D)
builtins *args:
    bun dev/builtins.ts "$@"

# Write the default text of each prompt surface of Claude Code to the fixture of `tests/claudetto/session/prompt/`; extra arguments go to `dev/text-defaults.ts` (DOCS_DIR, BINARY)
text-defaults *args:
    bun dev/text-defaults.ts "$@"

# Write wiki/ from its source in src/wiki/; add --check to name each page that differs from its source
generate *flags:
    bun tools/generate/index.ts "$@"

# Run the eval cases of the core plugin with `claude plugin eval`, on a path target so the checkout and not the installed copy is tested; extra arguments go to the eval (--case NAME). The run costs money, so --max-cost-usd bounds it, and a lock stops a second run while one is in progress. --keep-temp is always on, so each run keeps its sandbox and trace.jsonl (the eval prints "kept temp: /private/tmp/e-XXXX") to find the cause of a failed run. --model is required, because without it the eval uses the model of the session, which can cost many times more
eval *args:
    @case " $* " in *" --model "*|*" --model="*) ;; *) echo 'Pass `--model`, such as `--model haiku`, because without it the eval uses the model of the session.' >&2; exit 1 ;; esac
    bun dev/unsandboxed.ts
    bun tools/lock.ts claude plugin eval plugins/claudetto --no-publish --scaffold --allow-tools Bash,Write,Edit --max-cost-usd 5 --keep-temp "$@"

# Run `just eval` once for each eval case that is not tagged split:held-out, for prompt work (D17); extra arguments go to each run, and --model is required
# Each case has its own --max-cost-usd, so the total cap is that bound times the case count
# Every case runs even when one fails, and the recipe exits 1 at the end if any failed
eval-tune *args:
    #!/usr/bin/env bash
    set -euo pipefail
    case " $* " in *" --model "*|*" --model="*) ;; *) echo 'Pass `--model`, such as `--model haiku`, because without it the eval uses the model of the session.' >&2; exit 1 ;; esac
    cases=$(bun dev/tuning-cases.ts)
    [ -n "$cases" ] || { echo 'No tuning cases found.' >&2; exit 1; }
    failed=0
    for c in $cases; do just eval --case "$c" "$@" || failed=1; done
    exit $failed

# Check the budget tags of the cases against the kept traces named by tracePath in each aggregate-result.json (a file, or a folder that holds them); the with arm is checked and the without arm is only reported
eval-budget *args:
    bun dev/run-budget.ts "$@"

# Print the statistics of the with/without comparison from `aggregate-result.json` files or folders of results (Fisher p, Newcombe CI, bootstrap CI over cases, judge agreement); add --json, --seed N, or --pick oldest
eval-stats *args:
    bun dev/stats/main.ts "$@"

# List the 18 forks of the code-compaction probe with `--dry-run` (no call), or run them with `--run [--dir D]`, which is a paid run that needs the approval of the user (openspec change `code-compaction`, task 3.1)
probe *args:
    bun dev/probe/main.ts "$@"

# Run the eval cases on the checkout and on a variant at a git ref (in a temporary worktree), to compare the two plugin arms; extra arguments go to the eval, and --model is required as for `eval`
eval-variant ref *args:
    @case " $* " in *" --model "*|*" --model="*) ;; *) echo 'Pass `--model`, such as `--model haiku`, because without it the eval uses the model of the session.' >&2; exit 1 ;; esac
    bun dev/unsandboxed.ts
    bun tools/lock.ts bun dev/eval-variant.ts "$@"

# Run one headless sandbox session with a debug log, and fail when the log names an unknown frontmatter field
debug-agents:
    bun dev/sandbox/run.ts --check-frontmatter

