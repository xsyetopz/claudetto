# Bash's PIPESTATUS under zsh

RISK-514, issue #82. The Bash tool runs zsh on this machine. zsh has `pipestatus`, indexed from 1, and no `PIPESTATUS`, so `${PIPESTATUS[0]}` expands to nothing without an error. In dogfood session ba07e0d8 (3f72b84bf, 2.1.327, claude-sonnet-5-5), `echo "exit ${PIPESTATUS[0]}"` printed `exit ` after each of six plugin test runs, and the session reran all six.

## Transcript scan, 2026-11-20

| Measure | Count |
| --- | --- |
| Sessions | 2,101 |
| Bash commands using `PIPESTATUS` | 369, in 198 sessions |
| Subscripts | `[0]` 378, bare 7, `[1]` 1, `[2]` 1, `[@]` 1 |
| Bash commands using `set -x` | 2 of 135,931 |
| `while read`, or a loop of 1,000 or more | 320 of 136,774 |

## Candidates

| Candidate | `${PIPESTATUS[k]}` | `${pipestatus[1]}` | Cost per simple command |
| --- | --- | --- | --- |
| `TRAPDEBUG` function filling an associative array with keys 0 to n-1 | bash values | unchanged | about 85 µs |
| string `trap '...' DEBUG` with the same body | bash values | overwritten with `0` | about 7 µs |
| `ksh_zero_subscript` and a plain array | `[0]` right, `[1]` gives the first code | unchanged | about 85 µs |

The function ships. zsh restores `$pipestatus` after a `TRAPDEBUG` function returns; a string trap runs in the caller's scope, so its own `typeset` resets `$pipestatus`, and assigning to `pipestatus` does not restore it. Timings come from `/usr/bin/time -p zsh -f -c "<trap>; for i in {1..200000}; do :; done"`: no trap 0.48 s, empty `TRAPDEBUG` 17.08 s, empty string trap 0.77 s.

Known differences from bash: a bare `$PIPESTATUS` expands to every code instead of the first, and `${PIPESTATUS[@]}` lists codes in hash order. Together these are 8 of 389 recorded uses, and both match bash when the pipeline has one command.

## Probe, 2026-11-20

`bash probe.sh <shell snapshot>` runs each case the way the Bash tool does (snapshot, env file, eval), with the shipped env file line and with the shim added. `output.txt` holds the output; a second run matched it line for line apart from the timings.

- 8 of 8 `PIPESTATUS` cases fixed: vanilla prints empty, the shim prints bash's value.
- 8 of 8 controls unchanged: `${pipestatus[1]}`, `$?` after a command and a pipeline, `set -e`, `set -u`, the command's own exit code, 1-based arrays, and `sh_word_split`.
- Cost: a 200,000-iteration loop took 16-28 s against 0.4-0.6 s, and `set -x` prints three trace lines per command.
- The env file also parses under bash and sh, and bash's own `PIPESTATUS` is untouched.
