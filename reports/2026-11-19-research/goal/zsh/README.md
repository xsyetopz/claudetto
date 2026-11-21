# zsh faults in Claude Code Bash tool results (this machine)

Scope: read-only scan of `~/.claude/projects/**/*.jsonl` (786 transcript files, including `subagents/`), 2026-11-17 to 2026-11-19. Scanner: python3 -I, kept in `$TMPDIR` (not in this repo).

## Method

- Joined each `tool_result` to its `Bash` `tool_use` by `tool_use_id`. Kept results whose text has a line shaped `(eval):N: ...` or `zsh:N: ...`. The Bash tool runs commands through `eval`, so zsh errors read `(eval):1: no matches found: ...`, not `zsh: ...`.
- 2,322 raw rows, 2,261 unique tool results. Hits below are unique tool results. "Sessions" folds subagent files into the parent session id (24 sessions had a glob or `=` fault; 380 files counted separately).
- Citation form: `<file>:<line>` where line is the `tool_result` line. The `tool_use` is on the line above or nearby.
- "Retry" is a heuristic: the next Bash command in the same file has difflib ratio over 0.5 against the failed command (first 800 chars). It over- and under-counts. Treat it as an estimate.
- `is_error` is the tool_result flag. Many zsh faults exit 0 (see cluster A), so `is_error` under-counts wasted work.
- Control date: `git log` shows the SessionStart `setopt no_nomatch no_equals` hook in `plugins/claudetto/hooks/hooks.json` first committed 2026-11-18 23:59:17 +0200 (a13367506), i.e. 2026-11-18T21:59:17Z. Earliest env file containing it under `~/.claude/session-env/` is 2026-11-19 01:09 +0200.

## Finding 0: the existing control did not run in any session that hit a fault

- `~/.claude/session-env/<session>/sessionstart-hook-0.sh` holds `[ -n "$ZSH_VERSION" ] && setopt no_nomatch no_equals` for 90 sessions. None of the 24 faulting sessions is among them. Their `session-env` directories exist and are empty.
- The 90 control sessions are `/private/tmp/claude-501/dogfood` and `p596` probes plus 84 sessions without a transcript under `projects/`. Their Bash commands contain no unmatched glob or `=word`, so the transcripts show neither success nor failure of the control. Effect on Bash is only recorded in `plans/rebuild/prd/kernel.md` REQ-KERNEL-014 (verified 2026-11-18 by cc-inspect, not re-run here).
- `~/.claude/plugins/installed_plugins.json` lists no claudetto plugin. The claudetto project has humanizer, typesafe, clawdipedia-docs and cc-inspect only. So the control reaches a session only when the plugin is loaded some other way (for example `--plugin-dir`). Faults after the commit time still occurred in claudetto's own sessions (`a44ff7e7` at 2026-11-19T16:17Z, cluster D) and in OpenTLOS, www.clawdipedia.cc, bedrock, OpenJoystickDriver.
- Consequence: "before or after the control" is a date question only on paper. Every hit is from a session with no control. Hits dated at or after 2026-11-18T21:59Z: A 633, B 236, C 3, D 53, E 10, F 1, G 4, H 0.
- Not verified: whether `CLAUDE_ENV_FILE` content is applied to every Bash call in a plugin-loaded session (REQ-KERNEL-014 says yes, measured once).

## Clusters

| ID | Cluster | Exact error | Hits | Sessions | is_error | Retry (est.) | Covered by claudetto control |
|---|---|---|---|---|---|---|---|
| A | `grep --include=*.ext`, other `--opt=GLOB` args | `(eval):1: no matches found: --include=*.h` | 1033 | 24 | 21 | 340 | partial: `no_nomatch` covers it when the hook runs; it ran in 0 of these sessions |
| B | unquoted glob with no match (`ls foo*`, `for f in a/*.x`, `perl -pi ... files/*.kts`) | `(eval):1: no matches found: fixes/spyro/source/EnemyDescriptor*` | 520 | 20 | 59 | 94 | partial: same as A; bash would also fail on part of these (`ls nope*`), difference is abort vs literal pass-through |
| C | `?` or `[` in an unquoted URL or argument | `(eval):1: no matches found: https://api.github.com/.../contents/lizard_languages?ref=1.26.1` | 6 | 5 | 2 | 1 | partial: same as A |
| D | word starting with `=` (`echo ====`, `echo == $a`) | `(eval):1: ==== not found`, `(eval):1: = not found` | 541 | 15 | 517 | 322 | partial: `no_equals` covers it when the hook runs; ran in 0 of these sessions |
| E | unquoted `$VAR` holding a command plus args is not split | `(eval):1: command not found: mipsel-linux-gnu-as -EL -march=r5900 ...`, `no such file or directory: python3 -I /tmp/.../rec.py` | 21 | 10 | 8 | 12 | no |
| F | bash case modification `${a,,}` / `${a^^}` | `(eval):1: bad substitution` | 5 | 2 | 2 | 3 | no |
| G | `"$var[...]"` read as an array subscript | `(eval):1: bad math expression: operand expected at ``^\"'`` | 10 | 6 | 0 | 3 | no |
| H | `[ "$a" \< "$b" ]` | `(eval):1: condition expected: <` | 1 | 1 | 0 | 0 | no |

Date split (before / at-or-after 2026-11-18T21:59:17Z): A 400/633, B 284/236, C 3/3, D 488/53, E 11/10, F 4/1, G 6/4, H 1/0.

Top projects by hits: A OpenTLOS 468, GodHand 181, claudetto 152, www.clawdipedia.cc 111, bedrock 81, OpenJoystickDriver 38. D GodHand 288, www.clawdipedia.cc 120, claudetto 69. One OpenTLOS session (`a0f9708f`, 14:22Z to 16:20Z on 2026-11-19, many subagents) holds 578 nomatch hits, so A and B counts are inflated by one fan-out.

Why A is worse than its `is_error` count suggests: zsh aborts only the one command word list that holds the unmatched glob, prints the error, and the rest of a `;` chain still runs. The call often exits 0 and the missing output looks like "no results". Probe below: `grep -rn --include=*.zz x .; echo after` prints the error, then `after`, exit 0.

### Citations per cluster (file:line)

Prefix `P=~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-`.

**A** (retry observed in the first two)
- `P`www-clawdipedia-cc/a9691911-c345-4f18-aef6-a15c98842b2a.jsonl:32, `no matches found: --include=*.json`; next step re-ran the same grep with `--exclude-dir` list (wasted turn, exit 0).
- `P`bedrock/761e258c-a2eb-4522-97cd-89d52a939fee/subagents/agent-a3d23c780fa3fb164.jsonl:103, `no matches found: --include=*.ts`; next command was a different read (output lost).
- `P`OpenTLOS/a0f9708f-c269-4cf9-a891-38de7e04dadc/subagents/agent-a13334c779d426f55.jsonl:53, `no matches found: --include=*.h` (2026-11-19T16:20Z); next command was a rewritten grep over `src/*.h`.

**B**
- `P`bedrock/761e258c-a2eb-4522-97cd-89d52a939fee/subagents/agent-adf1df57cd597d706.jsonl:136, `no matches found: files/gradle/bedrock/src/main/kotlin/*.kts`.
- `P`bedrock/761e258c-a2eb-4522-97cd-89d52a939fee.jsonl:1318, `no matches found: /tmp/claude-501/tmp.*/ns`; next step replaced the glob with a literal path (retry).
- `P`OpenTLOS/a0f9708f-c269-4cf9-a891-38de7e04dadc/subagents/agent-adc299061b6f750d9.jsonl:36, `no matches found: fixes/spyro/source/EnemyDescriptor*`.

**C**
- `P`www-clawdipedia-cc/276bb505-a941-4a32-a6c7-d1cede51d63f/subagents/agent-a6213641bffcbbd3f.jsonl:421, `no matches found: https://api.github.com/repos/anthropics/claude-code/releases?per_page=30` (is_error true).
- `P`bedrock/9eeefa3c-5403-4fc5-bf4f-e08838161256/subagents/agent-a58c620c31c234b13.jsonl:95, `...lizard_languages?ref=1.26.1`; next command quoted the URL (retry).
- `P`OpenTLOS/a0f9708f-c269-4cf9-a891-38de7e04dadc/subagents/agent-ae6efbba9fd309c01.jsonl:123, `no matches found: _ZN?` (C++ mangled name argument).

**D**
- `P`bedrock/761e258c-a2eb-4522-97cd-89d52a939fee/subagents/agent-aea338da0687f7753.jsonl:25, `==== not found` from `echo =====`; is_error true, next command rewritten (retry).
- `P`GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded/subagents/agent-ad9b0ff872fae90cd.jsonl:26, `= not found` from `echo == $a`; same loop re-run next step.
- `P`claudetto/a44ff7e7-da3e-44a9-93c9-262aa488bb37/subagents/agent-ab977ca57863d6b98.jsonl:232, `= not found` (2026-11-19T16:17Z, after the control was committed).

**E**
- `P`bedrock/761e258c-a2eb-4522-97cd-89d52a939fee.jsonl:434, `B="bun /Users/.../main.ts"; $B init ...` gives `no such file or directory: bun /Users/.../main.ts`; next step defined a shell function `b()` (retry).
- `P`www-clawdipedia-cc/ed51a277-2f64-4439-bbee-44dc9d925920/subagents/agent-a700b3b10e52e8888.jsonl:32, `C="bun inspect/mcp/src/cli.ts code"; $C ...` gives `no such file or directory: bun inspect/mcp/src/cli.ts code`; next step switched to `c(){ bun ... }` (retry; also :31).
- `P`claudetto/9e3ba24c-bf25-4881-a934-d2a0964a48fc.jsonl:2098 and :2106, `T="tmux -S $C/tmux.sock"; $T ...` gives `no such file or directory: tmux -S /tmp/claude-501/cut2/tmux.sock`.
- Other: `P`GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded.jsonl:395 (`AS="mipsel-linux-gnu-as -EL ..."`), `P`claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:13158 (`R="python3 -I $TMPDIR/fold/rec.py"; $R ...`).

**F**
- `P`GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded/subagents/agent-adef4b6c32703f9b9.jsonl:1137 (`${a^^}`), next step wrote the uppercase constants literally.
- `P`GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded/subagents/agent-abd96494d46069bd7.jsonl:1979 (`${a,,}`).
- `P`OpenTLOS/1744bcf9-52d5-40cb-9e90-14bff5065691.jsonl:95 (is_error true, next command near-identical, ratio 0.98). Cause here is `"$x:sys"`: zsh reads `:s` as a modifier. Probe: `x=a; echo "$x:sys"` gives `zsh:1: bad substitution`; `"${x}:sys"` prints `a:sys`. So F holds two causes: `${a,,}` (4 hits) and `$var:letter` (1 hit).

**G**
- `P`www-clawdipedia-cc/276bb505-a941-4a32-a6c7-d1cede51d63f/subagents/agent-a42d8f9ce2e99396f.jsonl:19 and :23.
- `P`bedrock/9eeefa3c-5403-4fc5-bf4f-e08838161256.jsonl:6229 (`grep -o "\"text\":\"[^\"]\{0,40\}$p[^\"]\{0,300\}"`).
- `P`www-clawdipedia-cc/ed51a277-2f64-4439-bbee-44dc9d925920/subagents/agent-a45bbd87bcb6df525.jsonl:87 (2026-11-19T15:42Z).
- Not verified: that all 10 hits come from `$var[`; the regex matched `$name[` in the command and excluded `$((`. Ten other `bad math expression` hits with `$(( ))` were left out (probably empty or non-numeric data; bash handles those differently, not verified).

**H**
- `P`GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded/subagents/agent-ae6e4cdfb7f2429ae.jsonl:3530.

### Seen but not zsh semantics (excluded)

- `nice(5) failed: operation not permitted`, `operation not permitted: ps` (about 49 hits): sandbox, not shell syntax.
- `command not found: node|bun|readelf|dotnet|lefthook|cci`: missing tools. `permission denied: tools/claimed.py`: file not executable. `argument list too long: ls`: size. `unmatched "`: a quote typo, fails in bash too. `no such file or directory: build/wip-*/a.cpp` after `cat > file <<EOF`: missing directory.
- Zero hits for `read-only variable: status`, `bad pattern`, `event not found` (`!`), `read -a`, `bad option`, `echo -e`, `local` outside a function, `path` clobbering PATH, or `setopt` errors. The zsh 1-index and `status` semantics exist (probes below) but no transcript shows them failing.

## Reproductions (zsh 5.9 arm64, `zsh -f -c`, run 2026-11-19)

Unmodified zsh against the candidate fix:

| Cluster | Command | Output | With candidate fix |
|---|---|---|---|
| A | `grep -rn --include=*.zz x .; echo after` | `zsh:1: no matches found: --include=*.zz` then `after`, exit 0 | `setopt no_nomatch; ...` prints `after` only, exit 0 (grep runs) |
| B | `ls nope*; echo after` | `zsh:1: no matches found: nope*` then `after` | `setopt no_nomatch; ls nope*; echo after` gives `ls: nope*: No such file or directory`, `after` (same as bash) |
| C | `echo https://x/y?recursive=1` | `zsh:1: no matches found: https://x/y?recursive=1`, exit 1 | `setopt no_nomatch` prints `https://x/y?recursive=1`, exit 0 |
| D | `echo == a; echo ====; echo =foo` | `zsh:1: = not found`, exit 1 | `setopt no_equals` prints `== a`, `====`, `=foo` |
| E | `C="echo hi there"; $C` | `zsh:1: command not found: echo hi there`, exit 127 | `${=C}` prints `hi there`; `setopt sh_word_split; $C` also prints `hi there` |
| F | `a=ab; echo ${a^^} ${a,,}` | `zsh:1: bad substitution`, exit 1 | `echo ${(U)a} ${a:u} ${a:l}` prints `AB AB ab` |
| G | `p=x; echo "$p[^a]"` | `zsh:1: bad math expression: operand expected at ``^a'``, exit 1 | `echo "${p}[^a]"` prints `x[^a]` |
| H | `[ "a" \< "b" ] && echo y` | `zsh:1: condition expected: <`, exit 2 | `[[ "a" < "b" ]] && echo y` prints `y` |

Extra semantics probed, with no transcript hit: `status=1` gives `read-only variable: status`; `path=x; ls` gives `command not found: ls`; `read -a arr <<< "a b"` gives `bad option: -a`; `a=(x y); echo ${a[0]}-${a[1]}` prints `-x`.

## Candidate fixes

1. Coverage first (A to D, 2100 of 2137 hits): the env-file setopt exists and works when it runs. The hook never ran in the faulting sessions because claudetto is not an installed plugin on this machine and the claudetto project does not enable it. Install or enable the plugin at user scope (or load it with `--plugin-dir` everywhere), or put `[ -n "$ZSH_VERSION" ] && setopt no_nomatch no_equals` in a user-level SessionStart command hook. Not verified: whether a user-level hook receives `CLAUDE_ENV_FILE` the same way.
2. E to H (37 hits, no setopt exists for F, G, H): a `tool.call` check in `guards/shell.ts` that rewrites or denies with a one-line zsh hint. Patterns: `${var,,}` / `${var^^}` (use `${(L)var}` / `${(U)var}`), `"$var[` (use `${var}[`), `[ a \< b ]` (use `[[ ]]`), and `VAR="cmd args"; $VAR` (use a function, an array `VAR=(cmd args); "${VAR[@]}"`, or `${=VAR}`). Not verified: a false-positive rate for a regex deny; a hint-only reminder is the safer shape.
3. `setopt sh_word_split` fixes E in the probe but changes every unquoted expansion, including ones the model wrote for zsh; not verified against real commands, so not recommended without a replay of the 21 E commands.
4. A wasted-turn guard for A: `tool_result` text from a zero-exit Bash call that starts with `(eval):N: no matches found` could trigger a reminder. Not verified that the plugin API exposes tool results for Bash at 2.1.327.

## Open items

- Retry estimate is heuristic; a manual read of 20 random A and B pairs would confirm it.
- The share of B hits that would also fail in bash is not measured.
- The 84 control sessions without a transcript in `projects/` were not analysed.

## Measured cure for clusters A and D (batchZ, 2026-11-19)

Fixtures: `goal/fixtureszsh.sh`. Scorer: `goal/scorers/zsh.py`, which reads the first Bash call's raw result. Model: claude-sonnet-5-5. Plugin snapshot: 71ae1e92a. Cost: $1.124.

| Fixture | Role | Vanilla | claudetto |
|---|---|---|---|
| zg `grep -rl --include=*.md TODO .` | tune (A) | 0/6, `no matches found: --include=*.md` | 6/6 |
| ze `echo ==== done` | confirm (D) | 0/6, `=== not found`, exit 1 | 6/6 |
| zgc `ls *.md` | control: a matching glob still expands | 6/6 | 6/6 |

Cluster E is cured by `sh_word_split` (batchZE, 2026-11-20: zw and zl 0/6 on vanilla, 6/6 on claudetto; control zp `${pipestatus[1]}` 6/6 on both; $1.261). Clusters F–H are accepted with no option that beats vanilla. Both outcomes are in reports/2026-11-20-research/zsh/README.md (issue #61). The 24 faulting sessions had no claudetto loaded, because `installed_plugins.json` lists no claudetto. That is a dependency the user holds: install the plugin.
