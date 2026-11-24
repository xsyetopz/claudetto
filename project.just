# Each shipped plugin type-checks against the types Claude Code writes into it and runs its
# tests under `claude plugin test`, so the root tsconfig and `bun test` leave plugins/ out.

shipped := "plugins/claudetto plugins/claudetto-you-should-know plugins/claudetto-spec"

# Write each shipped plugin's .claude-plugin/types when it is missing or from another Claude Code.
# ENGINE(v2.1.329): a print session writes the types when CLAUDE_CODE_PLUGIN_DIR_WATCH=1 is set; the
# closed API port and a dummy key make it bill nothing and touch no login (#84, OUT-544).
project-types:
    #!/usr/bin/env bash
    set -euo pipefail
    installed="$(claude --version | awk '{print $1}')"
    for p in {{ shipped }}; do
        d="$p/.claude-plugin/types/claude-code/index.d.ts"
        written="$(head -1 "$d" 2>/dev/null | awk '{print $NF}' || true)"
        [[ "${written%.}" == "$installed" ]] && continue
        CLAUDE_CODE_PLUGIN_DIR_WATCH=1 ANTHROPIC_BASE_URL=http://127.0.0.1:9 ANTHROPIC_API_KEY=unused \
            CLAUDE_CODE_MAX_RETRIES=0 claude -p types --plugin-dir "$p" --setting-sources project \
            --strict-mcp-config --no-session-persistence < /dev/null > /dev/null 2>&1 || true
        written="$(head -1 "$d" 2>/dev/null | awk '{print $NF}' || true)"
        if [[ "${written%.}" != "$installed" ]]; then
            echo "Claude Code $installed wrote no types into $p/.claude-plugin/types" >&2
            exit 1
        fi
    done

# A fresh clone gets the types with the rest of the setup.
project-setup: project-types

# Type-check each shipped plugin with its own tsconfig, writing its types first when needed.
project-typecheck: project-types
    #!/usr/bin/env bash
    set -euo pipefail
    for p in {{ shipped }}; do
        bun check -p "$p"
    done

# Validate each plugin and fail on a gating hook without .catch.
project-lint:
    #!/usr/bin/env bash
    set -euo pipefail
    for p in {{ shipped }}; do
        claude plugin validate "$p" --strict
        tools/check-catch.sh "$p"
    done

# Run each plugin's tests under Claude Code's test runner.
project-test:
    #!/usr/bin/env bash
    set -euo pipefail
    for p in {{ shipped }}; do
        claude plugin test "$p"
    done

# The plugin checks CI runs after the language checks.
project-verify: project-typecheck project-lint project-test

# Paid: each run is a full Claude session. Run outside a sandboxed agent shell, whose Seatbelt makes
# the child's own sandbox fail. Reports stay local (--no-publish); traces stay in
# /private/tmp/e-* for diagnosis (--keep-temp).
# ENGINE(v2.1.330): an eval's Bash sandbox cannot start inside a Seatbelt-sandboxed shell (#86).
# macOS refuses a nested sandbox_apply, so every Bash call of the run would fail and score 0;
# this stops before any paid run and says where to run it instead.
[private]
eval-preflight:
    #!/usr/bin/env bash
    set -euo pipefail
    command -v sandbox-exec >/dev/null || exit 0
    if ! sandbox-exec -p '(version 1)(allow default)' /usr/bin/true 2>/dev/null; then
        echo "this shell is already sandboxed, so the eval's own Bash sandbox cannot start (#86): run it from an unsandboxed terminal, or approve running it outside the sandbox" >&2
        exit 1
    fi

# Run one plugin's eval suite, e.g. `just eval claudetto-spec --case 'feature-*'`.
# A run grants only what --allow-tools names, and a case that lists a tool beyond the read-only set
# runs without it, still exits 0, and scores as if the tool did not exist (#102). So the recipe grants
# every gated tool (anything outside the read-only set the docs list) that a case's allowed_tools
# names, mcp__ tools included, by name; and it fails when the output holds "not granted".
# The lists are read as YAML, because the formatter wraps a long flow list over several lines.
eval plugin *args: eval-preflight
    #!/usr/bin/env bash
    set -euo pipefail
    cases=(plugins/{{ plugin }}/evals/*/case.yaml)
    [[ -f "${cases[0]}" ]] || { echo "no plugins/{{ plugin }}/evals/*/case.yaml: is {{ plugin }} a plugin with eval cases?" >&2; exit 1; }
    # CON-056: a case is committed before it runs, so each score can name the case commit (CON-055).
    # Only the case folders count; the suite README and the gitignored results/ do not change a run.
    dirty="$(git status --porcelain --untracked-files=all -- "${cases[@]%/case.yaml}")"
    if [[ -n "$dirty" ]]; then
        printf 'FAILED: commit the eval cases before a run (CON-056); uncommitted:\n%s\n' "$dirty" >&2
        exit 1
    fi
    # One history walk names each case's latest commit; a git log per case made the recipe twice as slow.
    git log --format='>%h' --name-only -- "${cases[@]%/case.yaml}" \
        | awk '/^>/ { h = substr($0, 2); next } NF { split($0, p, "/"); if (!(p[4] in s)) { s[p[4]] = h; print "case commit: " p[4] " " h } }' \
        | sort >&2
    grants=()
    while IFS= read -r tool; do
        [[ -n "$tool" ]] && grants+=("$tool")
    done < <(
        bun -e 'for (const f of Bun.argv.slice(1)) for (const t of Bun.YAML.parse(await Bun.file(f).text())?.execution?.allowed_tools ?? []) console.log(t)' "${cases[@]}" \
            | grep -vxE 'Read|Glob|Grep|NotebookRead|Skill|AskUserQuestion|Agent|TodoWrite|TaskCreate|TaskGet|TaskList|TaskUpdate|TaskStop' | sort -u
    )
    allow=()
    if ((${#grants[@]})); then
        allow=(--allow-tools "${grants[@]}")
        echo "granting: ${grants[*]}" >&2
    fi
    log="$(mktemp)"
    trap 'rm -f "$log"' EXIT
    # tee streams the output; PIPESTATUS[0] keeps the eval's own exit status, which the pipe would otherwise hide.
    claude plugin eval plugins/{{ plugin }} "${allow[@]+"${allow[@]}"}" --scaffold --ablation with-without --no-publish --keep-temp {{ args }} 2>&1 | tee "$log"
    rc="${PIPESTATUS[0]}"
    if grep -q 'not granted' "$log"; then
        echo "FAILED: the run printed 'not granted', so a case ran without a tool it lists and its scores are invalid (#102); add the missing grant and rerun" >&2
        exit 1
    fi
    exit "$rc"

# The cases stay out of the repo and out of any agent's context (ADR-0193).
# Run the held-out cases from ~/.claudetto-holdout/<plugin> against a copy of the plugin, outside the sandbox.
eval-holdout plugin model="claude-opus-5-5" *args: eval-preflight
    #!/usr/bin/env bash
    set -euo pipefail
    src="$HOME/.claudetto-holdout/{{ plugin }}"
    [[ -d "$src" ]] || { echo "$src is missing: held-out cases live there, one case folder each" >&2; exit 1; }
    work="$(mktemp -d)"
    trap 'rm -rf "$work"' EXIT
    cp -R "plugins/{{ plugin }}" "$work/plugin"
    rm -rf "$work/plugin/evals"
    cp -R "$src" "$work/plugin/evals"
    rc=0
    # The copy is this repo's plugin in a fresh temp dir each run, so no earlier trust answer covers it.
    # The eval's own output prints grader patterns and matched file text, so it stays in the temp dir
    # and only the summary table (case, arm scores, runs, cost) reaches the terminal (#133).
    claude plugin eval "$work/plugin" --trust-plugin --scaffold --allow-tools Write Edit Bash --ablation with-without --no-publish --model "{{ model }}" {{ args }} >"$work/eval.log" 2>&1 || rc=$?
    awk '/^CASE /{show=1} show{print} /case\(s\) ·/{show=0}' "$work/eval.log"
    ((rc == 0)) || echo "claude plugin eval exited $rc; its log is withheld because it holds held-out case text" >&2
    # The temp copy holds traces and prompts of unseen cases; only scores leave it (ADR-0193 rule 7).
    keep="plugins/{{ plugin }}/evals/results"
    mkdir -p "$keep"
    for f in "$work"/plugin/evals/results/*/aggregate-result.json; do
        [[ -f "$f" ]] || continue
        # The result JSON names no model (claude 2.1.330) and the traces go with the scaffolds, so the pin is recorded.
        jq --arg model "{{ model }}" \
            '{model: $model} + . | .cases |= map({name, aggregates, arms: (.arms | map_values(map({score, passed, costUsd, turns, error})))})' \
            "$f" >"$keep/holdout-$(basename "$(dirname "$f")").json"
        echo "kept $keep/holdout-$(basename "$(dirname "$f")").json"
    done
    exit "$rc"

# Needs TYPESAFE_API_KEY, read from the main checkout's .env (bunfig sets env = false, so Bun loads
# no .env by itself; a missing file is skipped), and an earlier `just eval <plugin>`, whose
# --keep-temp keeps the traces. Each run's reply is sent to api.typesafe.ai (#124).

# Grade the newest eval run's replies with TypeSafe Jev, e.g. `just eval-jev claudetto`.
eval-jev plugin:
    bun --env-file="$(git rev-parse --path-format=absolute --git-common-dir)/../.env" tools/jev-grade.ts plugins/{{ plugin }}/evals/results

# Bump one plugin's patch version, e.g. `just bump claudetto`.
bump plugin:
    perl -0pi -e 's/("version":\s*"\d+\.\d+\.)(\d+)"/$1 . ($2 + 1) . "\""/e' plugins/{{ plugin }}/.claude-plugin/plugin.json
    grep '"version"' plugins/{{ plugin }}/.claude-plugin/plugin.json

# Start a release cycle: the patch bump comes first, then the check.
release plugin: (bump plugin) verify
