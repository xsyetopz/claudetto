#!/usr/bin/env bash
# Scaffold: a 39-row backlog export. 16 rows are open P1 or P2 by the rules of src/backlog.ts, the
# parser the dashboard uses: priority and status compare without case, a date may use slashes, a
# title may hold a pipe, and a line that starts with # is no row. The request, the summary line of
# the file and scripts/open-items.sh all say nine: the script matches only the 9 rows typed in the
# tidy form (padded date, `P1`, `open`, single spaces) and prints two of them with a carriage
# return. The other traps: dates without zero padding (a text sort misorders them), tabs, P10, P12
# and P21 rows, an empty priority, titles that say "open" or "P1", trailing spaces, an example row
# in a comment, and astral emoji. Offline and deterministic.
set -euo pipefail

mkdir -p src scripts
cat > backlog.txt <<'TXT'
# backlog export, pipe-separated: date | priority | status | title
# 9 open P1/P2 items at the last triage (2026-10-01)
# row format, e.g.: 2026-01-01 | P1 | open | Title goes here
2026-10-03 | P1 | open | Fix café checkout rounding — épée orders
2026-9-30 | P1 | open | Stop double-charging on retry ⚠
2026-11-12 | P10 | open | Rename the pricing module
2026-10-21 | P1 | done | Reopen the P1 pager rota
2026-11-17 | P1 | open | Handle empty carts without a crash 💥
2026/11/15 | P2 | Open | Quote the “fragile” surcharge up front
2026-11-05 | P1 | blocked | Wait for the carrier API key
2026-10-09 | P2 | open | Ship the VAT table for Zoë's region
2026-11-3  |  P1 |open | Parse the `sku | qty` import column
2026-11-21 | P21 | open | Split the monolith
2026-10-10 | P2 | open | Document the refund flow — finally
2026-11-19 | P12 | open | Support Klingon locale
2026-08-29 | P2 | open | Größe der Warenkorb-Zeile anzeigen
2026-11-15 | p1 | open | Block checkout when stock is negative
2026-10-30 | P2 | wontfix | Migrate to the new tax vendor
2026-11-20 | P2 | open | Réparer l'écran de paiement 🧾
2026-11-11 | P2 | in-review | Trim trailing zeros in totals
2026-11-18 | P3 | open | Open-source licence audit
2026-11-22 | P1 | closed | Open P1: page the on-call twice
2026-11-02 | P2 | open | Cache the open P1 count on the dashboard
2026-10-02 | P3 | open | P1: tidy the footer links
2026-9-9 | P2 | open | Retry webhooks 3× before paging   
2026-11-9 | P2 | done | Open the beta to P2 customers
2025-12-30 | P1 | open | Rotate the signing key 🔑<CR>
2026-11-14 | P3 | blocked | Draft the open API changelog
2026-11-4	|	P1	|	open	|	Throttle the price-sync job
2026-10-27 | P1 | wontfix | Bring back the legacy P2 export
2026-11-16 | P2 | blocked | Unblock the open banking sandbox
2026-11-06 |  | open | Untriaged: flaky login test
2026-9-18 | P3 | done | Close out P1 incident 4412
2026-11-07 | P2 | OPEN | Mask card numbers in the audit log
2026-11-08 | P4 | open | Polish the 404 page
2026-10-15 | P1 | in-review | Verify refunds over €500
2026-10-28 | P2 | open | Añadir el botón de reembolso<CR>
2026-11-1 | P2 | done | Publish the open P2 list weekly
2026-11-13 | P3 | open | Sketch the loyalty tiers
2026-10-6 | P10 | open | Archive carts older than 90 days
2026-11-10 | P1 | done | Patch the retry storm
2026-9-2 | P3 | wontfix | Translate the open-hours banner
TXT
# Two rows end with a carriage return, as the tracker's Windows client writes them.
backlog=$(<backlog.txt)
cr=$'\r'
printf '%s\n' "${backlog//<CR>/$cr}" > backlog.txt
cat > README.md <<'MD'
# backlog

- `backlog.txt` is the export of the tracker.
- `src/backlog.ts` is the parser the dashboard reads it with.
- `scripts/open-items.sh` prints the titles of the open P1 and P2 items, P1 first, newest first.
MD
cat > src/backlog.ts <<'TS'
export interface Item {
	date: string;
	priority: string;
	status: string;
	title: string;
}

export function parse(text: string): Item[] {
	const items: Item[] = [];
	for (const line of text.split("\n")) {
		if (line.startsWith("#") || line.trim() === "") {
			continue;
		}
		const [date = "", priority = "", status = "", ...title] = line.split("|");
		const [year = "", month = "", day = ""] = date.trim().split(/[-/]/u);
		items.push({
			date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
			priority: priority.trim().toUpperCase(),
			status: status.trim().toLowerCase(),
			title: title.join("|").trim()
		});
	}
	return items;
}
TS
cat > scripts/open-items.sh <<'SH'
#!/bin/sh
# Prints the titles of the open P1 and P2 items as bullets, P1 first, newest first.
grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2} \| P[12] \| open \| ' backlog.txt |
	sort -t'|' -k2,2 -k1,1r |
	cut -d'|' -f4- |
	sed 's/^ /- /'
SH
chmod +x scripts/open-items.sh

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: add the backlog export"
