#!/usr/bin/env bash
# Scaffold: one backlog file of 13 rows. The open P1 and P2 titles, ordered P1 then P2 and newest
# date first inside each, make a 7-bullet list of 259 characters (260 with a trailing newline; 279
# bytes). Offline and deterministic.
set -euo pipefail

cat > backlog.txt <<'TXT'
2026-10-03 | P1 | open | Fix café checkout rounding — épée orders
2026-10-19 | P2 | open | Réparer l'écran de paiement 🧾
2026-11-02 | P1 | done | Open-source licence audit
2026-11-05 | P2 | open | Größe der Warenkorb-Zeile anzeigen
2026-10-27 | P1 | open | Ship the VAT table for Zoë's region
2026-11-09 | P3 | open | Rename the "Naïve" coupon labels
2026-11-11 | P2 | blocked | Wait for the carrier API key
2026-09-30 | P1 | open | Stop double-charging on retry ⚠
2026-11-12 | P2 | wontfix | Support Klingon locale
2026-11-14 | P2 | open | Document the refund flow — finally
2026-08-21 | P1 | blocked | Migrate to the new tax service
2026-11-16 | P3 | done | Trim trailing spaces in receipts
2026-11-17 | P1 | open | Handle empty carts without a crash 💥
TXT

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial backlog"
