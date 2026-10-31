## ADDED Requirements

### Requirement: A Match Script Is Not a File Read

The gate SHALL NOT treat the script or pattern word of a `PATTERNED` command (`grep`, `egrep`, `fgrep`, `rg`, `ugrep`, `sed`, `awk`) as a file that the command reads.

#### Scenario: Env Name in a `sed` Script

- **WHEN** a command runs `sed -E -n 's/.env/x/p' notes.txt` in a project with an env file
- **THEN** the gate makes no finding for `.env`

#### Scenario: Loop over a Literal List

- **WHEN** a command runs `for f in a.txt b.txt; do sed -n p "$f"; done`
- **THEN** the gate takes `a.txt` and `b.txt` as the values of `$f` and makes no env-file finding

#### Scenario: Unknown Script Variable

- **WHEN** a command runs `python3 -I "$py"` and `py` is unset, or set from a substitution such as `py=$(mktemp)`
- **THEN** the gate still asks, because the interpreter can print a line of the file it reads
