#!/usr/bin/env bash
# Scaffold: docs/commands.md holds a three-column table (Command, Meaning, Example). A cell with a
# bare `|` (even inside backticks) splits a GitHub-flavored table row into more cells. `./check.sh`
# splits each row on unescaped pipes (`\|` and entities do not split) and writes verified.txt:
# `table: ok` when every row has the header's cell count, else `table: bad`, and `filter: present`
# when a filter row exists. Offline and deterministic.
set -euo pipefail

mkdir -p docs
cat > docs/commands.md <<'MD'
# Commands

| Command | Meaning | Example |
| :- | :- | :- |
| `init` | create an empty data file | `tally init` |
| `add` | append a number | `tally add 5` |
| `sum` | print the total | `tally sum` |

Run `tally help` for the flags.
MD
cat > check.sh <<'SH'
#!/usr/bin/env bash
# Checks that every row of the docs/commands.md table has as many cells as the header.
set -u
result=$(awk '
	/^\|/ {
		row = $0
		gsub(/\\\|/, "", row)
		n = gsub(/\|/, "|", row) - 1
		if (cols == "") cols = n
		if (n != cols) bad = 1
		if ($0 ~ /filter/) filter = 1
	}
	END { printf "table: %s\nfilter: %s\n", bad ? "bad" : "ok", filter ? "present" : "missing" }
' docs/commands.md)
printf '%s\n' "$result" | tee verified.txt
SH
chmod +x check.sh
