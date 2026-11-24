# RISK-098: Relative Paths After a `cd`

Probes on 2026-11-24 used claude 2.1.331 with `-p` and `--allowedTools Bash`. `run.sh <arm> <n> [haiku|sonnet]`
copies `src/` into a scratch git repository and asks for four commands in turn:

- `pkg/test.sh`, from inside `pkg/`. It reads `data.txt` there.
- `tools/count.sh`, from the root. It lists `pkg`.
- Both again.

The main session's shell keeps the directory a `cd` moved it to. So after `cd pkg`, a root-relative call
fails ("no such file or directory"), or runs from the wrong folder and prints a wrong count. claudetto
arms load `plugins/claudetto` at e5b91f884. Its Bash text reads "cd persists only inside the working
directories, so use absolute paths" (`plugins/claudetto/hooks/pool/describe.ts:15@e5b91f884`).

A run faults when any tool result reads "no such file or directory".

| Arm | Model | Runs with a fault | Failed calls |
| --- | --- | --- | --- |
| vanilla | Haiku | 5 of 8 | 6 |
| claudetto | Haiku | 0 of 8 | 0 |
| vanilla | Sonnet | 2 of 3 | 3 |
| claudetto | Sonnet | 0 of 3 | 0 |

Every claudetto call started with `cd <absolute path> &&` or an absolute path. Vanilla Sonnet ran `cd pkg`,
then `../tools/count.sh` from inside `pkg/`. In vanilla Haiku run 3, the reply reported two wrong counts
("0 files in pkg"). It named the cause, and it left the rerun to the user.

In one claudetto Haiku run, a bare `tools/count.sh` followed a `cd pkg`. It still passed, because both
calls ran in the same parallel batch from the root.

Cost: $0.004 per Haiku run, and $0.05 to $0.09 per Sonnet run.
