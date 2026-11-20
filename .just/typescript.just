# Managed by bedrock. Put project recipes in project.just.

set shell := ["bash", "-euo", "pipefail", "-c"]
set working-directory := ".."

# Type-aware oxlint starts a tsgolint that loads the whole TypeScript program.
# tsgolint is a Go program, so GOMEMLIMIT (a soft heap limit) and GOMAXPROCS bound it,
# and `--threads` bounds oxlint. Raise them for a large repo, such as
# `BEDROCK_LINT_MEMORY=8GiB just lint`.
lint_memory := env("BEDROCK_LINT_MEMORY", "4GiB")
# `jobs` bounds bun fmt's threads; see BEDROCK_JOBS in the justfile.
jobs := env("BEDROCK_TYPESCRIPT_JOBS", env("BEDROCK_JOBS", "4"))
lint_threads := env("BEDROCK_LINT_THREADS", jobs)
# The lock every lint run on the machine shares; a test points it elsewhere.
lint_lock := env("BEDROCK_LINT_LOCK", "/tmp/bedrock-lint.lock")

# Install the dependencies. CI must not change bun.lock.
setup:
    bun install {{ if env("CI", "") == "" { "" } else { "--frozen-lockfile" } }}

# Format the listed files; bun fmt passes over the ones in a language it does not format.
format: hold
    {{ quote(replace(just_executable(), '\', '/')) }} files . | xargs -0 -r bun fmt --ignore-unknown --threads={{ jobs }}

# Fail if a listed file is not formatted.
format-check: hold
    {{ quote(replace(just_executable(), '\', '/')) }} files . | xargs -0 -r bun fmt --check --ignore-unknown --threads={{ jobs }}

# Type-check without emitting anything, after a project-pre-typecheck recipe from project.just when there is one.
typecheck: hold
    case " $({{ quote(replace(just_executable(), '\', '/')) }} --summary) " in *" project-pre-typecheck "*) {{ quote(replace(just_executable(), '\', '/')) }} project-pre-typecheck ;; esac
    bun check

# Run oxlint on the repo, or on the given paths. One run on the machine at a time; the base justfile lints Markdown.
lint *paths: hold (oxlint paths)

# Apply oxlint's fixes, under the same lock and bounds as lint.
lint-fix *paths: hold (oxlint "--fix" paths)

# Run the tests.
test: hold
    bun test --pass-with-no-tests

# Report suppressions, other package managers, undocumented package API, TypeScript drift, and managed-file drift.
guard:
    {{ quote(replace(just_executable(), '\', '/')) }} bedrock guard typescript

# Run every Bun check CI runs.
verify: format-check typecheck lint guard test

# The Bun checks the pre-commit hook runs.
pre-commit: format-staged typecheck lint guard

# The Bun checks the pre-push hook runs: verify without the tests, which CI runs.
pre-push: format-check typecheck lint guard

[private]
format-staged:
    bun fmt --staged --threads={{ jobs }}

# A second run anywhere on the machine waits for the first instead of starting its own tsgolint:
# each holds a whole program in memory, and repos, worktrees, and sessions lint at once.
# The lock sits in /tmp, which every user and sandbox shares, unlike $TMPDIR.
# The lock is a directory because `mkdir` is atomic on every platform, and a dead holder's lock is
# taken over; a holder kill cannot signal belongs to another user and still counts as alive.
# Nested configs stay off, so a worktree's own .oxlintrc.json under an ignored path, such as
# .claude/worktrees, does not stop the run.
[private]
oxlint *args:
    #!/usr/bin/env bash
    set -euo pipefail
    lock="{{ lint_lock }}"
    waited=
    until mkdir "$lock" 2>/dev/null; do
        holder="$(cat "$lock/pid" 2>/dev/null || true)"
        signal="$(kill -0 "$holder" 2>&1 || true)"
        if [[ -n "$holder" && "$signal" == *"No such process"* ]]; then
            rm -rf "$lock"
            continue
        fi
        if [[ -z "$waited" ]]; then
            echo "Another lint run holds the machine's lint lock (pid ${holder:-unknown}); waiting for it." >&2
            waited=1
        fi
        sleep 1
    done
    trap 'rm -rf "$lock"' EXIT
    echo $$ >"$lock/pid"
    export GOMEMLIMIT="{{ lint_memory }}" GOMAXPROCS="{{ lint_threads }}"
    bun run oxlint --threads={{ lint_threads }} --disable-nested-config {{ args }}

# Takes one of the machine's check slots for this run; see `hold-slot` in the justfile.
[private]
hold:
    @{{ quote(replace(just_executable(), '\', '/')) }} hold-slot "$PPID"
