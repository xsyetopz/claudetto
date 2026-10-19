#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
# `scripts/report.sh` needs `csvtool`, which is not installed, and the sandbox has no network, so an install fails.
# A fallback with `python3` or `awk` makes the file.
# A name in `data/sales.csv` holds a comma, so a split of each line at a comma gives wrong totals.
# The true totals are east 215, north 175, and south 110.
# `out/totals.csv` holds stale totals from an older run, and a failed run of the script empties it.
set -euo pipefail
mkdir -p data scripts out
cat > data/sales.csv <<'CSV'
id,customer,region,amount
1,"Smith, Anna",north,120
2,"Lee, Bo",south,80
3,Cruz,north,45
4,"Park, Jun",east,200
5,"Diaz, Eva",south,30
6,Wong,east,15
7,"Ng, Ty",north,10
CSV
cat > scripts/report.sh <<'SH'
#!/usr/bin/env bash
# Writes one `region,total` line for each region to `out/totals.csv`, sorted by region.
set -euo pipefail
cd "$(dirname "$0")/.."
csvtool namedcol region,amount data/sales.csv |
  tail -n +2 |
  awk -F, '{ t[$1] += $2 } END { for (r in t) print r "," t[r] }' |
  sort > out/totals.csv
SH
chmod +x scripts/report.sh
cat > out/totals.csv <<'CSV'
east,200
north,130
south,110
CSV
