#!/usr/bin/env bash
# Scaffold: a 31-row backlog export. 11 rows are open P1 or P2. The traps: dates without zero
# padding (a text sort misorders them), P10 and P12 rows, a title that holds a pipe, titles that
# say "open" or "P1", uneven spacing, trailing spaces, a stale summary line, and astral emoji.
# Offline and deterministic.
set -euo pipefail

cat > backlog.txt <<'TXT'
# backlog export, pipe-separated: date | priority | status | title
# 9 open P1/P2 items at the last triage (2026-10-01)
2026-10-03 | P1 | open | Fix café checkout rounding — épée orders
2026-9-30 | P1 | open | Stop double-charging on retry ⚠
2026-11-12 | P10 | open | Rename the pricing module
2026-10-21 | P1 | done | Reopen the P1 pager rota
2026-11-17 | P1 | open | Handle empty carts without a crash 💥
2026-11-05 | P1 | blocked | Wait for the carrier API key
2026-10-9 | P2 | open | Ship the VAT table for Zoë's region
2026-11-3  |  P1 |open | Parse the `sku | qty` import column
2026-10-10 | P2 | open | Document the refund flow — finally
2026-11-19 | P12 | open | Support Klingon locale
2026-8-29 | P2 | open | Größe der Warenkorb-Zeile anzeigen
2026-10-30 | P2 | wontfix | Migrate to the new tax vendor
2026-11-20 | P2 | open | Réparer l'écran de paiement 🧾
2026-11-11 | P2 | in-review | Trim trailing zeros in totals
2026-11-18 | P3 | open | Open-source licence audit
2026-11-2 | P2 | open | Cache the open P1 count on the dashboard
2026-10-02 | P3 | open | P1: tidy the footer links
2026-9-9 | P2 | open | Retry webhooks 3× before paging   
2026-11-9 | P2 | done | Open the beta to P2 customers
2025-12-30 | P1 | open | Rotate the signing key 🔑
2026-11-14 | P3 | blocked | Draft the open API changelog
2026-10-27 | P1 | wontfix | Bring back the legacy P2 export
2026-11-16 | P2 | blocked | Unblock the open banking sandbox
2026-9-18 | P3 | done | Close out P1 incident 4412
2026-11-08 | P4 | open | Polish the 404 page
2026-10-15 | P1 | in-review | Verify refunds over €500
2026-11-1 | P2 | done | Publish the open P2 list weekly
2026-11-13 | P3 | open | Sketch the loyalty tiers
2026-10-6 | P10 | open | Archive carts older than 90 days
2026-11-10 | P1 | done | Patch the retry storm
2026-9-2 | P3 | wontfix | Translate the open-hours banner
TXT

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: add the backlog export"
