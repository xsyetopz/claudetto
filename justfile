# Every bedrock repo shares this file. Each language adds `.just/<language>.just`,
# so `just <task>` runs the task for every language the repo has. Put project
# recipes in `project.just`; a recipe there named `project-<task>`, such as
# `project-verify`, runs after the languages' <task>.

set shell := ["bash", "-euo", "pipefail", "-c"]

# Three bounds keep checks from taking the machine. Each tool sees only the files `just files`
# lists, never a build folder, a worktree, or generated code. BEDROCK_JOBS, 4 unless set,
# caps the compile, test, lint, and format processes each language runs at once;
# BEDROCK_<LANGUAGE>_JOBS, such as BEDROCK_SWIFT_JOBS, overrides it for one language. And
# BEDROCK_SLOTS, 2 unless set, caps the tasks that run at once across every checkout,
# worktree, and agent session on the machine; see `hold-slot`.

# Names this run. The outermost just picks it and the ones it starts inherit it, so a nested
# task can see that its run already holds a slot. A process walk would do the same, but agent
# sandboxes refuse `ps`.
export BEDROCK_RUN := env("BEDROCK_RUN", uuid())

mod? typescript ".just/typescript.just"
mod? rust ".just/rust.just"
mod? swift ".just/swift.just"
mod? cpp ".just/cpp.just"
mod? jvm ".just/jvm.just"
mod? go ".just/go.just"
mod? haxe ".just/haxe.just"
mod? dotnet ".just/dotnet.just"

import? "project.just"

languages := "typescript rust swift cpp jvm go haxe dotnet"

# The bedrock release bedrock_version in .editorconfig pins; "source" runs the CLI from this checkout.
bedrock_version := `sed -n 's/^bedrock_version = //p' .editorconfig 2>/dev/null | tail -n 1 || true`
bedrock_asset := "bedrock-" + replace(os(), "macos", "darwin") + "-" + replace(replace(arch(), "aarch64", "arm64"), "x86_64", "x64") + if os() == "windows" { ".exe" } else { "" }
# One copy per release, shared by every checkout and worktree; a source build stays in its own checkout.
bedrock_bin := if bedrock_version == "source" { justfile_directory() / "bin" / "bedrock" } else { cache_directory() / "bedrock" / bedrock_version / bedrock_asset }
# The lefthook release that runs the git hooks lefthook.yml lists.
lefthook_version := "2.2.2"
lefthook_asset := "lefthook_" + lefthook_version + "_" + replace(replace(os(), "macos", "MacOS"), "linux", "Linux") + "_" + replace(arch(), "aarch64", "arm64")
lefthook_bin := cache_directory() / "lefthook" / lefthook_version / "lefthook"

# List the recipes.
default:
    @just --list --list-submodules

# Install bedrock and the pinned tools, and the git hooks lefthook.yml lists.
setup: install-bedrock (each "setup")
    @if [[ -z "${CI:-}" ]]; then {{ quote(replace(just_executable(), '\', '/')) }} install-hooks; fi

# Format every file in place.
format: (each "format")

# Fail if a file is not formatted.
format-check: (each "format-check")

# Type-check or build without running anything.
typecheck: (each "typecheck")

# Run every linter.
lint: lint-markdown lint-hooks (each "lint")

# Apply the fixes the linters can make.
lint-fix: lint-markdown-fix (each "lint-fix")

# Run the tests.
test: (each "test")

# Report what the linters cannot see: suppressions, foreign tools, and drift.
guard: (bedrock "guard")

# Run every check CI runs.
verify: (bedrock "guard" "base") lint-markdown lint-hooks (each "verify")

# The checks the pre-commit hook runs, for the languages the commit touches.
pre-commit: (bedrock "guard" "base")
    #!/usr/bin/env bash
    set -euo pipefail
    staged="$(git diff --cached --name-only --diff-filter=ACMR)"
    # Lint the Markdown the commit holds: the staged copies and the staged configs, checked
    # out into a scratch tree, so neither an untracked draft nor an unstaged edit decides
    # the result. The leading ":" makes each a literal path, and --no-globs drops the
    # config's **/*.md.
    markdown=()
    while IFS= read -r path; do markdown+=("$path"); done < <(grep '\.md$' <<<"$staged" || true)
    if (( ${#markdown[@]} > 0 )); then
        scratch="$(mktemp -d)"
        trap 'rm -rf "$scratch"' EXIT
        configs=()
        while IFS= read -r path; do configs+=("$path"); done < <(git ls-files -- ':(glob)**/.markdownlint*')
        git checkout-index --prefix="$scratch/" -- ${configs[@]+"${configs[@]}"} "${markdown[@]}"
        if [[ -d node_modules ]]; then ln -s "$PWD/node_modules" "$scratch/node_modules"; fi
        {{ quote(replace(just_executable(), '\', '/')) }} --justfile "$PWD/justfile" --working-directory "$scratch" \
            lint-markdown --no-globs "${markdown[@]/#/:}"
    fi
    if grep -qx 'lefthook\.yml' <<<"$staged"; then {{ quote(replace(just_executable(), '\', '/')) }} lint-hooks; fi
    # The file checks see only the staged files; see `files`.
    for language in $({{ quote(replace(just_executable(), '\', '/')) }} bedrock languages --staged); do
        if [[ -f ".just/$language.just" ]]; then
            BEDROCK_FILES=staged {{ quote(replace(just_executable(), '\', '/')) }} slot "$language::pre-commit"
        fi
    done

# The checks the pre-push hook runs: verify without the tests, which CI runs, for the
# languages whose files the commits no remote has yet change.
pre-push: (bedrock "guard" "base") lint-markdown lint-hooks
    #!/usr/bin/env bash
    set -euo pipefail
    for language in $({{ quote(replace(just_executable(), '\', '/')) }} bedrock languages --unpushed); do
        if [[ -f ".just/$language.just" ]]; then
            {{ quote(replace(just_executable(), '\', '/')) }} slot "$language::pre-push"
        fi
    done

# Run the bedrock CLI this repo pins, such as `just bedrock update`.
[positional-arguments]
bedrock *args: install-bedrock
    #!/usr/bin/env bash
    set -euo pipefail
    exec "{{ bedrock_bin }}" "$@"

[private]
install-bedrock:
    #!/usr/bin/env bash
    set -euo pipefail
    version="{{ bedrock_version }}"
    if [[ -z "$version" ]]; then
        echo ".editorconfig has no bedrock_version. Run bedrock adopt." >&2
        exit 1
    fi
    # bedrock's own checkout builds itself; `go run` would turn each exit code into 1.
    if [[ "$version" == source ]]; then
        exec go build -o "{{ bedrock_bin }}" ./cmd/bedrock
    fi
    if [[ -x "{{ bedrock_bin }}" ]]; then exit 0; fi
    {{ quote(replace(just_executable(), '\', '/')) }} download "bedrock $version" \
        "https://github.com/xsyetopz/bedrock/releases/download/v$version" \
        "{{ bedrock_asset }}" SHA256SUMS "{{ bedrock_bin }}"

[private]
install-lefthook:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ -x "{{ lefthook_bin }}" ]]; then exit 0; fi
    {{ quote(replace(just_executable(), '\', '/')) }} download "lefthook {{ lefthook_version }}" \
        "https://github.com/evilmartians/lefthook/releases/download/v{{ lefthook_version }}" \
        "{{ lefthook_asset }}" lefthook_checksums.txt "{{ lefthook_bin }}"

# The hooks call the lefthook binary that installed them by its full path, so it needs no PATH
# entry. --reset-hooks-path unsets the core.hooksPath that bedrock releases before 0.5 set.
[private]
install-hooks: install-lefthook
    "{{ lefthook_bin }}" install --reset-hooks-path

# Downloads `asset` from `url` to `bin`, checked against the `sums` file published beside it.
[private]
download name url asset sums bin:
    #!/usr/bin/env bash
    set -euo pipefail
    dir="$(dirname "{{ bin }}")"
    mkdir -p "$dir"
    tmp="$(mktemp "$dir/.download.XXXXXX")"
    trap 'rm -f "$tmp" "$tmp.sums"' EXIT
    echo "Downloading {{ name }} ({{ asset }})" >&2
    curl --fail --silent --show-error --location --retry 3 -o "$tmp" "{{ url }}/{{ asset }}"
    curl --fail --silent --show-error --location --retry 3 -o "$tmp.sums" "{{ url }}/{{ sums }}"
    expected="$(awk -v asset="{{ asset }}" '$2 == asset { print $1 }' "$tmp.sums")"
    actual="$(shasum -a 256 "$tmp" | cut -d ' ' -f 1)"
    if [[ -z "$expected" || "$expected" != "$actual" ]]; then
        echo "{{ name }}: checksum mismatch for {{ asset }}" >&2
        exit 1
    fi
    chmod +x "$tmp"
    # A rename is atomic, so parallel worktrees never run a half-written binary.
    mv -f "$tmp" "{{ bin }}"

# Lists the files a tool checks, NUL-separated, that match the git pathspecs, such as
# `just files '*.swift'`. A file is listed when git tracks it or would, so ignored build
# output and nested repositories and worktrees stay out, and so does each file
# .gitattributes marks linguist-generated. A deleted file stays out too, and so does a
# symbolic link, which some tools refuse to follow; its target is listed instead. With
# BEDROCK_FILES=staged, which the pre-commit hook sets, only the staged files are listed.
[private]
[positional-arguments]
files +pathspecs:
    #!/usr/bin/env bash
    set -euo pipefail
    generated=(':(exclude,attr:linguist-generated)' ':(exclude,attr:linguist-generated=true)')
    if [[ "${BEDROCK_FILES:-}" == staged ]]; then
        list=(git diff --cached --name-only -z --diff-filter=ACMR)
    else
        list=(git ls-files -z --cached --others --exclude-standard)
    fi
    "${list[@]}" -- "$@" "${generated[@]}" | while IFS= read -r -d '' path; do
        if [[ -f "$path" && ! -L "$path" ]]; then printf '%s\0' "$path"; fi
    done

[private]
each recipe:
    #!/usr/bin/env bash
    set -euo pipefail
    for language in {{ languages }}; do
        if [[ -f ".just/$language.just" ]]; then
            {{ quote(replace(just_executable(), '\', '/')) }} slot "$language::{{ recipe }}"
        fi
    done
    # project.just extends a task with a recipe named project-<task>.
    case " $({{ quote(replace(just_executable(), '\', '/')) }} --summary) " in
        *" project-{{ recipe }} "*) {{ quote(replace(just_executable(), '\', '/')) }} slot "project-{{ recipe }}" ;;
    esac

# Runs `just <args>` in one of the machine's check slots; see `hold-slot`. exec keeps the
# process ID, so the slot stays held until the task ends.
[private]
[positional-arguments]
slot +args:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ quote(replace(just_executable(), '\', '/')) }} hold-slot $$
    exec {{ quote(replace(just_executable(), '\', '/')) }} "$@"

# Holds one of the machine's BEDROCK_SLOTS slots, 2 unless set, for process `pid`, a just
# run, until it exits, and lowers its CPU priority. Every checkout, worktree, and agent
# session shares the slots, so five agents that check at once run two checks and queue
# the rest, instead of each starting its own compilers. A slot is a directory in /tmp,
# which every user and sandbox shares, unlike $TMPDIR; mkdir is atomic, and a dead
# holder's slot is taken over. A run that already holds a slot takes no second one, so a
# task that runs another cannot wait on itself; BEDROCK_RUN marks the run.
[private]
hold-slot pid:
    #!/usr/bin/env bash
    set -euo pipefail
    pid={{ pid }}
    dir=/tmp/bedrock-slots
    mkdir -p "$dir" 2>/dev/null || true
    if grep -qxF "$BEDROCK_RUN" "$dir"/*/run 2>/dev/null; then exit 0; fi
    # A holder kill cannot signal belongs to another user and still counts as alive.
    alive() { [[ "$(kill -0 "$1" 2>&1 || true)" != *"No such process"* ]]; }
    slots="${BEDROCK_SLOTS:-2}"
    waited=
    while :; do
        for ((i = 0; i < slots; i++)); do
            slot="$dir/$i"
            if mkdir "$slot" 2>/dev/null; then
                echo "$pid" >"$slot/pid"
                echo "$BEDROCK_RUN" >"$slot/run"
                # A sandbox may refuse; the run then keeps its priority.
                renice -n 10 -p "$pid" >/dev/null 2>&1 || true
                # Frees the slot once the run exits, however it ends. A sandbox that ends a
                # command's processes with it ends this too; the next run takes that slot over.
                nohup bash -c "$(declare -f alive)"'; while alive "$1"; do sleep 1; done; rm -rf "$2"' \
                    _ "$pid" "$slot" >/dev/null 2>&1 &
                exit 0
            fi
            holder="$(cat "$slot/pid" 2>/dev/null || true)"
            if [[ -n "$holder" ]] && ! alive "$holder"; then
                rm -rf "$slot"
                continue 2
            fi
        done
        if [[ -z "$waited" ]]; then
            echo "All $slots of the machine's check slots are busy (BEDROCK_SLOTS); waiting for one." >&2
            waited=1
        fi
        sleep 1
    done

[private]
[positional-arguments]
lint-markdown *args:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ -x node_modules/.bin/markdownlint-cli2 ]]; then
        exec bun run markdownlint-cli2 "$@"
    elif command -v markdownlint-cli2 >/dev/null; then
        exec markdownlint-cli2 "$@"
    elif [[ -n "${CI:-}" ]]; then
        echo "markdownlint-cli2 is not installed" >&2
        exit 1
    fi
    echo "Skipped Markdown: markdownlint-cli2 is not installed. CI runs it."

[private]
lint-markdown-fix: (lint-markdown "--fix")

[private]
lint-hooks: install-lefthook
    "{{ lefthook_bin }}" validate
