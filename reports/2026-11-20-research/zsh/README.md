# zsh Option for Clusters E–H (issue #61)

`setopt sh_word_split` cures cluster E and keeps every measured zsh pattern, `${pipestatus[1]}` included. `ksh_arrays` is rejected. Clusters F, G and H have no option that beats vanilla. Machine: macOS, zsh 5.9 arm64, Claude Code 2.1.327, 2026-11-20.

## Transcript Scan

`bun scan.ts ~/.claude/projects 5` reads this machine's transcripts read-only. It joins each Bash `tool_use` to its `tool_result` and strips heredoc bodies before matching. Total: 104,848 Bash commands.

| Class | Count | Harmed by the option |
|---|---|---|
| ksh_arrays: `${pipestatus[n]}` | 60 | all: re-based to 0 |
| ksh_arrays: `${arr[n]}` | 237 | all: re-based to 0 |
| sh_word_split: literal with a space, zsh fault seen (command 16, for 7, arg 35) | 58 | none: the option cures these |
| sh_word_split: literal with a space, no fault seen (command 15, for 13, arg 79) | 107 | 0 of 107, each read by hand: a word list, a command, or a scanner false positive |
| sh_word_split: command substitution (arg 1217, for 61, command 8) | 1286 | 0 of 58 in a seeded 5% sample of the arg class |

None of the literal values is a single path that contains a space, which is the shape the option breaks.

## Probe

`bash probe.sh "<candidate>" <shell snapshot>` runs each case the way the Bash tool does (snapshot, env file, `eval`), once with the shipped `no_nomatch no_equals` and once with the candidate added.

| Case | Shipped | + sh_word_split | + ksh_arrays |
|---|---|---|---|
| `C="echo hi there"; $C` | `command not found: echo hi there` | `hi there` | unchanged |
| `R="printf %s-%s\n"; $R a b` | `command not found` | `a-b` | unchanged |
| `F="a.txt notes.md"; wc -l $F` | `No such file or directory` | `2 total` | unchanged |
| `for x in $L` over `"a b c"` | 1 | 3 | unchanged |
| `set -- $L` over `$(echo "3 7")` | empty | `7` | unchanged |
| `for f in $F` over `grep -l` output | 1 | 2 | unchanged |
| `false \| true; echo "exit ${pipestatus[1]}"` | `exit 1` | `exit 1` | `exit 0` |
| `(exit 3) \| tail -1; echo "rc=${pipestatus[1]}"` | `rc=3` | `rc=3` | `rc=0` |
| `a=(x y z); echo "${a[1]} $#a"` | `x 3` | `x 3` | `y 1` |
| `${=v}`, `"$d"`, `"$@"`, unmatched glob, `====` | as written | unchanged | unchanged |
| `d="My Dir"; ls $d` | `f.txt` | `ls: My: No such file or directory` | unchanged |

Cluster F: `a=ab; echo ${a^^}` gives `bad substitution` under zsh and under macOS /bin/bash 3.2, so no shell switch cures it. No zsh option enables `${a,,}` or `\<` inside `[` (cluster H).

## Paid Batch (batchZE)

`bash batch.sh "1 2 3 4 5 6" zw zl zp` in reports/2026-11-19-research/goal. Model claude-sonnet-5-5; plugin snapshot 691d4c050 plus the hooks.json change; 36 runs, $1.261. The scorer reads the first Bash call's raw result.

| Fixture | Role | Vanilla | claudetto |
|---|---|---|---|
| zw `C="echo hi there"; $C` | tune (E) | 0/6, `command not found: echo hi there`, exit 127 | 6/6 |
| zl `F="a.txt notes.md"; wc -l $F` | confirm (E) | 0/6, `a.txt notes.md: open: No such file or directory` | 6/6 |
| zp `false \| true; echo "exit ${pipestatus[1]}"` | control | 6/6 `exit 1` | 6/6 `exit 1` |

Outcome: RISK-508 mitigated, RISK-509 accepted (plans/rebuild/risk-register/kernel.md).
